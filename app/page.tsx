"use client";

import React, { useState, useEffect } from 'react';

export default function AlticsKiosk() {
  const [activeTab, setActiveTab] = useState('kiosk');
  const [scanMode, setScanMode] = useState('CHECK_IN');
  const [scanStatus, setScanStatus] = useState<{ type: string; message: string } | null>(null);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [employees, setEmployees] = useState([
    { id: 'EMP-101', name: 'Aarav Sharma', department: 'Development', role: 'Software Engineer', phone: '+91 98221 55432', hasFaceRegistered: true },
    { id: 'EMP-102', name: 'Priya Deshmukh', department: 'Design', role: 'UI/UX Lead', phone: '+91 97634 11223', hasFaceRegistered: true },
    { id: 'EMP-103', name: 'Rohan Kulkarni', department: 'Marketing', role: 'Growth Specialist', phone: '+91 95512 88990', hasFaceRegistered: false },
    { id: 'EMP-104', name: 'Ananya Patil', department: 'Operations', role: 'Project Manager', phone: '+91 94233 77665', hasFaceRegistered: true },
    { id: 'EMP-105', name: 'Vikram Joshi', department: 'Development', role: 'Backend Engineer', phone: '+91 91199 44332', hasFaceRegistered: true }
  ]);

  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: 'LOG-1', empId: 'EMP-101', name: 'Aarav Sharma', type: 'CHECK_IN', time: '09:02 AM', status: 'Verified (Face + QR)', synced: true },
    { id: 'LOG-2', empId: 'EMP-102', name: 'Priya Deshmukh', type: 'CHECK_IN', time: '09:15 AM', status: 'Verified (Face + QR)', synced: true }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Development');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const saved = localStorage.getItem('altics_attendance_logs');
    if (saved) {
      try { setAttendanceLogs(JSON.parse(saved)); } catch (e) {}
    }

    const handleOnline = () => {
      setIsOnline(true);
      setScanStatus({ type: 'info', message: 'Internet restored! Syncing offline logs...' });
      setTimeout(() => {
        setAttendanceLogs(prev => prev.map(log => ({ ...log, synced: true })));
        setScanStatus({ type: 'success', message: 'All offline attendance records synced!' });
      }, 1200);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('altics_attendance_logs', JSON.stringify(attendanceLogs));
    setPendingSyncCount(attendanceLogs.filter(l => !l.synced).length);
  }, [attendanceLogs]);

  const playBeep = (success = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (success ? 0.15 : 0.4));
    } catch (e) {}
  };

  const processScanWithBiometrics = (scannedId: string) => {
    const cleanId = scannedId.trim();
    const employee = employees.find(e => e.id === cleanId || e.name.toLowerCase() === cleanId.toLowerCase());

    if (!employee) {
      playBeep(false);
      setScanStatus({ type: 'error', message: `Unknown Badge ID: "${cleanId}". Access Denied.` });
      return;
    }

    setVerifyingFace(true);
    setScanStatus({ type: 'info', message: `Scanning QR for ${employee.name}... Verifying Biometrics.` });

    setTimeout(() => {
      setVerifyingFace(false);

      if (!employee.hasFaceRegistered) {
        playBeep(false);
        setScanStatus({
          type: 'error',
          message: `Biometric Mismatch / Face Not Registered for ${employee.name}!`
        });
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const computedStatus = (scanMode === 'CHECK_IN' && now.getHours() >= 10)
        ? 'Late Arrival (Verified)'
        : 'Verified (Face + QR)';

      const newLog = {
        id: 'LOG-' + Date.now(),
        empId: employee.id,
        name: employee.name,
        type: scanMode,
        time: timeStr,
        status: computedStatus,
        synced: isOnline
      };

      setAttendanceLogs(prev => [newLog, ...prev]);
      playBeep(true);

      const modeLabels: Record<string, string> = {
        CHECK_IN: 'Checked In Successfully',
        LUNCH_OUT: 'Lunch Out Recorded',
        LUNCH_IN: 'Returned from Lunch',
        CHECK_OUT: 'Checked Out for the Day'
      };

      const syncNote = isOnline ? '[Synced]' : '[Saved Offline]';
      setScanStatus({ type: 'success', message: `${employee.name} — ${modeLabels[scanMode]} ${syncNote}` });
    }, 900);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName) return;
    const newId = 'EMP-10' + (employees.length + 1);
    setEmployees([...employees, {
      id: newId,
      name: newEmpName,
      department: newEmpDept,
      role: newEmpRole || 'Staff Member',
      phone: newEmpPhone || '+91 90000 00000',
      hasFaceRegistered: true
    }]);
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpPhone('');
    setShowAddModal(false);
  };

  // Inline styles so it works with zero external CSS setup
  const s = {
    page: { minHeight: '100vh', backgroundColor: '#020617', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 },
    header: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', padding: '16px 24px', display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
    brandWrap: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoBox: { backgroundColor: '#4f46e5', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' },
    subtitle: { fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' },
    badgeOnline: { fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', backgroundColor: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: isOnline ? '#34d399' : '#fbbf24', border: `1px solid ${isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` },
    nav: { display: 'flex', backgroundColor: '#020617', padding: '6px', borderRadius: '12px', border: '1px solid #1e293b', gap: '4px' },
    navBtn: (active: boolean) => ({ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: active ? '#4f46e5' : 'transparent', color: active ? '#ffffff' : '#94a3b8' }),
    main: { maxWidth: '1200px', margin: '0 auto', padding: '24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' },
    card: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '20px' },
    modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' },
    modeBtn: (active: boolean, color: string) => ({ padding: '14px', borderRadius: '12px', border: `1px solid ${active ? color : '#1e293b'}`, backgroundColor: active ? `${color}22` : '#020617', color: active ? color : '#94a3b8', fontWeight: 700, fontSize: '14px', cursor: 'pointer', textAlign: 'left' as const }),
    scannerBox: { width: '240px', height: '240px', margin: '24px auto', border: '2px dashed #6366f1', borderRadius: '24px', backgroundColor: '#020617', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', position: 'relative' as const, textAlign: 'center' as const, padding: '16px' },
    alert: (type: string) => ({ padding: '14px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, marginTop: '16px', backgroundColor: type === 'success' ? 'rgba(16,185,129,0.15)' : type === 'error' ? 'rgba(244,63,94,0.15)' : 'rgba(59,130,246,0.15)', color: type === 'success' ? '#6ee7b7' : type === 'error' ? '#fda4af' : '#93c5fd', border: `1px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#f43f5e' : '#3b82f6'}` }),
    testBtn: { backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
    logItem: { backgroundColor: '#020617', border: '1px solid #1e293b', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    primaryBtn: { backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    input: { width: '100%', boxSizing: 'border-box' as const, backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px', color: '#ffffff', fontSize: '14px', marginTop: '6px', marginBottom: '14px' },
    modalOverlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.brandWrap}>
          <div style={s.logoBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 18c1.5-2 8.5-2 10 0" />
            </svg>
          </div>
          <div>
            <h1 style={s.title}>Altics Biometric Kiosk</h1>
            <p style={s.subtitle}>Office Entrance Biometric Terminal</p>
          </div>
        </div>

        <div style={s.badgeOnline}>
          {isOnline ? (pendingSyncCount > 0 ? `Syncing (${pendingSyncCount})...` : '● Cloud Synced') : `● Offline Mode (${pendingSyncCount} queued)`}
        </div>

        <nav style={s.nav}>
          <button style={s.navBtn(activeTab === 'kiosk')} onClick={() => setActiveTab('kiosk')}>Kiosk Terminal</button>
          <button style={s.navBtn(activeTab === 'employees')} onClick={() => setActiveTab('employees')}>Badges ({employees.length})</button>
          <button style={s.navBtn(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>Master Sheet</button>
        </nav>
      </header>

      <main style={s.main}>
        {activeTab === 'kiosk' && (
          <div style={s.grid}>
            <div>
              <div style={s.card}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Select Kiosk Action Mode</div>
                <div style={s.modeGrid}>
                  <button style={s.modeBtn(scanMode === 'CHECK_IN', '#10b981')} onClick={() => setScanMode('CHECK_IN')}>✓ Check-In</button>
                  <button style={s.modeBtn(scanMode === 'LUNCH_OUT', '#f59e0b')} onClick={() => setScanMode('LUNCH_OUT')}>☕ Lunch Out</button>
                  <button style={s.modeBtn(scanMode === 'LUNCH_IN', '#3b82f6')} onClick={() => setScanMode('LUNCH_IN')}>⏱ Post-Lunch</button>
                  <button style={s.modeBtn(scanMode === 'CHECK_OUT', '#f43f5e')} onClick={() => setScanMode('CHECK_OUT')}>↪ Check-Out</button>
                </div>
              </div>

              <div style={s.card}>
                <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>● Altics Terminal Active</div>
                <div style={s.scannerBox}>
                  {verifyingFace ? (
                    <div style={{ color: '#818cf8', fontWeight: 700, fontSize: '14px' }}>Matching Biometrics...</div>
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ marginBottom: '10px' }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Present Badge & Face</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Instant Local Verification</div>
                    </>
                  )}
                </div>

                {scanStatus && <div style={s.alert(scanStatus.type)}>{scanStatus.message}</div>}

                <div style={{ marginTop: '20px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Tap Staff Name to Simulate Scan:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {employees.map(emp => (
                      <button key={emp.id} style={s.testBtn} onClick={() => processScanWithBiometrics(emp.id)}>
                        {emp.name} {!emp.hasFaceRegistered ? '⚠️' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#cbd5e1' }}>Live Activity Stream</span>
                <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>{attendanceLogs.length} Total</span>
              </div>
              {attendanceLogs.map(log => (
                <div key={log.id} style={s.logItem}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{log.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      <span style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>{log.type.replace('_', ' ')}</span>
                      {log.time}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: log.synced ? '#34d399' : '#fbbf24' }}>
                    {log.synced ? 'Synced' : 'Offline Queue'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>Staff Badges & Biometrics</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Cached locally on the Altics terminal.</p>
              </div>
              <button style={s.primaryBtn} onClick={() => setShowAddModal(true)}>+ Enroll New Staff</button>
            </div>

            <div style={s.grid}>
              {employees.map(emp => (
                <div key={emp.id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: '6px' }}>{emp.id}</span>
                      <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px' }}>{emp.name}</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{emp.role} • {emp.department}</p>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '8px' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#0f172a">
                        <rect x="2" y="2" width="8" height="8" />
                        <rect x="14" y="2" width="8" height="8" />
                        <rect x="2" y="14" width="8" height="8" />
                        <rect x="14" y="14" width="4" height="4" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: emp.hasFaceRegistered ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                      {emp.hasFaceRegistered ? '✓ Face Enrolled' : '⚠ Face Pending'}
                    </span>
                    <button style={s.testBtn} onClick={() => setSelectedBadge(emp)}>Print Badge</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={s.card}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>Altics Master Attendance Log</h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8' }}>All scans logged with offline sync status.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Action</th>
                    <th style={{ padding: '12px' }}>Time</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{log.name} ({log.empId})</td>
                      <td style={{ padding: '12px' }}>{log.type.replace('_', ' ')}</td>
                      <td style={{ padding: '12px' }}>{log.time}</td>
                      <td style={{ padding: '12px', color: log.synced ? '#34d399' : '#fbbf24' }}>{log.synced ? 'Synced' : 'Queued'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.card, width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Enroll New Staff Member</h3>
            <form onSubmit={handleAddEmployee}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Full Name</label>
              <input style={s.input} type="text" required value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="e.g. Rahul Verma" />
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Department</label>
              <select style={s.input} value={newEmpDept} onChange={e => setNewEmpDept(e.target.value)}>
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
              </select>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Role</label>
              <input style={s.input} type="text" value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)} placeholder="e.g. Coordinator" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" style={s.testBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" style={s.primaryBtn}>Save & Enroll</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div style={s.modalOverlay}>
          <div style={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px' }}>ALTICS BIOMETRIC ID</div>
            <div style={{ margin: '20px auto', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '16px', display: 'inline-block' }}>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="#0f172a">
                <rect x="2" y="2" width="8" height="8" />
                <rect x="14" y="2" width="8" height="8" />
                <rect x="2" y="14" width="8" height="8" />
                <rect x="14" y="14" width="4" height="4" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{selectedBadge.name}</h3>
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>{selectedBadge.role}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{selectedBadge.department} • {selectedBadge.id}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#e2e8f0', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedBadge(null)}>Close</button>
              <button style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}