'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Search,
  Download,
  Upload,
  Printer,
  QrCode,
  CheckCircle,
  X,
  CreditCard,
  FileSpreadsheet,
  FileText,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Layers,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
// Papa and ExcelJS are dynamically imported on demand for optimal bundle size
import { QRCodeSVG } from 'qrcode.react';

interface AttendeeRecord {
  id: string;
  hash_payload: string;
  lead_name: string;
  lead_email: string;
  reg_number: string;
  phone: string;
  college: string;
  branch?: string;
  ticket_id?: string;
  role?: string;
  team_name?: string;
  team_id?: string;
  team_size?: number;
  status: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled';
  checked_in: boolean;
  team_members?: Array<{ name: string; email: string; reg_number?: string }>;
  created_at: string;
}

interface TeamGroup {
  type: 'team';
  teamKey: string;
  teamName: string;
  lead: AttendeeRecord;
  members: AttendeeRecord[];
  checkedInCount: number;
  totalCount: number;
  allCheckedIn: boolean;
  status: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled';
}

interface SoloGroup {
  type: 'solo';
  record: AttendeeRecord;
}

type GroupedItem = TeamGroup | SoloGroup;

export default function PerEventManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const supabase = createClient();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<AttendeeRecord | null>(null);
  const [selectedTeamRoster, setSelectedTeamRoster] = useState<AttendeeRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingRoster, setIsDeletingRoster] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  const handleDeleteAllAttendees = async (openImportAfter = false) => {
    setIsDeletingRoster(true);
    try {
      const res = await fetch(`/api/admin/registrations?event_id=${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Failed to delete attendees: ' + (data.error || 'Server error'));
      } else {
        await fetchEventAndAttendees();
        setIsDeleteAllModalOpen(false);
        if (openImportAfter) {
          setIsImportModalOpen(true);
        } else {
          alert(`Successfully deleted all attendee records for ${event?.title || 'this event'}. You can now upload a fresh CSV.`);
        }
      }
    } catch (err: any) {
      alert('Failed to delete attendees: ' + err.message);
    } finally {
      setIsDeletingRoster(false);
    }
  };

  const fetchEventAndAttendees = async () => {
    try {
      // 1. Fetch Event
      const { data: evData, error: evError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!evError && evData) {
        setEvent(evData as EventItem);
      } else {
        const fallback = FALLBACK_EVENTS.find((e) => e.id === eventId) || FALLBACK_EVENTS[0];
        setEvent(fallback);
      }

      // 2. Fetch Attendees
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!regError && regData) {
        const mapped: AttendeeRecord[] = regData.map((r: any) => ({
          id: r.id,
          hash_payload: r.hash_payload || r.id,
          lead_name: r.form_data?.full_name || r.form_data?.name || r.lead_email.split('@')[0],
          lead_email: r.lead_email,
          reg_number: r.form_data?.registration_number || r.form_data?.reg_num || r.form_data?.reg_number || 'N/A',
          phone: r.form_data?.phone || r.form_data?.mobile || '',
          college: r.form_data?.college || 'SRM University AP',
          branch: r.form_data?.branch || '',
          ticket_id: r.form_data?.ticket_id || '',
          role: r.form_data?.role || r.team_data?.role || '',
          status: r.status,
          checked_in: Boolean(r.checked_in),
          team_name: r.team_data?.team_name || '',
          team_id: r.team_data?.team_id || '',
          team_size: r.team_data?.team_size ? Number(r.team_data.team_size) : undefined,
          team_members: r.team_data?.members || [],
          created_at: r.created_at,
        }));
        setAttendees(mapped);
      }
    } catch (err) {
      console.error('Failed to load event or attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventAndAttendees();
  }, [eventId]);

  // Toggle Attendance with real Supabase persistence
  const toggleCheckIn = async (id: string) => {
    const target = attendees.find((a) => a.id === id);
    if (!target) return;
    const nextVal = !target.checked_in;
    setAttendees((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked_in: nextVal } : item))
    );
    if (!id.includes('-member-')) {
      await supabase.from('registrations').update({ checked_in: nextVal, updated_at: new Date().toISOString() }).eq('id', id);
    }
  };

  // Toggle Check-in for an entire team
  const toggleTeamCheckIn = async (group: TeamGroup) => {
    const targetVal = !group.allCheckedIn;
    const ids = group.members.map((m) => m.id);

    setAttendees((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, checked_in: targetVal } : item))
    );

    const realIds = ids.filter((id) => !id.includes('-member-'));
    if (realIds.length > 0) {
      await supabase
        .from('registrations')
        .update({ checked_in: targetVal, updated_at: new Date().toISOString() })
        .in('id', realIds);
    }
  };

  // Group attendees into Teams and Solo records
  const groupedItems = useMemo<GroupedItem[]>(() => {
    const teamMap = new Map<string, AttendeeRecord[]>();
    const soloList: AttendeeRecord[] = [];
    const teamOrder: string[] = [];

    // Track active team instance for teams when team_id is absent
    const activeTeamKeyByName = new Map<string, string>();
    const teamInstanceCount = new Map<string, number>();

    attendees.forEach((att) => {
      const rawTeam = att.team_name?.trim();
      const isSolo = !rawTeam || ['individual', 'solo', '-', 'n/a', 'none'].includes(rawTeam.toLowerCase());
      if (!isSolo) {
        let key = att.team_id;

        if (!key) {
          // Legacy grouping for records without explicit team_id:
          // Check if this attendee is explicitly marked as Leader / Lead
          const isLeader = att.role?.toLowerCase().includes('lead') || att.role?.toLowerCase() === 'leader';
          const teamNameKey = rawTeam; // keep exact casing (e.g. Nexora vs NEXORA)
          
          let currentInstanceKey = activeTeamKeyByName.get(teamNameKey);
          const currentMembers = currentInstanceKey ? teamMap.get(currentInstanceKey) || [] : [];
          
          const reachedCapacity = att.team_size ? currentMembers.length >= att.team_size : currentMembers.length >= 5;

          // If no active instance, or this person is a new Leader (and not the first member), or reached capacity:
          if (!currentInstanceKey || (isLeader && currentMembers.length > 0) || reachedCapacity) {
            const count = (teamInstanceCount.get(teamNameKey) || 0) + 1;
            teamInstanceCount.set(teamNameKey, count);
            currentInstanceKey = `${teamNameKey}__team_${count}`;
            activeTeamKeyByName.set(teamNameKey, currentInstanceKey);
          }

          key = currentInstanceKey;
        }

        if (!teamMap.has(key)) {
          teamMap.set(key, []);
          teamOrder.push(key);
        }
        teamMap.get(key)!.push(att);
      } else {
        soloList.push(att);
      }
    });

    const result: GroupedItem[] = [];

    teamOrder.forEach((key) => {
      const rawMembers = [...teamMap.get(key)!];
      // Pick team lead: member with role containing 'lead', or first member
      const lead = rawMembers.find((m) => m.role?.toLowerCase().includes('lead')) || rawMembers[0];
      const members = [lead, ...rawMembers.filter((m) => m.id !== lead.id)];

      // If lead has embedded team_members JSON that aren't already separate records, synthesize them
      if (lead.team_members && lead.team_members.length > 0) {
        const existingEmails = new Set(members.map((m) => m.lead_email.toLowerCase()));
        lead.team_members.forEach((tm: any, idx: number) => {
          const email = (tm.email || `member-${idx}@srmap.edu.in`).toLowerCase();
          if (!existingEmails.has(email)) {
            members.push({
              id: `${lead.id}-member-${idx}`,
              hash_payload: lead.hash_payload,
              lead_name: tm.name || tm.fullName || `Member ${idx + 2}`,
              lead_email: tm.email || '',
              reg_number: tm.reg_number || tm.regNumber || 'N/A',
              phone: tm.phone || '',
              college: tm.college || lead.college,
              branch: tm.branch || lead.branch,
              role: 'Member',
              status: lead.status,
              checked_in: Boolean(tm.checked_in ?? lead.checked_in),
              team_name: lead.team_name,
              team_id: lead.team_id,
              created_at: lead.created_at,
            });
            existingEmails.add(email);
          }
        });
      }

      const checkedInCount = members.filter((m) => m.checked_in).length;
      result.push({
        type: 'team',
        teamKey: key,
        teamName: lead.team_name || members[0].team_name || key.split('__team_')[0],
        lead,
        members,
        checkedInCount,
        totalCount: members.length,
        allCheckedIn: checkedInCount === members.length && members.length > 0,
        status: lead.status,
      });
    });

    soloList.forEach((att) => {
      result.push({
        type: 'solo',
        record: att,
      });
    });

    return result;
  }, [attendees]);

  // Filter groups
  const filteredGroups = useMemo<GroupedItem[]>(() => {
    const q = searchTerm.trim().toLowerCase();

    return groupedItems.filter((group) => {
      if (group.type === 'solo') {
        const rec = group.record;
        const matchesSearch =
          !q ||
          rec.lead_name.toLowerCase().includes(q) ||
          rec.lead_email.toLowerCase().includes(q) ||
          rec.reg_number.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'checked_in'
            ? rec.checked_in
            : statusFilter === 'unattended'
            ? !rec.checked_in
            : statusFilter === 'pending'
            ? (rec.status === 'pending_payment' || (rec.status as string) === 'pending')
            : rec.status === statusFilter;

        return matchesSearch && matchesStatus;
      } else {
        const teamNameMatches = group.teamName.toLowerCase().includes(q);
        const memberMatches = group.members.some(
          (m) =>
            m.lead_name.toLowerCase().includes(q) ||
            m.lead_email.toLowerCase().includes(q) ||
            m.reg_number.toLowerCase().includes(q)
        );
        const matchesSearch = !q || teamNameMatches || memberMatches;

        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'checked_in'
            ? group.checkedInCount > 0
            : statusFilter === 'unattended'
            ? group.checkedInCount < group.totalCount
            : statusFilter === 'pending'
            ? (group.status === 'pending_payment' || (group.status as string) === 'pending')
            : group.status === statusFilter;

        return matchesSearch && matchesStatus;
      }
    });
  }, [groupedItems, searchTerm, statusFilter]);

  const totalTeamsCount = useMemo(() => {
    return groupedItems.filter((g) => g.type === 'team').length;
  }, [groupedItems]);

  const isTeamExpanded = (teamKey: string) => {
    if (searchTerm.trim() !== '') return true; // auto-expand on search
    return Boolean(expandedTeams[teamKey]);
  };

  const toggleTeamExpand = (teamKey: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamKey]: !prev[teamKey],
    }));
  };

  const toggleAllExpanded = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    const newMap: Record<string, boolean> = {};
    groupedItems.forEach((g) => {
      if (g.type === 'team') {
        newMap[g.teamKey] = next;
      }
    });
    setExpandedTeams(newMap);
  };

  const confirmedCount = attendees.filter((a) => a.status === 'confirmed').length;
  const checkedInCount = attendees.filter((a) => a.checked_in).length;
  const pendingCount = attendees.filter((a) => a.status === 'pending_payment' || (a.status as string) === 'pending').length;

  // Export CSV matching exact header specification
  const handleExportCSV = async () => {
    const Papa = (await import('papaparse')).default;
    const csvData = attendees.map((a) => ({
      'Ticket ID': a.ticket_id || a.hash_payload || a.id,
      Role: a.role || (a.team_name ? 'Member' : 'Solo'),
      Name: a.lead_name,
      Email: a.lead_email,
      'Reg Num': a.reg_number,
      Mobile: a.phone,
      Branch: a.branch || 'N/A',
      'Team Name': a.team_name || 'Individual',
      'Team Size': a.team_size ? String(a.team_size) : (a.team_name ? 'Team' : '1'),
      Status: a.status,
      'Registration Date': a.created_at,
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event?.slug || 'event'}-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Excel (.xlsx) using exceljs matching standard header schema
  const handleExportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Microsoft Student Community SRM AP';
    const worksheet = workbook.addWorksheet('Attendees');

    worksheet.columns = [
      { header: 'Ticket ID', key: 'ticket_id', width: 16 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Reg Num', key: 'reg_num', width: 18 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'Branch', key: 'branch', width: 14 },
      { header: 'Team Name', key: 'team_name', width: 20 },
      { header: 'Team Size', key: 'team_size', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Registration Date', key: 'reg_date', width: 20 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0067B8' }, // Cobalt brand
    };

    attendees.forEach((a) => {
      worksheet.addRow({
        ticket_id: a.ticket_id || a.hash_payload || a.id,
        role: a.role || (a.team_name ? 'Member' : 'Solo'),
        name: a.lead_name,
        email: a.lead_email,
        reg_num: a.reg_number,
        mobile: a.phone,
        branch: a.branch || 'N/A',
        team_name: a.team_name || 'Individual',
        team_size: a.team_size ? String(a.team_size) : (a.team_name ? 'Team' : '1'),
        status: a.status.toUpperCase(),
        reg_date: a.created_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event?.slug || 'event'}-roster-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Sample CSV Template
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
        'Check-in': 'yes',
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
        Status: 'pending',
        'Check-in': 'no',
        'Registration Date': new Date().toISOString().slice(0, 10),
      },
    ];
    const csvString = Papa.unparse(sampleHeaders);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-attendees-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  // Handle CSV Import with robust header matching & smart team differentiation
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedRows = results.data as any[];

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

        const seenEmailsInUpload = new Map<string, number>();

        const toInsert = parsedRows.map((row, idx) => {
          const ticketId = getField(row, 'Ticket ID', 'ticket_id', 'TicketId', 'ticket');
          const role = getField(row, 'Role', 'role', 'team_role');
          const name = getField(row, 'Name', 'full_name', 'FullName', 'lead_name') || 'Participant';
          const rawEmail = getField(row, 'Email', 'email', 'lead_email');
          let email = rawEmail ? rawEmail.toLowerCase().trim() : '';

          if (!email) {
            email = `attendee-${eventId.slice(0, 8)}-${idx}@srmap.edu.in`;
          } else {
            const occurrences = (seenEmailsInUpload.get(email) || 0) + 1;
            seenEmailsInUpload.set(email, occurrences);
            if (occurrences > 1) {
              const [userPart, domain] = email.split('@');
              email = `${userPart}+m${occurrences}@${domain || 'srmap.edu.in'}`;
            }
          }

          const regNum = getField(row, 'Reg Num', 'reg_num', 'Registration Number', 'reg_number', 'Reg Number') || 'N/A';
          const mobile = getField(row, 'Mobile', 'mobile', 'Phone', 'phone');
          const branch = getField(row, 'Branch', 'branch', 'Department', 'dept');
          const rawTeam = getField(row, 'Team Name', 'team_name', 'Team', 'team');
          const rawTeamSize = getField(row, 'Team Size', 'team_size', 'teamSize');
          const parsedTeamSize = parseInt(rawTeamSize, 10);
          const teamSize = !isNaN(parsedTeamSize) && parsedTeamSize > 0 ? parsedTeamSize : undefined;
          
          // 1. Check-in status resolution
          const rawCheckin = getField(
            row,
            'Check-in',
            'Checked In',
            'Checked-in',
            'Check In',
            'Attended',
            'Attendance',
            'checked_in',
            'CheckedIn',
            'checkin'
          ).toLowerCase().trim();

          const rawStatus = (getField(row, 'Status', 'status') || 'confirmed').toLowerCase().trim();

          // Check if marked as checked in either via dedicated column or status column
          let isCheckedIn = [
            'true',
            'yes',
            '1',
            'checked in',
            'checked_in',
            'attended',
            'present',
            'admitted',
            'done',
          ].includes(rawCheckin);

          if (!isCheckedIn && ['checked_in', 'checked in', 'attended', 'present', 'admitted'].includes(rawStatus)) {
            isCheckedIn = true;
          }

          // 2. Status resolution (adhering to DB check constraint: confirmed, pending_payment, waitlisted, cancelled)
          let finalStatus: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled' = 'confirmed';
          if (rawStatus.includes('pend') || rawStatus.includes('unpaid') || rawStatus === 'pending_payment') {
            finalStatus = 'pending_payment';
          } else if (rawStatus.includes('wait')) {
            finalStatus = 'waitlisted';
          } else if (rawStatus.includes('cancel') || rawStatus.includes('reject')) {
            finalStatus = 'cancelled';
          } else {
            finalStatus = 'confirmed';
          }

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
              currentTeamInstanceId = `team_${eventId.slice(0, 8)}_${rawTeam.toLowerCase().replace(/[^a-z0-9]/g, '_')}_inst${teamCounter}`;
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
            event_id: eventId,
            lead_email: email,
            status: finalStatus,
            checked_in: isCheckedIn,
            form_data: {
              full_name: name,
              registration_number: regNum,
              phone: mobile,
              branch: branch,
              college: getField(row, 'College', 'college') || 'SRM University-AP',
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
              body: JSON.stringify({
                batch: toInsert,
                clear_first: importMode === 'replace',
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              alert('Failed to import attendees: ' + (data.error || 'Server error'));
            } else {
              const modeMsg = importMode === 'replace' ? 'replaced existing roster' : 'merged with existing';
              const insertedText = data.inserted !== undefined ? `${data.inserted} added` : '';
              const updatedText = data.updated !== undefined && data.updated > 0 ? `, ${data.updated} updated` : '';
              alert(`Successfully synced ${data.count || toInsert.length} attendees (${modeMsg}: ${insertedText}${updatedText})!`);
              await fetchEventAndAttendees();
            }
          } catch (err: any) {
            alert('Failed to import attendees: ' + err.message);
          }
        }
        setIsImportModalOpen(false);
      },
    });
  };

  if (!event) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading event workspace...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Navigation & Event Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link href="/admin/events" style={{ fontSize: '13px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Events Directory
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Event Management</span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
            {event.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} />
              <span>{new Date(event.date_start).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} />
              <span>{event.location}</span>
            </div>
            <span className="fluent-badge badge-success">
              {event.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href={`/admin/events/${eventId}/scanner`}
            className="fluent-btn fluent-btn-primary"
            style={{ fontSize: '13px' }}
          >
            <QrCode size={16} /> Launch Camera Scanner
          </Link>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <Upload size={14} /> Bulk CSV Import
          </button>

          {attendees.length > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="fluent-btn fluent-btn-secondary"
              style={{
                fontSize: '13px',
                color: '#dc2626',
                borderColor: 'rgba(220, 38, 38, 0.3)',
                background: 'rgba(220, 38, 38, 0.04)',
              }}
              title="Delete current CSV roster from database"
            >
              <Trash2 size={14} /> Clear Roster ({attendees.length})
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <FileSpreadsheet size={14} /> Excel (.xlsx)
          </button>

          <button
            onClick={handleExportCSV}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
        <div className="fluent-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Registrations</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-strong)', marginTop: '4px' }}>
            {attendees.length}
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Confirmed Capacity</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brand)', marginTop: '4px' }}>
            {confirmedCount} / {event.max_capacity}
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Door Check-ins</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
            {checkedInCount}
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Approvals</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            {pendingCount}
          </div>
        </div>

        <div className="fluent-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Attendance Rate</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-strong)', marginTop: '4px' }}>
            {confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 0}%
          </div>
        </div>
      </div>

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
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search attendees, email, reg no, team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fluent-input"
            style={{ paddingLeft: '36px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {totalTeamsCount > 0 && (
            <button
              type="button"
              onClick={toggleAllExpanded}
              className="fluent-btn fluent-btn-secondary"
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--brand)',
              }}
            >
              {allExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {allExpanded ? 'Collapse All Teams' : 'Expand All Teams'}
            </button>
          )}

          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>Filter:</span>
          {['all', 'confirmed', 'pending', 'waitlisted', 'checked_in', 'unattended'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                background: statusFilter === f ? 'var(--brand)' : 'var(--bg-soft)',
                color: statusFilter === f ? '#ffffff' : 'var(--text-body)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: statusFilter === f ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {f === 'all'
                ? 'All'
                : f === 'checked_in'
                ? 'Checked In'
                : f === 'unattended'
                ? 'Unattended'
                : f === 'pending'
                ? `Pending (${pendingCount})`
                : f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Count Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '0 4px' }}>
        <span>
          Showing <strong>{filteredGroups.length}</strong> items (<strong>{attendees.length}</strong> total participants across <strong>{totalTeamsCount}</strong> teams)
        </span>
        {totalTeamsCount > 0 && (
          <span style={{ fontStyle: 'italic' }}>
            Click on any team or down arrow to reveal members
          </span>
        )}
      </div>

      {/* Registrations Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-rest)',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px', width: '28%' }}>Team / Participant</th>
                <th style={{ padding: '14px 16px', width: '22%' }}>Lead Contact</th>
                <th style={{ padding: '14px 16px', width: '18%' }}>Academic ID &amp; College</th>
                <th style={{ padding: '14px 16px', width: '10%' }}>Status</th>
                <th style={{ padding: '14px 16px', width: '14%' }}>Attendance</th>
                <th style={{ padding: '14px 16px', width: '8%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No attendee records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  if (group.type === 'solo') {
                    const record = group.record;
                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '16px' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{record.lead_name}</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Individual</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-body)' }}>{record.lead_email}</div>
                          {record.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{record.phone}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>{record.reg_number}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{record.college}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className={`fluent-badge ${
                              record.status === 'confirmed'
                                ? 'badge-success'
                                : record.status === 'waitlisted'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {record.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => toggleCheckIn(record.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: record.checked_in ? '1px solid var(--success)' : '1px solid var(--border)',
                              background: record.checked_in ? 'var(--success-bg)' : 'var(--bg-soft)',
                              color: record.checked_in ? 'var(--success)' : 'var(--text-body)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <CheckCircle size={13} />
                            {record.checked_in ? 'Checked In' : 'Check In'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedBadge(record)}
                            className="fluent-btn fluent-btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                            title="Print ID Badge"
                          >
                            <Printer size={12} /> Badge
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Team Group
                  const expanded = isTeamExpanded(group.teamKey);
                  const hasOtherMembers = group.members.length > 1;

                  return (
                    <React.Fragment key={`team-group-${group.teamKey}`}>
                      {/* Main Team Row */}
                      <tr
                        style={{
                          borderBottom: expanded ? 'none' : '1px solid var(--border)',
                          background: expanded ? 'rgba(0, 103, 184, 0.03)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Team Name with clickable chevron & counter */}
                        <td
                          style={{ padding: '14px 16px', cursor: hasOtherMembers ? 'pointer' : 'default' }}
                          onClick={() => hasOtherMembers && toggleTeamExpand(group.teamKey)}
                          title={hasOtherMembers ? (expanded ? 'Click to collapse roster' : 'Click to expand roster') : undefined}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {hasOtherMembers ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '20px',
                                  height: '20px',
                                  color: 'var(--brand)',
                                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <ChevronRight size={16} />
                              </span>
                            ) : (
                              <div style={{ width: '20px' }} />
                            )}

                            <span
                              style={{
                                fontWeight: 700,
                                color: 'var(--brand)',
                                fontSize: '14px',
                              }}
                            >
                              {group.teamName}
                            </span>

                            {hasOtherMembers && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  background: 'var(--bg-soft)',
                                  color: 'var(--text-muted)',
                                  borderRadius: '12px',
                                  fontWeight: 600,
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {group.totalCount} members
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Primary Contact (Team Lead) */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '13px' }}>
                            {group.lead.lead_name}
                            <span style={{ fontSize: '10px', color: 'var(--brand)', marginLeft: '6px', fontWeight: 600 }}>[Lead]</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {group.lead.lead_email}
                          </div>
                        </td>

                        {/* Academic ID & College */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                            {group.lead.reg_number}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {group.lead.college}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            className={`fluent-badge ${
                              group.status === 'confirmed'
                                ? 'badge-success'
                                : group.status === 'waitlisted'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {group.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Turnstile Check-In */}
                        <td style={{ padding: '14px 16px' }}>
                          {hasOtherMembers ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTeamCheckIn(group);
                              }}
                              title={group.allCheckedIn ? 'Click to uncheck team' : 'Click to check in all team members'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: group.allCheckedIn
                                  ? '1px solid var(--success)'
                                  : group.checkedInCount > 0
                                  ? '1px solid var(--brand)'
                                  : '1px solid var(--border)',
                                background: group.allCheckedIn
                                  ? 'var(--success-bg)'
                                  : group.checkedInCount > 0
                                  ? 'rgba(0, 103, 184, 0.08)'
                                  : 'var(--bg-soft)',
                                color: group.allCheckedIn
                                  ? 'var(--success)'
                                  : group.checkedInCount > 0
                                  ? 'var(--brand)'
                                  : 'var(--text-body)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <CheckCircle size={13} />
                              {group.allCheckedIn
                                ? `All In (${group.totalCount}/${group.totalCount})`
                                : group.checkedInCount > 0
                                ? `In Progress (${group.checkedInCount}/${group.totalCount})`
                                : `Check In Team (0/${group.totalCount})`}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCheckIn(group.lead.id);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: group.lead.checked_in ? '1px solid var(--success)' : '1px solid var(--border)',
                                background: group.lead.checked_in ? 'var(--success-bg)' : 'var(--bg-soft)',
                                color: group.lead.checked_in ? 'var(--success)' : 'var(--text-body)',
                              }}
                            >
                              <CheckCircle size={13} />
                              {group.lead.checked_in ? 'Checked In' : 'Check In'}
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBadge(group.lead);
                            }}
                            className="fluent-btn fluent-btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                            title="Print ID Badge for Team Lead"
                          >
                            <Printer size={12} /> Badge
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Accordion Drawer: Clean Roster Sub-Panel */}
                      {expanded && hasOtherMembers && (
                        <tr style={{ background: 'rgba(0, 103, 184, 0.02)' }}>
                          <td colSpan={6} style={{ padding: '0 16px 16px 16px', borderBottom: '1px solid var(--border)' }}>
                            <div
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '14px 16px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                borderLeft: '3px solid var(--brand)',
                              }}
                            >
                              {/* Roster Header Strip */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  marginBottom: '12px',
                                  paddingBottom: '10px',
                                  borderBottom: '1px solid var(--border)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Users size={16} color="var(--brand)" />
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-strong)' }}>
                                    {group.teamName} Team Roster
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    &bull; {group.checkedInCount} of {group.totalCount} checked in
                                  </span>
                                  <div
                                    style={{
                                      width: '80px',
                                      height: '5px',
                                      background: 'var(--bg-soft)',
                                      borderRadius: '3px',
                                      overflow: 'hidden',
                                      border: '1px solid var(--border)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${(group.checkedInCount / group.totalCount) * 100}%`,
                                        height: '100%',
                                        background: group.allCheckedIn ? 'var(--success)' : 'var(--brand)',
                                        transition: 'width 0.25s ease',
                                      }}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleTeamCheckIn(group)}
                                    className="fluent-btn fluent-btn-secondary"
                                    style={{ fontSize: '11px', padding: '3px 10px' }}
                                  >
                                    {group.allCheckedIn ? 'Uncheck All' : 'Check In All'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleTeamExpand(group.teamKey)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                    }}
                                  >
                                    Collapse
                                  </button>
                                </div>
                              </div>

                              {/* Members Roster Table */}
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                  <thead>
                                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '11px' }}>
                                      <th style={{ padding: '6px 10px', width: '30px' }}>#</th>
                                      <th style={{ padding: '6px 10px', width: '20%' }}>Member Name</th>
                                      <th style={{ padding: '6px 10px', width: '10%' }}>Role</th>
                                      <th style={{ padding: '6px 10px', width: '22%' }}>Email</th>
                                      <th style={{ padding: '6px 10px', width: '14%' }}>Reg Number</th>
                                      <th style={{ padding: '6px 10px', width: '10%' }}>Branch</th>
                                      <th style={{ padding: '6px 10px', width: '14%' }}>Attendance</th>
                                      <th style={{ padding: '6px 10px', width: '8%', textAlign: 'right' }}>Badge</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.members.map((member, mIdx) => {
                                      const isLead = mIdx === 0 || member.role?.toLowerCase().includes('lead');
                                      return (
                                        <tr
                                          key={member.id}
                                          style={{
                                            borderBottom: mIdx < group.members.length - 1 ? '1px solid var(--border)' : 'none',
                                            background: member.checked_in ? 'rgba(16, 124, 65, 0.03)' : 'transparent',
                                          }}
                                        >
                                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{mIdx + 1}</td>
                                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-strong)' }}>
                                            {member.lead_name}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            <span
                                              style={{
                                                fontSize: '10px',
                                                padding: '1px 6px',
                                                borderRadius: '3px',
                                                fontWeight: 600,
                                                background: isLead ? 'rgba(0, 103, 184, 0.1)' : 'var(--bg-soft)',
                                                color: isLead ? 'var(--brand)' : 'var(--text-muted)',
                                                border: isLead ? '1px solid rgba(0, 103, 184, 0.2)' : '1px solid var(--border)',
                                              }}
                                            >
                                              {member.role || (isLead ? 'Leader' : 'Member')}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{member.lead_email}</td>
                                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{member.reg_number}</td>
                                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                            {member.branch || 'N/A'}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            <button
                                              type="button"
                                              onClick={() => toggleCheckIn(member.id)}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '3px 9px',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: member.checked_in ? '1px solid var(--success)' : '1px solid var(--border)',
                                                background: member.checked_in ? 'var(--success-bg)' : 'transparent',
                                                color: member.checked_in ? 'var(--success)' : 'var(--text-muted)',
                                                transition: 'all 0.15s ease',
                                              }}
                                            >
                                              <CheckCircle size={12} />
                                              {member.checked_in ? 'Checked In' : 'Check In'}
                                            </button>
                                          </td>
                                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                            <button
                                              type="button"
                                              onClick={() => setSelectedBadge(member)}
                                              className="fluent-btn fluent-btn-secondary"
                                              style={{ fontSize: '11px', padding: '2px 8px' }}
                                              title={`Print ID Badge for ${member.lead_name}`}
                                            >
                                              <Printer size={11} /> Badge
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Roster Modal */}
      {selectedTeamRoster && (
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
              maxWidth: '500px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="var(--brand)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Team Roster: {selectedTeamRoster.team_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTeamRoster(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {selectedTeamRoster.team_members?.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-soft)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-strong)' }}>
                      {m.name} {idx === 0 && <span style={{ color: 'var(--brand)', fontSize: '11px' }}>(Lead)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  {m.reg_number && (
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-body)' }}>
                      {m.reg_number}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTeamRoster(null)}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Badge / Card Generator Modal */}
      {selectedBadge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              background: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lift)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Toolbar */}
            <div style={{ padding: '12px 16px', background: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Printable Attendee Badge</span>
              <button
                onClick={() => setSelectedBadge(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Physical Badge Body */}
            <div
              id="printable-badge"
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#0f172a',
                background: '#ffffff',
                fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              }}
            >
              {/* Badge Header Strip with Official MSC Logo */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0067b8 0%, #004c87 100%)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 10px rgba(0, 103, 184, 0.2)',
                }}
              >
                <img
                  src="https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/MSC%20Logo.png"
                  alt="MSC Logo"
                  style={{
                    width: '42px',
                    height: '42px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    borderRadius: '6px',
                    padding: '3px',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.9, fontWeight: 700 }}>
                    Official Admission Pass &bull; Chapter &apos;26
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Microsoft Student Community
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                    SRM University-AP &bull; {event.title}
                  </div>
                </div>
              </div>

              {/* Attendee Name */}
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 4px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                {selectedBadge.lead_name}
              </h2>
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 500 }}>
                {selectedBadge.reg_number} {selectedBadge.branch && selectedBadge.branch !== 'N/A' ? `• ${selectedBadge.branch}` : ''} &bull; {selectedBadge.college}
              </div>

              {selectedBadge.team_name && selectedBadge.team_name.toLowerCase() !== 'individual' && selectedBadge.team_name.toLowerCase() !== 'solo' ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0369a1',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  <Users size={13} />
                  <span>Team: {selectedBadge.team_name}</span>
                  {selectedBadge.role && (
                    <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
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
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  <span>Individual Delegate</span>
                </div>
              )}

              {/* High Contrast QR Code for Turnstile Check-in */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{ padding: '10px', background: '#ffffff', border: '2px solid #0067b8', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 103, 184, 0.08)' }}>
                  <QRCodeSVG
                    value={typeof window !== 'undefined' ? `${window.location.origin}/admin/checkin/${selectedBadge.hash_payload}` : `https://msc-srmap.in/admin/checkin/${selectedBadge.hash_payload}`}
                    size={144}
                    level="H"
                  />
                </div>
              </div>

              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all', marginBottom: '4px' }}>
                TOKEN: {selectedBadge.hash_payload}
              </div>
              <div style={{ fontSize: '10px', color: '#0067b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                OFFICIAL TURNSTILE ENTRY PASS &bull; SCAN FOR ADMISSION
              </div>
            </div>

            {/* Print Action Footer */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedBadge(null)}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => window.print()}
                className="fluent-btn fluent-btn-primary"
                style={{ fontSize: '12px' }}
              >
                <Printer size={14} /> Print Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-lift)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--brand)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                  Bulk CSV Attendee Import
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5, marginBottom: '12px' }}>
              Upload an external attendance roster CSV. Supports auto-sync of check-in status and pending approvals:
            </p>
            <div
              style={{
                background: 'var(--bg-soft)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--text-strong)',
                marginBottom: '16px',
                wordBreak: 'break-word',
              }}
            >
              Ticket ID, Role, Name, Email, Reg Num, Mobile, Branch, Team Name, Team Size, Status, Check-in, Registration Date
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download Sample Template (.csv)
              </button>

              {attendees.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setIsDeleteAllModalOpen(true);
                  }}
                  className="fluent-btn fluent-btn-secondary"
                  style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    borderColor: 'rgba(220, 38, 38, 0.3)',
                    background: 'rgba(220, 38, 38, 0.05)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={13} /> Delete Existing Roster ({attendees.length})
                </button>
              )}
            </div>

            {/* Import Mode Selection */}
            <div
              style={{
                background: 'var(--bg-soft)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '8px' }}>
                Import Action Mode:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--text-strong)' }}>Merge & Update</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      Keep existing records, update their check-in/status info, and insert new attendees.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ color: '#dc2626' }}>Replace Entire Roster</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      Delete all {attendees.length} existing attendees for this event first, then upload this CSV cleanly.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px',
                textAlign: 'center',
                background: importMode === 'replace' ? 'rgba(239, 68, 68, 0.03)' : 'var(--bg-soft)',
                marginBottom: '20px',
              }}
            >
              <input
                type="file"
                accept=".csv"
                id="csv-file-input"
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="csv-file-input"
                className={importMode === 'replace' ? 'fluent-btn' : 'fluent-btn fluent-btn-primary'}
                style={{
                  cursor: 'pointer',
                  margin: '0 auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  ...(importMode === 'replace'
                    ? { background: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '13px' }
                    : {}),
                }}
              >
                <Upload size={14} />
                {importMode === 'replace' ? 'Upload & Replace Entire Roster' : 'Choose CSV File to Import'}
              </label>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                UTF-8 encoded comma-separated file
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entire Roster Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-lift)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 6px 0' }}>
                  Delete Current Event Roster?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  This will permanently delete all <strong style={{ color: 'var(--text-strong)' }}>{attendees.length} attendee records</strong> for <strong style={{ color: 'var(--text-strong)' }}>{event.title}</strong> from the database.
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-soft)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--text-body)',
                lineHeight: 1.5,
                marginBottom: '20px',
                border: '1px solid var(--border)',
              }}
            >
              Choose whether you just want to clear the roster, or clear it and immediately upload a replacement CSV file.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isDeletingRoster}
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRoster}
                onClick={() => handleDeleteAllAttendees(false)}
                className="fluent-btn"
                style={{
                  fontSize: '13px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                {isDeletingRoster ? 'Deleting...' : 'Delete Roster'}
              </button>
              <button
                type="button"
                disabled={isDeletingRoster}
                onClick={() => handleDeleteAllAttendees(true)}
                className="fluent-btn fluent-btn-primary"
                style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                Delete & Upload New CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
