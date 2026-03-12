/**
 * MissingPlayersPage.jsx  — fixes:
 *  1. Accurate data  — threshold bumped, backend already filters non-missing players
 *  2. HIGHLY CRITICAL at 3+ missing, CRITICAL at 2 missing (display only)
 *  3. Only players with ≥1 missing field shown (backend + frontend guard)
 *  4. Edit → auto-syncs task via SSE; undo button on completed task
 *  5. Edit button locked: admin always; member only if they own the task
 */

import { useState, useEffect, useRef, useCallback, useContext } from "react";

import {
  AlertTriangle, Search, RefreshCw,
  Phone, Mail, Camera, Instagram, Send, Users, X,
  ClipboardList, CheckCircle2, ChevronDown, ShieldCheck,
  UserCheck, Clock, AlertCircle, CheckCircle, Edit2, Save, User,
  Loader2, Undo2, Lock,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShiftStatusContext } from "../Context/membershiftStatus";

import { api } from '../api';

// ─── Config ────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// 2 missing = CRITICAL (orange badge)
// 3+ missing = HIGHLY CRITICAL (red badge)
const CRITICAL_THRESHOLD = 2;
const HIGH_CRITICAL_THRESHOLD = 3;

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const ICheck = () => <Ico d="M20 6L9 17l-5-5" />;
const IAlert = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const IPlus = () => <Ico d="M12 5v14M5 12h14" />;
const IX = () => <Ico d="M18 6L6 18M6 6l12 12" />;
const IUser = () => <Ico d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']} />;
const ILock = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;
const IMail = () => <Ico d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6']} />;
const IPhone = () => <Ico d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IUsers = () => <Ico d={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z']} />;
const IShield = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IWarn = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={13} />;
const C = {
  sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
  violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
  slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};
const LABEL = {
  display: "block", fontSize: "11px", fontWeight: "700",
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const INPUT = {
  width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
  borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};

const CONTACT_FIELD_META = {
  email: { icon: Mail, label: 'Email', color: '#3b82f6', bg: '#eff6ff' },
  phone: { icon: Phone, label: 'Phone', color: '#8b5cf6', bg: '#f5f3ff' },
  snapchat: { icon: Camera, label: 'Snapchat', color: '#eab308', bg: '#fefce8' },
  instagram: { icon: Instagram, label: 'Instagram', color: '#ec4899', bg: '#fdf2f8' },
  telegram: { icon: Send, label: 'Telegram', color: '#0ea5e9', bg: '#f0f9ff' },
};
const CONTACT_KEYS = Object.keys(CONTACT_FIELD_META);

// ─── Pure helpers ──────────────────────────────────────────────
function getMissingContactFields(player) {
  return CONTACT_KEYS.filter(key => {
    const val = player[key];
    return !val || String(val).trim() === '';
  });
}
function isAdminRole(role) { return ['ADMIN', 'SUPER_ADMIN'].includes(role); }
function isMemberRole(role) { return ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'].includes(role); }
function authHeaders(json = false) {
  const token = localStorage.getItem('authToken');
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
function getTaskPlayerId(task) {
  if (!task) return null;
  if (task.playerId) return String(task.playerId);
  if (task.targetPlayerId) return String(task.targetPlayerId);
  if (task.player?.id) return String(task.player.id);
  try { const m = JSON.parse(task.notes || '{}'); if (m.playerId) return String(m.playerId); } catch { }
  const m = String(task.description || '').match(/player[_ ]?id[:\s]+(\d+)/i);
  return m ? m[1] : null;
}

// ─── Avatar ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#dc2626', '#fff'], ['#ea580c', '#fff'], ['#ca8a04', '#fff'], ['#16a34a', '#fff'],
  ['#0891b2', '#fff'], ['#2563eb', '#fff'], ['#7c3aed', '#fff'], ['#db2777', '#fff'],
];
function Avatar({ name, size = 40 }) {
  const idx = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[idx];
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function TierBadge({ tier }) {
  const map = {
    GOLD: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    SILVER: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    BRONZE: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  };
  const s = map[tier] || { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {tier || 'N/A'}
    </span>
  );
}

function FieldChip({ field }) {
  const meta = CONTACT_FIELD_META[field];
  if (!meta) return null;
  const { icon: Icon, label, color, bg } = meta;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: bg, color, border: `1px solid ${color}30` }}>
      <Icon style={{ width: 10, height: 10 }} /> {label}
    </span>
  );
}

// ─── Inline Admin Assign Dropdown ──────────────────────────────
function InlineAdminAssign({ player, task, teamMembers, onAssigned, assigning }) {
  const isDone = ['COMPLETED', 'DONE'].includes(task?.status);
  const currentValue = (!task?.assignToAll && task?.assignedToId) ? String(task.assignedToId) : '';
  const currentName = task?.assignedTo?.name || task?.assignedTo?.username;

  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
        Assign to member
      </div>
      <div style={{ position: 'relative' }}>
        <select
          value={currentValue}
          onChange={e => onAssigned(player, e.target.value || null)}
          disabled={assigning || isDone}
          style={{
            width: '100%', padding: '8px 28px 8px 10px',
            border: `1.5px solid ${currentValue ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 8, fontSize: 12, fontFamily: 'inherit', appearance: 'none',
            background: currentValue ? '#f0fdf4' : '#fff',
            color: currentValue ? '#166534' : '#374151',
            outline: 'none', cursor: assigning || isDone ? 'not-allowed' : 'pointer',
            opacity: isDone ? 0.6 : 1, boxSizing: 'border-box',
          }}
        >
          <option value="">— Assign to member —</option>
          {teamMembers.map(m => (
            <option key={m.id} value={String(m.id)}>
              {m.name || m.username} ({m.role})
            </option>
          ))}
        </select>
        {assigning
          ? <Loader2 style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#94a3b8', animation: 'spin 0.8s linear infinite' }} />
          : <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#94a3b8', pointerEvents: 'none' }} />
        }
      </div>
      {task && (
        <div style={{
          marginTop: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          color: isDone ? '#16a34a' : task.assignToAll ? '#2563eb' : '#7c3aed'
        }}>
          {isDone
            ? <><CheckCircle2 style={{ width: 10, height: 10 }} /> Task completed</>
            : task.assignToAll
              ? <><ClipboardList style={{ width: 10, height: 10 }} /> Open to all members</>
              : <><ClipboardList style={{ width: 10, height: 10 }} /> Task active → {currentName || 'assigned'}</>
          }
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────
function EditModal({ player, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: player.name || '', email: player.email || '', phone: player.phone || '',
    snapchat: player.snapchat || '', instagram: player.instagram || '', telegram: player.telegram || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await api.players.updatePlayer(player.id, {
        name: form.name || undefined,
        email: form.email || null,
        phone: form.phone || null,
        snapchat: form.snapchat || null,
        instagram: form.instagram || null,
        telegram: form.telegram || null,
      });
      setDone(true);
      setTimeout(() => onSaved({ ...player, ...form, ...(res?.data || {}) }), 700);
    } catch (e) { setErr(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'telegram', label: 'Telegram', type: 'text' },
    { key: 'instagram', label: 'Instagram', type: 'text' },
    { key: 'snapchat', label: 'Snapchat', type: 'text' },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Edit Player</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>@{player.username}</p>
          </div>
          <button onClick={onClose} style={S.iconBtn}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          {FIELDS.map(f => {
            const isMissing = CONTACT_KEYS.includes(f.key) && (!player[f.key] || !String(player[f.key]).trim());
            const meta = CONTACT_FIELD_META[f.key];
            const Icon = meta?.icon;
            return (
              <div key={f.key}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
                  {Icon && <Icon style={{ width: 11, height: 11, color: meta.color }} />}
                  {f.label}
                  {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                  {isMissing && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4 }}>MISSING</span>}
                </label>
                <input type={f.type} value={form[f.key]} onChange={set(f.key)}
                  placeholder={`Enter ${f.label.toLowerCase()}…`}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${isMissing ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: isMissing ? '#fff5f5' : '#fff' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = isMissing ? '#fca5a5' : '#e2e8f0'}
                />
              </div>
            );
          })}
          {err && <div style={S.errBox}>⚠️ {err}</div>}
          {done && <div style={S.okBox}>✅ Updated! Task synced automatically.</div>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={S.cancelBtn}>Cancel</button>
          <button onClick={save} disabled={saving || done} style={{ ...S.primaryBtn, background: saving || done ? '#e2e8f0' : '#0ea5e9', color: saving || done ? '#94a3b8' : '#fff' }}>
            <Save style={{ width: 14, height: 14 }} />
            {saving ? 'Saving…' : done ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Player Card ───────────────────────────────────────────────
function PlayerCard({
  player, onEdit, onInlineAssign, onClaim, onUndoTask,
  userRole, task, claimingId, assigningId, undoingId, teamMembers, currentUserId,
}) {
  const missing = getMissingContactFields(player);
  const isCritical = missing.length >= CRITICAL_THRESHOLD;
  const isHighCritical = missing.length >= HIGH_CRITICAL_THRESHOLD;
  const isAdmin = isAdminRole(userRole);
  const isMember = isMemberRole(userRole);
  const claiming = claimingId === player.id;
  const assigning = assigningId === player.id;
  const undoing = undoingId === player.id;

  const isDone = ['COMPLETED', 'DONE'].includes(task?.status);
  const isOpenToAll = !!task && (task.assignToAll === true || !task.assignedToId);
  const isAssigned = !!task && !!task.assignedToId && !task.assignToAll;
  const assignedName = task?.assignedTo?.name || task?.assignedTo?.username;
  const isClaimedByMe = isAssigned && currentUserId && String(task.assignedToId) === String(currentUserId);
  const isClaimedByOther = isAssigned && !isClaimedByMe;

  // ── Edit permission: admin always; member only if they own the task ──
  const canEdit = isAdmin || (isMember && isClaimedByMe);

  const canClaim = isMember && !isDone && !isClaimedByOther && missing.length > 0;

  return (
    <div style={{
      borderRadius: 14, padding: 16, boxSizing: 'border-box',
      border: isDone
        ? '2px solid #86efac'
        : isHighCritical ? '2px solid #ef4444'
          : isCritical ? '1.5px solid #fca5a5'
            : '1px solid #e2e8f0',
      background: isDone ? '#f0fdf4' : isHighCritical ? '#fff5f5' : isCritical ? '#fffbfb' : '#fff',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Row 1: Avatar + name + tier */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={player.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, wordBreak: 'break-word' }}>{player.name || 'Unnamed'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>@{player.username || '—'}</div>
        </div>
        <TierBadge tier={player.tier} />
      </div>

      {/* Critical badge — only show HIGHLY CRITICAL at 3+ */}
      {isHighCritical && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, alignSelf: 'flex-start' }}>
          <AlertTriangle style={{ width: 10, height: 10 }} /> HIGHLY CRITICAL
        </div>
      )}
      {isCritical && !isHighCritical && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 800, alignSelf: 'flex-start' }}>
          <AlertTriangle style={{ width: 10, height: 10 }} /> CRITICAL
        </div>
      )}

      {/* Missing fields */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
          Missing Fields ({missing.length})
        </div>
        {missing.length === 0
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
            <CheckCircle style={{ width: 11, height: 11 }} /> All contact info present
          </span>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {missing.map(f => <FieldChip key={f} field={f} />)}
          </div>
        }
      </div>

      {/* Task completed banner + undo */}
      {isDone && (
        <div style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 style={{ width: 13, height: 13 }} /> Task completed
          </span>
          {(isAdmin || isClaimedByMe) && (
            <button
              onClick={() => onUndoTask(player, task)}
              disabled={undoing}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#fff', fontSize: 11, fontWeight: 700, color: '#16a34a', cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {undoing
                ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 0.8s linear infinite' }} />
                : <Undo2 style={{ width: 11, height: 11 }} />
              }
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── ADMIN: inline assign dropdown ── */}
      {isAdmin && (
        <InlineAdminAssign
          player={player}
          task={task}
          teamMembers={teamMembers}
          onAssigned={onInlineAssign}
          assigning={assigning}
        />
      )}

      {/* ── MEMBER: claim / status ── */}
      {isMember && !isDone && (
        <div>
          {isClaimedByMe ? (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 600, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 5 }}>
              <ClipboardList style={{ width: 11, height: 11 }} /> You're working on this task
            </div>
          ) : isClaimedByOther ? (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Lock style={{ width: 11, height: 11 }} /> Claimed by {assignedName || 'another member'}
            </div>
          ) : canClaim ? (
            <button
              onClick={() => onClaim(player, task)}
              disabled={claiming}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', cursor: claiming ? 'not-allowed' : 'pointer',
                background: claiming ? '#e2e8f0' : 'linear-gradient(135deg,#10b981,#059669)',
                color: claiming ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'inherit', boxShadow: claiming ? 'none' : '0 2px 10px #10b98135',
              }}
            >
              {claiming
                ? <><Loader2 style={{ width: 12, height: 12, animation: 'spin 0.8s linear infinite' }} /> Claiming…</>
                : <><UserCheck style={{ width: 12, height: 12 }} /> Claim This Player</>
              }
            </button>
          ) : missing.length === 0 ? null : (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock style={{ width: 10, height: 10 }} /> Awaiting task assignment
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Added {new Date(player.createdAt).toLocaleDateString()}</span>

        {/* Edit button: admin always, member only if they own the task */}
        {canEdit ? (
          <button onClick={() => onEdit(player)} style={{ ...S.btn, background: '#fff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
            <Edit2 style={{ width: 10, height: 10 }} /> Edit
          </button>
        ) : isMember && !isClaimedByMe && (
          <span style={{ fontSize: 10, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Lock style={{ width: 9, height: 9 }} /> Claim to edit
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon: Icon, highlight }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, background: bg, border: `1px solid ${color}25`, outline: highlight ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <Icon style={{ width: 15, height: 15, color, opacity: 0.7 }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 5 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function MissingPlayersPage() {
  const { shiftActive } = useContext(ShiftStatusContext);
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editTarget, setEditTarget] = useState(null);
  const [tasks, setTasks] = useState({});         // String(playerId) → task
  const [teamMembers, setTeamMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [undoingId, setUndoingId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const sseRef = useRef(null);



  // ── Current user ──────────────────────────────────────────────
  useEffect(() => {
    api.auth.getUser()
      .then(res => {
        const u = res?.data || res?.user || res;
        setUserRole(u?.role || null);
        setCurrentUserId(u?.id ? String(u.id) : null);
      })
      .catch(() => { });

    api.tasks.getTeamMembers()
      .then(res => setTeamMembers(res?.data || res || []))
      .catch(() => { });
  }, []);

  // ── Load players ──────────────────────────────────────────────
  const loadPlayers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.players.getMissingInfo(true);
      // Backend already filters to players with ≥1 missing field
      const list = res?.data || res?.players || res || [];
      setPlayers(Array.isArray(list) ? list.filter(p => getMissingContactFields(p).length > 0) : []);
      setLastRefresh(new Date());
    } catch (e) {
      if (!silent) setError(e.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load MISSING_INFO tasks ───────────────────────────────────
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks?taskType=MISSING_INFO`, { credentials: 'include', headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const list = data?.data || [];
      const map = {};
      list.forEach(task => { const pid = getTaskPlayerId(task); if (pid) map[pid] = task; });
      setTasks(map);
    } catch { }
  }, []);

  useEffect(() => { loadPlayers(); loadTasks(); }, [loadPlayers, loadTasks, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { loadPlayers(true); loadTasks(); }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadPlayers, loadTasks]);

  // ── SSE (real-time updates from task sync + player edits) ─────
  useEffect(() => {
    try {
      const es = api.tasks.connectSSE();
      sseRef.current = es;
      const onUpdate = () => { loadPlayers(true); loadTasks(); };
      es.onmessage = e => {
        try {
          const { type, data } = JSON.parse(e.data);
          if (['task_created', 'task_updated', 'task_deleted'].includes(type)) {
            // Optimistic task update in map
            if (type === 'task_updated' && data) {
              const pid = getTaskPlayerId(data);
              if (pid) setTasks(prev => ({ ...prev, [pid]: data }));
            }
            if (type === 'task_deleted' && data?.id) {
              setTasks(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { if (next[k]?.id === data.id) delete next[k]; });
                return next;
              });
            }
            loadTasks();
          }
          if (type === 'player_updated') {
            loadPlayers(true);
          }
        } catch { }
      };
      es.onerror = () => { };
    } catch { }
    return () => sseRef.current?.close();
  }, [loadPlayers, loadTasks]);

  // ── ADMIN: inline assign ──────────────────────────────────────
  const handleInlineAssign = useCallback(async (player, memberId) => {
    setAssigningId(player.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/players/${player.id}/assign-missing-info-task`, {
        method: 'POST', credentials: 'include', headers: authHeaders(true),
        body: JSON.stringify({ assignedToId: memberId ? parseInt(memberId, 10) : null, priority: 'HIGH' }),
      });
      const data = await res.json();
      if (res.status === 409) { if (data.existingTaskId) await loadTasks(); return; }
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to assign task');
      const task = data.data || data.task || data;
      const pid = getTaskPlayerId(task) || String(player.id);
      setTasks(prev => ({ ...prev, [pid]: task }));
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigningId(null);
    }
  }, [loadTasks]);

  // ── MEMBER: claim ─────────────────────────────────────────────
  const handleClaim = useCallback(async (player, task) => {
    if (!currentUserId) return;
    setClaimingId(player.id);
    setError(null);
    try {
      if (task?.id) {
        const res = await fetch(`${API_BASE}/tasks/${task.id}/claim`, { method: 'POST', credentials: 'include', headers: authHeaders(true) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to claim task');
        const updated = { ...(data.data || data.task || data), assignToAll: false, assignedToId: parseInt(currentUserId) };
        setTasks(prev => ({ ...prev, [String(player.id)]: updated }));
      } else {
        const res = await fetch(`${API_BASE}/players/${player.id}/assign-missing-info-task`, {
          method: 'POST', credentials: 'include', headers: authHeaders(true),
          body: JSON.stringify({ assignedToId: parseInt(currentUserId), priority: 'MEDIUM' }),
        });
        const data = await res.json();
        if (res.status === 409) { await loadTasks(); return; }
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to claim');
        const newTask = data.data || data.task || data;
        const pid = getTaskPlayerId(newTask) || String(player.id);
        setTasks(prev => ({ ...prev, [pid]: newTask }));
      }
      setTimeout(loadTasks, 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setClaimingId(null);
    }
  }, [currentUserId, loadTasks]);

  // ── Undo task completion ──────────────────────────────────────
  const handleUndoTask = useCallback(async (player, task) => {
    if (!task?.id) return;
    setUndoingId(player.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/undo-completion`, {
        method: 'POST', credentials: 'include', headers: authHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to undo task');
      const updated = data.data || data.task || data;
      const pid = getTaskPlayerId(updated) || String(player.id);
      setTasks(prev => ({ ...prev, [pid]: updated }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUndoingId(null);
    }
  }, []);

  // ── Edit saved ────────────────────────────────────────────────
  // Backend PATCH already syncs the task and broadcasts via SSE,
  // so the task state updates automatically via the SSE listener above.
  const handleSaved = useCallback((updated) => {
    setEditTarget(null);
    setPlayers(prev => {
      // If all fields now filled, remove from list
      const missing = getMissingContactFields(updated);
      if (missing.length === 0) return prev.filter(p => p.id !== updated.id);
      return prev.map(p => p.id !== updated.id ? p : { ...p, ...updated });
    });
  }, []);

  // ── Stats (based on what's visible) ──────────────────────────
  const stats = {
    total: players.length,
    highCritical: players.filter(p => getMissingContactFields(p).length >= HIGH_CRITICAL_THRESHOLD).length,
    critical: players.filter(p => getMissingContactFields(p).length >= CRITICAL_THRESHOLD).length,
    misSnap: players.filter(p => getMissingContactFields(p).includes('snapchat')).length,
    misPhone: players.filter(p => getMissingContactFields(p).includes('phone')).length,
    misEmail: players.filter(p => getMissingContactFields(p).includes('email')).length,
    unassigned: players.filter(p => !tasks[String(p.id)]).length,
  };

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = players.filter(p => {
    const missing = getMissingContactFields(p);
    const q = search.toLowerCase();
    const matchSearch =
      !q || p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
        filter === 'highcritical' ? missing.length >= HIGH_CRITICAL_THRESHOLD :
          filter === 'critical' ? missing.length >= CRITICAL_THRESHOLD :
            filter === 'unassigned' ? !tasks[String(p.id)] :
              CONTACT_KEYS.includes(filter) ? missing.includes(filter) : true;
    return matchSearch && matchFilter;
  });

  const isAdmin = isAdminRole(userRole);
  const isMember = isMemberRole(userRole);

  const FILTERS = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'highcritical', label: '🔴 Highly Critical', count: stats.highCritical },
    { id: 'critical', label: '🟠 Critical', count: stats.critical },
    { id: 'snapchat', label: 'Snapchat', count: stats.misSnap },
    { id: 'phone', label: 'Phone', count: stats.misPhone },
    { id: 'email', label: 'Email', count: stats.misEmail },
    { id: 'unassigned', label: 'Unassigned', count: stats.unassigned },
  ];

  if (!shiftActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Breadcrumb */}
        {/* <Breadcrumb /> */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', background: 'none' }}>
          <button onClick={() => navigate('/shifts')} style={{
            padding: '9px 18px',
            background: 'rgb(14, 165, 233)',
            color: 'rgb(255, 255, 255)'
          }}
          >
            Start Shift
          </button>
        </nav>


        <div style={{ padding: '14px 18px', background: C.amberLt, borderLeft: `4px solid ${C.amber}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <IAlert />
          <div>
            <p style={{ fontWeight: '700', color: '#78350f', margin: '0 0 2px', fontSize: '14px' }}>Shift Required</p>
            <p style={{ color: '#92400e', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>You must have an active shift to look for daily checkups.</p>
          </div>
        </div>
        <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '60px 28px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: C.amberLt, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `1px solid ${C.amberBdr}` }}>
            <ILock />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: '#78350f' }}>Form Locked</p>
          <p style={{ margin: 0, fontSize: '13px', color: C.amber }}>Go to Shifts and start your shift first.</p>
        </div>
      </div >
    );
  }



  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={S.pageIcon}><AlertTriangle style={{ width: 20, height: 20, color: '#dc2626' }} /></div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Missing Player Info</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Players with incomplete contact details</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {userRole && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: isAdmin ? '#fef3c7' : '#eff6ff', border: `1px solid ${isAdmin ? '#fde68a' : '#bfdbfe'}` }}>
              <ShieldCheck style={{ width: 12, height: 12, color: isAdmin ? '#92400e' : '#1d4ed8' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? '#92400e' : '#1d4ed8' }}>{isAdmin ? 'Admin' : userRole} View</span>
            </div>
          )}
          <div onClick={() => setAutoRefresh(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', background: autoRefresh ? '#dcfce7' : '#fff', userSelect: 'none' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: autoRefresh ? '#22c55e' : '#cbd5e1', boxShadow: autoRefresh ? '0 0 5px #22c55e' : 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: autoRefresh ? '#166534' : '#64748b' }}>Live {autoRefresh ? 'ON' : 'OFF'}</span>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} style={S.refreshBtn}>
            <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <span style={{ fontSize: 10, color: '#cbd5e1' }}>{lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <StatCard label="Total (Missing Info)" value={stats.total} color="#64748b" bg="#f8fafc" icon={Users} />
        <StatCard label="Highly Critical (3+)" value={stats.highCritical} color="#dc2626" bg="#fff1f2" icon={AlertTriangle} highlight={stats.highCritical > 0} />
        <StatCard label="Critical (2+ missing)" value={stats.critical} color="#f97316" bg="#fff7ed" icon={AlertCircle} highlight={stats.critical > 0} />
        <StatCard label="Missing Snapchat" value={stats.misSnap} color="#eab308" bg="#fefce8" icon={Camera} />
        <StatCard label="Missing Phone" value={stats.misPhone} color="#8b5cf6" bg="#f5f3ff" icon={Phone} />
        <StatCard label="Missing Email" value={stats.misEmail} color="#3b82f6" bg="#eff6ff" icon={Mail} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><X style={{ width: 13, height: 13 }} /></button>
        </div>
      )}

      {/* Role hints */}
      {isAdmin && (
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 10 }}>
          💡 <strong>Admin:</strong> Assign players using the dropdown. Only the assigned member can edit that player's info. Use <strong>Undo</strong> to reopen completed tasks.
        </div>
      )}
      {isMember && (
        <div style={{ padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0369a1', marginBottom: 10 }}>
          💡 Click <strong>Claim This Player</strong> to take ownership — then you can edit their missing info. Saving auto-completes the task in your dashboard.
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or username…"
          style={{ width: '100%', padding: '11px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === f.id ? 'rgb(14, 165, 233)' : '#f8fafc', color: filter === f.id ? '#fff' : '#64748b' }}>
            {f.label}{f.count > 0 ? <span style={{ opacity: 0.65, marginLeft: 4 }}>{f.count}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        Showing {filtered.length} of {players.length} players with missing info
        {filter !== 'all' && <span style={{ color: '#ef4444', marginLeft: 6 }}>• filtered</span>}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={S.empty}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#ef4444', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading players…
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          {search || filter !== 'all'
            ? 'No players match your filters.'
            : <><CheckCircle style={{ width: 34, height: 34, color: '#22c55e', display: 'block', margin: '0 auto 10px' }} />All contact info is complete!</>
          }
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={setEditTarget}
              onInlineAssign={handleInlineAssign}
              onClaim={handleClaim}
              onUndoTask={handleUndoTask}
              userRole={userRole}
              task={tasks[String(player.id)] || null}
              claimingId={claimingId}
              assigningId={assigningId}
              undoingId={undoingId}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {editTarget && <EditModal player={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────
const S = {
  page: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 1400, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  pageIcon: { width: 44, height: 44, borderRadius: 12, background: '#fff1f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 14 },
  btn: { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 },
  cancelBtn: { flex: 1, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' },
  primaryBtn: { flex: 2, padding: 10, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' },
  errBox: { padding: '10px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 12, color: '#dc2626' },
  okBox: { padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#16a34a' },
};



