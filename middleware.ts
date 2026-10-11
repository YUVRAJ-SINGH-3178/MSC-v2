import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://mscsrmap.xyz,https://www.mscsrmap.xyz,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''));

  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const requestOrigin = request.nextUrl.origin;

  // Determine whether this request's origin is authorized
  const isSameOrigin = !origin || origin === requestOrigin || (host ? origin.replace(/^https?:\/\//, '') === host : false);
  const isLocalDev = Boolean(
    origin && (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)
    )
  );
  const isExplicitlyAllowed = Boolean(origin && allowedOrigins.includes(origin));
  const isAllowed = isSameOrigin || isLocalDev || isExplicitlyAllowed;

  // 1. CORS Preflight & Origin Verification for /api/ routes
  if (pathname.startsWith('/api/')) {
    if (origin) {
      if (!isAllowed) {
        return new NextResponse(JSON.stringify({ error: 'CORS origin not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
        });
      }

      // Handle OPTIONS preflight
      if (request.method === 'OPTIONS') {
        const preflightHeaders = new Headers();
        preflightHeaders.set('Access-Control-Allow-Origin', origin);
        preflightHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        preflightHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        preflightHeaders.set('Access-Control-Allow-Credentials', 'true');
        preflightHeaders.set('Access-Control-Max-Age', '86400');
        preflightHeaders.set('Vary', 'Origin');
        return new NextResponse(null, { status: 204, headers: preflightHeaders });
      }
    }
  }

  // 2. Setup response and attach transport security headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), payment=(self), usb=()'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');

  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Content-Security-Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https: wss:;
    frame-src 'self' https://checkout.razorpay.com;
    media-src 'self' https: data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  if (origin && isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  // 3. Supabase session refresh only if auth cookies exist and Supabase URL is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.includes('supabase'));

  if (
    supabaseUrl &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey &&
    hasAuthCookies
  ) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Protect with a 1.5s timeout so offline or slow network never blocks requests
      await Promise.race([
        supabase.auth.getUser(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 1500)),
      ]);
    } catch {
      // Gracefully ignore fetch/auth errors so public pages load immediately
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - custom-events (static microsites)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)$|custom-events).*)',
  ],
};
