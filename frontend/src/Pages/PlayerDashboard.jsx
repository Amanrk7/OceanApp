import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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
    GOLD: { bg: '#fef3c7', text: '#92400e', emoji: '🥇', label: 'Gold' },
};
const STATUS_MAP = {
    ACTIVE: { bg: '#dcfce7', text: '#166534', dot: '#16a34a', label: 'Active' },
    CRITICAL: { bg: '#fef9c3', text: '#854d0e', dot: '#d97706', label: 'Critical' },
    HIGHLY_CRITICAL: { bg: '#ffedd5', text: '#9a3412', dot: '#ea580c', label: 'High Critical' },
    INACTIVE: { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626', label: 'Inactive' },
};

const card = (extra = {}) => ({
    background: C.white, borderRadius: '14px',
    border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', ...extra
});
const pill = (bg, text) => ({
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: bg, color: text
});

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

// ─── Delete Modal ───────────────────────────────────────────────────────────────
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

// ─── Custom Recharts Tooltip ────────────────────────────────────────────────────
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

    // Real-time polling for player updates
    const loadPlayer = useCallback(async () => {
        if (!playerId) return;
        try {
            setLoading(true); setError('');
            const res = await api.players.getPlayer(parseInt(playerId));
            setPlayer(res.data);
        } catch (err) { setError(err.message || 'Failed to load player.'); }
        finally { setLoading(false); }
    }, [playerId]);

    useEffect(() => { 
        loadPlayer(); 
        // Poll for updates every 5 seconds
        const interval = setInterval(loadPlayer, 5000);
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
            <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: C.sky, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
        </div>
    );

    if (!player) return null;

    const tier = TIER[player.tier] || TIER.BRONZE;
    const status = STATUS_MAP[player.status] || STATUS_MAP.ACTIVE;

    // ── Calculate today's deposits/cashouts ────────────────────────────────────
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayTransactions = (player.transactionHistory || []).filter(tx => {
        const txDate = new Date(tx.date || tx.createdAt || tx.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return txDate === today;
    });

    const todayDeposits = todayTransactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    const todayCashouts = todayTransactions
        .filter(tx => tx.type === 'cashout')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    // ── Get granted bonuses (Referral & Streak) ────────────────────────────────
    const grantedBonuses = (player.transactionHistory || []).filter(tx => {
        const type = (tx.type || '').toLowerCase();
        return type.includes('bonus') || type.includes('referral') || type.includes('streak');
    }).slice(0, 10);

    const getBonusLabel = (tx) => {
        if (tx.bonusType === 'streak') return 'Streak Bonus';
        if (tx.bonusType === 'referral') return 'Referral Bonus';
        if (tx.type === 'Streak Bonus') return 'Streak Bonus';
        if (tx.type === 'Referral Bonus') return 'Referral Bonus';
        return tx.type || 'Bonus';
    };

    const getBonusColor = (type) => {
        if (type === 'Streak Bonus') return { bg: '#fffbeb', text: '#92400e' };
        if (type === 'Referral Bonus') return { bg: '#f0fdf4', text: '#166534' };
        return { bg: '#f1f5f9', text: '#475569' };
    };

    // ── Build chart data ─────────────────────────────────────────────────────
    const txMap = {};
    (player.transactionHistory || []).forEach(tx => {
        const dateKey = tx.date;
        if (!txMap[dateKey]) txMap[dateKey] = { date: dateKey, deposits: 0, cashouts: 0 };
        if (tx.type === 'deposit') txMap[dateKey].deposits += parseFloat(tx.amount) || 0;
        if (tx.type === 'cashout') txMap[dateKey].cashouts += parseFloat(tx.amount) || 0;
    });

    const sortedData = Object.values(txMap).sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartDays);
    cutoff.setHours(0, 0, 0, 0);

    const chartData = sortedData.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= cutoff;
    });

    const finalChartData = chartData.length > 0 ? chartData : sortedData.slice(-chartDays);
    const progressPct = player.tierProgress?.progressPercentage || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

            {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: C.white, borderRadius: '10px', border: `1px solid ${C.border}`, width: 'fit-content', flexWrap: 'wrap' }}>
                {[
                    { label: '🏠 Dashboard', onClick: () => navigate('/') },
                    { label: 'Players', onClick: () => navigate('/?page=players') },
                    { label: player.name, onClick: null },
                ].map((item, i, arr) => (
                    <React.Fragment key={i}>
                        {item.onClick ? (
                            <button onClick={item.onClick}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sky, fontWeight: '600', fontSize: '13px', padding: '2px 6px', borderRadius: '6px' }}
                                onMouseEnter={e => e.currentTarget.style.background = C.skyLt}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                {item.label}
                            </button>
                        ) : (
                            <span style={{ fontWeight: '700', fontSize: '13px', color: C.slate, padding: '2px 6px' }}>{item.label}</span>
                        )}
                        {i < arr.length - 1 && <span style={{ color: C.grayLt, fontSize: '16px', userSelect: 'none' }}>›</span>}
                    </React.Fragment>
                ))}
            </nav>

            {/* ── PLAYER HEADER CARD ──────────────────────────────────────── */}
            <div style={{ ...card({ padding: '24px 28px' }), display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <Avatar name={player.name} size={64} fontSize={22} />
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: C.slate }}>{player.name}</h1>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.grayLt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{player.username} · {player.email}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={pill(tier.bg, tier.text)}>{tier.emoji} {tier.label}</span>
                            <span style={{ ...pill(status.bg, status.text), display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.dot }} />{status.label}
                            </span>
                            {player.source && <span style={pill('#f1f5f9', C.gray)}>📍 {player.source}</span>}
                        </div>
                        {player.referredBy && (
                            <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.grayLt }}>
                                Referred by: <strong>{player.referredBy.name}</strong>
                            </p>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
                    <button onClick={() => navigate('/?page=addTransactions')}
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
                <StatCard label="Balance" value={`$${parseFloat(player.balance || 0).toFixed(2)}`} color="#10b981" />
                <StatCard label="Cashout Limit" value={`$${parseFloat(player.cashoutLimit || 250).toFixed(0)}`} color={C.amber} />
                <StatCard label="Streak" value={`${player.streak?.currentStreak || 0} days`} color={C.violet} sub={`Last: ${player.streak?.lastPlayedDate || '—'}`} />
                <StatCard label="Today's Deposits" value={`$${todayDeposits.toFixed(2)}`} color="#10b981" />
                <StatCard label="Today's Cashouts" value={`$${todayCashouts.toFixed(2)}`} color={C.red} />
                <StatCard label="Available Bonus" value={`$${parseFloat(player.bonusTracker?.availableBonus || 0).toFixed(2)}`} color="#10b981" />
            </div>

            {/* ── TIER PROGRESS ────────────────────────────────────────────── */}
            <div style={card({ padding: '18px 24px' })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.slate }}>Tier Progress — {tier.emoji} {tier.label}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: C.grayLt }}>
                        {(player.tierProgress?.playTimeMinutes || 0).toLocaleString()} / {player.tierProgress?.nextTierRequirement?.toLocaleString() || '∞'} min
                    </p>
                </div>
                <div style={{ height: '8px', background: C.border, borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg,${C.sky},${C.violet})`, borderRadius: '99px', transition: 'width .4s ease' }} />
                </div>
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: C.grayLt }}>{progressPct}% to next tier</p>
            </div>

            {/* ── GRANTED BONUSES (Referral & Streak) ────────────────────────── */}
            <div style={card({ padding: '20px 22px' })}>
                <SectionHeader title="Granted Bonuses" count={grantedBonuses.length} />
                {grantedBonuses.length === 0 ? (
                    <p style={{ color: C.grayLt, fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>No bonuses granted yet</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        {grantedBonuses.map((bonus, idx) => {
                            const bonusLabel = getBonusLabel(bonus);
                            const bonusColor = getBonusColor(bonusLabel);
                            return (
                                <div key={idx} style={{
                                    padding: '12px 14px', background: C.bg,
                                    border: `1px solid ${C.border}`, borderRadius: '9px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '12px', color: C.slate }}>{bonusLabel}</div>
                                        <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '2px' }}>
                                            {new Date(bonus.date || bonus.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <span style={{
                                        ...pill(bonusColor.bg, bonusColor.text),
                                        fontSize: '12px', fontWeight: '800', flexShrink: 0
                                    }}>
                                        +${parseFloat(bonus.amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── DEPOSIT / CASHOUT CHART ──────────────────────────────────── */}
            <div style={card({ padding: '20px 24px' })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: C.slate }}>Deposits vs Cashouts</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[[7, '7d'], [14, '14d'], [30, '30d']].map(([d, lbl]) => (
                            <button key={d} onClick={() => setChartDays(d)}
                                style={{
                                    padding: '5px 12px', borderRadius: '7px',
                                    border: `1px solid ${chartDays === d ? C.sky : C.border}`,
                                    background: chartDays === d ? C.skyLt : C.white,
                                    color: chartDays === d ? C.sky : C.gray,
                                    fontWeight: '600', fontSize: '12px', cursor: 'pointer',
                                    transition: 'all .15s'
                                }}>
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
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.grayLt }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: C.grayLt }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend formatter={(value) => (<span style={{ fontSize: '12px', color: C.gray, fontWeight: '600' }}>{value}</span>)} />
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
                </div>
            </div>

            {/* ── TRANSACTION HISTORY TABLE ────────────────────────────────── */}
            <div style={card({ padding: '18px 22px' })}>
                <SectionHeader title="Recent Transactions (Last 30 Days)" count={(player.transactionHistory || []).length} />
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '480px' }}>
                        <thead>
                            <tr>
                                {['Date', 'Type', 'Amount', 'Status'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '700', color: C.grayLt, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}`, background: C.bg, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(player.transactionHistory || []).length === 0
                                ? <tr><td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: C.grayLt }}>No transactions in last 30 days</td></tr>
                                : (player.transactionHistory || []).slice(0, 40).map(tx => {
                                    const tMap = {
                                        deposit: { label: 'Deposit', color: '#10b981', bg: '#f0fdf4' },
                                        cashout: { label: 'Cashout', color: C.red, bg: C.redLt },
                                        'Streak Bonus': { label: 'Streak Bonus', color: '#f59e0b', bg: '#fffbeb' },
                                        'Referral Bonus': { label: 'Referral Bonus', color: '#10b981', bg: '#f0fdf4' },
                                        bonus_credited: { label: 'Bonus', color: C.amber, bg: C.amberLt },
                                    };
                                    const t = tMap[tx.type] || { label: tx.type, color: C.gray, bg: C.bg };
                                    const sc = tx.status === 'COMPLETED' ? '#16a34a' : tx.status === 'PENDING' ? C.amber : C.red;
                                    return (
                                        <tr key={tx.id}
                                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, color: C.grayLt, fontSize: '12px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                                            <td style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}` }}>
                                                <span style={{ ...pill(t.bg, t.color), fontSize: '11px' }}>{t.label}</span>
                                            </td>
                                            <td style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: '700', color: tx.type === 'cashout' ? C.red : '#10b981', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                                {tx.type === 'cashout' ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, fontSize: '11px', fontWeight: '700', color: sc, whiteSpace: 'nowrap' }}>{tx.status}</td>
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
                    <span>🔐 Last Login: <strong style={{ color: C.slate }}>{player.lastLoginAt ? new Date(player.lastLoginAt).toLocaleDateString() : 'Never'}</strong></span>
                    <span>💳 Cashout Limit: <strong style={{ color: C.slate }}>${parseFloat(player.cashoutLimit || 250).toFixed(0)}</strong></span>
                </div>
            </div>

            {/* ── MODALS ───────────────────────────────────────────────────── */}
            {showDelete && <DeleteModal player={player} onClose={() => setShowDelete(false)} onDeleted={() => { setShowDelete(false); navigate('/'); }} />}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}