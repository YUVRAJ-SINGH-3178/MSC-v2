'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UserCheck, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering (CSE)');
  const [yearOfStudy, setYearOfStudy] = useState('2nd Year');
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      supabase
        .from('member_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || '');
            setRegNum(data.registration_number || '');
            setPhone(data.phone_number || '');
            setDepartment(data.department || 'Computer Science & Engineering (CSE)');
            setYearOfStudy(data.year_of_study || '2nd Year');
            setBio(data.bio || '');
          }
          setLoading(false);
        });
    });
  }, [router, supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('member_profiles')
        .update({
          full_name: fullName,
          registration_number: regNum,
          phone_number: phone,
          department,
          year_of_study: yearOfStudy,
          bio,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2.5px solid var(--border)',
            borderTopColor: 'var(--brand)',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading profile...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '85vh', padding: '60px 0 100px 0' }}>
      <div className="container" style={{ maxWidth: '560px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--brand-soft)',
              color: 'var(--brand)',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <UserCheck size={22} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>
            Set up your profile
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Provide your academic details to streamline event registrations and certificate issuance.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            boxShadow: 'var(--shadow-rest)',
            padding: '32px',
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="fluent-input"
                style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AP21110010123"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  className="fluent-input"
                  style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="fluent-input"
                  style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                  Department / Branch
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="fluent-input"
                  style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px', height: '38px' }}
                >
                  <option value="Computer Science & Engineering (CSE)">Computer Science &amp; Engineering (CSE)</option>
                  <option value="Electronics & Communication Engineering (ECE)">Electronics &amp; Communication (ECE)</option>
                  <option value="Electrical & Electronics Engineering (EEE)">Electrical &amp; Electronics (EEE)</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Other">Other Department</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                  Year of Study
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="fluent-input"
                  style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px', height: '38px' }}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Postgraduate / PhD">Postgraduate / PhD</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                About You / Technical Interests
              </label>
              <textarea
                rows={3}
                placeholder="Cloud architecture, AI systems, web development, data pipelines..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="fluent-input"
                style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="fluent-btn fluent-btn-primary"
              style={{ padding: '10px 16px', fontSize: '14px', marginTop: '6px', borderRadius: '4px' }}
            >
              {saving ? 'Saving...' : 'Save and continue'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link
              href="/"
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
