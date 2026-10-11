'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  Home,
  Info,
  Calendar,
  Image as ImageIcon,
  Users,
  User,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check saved theme
    const savedTheme = localStorage.getItem('msc_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Check user auth state via Supabase session
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        supabase
          .from('member_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role) setUserRole(data.role);
          });
      }
    });
  }, []);

  // Lock body scroll when mobile menu is open to prevent accidental background scrolling
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {}
    setIsLoggedIn(false);
    setUserRole('member');
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('msc_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'About', href: '/about', icon: Info },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Team', href: '/team', icon: Users },
  ];

  const isAdmin = userRole === 'admin';

  // Do not render public navbar on admin portal
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: theme === 'dark' ? 'rgba(39, 39, 39, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            height: '58px',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Brand & Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <img
              src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
              alt="MSC Logo"
              style={{
                width: '30px',
                height: '30px',
                objectFit: 'contain',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                className="brand-title"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-strong)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Microsoft Student Community
              </span>
              <span
                className="brand-subtext"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.2,
                }}
              >
                SRM University-AP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            style={{ display: 'none', alignItems: 'center', gap: '4px' }}
            className="desktop-nav"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--brand)' : 'var(--text-body)',
                    borderRadius: '6px',
                    backgroundColor: isActive
                      ? theme === 'dark'
                        ? 'rgba(40, 153, 245, 0.12)'
                        : 'rgba(0, 103, 184, 0.08)'
                      : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '7px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.color = 'var(--text-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Admin / Login links (Desktop) */}
            <div className="desktop-auth-controls" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
              {isAdmin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link
                    href="/admin"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      gap: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-strong)',
                      textDecoration: 'none',
                    }}
                  >
                    <Shield size={14} color="var(--brand)" />
                    <span>Admin</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    aria-label="Sign Out"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : isLoggedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link
                    href="/onboarding"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-strong)',
                      textDecoration: 'none',
                    }}
                  >
                    <User size={14} color="var(--brand)" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    aria-label="Sign Out"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '7px 18px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--brand)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand)')}
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-toggle-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-strong)',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Responsive CSS styling */}
        <style>{`
          @media (min-width: 820px) {
            .desktop-nav { display: flex !important; }
            .desktop-auth-controls { display: flex !important; }
            .mobile-toggle-btn { display: none !important; }
          }
          @media (max-width: 480px) {
            .brand-subtext { display: none !important; }
          }
          @media (max-width: 360px) {
            .brand-title { font-size: 13px !important; max-width: 175px !important; }
          }
        `}</style>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: '58px 0 0 0',
            backgroundColor: theme === 'dark' ? 'rgba(25, 25, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px 20px 32px 20px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Top navigation links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                paddingLeft: '12px',
              }}
            >
              Menu
            </span>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    fontSize: '16px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--brand)' : 'var(--text-strong)',
                    backgroundColor: isActive
                      ? theme === 'dark'
                        ? 'rgba(40, 153, 245, 0.12)'
                        : 'rgba(0, 103, 184, 0.08)'
                      : 'transparent',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} color={isActive ? 'var(--brand)' : 'var(--text-muted)'} />
                  <span>{link.name}</span>
                </Link>
              );
            })}

          </div>

          {/* Bottom user action controls */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {isAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: 'var(--brand)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                  }}
                >
                  <Shield size={16} /> Admin Operations Portal
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            ) : isLoggedIn ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: 'var(--text-strong)',
                    textDecoration: 'none',
                  }}
                >
                  <User size={16} /> Student Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--brand)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                <span>Sign In to Community</span>
                <ArrowRight size={16} />
              </Link>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 4px 0 4px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>SRM University-AP</span>
              <span>Chapter &apos;26</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
