'use client';

import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserCheck, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface MemberRoleRecord {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member';
  is_onboarded: boolean;
}

export default function AdminRolesPage() {
  const [members, setMembers] = useState<MemberRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
      }
    } catch (err: any) {
      console.error('Failed to load member roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role.');

      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
      setMessage({ type: 'success', text: `Successfully updated role to ${newRole}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to update role: ${err.message}` });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // One administrator only: mirror the API/database rule in the picker so the
  // option that would be rejected is not offered in the first place.
  const adminId = members.find((m) => m.role === 'admin')?.id;
  const isSoleAdmin = (m: MemberRoleRecord) => m.role === 'admin' && m.id === adminId;
  const canTakeAdmin = (m: MemberRoleRecord) => !adminId || m.id === adminId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-strong)' }}>
            Member Role Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Assign one of the two roles — Administrator (admin portal) or Member (member portal).
            Only one Administrator account can exist at a time.
          </p>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="fluent-btn fluent-btn-secondary"
          style={{ fontSize: '13px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '12px',
            background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

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
        <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', color: 'var(--text-strong)' }}>
              <th style={{ padding: '12px 16px' }}>Member Profile</th>
              <th style={{ padding: '12px 16px' }}>Current Privilege</th>
              <th style={{ padding: '12px 16px' }}>Onboarded</th>
              <th style={{ padding: '12px 16px' }}>Elevate / Demote</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading member permissions from database...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No member profiles found in database.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ color: 'var(--text-strong)', display: 'block' }}>
                      {m.full_name || 'Community Member'}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      className={`fluent-badge ${m.role === 'admin' ? 'badge-danger' : 'badge-success'}`}
                    >
                      {m.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {m.is_onboarded ? 'Yes' : 'Pending'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <select
                      value={m.role || 'member'}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as any)}
                      className="fluent-input"
                      style={{ width: '160px', fontSize: '12px' }}
                    >
                      <option value="member" disabled={isSoleAdmin(m)}>
                        Member
                      </option>
                      <option value="admin" disabled={!canTakeAdmin(m)} title="Only one administrator is allowed">
                        Administrator
                      </option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
