#!/usr/bin/env node

/**
 * Clears the Next.js build cache before `dev` and `build`.
 *
 * Why this exists
 * ---------------
 * `next dev` and `next build` both write to the same `.next` directory. If a
 * build runs while a dev server is live, the production build overwrites the
 * chunks the dev server already loaded into memory. The dev server keeps its
 * stale in-memory module registry, so page loads fail with errors like:
 *
 *   Cannot find module './vendor-chunks/@supabase.js'
 *     at webpack-runtime.js
 *
 * The on-disk artifacts look fine: the mismatch is only in the running
 * process, so restarting the dev server is not always enough once
 * `webpack-runtime.js` has been rewritten underneath it.
 *
 * This is a known recurring failure in this repo (the older project carried the
 * same guard as an inline `predev` script). Doing it up front is cheaper than
 * debugging a corrupt chunk graph.
 *
 * Pass --keep to skip the clean (useful for iterating on the build itself).
 */

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TARGETS = ['.next', 'tsconfig.tsbuildinfo'];
const skip = process.argv.includes('--keep');

if (skip) {
  console.log('[clean-build-cache] --keep passed, leaving build artifacts in place.');
  process.exit(0);
}

const root = process.cwd();
let removed = 0;

for (const target of TARGETS) {
  const full = join(root, target);
  if (!existsSync(full)) continue;
  try {
    rmSync(full, { recursive: true, force: true });
    removed++;
  } catch (err) {
    // A stale server may still hold a file handle. Not fatal: `next dev`
    // overwrites these paths anyway.
    console.warn(`[clean-build-cache] could not remove ${target}: ${err.message}`);
  }
}

console.log(
  removed > 0
    ? `[clean-build-cache] removed ${removed} stale build artifact(s).`
    : '[clean-build-cache] nothing to clean.'
);
