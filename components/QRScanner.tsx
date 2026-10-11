'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Users,
  Check,
  UserCheck,
} from 'lucide-react';

export type ScanOutcome = 'idle' | 'success' | 'already_checked_in' | 'invalid';

export interface ScanResult {
  outcome: ScanOutcome;
  message: string;
  name?: string;
  regNum?: string;
  teamName?: string;
  isTeam?: boolean;
  teamMembers?: Array<{ name: string; email: string; reg_number?: string; checked_in?: boolean }>;
  timestamp: string;
  offline?: boolean;
  hashPayload?: string;
}

interface QRScannerProps {
  eventId: string;
  eventTitle?: string;
}

// Simple IndexedDB Helper
const DB_NAME = 'msc_scanner_db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cached_registrations')) {
        db.createObjectStore('cached_registrations', { keyPath: 'hash_payload' });
      }
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export default function QRScanner({ eventId, eventTitle }: QRScannerProps) {
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [cachingInProgress, setCachingInProgress] = useState(false);
  const [syncingInProgress, setSyncingInProgress] = useState(false);
  const [teamModalData, setTeamModalData] = useState<ScanResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // The scanner callback is handed to html5-qrcode once, at start time, so it
  // closes over the first render. Mutable UI state (the sound toggle) is read
  // through a ref instead, otherwise toggling it after mount has no effect on
  // scan feedback.
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Audio and Haptic Synthesizer
  const playFeedback = (outcome: ScanOutcome) => {
    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (outcome === 'success') {
          navigator.vibrate([100]);
        } else if (outcome === 'already_checked_in') {
          navigator.vibrate([200, 100, 200]);
        } else {
          navigator.vibrate([400]);
        }
      } catch {
        // Ignored if unsupported
      }
    }

    // Audio cue
    if (!soundEnabledRef.current || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (outcome === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high ding
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (outcome === 'already_checked_in') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 double tone
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3 error buzz
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // Audio autoplay restrictions
    }
  };

  // Check counts in IndexedDB
  const updateDBCounts = useCallback(async () => {
    try {
      const db = await openDB();
      const countRegs = new Promise<number>((res) => {
        const tx = db.transaction('cached_registrations', 'readonly');
        const store = tx.objectStore('cached_registrations');
        const countReq = store.count();
        countReq.onsuccess = () => res(countReq.result);
      });
      const countQueue = new Promise<number>((res) => {
        const tx = db.transaction('offline_queue', 'readonly');
        const store = tx.objectStore('offline_queue');
        const countReq = store.count();
        countReq.onsuccess = () => res(countReq.result);
      });
      const [rCount, qCount] = await Promise.all([countRegs, countQueue]);
      setCachedCount(rCount);
      setPendingQueueCount(qCount);
    } catch {
      // IndexedDB not ready
    }
  }, []);

  // Cache Registrations for offline use
  const cacheRegistrations = async () => {
    setCachingInProgress(true);
    try {
      const res = await fetch(`/api/admin/registrations?event_id=${eventId}&limit=1000`);
      let records: any[] = [];
      if (res.ok) {
        const data = await res.json();
        records = data.registrations || [];
      }

      // Cache real records without injecting mock data

      const db = await openDB();
      const tx = db.transaction('cached_registrations', 'readwrite');
      const store = tx.objectStore('cached_registrations');
      records.forEach((rec) => {
        store.put({
          hash_payload: rec.hash_payload || rec.id,
          event_id: rec.event_id || eventId,
          lead_name: rec.lead_name || rec.name,
          reg_number: rec.reg_number || rec.registration_number,
          team_name: rec.team_name || '',
          team_members: rec.team_members || [],
          checked_in: rec.checked_in || false,
          checked_in_at: rec.checked_in_at || null,
        });
      });

      await new Promise((resolve) => (tx.oncomplete = resolve));
      await updateDBCounts();
    } catch (err) {
      console.error('Failed to cache registrations:', err);
    } finally {
      setCachingInProgress(false);
    }
  };

  // Sync Offline Queue to server
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncingInProgress(true);
    try {
      const db = await openDB();
      const tx = db.transaction('offline_queue', 'readonly');
      const store = tx.objectStore('offline_queue');
      const request = store.getAll();

      const items: any[] = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || []);
      });

      if (items.length === 0) {
        setSyncingInProgress(false);
        return;
      }

      for (const item of items) {
        try {
          await fetch('/api/admin/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: item.event_id,
              hash_payload: item.hash_payload,
              checkin_type: item.checkin_type,
            }),
          });
          // Delete from queue
          const deleteTx = db.transaction('offline_queue', 'readwrite');
          deleteTx.objectStore('offline_queue').delete(item.id);
        } catch {
          // Keep in queue for next sync
        }
      }
      await updateDBCounts();
    } catch (err) {
      console.error('Offline queue sync error:', err);
    } finally {
      setSyncingInProgress(false);
    }
  }, [updateDBCounts]);

  // Online / Offline listener
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateDBCounts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue, updateDBCounts]);

  // Camera Scanner Lifecycle
  //
  // html5-qrcode is asynchronous and stateful: `stop()` throws
  // "Cannot stop, scanner is not running or paused." whenever the scanner is
  // not past NOT_STARTED — i.e. `start()` is still pending, `start()` failed,
  // or it was already stopped. React StrictMode also mounts effects twice in
  // development (mount -> start -> immediate cleanup -> stop), which lands
  // squarely in that window, logged the console error and could leave the
  // camera running with nobody to stop it.
  //
  // So: start/stop requests are queued and applied strictly in order, and each
  // one checks the scanner state before touching it.
  const scanOpsRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueScanOp = (operation: () => Promise<void>) => {
    scanOpsRef.current = scanOpsRef.current.then(operation).catch((err) => {
      console.error('Scanner lifecycle operation failed:', err);
    });
  };

  const startScanner = async () => {
    if (scannerRef.current) return; // already started (queued after a start)

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
      );
      setScannerActive(true);
    } catch (err) {
      console.error('Failed to start camera scanner:', err);
      // The instance never reached a scanning state; drop it so the next
      // queued start begins clean.
      scannerRef.current = null;
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScannerActive(false);
    if (!scanner) return;

    try {
      // NOT_STARTED means the camera never opened (start() failed, or the
      // instance was already stopped) — stop() would throw and there is
      // nothing to release.
      if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
        await scanner.stop();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      try {
        // Empty the viewport so a re-queued start() does not stack a second
        // video element on top of the old one. Only throws while scanning.
        scanner.clear();
      } catch {
        // Nothing to clear.
      }
    }
  };

  useEffect(() => {
    enqueueScanOp(startScanner);
    return () => {
      enqueueScanOp(stopScanner);
    };
  }, []);

  // Process a Scanned Code
  const processCheckin = async (hash: string, teamMode?: 'all' | 'lead_only') => {
    let result: ScanResult;

    // 1. Try Online API if network is available
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/admin/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            hash_payload: hash,
            team_mode: teamMode,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          result = {
            outcome: 'invalid',
            message: data.error || 'Invalid or unverified ticket identifier.',
            timestamp: new Date().toLocaleTimeString(),
            hashPayload: hash,
          };
        } else if (data.already_checked_in) {
          result = {
            outcome: 'already_checked_in',
            message: `Already Checked In at ${data.checked_in_at || 'prior turnstile'}`,
            name: data.participant_name || 'Participant',
            regNum: data.registration_number,
            teamName: data.team_name,
            timestamp: new Date().toLocaleTimeString(),
            hashPayload: hash,
          };
        } else {
          result = {
            outcome: 'success',
            message: 'Admission Check-in Confirmed!',
            name: data.participant_name || 'Participant',
            regNum: data.registration_number,
            teamName: data.team_name,
            isTeam: Boolean(data.team_name),
            teamMembers: data.team_members || [],
            timestamp: new Date().toLocaleTimeString(),
            hashPayload: hash,
          };
        }

        setScanResult(result);
        playFeedback(result.outcome);
        setRecentScans((prev) => [result, ...prev.slice(0, 9)]);

        // If team detected and no mode specified, prompt team modal
        if (result.outcome === 'success' && result.isTeam && !teamMode && (result.teamMembers?.length || 0) > 1) {
          setTeamModalData(result);
        }
        return;
      } catch {
        // Fallback to offline validation
      }
    }

    // 2. Offline Mode with IndexedDB
    try {
      const db = await openDB();
      const tx = db.transaction('cached_registrations', 'readonly');
      const store = tx.objectStore('cached_registrations');
      const req = store.get(hash);

      const cachedRec = await new Promise<any>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!cachedRec) {
        result = {
          outcome: 'invalid',
          message: 'Ticket not found in local cache (Offline Mode).',
          timestamp: new Date().toLocaleTimeString(),
          offline: true,
          hashPayload: hash,
        };
      } else if (cachedRec.checked_in) {
        result = {
          outcome: 'already_checked_in',
          message: `Already Checked In (Offline Cache)`,
          name: cachedRec.lead_name,
          regNum: cachedRec.reg_number,
          teamName: cachedRec.team_name,
          timestamp: new Date().toLocaleTimeString(),
          offline: true,
          hashPayload: hash,
        };
      } else {
        // Mark locally checked in
        const writeTx = db.transaction(['cached_registrations', 'offline_queue'], 'readwrite');
        cachedRec.checked_in = true;
        cachedRec.checked_in_at = new Date().toISOString();
        writeTx.objectStore('cached_registrations').put(cachedRec);

        // Queue for server sync
        writeTx.objectStore('offline_queue').add({
          event_id: eventId,
          hash_payload: hash,
          checkin_type: teamMode || 'standard',
          timestamp: new Date().toISOString(),
        });

        await new Promise((resolve) => (writeTx.oncomplete = resolve));
        await updateDBCounts();

        result = {
          outcome: 'success',
          message: 'Check-in Granted (Queued Offline for Sync)',
          name: cachedRec.lead_name,
          regNum: cachedRec.reg_number,
          teamName: cachedRec.team_name,
          isTeam: Boolean(cachedRec.team_name),
          teamMembers: cachedRec.team_members,
          timestamp: new Date().toLocaleTimeString(),
          offline: true,
          hashPayload: hash,
        };
      }

      setScanResult(result);
      playFeedback(result.outcome);
      setRecentScans((prev) => [result, ...prev.slice(0, 9)]);

      if (result.outcome === 'success' && result.isTeam && !teamMode && (result.teamMembers?.length || 0) > 1) {
        setTeamModalData(result);
      }
    } catch (err) {
      const errResult: ScanResult = {
        outcome: 'invalid',
        message: 'Offline validation failed.',
        timestamp: new Date().toLocaleTimeString(),
        offline: true,
      };
      setScanResult(errResult);
      playFeedback('invalid');
    }
  };

  const checkInSingleMember = async (memberId: string | undefined, memberEmail: string, hashPayload: string) => {
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          hash_payload: hashPayload,
          member_id: memberId && !memberId.includes('-m-') ? memberId : undefined,
          member_email: memberEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamModalData((prev) => {
          if (!prev) return null;
          const updated = (prev.teamMembers || []).map((m: any) => {
            if (m.id === memberId || m.email === memberEmail) {
              return { ...m, checked_in: true };
            }
            return m;
          });
          return { ...prev, teamMembers: updated };
        });
        playFeedback('success');
      }
    } catch (err) {
      console.error('Member checkin error:', err);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // pause()/resume() both throw unless the scanner is in the matching state,
    // so check before calling: a second callback can land before the pause
    // takes effect, and the 2s cooldown below can outlive the component.
    const scanner = scannerRef.current;
    if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      scanner.pause();
    }

    let hash = decodedText.trim();
    if (hash.includes('/admin/checkin/')) {
      hash = hash.split('/admin/checkin/')[1].split('?')[0];
    } else if (hash.includes('/ticket/')) {
      hash = hash.split('/ticket/')[1].split('?')[0];
    }

    await processCheckin(hash);

    setTimeout(() => {
      const active = scannerRef.current;
      if (active && active.getState() === Html5QrcodeScannerState.PAUSED) {
        active.resume();
      }
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Turnstile Status & Toolbar */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-rest)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOnline ? <Wifi size={18} color="var(--success)" /> : <WifiOff size={18} color="var(--warning)" />}
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-strong)' }}>
              {isOnline ? 'Network Online' : 'Offline Mode Active'}
            </span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} />
            <span>Cached Attendee DB: <strong>{cachedCount}</strong></span>
          </div>
          {pendingQueueCount > 0 && (
            <span className="fluent-badge badge-warning" style={{ fontSize: '11px' }}>
              {pendingQueueCount} Scans Queued Offline
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={cacheRegistrations}
            disabled={cachingInProgress}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            title="Download attendee records for offline emergency turnstile check"
          >
            <Database size={14} /> {cachingInProgress ? 'Caching...' : 'Cache Registrations'}
          </button>

          {pendingQueueCount > 0 && isOnline && (
            <button
              onClick={syncOfflineQueue}
              disabled={syncingInProgress}
              className="fluent-btn fluent-btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <RefreshCw size={14} className={syncingInProgress ? 'spin' : ''} />
              {syncingInProgress ? 'Syncing...' : `Sync Queue (${pendingQueueCount})`}
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="fluent-btn fluent-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Sound Cues {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        {/* Scanner Viewport Column */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-rest)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                Live Camera Scanner
              </h2>
              {eventTitle && (
                <span style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 500 }}>
                  {eventTitle}
                </span>
              )}
            </div>
            <span className="fluent-badge badge-success">Live Viewfinder</span>
          </div>

          {/* html5-qrcode video viewport */}
          <div
            id="qr-reader"
            style={{
              width: '100%',
              maxWidth: '380px',
              minHeight: '280px',
              background: '#0a0a0c',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          />

          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
            Present an attendee digital pass or physical badge QR code.
          </span>
        </div>

        {/* Scan Status & Session Turnstile History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {scanResult ? (
            <div
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-sm)',
                border: '2px solid',
                background:
                  scanResult.outcome === 'success'
                    ? 'var(--success-bg)'
                    : scanResult.outcome === 'already_checked_in'
                    ? 'var(--warning-bg)'
                    : 'var(--danger-bg)',
                borderColor:
                  scanResult.outcome === 'success'
                    ? 'var(--success)'
                    : scanResult.outcome === 'already_checked_in'
                    ? 'var(--warning)'
                    : 'var(--danger)',
                color:
                  scanResult.outcome === 'success'
                    ? 'var(--success)'
                    : scanResult.outcome === 'already_checked_in'
                    ? 'var(--warning)'
                    : 'var(--danger)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                {scanResult.outcome === 'success' && <CheckCircle2 size={28} />}
                {scanResult.outcome === 'already_checked_in' && <AlertTriangle size={28} />}
                {scanResult.outcome === 'invalid' && <XCircle size={28} />}
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
                  {scanResult.outcome === 'success' && (scanResult.offline ? 'CHECK-IN QUEUED (OFFLINE)' : 'CHECK-IN GRANTED')}
                  {scanResult.outcome === 'already_checked_in' && 'ALREADY CHECKED IN'}
                  {scanResult.outcome === 'invalid' && 'INVALID TICKET'}
                </h3>
              </div>

              <p style={{ fontSize: '14px', margin: '0 0 12px 0', fontWeight: 500 }}>
                {scanResult.message}
              </p>

              {scanResult.name && (
                <div style={{ background: 'rgba(255,255,255,0.7)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--text-strong)', fontSize: '13px' }}>
                  <div><strong>Participant:</strong> {scanResult.name}</div>
                  {scanResult.regNum && <div><strong>Reg Number:</strong> {scanResult.regNum}</div>}
                  {scanResult.teamName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Users size={14} color="var(--brand)" />
                      <strong>Team:</strong> {scanResult.teamName}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '36px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Camera size={36} color="var(--brand)" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>
                Ready to scan. Present an attendee ticket QR to record check-in.
              </p>
            </div>
          )}

          {/* Recent Scans Turnstile History */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              flex: 1,
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '12px' }}>
              Turnstile Session History
            </h3>
            {recentScans.length === 0 ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No scans recorded this turnstile session yet.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {recentScans.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-soft)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-strong)' }}>{s.name || 'Unverified'}</strong>
                      {s.teamName && <span style={{ color: 'var(--brand)', marginLeft: '6px' }}>({s.teamName})</span>}
                      <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>{s.message}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{s.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Check-in Options Modal */}
      {teamModalData && (
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
              maxWidth: '520px',
              width: '100%',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Users size={22} color="var(--brand)" />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
                Team Turnstile Check-In
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-body)', marginBottom: '16px', lineHeight: 1.4 }}>
              Scanned ticket belongs to team <strong>{teamModalData.teamName}</strong> ({teamModalData.teamMembers?.length || 'Multiple'} members). Choose your check-in action:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => {
                  processCheckin(teamModalData.hashPayload!, 'all');
                  setTeamModalData(null);
                }}
                className="fluent-btn fluent-btn-primary"
                style={{ justifyContent: 'center', padding: '10px', fontSize: '13px', fontWeight: 600 }}
              >
                <Users size={16} /> Check In Entire Team ({teamModalData.teamMembers?.length || 'All'} Members)
              </button>

              <button
                type="button"
                onClick={() => {
                  processCheckin(teamModalData.hashPayload!, 'lead_only');
                  setTeamModalData(null);
                }}
                className="fluent-btn fluent-btn-secondary"
                style={{ justifyContent: 'center', padding: '9px', fontSize: '13px' }}
              >
                <UserCheck size={16} /> Check In Scanned Attendee Only ({teamModalData.name})
              </button>
            </div>

            {/* Granular Individual Member Check-In Roster */}
            {teamModalData.teamMembers && teamModalData.teamMembers.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-strong)', display: 'block', marginBottom: '8px' }}>
                  Or Check In Members Individually:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {teamModalData.teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: member.checked_in ? 'rgba(16, 124, 65, 0.08)' : 'var(--bg-soft)',
                        border: member.checked_in ? '1px solid rgba(16, 124, 65, 0.3)' : '1px solid var(--border)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-strong)' }}>{member.name}</strong>
                        {member.reg_number && member.reg_number !== 'N/A' && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
                            {member.reg_number}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => checkInSingleMember((member as any).id, member.email, teamModalData.hashPayload!)}
                        disabled={member.checked_in}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: member.checked_in ? 'default' : 'pointer',
                          border: member.checked_in ? '1px solid var(--success)' : '1px solid var(--brand)',
                          background: member.checked_in ? 'var(--success-bg)' : 'var(--brand)',
                          color: member.checked_in ? 'var(--success)' : '#ffffff',
                        }}
                      >
                        {member.checked_in ? (
                          <>
                            <Check size={11} /> Checked In
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setTeamModalData(null)}
                className="fluent-btn fluent-btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
