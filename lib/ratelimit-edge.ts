/**
 * Edge-runtime rate limiter for `middleware.ts`.
 *
 * Why this exists
 * ---------------
 * `lib/ratelimit.ts` imports `@upstash/redis`, whose default export resolves
 * to `nodejs.mjs` under webpack. Importing it from middleware pulls a Node-only
 * API (`process.version`) into the edge runtime and produces:
 *
 *   A Node.js API is used (process.version at line: 241) which is not
 *   supported in the Edge Runtime.
 *
 * Upstash is a plain REST API, so the middleware path can talk to it over
 * `fetch` with no SDK at all (fully edge-compatible), and it also strips the
 * SDK from the middleware bundle.
 *
 * The middleware uses a fixed window rather than the sliding window in
 * `lib/ratelimit.ts`. That is deliberate: this is a global backstop ceiling, and
 * the per-route limiters (which run on the Node runtime and do use a sliding
 * window) are the authoritative, stricter limits.
 */

export type RateLimitTier = 'auth' | 'register' | 'payment' | 'api' | 'default';

const TIER_CONFIGS: Record<RateLimitTier, { requests: number; windowMs: number }> = {
  auth: {
    requests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000', 10),
  },
  register: {
    requests: 5,
    windowMs: 60000,
  },
  payment: {
    requests: 10,
    windowMs: 60000,
  },
  api: {
    requests: parseInt(process.env.RATE_LIMIT_API_MAX_REQUESTS || '30', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10),
  },
  default: {
    requests: parseInt(process.env.RATE_LIMIT_DEFAULT_MAX_REQUESTS || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_DEFAULT_WINDOW_MS || '60000', 10),
  },
};

export function getTierLimit(tier: RateLimitTier) {
  return TIER_CONFIGS[tier] || TIER_CONFIGS.default;
}

// ---------------------------------------------------------------------------
// In-memory fallback (same sliding-window algorithm as lib/ratelimit.ts)
// ---------------------------------------------------------------------------

interface Bucket {
  timestamps: number[];
}

class MemoryLimiter {
  private buckets = new Map<string, Bucket>();

  check(
    key: string,
    limit: number,
    windowMs: number
  ): { success: boolean; remaining: number; reset: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((ts) => ts > now - windowMs);

    if (bucket.timestamps.length >= limit) {
      const oldest = bucket.timestamps[0] || now;
      return { success: false, remaining: 0, reset: oldest + windowMs };
    }

    bucket.timestamps.push(now);
    return { success: true, remaining: limit - bucket.timestamps.length, reset: now + windowMs };
  }

  cleanup(maxAgeMs = 300_000) {
    const threshold = Date.now() - maxAgeMs;
    for (const [key, bucket] of this.buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => ts > threshold);
      if (bucket.timestamps.length === 0) this.buckets.delete(key);
    }
  }
}

const memory = new MemoryLimiter();

if (typeof setInterval !== 'undefined') {
  setInterval(() => memory.cleanup(), 120_000);
}

// ---------------------------------------------------------------------------
// Upstash REST, via fetch
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Rejects placeholder values so a misconfigured env fails open to memory. */
const upstashConfigured =
  Boolean(UPSTASH_URL && UPSTASH_TOKEN) &&
  UPSTASH_URL!.startsWith('https://') &&
  !UPSTASH_URL!.includes('YOUR_') &&
  !UPSTASH_URL!.includes('placeholder');

async function upstashFixedWindow(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // INCR + PEXPIRE, pipelined in a single round trip. EXPIRE is only applied
  // when INCR returned 1 so the window is not extended by every hit.
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, windowMs, 'NX'],
    ]),
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}`);

  const pipeline = (await res.json()) as Array<{ result: number | null }>;
  const count = Number(pipeline?.[0]?.result ?? 0);

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + windowMs,
  };
}

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'default'
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  source: 'upstash' | 'memory';
}> {
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.default;
  const key = `msc_rl:${tier}:${identifier}`;

  if (upstashConfigured) {
    try {
      return { ...(await upstashFixedWindow(key, config.requests, config.windowMs)), source: 'upstash' };
    } catch (err) {
      // Fail open to the in-memory limiter, matching the Node path.
      console.warn('[RateLimit:edge] Upstash error, using in-memory limiter.', err);
    }
  }

  return { ...memory.check(key, config.requests, config.windowMs), source: 'memory' };
}

export function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

/**
 * Converts a limiter `reset` timestamp into a `Retry-After` value.
 *
 * `reset` is an absolute epoch in **milliseconds**. `Retry-After` must be
 * either a number of seconds or an HTTP-date. Mixing the two (subtracting
 * seconds from a millisecond value) produced values like `1788570969158`,
 * which a client would read as a 56-year wait.
 */
export function retryAfterSeconds(reset: number, now = Date.now()): number {
  if (!Number.isFinite(reset)) return 1;
  return Math.max(1, Math.ceil((reset - now) / 1000));
}
