#!/usr/bin/env node

/**
 * Secret exposure audit + rotation checklist.
 *
 * Two distinct problems are easy to conflate, so this reports them separately:
 *
 *   1. WORKING TREE  : a secret literal sitting in a tracked file right now.
 *   2. GIT HISTORY   : a secret that was removed from the working tree but is
 *                      still recoverable via `git show <sha>:<path>`.
 *
 * Removing a secret from the working tree does NOT remove it from history, so
 * category 2 needs credential ROTATION, not just a code change. This script is
 * read-only: it reports, it never rewrites.
 *
 * Usage:
 *   npm run secrets:scan              # working tree + full history
 *   npm run secrets:scan -- --tree    # working tree only (fast)
 *   npm run secrets:scan -- --json    # machine-readable output
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = script error.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const TREE_ONLY = args.includes('--tree');
const AS_JSON = args.includes('--json');

/**
 * Secret patterns worth flagging.
 *
 * `id` is stable so findings can be tracked/suppressed across runs.
 * `history` defaults to true; set false for patterns too noisy to sweep history
 * (e.g. project URLs, which are public by design).
 */
const PATTERNS = [
  // --- high confidence: real credential material ---
  {
    id: 'supabase-service-role-jwt',
    label: 'Supabase service-role key (JWT)',
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    history: true,
    note: 'Bypasses RLS. Rotate in Supabase dashboard > Project Settings > API.',
  },
  {
    id: 'razorpay-key-secret',
    label: 'Razorpay key secret',
    re: /rzp_(?:live|test)_[A-Za-z0-9]{10,}/,
    history: true,
    note: 'Rotate in Razorpay dashboard > Settings > API Keys.',
  },
  {
    id: 'generic-bcrypt-hash',
    label: 'Hardcoded bcrypt password hash',
    re: /crypt\s*\(\s*['"][^'"]{4,}['"]\s*,\s*gen_salt/i,
    history: true,
    note: 'Indicates a seeded account with a literal password. Rotate the account.',
  },
  {
    id: 'cron-secret-literal',
    label: 'Hardcoded cron secret fallback',
    re: /super_secret_cron_bearer_key|cronSecret\s*=\s*process\.env\.[A-Z_]+\s*\|\|\s*['"]/,
    history: true,
    note: 'Rotate CRON_SECRET in the deployment environment.',
  },
  {
    id: 'upstash-token',
    label: 'Upstash Redis REST token',
    re: /A[a-zA-Z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    history: true,
    note: 'Rotate in Upstash console, then update UPSTASH_REDIS_REST_TOKEN.',
  },
  {
    id: 'resend-api-key',
    label: 'Resend API key',
    re: /re_[A-Za-z0-9]{20,}/,
    history: true,
    note: 'Rotate in Resend dashboard.',
  },
  {
    id: 'aes-key-literal',
    label: 'Hardcoded AES/encryption key',
    re: /DB_ENCRYPTION_KEY\s*=\s*['"][A-Za-z0-9+/=]{16,}['"]/,
    history: true,
    note: 'Rotating invalidates existing password_reset_requests ciphertext.',
  },

  // --- literal passwords committed in seed files ---
  {
    id: 'seeded-admin-password',
    label: 'Seeded admin password literal',
    re: /MSC@\d{4}|--\s*Password:\s*\S+/i,
    history: true,
    note: 'Rotate the seeded admin account password.',
  },
];

const IGNORED_DIRS = new Set([
  'node_modules', '.next', '.git', 'out', 'build', 'coverage', 'public',
]);
const IGNORED_FILES = new Set([
  'package-lock.json', '.DS_Store', 'tsconfig.tsbuildinfo',
  // The allowlist itself, and this scanner: both contain secret-shaped regexes
  // and placeholder literals by design.
  '.gitleaks.toml', '.gitleaksignore', 'scripts/security/scan-secrets.mjs',
]);

/**
 * Known-safe literals, reused from the project's own gitleaks allowlist so the
 * two tools cannot drift apart. Keeps dev/CI placeholders out of the report
 * without hardcoding a second list here.
 */
const ALLOWLIST = new Set([
  'rzp_test_placeholder',
  'rzp_test_secret_placeholder',
  'rzp_webhook_secret_placeholder',
  '01234567890123456789012345678901',
  'local_cron_dev_secret_token_12345678',
  'ci_only_cron_fixture_not_a_real_secret',
]);

/**
 * Values that are self-evidently not credentials, regardless of context.
 * Safe to suppress everywhere, including .env.example.
 */
function isObviousPlaceholder(value) {
  return (
    /placeholder/i.test(value) ||
    /^(your[-_]|xxx|example|changeme|todo|dummy|fake)/i.test(value) ||
    /^[<\[(]/.test(value) ||
    /\$\{/.test(value) ||
    /^\$\{?[A-Z_]+\}?$/.test(value)
  );
}

/**
 * Values the project has explicitly blessed (dev/CI fixtures). These are real
 * secret-shaped strings, so they are only suppressed outside .env.example:
 * shipping one of these in the template would propagate it to every developer.
 */
function isAllowlistedFixture(value) {
  return ALLOWLIST.has(value);
}

const TRACKED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql',
  '.yml', '.yaml', '.toml', '.sh', '.env', '.example', '.md',
]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/** Files that git tracks, so we do not report build output or local .env. */
function trackedFiles() {
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function shouldSkip(relPath) {
  const base = relPath.split('/').pop();
  if (IGNORED_FILES.has(base)) return true;
  // Local env files are expected to hold real secrets and are gitignored.
  if (relPath === '.env' || relPath.endsWith('.env.local')) return true;
  const ext = relPath.slice(relPath.lastIndexOf('.'));
  return !TRACKED_EXTENSIONS.has(ext) && !relPath.includes('.env');
}

const findings = [];

function scanText(text, file, category) {
  // .env.example seeds a developer's machine, so a value copied from it becomes
  // a real credential. Never allowlist-suppress that file.
  const strict = /\/\.env\.example$|\.env\.example$/.test(file);

  for (const p of PATTERNS) {
    const lines = text.split('\n');
    const lineNums = [];
    lines.forEach((line, i) => {
      const re = new RegExp(p.re.source, p.re.flags.replace('g', ''));
      if (!re.test(line)) return;
      const match = line.match(re);
      if (match) {
        if (isObviousPlaceholder(match[0])) return;
        if (!strict && isAllowlistedFixture(match[0])) return;
      }
      lineNums.push(i + 1);
    });
    if (lineNums.length === 0) continue;

    findings.push({
      category,
      pattern: p.id,
      label: p.label,
      file,
      lines: lineNums,
      note: p.note,
    });
  }
}

// ---------- 1. working tree ----------
let files = [];
try {
  files = trackedFiles().map((f) => join(process.cwd(), f));
  // Include untracked-but-present env examples.
  for (const f of walk(process.cwd())) {
    const rel = relative(process.cwd(), f);
    if (rel.endsWith('.env.example') && !files.includes(f)) files.push(f);
  }
} catch (err) {
  if (!AS_JSON) console.error('Could not list git files:', err.message);
  process.exit(2);
}

for (const abs of files) {
  if (!existsSync(abs)) continue;
  const rel = relative(process.cwd(), abs);
  if (shouldSkip(rel)) continue;
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  if (text.length > 2_000_000) continue;
  scanText(text, rel, 'working-tree');
}

// ---------- 2. git history ----------
if (!TREE_ONLY) {
  let commits = [];
  try {
    const out = execFileSync('git', ['rev-list', '--all', '--max-count=500'], {
      encoding: 'utf8',
    });
    commits = out.split('\n').filter(Boolean);
  } catch (err) {
    if (!AS_JSON) console.error('Could not enumerate commits:', err.message);
  }

  for (const sha of commits) {
    let changed = [];
    try {
      // Only inspect text-ish files that actually changed in this commit.
      const names = execFileSync(
        'git',
        ['show', '--pretty=format:', '--name-only', '--diff-filter=ACMR', sha],
        { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
      );
      changed = names
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !shouldSkip(s));
    } catch {
      continue;
    }

    for (const rel of changed) {
      let content;
      try {
        content = execFileSync('git', ['show', `${sha}:${rel}`], {
          encoding: 'utf8',
          maxBuffer: 8 * 1024 * 1024,
        });
      } catch {
        continue;
      }
      // Attribute to the earliest commit that introduced it so the reported
      // sha is where a maintainer should look (`git show <sha>:<file>`).
      scanText(content, rel, 'git-history');
    }
  }
}

// ---------- dedupe ----------
const seen = new Set();
const unique = findings.filter((f) => {
  const key = `${f.category}:${f.pattern}:${f.file}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// ---------- report ----------
const treeFindings = unique.filter((f) => f.category === 'working-tree');
const histFindings = unique.filter((f) => f.category === 'git-history');

if (AS_JSON) {
  console.log(JSON.stringify({ workingTree: treeFindings, gitHistory: histFindings }, null, 2));
  process.exit(unique.length ? 1 : 0);
}

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

console.log(`\n${BOLD}Secret exposure audit${OFF} ${DIM}(${new Date().toISOString()})${OFF}\n`);

if (treeFindings.length === 0) {
  console.log(`${GREEN}✓${OFF} Working tree: no secret literals in tracked files.`);
} else {
  console.log(`${RED}✗${OFF} Working tree: ${treeFindings.length} finding(s)\n`);
  for (const f of treeFindings) {
    console.log(`  ${RED}${f.label}${OFF}  ${DIM}(${f.pattern})${OFF}`);
    console.log(`    ${f.file}:${f.lines.join(',')}`);
    console.log(`    → ${f.note}\n`);
  }
}

if (!TREE_ONLY) {
  if (histFindings.length === 0) {
    console.log(`${GREEN}✓${OFF} Git history: no secret literals in the last 500 commits.`);
  } else {
    console.log(`${YELLOW}!${OFF} Git history: ${histFindings.length} finding(s)\n`);
    console.log(`  ${DIM}These are NOT in your working tree. They are still recoverable:${OFF}`);
    for (const f of histFindings) {
      console.log(`  ${YELLOW}${f.label}${OFF}  ${DIM}(${f.pattern}) in ${f.file}${OFF}`);
    }
    console.log(`\n${BOLD}Rotation checklist${OFF} ${DIM}(code changes do NOT clear these)${OFF}`);
    const notes = [...new Set(unique.map((f) => f.note))];
    notes.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
    console.log(`\n  ${BOLD}Then purge history${OFF} if this repo was ever pushed publicly:`);
    console.log(`    ${DIM}git filter-repo --invert-paths --path <file>${OFF}  ${DIM}or${OFF}`);
    console.log(`    ${DIM}bfg --delete-files <file>${OFF}`);
    console.log(`    ${DIM}then force-push and have everyone re-clone.${OFF}`);
    console.log(`    ${DIM}History rewrite changes every commit sha: do not skip the re-clone step.${OFF}\n`);
  }
}

console.log(
  unique.length === 0
    ? `${GREEN}All clear.${OFF}\n`
    : `${YELLOW}${unique.length} total finding(s).${OFF}\n`
);
process.exit(unique.length ? 1 : 0);
