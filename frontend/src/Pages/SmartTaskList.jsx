// SmartTaskList.jsx — Drop-in replacement for all task list contexts
// Fixes: amount→count for PLAYER_ADDITION, compact elegant claim cards,
//        richer task rows matching admin-page detail level

import { useState, useMemo } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, Circle, X, Check, Plus, AlertTriangle,
  Users, Zap, Gift, ClipboardList, Target, Star,
  Calendar, User, Flame,
} from "lucide-react";

// ─── Type metadata ─────────────────────────────────────────────
const TYPE_META = {
  STANDARD:        { label: "Standard",        color: "#6366f1", dot: "#818cf8", light: "#eef2ff" },
  DAILY_CHECKLIST: { label: "Daily checklist", color: "#0ea5e9", dot: "#38bdf8", light: "#f0f9ff" },
  PLAYER_ADDITION: { label: "Player addition", color: "#8b5cf6", dot: "#a78bfa", light: "#f5f3ff" },
  REVENUE_TARGET:  { label: "Revenue target",  color: "#22c55e", dot: "#4ade80", light: "#f0fdf4" },
  PLAYER_FOLLOWUP: { label: "Player followup", color: "#f97316", dot: "#fb923c", light: "#fff7ed" },
  BONUS_FOLLOWUP:  { label: "Bonus followup",  color: "#10b981", dot: "#34d399", light: "#ecfdf5" },
  MISSING_INFO:    { label: "Missing info",    color: "#ec4899", dot: "#f472b6", light: "#fdf2f8" },
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
function extractGroupKey(task) {
  const title = task.title || "";
  const meta = task.taskType;
  let noteMeta = {};
  try { noteMeta = JSON.parse(task.notes || "{}"); } catch (_) {}
  const playerName = noteMeta.playerName || noteMeta.username || null;
  const bonusPlayerMatch = title.match(/^[^:]+:\s+(.+?)\s+\(@/);
  const milestoneMatch = title.match(/—\s+(.+?)\s+earns/);
  const followupMatch = title.match(/^[^:]+:\s+(.+?)$/);
  const extracted =
    playerName ||
    bonusPlayerMatch?.[1] ||
    milestoneMatch?.[1] ||
    (meta === "PLAYER_FOLLOWUP" && followupMatch?.[1]) ||
    null;
  return `${meta}::${extracted || "global"}`;
}

function groupLabel(tasks) {
  if (!tasks.length) return "";
  const task = tasks[0];
  let noteMeta = {};
  try { noteMeta = JSON.parse(task.notes || "{}"); } catch (_) {}
  const player = noteMeta.playerName || noteMeta.username || null;
  if (player) return player;
  return task.title
    .replace(/:\s+.+?\s+\(@[^)]+\)/, "")
    .replace(/\s+—\s+.+?earns.*/, "")
    .trim()
    .slice(0, 60);
}

// ─── Thin progress bar ─────────────────────────────────────────
function Bar({ pct, color, height = 2 }) {
  return (
    <div style={{
      width: 48, height,
      background: "var(--color-border-tertiary)",
      borderRadius: 999, overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, pct)}%`,
        background: pct >= 100 ? "#22c55e" : color,
        borderRadius: 999,
        transition: "width .3s",
      }} />
    </div>
  );
}

// ─── Due date chip ─────────────────────────────────────────────
function DueChip({ dueDate, isDone }) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const overdue = d < new Date() && !isDone;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 10, fontWeight: overdue ? 600 : 400,
      color: overdue ? "#ef4444" : "var(--color-text-tertiary)",
      background: overdue ? "#fef2f2" : "transparent",
      padding: overdue ? "1px 5px" : "0",
      borderRadius: 4,
    }}>
      {overdue && <AlertTriangle style={{ width: 8, height: 8 }} />}
      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

// ─── Compact elegant claim/followup wrapper ────────────────────
// Wraps any FollowupCard that would otherwise render full-size in the expand panel.
// Adds a subtle container with constrained max-height and scroll.
function CompactFollowupShell({ task, children }) {
  const meta = TYPE_META[task.taskType] || TYPE_META.STANDARD;
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${meta.color}25`,
      background: meta.light,
      overflow: "hidden",
      marginTop: 2,
    }}>
      {/* Accent strip */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}44)` }} />
      <div style={{
        maxHeight: 420,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: `${meta.color}30 transparent`,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Single task row ───────────────────────────────────────────
function TaskRow({ task, onStatusChange, onChecklistToggle, onProgressLog, renderFollowup }) {
  const [expanded, setExpanded] = useState(false);
  const [logVal, setLogVal] = useState("");
  const [logging, setLogging] = useState(false);
  const [logOk, setLogOk] = useState(false);

  const meta = TYPE_META[task.taskType] || TYPE_META.STANDARD;
  const Icon = TYPE_ICONS[task.taskType] || ClipboardList;
  const isDone = task.status === "COMPLETED";
  const isStandard = task.taskType === "STANDARD";
  const isRevenue = task.taskType === "REVENUE_TARGET";
  const isPlayerAdd = task.taskType === "PLAYER_ADDITION";
  const isFollowup = ["PLAYER_FOLLOWUP", "BONUS_FOLLOWUP", "MISSING_INFO"].includes(task.taskType);

  const cl = task.checklistItems || [];
  const doneItems = cl.filter(i => i.done).length;

  const pct = task.targetValue > 0
    ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100))
    : null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
  const hasDetail = cl.length > 0 || pct !== null || isFollowup || task.description || task.notes;

  async function logProgress() {
    if (!logVal || parseFloat(logVal) <= 0) return;
    setLogging(true);
    await onProgressLog?.(task.id, parseFloat(logVal));
    setLogVal("");
    setLogging(false);
    setLogOk(true);
    setTimeout(() => setLogOk(false), 1800);
  }

  // Format value display
  function fmt(v) {
    if (isRevenue) return `$${(v ?? 0).toFixed(0)}`;
    return String(v ?? 0);
  }

  return (
    <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      {/* ── Main row ── */}
      <div
        onClick={() => hasDetail && setExpanded(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "8px 12px",
          cursor: hasDetail ? "pointer" : "default",
          transition: "background .1s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* Complete toggle / type icon */}
        {isStandard ? (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange?.(task.id, isDone ? "PENDING" : "COMPLETED"); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 0, display: "flex", flexShrink: 0,
              color: isDone ? "#22c55e" : "var(--color-border-secondary)",
            }}
          >
            {isDone
              ? <CheckCircle style={{ width: 15, height: 15 }} />
              : <Circle style={{ width: 15, height: 15 }} />}
          </button>
        ) : (
          <span style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: isDone ? "var(--color-background-secondary)" : meta.light,
            border: `1px solid ${isDone ? "var(--color-border-tertiary)" : meta.color + "30"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 11, height: 11, color: isDone ? "var(--color-text-tertiary)" : meta.color }} />
          </span>
        )}

        {/* Title */}
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 13, fontWeight: 400, lineHeight: 1.4,
          color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
          textDecoration: isDone ? "line-through" : "none",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {task.title}
        </span>

        {/* Right-side metadata — richer than before */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          {/* Assigned member */}
          {task.assignedTo && !task.assignToAll && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, color: "var(--color-text-tertiary)",
            }}>
              <User style={{ width: 9, height: 9 }} />
              {task.assignedTo.name}
            </span>
          )}
          {task.assignToAll && (
            <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>all</span>
          )}
          {task.isDaily && (
            <span style={{ fontSize: 10, color: "#0ea5e9", background: "#f0f9ff", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>daily</span>
          )}

          {/* Progress display */}
          {pct !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Bar pct={pct} color={meta.color} height={3} />
              <span style={{
                fontSize: 11, minWidth: 28, textAlign: "right",
                color: pct >= 100 ? "#22c55e" : "var(--color-text-tertiary)",
                fontWeight: pct >= 100 ? 600 : 400,
              }}>
                {pct}%
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                {fmt(task.currentValue)}/{fmt(task.targetValue)}
              </span>
            </div>
          )}

          {/* Checklist counter */}
          {cl.length > 0 && pct === null && (
            <span style={{ fontSize: 11, color: doneItems === cl.length ? "#22c55e" : "var(--color-text-tertiary)", fontWeight: doneItems === cl.length ? 600 : 400 }}>
              {doneItems}/{cl.length}
            </span>
          )}

          {/* Due date */}
          <DueChip dueDate={task.dueDate} isDone={isDone} />

          {/* Priority dot */}
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: isDone ? "var(--color-border-tertiary)" : (PRIORITY_COLOR[task.priority] || "#cbd5e1"),
          }} />

          {/* Expand toggle */}
          {hasDetail && (
            <span style={{ color: "var(--color-text-tertiary)", display: "flex", marginLeft: 1 }}>
              {expanded
                ? <ChevronUp style={{ width: 11, height: 11 }} />
                : <ChevronDown style={{ width: 11, height: 11 }} />}
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div style={{
          padding: "8px 12px 11px 43px",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>

          {/* Followup cards: wrapped in compact shell */}
          {isFollowup && renderFollowup ? (
            <CompactFollowupShell task={task}>
              {renderFollowup(task)}
            </CompactFollowupShell>
          ) : (
            <>
              {/* Description */}
              {task.description && (
                <p style={{
                  margin: 0, fontSize: 12,
                  color: "var(--color-text-secondary)", lineHeight: 1.6,
                }}>
                  {task.description}
                </p>
              )}

              {/* Checklist items */}
              {cl.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[...cl].sort((a, b) => Number(a.done) - Number(b.done)).map(item => (
                    <label
                      key={item.id}
                      onClick={e => { e.stopPropagation(); onChecklistToggle?.(task.id, item.id, !item.done); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        cursor: "pointer", padding: "5px 8px",
                        borderRadius: 7,
                        background: item.done ? "var(--color-background-success, #f0fdf4)" : "var(--color-background-primary)",
                        border: `0.5px solid ${item.done ? "#bbf7d0" : "var(--color-border-tertiary)"}`,
                        transition: "all .1s", userSelect: "none",
                      }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`,
                        background: item.done ? "#22c55e" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all .1s",
                      }}>
                        {item.done && <Check style={{ width: 8, height: 8, color: "#fff" }} />}
                      </span>
                      <span style={{
                        flex: 1, fontSize: 12,
                        color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}>
                        {item.label}
                      </span>
                      {item.required && !item.done && (
                        <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>req</span>
                      )}
                      {item.done && item.doneBy && (
                        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{item.doneBy}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Progress log input — FIX: differentiate by task type */}
              {pct !== null && pct < 100 && (
                <div
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="number"
                    min={isRevenue ? "0.01" : "1"}
                    step={isRevenue ? "0.01" : "1"}
                    value={logVal}
                    onChange={e => setLogVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && logProgress()}
                    // ── FIX: show count vs amount based on type ──
                    placeholder={isRevenue ? "Add amount ($)…" : "Add count…"}
                    style={{
                      width: 130, padding: "5px 9px",
                      border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: 7, fontSize: 12,
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-primary)",
                      fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <button
                    onClick={logProgress}
                    disabled={logging || !logVal}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 12px", borderRadius: 7, border: "none",
                      background: logOk ? "#22c55e" : (!logVal || logging) ? "var(--color-background-secondary)" : meta.color,
                      color: (!logVal || logging) ? "var(--color-text-tertiary)" : "#fff",
                      fontSize: 12, fontWeight: 600,
                      cursor: (!logVal || logging) ? "not-allowed" : "pointer",
                      fontFamily: "inherit", transition: "background .2s",
                      minWidth: 52, justifyContent: "center",
                    }}
                  >
                    {logOk ? "✓" : logging ? "…" : <><Plus style={{ width: 10, height: 10 }} /> Log</>}
                  </button>
                </div>
              )}

              {/* Sub-tasks (member allocations) compact view */}
              {(task.subTasks || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Member allocations
                  </span>
                  {task.subTasks.map(st => {
                    const sPct = st.targetValue > 0
                      ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100))
                      : 0;
                    return (
                      <div key={st.id} style={{
                        display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                        padding: "5px 8px", borderRadius: 6,
                        background: "var(--color-background-primary)",
                        border: "0.5px solid var(--color-border-tertiary)",
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          background: meta.light, border: `1px solid ${meta.color}25`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700, color: meta.color,
                        }}>
                          {(st.assignedTo?.name || "?")[0]?.toUpperCase()}
                        </span>
                        <span style={{ minWidth: 80, color: "var(--color-text-secondary)" }}>
                          {st.assignedTo?.name || "—"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <Bar pct={sPct} color={meta.color} height={3} />
                        </div>
                        <span style={{ color: "var(--color-text-tertiary)", minWidth: 60, textAlign: "right" }}>
                          {isRevenue ? `$${(st.currentValue ?? 0).toFixed(0)}/$${st.targetValue}` : `${st.currentValue ?? 0}/${st.targetValue}`}
                        </span>
                        {st.status === "COMPLETED" && (
                          <CheckCircle style={{ width: 10, height: 10, color: "#22c55e", flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {task.notes && (() => {
                let parsed = null;
                try { parsed = JSON.parse(task.notes); } catch (_) {}
                // Don't render if it's structured JSON (followup meta)
                if (parsed && typeof parsed === "object") return null;
                return (
                  <div style={{
                    padding: "7px 10px",
                    background: "var(--color-background-primary)",
                    borderRadius: 7,
                    borderLeft: `2px solid ${meta.color}50`,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 2 }}>
                      Note
                    </span>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5, fontStyle: "italic" }}>
                      {task.notes}
                    </p>
                  </div>
                );
              })()}

              {/* Recent activity */}
              {(task.progressLogs || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Recent activity
                  </span>
                  {task.progressLogs.slice(0, 4).map((log, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 7, fontSize: 11, alignItems: "center",
                      padding: "4px 8px", borderRadius: 6,
                      background: i % 2 === 0 ? "var(--color-background-primary)" : "transparent",
                    }}>
                      <span style={{ fontWeight: 500, color: "var(--color-text-secondary)" }}>
                        {log.user?.name || "Admin"}
                      </span>
                      <span style={{ flex: 1, color: "var(--color-text-tertiary)", fontSize: 10 }}>
                        {log.action?.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {log.value > 0 && (
                        <span style={{ color: "#22c55e", fontWeight: 600 }}>
                          +{isRevenue ? `$${log.value}` : log.value}
                        </span>
                      )}
                      <span style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group row ─────────────────────────────────────────────────
function GroupRow({ tasks, groupKey, onStatusChange, onChecklistToggle, onProgressLog, renderFollowup }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[tasks[0]?.taskType] || TYPE_META.STANDARD;
  const Icon = TYPE_ICONS[tasks[0]?.taskType] || ClipboardList;
  const label = groupLabel(tasks);
  const doneCount = tasks.filter(t => t.status === "COMPLETED").length;
  const allDone = doneCount === tasks.length;
  const urgentCount = tasks.filter(t => t.priority === "URGENT" || t.priority === "HIGH").length;

  return (
    <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", cursor: "pointer", transition: "background .1s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* Type icon */}
        <span style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: allDone ? "var(--color-background-secondary)" : meta.light,
          border: `1px solid ${allDone ? "var(--color-border-tertiary)" : meta.color + "30"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 10, height: 10, color: allDone ? "var(--color-text-tertiary)" : meta.color }} />
        </span>

        {/* Type label */}
        <span style={{ fontSize: 11, color: allDone ? "var(--color-text-tertiary)" : meta.color, fontWeight: 600, flexShrink: 0 }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>·</span>

        {/* Player/group label */}
        <span style={{
          fontSize: 12, color: allDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
          flex: 1, minWidth: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textDecoration: allDone ? "line-through" : "none",
        }}>
          {label}
        </span>

        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {urgentCount > 0 && !allDone && (
            <span style={{ fontSize: 10, color: "#ef4444", background: "#fef2f2", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
              {urgentCount} urgent
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 999,
            background: allDone ? "#f0fdf4" : meta.color + "15",
            color: allDone ? "#22c55e" : meta.color,
            border: `0.5px solid ${allDone ? "#bbf7d0" : meta.color + "30"}`,
          }}>
            {doneCount > 0 ? `${doneCount}/${tasks.length}` : tasks.length}
          </span>
          {open
            ? <ChevronUp style={{ width: 11, height: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
            : <ChevronDown style={{ width: 11, height: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }} />}
        </div>
      </div>

      {open && (
        <div style={{
          paddingLeft: 20,
          borderTop: "0.5px solid var(--color-border-tertiary)",
          background: meta.light + "40",
        }}>
          {tasks.map(t => (
            <TaskRow
              key={t.id} task={t}
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

// ─── Filter pill ───────────────────────────────────────────────
function Pill({ active, label, count, onClick, accentColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px",
        border: "0.5px solid",
        borderColor: active
          ? (accentColor ? accentColor + "80" : "var(--color-border-primary)")
          : "var(--color-border-tertiary)",
        borderRadius: 999,
        background: active
          ? (accentColor ? accentColor + "10" : "var(--color-background-primary)")
          : "transparent",
        color: active
          ? (accentColor || "var(--color-text-primary)")
          : "var(--color-text-tertiary)",
        fontSize: 11, fontWeight: active ? 600 : 400,
        cursor: "pointer", fontFamily: "inherit",
        transition: "all .12s",
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: 10,
          color: active ? (accentColor || "var(--color-text-secondary)") : "var(--color-text-tertiary)",
          opacity: active ? 0.8 : 1,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// Main export
// ════════════════════════════════════════════════════════════════
export default function SmartTaskList({
  tasks = [],
  loading = false,
  onStatusChange,
  onChecklistToggle,
  onProgressLog,
  loadTasks,
  renderFollowup,
  pageSize = 30,
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // ── Filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => tasks.filter(t => {
    if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
    if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
    if (statusFilter === "IN_PROGRESS" && t.status !== "IN_PROGRESS") return false;
    if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
    if (statusFilter === "ACTIVE" && !["PENDING", "IN_PROGRESS"].includes(t.status)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, typeFilter, statusFilter, search]);

  // ── Smart grouping ───────────────────────────────────────────
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

  const allItems = useMemo(() => [
    ...groups.map(g => ({ type: "group", ...g })),
    ...singles.map(t => ({ type: "single", task: t })),
  ], [groups, singles]);

  const totalPages = Math.ceil(allItems.length / pageSize);
  const pageItems = allItems.slice((page - 1) * pageSize, page * pageSize);

  // ── Type counts ──────────────────────────────────────────────
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
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;

  const handlerProps = { onStatusChange, onChecklistToggle, onProgressLog, renderFollowup };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Search + refresh ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{
            position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            width: 11, height: 11, color: "var(--color-text-tertiary)", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks…"
            style={{
              width: "100%", padding: "7px 28px 7px 28px",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8, fontSize: 12,
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              transition: "border-color .15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "var(--color-border-secondary)"}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, color: "var(--color-text-tertiary)", display: "flex",
              }}
            >
              <X style={{ width: 11, height: 11 }} />
            </button>
          )}
        </div>
        {loadTasks && (
          <button
            onClick={loadTasks}
            style={{
              padding: "7px 9px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8, cursor: "pointer", display: "flex",
              color: "var(--color-text-tertiary)",
            }}
          >
            <RefreshCw style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>

      {/* ── Status + type filters ─────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        <Pill active={statusFilter === "ALL"} label="All" count={tasks.length} onClick={() => { setStatusFilter("ALL"); setPage(1); }} />
        <Pill active={statusFilter === "ACTIVE"} label="Active" count={activeCount} onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }} />
        <Pill active={statusFilter === "COMPLETED"} label="Done" count={completedCount} onClick={() => { setStatusFilter("COMPLETED"); setPage(1); }} accentColor="#22c55e" />
        {overdueCount > 0 && (
          <Pill
            active={false} label="Overdue" count={overdueCount}
            onClick={() => {}} accentColor="#ef4444"
          />
        )}

        {activeTypes.length > 1 && (
          <span style={{ width: 1, height: 14, background: "var(--color-border-tertiary)", margin: "0 2px" }} />
        )}

        {activeTypes.length > 1 && activeTypes.map(([type, count]) => {
          const m = TYPE_META[type];
          if (!m) return null;
          return (
            <Pill
              key={type}
              active={typeFilter === type}
              label={m.label}
              count={count}
              onClick={() => { setTypeFilter(typeFilter === type ? "ALL" : type); setPage(1); }}
              accentColor={m.color}
            />
          );
        })}
      </div>

      {/* ── List container ───────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "smartSpin .8s linear infinite" }} />
          Loading tasks…
        </div>

      ) : pageItems.length === 0 ? (
        <div style={{
          padding: "36px 16px", textAlign: "center",
          border: "0.5px dashed var(--color-border-secondary)",
          borderRadius: 10,
        }}>
          <CheckCircle style={{ width: 16, height: 16, color: "var(--color-border-secondary)", margin: "0 auto 8px", display: "block" }} />
          <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {search ? `No tasks matching "${search}"` : "All clear"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {search ? "Try a different search" : "New tasks will appear here automatically"}
          </p>
        </div>

      ) : (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 10, overflow: "hidden",
          background: "var(--color-background-primary)",
        }}>
          {/* Summary bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 12px",
            background: "var(--color-background-secondary)",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
          }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {filtered.length} task{filtered.length !== 1 ? "s" : ""}
              {groups.length > 0 && (
                <> · <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{groups.length} grouped</span></>
              )}
            </span>
            {totalPages > 1 && (
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                page {page} of {totalPages}
              </span>
            )}
          </div>

          {/* Task items */}
          {pageItems.map(item =>
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
              padding: "9px 12px",
              borderTop: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "4px 11px",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 6, background: "var(--color-background-primary)",
                  color: page === 1 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                  fontSize: 12, cursor: page === 1 ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    width: 28, height: 26,
                    border: "0.5px solid",
                    borderColor: page === p ? "var(--color-border-primary)" : "var(--color-border-tertiary)",
                    borderRadius: 6,
                    background: page === p ? "var(--color-background-primary)" : "transparent",
                    color: page === p ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                    fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "4px 11px",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 6, background: "var(--color-background-primary)",
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

      <style>{`@keyframes smartSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
