import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AlertTriangle, Search, RefreshCw, User,
    Phone, Mail, Camera, Instagram, Send, Users, X, Save,
    ClipboardList, CheckCircle2, UserCheck, ChevronDown,
} from 'lucide-react';
import api from '../api';

const API = import.meta.env.VITE_API_URL ?? '';
function authHeaders(json = false) {
    const token = localStorage.getItem('authToken');
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

const FIELD_META = {
    email:           { icon: Mail,      label: 'Email',           color: '#3b82f6' },
    phone:           { icon: Phone,     label: 'Phone',           color: '#8b5cf6' },
    snapchat:        { icon: Camera,    label: 'Snapchat',        color: '#eab308' },
    instagram:       { icon: Instagram, label: 'Instagram',       color: '#ec4899' },
    telegram:        { icon: Send,      label: 'Telegram',        color: '#0ea5e9' },
    assigned_member: { icon: User,      label: 'Assigned Member', color: '#ef4444' },
};

const PRIORITY_OPTIONS = [
    { value: 'LOW',    label: '🟢 Low',    color: '#22c55e' },
    { value: 'MEDIUM', label: '🟡 Medium', color: '#f59e0b' },
    { value: 'HIGH',   label: '🔴 High',   color: '#ef4444' },
];

// ─── Assign Task Modal ────────────────────────────────────────
function AssignTaskModal({ player, onClose, onAssigned }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [assignedToId, setAssignedToId] = useState('');   // '' = anyone can claim
    const [priority, setPriority] = useState('MEDIUM');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch(`${API}/team-members`, { credentials: 'include', headers: authHeaders() })
            .then(r => r.json())
            .then(d => setTeamMembers(d.data || []))
            .catch(() => {});
    }, []);

    const handleAssign = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API}/players/${player.id}/assign-missing-info-task`, {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders(true),
                body: JSON.stringify({
                    assignedToId: assignedToId || null,
                    priority,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to assign task');
            setSuccess(true);
            setTimeout(() => onAssigned(data.data), 700);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(15,23,42,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px',
                boxShadow: '0 24px 60px rgba(15,23,42,.25)', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc',
                }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                            Assign as Task
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                            {player.name} · @{player.username}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Missing fields preview */}
                    <div style={{
                        padding: '12px', background: '#fff7ed', border: '1px solid #fed7aa',
                        borderRadius: '10px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#c2410c', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Missing Fields ({player.missingFields.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {player.missingFields.map(field => {
                                const meta = FIELD_META[field];
                                const Icon = meta?.icon || AlertTriangle;
                                return (
                                    <span key={field} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                                        background: `${meta?.color || '#ef4444'}15`,
                                        color: meta?.color || '#ef4444',
                                    }}>
                                        <Icon style={{ width: '10px', height: '10px' }} /> {meta?.label || field}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assign to */}
                    <div>
                        <label style={S.label}>Assign To</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={assignedToId}
                                onChange={e => setAssignedToId(e.target.value)}
                                style={{
                                    width: '100%', padding: '9px 32px 9px 12px',
                                    border: '1.5px solid #e2e8f0', borderRadius: '8px',
                                    fontSize: '13px', fontFamily: 'inherit',
                                    appearance: 'none', background: '#fff', cursor: 'pointer', outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            >
                                <option value="">Anyone can claim</option>
                                {teamMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                ))}
                            </select>
                            <ChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            "Anyone can claim" makes it visible to all team members.
                        </p>
                    </div>

                    {/* Priority */}
                    <div>
                        <label style={S.label}>Priority</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {PRIORITY_OPTIONS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value)}
                                    style={{
                                        flex: 1, padding: '8px 4px', borderRadius: '8px',
                                        border: `1.5px solid ${priority === p.value ? p.color : '#e2e8f0'}`,
                                        background: priority === p.value ? `${p.color}15` : '#fff',
                                        color: priority === p.value ? p.color : '#64748b',
                                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                        fontFamily: 'inherit', transition: 'all 0.15s',
                                    }}
                                >{p.label}</button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '12px', color: '#dc2626' }}>
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', color: '#16a34a' }}>
                            ✅ Task assigned successfully!
                        </div>
                    )}
                </div>

                <div style={{
                    padding: '14px 20px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', gap: '10px', background: '#f8fafc',
                }}>
                    <button onClick={onClose} disabled={saving} style={{
                        flex: 1, padding: '10px', background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                        color: '#374151', fontFamily: 'inherit',
                    }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={saving || success || player.missingFields.length === 0}
                        style={{
                            flex: 2, padding: '10px',
                            background: saving || success ? '#e2e8f0' : '#0f172a',
                            color: saving || success ? '#94a3b8' : '#fff',
                            border: 'none', borderRadius: '8px',
                            fontWeight: '700', fontSize: '13px', cursor: saving || success ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            fontFamily: 'inherit',
                        }}
                    >
                        <ClipboardList style={{ width: '14px', height: '14px' }} />
                        {saving ? 'Assigning…' : success ? 'Assigned!' : 'Assign Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Modal ───────────────────────────────────────────────
function EditModal({ player, onClose, onSaved }) {
    const [form, setForm] = useState({
        name:      player.name      || '',
        email:     player.email     || '',
        phone:     player.phone     || '',
        snapchat:  player.snapchat  || '',
        instagram: player.instagram || '',
        telegram:  player.telegram  || '',
    });
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState(null);
    const [success, setSuccess] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Name is required.'); return; }
        setSaving(true);
        setError(null);
        try {
            const updated = await api.players.updatePlayer(player.id, {
                name:      form.name      || undefined,
                email:     form.email     || null,
                phone:     form.phone     || null,
                snapchat:  form.snapchat  || null,
                instagram: form.instagram || null,
                telegram:  form.telegram  || null,
            });
            setSuccess(true);
            setTimeout(() => onSaved(updated.data), 800);
        } catch (err) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { key: 'name',      label: 'Full Name',  type: 'text',  required: true  },
        { key: 'email',     label: 'Email',       type: 'email', required: false },
        { key: 'phone',     label: 'Phone',       type: 'text',  required: false },
        { key: 'telegram',  label: 'Telegram',    type: 'text',  required: false },
        { key: 'instagram', label: 'Instagram',   type: 'text',  required: false },
        { key: 'snapchat',  label: 'Snapchat',    type: 'text',  required: false },
    ];

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(15,23,42,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px',
                boxShadow: '0 24px 60px rgba(15,23,42,.25)', overflow: 'hidden',
            }}>
                <div style={{
                    padding: '18px 20px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc',
                }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Edit Player</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>@{player.username}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {fields.map(f => {
                        const isMissing = player.missingFields?.includes(f.key);
                        return (
                            <div key={f.key}>
                                <label style={{
                                    display: 'block', fontSize: '11px', fontWeight: '700',
                                    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px',
                                }}>
                                    {f.label}
                                    {f.required && <span style={{ color: '#ef4444' }}> *</span>}
                                    {isMissing && (
                                        <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: '700', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px' }}>MISSING</span>
                                    )}
                                </label>
                                <input
                                    type={f.type}
                                    value={form[f.key]}
                                    onChange={set(f.key)}
                                    placeholder={`Enter ${f.label.toLowerCase()}…`}
                                    style={{
                                        width: '100%', padding: '9px 12px',
                                        border: `1.5px solid ${isMissing ? '#fca5a5' : '#e2e8f0'}`,
                                        borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
                                        outline: 'none', boxSizing: 'border-box',
                                        background: isMissing ? '#fff5f5' : '#fff',
                                    }}
                                    onFocus={e  => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e   => e.target.style.borderColor = isMissing ? '#fca5a5' : '#e2e8f0'}
                                />
                            </div>
                        );
                    })}
                    {error && (
                        <div style={{ padding: '10px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '12px', color: '#dc2626' }}>
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', color: '#16a34a' }}>
                            ✅ Player updated successfully!
                        </div>
                    )}
                </div>
                <div style={{
                    padding: '14px 20px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', gap: '10px', background: '#f8fafc',
                }}>
                    <button onClick={onClose} disabled={saving} style={{
                        flex: 1, padding: '10px', background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: '#374151',
                    }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || success}
                        style={{
                            flex: 2, padding: '10px',
                            background: saving || success ? '#e2e8f0' : '#0ea5e9',
                            color: saving || success ? '#94a3b8' : '#fff',
                            border: 'none', borderRadius: '8px',
                            fontWeight: '700', fontSize: '13px',
                            cursor: saving || success ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                    >
                        <Save style={{ width: '14px', height: '14px' }} />
                        {saving ? 'Saving…' : success ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Player Card ──────────────────────────────────────────────
function PlayerCard({ player, onEdit, onAssign, isAdmin, taskInfo }) {
    const tierColors = { BRONZE: '#b45309', SILVER: '#64748b', GOLD: '#d97706' };
    const tierBg     = { BRONZE: '#fef3c7', SILVER: '#f8fafc', GOLD: '#fffbeb' };

    const taskExists    = !!taskInfo;
    const taskCompleted = taskInfo?.status === 'COMPLETED';

    return (
        <div style={{
            ...S.playerCard,
            border: player.isCritical ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
            background: player.isCritical ? '#fffbfb' : '#fff',
        }}>
            {player.isCritical && (
                <div style={S.criticalBadge}>
                    <AlertTriangle style={{ width: '10px', height: '10px' }} /> CRITICAL
                </div>
            )}

            {/* ── Header ── */}
            <div style={S.playerHeader}>
                <div style={S.avatar}>{(player.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.playerName}>{player.name || 'Unnamed'}</div>
                    <div style={S.playerUsername}>@{player.username || '—'}</div>
                </div>
                <div style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                    flexShrink: 0,
                    background: tierBg[player.tier] || '#f8fafc',
                    color: tierColors[player.tier] || '#64748b',
                }}>
                    {player.tier || 'N/A'}
                </div>
            </div>

            {/* ── Assigned row ── */}
            <div style={S.assignedRow}>
                <User style={{ width: '11px', height: '11px', flexShrink: 0, color: player.assignedTo ? '#22c55e' : '#ef4444' }} />
                <span style={{ fontSize: '11px', color: player.assignedTo ? '#374151' : '#ef4444', wordBreak: 'break-word' }}>
                    {player.assignedTo ? `Assigned to ${player.assignedTo.name}` : 'No assigned member'}
                </span>
            </div>

            {/* ── Task status badge ── */}
            {taskExists && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px', marginBottom: '8px',
                    borderRadius: '7px', fontSize: '11px', fontWeight: '600',
                    background: taskCompleted ? '#f0fdf4' : '#eff6ff',
                    color:      taskCompleted ? '#16a34a' : '#2563eb',
                    border: `1px solid ${taskCompleted ? '#86efac' : '#bfdbfe'}`,
                }}>
                    {taskCompleted
                        ? <><CheckCircle2 style={{ width: '11px', height: '11px' }} /> Task Completed</>
                        : <><ClipboardList style={{ width: '11px', height: '11px' }} />
                            Task Assigned
                            {taskInfo?.assignedTo ? ` → ${taskInfo.assignedTo.name}` : ' · Open to claim'}
                          </>
                    }
                </div>
            )}

            {/* ── Missing fields ── */}
            <div style={S.missingSection}>
                <div style={S.missingSectionTitle}>Missing Fields ({player.missingFields.length})</div>
                <div style={S.fieldTags}>
                    {player.missingFields.length === 0 ? (
                        <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ All fields present</span>
                    ) : player.missingFields.map(field => {
                        const meta = FIELD_META[field];
                        const Icon = meta?.icon || AlertTriangle;
                        return (
                            <div key={field} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
                                background: `${meta?.color || '#ef4444'}15`,
                                color: meta?.color || '#ef4444',
                                border: `1px solid ${meta?.color || '#ef4444'}30`,
                                whiteSpace: 'nowrap',
                            }}>
                                <Icon style={{ width: '10px', height: '10px', flexShrink: 0 }} />
                                {meta?.label || field}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={S.playerFooter}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Added {new Date(player.createdAt).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Assign Task — admin only, only if not already active */}
                    {isAdmin && !taskExists && player.missingFields.length > 0 && (
                        <button
                            onClick={() => onAssign(player)}
                            style={{
                                fontSize: '11px', color: '#7c3aed', fontWeight: '600',
                                background: 'none', border: '1px solid #ddd6fe',
                                borderRadius: '6px', padding: '3px 10px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                fontFamily: 'inherit',
                            }}
                        >
                            <ClipboardList style={{ width: '10px', height: '10px' }} /> Assign Task
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(player)}
                        style={{
                            fontSize: '11px', color: '#3b82f6', fontWeight: '600',
                            background: 'none', border: '1px solid #bfdbfe',
                            borderRadius: '6px', padding: '3px 10px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontFamily: 'inherit',
                        }}
                    >
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon: Icon }) {
    return (
        <div style={{ ...S.statCard, background: bg, border: `1px solid ${color}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</div>
                <Icon style={{ width: '16px', height: '16px', color, opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>{label}</div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MissingPlayersPage({ currentUser }) {
    const [players,    setPlayers]    = useState([]);
    const [stats,      setStats]      = useState({});
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [search,     setSearch]     = useState('');
    const [filter,     setFilter]     = useState('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [editTarget,   setEditTarget]   = useState(null);
    const [assignTarget, setAssignTarget] = useState(null);

    // Map of playerId → task (MISSING_INFO tasks)
    const [missingTasks, setMissingTasks] = useState({});

    const sseRef = useRef(null);

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role);

    // ── Load players ──────────────────────────────────────────
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await api.players.getMissingInfo(true);
                setPlayers(data.data || []);
                setStats(data.stats || {});
            } catch (err) {
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [refreshKey]);

    // ── Load existing MISSING_INFO tasks ──────────────────────
    useEffect(() => {
        fetch(`${API}/tasks?taskType=MISSING_INFO`, {
            credentials: 'include',
            headers: authHeaders(),
        })
            .then(r => r.json())
            .then(data => {
                const map = {};
                (data.data || []).forEach(task => {
                    if (['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(task.status)) {
                        try {
                            const meta = JSON.parse(task.notes || '{}');
                            if (meta.playerId) map[meta.playerId] = task;
                        } catch {}
                    }
                });
                setMissingTasks(map);
            })
            .catch(() => {});
    }, [refreshKey]);

    // ── SSE — real-time task updates ──────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const url   = `${API}/tasks/events`;
        const es    = new EventSource(token ? `${url}?token=${token}` : url, { withCredentials: true });
        sseRef.current = es;

        es.onmessage = (e) => {
            try {
                const { type, data } = JSON.parse(e.data);
                if (data?.taskType !== 'MISSING_INFO') return;

                if (type === 'task_created' || type === 'task_updated') {
                    try {
                        const meta = JSON.parse(data.notes || '{}');
                        if (meta.playerId) {
                            setMissingTasks(prev => ({ ...prev, [meta.playerId]: data }));
                        }
                    } catch {}
                }
                if (type === 'task_deleted') {
                    setMissingTasks(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(pid => {
                            if (next[pid]?.id === data.id) delete next[pid];
                        });
                        return next;
                    });
                }
            } catch {}
        };

        es.onerror = () => {};
        return () => es.close();
    }, []);

    // ── After save: update player list in-place ───────────────
    const handleSaved = (updatedPlayer) => {
        setEditTarget(null);
        setPlayers(prev => {
            const next = prev.map(p => {
                if (p.id !== updatedPlayer.id) return p;
                const missing = [];
                if (!updatedPlayer.email)     missing.push('email');
                if (!updatedPlayer.phone)     missing.push('phone');
                if (!updatedPlayer.snapchat)  missing.push('snapchat');
                if (!updatedPlayer.instagram) missing.push('instagram');
                if (!updatedPlayer.telegram)  missing.push('telegram');
                if (!p.assignedToId)          missing.push('assigned_member');
                return { ...p, ...updatedPlayer, missingFields: missing, isCritical: missing.length >= 2 };
            });
            setStats({
                total:           next.length,
                critical:        next.filter(p => p.isCritical).length,
                missingEmail:    next.filter(p => p.missingFields.includes('email')).length,
                missingPhone:    next.filter(p => p.missingFields.includes('phone')).length,
                missingSnapchat: next.filter(p => p.missingFields.includes('snapchat')).length,
                unassigned:      next.filter(p => p.missingFields.includes('assigned_member')).length,
            });
            return next;
        });
    };

    // ── After task assigned ───────────────────────────────────
    const handleTaskAssigned = useCallback((task) => {
        setAssignTarget(null);
        try {
            const meta = JSON.parse(task.notes || '{}');
            if (meta.playerId) setMissingTasks(prev => ({ ...prev, [meta.playerId]: task }));
        } catch {}
    }, []);

    const filtered = players.filter(p => {
        const matchSearch =
            !search ||
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.username?.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ||
            (filter === 'critical' && p.isCritical) ||
            (FIELD_META[filter] && p.missingFields.includes(filter));
        return matchSearch && matchFilter;
    });

    return (
        <div style={S.page}>
            <div style={S.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={S.pageIcon}>
                        <AlertTriangle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                    </div>
                    <div>
                        <h1 style={S.pageTitle}>Missing Player Info</h1>
                        <p style={S.pageSub}>Players with incomplete or missing contact details</p>
                    </div>
                </div>
                <button onClick={() => setRefreshKey(k => k + 1)} style={S.refreshBtn}>
                    <RefreshCw style={{ width: '14px', height: '14px' }} /> Refresh
                </button>
            </div>

            <div style={S.statsGrid}>
                <StatCard label="Total Players"         value={stats.total           || 0} color="#64748b" bg="#f8fafc"  icon={Users} />
                <StatCard label="Critical (2+ missing)" value={stats.critical        || 0} color="#dc2626" bg="#fff1f2"  icon={AlertTriangle} />
                <StatCard label="Missing Snapchat"      value={stats.missingSnapchat || 0} color="#eab308" bg="#fefce8"  icon={Camera} />
                <StatCard label="Missing Phone"         value={stats.missingPhone    || 0} color="#8b5cf6" bg="#f5f3ff"  icon={Phone} />
                <StatCard label="Missing Email"         value={stats.missingEmail    || 0} color="#3b82f6" bg="#eff6ff"  icon={Mail} />
                <StatCard label="Unassigned"            value={stats.unassigned      || 0} color="#ef4444" bg="#fff1f2"  icon={User} />
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <Search style={S.searchIcon} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={S.searchInput}
                        placeholder="Search by name or username..."
                    />
                </div>
                <div style={S.filterRow}>
                    {['all', 'critical', 'snapchat', 'phone', 'email', 'instagram', 'telegram', 'assigned_member'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            ...S.filterBtn,
                            background: filter === f ? '#0f172a' : '#f8fafc',
                            color:      filter === f ? '#fff'     : '#64748b',
                            border: `1px solid ${filter === f ? '#0f172a' : '#e2e8f0'}`,
                        }}>
                            {f === 'all' ? 'All' : f === 'critical' ? '🔴 Critical' : FIELD_META[f]?.label || f}
                        </button>
                    ))}
                </div>
            </div>

            <div style={S.resultsCount}>
                Showing {filtered.length} of {players.length} players
                {filter !== 'all' && <span style={{ color: '#ef4444', marginLeft: '6px' }}>• filtered</span>}
                {Object.keys(missingTasks).length > 0 && (
                    <span style={{ color: '#2563eb', marginLeft: '8px' }}>
                        · {Object.keys(missingTasks).filter(pid => missingTasks[pid]?.status !== 'COMPLETED').length} task(s) active
                    </span>
                )}
            </div>

            {loading ? (
                <div style={S.empty}>Loading…</div>
            ) : error ? (
                <div style={{ ...S.empty, color: '#ef4444' }}>⚠️ {error}</div>
            ) : filtered.length === 0 ? (
                <div style={S.empty}>
                    {search || filter !== 'all'
                        ? 'No players match your filters.'
                        : '✅ All players have complete information!'}
                </div>
            ) : (
                <div style={S.playerGrid}>
                    {filtered.map(player => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            onEdit={setEditTarget}
                            onAssign={setAssignTarget}
                            isAdmin={isAdmin}
                            taskInfo={missingTasks[player.id] || null}
                        />
                    ))}
                </div>
            )}

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
                    onClose={() => setAssignTarget(null)}
                    onAssigned={handleTaskAssigned}
                />
            )}
        </div>
    );
}

const S = {
    page:            { padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '1400px', margin: '0 auto' },
    pageHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
    pageIcon:        { width: '44px', height: '44px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    pageTitle:       { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 },
    pageSub:         { fontSize: '13px', color: '#64748b', margin: '2px 0 0' },
    refreshBtn:      { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
    statsGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' },
    statCard:        { padding: '14px 16px', borderRadius: '12px' },
    toolbar:         { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' },
    searchWrap:      { position: 'relative' },
    searchIcon:      { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8' },
    searchInput:     { width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    filterRow:       { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    filterBtn:       { padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
    resultsCount:    { fontSize: '12px', color: '#64748b', marginBottom: '12px' },
    playerGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },

    /* Card — responsive internals */
    playerCard:      { borderRadius: '14px', padding: '14px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' },
    criticalBadge:   { position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px' },
    playerHeader:    { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' },
    avatar:          { width: '38px', height: '38px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#475569', flexShrink: 0 },
    playerName:      { fontSize: '14px', fontWeight: '700', color: '#0f172a', wordBreak: 'break-word', lineHeight: '1.3' },
    playerUsername:  { fontSize: '11px', color: '#94a3b8', marginTop: '1px', wordBreak: 'break-all' },
    assignedRow:     { display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' },
    missingSection:  { marginBottom: '10px' },
    missingSectionTitle: { fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
    fieldTags:       { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    playerFooter:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '6px' },
    empty:           { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '14px' },
    label:           { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' },
};
