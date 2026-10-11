import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP, RateLimitTier } from '@/lib/ratelimit';
import { retryAfterSeconds } from '@/lib/ratelimit-edge';

const MAX_JSON_BYTES = 64 * 1024;

/**
 * Every API response must be uncacheable. Registration ids, `hash_payload`
 * ticket secrets and admin PII are all returned from these routes, and Next's
 * default cache headers would allow a shared cache or the browser to retain them.
 */
export function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
  headers: HeadersInit = {}
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

/**
 * Parses a request body as a plain JSON object.
 *
 * Unlike a bare `req.json()` this rejects arrays, primitives and oversized
 * bodies, so callers can treat a non-null result as a safe object to destructure.
 */
export async function readJsonObject(
  request: NextRequest
): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BYTES) return null;

  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves the caller from the request cookies, server-verified.
 * Returns either a ready 401 response or the user plus an RLS-honouring client.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    securityLog('auth.missing', 'No valid session on a protected route', {
      status: 401,
    });
    return { error: noStoreJson({ error: 'Authentication required' }, 401) };
  }
  return { supabase, user: data.user };
}

/**
 * There are exactly two roles: `admin` (admin portal) and `member` (member
 * portal). This guard is admin-only.
 */
export type AdminRole = 'admin';

/**
 * Guard for privileged routes.
 *
 * These routes use the service-role client, which bypasses RLS, so identity and
 * permission MUST be verified here first: the middleware only gates the `/admin`
 * page prefix and never matches `/api/admin/*`.
 */
export async function requireAdmin() {
  const auth = await requireUser();
  if ('error' in auth) return auth;

  const { supabase, user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from('member_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    securityLog('auth.invalid_role', 'Authenticated user has no member_profiles row', {
      actor: user.id,
      status: 403,
    });
    return { error: noStoreJson({ error: 'Profile not found' }, 403) };
  }

  if (profile.role !== 'admin') {
    securityLog('auth.denied', 'Role lacks permission for a privileged route', {
      actor: user.id,
      status: 403,
      role: profile.role,
      required: ['admin'],
    });
    return {
      error: noStoreJson({ error: 'Forbidden: admin access required' }, 403),
    };
  }

  return { supabase, user, role: profile.role as AdminRole };
}

/**
 * Enforces a distributed limit on financially-sensitive writes.
 *
 * Rate-limit headers are returned so clients can back off, and the response is
 * always `no-store` because it describes limiter state.
 */
export async function enforceSensitiveRateLimit(
  request: NextRequest,
  name: string,
  tier: RateLimitTier = 'payment'
) {
  const result = await checkRateLimit(`${name}:${getClientIP(request.headers)}`, tier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(tier === 'payment' ? 10 : tier === 'api' ? 30 : 100),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (!result.success) {
    securityLog('ratelimit.tier_hit', 'Route-level rate limit exceeded', {
      ip: getClientIP(request.headers),
      path: new URL(request.url).pathname,
      status: 429,
      tier,
    });
    // `result.reset` is epoch milliseconds; Retry-After must be seconds.
    const retryAfter = retryAfterSeconds(result.reset);
    return noStoreJson(
      { error: 'Too many requests. Please try again shortly.' },
      429,
      { ...headers, 'Retry-After': String(retryAfter) }
    );
  }

  return { headers };
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Records a privileged mutation for the audit trail.
 * The old project logged these; this project had no equivalent.
 */
export function auditLog(action: string, actorId: string, detail: string) {
  console.log(`[AUDIT] ${action} by ${actorId} | ${detail}`);
}

export type SecurityEvent =
  | 'auth.missing'
  | 'auth.invalid_role'
  | 'auth.denied'
  | 'ratelimit.exceeded'
  | 'ratelimit.tier_hit'
  | 'reset.request_expired'
  | 'reset.duplicate'
  | 'reset.unknown_account'
  | 'payment.forge_attempt'
  | 'upload.rejected';

export interface SecurityEventFields {
  /** Authenticated user id, when known. */
  actor?: string | null;
  /** Client IP, when a request object is available. */
  ip?: string | null;
  /** Coarse client fingerprint to spot scrapers behind rotating IPs. */
  userAgent?: string | null;
  /** Route or endpoint involved. */
  path?: string | null;
  /** HTTP status returned to the caller. */
  status?: number;
  [key: string]: unknown;
}

/**
 * Emits a single-line structured security event.
 *
 * These are the signals Check 03 asks for: authentication failures and
 * throttling. They are intentionally NOT audit records; they are emitted on
 * every rejected request, so they should be shipped to a separate log sink (and
 * alerted on) rather than mixed into the `[AUDIT]` stream of successful
 * privileged actions.
 *
 * Never pass secrets, tokens, passwords or full PII in `detail`.
 */
export function securityLog(event: SecurityEvent, detail: string, fields: SecurityEventFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level: 'warn',
    event,
    detail,
    ...fields,
  };

  // Single-line JSON so log shippers can parse it without a regex.
  console.warn(`[SECURITY] ${JSON.stringify(payload)}`);
}

/** Extracts the IP and user agent from a request for security logging. */
export function requestFingerprint(request: Request | NextRequest) {
  return {
    ip: getClientIP(request.headers),
    userAgent: request.headers.get('user-agent'),
    path: new URL(request.url).pathname,
  };
}
