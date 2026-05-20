import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Clock, CheckCircle, AlertCircle, RefreshCw, X,
  Wallet, Gamepad2, ClipboardList, TrendingUp, Download,
  Search, ChevronDown, ChevronUp, List, Users, Gift,
  Filter, Calendar, FileText, DollarSign
} from 'lucide-react';
import { ShiftStatusContext } from '../Context/membershiftStatus.jsx';
import { CurrentUserContext } from '../Context/currentUser.jsx';
import { api } from '../api';
import ShiftRatingModal from './ShiftRatingModal.jsx';
import SmartTaskList from './SmartTaskList.jsx';
import { useLiveReconciliation } from '../hooks/useLiveReconciliation';
import { printShiftPDF } from './pdfExports';



const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);

const fj = async (path, opts = {}) => {
  const token = localStorage.getItem('authToken');
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Store-Id': String(getStoreId()),   // ← THIS is the fix
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new Error(b.error ?? r.statusText);
  }
  return r.json();
};

// ─── Helpers ──────────────────────────────────────────────────
const r2 = v => Math.round((v ?? 0) * 100) / 100;          // round to 2dp
const fmt$ = v => `$${Math.abs(r2(v)).toFixed(2)}`;
const sign$ = v => (r2(v) >= 0 ? '+' : '−');
const clr$ = v => (r2(v) >= 0 ? '#16a34a' : '#dc2626');
const clrPts = v => (r2(v) <= 0 ? '#16a34a' : '#dc2626'); // pts going down is good

// ─── Design tokens ────────────────────────────────────────────
const T = {
  card: { background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '28px 32px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 1000, display: 'flex', alignItems: 'start', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(3px)' },
  modal: { background: '#fff', borderRadius: '18px', boxShadow: '0 24px 64px rgba(15,23,42,.3)', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  th: { padding: '10px 14px', fontWeight: '600', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '11px 14px', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  TH: { textAlign: 'left', padding: '10px 20px', fontWeight: '600', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc' },
  TD: { padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' },
};

const Badge = ({ label, color = '#64748b', bg = '#f1f5f9' }) => (
  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: bg, color }}>{label}</span>
);

const taStyle = (required, value) => ({
  width: '100%', padding: '10px 12px',
  border: `1px solid ${required && !value?.trim() ? '#fca5a5' : '#d1d5db'}`,
  borderRadius: '8px', fontSize: '13px', resize: 'vertical',
  fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', lineHeight: 1.5,
  background: '#fff', color: '#0f172a',
});

// ═══════════════════════════════════════════════════════════════
// CHECKIN MODAL — with Today's Expenses & Takeouts context
// ═══════════════════════════════════════════════════════════════
// Replace the entire CheckinModal component with this version

const CheckinModal = ({ onConfirm, onCancel }) => {
  const [wallets, setWallets] = useState([]);
  const [games, setGames] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [todayTakeouts, setTodayTakeouts] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [walletInputs, setWalletInputs] = useState({});
  const [gameInputs, setGameInputs] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) { setLoading(false); return; }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const fromDate = encodeURIComponent(todayStart.toISOString());

    Promise.all([
      fj('/wallets'),
      fj('/games'),
      fj('/tasks?myTasks=true'),
      fj(`/expenses?fromDate=${fromDate}`).catch(() => ({ data: [] })),
      fj(`/profit-takeouts?fromDate=${fromDate}&limit=50`).catch(() => ({ data: [] })),
    ])
      .then(([w, g, t, exp, takeouts]) => {
        const flatWallets = (w.data ?? [])
          .flatMap(grp => grp.subAccounts ?? [])
          .filter(w => w.isLive !== false);
        const gameList = g.data ?? [];
        setWallets(flatWallets);
        setGames(gameList);
        setTasks((t.data ?? []).filter(task => task.status !== 'COMPLETED'));
        setTodayExpenses(exp?.data ?? []);
        setTodayTakeouts(takeouts?.data ?? []);

        const wi = {};
        flatWallets.forEach(w => { wi[w.id] = (w.balance ?? 0).toFixed(2); });
        setWalletInputs(wi);

        const gi = {};
        gameList.forEach(g => { gi[g.id] = (g.pointStock ?? 0).toFixed(0); });
        const fetched = Math.round(g.pointStock ?? 0); // ← already done correctly in the row render

        setGameInputs(gi);
      })
      .catch(err => console.error('CheckinModal fetch:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalWallet = r2(wallets.reduce((s, w) => s + (parseFloat(walletInputs[w.id]) || 0), 0));
  const totalGames = Math.round(games.reduce((s, g) => s + (parseFloat(gameInputs[g.id]) || 0), 0));

  const walletDiscrepancies = wallets.filter(w => {
    const entered = parseFloat(walletInputs[w.id]);
    const fetched = w.balance ?? 0;
    return !isNaN(entered) && Math.abs(r2(entered - fetched)) > 0.01;
  });
  // const gameDiscrepancies = games.filter(g => {
  //   const entered = parseFloat(gameInputs[g.id]);
  //   const fetched = g.pointStock ?? 0;
  //   return !isNaN(entered) && Math.abs(Math.round(entered - fetched)) > 0;
  // });
  const gameDiscrepancies = games.filter(g => {
    const entered = parseFloat(gameInputs[g.id]);
    const fetched = Math.round(g.pointStock ?? 0); // ← round fetched too
    return !isNaN(entered) && Math.abs(Math.round(entered) - fetched) > 0;
  });
  const hasDiscrepancies = walletDiscrepancies.length > 0 || gameDiscrepancies.length > 0;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm({
        walletSnapshot: wallets.map(w => ({
          id: w.id, name: w.name, method: w.method,
          balance: r2(parseFloat(walletInputs[w.id]) || 0),
          fetchedBalance: r2(w.balance ?? 0),
        })),
        gameSnapshot: games.map(g => ({
          id: g.id, name: g.name,
          pointStock: Math.round(parseFloat(gameInputs[g.id]) || 0),
          fetchedPointStock: Math.round(g.pointStock ?? 0),
        })),
        totalWallet, totalGames, notes,
        capturedAt: new Date().toISOString(),
        hasDiscrepancies,
        walletDiscrepancyCount: walletDiscrepancies.length,
        gameDiscrepancyCount: gameDiscrepancies.length,
      });
    } finally { setConfirming(false); }
  };

  const inputStyle = (hasDisc) => ({
    width: '96px', padding: '5px 8px',
    border: `1.5px solid ${hasDisc ? '#f59e0b' : '#d1d5db'}`,
    borderRadius: '6px', fontSize: '13px', fontWeight: '700', textAlign: 'right',
    fontFamily: 'inherit', outline: 'none',
    background: hasDisc ? '#fffbeb' : '#fff', color: '#0f172a',
  });

  const totalTodayExpenses = todayExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalTodayTakeouts = todayTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
  const hasTodayActivity = todayExpenses.length > 0 || todayTakeouts.length > 0;

  return (
    <div style={T.overlay}>
      <div style={T.modal}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🌅 Start-of-Shift Verification</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Enter the balances you <b>actually see</b> — pre-filled from system, edit if different
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
              Loading current balances…
            </div>
          ) : <>
            {hasDiscrepancies && (
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                ⚠️ <b>Discrepancy detected</b> — your entered values differ from the system.
                {walletDiscrepancies.length > 0 && <span> Wallet: {walletDiscrepancies.map(w => w.name).join(', ')}.</span>}
                {gameDiscrepancies.length > 0 && <span> Games: {gameDiscrepancies.map(g => g.name).join(', ')}.</span>}
                {' '}Add a note explaining the difference below.
              </div>
            )}

            {/* ── Today's Activity Context (expenses + takeouts from earlier today) ── */}
            {hasTodayActivity && (
              <section>
                <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={14} color="#d97706" /> Today's Activity
                  <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8' }}>(before your shift)</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Expenses today */}
                  <div style={{ border: '1px solid #fde68a', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📋 Expenses ({todayExpenses.length})</span>
                      <span>${totalTodayExpenses.toFixed(2)}</span>
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {todayExpenses.length === 0 ? (
                        <p style={{ margin: 0, padding: '8px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>None today</p>
                      ) : todayExpenses.map(e => (
                        <div key={e.id} style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.details}</p>
                            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>{e.category?.replace('_', ' ')} {e.game?.name ? `· ${e.game.name}` : ''}</p>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', flexShrink: 0 }}>${(e.amount ?? 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Takeouts today */}
                  <div style={{ border: '1px solid #fecdd3', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', fontSize: '11px', fontWeight: '700', color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💸 Profit Takeouts ({todayTakeouts.length})</span>
                      <span>${totalTodayTakeouts.toFixed(2)}</span>
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {todayTakeouts.length === 0 ? (
                        <p style={{ margin: 0, padding: '8px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>None today</p>
                      ) : todayTakeouts.map(t => (
                        <div key={t.id} style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.takenBy}</p>
                            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>{t.method} {t.notes ? `· ${t.notes}` : ''}</p>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', flexShrink: 0 }}>${parseFloat(t.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Wallet Balances ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={14} color="#2563eb" /> Live Wallet Balances
                  <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8' }}>(enter actual)</span>
                </h3>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>${totalWallet.toFixed(2)} total</span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={T.th}>Method</th>
                      <th style={T.th}>Account</th>
                      <th style={{ ...T.th, textAlign: 'right' }}>System</th>
                      <th style={{ ...T.th, textAlign: 'right', color: '#0f172a', minWidth: '130px' }}>Actual ✏️</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map(w => {
                      const entered = parseFloat(walletInputs[w.id]);
                      const fetched = r2(w.balance ?? 0);
                      const hasDisc = !isNaN(entered) && Math.abs(r2(entered - fetched)) > 0.01;
                      return (
                        <tr key={w.id} style={{ background: hasDisc ? '#fefce8' : 'transparent' }}>
                          <td style={T.td}><b style={{ color: '#475569' }}>{w.method}</b></td>
                          <td style={T.td}>
                            {w.name}
                            {w.identifier && <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '12px' }}>{w.identifier}</span>}
                          </td>
                          <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>${fetched.toFixed(2)}</td>
                          <td style={{ ...T.td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>$</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={walletInputs[w.id] ?? ''}
                                onChange={e => setWalletInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                                style={inputStyle(hasDisc)}
                              />
                              {hasDisc && <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700' }} title={`System: $${fetched.toFixed(2)}`}>⚠️</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {wallets.length === 0 && (
                      <tr><td colSpan={4} style={{ ...T.td, textAlign: 'center', color: '#94a3b8' }}>No live wallets found</td></tr>
                    )}
                    <tr style={{ background: '#f0fdf4' }}>
                      <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#166534' }}>Combined Total</td>
                      <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>${r2(wallets.reduce((s, w) => s + (w.balance ?? 0), 0)).toFixed(2)}</td>
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#16a34a', fontSize: '14px' }}>${totalWallet.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            {/* ── Game Points Reconciliation ── */}
            {/* ── Game Points ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gamepad2 size={14} color="#7c3aed" /> Game Points
                  <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8' }}>(enter actual)</span>
                </h3>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#7c3aed' }}>{totalGames} pts total</span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={T.th}>Game</th>
                      <th style={{ ...T.th, textAlign: 'center' }}>Status</th>
                      <th style={{ ...T.th, textAlign: 'right' }}>System</th>
                      <th style={{ ...T.th, textAlign: 'right', color: '#0f172a', minWidth: '130px' }}>Actual ✏️</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map(g => {
                      const entered = parseFloat(gameInputs[g.id]);
                      const fetched = Math.round(g.pointStock ?? 0);
                      const hasDisc = !isNaN(entered) && Math.abs(Math.round(entered) - fetched) > 0;
                      return (
                        <tr key={g.id} style={{ background: hasDisc ? '#fefce8' : 'transparent' }}>
                          <td style={T.td}>
                            <b>{g.name}</b>
                            {g.isShared && (
                              <span style={{
                                marginLeft: '6px', fontSize: '10px', fontWeight: '700',
                                color: '#7c3aed', background: '#ede9fe',
                                padding: '1px 5px', borderRadius: '5px'
                              }}>shared</span>
                            )}
                          </td>
                          <td style={{ ...T.td, textAlign: 'center' }}>
                            <Badge
                              label={g.status}
                              color={g.status === 'HEALTHY' ? '#16a34a' : g.status === 'LOW_STOCK' ? '#854d0e' : '#991b1b'}
                              bg={g.status === 'HEALTHY' ? '#dcfce7' : g.status === 'LOW_STOCK' ? '#fef9c3' : '#fee2e2'}
                            />
                          </td>
                          <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>{fetched} pts</td>
                          <td style={{ ...T.td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <input
                                type="number" step="1" min="0"
                                value={gameInputs[g.id] ?? ''}
                                onChange={e => setGameInputs(prev => ({ ...prev, [g.id]: e.target.value }))}
                                style={inputStyle(hasDisc)}
                              />
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>pts</span>
                              {hasDisc && <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700' }}>⚠️</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {games.length === 0 && (
                      <tr><td colSpan={4} style={{ ...T.td, textAlign: 'center', color: '#94a3b8' }}>No games found</td></tr>
                    )}
                    <tr style={{ background: '#f5f3ff' }}>
                      <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#5b21b6' }}>Combined Total</td>
                      <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>
                        {Math.round(games.reduce((s, g) => s + (g.pointStock ?? 0), 0))} pts
                      </td>
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#7c3aed', fontSize: '14px' }}>
                        {totalGames} pts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Active Tasks ── */}
            {tasks.length > 0 && (
              <section>
                <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClipboardList size={14} color="#0891b2" /> Your Active Tasks
                  <span style={{ background: '#0891b2', color: '#fff', borderRadius: '10px', padding: '0 7px', fontSize: '11px' }}>{tasks.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{t.taskType?.replace(/_/g, ' ')} · {t.priority}</p>
                        {t.targetValue && (
                          <div style={{ marginTop: '5px', height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#2563eb', borderRadius: '2px', width: `${Math.min(100, ((t.currentValue ?? 0) / t.targetValue) * 100)}%` }} />
                          </div>
                        )}
                      </div>
                      <Badge label={t.status.replace('_', ' ')} color={t.status === 'IN_PROGRESS' ? '#1d4ed8' : '#475569'} bg={t.status === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9'} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Opening Notes / Discrepancies
                {hasDiscrepancies
                  ? <span style={{ color: '#dc2626', marginLeft: '6px' }}>* required — explain discrepancies above</span>
                  : <span style={{ color: '#94a3b8', fontWeight: 400 }}> (optional)</span>}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={hasDiscrepancies ? 'Explain why your entered balances differ…' : 'Note any balance discrepancies before starting…'}
                rows={3}
                style={taStyle(hasDiscrepancies, notes)}
              />
            </section>
          </>}
        </div>

        <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#f8fafc' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Wallet: <b style={{ color: '#16a34a' }}>${totalWallet.toFixed(2)}</b>
            {' · '}Games: <b style={{ color: '#7c3aed' }}>{totalGames} pts</b>
            {hasTodayActivity && <span style={{ marginLeft: '8px', color: '#b45309' }}>· Expenses today: ${totalTodayExpenses.toFixed(2)}{totalTodayTakeouts > 0 ? ` · Takeouts: $${totalTodayTakeouts.toFixed(2)}` : ''}</span>}
            {hasDiscrepancies && <span style={{ color: '#f59e0b', marginLeft: '8px', fontWeight: '600' }}>⚠️ Discrepancies noted</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || confirming || (hasDiscrepancies && !notes.trim())}
              style={{
                padding: '10px 22px', background: '#16a34a', color: '#fff', border: 'none',
                borderRadius: '8px', fontWeight: '700', fontSize: '13px',
                cursor: (loading || confirming || (hasDiscrepancies && !notes.trim())) ? 'not-allowed' : 'pointer',
                opacity: (loading || confirming || (hasDiscrepancies && !notes.trim())) ? .6 : 1,
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              {confirming ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</> : '✓ Confirm & Start Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHECKOUT MODAL — with Transactions + Expenses & Takeouts tabs
// Replace the entire CheckoutModal component with this version
// ═══════════════════════════════════════════════════════════════
//
// IMPORTANT: Add `DollarSign` to your lucide-react imports at top of file:
// import { ..., DollarSign } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CHECKOUT MODAL — Fixed Version
//
// CHANGES FROM ORIGINAL:
//  ✅ recon hook is the SINGLE source of truth for all financial values
//  ✅ Expenses & takeouts derived from recon.breakdown (no double-fetch)
//  ✅ Wallet / game tables use recon.wallets / recon.games
//  ✅ DiscrepancyPanel includes expense, takeout, reload lines
//  ✅ Mid-shift wallet/game detection with explanatory banner
//  ✅ Pending-cashout notice in reconciliation
//  ✅ Expenses & Takeouts tab fully implemented (was placeholder)
//  ✅ Only transactions + cross-store fetched locally
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// DISCREPANCY PANEL — cross-store aware
// ═══════════════════════════════════════════════════════════════
// function DiscrepancyPanel({ recon }) {
function DiscrepancyPanel({ recon, manualAdjBalanced }) {
  if (!recon) return null;

  if (!recon.hasStartSnapshot) {
    return (
      <div style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>ℹ️</div>
        <div>
          <p style={{ margin: '0 0 2px', fontWeight: '600', color: '#475569', fontSize: '13px' }}>No opening snapshot</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Reconciliation requires a confirmed start balance from check-in.</p>
        </div>
      </div>
    );
  }

  const bd = recon.breakdown;
  const hasCrossStore = recon.hasCrossStore ?? false;
  const totalCrossWalletAmt = recon.totalCrossWalletAmt ?? 0;
  const totalCrossGamePts = recon.totalCrossGamePts ?? 0;
  const crossAdjWalletDisc = recon.crossAdjWalletDisc ?? (recon.walletDiscrepancy ?? 0);
  const crossAdjGameDisc = recon.crossAdjGameDisc ?? (recon.gameDiscrepancy ?? 0);
  const crossAdjWalletBal = recon.crossAdjWalletBal ?? recon.walletBalanced;
  const crossAdjGameBal = recon.crossAdjGameBal ?? recon.gameBalanced;
  const effectiveAllOk = ((hasCrossStore ? (recon.crossAdjBalanced ?? false) : recon.isBalanced) || manualAdjBalanced) ?? false;
  const effectiveWalletOk = hasCrossStore ? crossAdjWalletBal : recon.walletBalanced;
  const effectiveGameOk = hasCrossStore ? crossAdjGameBal : recon.gameBalanced;
  const effectiveWalletDisc = hasCrossStore ? crossAdjWalletDisc : (recon.walletDiscrepancy ?? 0);
  const effectiveGameDisc = hasCrossStore ? crossAdjGameDisc : (recon.gameDiscrepancy ?? 0);
  const wd = recon.walletDiscrepancy ?? 0;
  const gd = recon.gameDiscrepancy ?? 0;

  // ── Status label
  let statusLabel, statusSub, statusIcon;
  if (effectiveAllOk) {
    if (manualAdjBalanced && !recon.isBalanced) {
      statusIcon = '⚙️'; statusLabel = 'Admin edit explains this'; statusSub = 'A direct balance correction was made outside transactions — no real discrepancy.';
    } else if (hasCrossStore) {
      statusIcon = '⚡'; statusLabel = 'Balanced via cross-store'; statusSub = 'Other stores used shared resources — their activity accounts for the difference.';
    } else {
      statusIcon = '✓'; statusLabel = 'Fully balanced'; statusSub = 'All deposits, cashouts, fees, and expenses reconcile perfectly.';
    }
  } else {
    const parts = [];
    if (!effectiveWalletOk) parts.push(`cash short $${Math.abs(effectiveWalletDisc).toFixed(2)}`);
    if (!effectiveGameOk) parts.push(`points off by ${Math.abs(effectiveGameDisc)}`);
    statusIcon = '⚠️'; statusLabel = `Discrepancy — ${parts.join(' · ')}`; statusSub = 'The numbers don\'t add up. Check the formula below to identify the source.';
  }

  // ── Variables (replace everything from "const partialPayments" to "const crossAdminGameEdit") ──
  const partialPayments = bd.partialPayments ?? 0;
  const crossPtsReloaded = bd.crossPointsReloaded ?? 0;
  const crossWalletExpense = recon.crossExpenseWallet ?? bd.crossWalletExpensePaid ?? 0;
  const crossWalletTakeout = recon.crossTakeoutWallet ?? bd.crossWalletTakeoutPaid ?? 0;
  const crossAdminWalletEdit = recon.crossAdminWalletEdit ?? 0;
  const crossAdminGameEdit = recon.crossAdminGameEdit ?? 0;

  // ── receiptRows ───────────────────────────────────────────────────────────────
  const receiptRows = [
    {
      label: 'Deposits',
      wallet: `+$${(bd.deposits ?? 0).toFixed(2)}`,
      pts: `−${Math.round(bd.deposits ?? 0)} pts`,
      wc: '#16a34a', gc: '#7c3aed',
    },
    {
      label: 'Cashouts (completed)',
      wallet: `−$${(bd.completedCashouts ?? 0).toFixed(2)}`,
      pts: `+${Math.round(bd.completedCashouts ?? 0)} pts`,
      wc: '#dc2626', gc: '#16a34a',
    },
    ...(partialPayments > 0 ? [{
      label: `Partial payments (${(bd.partiallyPaidCashouts ?? []).length} cashouts)`,
      wallet: `−$${partialPayments.toFixed(2)}`,
      pts: `+${Math.round(partialPayments)} pts`,
      wc: '#dc2626', gc: '#16a34a',
      info: true,
    }] : []),
    ...(bd.totalFees > 0.001 ? [{
      label: 'Fees',
      wallet: `−$${(bd.totalFees ?? 0).toFixed(2)}`,
      pts: '—',
      wc: '#f59e0b', gc: '#94a3b8',
    }] : []),
    ...(bd.bonuses > 0.001 ? [{
      label: 'Bonuses granted',
      wallet: '—',
      pts: `−${Math.round(bd.bonuses ?? 0)} pts`,
      wc: '#94a3b8', gc: '#c2410c',
    }] : []),
    ...(bd.pointsReloaded > 0.001 ? [{
      label: 'Points reloaded (this store)',
      wallet: '—',
      pts: `+${Math.round(bd.pointsReloaded ?? 0)} pts`,
      wc: '#94a3b8', gc: '#16a34a',
    }] : []),
    ...(crossPtsReloaded > 0 ? [{
      label: 'Points reloaded (other stores — shared game)',
      wallet: '—',
      pts: `+${crossPtsReloaded} pts`,
      wc: '#94a3b8', gc: '#7c3aed',
      cross: true,
    }] : []),
    ...(bd.expenseWalletPaid > 0.001 ? [{
      label: 'Expense payments (this store)',
      wallet: `−$${(bd.expenseWalletPaid ?? 0).toFixed(2)}`,
      pts: '—',
      wc: '#b45309', gc: '#94a3b8',
    }] : []),
    ...(crossWalletExpense > 0 ? [{   // ← single, consolidated row
      label: 'Expense payments (other stores — shared wallet)',
      wallet: `−$${crossWalletExpense.toFixed(2)}`,
      pts: '—',
      wc: '#b45309', gc: '#94a3b8',
      cross: true,
    }] : []),
    ...(bd.takeoutWalletPaid > 0.001 ? [{
      label: 'Profit takeouts (this store)',
      wallet: `−$${(bd.takeoutWalletPaid ?? 0).toFixed(2)}`,
      pts: '—',
      wc: '#991b1b', gc: '#94a3b8',
    }] : []),
    ...(crossWalletTakeout > 0 ? [{   // ← single, consolidated row
      label: 'Profit takeouts (other stores — shared wallet)',
      wallet: `−$${crossWalletTakeout.toFixed(2)}`,
      pts: '—',
      wc: '#991b1b', gc: '#94a3b8',
      cross: true,
    }] : []),
    ...(hasCrossStore && Math.abs(totalCrossWalletAmt) > 0.01 ? [{
      label: 'Other store transactions (shared wallets)',
      wallet: `${totalCrossWalletAmt >= 0 ? '+' : ''}$${Math.abs(totalCrossWalletAmt).toFixed(2)}`,
      pts: '—',
      wc: '#7c3aed', gc: '#94a3b8',
      cross: true,
    }] : []),
    ...(hasCrossStore && Math.abs(totalCrossGamePts) >= 1 ? [{
      label: 'Other store transactions (shared games)',
      wallet: '—',
      pts: `−${Math.round(totalCrossGamePts)} pts`,
      wc: '#94a3b8', gc: '#7c3aed',
      cross: true,
    }] : []),
    ...(crossAdminWalletEdit !== 0 ? [{
      label: 'Direct balance edit (admin — shared wallet)',
      wallet: `${crossAdminWalletEdit >= 0 ? '+' : '−'}$${Math.abs(crossAdminWalletEdit).toFixed(2)}`,
      pts: '—',
      wc: '#7c3aed', gc: '#94a3b8',
      cross: true,
      adminEdit: true,
    }] : []),
    ...(crossAdminGameEdit !== 0 ? [{
      label: 'Direct stock edit (admin — shared game)',
      wallet: '—',
      pts: `${crossAdminGameEdit >= 0 ? '+' : ''}${crossAdminGameEdit} pts`,
      wc: '#94a3b8', gc: '#7c3aed',
      cross: true,
      adminEdit: true,
    }] : []),
  ];

  const expTotal = (bd.expenseWalletPaid ?? 0) + (bd.takeoutWalletPaid ?? 0);
  const hasExpDetail = (bd.expenses?.length > 0 || bd.takeouts?.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Big status card ── */}
      <div style={{
        padding: '20px 24px', borderRadius: '14px',
        background: effectiveAllOk ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${effectiveAllOk ? '#86efac' : '#fca5a5'}`,
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
          background: effectiveAllOk ? '#dcfce7' : '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
        }}>{statusIcon}</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px', fontWeight: '800', fontSize: '15px', color: effectiveAllOk ? '#166534' : '#991b1b' }}>{statusLabel}</p>
          <p style={{ margin: 0, fontSize: '12px', color: effectiveAllOk ? '#16a34a' : '#dc2626', lineHeight: 1.5 }}>{statusSub}</p>
        </div>
        {/* Mini wallet/game status pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: effectiveWalletOk ? '#dcfce7' : '#fee2e2', color: effectiveWalletOk ? '#166534' : '#991b1b' }}>
            💳 {effectiveWalletOk ? 'Cash ✓' : `Cash $${Math.abs(effectiveWalletDisc).toFixed(2)} off`}
          </span>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: effectiveGameOk ? '#f5f3ff' : '#fee2e2', color: effectiveGameOk ? '#4c1d95' : '#991b1b' }}>
            🎮 {effectiveGameOk ? 'Points ✓' : `Points ${Math.abs(effectiveGameDisc)} off`}
          </span>
        </div>
      </div>

      {/* ── Receipt-style breakdown ── */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>How we got there</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Cash change · Points change</span>
        </div>

        <div style={{ padding: '4px 0' }}>
          {receiptRows.map((row, i) => (
            <div key={i} style={{
              padding: '9px 16px', display: 'flex', alignItems: 'center',
              background: row.cross ? '#faf5ff' : 'transparent',
              borderBottom: '1px solid #f8fafc',
            }}>
              <span style={{ flex: 1, fontSize: '12px', color: row.cross ? '#7c3aed' : '#475569', fontStyle: row.cross ? 'italic' : 'normal' }}>
                {row.cross && <span style={{ marginRight: '6px', fontSize: '10px', background: '#ede9fe', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px', fontStyle: 'normal' }}>cross-store</span>}
                {row.label}
              </span>
              <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: row.wc }}>{row.wallet}</span>
              <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: row.gc }}>{row.pts}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ margin: '0 16px', borderTop: '2px solid #e2e8f0' }} />

          {/* Expected */}
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ flex: 1, fontSize: '12px', fontWeight: '700', color: '#374151' }}>Expected change</span>
            <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: recon.expectedWalletChange >= 0 ? '#16a34a' : '#dc2626' }}>
              {recon.expectedWalletChange >= 0 ? '+' : ''}${recon.expectedWalletChange?.toFixed(2)}
            </span>
            <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: '#7c3aed' }}>
              {recon.expectedGameChange >= 0 ? '+' : ''}{recon.expectedGameChange} pts
            </span>
          </div>

          {/* Actual */}
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ flex: 1, fontSize: '12px', fontWeight: '700', color: '#374151' }}>Actual change</span>
            <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: effectiveWalletOk ? '#16a34a' : '#dc2626' }}>
              {recon.actualWalletChange >= 0 ? '+' : ''}${recon.actualWalletChange?.toFixed(2)}
            </span>
            <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: effectiveGameOk ? '#7c3aed' : '#dc2626' }}>
              {recon.actualGameChange >= 0 ? '+' : ''}{recon.actualGameChange} pts
            </span>
          </div>

          {/* Gap row — only when unbalanced */}
          {(!effectiveWalletOk || !effectiveGameOk) && (
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', background: '#fef2f2' }}>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>⚠️ Gap</span>
              <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: effectiveWalletOk ? '#16a34a' : '#dc2626' }}>
                {effectiveWalletOk ? '✓' : `$${Math.abs(effectiveWalletDisc).toFixed(2)} off`}
              </span>
              <span style={{ width: '90px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '800', color: effectiveGameOk ? '#16a34a' : '#dc2626' }}>
                {effectiveGameOk ? '✓' : `${Math.abs(effectiveGameDisc)} pts off`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Expenses & takeouts inline ── */}
      {hasExpDetail && (
        <details style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
          <summary style={{ padding: '10px 14px', background: '#fffbeb', fontSize: '12px', fontWeight: '700', color: '#b45309', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
            <span>📋 Expenses & takeouts included in reconciliation</span>
            <span>−${expTotal.toFixed(2)}</span>
          </summary>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fffbeb' }}>
                {['Type', 'Details', 'Wallet paid', 'Pts added'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: h.startsWith('Wallet') || h.startsWith('Pts') ? 'right' : 'left', fontWeight: '700', color: '#b45309', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bd.expenses ?? []).map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #fef3c7' }}>
                  <td style={{ padding: '7px 12px' }}><span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', background: '#fffbeb', color: '#b45309' }}>Expense</span></td>
                  <td style={{ padding: '7px 12px', color: '#475569' }}>{e.details}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>{(e.paymentMade ?? 0) > 0 ? `−$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>{(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—'}</td>
                </tr>
              ))}
              {(bd.takeouts ?? []).map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid #fef3c7' }}>
                  <td style={{ padding: '7px 12px' }}><span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', background: '#fff1f2', color: '#991b1b' }}>Takeout</span></td>
                  <td style={{ padding: '7px 12px', color: '#475569' }}>{t.takenBy} · {t.method}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>{t.walletId ? `−$${parseFloat(t.amount).toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* Partial payment detail */}
      {(bd.partiallyPaidCashouts ?? []).length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fef9c3', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#854d0e' }}>
          <div style={{ fontWeight: '700', marginBottom: '6px' }}>
            ⏳ {bd.partiallyPaidCashouts.length} partially paid cashout{bd.partiallyPaidCashouts.length > 1 ? 's' : ''} — wallet already debited
          </div>
          {bd.partiallyPaidCashouts.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '16px', fontSize: '11px', padding: '4px 0', borderTop: '1px solid #fde68a', flexWrap: 'wrap' }}>
              <span style={{ color: '#92400e' }}>TXN #{c.id}</span>
              <span>Total: <b>${c.amount.toFixed(2)}</b></span>
              <span style={{ color: '#dc2626' }}>Paid: <b>−${c.paidAmount.toFixed(2)}</b></span>
              <span style={{ color: '#16a34a' }}>Remaining: <b>${c.remaining.toFixed(2)}</b></span>
            </div>
          ))}
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#92400e' }}>
            These are included in the formula above. The remaining ${(bd.partiallyPaidCashouts.reduce((s, c) => s + c.remaining, 0)).toFixed(2)} will show when fully approved.
          </p>
        </div>
      )}

      {/* ── Pending cashout ── */}
      {bd.pendingCashouts > 0 && (
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0 }}>⏳</span>
          <span><strong>${bd.pendingCashouts?.toFixed(2)} in pending cashouts</strong> not yet counted — they'll be included when approved on the Transactions page.</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// CHECKOUT MODAL
// ═══════════════════════════════════════════════════════════════
const CheckoutModal = ({ shift, startSnapshot, onSubmit, onCancel }) => {

  // ── 1. Live reconciliation hook — SINGLE SOURCE OF TRUTH ─────
  // Hook now also fetches cross-store data and computes adjustments
  const { data: recon, loading: reconLoading, refetch } = useLiveReconciliation(
    shift?.id,
    shift?.startTime
  );

  // ── 2. Local state — only transactions (everything else from hook) ──
  const [shiftTxns, setShiftTxns] = useState([]);
  const [txnLoading, setTxnLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [fb, setFb] = useState({
    effort: 7, effortReason: '', improvements: '', workSummary: '',
    issuesEncountered: '', shiftWorkDescription: '',
    recommendationsLastShift: '', recommendationsOverall: '',
  });
  const setFbField = useCallback((f, v) => setFb(p => ({ ...p, [f]: v })), []);

  // ── 3. All financial values from hook ────────────────────────
  const bd = recon?.breakdown ?? {};

  const deposits = bd.deposits ?? 0;
  const cashouts = bd.completedCashouts ?? 0;
  const pendingCashouts = bd.pendingCashouts ?? 0;
  const bonuses = bd.bonuses ?? 0;
  const totalFees = bd.totalFees ?? 0;
  const depositFees = bd.depositFees ?? 0;
  const cashoutFees = bd.cashoutFees ?? 0;
  const expenseWalletPaid = bd.expenseWalletPaid ?? 0;
  const pointsReloaded = bd.pointsReloaded ?? 0;
  const takeoutWalletPaid = bd.takeoutWalletPaid ?? 0;
  const netProfit = r2(deposits - cashouts);
  const hasFees = totalFees > 0.001;

  const expectedWalletChange = recon?.expectedWalletChange ?? 0;
  const expectedGameChange = recon?.expectedGameChange ?? 0;
  const walletChange = recon?.actualWalletChange ?? 0;
  const gameChange = recon?.actualGameChange ?? 0;
  const isBalanced = recon?.isBalanced ?? null;
  const hasStartSnapshot = recon?.hasStartSnapshot ?? false;

  const endWallets = recon?.wallets ?? [];
  const endGames = recon?.games ?? [];
  const endTotalW = recon?.endWalletTotal ?? 0;
  const endTotalG = recon?.endGameTotal ?? 0;
  const startTotalW = recon?.startWalletTotal ?? startSnapshot?.totalWallet ?? 0;
  const startTotalG = recon?.startGameTotal ?? startSnapshot?.totalGames ?? 0;

  const shiftExpenses = bd.expenses ?? [];
  const shiftTakeouts = bd.takeouts ?? [];
  const totalShiftExpenses = shiftExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalShiftTakeouts = shiftTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  // ── 4. Cross-store values — read directly from hook ──────────
  const crossStoreData = recon?.crossStoreData ?? null;
  const totalCrossGamePts = recon?.totalCrossGamePts ?? 0;
  const totalCrossWalletAmt = recon?.totalCrossWalletAmt ?? 0;
  const crossGameInfo = recon?.crossGameInfo ?? {};
  const crossWalletInfo = recon?.crossWalletInfo ?? {};
  const crossAdjWalletDisc = recon?.crossAdjWalletDisc ?? 0;
  const crossAdjGameDisc = recon?.crossAdjGameDisc ?? 0;
  const crossAdjWalletBal = recon?.crossAdjWalletBal ?? false;
  const crossAdjGameBal = recon?.crossAdjGameBal ?? false;
  const crossAdjBalanced = recon?.crossAdjBalanced ?? null;
  const hasCrossStore = recon?.hasCrossStore ?? false;

  // ── 5. Mid-shift wallet/game detection ───────────────────────
  const startWalletIds = new Set((startSnapshot?.walletSnapshot ?? []).map(w => String(w.id)));
  const startGameIds = new Set((startSnapshot?.gameSnapshot ?? []).map(g => String(g.id)));

  const startWalletSnap = startSnapshot?.walletSnapshot ?? [];
  const startGameSnap = startSnapshot?.gameSnapshot ?? [];

  // const walletRows = [
  //   ...endWallets.map(w => {
  //     const s = startWalletSnap.find(sw => sw.id === w.id);
  //     return { ...w, startBal: r2(s?.balance ?? 0), endBal: r2(w.balance ?? 0), isNew: !s };
  //   }),
  //   ...startWalletSnap
  //     .filter(sw => !endWallets.find(w => w.id === sw.id))
  //     .map(sw => ({ ...sw, startBal: r2(sw.balance), endBal: 0, isRemoved: true })),
  // ];

  // const gameRows = [
  //   ...endGames.map(g => {
  //     const s = startGameSnap.find(sg => sg.id === g.id);
  //     return { ...g, startPts: Math.round(s?.pointStock ?? 0), endPts: Math.round(g.pointStock ?? 0), isNew: !s };
  //   }),
  //   ...startGameSnap
  //     .filter(sg => !endGames.find(g => g.id === sg.id))
  //     .map(sg => ({ ...sg, startPts: Math.round(sg.pointStock), endPts: 0, isRemoved: true })),
  // ];

  // REPLACE the walletRows / gameRows builders with these:

  const walletRows = [
    ...endWallets.map(w => {
      const s = startWalletSnap.find(sw => sw.id === w.id);
      const startBal = r2(s?.balance ?? 0);
      const endBal = r2(w.balance ?? 0);
      return { ...w, startBal, endBal, delta: r2(endBal - startBal), isNew: !s };
    }),
    ...startWalletSnap
      .filter(sw => !endWallets.find(w => w.id === sw.id))
      .map(sw => ({
        ...sw, startBal: r2(sw.balance), endBal: 0,
        delta: r2(-sw.balance), isRemoved: true
      })),
  ];

  const gameRows = [
    ...endGames.map(g => {
      const s = startGameSnap.find(sg => sg.id === g.id);
      const startPts = Math.round(s?.pointStock ?? 0);
      const endPts = Math.round(g.pointStock ?? 0);
      return { ...g, startPts, endPts, delta: endPts - startPts, isNew: !s };
    }),
    ...startGameSnap
      .filter(sg => !endGames.find(g => g.id === sg.id))
      .map(sg => ({
        ...sg, startPts: Math.round(sg.pointStock), endPts: 0,
        delta: -Math.round(sg.pointStock), isRemoved: true
      })),
  ];

  const newWalletsDuringShift = endWallets.filter(w => !startWalletIds.has(String(w.id)));
  const newGamesDuringShift = endGames.filter(g => !startGameIds.has(String(g.id)));



  // ── 6. Local discrepancy values (for wallet/game table cells) ─
  const walletDisc = hasStartSnapshot ? r2(walletChange - expectedWalletChange) : 0;
  const gameDisc = hasStartSnapshot ? Math.round(gameChange - expectedGameChange) : 0;
  const walletBal = Math.abs(walletDisc) < 0.02;
  const gameBal = Math.abs(gameDisc) < 2;
  const balanced = hasStartSnapshot ? (walletBal && gameBal) : null;

  // ── 7. Fetch transactions only ───────────────────────────────
  useEffect(() => {
    if (!shift) { setTxnLoading(false); return; }
    const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
    fj(`/transactions?limit=500&fromDate=${fromDate}`)
      .then(txns => {
        const start = new Date(shift.startTime);
        setShiftTxns(
          (txns.data ?? []).filter(t => t.createdAtISO ? new Date(t.createdAtISO) >= start : true)
        );
      })
      .catch(err => console.error('CheckoutModal txn fetch:', err))
      .finally(() => setTxnLoading(false));
  }, [shift]);

  const loading = txnLoading || (reconLoading && !recon);

  // ── Snapshot rows ─────────────────────────────────────────────


  // Detect which wallets/games have actual transactions referencing them
  const walletIdsWithTxns = useMemo(() => {
    const s = new Set();
    shiftTxns.forEach(t => {
      if (t.walletMethod && t.walletName) {
        const w = endWallets.find(w => w.method === t.walletMethod && w.name === t.walletName);
        if (w) s.add(String(w.id));
      }
    });
    return s;
  }, [shiftTxns, endWallets]);

  const gameIdsWithTxns = useMemo(() => {
    const s = new Set();
    shiftTxns.forEach(t => {
      if (t.gameName) {
        const g = endGames.find(g => g.name === t.gameName);
        if (g) s.add(String(g.id));
      }
    });
    return s;
  }, [shiftTxns, endGames]);

  // Wallets that existed at shift start, have a nonzero delta, but NO transactions
  // const manuallyEditedWallets = walletRows.filter(w =>
  //   !w.isNew && !w.isRemoved &&
  //   Math.abs(w.delta) > 0.01 &&
  //   !walletIdsWithTxns.has(String(w.id))
  // );

  // // Games that existed at shift start, have a nonzero delta, but NO transactions
  // const manuallyEditedGames = gameRows.filter(g =>
  //   !g.isNew && !g.isRemoved &&
  //   Math.abs(g.delta) > 0 &&
  //   !gameIdsWithTxns.has(String(g.id))
  // );

  // const manuallyEditedWallets = walletRows.filter(w =>
  //   !w.isNew && !w.isRemoved &&
  //   Math.abs(w.delta) > 0.01 &&
  //   !walletIdsWithTxns.has(String(w.id)) &&
  //   !crossWalletInfo[String(w.id)]   // ← cross-store activity explains it; NOT an admin edit
  // );
  const manuallyEditedWallets = walletRows.filter(w => {
    if (w.isNew || w.isRemoved || Math.abs(w.delta) <= 0.01) return false;
    if (walletIdsWithTxns.has(String(w.id))) return false;
    const ci = crossWalletInfo[String(w.id)];
    if (!ci) return true; // not a shared wallet, no cross-store txns → admin edit
    // Shared wallet: delta should equal myChange + otherChange if fully explained by txns.
    // If there's residual beyond what transactions account for, it's an admin direct edit.
    const txnExplained = r2(ci.myChange + ci.otherChange);
    return Math.abs(r2(w.delta - txnExplained)) > 0.02;
  });

  // const manuallyEditedGames = gameRows.filter(g =>
  //   !g.isNew && !g.isRemoved &&
  //   Math.abs(g.delta) > 0 &&
  //   !gameIdsWithTxns.has(String(g.id)) &&
  //   !crossGameInfo[String(g.id)]     // ← cross-store activity explains it; NOT an admin edit
  // );
  const manuallyEditedGames = gameRows.filter(g => {
    if (g.isNew || g.isRemoved || Math.abs(g.delta) <= 0) return false;
    if (gameIdsWithTxns.has(String(g.id))) return false;
    const ci = crossGameInfo[String(g.id)];
    if (!ci) return true; // not a shared game, no cross-store txns → admin edit
    // Shared game: myPts + otherPts = total pts deducted via transactions (positive = deducted).
    // Expected stock delta from txns alone = -(myPts + otherPts).
    // If actual delta differs, there's an unexplained change (admin edit or reload).
    const txnExplainedDelta = -Math.round(ci.myPts + ci.otherPts);
    return Math.abs(g.delta - txnExplainedDelta) > 1;
  });
  // How much of the discrepancy is explained by manual edits
  const manualWalletAdj = r2(manuallyEditedWallets.reduce((s, w) => s + w.delta, 0));
  const manualGameAdj = Math.round(manuallyEditedGames.reduce((s, g) => s + g.delta, 0));
  const adjWalletDisc = r2(walletDisc - manualWalletAdj);
  const adjGameDisc = Math.round(gameDisc - manualGameAdj);
  const manualAdjBalanced = Math.abs(adjWalletDisc) < 0.02 && Math.abs(adjGameDisc) < 2;

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        endSnapshot: {
          walletSnapshot: endWallets.map(w => ({ id: w.id, name: w.name, method: w.method, balance: r2(w.balance ?? 0) })),
          gameSnapshot: endGames.map(g => ({ id: g.id, name: g.name, pointStock: Math.round(g.pointStock ?? 0) })),
          totalWallet: endTotalW, totalGames: endTotalG,
          walletChange, gameChange, netProfit, deposits, cashouts, bonuses,
          depositFees, cashoutFees, expenseWalletPaid, takeoutWalletPaid, pointsReloaded,
          walletDiscrepancy: walletDisc,
          gameDiscrepancy: gameDisc,
          crossAdjWalletDiscrepancy: crossAdjWalletDisc,
          crossAdjGameDiscrepancy: crossAdjGameDisc,
          isBalanced: balanced,
          isCrossAdjBalanced: crossAdjBalanced,
          capturedAt: new Date().toISOString(),
        },
        feedback: fb,
      });
    } finally { setSubmitting(false); }
  };

  const canSubmit = [
    fb.effortReason, fb.improvements, fb.workSummary,
    fb.issuesEncountered, fb.shiftWorkDescription,
    fb.recommendationsLastShift, fb.recommendationsOverall,
  ].every(v => v.trim().length > 5);

  const tabs = [
    { id: 'reconciliation', label: '📊 Reconciliation' },
    { id: 'transactions', label: `💳 Transactions (${shiftTxns.length})` },
    { id: 'expenses', label: `📋 Expenses & Takeouts (${shiftExpenses.length + shiftTakeouts.length})` },
    { id: 'feedback', label: '💬 Feedback' },
  ];

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: '600',
      fontSize: '12px', borderRadius: '8px', transition: 'all .15s', whiteSpace: 'nowrap',
      background: activeTab === id ? '#0f172a' : 'transparent',
      color: activeTab === id ? '#fff' : '#64748b',
    }}>{label}</button>
  );

  const taStyleLocal = (req, val) => ({
    width: '100%', padding: '10px 12px',
    border: `1px solid ${req && !val?.trim() ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: '8px', fontSize: '13px', resize: 'vertical',
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
    lineHeight: 1.5, background: '#fff', color: '#0f172a',
  });

  const renderTA = (field, label, placeholder, rows = 3) => (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
        {label} <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <textarea value={fb[field]} onChange={e => setFbField(field, e.target.value)}
        placeholder={placeholder} rows={rows} style={taStyleLocal(true, fb[field])} />
    </div>
  );

  const isBonus = t => t.type !== 'Deposit' && t.type !== 'Cashout';

  return (
    <div style={T.overlay}>
      <div style={T.modal}>

        {/* Header */}
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 3px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🌙 End-of-Shift Report</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Review shift balances and submit your closing report</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {reconLoading ? (
              <span style={{ fontSize: '11px', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Live…
              </span>
            ) : recon?.capturedAt ? (
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Updated {new Date(recon.capturedAt).toLocaleTimeString()}
                <button onClick={refetch} style={{ marginLeft: '6px', background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '10px', fontWeight: '600', padding: 0 }}>Refresh</button>
              </span>
            ) : null}
            <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '2px', background: '#fafafa', flexShrink: 0, overflowX: 'auto' }}>
          {tabs.map(t => <TabBtn key={t.id} id={t.id} label={t.label} />)}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
              Loading shift data…
            </div>
          ) : activeTab === 'reconciliation' ? (
            <>
              {/* Mid-shift banners */}
              {hasStartSnapshot && (newWalletsDuringShift.length > 0 || newGamesDuringShift.length > 0) && (
                <div style={{ border: '1px solid #bfdbfe', borderRadius: '10px' }}>
                  <div style={{ padding: '10px 14px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🆕</span>
                    <span style={{ fontWeight: '700', fontSize: '12.5px', color: '#1e40af' }}>
                      Resources added mid-shift — not in opening snapshot
                    </span>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f0f7ff' }}>
                    {newWalletsDuringShift.map(w => (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <span>
                          <b style={{ color: '#1e40af' }}>💳 {w.method} — {w.name}</b>
                        </span>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                          <span>Current balance: <b style={{ color: '#16a34a' }}>${r2(w.balance).toFixed(2)}</b></span>
                          <span style={{ color: '#2563eb', fontWeight: '600' }}>
                            ⚠️ Adding ${r2(w.balance).toFixed(2)} to end wallet total only
                          </span>
                        </div>
                      </div>
                    ))}
                    {newGamesDuringShift.map(g => (
                      <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #c4b5fd' }}>
                        <span>
                          <b style={{ color: '#4c1d95' }}>🎮 {g.name}</b>
                          {g.isShared && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#ede9fe', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px' }}>shared</span>}
                        </span>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                          <span>Current stock: <b style={{ color: '#7c3aed' }}>{Math.round(g.pointStock)} pts</b></span>
                          <span style={{ color: '#7c3aed', fontWeight: '600' }}>
                            ⚠️ Adding {Math.round(g.pointStock)} pts to end total only
                          </span>
                        </div>
                      </div>
                    ))}
                    <p style={{ margin: 0, padding: '4px 0 0', fontSize: '11px', color: '#1e40af' }}>
                      These resources have no start balance — the reconciliation formula treats their current value as the baseline and they do NOT count as a discrepancy.
                    </p>
                  </div>
                </div>
              )}
              {/* ── Manually edited wallet banner ── */}
              {manuallyEditedWallets.length > 0 && (
                <div style={{
                  padding: '10px 14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderLeft: '4px solid #2563eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#1e40af',
                }}>
                  <strong>⚙️ Wallet balance edited mid-shift:</strong>{' '}
                  {manuallyEditedWallets.map(w =>
                    `${w.method} — ${w.name} (${w.delta >= 0 ? '+' : ''}$${Math.abs(w.delta).toFixed(2)})`
                  ).join(', ')}.{' '}
                  This appears to be a direct admin balance edit — it is <em>not</em> counted in transaction totals.
                  {manualAdjBalanced && (
                    <span style={{ marginLeft: '8px', color: '#16a34a', fontWeight: '700' }}>
                      ✓ Accounts for the wallet discrepancy.
                    </span>
                  )}
                </div>
              )}

              {/* ── Manually edited game banner ── */}
              {manuallyEditedGames.length > 0 && (
                <div style={{
                  padding: '10px 14px',
                  background: '#f5f3ff',
                  border: '1px solid #c4b5fd',
                  borderLeft: '4px solid #7c3aed',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#4c1d95',
                }}>
                  <strong>⚙️ Game stock edited mid-shift:</strong>{' '}
                  {manuallyEditedGames.map(g =>
                    `${g.name} (${g.delta >= 0 ? '+' : ''}${g.delta} pts)`
                  ).join(', ')}.{' '}
                  This appears to be a direct admin stock edit — it is <em>not</em> counted in transaction totals.
                  {manualAdjBalanced && (
                    <span style={{ marginLeft: '8px', color: '#16a34a', fontWeight: '700' }}>
                      ✓ Accounts for the points discrepancy.
                    </span>
                  )}
                </div>
              )}

              {/* Cross-store notice */}
              {hasCrossStore && (
                <div style={{ padding: '12px 16px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#4c1d95', marginBottom: '6px' }}>⚡ Cross-Store Activity on Shared Resources</div>
                  <div style={{ fontSize: '11.5px', color: '#6d28d9', lineHeight: 1.6 }}>
                    Shared resources were also used by other stores this shift window.
                    Their activity is shown in the tables below but <strong>is NOT counted as your discrepancy</strong>.
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {totalCrossGamePts > 0 && (
                      <span style={{ background: '#ede9fe', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#4c1d95' }}>
                        🎮 Other stores used ~{Math.round(totalCrossGamePts)} pts
                      </span>
                    )}
                    {Math.abs(totalCrossWalletAmt) > 0.01 && (
                      <span style={{ background: '#ede9fe', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#4c1d95' }}>
                        💳 Other stores moved ~${Math.abs(totalCrossWalletAmt).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* KPI cards */}
              {/* Replace the KPI cards section with this */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* P&L row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Deposits', val: `+$${deposits.toFixed(2)}`, c: '#16a34a', bg: '#f0fdf4', b: '#86efac' },
                    { label: 'Cashouts', val: `-$${cashouts.toFixed(2)}`, c: '#dc2626', bg: '#fef2f2', b: '#fca5a5' },
                    { label: 'Net profit', val: `${netProfit >= 0 ? '+' : ''}$${Math.abs(netProfit).toFixed(2)}`, c: netProfit >= 0 ? '#166534' : '#991b1b', bg: netProfit >= 0 ? '#dcfce7' : '#fee2e2', b: netProfit >= 0 ? '#86efac' : '#fca5a5', large: true },
                  ].map(({ label, val, c, bg, b, large }) => (
                    <div key={label} style={{ padding: '14px 16px', background: bg, border: `1px solid ${b}`, borderRadius: '10px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '10px', color: c, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>{label}</p>
                      <p style={{ margin: 0, fontSize: large ? '20px' : '16px', fontWeight: '800', color: c }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Secondary stats — only show relevant ones */}
                {(hasFees || bonuses > 0.001 || expenseWalletPaid > 0.001 || takeoutWalletPaid > 0.001 || pendingCashouts > 0.001) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {hasFees && <span style={{ padding: '5px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#b45309' }}>Fees −${totalFees.toFixed(2)}</span>}
                    {bonuses > 0.001 && <span style={{ padding: '5px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#c2410c' }}>Bonuses −${bonuses.toFixed(2)}</span>}
                    {expenseWalletPaid > 0.001 && <span style={{ padding: '5px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#b45309' }}>Expenses −${expenseWalletPaid.toFixed(2)}</span>}
                    {takeoutWalletPaid > 0.001 && <span style={{ padding: '5px 10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#991b1b' }}>Takeouts −${takeoutWalletPaid.toFixed(2)}</span>}
                    {pointsReloaded > 0.001 && <span style={{ padding: '5px 10px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#7c3aed' }}>+{Math.round(pointsReloaded)} pts reloaded</span>}
                    {pendingCashouts > 0.001 && <span style={{ padding: '5px 10px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#854d0e' }}>⏳ ${pendingCashouts.toFixed(2)} pending</span>}
                  </div>
                )}
              </div>

              {/* Wallet table */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px', flexWrap: 'wrap', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={14} color="#2563eb" /> Wallet Balances
                  </h3>
                  {hasStartSnapshot && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Expected: <b style={{ color: expectedWalletChange >= 0 ? '#16a34a' : '#dc2626' }}>
                        {expectedWalletChange >= 0 ? '+' : ''}${expectedWalletChange.toFixed(2)}
                      </b>
                    </span>
                  )}
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={T.th}>Wallet</th>
                        {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Start</th>}
                        <th style={{ ...T.th, textAlign: 'right' }}>End</th>
                        {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Change</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {walletRows.map(w => {
                        const delta = r2(w.endBal - w.startBal);
                        const ci = crossWalletInfo[w.id];
                        return (
                          <React.Fragment key={w.id}>
                            <tr style={{ background: w.isNew ? '#eff6ff' : w.isRemoved ? '#fef2f2' : ci ? '#f0f7ff' : 'transparent' }}>
                              <td style={T.td}>
                                <b style={{ color: '#475569' }}>{w.method}</b> — {w.name}
                                {w.isNew && <Badge label="new mid-shift" color="#1d4ed8" bg="#dbeafe" />}
                                {w.isRemoved && <Badge label="removed" color="#991b1b" bg="#fee2e2" />}
                                {ci && !w.isNew && <Badge label="shared" color="#1d4ed8" bg="#dbeafe" />}
                                {!w.isNew && !w.isRemoved && manuallyEditedWallets.find(mw => String(mw.id) === String(w.id)) && (
                                  <Badge label="⚙️ manually edited" color="#1d4ed8" bg="#dbeafe" />
                                )}
                              </td>
                              {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>{w.isNew ? 'N/A' : `$${w.startBal.toFixed(2)}`}</td>}
                              <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>${w.endBal.toFixed(2)}</td>
                              {hasStartSnapshot && (
                                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>
                                  {w.isNew ? (
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>new</span>
                                  ) : (() => {
                                    const delta = r2(w.endBal - w.startBal);
                                    const isManual = manuallyEditedWallets.find(mw => String(mw.id) === String(w.id));
                                    return (
                                      <div>
                                        <span style={{ color: clr$(delta), fontFamily: 'monospace' }}>
                                          {delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '→ '}
                                          ${Math.abs(delta).toFixed(2)}
                                        </span>
                                        {isManual && <div style={{ fontSize: '10px', color: '#2563eb', marginTop: '2px' }}>⚙️ edited directly</div>}
                                        {ci && !w.isNew && (
                                          <div style={{ fontSize: '10px', color: '#1d4ed8', marginTop: '1px' }}>
                                            yours: {ci.myChange >= 0 ? '+' : ''}${ci.myChange.toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      <tr style={{ background: '#f8fafc' }}>
                        <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                        {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>${startTotalW.toFixed(2)}</td>}
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>${endTotalW.toFixed(2)}</td>
                        {hasStartSnapshot && (
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clr$(walletChange) }}>
                            {walletChange >= 0 ? '+' : ''}${Math.abs(walletChange).toFixed(2)}
                            {!walletBal && (
                              <div style={{ fontSize: '10.5px', fontWeight: '600' }}>
                                {crossAdjWalletBal && Math.abs(totalCrossWalletAmt) > 0.01
                                  ? <span style={{ color: '#16a34a', display: 'block' }}>✓ cross-store explains it</span>
                                  : <span style={{ color: '#dc2626' }}>⚠️ ${Math.abs(crossAdjWalletDisc).toFixed(2)} real gap</span>}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Game table */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px', flexWrap: 'wrap', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gamepad2 size={14} color="#7c3aed" /> Game Points
                  </h3>
                  {hasStartSnapshot && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Expected: <b style={{ color: '#7c3aed' }}>
                        {expectedGameChange >= 0 ? '+' : ''}{expectedGameChange} pts
                      </b>
                    </span>
                  )}
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={T.th}>Game</th>
                        {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Start</th>}
                        <th style={{ ...T.th, textAlign: 'right' }}>End</th>
                        {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Change</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {gameRows.map(g => {
                        const delta = g.endPts - g.startPts;
                        const ci = crossGameInfo[g.id];
                        return (
                          <React.Fragment key={g.id}>
                            <tr style={{ background: g.isNew ? '#f5f3ff' : g.isRemoved ? '#fef2f2' : ci ? '#f5f0ff' : 'transparent' }}>
                              <td style={T.td}>
                                <b>{g.name}</b>
                                {g.isNew && <Badge label="new mid-shift" color="#4c1d95" bg="#ede9fe" />}
                                {g.isRemoved && <Badge label="removed" color="#991b1b" bg="#fee2e2" />}
                                {ci && !g.isNew && <Badge label="shared" color="#7c3aed" bg="#ede9fe" />}
                                {!g.isNew && !g.isRemoved && manuallyEditedGames.find(mg => String(mg.id) === String(g.id)) && (
                                  <Badge label="⚙️ manually edited" color="#4c1d95" bg="#ede9fe" />
                                )}
                              </td>
                              {hasStartSnapshot && (
                                <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>
                                  {g.isNew ? 'N/A' : `${g.startPts} pts`}
                                </td>
                              )}
                              <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{g.endPts} pts</td>
                              {hasStartSnapshot && (
                                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>
                                  {g.isNew ? (
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>new</span>
                                  ) : (() => {
                                    const isManualG = manuallyEditedGames.find(mg => String(mg.id) === String(g.id));
                                    return (
                                      <div>
                                        <span style={{ color: clrPts(delta), fontFamily: 'monospace' }}>
                                          {delta < 0 ? '↓ ' : delta > 0 ? '↑ +' : '→ '}
                                          {Math.abs(delta)} pts
                                        </span>
                                        {isManualG && (
                                          <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px' }}>⚙️ edited directly</div>
                                        )}
                                        {ci && !g.isNew && (
                                          <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px' }}>
                                            yours: {ci.myPts >= 0 ? '+' : ''}{ci.myPts} pts
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      <tr style={{ background: '#f8fafc' }}>
                        <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                        {hasStartSnapshot && (
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{startTotalG} pts</td>
                        )}
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>{endTotalG} pts</td>
                        {hasStartSnapshot && (
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(gameChange) }}>
                            {gameChange >= 0 ? '+' : ''}{gameChange} pts
                            {!gameBal && (
                              <div style={{ fontSize: '10.5px', fontWeight: '600' }}>
                                {crossAdjGameBal && endGames.some(g => g.isShared)
                                  ? <span style={{ color: '#16a34a', display: 'block' }}>✓ cross-store explains it</span>
                                  : <span style={{ color: '#dc2626' }}>⚠️ {crossAdjGameDisc >= 0 ? '+' : ''}{crossAdjGameDisc} pts real gap</span>}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Full discrepancy panel — reads cross-store from recon directly */}
              {/* <DiscrepancyPanel recon={recon} /> */}
              <DiscrepancyPanel recon={recon} manualAdjBalanced={manualAdjBalanced} />

            </>
          ) : activeTab === 'transactions' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Shift Transactions</h3>
                <span style={{ background: '#0ea5e9', color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: '700' }}>{shiftTxns.length}</span>
              </div>
              {shiftTxns.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  No transactions recorded for this shift yet
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          {['Time', 'Player', 'Type', 'Game / Wallet', 'Pts Before→After', 'Amount', 'Fee', 'Status'].map(h => (
                            <th key={h} style={T.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shiftTxns.map(t => {
                          const isD = t.type === 'Deposit', isCO = t.type === 'Cashout', isB = isBonus(t);
                          const amtColor = isD ? '#16a34a' : isCO ? '#dc2626' : isB ? '#c2410c' : '#475569';
                          const pts = t.gameStockAfter != null && t.gameStockBefore != null
                            ? Math.round(t.gameStockAfter - t.gameStockBefore) : null;
                          return (
                            <tr key={t.id}>
                              <td style={{ ...T.td, fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{t.timestamp || t.date || '—'}</td>
                              <td style={{ ...T.td, fontWeight: '600' }}>{t.playerName || `#${t.playerId}`}</td>
                              <td style={T.td}>
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: isD ? '#dcfce7' : isCO ? '#fee2e2' : '#fff7ed', color: isD ? '#166534' : isCO ? '#991b1b' : '#c2410c' }}>
                                  {t.type}
                                </span>
                              </td>
                              <td style={{ ...T.td, fontSize: '11px' }}>
                                {t.gameName && <div style={{ fontWeight: '600' }}>{t.gameName}</div>}
                                {t.walletMethod && <div style={{ color: '#64748b' }}>{t.walletMethod}{t.walletName ? ` · ${t.walletName}` : ''}</div>}
                                {!t.gameName && !t.walletMethod && <span style={{ color: '#cbd5e1' }}>—</span>}
                              </td>
                              <td style={{ ...T.td, fontSize: '11px' }}>
                                {pts !== null
                                  ? <span style={{ color: '#64748b' }}>{t.gameStockBefore?.toFixed(0)} → <b style={{ color: pts < 0 ? '#7c3aed' : '#16a34a' }}>{t.gameStockAfter?.toFixed(0)}</b></span>
                                  : <span style={{ color: '#cbd5e1' }}>—</span>}
                              </td>
                              <td style={{ ...T.td, fontWeight: '800', fontSize: '13px', color: amtColor }}>${(t.amount ?? 0).toFixed(2)}</td>
                              <td style={T.td}>{t.fee > 0 ? <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '11px' }}>−${t.fee.toFixed(2)}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                              <td style={T.td}>
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: t.status === 'PENDING' ? '#fef3c7' : '#dcfce7', color: t.status === 'PENDING' ? '#b45309' : '#166534' }}>
                                  {t.status === 'PENDING' ? 'PENDING' : 'DONE'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'expenses' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Expenses ({shiftExpenses.length})</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#b45309' }}>−${totalShiftExpenses.toFixed(2)}</p>
                </div>
                <div style={{ padding: '14px 18px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Takeouts ({shiftTakeouts.length})</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#991b1b' }}>−${totalShiftTakeouts.toFixed(2)}</p>
                </div>
                <div style={{ padding: '14px 18px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Points Reloaded</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#7c3aed' }}>+{Math.round(pointsReloaded)} pts</p>
                </div>
              </div>

              {shiftExpenses.length > 0 ? (
                <div style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    📋 Expenses Recorded This Shift
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{['Details', 'Category', 'Amount', 'Wallet paid', 'Pts added'].map(h => <th key={h} style={T.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {shiftExpenses.map((e, i) => (
                        <tr key={e.id ?? i}>
                          <td style={T.td}>{e.details}</td>
                          <td style={T.td}><Badge label={e.category?.replace('_', ' ') ?? '—'} color="#b45309" bg="#fffbeb" /></td>
                          <td style={{ ...T.td, fontWeight: '600' }}>${(e.amount ?? 0).toFixed(2)}</td>
                          <td style={{ ...T.td, color: '#dc2626', fontWeight: '600' }}>{(e.paymentMade ?? 0) > 0 ? `-$${parseFloat(e.paymentMade).toFixed(2)}` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                          <td style={{ ...T.td, color: '#16a34a', fontWeight: '600' }}>{(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#fffbeb' }}>
                        <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#b45309' }}>Totals</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#b45309' }}>${totalShiftExpenses.toFixed(2)}</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#dc2626' }}>{expenseWalletPaid > 0 ? `-$${expenseWalletPaid.toFixed(2)}` : '—'}</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#16a34a' }}>{pointsReloaded > 0 ? `+${Math.round(pointsReloaded)} pts` : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', background: '#fffbeb', borderRadius: '10px', border: '1px dashed #fde68a', fontSize: '13px' }}>
                  No expenses recorded during this shift
                </div>
              )}

              {shiftTakeouts.length > 0 ? (
                <div style={{ border: '1px solid #fecdd3', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', fontSize: '11px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    💸 Profit Takeouts This Shift
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{['Taken By', 'Method', 'Amount', 'Wallet used', 'Notes'].map(h => <th key={h} style={T.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {shiftTakeouts.map((t, i) => (
                        <tr key={t.id ?? i}>
                          <td style={{ ...T.td, fontWeight: '600' }}>{t.takenBy}</td>
                          <td style={T.td}><Badge label={t.method} color="#991b1b" bg="#fff1f2" /></td>
                          <td style={{ ...T.td, fontWeight: '800', color: '#dc2626' }}>−${parseFloat(t.amount).toFixed(2)}</td>
                          <td style={T.td}>{t.walletId ? <span style={{ color: '#dc2626' }}>wallet deducted</span> : <span style={{ color: '#94a3b8' }}>cash/external</span>}</td>
                          <td style={{ ...T.td, color: '#64748b', fontSize: '11px' }}>{t.notes ?? '—'}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#fff1f2' }}>
                        <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#991b1b' }}>Total</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#dc2626' }}>−${totalShiftTakeouts.toFixed(2)}</td>
                        <td colSpan={2} style={{ ...T.td, fontSize: '11px', color: '#64748b' }}>Wallet-deducted: −${takeoutWalletPaid.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', background: '#fff1f2', borderRadius: '10px', border: '1px dashed #fecdd3', fontSize: '13px' }}>
                  No profit takeouts recorded during this shift
                </div>
              )}

              {hasCrossStore && (
                <div style={{ padding: '10px 14px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', fontSize: '11.5px', color: '#4c1d95' }}>
                  ⚡ <strong>Cross-store activity present on shared resources.</strong> Expenses and takeouts shown here are for this store only.
                  Other stores may have also used shared wallets or game stock during this window — see the Reconciliation tab for the full breakdown.
                </div>
              )}
            </>
          ) : (
            /* Feedback tab */
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                  Effort Rating
                  <span style={{ marginLeft: '12px', fontSize: '22px', fontWeight: '800', color: fb.effort >= 8 ? '#16a34a' : fb.effort >= 5 ? '#d97706' : '#dc2626' }}>
                    {fb.effort}<span style={{ fontSize: '14px', color: '#94a3b8' }}>/10</span>
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} onClick={() => setFbField('effort', n)} style={{
                      width: '38px', height: '38px', borderRadius: '8px', border: '2px solid',
                      cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                      borderColor: fb.effort === n ? '#0f172a' : '#e2e8f0',
                      background: fb.effort === n ? (n >= 8 ? '#16a34a' : n >= 5 ? '#d97706' : '#dc2626') : '#f8fafc',
                      color: fb.effort === n ? '#fff' : '#475569',
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              {renderTA('effortReason', `Why ${fb.effort}/10?`, 'Describe your energy level, focus, challenges…')}
              {renderTA('shiftWorkDescription', 'Describe the work this shift', 'Walk through what you did…', 4)}
              {renderTA('workSummary', 'Work Summary', 'Key accomplishments…')}
              {renderTA('issuesEncountered', 'Issues Encountered', 'Player complaints, system issues…')}
              {renderTA('improvements', 'What could you have done better?', 'Areas for improvement…')}
              {renderTA('recommendationsLastShift', 'Recommendations to previous shift', 'Handover notes…')}
              {renderTA('recommendationsOverall', 'Overall recommendations', 'Broader suggestions…')}
              {!canSubmit && (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                  ⚠️ All fields are <b>required</b> (min 6 chars each) before you can submit.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '13px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexShrink: 0, background: '#f8fafc' }}>
          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            {activeTab === 'feedback'
              ? `Balance: ${balanced === null ? 'N/A' : balanced ? '✓' : crossAdjBalanced ? '⚡ cross-adj OK' : '⚠️ disc'}`
              : `${shiftTxns.length} txns · ${shiftExpenses.length} expenses · ${shiftTakeouts.length} takeouts`}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>Cancel</button>
            {activeTab !== 'feedback' ? (
              <button
                onClick={() => setActiveTab(activeTab === 'reconciliation' ? 'transactions' : activeTab === 'transactions' ? 'expenses' : 'feedback')}
                style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                style={{ padding: '10px 22px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer', opacity: !canSubmit || submitting ? .6 : 1, display: 'flex', alignItems: 'center', gap: '7px' }}>
                {submitting ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : '✓ Submit & End Shift'}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PDF GENERATOR for past shift
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PDF GENERATOR — Full Detail Version
// Drop this in place of the old printShiftPDF function.
// Also update the PDF button onClick (see bottom of this file).
// ═══════════════════════════════════════════════════════════════

// async function printShiftPDF(shift) {
//   // ── 1. Helpers ────────────────────────────────────────────────
//   const r2 = v => Math.round((v ?? 0) * 100) / 100;
//   const fmtMoney = v => `$${Math.abs(r2(v ?? 0)).toFixed(2)}`;
//   const fmtTime = iso =>
//     iso
//       ? new Date(iso).toLocaleTimeString('en-US', {
//         timeZone: 'America/Chicago',
//         hour: '2-digit', minute: '2-digit', hour12: true,
//       })
//       : '—';
//   const fmtDate = iso =>
//     iso
//       ? new Date(iso).toLocaleDateString('en-US', {
//         timeZone: 'America/Chicago',
//         weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
//       })
//       : '—';
//   const fmtDateTime = iso =>
//     iso
//       ? new Date(iso).toLocaleString('en-US', {
//         timeZone: 'America/Chicago',
//         month: 'short', day: 'numeric',
//         hour: '2-digit', minute: '2-digit', hour12: true,
//       })
//       : '—';

//   const sign = (v, suffix = '') =>
//     `${r2(v) >= 0 ? '+' : '−'}${fmtMoney(v)}${suffix}`;

//   const signPts = v =>
//     `${v >= 0 ? '+' : ''}${v} pts`;

//   // ── 2. Parse stored snapshots & feedback ──────────────────────
//   let startSnapshot = null;
//   let endSnapshot = null;
//   let feedback = {};

//   try { startSnapshot = JSON.parse(shift.checkin?.balanceNote ?? 'null'); } catch (_) { }
//   try {
//     const p = JSON.parse(shift.checkin?.additionalNotes ?? 'null');
//     if (p) {
//       endSnapshot = p.endSnapshot ?? null;
//       feedback = {
//         effortReason: p.effortReason ?? '',
//         improvements: p.improvements ?? '',
//         workSummary: p.workSummary ?? shift.checkin?.workSummary ?? '',
//         issuesEncountered: p.issuesEncountered ?? shift.checkin?.issuesEncountered ?? '',
//         shiftWorkDescription: p.shiftWorkDescription ?? '',
//         recommendationsLastShift: p.recommendationsLastShift ?? '',
//         recommendationsOverall: p.recommendationsOverall ?? '',
//       };
//     }
//   } catch (_) { }

//   const es = endSnapshot ?? {};
//   const ss = startSnapshot ?? {};
//   const stx = shift.stats ?? {};

//   // ── 3. Financial values ───────────────────────────────────────
//   const deposits = r2(es.deposits ?? stx.totalDeposits ?? 0);
//   const cashouts = r2(es.cashouts ?? stx.totalCashouts ?? 0);
//   const bonuses = r2(es.bonuses ?? stx.totalBonuses ?? 0);
//   const depositFees = r2(es.depositFees ?? 0);
//   const cashoutFees = r2(es.cashoutFees ?? 0);
//   const totalFees = r2(depositFees + cashoutFees);
//   const expenseWalletPaid = r2(es.expenseWalletPaid ?? 0);
//   const takeoutWalletPaid = r2(es.takeoutWalletPaid ?? 0);
//   const pointsReloaded = Math.round(es.pointsReloaded ?? 0);
//   const netProfit = r2(deposits - cashouts);
//   const walletChange = r2(es.walletChange ?? 0);
//   const gameChange = Math.round(es.gameChange ?? 0);

//   // Expected formula
//   const expectedWallet = r2(deposits - cashouts - depositFees - cashoutFees - expenseWalletPaid - takeoutWalletPaid);
//   const expectedGameDeduction = deposits + depositFees + cashoutFees + bonuses - cashouts;
//   const expectedGame = Math.round(-expectedGameDeduction + pointsReloaded);

//   const walletDisc = r2(es.walletDiscrepancy ?? r2(walletChange - expectedWallet));
//   const gameDisc = Math.round(es.gameDiscrepancy ?? (gameChange - expectedGame));
//   const crossWalletDisc = r2(es.crossAdjWalletDiscrepancy ?? walletDisc);
//   const crossGameDisc = Math.round(es.crossAdjGameDiscrepancy ?? gameDisc);
//   const walletOk = Math.abs(crossWalletDisc) < 0.02;
//   const gameOk = Math.abs(crossGameDisc) < 2;
//   const allOk = walletOk && gameOk;
//   const isCrossAdj = es.isCrossAdjBalanced ?? null;

//   const effort = shift.checkin?.effortRating ?? stx.effortRating ?? null;
//   const effortColor = !effort ? '#94a3b8' : effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626';

//   // ── 4. Fetch live data (transactions, expenses, takeouts) ─────
//   // const API_BASE = (typeof import !== 'undefined' && import.meta?.env?.VITE_API_URL) || 'http://localhost:3001/api';
//   // const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);
//   const fj = async (path) => {
//     const token = localStorage.getItem('authToken');
//     const r = await fetch(`${API_BASE}${path}`, {
//       credentials: 'include', cache: 'no-store',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Store-Id': String(getStoreId()),
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       },
//     });
//     if (!r.ok) return null;
//     return r.json();
//   };

//   const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
//   const toDate = shift.endTime ? encodeURIComponent(new Date(shift.endTime).toISOString()) : '';
//   const toParam = toDate ? `&toDate=${toDate}` : '';

//   let transactions = [];
//   let expenses = [];
//   let takeouts = [];

//   try {
//     const [txRes, expRes, toRes] = await Promise.all([
//       fj(`/transactions?limit=500&fromDate=${fromDate}${toParam}`),
//       fj(`/expenses?fromDate=${fromDate}${toParam}`),
//       fj(`/profit-takeouts?fromDate=${fromDate}${toParam}&limit=200`),
//     ]);

//     const shiftStart = new Date(shift.startTime);
//     const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();

//     transactions = (txRes?.data ?? []).filter(t => {
//       const d = new Date(t.createdAtISO ?? t.createdAt ?? t.date ?? 0);
//       return d >= shiftStart && d <= shiftEnd;
//     });

//     expenses = expRes?.data ?? [];
//     takeouts = toRes?.data ?? [];
//   } catch (e) {
//     console.warn('printShiftPDF: fetch failed', e);
//   }

//   // ── 5. Wallet / game snapshot rows ───────────────────────────
//   const startWalletSnap = ss.walletSnapshot ?? [];
//   const endWalletSnap = es.walletSnapshot ?? [];
//   const startGameSnap = ss.gameSnapshot ?? [];
//   const endGameSnap = es.gameSnapshot ?? [];

//   const startWalletMap = Object.fromEntries(startWalletSnap.map(w => [String(w.id), w]));
//   const endWalletMap = Object.fromEntries(endWalletSnap.map(w => [String(w.id), w]));
//   const startGameMap = Object.fromEntries(startGameSnap.map(g => [String(g.id), g]));
//   const endGameMap = Object.fromEntries(endGameSnap.map(g => [String(g.id), g]));

//   const allWalletIds = [...new Set([...Object.keys(startWalletMap), ...Object.keys(endWalletMap)])];
//   const allGameIds = [...new Set([...Object.keys(startGameMap), ...Object.keys(endGameMap)])];

//   const walletRows = allWalletIds.map(id => {
//     const sw = startWalletMap[id];
//     const ew = endWalletMap[id];
//     const isNew = !sw && !!ew;
//     const isRemoved = !!sw && !ew;
//     const startBal = r2(sw?.balance ?? 0);
//     const endBal = r2(ew?.balance ?? 0);
//     const delta = r2(endBal - startBal);
//     const name = (ew ?? sw);
//     return { id, name: name?.name ?? '?', method: name?.method ?? '?', startBal, endBal, delta, isNew, isRemoved };
//   });

//   const gameRows = allGameIds.map(id => {
//     const sg = startGameMap[id];
//     const eg = endGameMap[id];
//     const isNew = !sg && !!eg;
//     const isRemoved = !!sg && !eg;
//     const startPts = Math.round(sg?.pointStock ?? 0);
//     const endPts = Math.round(eg?.pointStock ?? 0);
//     const delta = endPts - startPts;
//     const name = (eg ?? sg);
//     return { id, name: name?.name ?? '?', startPts, endPts, delta, isNew, isRemoved, isShared: name?.isShared };
//   });

//   const newWallets = walletRows.filter(r => r.isNew);
//   const newGames = gameRows.filter(r => r.isNew);

//   // ── 6. Build HTML ─────────────────────────────────────────────
//   const css = `
//     *{box-sizing:border-box;margin:0;padding:0}
//     body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;background:#fff;padding:32px 36px}
//     h1{font-size:22px;font-weight:800;color:#0f172a}
//     .subtitle{font-size:11px;color:#64748b;margin-top:3px;margin-bottom:20px}
//     h2{font-size:11px;font-weight:800;color:#374151;border-bottom:2px solid #e2e8f0;
//        padding-bottom:5px;margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.5px}
//     table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:0}
//     th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;
//        font-size:10px;text-transform:uppercase;letter-spacing:0.4px;
//        border-bottom:2px solid #e2e8f0;white-space:nowrap}
//     td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
//     tr:last-child td{border-bottom:none}
//     .tr{text-align:right} .tc{text-align:center} .b{font-weight:700} .bb{font-weight:800}
//     .mono{font-family:monospace}
//     .section{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px}
//     .sHdr{padding:8px 12px;font-size:10.5px;font-weight:800;color:#374151;
//           text-transform:uppercase;letter-spacing:0.4px;background:#f8fafc;
//           border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
//     .kpiGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}
//     .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;text-align:center}
//     .kpiVal{font-size:16px;font-weight:800}
//     .kpiLbl{font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.4px}
//     .g{color:#16a34a} .r{color:#dc2626} .a{color:#c2410c}
//     .p{color:#7c3aed} .o{color:#d97706} .b45{color:#b45309}
//     .banner{padding:12px 16px;border-radius:8px;border:1px solid;margin-bottom:16px;font-size:11.5px}
//     .bannerG{background:#f0fdf4;border-color:#86efac;border-left:4px solid #16a34a}
//     .bannerR{background:#fef2f2;border-color:#fca5a5;border-left:4px solid #dc2626}
//     .bannerO{background:#fffbeb;border-color:#fde68a;border-left:4px solid #f59e0b}
//     .bannerP{background:#f5f3ff;border-color:#c4b5fd;border-left:4px solid #7c3aed}
//     .bannerB{background:#eff6ff;border-color:#bfdbfe;border-left:4px solid #2563eb}
//     .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700}
//     .badgeG{background:#dcfce7;color:#16a34a}
//     .badgeR{background:#fee2e2;color:#991b1b}
//     .badgeO{background:#fffbeb;color:#b45309}
//     .badgeP{background:#ede9fe;color:#4c1d95}
//     .badgeB{background:#dbeafe;color:#1d4ed8}
//     .badgeY{background:#fef9c3;color:#854d0e}
//     .footRow td{background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0}
//     .midRow td{background:#eff6ff}
//     .midGameRow td{background:#f5f3ff}
//     .removedRow td{background:#fef2f2}
//     .newRow td{background:#f0fdf4}
//     .discRow td{background:#fef2f2}
//     .crossRow td{background:#faf5ff;font-style:italic}
//     button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;
//            font-weight:700;font-size:12px;cursor:pointer}
//     @media print{button{display:none}body{padding:18px}}
//     .twoCol{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
//   `;

//   // ── KPI cards ─────────────────────────────────────────────────
//   const kpis = [
//     { label: 'Deposits', val: `+${fmtMoney(deposits)}`, cls: 'g' },
//     { label: 'Cashouts', val: `-${fmtMoney(cashouts)}`, cls: 'r' },
//     { label: 'Net Profit', val: `${netProfit >= 0 ? '+' : '−'}${fmtMoney(netProfit)}`, cls: netProfit >= 0 ? 'g' : 'r' },
//     ...(totalFees > 0 ? [{ label: 'Total Fees', val: `-${fmtMoney(totalFees)}`, cls: 'o' }] : []),
//     ...(bonuses > 0 ? [{ label: 'Bonuses', val: `-${fmtMoney(bonuses)}`, cls: 'a' }] : []),
//     ...(expenseWalletPaid > 0 ? [{ label: 'Expenses Paid', val: `-${fmtMoney(expenseWalletPaid)}`, cls: 'b45' }] : []),
//     ...(takeoutWalletPaid > 0 ? [{ label: 'Takeouts', val: `-${fmtMoney(takeoutWalletPaid)}`, cls: 'r' }] : []),
//     ...(pointsReloaded > 0 ? [{ label: 'Pts Reloaded', val: `+${pointsReloaded} pts`, cls: 'p' }] : []),
//     // { label: 'Transactions',  val: `${transactions.length || stx.transactionCount ?? '—'}`, cls: 'b' },
//     { label: 'Transactions', val: `${transactions.length || (stx.transactionCount ?? '—')}`, cls: 'b' },
//     ...(effort ? [{ label: 'Effort Rating', val: `${effort}/10`, cls: effort >= 8 ? 'g' : effort >= 5 ? 'o' : 'r' }] : []),
//   ];

//   const kpiHtml = `<div class="kpiGrid">
//     ${kpis.map(k => `
//       <div class="kpi">
//         <div class="kpiVal ${k.cls}">${k.val}</div>
//         <div class="kpiLbl">${k.label}</div>
//       </div>`).join('')}
//   </div>`;

//   // ── Mid-shift banners ─────────────────────────────────────────
//   const midShiftHtml = [
//     newWallets.length > 0 && `
//       <div class="banner bannerB">
//         <b>🆕 New wallets added mid-shift:</b>
//         ${newWallets.map(w => `${w.method} — ${w.name} ($${w.endBal.toFixed(2)})`).join(', ')}.
//         Opening balances not captured — included in end totals only.
//       </div>`,
//     newGames.length > 0 && `
//       <div class="banner bannerP">
//         <b>🆕 New games added mid-shift:</b>
//         ${newGames.map(g => g.name).join(', ')}.
//         No start stock captured — included in end totals only.
//       </div>`,
//   ].filter(Boolean).join('');

//   // ── Wallet table ──────────────────────────────────────────────
//   const startWalletTotal = r2(ss.totalWallet ?? startWalletSnap.reduce((s, w) => s + w.balance, 0));
//   const endWalletTotal = r2(es.totalWallet ?? endWalletSnap.reduce((s, w) => s + w.balance, 0));

//   const walletTableHtml = walletRows.length > 0 ? `
//     <div class="section">
//       <div class="sHdr">
//         <span>💳 Wallet Balances</span>
//         <span style="font-weight:400;color:#64748b">Start: $${startWalletTotal.toFixed(2)} → End: $${endWalletTotal.toFixed(2)}</span>
//       </div>
//       <table>
//         <thead><tr>
//           <th>Method</th><th>Account</th>
//           <th class="tr">Start</th><th class="tr">End</th><th class="tr">Change</th>
//           <th class="tc">Note</th>
//         </tr></thead>
//         <tbody>
//           ${walletRows.map(w => `
//             <tr class="${w.isNew ? 'newRow' : w.isRemoved ? 'removedRow' : ''}">
//               <td><b>${w.method}</b></td>
//               <td>${w.name}</td>
//               <td class="tr mono">${w.isNew ? 'N/A' : `$${w.startBal.toFixed(2)}`}</td>
//               <td class="tr mono b">${w.isRemoved ? 'N/A' : `$${w.endBal.toFixed(2)}`}</td>
//               <td class="tr mono bb" style="color:${w.isNew || w.isRemoved ? '#94a3b8' : w.delta >= 0 ? '#16a34a' : '#dc2626'}">
//                 ${w.isNew || w.isRemoved ? 'N/A' : `${w.delta >= 0 ? '+' : '−'}$${Math.abs(w.delta).toFixed(2)}`}
//               </td>
//               <td class="tc">
//                 ${w.isNew ? '<span class="badge badgeB">new mid-shift</span>' : w.isRemoved ? '<span class="badge badgeR">removed</span>' : ''}
//               </td>
//             </tr>`).join('')}
//           <tr class="footRow">
//             <td colspan="2"><b>Total</b></td>
//             <td class="tr mono">$${startWalletTotal.toFixed(2)}</td>
//             <td class="tr mono b">$${endWalletTotal.toFixed(2)}</td>
//             <td class="tr mono bb" style="color:${walletChange >= 0 ? '#16a34a' : '#dc2626'}">
//               ${walletChange >= 0 ? '+' : '−'}$${Math.abs(walletChange).toFixed(2)}
//             </td>
//             <td></td>
//           </tr>
//         </tbody>
//       </table>
//     </div>` : '';

//   // ── Game table ────────────────────────────────────────────────
//   const startGameTotal = Math.round(ss.totalGames ?? startGameSnap.reduce((s, g) => s + g.pointStock, 0));
//   const endGameTotal = Math.round(es.totalGames ?? endGameSnap.reduce((s, g) => s + g.pointStock, 0));

//   const gameTableHtml = gameRows.length > 0 ? `
//     <div class="section">
//       <div class="sHdr">
//         <span>🎮 Game Points</span>
//         <span style="font-weight:400;color:#64748b">Start: ${startGameTotal} pts → End: ${endGameTotal} pts</span>
//       </div>
//       <table>
//         <thead><tr>
//           <th>Game</th>
//           <th class="tr">Start (pts)</th><th class="tr">End (pts)</th><th class="tr">Change</th>
//           <th class="tc">Note</th>
//         </tr></thead>
//         <tbody>
//           ${gameRows.map(g => `
//             <tr class="${g.isNew ? 'midGameRow' : g.isRemoved ? 'removedRow' : ''}">
//               <td>
//                 <b>${g.name}</b>
//                 ${g.isShared ? ' <span class="badge badgeP">shared</span>' : ''}
//               </td>
//               <td class="tr mono">${g.isNew ? 'N/A' : `${g.startPts} pts`}</td>
//               <td class="tr mono b">${g.isRemoved ? 'N/A' : `${g.endPts} pts`}</td>
//               <td class="tr mono bb" style="color:${g.isNew || g.isRemoved ? '#94a3b8' : g.delta <= 0 ? '#16a34a' : '#dc2626'}">
//                 ${g.isNew || g.isRemoved ? 'N/A' : `${g.delta >= 0 ? '+' : ''}${g.delta} pts`}
//               </td>
//               <td class="tc">
//                 ${g.isNew ? '<span class="badge badgeP">new mid-shift</span>' : g.isRemoved ? '<span class="badge badgeR">removed</span>' : ''}
//               </td>
//             </tr>`).join('')}
//           <tr class="footRow">
//             <td><b>Total</b></td>
//             <td class="tr mono">${startGameTotal} pts</td>
//             <td class="tr mono b">${endGameTotal} pts</td>
//             <td class="tr mono bb" style="color:${gameChange <= 0 ? '#16a34a' : '#dc2626'}">
//               ${gameChange >= 0 ? '+' : ''}${gameChange} pts
//             </td>
//             <td></td>
//           </tr>
//         </tbody>
//       </table>
//     </div>` : '';

//   // ── Discrepancy section ───────────────────────────────────────
//   const formulaRows = [
//     { label: '+ Deposits', wallet: `+$${deposits.toFixed(2)}`, pts: `−${deposits.toFixed(0)} pts` },
//     { label: '− Cashouts completed', wallet: `−$${cashouts.toFixed(2)}`, pts: `+${cashouts.toFixed(0)} pts` },
//     ...(totalFees > 0 ? [{ label: '− Fees (deposit + cashout)', wallet: `−$${totalFees.toFixed(2)}`, pts: `−${totalFees.toFixed(0)} pts` }] : []),
//     ...(bonuses > 0 ? [{ label: '− Bonuses granted', wallet: '—', pts: `−${bonuses.toFixed(0)} pts` }] : []),
//     ...(pointsReloaded > 0 ? [{ label: '+ Points reloaded (expenses)', wallet: '—', pts: `+${pointsReloaded} pts` }] : []),
//     ...(expenseWalletPaid > 0 ? [{ label: '− Expense wallet payments', wallet: `−$${expenseWalletPaid.toFixed(2)}`, pts: '—' }] : []),
//     ...(takeoutWalletPaid > 0 ? [{ label: '− Profit takeouts (wallet)', wallet: `−$${takeoutWalletPaid.toFixed(2)}`, pts: '—' }] : []),
//   ];

//   const discrepancyHtml = `
//     <div class="banner ${allOk ? 'bannerG' : 'bannerR'}" style="border-left:4px solid ${allOk ? '#16a34a' : '#dc2626'}">
//       <div style="font-weight:800;font-size:13.5px;color:${allOk ? '#166534' : '#991b1b'};margin-bottom:6px">
//         ${allOk
//       ? (isCrossAdj ? '✓ Balanced — cross-store activity accounts for all changes' : '✓ Fully Balanced')
//       : `⚠️ Discrepancy Detected: ${!walletOk ? `Cash off by $${Math.abs(crossWalletDisc).toFixed(2)}` : ''}${!walletOk && !gameOk ? ' | ' : ''}${!gameOk ? `Points off by ${Math.abs(crossGameDisc)} pts` : ''}`}
//       </div>
//       <table style="font-size:11px">
//         <thead>
//           <tr>
//             <th style="width:50%">Formula Item</th>
//             <th class="tr">Wallet $</th>
//             <th class="tr">Game pts</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${formulaRows.map(r => `
//             <tr>
//               <td style="color:#475569">${r.label}</td>
//               <td class="tr mono b">${r.wallet}</td>
//               <td class="tr mono b" style="color:#7c3aed">${r.pts}</td>
//             </tr>`).join('')}
//           <tr style="background:#f8fafc;border-top:2px solid #e2e8f0">
//             <td class="b">Expected Change</td>
//             <td class="tr mono bb" style="color:${expectedWallet >= 0 ? '#16a34a' : '#dc2626'}">${expectedWallet >= 0 ? '+' : '−'}$${Math.abs(expectedWallet).toFixed(2)}</td>
//             <td class="tr mono bb" style="color:#7c3aed">${expectedGame >= 0 ? '+' : ''}${expectedGame} pts</td>
//           </tr>
//           <tr style="background:#f8fafc">
//             <td class="b">Actual Change</td>
//             <td class="tr mono bb" style="color:${walletChange >= 0 ? '#16a34a' : '#dc2626'}">${walletChange >= 0 ? '+' : '−'}$${Math.abs(walletChange).toFixed(2)}</td>
//             <td class="tr mono bb" style="color:#7c3aed">${gameChange >= 0 ? '+' : ''}${gameChange} pts</td>
//           </tr>
//           ${!allOk ? `
//           <tr class="discRow">
//             <td class="b" style="color:#991b1b">⚠️ Real Discrepancy</td>
//             <td class="tr mono bb" style="color:${walletOk ? '#16a34a' : '#dc2626'}">
//               ${walletOk ? '✓ balanced' : `$${Math.abs(crossWalletDisc).toFixed(2)} off`}
//             </td>
//             <td class="tr mono bb" style="color:${gameOk ? '#16a34a' : '#dc2626'}">
//               ${gameOk ? '✓ balanced' : `${Math.abs(crossGameDisc)} pts off`}
//             </td>
//           </tr>` : `
//           <tr style="background:#f0fdf4">
//             <td class="b" style="color:#166534">✓ Verified</td>
//             <td class="tr mono b" style="color:#16a34a">balanced</td>
//             <td class="tr mono b" style="color:#16a34a">balanced</td>
//           </tr>`}
//         </tbody>
//       </table>
//       ${(es.notes || ss.notes) ? `<div style="margin-top:10px;font-size:11px;color:#475569;border-top:1px solid #e2e8f0;padding-top:8px"><b>Notes:</b> ${es.notes || ss.notes}</div>` : ''}
//     </div>`;

//   // ── Transactions table ────────────────────────────────────────
//   const txnHtml = transactions.length > 0 ? `
//     <div class="section">
//       <div class="sHdr">
//         <span>💳 Transactions (${transactions.length})</span>
//         <span style="font-weight:400;color:#64748b">
//           Deposits: $${r2(transactions.filter(t => t.type === 'Deposit').reduce((s, t) => s + t.amount, 0)).toFixed(2)}
//           · Cashouts: $${r2(transactions.filter(t => t.type === 'Cashout').reduce((s, t) => s + t.amount, 0)).toFixed(2)}
//         </span>
//       </div>
//       <table>
//         <thead><tr>
//           <th>Time</th><th>Player</th><th>Type</th>
//           <th>Game / Wallet</th><th class="tr">Amount</th>
//           <th class="tr">Fee</th><th class="tc">Status</th>
//           <th class="tr">Pts Before→After</th>
//         </tr></thead>
//         <tbody>
//           ${transactions.map(t => {
//     const isD = t.type === 'Deposit', isCO = t.type === 'Cashout';
//     const pts = t.gameStockBefore != null && t.gameStockAfter != null
//       ? `${Math.round(t.gameStockBefore)} → ${Math.round(t.gameStockAfter)}` : '—';
//     const typeCls = isD ? 'badgeG' : isCO ? 'badgeR' : 'badgeO';
//     return `<tr>
//               <td style="font-size:10px;color:#64748b;white-space:nowrap">${fmtDateTime(t.createdAtISO ?? t.date)}</td>
//               <td class="b">${t.playerName || `#${t.playerId}`}</td>
//               <td><span class="badge ${typeCls}">${t.type}</span></td>
//               <td style="font-size:10.5px">
//                 ${t.gameName ? `<b>${t.gameName}</b>` : ''}
//                 ${t.walletMethod ? `<span style="color:#64748b">${t.walletMethod}${t.walletName ? ` · ${t.walletName}` : ''}</span>` : ''}
//                 ${!t.gameName && !t.walletMethod ? '—' : ''}
//               </td>
//               <td class="tr mono bb" style="color:${isD ? '#16a34a' : isCO ? '#dc2626' : '#c2410c'}">
//                 $${(t.amount ?? 0).toFixed(2)}
//               </td>
//               <td class="tr mono" style="color:${t.fee > 0 ? '#f59e0b' : '#cbd5e1'}">
//                 ${t.fee > 0 ? `−$${t.fee.toFixed(2)}` : '—'}
//               </td>
//               <td class="tc">
//                 <span class="badge ${t.status === 'PENDING' ? 'badgeY' : 'badgeG'}">
//                   ${t.status === 'PENDING' ? 'PENDING' : 'DONE'}
//                 </span>
//               </td>
//               <td class="tr mono" style="font-size:10.5px;color:#64748b">${pts}</td>
//             </tr>`;
//   }).join('')}
//         </tbody>
//       </table>
//     </div>` : `
//     <div class="section">
//       <div class="sHdr"><span>💳 Transactions</span></div>
//       <div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px">
//         ${transactions.length === 0 ? 'No transactions found for this shift' : 'Transaction data unavailable'}
//       </div>
//     </div>`;

//   // ── Expenses table ────────────────────────────────────────────
//   const totalExpAmt = r2(expenses.reduce((s, e) => s + (e.amount ?? 0), 0));
//   const expHtml = expenses.length > 0 ? `
//     <div class="section">
//       <div class="sHdr">
//         <span>📋 Expenses (${expenses.length})</span>
//         <span style="font-weight:400;color:#64748b">Total: $${totalExpAmt.toFixed(2)} · Wallet paid: $${expenseWalletPaid.toFixed(2)} · Pts added: +${pointsReloaded} pts</span>
//       </div>
//       <table>
//         <thead><tr>
//           <th>Time</th><th>Details</th><th>Category</th><th>Game</th>
//           <th class="tr">Amount</th><th class="tr">Wallet Paid</th><th class="tr">Pts Added</th>
//         </tr></thead>
//         <tbody>
//           ${expenses.map(e => `
//             <tr>
//               <td style="font-size:10px;color:#64748b;white-space:nowrap">${fmtDateTime(e.createdAt)}</td>
//               <td class="b">${e.details || '—'}</td>
//               <td><span class="badge badgeO">${(e.category || '').replace('_', ' ') || '—'}</span></td>
//               <td style="color:#64748b">${e.game?.name || '—'}</td>
//               <td class="tr mono b" style="color:#b45309">$${(e.amount ?? 0).toFixed(2)}</td>
//               <td class="tr mono" style="color:#dc2626">
//                 ${(e.paymentMade ?? 0) > 0 ? `−$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}
//               </td>
//               <td class="tr mono" style="color:#16a34a">
//                 ${(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—'}
//               </td>
//             </tr>`).join('')}
//           <tr class="footRow">
//             <td colspan="4"><b>Total</b></td>
//             <td class="tr mono bb" style="color:#b45309">$${totalExpAmt.toFixed(2)}</td>
//             <td class="tr mono bb" style="color:#dc2626">${expenseWalletPaid > 0 ? `−$${expenseWalletPaid.toFixed(2)}` : '—'}</td>
//             <td class="tr mono bb" style="color:#16a34a">${pointsReloaded > 0 ? `+${pointsReloaded} pts` : '—'}</td>
//           </tr>
//         </tbody>
//       </table>
//     </div>` : '';

//   // ── Takeouts table ────────────────────────────────────────────
//   const totalTakeoutAmt = r2(takeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0));
//   const takeoutHtml = takeouts.length > 0 ? `
//     <div class="section">
//       <div class="sHdr">
//         <span>💸 Profit Takeouts (${takeouts.length})</span>
//         <span style="font-weight:400;color:#64748b">Total: $${totalTakeoutAmt.toFixed(2)}</span>
//       </div>
//       <table>
//         <thead><tr>
//           <th>Time</th><th>Taken By</th><th>Method</th>
//           <th class="tr">Amount</th><th>Wallet Used</th><th>Notes</th>
//         </tr></thead>
//         <tbody>
//           ${takeouts.map(t => `
//             <tr>
//               <td style="font-size:10px;color:#64748b;white-space:nowrap">${fmtDateTime(t.createdAt)}</td>
//               <td class="b">${t.takenBy || '—'}</td>
//               <td><span class="badge badgeR">${t.method || '—'}</span></td>
//               <td class="tr mono bb" style="color:#dc2626">−$${parseFloat(t.amount ?? 0).toFixed(2)}</td>
//               <td>${t.walletId ? '<span style="color:#dc2626">wallet deducted</span>' : '<span style="color:#94a3b8">cash/external</span>'}</td>
//               <td style="color:#64748b;font-size:10.5px">${t.notes || '—'}</td>
//             </tr>`).join('')}
//           <tr class="footRow">
//             <td colspan="3"><b>Total</b></td>
//             <td class="tr mono bb" style="color:#dc2626">−$${totalTakeoutAmt.toFixed(2)}</td>
//             <td colspan="2" style="color:#64748b;font-size:10.5px">Wallet-deducted: −$${takeoutWalletPaid.toFixed(2)}</td>
//           </tr>
//         </tbody>
//       </table>
//     </div>` : '';

//   // ── Opening-shift notes ───────────────────────────────────────
//   const openingNotes = ss.notes ?? '';
//   const openingNotesHtml = openingNotes ? `
//     <div class="banner bannerO">
//       <b>📝 Opening Notes:</b> ${openingNotes}
//       ${ss.hasDiscrepancies ? `<span style="margin-left:8px;color:#f59e0b">⚠️ ${ss.walletDiscrepancyCount ?? 0} wallet + ${ss.gameDiscrepancyCount ?? 0} game discrepancies at start</span>` : ''}
//     </div>` : '';

//   // ── Feedback ──────────────────────────────────────────────────
//   const fbRows = [
//     { label: 'Effort Reason', val: feedback.effortReason },
//     { label: 'Shift Work Description', val: feedback.shiftWorkDescription },
//     { label: 'Work Summary', val: feedback.workSummary },
//     { label: 'Issues Encountered', val: feedback.issuesEncountered },
//     { label: 'Could Do Better', val: feedback.improvements },
//     { label: 'Recommendations (prev shift)', val: feedback.recommendationsLastShift },
//     { label: 'Overall Recommendations', val: feedback.recommendationsOverall },
//   ].filter(r => r.val && r.val.trim());

//   const feedbackHtml = fbRows.length > 0 ? `
//     <h2>Member Feedback</h2>
//     <div class="section">
//       <table>
//         ${fbRows.map(r => `
//           <tr>
//             <td style="width:28%;font-weight:700;color:#64748b;vertical-align:top">${r.label}</td>
//             <td style="line-height:1.55">${r.val}</td>
//           </tr>`).join('')}
//       </table>
//     </div>` : '';

//   // ── Rating ────────────────────────────────────────────────────
//   const ratingHtml = shift.rating ? `
//     <div class="banner bannerG" style="margin-bottom:16px">
//       <b>⭐ Manager Rating: ${['★', '★', '★', '★', '★'].map((_, i) => i < Math.round(shift.rating.overallRating) ? '★' : '☆').join('')}</b>
//       ${shift.rating.feedback ? `<div style="margin-top:4px;color:#166534;font-size:11px">${shift.rating.feedback}</div>` : ''}
//     </div>` : '';

//   // ── Assemble full document ────────────────────────────────────
//   const html = `<!DOCTYPE html><html><head>
//   <meta charset="utf-8"/>
//   <title>Shift Report — ${fmtDate(shift.startTime)}</title>
//   <style>${css}</style>
//   </head><body>

//   <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
//     <div>
//       <h1>Shift Report — ${fmtDate(shift.startTime)}</h1>
//       <p class="subtitle">
//         ${fmtTime(shift.startTime)} → ${fmtTime(shift.endTime)}
//         ${shift.duration != null ? ` · ${shift.duration} min` : ''}
//         ${shift.teamRole ? ` · ${shift.teamRole}` : ''}
//         ${shift.memberName ? ` · ${shift.memberName}` : ''}
//         · Generated ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
//       </p>
//     </div>
//     <button onclick="window.print()">Print / Save PDF</button>
//   </div>

//   ${ratingHtml}
//   ${openingNotesHtml}

//   <h2>Activity Summary</h2>
//   ${kpiHtml}

//   ${midShiftHtml}

//   <h2>Audit Verification</h2>
//   ${discrepancyHtml}

//   ${walletTableHtml ? `<h2>Cash Flow Audit</h2>${walletTableHtml}` : ''}
//   ${gameTableHtml ? `<h2>Game Point Audit</h2>${gameTableHtml}` : ''}

//   <h2>Transactions (${transactions.length})</h2>
//   ${txnHtml}

//   ${(expenses.length > 0 || takeouts.length > 0) ? `<h2>Expenses & Profit Takeouts</h2>${expHtml}${takeoutHtml}` : ''}

//   ${feedbackHtml}

//   <p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:10px">
//     Confidential · Shift Report · Generated ${new Date().toISOString()}
//   </p>
//   </body></html>`;

//   const win = window.open('', '_blank');
//   win.document.write(html);
//   win.document.close();
// }

// ═══════════════════════════════════════════════════════════════
// UPDATE THE PDF BUTTON onClick IN ShiftsPage:
// ─────────────────────────────────────────────────────────────
// Old:
//   onClick={() => printShiftPDF(shift)}
//
// New (because the function is now async):
//   onClick={() => { printShiftPDF(shift).catch(console.error); }}
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// TASK TYPE META (mirroring MemberTasksSection)
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// MAIN ShiftsPage
// ═══════════════════════════════════════════════════════════════
export const ShiftsPage = () => {
  const activeShiftIdRef = useRef(null);
  const { shiftActive, setShiftActive } = useContext(ShiftStatusContext);
  const { usr } = useContext(CurrentUserContext);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(usr?.role);

  const [ratingModal, setRatingModal] = useState(null); // { shift, memberName }
  const [pastShifts, setPastShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [startSnapshot, setStartSnapshot] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // ── Task filters ──────────────────────────────────────────────
  const [taskSearch, setTaskSearch] = useState('');
  const [taskType, setTaskType] = useState('ALL');
  const [taskStatus, setTaskStatus] = useState('ALL');


  // Add this helper function near the top of ShiftsPage:
  const refreshPastShifts = useCallback(async () => {
    try {
      if (isAdmin) {
        const TEAM_ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];
        const results = await Promise.all(
          [...TEAM_ROLES, usr.role].map(r => api.reports.getMyShifts({ role: r, limit: 30 }))
        );
        setPastShifts(
          results
            .flatMap(r => r?.data ?? [])
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        );
      } else {
        const h = await api.reports.getMyShifts({ role: usr.role, limit: 30 });
        setPastShifts(h?.data ?? []);
      }
    } catch (e) { console.error('Refresh shifts error:', e); }
  }, [usr?.role, isAdmin]);


  useEffect(() => {
    if (!usr?.role) return;
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const TEAM_ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];

        const [activeRes, historyRes, tasksRes] = await Promise.all([
          // ✅ Check admin's own active shift too (removed the skip)
          api.shifts.getActiveShift(usr.role),

          isAdmin
            ? Promise.all(
              // ✅ Include admin's own role alongside team roles
              [...TEAM_ROLES, usr.role].map(r => api.reports.getMyShifts({ role: r, limit: 30 }))
            ).then(results => ({
              data: results
                .flatMap(r => r?.data ?? [])
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
            }))
            : api.reports.getMyShifts({ role: usr.role, limit: 30 }),

          token ? fj('/tasks?myTasks=true') : Promise.resolve({ data: [] }),
        ]);

        if (activeRes?.data) {
          const sh = activeRes.data;
          activeShiftIdRef.current = sh.id;
          setActiveShift(sh);
          setShiftActive(true);
          const checkinRes = await fj(`/shifts/${sh.id}/checkin`).catch(() => null);
          if (checkinRes?.data?.balanceNote) {
            try { setStartSnapshot(JSON.parse(checkinRes.data.balanceNote)); } catch (_) { }
          }
        }

        setPastShifts(historyRes?.data ?? []);
        setTasks((tasksRes?.data ?? []).filter(t => t.status !== 'COMPLETED'));
      } catch (e) { console.error('Shift restore error:', e); }
    })();
  }, [usr?.role]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); } }, [error]);

  // In ShiftsPage useEffect, add SSE listener:
  useEffect(() => {
    if (!usr?.role) return;
    const sse = api.tasks.connectSSE();
    sse.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'shift_ended' || msg.type === 'shift_checkin') {
        refreshPastShifts(); // auto-reload
      }
    };
    return () => sse.close();
  }, [usr?.role, refreshPastShifts]);

  const handleCheckinConfirm = async (snapshot) => {
    try {
      setLoading(true);
      const res = await api.shifts.startShift({ teamRole: usr?.role });
      if (!res?.data) throw new Error('No shift data returned');
      const shiftId = res.data.id;
      activeShiftIdRef.current = shiftId;
      setActiveShift(res.data);
      await fj(`/shifts/${shiftId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ confirmedBalance: snapshot.totalWallet, balanceNote: JSON.stringify(snapshot) }),
      });
      setStartSnapshot(snapshot);
      setShiftActive(true);
      setShowCheckin(false);
      setSuccess('Shift started! Good luck! 🌊');
    } catch (err) { setError(err.message || 'Failed to start shift'); throw err; }
    finally { setLoading(false); }
  };


  const handleCheckoutSubmit = async ({ endSnapshot, feedback }) => {
    const shiftId = activeShiftIdRef.current;
    if (!shiftId) return;
    try {
      setLoading(true);
      await fj(`/shifts/${shiftId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          effortRating: feedback.effort,
          workSummary: feedback.workSummary,
          issuesEncountered: feedback.issuesEncountered,
          shoutouts: '',
          additionalNotes: JSON.stringify({
            effortReason: feedback.effortReason,
            improvements: feedback.improvements,
            shiftWorkDescription: feedback.shiftWorkDescription,
            recommendationsLastShift: feedback.recommendationsLastShift,
            recommendationsOverall: feedback.recommendationsOverall,
            endSnapshot,
          }),
        }),
      });
      await api.shifts.endShift(shiftId);

      activeShiftIdRef.current = null;
      setActiveShift(null);
      setStartSnapshot(null);
      setShiftActive(false);
      setShowCheckout(false);
      setSuccess('Shift ended and report saved! Great work!');

      // ── FIX: use enriched reports endpoint, not raw shifts ──
      await refreshPastShifts();

    } catch (err) { setError(err.message || 'Failed to end shift'); throw err; }
    finally { setLoading(false); }
  };


  // const handleCheckoutSubmit = async ({ endSnapshot, feedback }) => {
  //   const shiftId = activeShiftIdRef.current;
  //   if (!shiftId) return;
  //   try {
  //     setLoading(true);
  //     await fj(`/shifts/${shiftId}/checkout`, {
  //       method: 'POST',
  //       body: JSON.stringify({
  //         effortRating: feedback.effort,
  //         workSummary: feedback.workSummary,
  //         issuesEncountered: feedback.issuesEncountered,
  //         shoutouts: '',
  //         additionalNotes: JSON.stringify({
  //           effortReason: feedback.effortReason,
  //           improvements: feedback.improvements,
  //           shiftWorkDescription: feedback.shiftWorkDescription,
  //           recommendationsLastShift: feedback.recommendationsLastShift,
  //           recommendationsOverall: feedback.recommendationsOverall,
  //           endSnapshot,
  //         }),
  //       }),
  //     });
  //     await api.shifts.endShift(shiftId);
  //     activeShiftIdRef.current = null;
  //     setActiveShift(null);
  //     setStartSnapshot(null);
  //     setShiftActive(false);
  //     setShowCheckout(false);
  //     setSuccess('Shift ended and report saved! Great work!');
  //     const h = await api.shifts.getShifts(usr?.role);
  //     setPastShifts(h?.data ?? []);
  //   } catch (err) { setError(err.message || 'Failed to end shift'); throw err; }
  //   finally { setLoading(false); }
  // };

  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // ── Filtered tasks ────────────────────────────────────────────
  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (taskType !== 'ALL' && t.taskType !== taskType) return false;
    if (taskStatus !== 'ALL' && t.status !== taskStatus) return false;
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
    return true;
  }), [tasks, taskType, taskStatus, taskSearch]);

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;

  // ── Past shifts ───────────────────────────────────────────────
  const completedShifts = pastShifts.filter(s => !s.isActive);

  return (
    <>
      { /* {!isAdmin && showCheckin && <CheckinModal onConfirm={handleCheckinConfirm} onCancel={() => setShowCheckin(false)} />} */}
      {!isAdmin && showCheckin && (
        <CheckinModal onConfirm={handleCheckinConfirm} onCancel={() => setShowCheckin(false)} />
      )}
      { /* {showCheckout && activeShift && (
        <CheckoutModal shift={activeShift} startSnapshot={startSnapshot} onSubmit={handleCheckoutSubmit} onCancel={() => setShowCheckout(false)} />
      )} */ }
      {!isAdmin && showCheckout && activeShift && (
        <CheckoutModal shift={activeShift} startSnapshot={startSnapshot} onSubmit={handleCheckoutSubmit} onCancel={() => setShowCheckout(false)} />
      )}
      {ratingModal && (
        < ShiftRatingModal
          shift={ratingModal.shift}
          memberName={ratingModal.memberName}
          onClose={() => setRatingModal(null)}
          onSaved={(rating) => {
            // optionally update local shift data
            setPastShifts(prev => prev.map(s => s.id === ratingModal.shift.id ? { ...s, rating } : s));
            setRatingModal(null);

          }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Status Banner ── */}
        {!isAdmin && (
          <div style={{
            padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px',
            background: shiftActive ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${shiftActive ? '#86efac' : '#fcd34d'}`,
            borderLeft: `4px solid ${shiftActive ? '#16a34a' : '#f59e0b'}`,
          }}>
            {shiftActive ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} /> : <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />}
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: '700', color: shiftActive ? '#166534' : '#92400e', fontSize: '14px' }}>
                {shiftActive ? 'Shift Active' : 'No Active Shift'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: shiftActive ? '#16a34a' : '#b45309', lineHeight: 1.4 }}>
                {shiftActive
                  ? `Started at ${fmtTime(activeShift?.startTime)} — opening balances recorded`
                  : 'Click "Start Shift" to log your opening balances'}
              </p>
            </div>
          </div>
        )}

        {!isAdmin && success && (
          <div style={{ padding: '11px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={14} style={{ flexShrink: 0 }} /> {success}
          </div>
        )}
        {!isAdmin && error && (
          <div style={{ padding: '11px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ── Shift Control Card ── */}
        {!isAdmin && (

          <div style={T.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={22} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Shift Management</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {shiftActive ? 'Your shift is currently active' : 'Start a shift to begin recording transactions'}
                  </p>
                </div>
              </div>
              {shiftActive ? (
                <button onClick={() => setShowCheckout(true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: loading ? 'wait' : 'pointer', opacity: loading ? .7 : 1 }}>
                  {loading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'End Shift'}
                </button>
              ) : (
                <button onClick={() => setShowCheckin(true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '12px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: loading ? 'wait' : 'pointer', opacity: loading ? .7 : 1 }}>
                  {loading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</> : 'Start Shift'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ACTIVE TASKS — Enhanced with filters (like MemberDashboard)
        ══════════════════════════════════════════════════════ */}
        {!isAdmin && tasks.length > 0 && (
          <div style={{ ...T.card, padding: 0, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <ClipboardList size={16} color="#0891b2" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Your Active Tasks</h3>
              <span style={{ background: '#0891b2', color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: '700' }}>{tasks.length}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>{completedTasks} done</span>
                <span>·</span>
                <span style={{ color: '#f97316', fontWeight: '700' }}>{inProgressTasks} active</span>
                <span>·</span>
                <span>{pendingTasks} pending</span>
              </div>
            </div>
            <div style={{ padding: '10px 16px 16px' }}>
              <SmartTaskList tasks={tasks} variant="shifts" pageSize={20} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PAST SHIFTS LOG — Detailed with PDF download
        ══════════════════════════════════════════════════════ */}
        <div style={{ ...T.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Past Shifts Log</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>History of completed shifts ({completedShifts.length})</p>
            </div>
            <FileText size={16} color="#94a3b8" />
          </div>

          {completedShifts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {isAdmin && <th style={T.TH}>Members</th>}
                    <th style={T.TH}>Date & Time</th>
                    <th style={T.TH}>P&L</th>
                    <th style={T.TH}>Activity</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Effort</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Rating</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Balance</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {completedShifts.map(shift => {
                    const effort = shift.checkin?.effortRating ?? shift.stats?.effortRating ?? null;
                    let balanced = null;
                    if (shift.checkin?.additionalNotes) {
                      try {
                        const p = JSON.parse(shift.checkin.additionalNotes);
                        const es = p.endSnapshot ?? null;
                        if (es) {
                          const wd = r2(es.walletDiscrepancy ?? 0);
                          const gd = Math.round(es.gameDiscrepancy ?? 0);
                          balanced = Math.abs(wd) < 0.02 && Math.abs(gd) < 2;
                        }
                      } catch (_) { }
                    }
                    const s = shift.stats || {};
                    const dep = r2(s.totalDeposits ?? 0);
                    const co = r2(s.totalCashouts ?? 0);
                    const net = r2(dep - co);

                    return (
                      <tr key={shift.id}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* // AFTER — show real name with role as a subtle sub-line: */}
                        {isAdmin && (
                          <td style={T.TD}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>
                              {shift.performer?.name || shift.memberName || shift.teamRole}
                            </p>
                          </td>
                        )}
                        {/* Date + time combined */}
                        <td style={T.TD}>
                          <p style={{ margin: '0 0 1px', fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>{fmtDate(shift.startTime)}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{fmtTime(shift.startTime)} → {fmtTime(shift.endTime)}{shift.duration != null ? ` · ${shift.duration}m` : ''}</p>
                        </td>
                        {/* P&L */}
                        <td style={T.TD}>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: net >= 0 ? '#16a34a' : '#dc2626' }}>
                            {net >= 0 ? '+' : ''}${Math.abs(net).toFixed(2)}
                          </p>
                          <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                            ↑${dep.toFixed(0)} ↓${co.toFixed(0)}
                          </p>
                        </td>
                        {/* Activity */}
                        <td style={{ ...T.TD, color: '#475569' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {s.transactionCount > 0 && <span style={{ padding: '2px 6px', background: '#eff6ff', borderRadius: '5px', fontSize: '10px', fontWeight: '600', color: '#2563eb' }}>{s.transactionCount} txns</span>}
                            {s.totalBonuses > 0 && <span style={{ padding: '2px 6px', background: '#fff7ed', borderRadius: '5px', fontSize: '10px', fontWeight: '600', color: '#c2410c' }}>${r2(s.totalBonuses).toFixed(0)} bonus</span>}
                          </div>
                        </td>
                        {/* Effort */}
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {effort != null ? (
                            <span style={{
                              padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                              background: effort >= 8 ? '#dcfce7' : effort >= 5 ? '#fef9c3' : '#fee2e2',
                              color: effort >= 8 ? '#166534' : effort >= 5 ? '#854d0e' : '#991b1b',
                            }}>{effort}/10</span>
                          ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>}
                        </td>
                        {/* Rating */}
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {shift.rating ? (
                            <div style={{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} style={{ fontSize: '13px', color: n <= Math.round(shift.rating.overallRating) ? '#f59e0b' : '#e2e8f0' }}>★</span>
                              ))}
                            </div>
                          ) : isAdmin ? (
                            <button onClick={() => setRatingModal({ shift, memberName: shift.memberName || shift.teamRole })}
                              style={{ padding: '3px 8px', background: 'transparent', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                              Rate
                            </button>
                          ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>}
                        </td>
                        {/* Balance status */}
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {balanced === null
                            ? <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                            : <span style={{
                              padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                              background: balanced ? '#dcfce7' : '#fee2e2',
                              color: balanced ? '#166534' : '#991b1b',
                            }}>{balanced ? '✓ OK' : '⚠️ Gap'}</span>}
                        </td>
                        {/* PDF */}
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          <button onClick={() => printShiftPDF(shift).catch(console.error)}
                            style={{ padding: '5px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Download size={11} /> PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary footer row */}
                {completedShifts.length > 1 && (() => {
                  const totDep = r2(completedShifts.reduce((s, sh) => s + (sh.stats?.totalDeposits ?? 0), 0));
                  const totCO = r2(completedShifts.reduce((s, sh) => s + (sh.stats?.totalCashouts ?? 0), 0));
                  const totBon = r2(completedShifts.reduce((s, sh) => s + (sh.stats?.totalBonuses ?? 0), 0));
                  const totProf = r2(totDep - totCO);
                  const totDur = completedShifts.reduce((s, sh) => s + (sh.duration ?? 0), 0);
                  return (
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      {/* Label — spans Team (admin only) + Date&Time */}
                      <td
                        style={{ ...T.TD, fontWeight: '700', color: '#374151' }}
                        colSpan={isAdmin ? 2 : 1}
                      >
                        Totals ({completedShifts.length} shifts · {totDur} min)
                      </td>

                      {/* P&L column — net + breakdown sub-line */}
                      <td style={T.TD}>
                        <p style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: '800', color: totProf >= 0 ? '#16a34a' : '#dc2626' }}>
                          {totProf >= 0 ? '+' : ''}${Math.abs(totProf).toFixed(2)}
                        </p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                          ↑${totDep.toFixed(0)} ↓${totCO.toFixed(0)}
                        </p>
                      </td>

                      {/* Activity — bonus total if any */}
                      <td style={T.TD}>
                        {totBon > 0 && (
                          <span style={{ padding: '2px 6px', background: '#fff7ed', borderRadius: '5px', fontSize: '10px', fontWeight: '600', color: '#c2410c' }}>
                            ${totBon.toFixed(0)} bonus
                          </span>
                        )}
                      </td>

                      {/* Effort / Rating / Balance / PDF — empty */}
                      <td style={T.TD} /><td style={T.TD} /><td style={T.TD} /><td style={T.TD} />
                    </tr>
                  );
                })()}
              </table>
            </div>
          ) : (
            <div style={{ padding: '60px 28px', textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', background: '#f1f5f9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Clock size={24} color="#cbd5e1" />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#475569' }}>No Past Shifts</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Completed shift reports appear here</p>
            </div>
          )}
        </div >
      </div >

      {/* <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style> */}
      <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
    </>
  );
};
