import { useState } from 'react';
import {
    CheckCircle, Circle, Clock, AlertCircle, ChevronDown, ChevronUp,
    BarChart2, Users, TrendingUp, List, Zap, User
} from 'lucide-react';

// ============================================================
// TaskCard — Unified task card for TeamDashboard
// Handles all 4 task types with real-time progress display.
//
// Props:
//   task            — task object from API
//   onStatusChange  — (taskId, status) => void
//   onChecklistToggle — (taskId, itemId, done) => void
//   onProgressLog   — (taskId, value) => void (for manual entry)
//   currentUserId   — logged in user's ID
// ============================================================

const PRIORITY_COLORS = {
    URGENT: { bg: '#fff1f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
    HIGH: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
    MEDIUM: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#eab308' },
    LOW: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#22c55e' },
};

const TASK_TYPE_META = {
    STANDARD: { icon: List, label: 'Standard', color: '#64748b' },
    DAILY_CHECKLIST: { icon: CheckCircle, label: 'Daily', color: '#0ea5e9' },
    PLAYER_ADDITION: { icon: Users, label: 'Players', color: '#8b5cf6' },
    REVENUE_TARGET: { icon: TrendingUp, label: 'Revenue', color: '#22c55e' },
};

export default function TaskCard({ task, onStatusChange, onChecklistToggle, onProgressLog, currentUserId }) {
    const [expanded, setExpanded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [progressInput, setProgressInput] = useState('');

    const pMeta = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM;
    const tMeta = TASK_TYPE_META[task.taskType] || TASK_TYPE_META.STANDARD;
    const TypeIcon = tMeta.icon;

    const checklist = task.checklistItems || [];
    const checkedCount = checklist.filter(i => i.done).length;
    const myChecklist = checklist.filter(i => !i.completedBy || i.completedBy === currentUserId);

    // Progress percentage for PLAYER_ADDITION / REVENUE_TARGET
    const hasProgress = task.targetValue > 0;
    const pct = hasProgress ? Math.min(100, Math.round((task.currentValue / task.targetValue) * 100)) : null;

    const isCompleted = task.status === 'COMPLETED';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

    // My sub-task (if any)
    const mySubTask = task.subTasks?.find(st => st.assignedToId === currentUserId);

    async function handleCheckbox(itemId, done) {
        if (submitting) return;
        setSubmitting(true);
        try {
            await onChecklistToggle?.(task.id, itemId, done);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleProgressSubmit() {
        const val = parseFloat(progressInput);
        if (!val || val <= 0) return;
        setSubmitting(true);
        try {
            await onProgressLog?.(task.id, val);
            setProgressInput('');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleMarkDone() {
        if (submitting) return;
        setSubmitting(true);
        try {
            await onStatusChange?.(task.id, isCompleted ? 'PENDING' : 'COMPLETED');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{
            border: `1px solid ${isCompleted ? '#dcfce7' : isOverdue ? '#fecaca' : '#e2e8f0'}`,
            borderLeft: `3px solid ${isCompleted ? '#22c55e' : isOverdue ? '#ef4444' : pMeta.dot}`,
            borderRadius: '12px',
            background: isCompleted ? '#f0fdf4' : isOverdue ? '#fffbfb' : '#fff',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            opacity: isCompleted ? 0.85 : 1,
            transition: 'all 0.2s',
        }}>
            {/* Header row */}
            <div style={{ padding: '12px 14px 10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {/* Complete toggle */}
                <button
                    onClick={handleMarkDone}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px', flexShrink: 0, marginTop: '1px' }}
                >
                    {isCompleted
                        ? <CheckCircle style={{ width: '18px', height: '18px', color: '#22c55e' }} />
                        : <Circle style={{ width: '18px', height: '18px', color: '#cbd5e1' }} />
                    }
                </button>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '14px', fontWeight: '700', color: isCompleted ? '#64748b' : '#0f172a',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            flex: 1, minWidth: '120px',
                        }}>
                            {task.title}
                        </span>

                        {/* Badges row */}
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap' }}>
                            {/* Task type */}
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                background: `${tMeta.color}18`, color: tMeta.color,
                            }}>
                                <TypeIcon style={{ width: '10px', height: '10px' }} />
                                {tMeta.label}
                            </span>

                            {/* Priority */}
                            <span style={{
                                padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                background: pMeta.bg, color: pMeta.text,
                            }}>
                                {task.priority}
                            </span>

                            {/* Overdue */}
                            {isOverdue && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                    background: '#fff1f2', color: '#dc2626',
                                }}>
                                    <AlertCircle style={{ width: '9px', height: '9px' }} />
                                    Overdue
                                </span>
                            )}

                            {/* Daily badge */}
                            {task.isDaily && (
                                <span style={{
                                    padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                    background: '#eff6ff', color: '#3b82f6',
                                }}>
                                    Daily
                                </span>
                            )}
                        </div>
                    </div>

                    {task.description && (
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', lineHeight: '1.4' }}>
                            {task.description}
                        </p>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {task.dueDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                                <Clock style={{ width: '10px', height: '10px' }} />
                                Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                        {task.assignedTo && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#94a3b8' }}>
                                <User style={{ width: '10px', height: '10px' }} />
                                {task.assignedTo.name}
                            </span>
                        )}
                        {task.assignToAll && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#8b5cf6' }}>
                                <Users style={{ width: '10px', height: '10px' }} />
                                All members
                            </span>
                        )}
                    </div>
                </div>

                {/* Expand toggle */}
                {(checklist.length > 0 || hasProgress || task.subTasks?.length > 0) && (
                    <button
                        onClick={() => setExpanded(e => !e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8', flexShrink: 0 }}
                    >
                        {expanded
                            ? <ChevronUp style={{ width: '16px', height: '16px' }} />
                            : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                    </button>
                )}
            </div>

            {/* ── PROGRESS BAR (always visible) ── */}
            {hasProgress && (
                <div style={{ padding: '0 14px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                            {task.taskType === 'REVENUE_TARGET'
                                ? `$${(task.currentValue || 0).toLocaleString()} / $${task.targetValue.toLocaleString()}`
                                : `${task.currentValue || 0} / ${task.targetValue} players`}
                        </span>
                        <span style={{
                            fontSize: '12px', fontWeight: '800',
                            color: pct >= 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#f59e0b'
                        }}>
                            {pct}%
                        </span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: '999px',
                            transition: 'width 0.4s cubic-bezier(.4,0,.2,1)',
                            background: pct >= 100
                                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : pct >= 50
                                    ? 'linear-gradient(90deg, #2563eb, #3b82f6)'
                                    : 'linear-gradient(90deg, #d97706, #f59e0b)',
                            width: `${pct}%`,
                        }} />
                    </div>

                    {/* My sub-task highlight */}
                    {mySubTask && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: mySubTask.status === 'COMPLETED' ? '#22c55e' : '#3b82f6',
                                flexShrink: 0,
                            }} />
                            <span style={{ color: '#64748b' }}>My target:</span>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                {task.taskType === 'REVENUE_TARGET'
                                    ? `$${mySubTask.currentValue} / $${mySubTask.targetValue}`
                                    : `${mySubTask.currentValue} / ${mySubTask.targetValue} players`}
                            </span>
                            {mySubTask.status === 'COMPLETED' && (
                                <CheckCircle style={{ width: '12px', height: '12px', color: '#22c55e' }} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── CHECKLIST SUMMARY (always visible if has items) ── */}
            {checklist.length > 0 && (
                <div style={{ padding: '0 14px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            height: '4px',
                            background: '#f1f5f9', borderRadius: '999px', flex: 1, overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: '999px',
                                background: checkedCount === checklist.length ? '#22c55e' : '#0ea5e9',
                                width: `${checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0}%`,
                                transition: 'width 0.3s ease',
                            }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', flexShrink: 0 }}>
                            {checkedCount}/{checklist.length}
                        </span>
                    </div>
                </div>
            )}

            {/* ── EXPANDED SECTION ── */}
            {expanded && (
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    {/* Checklist items */}
                    {checklist.length > 0 && (
                        <div style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                Checklist
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {checklist.map(item => (
                                    <label key={item.id} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                                        cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                                        background: item.done ? '#f0fdf4' : '#f8fafc',
                                        border: `1px solid ${item.done ? '#bbf7d0' : '#f1f5f9'}`,
                                        transition: 'all 0.15s',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={!!item.done}
                                            onChange={e => handleCheckbox(item.id, e.target.checked)}
                                            style={{ width: '14px', height: '14px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }}
                                        />
                                        <span style={{
                                            fontSize: '12px', color: item.done ? '#86efac' : '#374151',
                                            textDecoration: item.done ? 'line-through' : 'none',
                                            flex: 1, lineHeight: '1.4',
                                        }}>
                                            {item.label}
                                            {item.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
                                        </span>
                                        {item.done && (
                                            <CheckCircle style={{ width: '12px', height: '12px', color: '#22c55e', flexShrink: 0 }} />
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sub-task breakdown */}
                    {task.subTasks?.length > 0 && (
                        <div style={{ padding: '12px 14px', borderTop: checklist.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                Member Allocations
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {task.subTasks.map(st => {
                                    const stPct = st.targetValue ? Math.min(100, Math.round((st.currentValue / st.targetValue) * 100)) : 0;
                                    const isMe = st.assignedToId === currentUserId;
                                    return (
                                        <div key={st.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                                            padding: '6px 8px', borderRadius: '8px',
                                            background: isMe ? '#f0f9ff' : '#f8fafc',
                                            border: `1px solid ${isMe ? '#bae6fd' : '#f1f5f9'}`,
                                        }}>
                                            <div style={{
                                                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                                background: st.status === 'COMPLETED' ? '#22c55e' : stPct > 0 ? '#3b82f6' : '#cbd5e1',
                                            }} />
                                            <span style={{ flex: 1, color: '#374151', fontWeight: isMe ? '700' : '400' }}>
                                                {st.assignedTo?.name || 'Unassigned'}
                                                {isMe && <span style={{ color: '#0ea5e9', marginLeft: '4px', fontSize: '10px' }}>← You</span>}
                                            </span>
                                            <span style={{ color: '#64748b', fontWeight: '600' }}>
                                                {task.taskType === 'REVENUE_TARGET'
                                                    ? `$${st.currentValue} / $${st.targetValue}`
                                                    : `${st.currentValue} / ${st.targetValue}`}
                                            </span>
                                            <div style={{ width: '50px', height: '4px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${stPct}%`, borderRadius: '999px', background: stPct >= 100 ? '#22c55e' : '#3b82f6' }} />
                                            </div>
                                            {st.status === 'COMPLETED' && (
                                                <CheckCircle style={{ width: '12px', height: '12px', color: '#22c55e', flexShrink: 0 }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Progress log — recent activity */}
                    {task.progressLogs?.length > 0 && (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                Recent Activity
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                                {task.progressLogs.slice(0, 8).map((log, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b', alignItems: 'center' }}>
                                        <Zap style={{ width: '10px', height: '10px', color: '#8b5cf6', flexShrink: 0 }} />
                                        <span style={{ fontWeight: '600', color: '#374151' }}>{log.user?.name}</span>
                                        <span>{log.action?.replace(/_/g, ' ').toLowerCase()}</span>
                                        {log.value > 0 && <span style={{ color: '#22c55e', fontWeight: '700' }}>+{log.value}</span>}
                                        {log.metadata?.playerName && <span style={{ color: '#94a3b8' }}>({log.metadata.playerName})</span>}
                                        <span style={{ marginLeft: 'auto', color: '#cbd5e1', flexShrink: 0 }}>
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {task.notes && (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                Notes
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>{task.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
