import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { fmtTXTime } from '../utils/txTime';

const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb',
    violet: '#7c3aed', violetLt: '#f5f3ff',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

const TIER = {
    BRONZE: { bg: '#fed7aa', text: '#92400e', emoji: '🥉', label: 'Bronze' },
    SILVER: { bg: '#e0e7ff', text: '#3730a3', emoji: '🥈', label: 'Silver' },
    GOLD:   { bg: '#fef3c7', text: '#92400e', emoji: '🥇', label: 'Gold' },
};
const STATUS_MAP = {
    ACTIVE:          { bg: '#dcfce7', text: '#166534', dot: '#16a34a', label: 'Active' },
    CRITICAL:        { bg: '#fef9c3', text: '#854d0e', dot: '#d97706', label: 'Critical' },
    HIGHLY_CRITICAL: { bg: '#ffedd5', text: '#9a3412', dot: '#ea580c', label: 'High Critical' },
    INACTIVE:        { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626', label: 'Inactive' },
};

const card = (extra = {}) => ({
    background: C.white, borderRadius: '14px',
    border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', ...extra
});
const pill = (bg, text) => ({
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: bg, color: text
});

// ── Bonus type helpers ──────────────────────────────────────────
const BONUS_LABEL_MAP = {
    'streak bonus':   { label: 'Streak Bonus',   emoji: '🔥', bg: '#fffbeb', text: '#92400e' },
    'referral bonus': { label: 'Referral Bonus',  emoji: '👤', bg: '#f0fdf4', text: '#166534' },
    'match bonus':    { label: 'Match Bonus',     emoji: '💰', bg: '#eff6ff', text: '#1d4ed8' },
    'special bonus':  { label: 'Special Bonus',   emoji: '⭐', bg: '#faf5ff', text: '#6b21a8' },
    'bonus':          { label: 'Bonus',           emoji: '🎁', bg: '#f1f5f9', text: '#475569' },
    'bonus_credited': { label: 'Bonus',           emoji: '🎁', bg: '#f1f5f9', text: '#475569' },
};
function resolveBonusInfo(tx) {
    const key = (tx.type || '').toLowerCase().trim();
    return BONUS_LABEL_MAP[key] || BONUS_LABEL_MAP['bonus'];
}

// ── TX type map ─────────────────────────────────────────────────
const TX_TYPE_MAP = {
    deposit:           { label: 'Deposit',        color: '#10b981', bg: '#f0fdf4' },
    cashout:           { label: 'Cashout',         color: '#dc2626', bg: '#fff1f2' },
    'streak bonus':    { label: 'Streak Bonus',    color: '#f59e0b', bg: '#fffbeb' },
    'referral bonus':  { label: 'Referral Bonus',  color: '#10b981', bg: '#f0fdf4' },
    'match bonus':     { label: 'Match Bonus',     color: '#3b82f6', bg: '#eff6ff' },
    'special bonus':   { label: 'Special Bonus',   color: '#8b5cf6', bg: '#faf5ff' },
    'bonus_credited':  { label: 'Bonus',           color: '#d97706', bg: '#fffbeb' },
    'bonus':           { label: 'Bonus',           color: '#d97706', bg: '#fffbeb' },
};

// ── Helpers ─────────────────────────────────────────────────────
function fmtDuration(ms) {
    if (ms <= 0) return 'expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// ── Sub-components ───────────────────────────────────────────────

function Avatar({ name = '?', size = 44, fontSize = 15 }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '800', fontSize, flexShrink: 0
        }}>{initials}</div>
    );
}

function StatCard({ label, value, sub, color = C.sky }) {
    return (
        <div style={card({ padding: '16px 18px' })}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color }}>{value}</p>
            {sub && <p style={{ margin: '3px 0 0', fontSize: '11px', color: C.grayLt }}>{sub}</p>}
        </div>
    );
}

function SectionHeader({ title, count }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</p>
            {count !== undefined && (
                <span style={{ padding: '1px 7px', background: C.skyLt, color: C.sky, borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{count}</span>
            )}
        </div>
    );
}

// ─── Payment Progress (for cashout rows) ──────────────────────────────────────
function TxPaymentProgress({ paid, total }) {
    const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
    const remaining = Math.max(total - paid, 0);
    return (
        <div style={{ minWidth: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', marginBottom: '3px' }}>
                <span style={{ color: '#10b981' }}>Paid ${parseFloat(paid).toFixed(2)}</span>
                <span style={{ color: '#ef4444' }}>${remaining.toFixed(2)} left</span>
            </div>
            <div style={{ height: '5px', background: '#fee2e2', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`,
                    background: pct >= 100 ? '#10b981' : '#f59e0b',
                    borderRadius: '99px', transition: 'width .4s ease'
                }} />
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{pct.toFixed(0)}% paid</div>
        </div>
    );
}

// ─── Streak & Freeze Card ─────────────────────────────────────────────────────
function StreakFreezeCard({ player }) {
    const streak = player.streak?.currentStreak ?? 0;
    const freeze = player.streakFreeze;
    const isFrozen = freeze?.isFrozen;
    const isAuto = freeze?.isAutoFreeze;
    const until = freeze?.freezeUntil ? new Date(freeze.freezeUntil) : null;
    const msLeft = until ? Math.max(0, until - Date.now()) : 0;
    const lastPlayed = player.streak?.lastPlayedDate;

    const STREAK_COLORS = [
        { days: 30, color: '#10b981', bg: '#f0fdf4', border: '#86efac', label: 'Legend' },
        { days: 15, color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Blazing' },
        { days: 10, color: '#f97316', bg: '#fff7ed', border: '#fdba74', label: 'Fire' },
        { days: 7,  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Hot Streak' },
        { days: 5,  color: '#8b5cf6', bg: '#faf5ff', border: '#ddd6fe', label: 'On A Roll' },
        { days: 3,  color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', label: 'Warming Up' },
        { days: 2,  color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', label: 'Starter' },
    ];
    const tier = STREAK_COLORS.find(t => streak >= t.days);

    return (
        <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '800', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Streak</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '36px', fontWeight: '900', color: tier?.color || C.grayLt, lineHeight: 1 }}>{streak}</span>
                        <span style={{ fontSize: '14px', color: C.grayLt, fontWeight: '600' }}>days</span>
                        {tier && (
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color }}>
                                🔥 {tier.label}
                            </span>
                        )}
                    </div>
                    {lastPlayed && (
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.grayLt }}>
                            Last deposit: <strong style={{ color: C.slate }}>{lastPlayed}</strong>
                        </p>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: '220px' }}>
                    {isFrozen ? (
                        <div style={{ padding: '14px 16px', borderRadius: '10px', background: isAuto ? '#eff6ff' : '#dbeafe', border: `1px solid ${isAuto ? '#bfdbfe' : '#93c5fd'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '14px' }}>🧊</span>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '800', fontSize: '13px', color: '#1d4ed8' }}>{isAuto ? 'Auto-Frozen (Grace Period)' : 'Streak Frozen by Staff'}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>Streak protected from resetting</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                    <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Time Remaining</p>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1d4ed8' }}>{fmtDuration(msLeft)}</p>
                                </div>
                                {until && (
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Expires At</p>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>
                                            {until.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {freeze?.note && <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#3b82f6', fontStyle: 'italic' }}>Note: {freeze.note}</p>}
                        </div>
                    ) : streak > 0 ? (
                        <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>✅</span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#166534' }}>Streak Active</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#16a34a' }}>No freeze — player is depositing regularly</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '14px 16px', borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>💤</span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: C.gray }}>No Active Streak</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: C.grayLt }}>Player needs to deposit to start a streak</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ player, onClose, onDeleted }) {
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleDelete = async () => {
        if (!pwd.trim()) return setError('Admin password is required.');
        setError('');
        try {
            setLoading(true);
            await api.players.deletePlayer(player.id, pwd);
            onDeleted();
        } catch (err) {
            setError(err.message || 'Incorrect password or server error.');
        } finally { setLoading(false); }
    };
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: C.white, borderRadius: '14px', boxShadow: '0 24px 60px rgba(15,23,42,.25)', width: '100%', maxWidth: '420px' }}>
                <div style={{ padding: '18px 20px', background: C.redLt, borderBottom: `1px solid ${C.redBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#7f1d1d' }}>🗑 Delete Player</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.red }}>This action is permanent.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, fontSize: '18px' }}>✕</button>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={{ padding: '12px 14px', background: '#fff8f1', border: '1px solid #fed7aa', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: C.slate, fontSize: '13px' }}>{player.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.gray }}>@{player.username} · {player.email}</p>
                    </div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', marginBottom: '6px' }}>Admin Password *</label>
                    <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleDelete()}
                        placeholder="Enter your admin password to confirm"
                        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${error ? C.red : C.border}`, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                    {error && <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.red }}>{error}</p>}
                </div>
                <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px', background: C.bg }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                    <button onClick={handleDelete} disabled={loading}
                        style={{ flex: 2, padding: '10px', background: loading ? '#e2e8f0' : C.red, color: loading ? C.grayLt : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? '⏳ Deleting…' : '🗑 Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(15,23,42,.12)', fontSize: '12px' }}>
            <p style={{ margin: '0 0 8px', fontWeight: '700', color: C.slate }}>{label}</p>
            {payload.map(entry => (
                <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                    <span style={{ color: C.gray }}>{entry.name}:</span>
                    <span style={{ fontWeight: '700', color: entry.color }}>${parseFloat(entry.value).toFixed(2)}</span>
                </div>
            ))}
        </div>
    );
}

// ─── People Chip ──────────────────────────────────────────────────────────────
function PeopleChip({ person, emoji = '👤' }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}`, fontSize: '12px', color: C.slate }}>
            <span>{emoji}</span>
            <div>
                <div style={{ fontWeight: '700' }}>{person.name || person.username}</div>
                {person.username && person.name && <div style={{ fontSize: '10px', color: C.grayLt }}>@{person.username}</div>}
            </div>
        </div>
    );
}

const TIER_CONFIG = {
    BRONZE: { label: 'Bronze', emoji: '🥉', color: '#b45309', bg: '#fef3c7', weeklyTarget: 500,  cashoutLimit: 250, nextTier: 'SILVER' },
    SILVER: { label: 'Silver', emoji: '🥈', color: '#3730a3', bg: '#e0e7ff', weeklyTarget: 1000, cashoutLimit: 500, nextTier: 'GOLD' },
    GOLD:   { label: 'Gold',   emoji: '🥇', color: '#92400e', bg: '#fef3c7', weeklyTarget: null,  cashoutLimit: 750, nextTier: null },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PLAYER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function PlayerDashboard() {
    const { playerId } = useParams();
    const navigate = useNavigate();

    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [chartDays, setChartDays] = useState(14);
    const [showDelete, setShowDelete] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadPlayer = useCallback(async (isInitial = false) => {
        if (!playerId) return;
        try {
            if (isInitial) setLoading(true);
            setError('');
            const res = await api.players.getPlayer(parseInt(playerId));
            setPlayer(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || 'Failed to load player.');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [playerId]);

    useEffect(() => {
        loadPlayer(true);
        const interval = setInterval(() => loadPlayer(false), 5000);
        return () => clearInterval(interval);
    }, [loadPlayer]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: `4px solid ${C.border}`, borderTopColor: C.sky, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: C.gray, fontSize: '14px' }}>Loading player dashboard…</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: C.red, fontSize: '15px', marginBottom: '12px' }}>{error}</p>
            <button onClick={() => navigate('/?page=players')} style={{ padding: '10px 20px', background: C.sky, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>← Back to Players</button>
        </div>
    );

    if (!player) return null;

    const tier = TIER[player.tier] || TIER.BRONZE;
    const tierCfg = TIER_CONFIG[player.tier] || TIER_CONFIG.BRONZE;
    const weeklyTarget = tierCfg.weeklyTarget;

    const weeklyDeposits = (() => {
        const backendVal = (player.transactionHistory || []).find(tx => tx.weeklyDepositTotal != null)?.weeklyDepositTotal;
        if (backendVal != null) return backendVal;
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0, 0, 0, 0);
        return (player.transactionHistory || [])
            .filter(tx => { if (tx.type !== 'deposit') return false; const d = new Date(tx.date); return !isNaN(d.getTime()) && d >= cutoff; })
            .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    })();

    const tierPct = weeklyTarget ? Math.min(100, Math.round((weeklyDeposits / weeklyTarget) * 100)) : 100;
    const amtToNext = weeklyTarget ? Math.max(0, weeklyTarget - weeklyDeposits) : 0;
    const status = STATUS_MAP[player.status] || STATUS_MAP.ACTIVE;

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayTransactions = (player.transactionHistory || []).filter(tx => {
        const txDate = new Date(tx.date || tx.createdAt || tx.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return txDate === today;
    });
    const todayDeposits = todayTransactions.filter(tx => tx.type === 'deposit').reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
    const todayCashouts = todayTransactions.filter(tx => tx.type === 'cashout').reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);

    const grantedBonuses = (player.transactionHistory || []).filter(tx => {
        const t = (tx.type || '').toLowerCase();
        return t.includes('bonus') || t.includes('referral') || t.includes('streak') || t.includes('match') || t.includes('special');
    }).slice(0, 12);

    const txMap = {};
    (player.transactionHistory || []).forEach(tx => {
        const dateKey = tx.date;
        if (!dateKey) return;
        if (!txMap[dateKey]) txMap[dateKey] = { date: dateKey, deposits: 0, cashouts: 0 };
        if (tx.type === 'deposit') txMap[dateKey].deposits += parseFloat(tx.amount) || 0;
        if (tx.type === 'cashout') txMap[dateKey].cashouts += parseFloat(tx.amount) || 0;
    });
    const sortedData = Object.values(txMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - chartDays); cutoff.setHours(0, 0, 0, 0);
    const chartData = sortedData.filter(e => new Date(e.date) >= cutoff);
    const finalChartData = chartData.length > 0 ? chartData : sortedData.slice(-chartDays);

    const sourceTags = player.source && player.source !== '—'
        ? player.source.split(',').map(s => s.trim()).filter(Boolean) : [];

    const barGradient = tierPct >= 100
        ? 'linear-gradient(90deg, #16a34a, #22c55e)'
        : player.tier === 'GOLD' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #0ea5e9, #7c3aed)';

    // ── Table column config ─────────────────────────────────────
    const TX_HEADERS = [
        { label: 'Date',            style: {} },
        { label: 'ID',              style: {} },
        { label: 'Type',            style: {} },
        { label: 'Amount',          style: {} },
        { label: 'Fee',             style: { color: '#0369a1', background: '#f0f9ff' } },
        { label: 'Received / Paid', style: { color: '#0369a1', background: '#f0f9ff' } },
        { label: 'Game',            style: {} },
        { label: 'Wallet',          style: {} },
        { label: 'Before → After',  style: {} },
        { label: 'Status',          style: {} },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

            {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', flexWrap: 'wrap' }}>
                {[
                    { label: 'Dashboard', onClick: () => navigate('/') },
                    { label: 'Players',   onClick: () => navigate('/?page=players') },
                    { label: player.name, onClick: null },
                ].map((item, i, arr) => (
                    <React.Fragment key={i}>
                        {item.onClick
                            ? <button onClick={item.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sky, fontWeight: '600', fontSize: '13px', padding: '2px 6px', borderRadius: '6px' }}
                                onMouseEnter={e => e.currentTarget.style.background = C.skyLt}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>{item.label}</button>
                            : <span style={{ fontWeight: '700', fontSize: '13px', padding: '2px 6px' }}>{item.label}</span>
                        }
                        {i < arr.length - 1 && <span style={{ color: C.grayLt, fontSize: '16px', userSelect: 'none' }}>›</span>}
                    </React.Fragment>
                ))}
                <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    LIVE
                </span>
            </nav>

            {/* ── PLAYER HEADER CARD ──────────────────────────────────────── */}
            <div style={{ ...card({ padding: '24px 28px' }), display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <Avatar name={player.name} size={64} fontSize={22} />
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: C.slate }}>{player.name}</h1>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.grayLt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            @{player.username} · {player.email}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={pill(tier.bg, tier.text)}>{tier.emoji} {tier.label}</span>
                            <span style={{ ...pill(status.bg, status.text), display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.dot }} />{status.label}
                            </span>
                            {sourceTags.map((src, i) => <span key={i} style={pill('#f1f5f9', C.gray)}>📍 {src}</span>)}
                        </div>
                        {player.referredBy && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: C.grayLt }}>Referred by:</span>
                                <span style={{ ...pill('#f0fdf4', '#16a34a'), fontSize: '12px' }}>
                                    👤 {player.referredBy.name || `ID ${player.referredBy.id || player.referredBy}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
                    <button onClick={() => navigate(`/?page=addTransactions&playerId=${player.id}`)}
                        style={{ padding: '9px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '9px', color: '#166534', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        + Add Transaction
                    </button>
                    <button onClick={() => setShowDelete(true)}
                        style={{ padding: '9px 16px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '9px', color: C.red, fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        🗑 Delete
                    </button>
                </div>
            </div>

            {/* ── STAT ROW ────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                <StatCard label="Balance"          value={`$${parseFloat(player.balance || 0).toFixed(2)}`}                                  color="#10b981" />
                <StatCard label="Cashout Limit"    value={`$${parseFloat(player.cashoutLimit || 250).toFixed(0)}`}                            color={C.amber} />
                <StatCard label="Streak"           value={`${player.streak?.currentStreak || 0} days`}
                    color={player.streakFreeze?.isFrozen ? '#1d4ed8' : C.violet}
                    sub={player.streakFreeze?.isFrozen ? `🧊 Frozen · ${fmtDuration(Math.max(0, new Date(player.streakFreeze.freezeUntil) - Date.now()))}` : `Last: ${player.streak?.lastPlayedDate || '—'}`} />
                <StatCard label="Today's Deposits" value={`$${todayDeposits.toFixed(2)}`}                                                     color="#10b981" />
                <StatCard label="Today's Cashouts" value={`$${todayCashouts.toFixed(2)}`}                                                     color={C.red} />
                <StatCard label="Available Bonus"  value={`$${parseFloat(player.bonusTracker?.availableBonus || 0).toFixed(2)}`}              color="#10b981" />
            </div>

            <StreakFreezeCard player={player} />

            {/* ── TIER PROGRESS ────────────────────────────────────────────── */}
            <div style={card({ padding: '18px 24px' })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: C.slate }}>Tier Progress — {tier.emoji} {tier.label}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: C.grayLt }}>Based on total deposits in the last 7 days</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        {weeklyTarget ? (
                            <>
                                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: '700', color: C.slate }}>${weeklyDeposits.toFixed(0)} / ${weeklyTarget.toLocaleString()}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: amtToNext === 0 ? '#16a34a' : C.grayLt }}>
                                    {amtToNext > 0 ? `$${amtToNext.toFixed(0)} more to ${TIER_CONFIG[tierCfg.nextTier]?.label}` : `✓ Eligible for ${TIER_CONFIG[tierCfg.nextTier]?.label}`}
                                </p>
                            </>
                        ) : (
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>🥇 Maximum Tier Reached</p>
                        )}
                    </div>
                </div>
                <div style={{ height: '10px', background: C.border, borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${tierPct}%`, background: barGradient, borderRadius: '99px', transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.grayLt, marginBottom: '14px' }}>
                    <span>$0</span>
                    {weeklyTarget && <span style={{ color: tierPct >= 50 ? C.sky : C.grayLt }}>${(weeklyTarget / 2).toLocaleString()}</span>}
                    {weeklyTarget
                        ? <span style={{ fontWeight: tierPct >= 100 ? '700' : '400', color: tierPct >= 100 ? '#16a34a' : C.grayLt }}>${weeklyTarget.toLocaleString()} {tierPct >= 100 ? '✓' : ''}</span>
                        : <span style={{ color: '#f59e0b', fontWeight: '700' }}>Top Tier 🥇</span>
                    }
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {Object.entries(TIER_CONFIG).map(([key, cfg]) => {
                        const isActive = player.tier === key;
                        return (
                            <div key={key} style={{ padding: '8px 14px', borderRadius: '8px', background: isActive ? cfg.bg : '#f8fafc', border: `1px solid ${isActive ? '#d1d5db' : '#f1f5f9'}`, opacity: isActive ? 1 : 0.55 }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, marginBottom: '3px' }}>
                                    {cfg.emoji} {cfg.label}
                                    {isActive && <span style={{ marginLeft: '5px', fontSize: '9px', background: cfg.color, color: '#fff', borderRadius: '4px', padding: '1px 5px' }}>CURRENT</span>}
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>Cashout: ${cfg.cashoutLimit}/day</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                    {cfg.nextTier ? `Need $${cfg.weeklyTarget?.toLocaleString()}/wk → ${TIER_CONFIG[cfg.nextTier]?.label}` : 'Max Tier — no limit 🏆'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── REFERRALS & FRIENDS ROW ───────────────────────────────────── */}
            {((player.referralsList?.length > 0) || (player.friendsList?.length > 0)) && (
                <div style={{ display: 'grid', gridTemplateColumns: player.referralsList?.length && player.friendsList?.length ? '1fr 1fr' : '1fr', gap: '16px' }}>
                    {player.referralsList?.length > 0 && (
                        <div style={card({ padding: '18px 22px' })}>
                            <SectionHeader title="Referred Players" count={player.referralsList.length} />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {player.referralsList.map(r => <PeopleChip key={r.id} person={r} emoji="🎯" />)}
                            </div>
                        </div>
                    )}
                    {player.friendsList?.length > 0 && (
                        <div style={card({ padding: '18px 22px' })}>
                            <SectionHeader title="Friends" count={player.friendsList.length} />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {player.friendsList.map(f => <PeopleChip key={f.id} person={f} emoji="🤝" />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── GRANTED BONUSES ──────────────────────────────────────────── */}
            <div style={card({ padding: '20px 22px' })}>
                <SectionHeader title="Granted Bonuses" count={grantedBonuses.length} />
                {grantedBonuses.length === 0
                    ? <p style={{ color: C.grayLt, fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>No bonuses granted yet</p>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                            {grantedBonuses.map((bonus, idx) => {
                                const info = resolveBonusInfo(bonus);
                                return (
                                    <div key={idx} style={{ padding: '12px 14px', background: info.bg, border: `1px solid ${C.border}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '700', fontSize: '12px', color: info.text }}>{info.emoji} {info.label}</span>
                                            <span style={{ fontWeight: '800', fontSize: '13px', color: info.text }}>+${parseFloat(bonus.amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {bonus.gameName && <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(0,0,0,0.06)', borderRadius: '5px', color: C.gray }}>🎮 {bonus.gameName}</span>}
                                            <span style={{ fontSize: '11px', color: C.grayLt, marginLeft: 'auto' }}>{bonus.date || '—'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
            </div>

            {/* ── DEPOSIT / CASHOUT CHART ──────────────────────────────────── */}
            <div style={card({ padding: '20px 24px' })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: C.slate }}>Deposits vs Cashouts</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[[7, '7d'], [14, '14d'], [30, '30d']].map(([d, lbl]) => (
                            <button key={d} onClick={() => setChartDays(d)}
                                style={{ padding: '5px 12px', borderRadius: '7px', border: `1px solid ${chartDays === d ? C.sky : C.border}`, background: chartDays === d ? C.skyLt : C.white, color: chartDays === d ? C.sky : C.gray, fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>
                {finalChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={finalChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.red} stopOpacity={0.2} /><stop offset="95%" stopColor={C.red} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.grayLt }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: C.grayLt }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend formatter={value => <span style={{ fontSize: '12px', color: C.gray, fontWeight: '600' }}>{value}</span>} />
                            <Area type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={2.5} fill="url(#dGrad)" name="Deposits" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="cashouts" stroke={C.red} strokeWidth={2.5} fill="url(#cGrad)" name="Cashouts" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.grayLt, fontSize: '13px' }}>
                        No transaction data in this range
                    </div>
                )}
            </div>

            {/* ── SOCIAL MEDIA ──────────────────────────────────────────────── */}
            <div style={card({ padding: '18px 22px' })}>
                <SectionHeader title="Social Media" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {[
                        { key: 'email', label: 'Email', emoji: '📧', prefix: '' },
                        { key: 'phone', label: 'Phone', emoji: '📱', prefix: '' },
                        { key: 'facebook', label: 'Facebook', emoji: '📘', prefix: '@' },
                        { key: 'telegram', label: 'Telegram', emoji: '✈️', prefix: '@' },
                        { key: 'instagram', label: 'Instagram', emoji: '📸', prefix: '@' },
                        { key: 'x', label: 'X', emoji: '🐦', prefix: '@' },
                        { key: 'snapchat', label: 'Snapchat', emoji: '👻', prefix: '@' },
                    ].map(({ key, label, emoji, prefix }) => {
                        const val = player.socials?.[key];
                        if (!val) return null;
                        return (
                            <div key={key} style={{ padding: '8px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '12px', color: C.slate, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{emoji}</span>
                                <span style={{ fontWeight: '600', color: C.grayLt }}>{label}:</span>
                                {prefix}{val}
                            </div>
                        );
                    })}
                    {!Object.values(player.socials || {}).some(Boolean) && (
                        <p style={{ color: C.grayLt, fontSize: '13px', margin: 0 }}>No social profiles linked</p>
                    )}
                </div>
            </div>

            {/* ── TRANSACTION HISTORY TABLE — DETAILED ─────────────────────── */}
            <div style={card({ padding: '18px 22px' })}>
                <SectionHeader title="Recent Transactions (Last 30 Days)" count={(player.transactionHistory || []).length} />
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '980px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                            <tr>
                                {TX_HEADERS.map(h => (
                                    <th key={h.label} style={{
                                        textAlign: 'left', padding: '10px 14px',
                                        fontWeight: '700', fontSize: '11px',
                                        textTransform: 'uppercase', letterSpacing: '0.4px',
                                        borderBottom: `1px solid ${C.border}`,
                                        whiteSpace: 'nowrap',
                                        background: h.style.background || C.bg,
                                        color: h.style.color || C.grayLt,
                                    }}>{h.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(player.transactionHistory || []).length === 0
                                ? (
                                    <tr>
                                        <td colSpan={TX_HEADERS.length} style={{ padding: '28px', textAlign: 'center', color: C.grayLt }}>
                                            No transactions in last 30 days
                                        </td>
                                    </tr>
                                )
                                : (player.transactionHistory || []).slice(0, 40).map(tx => {
                                    const typeKey = (tx.type || '').toLowerCase();
                                    const t = TX_TYPE_MAP[typeKey] || { label: tx.type, color: C.gray, bg: C.bg };
                                    const isDeposit  = tx.type === 'deposit';
                                    const isCashout  = tx.type === 'cashout';
                                    const isPending  = tx.status === 'PENDING';
                                    const isCompleted = tx.status === 'COMPLETED';

                                    const depositAmt = parseFloat(tx.amount || 0);
                                    const feeVal     = parseFloat(tx.fee || 0);
                                    const paidAmt    = parseFloat(tx.paidAmount || 0);
                                    const receivedAmt = isDeposit ? depositAmt - feeVal : null;

                                    // Status badge
                                    const isPartial = isCashout && isPending && paidAmt > 0 && paidAmt < depositAmt;
                                    const statusLabel = isPartial ? 'PARTIAL' : tx.status;
                                    const statusBg    = isPartial ? '#fef3c7' : isCompleted ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2';
                                    const statusColor = isPartial ? '#92400e' : isCompleted ? '#166534' : isPending ? '#92400e' : '#991b1b';

                                    // Game points before/after
                                    const stockBefore = tx.gameStockBefore;
                                    const stockAfter  = tx.gameStockAfter;
                                    const effectiveAfter = isCashout && stockBefore != null
                                        ? stockBefore + paidAmt
                                        : stockAfter;
                                    const remainingPts = isCashout ? depositAmt - paidAmt : 0;

                                    // TX id
                                    const txId = tx.id ? `TXN${String(tx.id).padStart(6, '0')}` : '—';

                                    return (
                                        <tr key={tx.id}
                                            style={{
                                                borderBottom: `1px solid ${C.border}`,
                                                background: isCashout && isPending ? '#fffdf5' : 'transparent',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = isCashout && isPending ? '#fffbeb' : C.bg}
                                            onMouseLeave={e => e.currentTarget.style.background = isCashout && isPending ? '#fffdf5' : 'transparent'}>

                                            {/* Date */}
                                            <td style={{ padding: '11px 14px', color: C.grayLt, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {tx.date}
                                            </td>

                                            {/* ID */}
                                            <td style={{ padding: '11px 14px', fontWeight: '700', color: C.sky, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {txId}
                                                {isCashout && isPending && (
                                                    <div style={{ marginTop: '3px' }}>
                                                        <span style={{ fontSize: '9px', padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: '700' }}>
                                                            ⏳ AWAITING
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Type */}
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: t.bg, color: t.color, whiteSpace: 'nowrap' }}>
                                                    {t.label}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td style={{ padding: '11px 14px', fontWeight: '800', fontSize: '14px', color: isCashout ? C.red : '#10b981', whiteSpace: 'nowrap' }}>
                                                {isCashout ? '−' : '+'}${depositAmt.toFixed(2)}
                                            </td>

                                            {/* Fee */}
                                            <td style={{ padding: '11px 14px', background: isDeposit ? '#fafeff' : 'transparent', whiteSpace: 'nowrap' }}>
                                                {feeVal > 0
                                                    ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#f59e0b' }}>−${feeVal.toFixed(2)}</span>
                                                    : <span style={{ color: C.border, fontSize: '12px' }}>—</span>
                                                }
                                            </td>

                                            {/* Received / Paid */}
                                            <td style={{ padding: '11px 14px', background: (isDeposit || isCashout) ? '#fafeff' : 'transparent' }}>
                                                {isDeposit
                                                    ? <span style={{ fontWeight: '700', fontSize: '13px', color: C.sky }}>
                                                        ${(receivedAmt ?? depositAmt).toFixed(2)}
                                                      </span>
                                                    : isCashout
                                                        ? <TxPaymentProgress paid={paidAmt} total={depositAmt} />
                                                        : <span style={{ color: C.border, fontSize: '12px' }}>—</span>
                                                }
                                            </td>

                                            {/* Game */}
                                            <td style={{ padding: '11px 14px', fontSize: '12px', color: C.gray, whiteSpace: 'nowrap' }}>
                                                {tx.gameName
                                                    ? <span style={{ padding: '2px 7px', background: '#f1f5f9', borderRadius: '5px', fontWeight: '500' }}>
                                                        {tx.gameName.match(/^[^-]+/)?.[0]?.trim() || tx.gameName}
                                                      </span>
                                                    : <span style={{ color: C.border }}>—</span>
                                                }
                                            </td>

                                            {/* Wallet */}
                                            <td style={{ padding: '11px 14px', minWidth: '110px' }}>
                                                {tx.walletMethod
                                                    ? <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '600' }}>
                                                            <span style={{ padding: '2px 7px', background: '#f0f9ff', borderRadius: '5px', color: C.sky }}>
                                                                💳 {tx.walletMethod}
                                                            </span>
                                                        </div>
                                                        {tx.walletName && (
                                                            <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '2px' }}>{tx.walletName}</div>
                                                        )}
                                                      </div>
                                                    : <span style={{ color: C.border, fontSize: '12px' }}>—</span>
                                                }
                                            </td>

                                            {/* Before → After */}
                                            <td style={{ padding: '11px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {stockBefore != null && effectiveAfter != null ? (() => {
                                                    const isUp = parseFloat(effectiveAfter) >= parseFloat(stockBefore);
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: C.grayLt, marginBottom: '1px' }}>Game Points</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <span style={{ color: C.grayLt }}>{parseFloat(stockBefore).toFixed(0)}</span>
                                                                <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                                                                    {' → '}{parseFloat(effectiveAfter).toFixed(0)}
                                                                </span>
                                                            </div>
                                                            {isCashout && remainingPts > 0 && (
                                                                <div style={{ marginTop: '3px' }}>
                                                                    <div style={{ height: '3px', background: C.border, borderRadius: '99px', overflow: 'hidden', width: '70px' }}>
                                                                        <div style={{
                                                                            height: '100%',
                                                                            width: `${depositAmt > 0 ? Math.min((paidAmt / depositAmt) * 100, 100) : 0}%`,
                                                                            background: paidAmt > 0 ? '#22c55e' : C.border,
                                                                            borderRadius: '99px',
                                                                        }} />
                                                                    </div>
                                                                    <div style={{ fontSize: '9px', color: C.grayLt, marginTop: '2px' }}>{remainingPts.toFixed(0)} pts pending</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })() : <span style={{ color: C.border }}>—</span>}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: statusBg, color: statusColor, whiteSpace: 'nowrap' }}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── META ROW ─────────────────────────────────────────────────── */}
            <div style={card({ padding: '14px 22px' })}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: C.grayLt }}>
                    <span>🆔 ID: <strong style={{ color: C.slate }}>#{player.id}</strong></span>
                    <span>📅 Joined: <strong style={{ color: C.slate }}>{player.createdAt ? new Date(player.createdAt).toLocaleDateString() : '—'}</strong></span>
                    {lastUpdated && <span>🔄 Updated: <strong style={{ color: '#16a34a' }}>{fmtTXTime(lastUpdated)}</strong></span>}
                </div>
            </div>

            {/* ── MODALS ───────────────────────────────────────────────────── */}
            {showDelete && (
                <DeleteModal player={player} onClose={() => setShowDelete(false)}
                    onDeleted={() => { setShowDelete(false); navigate('/?page=players'); }} />
            )}

            <style>{`
                @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
