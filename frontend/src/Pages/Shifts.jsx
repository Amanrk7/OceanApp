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

            {/* ── Game Points ── */}
            {/* <section>
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
                          <td style={T.td}><b>{g.name}</b></td>
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
                      <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>{Math.round(games.reduce((s, g) => s + (g.pointStock ?? 0), 0))} pts</td>
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#7c3aed', fontSize: '14px' }}>{totalGames} pts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section> */}

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
// DISCREPANCY PANEL — full formula including expenses & takeouts
// ═══════════════════════════════════════════════════════════════
function DiscrepancyPanel({ recon }) {
  if (!recon) return null;

  if (!recon.hasStartSnapshot) {
    return (
      <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#64748b' }}>
        ℹ️ No start-of-shift snapshot — reconciliation requires a confirmed start balance.
      </div>
    );
  }

  const bd = recon.breakdown;
  const wd = recon.walletDiscrepancy ?? 0;
  const gd = recon.gameDiscrepancy ?? 0;
  const walletOk = recon.walletBalanced;
  const gameOk = recon.gameBalanced;
  const allOk = recon.isBalanced;

  const rows = [
    { label: '+ Deposits', wallet: `+${fmt$(bd.deposits)}`, game: `-${Math.round(bd.deposits)} pts`, wColor: '#16a34a', gColor: '#7c3aed' },
    { label: '− Cashouts (completed)', wallet: `-${fmt$(bd.completedCashouts)}`, game: `+${Math.round(bd.completedCashouts)} pts`, wColor: '#dc2626', gColor: '#16a34a' },
    { label: '− Fees (deposit + cashout)', wallet: `-${fmt$(bd.totalFees)}`, game: `-${Math.round(bd.totalFees)} pts`, wColor: '#f59e0b', gColor: '#7c3aed', skip: bd.totalFees < 0.001 },
    { label: '− Bonuses granted', wallet: '—', game: `-${Math.round(bd.bonuses)} pts`, wColor: '#94a3b8', gColor: '#c2410c', skip: bd.bonuses < 0.001 },
    { label: '+ Points reloaded (expenses)', wallet: '—', game: `+${Math.round(bd.pointsReloaded)} pts`, wColor: '#94a3b8', gColor: '#16a34a', skip: bd.pointsReloaded < 0.001 },
    { label: '− Expense wallet payments', wallet: `-${fmt$(bd.expenseWalletPaid)}`, game: '—', wColor: '#b45309', gColor: '#94a3b8', skip: bd.expenseWalletPaid < 0.001 },
    { label: '− Profit takeouts (wallet)', wallet: `-${fmt$(bd.takeoutWalletPaid)}`, game: '—', wColor: '#991b1b', gColor: '#94a3b8', skip: bd.takeoutWalletPaid < 0.001 },
  ].filter(r => !r.skip);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Summary banner */}
      <div style={{
        padding: '14px 18px', borderRadius: '10px',
        background: allOk ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${allOk ? '#86efac' : '#fca5a5'}`,
        borderLeft: `4px solid ${allOk ? '#16a34a' : '#dc2626'}`,
      }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: allOk ? '#166534' : '#991b1b', marginBottom: '4px' }}>
          {allOk ? '✓ Fully Balanced' : [
            !walletOk ? `Cash off by $${Math.abs(wd).toFixed(2)}` : '',
            !gameOk ? `Points off by ${Math.abs(gd)} pts` : '',
          ].filter(Boolean).join(' · ')}
        </div>
        {!allOk && (
          <div style={{ fontSize: '11px', color: '#dc2626', lineHeight: 1.7 }}>
            {!walletOk && (
              <div>💳 Wallet: actual {recon.actualWalletChange >= 0 ? '+' : ''}${recon.actualWalletChange?.toFixed(2)} vs expected ${recon.expectedWalletChange?.toFixed(2)}</div>
            )}
            {!gameOk && (
              <div>🎮 Points: actual {recon.actualGameChange >= 0 ? '+' : ''}{recon.actualGameChange} pts vs expected {recon.expectedGameChange} pts</div>
            )}
          </div>
        )}
      </div>

      {/* Formula breakdown */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}>
        <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Formula Breakdown</span>
          <span style={{ color: '#94a3b8', fontWeight: '400' }}>Wallet $ · Game pts</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: '55%' }}>Item</th>
              <th style={{ ...T.th, textAlign: 'right' }}>Wallet</th>
              <th style={{ ...T.th, textAlign: 'right' }}>Game pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ ...T.td, color: '#475569' }}>{row.label}</td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: row.wColor, fontFamily: 'monospace' }}>{row.wallet}</td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: row.gColor, fontFamily: 'monospace' }}>{row.game}</td>
              </tr>
            ))}

            {/* Expected */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td style={{ ...T.td, fontWeight: '800' }}>Expected Change</td>
              <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: recon.expectedWalletChange >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'monospace', fontSize: '13px' }}>
                {recon.expectedWalletChange >= 0 ? '+' : ''}${recon.expectedWalletChange?.toFixed(2)}
              </td>
              <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#7c3aed', fontFamily: 'monospace', fontSize: '13px' }}>
                {recon.expectedGameChange >= 0 ? '+' : ''}{recon.expectedGameChange} pts
              </td>
            </tr>

            {/* Actual */}
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ ...T.td, fontWeight: '800' }}>Actual Change</td>
              <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px', color: walletOk ? '#16a34a' : '#dc2626' }}>
                {recon.actualWalletChange >= 0 ? '+' : ''}${recon.actualWalletChange?.toFixed(2)}
              </td>
              <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px', color: gameOk ? '#16a34a' : '#dc2626' }}>
                {recon.actualGameChange >= 0 ? '+' : ''}{recon.actualGameChange} pts
              </td>
            </tr>

            {/* Discrepancy row */}
            {(!walletOk || !gameOk) && (
              <tr style={{ background: '#fef2f2' }}>
                <td style={{ ...T.td, fontWeight: '800', color: '#991b1b' }}>⚠️ Discrepancy</td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px', color: walletOk ? '#16a34a' : '#dc2626' }}>
                  {walletOk ? '✓ balanced' : `$${Math.abs(wd).toFixed(2)} off`}
                </td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px', color: gameOk ? '#16a34a' : '#dc2626' }}>
                  {gameOk ? '✓ balanced' : `${Math.abs(gd)} pts off`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expenses detail */}
      {(bd.expenses?.length > 0 || bd.takeouts?.length > 0) && (
        <div style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}>
          <div style={{ padding: '8px 14px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontWeight: '700', fontSize: '10.5px', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Expenses & Takeouts Included in Reconciliation
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={T.th}>Type</th>
                <th style={T.th}>Details</th>
                <th style={{ ...T.th, textAlign: 'right' }}>Wallet paid</th>
                <th style={{ ...T.th, textAlign: 'right' }}>Pts added</th>
              </tr>
            </thead>
            <tbody>
              {(bd.expenses ?? []).map(e => (
                <tr key={e.id}>
                  <td style={T.td}><Badge label="Expense" color="#b45309" bg="#fffbeb" /></td>
                  <td style={{ ...T.td, color: '#475569' }}>{e.details}{e.category ? ` · ${e.category.replace('_', ' ')}` : ''}</td>
                  <td style={{ ...T.td, textAlign: 'right', color: '#dc2626', fontWeight: '600' }}>
                    {(e.paymentMade ?? 0) > 0 ? `-$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...T.td, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>
                    {(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—'}
                  </td>
                </tr>
              ))}
              {(bd.takeouts ?? []).map(t => (
                <tr key={t.id}>
                  <td style={T.td}><Badge label="Takeout" color="#991b1b" bg="#fff1f2" /></td>
                  <td style={{ ...T.td, color: '#475569' }}>{t.takenBy} · {t.method}</td>
                  <td style={{ ...T.td, textAlign: 'right', color: '#dc2626', fontWeight: '600' }}>
                    {t.walletId ? `-$${parseFloat(t.amount).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8' }}>—</td>
                </tr>
              ))}
              <tr style={{ background: '#fffbeb' }}>
                <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#b45309' }}>Totals</td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                  -{fmt$(bd.expenseWalletPaid + bd.takeoutWalletPaid)}
                </td>
                <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                  {bd.pointsReloaded > 0 ? `+${Math.round(bd.pointsReloaded)} pts` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pending cashout warning */}
      {bd.pendingCashouts > 0 && (
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '11px', color: '#92400e' }}>
          ⏳ <strong>${bd.pendingCashouts?.toFixed(2)} in pending cashouts</strong> are NOT yet deducted
          from wallet or game stock — they will be counted when approved on the Transactions page.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN CHECKOUT MODAL
// ═══════════════════════════════════════════════════════════════
const CheckoutModal = ({ shift, startSnapshot, onSubmit, onCancel }) => {

  // ── 1. Live reconciliation hook — SINGLE SOURCE OF TRUTH ─────────────────
  const { data: recon, loading: reconLoading, refetch } = useLiveReconciliation(shift?.id);

  // ── 2. Local state — only for data NOT in the hook ────────────────────────
  const [shiftTxns, setShiftTxns] = useState([]);
  const [crossStoreData, setCrossStoreData] = useState(null);
  const [txnLoading, setTxnLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [fb, setFb] = useState({
    effort: 7, effortReason: '', improvements: '', workSummary: '',
    issuesEncountered: '', shiftWorkDescription: '',
    recommendationsLastShift: '', recommendationsOverall: '',
  });
  const setFbField = useCallback((f, v) => setFb(p => ({ ...p, [f]: v })), []);

  // ── 3. All financial values derived from recon ────────────────────────────
  const bd = recon?.breakdown ?? {};

  // Line items
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

  // Reconciliation results
  const expectedWalletChange = recon?.expectedWalletChange ?? 0;
  const expectedGameChange = recon?.expectedGameChange ?? 0;
  const walletChange = recon?.actualWalletChange ?? 0;
  const gameChange = recon?.actualGameChange ?? 0;
  const walletDiscrepancy = recon?.walletDiscrepancy ?? null;
  const gameDiscrepancy = recon?.gameDiscrepancy ?? null;
  const isBalanced = recon?.isBalanced ?? null;
  const hasStartSnapshot = recon?.hasStartSnapshot ?? false;

  // Resource lists
  const endWallets = recon?.wallets ?? [];
  const endGames = recon?.games ?? [];
  const endTotalW = recon?.endWalletTotal ?? 0;
  const endTotalG = recon?.endGameTotal ?? 0;
  const startTotalW = recon?.startWalletTotal ?? startSnapshot?.totalWallet ?? 0;
  const startTotalG = recon?.startGameTotal ?? startSnapshot?.totalGames ?? 0;

  // Expenses & takeouts from hook (no separate fetch needed)
  const shiftExpenses = bd.expenses ?? [];
  const shiftTakeouts = bd.takeouts ?? [];
  const totalShiftExpenses = shiftExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalShiftTakeouts = shiftTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  // ── 4. Mid-shift wallet / game detection ─────────────────────────────────
  const startWalletIds = new Set((startSnapshot?.walletSnapshot ?? []).map(w => String(w.id)));
  const startGameIds = new Set((startSnapshot?.gameSnapshot ?? []).map(g => String(g.id)));
  const newWalletsDuringShift = endWallets.filter(w => !startWalletIds.has(String(w.id)));
  const newGamesDuringShift = endGames.filter(g => !startGameIds.has(String(g.id)));

  // ── 5. Fetch ONLY transactions + cross-store (everything else from hook) ──
  useEffect(() => {
    if (!shift) { setTxnLoading(false); return; }
    const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
    const toDate = encodeURIComponent(new Date().toISOString());

    Promise.all([
      fj(`/transactions?limit=500&fromDate=${fromDate}`),
      fj(`/shifts/shared-resource-usage?fromDate=${fromDate}&toDate=${toDate}`).catch(() => ({ data: null })),
    ])
      .then(([txns, crossStore]) => {
        const start = new Date(shift.startTime);
        setShiftTxns(
          (txns.data ?? []).filter(t => t.createdAtISO ? new Date(t.createdAtISO) >= start : true)
        );
        setCrossStoreData(crossStore?.data ?? null);
      })
      .catch(err => console.error('CheckoutModal txn fetch:', err))
      .finally(() => setTxnLoading(false));
  }, [shift]);

  // SSE: re-fetch cross-store on shared resource changes
  useEffect(() => {
    if (!shift?.startTime) return;
    const token = localStorage.getItem('authToken');
    const es = new EventSource(`${API_BASE}/tasks/events?token=${encodeURIComponent(token || '')}`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (['shared_game_updated', 'shared_wallet_updated'].includes(type)) {
          const from = encodeURIComponent(new Date(shift.startTime).toISOString());
          const to = encodeURIComponent(new Date().toISOString());
          fj(`/shifts/shared-resource-usage?fromDate=${from}&toDate=${to}`)
            .then(r => setCrossStoreData(r?.data ?? null)).catch(() => { });
        }
      } catch (_) { }
    };
    return () => es.close();
  }, [shift?.startTime]);

  const loading = txnLoading || (reconLoading && !recon);

  // ── Cross-store helpers ───────────────────────────────────────────────────
  const myStoreId = getStoreId();
  const crossGameInfo = {};
  const crossWalletInfo = {};
  let totalCrossGamePts = 0;
  let totalCrossWalletAmt = 0;

  if (crossStoreData) {
    crossStoreData.games?.forEach(g => {
      const myPts = g.usageByStore[String(myStoreId)]?.netPtsDeducted ?? 0;
      const otherPts = g.totalDeducted - myPts;
      totalCrossGamePts += otherPts;
      crossGameInfo[g.gameId] = { ...g, myPts, otherPts };
    });
    crossStoreData.wallets?.forEach(w => {
      const myChange = w.usageByStore[String(myStoreId)]?.netWalletChange ?? 0;
      const otherChange = w.totalNetChange - myChange;
      totalCrossWalletAmt += otherChange;
      crossWalletInfo[w.walletId] = { ...w, myChange, otherChange };
    });
  }

  // Adjusted discrepancies
  const walletDisc = hasStartSnapshot ? r2(walletChange - expectedWalletChange) : 0;
  const gameDisc = hasStartSnapshot ? Math.round(gameChange - expectedGameChange) : 0;
  const crossAdjGameDisc = Math.round(gameDisc + totalCrossGamePts);
  const crossAdjWalletDisc = r2(walletDisc - totalCrossWalletAmt);
  const crossAdjGameBal = Math.abs(crossAdjGameDisc) < 2;
  const crossAdjWalletBal = Math.abs(crossAdjWalletDisc) < 0.02;
  const walletBal = Math.abs(walletDisc) < 0.02;
  const gameBal = Math.abs(gameDisc) < 2;
  const balanced = hasStartSnapshot ? (walletBal && gameBal) : null;
  const crossAdjBalanced = hasStartSnapshot ? (crossAdjWalletBal && crossAdjGameBal) : null;

  // Snapshot rows
  const startWalletSnap = startSnapshot?.walletSnapshot ?? [];
  const startGameSnap = startSnapshot?.gameSnapshot ?? [];

  const walletRows = [
    ...endWallets.map(w => {
      const s = startWalletSnap.find(sw => sw.id === w.id);
      return { ...w, startBal: r2(s?.balance ?? 0), endBal: r2(w.balance ?? 0), isNew: !s };
    }),
    ...startWalletSnap.filter(sw => !endWallets.find(w => w.id === sw.id))
      .map(sw => ({ ...sw, startBal: r2(sw.balance), endBal: 0, isRemoved: true })),
  ];

  const gameRows = [
    ...endGames.map(g => {
      const s = startGameSnap.find(sg => sg.id === g.id);
      return { ...g, startPts: Math.round(s?.pointStock ?? 0), endPts: Math.round(g.pointStock ?? 0), isNew: !s };
    }),
    ...startGameSnap.filter(sg => !endGames.find(g => g.id === sg.id))
      .map(sg => ({ ...sg, startPts: Math.round(sg.pointStock), endPts: 0, isRemoved: true })),
  ];

  // Submit handler
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        endSnapshot: {
          walletSnapshot: endWallets.map(w => ({ id: w.id, name: w.name, method: w.method, balance: r2(w.balance ?? 0) })),
          gameSnapshot: endGames.map(g => ({ id: g.id, name: g.name, pointStock: Math.round(g.pointStock ?? 0) })),
          totalWallet: endTotalW, totalGames: endTotalG,
          walletChange, gameChange, netProfit, deposits, cashouts, bonuses,
          depositFees, cashoutFees,
          expenseWalletPaid, takeoutWalletPaid, pointsReloaded,
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

  const taStyle = (req, val) => ({
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
        placeholder={placeholder} rows={rows} style={taStyle(true, fb[field])} />
    </div>
  );

  const isBonus = t => t.type !== 'Deposit' && t.type !== 'Cashout';

  // ── RENDER ────────────────────────────────────────────────────────────────
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
              {/* ── Mid-shift change banners ──────────────────────────────── */}
              {newWalletsDuringShift.length > 0 && (
                <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '8px', fontSize: '12px', color: '#1e40af' }}>
                  <strong>🆕 New wallets added mid-shift:</strong>{' '}
                  {newWalletsDuringShift.map(w => `${w.method} — ${w.name} ($${r2(w.balance).toFixed(2)})`).join(', ')}.
                  Their opening balances were not captured — included in current totals only.
                </div>
              )}
              {newGamesDuringShift.length > 0 && (
                <div style={{ padding: '10px 14px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed', borderRadius: '8px', fontSize: '12px', color: '#4c1d95' }}>
                  <strong>🆕 New games added mid-shift:</strong>{' '}
                  {newGamesDuringShift.map(g => `${g.name} (${Math.round(g.pointStock)} pts)`).join(', ')}.
                  No start stock captured — included in end totals only.
                </div>
              )}

              {/* ── Cross-store notice ────────────────────────────────────── */}
              {crossStoreData && (Object.keys(crossGameInfo).length > 0 || Object.keys(crossWalletInfo).length > 0) && (
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

              {/* ── KPI cards ────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '9px' }}>
                {[
                  { label: 'Deposits', val: `+$${deposits.toFixed(2)}`, c: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Cashouts', val: `-$${cashouts.toFixed(2)}`, c: '#dc2626', bg: '#fef2f2' },
                  { label: 'Bonuses', val: `-$${bonuses.toFixed(2)}`, c: '#d97706', bg: '#fffbeb', hide: bonuses < 0.001 },
                  { label: 'Net Profit D−C', val: `${netProfit >= 0 ? '+' : ''}$${Math.abs(netProfit).toFixed(2)}`, c: netProfit >= 0 ? '#16a34a' : '#dc2626', bg: netProfit >= 0 ? '#f0fdf4' : '#fef2f2' },
                  { label: 'Fees', val: `-$${totalFees.toFixed(2)}`, c: '#f59e0b', bg: '#fffbeb', hide: !hasFees },
                  { label: 'Expense paid', val: `-$${expenseWalletPaid.toFixed(2)}`, c: '#b45309', bg: '#fffbeb', hide: expenseWalletPaid < 0.001 },
                  { label: 'Takeouts', val: `-$${takeoutWalletPaid.toFixed(2)}`, c: '#991b1b', bg: '#fff1f2', hide: takeoutWalletPaid < 0.001 },
                  { label: 'Pts reloaded', val: `+${Math.round(pointsReloaded)} pts`, c: '#7c3aed', bg: '#f5f3ff', hide: pointsReloaded < 0.001 },
                  { label: 'Pending CO', val: `$${pendingCashouts.toFixed(2)}`, c: '#b45309', bg: '#fffbeb', hide: pendingCashouts < 0.001 },
                ].filter(k => !k.hide).map(({ label, val, c, bg }) => (
                  <div key={label} style={{ padding: '11px', background: bg, borderRadius: '9px', textAlign: 'center', border: `1px solid ${bg === '#fff' ? '#e2e8f0' : 'transparent'}` }}>
                    <p style={{ margin: '0 0 3px', fontSize: '9.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: c }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* ── Wallet table ─────────────────────────────────────────── */}
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
                              </td>
                              {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>{w.isNew ? 'N/A' : `$${w.startBal.toFixed(2)}`}</td>}
                              <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>${w.endBal.toFixed(2)}</td>
                              {hasStartSnapshot && (
                                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: w.isNew ? '#94a3b8' : clr$(delta) }}>
                                  {w.isNew ? 'N/A' : `${delta >= 0 ? '+' : ''}$${Math.abs(delta).toFixed(2)}`}
                                  {ci && !w.isNew && (
                                    <div style={{ fontSize: '10px', color: '#1d4ed8' }}>
                                      this: {ci.myChange >= 0 ? '+' : ''}${ci.myChange.toFixed(2)} · other: {ci.otherChange >= 0 ? '+' : ''}${ci.otherChange.toFixed(2)}
                                    </div>
                                  )}
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

              {/* ── Game table ───────────────────────────────────────────── */}
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
                            <tr style={{ background: g.isNew ? '#f5f3ff' : g.isRemoved ? '#fef2f2' : g.isShared ? '#faf5ff' : 'transparent' }}>
                              <td style={T.td}>
                                <b>{g.name}</b>
                                {g.isShared && <Badge label="shared" color="#7c3aed" bg="#ede9fe" />}
                                {g.isNew && <Badge label="new mid-shift" color="#4c1d95" bg="#ede9fe" />}
                                {g.isRemoved && <Badge label="removed" color="#991b1b" bg="#fee2e2" />}
                              </td>
                              {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>{g.isNew ? 'N/A' : `${g.startPts} pts`}</td>}
                              <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{g.endPts} pts</td>
                              {hasStartSnapshot && (
                                <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: g.isNew ? '#94a3b8' : clrPts(delta) }}>
                                  {g.isNew ? 'N/A' : `${delta >= 0 ? '+' : ''}${delta} pts`}
                                  {ci && ci.otherPts > 0 && !g.isNew && (
                                    <div style={{ fontSize: '10px', color: '#7c3aed' }}>
                                      this: {ci.myPts} pts · other: {Math.round(ci.otherPts)} pts
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      <tr style={{ background: '#f8fafc' }}>
                        <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                        {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{startTotalG} pts</td>}
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>{endTotalG} pts</td>
                        {hasStartSnapshot && (
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(gameChange) }}>
                            {gameChange >= 0 ? '+' : ''}{gameChange} pts
                            {!gameBal && (
                              <div style={{ fontSize: '10.5px', fontWeight: '600' }}>
                                {crossAdjGameBal && endGames.some(g => g.isShared)
                                  ? <span style={{ color: '#16a34a', display: 'block' }}>✓ cross-store explains it</span>
                                  : <span style={{ color: '#dc2626' }}> ⚠️ {crossAdjGameDisc >= 0 ? '+' : ''}{crossAdjGameDisc} pts real gap</span>}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Full discrepancy panel ───────────────────────────────── */}
              <DiscrepancyPanel recon={recon} />
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
              {/* ── Expenses & Takeouts Tab — fully implemented ─────────── */}
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

              {/* Expenses table */}
              {shiftExpenses.length > 0 ? (
                <div style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    📋 Expenses Recorded This Shift
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Details', 'Category', 'Amount', 'Wallet paid', 'Pts added'].map(h => (
                          <th key={h} style={T.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shiftExpenses.map((e, i) => (
                        <tr key={e.id ?? i}>
                          <td style={T.td}>{e.details}</td>
                          <td style={T.td}><Badge label={e.category?.replace('_', ' ') ?? '—'} color="#b45309" bg="#fffbeb" /></td>
                          <td style={{ ...T.td, fontWeight: '600' }}>${(e.amount ?? 0).toFixed(2)}</td>
                          <td style={{ ...T.td, color: '#dc2626', fontWeight: '600' }}>
                            {(e.paymentMade ?? 0) > 0 ? `-$${parseFloat(e.paymentMade).toFixed(2)}` : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ ...T.td, color: '#16a34a', fontWeight: '600' }}>
                            {(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#fffbeb' }}>
                        <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#b45309' }}>Totals</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#b45309' }}>${totalShiftExpenses.toFixed(2)}</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#dc2626' }}>
                          {expenseWalletPaid > 0 ? `-$${expenseWalletPaid.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#16a34a' }}>
                          {pointsReloaded > 0 ? `+${Math.round(pointsReloaded)} pts` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', background: '#fffbeb', borderRadius: '10px', border: '1px dashed #fde68a', fontSize: '13px' }}>
                  No expenses recorded during this shift
                </div>
              )}

              {/* Takeouts table */}
              {shiftTakeouts.length > 0 ? (
                <div style={{ border: '1px solid #fecdd3', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', fontSize: '11px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    💸 Profit Takeouts This Shift
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Taken By', 'Method', 'Amount', 'Wallet used', 'Notes'].map(h => (
                          <th key={h} style={T.th}>{h}</th>
                        ))}
                      </tr>
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
                        <td colSpan={2} style={{ ...T.td, fontSize: '11px', color: '#64748b' }}>
                          Wallet-deducted: −${takeoutWalletPaid.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', background: '#fff1f2', borderRadius: '10px', border: '1px dashed #fecdd3', fontSize: '13px' }}>
                  No profit takeouts recorded during this shift
                </div>
              )}

              {/* Cross-store notice for expenses/takeouts */}
              {(crossStoreData?.games?.length > 0 || crossStoreData?.wallets?.length > 0) && (
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
              <button onClick={() => setActiveTab(activeTab === 'reconciliation' ? 'transactions' : activeTab === 'transactions' ? 'expenses' : 'feedback')}
                style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ padding: '10px 22px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer', opacity: !canSubmit || submitting ? .6 : 1, display: 'flex', alignItems: 'center', gap: '7px' }}>
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
function printShiftPDF(shift) {
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' }) : '—';
  const fmtMoney = v => `$${Math.abs(r2(v ?? 0)).toFixed(2)}`;

  let startSnapshot = null, endSnapshot = null, effortReason = null, improvements = null;
  if (shift.checkin?.balanceNote) { try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { } }
  if (shift.checkin?.additionalNotes) {
    try {
      const p = JSON.parse(shift.checkin.additionalNotes);
      endSnapshot = p.endSnapshot ?? null;
      effortReason = p.effortReason ?? null;
      improvements = p.improvements ?? null;
    } catch (_) { }
  }

  const es = endSnapshot;
  const deposits = r2(es?.deposits ?? 0);
  const cashouts = r2(es?.cashouts ?? 0);
  const bonuses = r2(es?.bonuses ?? 0);
  const netProfit = r2(deposits - cashouts);
  const walletChange = r2(es?.walletChange ?? 0);
  const gameChange = Math.round(es?.gameChange ?? 0);
  const depositFees = r2(es?.depositFees ?? 0);
  const cashoutFees = r2(es?.cashoutFees ?? 0);
  // const expectedWallet = r2((deposits - depositFees) - (cashouts + cashoutFees));
  // const expectedGame = Math.round(-(deposits + bonuses - cashouts));

  // const walletDisc = r2((es?.walletDiscrepancy) ?? r2(walletChange - expectedWallet));
  // const gameDisc = Math.round((es?.gameDiscrepancy) ?? (gameChange - expectedGame));

  // Wallet formula: D − CO − fees
  const expectedWallet = r2(deposits - cashouts - depositFees - cashoutFees);
  // Game formula:   expected deduction = D + fees + bonus − CO
  const expectedGameDeductionPdf = r2(deposits + depositFees + cashoutFees + bonuses - cashouts);
  const expectedGame = Math.round(-expectedGameDeductionPdf);
  const walletDisc = r2((es?.walletDiscrepancy) ?? r2(walletChange - expectedWallet));
  const gameDisc = Math.round((es?.gameDiscrepancy) ?? (gameChange - expectedGame));
  // Detect shared games from the end snapshot (if available)
  const endGameSnap = es?.gameSnapshot ?? [];
  // We flag shared games via a "shared" property if it was stored; otherwise show a generic note
  const sharedGameNoteForPdf = endGameSnap.some(g => g.isShared)
    ? 'Note: some games are shared across stores — game discrepancies may include cross-store activity.'
    : '';
  const walletOk = Math.abs(walletDisc) < 0.02;
  const gameOk = Math.abs(gameDisc) < 2;
  const allOk = walletOk && gameOk;

  const startWalletRows = (startSnapshot?.walletSnapshot ?? []).map(w => {
    const ew = (endSnapshot?.walletSnapshot ?? []).find(e => e.id === w.id);
    const δ = r2((ew?.balance ?? 0) - w.balance);
    return `<tr><td><b>${w.method}</b> — ${w.name}</td><td class="tr">${fmtMoney(w.balance)}</td><td class="tr b">${fmtMoney(ew?.balance ?? 0)}</td><td class="tr b" style="color:${δ >= 0 ? '#16a34a' : '#dc2626'}">${δ >= 0 ? '+' : '−'}${fmtMoney(δ)}</td></tr>`;
  }).join('');

  const gameRows = (startSnapshot?.gameSnapshot ?? []).map(g => {
    const eg = (endSnapshot?.gameSnapshot ?? []).find(e => e.id === g.id);
    const δ = Math.round((eg?.pointStock ?? 0) - g.pointStock);
    return `<tr><td><b>${g.name}</b></td><td class="tr">${Math.round(g.pointStock)} pts</td><td class="tr b">${Math.round(eg?.pointStock ?? 0)} pts</td><td class="tr b" style="color:${δ <= 0 ? '#16a34a' : '#dc2626'}">${δ >= 0 ? '+' : ''}${δ} pts</td></tr>`;
  }).join('');

  const effort = shift.checkin?.effortRating ?? shift.stats?.effortRating;
  const effortColor = !effort ? '#94a3b8' : effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Shift Report — ${fmtDate(shift.startTime)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;background:#fff;padding:28px}
h1{font-size:20px;font-weight:800;margin-bottom:3px}
h2{font-size:12px;font-weight:700;margin:22px 0 8px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.4px}
.meta{font-size:11px;color:#64748b;margin-bottom:18px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px}
.val{font-size:17px;font-weight:800}.lbl{font-size:9px;color:#64748b;margin-top:1px;text-transform:uppercase;letter-spacing:0.4px}
.g{color:#16a34a}.r{color:#dc2626}.a{color:#c2410c}.p{color:#7c3aed}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #e2e8f0}
td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
.tr{text-align:right}.b{font-weight:700}
.section{border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;margin-bottom:14px}
.section-hdr{padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.4px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.banner{padding:10px 14px;border-radius:7px;border:1px solid #e2e8f0;margin-bottom:14px;font-size:11px}
button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
@media print{button{display:none}body{padding:16px}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
<div>
  <h1>Shift Report — ${fmtDate(shift.startTime)}</h1>
  <p class="meta">${fmtTime(shift.startTime)} – ${fmtTime(shift.endTime)} · ${shift.duration ?? '—'} min · Generated ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}</p>
</div>
<button onclick="window.print()">Print / Save PDF</button>
</div>

<h2>Activity Summary</h2>
<div class="grid4">
  <div class="box"><div class="val g">+${fmtMoney(deposits)}</div><div class="lbl">Deposits</div></div>
  <div class="box"><div class="val r">−${fmtMoney(cashouts)}</div><div class="lbl">Cashouts</div></div>
  <div class="box"><div class="val a">−${fmtMoney(bonuses)}</div><div class="lbl">Bonuses</div></div>
  <div class="box"><div class="val ${netProfit >= 0 ? 'g' : 'r'}">${netProfit >= 0 ? '+' : ''}${fmtMoney(netProfit)}</div><div class="lbl">Net Profit (D−C)</div></div>
  ${(depositFees + cashoutFees) > 0 ? `<div class="box"><div class="val a">−${fmtMoney(depositFees + cashoutFees)}</div><div class="lbl">Total Fees</div></div>` : ''}
  ${effort ? `<div class="box"><div class="val" style="color:${effortColor}">${effort}/10</div><div class="lbl">Effort Rating</div></div>` : ''}
</div>

${startWalletRows ? `<h2>Cash Flow Audit</h2>
<div class="section">
  <table>
    <thead><tr><th>Method / Account</th><th class="tr">Start</th><th class="tr">End</th><th class="tr">Change</th></tr></thead>
    <tbody>
      ${startWalletRows}
      <tr style="background:#f8fafc"><td><b>Total</b></td><td class="tr b">${fmtMoney(startSnapshot?.totalWallet ?? 0)}</td><td class="tr b">${fmtMoney(endSnapshot?.totalWallet ?? 0)}</td><td class="tr b" style="color:${walletChange >= 0 ? '#16a34a' : '#dc2626'}">${walletChange >= 0 ? '+' : '−'}${fmtMoney(walletChange)}</td></tr>
    </tbody>
  </table>
</div>` : ''}

${gameRows ? `<h2>Game Point Audit</h2>
<div class="section">
  <table>
    <thead><tr><th>Game</th><th class="tr">Start (pts)</th><th class="tr">End (pts)</th><th class="tr">Change</th></tr></thead>
    <tbody>
      ${gameRows}
      <tr style="background:#f8fafc"><td><b>Total</b></td><td class="tr b">${Math.round(startSnapshot?.totalGames ?? 0)} pts</td><td class="tr b">${Math.round(endSnapshot?.totalGames ?? 0)} pts</td><td class="tr b" style="color:${gameChange <= 0 ? '#16a34a' : '#dc2626'}">${gameChange >= 0 ? '+' : ''}${gameChange} pts</td></tr>
    </tbody>
  </table>
</div>` : ''}

${es ? `<h2>Audit Verification</h2>
<div class="banner" style="background:${allOk ? '#f0fdf4' : '#fef2f2'};border-color:${allOk ? '#86efac' : '#fca5a5'};border-left:4px solid ${allOk ? '#16a34a' : '#dc2626'}">
  <b style="color:${allOk ? '#16a34a' : '#dc2626'}">${allOk ? '✓ Fully Balanced' : `⚠ Discrepancy: ${!walletOk ? `Cash $${Math.abs(walletDisc).toFixed(2)}` : ''}${!walletOk && !gameOk ? ' | ' : ''}${!gameOk ? `Points ${Math.abs(gameDisc)} pts` : ''}`}</b><br>
    <span style="color:#475569;font-size:11px">
      Wallet expected: D ${fmtMoney(deposits)} − CO ${fmtMoney(cashouts)} − fees ${fmtMoney(depositFees + cashoutFees)} = ${fmtMoney(expectedWallet)} · Actual Δ ${fmtMoney(walletChange)}<br>
      Game expected removal: D+fees+bonus−CO = ${expectedGameDeductionPdf.toFixed(0)} pts · Actual Δ ${gameChange} pts
      ${sharedGameNoteForPdf ? `<br><em style="color:#7c3aed">${sharedGameNoteForPdf}</em>` : ''}
    </span>
</div>` : ''}

${effortReason || improvements || shift.checkin?.workSummary ? `<h2>Member Feedback</h2>
<div class="section">
  <table>
    ${effortReason ? `<tr><td style="width:30%;font-weight:700;color:#64748b">Effort Reason</td><td>${effortReason}</td></tr>` : ''}
    ${shift.checkin?.workSummary ? `<tr><td style="width:30%;font-weight:700;color:#64748b">Work Summary</td><td>${shift.checkin.workSummary}</td></tr>` : ''}
    ${shift.checkin?.issuesEncountered ? `<tr><td style="width:30%;font-weight:700;color:#64748b">Issues Encountered</td><td>${shift.checkin.issuesEncountered}</td></tr>` : ''}
    ${improvements ? `<tr><td style="width:30%;font-weight:700;color:#64748b">Could Do Better</td><td>${improvements}</td></tr>` : ''}
  </table>
</div>` : ''}

<p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:10px">
  Confidential · Shift Report · Generated ${new Date().toISOString()}
</p>
</body></html>`);
  win.document.close();
}

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
      {showCheckin && <CheckinModal onConfirm={handleCheckinConfirm} onCancel={() => setShowCheckin(false)} />}
      {showCheckout && activeShift && (
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

        {success && (
          <div style={{ padding: '11px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle size={14} style={{ flexShrink: 0 }} /> {success}
          </div>
        )}
        {error && (
          <div style={{ padding: '11px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ── Shift Control Card ── */}
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

        {/* ══════════════════════════════════════════════════════
            ACTIVE TASKS — Enhanced with filters (like MemberDashboard)
        ══════════════════════════════════════════════════════ */}
        {tasks.length > 0 && (
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
                    {isAdmin && <th style={T.TH}>Member</th>}
                    <th style={T.TH}>Date</th>
                    <th style={T.TH}>Start → End</th>
                    <th style={T.TH}>Duration</th>
                    <th style={{ ...T.TH, textAlign: 'right' }}>Deposits</th>
                    <th style={{ ...T.TH, textAlign: 'right' }}>Cashouts</th>
                    <th style={{ ...T.TH, textAlign: 'right' }}>Net Profit</th>
                    <th style={{ ...T.TH, textAlign: 'right' }}>Bonuses</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Txns</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Effort</th>
                    <th style={T.TH}>Rating</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>Balanced</th>
                    <th style={{ ...T.TH, textAlign: 'center' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {completedShifts.map(shift => {
                    const effort = shift.checkin?.effortRating ?? shift.stats?.effortRating ?? null;
                    let balanced = null, endSnap = null;
                    if (shift.checkin?.additionalNotes) {
                      try {
                        const p = JSON.parse(shift.checkin.additionalNotes);
                        endSnap = p.endSnapshot ?? null;
                        const wd = r2(endSnap?.walletDiscrepancy ?? 0);
                        const gd = Math.round(endSnap?.gameDiscrepancy ?? 0);
                        balanced = endSnap ? (Math.abs(wd) < 0.02 && Math.abs(gd) < 2) : null;
                      } catch (_) { }
                    }
                    const s = shift.stats || {};
                    const netProfit = r2((s.totalDeposits ?? 0) - (s.totalCashouts ?? 0));

                    return (
                      <tr key={shift.id}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {['ADMIN', 'SUPER_ADMIN'].includes(usr?.role) && (
                          <td style={T.TD}>
                            <span style={{
                              fontSize: '11px', fontWeight: '700', color: '#475569',
                              background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px'
                            }}>
                              {shift.teamRole}
                            </span>
                          </td>
                        )}
                        <td style={{ ...T.TD, fontWeight: '600' }}>{fmtDate(shift.startTime)}</td>
                        <td style={{ ...T.TD, fontSize: '12px', color: '#475569' }}>
                          {fmtTime(shift.startTime)} → {fmtTime(shift.endTime)}
                        </td>
                        <td style={T.TD}>
                          <span style={{ display: 'inline-block', padding: '3px 9px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: '500', color: '#475569' }}>
                            {shift.duration != null ? `${shift.duration} min` : '—'}
                          </span>
                        </td>
                        <td style={{ ...T.TD, textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                          {s.totalDeposits != null ? `$${r2(s.totalDeposits).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                          {s.totalCashouts != null ? `$${r2(s.totalCashouts).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'right', fontWeight: '700', color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                          {s.totalDeposits != null ? `${netProfit >= 0 ? '+' : ''}$${Math.abs(netProfit).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'right', color: '#c2410c' }}>
                          {s.totalBonuses != null ? `$${r2(s.totalBonuses).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'center', color: '#475569' }}>
                          {s.transactionCount ?? '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {effort != null ? (
                            <span style={{ fontWeight: '700', color: effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626' }}>
                              {effort}/10
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {/* ✅ was shift.checkin?.rating — rating lives at top level from enrichShift */}
                          {shift.rating ? (
                            <span style={{ display: 'inline-flex', gap: '1px' }}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} style={{ color: n <= Math.round(shift.rating.overallRating) ? '#f59e0b' : '#e2e8f0', fontSize: '14px' }}>★</span>
                              ))}
                            </span>
                          ) : (
                            usr?.role === 'ADMIN' || usr?.role === 'SUPER_ADMIN' ? (
                              <button
                                onClick={() => setRatingModal({ shift, memberName: shift.memberName || shift.teamRole })}
                                style={{ padding: '4px 10px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                ⭐ Rate
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Not rated</span>
                            )
                          )}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          {balanced === null
                            ? <span style={{ color: '#94a3b8', fontSize: '12px' }}>N/A</span>
                            : balanced
                              ? <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>
                              : <span style={{ color: '#dc2626', fontWeight: '700' }}>⚠️</span>}
                        </td>
                        <td style={{ ...T.TD, textAlign: 'center' }}>
                          <button
                            onClick={() => printShiftPDF(shift)}
                            title="Download PDF"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                          >
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
                      {/* <td style={{ ...T.TD, fontWeight: '700', color: '#374151' }} colSpan={3}>
                        Totals ({completedShifts.length} shifts · {totDur} min)
                      </td> */}
                      <td style={{ ...T.TD, fontWeight: '700', color: '#374151' }} colSpan={isAdmin ? 4 : 3}>
                        Totals ({completedShifts.length} shifts · {totDur} min)
                      </td>
                      <td style={{ ...T.TD, textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>${totDep.toFixed(2)}</td>
                      <td style={{ ...T.TD, textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>${totCO.toFixed(2)}</td>
                      <td style={{ ...T.TD, textAlign: 'right', fontWeight: '800', color: totProf >= 0 ? '#16a34a' : '#dc2626' }}>{totProf >= 0 ? '+' : ''}${Math.abs(totProf).toFixed(2)}</td>
                      <td style={{ ...T.TD, textAlign: 'right', fontWeight: '800', color: '#c2410c' }}>${totBon.toFixed(2)}</td>
                      <td colSpan={4} style={T.TD}></td>

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
