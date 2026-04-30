import { useState, useEffect, useRef, useCallback, useContext } from "react";
import {
  AlertTriangle, Search, RefreshCw,
  Phone, Mail, Camera, Instagram, Send, Users, X,
  ClipboardList, CheckCircle2, ChevronDown, ShieldCheck,
  UserCheck, Clock, AlertCircle, CheckCircle, Edit2, Save,
  Loader2, Undo2, Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { api } from '../api';

// ─── Config ────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CRITICAL_THRESHOLD = 2;
const HIGH_CRITICAL_THRESHOLD = 3;

// ─── Shared style constants ─────────────────────────────────────
const CARD_STYLE = {
  background: "var(--color-cards)",
  borderRadius: "14px",
  border: "1px solid var(--color-border)",
  boxShadow: "0 2px 12px var(--color-shadow)",
};

const INPUT_STYLE = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "13px",
  fontFamily: "inherit",
  boxSizing: "border-box",
  background: "var(--color-input-bg)",
  color: "var(--color-text)",
  outline: "none",
};

const SELECT_STYLE = {
  ...INPUT_STYLE,
  paddingRight: "32px",
  appearance: "none",
  cursor: "pointer",
};

// ─── Helpers ────────────────────────────────────────────────────
const CONTACT_FIELD_META = {
  email: { icon: Mail, label: 'Email', color: '#3b82f6', bg: '#eff6ff' },
  phone: { icon: Phone, label: 'Phone', color: '#8b5cf6', bg: '#f5f3ff' },
  snapchat: { icon: Camera, label: 'Snapchat', color: '#eab308', bg: '#fefce8' },
  instagram: { icon: Instagram, label: 'Instagram', color: '#ec4899', bg: '#fdf2f8' },
  telegram: { icon: Send, label: 'Telegram', color: '#0ea5e9', bg: '#f0f9ff' },
};
const CONTACT_KEYS = Object.keys(CONTACT_FIELD_META);

// ✅ FIX 1: Restored getMissingContactFields — was removed during refactor
// but is still referenced throughout the component.
function getMissingContactFields(player) {
  return CONTACT_KEYS.filter(key => {
    // If player explicitly marked this field N/A, it's not "missing"
    if ((player.noAccountOn || []).includes(key)) return false;
    const val = player[key];
    return !val || String(val).trim() === '';
  });
}

function getNAFields(player) {
  return (player.noAccountOn || []).filter(k => CONTACT_KEYS.includes(k));
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

// ─── User-friendly error messages ────────────────────────────────
// Maps technical error strings to plain English for admins/members.
const FRIENDLY_ERRORS = {
  'getMissingContactFields is not defined': 'Page failed to load player data. Please refresh.',
  'Failed to fetch': 'Cannot reach the server. Check your internet connection and try again.',
  'NetworkError': 'Network issue — please check your connection.',
  '401': 'Your session has expired. Please log out and log in again.',
  '403': 'You don\'t have permission to do that.',
  '404': 'That player or task no longer exists. Try refreshing.',
  '409': 'This task has already been assigned to someone.',
  '500': 'Something went wrong on the server. Try again in a moment.',
  'Task is not completed': 'This task hasn\'t been completed yet — nothing to undo.',
  'Task is already completed': 'This task is already marked complete.',
  'Task already claimed': 'Another team member just claimed this player.',
  'Incorrect admin password': 'The admin password you entered is wrong.',
  'Only admins can mark': 'Only admins can mark a player as Unreachable.',
};

function getFriendlyError(raw) {
  if (!raw) return 'Something went wrong. Please try again.';
  // Try known mappings first
  for (const [key, friendly] of Object.entries(FRIENDLY_ERRORS)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return friendly;
  }
  // If it looks like a JS reference error, hide it completely
  if (raw.includes('is not defined') || raw.includes('Cannot read') || raw.includes('undefined')) {
    return 'An unexpected error occurred. Please refresh the page.';
  }
  // Otherwise show as-is (backend messages are usually readable)
  return raw;
}

// ─── Toast Notification System ────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px',
          background: t.type === 'error' ? '#fef2f2'
            : t.type === 'success' ? '#f0fdf4'
              : '#fffbeb',
          border: `1.5px solid ${t.type === 'error' ? '#fca5a5'
            : t.type === 'success' ? '#86efac'
              : '#fde68a'}`,
          borderLeft: `4px solid ${t.type === 'error' ? '#ef4444'
            : t.type === 'success' ? '#22c55e'
              : '#f59e0b'}`,
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.2s ease',
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            {t.type === 'error'
              ? <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
              : t.type === 'success'
                ? <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                : <AlertTriangle style={{ width: 16, height: 16, color: '#f59e0b' }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: t.type === 'error' ? '#dc2626'
                : t.type === 'success' ? '#16a34a'
                  : '#92400e',
              marginBottom: 2,
            }}>
              {t.type === 'error' ? 'Action Failed'
                : t.type === 'success' ? 'Done!'
                  : 'Heads Up'}
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{t.message}</div>
          </div>
          <button onClick={() => onDismiss(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, flexShrink: 0 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────
let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = ++_toastId;
    const friendly = type === 'error' ? getFriendlyError(message) : message;
    setToasts(prev => [...prev, { id, message: friendly, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return { toasts, addToast, dismiss };
}

// ─── Avatar ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#6366f1', '#eef2ff'], ['#0ea5e9', '#f0f9ff'], ['#10b981', '#f0fdf4'],
  ['#f59e0b', '#fffbeb'], ['#8b5cf6', '#f5f3ff'], ['#ec4899', '#fdf2f8'],
];
function Avatar({ name, size = 36 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [fg, bg] = AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.35, flexShrink: 0,
      border: `1.5px solid ${fg}30`,
    }}>{initials}</div>
  );
}

function TierBadge({ tier }) {
  const map = {
    GOLD: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    SILVER: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
    BRONZE: { bg: '#fed7aa', color: '#9a3412', border: '#fdba74' },
  };
  const s = map[tier] || { bg: 'var(--color-bg)', color: 'var(--color-text-muted)', border: 'var(--color-border)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {tier || 'N/A'}
    </span>
  );
}

function FieldChip({ field, onMarkNA, onUnmarkNA, isNA = false, canEdit = false }) {
  const meta = CONTACT_FIELD_META[field];
  if (!meta) return null;
  const { icon: Icon, label, color, bg } = meta;

  if (isNA) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
        background: '#f1f5f9', color: '#94a3b8',
        border: '1px solid #e2e8f0', textDecoration: 'line-through', opacity: 0.7,
      }}>
        <Icon style={{ width: 10, height: 10 }} /> {label}
        {canEdit && (
          <button onClick={() => onUnmarkNA(field)} title="Remove N/A — mark as missing again"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, color: '#94a3b8', display: 'inline-flex', lineHeight: 1 }}>
            <X style={{ width: 9, height: 9 }} />
          </button>
        )}
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: bg, color, border: `1px solid ${color}30`,
    }}>
      <Icon style={{ width: 10, height: 10 }} /> {label}
      {canEdit && onMarkNA && (
        <button onClick={() => onMarkNA(field)} title={`Mark ${label} as N/A — player has no account`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 3px', color, display: 'inline-flex', lineHeight: 1, opacity: 0.6 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
          <X style={{ width: 9, height: 9 }} />
        </button>
      )}
    </span>
  );
}

// ─── Inline Admin Assign Dropdown ────────────────────────────────
function InlineAdminAssign({ player, task, teamMembers, onAssigned, assigning }) {
  const isDone = ['COMPLETED', 'DONE'].includes(task?.status);
  const currentValue = (!task?.assignToAll && task?.assignedToId) ? String(task.assignedToId) : '';
  const currentName = task?.assignedTo?.name || task?.assignedTo?.username;

  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
        Assign to member
      </div>
      <div style={{ position: 'relative' }}>
        <select
          value={currentValue}
          onChange={e => onAssigned(player, e.target.value || null)}
          disabled={assigning || isDone}
          style={{
            ...SELECT_STYLE,
            border: `1.5px solid ${currentValue ? '#86efac' : 'var(--color-border)'}`,
            background: currentValue ? 'var(--color-background-success)' : 'var(--color-input-bg)',
            color: currentValue ? 'var(--success)' : 'var(--color-text)',
            opacity: isDone ? 0.6 : 1,
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
          ? <Loader2 style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'var(--color-text-muted)', animation: 'spin 0.8s linear infinite' }} />
          : <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        }
      </div>
      {task && (
        <div style={{ marginTop: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: isDone ? 'var(--success)' : task.assignToAll ? '#2563eb' : '#7c3aed' }}>
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

// ─── Edit Modal ──────────────────────────────────────────────────
function EditModal({ player, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    name: player.name || '', email: player.email || '', phone: player.phone || '',
    snapchat: player.snapchat || '', instagram: player.instagram || '', telegram: player.telegram || '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { onError('Player name cannot be empty.', 'warning'); return; }
    setSaving(true);
    try {
      const res = await api.players.updatePlayer(player.id, {
        name: form.name || undefined,
        email: form.email || null, phone: form.phone || null,
        snapchat: form.snapchat || null, instagram: form.instagram || null, telegram: form.telegram || null,
      });
      setDone(true);
      setTimeout(() => onSaved({ ...player, ...form, ...(res?.data || {}) }), 700);
    } catch (e) {
      onError(e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
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
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ ...CARD_STYLE, width: '100%', maxWidth: 460, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>Edit Player</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>@{player.username}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          {FIELDS.map(f => {
            const isMissing = CONTACT_KEYS.includes(f.key) && (!player[f.key] || !String(player[f.key]).trim());
            const meta = CONTACT_FIELD_META[f.key];
            const Icon = meta?.icon;
            return (
              <div key={f.key}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
                  {Icon && <Icon style={{ width: 11, height: 11, color: meta.color }} />}
                  {f.label}
                  {f.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                  {isMissing && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4 }}>MISSING</span>}
                </label>
                <input type={f.type} value={form[f.key]} onChange={set(f.key)}
                  placeholder={`Enter ${f.label.toLowerCase()}…`}
                  style={{ ...INPUT_STYLE, border: `1.5px solid ${isMissing ? '#fca5a5' : 'var(--color-border)'}`, background: isMissing ? 'var(--color-background-warning)' : 'var(--color-input-bg)' }}
                />
              </div>
            );
          })}
          {done && (
            <div style={{ padding: '10px 12px', background: 'var(--color-background-success)', border: '1px solid var(--color-border-success)', borderRadius: 8, fontSize: 12, color: 'var(--success)' }}>
              ✅ Updated! Task synced automatically.
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-background-secondary)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: 10, background: 'var(--color-cards)', border: '1px solid var(--color-border)', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text)' }}>Cancel</button>
          <button onClick={save} disabled={saving || done}
            style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving || done ? 'not-allowed' : 'pointer', background: saving || done ? 'var(--color-border)' : 'var(--brand)', color: saving || done ? 'var(--color-text-muted)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
            <Save style={{ width: 14, height: 14 }} />
            {saving ? 'Saving…' : done ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Player Card ─────────────────────────────────────────────────
function PlayerCard({
  player, onEdit, onInlineAssign, onClaim, onUndoTask,
  onMarkNA, onUnmarkNA, onMarkUnreachable,
  userRole, task, claimingId, assigningId, undoingId,
  teamMembers, currentUserId, markingNAId,
}) {
  const missing = getMissingContactFields(player);
  const naFields = getNAFields(player);
  const isCritical = missing.length >= CRITICAL_THRESHOLD;
  const isHighCritical = missing.length >= HIGH_CRITICAL_THRESHOLD;
  const isAdmin = isAdminRole(userRole);
  const isMember = isMemberRole(userRole);
  const claiming = claimingId === player.id;
  const assigning = assigningId === player.id;
  const undoing = undoingId === player.id;

  const isDone = ['COMPLETED', 'DONE'].includes(task?.status);
  const isAssigned = !!task && !!task.assignedToId && !task.assignToAll;
  const isClaimedByMe = isAssigned && currentUserId && String(task.assignedToId) === String(currentUserId);
  const isClaimedByOther = isAssigned && !isClaimedByMe;
  const canEdit = isAdmin || (isMember && isClaimedByMe);
  const canClaim = isMember && !isDone && !isClaimedByOther && missing.length > 0;
  const isUnreachable = player.status === 'UNREACHABLE';

  const borderColor = isUnreachable ? '#a21caf'
    : isDone ? 'var(--color-border-success)'
      : isHighCritical ? 'var(--danger)'
        : isCritical ? '#fca5a5'
          : 'var(--color-border)';

  const bgColor = isUnreachable ? '#fdf4ff'
    : isDone ? 'var(--color-background-success)'
      : isHighCritical ? 'var(--color-background-warning)'
        : 'var(--color-cards)';

  return (
    <div style={{ ...CARD_STYLE, border: `1.5px solid ${borderColor}`, background: bgColor, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Row 1: Avatar + name + tier */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={player.name} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>{player.name || 'Unnamed'}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>@{player.username || '—'}</div>
        </div>
        <TierBadge tier={player.tier} />
      </div>

      {/* Unreachable banner */}
      {isUnreachable && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#a21caf', color: '#fff', fontSize: 10, fontWeight: 800, alignSelf: 'flex-start' }}>
          📡 UNREACHABLE
        </div>
      )}

      {/* Severity badge */}
      {!isUnreachable && isHighCritical && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, alignSelf: 'flex-start' }}>
          <AlertTriangle style={{ width: 10, height: 10 }} /> HIGHLY CRITICAL
        </div>
      )}
      {!isUnreachable && isCritical && !isHighCritical && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#fee2e2', color: 'var(--danger)', fontSize: 10, fontWeight: 800, alignSelf: 'flex-start' }}>
          <AlertTriangle style={{ width: 10, height: 10 }} /> CRITICAL
        </div>
      )}

      {/* Missing fields */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
          Missing Fields ({missing.length})
          {naFields.length > 0 && (
            <span style={{ marginLeft: 6, color: '#94a3b8', fontWeight: 600 }}>· {naFields.length} N/A</span>
          )}
        </div>
        {missing.length === 0 && naFields.length === 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
            <CheckCircle style={{ width: 11, height: 11 }} /> All contact info present
          </span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {missing.map(f => (
              <FieldChip key={f} field={f} canEdit={canEdit} onMarkNA={() => onMarkNA(player, f)} />
            ))}
            {naFields.map(f => (
              <FieldChip key={f} field={f} isNA canEdit={canEdit} onUnmarkNA={() => onUnmarkNA(player, f)} />
            ))}
          </div>
        )}
        {missing.length > 0 && canEdit && (
          <p style={{ margin: '5px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>
            ✕ on a chip = player has no account on that platform
          </p>
        )}
      </div>

      {/* Task completed banner + undo */}
      {isDone && (
        <div style={{ padding: '8px 10px', background: 'var(--color-background-success)', border: '1px solid var(--color-border-success)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 style={{ width: 13, height: 13 }} /> Task completed
          </span>
          {(isAdmin || isClaimedByMe) && (
            <button onClick={() => onUndoTask(player, task)} disabled={undoing}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-success)', background: 'var(--color-cards)', fontSize: 11, fontWeight: 700, color: 'var(--success)', cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {undoing ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 0.8s linear infinite' }} /> : <Undo2 style={{ width: 11, height: 11 }} />}
              Undo
            </button>
          )}
        </div>
      )}

      {/* Admin: inline assign + unreachable toggle */}
      {isAdmin && (
        <>
          <InlineAdminAssign player={player} task={task} teamMembers={teamMembers} onAssigned={onInlineAssign} assigning={assigning} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px dashed var(--color-border)' }}>
            <button onClick={() => onMarkUnreachable(player, !isUnreachable)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                border: `1px solid ${isUnreachable ? '#a21caf' : 'var(--color-border)'}`,
                background: isUnreachable ? '#fdf4ff' : 'var(--color-cards)',
                color: isUnreachable ? '#a21caf' : 'var(--color-text-muted)',
                fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              📡 {isUnreachable ? 'Mark as Reachable' : 'Mark as Unreachable'}
            </button>
          </div>
        </>
      )}

      {/* Member: claim / status */}
      {isMember && !isDone && !isUnreachable && (
        <div>
          {isClaimedByMe ? (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--color-background-warning)', border: '1px solid var(--color-border-warning)', fontSize: 11, fontWeight: 600, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <ClipboardList style={{ width: 11, height: 11 }} /> You're working on this task
            </div>
          ) : isClaimedByOther ? (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Lock style={{ width: 11, height: 11 }} /> Claimed by {task?.assignedTo?.name || 'another member'}
            </div>
          ) : canClaim ? (
            <button onClick={() => onClaim(player, task)} disabled={claiming}
              style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', cursor: claiming ? 'not-allowed' : 'pointer', background: claiming ? 'var(--color-border)' : 'linear-gradient(135deg,#10b981,#059669)', color: claiming ? 'var(--color-text-muted)' : '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', boxShadow: claiming ? 'none' : '0 2px 10px #10b98135' }}>
              {claiming
                ? <><Loader2 style={{ width: 12, height: 12, animation: 'spin 0.8s linear infinite' }} /> Claiming…</>
                : <><UserCheck style={{ width: 12, height: 12 }} /> Claim This Player</>
              }
            </button>
          ) : missing.length === 0 ? null : (
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock style={{ width: 10, height: 10 }} /> Awaiting task assignment
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Added {new Date(player.createdAt).toLocaleDateString()}</span>
        {canEdit ? (
          <button onClick={() => onEdit(player)}
            style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', background: 'var(--color-cards)', color: 'var(--brand)', border: '1px solid var(--color-border-info)' }}>
            <Edit2 style={{ width: 10, height: 10 }} /> Edit
          </button>
        ) : isMember && !isClaimedByMe && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Lock style={{ width: 9, height: 9 }} /> Claim to edit
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, color, bg, border, icon: Icon }) {
  return (
    <div style={{ ...CARD_STYLE, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 17, height: 17, color }} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function MissingPlayersPage() {
  // const { shiftActive } = useContext(ShiftStatusContext);
  const { shiftActive, shiftLoading } = useContext(ShiftStatusContext);
  const navigate = useNavigate();
  const { toasts, addToast, dismiss } = useToast();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editTarget, setEditTarget] = useState(null);
  const [tasks, setTasks] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [undoingId, setUndoingId] = useState(null);
  const [markingNAId, setMarkingNAId] = useState(null);
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
    try {
      const res = await api.players.getMissingInfo(true);
      const list = res?.data || res?.players || res || [];
      setPlayers(Array.isArray(list) ? list.filter(p => getMissingContactFields(p).length > 0) : []);
      setLastRefresh(new Date());
    } catch (e) {
      if (!silent) addToast(e.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // ── Load tasks ────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks?taskType=MISSING_INFO`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const map = {};
      (data?.data || []).forEach(task => {
        const pid = getTaskPlayerId(task);
        if (pid) map[pid] = task;
      });
      setTasks(map);
    } catch { }
  }, []);

  useEffect(() => { loadPlayers(); loadTasks(); }, [loadPlayers, loadTasks, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { loadPlayers(true); loadTasks(); }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadPlayers, loadTasks]);

  // ── SSE ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const es = api.tasks.connectSSE();
      sseRef.current = es;
      es.onmessage = e => {
        try {
          const { type, data } = JSON.parse(e.data);
          if (['task_created', 'task_updated', 'task_deleted'].includes(type)) {
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
          if (type === 'player_updated') loadPlayers(true);
        } catch { }
      };
      es.onerror = () => { };
    } catch { }
    return () => sseRef.current?.close();
  }, [loadPlayers, loadTasks]);

  // ── Actions ───────────────────────────────────────────────────
  const handleInlineAssign = useCallback(async (player, memberId) => {
    setAssigningId(player.id);
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
      addToast(e.message);
    } finally {
      setAssigningId(null);
    }
  }, [loadTasks, addToast]);

  const handleClaim = useCallback(async (player, task) => {
    if (!currentUserId) return;
    setClaimingId(player.id);
    try {
      if (task?.id) {
        const res = await fetch(`${API_BASE}/tasks/${task.id}/claim`, {
          method: 'POST', credentials: 'include', headers: authHeaders(true),
        });
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
      addToast(e.message);
    } finally {
      setClaimingId(null);
    }
  }, [currentUserId, loadTasks, addToast]);

  const handleUndoTask = useCallback(async (player, task) => {
    if (!task?.id) return;
    setUndoingId(player.id);
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/undo-completion`, {
        method: 'POST', credentials: 'include', headers: authHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to undo task');
      const updated = data.data || data.task || data;
      const pid = getTaskPlayerId(updated) || String(player.id);
      setTasks(prev => ({ ...prev, [pid]: updated }));
      addToast('Task reopened successfully.', 'success');
    } catch (e) {
      addToast(e.message);
    } finally {
      setUndoingId(null);
    }
  }, [addToast]);

  const handleMarkNA = useCallback(async (player, field) => {
    setMarkingNAId(player.id);
    try {
      const current = player.noAccountOn || [];
      if (current.includes(field)) return;
      const updated = [...current, field];
      await api.players.updatePlayer(player.id, { noAccountOn: updated });
      setPlayers(prev => prev.map(p => {
        if (p.id !== player.id) return p;
        const updatedPlayer = { ...p, noAccountOn: updated };
        if (getMissingContactFields(updatedPlayer).length === 0) return null;
        return updatedPlayer;
      }).filter(Boolean));
    } catch (e) {
      addToast(e.message || 'Could not mark field as N/A.');
    } finally {
      setMarkingNAId(null);
    }
  }, [addToast]);

  const handleUnmarkNA = useCallback(async (player, field) => {
    setMarkingNAId(player.id);
    try {
      const updated = (player.noAccountOn || []).filter(f => f !== field);
      await api.players.updatePlayer(player.id, { noAccountOn: updated });
      setPlayers(prev => prev.map(p => p.id !== player.id ? p : { ...p, noAccountOn: updated }));
    } catch (e) {
      addToast(e.message || 'Could not remove N/A flag.');
    } finally {
      setMarkingNAId(null);
    }
  }, [addToast]);

  const handleMarkUnreachable = useCallback(async (player, makeUnreachable) => {
    try {
      const newStatus = makeUnreachable ? 'UNREACHABLE' : 'INACTIVE';
      await api.players.updatePlayer(player.id, { status: newStatus });
      setPlayers(prev => prev.map(p => p.id !== player.id ? p : { ...p, status: newStatus }));
      addToast(
        makeUnreachable
          ? `${player.name} marked as Unreachable.`
          : `${player.name} marked as Reachable.`,
        'success'
      );
    } catch (e) {
      addToast(e.message || 'Failed to update player status.');
    }
  }, [addToast]);

  const handleSaved = useCallback((updated) => {
    setEditTarget(null);
    setPlayers(prev => {
      const missing = getMissingContactFields(updated);
      if (missing.length === 0) return prev.filter(p => p.id !== updated.id);
      return prev.map(p => p.id !== updated.id ? p : { ...p, ...updated });
    });
    addToast('Player info saved!', 'success');
  }, [addToast]);

  // ── Stats ─────────────────────────────────────────────────────
  const stats = {
    total: players.length,
    highCritical: players.filter(p => getMissingContactFields(p).length >= HIGH_CRITICAL_THRESHOLD).length,
    critical: players.filter(p => getMissingContactFields(p).length >= CRITICAL_THRESHOLD).length,
    misSnap: players.filter(p => getMissingContactFields(p).includes('snapchat')).length,
    misPhone: players.filter(p => getMissingContactFields(p).includes('phone')).length,
    misEmail: players.filter(p => getMissingContactFields(p).includes('email')).length,
    unassigned: players.filter(p => !tasks[String(p.id)]).length,
    unreachable: players.filter(p => p.status === 'UNREACHABLE').length,
  };

  // ✅ FIX 2: `player.status` → `p.status` (player was undefined in this scope)
  const filtered = players.filter(p => {
    const missing = getMissingContactFields(p);
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
        filter === 'unreachable' ? p.status === 'UNREACHABLE' :
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
    { id: 'highcritical', label: '🔴 High Critical', count: stats.highCritical },
    { id: 'critical', label: '🟠 Critical', count: stats.critical },
    { id: 'unreachable', label: '📡 Unreachable', count: stats.unreachable },
    { id: 'snapchat', label: 'Snapchat', count: stats.misSnap },
    { id: 'phone', label: 'Phone', count: stats.misPhone },
    { id: 'email', label: 'Email', count: stats.misEmail },
    { id: 'unassigned', label: 'Unassigned', count: stats.unassigned },
  ];

  // ── Shift gate ────────────────────────────────────────────────

  if (shiftLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            padding: "60px 24px",
            textAlign: "center",
            background: "var(--color-background-primary)",
            borderRadius: "var(--border-radius-lg)",
            border: "0.5px solid var(--color-border-tertiary)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid var(--color-border-tertiary)",
              borderTopColor: "#0ea5e9",
              borderRadius: "50%",
              margin: "0 auto 12px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--color-text-tertiary)",
            }}
          >
            Checking shift status…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  if (!shiftActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          onClick={() => navigate('/shifts')}
          style={{ alignSelf: 'flex-start', padding: '9px 18px', background: 'var(--color-background-info)', color: 'var(--color-text-info)', border: '0.5px solid var(--color-border-info)', borderRadius: 'var(--border-radius-md)', fontWeight: 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
          Start Shift
        </button>
        <div style={{ ...CARD_STYLE, padding: '14px 16px', borderLeft: '3px solid var(--color-border-warning)', background: 'var(--color-background-warning)' }}>
          <p style={{ fontWeight: 500, color: 'var(--color-text-warning)', margin: '0 0 2px', fontSize: 13 }}>Shift required</p>
          <p style={{ color: 'var(--color-text-warning)', margin: 0, fontSize: 12 }}>You must have an active shift to view tasks.</p>
        </div>
        <div style={{ ...CARD_STYLE, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-background-secondary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Lock style={{ width: 20, height: 20, color: 'var(--color-text-muted)' }} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Dashboard locked</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Go to Shifts and start your shift first.</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Stat Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatCard label="Total (Missing Info)" value={stats.total} color="#64748b" bg="#f1f5f9" border="#cbd5e1" icon={Users} />
        <StatCard label="Highly Critical (3+)" value={stats.highCritical} color="#dc2626" bg="#fff1f2" border="#fecdd3" icon={AlertTriangle} />
        <StatCard label="Critical (2+ missing)" value={stats.critical} color="#f97316" bg="#fff7ed" border="#fed7aa" icon={AlertCircle} />
        <StatCard label="Missing Snapchat" value={stats.misSnap} color="#eab308" bg="#fefce8" border="#fde047" icon={Camera} />
        <StatCard label="Missing Phone" value={stats.misPhone} color="#8b5cf6" bg="#faf5ff" border="#ddd6fe" icon={Phone} />
        <StatCard label="Unassigned Tasks" value={stats.unassigned} color="#0ea5e9" bg="#f0f9ff" border="#bae6fd" icon={ClipboardList} />
      </div>

      {/* ── Main Card ── */}
      <div style={CARD_STYLE}>

        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>Missing Player Info</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
              Players with incomplete contact details · 2 missing = Critical · 3+ = Highly Critical
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search players…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...INPUT_STYLE, paddingLeft: 30, paddingRight: search ? 30 : 12, width: 175 }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          {/* Filter dropdown */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...SELECT_STYLE, width: 160 }}>
              {FILTERS.map(f => (
                <option key={f.id} value={f.id}>{f.label}{f.count > 0 ? ` (${f.count})` : ''}</option>
              ))}
            </select>
            <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          </div>

          {/* Role badge */}
          {userRole && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: isAdmin ? 'var(--color-background-warning)' : 'var(--color-background-info)', flexShrink: 0 }}>
              <ShieldCheck style={{ width: 12, height: 12, color: isAdmin ? 'var(--amber)' : 'var(--brand)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? 'var(--amber)' : 'var(--brand)' }}>{isAdmin ? 'Admin' : userRole}</span>
            </div>
          )}

          {/* Live toggle */}
          <div onClick={() => setAutoRefresh(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', background: autoRefresh ? 'var(--color-background-success)' : 'var(--color-cards)', flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: autoRefresh ? '#22c55e' : 'var(--color-border)', boxShadow: autoRefresh ? '0 0 5px #22c55e' : 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: autoRefresh ? 'var(--success)' : 'var(--color-text-muted)' }}>Live {autoRefresh ? 'ON' : 'OFF'}</span>
          </div>

          <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-cards)', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, flexShrink: 0, fontFamily: 'inherit' }}>
            {/* <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "smartSpin .8s linear infinite" }} /> */}
            <RefreshCw style={{ width: 11, height: 11 }} />
            Refresh
          </button>

          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {lastRefresh.toLocaleTimeString()}
          </span>
        </div>

        {/* Role hint banners */}
        {isAdmin && (
          <div style={{ margin: '10px 18px 0', padding: '9px 14px', background: 'var(--color-background-warning)', border: '1px solid var(--color-border-warning)', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
            💡 <strong>Admin:</strong> Use the dropdown on each card to assign players to members. Use <strong>Undo</strong> to reopen completed tasks.
          </div>
        )}
        {isMember && (
          <div style={{ margin: '10px 18px 0', padding: '9px 14px', background: 'var(--color-background-info)', border: '1px solid var(--color-border-info)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-info)' }}>
            💡 Click <strong>Claim This Player</strong> to take ownership — then you can edit their missing info.
          </div>
        )}

        {/* Count */}
        <div style={{ padding: '10px 18px 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} of {players.length} players with missing info
          {filter !== 'all' && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>• filtered</span>}
        </div>

        {/* Grid */}
        <div style={{ padding: 18 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              {/* <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--danger)', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} /> */}
              <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "smartSpin .8s linear infinite" }} />
              Loading players…
              {/* <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}></p> */}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)', fontSize: 14 }}>
              {search || filter !== 'all'
                ? 'No players match your filters.'
                : <><CheckCircle style={{ width: 34, height: 34, color: 'var(--success)', display: 'block', margin: '0 auto 10px' }} />All contact info is complete!</>
              }
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filtered.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onEdit={setEditTarget}
                  onInlineAssign={handleInlineAssign}
                  onClaim={handleClaim}
                  onUndoTask={handleUndoTask}
                  onMarkNA={handleMarkNA}
                  onUnmarkNA={handleUnmarkNA}
                  onMarkUnreachable={handleMarkUnreachable}
                  userRole={userRole}
                  task={tasks[String(player.id)] || null}
                  claimingId={claimingId}
                  assigningId={assigningId}
                  undoingId={undoingId}
                  markingNAId={markingNAId}
                  teamMembers={teamMembers}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          player={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          onError={(msg, type = 'error') => addToast(msg, type)}
        />
      )}

      {/* Toast notifications — replaces raw error banner */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style> */}
      <style>{`@keyframes smartSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
