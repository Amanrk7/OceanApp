// pages/ShiftsPage.jsx  ── FIXED VERSION
// Key changes:
//   • handleStartShift now calls POST /api/shifts/start and stores the DB-assigned shift.id
//   • handleEndShift   calls PATCH /api/shifts/:id/end (no more manual duration calc on client)
//   • useEffect on mount fetches the active shift so the button state survives page refresh
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { ShiftStatusContext } from '../Context/membershiftStatus.jsx';
import { CurrentUserContext } from '../Context/currentUser.jsx';
import { api } from '../api';

// ─── Style constants ──────────────────────────────────────────────
const CARD = {
    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '28px 32px',
};
const TH = {
    textAlign: 'left', padding: '10px 20px', fontWeight: '600',
    color: '#64748b', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap', background: '#f8fafc',
};
const TD = {
    padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
    fontSize: '13px', color: '#0f172a',
};

export const ShiftsPage = () => {
    // Stores the DB-assigned shift id while a shift is active
    const activeShiftIdRef = useRef(null);

    const { shiftActive, setShiftActive } = useContext(ShiftStatusContext);
    const { usr } = useContext(CurrentUserContext);

    const [pastShifts, setPastShifts] = useState([]);
    const [activeShift, setActiveShift] = useState(null); // DB row for currently active shift
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ── Restore state on mount ──────────────────────────────────────
    useEffect(() => {
        if (!usr?.role) return;

        const restore = async () => {
            try {
                // 1. Check if there's an open shift in the DB (survives page refresh)
                const activeRes = await api.shifts.getActiveShift(usr.role);
                if (activeRes?.data) {
                    activeShiftIdRef.current = activeRes.data.id;
                    setActiveShift(activeRes.data);
                    setShiftActive(true); // sync the context so other pages know
                }
                // 2. Load shift history
                const historyRes = await api.shifts.getShifts(usr.role);
                setPastShifts(historyRes?.data || []);
            } catch (e) {
                console.error('Shift restore error:', e);
            }
        };
        restore();
    }, [usr?.role]);

    // Auto-clear alerts
    useEffect(() => {
        if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
    }, [success]);
    useEffect(() => {
        if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
    }, [error]);

    // ── Start Shift ─────────────────────────────────────────────────
    const handleStartShift = async () => {
        try {
            setLoading(true);
            const res = await api.shifts.startShift({ teamRole: usr?.role });
            if (!res?.data) throw new Error('No shift data returned');
            activeShiftIdRef.current = res.data.id;
            setActiveShift(res.data);
            setShiftActive(true);
            setSuccess('Shift started successfully!');
        } catch (err) {
            setError(err.message || 'Failed to start shift');
        } finally {
            setLoading(false);
        }
    };

    // ── End Shift ───────────────────────────────────────────────────
    const handleEndShift = async () => {
        const shiftId = activeShiftIdRef.current;
        if (!shiftId) return;
        try {
            setLoading(true);
            await api.shifts.endShift(shiftId);
            activeShiftIdRef.current = null;
            setActiveShift(null);
            setShiftActive(false);
            setSuccess('Shift recorded successfully!');
            // Refresh history
            const historyRes = await api.shifts.getShifts(usr?.role);
            setPastShifts(historyRes?.data || []);
        } catch (err) {
            setError(err.message || 'Failed to end shift');
        } finally {
            setLoading(false);
        }
    };

    const fmtTime = (iso) =>
        iso ? new Date(iso).toLocaleTimeString('en-US', {
            timeZone: 'America/Chicago',
            hour: '2-digit', minute: '2-digit', hour12: true
        }) : '—';

    const fmtDate = (iso) =>
        iso ? new Date(iso).toLocaleDateString('en-US', {
            timeZone: 'America/Chicago',
            month: 'short', day: 'numeric', year: 'numeric'
        }) : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Status Banner ── */}
            <div style={{
                padding: '14px 18px',
                background: shiftActive ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${shiftActive ? '#86efac' : '#fcd34d'}`,
                borderLeft: `4px solid ${shiftActive ? '#16a34a' : '#f59e0b'}`,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '12px',
            }}>
                {shiftActive
                    ? <CheckCircle style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
                    : <AlertCircle style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0 }} />}
                <div>
                    <p style={{ margin: '0 0 2px', fontWeight: '700', color: shiftActive ? '#166534' : '#92400e', fontSize: '14px' }}>
                        {shiftActive ? 'Shift is Active' : 'No Active Shift'}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: shiftActive ? '#4ade80' : '#b45309', lineHeight: '1.4' }}>
                        {shiftActive
                            ? `Started at ${fmtTime(activeShift?.startTime)} — you can now record transactions and bonuses`
                            : 'Start a shift to begin recording transactions and activities'}
                    </p>
                </div>
            </div>

            {/* ── Alerts ── */}
            {success && (
                <div style={{ padding: '11px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {success}
                </div>
            )}
            {error && (
                <div style={{ padding: '11px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* ── Shift Control Card ── */}
            <div style={CARD}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Clock style={{ width: '22px', height: '22px', color: '#2563eb' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                                Shift Management
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                {shiftActive ? 'Your shift is currently active' : 'Start a new shift to begin working'}
                            </p>
                        </div>
                    </div>

                    {shiftActive ? (
                        <button onClick={handleEndShift} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '12px 24px', background: '#dc2626', color: '#fff',
                            border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px',
                            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                        }}>
                            {loading
                                ? <><RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</>
                                : 'End Shift'}
                        </button>
                    ) : (
                        <button onClick={handleStartShift} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '12px 24px', background: '#16a34a', color: '#fff',
                            border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px',
                            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                        }}>
                            {loading
                                ? <><RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Starting…</>
                                : 'Start Shift'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Past Shifts Ledger ── */}
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                        Past Shifts Log
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                        History of completed work shifts ({pastShifts.filter(s => !s.isActive).length})
                    </p>
                </div>

                {pastShifts.filter(s => !s.isActive).length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th style={TH}>Date</th>
                                    <th style={TH}>Start</th>
                                    <th style={TH}>End</th>
                                    <th style={TH}>Duration</th>
                                    <th style={{ ...TH, textAlign: 'center' }}>Transactions</th>
                                    <th style={{ ...TH, textAlign: 'center' }}>Net Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pastShifts.filter(s => !s.isActive).map(shift => (
                                    <tr key={shift.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ ...TD, fontWeight: '600' }}>{fmtDate(shift.startTime)}</td>
                                        <td style={TD}>{fmtTime(shift.startTime)}</td>
                                        <td style={TD}>{fmtTime(shift.endTime)}</td>
                                        <td style={TD}>
                                            <span style={{ display: 'inline-block', padding: '3px 9px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: '500', color: '#475569' }}>
                                                {shift.duration != null ? `${shift.duration} min` : '—'}
                                            </span>
                                        </td>
                                        <td style={{ ...TD, textAlign: 'center', color: '#475569' }}>
                                            {shift.stats ? shift.stats.transactionCount : '—'}
                                        </td>
                                        <td style={{ ...TD, textAlign: 'center', fontWeight: '700', color: shift.stats?.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                                            {shift.stats ? `$${shift.stats.netProfit.toLocaleString()}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '60px 28px', textAlign: 'center' }}>
                        <div style={{ width: '52px', height: '52px', background: '#f1f5f9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                            <Clock style={{ width: '24px', height: '24px', color: '#cbd5e1' }} />
                        </div>
                        <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#475569' }}>No Past Shifts</p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Your completed shift reports will appear here</p>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};