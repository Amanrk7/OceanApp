// components/FollowupTaskCards.jsx
// Handles PLAYER_FOLLOWUP and BONUS_FOLLOWUP task cards for members AND admin.
// Drop into MemberTasksSection.jsx and AdminTaskPage.jsx.

import { useState, useMemo } from 'react';
import {
  CheckCircle, Circle, ChevronDown, ChevronUp,
  UserCheck, Lock, Unlock, RefreshCw, Check, Undo2,
  AlertTriangle, Clock, DollarSign, TrendingUp, Users, Gift,
  User, X, ChevronRight,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem('authToken');
  const headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function extractUserId(currentUser) {
  if (!currentUser) return null;
  const raw = currentUser.id ?? currentUser.userId ?? currentUser.user?.id ?? null;
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

const C = {
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  gray: '#64748b', grayLt: '#94a3b8', slate: '#0f172a',
  sky: '#0ea5e9', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
  orange: '#ea580c', orangeLt: '#fff7ed', orangeBdr: '#fed7aa',
  violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
};

const CARD = {
  background: C.white, borderRadius: '14px',
  border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)',
};
const INPUT = {
  width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
  borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
  boxSizing: 'border-box', background: C.white, color: C.slate, outline: 'none',
};

function ProgressBar({ pct, color, thin }) {
  return (
    <div style={{ height: thin ? '5px' : '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 100 ? C.green : color, borderRadius: '999px', transition: 'width .3s' }} />
    </div>
  );
}

// ── Category chip ─────────────────────────────────────────────────────────────
function CategoryChip({ category }) {
  const cfg = category === 'HIGHLY_CRITICAL'
    ? { label: 'Highly Critical', bg: '#fffbeb', text: '#b45309', border: '#fde68a', emoji: '🟡' }
    : { label: 'Inactive',        bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', emoji: '🔴' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── Bonus type chip ───────────────────────────────────────────────────────────
function BonusTypeChip({ bonusType }) {
  const cfg = {
    streak  : { label: 'Streak Bonus',   bg: '#fffbeb', text: '#b45309', emoji: '🔥' },
    referral: { label: 'Referral Bonus', bg: '#f0fdf4', text: '#166534', emoji: '👥' },
    match   : { label: 'Match Bonus',    bg: '#eff6ff', text: '#1d4ed8', emoji: '💰' },
  }[bonusType] || { label: 'Bonus', bg: '#f1f5f9', text: '#475569', emoji: '🎁' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: cfg.bg, color: cfg.text }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── Claim status row ─────────────────────────────────────────────────────────
function ClaimStatus({ task, myId }) {
  const isClaimedByMe    = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
  const isCompleted      = task.status === 'COMPLETED';

  if (isCompleted)
    return <span style={{ fontSize: '11px', fontWeight: '600', color: C.green, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '11px', height: '11px' }} /> Completed</span>;
  if (isClaimedByMe)
    return <span style={{ fontSize: '11px', fontWeight: '600', color: C.orange, display: 'flex', alignItems: 'center', gap: '4px' }}><Lock style={{ width: '10px', height: '10px' }} /> Claimed by you</span>;
  if (isClaimedByOther)
    return <span style={{ fontSize: '11px', fontWeight: '600', color: C.gray, display: 'flex', alignItems: 'center', gap: '4px' }}><Lock style={{ width: '10px', height: '10px' }} /> Claimed by {task.assignedTo?.name || 'another member'}</span>;
  return <span style={{ fontSize: '11px', fontWeight: '600', color: C.orange, display: 'flex', alignItems: 'center', gap: '4px' }}><Unlock style={{ width: '10px', height: '10px' }} /> Open to claim</span>;
}

// ═══════════════════════════════════════════════════════════════
// PLAYER FOLLOWUP CARD (for members)
// ═══════════════════════════════════════════════════════════════
export function PlayerFollowupCard({ task, currentUser, onClaim, onUpdated }) {
  const [expanded, setExpanded]   = useState(true);
  const [claiming, setClaiming]   = useState(false);
  const [resolving, setResolving] = useState(false);
  const [undoing, setUndoing]     = useState(false);
  const [outcome, setOutcome]     = useState('');
  const [error, setError]         = useState('');

  const myId = extractUserId(currentUser);
  const meta = useMemo(() => { try { return JSON.parse(task.notes || '{}'); } catch { return {}; } }, [task.notes]);

  const checklist       = task.checklistItems || [];
  const doneCount       = checklist.filter(i => i.done).length;
  const pct             = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;
  const isClaimedByMe   = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isClaimedByOther= !!task.assignedToId && !isClaimedByMe;
  const isCompleted     = task.status === 'COMPLETED';
  const isHC            = meta.category === 'HIGHLY_CRITICAL';

  const handleClaim = async () => {
    setClaiming(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/${task.id}/claim`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim');
      onClaim(data.data);
    } catch (err) { setError(err.message); }
    finally { setClaiming(false); }
  };

  const handleResolve = async (fieldKey) => {
    setResolving(true); setError('');
    try {
      const completedItems = [...checklist.filter(i => i.done).map(i => i.fieldKey || i.id), fieldKey].filter(Boolean);
      const res  = await fetch(`${API}/tasks/${task.id}/resolve-followup`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ outcome, completedItems }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve');
      setOutcome('');
      onUpdated(data.data);
    } catch (err) { setError(err.message); }
    finally { setResolving(false); }
  };

  const handleUndo = async () => {
    setUndoing(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to undo');
      onUpdated(data.data);
    } catch (err) { setError(err.message); }
    finally { setUndoing(false); }
  };

  const borderColor = isCompleted ? C.greenBdr : isHC ? C.amberBdr : C.redBdr;
  const borderLeft  = isCompleted ? C.green : isHC ? C.amber : C.red;

  return (
    <div style={{ ...CARD, overflow: 'hidden', border: `1px solid ${borderColor}`, borderLeft: `4px solid ${borderLeft}`, opacity: isCompleted ? 0.85 : 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: isCompleted ? '#dcfce7' : isHC ? '#fffbeb' : '#fee2e2', border: `1px solid ${isCompleted ? C.greenBdr : isHC ? C.amberBdr : C.redBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
          {isCompleted ? '✅' : isHC ? '🟡' : '🔴'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: C.slate }}>{meta.playerName || 'Player'}</span>
            <span style={{ fontSize: '12px', color: C.grayLt }}>@{meta.username}</span>
            <CategoryChip category={meta.category} />
            {meta.tier && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: '#fef3c7', color: '#92400e' }}>{meta.tier}</span>}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: C.grayLt, flexWrap: 'wrap', marginBottom: '4px' }}>
            <span>Last deposit: <strong style={{ color: C.slate }}>{meta.lastDepositDate || 'Never'}</strong></span>
            <span>Balance: <strong style={{ color: C.green }}>${parseFloat(meta.balance || 0).toFixed(2)}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, maxWidth: '140px' }}><ProgressBar pct={pct} color={isHC ? C.amber : C.red} thin /></div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: isCompleted ? C.green : C.gray }}>{doneCount}/{checklist.length} steps</span>
            <ClaimStatus task={task} myId={myId} />
          </div>
        </div>
        {!isClaimedByOther && !isCompleted && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '7px', cursor: 'pointer', padding: '6px', color: C.gray, display: 'flex', flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
          </button>
        )}
      </div>

      {/* Body: open / claimable */}
      {expanded && !isCompleted && !isClaimedByOther && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Claim */}
          {!task.assignedToId && (
            <div style={{ padding: '14px', background: C.orangeLt, border: `1px solid ${C.orangeBdr}`, borderRadius: '10px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9a3412', lineHeight: '1.5' }}>
                <strong>Unclaimed.</strong> Claim to reach out to <strong>@{meta.username}</strong> and get them back to depositing.
              </p>
              <button onClick={handleClaim} disabled={claiming} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: claiming ? '#e2e8f0' : C.orange, color: claiming ? C.grayLt : '#fff', fontWeight: '700', fontSize: '13px', cursor: claiming ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                {claiming ? <><RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} /> Claiming…</> : <><UserCheck style={{ width: '13px', height: '13px' }} /> Claim This Player</>}
              </button>
            </div>
          )}

          {/* Checklist + resolve for claimer */}
          {isClaimedByMe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '12px 14px', background: '#fafafa', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>Followup Steps</div>
                {checklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '7px', background: item.done ? '#f0fdf4' : '#fafafa', border: `1px solid ${item.done ? C.greenBdr : C.border}`, marginBottom: '5px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${item.done ? C.green : '#cbd5e1'}`, background: item.done ? C.green : C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.done && <Check style={{ width: '10px', height: '10px', color: C.white }} />}
                    </div>
                    <span style={{ flex: 1, fontSize: '13px', color: item.done ? C.grayLt : C.slate, textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    {item.required && !item.done && <span style={{ fontSize: '10px', color: C.red }}>*req</span>}
                    {!item.done && (
                      <button onClick={() => handleResolve(item.fieldKey || item.id)} disabled={resolving} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: C.green, color: '#fff', fontSize: '11px', fontWeight: '700', cursor: resolving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {resolving ? '…' : 'Done ✓'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Outcome note */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>Outcome Note (optional)</label>
                <textarea
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  rows={2}
                  placeholder="What happened? e.g. Player confirmed deposit tomorrow, couldn't reach them, etc."
                  style={{ ...INPUT, resize: 'none', lineHeight: '1.5' }}
                />
              </div>
            </div>
          )}

          {error && <div style={{ padding: '10px 12px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', fontSize: '12px', color: C.red }}>⚠️ {error}</div>}
        </div>
      )}

      {/* Body: completed */}
      {isCompleted && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '10px 12px', background: '#f0fdf4', border: `1px solid ${C.greenBdr}`, borderRadius: '8px', fontSize: '12px', color: C.green, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            Followup completed for <strong>@{meta.username}</strong>.
            {meta.outcome && <span style={{ color: C.gray, marginLeft: '4px' }}> — {meta.outcome}</span>}
          </div>
          {(isClaimedByMe || !task.assignedToId) && (
            <button onClick={handleUndo} disabled={undoing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '12px', fontWeight: '700', cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {undoing ? <><RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 0.8s linear infinite' }} /> Undoing…</> : <><Undo2 style={{ width: '12px', height: '12px' }} /> Undo</>}
            </button>
          )}
          {error && <div style={{ padding: '10px 12px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', fontSize: '12px', color: C.red }}>⚠️ {error}</div>}
        </div>
      )}

      {/* Body: claimed by other */}
      {isClaimedByOther && !isCompleted && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px', color: C.gray, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock style={{ width: '13px', height: '13px', flexShrink: 0 }} />
            <strong>{task.assignedTo?.name}</strong> is working on this player.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BONUS FOLLOWUP CARD (for members)
// ═══════════════════════════════════════════════════════════════
export function BonusFollowupCard({ task, currentUser, onClaim, onUpdated }) {
  const [expanded, setExpanded]   = useState(true);
  const [claiming, setClaiming]   = useState(false);
  const [granting, setGranting]   = useState(false);
  const [undoing, setUndoing]     = useState(false);
  const [error, setError]         = useState('');

  const myId = extractUserId(currentUser);
  const meta = useMemo(() => { try { return JSON.parse(task.notes || '{}'); } catch { return {}; } }, [task.notes]);

  const checklist       = task.checklistItems || [];
  const doneCount       = checklist.filter(i => i.done).length;
  const isClaimedByMe   = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isClaimedByOther= !!task.assignedToId && !isClaimedByMe;
  const isCompleted     = task.status === 'COMPLETED';

  const handleClaim = async () => {
    setClaiming(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/${task.id}/claim`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim');
      onClaim(data.data);
    } catch (err) { setError(err.message); }
    finally { setClaiming(false); }
  };

  const handleMarkGranted = async () => {
    setGranting(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/${task.id}/resolve-followup`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ outcome: 'Bonus granted', completedItems: checklist.map(i => i.fieldKey || i.id) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onUpdated(data.data);
    } catch (err) { setError(err.message); }
    finally { setGranting(false); }
  };

  const handleUndo = async () => {
    setUndoing(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onUpdated(data.data);
    } catch (err) { setError(err.message); }
    finally { setUndoing(false); }
  };

  const bonusCfg = {
    streak  : { color: C.amber,  bg: '#fffbeb', bdr: C.amberBdr,  icon: '🔥', hint: 'Go to Bonuses → Grant streak bonus to this player.' },
    referral: { color: C.green,  bg: '#f0fdf4', bdr: C.greenBdr,  icon: '👥', hint: 'Go to Bonuses → Grant referral bonus to player and their referrer.' },
    match   : { color: C.sky,    bg: C.skyLt,   bdr: '#bae6fd',   icon: '💰', hint: 'Go to Bonuses → Grant match bonus (50%) for their recent deposit.' },
  }[meta.bonusType] || { color: C.violet, bg: C.violetLt, bdr: C.violetBdr, icon: '🎁', hint: 'Grant the bonus from the Bonuses page.' };

  return (
    <div style={{ ...CARD, overflow: 'hidden', border: `1px solid ${isCompleted ? C.greenBdr : bonusCfg.bdr}`, borderLeft: `4px solid ${isCompleted ? C.green : bonusCfg.color}`, opacity: isCompleted ? 0.85 : 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: isCompleted ? '#dcfce7' : bonusCfg.bg, border: `1px solid ${isCompleted ? C.greenBdr : bonusCfg.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
          {isCompleted ? '✅' : bonusCfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: C.slate }}>{meta.playerName}</span>
            <span style={{ fontSize: '12px', color: C.grayLt }}>@{meta.username}</span>
            <BonusTypeChip bonusType={meta.bonusType} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: C.gray, lineHeight: '1.5' }}>{meta.details}</p>
          {meta.eligibleAmount && (
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: bonusCfg.color }}>
              Eligible amount: ${parseFloat(meta.eligibleAmount).toFixed(2)}
            </p>
          )}
          <div style={{ marginTop: '4px' }}><ClaimStatus task={task} myId={myId} /></div>
        </div>
        {!isClaimedByOther && !isCompleted && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '7px', cursor: 'pointer', padding: '6px', color: C.gray, display: 'flex', flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
          </button>
        )}
      </div>

      {/* Body */}
      {expanded && !isCompleted && !isClaimedByOther && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Hint */}
          <div style={{ padding: '10px 14px', background: bonusCfg.bg, border: `1px solid ${bonusCfg.bdr}`, borderRadius: '8px', fontSize: '12px', color: bonusCfg.color }}>
            💡 <strong>How to resolve:</strong> {bonusCfg.hint}
          </div>

          {!task.assignedToId && (
            <button onClick={handleClaim} disabled={claiming} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: claiming ? '#e2e8f0' : bonusCfg.color, color: claiming ? C.grayLt : '#fff', fontWeight: '700', fontSize: '13px', cursor: claiming ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
              {claiming ? <><RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} /> Claiming…</> : <><UserCheck style={{ width: '13px', height: '13px' }} /> Claim & Handle This Bonus</>}
            </button>
          )}

          {isClaimedByMe && (
            <button onClick={handleMarkGranted} disabled={granting} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: granting ? '#e2e8f0' : C.green, color: granting ? C.grayLt : '#fff', fontWeight: '700', fontSize: '13px', cursor: granting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
              {granting ? <><RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Gift style={{ width: '13px', height: '13px' }} /> Mark Bonus as Granted ✓</>}
            </button>
          )}

          {error && <div style={{ padding: '10px 12px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', fontSize: '12px', color: C.red }}>⚠️ {error}</div>}
        </div>
      )}

      {isCompleted && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '10px 12px', background: '#f0fdf4', border: `1px solid ${C.greenBdr}`, borderRadius: '8px', fontSize: '12px', color: C.green, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> Bonus granted for <strong>@{meta.username}</strong>.
          </div>
          {(isClaimedByMe || !task.assignedToId) && (
            <button onClick={handleUndo} disabled={undoing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '12px', fontWeight: '700', cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {undoing ? 'Undoing…' : <><Undo2 style={{ width: '12px', height: '12px' }} /> Undo</>}
            </button>
          )}
        </div>
      )}

      {isClaimedByOther && !isCompleted && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px', color: C.gray }}>
            <Lock style={{ width: '13px', height: '13px', display: 'inline', marginRight: '5px' }} />
            <strong>{task.assignedTo?.name}</strong> is handling this bonus.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN FOLLOWUP PANEL (for AdminTaskPage)
// Shows summary + per-task assignment controls.
// ═══════════════════════════════════════════════════════════════
export function AdminFollowupPanel({ teamMembers = [], onTaskUpdated }) {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [generating, setGenerating] = useState({ player: false, bonus: false });
  const [assigning, setAssigning] = useState(null); // taskId
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [activeSection, setActiveSection] = useState('player'); // 'player' | 'bonus'

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/tasks/followup-summary`, { credentials: 'include', headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSummary(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const generate = async (type) => {
    setGenerating(g => ({ ...g, [type]: true })); setError(''); setSuccess('');
    try {
      const endpoint = type === 'player' ? 'generate-player-followup' : 'generate-bonus-followup';
      const res  = await fetch(`${API}/tasks/${endpoint}`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(data.message);
      load();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) { setError(err.message); }
    finally { setGenerating(g => ({ ...g, [type]: false })); }
  };

  const assign = async (taskId, memberId) => {
    setAssigning(taskId);
    try {
      const res  = await fetch(`${API}/tasks/${taskId}/assign`, { method: 'PATCH', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ assignedToId: memberId || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(data.message);
      load();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) { setError(err.message); }
    finally { setAssigning(null); }
  };

  // Load on mount
  useState(() => { load(); }, []);

  const tasks = activeSection === 'player'
    ? (summary?.playerFollowup?.tasks || [])
    : (summary?.bonusFollowup?.tasks  || []);

  const parseMeta = t => { try { return JSON.parse(t.notes || '{}'); } catch { return {}; } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header + generate buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => { load(); if (onTaskUpdated) onTaskUpdated(); }} disabled={loading} style={{ padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: '8px', background: C.white, color: C.gray, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => generate('player')} disabled={generating.player} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: generating.player ? '#e2e8f0' : C.amber, color: generating.player ? C.grayLt : '#fff', fontSize: '12px', fontWeight: '700', cursor: generating.player ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {generating.player ? '⏳ Generating…' : '🔄 Generate Player Tasks'}
          </button>
          <button onClick={() => generate('bonus')} disabled={generating.bonus} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: generating.bonus ? '#e2e8f0' : C.green, color: generating.bonus ? C.grayLt : '#fff', fontSize: '12px', fontWeight: '700', cursor: generating.bonus ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {generating.bonus ? '⏳ Generating…' : '🔄 Generate Bonus Tasks'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '10px 14px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', fontSize: '13px', color: C.red }}>⚠️ {error}</div>}
      {success && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: `1px solid ${C.greenBdr}`, borderRadius: '8px', fontSize: '13px', color: C.green }}>✓ {success}</div>}

      {/* Summary stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { label: 'Player Tasks', value: summary.playerFollowup.total, sub: `${summary.playerFollowup.unclaimed} unclaimed`, color: C.amber, onClick: () => setActiveSection('player') },
            { label: 'HC Players', value: summary.playerFollowup.hc, sub: 'Highly critical', color: C.orange, onClick: () => setActiveSection('player') },
            { label: 'Inactive', value: summary.playerFollowup.inactive, sub: 'No deposit 7d+', color: C.red, onClick: () => setActiveSection('player') },
            { label: 'Bonus Tasks', value: summary.bonusFollowup.total, sub: `${summary.bonusFollowup.unclaimed} unclaimed`, color: C.green, onClick: () => setActiveSection('bonus') },
            { label: 'Streak', value: summary.bonusFollowup.streak, sub: 'Bonus eligible', color: C.amber, onClick: () => setActiveSection('bonus') },
            { label: 'Referral', value: summary.bonusFollowup.referral, sub: 'Not granted', color: C.violet, onClick: () => setActiveSection('bonus') },
            { label: 'Match', value: summary.bonusFollowup.match, sub: 'Recent deposits', color: C.sky, onClick: () => setActiveSection('bonus') },
          ].map(({ label, value, sub, color, onClick }) => (
            <div key={label} onClick={onClick} style={{ padding: '12px 14px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '10px', cursor: 'pointer', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.slate, marginTop: '2px' }}>{label}</div>
              <div style={{ fontSize: '10px', color: C.grayLt, marginTop: '1px' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: 'player', label: `Player Followup (${summary?.playerFollowup?.total ?? 0})` },
          { id: 'bonus',  label: `Bonus Followup (${summary?.bonusFollowup?.total ?? 0})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{ padding: '8px 16px', border: 'none', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: activeSection === tab.id ? C.white : 'transparent', color: activeSection === tab.id ? C.slate : C.grayLt, borderBottom: `2px solid ${activeSection === tab.id ? C.slate : 'transparent'}` }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list with assignment controls */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: C.grayLt, fontSize: '13px' }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: C.grayLt, fontSize: '13px' }}>
          No open {activeSection === 'player' ? 'player followup' : 'bonus followup'} tasks. Click "Generate" to create them.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tasks.map(task => {
            const meta = parseMeta(task);
            const isAssigning = assigning === task.id;
            return (
              <div key={task.id} style={{ padding: '12px 16px', background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${task.priority === 'HIGH' ? C.red : C.amber}`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: C.slate, marginBottom: '2px' }}>
                    {activeSection === 'player'
                      ? <><span style={{ marginRight: '6px' }}>{meta.category === 'HIGHLY_CRITICAL' ? '🟡' : '🔴'}</span>{meta.playerName} <span style={{ color: C.grayLt, fontWeight: '400' }}>@{meta.username}</span></>
                      : <><span style={{ marginRight: '6px' }}>{meta.bonusType === 'streak' ? '🔥' : meta.bonusType === 'referral' ? '👥' : '💰'}</span>{meta.playerName} <span style={{ color: C.grayLt, fontWeight: '400' }}>@{meta.username}</span></>
                    }
                  </div>
                  <div style={{ fontSize: '11px', color: C.grayLt }}>
                    {activeSection === 'player'
                      ? `Last deposit: ${meta.lastDepositDate || 'Never'} · Balance: $${parseFloat(meta.balance || 0).toFixed(2)}`
                      : meta.details
                    }
                  </div>
                </div>

                {/* Assignee chip */}
                <div style={{ fontSize: '12px', color: task.assignedToId ? C.sky : C.grayLt, whiteSpace: 'nowrap' }}>
                  {task.assignedToId ? `→ ${task.assignedTo?.name || `#${task.assignedToId}`}` : 'Unassigned'}
                </div>

                {/* Assignment dropdown */}
                <select
                  value={task.assignedToId || ''}
                  onChange={e => assign(task.id, e.target.value ? parseInt(e.target.value) : null)}
                  disabled={isAssigning}
                  style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', background: C.white, color: C.slate, minWidth: '130px' }}
                >
                  <option value="">Open to all</option>
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>

                {isAssigning && <RefreshCw style={{ width: '13px', height: '13px', color: C.grayLt, animation: 'spin 0.8s linear infinite' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
