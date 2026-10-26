import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, noStoreJson } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify admin authorization
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const supabase = getAdminClient();

    // 1. Live Events query
    const { data: events } = await supabase.from('events').select('id, status');
    const totalEvents = events?.length || 0;
    const activeEvents = events?.filter((e: any) => e.status === 'upcoming').length || 0;

    // 2. Live Registrations query
    const { data: registrations } = await supabase.from('registrations').select('id, checked_in');
    const totalRegistrations = registrations?.length || 0;
    const checkedInCount = registrations?.filter((r: any) => r.checked_in).length || 0;
    const attendanceRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;

    // 3. Live Payments / Revenue query
    const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'captured');
    const revenueInPaise = payments?.reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;
    const revenueInRupees = revenueInPaise / 100;

    return noStoreJson({
      totalEvents,
      activeEvents,
      totalRegistrations,
      checkedInCount,
      attendanceRate,
      revenueInRupees,
    });
  } catch (err: any) {
    console.error('[Admin Metrics] error:', err);
    return noStoreJson({ error: 'Failed to fetch metrics' }, 500);
  }
}