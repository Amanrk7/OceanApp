// pages/ShiftsPage.jsx — Fixed Version
// Fixes:
//  ✅ Wallet table: only live wallets shown in modals
//  ✅ Textarea typing bug: RequiredTextarea converted to render fn (not component)
//  ✅ Discrepancy: wallet $ and game pts kept separate, rounding fixed
//  ✅ Profit formula: Deposits - Cashouts (business); wallet check includes fees
//  ✅ Active tasks: search + filter UI like MemberDashboard
//  ✅ Past shifts: detailed table + PDF download
//  ✅ No offline wallets in any modal

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// const fj = async (path, opts = {}) => {
//   const token = localStorage.getItem('authToken');
//   const r = await fetch(`${API_BASE}${path}`, {
//     credentials: 'include',
//     cache: 'no-store',
//     ...opts,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...(opts.headers ?? {}),
//     },
//   });
//   if (!r.ok) {
//     const b = await r.json().catch(() => ({}));
//     throw new Error(b.error ?? r.statusText);
//   }
//   return r.json();
// };

// ShiftsPage.jsx — replace the fj helper at the top
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
// CHECKIN MODAL
// ═══════════════════════════════════════════════════════════════
// const CheckinModal = ({ onConfirm, onCancel }) => {
//   const [wallets, setWallets] = useState([]);
//   const [games, setGames] = useState([]);
//   const [tasks, setTasks] = useState([]);
//   const [notes, setNotes] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [confirming, setConfirming] = useState(false);
//   const [walletInputs, setWalletInputs] = useState({});
//   const [gameInputs, setGameInputs] = useState({});

//   useEffect(() => {
//     const token = localStorage.getItem('authToken');
//     if (!token) { setLoading(false); return; }
//     Promise.all([fj('/wallets'), fj('/games'), fj('/tasks?myTasks=true')])
//       .then(([w, g, t]) => {
//         // ✅ Only show LIVE wallets
//         const flatWallets = (w.data ?? [])
//           .flatMap(grp => grp.subAccounts ?? [])
//           .filter(w => w.isLive !== false);
//         const gameList = g.data ?? [];
//         setWallets(flatWallets);
//         setGames(gameList);
//         setTasks((t.data ?? []).filter(task => task.status !== 'COMPLETED'));

//         const wi = {};
//         flatWallets.forEach(w => { wi[w.id] = (w.balance ?? 0).toFixed(2); });
//         setWalletInputs(wi);

//         const gi = {};
//         gameList.forEach(g => { gi[g.id] = (g.pointStock ?? 0).toFixed(0); });
//         setGameInputs(gi);
//       })
//       .catch(err => console.error('CheckinModal fetch:', err))
//       .finally(() => setLoading(false));
//   }, []);

//   const totalWallet = r2(wallets.reduce((s, w) => s + (parseFloat(walletInputs[w.id]) || 0), 0));
//   const totalGames = Math.round(games.reduce((s, g) => s + (parseFloat(gameInputs[g.id]) || 0), 0));

//   const walletDiscrepancies = wallets.filter(w => {
//     const entered = parseFloat(walletInputs[w.id]);
//     const fetched = w.balance ?? 0;
//     return !isNaN(entered) && Math.abs(r2(entered - fetched)) > 0.01;
//   });
//   const gameDiscrepancies = games.filter(g => {
//     const entered = parseFloat(gameInputs[g.id]);
//     const fetched = g.pointStock ?? 0;
//     return !isNaN(entered) && Math.abs(Math.round(entered - fetched)) > 0;
//   });
//   const hasDiscrepancies = walletDiscrepancies.length > 0 || gameDiscrepancies.length > 0;

//   const handleConfirm = async () => {
//     setConfirming(true);
//     try {
//       await onConfirm({
//         walletSnapshot: wallets.map(w => ({
//           id: w.id, name: w.name, method: w.method,
//           balance: r2(parseFloat(walletInputs[w.id]) || 0),
//           fetchedBalance: r2(w.balance ?? 0),
//         })),
//         gameSnapshot: games.map(g => ({
//           id: g.id, name: g.name,
//           pointStock: Math.round(parseFloat(gameInputs[g.id]) || 0),
//           fetchedPointStock: Math.round(g.pointStock ?? 0),
//         })),
//         totalWallet, totalGames, notes,
//         capturedAt: new Date().toISOString(),
//         hasDiscrepancies,
//         walletDiscrepancyCount: walletDiscrepancies.length,
//         gameDiscrepancyCount: gameDiscrepancies.length,
//       });
//     } finally { setConfirming(false); }
//   };

//   const inputStyle = (hasDisc) => ({
//     width: '96px', padding: '5px 8px',
//     border: `1.5px solid ${hasDisc ? '#f59e0b' : '#d1d5db'}`,
//     borderRadius: '6px', fontSize: '13px', fontWeight: '700', textAlign: 'right',
//     fontFamily: 'inherit', outline: 'none',
//     background: hasDisc ? '#fffbeb' : '#fff', color: '#0f172a',
//   });

//   return (
//     <div style={T.overlay}>
//       <div style={T.modal}>
//         <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
//           <div>
//             <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🌅 Start-of-Shift Verification</h2>
//             <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
//               Enter the balances you <b>actually see</b> — pre-filled from system, edit if different
//             </p>
//           </div>
//           <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={18} /></button>
//         </div>

//         <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
//           {loading ? (
//             <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
//               <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
//               Loading current balances…
//             </div>
//           ) : <>
//             {hasDiscrepancies && (
//               <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
//                 ⚠️ <b>Discrepancy detected</b> — your entered values differ from the system.
//                 {walletDiscrepancies.length > 0 && <span> Wallet: {walletDiscrepancies.map(w => w.name).join(', ')}.</span>}
//                 {gameDiscrepancies.length > 0 && <span> Games: {gameDiscrepancies.map(g => g.name).join(', ')}.</span>}
//                 {' '}Add a note explaining the difference below.
//               </div>
//             )}

//             {/* ── Wallet Balances ── */}
//             <section>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
//                 <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
//                   <Wallet size={14} color="#2563eb" /> Live Wallet Balances
//                   <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8' }}>(enter actual)</span>
//                 </h3>
//                 <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>${totalWallet.toFixed(2)} total</span>
//               </div>
//               <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr>
//                       <th style={T.th}>Method</th>
//                       <th style={T.th}>Account</th>
//                       <th style={{ ...T.th, textAlign: 'right' }}>System</th>
//                       <th style={{ ...T.th, textAlign: 'right', color: '#0f172a', minWidth: '130px' }}>Actual ✏️</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {wallets.map(w => {
//                       const entered = parseFloat(walletInputs[w.id]);
//                       const fetched = r2(w.balance ?? 0);
//                       const hasDisc = !isNaN(entered) && Math.abs(r2(entered - fetched)) > 0.01;
//                       return (
//                         <tr key={w.id} style={{ background: hasDisc ? '#fefce8' : 'transparent' }}>
//                           <td style={T.td}><b style={{ color: '#475569' }}>{w.method}</b></td>
//                           <td style={T.td}>
//                             {w.name}
//                             {w.identifier && <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '12px' }}>{w.identifier}</span>}
//                           </td>
//                           <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>${fetched.toFixed(2)}</td>
//                           <td style={{ ...T.td, textAlign: 'right' }}>
//                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
//                               <span style={{ fontSize: '12px', color: '#94a3b8' }}>$</span>
//                               <input
//                                 type="number" step="0.01" min="0"
//                                 value={walletInputs[w.id] ?? ''}
//                                 onChange={e => setWalletInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
//                                 style={inputStyle(hasDisc)}
//                               />
//                               {hasDisc && <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700' }} title={`System: $${fetched.toFixed(2)}`}>⚠️</span>}
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                     {wallets.length === 0 && (
//                       <tr><td colSpan={4} style={{ ...T.td, textAlign: 'center', color: '#94a3b8' }}>No live wallets found</td></tr>
//                     )}
//                     <tr style={{ background: '#f0fdf4' }}>
//                       <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#166534' }}>Combined Total</td>
//                       <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>${r2(wallets.reduce((s, w) => s + (w.balance ?? 0), 0)).toFixed(2)}</td>
//                       <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#16a34a', fontSize: '14px' }}>${totalWallet.toFixed(2)}</td>
//                     </tr>
//                   </tbody>
//                 </table>
//               </div>
//             </section>

//             {/* ── Game Points ── */}
//             <section>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
//                 <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
//                   <Gamepad2 size={14} color="#7c3aed" /> Game Points
//                   <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8' }}>(enter actual)</span>
//                 </h3>
//                 <span style={{ fontSize: '16px', fontWeight: '800', color: '#7c3aed' }}>{totalGames} pts total</span>
//               </div>
//               <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr>
//                       <th style={T.th}>Game</th>
//                       <th style={{ ...T.th, textAlign: 'center' }}>Status</th>
//                       <th style={{ ...T.th, textAlign: 'right' }}>System</th>
//                       <th style={{ ...T.th, textAlign: 'right', color: '#0f172a', minWidth: '130px' }}>Actual ✏️</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {games.map(g => {
//                       const entered = parseFloat(gameInputs[g.id]);
//                       const fetched = Math.round(g.pointStock ?? 0);
//                       const hasDisc = !isNaN(entered) && Math.abs(Math.round(entered) - fetched) > 0;
//                       return (
//                         <tr key={g.id} style={{ background: hasDisc ? '#fefce8' : 'transparent' }}>
//                           <td style={T.td}><b>{g.name}</b></td>
//                           <td style={{ ...T.td, textAlign: 'center' }}>
//                             <Badge
//                               label={g.status}
//                               color={g.status === 'HEALTHY' ? '#16a34a' : g.status === 'LOW_STOCK' ? '#854d0e' : '#991b1b'}
//                               bg={g.status === 'HEALTHY' ? '#dcfce7' : g.status === 'LOW_STOCK' ? '#fef9c3' : '#fee2e2'}
//                             />
//                           </td>
//                           <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>{fetched} pts</td>
//                           <td style={{ ...T.td, textAlign: 'right' }}>
//                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
//                               <input
//                                 type="number" step="1" min="0"
//                                 value={gameInputs[g.id] ?? ''}
//                                 onChange={e => setGameInputs(prev => ({ ...prev, [g.id]: e.target.value }))}
//                                 style={inputStyle(hasDisc)}
//                               />
//                               <span style={{ fontSize: '12px', color: '#94a3b8' }}>pts</span>
//                               {hasDisc && <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700' }}>⚠️</span>}
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                     {games.length === 0 && (
//                       <tr><td colSpan={4} style={{ ...T.td, textAlign: 'center', color: '#94a3b8' }}>No games found</td></tr>
//                     )}
//                     <tr style={{ background: '#f5f3ff' }}>
//                       <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#5b21b6' }}>Combined Total</td>
//                       <td style={{ ...T.td, textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>{Math.round(games.reduce((s, g) => s + (g.pointStock ?? 0), 0))} pts</td>
//                       <td style={{ ...T.td, textAlign: 'right', fontWeight: '800', color: '#7c3aed', fontSize: '14px' }}>{totalGames} pts</td>
//                     </tr>
//                   </tbody>
//                 </table>
//               </div>
//             </section>

//             {/* ── Active Tasks ── */}
//             {tasks.length > 0 && (
//               <section>
//                 <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
//                   <ClipboardList size={14} color="#0891b2" /> Your Active Tasks
//                   <span style={{ background: '#0891b2', color: '#fff', borderRadius: '10px', padding: '0 7px', fontSize: '11px' }}>{tasks.length}</span>
//                 </h3>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
//                   {tasks.map(t => (
//                     <div key={t.id} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
//                       <div style={{ flex: 1, minWidth: 0 }}>
//                         <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
//                         <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{t.taskType?.replace(/_/g, ' ')} · {t.priority}</p>
//                         {t.targetValue && (
//                           <div style={{ marginTop: '5px', height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
//                             <div style={{ height: '100%', background: '#2563eb', borderRadius: '2px', width: `${Math.min(100, ((t.currentValue ?? 0) / t.targetValue) * 100)}%` }} />
//                           </div>
//                         )}
//                       </div>
//                       <Badge label={t.status.replace('_', ' ')} color={t.status === 'IN_PROGRESS' ? '#1d4ed8' : '#475569'} bg={t.status === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9'} />
//                     </div>
//                   ))}
//                 </div>
//               </section>
//             )}

//             <section>
//               <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
//                 Opening Notes / Discrepancies
//                 {hasDiscrepancies
//                   ? <span style={{ color: '#dc2626', marginLeft: '6px' }}>* required — explain discrepancies above</span>
//                   : <span style={{ color: '#94a3b8', fontWeight: 400 }}> (optional)</span>}
//               </label>
//               <textarea
//                 value={notes}
//                 onChange={e => setNotes(e.target.value)}
//                 placeholder={hasDiscrepancies ? 'Explain why your entered balances differ…' : 'Note any balance discrepancies before starting…'}
//                 rows={3}
//                 style={taStyle(hasDiscrepancies, notes)}
//               />
//             </section>
//           </>}
//         </div>

//         <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#f8fafc' }}>
//           <div style={{ fontSize: '12px', color: '#94a3b8' }}>
//             Wallet: <b style={{ color: '#16a34a' }}>${totalWallet.toFixed(2)}</b>
//             {' · '}Games: <b style={{ color: '#7c3aed' }}>{totalGames} pts</b>
//             {hasDiscrepancies && <span style={{ color: '#f59e0b', marginLeft: '8px', fontWeight: '600' }}>⚠️ Discrepancies noted</span>}
//           </div>
//           <div style={{ display: 'flex', gap: '10px' }}>
//             <button onClick={onCancel} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
//               Cancel
//             </button>
//             <button
//               onClick={handleConfirm}
//               disabled={loading || confirming || (hasDiscrepancies && !notes.trim())}
//               style={{
//                 padding: '10px 22px', background: '#16a34a', color: '#fff', border: 'none',
//                 borderRadius: '8px', fontWeight: '700', fontSize: '13px',
//                 cursor: (loading || confirming || (hasDiscrepancies && !notes.trim())) ? 'not-allowed' : 'pointer',
//                 opacity: (loading || confirming || (hasDiscrepancies && !notes.trim())) ? .6 : 1,
//                 display: 'flex', alignItems: 'center', gap: '7px',
//               }}
//             >
//               {confirming ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</> : '✓ Confirm & Start Shift'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

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
  const gameDiscrepancies = games.filter(g => {
    const entered = parseFloat(gameInputs[g.id]);
    const fetched = g.pointStock ?? 0;
    return !isNaN(entered) && Math.abs(Math.round(entered - fetched)) > 0;
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
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gamepad2 size={14} color="#7c3aed" /> Game Points
                  {hasSharedGames && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: '8px', marginLeft: '4px' }}>
                      shared games present
                    </span>
                  )}
                </h3>
                {hasStartSnapshot && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Expected Δ: <b style={{ color: '#7c3aed' }}>{expectedGameChange >= 0 ? '+' : ''}{expectedGameChange} pts</b>
                    <span style={{ color: '#94a3b8', marginLeft: '4px', fontSize: '11px' }}>
                      (D+fees+bonus−CO = {expectedGameDeduction.toFixed(0)} pts removed)
                    </span>
                  </span>
                )}
              </div>

              {/* Shared-game cross-store warning */}
              {hasSharedGames && (
                <div style={{ padding: '9px 13px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed', borderRadius: '8px', fontSize: '12px', color: '#4c1d95', marginBottom: '10px' }}>
                  <b>⚠ Shared game(s) detected:</b> {sharedGameNames}.
                  {' '}These games are used across multiple stores simultaneously.
                  Any game-point discrepancy shown below may partly reflect
                  activity from <em>other stores</em> during this shift, not an
                  error on your end. Cross-store deductions are always expected.
                </div>
              )}

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Game</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Start</th>}
                    <th style={{ ...T.th, textAlign: 'right' }}>End</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Change</th>}
                  </tr></thead>
                  <tbody>
                    {gameRows.map(g => {
                      const δ = g.endPts - g.startPts;
                      const isSharedGame = sharedGames.some(sg => sg.id === g.id);
                      return (
                        <tr key={g.id} style={{ background: isSharedGame ? '#faf5ff' : 'transparent' }}>
                          <td style={T.td}>
                            <b>{g.name}</b>
                            {isSharedGame && (
                              <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: '700', color: '#7c3aed', background: '#ede9fe', padding: '1px 5px', borderRadius: '5px' }}>
                                shared
                              </span>
                            )}
                          </td>
                          {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>{g.startPts} pts</td>}
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{g.endPts} pts</td>
                          {hasStartSnapshot && (
                            <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(δ) }}>
                              {δ >= 0 ? '+' : ''}{δ} pts
                              {isSharedGame && δ !== 0 && (
                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '500' }}>cross-store activity possible</div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                      {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{startTotalG} pts</td>}
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>{endTotalG} pts</td>
                      {hasStartSnapshot && (
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(gameChange) }}>
                          {gameChange >= 0 ? '+' : ''}{gameChange} pts
                          {!gameBalanced && (
                            <div style={{ fontSize: '11px', color: hasSharedGames ? '#7c3aed' : '#dc2626', fontWeight: '600' }}>
                              {hasSharedGames ? '⚡' : '⚠️'} {gameDisc >= 0 ? '+' : ''}{gameDisc} pts vs expected
                              {hasSharedGames && ' (may include other-store usage)'}
                            </div>
                          )}
                        </td>
                      )}
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

const CheckoutModal = ({ shift, startSnapshot, onSubmit, onCancel }) => {
  const [endWallets, setEndWallets] = useState([]);
  const [endGames, setEndGames] = useState([]);
  const [shiftTxns, setShiftTxns] = useState([]);
  const [shiftExpenses, setShiftExpenses] = useState([]);
  const [shiftTakeouts, setShiftTakeouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('reconciliation');

  const [fb, setFb] = useState({
    effort: 7,
    effortReason: '',
    improvements: '',
    workSummary: '',
    issuesEncountered: '',
    shiftWorkDescription: '',
    recommendationsLastShift: '',
    recommendationsOverall: '',
  });

  const setFbField = useCallback((field, value) => {
    setFb(prev => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) { setLoading(false); return; }
    const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
    Promise.all([
      fj('/wallets'),
      fj('/games'),
      fj(`/transactions?limit=500&status=COMPLETED&fromDate=${fromDate}`),
      fj(`/expenses?fromDate=${fromDate}`).catch(() => ({ data: [] })),
      fj(`/profit-takeouts?fromDate=${fromDate}&limit=200`).catch(() => ({ data: [] })),
    ])
      .then(([w, g, txns, exp, takeouts]) => {
        setEndWallets((w.data ?? []).flatMap(grp => grp.subAccounts ?? []).filter(w => w.isLive !== false));
        setEndGames(g.data ?? []);
        const start = new Date(shift.startTime);
        const list = (txns.data ?? []).filter(t => {
          if (t.createdAtISO) return new Date(t.createdAtISO) >= start;
          return true;
        });
        setShiftTxns(list);
        setShiftExpenses(exp?.data ?? []);
        setShiftTakeouts(takeouts?.data ?? []);
      })
      .catch(err => console.error('CheckoutModal fetch:', err))
      .finally(() => setLoading(false));
  }, [shift]);

  // ── Reconciliation math (unchanged from original) ──────────────
  const hasStartSnapshot = startSnapshot != null;
  const startWallets = startSnapshot?.walletSnapshot ?? [];
  const startGames = startSnapshot?.gameSnapshot ?? [];
  const startTotalW = r2(startSnapshot?.totalWallet ?? 0);
  const startTotalG = Math.round(startSnapshot?.totalGames ?? 0);

  const endTotalW = r2(endWallets.reduce((s, w) => s + (w.balance ?? 0), 0));
  const endTotalG = endGames.reduce((s, g) => s + Math.round(g.pointStock ?? 0), 0);

  const walletChange = hasStartSnapshot ? r2(endTotalW - startTotalW) : 0;
  const gameChange = hasStartSnapshot ? Math.round(endTotalG - startTotalG) : 0;

  const BONUS_TYPES = ['Match Bonus', 'Special Bonus', 'Streak Bonus', 'Referral Bonus', 'Bonus'];
  const deposits = r2(shiftTxns.filter(t => t.type === 'Deposit').reduce((s, t) => s + (t.amount ?? 0), 0));
  const cashouts = r2(shiftTxns.filter(t => t.type === 'Cashout').reduce((s, t) => s + (t.amount ?? 0), 0));
  const bonuses = r2(shiftTxns.filter(t => BONUS_TYPES.includes(t.type)).reduce((s, t) => s + (t.amount ?? 0), 0));
  const netProfit = r2(deposits - cashouts);

  const depositFees = r2(shiftTxns.filter(t => t.type === 'Deposit').reduce((s, t) => s + (t.fee ?? 0), 0));
  const cashoutFees = r2(shiftTxns.filter(t => t.type === 'Cashout').reduce((s, t) => s + (t.fee ?? 0), 0));
  const totalFees = r2(depositFees + cashoutFees);
  const hasFees = totalFees > 0.001;

  // const expectedWalletChange = r2((deposits - depositFees) - (cashouts + cashoutFees));
  // const expectedGameChange = Math.round(-(deposits - cashouts + bonuses));
  // const walletDisc = hasStartSnapshot ? r2(walletChange - expectedWalletChange) : 0;
  // const gameDisc = hasStartSnapshot ? Math.round(gameChange - expectedGameChange) : 0;
  // const crossDisc = hasStartSnapshot ? r2(walletChange + totalFees + gameChange + bonuses) : 0;
  // const walletBalanced = Math.abs(walletDisc) < 0.02;
  // const gameBalanced = Math.abs(gameDisc) < 1;
  // const crossBalanced = Math.abs(crossDisc) < 0.02;
  // const balanced = !hasStartSnapshot ? null : (walletBalanced && gameBalanced && crossBalanced);

  // Wallet: what we should see in the wallet = Deposits - Cashouts - Fees
  const expectedWalletChange = r2(deposits - cashouts - totalFees);
  // Game:   points that should have been removed = Deposits + Fees + Bonuses - Cashouts
  //         (so the actual pointStock change is the negative of that)
  const expectedGameDeduction = r2(deposits + totalFees + bonuses - cashouts);
  const expectedGameChange = Math.round(-expectedGameDeduction);

  const walletDisc = hasStartSnapshot ? r2(walletChange - expectedWalletChange) : 0;
  const gameDisc = hasStartSnapshot ? Math.round(gameChange - expectedGameChange) : 0;
  const walletBalanced = Math.abs(walletDisc) < 0.02;
  const gameBalanced = Math.abs(gameDisc) < 2;   // 2-pt tolerance for rounding
  const balanced = !hasStartSnapshot ? null : (walletBalanced && gameBalanced);

  // Detect shared games so we can annotate discrepancies that may come from other stores
  const sharedGames = endGames.filter(g => g.isShared);
  const hasSharedGames = sharedGames.length > 0;
  const sharedGameNames = sharedGames.map(g => g.name).join(', ');

  const walletRows = endWallets.map(w => {
    const s = startWallets.find(sw => sw.id === w.id);
    return { ...w, startBal: r2(s?.balance ?? 0), endBal: r2(w.balance ?? 0) };
  });
  startWallets.forEach(sw => {
    if (!endWallets.find(w => w.id === sw.id))
      walletRows.push({ ...sw, startBal: r2(sw.balance), endBal: 0 });
  });

  const gameRows = endGames.map(g => {
    const s = startGames.find(sg => sg.id === g.id);
    return { ...g, startPts: Math.round(s?.pointStock ?? 0), endPts: Math.round(g.pointStock ?? 0) };
  });
  startGames.forEach(sg => {
    if (!endGames.find(g => g.id === sg.id))
      gameRows.push({ id: sg.id, name: sg.name, startPts: Math.round(sg.pointStock), endPts: 0 });
  });

  // ── Expenses/takeouts totals ────────────────────────────────────
  const totalShiftExpenses = shiftExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalShiftTakeouts = shiftTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        endSnapshot: {
          walletSnapshot: endWallets.map(w => ({ id: w.id, name: w.name, method: w.method, balance: r2(w.balance ?? 0) })),
          gameSnapshot: endGames.map(g => ({ id: g.id, name: g.name, pointStock: Math.round(g.pointStock ?? 0) })),
          totalWallet: endTotalW, totalGames: endTotalG,
          walletChange, gameChange, netProfit,
          deposits, cashouts, bonuses,
          depositFees, cashoutFees,
          walletDiscrepancy: walletDisc,
          gameDiscrepancy: gameDisc,
          isBalanced: balanced,
          capturedAt: new Date().toISOString(),
        },
        feedback: fb,
      });
    } finally { setSubmitting(false); }
  };

  const canSubmit =
    fb.effortReason.trim().length > 5 &&
    fb.improvements.trim().length > 5 &&
    fb.workSummary.trim().length > 5 &&
    fb.issuesEncountered.trim().length > 5 &&
    fb.shiftWorkDescription.trim().length > 5 &&
    fb.recommendationsLastShift.trim().length > 5 &&
    fb.recommendationsOverall.trim().length > 5;

  const renderTextarea = (field, label, placeholder, rows = 3) => (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
        {label} <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <textarea
        value={fb[field]}
        onChange={e => setFbField(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={taStyle(true, fb[field])}
      />
    </div>
  );

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

  return (
    <div style={T.overlay}>
      <div style={{ ...T.modal, maxWidth: '820px' }}>
        {/* ── Header ── */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🌙 End-of-Shift Report</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Review your shift balances and submit your closing report</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={18} /></button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '2px', background: '#fafafa', flexShrink: 0, overflowX: 'auto' }}>
          {tabs.map(t => <TabBtn key={t.id} id={t.id} label={t.label} />)}
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
              Fetching end-of-shift data…
            </div>
          ) : activeTab === 'reconciliation' ? <>
            {/* ── Activity Summary KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Deposits', val: `+$${deposits.toFixed(2)}`, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Cashouts', val: `-$${cashouts.toFixed(2)}`, color: '#dc2626', bg: '#fef2f2' },
                { label: 'Bonuses', val: `-$${bonuses.toFixed(2)}`, color: '#d97706', bg: '#fffbeb' },
                { label: 'Net Profit (D−C)', val: `${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}`, color: netProfit >= 0 ? '#16a34a' : '#dc2626', bg: netProfit >= 0 ? '#f0fdf4' : '#fef2f2' },
                { label: 'Expenses', val: `-$${totalShiftExpenses.toFixed(2)}`, color: '#b45309', bg: '#fffbeb' },
                { label: 'Takeouts', val: `-$${totalShiftTakeouts.toFixed(2)}`, color: '#991b1b', bg: '#fff1f2' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={{ padding: '12px', background: bg, borderRadius: '10px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '800', color }}>{val}</p>
                </div>
              ))}
            </div>

            {hasFees && (
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                💡 <b>Fees noted:</b> Deposit fees −${depositFees.toFixed(2)}{cashoutFees > 0 ? ` · Cashout fees −$${cashoutFees.toFixed(2)}` : ''}.
              </div>
            )}

            {!hasStartSnapshot && (
              <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #94a3b8', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                ℹ️ <b>No start-of-shift snapshot.</b> Reconciliation shows current balances only.
              </div>
            )}

            {/* Wallet Reconciliation */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={14} color="#2563eb" /> Wallet Balances
                </h3>
                {hasStartSnapshot && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Expected change: <b style={{ color: expectedWalletChange >= 0 ? '#16a34a' : '#dc2626' }}>
                      {expectedWalletChange >= 0 ? '+' : ''}${expectedWalletChange.toFixed(2)}
                    </b>
                  </span>
                )}
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Wallet</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Start</th>}
                    <th style={{ ...T.th, textAlign: 'right' }}>End</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Change</th>}
                  </tr></thead>
                  <tbody>
                    {walletRows.map(w => {
                      const δ = r2(w.endBal - w.startBal);
                      return (
                        <tr key={w.id}>
                          <td style={T.td}><b style={{ color: '#475569' }}>{w.method}</b> — {w.name}</td>
                          {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>${w.startBal.toFixed(2)}</td>}
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>${w.endBal.toFixed(2)}</td>
                          {hasStartSnapshot && (
                            <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clr$(δ) }}>{sign$(δ)}{fmt$(δ)}</td>
                          )}
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                      {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>${startTotalW.toFixed(2)}</td>}
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>${endTotalW.toFixed(2)}</td>
                      {hasStartSnapshot && (
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clr$(walletChange) }}>
                          {sign$(walletChange)}{fmt$(walletChange)}
                          {!walletBalanced && <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>⚠️ {walletDisc >= 0 ? '+' : ''}${walletDisc.toFixed(2)} vs expected</div>}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Game Points */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gamepad2 size={14} color="#7c3aed" /> Game Points
                </h3>
                {hasStartSnapshot && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Expected change: <b style={{ color: '#7c3aed' }}>{expectedGameChange >= 0 ? '+' : ''}{expectedGameChange} pts</b>
                  </span>
                )}
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Game</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Start</th>}
                    <th style={{ ...T.th, textAlign: 'right' }}>End</th>
                    {hasStartSnapshot && <th style={{ ...T.th, textAlign: 'right' }}>Change</th>}
                  </tr></thead>
                  <tbody>
                    {gameRows.map(g => {
                      const δ = g.endPts - g.startPts;
                      return (
                        <tr key={g.id}>
                          <td style={T.td}><b>{g.name}</b></td>
                          {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', color: '#64748b' }}>{g.startPts} pts</td>}
                          <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{g.endPts} pts</td>
                          {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(δ) }}>{δ >= 0 ? '+' : ''}{δ} pts</td>}
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ ...T.td, fontWeight: '700' }}>Total</td>
                      {hasStartSnapshot && <td style={{ ...T.td, textAlign: 'right', fontWeight: '600' }}>{startTotalG} pts</td>}
                      <td style={{ ...T.td, textAlign: 'right', fontWeight: '700' }}>{endTotalG} pts</td>
                      {hasStartSnapshot && (
                        <td style={{ ...T.td, textAlign: 'right', fontWeight: '700', color: clrPts(gameChange) }}>
                          {gameChange >= 0 ? '+' : ''}{gameChange} pts
                          {!gameBalanced && <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>⚠️ {gameDisc >= 0 ? '+' : ''}{gameDisc} pts vs expected</div>}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Reconciliation Banner ── */}
            {balanced === null ? (
              <div style={{ padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #94a3b8', borderRadius: '10px', fontSize: '13px', color: '#475569' }}>
                ℹ️ Reconciliation unavailable — no start-of-shift snapshot recorded.
              </div>
            ) : (
              <div style={{
                padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: balanced ? '#f0fdf4' : (hasSharedGames && !walletBalanced === false) ? '#faf5ff' : '#fef2f2',
                border: `1px solid ${balanced ? '#86efac' : hasSharedGames && walletBalanced ? '#c4b5fd' : '#fca5a5'}`,
                borderLeft: `4px solid ${balanced ? '#16a34a' : hasSharedGames && walletBalanced ? '#7c3aed' : '#dc2626'}`,
              }}>
                {balanced
                  ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '1px' }} />
                  : <AlertCircle size={18} color={hasSharedGames && walletBalanced ? '#7c3aed' : '#dc2626'} style={{ flexShrink: 0, marginTop: '1px' }} />}
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: balanced ? '#166534' : hasSharedGames && walletBalanced ? '#4c1d95' : '#991b1b' }}>
                    {balanced
                      ? '✓ Fully Balanced'
                      : [
                        !walletBalanced ? `⚠️ Cash discrepancy $${Math.abs(walletDisc).toFixed(2)}` : '',
                        !gameBalanced ? `${hasSharedGames ? '⚡ Game points off' : '⚠️ Game points off'} ${Math.abs(gameDisc)} pts` : '',
                      ].filter(Boolean).join(' · ')
                    }
                  </p>
                  <p style={{
                    margin: 0, fontSize: '12px', lineHeight: 1.6,
                    color: balanced ? '#16a34a' : hasSharedGames && walletBalanced ? '#6d28d9' : '#991b1b'
                  }}>
                    {balanced
                      ? `Net profit $${netProfit.toFixed(2)} (D−CO) · ` +
                      `Expected wallet Δ ${expectedWalletChange >= 0 ? '+' : ''}$${expectedWalletChange.toFixed(2)} ` +
                      `(D−CO−fees) · Expected game Δ −${expectedGameDeduction.toFixed(0)} pts (D+fees+bonus−CO)`
                      : [
                        !walletBalanced
                          ? `Wallet: actual ${walletChange >= 0 ? '+' : ''}$${walletChange.toFixed(2)}, expected $${expectedWalletChange.toFixed(2)} (D−CO−fees)`
                          : '',
                        !gameBalanced
                          ? `Game: actual ${gameChange >= 0 ? '+' : ''}${gameChange} pts, expected ${expectedGameChange} pts (D+fees+bonus−CO = ${expectedGameDeduction.toFixed(0)} pts removed)` +
                          (hasSharedGames ? ` — shared games (${sharedGameNames}) may account for extra deductions from other stores` : '')
                          : '',
                      ].filter(Boolean).join('\n')
                    }
                  </p>
                </div>
              </div>
            )}

          </> : activeTab === 'transactions' ? <>
            {/* ═══ TRANSACTIONS TAB ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Shift Transactions</h3>
              <span style={{ background: '#0ea5e9', color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: '700' }}>{shiftTxns.length}</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
                <b style={{ color: '#16a34a' }}>+${deposits.toFixed(2)}</b> deposits ·
                <b style={{ color: '#dc2626' }}> −${cashouts.toFixed(2)}</b> cashouts ·
                <b style={{ color: '#c2410c' }}> −${bonuses.toFixed(2)}</b> bonuses
              </span>
            </div>
            {shiftTxns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                No transactions recorded for this shift yet
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['Time', 'Player', 'Type', 'Game / Wallet', 'Pts Before→After', 'Amount', 'Fee', 'Bal After', 'Status'].map(h => (
                          <th key={h} style={T.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shiftTxns.map(t => {
                        const isD = t.type === 'Deposit';
                        const isCO = t.type === 'Cashout';
                        const isB = BONUS_TYPES.includes(t.type);
                        const amtColor = isD ? '#16a34a' : isCO ? '#dc2626' : isB ? '#c2410c' : '#475569';
                        const pts = t.gameStockAfter != null && t.gameStockBefore != null
                          ? Math.round(t.gameStockAfter - t.gameStockBefore) : null;
                        const isPending = t.status === 'PENDING';
                        return (
                          <tr key={t.id}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <td style={{ ...T.td, fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {t.timestamp || t.date || '—'}
                            </td>
                            <td style={{ ...T.td, fontSize: '12px', fontWeight: '600' }}>
                              {t.playerName || `#${t.playerId}`}
                            </td>
                            <td style={T.td}>
                              <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: isD ? '#dcfce7' : isCO ? '#fee2e2' : '#fff7ed', color: isD ? '#166534' : isCO ? '#991b1b' : '#c2410c' }}>
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
                            <td style={{ ...T.td, fontWeight: '800', fontSize: '13px', color: amtColor }}>
                              ${(t.amount ?? 0).toFixed(2)}
                            </td>
                            <td style={T.td}>
                              {t.fee > 0 ? <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '11px' }}>−${t.fee.toFixed(2)}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ ...T.td, fontSize: '11px', color: '#64748b' }}>
                              {t.balanceAfter != null ? `$${t.balanceAfter.toFixed(2)}` : '—'}
                            </td>
                            <td style={T.td}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: isPending ? '#fef3c7' : '#dcfce7', color: isPending ? '#b45309' : '#166534' }}>
                                {isPending ? 'PENDING' : 'DONE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={5} style={{ ...T.td, fontWeight: '700', fontSize: '12px', color: '#475569' }}>
                          Totals ({shiftTxns.length} transactions)
                        </td>
                        <td style={{ ...T.td, fontWeight: '800', fontSize: '13px' }}>
                          <div style={{ color: '#16a34a' }}>+${deposits.toFixed(2)}</div>
                          <div style={{ color: '#dc2626', fontSize: '11px' }}>−${cashouts.toFixed(2)}</div>
                          <div style={{ color: '#c2410c', fontSize: '11px' }}>−${bonuses.toFixed(2)} bonus</div>
                        </td>
                        <td colSpan={3} style={T.td} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          </> : activeTab === 'expenses' ? <>
            {/* ═══ EXPENSES & TAKEOUTS TAB ═══ */}

            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px' }}>Shift Expenses ({shiftExpenses.length})</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#b45309' }}>−${totalShiftExpenses.toFixed(2)}</p>
              </div>
              <div style={{ padding: '14px 18px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px' }}>Profit Takeouts ({shiftTakeouts.length})</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#991b1b' }}>−${totalShiftTakeouts.toFixed(2)}</p>
              </div>
            </div>

            {/* Expenses table */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} color="#b45309" /> Expenses This Shift
              </h3>
              {shiftExpenses.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                  No expenses recorded during this shift
                </div>
              ) : (
                <div style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['Details', 'Category', 'Game', 'Amount', 'Points Added', 'Payment'].map(h => (
                          <th key={h} style={T.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shiftExpenses.map(e => (
                        <tr key={e.id}
                          onMouseEnter={ev => ev.currentTarget.style.background = '#fefce8'}
                          onMouseLeave={ev => ev.currentTarget.style.background = ''}
                        >
                          <td style={{ ...T.td, fontWeight: '600', maxWidth: '180px' }}>
                            <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.details}</p>
                            {e.notes && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#94a3b8' }}>{e.notes}</p>}
                          </td>
                          <td style={T.td}>
                            <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: '#fffbeb', color: '#b45309' }}>
                              {e.category?.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ ...T.td, color: '#64748b', fontSize: '11px' }}>{e.game?.name || '—'}</td>
                          <td style={{ ...T.td, fontWeight: '700', color: '#b45309' }}>${(e.amount ?? 0).toFixed(2)}</td>
                          <td style={{ ...T.td, color: '#7c3aed' }}>{e.pointsAdded > 0 ? `+${e.pointsAdded} pts` : '—'}</td>
                          <td style={{ ...T.td, color: '#64748b' }}>{e.paymentMade > 0 ? `$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#fffbeb', borderTop: '2px solid #fde68a' }}>
                        <td colSpan={3} style={{ ...T.td, fontWeight: '700', color: '#92400e' }}>Total</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#b45309' }}>${totalShiftExpenses.toFixed(2)}</td>
                        <td style={{ ...T.td, fontWeight: '700', color: '#7c3aed' }}>
                          {shiftExpenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0) > 0
                            ? `+${shiftExpenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0)} pts`
                            : '—'}
                        </td>
                        <td style={T.td} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Profit Takeouts table */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="#991b1b" /> Profit Takeouts This Shift
              </h3>
              {shiftTakeouts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                  No profit takeouts recorded during this shift
                </div>
              ) : (
                <div style={{ border: '1px solid #fecdd3', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['Taken By', 'Method', 'Amount', 'Notes'].map(h => (
                          <th key={h} style={T.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shiftTakeouts.map(t => (
                        <tr key={t.id}
                          onMouseEnter={ev => ev.currentTarget.style.background = '#fff5f5'}
                          onMouseLeave={ev => ev.currentTarget.style.background = ''}
                        >
                          <td style={{ ...T.td, fontWeight: '600' }}>{t.takenBy}</td>
                          <td style={T.td}><span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: '#fff1f2', color: '#991b1b' }}>{t.method}</span></td>
                          <td style={{ ...T.td, fontWeight: '800', color: '#991b1b' }}>${parseFloat(t.amount).toFixed(2)}</td>
                          <td style={{ ...T.td, fontSize: '11px', color: '#64748b' }}>{t.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#fff1f2', borderTop: '2px solid #fecdd3' }}>
                        <td colSpan={2} style={{ ...T.td, fontWeight: '700', color: '#991b1b' }}>Total</td>
                        <td style={{ ...T.td, fontWeight: '800', color: '#991b1b' }}>${totalShiftTakeouts.toFixed(2)}</td>
                        <td style={T.td} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </> : <>
            {/* ════ FEEDBACK TAB (unchanged) ════ */}
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
                    width: '40px', height: '40px', borderRadius: '8px', border: '2px solid',
                    cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'all .15s',
                    borderColor: fb.effort === n ? '#0f172a' : '#e2e8f0',
                    background: fb.effort === n ? (n >= 8 ? '#16a34a' : n >= 5 ? '#d97706' : '#dc2626') : '#f8fafc',
                    color: fb.effort === n ? '#fff' : '#475569',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            {renderTextarea('effortReason', `Why did you rate your effort ${fb.effort}/10?`, 'Describe your energy level, focus, challenges faced…')}
            {renderTextarea('shiftWorkDescription', 'Describe the work of this shift', 'Walk through what you did — players contacted, deposits, tasks, issues handled…', 4)}
            {renderTextarea('workSummary', 'Work Summary', 'Key accomplishments and highlights from this shift…')}
            {renderTextarea('issuesEncountered', 'Issues Encountered', 'Player complaints, system issues, payment problems…')}
            {renderTextarea('improvements', 'What could you have done better?', 'Areas for improvement, missed follow-ups…')}
            {renderTextarea('recommendationsLastShift', 'Recommendations to the previous shift', 'Handover notes, pending players, unresolved issues…')}
            {renderTextarea('recommendationsOverall', 'Recommendations overall', 'Broader suggestions, process improvements, patterns noticed…')}

            {!canSubmit && (
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                ⚠️ All fields are <b>required</b> (min 6 chars each) before you can end your shift.
              </div>
            )}
          </>}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexShrink: 0, background: '#f8fafc' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {activeTab === 'feedback'
              ? `Balanced: ${balanced === null ? 'N/A' : balanced ? '✓ Yes' : '⚠️ Discrepancy'}`
              : `${shiftTxns.length} txns · ${shiftExpenses.length} expenses · ${shiftTakeouts.length} takeouts`}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            {activeTab !== 'feedback' ? (
              <button onClick={() => setActiveTab(activeTab === 'reconciliation' ? 'transactions' : activeTab === 'transactions' ? 'expenses' : 'feedback')}
                style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
                padding: '10px 22px', background: '#dc2626', color: '#fff', border: 'none',
                borderRadius: '8px', fontWeight: '700', fontSize: '13px',
                cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
                opacity: !canSubmit || submitting ? .6 : 1,
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                {submitting ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : '✓ Submit & End Shift'}
              </button>
            )}
          </div>
        </div>
      </div>
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
