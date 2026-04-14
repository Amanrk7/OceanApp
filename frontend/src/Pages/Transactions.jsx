import { useState, useCallback, useEffect, useContext } from 'react';
import {
  RotateCcw, RefreshCw, CheckCircle, DollarSign,
  ChevronDown, ChevronUp, Clock, AlertCircle, Lock,
  TrendingUp, TrendingDown, Activity, Search, X,
} from 'lucide-react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { ShiftStatusContext } from '../Context/membershiftStatus';
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';

// ─── Design tokens (mirrors PlaytimePage) ────────────────────────────────────
const CARD = {
  background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
  boxShadow: '0 2px 12px rgba(15,23,42,.07)',
};
const LABEL = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
  boxSizing: 'border-box', background: '#fff', color: '#0f172a', outline: 'none',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (tx) => {
  const raw = tx.timestamp ?? tx.createdAt ?? tx.date ?? null;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const isCashout = (tx) => ['Cashout', 'cashout'].includes(tx.type);

const TYPE_META = {
  Deposit:        { bg: '#dcfce7', text: '#166634' },
  Cashout:        { bg: '#fee2e2', text: '#991b1b' },
  'Match Bonus':  { bg: '#eff6ff', text: '#0369a1' },
  'Special Bonus':{ bg: '#faf5ff', text: '#6b21a8' },
  'Streak Bonus': { bg: '#fffbeb', text: '#92400e' },
  'Referral Bonus':{ bg: '#f0fdf4', text: '#166634' },
  Bonus:          { bg: '#eff6ff', text: '#0369a1' },
};
const amtColor = (type) =>
  ['Deposit','Win','Bonus','Match Bonus','Special Bonus','Streak Bonus','Referral Bonus'].includes(type)
    ? '#10b981' : ['Cashout','Loss'].includes(type) ? '#ef4444' : '#64748b';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, border }) {
  return (
    <div style={{ ...CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: '17px', height: '17px', color }} />
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', fontWeight: '600' }}>{label}</div>
        {sub && <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
function Banner({ type, msg, onDismiss }) {
  if (!msg) return null;
  const s = type === 'success'
    ? { bg: '#dcfce7', border: '#86efac', text: '#166534', Icon: CheckCircle }
    : { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', Icon: AlertCircle };
  return (
    <div style={{ padding: '11px 16px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', color: s.text, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <s.Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {msg}
      </span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, display: 'flex' }}>
          <X style={{ width: '13px', height: '13px' }} />
        </button>
      )}
    </div>
  );
}

// ─── Payment progress bar ─────────────────────────────────────────────────────
function PaymentProgress({ paid, total }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const remaining = Math.max(total - paid, 0);
  return (
    <div style={{ minWidth: '130px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
        <span style={{ color: '#10b981' }}>{fmt(paid)}</span>
        <span style={{ color: '#ef4444' }}>{fmt(remaining)} left</span>
      </div>
      <div style={{ height: '5px', background: '#fee2e2', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#f59e0b', borderRadius: '99px', transition: 'width .4s' }} />
      </div>
      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>{pct.toFixed(0)}% paid</div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, paidAmount, totalAmount }) {
  const isPartial = status === 'PENDING' && paidAmount > 0 && paidAmount < totalAmount;
  if (isPartial) return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: '#fef3c7', color: '#92400e' }}>PARTIAL</span>;
  const s = { COMPLETED: { bg: '#dcfce7', text: '#166634' }, PENDING: { bg: '#fef3c7', text: '#92400e' }, CANCELLED: { bg: '#fee2e2', text: '#991b1b' }, REJECTED: { bg: '#fee2e2', text: '#991b1b' } }[status] || { bg: '#f1f5f9', text: '#475569' };
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.text }}>{status}</span>;
}

// ─── Partial pay panel ────────────────────────────────────────────────────────
function PartialPayPanel({ tx, onClose, onSuccess, onError }) {
  const remaining = Math.max((parseFloat(tx.amount) || 0) - (parseFloat(tx.paidAmount) || 0), 0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [markFull, setMarkFull] = useState(false);
  const payAmt = markFull ? remaining : (parseFloat(amount) || 0);
  const invalid = !markFull && (payAmt <= 0 || payAmt > remaining);

  const handle = async () => {
    if (invalid && !markFull) return;
    try {
      setSubmitting(true);
      await api.transactions.partialPayment(String(tx.id).replace(/\D/g, ''), { amount: payAmt });
      onSuccess(`Partial payment of ${fmt(payAmt)} recorded for #${tx.id}.`);
    } catch (err) { onError(err.message || 'Partial payment failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ margin: '0 14px 12px', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <DollarSign style={{ width: '12px', height: '12px' }} /> Partial Payment — {fmt(remaining)} remaining
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }}>✕</button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#92400e', userSelect: 'none' }}>
        <input type="checkbox" checked={markFull} onChange={e => setMarkFull(e.target.checked)} style={{ cursor: 'pointer' }} />
        Pay full remaining ({fmt(remaining)})
      </label>
      {!markFull && (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none' }}>$</span>
          <input type="number" placeholder={`Max ${remaining.toFixed(2)}`} min="0.01" max={remaining} step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 22px', border: `1px solid ${invalid && amount ? '#fca5a5' : '#fde68a'}`, borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
        </div>
      )}
      {invalid && amount && !markFull && <p style={{ margin: 0, fontSize: '11px', color: '#ef4444' }}>⚠ Must be between $0.01 and {fmt(remaining)}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onClose} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #fde68a', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', color: '#92400e' }}>Cancel</button>
        <button onClick={handle} disabled={submitting || (!markFull && invalid)}
          style={{ flex: 2, padding: '8px', background: submitting || (!markFull && invalid) ? '#e2e8f0' : '#f59e0b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: submitting || (!markFull && invalid) ? 'not-allowed' : 'pointer', color: submitting || (!markFull && invalid) ? '#94a3b8' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          {submitting ? '⏳ Processing…' : <><DollarSign style={{ width: '12px', height: '12px' }} /> Record {fmt(markFull ? remaining : payAmt)}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx, undoingId, approvingId, onUndo, onApprove, onPartialSuccess, onError }) {
  const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);
  const navigate = useNavigate();
  const [showPartial, setShowPartial] = useState(false);
  const [hover, setHover] = useState(false);

  const isUndoing   = undoingId === tx.id;
  const isApproving = approvingId === tx.id;
  const canUndo     = (tx.status === 'COMPLETED' || tx.status === 'PENDING') && !isUndoing && !isApproving;
  const isDepositRow  = tx.type === 'Deposit';
  const isCashoutRow  = isCashout(tx);
  const isPending     = tx.status === 'PENDING';
  const isCompleted   = tx.status === 'COMPLETED';
  const positive      = !['Cashout', 'Loss'].includes(tx.type);
  const feeVal        = parseFloat(tx.fee) || 0;
  const depositVal    = parseFloat(tx.amount) || 0;
  const paidAmount    = parseFloat(tx.paidAmount) || 0;
  const totalAmount   = depositVal;
  const typeStyle     = TYPE_META[tx.type] || { bg: '#f1f5f9', text: '#475569' };

  const TD = {
    padding: '11px 14px', borderBottom: '1px solid #f1f5f9',
    fontSize: '13px', color: '#0f172a', verticalAlign: 'middle',
  };

  return (
    <>
      <tr
        style={{ borderBottom: showPartial ? 'none' : '1px solid #f1f5f9', opacity: tx.status === 'CANCELLED' ? 0.5 : 1, background: isCashoutRow && isPending ? '#fffdf5' : 'transparent', transition: 'background .1s' }}
        onMouseEnter={e => { if (!showPartial) e.currentTarget.style.background = isCashoutRow && isPending ? '#fffbeb' : '#f8fafc'; }}
        onMouseLeave={e => { if (!showPartial) e.currentTarget.style.background = isCashoutRow && isPending ? '#fffdf5' : 'transparent'; }}>

        {/* ID */}
        <td style={{ ...TD, fontWeight: '700', color: '#0ea5e9', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {tx.id}
          {isCashoutRow && isPending && (
            <div style={{ marginTop: '3px' }}>
              <span style={{ fontSize: '9px', padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Clock style={{ width: '8px', height: '8px' }} /> AWAITING
              </span>
            </div>
          )}
        </td>

        {/* Player */}
        <td style={{ ...TD, minWidth: '130px' }}>
          <div
            onClick={() => { setSelectedPlayer(tx.playerId ? { id: tx.playerId, name: tx.playerName } : null); navigate(`/playerDashboard/${tx.playerId}`); }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: hover ? '#0ea5e9' : '#0f172a', transition: 'color .12s' }}>
            {tx.playerName || '—'}
          </div>
          {tx.email && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{tx.email}</div>}
        </td>

        {/* Type */}
        <td style={TD}>
          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: typeStyle.bg, color: typeStyle.text, whiteSpace: 'nowrap' }}>
            {tx.type}
          </span>
        </td>

        {/* Amount */}
        <td style={{ ...TD, fontWeight: '900', fontSize: '14px', color: amtColor(tx.type), whiteSpace: 'nowrap' }}>
          {positive ? '+' : '−'}{fmt(tx.amount)}
        </td>

        {/* Fee */}
        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
          {feeVal > 0
            ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#f59e0b' }}>−{fmt(feeVal)}</span>
            : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>

        {/* Received / Paid */}
        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
          {isDepositRow
            ? <span style={{ fontWeight: '700', fontSize: '13px', color: '#0ea5e9' }}>{fmt(depositVal - feeVal)}</span>
            : isCashoutRow
              ? <PaymentProgress paid={paidAmount} total={totalAmount} />
              : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>

        {/* Game */}
        <td style={TD}>
          {tx.gameName
            ? <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: '5px', fontSize: '11px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{tx.gameName}</span>
            : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>

        {/* Wallet */}
        <td style={{ ...TD, minWidth: '110px' }}>
          {tx.walletMethod || tx.walletName
            ? <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{tx.walletMethod}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tx.walletName}</div>
              </div>
            : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>

        {/* Game stock before → after */}
        <td style={{ ...TD, fontSize: '12px', whiteSpace: 'nowrap' }}>
          {tx.gameStockBefore != null && tx.gameStockAfter != null ? (() => {
            const isCO = isCashout(tx);
            const sb = parseFloat(tx.gameStockBefore), sa = parseFloat(tx.gameStockAfter);
            const paid = parseFloat(tx.paidAmount) || 0, total = parseFloat(tx.amount) || 0;
            const eff = isCO ? sb + paid : sa;
            const rem = isCO ? total - paid : 0;
            const up = eff >= sb;
            return (
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px' }}>Points</div>
                <span style={{ color: '#94a3b8' }}>{sb.toFixed(0)}</span>
                <span style={{ color: up ? '#22c55e' : '#ef4444', fontWeight: '700' }}> → {eff.toFixed(0)}</span>
                {isCO && rem > 0 && (
                  <div style={{ marginTop: '3px', height: '4px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', width: '72px' }}>
                    <div style={{ height: '100%', width: `${total > 0 ? Math.min((paid / total) * 100, 100) : 0}%`, background: '#22c55e', borderRadius: '99px' }} />
                  </div>
                )}
              </div>
            );
          })() : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>

        {/* Status */}
        <td style={TD}>
          <StatusBadge status={tx.status} paidAmount={paidAmount} totalAmount={totalAmount} />
        </td>

        {/* Date */}
        <td style={{ ...TD, fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
          {fmtDate(tx)}
        </td>

        {/* Actions */}
        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
            {isCashoutRow && isPending && !isUndoing && (
              <button onClick={() => onApprove(tx.id)} disabled={isApproving}
                style={{ background: isApproving ? '#e2e8f0' : '#10b981', border: 'none', color: isApproving ? '#94a3b8' : '#fff', cursor: isApproving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { if (!isApproving) e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={e => { if (!isApproving) e.currentTarget.style.background = '#10b981'; }}>
                {isApproving ? '⏳' : <><CheckCircle style={{ width: '11px', height: '11px' }} /> Mark Done</>}
              </button>
            )}
            {isCashoutRow && isPending && !isApproving && !isUndoing && (
              <button onClick={() => setShowPartial(v => !v)}
                style={{ background: showPartial ? '#fef3c7' : '#fff', border: '1px solid #fde68a', color: '#92400e', cursor: 'pointer', fontWeight: '600', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <DollarSign style={{ width: '11px', height: '11px' }} /> Partial {showPartial ? <ChevronUp style={{ width: '10px', height: '10px' }} /> : <ChevronDown style={{ width: '10px', height: '10px' }} />}
              </button>
            )}
            {isUndoing && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Reversing…</span>}
            {canUndo && (!isCashoutRow || isCompleted) && (
              <button onClick={() => onUndo(tx.id)}
                style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '11px', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all .12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff1f2'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}>
                <RotateCcw style={{ width: '11px', height: '11px' }} /> Undo
              </button>
            )}
          </div>
        </td>
      </tr>

      {showPartial && (
        <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fffdf5' }}>
          <td colSpan={12} style={{ padding: 0 }}>
            <PartialPayPanel tx={tx}
              onClose={() => setShowPartial(false)}
              onSuccess={msg => { setShowPartial(false); onPartialSuccess(msg); }}
              onError={msg => { setShowPartial(false); onError(msg); }} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Locked screen ────────────────────────────────────────────────────────────
function LockedScreen() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={() => navigate('/shifts')}
        style={{ alignSelf: 'flex-start', padding: '9px 18px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
        Start Shift
      </button>
      <div style={{ ...CARD, padding: '14px 18px', borderLeft: '3px solid #fde68a', background: '#fffbeb' }}>
        <p style={{ fontWeight: '700', color: '#92400e', margin: '0 0 2px', fontSize: '13px' }}>Shift required</p>
        <p style={{ color: '#92400e', margin: 0, fontSize: '12px', opacity: 0.8 }}>Start a shift to view and manage transactions.</p>
      </div>
      <div style={{ ...CARD, padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Lock style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
        </div>
        <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Dashboard locked</p>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Go to Shifts and start your shift first.</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Transactions() {
  const { shiftActive } = useContext(ShiftStatusContext);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filterTab, setFilterTab] = useState(() => {
    const saved = sessionStorage.getItem('transactions_initialTab');
    sessionStorage.removeItem('transactions_initialTab');
    return saved === 'pending' ? 'pending' : 'all';
  });
  const [search, setSearch]     = useState('');
  const [currentPage, setCurrPage] = useState(1);
  const [undoingId, setUndoingId]   = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [banner, setBanner]     = useState({ type: '', msg: '' });
  const LIMIT = 15;

  const showBanner = (type, msg) => { setBanner({ type, msg }); setTimeout(() => setBanner({ type: '', msg: '' }), 4000); };

  const load = useCallback(async (page = currentPage, tab = filterTab, force = false) => {
    try {
      setLoading(true);
      const status = tab === 'pending' ? 'PENDING' : tab === 'completed' ? 'COMPLETED' : '';
      setData(await api.transactions.getTransactions(page, LIMIT, '', status, force));
    } catch (e) { showBanner('error', e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, [currentPage, filterTab]);

  useEffect(() => { load(currentPage, filterTab); }, [currentPage, filterTab]);

  const transactions = data?.data || [];
  const pagination   = data?.pagination || { page: 1, limit: LIMIT, total: 0, pages: 1 };
  const pendingCount = transactions.filter(t => isCashout(t) && t.status === 'PENDING').length;

  // Stats for the top strip
  const totalAmt    = transactions.reduce((s, t) => s + (t.type === 'Deposit' ? parseFloat(t.amount) : 0), 0);
  const cashoutAmt  = transactions.reduce((s, t) => s + (isCashout(t) && t.status === 'COMPLETED' ? parseFloat(t.amount) : 0), 0);
  const bonusAmt    = transactions.reduce((s, t) => s + (t.type?.includes('Bonus') && t.status === 'COMPLETED' ? parseFloat(t.amount) : 0), 0);

  const handleUndo = async (id) => {
    const numId = String(id).replace(/\D/g, '');
    try {
      setUndoingId(id);
      await api.transactions.undoTransaction(numId);
      api.clearCache?.();
      await load(currentPage, filterTab, true);
      showBanner('success', `Transaction #${id} reversed.`);
    } catch (e) { showBanner('error', e.message || 'Undo failed.'); }
    finally { setUndoingId(null); }
  };

  const handleApprove = async (id) => {
    const numId = String(id).replace(/\D/g, '');
    try {
      setApprovingId(id);
      await api.transactions.approveCashout(numId);
      api.clearCache?.();
      await load(currentPage, filterTab, true);
      showBanner('success', `Cashout #${id} completed.`);
    } catch (e) { showBanner('error', e.message || 'Approval failed.'); }
    finally { setApprovingId(null); }
  };

  const filtered = transactions.filter(t => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return String(t.id)?.toLowerCase().includes(s) || t.playerName?.toLowerCase().includes(s) || t.email?.toLowerCase().includes(s) || t.gameName?.toLowerCase().includes(s) || t.walletMethod?.toLowerCase().includes(s);
  });

  const TABS = [
    { id: 'all',       label: 'All',       badge: null },
    { id: 'pending',   label: 'Pending',   badge: filterTab !== 'pending' && pendingCount > 0 ? pendingCount : null },
    { id: 'completed', label: 'Completed', badge: null },
  ];

  const COLS = ['ID','Player','Type','Amount','Fee','Received / Paid','Game','Wallet','Points','Status','Date','Actions'];

  if (!shiftActive) return <LockedScreen />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── Stat strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <StatCard icon={TrendingUp}  label="Deposits (page)"  value={fmt(totalAmt)}  color="#10b981" bg="#f0fdf4" border="#86efac" />
        <StatCard icon={TrendingDown} label="Cashouts (page)" value={fmt(cashoutAmt)} color="#ef4444" bg="#fee2e2" border="#fca5a5" />
        <StatCard icon={Activity}    label="Bonuses (page)"   value={fmt(bonusAmt)}  color="#f59e0b" bg="#fffbeb" border="#fde68a" />
        <StatCard icon={Clock}       label="Pending cashouts" value={pendingCount}    color="#0ea5e9" bg="#f0f9ff" border="#bae6fd" sub="awaiting approval" />
      </div>

      {/* ── Banners ── */}
      {pendingCount > 0 && filterTab !== 'pending' && (
        <div style={{ padding: '11px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Clock style={{ width: '14px', height: '14px' }} />
            <strong>{pendingCount}</strong> cashout{pendingCount !== 1 ? 's' : ''} awaiting approval on this page
          </span>
          <button onClick={() => { setFilterTab('pending'); setCurrPage(1); }}
            style={{ background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 14px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            View Pending →
          </button>
        </div>
      )}
      <Banner type={banner.type} msg={banner.msg} onDismiss={() => setBanner({ type: '', msg: '' })} />

      {/* ── Main card ── */}
      <div style={{ ...CARD, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Transaction Log</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Deposits, cashouts & bonuses · Cashouts are PENDING until approved</div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Player, game, wallet…" value={search} onChange={e => { setSearch(e.target.value); setCurrPage(1); }}
              style={{ ...INPUT, paddingLeft: '30px', paddingRight: search ? '28px' : '12px', width: '190px', padding: '8px 28px 8px 30px', fontSize: '12px' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            )}
          </div>

          <button onClick={() => load(currentPage, filterTab, true)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
            <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0', padding: '0 18px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setFilterTab(t.id); setCurrPage(1); }}
              style={{ padding: '10px 14px', background: 'none', border: 'none', fontWeight: '700', fontSize: '12px', color: filterTab === t.id ? '#0ea5e9' : '#94a3b8', borderBottom: `2px solid ${filterTab === t.id ? '#0ea5e9' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .12s', letterSpacing: '0.4px' }}>
              {t.label}
              {t.badge && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '9px', fontWeight: '800', padding: '1px 6px', minWidth: '16px', textAlign: 'center' }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* Pending workflow hint */}
        {filterTab === 'pending' && (
          <div style={{ padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#475569', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>1️⃣ Cashout recorded → <strong>PENDING</strong></span>
            <span style={{ color: '#cbd5e1' }}>→</span>
            <span>2️⃣ Optional <strong>partial payments</strong></span>
            <span style={{ color: '#cbd5e1' }}>→</span>
            <span>3️⃣ <strong>Mark Done</strong> → COMPLETED</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Loading transactions…</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f8fafc' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {COLS.map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(tx => (
                  <TxRow key={tx.id} tx={tx}
                    undoingId={undoingId} approvingId={approvingId}
                    onUndo={handleUndo} onApprove={handleApprove}
                    onPartialSuccess={async msg => { api.clearCache?.(); await load(currentPage, filterTab, true); showBanner('success', msg); }}
                    onError={msg => showBanner('error', msg)} />
                )) : (
                  <tr><td colSpan={COLS.length} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Page {pagination.page} / {pagination.pages} · {pagination.total} records
            </span>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button onClick={() => setCurrPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#374151', fontWeight: '600', fontSize: '12px' }}>← Prev</button>
              {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => (
                <button key={i + 1} onClick={() => setCurrPage(i + 1)}
                  style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${currentPage === i + 1 ? '#0ea5e9' : '#e2e8f0'}`, background: currentPage === i + 1 ? '#f0f9ff' : '#fff', color: currentPage === i + 1 ? '#0ea5e9' : '#374151', fontWeight: currentPage === i + 1 ? '800' : '500', cursor: 'pointer', fontSize: '12px' }}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}
                style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer', color: currentPage === pagination.pages ? '#cbd5e1' : '#374151', fontWeight: '600', fontSize: '12px' }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } ::-webkit-scrollbar { width: 5px; height: 5px; } ::-webkit-scrollbar-track { background: #f8fafc; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }`}</style>
    </div>
  );
}
