import { NextResponse } from 'next/server';
import { enforcePayloadSize, isValidUUID } from '@/lib/security';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import { getRazorpayClient } from '@/lib/razorpay';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await enforcePayloadSize(req, 16 * 1024);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const clientIp = getClientIP(req.headers);
    const rateLimit = await checkRateLimit(`rzp_order_${clientIp}`, 'payment');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many payment requests. Please wait a minute.' }, { status: 429 });
    }

    const eventId = body.event_id;
    const registrationId = body.registration_id;
    if (!isValidUUID(eventId as string) || !isValidUUID(registrationId as string)) {
      return NextResponse.json({ error: 'Invalid event or registration ID.' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: registration, error: registrationError } = await supabase
      .from('registrations')
      .select('id, event_id, user_id, status, form_data')
      .eq('id', registrationId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (registrationError) throw registrationError;
    if (!registration) return NextResponse.json({ error: 'Registration not found for this event.' }, { status: 404 });
    if (registration.status !== 'pending_payment') {
      return NextResponse.json({ error: 'This registration is not awaiting payment.' }, { status: 409 });
    }
    if (
      registration.form_data?.no_refund_policy_accepted !== true ||
      registration.form_data?.no_refund_policy_version !== '2026-11-01' ||
      !registration.form_data?.no_refund_policy_accepted_at
    ) {
      return NextResponse.json(
        { error: 'No-refund policy acceptance is required before payment.' },
        { status: 403 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, form_requirements')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const ticketCategoryId = body.ticket_category_id ?? null;
    if (ticketCategoryId !== null && !isValidUUID(ticketCategoryId as string)) {
      return NextResponse.json({ error: 'Invalid ticket category.' }, { status: 400 });
    }
    const promoCode = typeof body.promo_code === 'string' ? body.promo_code.trim().slice(0, 64) : '';

    // Reuse an existing unexpired order. This makes repeated checkout requests idempotent.
    const { data: previousOrder, error: previousOrderError } = await supabase
      .from('payment_orders')
      .select('id, razorpay_order_id, amount, currency, status, expires_at')
      .eq('registration_id', registration.id)
      .in('status', ['creating', 'created'])
      .maybeSingle();

    if (previousOrderError) throw previousOrderError;
    if (previousOrder && new Date(previousOrder.expires_at).getTime() > Date.now()) {
      const savedCategoryId = registration.form_data?.ticket_category_id || null;
      const savedPromoCode = String(registration.form_data?.promo_code || '').toUpperCase();
      if (savedCategoryId !== ticketCategoryId || savedPromoCode !== promoCode.toUpperCase()) {
        return NextResponse.json(
          { error: 'A checkout is already active for a different ticket selection. Complete it or wait for it to expire before changing your selection.' },
          { status: 409 }
        );
      }
      if (previousOrder.status === 'created' && previousOrder.razorpay_order_id) {
        return NextResponse.json({
          success: true,
          order_id: previousOrder.razorpay_order_id,
          amount: previousOrder.amount,
          currency: previousOrder.currency,
          reused: true,
        });
      }
      return NextResponse.json({ error: 'Payment order creation is already in progress. Retry shortly.' }, { status: 409 });
    }

    if (previousOrder) {
      const { error } = await supabase.from('payment_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', previousOrder.id);
      if (error) throw error;
    }

    const { data: pricing, error: pricingError } = await supabase.rpc('reserve_ticket_and_promo', {
      p_registration_id: registration.id,
      p_event_id: registration.event_id,
      p_ticket_category_id: ticketCategoryId,
      p_promo_code: promoCode,
    });

    if (pricingError) throw pricingError;
    if (!pricing || pricing.success !== true || !Number.isSafeInteger(pricing.final_amount_paise) || pricing.final_amount_paise <= 0) {
      return NextResponse.json(
        { error: pricing?.error || 'Ticket pricing could not be validated.' },
        { status: 409 }
      );
    }
    const amountInPaise = pricing.final_amount_paise as number;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: orderRecord, error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        event_id: registration.event_id,
        registration_id: registration.id,
        user_id: registration.user_id,
        idempotency_key: registration.id,
        amount: amountInPaise,
        currency: 'INR',
        status: 'creating',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      // A concurrent request may have won the active-order unique constraint.
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'A payment order is already being created. Retry shortly.' }, { status: 409 });
      }
      throw insertError;
    }

    try {
      const gatewayOrder = await getRazorpayClient().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `msc_${registration.id.replace(/-/g, '').slice(0, 20)}`,
        notes: { event_id: registration.event_id, registration_id: registration.id },
      });

      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          razorpay_order_id: gatewayOrder.id,
          status: 'created',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderRecord.id)
        .eq('status', 'creating');

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        order_id: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      });
    } catch (gatewayError) {
      await supabase.from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderRecord.id);
      throw gatewayError;
    }
  } catch (err) {
    console.error('[Razorpay create-order error]:', err);
    return NextResponse.json({ error: 'Unable to create payment order. Please try again.' }, { status: 502 });
  }
}
