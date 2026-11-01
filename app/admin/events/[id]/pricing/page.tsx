'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Tag, Ticket, Trash2 } from 'lucide-react';

type Category = {
  id: string; name: string; description: string | null; price_paise: number;
  early_bird_price_paise: number | null; early_bird_starts_at: string | null;
  early_bird_ends_at: string | null; capacity: number | null; is_active: boolean;
};
type Promo = {
  id: string; code: string; discount_type: 'percentage' | 'fixed'; discount_value: number;
  max_discount_paise: number | null; min_order_paise: number; max_redemptions: number | null;
  starts_at: string | null; ends_at: string | null; is_active: boolean;
};

const money = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

export default function TicketPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [category, setCategory] = useState({
    name: '', description: '', price: '', earlyPrice: '', earlyStart: '', earlyEnd: '', capacity: '',
  });
  const [promo, setPromo] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed', value: '', maxDiscount: '',
    minOrder: '', maxRedemptions: '', starts: '', ends: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/ticket-pricing?event_id=${eventId}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load pricing.');
      setCategories(data.categories || []);
      setPromos(data.promo_codes || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load pricing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/ticket-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'category', event_id: eventId, name: category.name, description: category.description,
          price_paise: Math.round(Number(category.price) * 100),
          early_bird_price_paise: category.earlyPrice === '' ? null : Math.round(Number(category.earlyPrice) * 100),
          early_bird_starts_at: category.earlyStart ? new Date(category.earlyStart).toISOString() : null,
          early_bird_ends_at: category.earlyEnd ? new Date(category.earlyEnd).toISOString() : null,
          capacity: category.capacity === '' ? null : Number(category.capacity),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save category.');
      setCategory({ name: '', description: '', price: '', earlyPrice: '', earlyStart: '', earlyEnd: '', capacity: '' });
      await load();
    } catch (err: any) { setError(err.message || 'Unable to save category.'); }
    finally { setSaving(false); }
  };

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/ticket-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'promo', event_id: eventId, code: promo.code, discount_type: promo.type,
          discount_value: promo.type === 'fixed' ? Math.round(Number(promo.value) * 100) : Number(promo.value),
          max_discount_paise: promo.maxDiscount === '' ? null : Math.round(Number(promo.maxDiscount) * 100),
          min_order_paise: promo.minOrder === '' ? 0 : Math.round(Number(promo.minOrder) * 100),
          max_redemptions: promo.maxRedemptions === '' ? null : Number(promo.maxRedemptions),
          starts_at: promo.starts ? new Date(promo.starts).toISOString() : null,
          ends_at: promo.ends ? new Date(promo.ends).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save promo code.');
      setPromo({ code: '', type: 'percentage', value: '', maxDiscount: '', minOrder: '', maxRedemptions: '', starts: '', ends: '' });
      await load();
    } catch (err: any) { setError(err.message || 'Unable to save promo code.'); }
    finally { setSaving(false); }
  };

  const deactivate = async (kind: 'category' | 'promo', id: string) => {
    if (!window.confirm('Deactivate this item? Existing paid tickets remain valid.')) return;
    try {
      const response = await fetch(`/api/admin/ticket-pricing?id=${id}&kind=${kind}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to deactivate item.');
      await load();
    } catch (err: any) { setError(err.message || 'Unable to deactivate item.'); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', color: 'var(--text-strong)' }}>
      <Link href={`/admin/events/${eventId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--brand)', textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to event attendees
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Ticket Pricing</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Manage ticket categories, early-bird prices and promotional codes. Prices are entered in INR.</p>
      {error && <div role="alert" style={{ padding: 12, marginBottom: 18, border: '1px solid #d13438', borderRadius: 6, color: '#d13438' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, background: 'var(--surface)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 650, marginBottom: 16 }}><Ticket size={18} /> Add ticket category</h2>
          <form onSubmit={submitCategory} style={{ display: 'grid', gap: 12 }}>
            <input required placeholder="Category name, e.g. Early Bird" value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} className="fluent-input" />
            <input placeholder="Description (optional)" value={category.description} onChange={e => setCategory({ ...category, description: e.target.value })} className="fluent-input" />
            <label style={{ fontSize: 12 }}>Regular price (₹)<input required type="number" min="0.01" step="0.01" value={category.price} onChange={e => setCategory({ ...category, price: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Early-bird price (₹)<input type="number" min="0.01" step="0.01" value={category.earlyPrice} onChange={e => setCategory({ ...category, earlyPrice: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Early-bird starts<input type="datetime-local" value={category.earlyStart} onChange={e => setCategory({ ...category, earlyStart: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Early-bird ends<input type="datetime-local" value={category.earlyEnd} onChange={e => setCategory({ ...category, earlyEnd: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Capacity (optional)<input type="number" min="1" step="1" value={category.capacity} onChange={e => setCategory({ ...category, capacity: e.target.value })} className="fluent-input" /></label>
            <button disabled={saving} className="fluent-btn fluent-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={16} /> Add category</button>
          </form>
        </section>

        <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, background: 'var(--surface)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 650, marginBottom: 16 }}><Tag size={18} /> Add promo code</h2>
          <form onSubmit={submitPromo} style={{ display: 'grid', gap: 12 }}>
            <input required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" placeholder="PROMO2026" value={promo.code} onChange={e => setPromo({ ...promo, code: e.target.value.toUpperCase() })} className="fluent-input" />
            <select value={promo.type} onChange={e => setPromo({ ...promo, type: e.target.value as 'percentage' | 'fixed' })} className="fluent-input">
              <option value="percentage">Percentage discount</option><option value="fixed">Fixed amount discount</option>
            </select>
            <label style={{ fontSize: 12 }}>Discount {promo.type === 'fixed' ? '(₹)' : '(%)'}<input required type="number" min="1" step={promo.type === 'fixed' ? '0.01' : '1'} max={promo.type === 'percentage' ? '100' : undefined} value={promo.value} onChange={e => setPromo({ ...promo, value: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Maximum discount (₹, optional)<input type="number" min="0.01" step="0.01" value={promo.maxDiscount} onChange={e => setPromo({ ...promo, maxDiscount: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Minimum order (₹)<input type="number" min="0" step="0.01" value={promo.minOrder} onChange={e => setPromo({ ...promo, minOrder: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Maximum redemptions<input type="number" min="1" step="1" value={promo.maxRedemptions} onChange={e => setPromo({ ...promo, maxRedemptions: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Starts<input type="datetime-local" value={promo.starts} onChange={e => setPromo({ ...promo, starts: e.target.value })} className="fluent-input" /></label>
            <label style={{ fontSize: 12 }}>Ends<input type="datetime-local" value={promo.ends} onChange={e => setPromo({ ...promo, ends: e.target.value })} className="fluent-input" /></label>
            <button disabled={saving} className="fluent-btn fluent-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={16} /> Add promo code</button>
          </form>
        </section>
      </div>

      <section style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 8, padding: 20, background: 'var(--surface)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 650, marginBottom: 14 }}>Existing categories</h2>
        {loading ? <p>Loading…</p> : categories.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No ticket categories configured. Legacy event pricing remains active.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {categories.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div><strong>{item.name}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{money(item.price_paise)} regular{item.early_bird_price_paise != null ? ` · ${money(item.early_bird_price_paise)} early bird` : ''}{item.capacity ? ` · capacity ${item.capacity}` : ''}{!item.is_active ? ' · inactive' : ''}</div></div>
              {item.is_active && <button onClick={() => deactivate('category', item.id)} className="fluent-btn fluent-btn-secondary" aria-label={`Deactivate ${item.name}`}><Trash2 size={15} /></button>}
            </div>)}
          </div>
        )}
      </section>

      <section style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 8, padding: 20, background: 'var(--surface)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 650, marginBottom: 14 }}>Existing promo codes</h2>
        {loading ? <p>Loading…</p> : promos.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No promo codes configured.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {promos.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div><strong>{item.code}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.discount_type === 'percentage' ? `${item.discount_value}% off` : `${money(item.discount_value)} off`}{item.max_redemptions ? ` · max ${item.max_redemptions} uses` : ''}{!item.is_active ? ' · inactive' : ''}</div></div>
              {item.is_active && <button onClick={() => deactivate('promo', item.id)} className="fluent-btn fluent-btn-secondary" aria-label={`Deactivate ${item.code}`}><Trash2 size={15} /></button>}
            </div>)}
          </div>
        )}
      </section>
    </div>
  );
}
