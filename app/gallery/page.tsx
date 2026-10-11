'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FALLBACK_GALLERY } from '@/lib/data/mock-fallback';
import { createClient } from '@/lib/supabase/client';
import { Search, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

export default function GalleryPage() {
  const [items, setItems] = useState(FALLBACK_GALLERY);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('gallery_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setItems(data as any);
        }
      } catch {
        // Offline fallback
      }
    };
    fetchGallery();
  }, []);

  const categories = [
    { id: 'all', label: 'All photos' },
    { id: 'hackathons', label: 'Hackathons' },
    { id: 'workshops', label: 'Workshops' },
    { id: 'festivals', label: 'Festivals' },
    { id: 'community', label: 'Community' },
    { id: 'awards', label: 'Awards' },
  ];

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category.toLowerCase() === activeCategory.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      item.title.toLowerCase().includes(query) ||
      item.alt_text.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handlePrev = useCallback(() => {
    if (selectedIdx === null || filteredItems.length === 0) return;
    setSelectedIdx((prev) => (prev! - 1 + filteredItems.length) % filteredItems.length);
  }, [selectedIdx, filteredItems.length]);

  const handleNext = useCallback(() => {
    if (selectedIdx === null || filteredItems.length === 0) return;
    setSelectedIdx((prev) => (prev! + 1) % filteredItems.length);
  }, [selectedIdx, filteredItems.length]);

  const handleClose = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  // Keyboard navigation listener (Left, Right, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIdx === null) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdx, handlePrev, handleNext, handleClose]);

  const currentPhoto = selectedIdx !== null && filteredItems[selectedIdx] ? filteredItems[selectedIdx] : null;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '60px 0 100px 0' }}>
      <div className="container">
        {/* Header with Microsoft 4-Color Eyebrow */}
        <div style={{ marginBottom: '36px', maxWidth: '840px' }}>
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
            <span>MICROSOFT STUDENT COMMUNITY &bull; GALLERY</span>
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
            Event gallery
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Moments and highlights from hackathons, cloud workshops, speaker sessions, and campus events at SRM University-AP.
          </p>
        </div>

        {/* Search & Pivot Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px',
          }}
        >
          {/* Fluent Search Box */}
          <div style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
            <Search
              size={15}
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIdx(null);
              }}
              placeholder="Search by title or category..."
              className="fluent-input"
              style={{
                paddingLeft: '34px',
                paddingRight: searchQuery ? '34px' : '12px',
                fontSize: '13px',
                borderRadius: '4px',
                height: '36px',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Microsoft Pivot Tabs for Categories */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              overflowX: 'auto',
            }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? items.length
                  : items.filter((item) => item.category.toLowerCase() === cat.id.toLowerCase()).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedIdx(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                    padding: '8px 12px',
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
                  <span>{cat.label}</span>
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
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap', padding: '0 8px' }}>
              Showing {filteredItems.length} {filteredItems.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>

        {/* Photo Grid (Max 3 columns on standard desktop) */}
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '4px' }}>
              No photos found
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Try adjusting your query or resetting filters.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="fluent-btn fluent-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '4px' }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
              gap: '20px',
            }}
          >
            {filteredItems.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setSelectedIdx(idx)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIdx(idx);
                  }
                }}
                className="fluent-card gallery-card"
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-rest)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Image Container */}
                <div style={{ height: '220px', position: 'relative', overflow: 'hidden', background: 'var(--bg-soft)' }}>
                  <img
                    src={photo.image_url}
                    alt={photo.alt_text}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s ease',
                    }}
                    className="gallery-card-img"
                  />

                  {/* Top Category Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(0, 0, 0, 0.72)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '2px',
                      letterSpacing: '0.02em',
                      zIndex: 2,
                    }}
                  >
                    {photo.category}
                  </span>

                  {/* Hover icon (visible on hover) */}
                  <div
                    className="gallery-zoom-badge"
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(0, 103, 184, 0.9)',
                      color: '#ffffff',
                      padding: '5px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <Maximize2 size={13} />
                  </div>
                </div>

                {/* Card Information Footer */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-strong)',
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {photo.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {photo.alt_text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Microsoft Fluent Lightbox Dialog */}
        {currentPhoto && selectedIdx !== null && (
          <div
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 12, 16, 0.85)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Previous Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Previous photo"
                style={{
                  position: 'fixed',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1010,
                }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Next Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Next photo"
                style={{
                  position: 'fixed',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1010,
                }}
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Modal Card */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '920px',
                width: '100%',
                background: 'var(--surface)',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lift)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
              }}
            >
              {/* Top Command Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {currentPhoto.category}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedIdx + 1} of {filteredItems.length}
                  </span>
                </div>

                <button
                  onClick={handleClose}
                  aria-label="Close dialog"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-strong)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Image Viewport */}
              <div
                style={{
                  maxHeight: '62vh',
                  minHeight: '320px',
                  background: '#0a0a0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={currentPhoto.image_url}
                  alt={currentPhoto.alt_text}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '62vh',
                    objectFit: 'contain',
                    userSelect: 'none',
                  }}
                />
              </div>

              {/* Caption & Metadata Footer */}
              <div style={{ padding: '16px 20px', background: 'var(--surface)' }}>
                <h2
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-strong)',
                    marginBottom: '4px',
                  }}
                >
                  {currentPhoto.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>
                  {currentPhoto.alt_text}
                </p>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '10px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span>Microsoft Student Community &bull; SRM University-AP</span>
                  <span>Tip: Use Arrow keys to browse &bull; Esc to close</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .gallery-card .gallery-zoom-badge {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .gallery-card:hover .gallery-zoom-badge {
          opacity: 1;
        }
        .gallery-card:hover .gallery-card-img {
          transform: scale(1.03);
        }
      `}</style>
    </div>
  );
}
