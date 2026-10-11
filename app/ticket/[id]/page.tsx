import React from 'react';
import TicketClient from './TicketClient';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  if (!id) {
    return <TicketClient invalid={true} />;
  }

  try {
    const supabase = getAdminClient();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let reg: any = null;
    let matchedMemberIndex: number | undefined = undefined;

    if (isUUID) {
      const { data } = await supabase
        .from('registrations')
        .select('*, events(title, date_start, location)')
        .or(`hash_payload.eq.${id},id.eq.${id}`)
        .maybeSingle();
      reg = data;
    } else {
      // Non-UUID input: search by registration number, ticket_id, or email
      const { data } = await supabase
        .from('registrations')
        .select('*, events(title, date_start, location)')
        .or(`lead_email.ilike.%${id}%,form_data->>registration_number.ilike.%${id}%,form_data->>reg_num.ilike.%${id}%,form_data->>ticket_id.ilike.%${id}%,form_data->>full_name.ilike.%${id}%`)
        .limit(1)
        .maybeSingle();
      reg = data;

      // If not found in primary rows, search embedded team_data->members
      if (!reg) {
        const { data: teamRegs } = await supabase
          .from('registrations')
          .select('*, events(title, date_start, location)')
          .not('team_data', 'is', null);

        if (teamRegs && teamRegs.length > 0) {
          const cleanId = id.toLowerCase().trim();
          for (const tr of teamRegs) {
            const members = tr.team_data?.members || [];
            const foundIdx = members.findIndex((m: any) => {
              const mReg = (m.regNum || m.reg_number || m.registration_number || '').toLowerCase().trim();
              const mEmail = (m.email || '').toLowerCase().trim();
              const mName = (m.fullName || m.name || '').toLowerCase().trim();
              return mReg === cleanId || mReg.includes(cleanId) || mEmail === cleanId || mEmail.includes(cleanId) || mName.includes(cleanId);
            });
            if (foundIdx !== -1) {
              reg = tr;
              matchedMemberIndex = foundIdx;
              break;
            }
          }
        }
      }
    }

    if (reg) {
      let teamMembers = reg.team_data?.members || [];
      const rawTeam = reg.team_data?.team_name?.trim();
      const isTeam = rawTeam && !['individual', 'solo', '-', 'n/a', 'none'].includes(rawTeam.toLowerCase());

      // If team members are not embedded, look up all sibling records sharing team_id or team_name
      if (isTeam && teamMembers.length <= 1) {
        const teamId = reg.team_data?.team_id;
        let tQuery = supabase
          .from('registrations')
          .select('id, hash_payload, lead_email, form_data, team_data, checked_in')
          .eq('event_id', reg.event_id);

        if (teamId) {
          tQuery = tQuery.filter('team_data->>team_id', 'eq', teamId);
        } else {
          tQuery = tQuery.filter('team_data->>team_name', 'eq', rawTeam);
        }

        const { data: siblingRows } = await tQuery;
        if (siblingRows && siblingRows.length > 0) {
          teamMembers = siblingRows.map((s: any, idx: number) => {
            const sReg = s.form_data?.registration_number || s.form_data?.reg_num || 'N/A';
            const sEmail = s.lead_email;
            if (
              matchedMemberIndex === undefined &&
              !isUUID &&
              (sReg.toLowerCase().includes(id.toLowerCase()) || sEmail.toLowerCase().includes(id.toLowerCase()))
            ) {
              matchedMemberIndex = idx;
            }
            return {
              id: s.id,
              hash_payload: s.hash_payload,
              fullName: s.form_data?.full_name || s.form_data?.name || s.lead_email.split('@')[0],
              email: s.lead_email,
              regNum: sReg,
              branch: s.form_data?.branch || 'N/A',
              role: s.form_data?.role || s.team_data?.role || 'Member',
              checked_in: Boolean(s.checked_in),
            };
          });
        }
      }

      const ticketData = {
        hash_payload: reg.hash_payload || reg.id,
        event_id: reg.event_id,
        event_title: reg.events?.title || 'SYNORA',
        event_date: reg.events?.date_start || new Date().toISOString(),
        event_location: reg.events?.location || 'SRM University AP',
        lead_name: reg.form_data?.full_name || reg.form_data?.name || reg.lead_email.split('@')[0],
        lead_email: reg.lead_email,
        reg_number: reg.form_data?.registration_number || reg.form_data?.reg_num || 'N/A',
        branch: reg.form_data?.branch || 'N/A',
        college: reg.form_data?.college || 'SRM University-AP',
        role: reg.form_data?.role || reg.team_data?.role || 'Delegate',
        status: reg.status,
        checked_in: Boolean(reg.checked_in),
        team_data: isTeam
          ? {
              ...reg.team_data,
              team_name: rawTeam,
              members: teamMembers,
            }
          : null,
      };

      return (
        <TicketClient
          ticket={ticketData}
          invalid={false}
          initialMatchedIndex={matchedMemberIndex}
        />
      );
    }
  } catch (err) {
    console.error('Ticket lookup error:', err);
  }

  return <TicketClient invalid={true} />;
}
