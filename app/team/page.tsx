import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FALLBACK_TEAM, TeamMemberItem } from '@/lib/data/mock-fallback';
import { Linkedin, Github, Twitter, Instagram, Globe, Mail, ArrowRight } from 'lucide-react';
import { getAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Executive Board & Team | Microsoft Student Community | SRM University-AP',
  description:
    'Meet the student executives, engineering domain leads, and coordinators driving Microsoft Student Community at SRM University-AP.',
  alternates: {
    canonical: '/team',
  },
  openGraph: {
    title: 'Executive Board & Team | Microsoft Student Community | SRM University-AP',
    description:
      'Meet the student executives, engineering domain leads, and coordinators driving Microsoft Student Community at SRM University-AP.',
    url: '/team',
  },
};

// Deterministic color palette for initial avatars
const AVATAR_PALETTE = ['#0078d4', '#107c10', '#d83b01', '#5c2d91', '#008272', '#b4009e', '#004e8c'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default async function TeamPage() {
  let teamList = FALLBACK_TEAM;
  try {
    const supabase = getAdminClient();
    const queryPromise = supabase
      .from('team_members')
      .select('*')
      .order('tier', { ascending: true });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Team fetch timeout')), 1500)
    );

    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;
    if (!error && data && data.length > 0) {
      teamList = data as TeamMemberItem[];
    }
  } catch {
    // Fall back to mock team if table is empty or error
  }

  const chiefBoard = teamList.filter((m) => m.tier === 'chief');
  const boardMembers = teamList.filter((m) => m.tier === 'board');
  const teamMembers = teamList.filter((m) => m.tier === 'member');

  const renderMemberCard = (member: TeamMemberItem) => {
    const avatarBg = getAvatarColor(member.name);
    const initials = getInitials(member.name);

    return (
      <div
        key={member.id}
        className="fluent-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-rest)',
          background: 'var(--surface)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Portrait / Avatar Container */}
        <div
          style={{
            height: '220px',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-soft)',
          }}
        >
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-soft)',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: avatarBg,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {initials}
              </div>
            </div>
          )}

          {/* Category Pill */}
          {member.category && (
            <span
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.72)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}
            >
              {member.category}
            </span>
          )}
        </div>

        {/* Profile Details */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-strong)',
              marginBottom: '4px',
              letterSpacing: '-0.01em',
            }}
          >
            {member.name}
          </h3>

          {/* Role Tag */}
          <div style={{ marginBottom: member.email ? '8px' : '14px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--brand)',
                background: 'var(--brand-soft)',
                padding: '2px 6px',
                borderRadius: '2px',
                display: 'inline-block',
              }}
            >
              {member.role}
            </span>
          </div>

          {/* Official Email */}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                wordBreak: 'break-all',
              }}
            >
              <Mail size={13} color="var(--brand)" />
              <span>{member.email}</span>
            </a>
          )}

          {/* Social Icons row (34px hit target) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: 'auto',
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
            }}
          >
            {member.linkedin_url && (
              <a
                href={member.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} LinkedIn`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '4px',
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
                title="LinkedIn Profile"
              >
                <Linkedin size={15} />
              </a>
            )}
            {member.github_url && (
              <a
                href={member.github_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} GitHub`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '4px',
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
                title="GitHub Profile"
              >
                <Github size={15} />
              </a>
            )}
            {member.twitter_url && (
              <a
                href={member.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Twitter / X`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '4px',
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
                title="Twitter Profile"
              >
                <Twitter size={15} />
              </a>
            )}
            {member.instagram_url && (
              <a
                href={member.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Instagram`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '4px',
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
                title="Instagram Profile"
              >
                <Instagram size={15} />
              </a>
            )}
            {member.portfolio_url && (
              <a
                href={member.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Portfolio`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '4px',
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
                title="Personal Website"
              >
                <Globe size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '60px 0 100px 0' }}>
      <div className="container">
        {/* Header with Microsoft 4-Color Eyebrow */}
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
            <span>MICROSOFT STUDENT COMMUNITY &bull; TEAM</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 600,
              color: 'var(--text-strong)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '12px',
            }}
          >
            Our team
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Meet the student leads, domain architects, and engineers organizing hackathons, open-source projects, and technical workshops at SRM University-AP.
          </p>
        </div>

        {/* Tier 1: Leadership */}
        <section style={{ marginBottom: '56px' }}>
          <div
            style={{
              borderLeft: '3px solid var(--brand)',
              paddingLeft: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Leadership
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--brand-soft)',
                    color: 'var(--brand)',
                    padding: '1px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {chiefBoard.length}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                Strategic governance, university relations, and chapter direction
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '20px',
            }}
          >
            {chiefBoard.map((m) => renderMemberCard(m))}
          </div>
        </section>

        {/* Tier 2: Team Leads */}
        <section style={{ marginBottom: '56px' }}>
          <div
            style={{
              borderLeft: '3px solid #107c10',
              paddingLeft: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Team leads
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    padding: '1px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {boardMembers.length}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                Cloud engineering, technical architecture, brand communications, and operations
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '20px',
            }}
          >
            {boardMembers.map((m) => renderMemberCard(m))}
          </div>
        </section>

        {/* Tier 3: Members */}
        <section style={{ marginBottom: '64px' }}>
          <div
            style={{
              borderLeft: '3px solid #d83b01',
              paddingLeft: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Members
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--warning-bg)',
                    color: 'var(--warning)',
                    padding: '1px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {teamMembers.length}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                Developers, moderators, and student community coordinators
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '20px',
            }}
          >
            {teamMembers.map((m) => renderMemberCard(m))}
          </div>
        </section>

        {/* Join Chapter Ribbon */}
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
                Interested in joining the team?
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '560px', margin: 0 }}>
                Applications for student leads, core developers, and event coordinators open each semester. Build real software with Microsoft technologies.
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
                href="/about"
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
                About our chapter
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
