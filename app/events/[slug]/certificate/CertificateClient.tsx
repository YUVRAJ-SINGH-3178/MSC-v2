'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
// html-to-image dynamically loaded on download
import { Award, Download, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { EventItem } from '@/lib/data/mock-fallback';

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

export default function CertificateClient({
  event,
  initialEmail,
}: {
  event: EventItem;
  initialEmail: string;
}) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [verifiedParticipant, setVerifiedParticipant] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If initialEmail was supplied, trigger verify
  useEffect(() => {
    if (initialEmail) {
      handleVerification(initialEmail);
    }
  }, [initialEmail]);

  const handleVerification = async (searchQuery: string) => {
    setErrorMsg(null);
    if (!searchQuery.trim()) return;

    setLoading(true);
    setVerifiedParticipant(null);

    try {
      const res = await fetch('/api/events/verify-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          slug: event.slug,
          query: searchQuery.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.verified) {
        setErrorMsg(data.error || 'No verified attendance record found for this participant.');
        return;
      }

      setVerifiedParticipant(data.participant);
    } catch (err: any) {
      console.error('[Certificate verification failed]:', err);
      setErrorMsg('Failed to reach verification ledger. Please verify connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(certificateRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const participantName = verifiedParticipant?.name || 'MSC_Participant';
      const link = document.createElement('a');
      link.download = `Certificate_${participantName.replace(/\s+/g, '_')}_${event.slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export certificate image:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Substitute tokens in template
  const rawTemplate = event.certificate_html || DEFAULT_CERTIFICATE_TEMPLATE;
  const renderedHtml = verifiedParticipant
    ? rawTemplate
        .replace(/\{\{NAME\}\}/g, verifiedParticipant.name)
        .replace(/\{\{EVENT_TITLE\}\}/g, event.title)
        .replace(/\{\{COLLEGE_NAME\}\}/g, verifiedParticipant.college || 'SRM University-AP')
        .replace(/\{\{EVENT_DATE\}\}/g, verifiedParticipant.event_date || new Date(event.date_start).toLocaleDateString())
        .replace(/\{\{TICKET_ID\}\}/g, verifiedParticipant.ticket_id || 'MSC-VERIFIED')
        .replace(/\{\{REG_NUMBER\}\}/g, verifiedParticipant.registration_number || 'N/A')
        .replace(/\{\{ROLE\}\}/g, verifiedParticipant.role || 'Participant')
        .replace(/\{\{ISSUED_DATE\}\}/g, verifiedParticipant.issued_date || new Date().toLocaleDateString())
    : '';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 0 80px 0' }}>
      <div className="container" style={{ maxWidth: '920px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href={`/events/${event.slug}`}
            style={{
              fontSize: '13px',
              color: 'var(--brand)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Back to {event.title}
          </Link>
        </div>

        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand)',
              marginBottom: '16px',
            }}
          >
            <Award size={26} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-strong)', margin: '0 0 8px 0' }}>
            Accredited Certificate Verification
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '520px', marginInline: 'auto' }}>
            Official credentials issued for {event.title}. Enter your registered attendee name, college email, or registration number to verify attendance.
          </p>
        </div>

        {event.form_requirements?.provide_certificates === false ? (
          <div className="fluent-card" style={{ padding: '48px', textAlign: 'center' }}>
            <Award size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
              Certificates Not Issued
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
              E-Certificates are not issued for &quot;{event.title}&quot;. The organizers have designated this technical session as non-certificate accredited.
            </p>
            <Link href={`/events/${event.slug}`} className="fluent-btn fluent-btn-secondary" style={{ fontSize: '13px' }}>
              Return to Event Overview
            </Link>
          </div>
        ) : (
          <div>
            {/* Search Card */}
            <div
              className="fluent-card"
              style={{
                padding: '28px',
                marginBottom: '32px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerification(query);
                }}
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
              >
                <input
                  type="text"
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter full name, student email, or university reg number..."
                  className="fluent-input"
                  style={{ flex: 1, minWidth: '240px', height: '42px', fontSize: '14px' }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="fluent-btn fluent-btn-primary"
                  style={{ height: '42px', padding: '0 24px', fontWeight: 600 }}
                >
                  {loading ? 'Verifying...' : 'Verify Attendance'}
                </button>
              </form>

              {/* Error Alert */}
              {errorMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--danger-bg)',
                    border: '1px solid rgba(197, 15, 31, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    marginTop: '20px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Verified Success Alert */}
              {verifiedParticipant && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '14px 18px',
                    background: 'var(--success-bg)',
                    border: '1px solid rgba(14, 122, 13, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--success)',
                    fontSize: '13px',
                    marginTop: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Verified Participant:</strong> {verifiedParticipant.name}
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        Registration: {verifiedParticipant.registration_number} &bull; {verifiedParticipant.college} &bull; {verifiedParticipant.role}
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
                      textTransform: 'uppercase',
                    }}
                  >
                    {verifiedParticipant.status}
                  </span>
                </div>
              )}
            </div>

            {/* Certificate Preview and Download */}
            {verifiedParticipant && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                      Live Digital Certificate
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Ready for download and verification on LinkedIn, GitHub, or academic portfolios.
                    </p>
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="fluent-btn fluent-btn-primary"
                    style={{ padding: '10px 20px', gap: '8px', fontWeight: 600 }}
                  >
                    <Download size={16} /> {downloading ? 'Rendering Image...' : 'Download Certificate (.PNG)'}
                  </button>
                </div>

                <div style={{ overflowX: 'auto', paddingBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                  <div
                    ref={certificateRef}
                    style={{ display: 'inline-block' }}
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
