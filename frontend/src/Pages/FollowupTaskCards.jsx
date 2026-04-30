// components/FollowupTaskCards.jsx
// Elegant redesign — refined luxury-fintech aesthetic.

import { useState, useMemo, useEffect } from 'react';
import {
    CheckCircle, Circle, ChevronDown, ChevronUp,
    UserCheck, Lock, Unlock, RefreshCw, Check, Undo2,
    Gift, User, X, ArrowRight, Zap, TrendingUp,
} from 'lucide-react';
import { useToast } from '../Context/toastContext';

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

// ── Design System ────────────────────────────────────────────────────────────
const DS = {
    // Neutrals
    ink: '#0d1117',
    inkMid: '#374151',
    inkSoft: '#6b7280',
    inkFaint: '#9ca3af',
    rule: '#e5e7eb',
    ruleFaint: '#f3f4f6',
    surface: '#ffffff',
    surfaceAlt: '#f9fafb',

    // Semantic
    emerald: { base: '#059669', light: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
    amber:   { base: '#d97706', light: '#fffbeb', border: '#fcd34d', text: '#92400e' },
    rose:    { base: '#e11d48', light: '#fff1f2', border: '#fda4af', text: '#9f1239' },
    sky:     { base: '#0284c7', light: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e' },
    violet:  { base: '#7c3aed', light: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95' },
    orange:  { base: '#ea580c', light: '#fff7ed', border: '#fdba74', text: '#7c2d12' },

    radius: { sm: '6px', md: '10px', lg: '14px', xl: '18px', pill: '999px' },
    shadow: {
        xs: '0 1px 2px rgba(0,0,0,.05)',
        sm: '0 1px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)',
        md: '0 4px 24px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)',
        lg: '0 12px 48px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.05)',
    },
    font: { xs: '11px', sm: '12px', base: '13px', md: '14px', lg: '16px', xl: '20px' },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700, black: 800 },
};

// ── Shared Primitives ────────────────────────────────────────────────────────

function Tag({ children, color, size = 'sm' }) {
    const pad = size === 'xs' ? '2px 7px' : '3px 9px';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: pad, borderRadius: DS.radius.pill,
            background: color.light, color: color.text,
            border: `1px solid ${color.border}`,
            fontSize: DS.font.xs, fontWeight: DS.weight.semibold,
            letterSpacing: '0.02em', whiteSpace: 'nowrap',
        }}>
            {children}
        </span>
    );
}

function Pill({ label, color }) {
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: DS.radius.pill,
            background: color.light, color: color.base,
            fontSize: DS.font.xs, fontWeight: DS.weight.bold, letterSpacing: '0.03em',
        }}>
            {label}
        </span>
    );
}

function ProgressRing({ pct, color, size = 36 }) {
    const r = (size - 4) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DS.ruleFaint} strokeWidth="3" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 100 ? DS.emerald.base : color} strokeWidth="3"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset .4s ease' }} />
        </svg>
    );
}

function SlimBar({ pct, color }) {
    return (
        <div style={{ height: '3px', background: DS.ruleFaint, borderRadius: DS.radius.pill, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 100 ? DS.emerald.base : color, borderRadius: DS.radius.pill, transition: 'width .4s ease' }} />
        </div>
    );
}

function ActionButton({ onClick, disabled, loading, children, variant = 'primary', color }) {
    const variants = {
        primary: { bg: color?.base || DS.sky.base, text: '#fff', border: 'none', shadow: `0 2px 8px ${(color?.base || DS.sky.base)}30` },
        ghost:   { bg: 'transparent', text: DS.inkSoft, border: `1px solid ${DS.rule}`, shadow: 'none' },
        soft:    { bg: color?.light || DS.sky.light, text: color?.text || DS.sky.text, border: `1px solid ${color?.border || DS.sky.border}`, shadow: 'none' },
    };
    const v = variants[variant];
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: DS.radius.md,
                border: v.border, background: disabled ? DS.ruleFaint : v.bg,
                color: disabled ? DS.inkFaint : v.text,
                fontSize: DS.font.sm, fontWeight: DS.weight.semibold,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all .15s ease',
                boxShadow: disabled ? 'none' : v.shadow,
                letterSpacing: '0.01em',
            }}
        >
            {loading
                ? <><RefreshCw style={{ width: '12px', height: '12px', animation: 'followupSpin 0.8s linear infinite' }} /> Working…</>
                : children
            }
        </button>
    );
}

function ClaimBadge({ task, myId }) {
    const isClaimedByMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
    const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
    const isCompleted = task.status === 'COMPLETED';

    if (isCompleted)
        return <Tag color={DS.emerald}><CheckCircle style={{ width: '9px', height: '9px' }} /> Complete</Tag>;
    if (isClaimedByMe)
        return <Tag color={DS.orange}><Lock style={{ width: '9px', height: '9px' }} /> Yours</Tag>;
    if (isClaimedByOther)
        return <Tag color={{ light: DS.surfaceAlt, border: DS.rule, text: DS.inkSoft }}><Lock style={{ width: '9px', height: '9px' }} /> {task.assignedTo?.name || 'Claimed'}</Tag>;
    return <Tag color={DS.sky}><Unlock style={{ width: '9px', height: '9px' }} /> Open</Tag>;
}

// ═══════════════════════════════════════════════════════════════
// PLAYER FOLLOWUP CARD
// ═══════════════════════════════════════════════════════════════
export function PlayerFollowupCard({ task, currentUser, onClaim, onUpdated }) {
    const { add: toast } = useToast();
    const [expanded, setExpanded] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [outcome, setOutcome] = useState('');
    const [focusedOutcome, setFocusedOutcome] = useState(false);

    const myId = extractUserId(currentUser);
    const meta = useMemo(() => { try { return JSON.parse(task.notes || '{}'); } catch { return {}; } }, [task.notes]);

    const checklist = task.checklistItems || [];
    const doneCount = checklist.filter(i => i.done).length;
    const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;
    const isClaimedByMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
    const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
    const isCompleted = task.status === 'COMPLETED';
    const isHC = meta.category === 'HIGHLY_CRITICAL';

    const accent = isCompleted ? DS.emerald : isHC ? DS.amber : DS.rose;

    const handleClaim = async () => {
        setClaiming(true);
        try {
            const res = await fetch(`${API}/tasks/${task.id}/claim`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            onClaim(data.data); toast('Task claimed.', 'success');
        } catch { toast('Could not claim task.', 'error'); }
        finally { setClaiming(false); }
    };

    const handleResolve = async (fieldKey) => {
        setResolving(true);
        try {
            const completedItems = [...checklist.filter(i => i.done).map(i => i.fieldKey || i.id), fieldKey].filter(Boolean);
            const res = await fetch(`${API}/tasks/${task.id}/resolve-followup`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ outcome, completedItems }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setOutcome(''); onUpdated(data.data);
        } catch { toast('Could not resolve step.', 'error'); }
        finally { setResolving(false); }
    };

    const handleUndo = async () => {
        setUndoing(true);
        try {
            const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onUpdated(data.data);
        } catch { toast('Could not undo.', 'error'); }
        finally { setUndoing(false); }
    };

    return (
        <div style={{
            background: DS.surface, borderRadius: DS.radius.xl,
            border: `1px solid ${DS.rule}`,
            borderLeft: `3px solid ${accent.base}`,
            boxShadow: DS.shadow.sm,
            overflow: 'hidden', opacity: isCompleted ? 0.75 : 1,
            transition: 'box-shadow .2s, opacity .2s',
        }}>
            {/* ── Header ── */}
            <div style={{ padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                {/* Progress ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <ProgressRing pct={pct} color={accent.base} size={40} />
                    <span style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: DS.weight.bold, color: accent.base, lineHeight: 1,
                    }}>
                        {isCompleted ? '✓' : `${pct}%`}
                    </span>
                </div>

                {/* Player info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span style={{ fontSize: DS.font.md, fontWeight: DS.weight.bold, color: DS.ink, letterSpacing: '-0.01em' }}>
                            {meta.playerName || 'Player'}
                        </span>
                        <span style={{ fontSize: DS.font.sm, color: DS.inkFaint, fontWeight: DS.weight.medium }}>
                            @{meta.username}
                        </span>
                        <Pill label={isHC ? 'High Priority' : 'Inactive'} color={accent} />
                        {meta.tier && <Pill label={meta.tier} color={DS.amber} />}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: DS.font.sm, color: DS.inkSoft }}>
                        <span>Last deposit <span style={{ color: DS.inkMid, fontWeight: DS.weight.medium }}>{meta.lastDepositDate || '—'}</span></span>
                        <span>Balance <span style={{ color: DS.emerald.base, fontWeight: DS.weight.semibold }}>${parseFloat(meta.balance || 0).toFixed(2)}</span></span>
                    </div>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <ClaimBadge task={task} myId={myId} />
                    {!isClaimedByOther && !isCompleted && (
                        <button
                            onClick={() => setExpanded(v => !v)}
                            style={{
                                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${DS.rule}`, borderRadius: DS.radius.md,
                                background: DS.surface, cursor: 'pointer', color: DS.inkFaint,
                                transition: 'all .15s',
                            }}
                        >
                            {expanded ? <ChevronUp style={{ width: '13px', height: '13px' }} /> : <ChevronDown style={{ width: '13px', height: '13px' }} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Expandable Body ── */}
            {expanded && !isCompleted && !isClaimedByOther && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Unclaimed CTA */}
                    {!task.assignedToId && (
                        <div style={{
                            padding: '14px 16px', borderRadius: DS.radius.lg,
                            background: accent.light, border: `1px solid ${accent.border}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                        }}>
                            <div>
                                <p style={{ margin: 0, fontSize: DS.font.sm, fontWeight: DS.weight.semibold, color: accent.text }}>
                                    This player needs a follow-up
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: DS.font.xs, color: accent.base, opacity: 0.8 }}>
                                    Claim to assign this to yourself
                                </p>
                            </div>
                            <ActionButton onClick={handleClaim} loading={claiming} color={accent}>
                                <UserCheck style={{ width: '12px', height: '12px' }} /> Claim
                            </ActionButton>
                        </div>
                    )}

                    {/* Checklist for claimer */}
                    {isClaimedByMe && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: DS.font.xs, fontWeight: DS.weight.semibold, color: DS.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                                    Steps · {doneCount} of {checklist.length}
                                </div>
                                {checklist.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 12px', borderRadius: DS.radius.md,
                                        background: item.done ? DS.emerald.light : DS.surfaceAlt,
                                        border: `1px solid ${item.done ? DS.emerald.border : DS.rule}`,
                                        transition: 'all .15s',
                                    }}>
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                            border: `2px solid ${item.done ? DS.emerald.base : DS.rule}`,
                                            background: item.done ? DS.emerald.base : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {item.done && <Check style={{ width: '9px', height: '9px', color: '#fff', strokeWidth: 3 }} />}
                                        </div>
                                        <span style={{
                                            flex: 1, fontSize: DS.font.sm,
                                            color: item.done ? DS.inkFaint : DS.inkMid,
                                            textDecoration: item.done ? 'line-through' : 'none',
                                        }}>
                                            {item.label}
                                        </span>
                                        {item.required && !item.done && (
                                            <span style={{ fontSize: '10px', color: DS.rose.base, fontWeight: DS.weight.bold }}>req</span>
                                        )}
                                        {!item.done && (
                                            <ActionButton onClick={() => handleResolve(item.fieldKey || item.id)} loading={resolving} variant="soft" color={DS.emerald}>
                                                <Check style={{ width: '11px', height: '11px', strokeWidth: 2.5 }} /> Done
                                            </ActionButton>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Outcome */}
                            <div>
                                <div style={{ fontSize: DS.font.xs, fontWeight: DS.weight.semibold, color: DS.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                                    Outcome note <span style={{ textTransform: 'none', fontWeight: DS.weight.normal, letterSpacing: 0 }}>— optional</span>
                                </div>
                                <textarea
                                    value={outcome}
                                    onChange={e => setOutcome(e.target.value)}
                                    onFocus={() => setFocusedOutcome(true)}
                                    onBlur={() => setFocusedOutcome(false)}
                                    rows={2}
                                    placeholder="What happened? Player confirmed deposit, couldn't reach…"
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        border: `1.5px solid ${focusedOutcome ? accent.base : DS.rule}`,
                                        borderRadius: DS.radius.md, resize: 'none',
                                        fontSize: DS.font.sm, fontFamily: 'inherit',
                                        lineHeight: '1.6', color: DS.ink,
                                        background: focusedOutcome ? DS.surface : DS.surfaceAlt,
                                        outline: 'none', boxSizing: 'border-box',
                                        transition: 'all .15s',
                                        boxShadow: focusedOutcome ? `0 0 0 3px ${accent.border}` : 'none',
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Completed State ── */}
            {isCompleted && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: DS.font.sm }}>
                        <CheckCircle style={{ width: '14px', height: '14px', color: DS.emerald.base, flexShrink: 0 }} />
                        <span style={{ color: DS.inkSoft }}>
                            Completed for <strong style={{ color: DS.inkMid }}>@{meta.username}</strong>
                            {meta.outcome && <> — <em style={{ color: DS.inkFaint }}>{meta.outcome}</em></>}
                        </span>
                    </div>
                    {(isClaimedByMe || !task.assignedToId) && (
                        <ActionButton onClick={handleUndo} loading={undoing} variant="ghost">
                            <Undo2 style={{ width: '11px', height: '11px' }} /> Undo
                        </ActionButton>
                    )}
                </div>
            )}

            {/* ── Claimed by Other ── */}
            {isClaimedByOther && !isCompleted && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '10px 18px', fontSize: DS.font.sm, color: DS.inkSoft, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                    <strong style={{ color: DS.inkMid }}>{task.assignedTo?.name}</strong> is handling this player.
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// BONUS FOLLOWUP CARD
// ═══════════════════════════════════════════════════════════════
export function BonusFollowupCard({ task, currentUser, onClaim, onUpdated }) {
    const { add: toast } = useToast();
    const [expanded, setExpanded] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [granting, setGranting] = useState(false);
    const [undoing, setUndoing] = useState(false);

    const myId = extractUserId(currentUser);
    const meta = useMemo(() => { try { return JSON.parse(task.notes || '{}'); } catch { return {}; } }, [task.notes]);

    const checklist = task.checklistItems || [];
    const isClaimedByMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
    const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
    const isCompleted = task.status === 'COMPLETED';

    const bonusCfg = {
        streak:   { color: DS.amber,  icon: '🔥', label: 'Streak',   hint: 'Go to Bonuses → Grant streak bonus to this player.' },
        referral: { color: DS.emerald, icon: '👥', label: 'Referral', hint: 'Go to Bonuses → Grant referral bonus to player and their referrer.' },
        match:    { color: DS.sky,    icon: '💰', label: 'Match',    hint: 'Go to Bonuses → Grant match deposit bonus (50%).' },
    }[meta.bonusType] || { color: DS.violet, icon: '🎁', label: 'Bonus', hint: 'Grant the bonus from the Bonuses page.' };

    const accent = isCompleted ? DS.emerald : bonusCfg.color;

    const handleClaim = async () => {
        setClaiming(true);
        try {
            const res = await fetch(`${API}/tasks/${task.id}/claim`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onClaim(data.data);
        } catch { toast('Could not claim task.', 'error'); }
        finally { setClaiming(false); }
    };

    const handleMarkGranted = async () => {
        setGranting(true);
        try {
            const res = await fetch(`${API}/tasks/${task.id}/resolve-followup`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ outcome: 'Bonus granted', completedItems: checklist.map(i => i.fieldKey || i.id) }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onUpdated(data.data);
        } catch { toast('Could not resolve task.', 'error'); }
        finally { setGranting(false); }
    };

    const handleUndo = async () => {
        setUndoing(true);
        try {
            const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onUpdated(data.data);
        } catch { toast('Could not undo.', 'error'); }
        finally { setUndoing(false); }
    };

    return (
        <div style={{
            background: DS.surface, borderRadius: DS.radius.xl,
            border: `1px solid ${DS.rule}`,
            borderLeft: `3px solid ${accent.base}`,
            boxShadow: DS.shadow.sm,
            overflow: 'hidden', opacity: isCompleted ? 0.75 : 1,
            transition: 'opacity .2s',
        }}>
            {/* ── Header ── */}
            <div style={{ padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                {/* Bonus icon pill */}
                <div style={{
                    width: '40px', height: '40px', flexShrink: 0, borderRadius: DS.radius.lg,
                    background: accent.light, border: `1px solid ${accent.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                }}>
                    {isCompleted ? '✅' : bonusCfg.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span style={{ fontSize: DS.font.md, fontWeight: DS.weight.bold, color: DS.ink, letterSpacing: '-0.01em' }}>
                            {meta.playerName}
                        </span>
                        <span style={{ fontSize: DS.font.sm, color: DS.inkFaint }}>@{meta.username}</span>
                        <Pill label={bonusCfg.label} color={bonusCfg.color} />
                    </div>
                    <p style={{ margin: 0, fontSize: DS.font.sm, color: DS.inkSoft, lineHeight: '1.5' }}>{meta.details}</p>
                    {meta.eligibleAmount && (
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: DS.font.xs, color: DS.inkFaint }}>Eligible</span>
                            <span style={{ fontSize: DS.font.base, fontWeight: DS.weight.bold, color: accent.base }}>
                                ${parseFloat(meta.eligibleAmount).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <ClaimBadge task={task} myId={myId} />
                    {!isClaimedByOther && !isCompleted && (
                        <button
                            onClick={() => setExpanded(v => !v)}
                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${DS.rule}`, borderRadius: DS.radius.md, background: DS.surface, cursor: 'pointer', color: DS.inkFaint }}
                        >
                            {expanded ? <ChevronUp style={{ width: '13px', height: '13px' }} /> : <ChevronDown style={{ width: '13px', height: '13px' }} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            {expanded && !isCompleted && !isClaimedByOther && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Hint */}
                    <div style={{ padding: '10px 14px', borderRadius: DS.radius.md, background: accent.light, border: `1px solid ${accent.border}`, fontSize: DS.font.sm, color: accent.text, lineHeight: '1.55' }}>
                        <strong style={{ fontWeight: DS.weight.semibold }}>How to resolve: </strong>{bonusCfg.hint}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {!task.assignedToId && (
                            <ActionButton onClick={handleClaim} loading={claiming} color={accent}>
                                <UserCheck style={{ width: '12px', height: '12px' }} /> Claim
                            </ActionButton>
                        )}
                        {isClaimedByMe && (
                            <ActionButton onClick={handleMarkGranted} loading={granting} color={DS.emerald}>
                                <Gift style={{ width: '12px', height: '12px' }} /> Mark Granted
                            </ActionButton>
                        )}
                    </div>
                </div>
            )}

            {/* ── Completed ── */}
            {isCompleted && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: DS.font.sm, color: DS.inkSoft }}>
                        <CheckCircle style={{ width: '14px', height: '14px', color: DS.emerald.base, flexShrink: 0 }} />
                        Bonus granted for <strong style={{ color: DS.inkMid }}>@{meta.username}</strong>
                    </div>
                    {(isClaimedByMe || !task.assignedToId) && (
                        <ActionButton onClick={handleUndo} loading={undoing} variant="ghost">
                            <Undo2 style={{ width: '11px', height: '11px' }} /> Undo
                        </ActionButton>
                    )}
                </div>
            )}

            {/* ── Claimed by other ── */}
            {isClaimedByOther && !isCompleted && (
                <div style={{ borderTop: `1px solid ${DS.ruleFaint}`, padding: '10px 18px', fontSize: DS.font.sm, color: DS.inkSoft, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                    <strong style={{ color: DS.inkMid }}>{task.assignedTo?.name}</strong> is handling this bonus.
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN FOLLOWUP PANEL
// ═══════════════════════════════════════════════════════════════
export function AdminFollowupPanel({ teamMembers = [], onTaskUpdated }) {
    const { add: toast } = useToast();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState({ player: false, bonus: false });
    const [assigning, setAssigning] = useState(null);
    const [activeSection, setActiveSection] = useState('player');

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tasks/followup-summary`, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSummary(data);
        } catch { toast('Failed to load summary.', 'error'); }
        finally { setLoading(false); }
    };

    const generate = async (type) => {
        setGenerating(g => ({ ...g, [type]: true }));
        try {
            const endpoint = type === 'player' ? 'generate-player-followup' : 'generate-bonus-followup';
            const res = await fetch(`${API}/tasks/${endpoint}`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(true) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast('Follow-up tasks generated.', 'success');
            load(); if (onTaskUpdated) onTaskUpdated();
        } catch { toast('Generation failed.', 'error'); }
        finally { setGenerating(g => ({ ...g, [type]: false })); }
    };

    const assign = async (taskId, memberId) => {
        setAssigning(taskId);
        try {
            const res = await fetch(`${API}/tasks/${taskId}/assign`, { method: 'PATCH', credentials: 'include', headers: getAuthHeaders(true), body: JSON.stringify({ assignedToId: memberId || null }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast('Assigned.', 'success');
            load(); if (onTaskUpdated) onTaskUpdated();
        } catch { toast('Assignment failed.', 'error'); }
        finally { setAssigning(null); }
    };

    useState(() => { load(); }, []);

    const tasks = activeSection === 'player'
        ? (summary?.playerFollowup?.tasks || [])
        : (summary?.bonusFollowup?.tasks || []);

    const parseMeta = t => { try { return JSON.parse(t.notes || '{}'); } catch { return {}; } };

    // Summary stat definitions
    const stats = summary ? [
        { label: 'Player Tasks', value: summary.playerFollowup.total, sub: `${summary.playerFollowup.unclaimed} open`, color: DS.amber, section: 'player' },
        { label: 'High Priority', value: summary.playerFollowup.hc, sub: 'Critical outreach', color: DS.rose, section: 'player' },
        { label: 'Inactive', value: summary.playerFollowup.inactive, sub: '7d no deposit', color: DS.orange, section: 'player' },
        { label: 'Bonus Tasks', value: summary.bonusFollowup.total, sub: `${summary.bonusFollowup.unclaimed} open`, color: DS.emerald, section: 'bonus' },
        { label: 'Streak', value: summary.bonusFollowup.streak, sub: 'Eligible', color: DS.amber, section: 'bonus' },
        { label: 'Referral', value: summary.bonusFollowup.referral, sub: 'Pending', color: DS.violet, section: 'bonus' },
        { label: 'Match', value: summary.bonusFollowup.match, sub: 'Recent deposits', color: DS.sky, section: 'bonus' },
    ] : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <ActionButton onClick={() => { load(); if (onTaskUpdated) onTaskUpdated(); }} loading={loading} variant="ghost">
                    <RefreshCw style={{ width: '12px', height: '12px' }} /> Refresh
                </ActionButton>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ActionButton onClick={() => generate('player')} loading={generating.player} color={DS.amber}>
                        <Zap style={{ width: '12px', height: '12px' }} /> Generate Players
                    </ActionButton>
                    <ActionButton onClick={() => generate('bonus')} loading={generating.bonus} color={DS.emerald}>
                        <Gift style={{ width: '12px', height: '12px' }} /> Generate Bonuses
                    </ActionButton>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {stats.map(s => (
                        <button
                            key={s.label}
                            onClick={() => setActiveSection(s.section)}
                            style={{
                                padding: '14px 16px', textAlign: 'left',
                                background: activeSection === s.section && s.section ? s.color.light : DS.surface,
                                border: `1.5px solid ${activeSection === s.section ? s.color.border : DS.rule}`,
                                borderRadius: DS.radius.lg, cursor: 'pointer',
                                transition: 'all .18s ease', fontFamily: 'inherit',
                            }}
                        >
                            <div style={{ fontSize: '22px', fontWeight: DS.weight.black, color: s.color.base, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: DS.font.sm, fontWeight: DS.weight.semibold, color: DS.inkMid, marginTop: '5px', letterSpacing: '-0.01em' }}>{s.label}</div>
                            <div style={{ fontSize: DS.font.xs, color: DS.inkFaint, marginTop: '2px' }}>{s.sub}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${DS.rule}`, gap: '0' }}>
                {[
                    { id: 'player', label: 'Player Follow-up', count: summary?.playerFollowup?.total ?? 0 },
                    { id: 'bonus',  label: 'Bonus Follow-up',  count: summary?.bonusFollowup?.total ?? 0 },
                ].map(tab => {
                    const active = activeSection === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
                            padding: '9px 20px', border: 'none', fontFamily: 'inherit',
                            fontSize: DS.font.sm, fontWeight: active ? DS.weight.semibold : DS.weight.medium,
                            cursor: 'pointer', background: 'transparent',
                            color: active ? DS.sky.base : DS.inkFaint,
                            borderBottom: `2px solid ${active ? DS.sky.base : 'transparent'}`,
                            marginBottom: '-1px', transition: 'all .15s',
                            display: 'flex', alignItems: 'center', gap: '7px',
                        }}>
                            {tab.label}
                            <span style={{
                                display: 'inline-block', padding: '1px 7px', borderRadius: DS.radius.pill,
                                background: active ? DS.sky.light : DS.ruleFaint,
                                color: active ? DS.sky.base : DS.inkFaint,
                                fontSize: DS.font.xs, fontWeight: DS.weight.bold,
                            }}>{tab.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Task List ── */}
            {loading ? (
                <div style={{ padding: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: DS.inkFaint, fontSize: DS.font.sm }}>
                    <RefreshCw style={{ width: '14px', height: '14px', animation: 'followupSpin 0.8s linear infinite' }} /> Loading…
                </div>
            ) : tasks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: DS.ruleFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '20px' }}>
                        {activeSection === 'player' ? '👤' : '🎁'}
                    </div>
                    <p style={{ margin: 0, fontSize: DS.font.md, fontWeight: DS.weight.semibold, color: DS.inkMid }}>No tasks yet</p>
                    <p style={{ margin: '4px 0 0', fontSize: DS.font.sm, color: DS.inkFaint }}>Click Generate to create follow-up tasks.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {tasks.map(task => {
                        const meta = parseMeta(task);
                        const isHigh = task.priority === 'HIGH';
                        const accent = activeSection === 'player'
                            ? (meta.category === 'HIGHLY_CRITICAL' ? DS.amber : DS.rose)
                            : ({ streak: DS.amber, referral: DS.emerald, match: DS.sky }[meta.bonusType] || DS.violet);
                        const isAssigningThis = assigning === task.id;

                        return (
                            <div key={task.id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                                padding: '12px 16px',
                                background: DS.surface,
                                border: `1px solid ${DS.rule}`,
                                borderLeft: `3px solid ${accent.base}`,
                                borderRadius: DS.radius.lg,
                                transition: 'border-color .15s',
                            }}>
                                {/* Type icon */}
                                <span style={{ fontSize: '16px', flexShrink: 0 }}>
                                    {activeSection === 'player'
                                        ? (meta.category === 'HIGHLY_CRITICAL' ? '🟡' : '🔴')
                                        : ({ streak: '🔥', referral: '👥', match: '💰' }[meta.bonusType] || '🎁')}
                                </span>

                                {/* Main info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: DS.font.base, fontWeight: DS.weight.semibold, color: DS.ink }}>
                                        {meta.playerName}{' '}
                                        <span style={{ fontSize: DS.font.sm, fontWeight: DS.weight.normal, color: DS.inkFaint }}>@{meta.username}</span>
                                    </div>
                                    <div style={{ fontSize: DS.font.xs, color: DS.inkFaint, marginTop: '2px' }}>
                                        {activeSection === 'player'
                                            ? `Last deposit: ${meta.lastDepositDate || '—'} · Balance: $${parseFloat(meta.balance || 0).toFixed(2)}`
                                            : meta.details}
                                    </div>
                                </div>

                                {/* Assignee */}
                                <div style={{ fontSize: DS.font.xs, fontWeight: DS.weight.medium, color: task.assignedToId ? DS.sky.base : DS.inkFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {task.assignedToId ? `→ ${task.assignedTo?.name || `#${task.assignedToId}`}` : 'Unassigned'}
                                </div>

                                {/* Assign dropdown */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <select
                                        value={task.assignedToId || ''}
                                        onChange={e => assign(task.id, e.target.value ? parseInt(e.target.value) : null)}
                                        disabled={isAssigningThis}
                                        style={{
                                            padding: '7px 28px 7px 10px', border: `1px solid ${DS.rule}`,
                                            borderRadius: DS.radius.md, fontSize: DS.font.xs, fontFamily: 'inherit',
                                            cursor: 'pointer', background: DS.surface, color: DS.inkMid,
                                            minWidth: '130px', appearance: 'none', outline: 'none',
                                        }}
                                    >
                                        <option value="">Open to all</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                                    </select>
                                    <ChevronDown style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '11px', height: '11px', color: DS.inkFaint, pointerEvents: 'none' }} />
                                </div>

                                {isAssigningThis && <RefreshCw style={{ width: '13px', height: '13px', color: DS.inkFaint, animation: 'followupSpin 0.8s linear infinite', flexShrink: 0 }} />}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`@keyframes followupSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
