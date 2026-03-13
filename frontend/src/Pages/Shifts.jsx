// pages/ShiftsPage.jsx — Enhanced Version
// Features:
//  ✅ Pre-shift checkin modal  (wallet snapshot + game snapshot + tasks)
//  ✅ Active tasks display on the main page
//  ✅ Post-shift checkout modal (reconciliation table + feedback 1–10)
//  ✅ All data stored for daily reports & PDF

import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  Clock, CheckCircle, AlertCircle, RefreshCw, X,
  Wallet, Gamepad2, ClipboardList, TrendingUp,
} from 'lucide-react';
import { ShiftStatusContext } from '../Context/membershiftStatus.jsx';
import { CurrentUserContext } from '../Context/currentUser.jsx';
import { api } from '../api';

// ─── API helper — uses same auth key ('authToken') as the rest of the app ──────
// VITE_API_URL already includes /api (e.g. https://oceanappbackend.onrender.com/api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const fj = async (path, opts = {}) => {
  const token = localStorage.getItem('authToken');   // ← must match what login() stores
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
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

// ─── Micro-helpers ────────────────────────────────────────────────────
const fmt$  = v => `$${Math.abs(v ?? 0).toFixed(2)}`;
const sign  = v => (v ?? 0) >= 0 ? '+' : '−';
const clr   = v => (v ?? 0) >= 0 ? '#16a34a' : '#dc2626';
const clrInv= v => (v ?? 0) <= 0 ? '#16a34a' : '#dc2626'; // inverted: negative game ∆ is good

// ─── Design tokens ────────────────────────────────────────────────────
const T = {
  card: { background:'#fff', borderRadius:'14px', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(15,23,42,.07)', padding:'28px 32px' },
  overlay: { position:'fixed', inset:0, background:'rgba(15,23,42,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(3px)' },
  modal: { background:'#fff', borderRadius:'18px', boxShadow:'0 24px 64px rgba(15,23,42,.3)', width:'100%', maxWidth:'720px', maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column' },
  th: { padding:'10px 14px', fontWeight:'600', color:'#64748b', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', whiteSpace:'nowrap' },
  td: { padding:'11px 14px', fontSize:'13px', color:'#0f172a', borderBottom:'1px solid #f1f5f9' },
  TH: { textAlign:'left', padding:'10px 20px', fontWeight:'600', color:'#64748b', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.4px', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap', background:'#f8fafc' },
  TD: { padding:'14px 20px', borderBottom:'1px solid #f1f5f9', fontSize:'13px', color:'#0f172a' },
};

const Badge = ({ label, color='#64748b', bg='#f1f5f9' }) => (
  <span style={{ padding:'2px 8px', borderRadius:'12px', fontSize:'11px', fontWeight:'600', background:bg, color }}>{label}</span>
);

// ═══════════════════════════════════════════════════════════════════════
// CHECKIN MODAL — shown BEFORE starting the shift
// ═══════════════════════════════════════════════════════════════════════
const CheckinModal = ({ onConfirm, onCancel }) => {
  const [wallets,    setWallets]    = useState([]);
  const [games,      setGames]      = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) { setLoading(false); return; }
    Promise.all([
      fj('/wallets'),
      fj('/games'),
      fj('/tasks?myTasks=true'),
    ])
      .then(([w, g, t]) => {
        setWallets((w.data ?? []).flatMap(grp => grp.subAccounts ?? []));
        setGames(g.data ?? []);
        setTasks((t.data ?? []).filter(task => task.status !== 'COMPLETED'));
      })
      .catch(err => console.error('CheckinModal fetch:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalWallet = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);
  const totalGames  = games.reduce((s, g)  => s + (g.pointStock ?? 0), 0);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm({
        walletSnapshot: wallets.map(w => ({ id:w.id, name:w.name, method:w.method, balance:w.balance ?? 0 })),
        gameSnapshot:   games.map(g   => ({ id:g.id, name:g.name, pointStock:g.pointStock ?? 0 })),
        totalWallet,
        totalGames,
        notes,
        capturedAt: new Date().toISOString(),
      });
    } finally { setConfirming(false); }
  };

  return (
    <div style={T.overlay}>
      <div style={T.modal}>
        {/* Header */}
        <div style={{ padding:'20px 28px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:'700', color:'#0f172a' }}>🌅 Start-of-Shift Verification</h2>
            <p style={{ margin:0, fontSize:'13px', color:'#64748b' }}>Confirm all balances before your shift begins</p>
          </div>
          <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'4px' }}><X size={18}/></button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px 28px', display:'flex', flexDirection:'column', gap:'22px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', marginBottom:'8px', display:'block', margin:'0 auto 10px' }}/>
              Loading current balances…
            </div>
          ) : <>

            {/* ── Wallet Balances ── */}
            <section>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px' }}>
                  <Wallet size={14} color="#2563eb"/> Wallet Balances
                </h3>
                <span style={{ fontSize:'16px', fontWeight:'800', color:'#16a34a' }}>${totalWallet.toFixed(2)} total</span>
              </div>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Method</th>
                    <th style={T.th}>Account</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Balance</th>
                  </tr></thead>
                  <tbody>
                    {wallets.map(w => (
                      <tr key={w.id}>
                        <td style={T.td}><b style={{ color:'#475569' }}>{w.method}</b></td>
                        <td style={T.td}>{w.name}{w.identifier ? <span style={{ color:'#94a3b8', marginLeft:'6px', fontSize:'12px' }}>{w.identifier}</span> : null}</td>
                        <td style={{ ...T.td, textAlign:'right', fontWeight:'700' }}>${(w.balance ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {wallets.length === 0 && <tr><td colSpan={3} style={{ ...T.td, textAlign:'center', color:'#94a3b8' }}>No wallets found</td></tr>}
                    {/* Total row */}
                    <tr style={{ background:'#f0fdf4' }}>
                      <td colSpan={2} style={{ ...T.td, fontWeight:'700', color:'#166534' }}>Combined Total</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'800', color:'#16a34a', fontSize:'14px' }}>${totalWallet.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Game Points ── */}
            <section>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px' }}>
                  <Gamepad2 size={14} color="#7c3aed"/> Game Points
                </h3>
                <span style={{ fontSize:'16px', fontWeight:'800', color:'#7c3aed' }}>{totalGames.toFixed(0)} pts total</span>
              </div>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Game</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Points</th>
                    <th style={{ ...T.th, textAlign:'center' }}>Status</th>
                  </tr></thead>
                  <tbody>
                    {games.map(g => (
                      <tr key={g.id}>
                        <td style={T.td}><b>{g.name}</b></td>
                        <td style={{ ...T.td, textAlign:'right', fontWeight:'700' }}>{(g.pointStock ?? 0).toFixed(0)}</td>
                        <td style={{ ...T.td, textAlign:'center' }}>
                          <Badge label={g.status}
                            color={g.status==='HEALTHY'?'#16a34a':g.status==='LOW_STOCK'?'#854d0e':'#991b1b'}
                            bg={g.status==='HEALTHY'?'#dcfce7':g.status==='LOW_STOCK'?'#fef9c3':'#fee2e2'}/>
                        </td>
                      </tr>
                    ))}
                    {games.length === 0 && <tr><td colSpan={3} style={{ ...T.td, textAlign:'center', color:'#94a3b8' }}>No games found</td></tr>}
                    {/* Total row */}
                    <tr style={{ background:'#f5f3ff' }}>
                      <td colSpan={2} style={{ ...T.td, fontWeight:'700', color:'#5b21b6' }}>Combined Total</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'800', color:'#7c3aed', fontSize:'14px' }}>{totalGames.toFixed(0)} pts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Assigned Tasks ── */}
            <section>
              <h3 style={{ margin:'0 0 10px', fontSize:'13px', fontWeight:'700', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px' }}>
                <ClipboardList size={14} color="#0891b2"/> Your Active Tasks
                {tasks.length > 0 && <span style={{ background:'#0891b2', color:'#fff', borderRadius:'10px', padding:'0 7px', fontSize:'11px' }}>{tasks.length}</span>}
              </h3>
              {tasks.length === 0 ? (
                <p style={{ fontSize:'13px', color:'#94a3b8', fontStyle:'italic', margin:0 }}>No active tasks assigned</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ padding:'10px 14px', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:'600', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                        <p style={{ margin:0, fontSize:'11px', color:'#64748b' }}>{t.taskType?.replace(/_/g,' ')} · {t.priority}</p>
                        {t.targetValue && (
                          <div style={{ marginTop:'5px', height:'3px', background:'#e2e8f0', borderRadius:'2px', overflow:'hidden' }}>
                            <div style={{ height:'100%', background:'#2563eb', borderRadius:'2px', width:`${Math.min(100,((t.currentValue??0)/t.targetValue)*100)}%` }}/>
                          </div>
                        )}
                      </div>
                      <Badge
                        label={t.status.replace('_',' ')}
                        color={t.status==='IN_PROGRESS'?'#1d4ed8':'#475569'}
                        bg={t.status==='IN_PROGRESS'?'#dbeafe':'#f1f5f9'}/>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Opening Notes ── */}
            <section>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>
                Opening Notes / Discrepancies <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
              </label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Note any balance discrepancies before starting…"
                rows={3}
                style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none', lineHeight:1.5 }}
              />
            </section>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 28px', borderTop:'1px solid #e2e8f0', display:'flex', gap:'10px', justifyContent:'flex-end', flexShrink:0, background:'#f8fafc' }}>
          <button onClick={onCancel} style={{ padding:'10px 18px', background:'#fff', border:'1px solid #d1d5db', borderRadius:'8px', fontWeight:'600', fontSize:'13px', cursor:'pointer', color:'#374151' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading||confirming} style={{
            padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none',
            borderRadius:'8px', fontWeight:'700', fontSize:'13px',
            cursor:loading||confirming?'wait':'pointer', opacity:loading||confirming?.7:1,
            display:'flex', alignItems:'center', gap:'7px',
          }}>
            {confirming
              ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> Starting…</>
              : '✓ Confirm & Start Shift'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CHECKOUT MODAL — shown BEFORE ending the shift
// ═══════════════════════════════════════════════════════════════════════
const CheckoutModal = ({ shift, startSnapshot, onSubmit, onCancel }) => {
  const [endWallets,  setEndWallets]  = useState([]);
  const [endGames,    setEndGames]    = useState([]);
  const [shiftTxns,   setShiftTxns]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('reconciliation'); // | 'feedback'
  const [fb, setFb] = useState({ effort:7, effortReason:'', improvements:'', workSummary:'', issuesEncountered:'' });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) { setLoading(false); return; }
    const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
    Promise.all([
      fj('/api/wallets'),
      fj('/api/games'),
      fj(`/api/transactions?limit=500&status=COMPLETED&fromDate=${fromDate}`),
    ])
      .then(([w, g, txns]) => {
        setEndWallets((w.data ?? []).flatMap(grp => grp.subAccounts ?? []));
        setEndGames(g.data ?? []);
        const start = new Date(shift.startTime);
        const list  = (txns.data ?? []).filter(t => {
          if (t.createdAtISO) return new Date(t.createdAtISO) >= start;
          return true;
        });
        setShiftTxns(list);
      })
      .catch(err => console.error('CheckoutModal fetch:', err))
      .finally(() => setLoading(false));
  }, [shift]);

  // ── Parse start snapshot ──
  const startWallets  = startSnapshot?.walletSnapshot ?? [];
  const startGames    = startSnapshot?.gameSnapshot    ?? [];
  const startTotalW   = startSnapshot?.totalWallet     ?? 0;
  const startTotalG   = startSnapshot?.totalGames      ?? 0;

  const endTotalW = endWallets.reduce((s,w) => s+(w.balance??0), 0);
  const endTotalG = endGames.reduce((s,g)   => s+(g.pointStock??0), 0);

  const walletChange = endTotalW - startTotalW;
  const gameChange   = endTotalG - startTotalG; // negative = points consumed = expected

  // ── Shift transaction totals ──
  const BONUS_TYPES = ['Match Bonus','Special Bonus','Streak Bonus','Referral Bonus','Bonus'];
  const deposits = shiftTxns.filter(t => t.type==='Deposit').reduce((s,t)=>s+t.amount,0);
  const cashouts = shiftTxns.filter(t => t.type==='Cashout').reduce((s,t)=>s+t.amount,0);
  const bonuses  = shiftTxns.filter(t => BONUS_TYPES.includes(t.type)).reduce((s,t)=>s+t.amount,0);
  const netProfit = deposits - cashouts - bonuses;

  // ── Reconciliation checks ──
  // Expected: wallet should have increased by (D - C)
  // Expected: game should have decreased by (D + B - C)
  const expectedWalletChange =  deposits - cashouts;
  const expectedGameChange   = -(deposits + bonuses - cashouts);
  const walletDisc = walletChange - expectedWalletChange; // ideally 0
  const gameDisc   = gameChange   - expectedGameChange;   // ideally 0
  const totalDisc  = walletDisc + gameDisc;
  const balanced   = Math.abs(totalDisc) < 0.02;

  // ── Build comparison rows ──
  const walletRows = endWallets.map(w => {
    const s = startWallets.find(sw => sw.id === w.id);
    return { ...w, startBal: s?.balance ?? 0, endBal: w.balance ?? 0 };
  });
  startWallets.forEach(sw => { if (!endWallets.find(w=>w.id===sw.id)) walletRows.push({ ...sw, startBal:sw.balance, endBal:0 }); });

  const gameRows = endGames.map(g => {
    const s = startGames.find(sg => sg.id === g.id);
    return { ...g, startPts: s?.pointStock ?? 0, endPts: g.pointStock ?? 0 };
  });
  startGames.forEach(sg => { if (!endGames.find(g=>g.id===sg.id)) gameRows.push({ id:sg.id, name:sg.name, startPts:sg.pointStock, endPts:0 }); });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        endSnapshot: {
          walletSnapshot: endWallets.map(w=>({id:w.id,name:w.name,method:w.method,balance:w.balance??0})),
          gameSnapshot:   endGames.map(g=>({id:g.id,name:g.name,pointStock:g.pointStock??0})),
          totalWallet:endTotalW, totalGames:endTotalG,
          walletChange, gameChange, netProfit,
          deposits, cashouts, bonuses,
          walletDiscrepancy:walletDisc, gameDiscrepancy:gameDisc,
          totalDiscrepancy:totalDisc, isBalanced:balanced,
          capturedAt: new Date().toISOString(),
        },
        feedback: fb,
      });
    } finally { setSubmitting(false); }
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={()=>setActiveTab(id)} style={{
      padding:'8px 18px', border:'none', cursor:'pointer', fontWeight:'600',
      fontSize:'13px', borderRadius:'8px', transition:'all .15s',
      background: activeTab===id ? '#0f172a' : 'transparent',
      color: activeTab===id ? '#fff' : '#64748b',
    }}>{label}</button>
  );

  const canSubmit = fb.effortReason.trim().length > 5 && fb.improvements.trim().length > 5;

  return (
    <div style={T.overlay}>
      <div style={{ ...T.modal, maxWidth:'800px' }}>
        {/* Header */}
        <div style={{ padding:'20px 28px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:'700', color:'#0f172a' }}>🌙 End-of-Shift Report</h2>
            <p style={{ margin:0, fontSize:'13px', color:'#64748b' }}>Review your shift balances and submit your closing report</p>
          </div>
          <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'4px' }}><X size={18}/></button>
        </div>

        {/* Tabs */}
        <div style={{ padding:'10px 28px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:'4px', background:'#fafafa', flexShrink:0 }}>
          <TabBtn id="reconciliation" label="📊 Reconciliation"/>
          <TabBtn id="feedback"       label="💬 Feedback"/>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px 28px', display:'flex', flexDirection:'column', gap:'20px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 10px' }}/>
              Fetching end-of-shift data…
            </div>
          ) : activeTab==='reconciliation' ? <>

            {/* ── Activity Summary Cards ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
              {[
                { label:'Deposits',   val:`+$${deposits.toFixed(2)}`, color:'#16a34a', bg:'#f0fdf4' },
                { label:'Cashouts',   val:`-$${cashouts.toFixed(2)}`, color:'#dc2626', bg:'#fef2f2' },
                { label:'Bonuses',    val:`-$${bonuses.toFixed(2)}`,  color:'#d97706', bg:'#fffbeb' },
                { label:'Net Profit', val:`${netProfit>=0?'+':''}$${netProfit.toFixed(2)}`, color:netProfit>=0?'#16a34a':'#dc2626', bg:netProfit>=0?'#f0fdf4':'#fef2f2' },
              ].map(({ label,val,color,bg }) => (
                <div key={label} style={{ padding:'14px', background:bg, borderRadius:'10px', textAlign:'center' }}>
                  <p style={{ margin:'0 0 4px', fontSize:'11px', color:'#64748b', fontWeight:'600', textTransform:'uppercase', letterSpacing:'.4px' }}>{label}</p>
                  <p style={{ margin:0, fontSize:'16px', fontWeight:'800', color }}>{val}</p>
                </div>
              ))}
            </div>

            {/* ── Wallet Reconciliation ── */}
            <section>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px' }}>
                  <Wallet size={14} color="#2563eb"/> Wallet Balances
                </h3>
                <span style={{ fontSize:'12px', color:'#64748b' }}>
                  Expected change: <b style={{ color:expectedWalletChange>=0?'#16a34a':'#dc2626' }}>{expectedWalletChange>=0?'+':''}${expectedWalletChange.toFixed(2)}</b>
                </span>
              </div>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Wallet</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Start</th>
                    <th style={{ ...T.th, textAlign:'right' }}>End</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Change</th>
                  </tr></thead>
                  <tbody>
                    {walletRows.map(w => {
                      const δ = w.endBal - w.startBal;
                      return (
                        <tr key={w.id}>
                          <td style={T.td}><b style={{ color:'#475569' }}>{w.method}</b> — {w.name}</td>
                          <td style={{ ...T.td, textAlign:'right', color:'#64748b' }}>${w.startBal.toFixed(2)}</td>
                          <td style={{ ...T.td, textAlign:'right', fontWeight:'600' }}>${w.endBal.toFixed(2)}</td>
                          <td style={{ ...T.td, textAlign:'right', fontWeight:'700', color:clr(δ) }}>{sign(δ)}{fmt$(δ)}</td>
                        </tr>
                      );
                    })}
                    {/* Total */}
                    <tr style={{ background:'#f8fafc' }}>
                      <td style={{ ...T.td, fontWeight:'700' }}>Total</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'600' }}>${startTotalW.toFixed(2)}</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'700' }}>${endTotalW.toFixed(2)}</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'700', color:clr(walletChange) }}>
                        {sign(walletChange)}{fmt$(walletChange)}
                        {Math.abs(walletDisc)>.01 && <div style={{ fontSize:'11px', color:'#dc2626', fontWeight:'600' }}>⚠️ {walletDisc>=0?'+':''}{walletDisc.toFixed(2)} vs expected</div>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Game Points Reconciliation ── */}
            <section>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#0f172a', display:'flex', alignItems:'center', gap:'6px' }}>
                  <Gamepad2 size={14} color="#7c3aed"/> Game Points
                </h3>
                <span style={{ fontSize:'12px', color:'#64748b' }}>
                  Expected change: <b style={{ color:'#7c3aed' }}>{expectedGameChange>=0?'+':''}{expectedGameChange.toFixed(0)} pts</b>
                </span>
              </div>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={T.th}>Game</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Start</th>
                    <th style={{ ...T.th, textAlign:'right' }}>End</th>
                    <th style={{ ...T.th, textAlign:'right' }}>Change</th>
                  </tr></thead>
                  <tbody>
                    {gameRows.map(g => {
                      const δ = g.endPts - g.startPts;
                      return (
                        <tr key={g.id}>
                          <td style={T.td}><b>{g.name}</b></td>
                          <td style={{ ...T.td, textAlign:'right', color:'#64748b' }}>{g.startPts.toFixed(0)} pts</td>
                          <td style={{ ...T.td, textAlign:'right', fontWeight:'600' }}>{g.endPts.toFixed(0)} pts</td>
                          <td style={{ ...T.td, textAlign:'right', fontWeight:'700', color:clrInv(δ) }}>{δ>=0?'+':''}{δ.toFixed(0)} pts</td>
                        </tr>
                      );
                    })}
                    {/* Total */}
                    <tr style={{ background:'#f8fafc' }}>
                      <td style={{ ...T.td, fontWeight:'700' }}>Total</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'600' }}>{startTotalG.toFixed(0)} pts</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'700' }}>{endTotalG.toFixed(0)} pts</td>
                      <td style={{ ...T.td, textAlign:'right', fontWeight:'700', color:clrInv(gameChange) }}>
                        {gameChange>=0?'+':''}{gameChange.toFixed(0)} pts
                        {Math.abs(gameDisc)>.1 && <div style={{ fontSize:'11px', color:'#dc2626', fontWeight:'600' }}>⚠️ {gameDisc>=0?'+':''}{gameDisc.toFixed(0)} pts vs expected</div>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Reconciliation Banner ── */}
            <div style={{
              padding:'14px 18px',
              background:balanced?'#f0fdf4':'#fef2f2',
              border:`1px solid ${balanced?'#86efac':'#fca5a5'}`,
              borderLeft:`4px solid ${balanced?'#16a34a':'#dc2626'}`,
              borderRadius:'10px', display:'flex', alignItems:'flex-start', gap:'12px',
            }}>
              {balanced ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink:0, marginTop:'1px' }}/> : <AlertCircle size={18} color="#dc2626" style={{ flexShrink:0, marginTop:'1px' }}/>}
              <div>
                <p style={{ margin:'0 0 4px', fontWeight:'700', color:balanced?'#166534':'#991b1b', fontSize:'14px' }}>
                  {balanced ? '✓ Fully Balanced' : `⚠️ Discrepancy Detected: $${Math.abs(totalDisc).toFixed(2)}`}
                </p>
                <p style={{ margin:0, fontSize:'12px', color:balanced?'#16a34a':'#dc2626', lineHeight:1.5 }}>
                  {balanced
                    ? `Net profit $${netProfit.toFixed(2)} = Wallet Δ ${sign(walletChange)}${fmt$(walletChange)} + Game consumption ${(deposits+bonuses-cashouts).toFixed(0)} pts`
                    : `Wallet discrepancy: $${walletDisc.toFixed(2)} | Game discrepancy: ${gameDisc.toFixed(0)} pts. Check transactions before ending.`}
                </p>
              </div>
            </div>

          </> : <>
            {/* ── FEEDBACK TAB ── */}

            {/* Effort Rating */}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'12px' }}>
                Effort Rating
                <span style={{ marginLeft:'12px', fontSize:'22px', fontWeight:'800', color:fb.effort>=8?'#16a34a':fb.effort>=5?'#d97706':'#dc2626' }}>
                  {fb.effort}<span style={{ fontSize:'14px', color:'#94a3b8' }}>/10</span>
                </span>
              </label>
              <div style={{ display:'flex', gap:'8px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={()=>setFb(f=>({...f,effort:n}))} style={{
                    width:'40px', height:'40px', borderRadius:'8px', border:'2px solid',
                    cursor:'pointer', fontWeight:'700', fontSize:'13px', transition:'all .15s',
                    borderColor: fb.effort===n ? '#0f172a' : '#e2e8f0',
                    background:  fb.effort===n ? (n>=8?'#16a34a':n>=5?'#d97706':'#dc2626') : '#f8fafc',
                    color:       fb.effort===n ? '#fff' : '#475569',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            {/* Effort Reason */}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>
                Why did you rate your effort {fb.effort}/10? <span style={{ color:'#dc2626' }}>*</span>
              </label>
              <textarea value={fb.effortReason} onChange={e=>setFb(f=>({...f,effortReason:e.target.value}))}
                placeholder="Describe your energy level, focus, challenges faced this shift…"
                rows={3} style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}/>
            </div>

            {/* Improvements */}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>
                What could you have done better? <span style={{ color:'#dc2626' }}>*</span>
              </label>
              <textarea value={fb.improvements} onChange={e=>setFb(f=>({...f,improvements:e.target.value}))}
                placeholder="Areas for improvement, missed follow-ups, better approaches you could have taken…"
                rows={3} style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}/>
            </div>

            {/* Work Summary */}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>
                Work Summary <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
              </label>
              <textarea value={fb.workSummary} onChange={e=>setFb(f=>({...f,workSummary:e.target.value}))}
                placeholder="Brief summary of accomplishments this shift…"
                rows={3} style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}/>
            </div>

            {/* Issues */}
            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600', color:'#374151', marginBottom:'6px' }}>
                Issues Encountered <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
              </label>
              <textarea value={fb.issuesEncountered} onChange={e=>setFb(f=>({...f,issuesEncountered:e.target.value}))}
                placeholder="Player complaints, system issues, unusual situations…"
                rows={2} style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}/>
            </div>

            {/* Validation hint */}
            {!canSubmit && (
              <p style={{ margin:0, fontSize:'12px', color:'#d97706', fontStyle:'italic' }}>
                ⚠️ Effort reason and improvements are required (min 6 characters each) before you can end your shift.
              </p>
            )}
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 28px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexShrink:0, background:'#f8fafc' }}>
          <span style={{ fontSize:'12px', color:'#94a3b8' }}>
            {activeTab==='reconciliation' ? 'Switch to Feedback to complete your report' : `Balanced: ${balanced?'✓ Yes':'⚠️ Discrepancy'}`}
          </span>
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={onCancel} style={{ padding:'10px 18px', background:'#fff', border:'1px solid #d1d5db', borderRadius:'8px', fontWeight:'600', fontSize:'13px', cursor:'pointer', color:'#374151' }}>
              Cancel
            </button>
            {activeTab==='reconciliation' ? (
              <button onClick={()=>setActiveTab('feedback')} style={{ padding:'10px 20px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                Next: Feedback →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canSubmit||submitting} style={{
                padding:'10px 22px', background:'#dc2626', color:'#fff', border:'none',
                borderRadius:'8px', fontWeight:'700', fontSize:'13px',
                cursor:!canSubmit||submitting?'not-allowed':'pointer',
                opacity:!canSubmit||submitting?.6:1,
                display:'flex', alignItems:'center', gap:'7px',
              }}>
                {submitting ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> Submitting…</> : '✓ Submit & End Shift'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN ShiftsPage
// ═══════════════════════════════════════════════════════════════════════
export const ShiftsPage = () => {
  const activeShiftIdRef = useRef(null);
  const { shiftActive, setShiftActive } = useContext(ShiftStatusContext);
  const { usr } = useContext(CurrentUserContext);

  const [pastShifts,    setPastShifts]    = useState([]);
  const [activeShift,   setActiveShift]   = useState(null);
  const [startSnapshot, setStartSnapshot] = useState(null);
  const [tasks,         setTasks]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [showCheckin,   setShowCheckin]   = useState(false);
  const [showCheckout,  setShowCheckout]  = useState(false);

  // ── Restore on mount ──
  useEffect(() => {
    if (!usr?.role) return;
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const [activeRes, historyRes, tasksRes] = await Promise.all([
          api.shifts.getActiveShift(usr.role),
          api.shifts.getShifts(usr.role),
          token ? fj('/api/tasks?myTasks=true') : Promise.resolve({ data: [] }),
        ]);
        if (activeRes?.data) {
          const sh = activeRes.data;
          activeShiftIdRef.current = sh.id;
          setActiveShift(sh);
          setShiftActive(true);
          // Restore start snapshot from checkin record
          const checkinRes = await fj(`/api/shifts/${sh.id}/checkin`).catch(() => null);
          if (checkinRes?.data?.balanceNote) {
            try { setStartSnapshot(JSON.parse(checkinRes.data.balanceNote)); } catch (_) {}
          }
        }
        setPastShifts(historyRes?.data ?? []);
        setTasks((tasksRes?.data ?? []).filter(t => t.status !== 'COMPLETED'));
      } catch (e) { console.error('Shift restore error:', e); }
    })();
  }, [usr?.role]);

  // Auto-clear alerts
  useEffect(() => { if (success) { const t = setTimeout(()=>setSuccess(''),4000); return ()=>clearTimeout(t); } },[success]);
  useEffect(() => { if (error)   { const t = setTimeout(()=>setError(''),5000);   return ()=>clearTimeout(t); } },[error]);

  // ── Checkin confirmed (start shift) ──
  const handleCheckinConfirm = async (snapshot) => {
    try {
      setLoading(true);
      // 1) start shift in DB
      const res = await api.shifts.startShift({ teamRole: usr?.role });
      if (!res?.data) throw new Error('No shift data returned');
      const shiftId = res.data.id;
      activeShiftIdRef.current = shiftId;
      setActiveShift(res.data);
      // 2) record checkin snapshot
      await fj(`/api/shifts/${shiftId}/checkin`, {
        method:'POST',
        body: JSON.stringify({ confirmedBalance: snapshot.totalWallet, balanceNote: JSON.stringify(snapshot) }),
      });
      setStartSnapshot(snapshot);
      setShiftActive(true);
      setShowCheckin(false);
      setSuccess('Shift started! Good luck! 🌊');
    } catch (err) { setError(err.message || 'Failed to start shift'); throw err; }
    finally { setLoading(false); }
  };

  // ── Checkout confirmed (end shift) ──
  const handleCheckoutSubmit = async ({ endSnapshot, feedback }) => {
    const shiftId = activeShiftIdRef.current;
    if (!shiftId) return;
    try {
      setLoading(true);
      // 1) submit end-of-shift form
      await fj(`/api/shifts/${shiftId}/checkout`, {
        method:'POST',
        body: JSON.stringify({
          effortRating:       feedback.effort,
          workSummary:        feedback.workSummary,
          issuesEncountered:  feedback.issuesEncountered,
          shoutouts:          '',
          additionalNotes:    JSON.stringify({ effortReason:feedback.effortReason, improvements:feedback.improvements, endSnapshot }),
        }),
      });
      // 2) end the shift
      await api.shifts.endShift(shiftId);
      activeShiftIdRef.current = null;
      setActiveShift(null);
      setStartSnapshot(null);
      setShiftActive(false);
      setShowCheckout(false);
      setSuccess('Shift ended and report saved! Great work!');
      const h = await api.shifts.getShifts(usr?.role);
      setPastShifts(h?.data ?? []);
    } catch (err) { setError(err.message || 'Failed to end shift'); throw err; }
    finally { setLoading(false); }
  };

  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-US',{ timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US',{ timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric' }) : '—';

  return (
    <>
      {showCheckin  && <CheckinModal  onConfirm={handleCheckinConfirm} onCancel={()=>setShowCheckin(false)}/>}
      {showCheckout && activeShift && (
        <CheckoutModal shift={activeShift} startSnapshot={startSnapshot} onSubmit={handleCheckoutSubmit} onCancel={()=>setShowCheckout(false)}/>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

        {/* ── Status Banner ── */}
        <div style={{
          padding:'14px 18px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px',
          background:shiftActive?'#f0fdf4':'#fffbeb',
          border:`1px solid ${shiftActive?'#86efac':'#fcd34d'}`,
          borderLeft:`4px solid ${shiftActive?'#16a34a':'#f59e0b'}`,
        }}>
          {shiftActive ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink:0 }}/> : <AlertCircle size={18} color="#d97706" style={{ flexShrink:0 }}/>}
          <div>
            <p style={{ margin:'0 0 2px', fontWeight:'700', color:shiftActive?'#166534':'#92400e', fontSize:'14px' }}>
              {shiftActive ? 'Shift Active' : 'No Active Shift'}
            </p>
            <p style={{ margin:0, fontSize:'12px', color:shiftActive?'#16a34a':'#b45309', lineHeight:1.4 }}>
              {shiftActive
                ? `Started at ${fmtTime(activeShift?.startTime)} — opening balances recorded`
                : 'Click "Start Shift" to log your opening balances'}
            </p>
          </div>
        </div>

        {/* ── Alerts ── */}
        {success && <div style={{ padding:'11px 14px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:'8px', color:'#166534', fontSize:'13px', display:'flex', gap:'8px', alignItems:'center' }}><CheckCircle size={14} style={{ flexShrink:0 }}/> {success}</div>}
        {error   && <div style={{ padding:'11px 14px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'8px', color:'#991b1b', fontSize:'13px', display:'flex', gap:'8px', alignItems:'center' }}><AlertCircle size={14} style={{ flexShrink:0 }}/> {error}</div>}

        {/* ── Shift Control Card ── */}
        <div style={T.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'48px', height:'48px', background:'#eff6ff', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Clock size={22} color="#2563eb"/>
              </div>
              <div>
                <h3 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:'700', color:'#0f172a' }}>Shift Management</h3>
                <p style={{ margin:0, fontSize:'13px', color:'#64748b' }}>
                  {shiftActive ? 'Your shift is currently active' : 'Start a shift to begin recording transactions'}
                </p>
              </div>
            </div>
            {shiftActive ? (
              <button onClick={()=>setShowCheckout(true)} disabled={loading} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'12px 24px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'14px', cursor:loading?'wait':'pointer', opacity:loading?.7:1 }}>
                {loading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Saving…</> : 'End Shift'}
              </button>
            ) : (
              <button onClick={()=>setShowCheckin(true)} disabled={loading} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'12px 24px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'14px', cursor:loading?'wait':'pointer', opacity:loading?.7:1 }}>
                {loading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Starting…</> : 'Start Shift'}
              </button>
            )}
          </div>
        </div>

        {/* ── Active Tasks ── */}
        {tasks.length > 0 && (
          <div style={{ ...T.card, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'18px 28px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:'10px' }}>
              <ClipboardList size={16} color="#0891b2"/>
              <h3 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:'#0f172a' }}>Your Active Tasks</h3>
              <span style={{ marginLeft:'auto', background:'#0891b2', color:'#fff', borderRadius:'10px', padding:'1px 8px', fontSize:'12px', fontWeight:'700' }}>{tasks.length}</span>
            </div>
            <div style={{ padding:'16px 28px', display:'flex', flexDirection:'column', gap:'8px' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:'600', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                    <p style={{ margin:0, fontSize:'11px', color:'#64748b' }}>{t.taskType?.replace(/_/g,' ')} · {t.priority}</p>
                    {t.targetValue && (
                      <div style={{ marginTop:'6px', height:'3px', background:'#e2e8f0', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'#2563eb', borderRadius:'2px', width:`${Math.min(100,((t.currentValue??0)/t.targetValue)*100)}%` }}/>
                      </div>
                    )}
                  </div>
                  <Badge label={t.status.replace('_',' ')} color={t.status==='IN_PROGRESS'?'#1d4ed8':'#475569'} bg={t.status==='IN_PROGRESS'?'#dbeafe':'#f1f5f9'}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Past Shifts Table ── */}
        <div style={{ ...T.card, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'20px 28px', borderBottom:'1px solid #f1f5f9' }}>
            <h3 style={{ margin:'0 0 2px', fontSize:'15px', fontWeight:'700', color:'#0f172a' }}>Past Shifts Log</h3>
            <p style={{ margin:0, fontSize:'12px', color:'#94a3b8' }}>History of completed shifts ({pastShifts.filter(s=>!s.isActive).length})</p>
          </div>

          {pastShifts.filter(s=>!s.isActive).length > 0 ? (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr>
                    <th style={T.TH}>Date</th>
                    <th style={T.TH}>Start</th>
                    <th style={T.TH}>End</th>
                    <th style={T.TH}>Duration</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Txns</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Deposits</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Cashouts</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Net Profit</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Effort</th>
                    <th style={{ ...T.TH, textAlign:'center' }}>Balanced</th>
                  </tr>
                </thead>
                <tbody>
                  {pastShifts.filter(s=>!s.isActive).map(shift => {
                    const effort = shift.checkin?.effortRating ?? shift.stats?.effortRating ?? null;
                    // parse end snapshot for reconciliation status
                    let balanced = null;
                    if (shift.checkin?.additionalNotes) {
                      try {
                        const p = JSON.parse(shift.checkin.additionalNotes);
                        balanced = p.endSnapshot?.isBalanced ?? null;
                      } catch(_) {}
                    }
                    return (
                      <tr key={shift.id}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbfc'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ ...T.TD, fontWeight:'600' }}>{fmtDate(shift.startTime)}</td>
                        <td style={T.TD}>{fmtTime(shift.startTime)}</td>
                        <td style={T.TD}>{fmtTime(shift.endTime)}</td>
                        <td style={T.TD}><span style={{ display:'inline-block', padding:'3px 9px', background:'#f1f5f9', borderRadius:'6px', fontSize:'12px', fontWeight:'500', color:'#475569' }}>{shift.duration!=null?`${shift.duration} min`:'—'}</span></td>
                        <td style={{ ...T.TD, textAlign:'center', color:'#475569' }}>{shift.stats?.transactionCount??'—'}</td>
                        <td style={{ ...T.TD, textAlign:'center', fontWeight:'600', color:'#16a34a' }}>{shift.stats?`$${shift.stats.totalDeposits?.toLocaleString()}`:'—'}</td>
                        <td style={{ ...T.TD, textAlign:'center', fontWeight:'600', color:'#dc2626' }}>{shift.stats?`$${shift.stats.totalCashouts?.toLocaleString()}`:'—'}</td>
                        <td style={{ ...T.TD, textAlign:'center', fontWeight:'700', color:(shift.stats?.netProfit??0)>=0?'#16a34a':'#dc2626' }}>
                          {shift.stats?`$${shift.stats.netProfit?.toLocaleString()}`:'—'}
                        </td>
                        <td style={{ ...T.TD, textAlign:'center' }}>
                          {effort!=null ? <span style={{ fontWeight:'700', color:effort>=8?'#16a34a':effort>=5?'#d97706':'#dc2626' }}>{effort}/10</span> : '—'}
                        </td>
                        <td style={{ ...T.TD, textAlign:'center' }}>
                          {balanced===null ? '—' : balanced ? <span style={{ color:'#16a34a', fontWeight:'700' }}>✓</span> : <span style={{ color:'#dc2626', fontWeight:'700' }}>⚠️</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding:'60px 28px', textAlign:'center' }}>
              <div style={{ width:'52px', height:'52px', background:'#f1f5f9', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <Clock size={24} color="#cbd5e1"/>
              </div>
              <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:'600', color:'#475569' }}>No Past Shifts</p>
              <p style={{ margin:0, fontSize:'13px', color:'#94a3b8' }}>Completed shift reports appear here</p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </>
  );
};
