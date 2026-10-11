import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { getAdminClient } from '@/lib/supabase/admin';
import DirectCheckinClient from './DirectCheckinClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CheckinPageProps {
  params: Promise<{ hash: string }>;
  searchParams?: Promise<{ mode?: string }>;
}

export default async function DirectCheckinPage({ params, searchParams }: CheckinPageProps) {
  const { hash } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultMode = resolvedSearchParams.mode;

  if (!hash) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '12px', padding: '36px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0, 103, 184, 0.1)' }}>
          <img
            src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
            alt="MSC Logo"
            style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 16px' }}
          />
          <AlertTriangle size={36} color="#d83b01" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Invalid Turnstile Token
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            No admission check-in identifier was provided in the scanner request.
          </p>
          <Link href="/admin/scanner" className="fluent-btn fluent-btn-primary">
            Open QR Scanner
          </Link>
        </div>
      </div>
    );
  }

  const supabase = getAdminClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hash);

  let reg: any = null;

  if (isUUID) {
    const { data } = await supabase
      .from('registrations')
      .select('*, events(title, location)')
      .or(`hash_payload.eq.${hash},id.eq.${hash}`)
      .maybeSingle();
    reg = data;
  } else {
    const { data } = await supabase
      .from('registrations')
      .select('*, events(title, location)')
      .or(
        `hash_payload.eq.${hash},lead_email.ilike.%${hash}%,form_data->>registration_number.ilike.%${hash}%,form_data->>reg_num.ilike.%${hash}%,form_data->>ticket_id.ilike.%${hash}%`
      )
      .limit(1)
      .maybeSingle();
    reg = data;

    // Fallback: search in team_data->members
    if (!reg) {
      const { data: teamRegs } = await supabase
        .from('registrations')
        .select('*, events(title, location)')
        .not('team_data', 'is', null);

      if (teamRegs && teamRegs.length > 0) {
        const clean = hash.toLowerCase().trim();
        const matched = teamRegs.find((tr: any) => {
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
  }

  if (!reg) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '12px', padding: '36px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0, 103, 184, 0.1)' }}>
          <img
            src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
            alt="MSC Logo"
            style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 16px' }}
          />
          <AlertTriangle size={36} color="#d83b01" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Registration Not Found
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
            The scanned token <code style={{ color: '#d83b01', fontWeight: 600 }}>{hash}</code> could not be matched with any attendee record in the MSC database.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link href="/admin/scanner" className="fluent-btn fluent-btn-primary">
              Return to QR Scanner
            </Link>
            <Link href="/admin" className="fluent-btn fluent-btn-secondary">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const participantName =
    reg.form_data?.full_name || reg.form_data?.name || reg.lead_email.split('@')[0];
  const regNumber = reg.form_data?.registration_number || reg.form_data?.reg_num || 'N/A';
  const college = reg.form_data?.college || 'SRM University-AP';
  const eventTitle = reg.events?.title || 'SYNORA';
  const rawTeam = reg.team_data?.team_name?.trim();
  const isTeam = Boolean(rawTeam && !['individual', 'solo', '-', 'n/a', 'none'].includes(rawTeam.toLowerCase()));

  // Resolve team members
  let teamMembers: Array<{ id: string; name: string; email: string; reg_number: string; role: string; checked_in: boolean }> = [];

  if (isTeam) {
    const teamId = reg.team_data?.team_id;
    let tQuery = supabase
      .from('registrations')
      .select('id, lead_email, form_data, team_data, checked_in')
      .eq('event_id', reg.event_id);

    if (teamId) {
      tQuery = tQuery.filter('team_data->>team_id', 'eq', teamId);
    } else {
      tQuery = tQuery.filter('team_data->>team_name', 'eq', rawTeam);
    }

    const { data: siblings } = await tQuery;
    if (siblings && siblings.length > 0) {
      teamMembers = siblings.map((s: any, idx: number) => ({
        id: s.id,
        name: s.form_data?.full_name || s.form_data?.name || s.lead_email.split('@')[0],
        email: s.lead_email,
        reg_number: s.form_data?.registration_number || s.form_data?.reg_num || 'N/A',
        role: s.form_data?.role || s.team_data?.role || (idx === 0 ? 'Leader' : 'Member'),
        checked_in: Boolean(s.checked_in),
      }));
    } else if (reg.team_data?.members && reg.team_data.members.length > 0) {
      teamMembers = reg.team_data.members.map((m: any, idx: number) => ({
        id: `${reg.id}-m-${idx}`,
        name: m.fullName || m.name,
        email: m.email,
        reg_number: m.regNum || m.reg_number || 'N/A',
        role: idx === 0 ? 'Leader' : 'Member',
        checked_in: Boolean(m.checked_in ?? reg.checked_in),
      }));
    }
  }

  // If solo attendee and not checked in yet, record check-in
  const wasAlreadyCheckedIn = Boolean(reg.checked_in);
  if (!isTeam && !wasAlreadyCheckedIn) {
    await supabase
      .from('registrations')
      .update({ checked_in: true, updated_at: new Date().toISOString() })
      .eq('id', reg.id);
  }

  const initialRegData = {
    id: reg.id,
    lead_name: participantName,
    lead_email: reg.lead_email,
    reg_number: regNumber,
    college: college,
    event_title: eventTitle,
    event_id: reg.event_id,
    checked_in: !isTeam ? true : wasAlreadyCheckedIn,
    team_name: rawTeam,
    team_id: reg.team_data?.team_id,
    is_team: isTeam,
  };

  return (
    <DirectCheckinClient
      hash={hash}
      initialReg={initialRegData}
      initialTeamMembers={teamMembers}
      initialWasAlreadyCheckedIn={wasAlreadyCheckedIn}
      defaultMode={defaultMode}
    />
  );
}

