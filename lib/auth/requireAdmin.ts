import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';

export type RequireAdminResult =
  | { authorized: false; response: NextResponse; user?: never; role?: never }
  | { authorized: true; response?: never; user: User; role: string };

/**
 * Server-side helper that reads the Supabase session from cookies via @supabase/ssr,
 * verifies the caller against Supabase Auth, fetches the caller's role from member_profiles,
 * and ensures they are an `admin` (the only role that may use the admin portal —
 * the other role is `member`).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore in Route Handler read context
          }
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized: Authentication session required' },
          { status: 401 }
        ),
      };
    }

    // Fetch the caller's role from member_profiles
    let role: string | null = null;

    try {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role) {
        role = profile.role;
      }
    } catch {
      // Fallback to adminClient below
    }

    if (!role) {
      // Service-role fallback in case RLS policy restricts direct select on member_profiles
      try {
        const adminClient = getAdminClient();
        const { data: adminProfile } = await adminClient
          .from('member_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (adminProfile?.role) {
          role = adminProfile.role;
        }
      } catch {
        // Ignored
      }
    }

    if (!role || role !== 'admin') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden: Admin privileges required' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user,
      role,
    };
  } catch (err: any) {
    console.error('[requireAdmin error]:', err);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal authentication verification error' },
        { status: 500 }
      ),
    };
  }
}
