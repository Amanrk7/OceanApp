import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Gamepad2, ChevronDown, RefreshCw, Plus, DollarSign, CheckCircle } from 'lucide-react';
import { api } from '../api';

// ─── Style constants (matching BonusPage) ────────────────────────────────────
const CARD = {
    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px',
};

const METHOD_ICONS = {
    Bitcoin: { icon: '₿', bg: '#fff7ed', text: '#c2410c' },
    Chime: { icon: '◆', bg: '#f0fdf4', text: '#16a34a' },
    Litecoin: { icon: 'Ł', bg: '#f8fafc', text: '#475569' },
    PayPal: { icon: 'P', bg: '#eff6ff', text: '#2563eb' },
    Venmo: { icon: 'V', bg: '#f0f9ff', text: '#0284c7' },
    USDT: { icon: '₮', bg: '#f0fdfa', text: '#0d9488' },
    Other: { icon: '$', bg: '#faf5ff', text: '#7c3aed' },
};
const getMethodStyle = (method) => METHOD_ICONS[method] || { icon: method?.[0] || '$', bg: '#f8fafc', text: '#475569' };

const fmt = (val) =>
    `$${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const BalancesPage = () => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [games, setGames] = useState([]);
    const [expandedMethod, setExpandedMethod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);

    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const [walletsRes, gamesRes] = await Promise.all([
                api.wallets.getGroupedWallets(forceRefresh),
                api.games.getGames(forceRefresh),
            ]);
            setPaymentMethods(walletsRes.data || []);
            setGames(gamesRes.data || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false); setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const totalBalance = paymentMethods.reduce((sum, m) => sum + (m.totalBalance || 0), 0);

    const formatLastUpdated = (date) => {
        if (!date) return '—';
        const diff = Math.floor((Date.now() - date) / 1000);
        if (diff < 10) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        return date.toLocaleTimeString();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: '#94a3b8', fontSize: '14px' }}>
                <RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Loading balances…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 'inherit' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>A real-time overview of your cash and point stock.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => loadData(true)} disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', fontSize: '13px', color: '#475569', cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
                    >
                        <RefreshCw style={{ width: '14px', height: '14px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Transaction
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={{ padding: '11px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>{error}</div>
            )}

            {/* ── Two-column layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* LEFT: Payment Method Balances */}
                <div style={CARD}>
                    <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#eff6ff', borderRadius: '8px' }}>
                            <Wallet style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                        </span>
                        Payment Method Balances
                    </h3>

                    {paymentMethods.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>No wallets found</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {paymentMethods.map((method) => {
                                const style = getMethodStyle(method.method);
                                const isExpanded = expandedMethod === method.method;
                                return (
                                    <div key={method.method} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <button
                                            onClick={() => setExpandedMethod(isExpanded ? null : method.method)}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '34px', height: '34px', background: style.bg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: style.text, fontSize: '15px', flexShrink: 0 }}>
                                                    {style.icon}
                                                </div>
                                                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{method.method}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '700', color: '#16a34a', fontSize: '14px' }}>{fmt(method.totalBalance)}</span>
                                                <ChevronDown style={{ width: '15px', height: '15px', color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                                            </div>
                                        </button>

                                        {isExpanded && method.subAccounts?.length > 0 && (
                                            <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '8px 16px' }}>
                                                {method.subAccounts.map((sub) => (
                                                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: '#cbd5e1', fontSize: '12px' }}>▪</span>
                                                            <span style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>{sub.name}</span>
                                                        </div>
                                                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>{fmt(sub.balance)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: Game Point Stock */}
                <div style={CARD}>
                    <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#faf5ff', borderRadius: '8px' }}>
                            <Gamepad2 style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                        </span>
                        Game Point Stock
                    </h3>

                    {games.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>No games found</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                            {games.map((game) => {
                                const stockColor = game.status === 'DEFICIT' ? '#dc2626' : game.status === 'LOW_STOCK' ? '#d97706' : '#16a34a';
                                return (
                                    <div key={game.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', transition: 'background .15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {game.iconUrl ? (
                                                <img src={game.iconUrl} alt={game.name} style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '28px', height: '28px', background: '#faf5ff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Gamepad2 style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                                                </div>
                                            )}
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{game.name}</span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: stockColor }}>
                                            {Math.round(game.pointStock || 0).toLocaleString()} pts
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick Summary Footer ── */}
            <div style={CARD}>
                <h3 style={{ margin: '0 0 18px', fontSize: '13px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📈 Quick Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {[
                        { label: 'Total Balance', value: fmt(totalBalance), accent: '#2563eb' },
                        { label: 'Payment Methods', value: paymentMethods.length, accent: '#16a34a' },
                        { label: 'Active Games', value: games.length, accent: '#7c3aed' },
                        { label: 'Last Updated', value: formatLastUpdated(lastUpdated), accent: '#0d9488', dot: true },
                    ].map(({ label, value, accent, dot }) => (
                        <div key={label} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {dot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />}
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};