'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
// html-to-image dynamically loaded on download
import {
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  Download,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Users,
} from 'lucide-react';

interface TicketMember {
  id?: string;
  fullName: string;
  email: string;
  regNum?: string;
  branch?: string;
  role?: string;
  checked_in: boolean;
  hash_payload?: string;
}

interface TicketData {
  hash_payload: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  lead_name: string;
  lead_email: string;
  reg_number?: string;
  branch?: string;
  college?: string;
  role?: string;
  status: string;
  checked_in: boolean;
  team_data?: {
    team_name?: string;
    team_id?: string;
    members?: TicketMember[];
  } | null;
}

export default function TicketClient({
  ticket,
  invalid,
  initialMatchedIndex,
}: {
  ticket?: TicketData;
  invalid?: boolean;
  initialMatchedIndex?: number;
}) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [passViewMode, setPassViewMode] = useState<'team' | 'individual'>(
    initialMatchedIndex !== undefined && initialMatchedIndex > 0 ? 'individual' : 'team'
  );
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(initialMatchedIndex || 0);

  const isTeam = Boolean(
    ticket?.team_data &&
    ticket.team_data.team_name &&
    !['individual', 'solo', '-', 'n/a', 'none'].includes(ticket.team_data.team_name.toLowerCase())
  );

  const teamMembers = ticket?.team_data?.members || [];
  const currentMember = teamMembers[selectedMemberIndex] || null;

  const downloadTicketImage = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(ticketRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      const filenameSuffix = passViewMode === 'individual' && currentMember
        ? `${currentMember.fullName.replace(/\s+/g, '_')}_Individual`
        : isTeam
        ? `${ticket?.team_data?.team_name?.replace(/\s+/g, '_')}_Team`
        : ticket?.lead_name.replace(/\s+/g, '_');
      link.download = `MSC_Ticket_${filenameSuffix}_${ticket?.hash_payload.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ticket image:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (invalid || !ticket) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow-rest)' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
            Invalid Ticket Identifier
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
            The provided ticket could not be found or verified. Search with your registered email or college registration number.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link href="/ticket" className="fluent-btn fluent-btn-primary">
              Look Up Ticket
            </Link>
            <Link href="/" className="fluent-btn fluent-btn-secondary">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine QR URL based on view mode
  const activeQrPayload =
    passViewMode === 'individual' && currentMember?.hash_payload
      ? currentMember.hash_payload
      : ticket.hash_payload;

  const checkinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/checkin/${activeQrPayload}${isTeam && passViewMode === 'team' ? '?mode=team' : ''}`;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 0 100px 0' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        {/* Navigation & Actions Top Toolbar */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/events" style={{ fontSize: '13px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to Events
          </Link>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              className="fluent-btn fluent-btn-secondary"
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              Print Pass
            </button>
            <button
              onClick={downloadTicketImage}
              disabled={downloading}
              className="fluent-btn fluent-btn-primary"
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              <Download size={14} /> {downloading ? 'Exporting PNG...' : `Download ${passViewMode === 'team' ? 'Team Pass' : 'Individual Pass'}`}
            </button>
          </div>
        </div>

        {/* Team vs Individual Pass View Mode Switcher */}
        {isTeam && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'var(--shadow-rest)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-strong)' }}>
                Pass Download Type:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPassViewMode('team')}
                  style={{
                    background: passViewMode === 'team' ? 'var(--brand)' : 'var(--bg-soft)',
                    color: passViewMode === 'team' ? '#ffffff' : 'var(--text-body)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Users size={14} /> Entire Team Pass
                </button>
                <button
                  type="button"
                  onClick={() => setPassViewMode('individual')}
                  style={{
                    background: passViewMode === 'individual' ? 'var(--brand)' : 'var(--bg-soft)',
                    color: passViewMode === 'individual' ? '#ffffff' : 'var(--text-body)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Individual Pass
                </button>
              </div>
            </div>

            {/* If Individual Pass mode is selected, show member picker */}
            {passViewMode === 'individual' && teamMembers.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select Member Pass:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {teamMembers.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMemberIndex(idx)}
                      style={{
                        background: selectedMemberIndex === idx ? 'var(--brand-soft)' : 'var(--bg-soft)',
                        border: selectedMemberIndex === idx ? '1px solid var(--brand)' : '1px solid var(--border)',
                        color: selectedMemberIndex === idx ? 'var(--brand)' : 'var(--text-body)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {m.fullName} {m.role ? `(${m.role})` : idx === 0 ? '(Lead)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WALLET-STYLE DIGITAL TICKET CARD */}
        <div
          ref={ticketRef}
          id="printable-badge"
          style={{
            background: '#ffffff',
            border: '2px solid #0067b8',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 103, 184, 0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Official Microsoft Student Community Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0067b8 0%, #004c87 100%)',
              color: '#ffffff',
              padding: 'clamp(16px, 4vw, 24px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
                alt="MSC Logo"
                style={{
                  width: '46px',
                  height: '46px',
                  objectFit: 'contain',
                  background: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9, fontWeight: 700 }}>
                  Official Admission Pass &bull; Chapter &apos;26
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
                  Microsoft Student Community
                </h3>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>SRM University-AP</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  background: ticket.checked_in ? '#0e7c41' : 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {ticket.checked_in ? 'Checked In' : 'Confirmed'}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                {ticket.event_title}
              </h2>
              {isTeam && (
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {passViewMode === 'team' ? 'TEAM PASS' : 'MEMBER PASS'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#0067b8" />
                <span>{new Date(ticket.event_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#0067b8" />
                <span>{ticket.event_location}</span>
              </div>
            </div>

            {/* Perforated Divider */}
            <div
              style={{
                borderBottom: '2px dashed #cbd5e1',
                margin: '24px -32px',
                position: 'relative',
              }}
            />

            {/* QR Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ padding: '14px', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0, 103, 184, 0.1)' }}>
                <QRCodeSVG
                  value={checkinUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%', padding: '0 8px' }}>
                TOKEN: {activeQrPayload}
              </span>
              <span style={{ fontSize: '11px', color: '#0067b8', fontWeight: 600, marginTop: '4px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {passViewMode === 'team' ? 'Present for Entire Team Turnstile Check-In' : 'Present for Individual Turnstile Entry'}
              </span>
            </div>

            {/* Registrant / Team Details */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                gap: '16px',
                fontSize: '13px',
              }}
            >
              {passViewMode === 'individual' && currentMember ? (
                <>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Attendee Name
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '15px' }}>{currentMember.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Registration Number
                    </span>
                    <strong style={{ color: '#0f172a' }}>{currentMember.regNum || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Official Email
                    </span>
                    <span style={{ color: '#334155' }}>{currentMember.email}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Team Affiliation
                    </span>
                    <span style={{ color: '#0067b8', fontWeight: 600 }}>{ticket.team_data?.team_name} ({currentMember.role || 'Member'})</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      {isTeam ? 'Team Leader' : 'Lead Attendee'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '15px' }}>{ticket.lead_name}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Registration Number
                    </span>
                    <strong style={{ color: '#0f172a' }}>{ticket.reg_number || 'N/A'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Email Address
                    </span>
                    <span style={{ color: '#334155' }}>{ticket.lead_email}</span>
                  </div>

                  {ticket.college && (
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                        Institution
                      </span>
                      <span style={{ color: '#334155' }}>{ticket.college}</span>
                    </div>
                  )}

                  {isTeam && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                      <span style={{ color: '#0067b8', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                        Team Roster: {ticket.team_data?.team_name} ({teamMembers.length} Members)
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {teamMembers.map((m, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#0f172a' }}>{m.fullName}</strong>
                              {m.regNum && <span style={{ color: '#64748b', marginLeft: '6px' }}>&bull; {m.regNum}</span>}
                              {m.branch && m.branch !== 'N/A' && <span style={{ color: '#64748b', marginLeft: '4px' }}>({m.branch})</span>}
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: (m.role || (i === 0 ? 'Leader' : 'Member')).toLowerCase().includes('lead') ? 'rgba(0,103,184,0.1)' : '#f1f5f9',
                                color: (m.role || (i === 0 ? 'Leader' : 'Member')).toLowerCase().includes('lead') ? '#0067b8' : '#64748b',
                              }}
                            >
                              {m.role || (i === 0 ? 'Leader' : 'Member')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Ticket Footer */}
          <div
            style={{
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              padding: '14px 24px',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="#0067b8" />
              <span style={{ fontWeight: 600 }}>Official Microsoft Student Community Credential</span>
            </div>
            <span>SRM University-AP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
