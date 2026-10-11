'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, ExternalLink, ArrowRight } from 'lucide-react';
import { EventItem } from '@/lib/data/mock-fallback';

export default function EventsClient({ events }: { events: EventItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Hackathons', 'Workshops', 'Webinars', 'Speaker Sessions'];

  // Spotlight the closest upcoming event or first event
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const featuredEvent = upcomingEvents[0] || events[0];

  const filteredEvents =
    activeCategory === 'All'
      ? events
      : events.filter((e) => e.type.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '60px 0 100px 0' }}>
      <div className="container">
        {/* Header with Microsoft 4-Color Eyebrow */}
        <div style={{ marginBottom: '40px', maxWidth: '840px' }}>
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
            <span>MICROSOFT STUDENT COMMUNITY &bull; EVENTS</span>
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
            Events &amp; workshops
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Explore upcoming hackathons, technical workshops, cloud deep dives, and developer conferences hosted by Microsoft Student Community at SRM University-AP.
          </p>
        </div>

        {/* FEATURED EVENT SHOWCASE (Microsoft Fluent 2 Hero Card) */}
        {featuredEvent && (() => {
          const startDate = new Date(featuredEvent.date_start);
          const isValidDate = !isNaN(startDate.getTime());
          const formattedDate = isValidDate
            ? startDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Date to be announced';
          const monthShort = isValidDate ? startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'UPCOMING';
          const dayNum = isValidDate ? startDate.toLocaleDateString('en-US', { day: '2-digit' }) : '01';
          const isPaid = featuredEvent.form_requirements?.event_pricing === 'paid';
          const priceLabel = isPaid ? `₹${featuredEvent.form_requirements?.registration_fee || 0}` : 'Free entry';
          const isCompleted =
            featuredEvent.status === 'completed' ||
            Boolean(
              featuredEvent.date_end &&
                !isNaN(new Date(featuredEvent.date_end).getTime()) &&
                new Date(featuredEvent.date_end).getTime() < Date.now()
            );
          const isRegOpen = !isCompleted && featuredEvent.registration_open;

          return (
            <div
              style={{
                borderRadius: '4px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-rest)',
                background: 'var(--surface)',
                overflow: 'hidden',
                marginBottom: '48px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              }}
            >
              {/* Event Image Column */}
              <div
                style={{
                  position: 'relative',
                  minHeight: '280px',
                  background: 'var(--bg-soft)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={featuredEvent.image_url}
                  alt={featuredEvent.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />

                {/* Floating Date Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{monthShort}</span>
                  <span>{dayNum}</span>
                </div>

                {/* Floating Price Tag */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    background: 'var(--brand)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {priceLabel}
                </div>
              </div>

              {/* Event Information Column */}
              <div
                style={{
                  padding: 'clamp(24px, 4vw, 36px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: isCompleted
                        ? 'var(--bg-soft)'
                        : isRegOpen
                        ? 'var(--success-bg)'
                        : 'rgba(245, 158, 11, 0.1)',
                      color: isCompleted
                        ? 'var(--text-muted)'
                        : isRegOpen
                        ? 'var(--success)'
                        : '#d97706',
                      border: `1px solid ${
                        isCompleted
                          ? 'var(--border)'
                          : isRegOpen
                          ? 'rgba(14, 124, 65, 0.2)'
                          : 'rgba(245, 158, 11, 0.3)'
                      }`,
                      padding: '2px 8px',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {isCompleted ? 'Completed' : isRegOpen ? 'Registration open' : 'Registration closed'}
                  </span>
                  {featuredEvent.type && (
                    <span
                      style={{
                        background: 'var(--brand-soft)',
                        color: 'var(--brand)',
                        border: '1px solid rgba(0, 103, 184, 0.2)',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {featuredEvent.type}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>&bull; Featured</span>
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(22px, 3.5vw, 28px)',
                    fontWeight: 600,
                    color: 'var(--text-strong)',
                    marginBottom: '10px',
                    lineHeight: 1.25,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {featuredEvent.title}
                </h2>

                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: '20px',
                  }}
                >
                  {featuredEvent.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text-body)',
                    marginBottom: '24px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} color="var(--brand)" />
                    <span>{formattedDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} color="var(--brand)" />
                    <span>{featuredEvent.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={14} color="var(--brand)" />
                    <span>{featuredEvent.max_capacity} Seats capacity</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link
                    href={`/events/${featuredEvent.slug}`}
                    className="fluent-btn fluent-btn-primary"
                    style={{
                      padding: '8px 20px',
                      fontSize: '13.5px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    View event details <ArrowRight size={14} />
                  </Link>
                  {featuredEvent.slug === 'synora-26' && (
                    <Link
                      href="/custom-events/synora"
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
                      View microsite <ExternalLink size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* MICROSOFT PIVOT CATEGORY TABS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            overflowX: 'auto',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count =
              cat === 'All'
                ? events.length
                : events.filter((e) => e.type.toLowerCase().includes(cat.toLowerCase())).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                  padding: '8px 14px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  whiteSpace: 'nowrap',
                  marginBottom: '-1px',
                }}
              >
                <span>{cat}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--brand-soft)' : 'var(--bg-soft)',
                    color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* EVENT CARDS GRID */}
        {filteredEvents.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
            }}
          >
            <p style={{ fontSize: '15px', color: 'var(--text-strong)', fontWeight: 600, marginBottom: '4px' }}>
              No events found under &ldquo;{activeCategory}&rdquo;
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select &ldquo;All&rdquo; to browse all scheduled community sessions.
            </p>
            <button
              onClick={() => setActiveCategory('All')}
              className="fluent-btn fluent-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '4px' }}
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '20px',
            }}
          >
            {filteredEvents.map((evt) => {
              const isCompleted =
                evt.status === 'completed' ||
                Boolean(
                  evt.date_end &&
                    !isNaN(new Date(evt.date_end).getTime()) &&
                    new Date(evt.date_end).getTime() < Date.now()
                );
              const isRegOpen = !isCompleted && evt.registration_open;
              const isPaid = evt.form_requirements?.event_pricing === 'paid';
              const priceLabel = isPaid ? `₹${evt.form_requirements?.registration_fee || 0}` : 'Free entry';
              const evtDate = new Date(evt.date_start);
              const isDateValid = !isNaN(evtDate.getTime());
              const formattedDate = isDateValid
                ? evtDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Date to be announced';

              return (
                <div
                  key={evt.id}
                  className="fluent-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-rest)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ height: '180px', position: 'relative', overflow: 'hidden', background: 'var(--bg-soft)' }}>
                    <img
                      src={evt.image_url || '/hero_bg.png'}
                      alt={evt.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Top Badges */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                      <span
                        style={{
                          background: isCompleted
                            ? 'rgba(50, 49, 48, 0.88)'
                            : isRegOpen
                            ? 'rgba(14, 124, 65, 0.90)'
                            : 'rgba(217, 119, 6, 0.90)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {isCompleted ? 'Completed' : isRegOpen ? 'Open' : 'Closed'}
                      </span>
                      <span
                        style={{
                          background: 'rgba(0, 0, 0, 0.72)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {evt.type}
                      </span>
                    </div>

                    {/* Price pill */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: '#ffffff',
                        color: 'var(--text-strong)',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                      }}
                    >
                      {priceLabel}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 600,
                        color: 'var(--text-strong)',
                        marginBottom: '6px',
                        lineHeight: 1.3,
                      }}
                    >
                      {evt.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.55,
                        flex: 1,
                        marginBottom: '16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {evt.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-body)',
                        marginBottom: '16px',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="var(--brand)" />
                        <span>{formattedDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--brand)" />
                        <span>{evt.location}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <Link
                        href={`/events/${evt.slug}`}
                        className="fluent-btn fluent-btn-primary"
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          fontSize: '13px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        View details <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
