/**
 * MissingPlayersPage.jsx — all bugs fixed
 *
 * FIXES:
 *  1. contactMissingFields() checks actual player.email/phone/etc values
 *     (NOT player.missingFields — backend doesn't return that array)
 *  2. Task lookup via getTaskPlayerId() checks task.playerId, task.targetPlayerId,
 *     task.player?.id, AND JSON.parse(task.notes).playerId
 *  3. Claim button correctly appears for team members on open tasks
 *  4. Admin assign uses POST /players/:id/assign-missing-info-task
 *  5. Optimistic updates are stable — not overwritten immediately by reload
 *  6. SSE via api.tasks.connectSSE() → full backend URL (no Vercel 404)
 *  7. "Highly Critical" badge for 3+ missing, "Critical" for 2+
 *  8. Edit saves via api.players.updatePlayer + reflects in the card immediately
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AlertTriangle, Search, RefreshCw,
    Phone, Mail, Camera, Instagram, Send, Users, X,
    ClipboardList, CheckCircle2, ChevronDown, ShieldCheck,
    UserCheck, Clock, AlertCircle, CheckCircle, Edit2, Save, User,
} from 'lucide-react';
import { api } from '../api';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CRITICAL_THRESHOLD      = 2; // 2+ missing → "Critical"
const HIGH_CRITICAL_THRESHOLD = 3; // 3+ missing → "Highly Critical"

// Contact fields only — assigned_member intentionally excluded
const CONTACT_FIELD_META = {
    email:     { icon: Mail,      label: 'Email',     color: '#3b82f6', bg: '#eff6ff' },
    phone:     { icon: Phone,     label: 'Phone',     color: '#8b5cf6', bg: '#f5f3ff' },
    snapchat:  { icon: Camera,    label: 'Snapchat',  color: '#eab308', bg: '#fefce8' },
    instagram: { icon: Instagram, label: 'Instagram', color: '#ec4899', bg: '#fdf2f8' },
    telegram:  { icon: Send,      label: 'Telegram',  color: '#0ea5e9', bg: '#f0f9ff' },
};
const CONTACT_KEYS = Object.keys(CONTACT_FIELD_META);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Compute which contact fields are missing by inspecting actual player values.
 * Never relies on player.missingFields (backend does NOT return that array).
 */
function getMissingContactFields(player) {
    return CONTACT_KEYS.filter(key => {
        const val = player[key];
        return !val || String(val).trim() === '';
    });
}

function isAdminRole(role) {
    return ['ADMIN', 'SUPER_ADMIN', 'admin', 'SUPER ADMIN'].includes(role);
}
function isMemberRole(role) {
    return ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'].includes(role);
}

function authHeaders(json = false) {
    const token = localStorage.getItem('authToken');
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

/**
 * Extract playerId from a task no matter where the backend stored it.
 */
function getTaskPlayerId(task) {
    if (!task) return null;
    if (task.playerId)       return String(task.playerId);
    if (task.targetPlayerId) return String(task.targetPlayerId);
    if (task.player?.id)     return String(task.player.id);
    try {
        const meta = JSON.parse(task.notes || '{}');
        if (meta.playerId) return String(meta.playerId);
    } catch {}
    const m = String(task.description || '').match(/player[_ ]?id[:\s]+(\d+)/i);
    if (m) return m[1];
    return null;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    ['#dc2626','#fff'],['#ea580c','#fff'],['#ca8a04','#fff'],['#16a34a','#fff'],
    ['#0891b2','#fff'],['#2563eb','#fff'],['#7c3aed','#fff'],['#db2777','#fff'],
    ['#065f46','#fff'],['#1e40af','#fff'],
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

// ─── Tier Badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
    const map = {
        GOLD:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
        SILVER: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
        BRONZE: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    };
    const s = map[tier] || { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
    return (
        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {tier || 'N/A'}
        </span>
    );
}

// ─── Field Chip ───────────────────────────────────────────────────────────────
function FieldChip({ field }) {
    const meta = CONTACT_FIELD_META[field];
    if (!meta) return null;
    const { icon: Icon, label, color, bg } = meta;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: bg, color, border: `1px solid ${color}30` }}>
            <Icon style={{ width: 10, height: 10, flexShrink: 0 }} /> {label}
        </span>
    );
}

// ─── Assign Task Modal ─────────────────────────────────────────────────────────
function AssignTaskModal({ player, teamMembers, missingFields, onClose, onAssigned }) {
    const [assignedToId, setAssignedToId] = useState('');
    const [priority,     setPriority]     = useState('HIGH');
    const [saving,       setSaving]       = useState(false);
    const [err,          setErr]          = useState(null);
    const [done,         setDone]         = useState(false);

    const submit = async () => {
        setSaving(true); setErr(null);
        try {
            const res = await fetch(`${API_BASE}/players/${player.id}/assign-missing-info-task`, {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(true),
                body: JSON.stringify({
                    assignedToId: assignedToId ? parseInt(assignedToId, 10) : null,
                    priority,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Failed to assign');
            setDone(true);
            setTimeout(() => onAssigned(data.data || data.task || data), 800);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,.22)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Assign Missing Info Task</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{player.name} · @{player.username}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X style={{ width: 18, height: 18 }} /></button>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Missing Fields ({missingFields.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {missingFields.map(f => <FieldChip key={f} field={f} />)}
                        </div>
                    </div>

                    <div>
                        <label style={S.label}>Assign To</label>
                        <div style={{ position: 'relative' }}>
                            <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)}
                                style={{ width: '100%', padding: '9px 32px 9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', appearance: 'none', background: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                                <option value="">Open to all (anyone can claim)</option>
                                {teamMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name || m.username} ({m.role})</option>
                                ))}
                            </select>
                            <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8', pointerEvents: 'none' }} />
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                            {assignedToId ? 'Only the selected member will see this task.' : 'All team members will see and can claim this task.'}
                        </p>
                    </div>

                    <div>
                        <label style={S.label}>Priority</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[{v:'LOW',l:'🟢 Low',c:'#22c55e'},{v:'MEDIUM',l:'🟡 Medium',c:'#f59e0b'},{v:'HIGH',l:'🔴 High',c:'#ef4444'}].map(p => (
                                <button key={p.v} onClick={() => setPriority(p.v)}
                                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${priority === p.v ? p.c : '#e2e8f0'}`, background: priority === p.v ? `${p.c}15` : '#fff', color: priority === p.v ? p.c : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {p.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {err  && <div style={{ padding: '10px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>⚠️ {err}</div>}
                    {done && <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>✅ Task created!</div>}
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Cancel</button>
                    <button onClick={submit} disabled={saving || done}
                        style={{ flex: 2, padding: 10, background: saving || done ? '#e2e8f0' : '#7c3aed', color: saving || done ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving || done ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
                        <ClipboardList style={{ width: 14, height: 14 }} />
                        {saving ? 'Assigning…' : done ? 'Assigned!' : 'Assign Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ player, onClose, onSaved }) {
    const [form, setForm] = useState({
        name:      player.name      || '',
        email:     player.email     || '',
        phone:     player.phone     || '',
        snapchat:  player.snapchat  || '',
        instagram: player.instagram || '',
        telegram:  player.telegram  || '',
    });
    const [saving, setSaving] = useState(false);
    const [err,    setErr]    = useState(null);
    const [done,   setDone]   = useState(false);
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const save = async () => {
        if (!form.name.trim()) { setErr('Name is required.'); return; }
        setSaving(true); setErr(null);
        try {
            const res = await api.players.updatePlayer(player.id, {
                name:      form.name      || undefined,
                email:     form.email     || null,
                phone:     form.phone     || null,
                snapchat:  form.snapchat  || null,
                instagram: form.instagram || null,
                telegram:  form.telegram  || null,
            });
            setDone(true);
            const updated = { ...player, ...form, ...(res?.data || res?.player || {}) };
            setTimeout(() => onSaved(updated), 700);
        } catch (e) {
            setErr(e.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const FIELDS = [
        { key: 'name',      label: 'Full Name',  type: 'text',  required: true  },
        { key: 'email',     label: 'Email',       type: 'email', required: false },
        { key: 'phone',     label: 'Phone',       type: 'text',  required: false },
        { key: 'telegram',  label: 'Telegram',    type: 'text',  required: false },
        { key: 'instagram', label: 'Instagram',   type: 'text',  required: false },
        { key: 'snapchat',  label: 'Snapchat',    type: 'text',  required: false },
    ];

    return (
        <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Edit Player</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>@{player.username}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X style={{ width: 18, height: 18 }} /></button>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                    {FIELDS.map(f => {
                        const isMissing = CONTACT_KEYS.includes(f.key) && (!player[f.key] || String(player[f.key]).trim() === '');
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
                                    onBlur={e  => e.target.style.borderColor = isMissing ? '#fca5a5' : '#e2e8f0'}
                                />
                            </div>
                        );
                    })}
                    {err  && <div style={{ padding: '10px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>⚠️ {err}</div>}
                    {done && <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>✅ Updated!</div>}
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Cancel</button>
                    <button onClick={save} disabled={saving || done}
                        style={{ flex: 2, padding: 10, background: saving || done ? '#e2e8f0' : '#0ea5e9', color: saving || done ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving || done ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
                        <Save style={{ width: 14, height: 14 }} />
                        {saving ? 'Saving…' : done ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ player, onEdit, onAssign, onClaim, userRole, task, claimingId }) {
    const missing         = getMissingContactFields(player);
    const isCritical      = missing.length >= CRITICAL_THRESHOLD;
    const isHighCritical  = missing.length >= HIGH_CRITICAL_THRESHOLD;
    const isAdmin         = isAdminRole(userRole);
    const isMember        = isMemberRole(userRole);
    const claiming        = claimingId === player.id;

    const hasTask     = !!task;
    const isDone      = ['COMPLETED','DONE'].includes(task?.status);
    const isOpenToAll = hasTask && (task.assignToAll === true || !task.assignedToId);
    const isAssigned  = hasTask && !!task.assignedToId && task.assignToAll !== true;
    const assignedName = task?.assignedTo?.name || task?.assignedTo?.username || task?.assignedToName || null;

    return (
        <div style={{
            borderRadius: 14, padding: 16, boxSizing: 'border-box',
            border: isHighCritical ? '2px solid #ef4444' : isCritical ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
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

            {/* Critical badge */}
            {isCritical && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: isHighCritical ? '#ef4444' : '#fee2e2', color: isHighCritical ? '#fff' : '#dc2626', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', alignSelf: 'flex-start' }}>
                    <AlertTriangle style={{ width: 10, height: 10 }} />
                    {isHighCritical ? 'HIGHLY CRITICAL' : 'CRITICAL'}
                </div>
            )}

            {/* Assigned member row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <User style={{ width: 11, height: 11, color: isAssigned ? '#16a34a' : '#94a3b8', flexShrink: 0 }} />
                <span style={{ color: isAssigned ? '#16a34a' : '#94a3b8', fontWeight: isAssigned ? 600 : 400 }}>
                    {isAssigned ? `Assigned to ${assignedName || 'member'}` : 'No assigned member'}
                </span>
            </div>

            {/* Task status banner */}
            {hasTask && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: isDone ? '#dcfce7' : isOpenToAll ? '#eff6ff' : '#faf5ff', color: isDone ? '#16a34a' : isOpenToAll ? '#2563eb' : '#7c3aed', border: `1px solid ${isDone ? '#86efac' : isOpenToAll ? '#bfdbfe' : '#ddd6fe'}` }}>
                    {isDone
                        ? <><CheckCircle2 style={{ width: 11, height: 11 }} /> Completed</>
                        : isOpenToAll
                        ? <><ClipboardList style={{ width: 11, height: 11 }} /> Task open — anyone can claim</>
                        : <><ClipboardList style={{ width: 11, height: 11 }} /> Assigned {assignedName ? `→ ${assignedName}` : ''}</>
                    }
                </div>
            )}

            {/* Missing fields */}
            <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                    Missing Fields ({missing.length})
                </div>
                {missing.length === 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                        <CheckCircle style={{ width: 11, height: 11 }} /> All contact info present
                    </span>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {missing.map(f => <FieldChip key={f} field={f} />)}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    Added {new Date(player.createdAt).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* ADMIN: Assign Task */}
                    {isAdmin && !hasTask && missing.length > 0 && (
                        <button onClick={() => onAssign(player)} style={{ ...S.btn, background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                            <ClipboardList style={{ width: 10, height: 10 }} /> Assign Task
                        </button>
                    )}
                    {isAdmin && hasTask && !isDone && (
                        <span style={{ fontSize: 10, color: '#7c3aed', fontStyle: 'italic' }}>Task active</span>
                    )}

                    {/* MEMBER: Claim */}
                    {isMember && isOpenToAll && !isDone && (
                        <button onClick={() => onClaim(player, task)} disabled={claiming}
                            style={{ ...S.btn, background: claiming ? '#e2e8f0' : 'linear-gradient(135deg,#10b981,#059669)', color: claiming ? '#94a3b8' : '#fff', border: 'none', fontWeight: 700, padding: '5px 14px', boxShadow: claiming ? 'none' : '0 2px 8px #10b98150' }}>
                            <UserCheck style={{ width: 11, height: 11 }} />
                            {claiming ? 'Claiming…' : 'Claim'}
                        </button>
                    )}
                    {isMember && isAssigned && !isDone && (
                        <span style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>Assigned to member</span>
                    )}
                    {isMember && !hasTask && (
                        <span style={{ fontSize: 10, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 3, fontStyle: 'italic' }}>
                            <Clock style={{ width: 9, height: 9 }} /> Awaiting task
                        </span>
                    )}

                    {/* Edit */}
                    <button onClick={() => onEdit(player)} style={{ ...S.btn, background: '#fff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
                        <Edit2 style={{ width: 10, height: 10 }} /> Edit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MissingPlayersPage() {
    const [players,       setPlayers]       = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [search,        setSearch]        = useState('');
    const [filter,        setFilter]        = useState('all');
    const [editTarget,    setEditTarget]    = useState(null);
    const [assignTarget,  setAssignTarget]  = useState(null);
    const [tasks,         setTasks]         = useState({}); // String(playerId) → task
    const [teamMembers,   setTeamMembers]   = useState([]);
    const [userRole,      setUserRole]      = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [claimingId,    setClaimingId]    = useState(null);
    const [autoRefresh,   setAutoRefresh]   = useState(true);
    const [lastRefresh,   setLastRefresh]   = useState(new Date());
    const [refreshKey,    setRefreshKey]    = useState(0);
    const sseRef = useRef(null);

    // ── Current user + team members ──────────────────────────────────────────
    useEffect(() => {
        api.auth.getUser()
            .then(res => {
                const u = res?.data || res?.user || res;
                setUserRole(u?.role || null);
                setCurrentUserId(u?.id ? String(u.id) : null);
            })
            .catch(() => {});

        api.tasks.getTeamMembers()
            .then(res => setTeamMembers(res?.data || res || []))
            .catch(() => {});
    }, []);

    // ── Load players ─────────────────────────────────────────────────────────
    const loadPlayers = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const res  = await api.players.getMissingInfo(true);
            const list = res?.data || res?.players || res || [];
            // Backend returns players missing info — show all of them.
            // We compute actual missing contact fields in getMissingContactFields().
            setPlayers(Array.isArray(list) ? list : []);
            setLastRefresh(new Date());
        } catch (e) {
            if (!silent) setError(e.message || 'Failed to load players');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Load MISSING_INFO tasks ───────────────────────────────────────────────
    const loadTasks = useCallback(async () => {
        try {
            const res  = await fetch(`${API_BASE}/tasks?taskType=MISSING_INFO`, {
                credentials: 'include',
                headers: authHeaders(),
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = data?.data || data?.tasks || data || [];
            const map  = {};
            (Array.isArray(list) ? list : []).forEach(task => {
                const pid = getTaskPlayerId(task);
                if (pid) map[pid] = task;
            });
            setTasks(map);
        } catch {}
    }, []);

    useEffect(() => { loadPlayers(); loadTasks(); }, [loadPlayers, loadTasks, refreshKey]);

    // ── Auto-refresh every 15 s ───────────────────────────────────────────────
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => { loadPlayers(true); loadTasks(); }, 15000);
        return () => clearInterval(id);
    }, [autoRefresh, loadPlayers, loadTasks]);

    // ── SSE — via api.tasks.connectSSE() = full backend URL ──────────────────
    useEffect(() => {
        try {
            const es = api.tasks.connectSSE();
            sseRef.current = es;
            const onUpdate = () => { loadPlayers(true); loadTasks(); };
            es.onmessage = e => {
                try {
                    const { type } = JSON.parse(e.data);
                    if (['task_created','task_updated','task_deleted','player_updated'].includes(type)) onUpdate();
                } catch {}
            };
            es.addEventListener('task_created', onUpdate);
            es.addEventListener('task_updated', onUpdate);
            es.onerror = () => {}; // EventSource auto-reconnects — no action needed
        } catch {}
        return () => sseRef.current?.close();
    }, [loadPlayers, loadTasks]);

    // ── Claim task (MEMBER) ───────────────────────────────────────────────────
    const handleClaim = async (player, task) => {
        if (!task?.id) return;
        setClaimingId(player.id);
        try {
            const res = await fetch(`${API_BASE}/tasks/${task.id}/claim`, {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(true),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Failed to claim');
            // Optimistic: mark claimed
            const updatedTask = { ...(data.data || data.task || data), assignToAll: false, assignedToId: currentUserId };
            setTasks(prev => ({ ...prev, [String(player.id)]: updatedTask }));
            // Delayed real refresh for accuracy
            setTimeout(loadTasks, 1500);
        } catch (e) {
            setError(e.message);
        } finally {
            setClaimingId(null);
        }
    };

    // ── Task assigned (ADMIN) ────────────────────────────────────────────────
    const handleTaskAssigned = useCallback((task) => {
        setAssignTarget(null);
        const pid = getTaskPlayerId(task);
        if (pid) setTasks(prev => ({ ...prev, [pid]: task }));
        setTimeout(loadTasks, 1000);
    }, [loadTasks]);

    // ── Edit saved ────────────────────────────────────────────────────────────
    const handleSaved = useCallback((updated) => {
        setEditTarget(null);
        setPlayers(prev => prev.map(p => p.id !== updated.id ? p : { ...p, ...updated }));
    }, []);

    // ── Stats (computed from actual field values) ─────────────────────────────
    const stats = {
        total:      players.length,
        critical:   players.filter(p => getMissingContactFields(p).length >= CRITICAL_THRESHOLD).length,
        misSnap:    players.filter(p => getMissingContactFields(p).includes('snapchat')).length,
        misPhone:   players.filter(p => getMissingContactFields(p).includes('phone')).length,
        misEmail:   players.filter(p => getMissingContactFields(p).includes('email')).length,
        misIg:      players.filter(p => getMissingContactFields(p).includes('instagram')).length,
        misTg:      players.filter(p => getMissingContactFields(p).includes('telegram')).length,
        unassigned: players.filter(p => !tasks[String(p.id)]).length,
    };

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = players.filter(p => {
        const missing = getMissingContactFields(p);
        const q = search.toLowerCase();
        const matchSearch = !q
            || p.name?.toLowerCase().includes(q)
            || p.username?.toLowerCase().includes(q);
        const matchFilter =
            filter === 'all'        ? true :
            filter === 'critical'   ? missing.length >= CRITICAL_THRESHOLD :
            filter === 'unassigned' ? !tasks[String(p.id)] :
            CONTACT_KEYS.includes(filter) ? missing.includes(filter) : true;
        return matchSearch && matchFilter;
    });

    const isAdmin  = isAdminRole(userRole);
    const isMember = isMemberRole(userRole);

    const FILTERS = [
        { id: 'all',        label: 'All',        count: stats.total      },
        { id: 'critical',   label: '🔴 Critical', count: stats.critical   },
        { id: 'snapchat',   label: 'Snapchat',   count: stats.misSnap    },
        { id: 'phone',      label: 'Phone',      count: stats.misPhone   },
        { id: 'email',      label: 'Email',      count: stats.misEmail   },
        { id: 'instagram',  label: 'Instagram',  count: stats.misIg      },
        { id: 'telegram',   label: 'Telegram',   count: stats.misTg      },
        { id: 'unassigned', label: 'Unassigned', count: stats.unassigned },
    ];

    return (
        <div style={S.page}>
            {/* ── Header ── */}
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={S.pageIcon}>
                        <AlertTriangle style={{ width: 20, height: 20, color: '#dc2626' }} />
                    </div>
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
                    <div onClick={() => setAutoRefresh(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', background: autoRefresh ? '#dcfce7' : '#fff', userSelect: 'none' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: autoRefresh ? '#22c55e' : '#cbd5e1', boxShadow: autoRefresh ? '0 0 5px #22c55e' : 'none' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: autoRefresh ? '#166534' : '#64748b' }}>Live {autoRefresh ? 'ON' : 'OFF'}</span>
                    </div>
                    <button onClick={() => setRefreshKey(k => k + 1)} style={S.refreshBtn}>
                        <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                    </button>
                    <span style={{ fontSize: 10, color: '#cbd5e1' }}>{lastRefresh.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* ── Stats ── */}
            <div style={S.statsGrid}>
                <StatCard label="Total Players"         value={stats.total}      color="#64748b" bg="#f8fafc"  icon={Users}         />
                <StatCard label="Critical (2+ missing)" value={stats.critical}   color="#dc2626" bg="#fff1f2"  icon={AlertTriangle} highlight={stats.critical > 0} />
                <StatCard label="Missing Snapchat"      value={stats.misSnap}    color="#eab308" bg="#fefce8"  icon={Camera}        />
                <StatCard label="Missing Phone"         value={stats.misPhone}   color="#8b5cf6" bg="#f5f3ff"  icon={Phone}         />
                <StatCard label="Missing Email"         value={stats.misEmail}   color="#3b82f6" bg="#eff6ff"  icon={Mail}          />
                <StatCard label="Unassigned"            value={stats.unassigned} color="#f97316" bg="#fff7ed"  icon={User}          />
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><X style={{ width: 13, height: 13 }} /></button>
                </div>
            )}

            {/* ── Search ── */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8', pointerEvents: 'none' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or username…"
                    style={{ width: '100%', padding: '11px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X style={{ width: 13, height: 13 }} />
                    </button>
                )}
            </div>

            {/* ── Filter tabs ── */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${filter === f.id ? '#0f172a' : '#e2e8f0'}`, background: filter === f.id ? '#0f172a' : '#f8fafc', color: filter === f.id ? '#fff' : '#64748b', transition: 'all .15s' }}>
                        {f.label}{f.count > 0 ? <span style={{ opacity: 0.65, marginLeft: 4 }}>{f.count}</span> : null}
                    </button>
                ))}
            </div>

            {/* ── Results count ── */}
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Showing {filtered.length} of {players.length} players
                {filter !== 'all' && <span style={{ color: '#ef4444', marginLeft: 6 }}>• filtered</span>}
            </div>

            {/* ── Grid ── */}
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
                            onAssign={setAssignTarget}
                            onClaim={handleClaim}
                            userRole={userRole}
                            task={tasks[String(player.id)] || null}
                            claimingId={claimingId}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}

            {/* ── Modals ── */}
            {editTarget && (
                <EditModal
                    player={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={handleSaved}
                />
            )}
            {assignTarget && (
                <AssignTaskModal
                    player={assignTarget}
                    teamMembers={teamMembers}
                    missingFields={getMissingContactFields(assignTarget)}
                    onClose={() => setAssignTarget(null)}
                    onAssigned={handleTaskAssigned}
                />
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
    page:       { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 1400, margin: '0 auto' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
    pageIcon:   { width: 44, height: 44, borderRadius: 12, background: '#fff1f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
    statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
    empty:      { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 14 },
    label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 },
    btn:        { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' },
};
