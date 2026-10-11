'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Download,
  Upload,
  UserPlus,
  CheckCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  CreditCard,
  Users,
} from 'lucide-react';
// Papa is dynamically imported on demand for optimal bundle size
import { QRCodeSVG } from 'qrcode.react';

interface RegistrationRecord {
  id: string;
  ticket_id?: string;
  role?: string;
  lead_name: string;
  lead_email: string;
  reg_number: string;
  phone: string;
  branch?: string;
  college: string;
  event_title: string;
  status: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled';
  checked_in: boolean;
  team_name?: string;
  team_id?: string;
  team_size?: number;
  created_at: string;
}

export default function AdminRegistrationsPage() {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<RegistrationRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: RegistrationRecord[] = data.map((r: any) => ({
          id: r.id,
          ticket_id: r.form_data?.ticket_id || r.hash_payload || r.id,
          role: r.form_data?.role || r.team_data?.role || (r.team_data?.team_name ? 'Member' : 'Solo'),
          lead_name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
          lead_email: r.lead_email,
          reg_number: r.form_data?.registration_number || r.form_data?.reg_num || 'N/A',
          phone: r.form_data?.phone || 'N/A',
          branch: r.form_data?.branch || 'N/A',
          college: r.form_data?.college || 'SRM University AP',
          event_title: r.events?.title || 'SYNORA',
          status: r.status,
          checked_in: r.checked_in,
          team_name: r.team_data?.team_name || '',
          team_id: r.team_data?.team_id,
          team_size: r.team_data?.team_size,
          created_at: r.created_at,
        }));
        setRegistrations(mapped);
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleToggleCheckin = async (id: string, currentVal: boolean) => {
    setRegistrations(registrations.map((item) => (item.id === id ? { ...item, checked_in: !currentVal } : item)));
    await supabase.from('registrations').update({ checked_in: !currentVal }).eq('id', id);
  };

  // Form states for at-the-door manual registration
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualRegNum, setManualRegNum] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCollege, setManualCollege] = useState('SRM University AP');

  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.lead_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reg_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.branch && r.branch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.ticket_id && r.ticket_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.team_name && r.team_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleManualRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: firstEvent } = await supabase.from('events').select('id, title').limit(1).single();
    if (!firstEvent) {
      alert('Please create an event first.');
      return;
    }

    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: firstEvent.id,
          lead_email: manualEmail,
          status: 'confirmed',
          checked_in: true,
          full_name: manualName,
          registration_number: manualRegNum,
          phone: manualPhone,
          college: manualCollege,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchRegistrations();
        setIsManualModalOpen(false);
        setManualName('');
        setManualEmail('');
        setManualRegNum('');
        setManualPhone('');
      } else {
        alert('Failed to register: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Network error while registering: ' + err.message);
    }
  };

  // Robust ISO Date Parser that gracefully handles DD/MM/YYYY, DD-MM-YYYY, timestamps, etc.
  const safeParseISO = (raw?: string): string => {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return new Date().toISOString();
    const trimmed = raw.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();

    // Try parsing DD/MM/YYYY or DD-MM-YYYY
    const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const time = m[4].trim();
      let hours = 0, mins = 0, secs = 0;
      if (time) {
        const tm = time.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (tm) {
          hours = parseInt(tm[1], 10);
          mins = parseInt(tm[2], 10);
          if (tm[3]) secs = parseInt(tm[3], 10);
        }
      }
      const c = new Date(Date.UTC(year, month, day, hours, mins, secs));
      if (!isNaN(c.getTime())) return c.toISOString();
    }
    return new Date().toISOString();
  };

  // CSV Import supporting 11-column format & smart team differentiation
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: firstEvent } = await supabase.from('events').select('id, title').limit(1).single();
    if (!firstEvent) {
      alert('Please create an event first before importing registrations.');
      return;
    }

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];

        const getField = (row: any, ...keys: string[]): string => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return String(row[k]).trim();
            }
            const found = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
            if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
              return String(row[found]).trim();
            }
          }
          return '';
        };

        // Track distinct team instances
        let currentTeamKey = '';
        let currentTeamInstanceId = '';
        let currentTeamMemberCount = 0;
        let currentTeamExpectedSize = 0;
        let teamCounter = 0;

        const toInsert = rows.map((row, i) => {
          const ticketId = getField(row, 'Ticket ID', 'ticket_id', 'TicketId', 'ticket');
          const role = getField(row, 'Role', 'role', 'team_role');
          const name = getField(row, 'Name', 'name', 'full_name', 'FullName') || 'Imported Participant';
          const email = getField(row, 'Email', 'email', 'lead_email') || `imported-${Date.now()}-${i}@srmap.edu.in`;
          const regNum = getField(row, 'Reg Num', 'reg_num', 'RegNum', 'Registration Number', 'reg_number') || 'AP0000000000';
          const mobile = getField(row, 'Mobile', 'mobile', 'Phone', 'phone');
          const branch = getField(row, 'Branch', 'branch', 'Department', 'dept');
          const rawTeam = getField(row, 'Team Name', 'team_name', 'Team', 'team');
          const rawTeamSize = getField(row, 'Team Size', 'team_size', 'teamSize');
          const parsedTeamSize = parseInt(rawTeamSize, 10);
          const teamSize = !isNaN(parsedTeamSize) && parsedTeamSize > 0 ? parsedTeamSize : undefined;
          const status = (getField(row, 'Status', 'status') || 'confirmed').toLowerCase();
          const regDate = getField(row, 'Registration Date', 'registration_date', 'Registered At', 'Date');
          const parsedCreatedAt = safeParseISO(regDate);

          const isSolo = !rawTeam || ['individual', 'solo', '-', 'n/a', 'none'].includes(rawTeam.toLowerCase());

          let teamData: any = null;

          if (!isSolo) {
            const isLeader = role.toLowerCase().includes('lead') || role.toLowerCase() === 'leader';
            const teamNameChanged = rawTeam !== currentTeamKey;
            const reachedCapacity = currentTeamExpectedSize > 0 && currentTeamMemberCount >= currentTeamExpectedSize;
            const reachedDefaultMax = currentTeamMemberCount >= 5;

            // Start new team instance if:
            // - First team
            // - Team name changed
            // - Explicit leader role encountered (even if team name matches an earlier team!)
            // - Reached declared team size or default max 5
            if (
              !currentTeamInstanceId ||
              teamNameChanged ||
              isLeader ||
              reachedCapacity ||
              (reachedDefaultMax && !currentTeamExpectedSize)
            ) {
              teamCounter++;
              currentTeamKey = rawTeam;
              currentTeamInstanceId = `team_${firstEvent.id.slice(0, 8)}_${rawTeam.toLowerCase().replace(/[^a-z0-9]/g, '_')}_inst${teamCounter}`;
              currentTeamMemberCount = 0;
              currentTeamExpectedSize = teamSize || 0;
            }

            currentTeamMemberCount++;

            teamData = {
              team_name: rawTeam,
              team_id: currentTeamInstanceId,
              team_size: teamSize || currentTeamExpectedSize || undefined,
              role: role || (currentTeamMemberCount === 1 ? 'Leader' : 'Member'),
            };
          } else {
            currentTeamKey = '';
            currentTeamInstanceId = '';
            currentTeamMemberCount = 0;
            currentTeamExpectedSize = 0;
          }

          return {
            event_id: firstEvent.id,
            lead_email: email.toLowerCase().trim(),
            status: ['confirmed', 'waitlisted', 'cancelled', 'pending_payment'].includes(status) ? status : 'confirmed',
            checked_in: false,
            form_data: {
              full_name: name,
              registration_number: regNum,
              phone: mobile,
              branch: branch,
              college: getField(row, 'College', 'college') || 'SRM University AP',
              ticket_id: ticketId,
              role: role || (teamData ? teamData.role : 'Solo'),
              registration_date: parsedCreatedAt,
            },
            team_data: teamData,
            created_at: parsedCreatedAt,
          };
        });

        if (toInsert.length > 0) {
          try {
            const res = await fetch('/api/admin/registrations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch: toInsert }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
              alert('Failed to import into database: ' + (data.error || 'Server error'));
            } else {
              alert(`Successfully imported ${data.count || toInsert.length} registrations!`);
              await fetchRegistrations();
            }
          } catch (err: any) {
            alert('Failed to import into database: ' + err.message);
          }
        }
      },
    });
  };

  // Export to CSV following the 11-column format
  const handleExportCSV = async () => {
    const Papa = (await import('papaparse')).default;
    const csv = Papa.unparse(
      filteredRegistrations.map((r) => ({
        'Ticket ID': r.ticket_id || r.id,
        Role: r.role || (r.team_name ? 'Member' : 'Solo'),
        Name: r.lead_name,
        Email: r.lead_email,
        'Reg Num': r.reg_number,
        Mobile: r.phone,
        Branch: r.branch || 'N/A',
        'Team Name': r.team_name || 'Individual',
        'Team Size': r.team_size ? String(r.team_size) : (r.team_name ? 'Team' : '1'),
        Status: r.status.toUpperCase(),
        'Registration Date': r.created_at,
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MSC_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template (.csv)
  const handleDownloadTemplate = async () => {
    const Papa = (await import('papaparse')).default;
    const sampleHeaders = [
      {
        'Ticket ID': 'SYN-1001',
        Role: 'Leader',
        Name: 'Aarav Sharma',
        Email: 'aarav_sharma@srmap.edu.in',
        'Reg Num': 'AP26110010001',
        Mobile: '9876543210',
        Branch: 'CSE',
        'Team Name': 'Code Titans',
        'Team Size': '4',
        Status: 'confirmed',
        'Registration Date': new Date().toISOString().slice(0, 10),
      },
      {
        'Ticket ID': 'SYN-1002',
        Role: 'Member',
        Name: 'Diya Patel',
        Email: 'diya_patel@srmap.edu.in',
        'Reg Num': 'AP26110010002',
        Mobile: '9876543211',
        Branch: 'CSE',
        'Team Name': 'Code Titans',
        'Team Size': '4',
        Status: 'confirmed',
        'Registration Date': new Date().toISOString().slice(0, 10),
      },
    ];
    const csvString = Papa.unparse(sampleHeaders);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `msc-registrations-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Live Excel (.xlsx) export via API route /api/admin/export?format=xlsx
  const handleExportXLSX = () => {
    window.location.href = '/api/admin/export?format=xlsx';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-strong)' }}>
            Registrations, Badges &amp; Exports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage attendee ledger, at-the-door walk-ins, badge printing, and spreadsheet exports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="fluent-btn fluent-btn-primary"
            style={{ fontSize: '13px' }}
          >
            <UserPlus size={15} /> At-The-Door Walk-In
          </button>

          <label
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px', cursor: 'pointer' }}
          >
            <Upload size={14} /> Import CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          </label>

          <button
            onClick={handleDownloadTemplate}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
            title="Download standard 11-column CSV template"
          >
            <Download size={14} /> Sample CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <FileText size={14} /> Export CSV
          </button>

          <button
            onClick={handleExportXLSX}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <FileSpreadsheet size={14} color="var(--success)" /> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: 'var(--shadow-rest)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by attendee name, email, reg number, branch, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fluent-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fluent-input"
            style={{ width: '150px' }}
          >
            <option value="all">All Registrations</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-rest)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', color: 'var(--text-strong)' }}>
              <th style={{ padding: '12px 16px' }}>Attendee</th>
              <th style={{ padding: '12px 16px' }}>Reg Number &amp; Branch</th>
              <th style={{ padding: '12px 16px' }}>Event</th>
              <th style={{ padding: '12px 16px' }}>Team</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Turnstile Check-In</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: 'var(--text-strong)' }}>{r.lead_name}</strong>
                    {r.role && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: r.role.toLowerCase().includes('lead') ? 'rgba(0,103,184,0.1)' : 'var(--bg-soft)',
                          color: r.role.toLowerCase().includes('lead') ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {r.role}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.lead_email}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: 'var(--text-strong)' }}>{r.reg_number}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {r.branch && r.branch !== 'N/A' ? `${r.branch} • ` : ''}{r.college}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>{r.event_title}</td>
                <td style={{ padding: '14px 16px' }}>{r.team_name || 'Individual'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    className={`fluent-badge ${
                      r.status === 'confirmed'
                        ? 'badge-success'
                        : r.status === 'pending_payment'
                        ? 'badge-warning'
                        : 'badge-danger'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => handleToggleCheckin(r.id, r.checked_in)}
                    style={{
                      background: r.checked_in ? 'var(--success-bg)' : 'var(--bg-soft)',
                      color: r.checked_in ? 'var(--success)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {r.checked_in ? 'Checked In' : 'Not Checked In'}
                  </button>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => setSelectedBadge(r)}
                    className="fluent-btn fluent-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px', gap: '4px' }}
                  >
                    <CreditCard size={13} /> Badge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ID-CARD / BADGE GENERATION MODAL */}
      {selectedBadge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lift)',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)' }}>
                Printable Attendee Badge
              </h3>
              <button
                onClick={() => setSelectedBadge(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Badge Preview */}
            <div
              id="printable-badge"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px',
                background: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                marginBottom: '20px',
                fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              }}
            >
              {/* Official MSC Ribbon Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0067b8 0%, #004c87 100%)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0, 103, 184, 0.25)',
                }}
              >
                <img
                  src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
                  alt="MSC Logo"
                  style={{
                    width: '38px',
                    height: '38px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    borderRadius: '4px',
                    padding: '3px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9, fontWeight: 700 }}>
                    Official Admission Pass &bull; Chapter &apos;26
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                    Microsoft Student Community
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                    SRM University-AP &bull; {selectedBadge.event_title}
                  </div>
                </div>
              </div>

              {/* Attendee Name */}
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
                {selectedBadge.lead_name}
              </h2>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500, marginBottom: '10px' }}>
                {selectedBadge.reg_number} {selectedBadge.branch && selectedBadge.branch !== 'N/A' ? `• ${selectedBadge.branch}` : ''} &bull; {selectedBadge.college}
              </div>

              {/* Team Pill */}
              {selectedBadge.team_name && selectedBadge.team_name.toLowerCase() !== 'individual' && selectedBadge.team_name.toLowerCase() !== 'solo' ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0369a1',
                    padding: '3px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    marginBottom: '14px',
                  }}
                >
                  <Users size={12} />
                  <span>Team: {selectedBadge.team_name}</span>
                  {selectedBadge.role && (
                    <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }}>
                      {selectedBadge.role}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    padding: '3px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    marginBottom: '14px',
                  }}
                >
                  <span>Individual Delegate</span>
                </div>
              )}

              {/* Scannable Turnstile QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0, 103, 184, 0.08)' }}>
                  <QRCodeSVG
                    value={typeof window !== 'undefined' ? `${window.location.origin}/admin/checkin/${selectedBadge.ticket_id || selectedBadge.id}` : `https://msc-srmap.in/admin/checkin/${selectedBadge.id}`}
                    size={140}
                    level="H"
                  />
                </div>
              </div>

              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all', marginBottom: '4px' }}>
                TOKEN: {selectedBadge.ticket_id || selectedBadge.id}
              </div>
              <div style={{ fontSize: '10px', color: '#0067b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                OFFICIAL TURNSTILE ENTRY PASS &bull; SCAN FOR ADMISSION
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedBadge(null)}
                className="fluent-btn fluent-btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="fluent-btn fluent-btn-primary"
                style={{ gap: '6px' }}
              >
                <Printer size={15} /> Print Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AT-THE-DOOR MANUAL REGISTRATION MODAL */}
      {isManualModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 3vw, 24px)',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lift)',
              padding: 'clamp(16px, 4vw, 32px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-strong)' }}>
                Manual Walk-in Registration
              </h2>
              <button
                onClick={() => setIsManualModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Attendee Name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="fluent-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="attendee@srmap.edu.in"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="fluent-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AP21110010..."
                    value={manualRegNum}
                    onChange={(e) => setManualRegNum(e.target.value)}
                    className="fluent-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="fluent-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  College Name
                </label>
                <input
                  type="text"
                  value={manualCollege}
                  onChange={(e) => setManualCollege(e.target.value)}
                  className="fluent-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="fluent-btn fluent-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="fluent-btn fluent-btn-primary">
                  Confirm &amp; Check In Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
