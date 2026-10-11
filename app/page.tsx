import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  Cloud,
  Trophy,
  Users,
  Calendar,
  MapPin,
  Send,
  Code,
} from 'lucide-react';
import type { Metadata } from 'next';
import TelemetryMarquee from '@/components/TelemetryMarquee';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Build what\'s next. Together. | Microsoft Student Community SRM AP',
  description:
    'The student developer community at SRM University-AP. We build cloud applications on Azure, host hackathons, and contribute to open source together.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Microsoft Student Community | SRM University-AP',
    description:
      'The student developer community at SRM University-AP. We build cloud applications on Azure, host hackathons, and contribute to open source together.',
    url: '/',
  },
};

export default async function HomePage() {
  let allEvents: EventItem[] = FALLBACK_EVENTS;

  try {
    const supabase = getAdminClient();
    const queryPromise = supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .order('date_start', { ascending: false });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Events fetch timeout')), 6000)
    );

    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (!error && data && data.length > 0) {
      allEvents = data as EventItem[];
    }
  } catch {
    // Immediately uses fallback events catalog if offline or slow
  }

  const openUpcoming = allEvents.filter((e) => e.status === 'upcoming' && e.registration_open);
  const upcomingList = allEvents.filter((e) => e.status === 'upcoming');
  const flagship = openUpcoming[0] || upcomingList[0] || allEvents[0];

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-body)', fontFamily: 'var(--font-family)' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(72px, 10vw, 120px) 0 clamp(64px, 9vw, 100px) 0',
          overflow: 'hidden',
          backgroundColor: '#05111c',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Background Artwork */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/hero_bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.3,
          }}
        />

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(5, 17, 28, 0.96) 0%, rgba(5, 17, 28, 0.85) 50%, rgba(5, 17, 28, 0.45) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '780px' }}>
            {/* Microsoft Eyebrow */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 6px)',
                  gridTemplateRows: 'repeat(2, 6px)',
                  gap: '2px',
                  flexShrink: 0,
                }}
              >
                <div style={{ background: '#f25022', borderRadius: '1px' }} />
                <div style={{ background: '#7fba00', borderRadius: '1px' }} />
                <div style={{ background: '#00a4ef', borderRadius: '1px' }} />
                <div style={{ background: '#ffb900', borderRadius: '1px' }} />
              </div>
              <span>MICROSOFT STUDENT COMMUNITY &bull; SRM UNIVERSITY-AP</span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(34px, 5vw, 52px)',
                fontWeight: 600,
                lineHeight: 1.12,
                color: '#ffffff',
                marginBottom: '18px',
                letterSpacing: '-0.02em',
              }}
            >
              Build what&apos;s next. Together.
            </h1>

            {/* Sub-headline */}
            <p
              style={{
                fontSize: 'clamp(15px, 2vw, 17px)',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '640px',
                lineHeight: 1.6,
                marginBottom: '32px',
              }}
            >
              The student developer community at SRM University-AP. We build cloud applications on Azure, host hackathons, and contribute to open source together.
            </p>

            {/* Two CTA Buttons only */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href="/events"
                className="fluent-btn fluent-btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#0067b8',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Explore events</span>
                <ArrowRight size={14} />
              </Link>

              <a
                href="https://discord.gg/K5NC5wAhg"
                target="_blank"
                rel="noopener noreferrer"
                className="fluent-btn fluent-btn-secondary"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Join our Discord</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MARQUEE */}
      <TelemetryMarquee activeEventTitle={flagship?.title} />

      {/* 3. THREE PILLARS */}
      <section id="ecosystem" style={{ padding: '72px 0', background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ marginBottom: '36px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              What we do
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 600, color: 'var(--text-strong)', marginTop: '4px', letterSpacing: '-0.01em' }}>
              Three pillars powering your developer journey
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px', marginTop: '8px', lineHeight: 1.6 }}>
              From cloud computing to competitive hackathons to mentorship, we help student developers go from ideas to production.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
            {/* Pillar 01 · Azure Blue */}
            <div
              className="fluent-card"
              style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--brand-soft)',
                    color: 'var(--brand)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cloud size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-strong)' }}>
                Applied Cloud &amp; AI
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, marginBottom: '16px' }}>
                Hands-on workshops with Microsoft Azure, production AI systems, and cloud architecture for real-world applications.
              </p>
              <Link href="/events" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                Learn more <ArrowRight size={12} />
              </Link>
            </div>

            {/* Pillar 02 · Green */}
            <div
              className="fluent-card"
              style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(14, 122, 13, 0.08)',
                    color: '#0e7a0d',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trophy size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-strong)' }}>
                Hackathons &amp; Competitions
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, marginBottom: '16px' }}>
                National-scale hackathons like SYNORA and Solutions for Smart India, uniting hundreds of student innovators.
              </p>
              <Link href="/events" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                Learn more <ArrowRight size={12} />
              </Link>
            </div>

            {/* Pillar 03 · Orange */}
            <div
              className="fluent-card"
              style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(216, 59, 1, 0.08)',
                    color: '#d83b01',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Code size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-strong)' }}>
                Mentorship &amp; Open Source
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, marginBottom: '16px' }}>
                Direct mentorship from Microsoft Learn Student Ambassadors, senior engineers, and peer code reviews on open-source projects.
              </p>
              <Link href="/about" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                Learn more <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. UPCOMING EVENT */}
      <section id="upcoming" style={{ padding: '72px 0', background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What&apos;s next
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 30px)', fontWeight: 600, color: 'var(--text-strong)', marginTop: '4px', letterSpacing: '-0.01em' }}>
                Featured event
              </h2>
            </div>
            <Link
              href="/events"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brand)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              See all events <ArrowRight size={13} />
            </Link>
          </div>

          {/* Spotlight Card */}
          {flagship && (() => {
            const startDate = new Date(flagship.date_start);
            const isValidDate = !isNaN(startDate.getTime());
            const formattedDate = isValidDate
              ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
              : 'Date to be announced';
            const isPaid = flagship.form_requirements?.event_pricing === 'paid';
            const priceLabel = isPaid ? `₹${flagship.form_requirements.registration_fee}` : 'Free';
            const isCompleted = flagship.status === 'completed' || Boolean(flagship.date_end && new Date(flagship.date_end) < new Date());
            const isRegOpen = !isCompleted && Boolean(flagship.registration_open);

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-rest)',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ minHeight: '260px', position: 'relative', overflow: 'hidden', background: '#0a0a0c' }}>
                  <img
                    src={flagship.image_url || '/hero_bg.png'}
                    alt={flagship.title}
                    style={{ width: '100%', height: '100%', minHeight: '260px', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(0, 103, 184, 0.92)',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {priceLabel}
                  </div>
                </div>

                <div style={{ padding: 'clamp(24px, 4vw, 36px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isCompleted ? (
                      <span
                        className="fluent-badge"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-soft)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Completed
                      </span>
                    ) : isRegOpen ? (
                      <span
                        className="fluent-badge badge-success"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                      >
                        Registration open
                      </span>
                    ) : (
                      <span
                        className="fluent-badge"
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(217, 119, 6, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(217, 119, 6, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        Registration closed
                      </span>
                    )}
                    {flagship.type && (
                      <span className="fluent-badge badge-info" style={{ borderRadius: 'var(--radius-sm)' }}>
                        {flagship.type.charAt(0).toUpperCase() + flagship.type.slice(1)}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
                    {flagship.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                    {flagship.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-body)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} color="var(--brand)" />
                      <span>{formattedDate}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="var(--brand)" />
                      <span>{flagship.location}</span>
                    </div>
                    {flagship.max_capacity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={14} color="var(--brand)" />
                        <span>{flagship.max_capacity} seats</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link
                      href={`/events/${flagship.slug}`}
                      className="fluent-btn fluent-btn-primary"
                      style={{ padding: '8px 20px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
                    >
                      View details <ArrowRight size={13} />
                    </Link>
                    <Link
                      href="/events"
                      style={{
                        fontSize: '13px',
                        color: 'var(--brand)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      See all events &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 5. IMPACT METRICS */}
      <section style={{ padding: '56px 0', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '0',
              textAlign: 'center',
            }}
          >
            {[
              { num: '1,200+', label: 'Student members', sub: 'Across engineering disciplines' },
              { num: '18+', label: 'Hackathons & summits', sub: 'National and campus events' },
              { num: '45+', label: 'Technical workshops', sub: 'Azure, AI, Web & Security' },
              { num: '100%', label: 'Student-run', sub: 'Supported by faculty mentors' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 16px',
                  borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>
                  {stat.num}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', marginTop: '4px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CONTACT */}
      <section id="contact" style={{ padding: '72px 0', background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-rest)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            }}
          >
            {/* Contact details */}
            <div style={{ padding: 'clamp(24px, 4vw, 40px)', background: 'var(--bg-soft)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Get in touch
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-strong)', margin: '6px 0 12px 0' }}>
                Contact the team
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '24px' }}>
                Whether you represent a student club, an industry partner, or want to speak at our next event, reach out to us.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-strong)', fontSize: '12px', marginBottom: '2px' }}>Email</strong>
                  <a href="mailto:msc.community@srmap.edu.in" style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
                    msc.community@srmap.edu.in
                  </a>
                </div>

                <div>
                  <strong style={{ display: 'block', color: 'var(--text-strong)', fontSize: '12px', marginBottom: '2px' }}>Location</strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    SRM University AP, Neerukonda, Mangalagiri, Andhra Pradesh 522240
                  </span>
                </div>

                <div>
                  <strong style={{ display: 'block', color: 'var(--text-strong)', fontSize: '12px', marginBottom: '2px' }}>Discord</strong>
                  <a href="https://discord.gg/K5NC5wAhg" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
                    Join our community server
                  </a>
                </div>
              </div>
            </div>

            {/* Message form */}
            <div style={{ padding: 'clamp(24px, 4vw, 40px)' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-strong)' }}>
                Send a message
              </h3>
              <form
                action="https://api.web3forms.com/submit"
                method="POST"
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY" />
                <input type="hidden" name="subject" value="New Inquiry from MSC SRM AP Platform" />
                <input type="hidden" name="from_name" value="MSC Public Portal" />

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-strong)' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="fluent-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-strong)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@srmap.edu.in"
                    className="fluent-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-strong)' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    name="topic"
                    required
                    placeholder="What is this about?"
                    className="fluent-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-strong)' }}>
                    Message
                  </label>
                  <textarea
                    rows={4}
                    name="message"
                    required
                    placeholder="Tell us more..."
                    className="fluent-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="fluent-btn fluent-btn-primary"
                  style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: '13px' }}
                >
                  <Send size={13} /> Send message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
