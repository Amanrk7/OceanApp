import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, RefreshCw, CheckCircle, DollarSign, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
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
  'Deposit':        { bg: '#dcfce7', text: '#166634' },
  'Cashout':        { bg: '#fee2e2', text: '#991b1b' },
  'Match Bonus':    { bg: '#eff6ff', text: '#0369a1' },
  'Special Bonus':  { bg: '#faf5ff', text: '#6b21a8' },
  'Bonus':          { bg: '#eff6ff', text: '#0369a1' },
  'Streak Bonus':   { bg: '#fffbeb', text: '#92400e' },
  'Referral Bonus': { bg: '#f0fdf4', text: '#166634' },
  'Win':            { bg: '#dcfce7', text: '#166634' },
  'Loss':           { bg: '#fee2e2', text: '#991b1b' },
  'Freeplay':       { bg: '#fef3c7', text: '#92400e' },
};

const getAmountColor = (type) => {
  if (['Deposit', 'Win', 'Bonus', 'Match Bonus', 'Special Bonus', 'Streak Bonus', 'Referral Bonus', 'Freeplay'].includes(type)) return '#10b981';
  if (['Cashout', 'Loss'].includes(type)) return '#ef4444';
  return '#64748b';
};

const isCashout = (tx) => ['Cashout', 'cashout'].includes(tx.type);

// ─── Payment Progress Bar ─────────────────────────────────────────────────────
function PaymentProgress({ paid, total }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const remaining = Math.max(total - paid, 0);
  return (
    <div style={{ minWidth: '140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
        <span style={{ color: '#10b981' }}>Paid {fmt(paid)}</span>
        <span style={{ color: '#ef4444' }}>{fmt(remaining)} left</span>
      </div>
      <div style={{ height: '6px', background: '#fee2e2', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#f59e0b', borderRadius: '99px', transition: 'width .4s ease' }} />
      </div>
      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>{pct.toFixed(0)}% paid</div>
    </div>
  );
}

// ─── Partial Pay Panel ────────────────────────────────────────────────────────
function PartialPayPanel({ tx, onClose, onSuccess, onError }) {
  const remaining = Math.max((parseFloat(tx.amount) || 0) - (parseFloat(tx.paidAmount) || 0), 0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [markFull, setMarkFull] = useState(false);

  const payAmt = markFull ? remaining : (parseFloat(amount) || 0);
  const invalid = !markFull && (payAmt <= 0 || payAmt > remaining);

  const handlePay = async () => {
    if (invalid && !markFull) return;
    try {
      setSubmitting(true);
      await api.transactions.partialPayment(String(tx.id).replace(/\D/g, ''), { amount: payAmt });
      onSuccess(`Partial payment of ${fmt(payAmt)} recorded for transaction #${tx.id}.`);
    } catch (err) {
      onError(err.message || 'Partial payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ margin: '0 14px 12px', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <DollarSign size={12} /> Partial Payment — {fmt(remaining)} remaining
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#92400e', userSelect: 'none' }}>
          <input type="checkbox" checked={markFull} onChange={e => setMarkFull(e.target.checked)} style={{ cursor: 'pointer' }} />
          Pay full remaining ({fmt(remaining)})
        </label>
      </div>

      {!markFull && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none' }}>$</span>
            <input
              type="number"
              placeholder={`Max ${remaining.toFixed(2)}`}
              min="0.01"
              max={remaining}
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 22px', border: `1px solid ${invalid && amount ? '#fca5a5' : '#fde68a'}`, borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', outline: 'none' }}
            />
          </div>
          {amount && !invalid && (
            <span style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', whiteSpace: 'nowrap' }}>
              → {fmt(remaining - payAmt)} left after
            </span>
          )}
        </div>
      )}
      {invalid && amount && !markFull && (
        <p style={{ margin: 0, fontSize: '11px', color: '#ef4444' }}>⚠ Amount must be between $0.01 and {fmt(remaining)}</p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onClose} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #fde68a', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', color: '#92400e' }}>
          Cancel
        </button>
        <button onClick={handlePay} disabled={submitting || (!markFull && invalid)}
          style={{ flex: 2, padding: '8px', background: submitting || (!markFull && invalid) ? '#e2e8f0' : '#f59e0b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: submitting || (!markFull && invalid) ? 'not-allowed' : 'pointer', color: submitting || (!markFull && invalid) ? '#94a3b8' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          {submitting ? '⏳ Processing…' : <><DollarSign size={12} /> Record Payment of {fmt(markFull ? remaining : payAmt)}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, paidAmount, totalAmount }) {
  const isPartial = status === 'PENDING' && paidAmount > 0 && paidAmount < totalAmount;
  if (isPartial) {
    return (
      <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap' }}>
        PARTIAL
      </span>
    );
  }
  const s = {
    COMPLETED: { bg: '#dcfce7', text: '#166634' },
    PENDING:   { bg: '#fef3c7', text: '#92400e' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
    REJECTED:  { bg: '#fee2e2', text: '#991b1b' },
  }[status] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, undoingId, approvingId, onUndo, onApprove, onPartialSuccess, onError }) {
  const [showPartial, setShowPartial] = useState(false);

  const isUndoing    = undoingId === tx.id;
  const isApproving  = approvingId === tx.id;
  const canUndo      = (tx.status === 'COMPLETED' || tx.status === 'PENDING') && !isUndoing && !isApproving;
  const isDepositRow = tx.type === 'Deposit';
  const isCashoutRow = isCashout(tx);
  const isPending    = tx.status === 'PENDING';
  const isCompleted  = tx.status === 'COMPLETED';
  const positive     = !['Cashout', 'Loss'].includes(tx.type);

  const feeVal      = parseFloat(tx.fee) || 0;
  const depositVal  = parseFloat(tx.amount) || 0;
  const receivedAmt = depositVal - feeVal;
  const paidAmount  = parseFloat(tx.paidAmount) || 0;
  const totalAmount = depositVal;
  const isPartial   = isCashoutRow && isPending && paidAmount > 0 && paidAmount < totalAmount;

  const typeStyle = TYPE_COLORS[tx.type] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <>
      <tr
        style={{ borderBottom: showPartial ? 'none' : '1px solid #f1f5f9', opacity: tx.status === 'CANCELLED' ? 0.55 : 1, background: isCashoutRow && isPending ? '#fffdf5' : 'transparent' }}
        onMouseEnter={e => { if (!showPartial) e.currentTarget.style.background = isCashoutRow && isPending ? '#fffbeb' : '#fafbfc'; }}
        onMouseLeave={e => { if (!showPartial) e.currentTarget.style.background = isCashoutRow && isPending ? '#fffdf5' : 'transparent'; }}>

        {/* ID */}
        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0ea5e9', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {tx.id}
          {isCashoutRow && isPending && (
            <div style={{ marginTop: '3px' }}>
              <span style={{ fontSize: '9px', padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: '700' }}>
                <Clock size={8} style={{ display: 'inline', marginRight: '2px' }} />AWAITING
              </span>
            </div>
          )}
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

        {/* Fee */}
        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', background: isDepositRow ? '#fafeff' : 'transparent' }}>
          {feeVal > 0
            ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#f59e0b' }}>−{fmt(feeVal)}</span>
            : <span style={{ color: '#e2e8f0', fontSize: '12px' }}>—</span>
          }
        </td>

        {/* Received / Paid Progress */}
        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', background: (isDepositRow || isCashoutRow) ? '#fafeff' : 'transparent' }}>
          {isDepositRow
            ? <span style={{ fontWeight: '700', fontSize: '13px', color: '#0ea5e9' }}>{fmt(receivedAmt)}</span>
            : isCashoutRow
              ? <PaymentProgress paid={paidAmount} total={totalAmount} />
              : <span style={{ color: '#e2e8f0', fontSize: '12px' }}>—</span>
          }
        </td>

        {/* Game */}
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
         {tx.gameStockBefore != null && tx.gameStockAfter != null && (
    <div style={{ marginTop: tx.balanceBefore != null ? '4px' : '0' }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Game Points</div>
      <span style={{ color: '#94a3b8' }}>{parseFloat(tx.gameStockBefore).toFixed(0)}</span>
      <span style={{ color: tx.gameStockAfter >= tx.gameStockBefore ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
        {' → '}{parseFloat(tx.gameStockAfter).toFixed(0)}
      </span>
    </div>
  )}
  {tx.gameStockBefore == null && (
    <span style={{ color: '#e2e8f0' }}>—</span>
  )}
          
        </td>

        {/* Status */}
        <td style={{ padding: '12px 14px' }}>
          <StatusBadge status={tx.status} paidAmount={paidAmount} totalAmount={totalAmount} />
        </td>

        {/* Date */}
        <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
          {formatDate(tx)}
        </td>

        {/* Actions */}
        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>

            {/* Approve button — only for pending cashouts */}
            {isCashoutRow && isPending && !isUndoing && (
              <button onClick={() => onApprove(tx.id)}
                disabled={isApproving}
                title="Mark as fully paid & complete"
                style={{ background: isApproving ? '#e2e8f0' : '#10b981', border: 'none', color: isApproving ? '#94a3b8' : '#fff', cursor: isApproving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all .15s' }}
                onMouseEnter={e => { if (!isApproving) e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={e => { if (!isApproving) e.currentTarget.style.background = '#10b981'; }}>
                {isApproving ? '⏳ Marking…' : <><CheckCircle size={11} /> Mark Done</>}
              </button>
            )}

            {/* Partial pay button — only for pending cashouts */}
            {isCashoutRow && isPending && !isApproving && !isUndoing && (
              <button onClick={() => setShowPartial(v => !v)}
                title="Record a partial payment"
                style={{ background: showPartial ? '#fef3c7' : '#fff', border: '1px solid #fde68a', color: '#92400e', cursor: 'pointer', fontWeight: '600', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                <DollarSign size={11} /> Partial Pay {showPartial ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}

            {/* Undo */}
            {isUndoing && <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Reversing…</span>}
            {canUndo && !isCashoutRow && (
              <button onClick={() => onUndo(tx.id)}
                title="Undo — reverses the transaction and restores all balances"
                style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff1f2'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}>
                <RotateCcw size={11} /> Undo
              </button>
            )}
            {/* Undo for completed cashouts */}
            {isCashoutRow && isCompleted && canUndo && (
              <button onClick={() => onUndo(tx.id)}
                style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff1f2'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}>
                <RotateCcw size={11} /> Undo
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Partial pay panel — injected as a sub-row */}
      {showPartial && (
        <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fffdf5' }}>
          <td colSpan={12} style={{ padding: 0 }}>
            <PartialPayPanel
              tx={tx}
              onClose={() => setShowPartial(false)}
              onSuccess={(msg) => { setShowPartial(false); onPartialSuccess(msg); }}
              onError={(msg) => { setShowPartial(false); onError(msg); }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Transactions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [undoingId, setUndoingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [banner, setBanner] = useState({ type: '', msg: '' }); // type: 'success' | 'error'
  const itemsPerPage = 15;

  const showBanner = (type, msg) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner({ type: '', msg: '' }), 4000);
  };

  const loadTransactions = useCallback(async (page = currentPage, tab = filterTab, forceRefresh = false) => {
    try {
      setLoading(true);
      const statusFilter = tab === 'pending' ? 'PENDING' : tab === 'completed' ? 'COMPLETED' : '';
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

  // Pending cashout count for badge
  const pendingCashoutCount = transactions.filter(t => isCashout(t) && t.status === 'PENDING').length;

  const handleUndo = async (transactionId) => {
    const numericId = String(transactionId).replace(/\D/g, '');
    try {
      setUndoingId(transactionId);
      const result = await api.transactions.undoTransaction(numericId);
      api.clearCache?.();
      await loadTransactions(currentPage, filterTab, true);
      window.dispatchEvent(new CustomEvent('transactionUndone', {
        detail: { transactionId, message: result.message, timestamp: new Date().toISOString() }
      }));
      showBanner('success', `✓ Transaction #${transactionId} reversed successfully.`);
    } catch (error) {
      showBanner('error', error.message || 'Undo failed. Please try again.');
    } finally {
      setUndoingId(null);
    }
  };

  // Approve cashout — marks it COMPLETED (full payment)
  const handleApprove = async (transactionId) => {
    const numericId = String(transactionId).replace(/\D/g, '');
    try {
      setApprovingId(transactionId);
      await api.transactions.approveCashout(numericId);
      api.clearCache?.();
      await loadTransactions(currentPage, filterTab, true);
      showBanner('success', `✓ Cashout #${transactionId} marked as completed.`);
    } catch (error) {
      showBanner('error', error.message || 'Approval failed. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const handlePartialSuccess = async (msg) => {
    api.clearCache?.();
    await loadTransactions(currentPage, filterTab, true);
    showBanner('success', msg);
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
    { id: 'all',       label: 'All Transactions', badge: null },
    { id: 'pending',   label: 'Pending', badge: filterTab !== 'pending' && pendingCashoutCount > 0 ? pendingCashoutCount : null },
    { id: 'completed', label: 'Completed', badge: null },
  ];
 
  const headers = ['ID', 'Player', 'Type', 'Amount', 'Fee', 'Received / Paid', 'Game', 'Wallet', 'Before → After', 'Status', 'Date', 'Actions'];

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            All deposits, cashouts, and bonuses · Cashouts start as <strong style={{ color: '#92400e' }}>Pending</strong> and must be approved by admin
          </p>
        </div>
        <button onClick={() => loadTransactions(currentPage, filterTab, true)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Pending cashouts info banner */}
      {pendingCashoutCount > 0 && filterTab !== 'pending' && (
        <div style={{ padding: '11px 16px', marginBottom: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Clock size={14} />
            <strong>{pendingCashoutCount}</strong> cashout{pendingCashoutCount !== 1 ? 's' : ''} awaiting your approval on this page
          </span>
          <button onClick={() => { setFilterTab('pending'); setCurrentPage(1); }}
            style={{ background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            View Pending →
          </button>
        </div>
      )}

      {/* Success / Error banner */}
      {banner.msg && (
        <div style={{ padding: '11px 16px', marginBottom: '16px', background: banner.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${banner.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', color: banner.type === 'success' ? '#166634' : '#991b1b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {banner.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {banner.msg}
          </span>
          <button onClick={() => setBanner({ type: '', msg: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0', flex: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setFilterTab(tab.id); setCurrentPage(1); }} style={{
              padding: '10px 16px', background: 'none', border: 'none',
              fontWeight: '600', fontSize: '13px',
              color: filterTab === tab.id ? '#0ea5e9' : '#64748b',
              borderBottom: filterTab === tab.id ? '2px solid #0ea5e9' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {tab.label}
              {tab.badge && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                  {tab.badge}
                </span>
              )}
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

      {/* How it works info — cashout workflow */}
      {filterTab === 'pending' && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>1️⃣</span> Cashout is recorded → auto set to <strong>PENDING</strong></span>
          <span style={{ color: '#cbd5e1' }}>→</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>2️⃣</span> Optionally pay in <strong>partial installments</strong></span>
          <span style={{ color: '#cbd5e1' }}>→</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>3️⃣</span> Admin clicks <strong>Mark Done</strong> → moves to <strong>COMPLETED</strong></span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,.05)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            Loading transactions…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {headers.map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '11px 14px',
                      fontWeight: '700', color: '#64748b',
                      textTransform: 'uppercase', fontSize: '11px',
                      letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap', background: '#f8fafc',
                      ...(h === 'Fee' || h === 'Received / Paid'
                        ? { color: '#0369a1', background: '#f0f9ff' }
                        : {}),
                      ...(h === 'Actions' ? { color: '#92400e', background: '#fffbeb' } : {}),
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    undoingId={undoingId}
                    approvingId={approvingId}
                    onUndo={handleUndo}
                    onApprove={handleApprove}
                    onPartialSuccess={handlePartialSuccess}
                    onError={(msg) => showBanner('error', msg)}
                  />
                )) : (
                  <tr>
                    <td colSpan={headers.length} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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
