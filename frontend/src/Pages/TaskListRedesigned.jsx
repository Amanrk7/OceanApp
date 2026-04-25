// ══════════════════════════════════════════════════════════════
// TaskListRedesigned.jsx — Clean, Linear-inspired task list
// Drop-in replacement. Same props, same handlers.
// ══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import {
  Circle, CheckCircle, ChevronDown, ChevronUp,
  RefreshCw, Search, Check, Plus, X,
} from "lucide-react";

// ─── Priority accent colors (subtle left border only) ─────────
const PRIORITY_ACCENT = {
  URGENT: "#ef4444",
  HIGH:   "#f97316",
  MEDIUM: "#eab308",
  LOW:    "#22c55e",
};

// ─── Bucket definitions ────────────────────────────────────────
const BUCKETS = [
  { key: "overdue", label: "Overdue",     color: "#ef4444", defaultOpen: true  },
  { key: "active",  label: "In Progress", color: "#3b82f6", defaultOpen: true  },
  { key: "pending", label: "To Do",       color: "#6b7280", defaultOpen: true  },
];

// ─── Helpers ──────────────────────────────────────────────────
function isOverdue(task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
}
function formatRelative(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "1d overdue";
  return `${diff}d overdue`;
}
function formatDue(iso) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d < tomorrow) return "Today";
  if (d < new Date(tomorrow.getTime() + 86_400_000)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Right-side signal — one thing only ───────────────────────
function Signal({ task }) {
  const base = {
    fontSize: "11px", fontWeight: "500", letterSpacing: "0.01em",
    display: "flex", alignItems: "center", gap: "5px",
    flexShrink: 0, color: "var(--color-text-tertiary)",
    paddingRight: "14px",
  };

  if (isOverdue(task)) {
    return (
      <span style={{ ...base, color: "#ef4444", fontWeight: "500" }}>
        {formatRelative(task.dueDate)}
      </span>
    );
  }

  if (task.targetValue > 0 && task.currentValue != null) {
    const pct = Math.min(100, Math.round((task.currentValue / task.targetValue) * 100));
    const barC = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#3b82f6";
    return (
      <span style={{ ...base }}>
        <span style={{
          width: "40px", height: "2px", background: "var(--color-border-tertiary)",
          borderRadius: "999px", overflow: "hidden", display: "inline-block",
        }}>
          <span style={{ display: "block", height: "100%", width: `${pct}%`, background: barC, borderRadius: "999px" }} />
        </span>
        <span style={{ color: pct >= 100 ? "#22c55e" : "var(--color-text-secondary)" }}>{pct}%</span>
      </span>
    );
  }

  const cl = task.checklistItems || [];
  if (cl.length > 0) {
    const done = cl.filter(i => i.done).length;
    return <span style={base}>{done}/{cl.length}</span>;
  }

  if (task.dueDate) {
    return <span style={base}>{formatDue(task.dueDate)}</span>;
  }

  return null;
}

// ─── Inline checklist ─────────────────────────────────────────
function InlineChecklist({ task, onChecklistToggle }) {
  const [toggling, setToggling] = useState(null);
  const cl = task.checklistItems || [];
  if (!cl.length) return null;

  async function toggle(e, item) {
    e.stopPropagation();
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{
      padding: "10px 16px 14px 48px",
      borderTop: "1px solid var(--color-border-tertiary)",
      background: "var(--color-background-secondary)",
      display: "flex", flexDirection: "column", gap: "2px",
    }}>
      {cl.map(item => (
        <label
          key={item.id}
          onClick={e => !toggling && toggle(e, item)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            cursor: "pointer", padding: "5px 0",
            userSelect: "none",
          }}
        >
          {/* Custom checkbox */}
          <span style={{
            width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
            border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`,
            background: item.done ? "#22c55e" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .12s",
          }}>
            {item.done && <Check style={{ width: "8px", height: "8px", color: "#fff" }} />}
            {toggling === item.id && <RefreshCw style={{ width: "7px", height: "7px", color: "#fff", animation: "spin .8s linear infinite" }} />}
          </span>
          <span style={{
            fontSize: "12.5px", lineHeight: "1.4",
            color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
            textDecoration: item.done ? "line-through" : "none",
            flex: 1,
          }}>
            {item.label}
          </span>
          {item.required && !item.done && (
            <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "600" }}>Required</span>
          )}
        </label>
      ))}
    </div>
  );
}

// ─── Inline progress section ───────────────────────────────────
function InlineProgress({ task, onProgressLog }) {
  const [val, setVal] = useState("");
  if (!task.targetValue) return null;

  const pct = Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100));
  const isRevenue = task.taskType === "REVENUE_TARGET";
  const barC = pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#3b82f6";
  const current = isRevenue ? `$${(task.currentValue ?? 0).toFixed(0)}` : task.currentValue ?? 0;
  const target  = isRevenue ? `$${task.targetValue}` : task.targetValue;

  async function log(e) {
    e.stopPropagation();
    if (!val || parseFloat(val) <= 0) return;
    await onProgressLog?.(task.id, parseFloat(val));
    setVal("");
  }

  return (
    <div style={{
      padding: "14px 16px 14px 48px",
      borderTop: "1px solid var(--color-border-tertiary)",
      background: "var(--color-background-secondary)",
    }}>
      {/* Bar + label */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: pct < 100 ? "10px" : 0 }}>
        <div style={{
          flex: 1, maxWidth: "160px", height: "3px",
          background: "var(--color-border-tertiary)", borderRadius: "999px", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`, background: barC,
            borderRadius: "999px", transition: "width .4s ease",
          }} />
        </div>
        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "500" }}>
          {current} <span style={{ color: "var(--color-text-tertiary)", fontWeight: "400" }}>/ {target}</span>
        </span>
        <span style={{ fontSize: "11px", color: pct >= 100 ? "#22c55e" : "var(--color-text-tertiary)", fontWeight: "500" }}>
          {pct}%
        </span>
      </div>

      {/* Quick log input */}
      {pct < 100 && (
        <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
          <input
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && log(e)}
            placeholder={isRevenue ? "Amount…" : "Count…"}
            style={{
              width: "96px", padding: "5px 9px",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: "6px", fontSize: "12px",
              fontFamily: "inherit", outline: "none",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            onClick={log}
            disabled={!val}
            style={{
              padding: "5px 11px", borderRadius: "6px", border: "none",
              background: val ? "#3b82f6" : "var(--color-background-primary)",
              color: val ? "#fff" : "var(--color-text-tertiary)",
              fontSize: "12px", fontWeight: "500", cursor: val ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: "3px",
              fontFamily: "inherit",
              border: val ? "none" : "1px solid var(--color-border-secondary)",
            }}
          >
            <Plus style={{ width: "10px", height: "10px" }} /> Log
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single task row ───────────────────────────────────────────
function TaskRow({
  task, expanded, onToggleExpand,
  onChecklistToggle, onStatusChange, onProgressLog, renderFollowup,
}) {
  const isDone      = task.status === "COMPLETED";
  const isFollowup  = ["PLAYER_FOLLOWUP", "BONUS_FOLLOWUP", "MISSING_INFO"].includes(task.taskType);
  const hasDetail   = (task.checklistItems?.length > 0) || (task.targetValue > 0) || isFollowup;
  const accent      = PRIORITY_ACCENT[task.priority] || "#cbd5e1";

  return (
    <div>
      {/* ── Row ── */}
      <div
        onClick={() => hasDetail && onToggleExpand(task.id)}
        style={{
          display: "flex", alignItems: "center",
          cursor: hasDetail ? "pointer" : "default",
          borderRadius: expanded ? "8px 8px 0 0" : "8px",
          background: expanded
            ? "var(--color-background-secondary)"
            : "var(--color-background-primary)",
          transition: "background .12s",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={e => {
          if (!expanded) e.currentTarget.style.background = "var(--color-background-secondary)";
        }}
        onMouseLeave={e => {
          if (!expanded) e.currentTarget.style.background = "var(--color-background-primary)";
        }}
      >
        {/* Priority accent bar */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: "2px", background: isDone ? "transparent" : accent,
          borderRadius: "8px 0 0 8px",
          opacity: isDone ? 0 : 1,
          transition: "opacity .2s",
        }} />

        {/* Complete toggle (standard tasks only) */}
        {task.taskType === "STANDARD" && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(task.id, isDone ? "PENDING" : "COMPLETED"); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0 8px 0 14px", flexShrink: 0,
              display: "flex", alignItems: "center",
              color: isDone ? "#22c55e" : "var(--color-border-secondary)",
              transition: "color .15s",
            }}
            onMouseEnter={e => { if (!isDone) e.currentTarget.style.color = "#22c55e"; }}
            onMouseLeave={e => { if (!isDone) e.currentTarget.style.color = "var(--color-border-secondary)"; }}
          >
            {isDone
              ? <CheckCircle style={{ width: "14px", height: "14px" }} />
              : <Circle style={{ width: "14px", height: "14px" }} />}
          </button>
        )}

        {/* Title */}
        <div style={{
          flex: 1, padding: task.taskType === "STANDARD" ? "10px 8px 10px 0" : "10px 8px 10px 18px",
          minWidth: 0,
        }}>
          <p style={{
            margin: 0, fontSize: "13px", fontWeight: "400", lineHeight: "1.35",
            color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
            textDecoration: isDone ? "line-through" : "none",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {task.title}
          </p>
        </div>

        {/* Right signal */}
        <Signal task={task} />

        {/* Chevron */}
        {hasDetail && (
          <span style={{ paddingRight: "12px", color: "var(--color-text-tertiary)", display: "flex", flexShrink: 0 }}>
            {expanded
              ? <ChevronUp style={{ width: "12px", height: "12px" }} />
              : <ChevronDown style={{ width: "12px", height: "12px" }} />}
          </span>
        )}
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div style={{
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
          background: "var(--color-background-secondary)",
        }}>
          {isFollowup
            ? renderFollowup?.(task)
            : <>
                <InlineChecklist task={task} onChecklistToggle={onChecklistToggle} />
                <InlineProgress task={task} onProgressLog={onProgressLog} />
              </>
          }
        </div>
      )}
    </div>
  );
}

// ─── Bucket section ────────────────────────────────────────────
function Bucket({ bucketKey, label, color, tasks, expanded, onToggleExpand, ...handlers }) {
  const [open, setOpen] = useState(true);
  if (!tasks.length) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Bucket header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "4px 6px", marginBottom: "4px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", borderRadius: "5px",
          width: "100%",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <span style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        <span style={{
          fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em",
          textTransform: "uppercase", color: "var(--color-text-tertiary)",
          flex: 1, textAlign: "left",
        }}>
          {label}
        </span>
        <span style={{
          fontSize: "11px", fontWeight: "500",
          color: "var(--color-text-tertiary)",
          minWidth: "18px", textAlign: "right",
        }}>
          {tasks.length}
        </span>
        {open
          ? <ChevronUp style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />
          : <ChevronDown style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />}
      </button>

      {/* Task rows */}
      {open && (
        <div style={{
          display: "flex", flexDirection: "column",
          gap: "1px",
          padding: "0 0 0 4px",
        }}>
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              expanded={expanded.has(t.id)}
              onToggleExpand={onToggleExpand}
              {...handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════
export default function TaskListRedesigned({
  tasks = [],
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
  renderFollowup,
}) {
  const [expanded,      setExpanded]      = useState(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  const toggleExpand = useCallback(id => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Buckets
  const overdue   = tasks.filter(t => isOverdue(t) && t.status !== "COMPLETED");
  const active    = tasks.filter(t => t.status === "IN_PROGRESS" && !isOverdue(t));
  const pending   = tasks.filter(t => t.status === "PENDING" && !isOverdue(t));
  const completed = tasks.filter(t => t.status === "COMPLETED");

  // Search filter
  const filterTasks = arr =>
    search ? arr.filter(t => t.title.toLowerCase().includes(search.toLowerCase())) : arr;

  const handlerProps = {
    expanded,
    onToggleExpand: toggleExpand,
    onChecklistToggle,
    onStatusChange,
    onProgressLog,
    renderFollowup,
  };

  const isEmpty = !overdue.length && !active.length && !pending.length;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", gap: "6px", alignItems: "center",
        marginBottom: "16px",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{
            position: "absolute", left: "9px", top: "50%",
            transform: "translateY(-50%)",
            width: "12px", height: "12px",
            color: "var(--color-text-tertiary)", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: "100%", padding: "7px 30px 7px 28px",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: "7px", fontSize: "13px",
              fontFamily: "inherit", outline: "none",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              boxSizing: "border-box",
              transition: "border-color .15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "var(--color-border-secondary)"}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: "8px", top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, color: "var(--color-text-tertiary)", display: "flex",
              }}
            >
              <X style={{ width: "12px", height: "12px" }} />
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={loadTasks}
          title="Refresh"
          style={{
            padding: "7px 9px",
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: "7px", cursor: "pointer",
            display: "flex", alignItems: "center",
            color: "var(--color-text-tertiary)",
            transition: "border-color .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-primary)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"}
        >
          <RefreshCw style={{ width: "12px", height: "12px" }} />
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{
          padding: "48px 0", textAlign: "center",
          color: "var(--color-text-tertiary)", fontSize: "13px",
        }}>
          <RefreshCw style={{
            width: "16px", height: "16px",
            margin: "0 auto 8px", display: "block",
            animation: "spin .8s linear infinite",
          }} />
          Loading tasks…
        </div>

      ) : isEmpty && !search ? (
        <div style={{
          padding: "48px 20px", textAlign: "center",
          borderRadius: "10px",
          border: "1px dashed var(--color-border-secondary)",
        }}>
          <CheckCircle style={{
            width: "20px", height: "20px",
            color: "var(--color-border-secondary)",
            margin: "0 auto 10px", display: "block",
          }} />
          <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>
            All clear
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-tertiary)" }}>
            New tasks will appear here
          </p>
        </div>

      ) : search && filterTasks([...overdue, ...active, ...pending]).length === 0 ? (
        <div style={{
          padding: "32px 20px", textAlign: "center",
          color: "var(--color-text-tertiary)", fontSize: "13px",
        }}>
          No tasks matching <strong>"{search}"</strong>
        </div>

      ) : (
        <>
          {BUCKETS.map(({ key, label, color }) => {
            const src = key === "overdue" ? overdue : key === "active" ? active : pending;
            return (
              <Bucket
                key={key}
                bucketKey={key}
                label={label}
                color={color}
                tasks={filterTasks(src)}
                {...handlerProps}
              />
            );
          })}

          {/* ── Completed toggle ── */}
          {completed.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              <button
                onClick={() => setShowCompleted(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "4px 6px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", borderRadius: "5px", width: "100%",
                  marginBottom: "4px",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <CheckCircle style={{ width: "12px", height: "12px", color: "#22c55e" }} />
                <span style={{
                  fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em",
                  textTransform: "uppercase", color: "var(--color-text-tertiary)",
                  flex: 1, textAlign: "left",
                }}>
                  {showCompleted ? "Hide completed" : `Completed`}
                </span>
                <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
                  {completed.length}
                </span>
                {showCompleted
                  ? <ChevronUp style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />
                  : <ChevronDown style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />}
              </button>

              {showCompleted && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "0 0 0 4px" }}>
                  {filterTasks(completed).map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      {...handlerProps}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
