'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FALLBACK_EVENTS } from '@/lib/data/mock-fallback';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Radio,
  UserCheck,
  Award,
  ArrowUpRight,
} from 'lucide-react';

interface EventAnalytics {
  id: string;
  title: string;
  category: string;
  date_start: string;
  max_capacity: number;
  total_registrations: number;
  total_headcount: number;
  teams_count: number;
  solo_count: number;
  checked_in_count: number;
}

export default function AdminAnalyticsPage() {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [liveStreamEvents, setLiveStreamEvents] = useState<Array<{ id: string; text: string; time: string; type: 'checkin' | 'reg' }>>([]);

  // Global aggregate metrics (Live computed)
  const [kpiMetrics, setKpiMetrics] = useState({
    totalCoreUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalHeadcount: 0,
    globalCheckinRate: 0,
  });

  // Per-event metrics (Live computed)
  const [eventBreakdown, setEventBreakdown] = useState<EventAnalytics[]>([]);

  const fetchRealData = async () => {
    try {
      const supabase = createClient();
      const [eventsRes, regsRes, usersRes] = await Promise.all([
        supabase.from('events').select('*').order('date_start', { ascending: false }),
        supabase.from('registrations').select('*'),
        supabase.from('member_profiles').select('id, role'),
      ]);

      const eventsData = eventsRes.data || [];
      const regsData = regsRes.data || [];
      const usersData = usersRes.data || [];

      const totalRegistrations = regsData.length;
      const checkedInCount = regsData.filter((r) => r.checked_in).length;
      const checkinRate = totalRegistrations > 0 ? Number(((checkedInCount / totalRegistrations) * 100).toFixed(1)) : 0;

      setKpiMetrics({
        // Label reads "Core Community Users", i.e. every provisioned account.
        // There is no staff tier any more: `core_member` was removed along with
        // the third role, so a "core users" count would just be the single admin.
        totalCoreUsers: usersData.length,
        totalEvents: eventsData.length,
        totalRegistrations,
        totalHeadcount: totalRegistrations,
        globalCheckinRate: checkinRate,
      });

      const breakdown: EventAnalytics[] = eventsData.map((ev: any) => {
        const evRegs = regsData.filter((r: any) => r.event_id === ev.id);
        const evCheckedIn = evRegs.filter((r: any) => r.checked_in).length;
        const teams = evRegs.filter((r: any) => r.team_data && r.team_data.team_name).length;
        const solo = evRegs.length - teams;

        return {
          id: ev.id,
          title: ev.title,
          category: ev.type || 'Workshop',
          date_start: ev.date_start,
          max_capacity: ev.max_capacity || 100,
          total_registrations: evRegs.length,
          total_headcount: evRegs.length,
          teams_count: teams,
          solo_count: solo,
          checked_in_count: evCheckedIn,
        };
      });

      setEventBreakdown(breakdown);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching analytics from Supabase:', err);
    }
  };

  useEffect(() => {
    fetchRealData();

    // Connect to Supabase Realtime channel if available
    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('analytics_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'registrations' },
          (payload: any) => {
            fetchRealData();
            const newText =
              payload.eventType === 'INSERT'
                ? `New registration: ${(payload.new as any)?.lead_email || 'Participant'}`
                : `Check-in updated: ${(payload.new as any)?.lead_email || 'Participant'}`;

            setLiveStreamEvents((prev) => [
              { id: String(Date.now()), text: newText, time: 'Just now', type: 'reg' },
              ...prev.slice(0, 7),
            ]);
          }
        )
        .subscribe();
    } catch {
      // Fallback
    }

    const interval = setInterval(() => {
      fetchRealData();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Realtime Connection Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
            Real-Time Analytics Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Live admission turnstile telemetry and participant conversion for Chapter &apos;26.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          >
            <Radio size={14} color="var(--success)" className="pulse-indicator" />
            <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>Realtime Stream Active</span>
            <span style={{ color: 'var(--text-muted)' }}>&bull; {lastUpdated}</span>
          </div>

          <button
            onClick={() => setLastUpdated(new Date().toLocaleTimeString())}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Global KPI Cards (5 Metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: '16px',
        }}
      >
        <div className="fluent-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Core Community Users
            </span>
            <Users size={16} color="var(--brand)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-strong)' }}>
            {kpiMetrics.totalCoreUsers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Verified Chapter &apos;26 Engineers
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Hosted Events
            </span>
            <Calendar size={16} color="var(--brand)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-strong)' }}>
            {kpiMetrics.totalEvents}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Flagships, Bootcamps, Summits
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Registrations
            </span>
            <TrendingUp size={16} color="var(--brand)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-strong)' }}>
            {kpiMetrics.totalRegistrations}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Lead registration records
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Headcount
            </span>
            <UserCheck size={16} color="var(--brand)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--brand)' }}>
            {kpiMetrics.totalHeadcount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Leads + Team members combined
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Global Check-in Rate
            </span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>
            {kpiMetrics.globalCheckinRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Physical turnstile attendance
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
        {/* Per-Event Breakdown Table */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-rest)',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
              Per-Event Turnstile Breakdown
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Teams vs Individuals Conversion
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Event Name</th>
                  <th style={{ padding: '12px 16px' }}>Teams / Solo</th>
                  <th style={{ padding: '12px 16px' }}>Total Attendees</th>
                  <th style={{ padding: '12px 16px' }}>Turnstile Checked In</th>
                  <th style={{ padding: '12px 16px' }}>Conversion Rate</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventBreakdown.map((item) => {
                  const rate = Math.round((item.checked_in_count / item.total_headcount) * 100);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {item.category} &bull; {new Date(item.date_start).toLocaleDateString()}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <strong style={{ color: 'var(--brand)' }}>{item.teams_count}</strong> teams
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {item.solo_count} solo participants
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{item.total_headcount}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Cap: {item.max_capacity}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {item.checked_in_count}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--bg-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${rate}%`,
                                height: '100%',
                                background: rate > 75 ? 'var(--success)' : 'var(--brand)',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, width: '36px' }}>{rate}%</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Link
                          href={`/admin/events/${item.id}`}
                          className="fluent-btn fluent-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Turnstile Stream Log */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            boxShadow: 'var(--shadow-rest)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Radio size={16} color="var(--brand)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
              Live Telemetry Stream
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {liveStreamEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-soft)',
                  borderLeft: evt.type === 'checkin' ? '3px solid var(--success)' : '3px solid var(--brand)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                }}
              >
                <div style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{evt.text}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{evt.time}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Listening to Supabase Realtime channel <code>analytics_realtime</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
