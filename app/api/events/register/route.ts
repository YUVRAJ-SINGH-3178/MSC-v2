import { NextResponse } from 'next/server';
import {
  enforcePayloadSize,
  isValidUUID,
  isValidEmail,
  sanitizeText,
} from '@/lib/security';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendTicketEmail } from '@/lib/email';
import { FALLBACK_EVENTS } from '@/lib/data/mock-fallback';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 1. Enforce payload size limit (64KB)
    const rawBody = await enforcePayloadSize(req, 64 * 1024);
    const body = JSON.parse(rawBody);

    // 2. Rate limit check (5/min for registration)
    const clientIp = getClientIP(req.headers);
    const rateLimit = await checkRateLimit(`register_${clientIp}`, 'register');
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please wait a minute before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { event_id, lead_email, form_data, team_data, idempotency_key } = body;

    // 3. Strict Input Validations
    if (!isValidUUID(event_id)) {
      return NextResponse.json({ error: 'Invalid event identifier format.' }, { status: 400 });
    }

    if (!isValidEmail(lead_email)) {
      return NextResponse.json({ error: 'Invalid lead email format.' }, { status: 400 });
    }

    if (idempotency_key && !isValidUUID(idempotency_key)) {
      return NextResponse.json({ error: 'Invalid idempotency key format.' }, { status: 400 });
    }

    // 4. Check event and determine pricing
    const matchingEvent = FALLBACK_EVENTS.find((e) => e.id === event_id) || FALLBACK_EVENTS[0];
    const isPaid = matchingEvent.form_requirements.event_pricing === 'paid';

    // 5. Application-level registration logic (old version style)
    const supabase = getAdminClient();

    // Check if already registered
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, hash_payload')
      .eq('event_id', event_id)
      .eq('lead_email', lead_email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        registration_id: existing.id,
        hash_payload: existing.hash_payload,
        status: existing.status,
        replayed: true,
      });
    }

    // Check event capacity & status
    const { data: event } = await supabase
      .from('events')
      .select('id, status, registration_open, date_end, max_capacity, form_requirements')
      .eq('id', event_id)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const isEventCompleted =
      event.status === 'completed' ||
      Boolean(
        event.date_end &&
          !isNaN(new Date(event.date_end).getTime()) &&
          new Date(event.date_end).getTime() < Date.now()
      );

    if (isEventCompleted || !event.registration_open)
      return NextResponse.json(
        { error: 'Registrations are closed as this event has concluded.' },
        { status: 400 }
      );

    // Count existing registrations
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event_id)
      .neq('status', 'cancelled');

    const isWaitlisted = event.max_capacity && (count || 0) >= event.max_capacity;

    const hashPayload = crypto.randomUUID();
    let teamId = null;

    // Build team data
    let teamData = null;
    if (team_data?.teamName) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          event_id: event_id,
          team_name: team_data.teamName,
          leader_name: form_data?.full_name || '',
          leader_email: lead_email.toLowerCase().trim(),
          leader_year: form_data?.year || '',
          leader_branch: form_data?.branch || null,
          looking_for_members: team_data.lookingForMembers || false,
        })
        .select('id')
        .single();

      if (teamError) {
        console.error('Team creation failed:', teamError);
        return NextResponse.json({ error: 'Failed to create team. Please try again.' }, { status: 500 });
      }
      teamId = team.id;

      teamData = {
        team_id: teamId,
        team_name: team_data.teamName,
        members: (team_data.members || []).map((m: any) => ({
          fullName: m.fullName,
          email: m.email?.toLowerCase().trim(),
          year: m.year,
          branch: m.branch,
          checked_in: false,
        })),
        leadIndex: 0,
      };
    }

    // Determine status
    let status = isPaid ? 'pending_payment' : 'confirmed';
    if (isWaitlisted) status = 'waitlisted';

    // Insert registration
    const registrationId = crypto.randomUUID();
    const { error: regError } = await supabase
      .from('registrations')
      .insert({
        id: registrationId,
        event_id: event_id,
        lead_email: lead_email.toLowerCase().trim(),
        hash_payload: hashPayload,
        form_data: form_data || {},
        team_data: teamData,
        status,
        idempotency_key: idempotency_key || null,
        reservation_expires_at: isPaid ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      });

    if (regError) {
      console.error('Registration insert failed:', regError);
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
    }

    // 6. Asynchronously send confirmation email if confirmed
    if (status === 'confirmed') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mscsrmap.xyz';
      const ticketUrl = `${appUrl}/ticket/${hashPayload}`;
      const attendeeName =
        team_data?.members?.[0]?.fullName ||
        form_data?.full_name ||
        lead_email.split('@')[0];

      sendTicketEmail({
        to: lead_email,
        name: attendeeName,
        eventTitle: matchingEvent.title,
        eventDate: matchingEvent.date_start,
        eventLocation: matchingEvent.location,
        ticketUrl,
        qrPayload: hashPayload,
      }).catch((e) => console.error('[Email Dispatcher Error]:', e));
    }

    return NextResponse.json({
      success: true,
      registration_id: registrationId,
      hash_payload: hashPayload,
      status,
    });
  } catch (err: any) {
    console.error('[API register error]:', err);
    return NextResponse.json({ error: 'Registration failed due to server error.' }, { status: 500 });
  }
}