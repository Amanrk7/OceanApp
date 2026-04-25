// SmartTaskList.jsx — Drop-in replacement for all task list contexts
// Handles: member dashboard, admin task page, shifts page
// Key feature: auto-groups identical/similar tasks by (type + player) to eliminate clutter

import { useState, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, Circle, X, Check, Plus, AlertTriangle,
  Users, Zap, Gift, ClipboardList, Target, Star,
} from "lucide-react";

// ─── Type metadata ─────────────────────────────────────────────
const TYPE_META = {
  STANDARD:        { label: "Standard",        color: "#6366f1", dot: "#818cf8" },
  DAILY_CHECKLIST: { label: "Daily checklist", color: "#0ea5e9", dot: "#38bdf8" },
  PLAYER_ADDITION: { label: "Player addition", color: "#8b5cf6", dot: "#a78bfa" },
  REVENUE_TARGET:  { label: "Revenue target",  color: "#22c55e", dot: "#4ade80" },
  PLAYER_FOLLOWUP: { label: "Player followup", color: "#f97316", dot: "#fb923c" },
  BONUS_FOLLOWUP:  { label: "Bonus followup",  color: "#10b981", dot: "#34d399" },
  MISSING_INFO:    { label: "Missing info",    color: "#ec4899", dot: "#f472b6" },
};

const PRIORITY_COLOR = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22c55e",
};

const TYPE_ICONS = {
  STANDARD: ClipboardList,
  DAILY_CHECKLIST: CheckCircle,
  PLAYER_ADDITION: Users,
  REVENUE_TARGET: Target,
  PLAYER_FOLLOWUP: Users,
  BONUS_FOLLOWUP: Gift,
  MISSING_INFO: AlertTriangle,
};

// ─── Extract grouping key from task ───────────────────────────
// Tries to find (playerName, bonusType) from title or notes JSON
function extractGroupKey(task) {
  const title = task.title || "";
  const meta = task.taskType;

  // Parse structured notes
  let noteMeta = {};
  try { noteMeta = JSON.parse(task.notes || "{}"); } catch (_) {}

  const playerName = noteMeta.playerName || noteMeta.username || null;

  // Pattern: "Referral Bonus: NAME (@handle)"
  const bonusPlayerMatch = title.match(/^[^:]+:\s+(.+?)\s+\(@/);
  // Pattern: "$50 Daily Milestone — NAME earns $5"
  const milestoneMatch = title.match(/—\s+(.+?)\s+earns/);
  // Pattern: "Player Followup: NAME"
  const followupMatch = title.match(/^[^:]+:\s+(.+?)$/);

  const extracted =
    playerName ||
    bonusPlayerMatch?.[1] ||
    milestoneMatch?.[1] ||
    (meta === "PLAYER_FOLLOWUP" && followupMatch?.[1]) ||
    null;

  // Key = type + extracted player (or "global" if no player found)
  return `${meta}::${extracted || "global"}`;
}

// ─── Build a human-readable group label ───────────────────────
function groupLabel(tasks) {
  if (!tasks.length) return "";
  const task = tasks[0];
  const typeMeta = TYPE_META[task.taskType] || { label: task.taskType };
  let noteMeta = {};
  try { noteMeta = JSON.parse(task.notes || "{}"); } catch (_) {}

  const player = noteMeta.playerName || noteMeta.username || null;
  if (player) return `${player}`;
  // Strip player suffix from title for generic label
  return task.title
    .replace(/:\s+.+?\s+\(@[^)]+\)/, "")
    .replace(/\s+—\s+.+?earns.*/, "")
    .trim()
    .slice(0, 60);
}

// ─── Progress bar ──────────────────────────────────────────────
function Bar({ pct, color }) {
  return (
    <div style={{
      width: 48, height: 2,
      background: "var(--color-border-tertiary)",
      borderRadius: 2, overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, pct)}%`,
        background: pct >= 100 ? "#22c55e" : color,
        borderRadius: 2,
        transition: "width .3s",
      }} />
    </div>
  );
}

// ─── Single compact task row ───────────────────────────────────
function TaskRow({ task, onStatusChange, onChecklistToggle, onProgressLog, renderFollowup, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[task.taskType] || TYPE_META.STANDARD;
  const Icon = TYPE_ICONS[task.taskType] || ClipboardList;
  const isDone = task.status === "COMPLETED";
  const isStandard = task.taskType === "STANDARD";
  const cl = task.checklistItems || [];
  const doneItems = cl.filter(i => i.done).length;
  const pct = task.targetValue > 0
    ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100))
    : null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
  const hasDetail = cl.length > 0 || pct !== null || ["PLAYER_FOLLOWUP","BONUS_FOLLOWUP","MISSING_INFO"].includes(task.taskType);

  const [logVal, setLogVal] = useState("");

  return (
    <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      {/* Row */}
      <div
        onClick={() => hasDetail && setExpanded(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: compact ? "7px 10px" : "9px 12px",
          cursor: hasDetail ? "pointer" : "default",
          background: expanded ? "var(--color-background-secondary)" : "transparent",
          transition: "background .1s",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Priority accent */}
        <div style={{
          width: 2, height: 20, borderRadius: 1, flexShrink: 0,
          background: isDone ? "var(--color-border-tertiary)" : (PRIORITY_COLOR[task.priority] || "#cbd5e1"),
        }} />

        {/* Complete toggle (standard only) */}
        {isStandard && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange?.(task.id, isDone ? "PENDING" : "COMPLETED"); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0, color: isDone ? "#22c55e" : "var(--color-border-secondary)" }}
          >
            {isDone
              ? <CheckCircle style={{ width: 13, height: 13 }} />
              : <Circle style={{ width: 13, height: 13 }} />}
          </button>
        )}

        {/* Type icon */}
        {!isStandard && (
          <Icon style={{ width: 12, height: 12, color: meta.color, flexShrink: 0, opacity: 0.7 }} />
        )}

        {/* Title */}
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: compact ? 12 : 12.5,
          fontWeight: 400,
          lineHeight: 1.3,
          color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
          textDecoration: isDone ? "line-through" : "none",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {task.title}
        </span>

        {/* Right signals */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isOverdue && (
            <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 500 }}>overdue</span>
          )}
          {pct !== null && !isOverdue && (
            <>
              <Bar pct={pct} color={meta.color} />
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
            </>
          )}
          {cl.length > 0 && pct === null && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{doneItems}/{cl.length}</span>
          )}
          {task.dueDate && !isOverdue && pct === null && cl.length === 0 && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {hasDetail && (
          <span style={{ color: "var(--color-text-tertiary)", display: "flex", flexShrink: 0 }}>
            {expanded
              ? <ChevronUp style={{ width: 11, height: 11 }} />
              : <ChevronDown style={{ width: 11, height: 11 }} />}
          </span>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: "var(--color-background-secondary)",
          padding: "10px 14px 12px 28px",
          borderTop: "0.5px solid var(--color-border-tertiary)",
        }}>
          {/* Followup card */}
          {["PLAYER_FOLLOWUP","BONUS_FOLLOWUP","MISSING_INFO"].includes(task.taskType) && renderFollowup ? (
            renderFollowup(task)
          ) : (
            <>
              {/* Checklist */}
              {cl.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: pct !== null ? 10 : 0 }}>
                  {cl.map(item => (
                    <label
                      key={item.id}
                      onClick={e => { e.stopPropagation(); onChecklistToggle?.(task.id, item.id, !item.done); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", userSelect: "none" }}
                    >
                      <span style={{
                        width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                        border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`,
                        background: item.done ? "#22c55e" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {item.done && <Check style={{ width: 7, height: 7, color: "#fff" }} />}
                      </span>
                      <span style={{
                        fontSize: 12, lineHeight: 1.4,
                        color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                        textDecoration: item.done ? "line-through" : "none",
                        flex: 1,
                      }}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Progress log */}
              {pct !== null && pct < 100 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    value={logVal}
                    onChange={e => setLogVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && logVal) { onProgressLog?.(task.id, parseFloat(logVal)); setLogVal(""); } }}
                    placeholder="Amount…"
                    style={{
                      width: 90, padding: "4px 8px",
                      border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: 6, fontSize: 12,
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-primary)",
                      fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <button
                    onClick={() => { if (logVal) { onProgressLog?.(task.id, parseFloat(logVal)); setLogVal(""); } }}
                    disabled={!logVal}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: logVal ? meta.color : "var(--color-background-primary)",
                      color: logVal ? "#fff" : "var(--color-text-tertiary)",
                      fontSize: 12, cursor: logVal ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 3,
                      fontFamily: "inherit",
                      border: logVal ? "none" : "0.5px solid var(--color-border-secondary)",
                    }}
                  >
                    <Plus style={{ width: 9, height: 9 }} /> Log
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group row (collapsed cluster of similar tasks) ────────────
function GroupRow({ tasks, groupKey, onStatusChange, onChecklistToggle, onProgressLog, renderFollowup }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[tasks[0]?.taskType] || TYPE_META.STANDARD;
  const Icon = TYPE_ICONS[tasks[0]?.taskType] || ClipboardList;
  const label = groupLabel(tasks);
  const doneCount = tasks.filter(t => t.status === "COMPLETED").length;
  const typeName = meta.label;

  let noteMeta = {};
  try { noteMeta = JSON.parse(tasks[0]?.notes || "{}"); } catch (_) {}

  return (
    <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      {/* Group header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", cursor: "pointer",
          background: open ? "var(--color-background-secondary)" : "transparent",
          transition: "background .1s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Type color strip */}
        <div style={{ width: 2, height: 20, borderRadius: 1, background: meta.color, flexShrink: 0 }} />
        <Icon style={{ width: 12, height: 12, color: meta.color, flexShrink: 0 }} />

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {typeName}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>·</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </span>
        </div>

        {/* Count badge */}
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 20, height: 18,
          padding: "0 6px",
          borderRadius: 999,
          background: meta.color + "18",
          color: meta.color,
          fontSize: 11, fontWeight: 500,
          flexShrink: 0,
        }}>
          {doneCount > 0 ? `${doneCount}/${tasks.length}` : tasks.length}
        </span>

        {open
          ? <ChevronUp style={{ width: 11, height: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          : <ChevronDown style={{ width: 11, height: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }} />}
      </div>

      {/* Expanded individual rows */}
      {open && (
        <div style={{ paddingLeft: 12, borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              compact
              onStatusChange={onStatusChange}
              onChecklistToggle={onChecklistToggle}
              onProgressLog={onProgressLog}
              renderFollowup={renderFollowup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Type filter pill ──────────────────────────────────────────
function Pill({ active, label, onClick, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px",
        border: "0.5px solid",
        borderColor: active ? "var(--color-border-primary)" : "var(--color-border-tertiary)",
        borderRadius: 999,
        background: active ? "var(--color-background-primary)" : "transparent",
        color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
        fontSize: 11, fontWeight: active ? 500 : 400,
        cursor: "pointer", fontFamily: "inherit",
        transition: "all .12s",
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: 10,
          color: active ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// Main export — drop-in for member dashboard, shifts, admin page
// ════════════════════════════════════════════════════════════════
export default function SmartTaskList({
  tasks = [],
  loading = false,
  onStatusChange,
  onChecklistToggle,
  onProgressLog,
  loadTasks,
  renderFollowup,
  // Presentation variants
  variant = "member",   // "member" | "admin" | "shifts"
  compact = false,
  pageSize = 30,
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
      if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
      if (statusFilter === "IN_PROGRESS" && t.status !== "IN_PROGRESS") return false;
      if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
      if (statusFilter === "ACTIVE" && !["PENDING","IN_PROGRESS"].includes(t.status)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, typeFilter, statusFilter, search]);

  // ── Smart grouping ────────────────────────────────────────────
  // Tasks with a unique key stay as single rows.
  // Tasks sharing a key (same type+player) collapse into a GroupRow.
  const { groups, singles } = useMemo(() => {
    const map = new Map();
    for (const task of filtered) {
      const key = extractGroupKey(task);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    const groups = [];
    const singles = [];
    for (const [key, items] of map.entries()) {
      if (items.length > 1) groups.push({ key, items });
      else singles.push(items[0]);
    }
    return { groups, singles };
  }, [filtered]);

  // Flatten for pagination: groups first, then singles
  const allItems = useMemo(() => {
    return [
      ...groups.map(g => ({ type: "group", ...g })),
      ...singles.map(t => ({ type: "single", task: t })),
    ];
  }, [groups, singles]);

  const totalPages = Math.ceil(allItems.length / pageSize);
  const pageItems = allItems.slice((page - 1) * pageSize, page * pageSize);

  // ── Type counts for filter pills ──────────────────────────────
  const typeCounts = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!map[t.taskType]) map[t.taskType] = 0;
      map[t.taskType]++;
    }
    return map;
  }, [tasks]);

  const activeTypes = Object.entries(typeCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const activeCount = tasks.filter(t => t.status !== "COMPLETED").length;

  const handlerProps = { onStatusChange, onChecklistToggle, onProgressLog, renderFollowup };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            width: 11, height: 11, color: "var(--color-text-tertiary)", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks…"
            style={{
              width: "100%", padding: "6px 26px 6px 26px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 7, fontSize: 12,
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "var(--color-border-secondary)"}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              style={{
                position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, color: "var(--color-text-tertiary)", display: "flex",
              }}
            >
              <X style={{ width: 11, height: 11 }} />
            </button>
          )}
        </div>

        {/* Refresh */}
        {loadTasks && (
          <button
            onClick={loadTasks}
            style={{
              padding: "6px 8px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 7, cursor: "pointer", display: "flex",
              color: "var(--color-text-tertiary)",
            }}
          >
            <RefreshCw style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>

      {/* ── Status + type filters ────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {/* Status */}
        {[
          { key: "ALL", label: "All", count: tasks.length },
          { key: "ACTIVE", label: "Active", count: activeCount },
          { key: "COMPLETED", label: "Done", count: completedCount },
        ].map(({ key, label, count }) => (
          <Pill
            key={key}
            active={statusFilter === key}
            label={label}
            count={count}
            onClick={() => { setStatusFilter(key); setPage(1); }}
          />
        ))}

        {activeTypes.length > 1 && (
          <span style={{ width: 1, height: 14, background: "var(--color-border-tertiary)", margin: "0 2px" }} />
        )}

        {/* Type pills (only if multiple types) */}
        {activeTypes.length > 1 && activeTypes.map(([type, count]) => {
          const meta = TYPE_META[type];
          if (!meta) return null;
          return (
            <Pill
              key={type}
              active={typeFilter === type}
              label={meta.label}
              count={count}
              onClick={() => { setTypeFilter(typeFilter === type ? "ALL" : type); setPage(1); }}
            />
          );
        })}
      </div>

      {/* ── List ────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: "36px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "spin .8s linear infinite" }} />
          Loading…
        </div>

      ) : pageItems.length === 0 ? (
        <div style={{
          padding: "36px 16px", textAlign: "center",
          border: "0.5px dashed var(--color-border-secondary)",
          borderRadius: 8,
        }}>
          <CheckCircle style={{ width: 16, height: 16, color: "var(--color-border-secondary)", margin: "0 auto 8px", display: "block" }} />
          <p style={{ margin: "0 0 3px", fontSize: 13, color: "var(--color-text-primary)" }}>
            {search ? `No tasks matching "${search}"` : "All clear"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {search ? "Try a different search" : "New tasks will appear here"}
          </p>
        </div>

      ) : (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 8, overflow: "hidden",
          background: "var(--color-background-primary)",
        }}>
          {/* Summary bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 12px",
            background: "var(--color-background-secondary)",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
          }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {filtered.length} task{filtered.length !== 1 ? "s" : ""}
              {groups.length > 0 && (
                <> · <span style={{ color: "var(--color-text-secondary)" }}>{groups.length} group{groups.length !== 1 ? "s" : ""}</span> ({groups.reduce((s, g) => s + g.items.length, 0)} similar)</>
              )}
            </span>
            {totalPages > 1 && (
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {/* Items */}
          {pageItems.map((item, i) =>
            item.type === "group" ? (
              <GroupRow key={item.key} tasks={item.items} groupKey={item.key} {...handlerProps} />
            ) : (
              <TaskRow key={item.task.id} task={item.task} {...handlerProps} />
            )
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "8px 12px",
              borderTop: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 5, background: "var(--color-background-primary)",
                  color: page === 1 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                  fontSize: 12, cursor: page === 1 ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Prev
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 28, height: 26,
                      border: "0.5px solid",
                      borderColor: page === p ? "var(--color-border-primary)" : "var(--color-border-tertiary)",
                      borderRadius: 5,
                      background: page === p ? "var(--color-background-primary)" : "transparent",
                      color: page === p ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                      fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 5, background: "var(--color-background-primary)",
                  color: page === totalPages ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                  fontSize: 12, cursor: page === totalPages ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
