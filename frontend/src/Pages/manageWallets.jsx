import React, { useState, useEffect, useCallback } from 'react';
import {
    Wallet, Plus, Edit2, Trash2, CheckCircle, X,
    RefreshCw, DollarSign, ChevronDown, ChevronUp, Save,
    Radio, WifiOff
} from 'lucide-react';
import { api } from '../api';

// ─── Style constants ──────────────────────────────────────────────────────────
const CARD = {
    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px',
};
const LABEL = {
    display: 'block', fontSize: '11px', fontWeight: '700',
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT_BASE = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    boxSizing: 'border-box', background: '#fff', color: '#0f172a', outline: 'none',
};
const SKY = 'rgb(14, 165, 233)';

const METHOD_META = {
    Bitcoin: { icon: '₿', bg: '#fff7ed', text: '#c2410c' },
    Chime: { icon: '◆', bg: '#f0fdf4', text: '#16a34a' },
    Litecoin: { icon: 'Ł', bg: '#f8fafc', text: '#475569' },
    PayPal: { icon: 'P', bg: '#eff6ff', text: '#2563eb' },
    Venmo: { icon: 'V', bg: '#f0f9ff', text: '#0284c7' },
    USDT: { icon: '₮', bg: '#f0fdfa', text: '#0d9488' },
    Other: { icon: '$', bg: '#faf5ff', text: '#7c3aed' },
};
const getMeta = (method) => METHOD_META[method] || { icon: method?.[0] ?? '$', bg: '#f8fafc', text: '#475569' };
const PAYMENT_METHODS = ['Bitcoin', 'Chime', 'Litecoin', 'PayPal', 'Venmo', 'USDT', 'Other'];
const fmt = (val) => `$${parseFloat(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── LiveToggle ───────────────────────────────────────────────────────────────
// A compact pill-shaped toggle. `isLive` = true → green/active; false → gray/offline
function LiveToggle({ isLive, loading, onToggle }) {
    const on = !!isLive;
    return (
        <button
            onClick={onToggle}
            disabled={loading}
            title={on ? 'Wallet is LIVE — click to take offline' : 'Wallet is OFFLINE — click to go live'}
            style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', border: 'none', borderRadius: '20px', cursor: loading ? 'wait' : 'pointer',
                fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px', transition: 'all .15s',
                background: on ? '#dcfce7' : '#f1f5f9',
                color: on ? '#15803d' : '#94a3b8',
                opacity: loading ? 0.6 : 1,
            }}
        >
            {/* toggle track */}
            <span style={{
                position: 'relative', width: '26px', height: '14px',
                borderRadius: '7px', background: on ? '#22c55e' : '#cbd5e1',
                flexShrink: 0, transition: 'background .2s',
            }}>
                <span style={{
                    position: 'absolute', top: '2px',
                    left: on ? '14px' : '2px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                }} />
            </span>
            {loading ? 'Saving…' : on ? 'Live' : 'Offline'}
        </button>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(15,23,42,.18)', width: '100%', maxWidth: '460px', margin: '0 16px', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', display: 'flex', alignItems: 'center', borderRadius: '6px' }}>
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>
                <div style={{ padding: '24px 28px' }}>{children}</div>
            </div>
        </div>
    );
}

function Alert({ type = 'error', message, onDismiss }) {
    if (!message) return null;
    const s = type === 'success'
        ? { bg: '#dcfce7', border: '#86efac', text: '#166534' }
        : { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', color: s.text, fontSize: '13px' }}>
            <span style={{ flex: 1 }}>{message}</span>
            {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}><X style={{ width: '14px', height: '14px' }} /></button>}
        </div>
    );
}

function InlineEdit({ value, onSave, prefix = '', type = 'text' }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
    if (!editing) {
        return (
            <span onClick={() => { setDraft(value); setEditing(true); }}
                title="Click to edit"
                style={{ cursor: 'pointer', fontWeight: '700', color: '#0f172a', fontSize: '14px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '1px' }}>
                {prefix}{value}
            </span>
        );
    }
    return (
        <input autoFocus type={type} value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ ...INPUT_BASE, width: '120px', padding: '4px 8px', fontSize: '13px' }}
        />
    );
}

function Field({ label, children, hint }) {
    return (
        <div>
            <label style={LABEL}>{label}</label>
            {children}
            {hint && <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#94a3b8' }}>{hint}</p>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ManageWalletsPage = () => {
    const [grouped, setGrouped] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [globalSuccess, setGlobalSuccess] = useState(null);
    const [expandedMethod, setExpandedMethod] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);   // wallet id being live-toggled

    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', method: 'Chime', identifier: '', balance: '', isLive: true });
    const [addError, setAddError] = useState(null);
    const [addLoading, setAddLoading] = useState(false);

    const [editWallet, setEditWallet] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editError, setEditError] = useState(null);
    const [editLoading, setEditLoading] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadWallets = useCallback(async (force = false) => {
        try {
            force ? setRefreshing(true) : setLoading(true);
            setGlobalError(null);
            const res = await api.wallets.getGroupedWallets(force);
            setGrouped(res.data || []);
        } catch (err) {
            setGlobalError(err.message || 'Failed to load wallets');
        } finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => {
        // Listen for shared wallet updates from other stores
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
        const url = `${API_BASE}/tasks/events?token=${encodeURIComponent(token)}`;
        const sse = new EventSource(url, { withCredentials: true });

        sse.addEventListener('message', (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'shared_wallet_updated') {
                    // Update the balance in-place without a full reload
                    setGrouped(prev => prev.map(group => ({
                        ...group,
                        subAccounts: group.subAccounts.map(w =>
                            w.id === msg.data.walletId
                                ? { ...w, balance: msg.data.balance }
                                : w
                        ),
                        totalBalance: group.subAccounts.reduce((s, w) =>
                            s + (w.id === msg.data.walletId ? msg.data.balance : (w.balance || 0)), 0
                        ),
                    })));
                }
            } catch { }
        });

        return () => sse.close();
    }, []);
    useEffect(() => { loadWallets(); }, [loadWallets]);

    const flash = (msg) => { setGlobalSuccess(msg); setTimeout(() => setGlobalSuccess(null), 3000); };

    // ── inline balance save ──────────────────────────────────────────────────
    const handleInlineBalanceSave = async (walletId, newBalance) => {
        const val = parseFloat(newBalance);
        if (isNaN(val) || val < 0) return;
        setSavingId(walletId);
        try {
            await api.wallets.updateWallet(walletId, { balance: val });
            await loadWallets(true); flash('Balance updated');
        } catch (err) { setGlobalError(err.message || 'Failed to update balance'); }
        finally { setSavingId(null); }
    };

    // ── live toggle ──────────────────────────────────────────────────────────
    // const handleLiveToggle = async (wallet) => {
    //     setTogglingId(wallet.id);
    //     try {
    //         await api.wallets.updateWallet(wallet.id, { isLive: !wallet.isLive });
    //         await loadWallets(true);
    //         flash(`${wallet.name} is now ${!wallet.isLive ? 'LIVE' : 'offline'}`);
    //     } catch (err) { setGlobalError(err.message || 'Failed to update wallet status'); }
    //     finally { setTogglingId(null); }
    // };
    const handleLiveToggle = async (wallet) => {
        setTogglingId(wallet.id);
        const newStatus = !wallet.isLive;          // ← capture BEFORE the await
        try {
            await api.wallets.updateWallet(wallet.id, { isLive: newStatus });
            await loadWallets(true);
            flash(`${wallet.name} is now ${newStatus ? 'LIVE' : 'offline'}`);  // ← use captured value
        } catch (err) { setGlobalError(err.message || 'Failed to update wallet status'); }
        finally { setTogglingId(null); }
    };

    // ── add ──────────────────────────────────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault(); setAddError(null);
        if (!addForm.name || !addForm.method) { setAddError('Name and method are required.'); return; }
        setAddLoading(true);
        try {
            await api.wallets.createWallet({
                name: addForm.name.trim(), method: addForm.method,
                identifier: addForm.identifier.trim() || null,
                balance: parseFloat(addForm.balance) || 0,
                isLive: addForm.isLive,
            });
            await loadWallets(true); setShowAdd(false);
            setAddForm({ name: '', method: 'Chime', identifier: '', balance: '', isLive: true });
            flash('Wallet created successfully');
        } catch (err) { setAddError(err.message || 'Failed to create wallet'); }
        finally { setAddLoading(false); }
    };

    // ── edit ─────────────────────────────────────────────────────────────────
    const openEdit = (wallet) => {
        setEditWallet(wallet);
        setEditForm({
            name: wallet.name, method: wallet.method,
            identifier: wallet.identifier || '',
            balance: wallet.balance?.toString() || '0',
            isLive: wallet.isLive !== false,   // default true if not set
            isShared: wallet.isShared === true,
        });
        setEditError(null);
    };

    const handleEdit = async (e) => {
        e.preventDefault(); setEditError(null);
        if (!editForm.name || !editForm.method) { setEditError('Name and method are required.'); return; }
        setEditLoading(true);
        try {
            await api.wallets.updateWallet(editWallet.id, {
                name: editForm.name.trim(), method: editForm.method,
                identifier: editForm.identifier.trim() || null,
                balance: parseFloat(editForm.balance) || 0,
                isLive: editForm.isLive,
                isShared: editForm.isShared,
            });
            await loadWallets(true); setEditWallet(null); flash('Wallet updated successfully');
        } catch (err) { setEditError(err.message || 'Failed to update wallet'); }
        finally { setEditLoading(false); }
    };

    // ── delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await api.wallets.deleteWallet(deleteTarget.id);
            await loadWallets(true); setDeleteTarget(null); flash('Wallet deleted');
        } catch (err) { setGlobalError(err.message || 'Failed to delete wallet'); setDeleteTarget(null); }
        finally { setDeleteLoading(false); }
    };

    // ── derived stats ─────────────────────────────────────────────────────────
    const allWallets = grouped.flatMap(g => g.subAccounts || []);
    const totalBalance = grouped.reduce((s, g) => s + (g.totalBalance || 0), 0);
    const totalWallets = allWallets.length;
    const liveCount = allWallets.filter(w => w.isLive !== false).length;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: '#94a3b8', fontSize: '14px' }}>
                <RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> Loading wallets…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 'inherit' }}>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Add, edit, and manage your payment wallets. Only <strong>live</strong> wallets are available for transactions.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => loadWallets(true)} disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', fontSize: '13px', color: '#475569', cursor: 'pointer', opacity: refreshing ? 0.6 : 1 }}>
                        <RefreshCw style={{ width: '14px', height: '14px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                    </button>
                    <button onClick={() => { setShowAdd(true); setAddError(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: SKY, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        <Plus style={{ width: '14px', height: '14px' }} /> Add New Wallet
                    </button>
                </div>
            </div>

            {/* ── Global Alerts ── */}
            <Alert type="error" message={globalError} onDismiss={() => setGlobalError(null)} />
            <Alert type="success" message={globalSuccess} onDismiss={() => setGlobalSuccess(null)} />

            {/* ── Summary Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                    { label: 'Total Balance', value: fmt(totalBalance), icon: DollarSign, bg: '#eff6ff', iconColor: '#2563eb' },
                    { label: 'Total Wallets', value: totalWallets, icon: Wallet, bg: '#f0fdf4', iconColor: '#16a34a' },
                    { label: 'Payment Methods', value: grouped.length, icon: CheckCircle, bg: '#faf5ff', iconColor: '#7c3aed' },
                    { label: 'Live Wallets', value: liveCount, icon: Radio, bg: '#f0fdf4', iconColor: '#15803d' },
                ].map(({ label, value, icon: Icon, bg, iconColor }) => (
                    <div key={label} style={{ ...CARD, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: '20px', height: '20px', color: iconColor }} />
                        </div>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
                            <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Wallet Groups ── */}
            {grouped.length === 0 ? (
                <div style={{ ...CARD, textAlign: 'center', padding: '60px 28px' }}>
                    <div style={{ width: '52px', height: '52px', background: '#f1f5f9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Wallet style={{ width: '24px', height: '24px', color: '#cbd5e1' }} />
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '600', color: '#475569' }}>No wallets yet</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Click "Add New Wallet" to get started</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {grouped.map((group) => {
                        const meta = getMeta(group.method);
                        const expanded = expandedMethod === group.method;
                        const groupLive = (group.subAccounts || []).filter(w => w.isLive !== false).length;

                        return (
                            <div key={group.method} style={{ ...CARD, padding: 0, overflow: 'hidden' }}>

                                {/* Group Header */}
                                <button onClick={() => setExpandedMethod(expanded ? null : group.method)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '40px', height: '40px', background: meta.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: meta.text, fontSize: '17px', flexShrink: 0 }}>
                                            {meta.icon}
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <p style={{ margin: '0 0 1px', fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{group.method}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                                    {group.subAccounts?.length ?? 0} wallet{group.subAccounts?.length !== 1 ? 's' : ''}
                                                </p>
                                                {/* live count badge */}
                                                {groupLive > 0 && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 7px', background: '#dcfce7', borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: '#15803d' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                                        {groupLive} live
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{fmt(group.totalBalance)}</span>
                                        {expanded ? <ChevronUp style={{ width: '16px', height: '16px', color: '#94a3b8' }} /> : <ChevronDown style={{ width: '16px', height: '16px', color: '#94a3b8' }} />}
                                    </div>
                                </button>

                                {/* Sub-accounts */}
                                {expanded && (
                                    <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                        {/* Col Headers */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 2.5fr 1.5fr 2.5fr', gap: '12px', padding: '10px 24px', background: '#f8fafc', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            <span>Name</span>
                                            <span style={{ textAlign: 'center' }}>Identifier</span>
                                            <span style={{ textAlign: 'center' }}>Balance</span>
                                            <span style={{ textAlign: 'center' }}>Status</span>
                                            <span style={{ textAlign: 'right' }}>Actions</span>
                                        </div>

                                        {group.subAccounts?.map((wallet) => {
                                            const isLive = wallet.isLive !== false;
                                            return (
                                                <div key={wallet.id}
                                                    style={{
                                                        display: 'grid', gridTemplateColumns: '3fr 3fr 2.5fr 1.5fr 2.5fr', gap: '12px',
                                                        padding: '14px 24px', borderTop: '1px solid #f1f5f9', alignItems: 'center',
                                                        transition: 'background .15s',
                                                        background: isLive ? 'transparent' : '#fafafa',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = isLive ? '#fafbfc' : '#f4f4f5'}
                                                    onMouseLeave={e => e.currentTarget.style.background = isLive ? 'transparent' : '#fafafa'}
                                                >
                                                    {/* Name — dimmed when offline */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                        {!isLive && <WifiOff style={{ width: '12px', height: '12px', color: '#cbd5e1', flexShrink: 0 }} />}
                                                        <p style={{ margin: 0, fontWeight: '600', color: isLive ? '#0f172a' : '#94a3b8', fontSize: '14px' }}>{wallet.name}</p>
                                                    </div>

                                                    {/* Identifier */}
                                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                                                        {wallet.identifier || <span style={{ color: '#cbd5e1' }}>—</span>}
                                                    </p>

                                                    {/* Balance (inline edit) */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                                                        {savingId === wallet.id ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}>
                                                                <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> Saving…
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>$</span>
                                                                <InlineEdit value={wallet.balance?.toFixed(2) ?? '0.00'} type="number" onSave={(v) => handleInlineBalanceSave(wallet.id, v)} />
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Live toggle */}
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <LiveToggle
                                                            isLive={isLive}
                                                            loading={togglingId === wallet.id}
                                                            onToggle={() => handleLiveToggle(wallet)}
                                                        />
                                                    </div>

                                                    {/* Actions */}
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                        <button onClick={() => openEdit(wallet)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: SKY, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                                            <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(wallet)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#fff1f2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                                            <Trash2 style={{ width: '11px', height: '11px' }} /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Quick-add inside group */}
                                        <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9' }}>
                                            <button onClick={() => { setAddForm(f => ({ ...f, method: group.method })); setShowAdd(true); setAddError(null); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: SKY, fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                                                <Plus style={{ width: '13px', height: '13px' }} /> Add {group.method} wallet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════ ADD WALLET MODAL ══════════════ */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Wallet">
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Field label="Wallet Name *">
                        <input type="text" placeholder="e.g. Main Bitcoin" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} style={INPUT_BASE} required />
                    </Field>
                    <Field label="Payment Method *">
                        <select value={addForm.method} onChange={e => setAddForm(f => ({ ...f, method: e.target.value }))} style={INPUT_BASE}>
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </Field>
                    <Field label="Identifier / Address" hint="Optional — the actual address, $cashtag, or email">
                        <input type="text" placeholder="e.g. $MyTag or wallet address" value={addForm.identifier} onChange={e => setAddForm(f => ({ ...f, identifier: e.target.value }))} style={INPUT_BASE} />
                    </Field>
                    <Field label="Initial Balance ($)">
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.balance} onChange={e => setAddForm(f => ({ ...f, balance: e.target.value }))} style={INPUT_BASE} />
                    </Field>

                    {/* Live status toggle in add form */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Set as Live</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Live wallets are available for deposits &amp; cashouts</p>
                        </div>
                        <LiveToggle isLive={addForm.isLive} loading={false} onToggle={() => setAddForm(f => ({ ...f, isLive: !f.isLive }))} />
                    </div>

                    <Alert type="error" message={addError} />
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                        <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button type="submit" disabled={addLoading}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '12px', background: addLoading ? '#e2e8f0' : SKY, color: addLoading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: addLoading ? 'wait' : 'pointer', fontSize: '14px' }}>
                            {addLoading ? <><RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Plus style={{ width: '14px', height: '14px' }} /> Create Wallet</>}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════ EDIT WALLET MODAL ══════════════ */}
            <Modal isOpen={!!editWallet} onClose={() => setEditWallet(null)} title="Edit Wallet">
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Field label="Wallet Name *">
                        <input type="text" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={INPUT_BASE} required />
                    </Field>
                    <Field label="Payment Method *">
                        <select value={editForm.method || ''} onChange={e => setEditForm(f => ({ ...f, method: e.target.value }))} style={INPUT_BASE}>
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </Field>
                    <Field label="Identifier / Address">
                        <input type="text" value={editForm.identifier || ''} onChange={e => setEditForm(f => ({ ...f, identifier: e.target.value }))} style={INPUT_BASE} />
                    </Field>
                    <Field label="Balance ($)" hint={`Current: ${fmt(editWallet?.balance)}`}>
                        <input type="number" step="0.01" min="0" value={editForm.balance || ''} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} style={INPUT_BASE} />
                    </Field>

                    {/* Live status toggle in edit form */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: editForm.isLive ? '#f0fdf4' : '#f8fafc', borderRadius: '8px', border: `1px solid ${editForm.isLive ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all .2s' }}>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Wallet Status</p>
                            <p style={{ margin: 0, fontSize: '11px', color: editForm.isLive ? '#15803d' : '#94a3b8' }}>
                                {editForm.isLive ? 'Live — available for transactions' : 'Offline — hidden from transaction forms'}
                            </p>
                        </div>
                        {/* <LiveToggle isLive={editForm.isLive} loading={false} onToggle={() => setEditForm(f => ({ ...f, isLive: !f.isLive }))} /> */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: editForm.isShared ? '#eff6ff' : '#f8fafc', borderRadius: '8px', border: `1px solid ${editForm.isShared ? '#bfdbfe' : '#e2e8f0'}`, transition: 'all .2s' }}>
                            <div>
                                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Share across all stores</p>
                                <p style={{ margin: 0, fontSize: '11px', color: editForm.isShared ? '#1d4ed8' : '#94a3b8' }}>
                                    {editForm.isShared ? 'Visible and usable by all stores' : 'This store only'}
                                </p>
                            </div>
                            <LiveToggle isLive={editForm.isShared} loading={false} onToggle={() => setEditForm(f => ({ ...f, isShared: !f.isShared }))} />
                        </div>
                    </div>

                    <Alert type="error" message={editError} />
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                        <button type="button" onClick={() => setEditWallet(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button type="submit" disabled={editLoading}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '12px', background: editLoading ? '#e2e8f0' : '#2563eb', color: editLoading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: editLoading ? 'wait' : 'pointer', fontSize: '14px' }}>
                            {editLoading ? <><RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save style={{ width: '14px', height: '14px' }} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════ DELETE CONFIRM MODAL ══════════════ */}
            <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Wallet">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ padding: '16px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#dc2626' }}>
                            Current balance: {fmt(deleteTarget?.balance)} — this action cannot be undone.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button onClick={handleDelete} disabled={deleteLoading}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '12px', background: deleteLoading ? '#e2e8f0' : '#dc2626', color: deleteLoading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: deleteLoading ? 'wait' : 'pointer', fontSize: '14px' }}>
                            {deleteLoading ? <><RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Deleting…</> : <><Trash2 style={{ width: '14px', height: '14px' }} /> Yes, Delete</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageWalletsPage;
