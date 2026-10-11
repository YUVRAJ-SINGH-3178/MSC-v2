'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Linkedin, Instagram, MessageSquare, Globe } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/microsoft-student-community-srm-university/',
      icon: Linkedin,
      label: 'LinkedIn',
    },
    {
      name: 'Discord',
      href: 'https://discord.gg/K5NC5wAhg',
      icon: MessageSquare,
      label: 'Discord Community',
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/msc.srmap/?igsh=YmEwdnlteHUwNjVs#/',
      icon: Instagram,
      label: 'Instagram',
    },
    {
      name: 'Reddit',
      href: 'https://www.reddit.com/user/MSC_SRMAP/',
      icon: Globe,
      label: 'Reddit',
    },
    {
      name: 'Email',
      href: 'mailto:msc.community@srmap.edu.in',
      icon: Mail,
      label: 'Email Us',
    },
  ];

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Events', href: '/events' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Team', href: '/team' },
    { label: 'Tickets', href: '/ticket' },
    
  ];

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-soft)',
        borderTop: '1px solid var(--border)',
        padding: '40px 0 0 0',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '32px',
            marginBottom: '32px',
          }}
        >
          {/* Identity & Mission */}
          <div style={{ maxWidth: '380px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img
                src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
                alt="Microsoft Student Community"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-strong)' }}>
                  Microsoft
                </span>
                <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-strong)', opacity: 0.5 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Student Community</span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              A student-led initiative at SRM University-AP empowering innovators through cloud computing, hackathons, and open-source collaboration.
            </p>

            <div style={{ display: 'flex', gap: '6px' }}>
              {socialLinks.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                      transition: 'all var(--duration-fast) var(--easing-decelerate)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--brand)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    }}
                  >
                    <Icon size={14} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-strong)',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              Quick links
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(100px, 1fr))',
                gap: '8px 24px',
              }}
            >
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    transition: 'color var(--duration-fast) var(--easing-decelerate)',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--brand)')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact & Location */}
          <div style={{ maxWidth: '280px', width: '100%' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-strong)',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              Contact
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 8px 0' }}>
              SRM University-AP, Neerukonda, Mangalagiri Mandal, Andhra Pradesh 522240
            </p>
            <a
              href="mailto:msc.community@srmap.edu.in"
              style={{
                fontSize: '13px',
                color: 'var(--brand)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              msc.community@srmap.edu.in
            </a>
          </div>
        </div>

        {/* Bottom Bar: Microsoft.com footer pattern */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            &copy; 2026 Microsoft Student Community &middot; SRM University-AP
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '11px' }}>
              About
            </Link>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <a href="mailto:msc.community@srmap.edu.in" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '11px' }}>
              Contact us
            </a>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <span style={{ fontSize: '11px' }}>
              Not officially affiliated with Microsoft Corporation
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
