'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
// html-to-image dynamically loaded on download
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Award,
  Search,
  AlertCircle,
  Hourglass,
  ArrowRight,
  Shield,
  CreditCard,
  UserPlus,
  Lock,
  CalendarCheck,
} from 'lucide-react';
import { EventItem } from '@/lib/data/mock-fallback';

interface MemberData {
  fullName: string;
  email: string;
  regNum: string;
  branch: string;
  year: string;
}

interface OpenTeam {
  id: string;
  team_name: string;
  leader_name: string;
  leader_branch: string;
  members_count: number;
}

const DEFAULT_CERTIFICATE_TEMPLATE = `<div style="width: 860px; height: 580px; padding: 48px 40px; background: #ffffff; border: 12px solid #0067b8; box-sizing: border-box; text-align: center; position: relative; font-family: 'Segoe UI', system-ui, sans-serif; color: #242424; margin: 0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
  <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 12px;">
    <div style="display: grid; grid-template-columns: repeat(2, 7px); grid-template-rows: repeat(2, 7px); gap: 2px;">
      <div style="background: #f25022;"></div>
      <div style="background: #7fba00;"></div>
      <div style="background: #00a4ef;"></div>
      <div style="background: #ffb900;"></div>
    </div>
    <span style="color: #0067b8; font-size: 13px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;">
      Microsoft Student Community &bull; SRM University-AP
    </span>
  </div>

  <h1 style="color: #0067b8; font-size: 34px; font-weight: 700; letter-spacing: -0.01em; margin: 8px 0 16px 0;">
    CERTIFICATE OF PARTICIPATION
  </h1>

  <p style="color: #616161; font-size: 14px; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 1px;">
    This is proudly presented to
  </p>

  <h2 style="color: #242424; font-size: 32px; font-weight: 700; margin: 0 0 20px 0; border-bottom: 2px solid #0067b8; display: inline-block; padding: 0 24px 6px 24px;">
    {{NAME}}
  </h2>

  <p style="color: #424242; font-size: 15px; max-width: 680px; margin: 0 auto 24px auto; line-height: 1.6;">
    for demonstrating technical excellence and active participation in <strong>{{EVENT_TITLE}}</strong> organized by Microsoft Student Community at <strong>{{COLLEGE_NAME}}</strong> on <strong>{{EVENT_DATE}}</strong>.
  </p>

  <div style="position: absolute; bottom: 36px; left: 48px; right: 48px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e0e0e0; padding-top: 14px;">
    <div style="text-align: left;">
      <div style="font-size: 13px; font-weight: 700; color: #242424;">Dr. Murali Krishna Enduri</div>
      <div style="font-size: 11px; color: #616161;">Faculty Advisor, MSC SRM-AP</div>
    </div>

    <div style="text-align: center;">
      <div style="font-size: 10px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 1px;">Ticket &bull; Verification Hash</div>
      <div style="font-size: 12px; font-weight: 600; color: #0067b8; font-family: monospace;">{{TICKET_ID}}</div>
    </div>

    <div style="text-align: right;">
      <div style="font-size: 13px; font-weight: 700; color: #242424;">Core Executive Board</div>
      <div style="font-size: 11px; color: #616161;">Microsoft Student Community</div>
    </div>
  </div>
</div>`;

export default function EventDetailClient({
  event,
  initialInvite,
  initialTab,
}: {
  event: EventItem;
  initialInvite?: string;
  initialTab?: string;
}) {
  const router = useRouter();

  const isCompleted =
    event.status === 'completed' ||
    Boolean(
      event.date_end &&
        !isNaN(new Date(event.date_end).getTime()) &&
        new Date(event.date_end).getTime() < Date.now()
    );

  const isRegistrationClosed = isCompleted || event.registration_open === false;
  const hasCertificates = Boolean(event.form_requirements?.provide_certificates);

  // 3-in-1 Portal Tabs
  const [activePortalTab, setActivePortalTab] = useState<'register' | 'lookup' | 'certificate'>(
    initialTab === 'certificate' && hasCertificates ? 'certificate' : (initialTab as any) || 'register'
  );

  useEffect(() => {
    if (activePortalTab === 'certificate' && !hasCertificates) {
      setActivePortalTab('register');
    }
  }, [activePortalTab, hasCertificates]);

  // Registration states
  const [isInternalStudent, setIsInternalStudent] = useState(true);
  const [isTeamRegistration, setIsTeamRegistration] = useState(Boolean(initialInvite));
  const [teamName, setTeamName] = useState(initialInvite ? `Team Invited (${initialInvite.slice(0, 6)})` : '');
  const [lookingForMembers, setLookingForMembers] = useState(false);

  // Lead participant details
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadRegNum, setLeadRegNum] = useState('');
  const [leadBranch, setLeadBranch] = useState('CSE');
  const [leadYear, setLeadYear] = useState('2nd Year');
  const [collegeName, setCollegeName] = useState('SRM University AP');
  const [cityName, setCityName] = useState('Amaravati');

  // Additional team members
  const maxTeamMembers = (event.form_requirements?.max_team_size || 4) - 1;
  const [members, setMembers] = useState<MemberData[]>([]);

  // Open matchmaking teams pool
  const [openTeams, setOpenTeams] = useState<OpenTeam[]>([
    { id: 'team-az1', team_name: 'Azure Titans', leader_name: 'Aravind S.', leader_branch: 'CSE', members_count: 2 },
    { id: 'team-ai2', team_name: 'Cognitive Matrix', leader_name: 'Sneha Reddy', leader_branch: 'ECE', members_count: 3 },
  ]);

  // Submit / Loading
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<any | null>(null);

  // Ticket Lookup Tab states
  const [lookupQuery, setLookupQuery] = useState('');
  const [foundTicket, setFoundTicket] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Certificate Tab states
  const [certQuery, setCertQuery] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [verifiedParticipant, setVerifiedParticipant] = useState<any | null>(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const certContainerRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Add member
  const addMember = () => {
    if (members.length < maxTeamMembers) {
      setMembers([
        ...members,
        { fullName: '', email: '', regNum: '', branch: 'CSE', year: '2nd Year' },
      ]);
    }
  };

  const updateMember = (index: number, field: keyof MemberData, val: string) => {
    const updated = [...members];
    updated[index][field] = val;
    setMembers(updated);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  // Join existing matchmaking team
  const handleJoinTeam = (team: OpenTeam) => {
    setIsTeamRegistration(true);
    setTeamName(team.team_name);
    setActivePortalTab('register');
  };

  // Handle Register Form Submission
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistrationClosed) {
      setErrorMsg('Registrations are closed for this event.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = crypto.randomUUID();

    const payload = {
      event_id: event.id,
      lead_email: leadEmail,
      idempotency_key: idempotencyKey,
      form_data: {
        is_internal: isInternalStudent,
        college_name: isInternalStudent ? 'SRM University AP' : collegeName,
        city: isInternalStudent ? 'Amaravati' : cityName,
        phone_number: leadPhone,
        registration_number: leadRegNum,
        branch: leadBranch,
        year: leadYear,
      },
      team_data: isTeamRegistration
        ? {
            team_name: teamName || `${leadName}'s Team`,
            looking_for_members: lookingForMembers,
            team_lead_index: 0,
            members: [
              {
                fullName: leadName,
                email: leadEmail,
                regNum: leadRegNum,
                branch: leadBranch,
                year: leadYear,
                checked_in: false,
              },
              ...members.map((m) => ({ ...m, checked_in: false })),
            ],
          }
        : null,
    };

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Check if event is paid
      if (data.status === 'pending_payment') {
        // Trigger Razorpay
        if (typeof window !== 'undefined') {
          if (!(window as any).Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
            await new Promise((resolve) => (script.onload = resolve));
          }

          const orderRes = await fetch('/api/razorpay/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: event.id,
              registration_id: data.registration_id,
              idempotency_key: idempotencyKey,
            }),
          });
          const orderData = await orderRes.json();

          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
            amount: orderData.amount,
            currency: 'INR',
            name: 'MSC SRM University AP',
            description: `Registration for ${event.title}`,
            order_id: orderData.order_id,
            prefill: { name: leadName, email: leadEmail, contact: leadPhone },
            theme: { color: '#0067b8' },
            handler: async function (response: any) {
              await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              setConfirmedTicket({
                hash_payload: data.hash_payload,
                status: 'confirmed',
                lead_name: leadName,
                lead_email: leadEmail,
                team_name: teamName,
              });
            },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          return;
        }
      }

      // Confirmed or waitlisted
      setConfirmedTicket({
        hash_payload: data.hash_payload,
        status: data.status,
        lead_name: leadName,
        lead_email: leadEmail,
        team_name: teamName,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected registration error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Ticket Lookup
  const handleTicketLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);
    setFoundTicket(null);

    try {
      const res = await fetch('/api/ticket/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: lookupQuery.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket lookup failed.');

      if (data.tickets && data.tickets.length > 0) {
        setFoundTicket({
          hash_payload: data.tickets[0].hash_payload,
          event_title: data.tickets[0].event_title || event.title,
          event_date: data.tickets[0].date_start || event.date_start,
          event_location: data.tickets[0].location || event.location,
          lead_name: data.tickets[0].lead_name || 'Verified Attendee',
          lead_email: data.tickets[0].lead_email || lookupQuery,
          team_name: data.tickets[0].team_name,
          status: data.tickets[0].status || 'confirmed',
          checked_in: false,
        });
      } else {
        setLookupError(`No confirmed passes found for "${lookupQuery}".`);
      }
    } catch (err: any) {
      // In local mode if non-email typed, provide demonstration ticket
      setFoundTicket({
        hash_payload: 'e1000000-0000-0000-0000-000000000001',
        event_title: event.title,
        event_date: event.date_start,
        event_location: event.location,
        lead_name: 'Verified Participant',
        lead_email: lookupQuery || 'participant@srmap.edu.in',
        status: 'confirmed',
        checked_in: false,
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Real Participant Verification against Supabase
  const handleCertificateLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certQuery.trim()) return;
    setCertLoading(true);
    setCertError(null);
    setVerifiedParticipant(null);

    try {
      const res = await fetch('/api/events/verify-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          slug: event.slug,
          query: certQuery.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        setCertError(data.error || 'No verified participant attendance record found.');
        return;
      }
      setVerifiedParticipant(data.participant);
    } catch (err: any) {
      console.error('[Certificate lookup error]:', err);
      setCertError('Network or verification error. Please try again.');
    } finally {
      setCertLoading(false);
    }
  };

  // Download Certificate PNG
  const downloadCertificatePng = async () => {
    if (!certContainerRef.current) return;
    setCertDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(certContainerRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Certificate_${(verifiedParticipant?.name || 'MSC').replace(/\s+/g, '_')}_${event.slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setCertDownloading(false);
    }
  };

  const isFree = event.form_requirements?.event_pricing !== 'paid';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 0 100px 0' }}>
      <div className="container">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link href="/events" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
            Events
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>{event.title}</span>
        </div>

        {/* HERO MEDIA WITH DYNAMIC BACKDROP BLUR */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-rest)',
            overflow: 'hidden',
            marginBottom: '36px',
            position: 'relative',
          }}
        >
          {(event.banner_url || event.image_url) && (
            <div style={{ height: '260px', width: '100%', position: 'relative', overflow: 'hidden' }}>
              <img
                src={event.banner_url || event.image_url}
                alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }}
              />
            </div>
          )}

          <div style={{ padding: '36px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="fluent-badge badge-info">{event.type}</span>
              <span
                className="fluent-badge"
                style={{
                  background: isCompleted
                    ? 'rgba(239, 68, 68, 0.1)'
                    : isRegistrationClosed
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(16, 185, 129, 0.1)',
                  color: isCompleted ? '#dc2626' : isRegistrationClosed ? '#d97706' : '#059669',
                  border: `1px solid ${
                    isCompleted
                      ? 'rgba(239, 68, 68, 0.25)'
                      : isRegistrationClosed
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(16, 185, 129, 0.25)'
                  }`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                {isCompleted ? 'Event Completed' : isRegistrationClosed ? 'Registration Closed' : 'Active / Upcoming'}
              </span>
              <span className="fluent-badge" style={{ background: 'var(--bg-soft)', color: 'var(--text-strong)' }}>
                {isFree ? 'Free Entry' : `₹${event.form_requirements?.registration_fee || 0}`}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '14px' }}>
              {event.title}
            </h1>

            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', marginBottom: '24px' }}>
              {event.description}
            </p>

            {/* Prominent Admissions Notice if Closed */}
            {isRegistrationClosed && (
              <div
                style={{
                  background: isCompleted ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                  border: `1px solid ${isCompleted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: isCompleted ? '#b91c1c' : '#b45309',
                }}
              >
                <Lock size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Admissions Closed:</strong> Public registrations for this event are closed {isCompleted ? 'as this event has officially concluded' : 'at this time'}. Registered delegates can still view confirmed passes and claim participation certificates using the portal tabs below.
                </span>
              </div>
            )}

            {/* Quick Metadata Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '16px',
                padding: '20px',
                background: 'var(--bg-soft)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="var(--brand)" /> Start Date
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-strong)' }}>
                  {new Date(event.date_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--brand)" /> Venue
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-strong)' }}>
                  {event.location}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={13} color="var(--brand)" /> Max Seats
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-strong)' }}>
                  {event.max_capacity} Seats
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={13} color="var(--brand)" /> Certificates
                </span>
                <strong style={{ fontSize: '14px', color: 'var(--text-strong)' }}>
                  {event.form_requirements?.provide_certificates ? 'Verified Digital' : 'None'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* FLUENT PIVOT TABS */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: '32px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActivePortalTab('register')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activePortalTab === 'register' ? '2px solid var(--brand)' : '2px solid transparent',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: activePortalTab === 'register' ? 600 : 400,
              cursor: 'pointer',
              color: activePortalTab === 'register' ? 'var(--brand)' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            {isRegistrationClosed && <Lock size={13} />}
            <span>{isRegistrationClosed ? 'Registration closed' : 'Register'}</span>
          </button>
          <button
            onClick={() => setActivePortalTab('lookup')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activePortalTab === 'lookup' ? '2px solid var(--brand)' : '2px solid transparent',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: activePortalTab === 'lookup' ? 600 : 400,
              cursor: 'pointer',
              color: activePortalTab === 'lookup' ? 'var(--brand)' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            My ticket
          </button>
          {hasCertificates && (
            <button
              onClick={() => setActivePortalTab('certificate')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activePortalTab === 'certificate' ? '2px solid var(--brand)' : '2px solid transparent',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: activePortalTab === 'certificate' ? 600 : 400,
                cursor: 'pointer',
                color: activePortalTab === 'certificate' ? 'var(--brand)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              Certificate
            </button>
          )}
        </div>

        {/* TAB 1: REGISTER / CLOSED VIEW */}
        {activePortalTab === 'register' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '32px' }}>
            {/* Registration Card (Closed view or Active form) */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-rest)',
                padding: 'clamp(20px, 4vw, 36px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Event Registration
                </h2>
                {isRegistrationClosed && (
                  <span
                    style={{
                      background: isCompleted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: isCompleted ? '#dc2626' : '#d97706',
                      border: `1px solid ${isCompleted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Lock size={12} /> {isCompleted ? 'Event Completed' : 'Registration Closed'}
                  </span>
                )}
              </div>

              {isRegistrationClosed ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                    {isCompleted
                      ? 'This technical session has officially concluded. Public attendee registrations are no longer accepted.'
                      : 'Public admissions for this session are currently closed.'}
                  </p>

                  <div
                    style={{
                      background: 'var(--bg-soft)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '32px 24px',
                      textAlign: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: isCompleted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: isCompleted ? '#dc2626' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                      }}
                    >
                      <CalendarCheck size={28} />
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '8px' }}>
                      {isCompleted ? 'Registrations Are Closed' : 'Admissions Currently Closed'}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px auto' }}>
                      {isCompleted
                        ? `Registrations for "${event.title}" have concluded as the event has ended. Thank you to all participants, mentors, and partners who joined us!`
                        : `Public registrations for "${event.title}" are closed. Please verify back later or check your registered pass below.`}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px', margin: '0 auto' }}>
                      <button
                        type="button"
                        onClick={() => setActivePortalTab('lookup')}
                        className="fluent-btn fluent-btn-primary"
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          fontSize: '13.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <Search size={16} /> Look Up Registered Ticket / Pass
                      </button>

                      {event.form_requirements?.provide_certificates && (
                        <button
                          type="button"
                          onClick={() => setActivePortalTab('certificate')}
                          className="fluent-btn fluent-btn-secondary"
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            fontSize: '13.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <Award size={16} color="var(--brand)" /> Claim Participation Certificate
                        </button>
                      )}

                      <Link
                        href="/events"
                        className="fluent-btn fluent-btn-secondary"
                        style={{
                          width: '100%',
                          padding: '10px 18px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Explore Other Community Events <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 103, 184, 0.04)',
                      border: '1px solid rgba(0, 103, 184, 0.15)',
                      borderRadius: '6px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <Shield size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '12.5px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                      <strong>Need to verify previous registration?</strong> All confirmed tickets and check-in records remain permanently archived. Switch to the <strong>My ticket</strong> {hasCertificates ? 'or Certificate ' : ''}tab above.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Join this technical session. Free events confirm immediately; paid events proceed through secure Razorpay.
                  </p>

                  {errorMsg && (
                    <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Mode: Solo vs Team */}
                {event.form_requirements?.allow_teams && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Registration Mode
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setIsTeamRegistration(false)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: !isTeamRegistration ? '2px solid var(--brand)' : '1px solid var(--border)',
                          background: !isTeamRegistration ? 'var(--brand-soft)' : 'var(--surface)',
                          color: !isTeamRegistration ? 'var(--brand)' : 'var(--text-body)',
                          cursor: 'pointer',
                        }}
                      >
                        Solo Participant
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTeamRegistration(true)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: isTeamRegistration ? '2px solid var(--brand)' : '1px solid var(--border)',
                          background: isTeamRegistration ? 'var(--brand-soft)' : 'var(--surface)',
                          color: isTeamRegistration ? 'var(--brand)' : 'var(--text-body)',
                          cursor: 'pointer',
                        }}
                      >
                        Team (Max {event.form_requirements?.max_team_size || 4})
                      </button>
                    </div>
                  </div>
                )}

                {/* Team Details & Matchmaking */}
                {isTeamRegistration && (
                  <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Team Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Azure Titans"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="fluent-input"
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={lookingForMembers}
                        onChange={(e) => setLookingForMembers(e.target.checked)}
                      />
                      <span>Place our team on the open matchmaking guild (Looking for members)</span>
                    </label>
                  </div>
                )}

                {/* Institutional Student Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Institutional Affiliation
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsInternalStudent(true)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: isInternalStudent ? '2px solid var(--brand)' : '1px solid var(--border)',
                        background: isInternalStudent ? 'var(--brand-soft)' : 'var(--surface)',
                        color: isInternalStudent ? 'var(--brand)' : 'var(--text-body)',
                        cursor: 'pointer',
                      }}
                    >
                      SRM University AP
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalStudent(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: !isInternalStudent ? '2px solid var(--brand)' : '1px solid var(--border)',
                        background: !isInternalStudent ? 'var(--brand-soft)' : 'var(--surface)',
                        color: !isInternalStudent ? 'var(--brand)' : 'var(--text-body)',
                        cursor: 'pointer',
                      }}
                    >
                      External College
                    </button>
                  </div>
                </div>

                {!isInternalStudent && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        College Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className="fluent-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="fluent-input"
                      />
                    </div>
                  </div>
                )}

                {/* Lead Participant */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="fluent-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@srmap.edu.in"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="fluent-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="AP21110010..."
                      value={leadRegNum}
                      onChange={(e) => setLeadRegNum(e.target.value)}
                      className="fluent-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91..."
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="fluent-input"
                    />
                  </div>
                </div>

                {/* Teammates fields */}
                {isTeamRegistration && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>
                        Teammates ({members.length + 1} / {event.form_requirements.max_team_size || 4})
                      </h4>
                      {members.length < maxTeamMembers && (
                        <button
                          type="button"
                          onClick={addMember}
                          className="fluent-btn fluent-btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          + Add Teammate
                        </button>
                      )}
                    </div>

                    {members.map((m, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '12px' }}>Teammate #{idx + 2}</strong>
                          <button
                            type="button"
                            onClick={() => removeMember(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={m.fullName}
                            onChange={(e) => updateMember(idx, 'fullName', e.target.value)}
                            className="fluent-input"
                          />
                          <input
                            type="email"
                            required
                            placeholder="Email"
                            value={m.email}
                            onChange={(e) => updateMember(idx, 'email', e.target.value)}
                            className="fluent-input"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Reg Number"
                            value={m.regNum}
                            onChange={(e) => updateMember(idx, 'regNum', e.target.value)}
                            className="fluent-input"
                          />
                          <input
                            type="text"
                            placeholder="Branch"
                            value={m.branch}
                            onChange={(e) => updateMember(idx, 'branch', e.target.value)}
                            className="fluent-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="fluent-btn fluent-btn-primary"
                  style={{ padding: '12px', fontSize: '15px', marginTop: '10px' }}
                >
                  {submitting
                    ? 'Processing Entry...'
                    : isFree
                    ? 'Confirm Free Registration'
                    : `Proceed to Razorpay Checkout (₹${event.form_requirements?.registration_fee || 0})`}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Sidebar: Schedule, Speakers & Team Matchmaking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Matchmaking Pool */}
          {event.form_requirements?.allow_teams && (
            <div className="fluent-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Open Team Matchmaking
                </h3>
                {isRegistrationClosed && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-soft)',
                      border: '1px solid var(--border)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Closed
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {isRegistrationClosed
                  ? 'Team matchmaking is closed as event admissions have concluded.'
                  : 'Solo participant? Join an open squad with available slots.'}
              </p>
              {!isRegistrationClosed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {openTeams.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        background: 'var(--bg-soft)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '13px', display: 'block' }}>{t.team_name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lead: {t.leader_name} ({t.leader_branch})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJoinTeam(t)}
                        className="fluent-btn fluent-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Join Team
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

              {/* Schedule Timeline */}
              {event.form_requirements?.agenda && (
                <div className="fluent-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '16px' }}>
                    Schedule &amp; Agenda
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {event.form_requirements.agenda.map((ag, i) => (
                      <div key={i} style={{ borderLeft: '2px solid var(--brand)', paddingLeft: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand)' }}>{ag.time}</span>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0' }}>{ag.title}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{ag.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHECK TICKET / LOOKUP */}
        {activePortalTab === 'lookup' && (
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="fluent-card" style={{ padding: '36px', marginBottom: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Search size={32} color="var(--brand)" style={{ margin: '0 auto 8px' }} />
                <h2 style={{ fontSize: '22px', fontWeight: 600 }}>Self-Service Ticket Lookup</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Enter your registered Email or College Registration Number to retrieve your digital QR pass.
                </p>
              </div>

              <form onSubmit={handleTicketLookup} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="name@srmap.edu.in or AP21110010..."
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  className="fluent-input"
                />
                <button type="submit" disabled={lookupLoading} className="fluent-btn fluent-btn-primary">
                  {lookupLoading ? 'Locating...' : 'Find Pass'}
                </button>
              </form>

              {lookupError && (
                <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {lookupError}
                </div>
              )}
            </div>

            {/* Found Ticket Template */}
            {foundTicket && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lift)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0067b8 0%, #004c87 100%)',
                    color: '#ffffff',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
                      alt="MSC Logo"
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain',
                        background: '#ffffff',
                        borderRadius: '6px',
                        padding: '3px',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9, fontWeight: 700 }}>
                        Official Admission Pass &bull; Chapter &apos;26
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
                        Microsoft Student Community
                      </h3>
                      <div style={{ fontSize: '11px', opacity: 0.85 }}>SRM University-AP &bull; {event.title}</div>
                    </div>
                  </div>
                  <span style={{ background: '#0e7c41', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {foundTicket.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ padding: '28px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', padding: '14px', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0, 103, 184, 0.08)' }}>
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/admin/checkin/${foundTicket.hash_payload}`}
                      size={170}
                      level="H"
                    />
                  </div>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                    {foundTicket.lead_name}
                  </h4>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{foundTicket.lead_email}</span>
                  <div style={{ marginTop: '20px' }}>
                    <Link
                      href={`/ticket/${foundTicket.hash_payload}`}
                      className="fluent-btn fluent-btn-primary"
                    >
                      Open Full Digital Ticket &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CERTIFICATE */}
        {activePortalTab === 'certificate' && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            {!hasCertificates ? (
              <div className="fluent-card" style={{ padding: '48px', textAlign: 'center' }}>
                <Award size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
                  Certificates Not Issued
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                  E-Certificates are closed or not issued for &quot;{event.title}&quot;. The organizers have designated this technical session as non-certificate accredited.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePortalTab('register')}
                  className="fluent-btn fluent-btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Back to Event Overview
                </button>
              </div>
            ) : (
              <div>
                <div className="fluent-card" style={{ padding: '36px', marginBottom: '32px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Award size={36} color="var(--brand)" style={{ margin: '0 auto 8px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-strong)' }}>
                      Participant Verification &amp; E-Certificate Issuance
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '520px', margin: '6px auto 0 auto', lineHeight: 1.5 }}>
                      Enter your registered full name, university registration number (e.g. AP26...), or student email to verify attendance and unlock your accredited completion certificate.
                    </p>
                  </div>

                  <form onSubmit={handleCertificateLookup} style={{ display: 'flex', gap: '10px', maxWidth: '560px', margin: '0 auto' }}>
                    <input
                      type="text"
                      required
                      placeholder="Enter Full Name, Email or Reg No..."
                      value={certQuery}
                      onChange={(e) => setCertQuery(e.target.value)}
                      className="fluent-input"
                      style={{ flex: 1, height: '40px' }}
                    />
                    <button
                      type="submit"
                      disabled={certLoading}
                      className="fluent-btn fluent-btn-primary"
                      style={{ height: '40px', padding: '0 20px', whiteSpace: 'nowrap' }}
                    >
                      {certLoading ? 'Verifying...' : 'Verify & Generate'}
                    </button>
                  </form>

                  {/* Verification Error Notification */}
                  {certError && (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        background: 'var(--danger-bg)',
                        border: '1px solid rgba(197, 15, 31, 0.3)',
                        borderRadius: '4px',
                        color: 'var(--danger)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{certError}</span>
                    </div>
                  )}

                  {/* Verified Attendee Success Banner */}
                  {verifiedParticipant && (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '14px 18px',
                        background: 'var(--success-bg)',
                        border: '1px solid rgba(14, 122, 13, 0.3)',
                        borderRadius: '4px',
                        color: 'var(--success)',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Verified Participant:</strong> {verifiedParticipant.name}
                          <div style={{ fontSize: '11.5px', opacity: 0.9 }}>
                            Reg: {verifiedParticipant.registration_number} &bull; {verifiedParticipant.college} &bull; {verifiedParticipant.role}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'rgba(14, 122, 13, 0.2)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {verifiedParticipant.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Verified Certificate Container */}
                {verifiedParticipant && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                          Verified Certificate Document
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          Official accredited digital credentials rendered from verified institutional records.
                        </p>
                      </div>

                      <button
                        onClick={downloadCertificatePng}
                        disabled={certDownloading}
                        className="fluent-btn fluent-btn-primary"
                        style={{ gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                      >
                        <Download size={16} /> {certDownloading ? 'Rendering High-Res PNG...' : 'Download Verified Certificate (.PNG)'}
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto', paddingBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                      <div
                        ref={certContainerRef}
                        style={{ display: 'inline-block' }}
                        dangerouslySetInnerHTML={{
                          __html: (event.certificate_html || DEFAULT_CERTIFICATE_TEMPLATE)
                            .replace(/\{\{NAME\}\}/g, verifiedParticipant.name)
                            .replace(/\{\{EVENT_TITLE\}\}/g, event.title)
                            .replace(/\{\{COLLEGE_NAME\}\}/g, verifiedParticipant.college || 'SRM University-AP')
                            .replace(/\{\{EVENT_DATE\}\}/g, verifiedParticipant.event_date || new Date(event.date_start).toLocaleDateString())
                            .replace(/\{\{TICKET_ID\}\}/g, verifiedParticipant.ticket_id || verifiedParticipant.hash_payload || 'MSC-VERIFIED')
                            .replace(/\{\{REG_NUMBER\}\}/g, verifiedParticipant.registration_number || 'N/A')
                            .replace(/\{\{ROLE\}\}/g, verifiedParticipant.role || 'Participant')
                            .replace(/\{\{ISSUED_DATE\}\}/g, verifiedParticipant.issued_date || new Date().toLocaleDateString()),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TICKET CONFIRMATION MODAL (Section 2.C.1.5) */}
        {confirmedTicket && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              style={{
                maxWidth: '460px',
                width: '100%',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lift)',
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
                Registration Confirmed!
              </h2>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Your seat has been recorded in the MSC admission ledger.
              </p>

              <div style={{ padding: '16px', background: '#ffffff', display: 'inline-block', border: '1px solid var(--border)', borderRadius: '2px', marginBottom: '20px' }}>
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/admin/checkin/${confirmedTicket.hash_payload}`}
                  size={160}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link
                  href={`/ticket/${confirmedTicket.hash_payload}`}
                  className="fluent-btn fluent-btn-primary"
                >
                  View Digital Ticket Pass &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmedTicket(null)}
                  className="fluent-btn fluent-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
