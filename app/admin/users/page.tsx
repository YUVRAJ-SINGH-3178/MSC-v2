'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Mail,
  Lock,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'member';
  department?: string;
  year?: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New User Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'member',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Account for ${formData.email} successfully provisioned!`);
        setIsProvisionModalOpen(false);
        setFormData({
          email: '',
          password: '',
          full_name: '',
          role: 'member',
          department: 'Computer Science & Engineering',
          year: '3rd Year',
        });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to provision account');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while provisioning user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'update_role', role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
        );
        setActionMessage('User permissions updated successfully.');
      } else {
        const data = await res.json().catch(() => ({} as any));
        alert(data.error || 'Failed to update role');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          action: 'reset_password',
          new_password: newPassword,
        }),
      });
      if (res.ok) {
        setActionMessage(`Password updated for ${selectedUser.email}.`);
        setIsResetModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke access and delete ${email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users?user_id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setActionMessage(`Member account ${email} removed.`);
      } else {
        const data = await res.json().catch(() => ({} as any));
        alert(data.error || 'Failed to delete account');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // One administrator only: mirror the API/database rule in the pickers so the
  // option that would be rejected is not offered in the first place.
  const adminId = users.find((u) => u.role === 'admin')?.id;
  const isSoleAdmin = (u: UserProfile) => u.role === 'admin' && u.id === adminId;
  const canTakeAdmin = (u: UserProfile) => !adminId || u.id === adminId;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
            User Access Provisioning
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage member accounts, elevate the administrator, and provision access for Chapter &apos;26.
          </p>
        </div>

        <button
          onClick={() => setIsProvisionModalOpen(true)}
          className="fluent-btn fluent-btn-primary"
          style={{ fontSize: '13px' }}
        >
          <UserPlus size={16} /> Provision Member
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fluent-input"
            style={{ paddingLeft: '36px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role:</span>
          {['all', 'admin', 'member'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                background: roleFilter === r ? 'var(--brand)' : 'var(--bg-soft)',
                color: roleFilter === r ? '#ffffff' : 'var(--text-body)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* User Directory Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: 'var(--shadow-rest)',
        }}
      >
        <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Member Profile</th>
              <th style={{ padding: '12px 16px' }}>Department &amp; Year</th>
              <th style={{ padding: '12px 16px' }}>Current Role</th>
              <th style={{ padding: '12px 16px' }}>Date Provisioned</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No accounts found. Click &quot;Provision Member&quot; to create a new user.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                      {u.full_name || 'MSC Member'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div>{u.department || 'SRM AP Engineering'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.year || '3rd Year'}</div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="fluent-input"
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        width: 'auto',
                        fontWeight: 600,
                        color: u.role === 'admin' ? 'var(--accent-strong)' : 'var(--brand)',
                      }}
                    >
                      <option value="admin" disabled={!canTakeAdmin(u)} title="Only one administrator is allowed">
                        Admin
                      </option>
                      <option value="member" disabled={isSoleAdmin(u)}>
                        Member
                      </option>
                    </select>
                  </td>

                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>

                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsResetModalOpen(true);
                        }}
                        className="fluent-btn fluent-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Set new password"
                      >
                        <Key size={13} /> Reset Pass
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={isSoleAdmin(u)}
                        className="fluent-btn fluent-btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: 'var(--danger)',
                          opacity: isSoleAdmin(u) ? 0.5 : 1,
                        }}
                        title={isSoleAdmin(u) ? 'The administrator account cannot be deleted' : 'Delete member account'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Provision User Modal */}
      {isProvisionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 3vw, 20px)',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: 'clamp(16px, 4vw, 28px)',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--brand)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Provision Member Account
                </h3>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProvisionUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="fluent-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@srmap.edu.in or msc-srmap.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="fluent-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Initial Password (Min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="fluent-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Access Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="fluent-input"
                    style={{ width: '100%' }}
                  >
                    <option value="member">Member</option>
                    <option value="admin" disabled={!!adminId} title="Only one administrator is allowed">
                      Administrator
                    </option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Year of Study
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="fluent-input"
                    style={{ width: '100%' }}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Department / Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="fluent-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="fluent-btn fluent-btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="fluent-btn fluent-btn-primary" style={{ fontSize: '13px' }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Reset Modal */}
      {isResetModalOpen && selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--brand)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Reset Member Password
                </h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-body)', marginBottom: '16px' }}>
              Setting a direct new password for <strong>{selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="fluent-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="fluent-btn fluent-btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="fluent-btn fluent-btn-primary" style={{ fontSize: '13px' }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
