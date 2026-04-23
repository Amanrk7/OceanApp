// hooks/useSharedResources.js
// Real-time hook that keeps wallets and games in sync across stores via SSE

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);

const fj = async (path, opts = {}) => {
    const token = localStorage.getItem('authToken');
    const r = await fetch(`${API_BASE}${path}`, {
        credentials: 'include', cache: 'no-store', ...opts,
        headers: {
            'Content-Type': 'application/json',
            'X-Store-Id': String(getStoreId()),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts.headers ?? {}),
        },
    });
    if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error ?? r.statusText); }
    return r.json();
};

/**
 * Returns wallets and games for the current store, with real-time updates
 * via SSE when any store modifies a shared resource.
 *
 * Usage:
 *   const { wallets, games, loading, refresh } = useSharedResources();
 */
export function useSharedResources({ listenSSE = true } = {}) {
    const [wallets, setWallets] = useState([]);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const sseRef = useRef(null);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [w, g] = await Promise.all([fj('/wallets'), fj('/games')]);
            setWallets((w.data ?? []).flatMap(grp => grp.subAccounts ?? []));
            setGames(g.data ?? []);
        } catch (_) { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // SSE listener — patch local state instantly when SSE arrives
    useEffect(() => {
        if (!listenSSE) return;
        const token = localStorage.getItem('authToken');
        const sseUrl = `${API_BASE}/tasks/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        const es = new EventSource(sseUrl, { withCredentials: true });
        sseRef.current = es;

        es.onmessage = (e) => {
            try {
                const { type, data } = JSON.parse(e.data);
                const myStore = getStoreId();

                if (type === 'wallet_balance_updated') {
                    // Only update if this event is for our store or it's a globally shared wallet
                    setWallets(prev => prev.map(w => {
                        if (w.id !== data.walletId) return w;
                        // If the event is for our store, use the store-specific balance
                        if (data.storeId === myStore) return { ...w, balance: data.newStoreBalance };
                        // If it's a shared wallet update from another store, show global balance context
                        if (w.isShared) return { ...w, globalBalance: data.globalBalance };
                        return w;
                    }));
                }

                if (type === 'game_stock_updated') {
                    setGames(prev => prev.map(g => {
                        if (g.id !== data.gameId) return g;
                        if (data.storeId === myStore) return { ...g, pointStock: data.newStoreStock, status: data.newStatus };
                        if (g.isShared) return { ...g, globalStock: data.newStoreStock };
                        return g;
                    }));
                }

                // Full refresh triggers
                if (['wallet_share_updated', 'game_share_updated'].includes(type)) {
                    loadAll(true);
                }
            } catch (_) { }
        };

        return () => es.close();
    }, [listenSSE, loadAll]);

    // Flat wallet list filtered to live wallets
    const liveWallets = wallets.filter(w => w.isLive !== false);

    // Grouped wallets for display
    const groupedWallets = wallets.reduce((acc, w) => {
        if (!acc[w.method]) acc[w.method] = { method: w.method, totalBalance: 0, subAccounts: [] };
        acc[w.method].subAccounts.push(w);
        acc[w.method].totalBalance += w.balance || 0;
        return acc;
    }, {});

    return {
        wallets,
        liveWallets,
        groupedWallets: Object.values(groupedWallets),
        games,
        loading,
        refresh: () => loadAll(true),
    };
}