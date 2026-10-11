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
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setIsLoggedIn(true);
          const { data: profile } = await supabase
            .from('member_profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single();
          if (profile?.role) setUserRole(profile.role);
        }
      } catch {
        // Gracefully ignore fetch errors when Supabase is unreachable
      }
    };
    checkAuth();
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
          backgroundColor: theme === 'dark' ? 'rgba(20, 20, 20, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
          transition: 'background-color var(--duration-normal) var(--easing-decelerate)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            height: '48px',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Microsoft Brand: "Microsoft | Student Community" pattern */}
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
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                className="brand-title"
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-strong)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Microsoft
              </span>
              <span
                className="brand-divider"
                style={{
                  width: '1px',
                  height: '16px',
                  backgroundColor: 'var(--border-strong)',
                  flexShrink: 0,
                  opacity: 0.5,
                }}
              />
              <span
                className="brand-subtext"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Student Community
              </span>
            </div>
          </Link>

          {/* Desktop Navigation: underline active indicator */}
          <nav
            style={{ display: 'none', alignItems: 'center', gap: '2px' }}
            className="desktop-nav"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '14px 12px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text-strong)' : 'var(--text-body)',
                    borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'all var(--duration-fast) var(--easing-decelerate)',
                    marginBottom: '-1px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-strong)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-body)';
                    }
                  }}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color var(--duration-fast) var(--easing-decelerate), color var(--duration-fast) var(--easing-decelerate)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.color = 'var(--text-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Admin / Login links (Desktop) */}
            <div className="desktop-auth-controls" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
              {isAdmin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="desktop-auth-controls" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
              {isStaff ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Link
                    href="/admin"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '5px 12px',
                      gap: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-strong)',
                      textDecoration: 'none',
                    }}
                  >
                    <Shield size={13} color="var(--brand)" />
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
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : isLoggedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Link
                    href="/onboarding"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '5px 12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-strong)',
                      textDecoration: 'none',
                    }}
                  >
                    <User size={13} color="var(--brand)" />
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
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '5px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--brand)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'background-color var(--duration-fast) var(--easing-decelerate)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand)')}
                >
                  Sign in
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
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
            .brand-subtext, .brand-divider { display: none !important; }
          }
          @media (max-width: 360px) {
            .brand-title { font-size: 13px !important; }
          }
        `}</style>
      </header>

      {/* Mobile Slide-in Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: '48px 0 0 0',
            backgroundColor: theme === 'dark' ? 'rgba(20, 20, 20, 0.97)' : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 16px 28px 16px',
            overflowY: 'auto',
            animation: 'slideInRight 0.2s cubic-bezier(0, 0, 0, 1)',
          }}
        >
          {/* Top navigation links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--brand)' : 'var(--text-strong)',
                    backgroundColor: isActive
                      ? theme === 'dark'
                        ? 'rgba(40, 153, 245, 0.12)'
                        : 'rgba(0, 103, 184, 0.06)'
                      : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    transition: 'all var(--duration-fast) var(--easing-decelerate)',
                    borderLeft: isActive ? '2px solid var(--brand)' : '2px solid transparent',
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
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
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
                    padding: '10px',
                    backgroundColor: 'var(--brand)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  <Shield size={15} /> Admin
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
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Sign out
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
                    padding: '10px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'var(--text-strong)',
                    textDecoration: 'none',
                  }}
                >
                  <User size={15} /> My profile
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
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Sign out
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
                  padding: '10px',
                  backgroundColor: 'var(--brand)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                <span>Sign in</span>
                <ArrowRight size={15} />
              </Link>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '8px 4px 0 4px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <span>SRM University-AP &middot; Chapter &apos;26</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
