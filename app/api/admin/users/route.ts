import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/ratelimit';
import { guardAdminRemoval, guardRoleChange } from '@/lib/single-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = await checkRateLimit(auth.user.id, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, users: data || [] });
  } catch (err: any) {
    console.error('Error fetching admin users:', err);
    return NextResponse.json({ error: err.message, users: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = await checkRateLimit(auth.user.id, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Provisioning accounts and assigning roles strictly requires the admin role
  if (auth.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can provision accounts or assign member roles' },
      { status: 403 }
    );
  }

  try {
    const { email, password, full_name, role, department, year } = await req.json();

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Valid email and password (minimum 8 characters) required' },
        { status: 400 }
      );
    }

    const assignedRole = role === 'admin' ? 'admin' : 'member';
    const supabase = getAdminClient();

    // One administrator only: refuse to provision a second admin account.
    const guard = await guardRoleChange(supabase, undefined, assignedRole);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    // Provision user via Supabase Auth Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: assignedRole },
    });

    if (authError) {
      console.error('Supabase Auth user creation error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (authUser?.user) {
      const { data: profile, error: profError } = await supabase
        .from('member_profiles')
        .upsert({
          id: authUser.user.id,
          email,
          full_name: full_name || email.split('@')[0],
          role: assignedRole,
          department: department || 'CSE',
          year_of_study: year || '3rd Year',
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profError) {
        console.error('Profile creation error:', profError);
      }

      return NextResponse.json({ success: true, user: profile || authUser.user });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } catch (err: any) {
    console.error('Admin provision user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = await checkRateLimit(auth.user.id, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const { user_id, action, role, new_password } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    if (action === 'update_role' && role) {
      // Role modifications strictly require admin role
      if (auth.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can modify member roles' },
          { status: 403 }
        );
      }

      // Two roles only: admin | member (stale clients may still send core_member)
      if (!['admin', 'member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
      }

      const guard = await guardRoleChange(supabase, user_id, role);
      if (!guard.ok) {
        return NextResponse.json({ error: guard.message }, { status: guard.status });
      }

      const { error } = await supabase
        .from('member_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', user_id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Role updated successfully' });
    }

    if (action === 'reset_password' && new_password) {
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin user update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = await checkRateLimit(auth.user.id, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Account deletion strictly requires admin role (core_members cannot delete accounts)
  if (auth.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can delete accounts' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot delete your own administrative account' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // One administrator only: the sole administrator account cannot be deleted.
    const guard = await guardAdminRemoval(supabase, userId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      console.warn('Auth user delete warning:', authErr.message);
    }
    const { error: profErr } = await supabase.from('member_profiles').delete().eq('id', userId);
    if (profErr) {
      console.warn('Profile delete warning:', profErr.message);
    }

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    console.error('Admin user delete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
