import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

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

  try {
    const { event_id, hash_payload, team_mode, member_id, member_email } = await req.json();

    const supabase = getAdminClient();

    // 0. If direct member_id check-in is requested
    if (member_id && typeof member_id === 'string' && !member_id.startsWith('team-') && !member_id.includes('-m-')) {
      const { error: mError } = await supabase
        .from('registrations')
        .update({
          checked_in: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member_id);

      if (mError) {
        console.error('Individual member check-in error:', mError);
        return NextResponse.json({ success: false, error: mError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Member checked in successfully',
        member_id,
      });
    }

    if (!hash_payload) {
      return NextResponse.json({ success: false, error: 'QR ticket token is required' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hash_payload);

    // 1. Look up registration safely
    let query = supabase.from('registrations').select('*, events(title)');

    if (isUUID) {
      query = query.or(`hash_payload.eq.${hash_payload},id.eq.${hash_payload}`);
    } else {
      query = query.or(
        `hash_payload.eq.${hash_payload},lead_email.ilike.%${hash_payload}%,form_data->>registration_number.ilike.%${hash_payload}%,form_data->>reg_num.ilike.%${hash_payload}%,form_data->>ticket_id.ilike.%${hash_payload}%`
      );
    }

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const checkinResult = await query.maybeSingle();
    let reg = checkinResult.data;
    const error = checkinResult.error;

    if (error) {
      console.error('Checkin query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fallback: search within team_data->members if not found in primary rows
    if (!reg) {
      const { data: teamRegs } = await supabase
        .from('registrations')
        .select('*, events(title)')
        .not('team_data', 'is', null);

      if (teamRegs && teamRegs.length > 0) {
        const clean = hash_payload.toLowerCase().trim();
        const matched = teamRegs.find((tr: any) => {
          if (event_id && tr.event_id !== event_id) return false;
          const members = tr.team_data?.members || [];
          return members.some((m: any) => {
            const mReg = (m.regNum || m.reg_number || m.registration_number || '').toLowerCase().trim();
            const mEmail = (m.email || '').toLowerCase().trim();
            const mName = (m.fullName || m.name || '').toLowerCase().trim();
            return mReg === clean || mEmail === clean || mName === clean;
          });
        });
        if (matched) {
          reg = matched;
        }
      }
    }

    if (!reg) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found in registration database for this event.' },
        { status: 404 }
      );
    }

    const participantName =
      reg.form_data?.full_name || reg.form_data?.name || reg.lead_email.split('@')[0];
    const registrationNumber =
      reg.form_data?.registration_number || reg.form_data?.reg_num || 'N/A';
    const teamName = reg.team_data?.team_name?.trim() || '';
    const teamId = reg.team_data?.team_id;
    const isTeam = Boolean(teamName && !['individual', 'solo', '-', 'n/a', 'none'].includes(teamName.toLowerCase()));

    // Resolve full team roster
    let teamMembers: Array<{ id: string; name: string; email: string; reg_number?: string; role?: string; checked_in?: boolean }> = [];

    if (isTeam) {
      let tQuery = supabase
        .from('registrations')
        .select('id, lead_email, form_data, team_data, checked_in')
        .eq('event_id', reg.event_id);

      if (teamId) {
        tQuery = tQuery.filter('team_data->>team_id', 'eq', teamId);
      } else {
        tQuery = tQuery.filter('team_data->>team_name', 'eq', teamName);
      }

      const { data: siblings } = await tQuery;
      if (siblings && siblings.length > 0) {
        teamMembers = siblings.map((s: any) => ({
          id: s.id,
          name: s.form_data?.full_name || s.form_data?.name || s.lead_email.split('@')[0],
          email: s.lead_email,
          reg_number: s.form_data?.registration_number || s.form_data?.reg_num || 'N/A',
          role: s.form_data?.role || s.team_data?.role || 'Member',
          checked_in: Boolean(s.checked_in),
        }));
      } else if (reg.team_data?.members && reg.team_data.members.length > 0) {
        teamMembers = reg.team_data.members.map((m: any, idx: number) => ({
          id: `${reg.id}-m-${idx}`,
          name: m.fullName || m.name,
          email: m.email,
          reg_number: m.regNum || m.reg_number,
          role: idx === 0 ? 'Leader' : 'Member',
          checked_in: Boolean(m.checked_in ?? reg.checked_in),
        }));
      }
    }

    // 2. If entire team check-in is requested
    if (isTeam && team_mode === 'all') {
      let updateTeamQuery = supabase
        .from('registrations')
        .update({
          checked_in: true,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', reg.event_id);

      if (teamId) {
        updateTeamQuery = updateTeamQuery.filter('team_data->>team_id', 'eq', teamId);
      } else {
        updateTeamQuery = updateTeamQuery.filter('team_data->>team_name', 'eq', teamName);
      }

      await updateTeamQuery;

      // Also ensure current reg row is marked
      await supabase
        .from('registrations')
        .update({ checked_in: true, updated_at: new Date().toISOString() })
        .eq('id', reg.id);

      return NextResponse.json({
        success: true,
        already_checked_in: false,
        is_team: true,
        message: `Entire team ${teamName} (${teamMembers.length} members) checked in!`,
        participant_name: participantName,
        registration_number: registrationNumber,
        team_name: teamName,
        team_members: teamMembers.map((m) => ({ ...m, checked_in: true })),
      });
    }

    // 3. Check if this individual attendee is already checked in
    if (reg.checked_in && (!team_mode || team_mode === 'lead_only')) {
      return NextResponse.json({
        success: true,
        already_checked_in: true,
        is_team: isTeam,
        participant_name: participantName,
        registration_number: registrationNumber,
        team_name: teamName,
        team_members: teamMembers,
        checked_in_at: new Date(reg.updated_at || reg.created_at).toLocaleTimeString(),
      });
    }

    // 4. Mark this individual checked in
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        checked_in: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reg.id);

    if (updateError) {
      console.error('Checkin update error:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      already_checked_in: false,
      is_team: isTeam,
      participant_name: participantName,
      registration_number: registrationNumber,
      team_name: teamName,
      team_members: teamMembers.map((m) => (m.id === reg.id ? { ...m, checked_in: true } : m)),
    });
  } catch (err: any) {
    console.error('Checkin API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

