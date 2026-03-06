// components/MemberTasksSection.jsx
// Drop this into TeamDashboard.jsx — replaces the current task list.
// Members can: tick checklist items, log progress on player/revenue tasks, mark standard tasks done.
// Props: currentUser, activeShift (to gate certain actions)
import { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle, Circle, Clock, AlertCircle, RefreshCw,
  TrendingUp, Users, List, ChevronDown, ChevronUp, Zap,
  Calendar, Plus, X, Check,
} from "lucide-react";

// ── Style tokens (same as AddTransactionsPage) ─────────────────────
const LABEL = {
  display: "block", fontSize: "11px", fontWeight: "700",
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const INPUT = {
  width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
  borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};
const CARD = {
  background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
  boxShadow: "0 2px 12px rgba(15,23,42,.07)",
};
const DIVIDER = { height: "1px", background: "#f1f5f9", margin: "16px 0" };

const API = import.meta.env.VITE_API_URL ?? "";

// ── Constants ──────────────────────────────────────────────────────
const TASK_TYPES = [
  { value: "STANDARD",        label: "Standard",         icon: List,        color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  { value: "DAILY_CHECKLIST", label: "Daily Checklist",  icon: CheckCircle, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
  { value: "PLAYER_ADDITION", label: "Player Addition",  icon: Users,       color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "REVENUE_TARGET",  label: "Revenue Target",   icon: TrendingUp,  color: "#22c55e", bg: "#f0fdf4", border: "#86efac" },
];

const PRIORITY_BAR = {
  LOW:    "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH:   "#f97316",
  URGENT: "#ef4444",
};

// ── Helpers ────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isOverdue = d < now;
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + fmtTime(iso);
  return { label, isOverdue };
}

function ProgressBar({ pct, color, thin }) {
  const h = thin ? "5px" : "8px";
  return (
    <div style={{ height: h, background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
    </div>
  );
}

function TypeBadge({ taskType }) {
  const meta = TASK_TYPES.find(t => t.value === taskType) || TASK_TYPES[0];
  const Icon = meta.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
      <Icon style={{ width: "9px", height: "9px" }} /> {meta.label}
    </span>
  );
}

// ── Daily Checklist Card ───────────────────────────────────────────
function DailyChecklistCard({ task, onChecklistToggle, currentUserId }) {
  const [expanded, setExpanded] = useState(true);
  const [toggling, setToggling] = useState(null);

  const checklist = task.checklistItems || [];
  const doneItems = checklist.filter(i => i.done).length;
  const pct = checklist.length > 0 ? Math.round((doneItems / checklist.length) * 100) : 0;
  const allDone = doneItems === checklist.length && checklist.length > 0;

  const due = fmtDue(task.dueDate);

  async function toggle(item) {
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${allDone ? "#86efac" : "#bae6fd"}`, borderLeft: `4px solid ${allDone ? "#22c55e" : "#0ea5e9"}` }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f0f9ff", border: `1px solid ${allDone ? "#86efac" : "#bae6fd"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {allDone
            ? <CheckCircle style={{ width: "17px", height: "17px", color: "#22c55e" }} />
            : <CheckCircle style={{ width: "17px", height: "17px", color: "#0ea5e9" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="DAILY_CHECKLIST" />
            {task.isDaily && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>Auto-Daily</span>}
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "5px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}>
              <ProgressBar pct={pct} color="#0ea5e9" thin />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {doneItems}/{checklist.length} {allDone ? "✓ All done!" : "completed"}
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>

      {/* Checklist items */}
      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          {task.description && (
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: "1.5" }}>{task.description}</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {checklist.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: toggling === item.id ? "wait" : "pointer", padding: "9px 12px", borderRadius: "8px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#e2e8f0"}`, transition: "all .15s" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}
                  onClick={() => toggle(item)}>
                  {item.done && <Check style={{ width: "11px", height: "11px", color: "#fff" }} />}
                  {toggling === item.id && <RefreshCw style={{ width: "10px", height: "10px", color: "#cbd5e1", animation: "spin 0.8s linear infinite" }} />}
                </div>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: "500", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700", flexShrink: 0 }}>required</span>}
                {item.done && item.doneBy && <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>✓ {item.doneBy}</span>}
              </label>
            ))}
          </div>
          {due && (
            <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Player Addition Card ───────────────────────────────────────────
function PlayerAdditionCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState("");
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100;
  const due = fmtDue(task.dueDate);

  // My sub-task
  const mySubTask = (task.subTasks || []).find(st => st.assignedToId === currentUserId || st.assignedTo?.id === currentUserId);
  const myPct = mySubTask?.targetValue > 0
    ? Math.min(100, Math.round(((mySubTask.currentValue ?? 0) / mySubTask.targetValue) * 100))
    : null;

  async function handleLog() {
    if (!logVal || parseFloat(logVal) <= 0) return;
    setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal));
    setLogVal("");
    setLogging(false);
    setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${allDone ? "#86efac" : "#ddd6fe"}`, borderLeft: `4px solid ${allDone ? "#22c55e" : "#8b5cf6"}` }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f5f3ff", border: `1px solid ${allDone ? "#86efac" : "#ddd6fe"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users style={{ width: "17px", height: "17px", color: allDone ? "#22c55e" : "#8b5cf6" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="PLAYER_ADDITION" />
            {task.assignToAll && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>All Members</span>}
          </div>
          {/* Overall progress */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "5px" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}>
              <ProgressBar pct={pct} color="#8b5cf6" thin />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {task.currentValue ?? 0}/{task.targetValue} players ({pct}%)
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}

          {/* My allocation */}
          {mySubTask && (
            <div style={{ padding: "12px 14px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>My Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>My progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#8b5cf6" }}>
                  {mySubTask.currentValue ?? 0} / {mySubTask.targetValue} players ({myPct ?? 0}%)
                </span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#8b5cf6" />
            </div>
          )}

          {/* All members breakdown */}
          {(task.subTasks || []).length > 0 && (
            <div style={{ padding: "12px 14px", background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Team Progress</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {task.subTasks.map(st => {
                  const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                  const isMe = st.assignedToId === currentUserId || st.assignedTo?.id === currentUserId;
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: isMe ? "700" : "500", color: isMe ? "#8b5cf6" : "#0f172a", minWidth: "90px" }}>
                        {isMe ? "⭐ You" : (st.assignedTo?.name || "Member")}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar pct={sPct} color={isMe ? "#8b5cf6" : "#94a3b8"} thin />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: sPct >= 100 ? "#22c55e" : "#0f172a", whiteSpace: "nowrap", minWidth: "70px", textAlign: "right" }}>
                        {st.currentValue ?? 0}/{st.targetValue}
                        {sPct >= 100 && <CheckCircle style={{ width: "11px", height: "11px", color: "#22c55e", marginLeft: "4px", verticalAlign: "middle" }} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Log progress input */}
          {!allDone && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
                Log Players Added
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number" min="1" step="1"
                  value={logVal}
                  onChange={e => setLogVal(e.target.value)}
                  style={{ ...INPUT, flex: 1, borderColor: "#86efac" }}
                  placeholder="How many players did you add?"
                  onKeyDown={e => e.key === "Enter" && handleLog()}
                />
                <button
                  onClick={handleLog}
                  disabled={logging || !logVal || parseFloat(logVal) <= 0}
                  style={{ padding: "10px 18px", background: logging ? "#e2e8f0" : "#22c55e", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  {logging ? <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> : <Plus style={{ width: "13px", height: "13px" }} />}
                  {logSuccess ? "✓ Logged!" : "Log"}
                </button>
              </div>
            </div>
          )}

          {due && (
            <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Revenue Target Card ────────────────────────────────────────────
function RevenueTargetCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState("");
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100;

  const mySubTask = (task.subTasks || []).find(st => st.assignedToId === currentUserId || st.assignedTo?.id === currentUserId);
  const myPct = mySubTask?.targetValue > 0
    ? Math.min(100, Math.round(((mySubTask.currentValue ?? 0) / mySubTask.targetValue) * 100))
    : null;

  const due = fmtDue(task.dueDate);

  async function handleLog() {
    if (!logVal || parseFloat(logVal) <= 0) return;
    setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal));
    setLogVal("");
    setLogging(false);
    setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${allDone ? "#86efac" : "#86efac"}`, borderLeft: `4px solid ${allDone ? "#22c55e" : "#22c55e"}` }}>
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp style={{ width: "17px", height: "17px", color: "#22c55e" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="REVENUE_TARGET" />
            {task.assignToAll && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>All Members</span>}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "5px" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}>
              <ProgressBar pct={pct} color="#22c55e" thin />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              ${(task.currentValue ?? 0).toFixed(2)} / ${task.targetValue} ({pct}%)
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}

          {mySubTask && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>My Revenue Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>My progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#16a34a" }}>
                  ${(mySubTask.currentValue ?? 0).toFixed(2)} / ${mySubTask.targetValue} ({myPct ?? 0}%)
                </span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#22c55e" />
            </div>
          )}

          {(task.subTasks || []).length > 0 && (
            <div style={{ padding: "12px 14px", background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Team Revenue Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {task.subTasks.map(st => {
                  const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                  const isMe = st.assignedToId === currentUserId || st.assignedTo?.id === currentUserId;
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: isMe ? "700" : "500", color: isMe ? "#22c55e" : "#0f172a", minWidth: "90px" }}>
                        {isMe ? "⭐ You" : (st.assignedTo?.name || "Member")}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar pct={sPct} color={isMe ? "#22c55e" : "#94a3b8"} thin />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: sPct >= 100 ? "#22c55e" : "#0f172a", whiteSpace: "nowrap", minWidth: "100px", textAlign: "right" }}>
                        ${(st.currentValue ?? 0).toFixed(2)} / ${st.targetValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!allDone && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
                Log Revenue Achieved ($)
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number" min="0.01" step="0.01"
                  value={logVal}
                  onChange={e => setLogVal(e.target.value)}
                  style={{ ...INPUT, flex: 1, borderColor: "#86efac" }}
                  placeholder="Enter amount achieved…"
                  onKeyDown={e => e.key === "Enter" && handleLog()}
                />
                <button
                  onClick={handleLog}
                  disabled={logging || !logVal || parseFloat(logVal) <= 0}
                  style={{ padding: "10px 18px", background: logging ? "#e2e8f0" : "#22c55e", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  {logging ? <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> : <TrendingUp style={{ width: "13px", height: "13px" }} />}
                  {logSuccess ? "✓ Logged!" : "Log Revenue"}
                </button>
              </div>
            </div>
          )}

          {due && (
            <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Standard Task Card ─────────────────────────────────────────────
function StandardTaskCard({ task, onStatusChange, onChecklistToggle, currentUserId }) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(null);

  const isCompleted = task.status === "COMPLETED";
  const checklist = task.checklistItems || [];
  const doneItems = checklist.filter(i => i.done).length;
  const due = fmtDue(task.dueDate);
  const barColor = PRIORITY_BAR[task.priority] || "#64748b";

  async function toggle(item) {
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `4px solid ${isCompleted ? "#22c55e" : barColor}`, opacity: isCompleted ? 0.75 : 1 }}>
      <div style={{ padding: "13px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          {isCompleted
            ? <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e" }} />
            : <Circle style={{ width: "20px", height: "20px", color: "#cbd5e1" }} />}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none" }}>
              {task.title}
            </span>
            <TypeBadge taskType="STANDARD" />
            {due?.isOverdue && !isCompleted && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#fee2e2", color: "#dc2626" }}>Overdue</span>}
          </div>
          {checklist.length > 0 && !isCompleted && (
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
              {doneItems}/{checklist.length} checklist items done
            </div>
          )}
        </div>
        {due && <span style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{due.label}</span>}
        {checklist.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#64748b", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
          </button>
        )}
      </div>

      {expanded && checklist.length > 0 && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px", lineHeight: "1.5" }}>{task.description}</p>}
          {checklist.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "7px 10px", borderRadius: "7px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#e2e8f0"}` }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onClick={() => !toggling && toggle(item)}>
                {item.done && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
              </div>
              <span style={{ flex: 1, fontSize: "13px", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
              {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444" }}>*</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser, activeShift }) {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [taskFilter, setTaskFilter] = useState("all"); // all | pending | done
  const sseRef = useRef(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/tasks?myTasks=true`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      setTasks(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    connectSSE();
    return () => sseRef.current?.close();
  }, [loadTasks]);
  
  useEffect(() => {
    const es = tasksAPI.connectSSE();

    es.addEventListener('task_created', (e) => {
      const { data: newTask } = JSON.parse(e.data);
      setTasks(prev => [newTask, ...prev]);
    });

    es.addEventListener('task_updated', (e) => {
      const { data: updated } = JSON.parse(e.data);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    });

    es.addEventListener('task_deleted', (e) => {
      const { data: { id } } = JSON.parse(e.data);
      setTasks(prev => prev.filter(t => t.id !== id));
    });

    es.onerror = () => {
      // SSE auto-reconnects — no action needed
      console.warn('SSE disconnected, will auto-reconnect');
    };

    return () => es.close(); // cleanup on unmount
  }, []);

  function connectSSE() {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API}/api/tasks/events`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === "task_created") {
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.id);
            if (exists) return prev.map(t => t.id === data.id ? data : t);
            if (data.assignToAll || data.assignedToId === currentUser?.id) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_updated") setTasks(prev => prev.map(t => t.id === data.id ? data : t));
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) {}
    };
    sseRef.current = es;
  }

  // ── Task action handlers ───────────────────────────────────────
  async function handleChecklistToggle(taskId, itemId, done) {
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, checklistItems: (t.checklistItems || []).map(i => i.id === itemId ? { ...i, done, doneBy: currentUser?.name } : i) };
    }));
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId, done }),
      });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  async function handleStatusChange(taskId, status) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  async function handleProgressLog(taskId, value) {
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value, action: "MEMBER_LOG" }),
      });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  // ── Derived ────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (taskFilter === "pending") return t.status !== "COMPLETED";
    if (taskFilter === "done")    return t.status === "COMPLETED";
    return true;
  });

  const daily   = filtered.filter(t => t.taskType === "DAILY_CHECKLIST");
  const players = filtered.filter(t => t.taskType === "PLAYER_ADDITION");
  const revenue = filtered.filter(t => t.taskType === "REVENUE_TARGET");
  const standard = filtered.filter(t => t.taskType === "STANDARD");

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const overdueCount   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>My Tasks</h2>
          <span style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>
            {completedCount}/{tasks.length} done
          </span>
          {overdueCount > 0 && (
            <span style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle style={{ width: "10px", height: "10px" }} /> {overdueCount} overdue
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {["all", "pending", "done"].map(f => (
            <button key={f} onClick={() => setTaskFilter(f)} style={{ padding: "6px 12px", border: "1px solid", borderColor: taskFilter === f ? "#0f172a" : "#e2e8f0", borderRadius: "8px", fontSize: "11px", fontWeight: "700", background: taskFilter === f ? "#0f172a" : "#fff", color: taskFilter === f ? "#fff" : "#64748b", cursor: "pointer", textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
          <button onClick={loadTasks} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}>
            <RefreshCw style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle style={{ width: "13px", height: "13px", flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
          <Clock style={{ width: "20px", height: "20px", margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: "13px", background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <CheckCircle style={{ width: "24px", height: "24px", margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
          {taskFilter === "done" ? "No completed tasks yet" : taskFilter === "pending" ? "All tasks completed! 🎉" : "No tasks assigned to you"}
        </div>
      ) : (
        <>
          {/* Daily checklists */}
          {daily.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>📋 Daily Checklists</div>
              {daily.map(task => <DailyChecklistCard key={task.id} task={task} onChecklistToggle={handleChecklistToggle} currentUserId={currentUser?.id} />)}
            </div>
          )}

          {/* Player addition */}
          {players.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>👥 Player Addition Goals</div>
              {players.map(task => <PlayerAdditionCard key={task.id} task={task} currentUserId={currentUser?.id} onProgressLog={handleProgressLog} />)}
            </div>
          )}

          {/* Revenue targets */}
          {revenue.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>💰 Revenue Targets</div>
              {revenue.map(task => <RevenueTargetCard key={task.id} task={task} currentUserId={currentUser?.id} onProgressLog={handleProgressLog} />)}
            </div>
          )}

          {/* Standard tasks */}
          {standard.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(daily.length > 0 || players.length > 0 || revenue.length > 0) && (
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 2px 0" }}>📌 Other Tasks</div>
              )}
              {standard.map(task => <StandardTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onChecklistToggle={handleChecklistToggle} currentUserId={currentUser?.id} />)}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
