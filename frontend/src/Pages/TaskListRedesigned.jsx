// ══════════════════════════════════════════════════════════════
// TaskListRedesigned.jsx
// Drop-in replacement for the {activeTab === "tasks"} block in
// MemberTasksSection / TeamDashboard. Same props, same handlers.
//
// Design principles:
//   1. Three urgency buckets (Needs Attention / In Progress / Pending)
//   2. One right-side signal per row — never competing metadata
//   3. Completed tasks hidden behind a toggle
//   4. Checklists expand inline on row click
//   5. Thin left border = only persistent priority signal
// ══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import {
    Circle, CheckCircle, ChevronDown, ChevronUp,
    RefreshCw, Search, Check, Plus,
} from "lucide-react";

// ─── Priority colors (thin left bar only) ─────────────────────
const PRIORITY_COLOR = {
    URGENT: "#dc2626",
    HIGH: "#f97316",
    MEDIUM: "#f59e0b",
    LOW: "#22c55e",
};

// ─── Urgency bucket config ─────────────────────────────────────
const BUCKETS = {
    overdue: { label: "Needs attention", color: "#dc2626", light: "#fef2f2", defaultOpen: true },
    active: { label: "In progress", color: "#2563eb", light: "#eff6ff", defaultOpen: true },
    pending: { label: "Pending", color: "#94a3b8", light: "#f1f5f9", defaultOpen: true },
};

// ─── Helpers ──────────────────────────────────────────────────
function isOverdue(task) {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
}
function overdueDays(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "1d overdue";
    return `${diff}d overdue`;
}
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── What to show on the right of each row (pick ONE) ─────────
function RowIndicator({ task }) {
    const s = { fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0, paddingRight: "12px" };

    // 1. Overdue badge — most urgent
    if (isOverdue(task)) {
        return (
            <span style={{ ...s, color: "#dc2626", fontWeight: "500" }}>
                {overdueDays(task.dueDate)}
            </span>
        );
    }

    // 2. Progress bar for numeric targets
    if (task.targetValue > 0 && task.currentValue != null) {
        const pct = Math.min(100, Math.round((task.currentValue / task.targetValue) * 100));
        const barColor = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#3b82f6";
        return (
            <span style={{ ...s, color: "var(--color-text-secondary)" }}>
                <div style={{ width: "48px", height: "3px", background: "var(--color-border-tertiary)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "999px", transition: "width .3s" }} />
                </div>
                {pct}%
            </span>
        );
    }

    // 3. Checklist progress
    const cl = task.checklistItems || [];
    if (cl.length > 0) {
        const done = cl.filter(i => i.done).length;
        return <span style={{ ...s, color: "var(--color-text-secondary)" }}>{done}/{cl.length}</span>;
    }

    // 4. Due date (future)
    if (task.dueDate) {
        return <span style={{ ...s, color: "var(--color-text-tertiary)" }}>{fmtDate(task.dueDate)}</span>;
    }

    // 5. Assignee
    if (task.assignedTo?.name) {
        return <span style={{ ...s, color: "var(--color-text-tertiary)" }}>{task.assignedTo.name}</span>;
    }

    return null;
}

// ─── Inline checklist (expanded below the row) ────────────────
function InlineChecklist({ task, onChecklistToggle }) {
    const [toggling, setToggling] = useState(null);
    const cl = task.checklistItems || [];
    if (!cl.length) return null;

    async function toggle(item) {
        setToggling(item.id);
        await onChecklistToggle(task.id, item.id, !item.done);
        setToggling(null);
    }

    return (
        <div style={{
            borderTop: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
            padding: "8px 12px 10px 40px",
            display: "flex", flexDirection: "column", gap: "4px",
        }}>
            {cl.map(item => (
                <div
                    key={item.id}
                    onClick={e => { e.stopPropagation(); !toggling && toggle(item); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "4px 0" }}
                >
                    <div style={{
                        width: "15px", height: "15px", borderRadius: "4px", flexShrink: 0,
                        border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`,
                        background: item.done ? "#22c55e" : "var(--color-background-primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all .15s",
                    }}>
                        {item.done && <Check style={{ width: "8px", height: "8px", color: "#fff" }} />}
                        {toggling === item.id && <RefreshCw style={{ width: "7px", height: "7px", color: "var(--color-text-tertiary)" }} />}
                    </div>
                    <span style={{
                        fontSize: "12px",
                        color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                        textDecoration: item.done ? "line-through" : "none",
                        flex: 1,
                    }}>{item.label}</span>
                    {item.required && !item.done && (
                        <span style={{ fontSize: "10px", color: "#ef4444", flexShrink: 0 }}>req</span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Inline progress detail ────────────────────────────────────
function InlineProgress({ task }) {
    if (task.targetValue <= 0 || task.currentValue == null) return null;
    const pct = Math.min(100, Math.round((task.currentValue / task.targetValue) * 100));
    const isRevenue = task.taskType === "REVENUE_TARGET";
    const barColor = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#3b82f6";
    const label = isRevenue
        ? `$${task.currentValue.toFixed(0)} of $${task.targetValue}`
        : `${task.currentValue} of ${task.targetValue} players`;

    return (
        <div style={{
            borderTop: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
            padding: "10px 12px 10px 40px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, maxWidth: "160px", height: "4px", background: "var(--color-border-tertiary)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "999px", transition: "width .4s" }} />
                </div>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{label}</span>
            </div>

            {/* Quick log input */}
            {pct < 100 && (
                <InlineProgressLog task={task} />
            )}
        </div>
    );
}

function InlineProgressLog({ task }) {
    const [val, setVal] = useState("");
    const [logging, setLogging] = useState(false);
    const isRevenue = task.taskType === "REVENUE_TARGET";

    // Pass onProgressLog down from parent if needed — here we fire an event
    function handleLog(e) {
        e.stopPropagation();
        if (!val || parseFloat(val) <= 0) return;
        // Caller wires this via the onProgressLog prop
        const ev = new CustomEvent("task:progress", { detail: { taskId: task.id, value: parseFloat(val) } });
        document.dispatchEvent(ev);
        setVal("");
    }

    return (
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }} onClick={e => e.stopPropagation()}>
            <input
                type="number"
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLog(e)}
                placeholder={isRevenue ? "Amount…" : "Count…"}
                style={{
                    flex: 1, maxWidth: "100px", padding: "5px 8px",
                    border: "0.5px solid var(--color-border-secondary)",
                    borderRadius: "var(--border-radius-md)", fontSize: "12px",
                    fontFamily: "inherit", outline: "none",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-primary)",
                }}
            />
            <button
                onClick={handleLog}
                disabled={!val}
                style={{
                    padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "none",
                    background: !val ? "var(--color-background-secondary)" : "#3b82f6",
                    color: !val ? "var(--color-text-tertiary)" : "#fff",
                    fontSize: "12px", fontWeight: "500", cursor: val ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: "3px", fontFamily: "inherit",
                }}
            >
                <Plus style={{ width: "10px", height: "10px" }} /> Log
            </button>
        </div>
    );
}

// ─── Single task row ───────────────────────────────────────────
function TaskRow({ task, expanded, onToggleExpand, onChecklistToggle, onStatusChange, renderFollowup }) {
    const isDone = task.status === "COMPLETED";
    const hasExpandable = (task.checklistItems?.length > 0) || (task.targetValue > 0);
    const isFollowup = task.taskType === "PLAYER_FOLLOWUP" || task.taskType === "BONUS_FOLLOWUP";

    const rowStyle = {
        display: "flex",
        alignItems: "center",
        cursor: hasExpandable || isFollowup ? "pointer" : "default",
        background: "var(--color-background-primary)",
        borderTop: expanded ? "0.5px solid var(--color-border-secondary)" : "0.5px solid var(--color-border-tertiary)",
        borderLeft: expanded ? "0.5px solid var(--color-border-secondary)" : "0.5px solid var(--color-border-tertiary)",
        borderRight: expanded ? "0.5px solid var(--color-border-secondary)" : "0.5px solid var(--color-border-tertiary)",
        borderBottom: expanded ? "none" : "0.5px solid var(--color-border-tertiary)",
        borderRadius: expanded ? "var(--border-radius-md) var(--border-radius-md) 0 0" : "var(--border-radius-md)",
        overflow: "hidden",
        transition: "border-color .15s, background .15s",
        opacity: isDone ? 0.7 : 1,
    };

    function handleRowClick() {
        if (hasExpandable || isFollowup) onToggleExpand(task.id);
    }

    return (
        <div style={{ marginBottom: expanded ? 0 : "1px" }}>
            {/* Row */}
            <div
                style={rowStyle}
                onClick={handleRowClick}
                onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "var(--color-background-primary)"; }}
            >
                {/* Priority bar */}
                <div style={{ width: "2px", alignSelf: "stretch", background: PRIORITY_COLOR[task.priority] || "#cbd5e1", flexShrink: 0 }} />

                {/* Complete toggle (non-followup, non-progress tasks) */}
                {!isFollowup && task.taskType === "STANDARD" && (
                    <button
                        onClick={e => { e.stopPropagation(); onStatusChange(task.id, isDone ? "PENDING" : "COMPLETED"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 10px", flexShrink: 0, display: "flex" }}
                    >
                        {isDone
                            ? <CheckCircle style={{ width: "15px", height: "15px", color: "#22c55e" }} />
                            : <Circle style={{ width: "15px", height: "15px", color: "var(--color-border-secondary)" }} />}
                    </button>
                )}

                {/* Title */}
                <div style={{ flex: 1, padding: "10px 10px 10px 12px", minWidth: 0 }}>
                    <span style={{
                        fontSize: "13px", fontWeight: "500",
                        color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                        textDecoration: isDone ? "line-through" : "none",
                        display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {task.title}
                    </span>
                </div>

                {/* Right: ONE indicator */}
                <RowIndicator task={task} />

                {/* Expand chevron (only if has expandable content) */}
                {(hasExpandable || isFollowup) && (
                    <div style={{ paddingRight: "10px", color: "var(--color-text-tertiary)", display: "flex" }}>
                        {expanded
                            ? <ChevronUp style={{ width: "11px", height: "11px" }} />
                            : <ChevronDown style={{ width: "11px", height: "11px" }} />}
                    </div>
                )}
            </div>

            {/* Expanded content */}
            {expanded && (
                <div style={{
                    border: "0.5px solid var(--color-border-secondary)",
                    borderTop: "none",
                    borderRadius: "0 0 var(--border-radius-md) var(--border-radius-md)",
                    overflow: "hidden",
                    marginBottom: "1px",
                }}>
                    {isFollowup
                        ? renderFollowup(task)
                        : <>
                            <InlineChecklist task={task} onChecklistToggle={onChecklistToggle} />
                            <InlineProgress task={task} />
                        </>
                    }
                </div>
            )}
        </div>
    );
}

// ─── Collapsible urgency section ──────────────────────────────
function BucketSection({ bucketKey, tasks, expanded, onToggleExpand, onChecklistToggle, onStatusChange, renderFollowup }) {
    const [open, setOpen] = useState(BUCKETS[bucketKey].defaultOpen);
    const { label, color, light } = BUCKETS[bucketKey];
    if (!tasks.length) return null;

    return (
        <div style={{ marginBottom: "2px" }}>
            {/* Bucket header */}
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 12px", background: "none", border: "none",
                    cursor: "pointer", fontFamily: "inherit", borderRadius: "var(--border-radius-md)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: ".5px", flex: 1, textAlign: "left" }}>
                    {label}
                </span>
                <span style={{ fontSize: "11px", fontWeight: "500", padding: "1px 7px", borderRadius: "999px", background: color + "18", color }}>
                    {tasks.length}
                </span>
                {open
                    ? <ChevronUp style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />
                    : <ChevronDown style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />}
            </button>

            {open && (
                <div style={{ paddingBottom: "4px" }}>
                    {tasks.map(t => (
                        <TaskRow
                            key={t.id}
                            task={t}
                            expanded={expanded.has(t.id)}
                            onToggleExpand={onToggleExpand}
                            onChecklistToggle={onChecklistToggle}
                            onStatusChange={onStatusChange}
                            renderFollowup={renderFollowup}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Main export — replace the {activeTab === "tasks"} block with this
// ══════════════════════════════════════════════════════════════
export default function TaskListRedesigned({
    tasks,
    loading,
    search,
    setSearch,
    onStatusChange,
    onChecklistToggle,
    onProgressLog,
    onClaimTask,
    onInfoSubmitted,
    loadTasks,
    resolvedUser,
    renderFollowup,  // pass your existing renderTask for followup types if needed
}) {
    const [expanded, setExpanded] = useState(new Set());
    const [showCompleted, setShowCompleted] = useState(false);

    const toggleExpand = useCallback(id => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // Wire progress log events (fired from InlineProgressLog)
    useState(() => {
        function handler(e) { onProgressLog?.(e.detail.taskId, e.detail.value); }
        document.addEventListener("task:progress", handler);
        return () => document.removeEventListener("task:progress", handler);
    });

    // Filter by search only (no type/status filter needed — urgency bucketing handles it)
    const visible = search
        ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
        : tasks;

    const overdue = visible.filter(t => isOverdue(t) && t.status !== "COMPLETED");
    const active = visible.filter(t => t.status === "IN_PROGRESS" && !isOverdue(t));
    const pending = visible.filter(t => t.status === "PENDING" && !isOverdue(t));
    const completed = visible.filter(t => t.status === "COMPLETED");

    const common = { expanded, onToggleExpand: toggleExpand, onChecklistToggle, onStatusChange, renderFollowup };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Search + refresh — minimal toolbar */}
            <div style={{ display: "flex", gap: "7px", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <Search style={{
                        position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)",
                        width: "12px", height: "12px", color: "var(--color-text-tertiary)", pointerEvents: "none",
                    }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        style={{
                            width: "100%", padding: "7px 10px 7px 28px",
                            border: "0.5px solid var(--color-border-secondary)",
                            borderRadius: "var(--border-radius-md)", fontSize: "13px",
                            fontFamily: "inherit", outline: "none",
                            background: "var(--color-background-primary)",
                            color: "var(--color-text-primary)",
                            boxSizing: "border-box",
                        }}
                    />
                </div>
                <button
                    onClick={loadTasks}
                    style={{
                        padding: "7px 10px", background: "none",
                        border: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: "var(--border-radius-md)", cursor: "pointer",
                        display: "flex", alignItems: "center", color: "var(--color-text-tertiary)",
                    }}
                >
                    <RefreshCw style={{ width: "12px", height: "12px" }} />
                </button>
            </div>

            {/* Task buckets */}
            {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
                    <RefreshCw style={{ width: "14px", height: "14px", margin: "0 auto 8px", display: "block" }} />
                    Loading…
                </div>
            ) : !overdue.length && !active.length && !pending.length && !completed.length ? (
                <div style={{ padding: "48px 20px", textAlign: "center", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>
                        {search ? `No tasks matching "${search}"` : "All clear"}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-tertiary)" }}>
                        Tasks assigned to you will appear here
                    </p>
                </div>
            ) : (
                <>
                    <BucketSection bucketKey="overdue" tasks={overdue} {...common} />
                    <BucketSection bucketKey="active" tasks={active}  {...common} />
                    <BucketSection bucketKey="pending" tasks={pending} {...common} />

                    {/* Completed — collapsed by default */}
                    {completed.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowCompleted(v => !v)}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: "7px",
                                    padding: "8px 12px", background: "none", border: "none",
                                    cursor: "pointer", fontFamily: "inherit",
                                    color: "var(--color-text-tertiary)", fontSize: "12px",
                                    borderRadius: "var(--border-radius-md)",
                                    marginTop: "4px",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                            >
                                <CheckCircle style={{ width: "12px", height: "12px" }} />
                                {showCompleted ? "Hide" : `Show ${completed.length} completed`}
                            </button>

                            {showCompleted && (
                                <div style={{ paddingBottom: "4px" }}>
                                    {completed.map(t => (
                                        <TaskRow
                                            key={t.id}
                                            task={t}
                                            expanded={expanded.has(t.id)}
                                            onToggleExpand={toggleExpand}
                                            onChecklistToggle={onChecklistToggle}
                                            onStatusChange={onStatusChange}
                                            renderFollowup={renderFollowup}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}