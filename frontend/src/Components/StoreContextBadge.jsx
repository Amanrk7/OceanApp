// components/StoreContextBadge.jsx
// Drop into modals, reports, and transaction rows to show store origin

import React, { useState } from 'react';
import { Globe, Building2, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);
const fj = async (path) => {
    const token = localStorage.getItem('authToken');
    const r = await fetch(`${API_BASE}${path}`, {
        credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Store-Id': String(getStoreId()), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return r.json();
};

// ── Tiny inline badge ─────────────────────────────────────────
export function StoreBadge({ storeId, isShared, size = 'sm' }) {
    const myStore = getStoreId();
    const isMine = storeId === myStore;
    const label = isShared ? 'Shared' : isMine ? `Store ${storeId}` : `S${storeId}`;
    const color = isShared ? '#7c3aed' : isMine ? '#0ea5e9' : '#f97316';
    const bg = isShared ? '#f5f3ff' : isMine ? '#f0f9ff' : '#fff7ed';
    const fs = size === 'xs' ? '9px' : '10px';

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '1px 6px', borderRadius: '10px', fontSize: fs,
            fontWeight: '700', background: bg, color,
            border: `1px solid ${color}40`,
        }}>
            {isShared
                ? <Globe style={{ width: '8px', height: '8px' }} />
                : <Building2 style={{ width: '8px', height: '8px' }} />}
            {label}
        </span>
    );
}

// ── Shared wallet card — shows global + per-store balance ─────
export function SharedWalletDetail({ wallet }) {
    const [expanded, setExpanded] = useState(false);
    const [storeBalances, setStoreBalances] = useState(null);
    const [loading, setLoading] = useState(false);
    if (!wallet?.isShared) return null;

    const load = async () => {
        if (storeBalances) { setExpanded(v => !v); return; }
        setLoading(true);
        try {
            const d = await fj(`/wallets/${wallet.id}/store-balances`);
            setStoreBalances(d.data?.storeBalances ?? []);
            setExpanded(true);
        } finally { setLoading(false); }
    };

    return (
        <div style={{ marginTop: '4px' }}>
            <button onClick={load} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '10px', color: '#7c3aed', padding: 0, fontFamily: 'inherit',
            }}>
                {loading
                    ? <RefreshCw style={{ width: '9px', height: '9px' }} />
                    : <Globe style={{ width: '9px', height: '9px' }} />}
                {expanded ? 'Hide' : 'View'} store balances
            </button>

            {expanded && storeBalances && (
                <div style={{ marginTop: '6px', padding: '8px', background: '#f5f3ff', borderRadius: '7px', border: '1px solid #ddd6fe' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '10px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Per-Store Balances
                    </p>
                    {storeBalances.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No per-store data yet</p>
                    ) : storeBalances.map(sb => {
                        const isMe = sb.storeId === getStoreId();
                        return (
                            <div key={sb.storeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #ede9fe', fontSize: '11px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isMe ? '#7c3aed' : '#64748b', fontWeight: isMe ? '700' : '400' }}>
                                    <Building2 style={{ width: '9px', height: '9px' }} />
                                    Store {sb.storeId} {isMe && '← you'}
                                </span>
                                <span style={{ fontWeight: '700', fontFamily: 'monospace', color: isMe ? '#7c3aed' : '#0f172a' }}>
                                    ${parseFloat(sb.balance).toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 0', fontSize: '11px', fontWeight: '800' }}>
                        <span style={{ color: '#475569' }}>Global total</span>
                        <span style={{ color: '#0f172a' }}>${parseFloat(wallet.globalBalance ?? wallet.balance).toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared game stock detail ──────────────────────────────────
export function SharedGameDetail({ game }) {
    const [expanded, setExpanded] = useState(false);
    const [storeStocks, setStoreStocks] = useState(null);
    const [loading, setLoading] = useState(false);
    if (!game?.isShared) return null;

    const load = async () => {
        if (storeStocks) { setExpanded(v => !v); return; }
        setLoading(true);
        try {
            const d = await fj(`/games/${game.id}/store-stocks`);
            setStoreStocks(d.data?.storeStocks ?? []);
            setExpanded(true);
        } finally { setLoading(false); }
    };

    return (
        <div style={{ marginTop: '4px' }}>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#7c3aed', padding: 0, fontFamily: 'inherit' }}>
                {loading ? <RefreshCw style={{ width: '9px', height: '9px' }} /> : <Globe style={{ width: '9px', height: '9px' }} />}
                {expanded ? 'Hide' : 'View'} store stocks
            </button>

            {expanded && storeStocks && (
                <div style={{ marginTop: '6px', padding: '8px', background: '#f5f3ff', borderRadius: '7px', border: '1px solid #ddd6fe' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '10px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Per-Store Stock</p>
                    {storeStocks.map(ss => {
                        const isMe = ss.storeId === getStoreId();
                        const statusColor = ss.status === 'HEALTHY' ? '#16a34a' : ss.status === 'LOW_STOCK' ? '#d97706' : '#dc2626';
                        return (
                            <div key={ss.storeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #ede9fe', fontSize: '11px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isMe ? '#7c3aed' : '#64748b', fontWeight: isMe ? '700' : '400' }}>
                                    <Building2 style={{ width: '9px', height: '9px' }} />
                                    Store {ss.storeId} {isMe && '← you'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: statusColor }}>{Math.round(ss.pointStock)} pts</span>
                                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '5px', background: statusColor + '15', color: statusColor }}>{ss.status}</span>
                                </span>
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 0', fontSize: '11px', fontWeight: '800' }}>
                        <span style={{ color: '#475569' }}>Global total</span>
                        <span style={{ color: '#7c3aed' }}>{Math.round(game.globalStock ?? game.pointStock)} pts</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SHARE TOGGLE — for ManageWalletsPage and Games page
// ═══════════════════════════════════════════════════════════════

export function ShareToggle({ type, id, isShared, onToggled }) {
    const [saving, setSaving] = useState(false);

    const toggle = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const path = type === 'wallet' ? `/wallets/${id}/share` : `/games/${id}/share`;
            await fetch(`${API_BASE}${path}`, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Store-Id': String(getStoreId()), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ isShared: !isShared }),
            });
            onToggled?.(!isShared);
        } finally { setSaving(false); }
    };

    return (
        <button onClick={toggle} disabled={saving} title={isShared ? 'Click to make store-only' : 'Click to share with other stores'} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', border: 'none', borderRadius: '20px',
            cursor: saving ? 'wait' : 'pointer', fontSize: '11px', fontWeight: '700',
            background: isShared ? '#f5f3ff' : '#f1f5f9',
            color: isShared ? '#7c3aed' : '#94a3b8',
            opacity: saving ? 0.6 : 1, transition: 'all .15s',
        }}>
            {saving ? <RefreshCw style={{ width: '9px', height: '9px' }} /> : <Globe style={{ width: '9px', height: '9px' }} />}
            {isShared ? 'Shared' : 'Private'}
        </button>
    );
}