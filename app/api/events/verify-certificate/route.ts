import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventIdOrSlug = (body.eventId || body.slug || '').trim();
    const query = (body.query || body.email || body.name || '').trim();

    const clientIp = getClientIP(req.headers);
    const rateLimit = await checkRateLimit(`cert_verify_${clientIp}`, 'api');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Too many verification attempts. Please wait a moment.' },
        { status: 429 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Please enter your registered participant name, college email, or registration number.' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Resolve Event cleanly without UUID syntax errors
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);
    let event: any = null;

    if (isUUID) {
      const { data } = await supabase.from('events').select('*').eq('id', eventIdOrSlug).maybeSingle();
      event = data;
    } else if (eventIdOrSlug) {
      const { data } = await supabase.from('events').select('*').eq('slug', eventIdOrSlug).maybeSingle();
      event = data;

      if (!event && (eventIdOrSlug === 'synora' || eventIdOrSlug === 'synora-2026')) {
        const { data: synoraEv } = await supabase.from('events').select('*').eq('slug', 'synora-26').maybeSingle();
        event = synoraEv;
      }
    }

    if (!event) {
      // Default to latest published event
      const { data: latestEv } = await supabase
        .from('events')
        .select('*')
        .order('date_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      event = latestEv;
    }

    if (!event) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Event not found.' },
        { status: 404 }
      );
    }

    // 2. Check if certificates are enabled for this event
    if (!event.form_requirements?.provide_certificates) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `E-Certificates are closed or not issued for "${event.title}". The organizers have marked this session as non-certificate accredited.`,
        },
        { status: 400 }
      );
    }

    const cleanQ = query.toLowerCase().trim();

    // 3. Search registrations for this event
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id, hash_payload, lead_email, form_data, team_data, checked_in, status, created_at')
      .eq('event_id', event.id);

    if (regError) {
      console.error('[Cert verification DB error]:', regError);
      return NextResponse.json(
        { success: false, verified: false, error: 'Database verification failed. Please try again.' },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `No registrations found on record for "${event.title}".`,
        },
        { status: 404 }
      );
    }

    // Find participant matching query
    const matchedReg = registrations.find((r: any) => {
      const email = (r.lead_email || '').toLowerCase().trim();
      const fullName = (r.form_data?.full_name || r.form_data?.name || '').toLowerCase().trim();
      const regNum = (r.form_data?.registration_number || r.form_data?.reg_num || '').toLowerCase().trim();
      const ticketId = (r.form_data?.ticket_id || '').toLowerCase().trim();
      const hash = (r.hash_payload || '').toLowerCase().trim();

      if (
        email === cleanQ ||
        fullName === cleanQ ||
        (cleanQ.length >= 3 && fullName.includes(cleanQ)) ||
        regNum === cleanQ ||
        ticketId === cleanQ ||
        hash === cleanQ
      ) {
        return true;
      }

      const members = r.team_data?.members || [];
      return members.some((m: any) => {
        const mName = (m.name || m.fullName || '').toLowerCase().trim();
        const mEmail = (m.email || '').toLowerCase().trim();
        const mReg = (m.regNum || m.reg_number || m.regNumber || '').toLowerCase().trim();
        return (
          mEmail === cleanQ ||
          mName === cleanQ ||
          (cleanQ.length >= 3 && mName.includes(cleanQ)) ||
          mReg === cleanQ
        );
      });
    });

    if (!matchedReg) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: `No verified attendance found matching "${query}". Please ensure you enter the exact full name, university registration number (e.g. AP26...), or college email used during registration.`,
      });
    }

    if (matchedReg.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        verified: false,
        error: `Registration for "${query}" is not confirmed. Certificates are available only for confirmed attendees.`,
      });
    }

    let participantName = matchedReg.form_data?.full_name || matchedReg.form_data?.name || matchedReg.lead_email.split('@')[0].toUpperCase();
    let participantRegNum = matchedReg.form_data?.registration_number || matchedReg.form_data?.reg_num || 'N/A';
    let participantEmail = matchedReg.lead_email;

    const members = matchedReg.team_data?.members || [];
    const memberMatch = members.find((m: any) => {
      const mName = (m.name || m.fullName || '').toLowerCase().trim();
      const mEmail = (m.email || '').toLowerCase().trim();
      const mReg = (m.regNum || m.reg_number || m.regNumber || '').toLowerCase().trim();
      return mEmail === cleanQ || mName === cleanQ || (cleanQ.length >= 3 && mName.includes(cleanQ)) || mReg === cleanQ;
    });

    if (memberMatch) {
      participantName = memberMatch.name || memberMatch.fullName || participantName;
      participantRegNum = memberMatch.regNum || memberMatch.reg_number || memberMatch.regNumber || participantRegNum;
      participantEmail = memberMatch.email || participantEmail;
    }

    const participantCheckedIn = memberMatch
      ? Boolean(memberMatch.checked_in)
      : Boolean(matchedReg.checked_in);

    if (!participantCheckedIn) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: `No completed attendance record was found for "${query}". Certificates are available only after event check-in.`,
      });
    }

    const eventDateFormatted = new Date(event.date_start).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return NextResponse.json({
      success: true,
      verified: true,
      participant: {
        name: participantName.toUpperCase(),
        email: participantEmail,
        registration_number: participantRegNum,
        college: matchedReg.form_data?.college || matchedReg.form_data?.college_name || 'SRM University-AP',
        ticket_id: matchedReg.form_data?.ticket_id || matchedReg.hash_payload?.slice(0, 8) || matchedReg.id.slice(0, 8),
        role: matchedReg.form_data?.role || (matchedReg.team_data?.team_name ? 'Team Member' : 'Solo Participant'),
        team_name: matchedReg.team_data?.team_name || 'Individual',
        checked_in: participantCheckedIn,
        status: matchedReg.status,
        event_title: event.title,
        event_date: eventDateFormatted,
        issued_date: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      },
      certificate_html: event.certificate_html || null,
    });
  } catch (err: any) {
    console.error('[Verify Certificate Error]:', err);
    return NextResponse.json(
      { success: false, verified: false, error: 'Internal verification error.' },
      { status: 500 }
    );
  }
}
