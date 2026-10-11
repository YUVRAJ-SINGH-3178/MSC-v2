import { NextResponse } from 'next/server';
import { isValidEmail } from '@/lib/security';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import { getAdminClient } from '@/lib/supabase/admin';
import { FALLBACK_EVENTS } from '@/lib/data/mock-fallback';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body.query || body.email || '').trim();

    const clientIp = getClientIP(req.headers);
    const rateLimit = await checkRateLimit(`ticket_lookup_${clientIp}`, 'api');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many search requests. Please wait a moment.' }, { status: 429 });
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Please enter your registered email address or college registration number.' },
        { status: 400 }
      );
    }

    const cleaned = query.toLowerCase().trim();
    const supabase = getAdminClient();

    let foundTickets: any[] = [];

    try {
      // 1. Primary search matching lead_email, registration_number, reg_num, or ticket_id
      const orFilter = `lead_email.ilike.%${cleaned}%,form_data->>registration_number.ilike.%${cleaned}%,form_data->>reg_num.ilike.%${cleaned}%,form_data->>ticket_id.ilike.%${cleaned}%,form_data->>full_name.ilike.%${cleaned}%`;

      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          hash_payload,
          status,
          lead_email,
          form_data,
          team_data,
          events (
            id,
            title,
            date_start,
            location
          )
        `)
        .or(orFilter)
        .eq('status', 'confirmed');

      if (!error && data && data.length > 0) {
        foundTickets = data.map((r: any) => ({
          hash_payload: r.hash_payload,
          event_title: r.events?.title || 'MSC Event',
          date_start: r.events?.date_start || new Date().toISOString(),
          location: r.events?.location || 'SRM University AP',
          status: r.status,
          lead_name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
          lead_email: r.lead_email,
          team_name: r.team_data?.team_name,
        }));
      }

      // 2. If not found in primary fields, search in embedded team_data->members
      if (foundTickets.length === 0) {
        const { data: teamRegs } = await supabase
          .from('registrations')
          .select(`
            id,
            hash_payload,
            status,
            lead_email,
            form_data,
            team_data,
            events (
              id,
              title,
              date_start,
              location
            )
          `)
          .not('team_data', 'is', null)
          .eq('status', 'confirmed');

        if (teamRegs && teamRegs.length > 0) {
          const matched = teamRegs.filter((tr: any) => {
            const members = tr.team_data?.members || [];
            return members.some((m: any) => {
              const mEmail = (m.email || '').toLowerCase();
              const mReg = (m.regNum || m.reg_number || '').toLowerCase();
              const mName = (m.fullName || m.name || '').toLowerCase();
              return mEmail.includes(cleaned) || mReg.includes(cleaned) || mName.includes(cleaned);
            });
          });

          if (matched.length > 0) {
            foundTickets = matched.map((r: any) => ({
              hash_payload: r.hash_payload,
              event_title: r.events?.title || 'MSC Event',
              date_start: r.events?.date_start || new Date().toISOString(),
              location: r.events?.location || 'SRM University AP',
              status: r.status,
              lead_name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
              lead_email: r.lead_email,
              team_name: r.team_data?.team_name,
            }));
          }
        }
      }
    } catch (dbErr) {
      console.error('[Ticket lookup DB error]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      tickets: foundTickets,
    });
  } catch (err: any) {
    console.error('[Ticket lookup error]:', err);
    return NextResponse.json({ error: 'Failed to look up tickets' }, { status: 500 });
  }
}
