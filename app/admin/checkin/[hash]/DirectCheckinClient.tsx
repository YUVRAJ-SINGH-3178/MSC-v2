'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Users,
  UserCheck,
  Check,
  Shield,
  Camera,
} from 'lucide-react';
import { checkInTeamServerAction, checkInMemberServerAction } from './actions';

export interface DirectCheckinMember {
  id: string;
  name: string;
  email: string;
  reg_number: string;
  role: string;
  checked_in: boolean;
}

export interface DirectCheckinClientProps {
  hash: string;
  initialReg: {
    id: string;
    lead_name: string;
    lead_email: string;
    reg_number: string;
    college: string;
    event_title: string;
    event_id: string;
    checked_in: boolean;
    team_name?: string;
    team_id?: string;
    is_team: boolean;
  };
  initialTeamMembers: DirectCheckinMember[];
  initialWasAlreadyCheckedIn: boolean;
  defaultMode?: string;
}

export default function DirectCheckinClient({
  hash,
  initialReg,
  initialTeamMembers,
  initialWasAlreadyCheckedIn,
  defaultMode,
}: DirectCheckinClientProps) {
  const [reg, setReg] = useState(initialReg);
  const [teamMembers, setTeamMembers] = useState<DirectCheckinMember[]>(initialTeamMembers);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const checkedInMembersCount = teamMembers.filter((m) => m.checked_in).length;
  const totalMembersCount = teamMembers.length;
  const isAllCheckedIn = checkedInMembersCount === totalMembersCount && totalMembersCount > 0;

  // Check In Entire Team
  const handleCheckInEntireTeam = async () => {
    if (!reg.team_name) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await checkInTeamServerAction(reg.event_id, reg.team_name, reg.team_id);
      if (res.success) {
        setReg((prev) => ({ ...prev, checked_in: true }));
        setTeamMembers((prev) => prev.map((m) => ({ ...m, checked_in: true })));
        setFeedbackMsg(res.message || 'Entire team checked in!');
      } else {
        setFeedbackMsg(res.error || 'Failed to check in team.');
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Failed to check in team.');
    } finally {
      setLoading(false);
    }
  };

  // Check In Single Scanned Attendee
  const handleCheckInAttendeeOnly = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await checkInMemberServerAction(reg.id);
      if (res.success) {
        setReg((prev) => ({ ...prev, checked_in: true }));
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === reg.id ? { ...m, checked_in: true } : m))
        );
        setFeedbackMsg(res.message || 'Attendee admission approved!');
      } else {
        setFeedbackMsg(res.error || 'Failed to check in attendee.');
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Failed to check in attendee.');
    } finally {
      setLoading(false);
    }
  };

  // Check In Specific Team Member by ID
  const handleCheckInSpecificMember = async (memberId: string) => {
    try {
      const res = await checkInMemberServerAction(memberId);
      if (res.success) {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, checked_in: true } : m))
        );
        if (memberId === reg.id) {
          setReg((prev) => ({ ...prev, checked_in: true }));
        }
      }
    } catch (err) {
      console.error('Member check-in failed:', err);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#ffffff',
          border: '2px solid #0067b8',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 103, 184, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Official Microsoft Student Community Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0067b8 0%, #004c87 100%)',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
              alt="MSC Logo"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                background: '#ffffff',
                borderRadius: '6px',
                padding: '3px',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            />
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9, fontWeight: 700 }}>
                Turnstile Gate Admission Pass &bull; Chapter &apos;26
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                Microsoft Student Community
              </div>
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                SRM University-AP &bull; {reg.event_title}
              </div>
            </div>
          </div>

          <span
            style={{
              background: reg.checked_in ? '#0e7c41' : 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: '1px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          >
            {reg.checked_in ? 'Checked In' : 'Confirmed'}
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Status Message Pill */}
          {feedbackMsg && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#15803d',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} /> {feedbackMsg}
            </div>
          )}

          {/* Attendee Info Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  {reg.is_team ? 'Team Lead / Scanned Attendee' : 'Individual Delegate'}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '2px 0 4px 0' }}>
                  {reg.lead_name}
                </h2>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{reg.reg_number}</span> &bull; {reg.lead_email}
                </div>
              </div>

              {reg.is_team ? (
                <div
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Users size={12} /> Team: {reg.team_name}
                </div>
              ) : (
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Individual
                </span>
              )}
            </div>
          </div>

          {/* TEAM TURNSTILE CONTROLS */}
          {reg.is_team ? (
            <div>
              {/* Check-In Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={handleCheckInEntireTeam}
                  disabled={loading || isAllCheckedIn}
                  className="fluent-btn fluent-btn-primary"
                  style={{
                    justifyContent: 'center',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    opacity: isAllCheckedIn ? 0.7 : 1,
                  }}
                >
                  <Users size={16} />
                  {isAllCheckedIn
                    ? `Entire Team Checked In (${totalMembersCount}/${totalMembersCount})`
                    : `Check In Entire Team (${totalMembersCount} Members)`}
                </button>

                <button
                  type="button"
                  onClick={handleCheckInAttendeeOnly}
                  disabled={loading || reg.checked_in}
                  className="fluent-btn fluent-btn-secondary"
                  style={{ justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                >
                  <UserCheck size={16} />
                  {reg.checked_in ? 'Scanned Attendee Already Admitted' : `Check In This Attendee Only (${reg.lead_name})`}
                </button>
              </div>

              {/* Individual Team Member Roster Breakdown */}
              {teamMembers.length > 0 && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    background: '#ffffff',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      Team Roster ({checkedInMembersCount} of {totalMembersCount} Present)
                    </span>
                    <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${totalMembersCount > 0 ? (checkedInMembersCount / totalMembersCount) * 100 : 0}%`,
                          height: '100%',
                          background: isAllCheckedIn ? '#0e7c41' : '#0067b8',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {teamMembers.map((member, idx) => (
                      <div
                        key={member.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: member.checked_in ? 'rgba(16, 124, 65, 0.05)' : '#f8fafc',
                          border: member.checked_in ? '1px solid #86efac' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{member.name}</strong>
                          <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
                            {member.reg_number}
                          </span>
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#0067b8',
                              background: '#e0f2fe',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            {member.role || (idx === 0 ? 'Leader' : 'Member')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCheckInSpecificMember(member.id)}
                          disabled={member.checked_in}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: member.checked_in ? 'default' : 'pointer',
                            border: member.checked_in ? '1px solid #0e7c41' : '1px solid #0067b8',
                            background: member.checked_in ? '#0e7c41' : '#0067b8',
                            color: '#ffffff',
                          }}
                        >
                          {member.checked_in ? (
                            <>
                              <Check size={12} /> Checked In
                            </>
                          ) : (
                            'Check In'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SOLO ATTENDEE CONTROLS */
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleCheckInAttendeeOnly}
                disabled={loading || reg.checked_in}
                className="fluent-btn fluent-btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {reg.checked_in ? (
                  <>
                    <CheckCircle2 size={16} /> Admission Granted &amp; Verified
                  </>
                ) : (
                  'Confirm &amp; Check In Delegate'
                )}
              </button>
            </div>
          )}

          {/* Navigation Options */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <Link
              href="/admin"
              className="fluent-btn fluent-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>

            <Link
              href="/admin/scanner"
              className="fluent-btn fluent-btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Camera size={14} /> Open Camera Scanner
            </Link>
          </div>
        </div>

        {/* Credential Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '10px 24px',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={12} color="#0067b8" />
            <span>Official Microsoft Student Community Turnstile Validation</span>
          </div>
          <span>SRM University-AP</span>
        </div>
      </div>
    </div>
  );
}
