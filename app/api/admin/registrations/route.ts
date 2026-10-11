import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const supabase = getAdminClient();
    let query = supabase
      .from('registrations')
      .select('*, events(title)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const registrations = (data || []).map((r: any) => ({
      id: r.id,
      hash_payload: r.hash_payload || r.id,
      event_id: r.event_id,
      event_title: r.events?.title || 'SYNORA',
      lead_name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
      lead_email: r.lead_email,
      reg_number: r.form_data?.registration_number || r.form_data?.reg_num || 'N/A',
      phone: r.form_data?.phone || '',
      college: r.form_data?.college || 'SRM University AP',
      team_name: r.team_data?.team_name || '',
      team_members: r.team_data?.members || [],
      checked_in: Boolean(r.checked_in),
      status: r.status,
      created_at: r.created_at,
    }));

    return NextResponse.json({ success: true, registrations });
  } catch (err: any) {
    console.error('Error fetching admin registrations:', err);
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

  try {
    const body = await req.json();
    const supabase = getAdminClient();

    // 1. Bulk Batch Import with Smart Upsert / Merge
    const batchList = Array.isArray(body) ? body : (Array.isArray(body.batch) ? body.batch : null);
    if (batchList && batchList.length > 0) {
      // Find the event ID(s)
      const eventIds = Array.from(new Set(batchList.map((item: any) => item.event_id).filter(Boolean)));
      
      // If user chose to clear the current roster before uploading fresh CSV
      if (body.clear_first && eventIds.length > 0) {
        const { error: delError } = await supabase
          .from('registrations')
          .delete()
          .in('event_id', eventIds);

        if (delError) {
          console.error('Failed to clear event registrations before batch import:', delError);
          throw delError;
        }
      }

      // Fetch all existing registrations for these events to prevent unique constraint collisions
      const existingEmailMap = new Map<string, string>(); // key: `${event_id}:${lower(email)}`, value: registration_id
      if (!body.clear_first && eventIds.length > 0) {
        const { data: existingRows } = await supabase
          .from('registrations')
          .select('id, event_id, lead_email')
          .in('event_id', eventIds);

        if (existingRows) {
          existingRows.forEach((r: any) => {
            const key = `${r.event_id}:${(r.lead_email || '').toLowerCase().trim()}`;
            existingEmailMap.set(key, r.id);
          });
        }
      }

      const toInsert: any[] = [];
      const toUpdate: Array<{ id: string; data: any }> = [];
      const seenInThisBatch = new Set<string>();

      batchList.forEach((item: any, i: number) => {
        let email = (item.lead_email || item.Email || item.email || `imported-${Date.now()}-${i}@srmap.edu.in`).toLowerCase().trim();
        const eventId = item.event_id || eventIds[0];
        
        let batchKey = `${eventId}:${email}`;
        let duplicateCounter = 1;
        while (seenInThisBatch.has(batchKey)) {
          duplicateCounter++;
          const [userPart, domain] = email.split('@');
          email = `${userPart.split('+m')[0]}+m${duplicateCounter}@${domain || 'srmap.edu.in'}`;
          batchKey = `${eventId}:${email}`;
        }
        seenInThisBatch.add(batchKey);

        const recordPayload = {
          event_id: eventId,
          lead_email: email,
          status: item.status || 'confirmed',
          checked_in: Boolean(item.checked_in),
          form_data: item.form_data || {
            full_name: item.full_name || item.lead_name || item.Name || item.name || 'Imported Participant',
            registration_number: item.registration_number || item.reg_number || item.RegNum || item.reg_num || 'AP0000000000',
            phone: item.phone || item.Phone || '',
            college: item.college || item.College || 'SRM University AP',
          },
          team_data: item.team_data || ((item.team_name || item.Team || item.team) ? { team_name: item.team_name || item.Team || item.team } : null),
          created_at: item.created_at || new Date().toISOString(),
        };

        const existingId = existingEmailMap.get(`${eventId}:${email}`);
        if (existingId) {
          toUpdate.push({ id: existingId, data: recordPayload });
        } else {
          toInsert.push(recordPayload);
        }
      });

      // Execute Inserts for new records
      let insertedCount = 0;
      if (toInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('registrations')
          .insert(toInsert)
          .select();

        if (insertError) {
          console.error('Batch insert error:', insertError);
          throw insertError;
        }
        insertedCount = insertedData?.length || toInsert.length;
      }

      // Execute Updates for existing records (including updating checked_in and status)
      let updatedCount = 0;
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(({ id, data }) =>
            supabase
              .from('registrations')
              .update({
                form_data: data.form_data,
                team_data: data.team_data,
                status: data.status,
                checked_in: data.checked_in,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
          )
        );
        updatedCount = toUpdate.length;
      }

      return NextResponse.json({
        success: true,
        count: insertedCount + updatedCount,
        inserted: insertedCount,
        updated: updatedCount,
        cleared_first: Boolean(body.clear_first),
      });
    }

    // 2. Single Registration Creation with Smart Upsert
    const { event_id, lead_email, full_name, registration_number, phone, college, team_name, checked_in } = body;

    if (!event_id || !lead_email) {
      return NextResponse.json({ error: 'event_id and lead_email are required' }, { status: 400 });
    }

    const cleanEmail = lead_email.toLowerCase().trim();

    // Check if registration already exists
    const { data: existingSingle } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('lead_email', cleanEmail)
      .maybeSingle();

    if (existingSingle) {
      const { data, error } = await supabase
        .from('registrations')
        .update({
          form_data: {
            full_name: full_name || cleanEmail.split('@')[0],
            registration_number: registration_number || 'AP0000000000',
            phone: phone || '',
            college: college || 'SRM University AP',
          },
          team_data: team_name ? { team_name } : null,
          checked_in: Boolean(checked_in),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSingle.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, registration: data, updated: true });
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        event_id,
        lead_email: cleanEmail,
        status: 'confirmed',
        checked_in: Boolean(checked_in),
        form_data: {
          full_name: full_name || cleanEmail.split('@')[0],
          registration_number: registration_number || 'AP0000000000',
          phone: phone || '',
          college: college || 'SRM University AP',
        },
        team_data: team_name ? { team_name } : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, registration: data });
  } catch (err: any) {
    console.error('Error creating registration:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');
    const regId = searchParams.get('id');

    const supabase = getAdminClient();

    if (eventId) {
      const { error, count } = await supabase
        .from('registrations')
        .delete({ count: 'exact' })
        .eq('event_id', eventId);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        count: count || 0,
        message: `Successfully deleted all attendees for event`,
      });
    }

    if (regId) {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', regId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Attendee deleted successfully' });
    }

    return NextResponse.json({ error: 'event_id or id query parameter is required' }, { status: 400 });
  } catch (err: any) {
    console.error('Delete registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

