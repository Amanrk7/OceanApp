import { useState, useEffect } from 'react';
import { Shield, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// ============================================================
// ShiftStartModal — Pre-shift balance confirmation
// Shows when a member starts their shift, requires them to
// confirm the current live balance before proceeding.
//
// Usage in TeamDashboard.jsx:
//   <ShiftStartModal
//     shift={activeShift}
//     currentBalance={liveBalance}
//     onConfirm={() => setShowStartModal(false)}
//   />
// ============================================================

export default function ShiftStartModal({ shift, currentBalance, onConfirm }) {
    const [confirmedBalance, setConfirmedBalance] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('confirm'); // 'confirm' | 'success'

    const expectedBalance = currentBalance ?? 0;
    const enteredBalance = parseFloat(confirmedBalance) || 0;
    const discrepancy = Math.abs(enteredBalance - expectedBalance);
    const hasDiscrepancy = confirmedBalance !== '' && discrepancy > 0.01;
    const balanceMatch = confirmedBalance !== '' && !hasDiscrepancy;

    async function handleConfirm() {
        if (!confirmedBalance) {
            setError('Please enter the current balance you see.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch(`/api/shifts/${shift.id}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    confirmedBalance: enteredBalance,
                    balanceNote: hasDiscrepancy
                        ? `DISCREPANCY: Expected ${expectedBalance}, member confirmed ${enteredBalance}. ${note}`
                        : note,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to confirm');
            setStep('success');
            setTimeout(() => onConfirm?.(), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    if (step === 'success') {
        return (
            <Overlay>
                <div style={styles.card}>
                    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: '#dcfce7', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <CheckCircle style={{ width: '32px', height: '32px', color: '#16a34a' }} />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                            Shift Started!
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>
                            Balance confirmed. Have a great shift!
                        </div>
                    </div>
                </div>
            </Overlay>
        );
    }

    return (
        <Overlay>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Shield style={{ width: '20px', height: '20px', color: '#0f172a' }} />
                    </div>
                    <div>
                        <div style={styles.headerTitle}>Shift Start Check</div>
                        <div style={styles.headerSub}>Balance confirmation required</div>
                    </div>
                </div>

                {/* Date / Time */}
                <div style={styles.timeRow}>
                    <Clock style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{dateStr} · {timeStr}</span>
                </div>

                {/* Expected balance display */}
                <div style={styles.balanceCard}>
                    <div style={styles.balanceLabel}>System Live Balance</div>
                    <div style={styles.balanceAmount}>
                        ${typeof expectedBalance === 'number' ? expectedBalance.toFixed(2) : '—'}
                    </div>
                    <div style={styles.balanceHint}>This is the current balance recorded in the system.</div>
                </div>

                {/* Member input */}
                <div style={{ padding: '0 20px 16px' }}>
                    <label style={styles.label}>
                        What balance do you see right now?
                        <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={styles.dollarSign}>$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={confirmedBalance}
                            onChange={e => { setConfirmedBalance(e.target.value); setError(''); }}
                            style={{
                                ...styles.input,
                                paddingLeft: '28px',
                                borderColor: hasDiscrepancy ? '#fca5a5' : balanceMatch ? '#86efac' : '#e2e8f0',
                                background: hasDiscrepancy ? '#fff1f2' : balanceMatch ? '#f0fdf4' : '#fff',
                            }}
                            placeholder="0.00"
                        />
                        {balanceMatch && (
                            <CheckCircle style={{ ...styles.inputIcon, color: '#22c55e' }} />
                        )}
                        {hasDiscrepancy && (
                            <AlertCircle style={{ ...styles.inputIcon, color: '#ef4444' }} />
                        )}
                    </div>

                    {/* Discrepancy warning */}
                    {hasDiscrepancy && (
                        <div style={styles.discrepancyBox}>
                            <AlertCircle style={{ width: '13px', height: '13px', color: '#dc2626', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '12px' }}>
                                    Balance discrepancy of ${discrepancy.toFixed(2)}
                                </div>
                                <div style={{ color: '#b91c1c', fontSize: '11px', marginTop: '2px' }}>
                                    Please add a note explaining the difference.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Note field — required for discrepancy, optional otherwise */}
                    {(hasDiscrepancy || balanceMatch) && (
                        <div style={{ marginTop: '12px' }}>
                            <label style={styles.label}>
                                Note {hasDiscrepancy ? <span style={{ color: '#ef4444' }}>* (required)</span> : '(optional)'}
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                style={styles.textarea}
                                placeholder={hasDiscrepancy
                                    ? 'Explain the discrepancy...'
                                    : 'Any notes before starting? (optional)'}
                                rows={2}
                            />
                        </div>
                    )}

                    {error && (
                        <div style={styles.error}>{error}</div>
                    )}
                </div>

                {/* Action */}
                <div style={styles.footer}>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !confirmedBalance || (hasDiscrepancy && !note.trim())}
                        style={{
                            ...styles.btn,
                            opacity: (submitting || !confirmedBalance || (hasDiscrepancy && !note.trim())) ? 0.5 : 1,
                            cursor: (submitting || !confirmedBalance || (hasDiscrepancy && !note.trim())) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting ? 'Confirming...' : 'Confirm & Start Shift'}
                    </button>
                    {hasDiscrepancy && (
                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                            Discrepancy will be flagged to admin
                        </div>
                    )}
                </div>
            </div>
        </Overlay>
    );
}

function Overlay({ children }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
        }}>
            {children}
        </div>
    );
}

const styles = {
    card: {
        background: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    header: {
        padding: '24px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid #f1f5f9',
    },
    headerIcon: {
        width: '40px', height: '40px', borderRadius: '12px',
        background: '#f8fafc', border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    headerTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a' },
    headerSub: { fontSize: '12px', color: '#94a3b8', marginTop: '1px' },
    timeRow: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
    },
    balanceCard: {
        margin: '16px 20px',
        padding: '16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '14px',
        textAlign: 'center',
    },
    balanceLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' },
    balanceAmount: { fontSize: '32px', fontWeight: '800', color: '#fff', margin: '6px 0 2px' },
    balanceHint: { fontSize: '11px', color: '#64748b' },
    label: { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' },
    input: {
        width: '100%', padding: '10px 36px 10px 28px', fontSize: '14px',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    dollarSign: {
        position: 'absolute', left: '10px', top: '50%',
        transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', fontWeight: '600',
    },
    inputIcon: {
        position: 'absolute', right: '10px', top: '50%',
        transform: 'translateY(-50%)', width: '16px', height: '16px',
    },
    discrepancyBox: {
        display: 'flex', gap: '8px', alignItems: 'flex-start',
        padding: '10px 12px', borderRadius: '8px',
        background: '#fff1f2', border: '1px solid #fecaca',
        marginTop: '8px',
    },
    textarea: {
        width: '100%', padding: '10px 12px', fontSize: '13px',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontFamily: 'inherit', outline: 'none', resize: 'vertical',
        boxSizing: 'border-box',
    },
    error: {
        fontSize: '12px', color: '#dc2626',
        padding: '8px 10px', background: '#fff1f2',
        borderRadius: '8px', marginTop: '8px',
    },
    footer: {
        padding: '12px 20px 20px',
        borderTop: '1px solid #f1f5f9',
    },
    btn: {
        width: '100%', padding: '13px',
        background: '#0f172a', color: '#fff',
        border: 'none', borderRadius: '12px',
        fontSize: '14px', fontWeight: '700',
        fontFamily: 'inherit', cursor: 'pointer',
        transition: 'opacity 0.2s',
    },
};
