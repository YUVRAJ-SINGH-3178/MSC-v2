'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  Key,
  Settings,
  BarChart3,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Menu,
  X,
  Radio,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface AdminShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export const ADMIN_GROUPS: NavGroup[] = [
  {
    groupName: 'Operations',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Events', href: '/admin/events', icon: Calendar },
      { name: 'Registrations', href: '/admin/registrations', icon: FileSpreadsheet },
      { name: 'QR Turnstile Scanner', href: '/admin/scanner', icon: QrCode },
      { name: 'Live Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    groupName: 'Access & Identity',
    items: [
      { name: 'Users Directory', href: '/admin/users', icon: Users },
      { name: 'Member Roles', href: '/admin/roles', icon: Shield },
      { name: 'Password Requests', href: '/admin/passwords', icon: Key },
    ],
  },
  {
    groupName: 'Preferences',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminShell({ children, userEmail, userRole }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem('msc_theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
      if (current) setTheme(current);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('msc_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const isLinkActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Current page title for breadcrumb
  const allItems = ADMIN_GROUPS.flatMap((g) => g.items);
  const currentItem = allItems.find((item) => isLinkActive(item.href)) || { name: 'Dashboard', href: '/admin' };

  // Initials for avatar
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'AD';

  return (
    <div
      style={{
        background: 'var(--bg-soft)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* 1. MICROSOFT FLUENT TOP HEADER - Docked flush at top: 0 with zero gap */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: '50px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left Section: Brand & Sidebar Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Hamburger / Collapse Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 900) {
                setMobileDrawerOpen(!mobileDrawerOpen);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            aria-label="Toggle navigation menu"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-strong)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <Menu size={18} />
          </button>

          {/* Microsoft 4-Color Tiles / Brand Emblem */}
          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 7px)',
                gridTemplateRows: 'repeat(2, 7px)',
                gap: '2px',
                flexShrink: 0,
              }}
              title="Microsoft Student Community"
            >
              <div style={{ background: '#f25022', borderRadius: '1px' }} />
              <div style={{ background: '#7fba00', borderRadius: '1px' }} />
              <div style={{ background: '#00a4ef', borderRadius: '1px' }} />
              <div style={{ background: '#ffb900', borderRadius: '1px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-strong)' }}>
                MSC
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>|</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-body)' }}>
                Admin Center
              </span>
              <span
                className="desktop-only-badge"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginLeft: '4px',
                  background: 'var(--bg-soft)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                }}
              >
                SRM AP
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Microsoft Fluent Search Bar */}
        <div
          className="admin-header-search"
          style={{
            flex: 1,
            maxWidth: '440px',
            margin: '0 24px',
            position: 'relative',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search events, registrations, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '32px',
              padding: '0 12px 0 34px',
              fontSize: '12.5px',
              background: 'var(--bg-soft)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-strong)',
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
            }}
          />
        </div>

        {/* Right Section: Controls, Theme, Public Link, User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Status Badge */}
          <div
            className="desktop-only-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Radio size={11} color="var(--success)" />
            <span>Live</span>
          </div>

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
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
              e.currentTarget.style.color = 'var(--text-strong)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Public Portal Link */}
          <Link
            href="/"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-body)',
              textDecoration: 'none',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }}
            title="Open Public Website"
          >
            <span className="desktop-only-text">Public Portal</span>
            <ExternalLink size={13} color="var(--brand)" />
          </Link>

          {/* User Account Avatar / Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '3px 8px 3px 4px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: 'var(--bg-soft)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title={userEmail || 'Admin Profile'}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
              <span
                className="desktop-only-text"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-strong)',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userRole === 'admin' ? 'Admin' : 'Member'}
              </span>
            </button>

            {/* User Dropdown Menu */}
            {userDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '38px',
                  right: 0,
                  width: '240px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lift)',
                  padding: '12px',
                  zIndex: 200,
                }}
              >
                <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Signed in as
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail || 'Organizer'}
                  </div>
                  <span
                    className="fluent-badge badge-primary"
                    style={{ marginTop: '4px', display: 'inline-block' }}
                  >
                    Role: {userRole || 'admin'}
                  </span>
                </div>

                <Link
                  href="/admin/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    fontSize: '13px',
                    color: 'var(--text-body)',
                    textDecoration: 'none',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Settings size={15} color="var(--brand)" />
                  <span>Profile Settings</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    fontSize: '13px',
                    color: 'var(--danger)',
                    background: 'none',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY WORKSPACE - Left Nav + Main Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 50px)' }}>
        {/* DESKTOP SIDEBAR - Authentic Microsoft 365 Navigation Rail */}
        <aside
          className="admin-desktop-nav"
          style={{
            width: sidebarCollapsed ? '58px' : '230px',
            flexShrink: 0,
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'sticky',
            top: '50px',
            height: 'calc(100vh - 50px)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Navigation Links Grouped */}
          <div style={{ padding: '12px 6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ADMIN_GROUPS.map((group) => (
              <div key={group.groupName}>
                {!sidebarCollapsed && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      padding: '4px 12px 6px 12px',
                    }}
                  >
                    {group.groupName}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={sidebarCollapsed ? item.name : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: sidebarCollapsed ? '10px 0' : '9px 12px',
                          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: active ? 600 : 400,
                          color: active ? 'var(--brand)' : 'var(--text-body)',
                          backgroundColor: active ? 'var(--brand-soft)' : 'transparent',
                          position: 'relative',
                          transition: 'background-color 0.15s ease, color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor =
                              theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {/* Microsoft Fluent Left Active Accent Bar */}
                        {active && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '4px',
                              bottom: '4px',
                              width: '3px',
                              background: 'var(--brand)',
                              borderRadius: '0 2px 2px 0',
                            }}
                          />
                        )}
                        <Icon
                          size={17}
                          color={active ? 'var(--brand)' : 'var(--text-muted)'}
                          style={{ flexShrink: 0 }}
                        />
                        {!sidebarCollapsed && (
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer: Collapse Toggle on Desktop */}
          <div
            style={{
              padding: '12px 6px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '6px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <>
                  <PanelLeftClose size={16} />
                  <span style={{ fontSize: '11.5px' }}>Collapse menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER (Off-canvas sidebar on screens < 900px) */}
        {mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 998,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                width: '80%',
                maxWidth: '300px',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 999,
                boxShadow: 'var(--shadow-lift)',
                padding: '16px',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 6px)',
                      gridTemplateRows: 'repeat(2, 6px)',
                      gap: '2px',
                    }}
                  >
                    <div style={{ background: '#f25022', borderRadius: '1px' }} />
                    <div style={{ background: '#7fba00', borderRadius: '1px' }} />
                    <div style={{ background: '#00a4ef', borderRadius: '1px' }} />
                    <div style={{ background: '#ffb900', borderRadius: '1px' }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-strong)', display: 'block' }}>
                      MSC Admin Center
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Chapter &apos;26 &bull; SRM AP
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                  }}
                  aria-label="Close navigation drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {ADMIN_GROUPS.map((group) => (
                  <div key={group.groupName}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        padding: '2px 8px 6px 8px',
                      }}
                    >
                      {group.groupName}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isLinkActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileDrawerOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '13.5px',
                              fontWeight: active ? 600 : 400,
                              color: active ? 'var(--brand)' : 'var(--text-body)',
                              backgroundColor: active ? 'var(--brand-soft)' : 'transparent',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Icon size={17} color={active ? 'var(--brand)' : 'var(--text-muted)'} />
                              <span>{item.name}</span>
                            </div>
                            {active ? (
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: 'var(--brand)',
                                }}
                              />
                            ) : (
                              <ChevronRight size={14} color="var(--border)" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer Actions */}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <Link
                  href="/"
                  target="_blank"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--text-body)',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    background: 'var(--bg-soft)',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Public Portal</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--danger)',
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN ADMIN WORKSPACE */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 'clamp(16px, 3vw, 28px)',
          }}
        >
          {/* Microsoft Fluent Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
            }}
          >
            <Link
              href="/admin"
              style={{
                color: 'var(--brand)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Admin Center
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-strong)', fontWeight: 600 }}>
              {currentItem.name}
            </span>
          </div>

          {/* Children Page Content */}
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      {/* Responsive media styling */}
      <style>{`
        @media (max-width: 899px) {
          .admin-desktop-nav {
            display: none !important;
          }
          .admin-header-search {
            display: none !important;
          }
          .desktop-only-badge {
            display: none !important;
          }
          .desktop-only-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
