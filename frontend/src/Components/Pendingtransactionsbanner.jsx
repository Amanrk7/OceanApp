import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api';

const POLL_INTERVAL_MS = 60_000; // re-check every 60 s

/**
 * PendingTransactionsBanner
 *
 * Fetches pending-cashout count globally and renders a sticky amber banner
 * whenever there are transactions that need attention.
 *
 * Props:
 *   currentPage  – the active page id (string) — banner is hidden on 'transactions'
 *                  so it doesn't duplicate what's already shown there
 *   onNavigate   – (pageId: string, extra?: object) => void
 *                  called with { page: 'transactions', tab: 'pending' }
 */
export default function PendingTransactionsBanner({ currentPage, onNavigate }) {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismiss] = useState(false);
    const timerRef = useRef(null);

    const fetchCount = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            // Reuse the existing transactions API; fetch page 1 with a large limit
            // so we get an accurate server-side total for PENDING.
            const result = await api.transactions.getTransactions(1, 100, '', 'PENDING', true);
            const txs = result?.data || [];
            // Only cashouts count — deposits/bonuses are fine sitting as PENDING
            const cashoutsPending = txs.filter(
                t => ['Cashout', 'cashout'].includes(t.type)
            ).length;
            // Use server pagination total if available and all fit in one page,
            // otherwise fall back to the slice length
            const serverTotal = result?.pagination?.total ?? cashoutsPending;
            setCount(serverTotal > cashoutsPending ? serverTotal : cashoutsPending);
            setDismiss(false); // reset dismiss when count changes
        } catch {
            // silently ignore — network errors shouldn't crash the whole app
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    // Initial fetch + polling
    useEffect(() => {
        fetchCount();
        timerRef.current = setInterval(() => fetchCount(true), POLL_INTERVAL_MS);
        return () => clearInterval(timerRef.current);
    }, [fetchCount]);

    // Refetch whenever the user navigates away from the transactions page
    // (they may have just approved something)
    useEffect(() => {
        if (currentPage !== 'transactions') fetchCount(true);
    }, [currentPage, fetchCount]);

    // Hide on the transactions page itself (it has its own banner)
    // or when dismissed or when there's nothing to show
    if (currentPage === 'transactions' || dismissed || count === 0) return null;

    return (
        <div
            role="alert"
            style={{
                marginBottom: '18px',
                padding: '11px 14px 11px 16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                boxShadow: '0 2px 8px rgba(245,158,11,.12)',
                animation: 'pendingSlideIn .25s ease',
            }}
        >
            {/* Left — icon + message */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#92400e', fontWeight: '600', flex: 1, minWidth: '200px' }}>
                <span style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: '#fef3c7', border: '1px solid #fde68a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Clock size={14} color="#d97706" />
                </span>

                <span>
                    <strong style={{ color: '#78350f' }}>{count} cashout{count !== 1 ? 's' : ''}</strong>
                    {' '}pending and waiting for approval
                </span>
            </span>

            {/* Right — actions */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* Refresh */}
                <button
                    onClick={() => fetchCount()}
                    disabled={loading}
                    title="Refresh count"
                    style={{
                        background: 'none', border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        color: '#d97706', padding: '4px', display: 'flex', alignItems: 'center',
                        opacity: loading ? 0.5 : 1,
                    }}
                >
                    <RefreshCw
                        size={13}
                        style={{ animation: loading ? 'pendingSpin 1s linear infinite' : 'none' }}
                    />
                </button>

                {/* CTA */}
                <button
                    onClick={() => onNavigate('transactions', { tab: 'pending' })}
                    style={{
                        background: '#f59e0b',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '7px',
                        padding: '6px 14px',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        transition: 'background .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#d97706'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f59e0b'; }}
                >
                    <AlertTriangle size={12} />
                    Review Now →
                </button>

                {/* Dismiss */}
                <button
                    onClick={() => setDismiss(true)}
                    title="Dismiss (until next refresh)"
                    style={{
                        background: 'none', border: 'none',
                        cursor: 'pointer', color: '#d97706',
                        padding: '4px', display: 'flex', alignItems: 'center',
                        borderRadius: '4px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                    <X size={14} />
                </button>
            </span>

            <style>{`
        @keyframes pendingSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pendingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}