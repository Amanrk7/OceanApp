import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';
import { api } from '../api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

const formatDate = (tx) => {
  const raw = tx.timestamp ?? tx.createdAt ?? tx.date ?? null;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const TYPE_COLORS = {
  'Deposit': { bg: '#dcfce7', text: '#166534' },
  'Cashout': { bg: '#fee2e2', text: '#991b1b' },
  'Match Bonus': { bg: '#eff6ff', text: '#0369a1' },
  'Special Bonus': { bg: '#faf5ff', text: '#6b21a8' },
  'Bonus': { bg: '#eff6ff', text: '#0369a1' },
  'Streak Bonus': { bg: '#fffbeb', text: '#92400e' },
  'Referral Bonus': { bg: '#f0fdf4', text: '#166534' },
  'Win': { bg: '#dcfce7', text: '#166534' },
  'Loss': { bg: '#fee2e2', text: '#991b1b' },
  'Freeplay': { bg: '#fef3c7', text: '#92400e' },
};

const getAmountColor = (type) => {
  if (['Deposit', 'Win', 'Bonus', 'Match Bonus', 'Special Bonus', 'Streak Bonus', 'Referral Bonus', 'Freeplay'].includes(type)) return '#10b981';
  if (['Cashout', 'Loss'].includes(type)) return '#ef4444';
  return '#64748b';
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = {
    COMPLETED: { bg: '#dcfce7', text: '#166534' },
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
    REJECTED: { bg: '#fee2e2', text: '#991b1b' },
  }[status] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Transactions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [undoingId, setUndoingId] = useState(null);
  const [undoError, setUndoError] = useState('');
  const itemsPerPage = 15;

  // const loadTransactions = useCallback(async (page = currentPage, tab = filterTab) => {
  //   try {
  //     setLoading(true);
  //     const statusFilter = tab === 'pending' ? 'PENDING' : tab === 'completed' ? 'COMPLETED' : '';
  //     const result = await api.transactions.getTransactions(page, itemsPerPage, '', statusFilter);
  //     setData(result);
  //   } catch (error) {
  //     console.error('Failed to load transactions:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [currentPage, filterTab]);
  const loadTransactions = useCallback(async (page = currentPage, tab = filterTab, forceRefresh = false) => {
    try {
      setLoading(true);
      const statusFilter = tab === 'pending' ? 'PENDING' : tab === 'completed' ? 'COMPLETED' : '';
      // ✅ Pass forceRefresh to API
      const result = await api.transactions.getTransactions(page, itemsPerPage, '', statusFilter, forceRefresh);
      setData(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterTab]);
  useEffect(() => { loadTransactions(currentPage, filterTab); }, [currentPage, filterTab]);

  const transactions = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 15, total: 0, pages: 1 };

  // ── Undo with real-time balance reload ────────────────────────────────────
  const handleUndo = async (transactionId) => {
    setUndoError('');
    const numericId = String(transactionId).replace(/\D/g, '');
    try {
      setUndoingId(transactionId);

      // Backend handles everything: balance reversal + game point restoration
      const result = await api.transactions.undoTransaction(numericId);

      // const selectedGame = games.find(g => g.name === addFormData.game);
      // await api.games.updateGame(selectedGame.id, { pointStock: selectedGame.pointStock + pointsAdded });


      // Clear cache and reload
      api.clearCache?.();
      await loadTransactions(currentPage, filterTab, true);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('transactionUndone', {
          detail: { transactionId, message: result.message, timestamp: new Date().toISOString() }
        }));
      }

    } catch (error) {
      console.error('Failed to undo transaction:', error);
      setUndoError(error.message || 'Undo failed. Please try again.');
    } finally {
      setUndoingId(null);
    }
  };
  const filteredTransactions = transactions.filter(t => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(t.id)?.toLowerCase().includes(s) ||
      t.playerName?.toLowerCase().includes(s) ||
      t.email?.toLowerCase().includes(s) ||
      t.gameName?.toLowerCase().includes(s) ||
      t.walletMethod?.toLowerCase().includes(s)
    );
  });

  const tabs = [
    { id: 'all', label: 'All Transactions' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {/* <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 2px', color: '#0f172a' }}>Transaction History</h1> */}
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>All deposits, cashouts, and bonuses — with game, wallet, and balance details</p>
        </div>
        <button onClick={() => loadTransactions(currentPage, filterTab)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Undo error banner ── */}
      {undoError && (
        <div style={{ padding: '11px 16px', marginBottom: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {undoError}</span>
          <button onClick={() => setUndoError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* ── Tabs + Search ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0', flex: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setFilterTab(tab.id); setCurrentPage(1); }} style={{
              padding: '10px 16px', background: 'none', border: 'none',
              fontWeight: '600', fontSize: '13px',
              color: filterTab === tab.id ? '#0ea5e9' : '#64748b',
              borderBottom: filterTab === tab.id ? '2px solid #0ea5e9' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by player, game, wallet…"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ minWidth: '220px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none' }}
        />
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            Loading transactions…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  {['ID', 'Player', 'Type', 'Amount', 'Game', 'Wallet', 'Balance Before → After', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '11px 14px',
                      fontWeight: '700', color: '#64748b',
                      textTransform: 'uppercase', fontSize: '11px',
                      letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? filteredTransactions.map(tx => {
                  const typeStyle = TYPE_COLORS[tx.type] || { bg: '#f1f5f9', text: '#475569' };
                  const positive = !['Cashout', 'Loss'].includes(tx.type);
                  const isUndoing = undoingId === tx.id;
                  const canUndo = (tx.status === 'COMPLETED' || tx.status === 'PENDING') && !isUndoing;
                  return (
                    <tr key={tx.id}
                      style={{ borderBottom: '1px solid #f1f5f9', opacity: tx.status === 'CANCELLED' ? 0.55 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      {/* ID */}
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0ea5e9', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {tx.id}
                      </td>

                      {/* Player */}
                      <td style={{ padding: '12px 14px', minWidth: '130px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{tx.playerName || '—'}</div>
                        {tx.email && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{tx.email}</div>}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: typeStyle.bg, color: typeStyle.text, whiteSpace: 'nowrap' }}>
                          {tx.type}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', fontWeight: '800', fontSize: '14px', color: getAmountColor(tx.type), whiteSpace: 'nowrap' }}>
                        {positive ? '+' : '−'}{fmt(tx.amount)}
                      </td>

                      {/* Game name */}
                      <td style={{ padding: '12px 14px' }}>
                        {tx.gameName
                          ? <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: '5px', fontSize: '11px', fontWeight: '500', color: '#475569', whiteSpace: 'nowrap' }}>{tx.gameName}</span>
                          : <span style={{ color: '#e2e8f0', fontSize: '12px' }}>—</span>
                        }
                      </td>

                      {/* Wallet */}
                      <td style={{ padding: '12px 14px', minWidth: '110px' }}>
                        {(tx.walletMethod || tx.walletName)
                          ? <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{tx.walletMethod || ''}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tx.walletName || ''}</div>
                          </div>
                          : <span style={{ color: '#e2e8f0', fontSize: '12px' }}>—</span>
                        }
                      </td>

                      {/* Balance before → after */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {tx.balanceBefore != null && tx.balanceAfter != null
                          ? <>
                            <span style={{ color: '#94a3b8' }}>{fmt(tx.balanceBefore)}</span>
                            <span style={{ color: positive ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                              {' → '}{fmt(tx.balanceAfter)}
                            </span>
                          </>
                          : <span style={{ color: '#e2e8f0' }}>—</span>
                        }
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={tx.status} />
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(tx)}
                      </td>

                      {/* Undo action */}
                      <td style={{ padding: '12px 14px' }}>
                        {isUndoing
                          ? <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Reversing…</span>
                          : canUndo
                            ? <button onClick={() => handleUndo(tx.id)}
                              title="Undo — reverses the transaction and restores all balances in real-time"
                              style={{
                                background: 'none', border: '1px solid #e2e8f0', color: '#64748b',
                                cursor: 'pointer', fontWeight: '600', fontSize: '12px',
                                borderRadius: '6px', padding: '5px 10px',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                whiteSpace: 'nowrap', transition: 'all .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff1f2'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}>
                              <RotateCcw size={12} /> Undo
                            </button>
                            : null
                        }
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="10" style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Page {pagination.page} / {pagination.pages}
          {pagination.total > 0 && ` · Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`}
        </p>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: currentPage === 1 ? '#cbd5e1' : '#0ea5e9', fontWeight: '600', fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
            ← Prev
          </button>
          {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)} style={{
              padding: '6px 10px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer',
              background: currentPage === i + 1 ? '#0ea5e9' : '#fff',
              color: currentPage === i + 1 ? '#fff' : '#0ea5e9',
              border: `1px solid ${currentPage === i + 1 ? '#0ea5e9' : '#e2e8f0'}`,
            }}>{i + 1}</button>
          ))}
          {pagination.pages > 10 && <span style={{ color: '#cbd5e1', fontSize: '13px' }}>…</span>}
          <button onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}
            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: currentPage === pagination.pages ? '#cbd5e1' : '#0ea5e9', fontWeight: '600', fontSize: '12px', cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}