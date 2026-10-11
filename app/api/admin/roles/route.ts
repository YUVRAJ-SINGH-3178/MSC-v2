import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/ratelimit';
import { guardRoleChange } from '@/lib/single-admin';

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
      .select('id, email, full_name, role, is_onboarded, department, year_of_study, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, members: data || [] });
  } catch (err: any) {
    console.error('Error fetching member roles:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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

  // Only administrators can change member roles (members cannot change roles)
  if (auth.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can modify member roles' },
      { status: 403 }
    );
  }

  try {
    const { user_id, role } = await req.json();

    if (!user_id || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid user ID or role specified' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // One administrator only: refuse a second admin, and refuse removing the
    // last one (lib/single-admin.ts mirrors the database constraint).
    const guard = await guardRoleChange(supabase, user_id, role);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const { error } = await supabase
      .from('member_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (error) throw error;

    return NextResponse.json({ success: true, user_id, role });
  } catch (err: any) {
    console.error('Error updating member role:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
