'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import { isValidEmail } from '@/lib/security';
import { securityLog } from '@/lib/api-security';

export interface AuthActionState {
  error?: string;
  message?: string;
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * Reads the client IP for rate-limit keying.
 *
 * Server Actions have no `Request` object, so the headers are read from the
 * incoming action request instead.
 */
async function actionClientIp(): Promise<string> {
  try {
    const h = await headers();
    return getClientIP(h as unknown as Headers);
  } catch {
    return '127.0.0.1';
  }
}

/**
 * Resolves where a freshly authenticated user belongs.
 *
 * Preserved from the existing client-side flow (admin -> /admin, incomplete
 * profile -> /onboarding). The old version redirected everything to /events,
 * which would strand admins and new members in the wrong place.
 */
async function resolveLanding(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return '/';

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('role, is_onboarded')
    .eq('id', session.user.id)
    .single();

  if (profile?.role === 'admin') return '/admin';
  if (profile && !profile.is_onboarded) return '/onboarding';
  return '/';
}

/**
 * Signs a user in, server-side.
 *
 * This replaces the previous client-side `supabase.auth.signInWithPassword`
 * call, which meant credentials were handed to the browser and, because it
 * never passed through `/api/*`, bypassed every rate limit in the app.
 */
export async function login(formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');
  const ip = await actionClientIp();

  // Brute-force protection: throttle per IP and per account.
  const [byIp, byAccount] = await Promise.all([
    checkRateLimit(`login_ip:${ip}`, 'auth'),
    checkRateLimit(`login_acct:${email || 'unknown'}`, 'auth'),
  ]);

  if (!byIp.success || !byAccount.success) {
    securityLog('auth.denied', 'Login throttled by rate limiter', {
      ip,
      status: 429,
    });
    return { error: 'Too many sign-in attempts. Please wait a minute and try again.' };
  }

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (!isValidEmail(email)) {
    // Deliberately vague: do not confirm which addresses are registered.
    return { error: 'Unable to sign in with those details.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Same message for unknown-account and wrong-password, so the form is not
    // an account-existence oracle.
    securityLog('auth.missing', 'Sign-in rejected', { ip, status: 401 });
    return { error: 'Unable to sign in with those details.' };
  }

  const destination = await resolveLanding(supabase);
  redirect(destination);
}

/**
 * Creates an account, server-side.
 *
 * The old version had no sign-up flow at all, so this is new work modelled on
 * its onboarding action. Rate-limited for the same reason as `login`.
 */
export async function signup(formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('fullName') || '').trim();
  const ip = await actionClientIp();

  const [byIp, byAccount] = await Promise.all([
    checkRateLimit(`signup_ip:${ip}`, 'auth'),
    checkRateLimit(`signup_acct:${email || 'unknown'}`, 'register'),
  ]);

  if (!byIp.success || !byAccount.success) {
    securityLog('auth.denied', 'Sign-up throttled by rate limiter', { ip, status: 429 });
    return { error: 'Too many sign-up attempts. Please wait a minute and try again.' };
  }

  if (!isValidEmail(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!fullName) {
    return { error: 'Please enter your full name.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    // Supabase's "already registered" text would confirm the address exists.
    if (/already|registered|exists/i.test(error.message)) {
      securityLog('auth.denied', 'Sign-up for an existing account', { ip, status: 409 });
      return { error: 'Unable to create an account with those details.' };
    }
    return { error: 'Unable to create your account right now. Please try again.' };
  }

  return {
    message:
      'Account created! Please check your email to confirm registration, or sign in directly.',
  };
}
