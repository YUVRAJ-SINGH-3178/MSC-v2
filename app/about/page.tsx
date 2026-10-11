import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, Cpu, Rocket, ArrowRight, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Microsoft Student Community | SRM University-AP',
  description:
    'The official charter, story, and community pillars of Microsoft Student Community at SRM University-AP. Founded by Jayanth Ramakrishnan, guided by Dr. Murali Krishna Enduri Sir and Dr. CV Tomy Sir.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us | Microsoft Student Community | SRM University-AP',
    description:
      'The official charter, story, and community pillars of Microsoft Student Community at SRM University-AP.',
    url: '/about',
  },
};

export default function AboutPage() {
  const manifestoPillars = [
    {
      num: '01',
      title: 'Our vision',
      statement: 'To position ourselves as a student-focused community and empower the visionaries of tomorrow.',
      colorAccent: '#0067b8',
      tags: ['Impact', 'Innovation', 'Scale'],
      icon: Rocket,
    },
    {
      num: '02',
      title: 'Our mission',
      statement:
        'To provide a student-led platform for interaction and ideas, bringing diversity across people and engineering domains.',
      colorAccent: '#107c10',
      tags: ['Interaction', 'Ideas', 'Diversity'],
      icon: Users,
    },
    {
      num: '03',
      title: 'Core technologies',
      statement: 'We utilize enterprise-grade ecosystems to build, scale, and ship real-world student applications.',
      colorAccent: '#d83b01',
      tags: ['Azure Cloud', 'Open Source', 'AI Integration', 'Web Systems', 'Data Pipelines'],
      icon: Cpu,
    },
  ];

  const journeyPhases = [
    {
      phase: 'Phase I',
      title: 'Foundations',
      desc: "The community established student-first technical opportunities through flagship hackathons and workshops that built our campus foundation.",
      badge: 'Milestone',
    },
    {
      phase: 'Phase II',
      title: 'Execution',
      desc: 'Expanding outreach across academic departments with hands-on bootcamps, Azure certifications, and industry speaker sessions.',
      badge: 'Active chapter',
    },
    {
      phase: 'Phase III',
      title: 'Evolution',
      desc: 'Scaling as a leading student technical community by supporting student builders, open research, and high-impact regional initiatives.',
      badge: 'Strategic vision',
    },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '60px 0 100px 0' }}>
      <div className="container">
        {/* Microsoft Header & Eyebrow */}
        <div style={{ marginBottom: '44px', maxWidth: '840px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              background: 'var(--bg-soft)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--text-body)',
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
            <span>MICROSOFT STUDENT COMMUNITY &bull; ABOUT US</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 600,
              color: 'var(--text-strong)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '14px',
            }}
          >
            Empowering every student to achieve more with technology.
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '720px',
            }}
          >
            The official student-led engineering community at SRM University-AP. We bridge the gap between academic study and enterprise cloud architectures through hands-on hackathons, technical workshops, and open collaboration.
          </p>
        </div>

        {/* Visual Artwork Container */}
        <div
          style={{
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-rest)',
            marginBottom: '56px',
          }}
        >
          <img
            src="/about_visual.jpg"
            alt="Microsoft Student Community at SRM University AP"
            style={{
              width: '100%',
              maxHeight: '420px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              padding: '12px 20px',
              background: 'var(--bg-soft)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--brand)" />
              <span style={{ fontWeight: 500, color: 'var(--text-body)' }}>
                Official Student Tech Chapter &bull; SRM University-AP
              </span>
            </div>
            <span>Affiliated with Microsoft Student Communities Network</span>
          </div>
        </div>

        {/* Our Story Block */}
        <section style={{ marginBottom: '64px' }}>
          <div
            className="fluent-card"
            style={{
              padding: 'clamp(24px, 4vw, 36px)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-rest)',
            }}
          >
            <div style={{ marginBottom: '28px', maxWidth: '760px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brand)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Institutional roots
              </span>
              <h2
                style={{
                  fontSize: 'clamp(22px, 3.5vw, 28px)',
                  fontWeight: 600,
                  color: 'var(--text-strong)',
                  marginTop: '4px',
                  letterSpacing: '-0.015em',
                }}
              >
                Our story
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-body)', marginTop: '10px', lineHeight: 1.65 }}>
                Founded with a mission to create a high-impact technical home for aspiring engineers at SRM University-AP, Microsoft Student Community (MSC) began as a focused group exploring Azure Cloud, distributed architecture, and software design. Guided by departmental faculty leadership, MSC quickly expanded into one of the largest builder collectives on campus, organizing university hackathons, open-source initiatives, and developer conferences.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '20px',
                borderTop: '1px solid var(--border)',
                paddingTop: '24px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-soft)',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Founder
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: '2px 0 4px 0' }}>
                    Jayanth Ramakrishnan
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Student founder who structured the chapter and laid the foundation for campus-wide developer engagement.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-soft)',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#107c10' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Faculty mentors
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: '2px 0 4px 0' }}>
                    Dr. Murali Krishna Enduri &amp; Dr. CV Tomy
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Faculty professors providing institutional governance, research guidance, and university lab resources.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-soft)',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d83b01' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Campus chapter
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: '2px 0 4px 0' }}>
                    SRM University-AP
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Amaravati, Andhra Pradesh &bull; Dept. of Computer Science &amp; Engineering.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Guiding Principles */}
        <section style={{ marginBottom: '64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brand)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Principles
            </span>
            <h2
              style={{
                fontSize: 'clamp(22px, 3.5vw, 28px)',
                fontWeight: 600,
                color: 'var(--text-strong)',
                marginTop: '4px',
                letterSpacing: '-0.015em',
              }}
            >
              Our guiding principles
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '640px', marginTop: '6px' }}>
              Modeled after Microsoft engineering practices, our principles define how we innovate, collaborate, and support student developers.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '20px',
            }}
          >
            {manifestoPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.num}
                  className="fluent-card"
                  style={{
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    borderTop: `3px solid ${pillar.colorAccent}`,
                    boxShadow: 'var(--shadow-rest)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          background: 'var(--bg-soft)',
                          color: pillar.colorAccent,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          opacity: 0.4,
                        }}
                      >
                        {pillar.num}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 600,
                        color: 'var(--text-strong)',
                        marginBottom: '10px',
                      }}
                    >
                      {pillar.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        marginBottom: '24px',
                      }}
                    >
                      &ldquo;{pillar.statement}&rdquo;
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '14px',
                    }}
                  >
                    {pillar.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: 'var(--bg-soft)',
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          color: 'var(--text-body)',
                          fontWeight: 500,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chronicle Timeline */}
        <section style={{ marginBottom: '64px' }}>
          <div style={{ marginBottom: '28px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brand)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Timeline
            </span>
            <h2
              style={{
                fontSize: 'clamp(22px, 3.5vw, 28px)',
                fontWeight: 600,
                color: 'var(--text-strong)',
                marginTop: '4px',
                letterSpacing: '-0.015em',
              }}
            >
              Our journey
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '620px', marginTop: '6px' }}>
              Tracing our journey from early technical meetups to large-scale hackathons and industry collaborations.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              borderLeft: '2px solid var(--border)',
              paddingLeft: '24px',
              marginLeft: '8px',
            }}
          >
            {journeyPhases.map((phase, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '20px 24px',
                  boxShadow: 'var(--shadow-rest)',
                }}
              >
                {/* Node pin */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-29px',
                    top: '22px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    boxShadow: '0 0 0 3px var(--bg)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--brand)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {phase.phase}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'var(--bg-soft)',
                      border: '1px solid var(--border)',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {phase.badge}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-strong)',
                    marginBottom: '6px',
                  }}
                >
                  {phase.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '740px', margin: 0 }}>
                  {phase.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section>
          <div
            style={{
              padding: 'clamp(24px, 4vw, 36px)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              boxShadow: 'var(--shadow-rest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
                Join the developer community
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '540px', margin: 0 }}>
                Participate in upcoming Azure bootcamps, compete in campus hackathons, or collaborate on open-source projects.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                href="/events"
                className="fluent-btn fluent-btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '13.5px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                See upcoming events <ArrowRight size={14} />
              </Link>
              <Link
                href="/team"
                className="fluent-btn fluent-btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '13.5px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Meet the team
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
