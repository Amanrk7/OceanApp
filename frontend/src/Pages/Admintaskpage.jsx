// pages/AdminTaskPage.jsx
// ── Design matches AddTransactionsPage exactly ──────────────────
// Task types: STANDARD | DAILY_CHECKLIST | PLAYER_ADDITION | REVENUE_TARGET
// Tasks are admin-only to create/delete; members interact via MemberTasksSection
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Trash2, CheckCircle, Clock, AlertCircle, Circle,
  BarChart2, Users, TrendingUp, List, RefreshCw, ChevronDown,
  ChevronUp, Zap, Tag, Calendar, Edit2, Eye, ArrowDownLeft,
  ArrowUpRight, Gift, Star,
} from "lucide-react";
import { tasksAPI } from "../api";

// ── Style tokens (identical to AddTransactionsPage) ───────────────
const LABEL = {
  display: "block", fontSize: "11px", fontWeight: "700",
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const INPUT = {
  width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
  borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};
const SELECT = { ...INPUT, paddingRight: "32px", appearance: "none", cursor: "pointer" };
const CARD = {
  background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
  boxShadow: "0 2px 12px rgba(15,23,42,.07)", padding: "28px 32px",
};
const DIVIDER = { height: "1px", background: "#f1f5f9", margin: "20px 0" };

const API = import.meta.env.VITE_API_URL ?? "";

// ── Constants ─────────────────────────────────────────────────────
const TASK_TYPES = [
  {
    value: "STANDARD",
    label: "Standard Task",
    icon: List,
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    desc: "Custom one-off task with optional checklist and due date",
  },
  {
    value: "DAILY_CHECKLIST",
    label: "Daily Checklist",
    icon: CheckCircle,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    desc: "Recurring daily checklist — resets every day for all or specific members",
  },
  {
    value: "PLAYER_ADDITION",
    label: "Player Addition",
    icon: Users,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    desc: "Set a player-addition goal with per-member sub-targets and live tracking",
  },
  {
    value: "REVENUE_TARGET",
    label: "Revenue Target",
    icon: TrendingUp,
    color: "#22c55e",
    bg: "#f0fdf4",
    border: "#86efac",
    desc: "Set a profit goal with member sub-allocations and % tracking",
  },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const PRIORITY_COLORS = {
  LOW:    { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  MEDIUM: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  HIGH:   { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
};
const STATUS_COLORS = {
  PENDING:     { bg: "#f1f5f9", text: "#475569" },
  IN_PROGRESS: { bg: "#eff6ff", text: "#1d4ed8" },
  COMPLETED:   { bg: "#dcfce7", text: "#166534" },
  CANCELLED:   { bg: "#fee2e2", text: "#991b1b" },
};

function emptyForm() {
  return {
    title: "", description: "", priority: "MEDIUM", dueDate: "", notes: "",
    taskType: "STANDARD", targetValue: "", assignToAll: false,
    assignedToId: "", checklistItems: [], subTasks: [], isDaily: false,
  };
}

// ── Reusable small components ─────────────────────────────────────
function Alert({ type, children }) {
  const colors = type === "error"
    ? { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b", Icon: AlertCircle }
    : { bg: "#dcfce7", border: "#86efac", text: "#166634", Icon: CheckCircle };
  return (
    <div style={{ padding: "11px 14px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "8px", color: colors.text, fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
      <colors.Icon style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {children}
    </div>
  );
}

function ProgressBar({ pct, color = "#3b82f6" }) {
  return (
    <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
    </div>
  );
}

function TypeBadge({ taskType }) {
  const meta = TASK_TYPES.find(t => t.value === taskType) || TASK_TYPES[0];
  const Icon = meta.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
      <Icon style={{ width: "9px", height: "9px" }} /> {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
  return (
    <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{priority}</span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span style={{ padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: c.bg, color: c.text }}>{status?.replace("_", " ")}</span>
  );
}

// ── Admin Task Row ────────────────────────────────────────────────
function AdminTaskRow({ task, onDelete, onStatusChange, teamMembers, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [logValue, setLogValue] = useState("");
  const [logMemberId, setLogMemberId] = useState("");
  const [logging, setLogging] = useState(false);

  const meta = TASK_TYPES.find(t => t.value === task.taskType) || TASK_TYPES[0];
  const Icon = meta.icon;
  const isCompleted = task.status === "COMPLETED";

  const pct = task.targetValue > 0
    ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100))
    : null;
  const checklist = task.checklistItems || [];
  const doneItems = checklist.filter(i => i.done).length;
  const checklistPct = checklist.length > 0
    ? Math.round((doneItems / checklist.length) * 100)
    : null;

  const subTasks = task.subTasks || [];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  async function handleLogProgress() {
    if (!logValue || parseFloat(logValue) <= 0) return;
    setLogging(true);
    try {
      await fetch(`${API}/tasks/${task.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: parseFloat(logValue), memberId: logMemberId || undefined, action: "ADMIN_LOG" }),
      });
      setLogValue("");
      onRefresh();
    } catch (_) {}
    setLogging(false);
  }

  return (
    <div style={{
      border: `1px solid ${isCompleted ? "#86efac" : isOverdue ? "#fca5a5" : "#e2e8f0"}`,
      borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]?.text || "#64748b"}`,
      borderRadius: "12px",
      background: isCompleted ? "#fafffe" : "#fff",
      overflow: "hidden",
      transition: "box-shadow .15s",
    }}>
      {/* ── Row summary ── */}
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Status toggle */}
        <button
          onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          title="Toggle complete"
        >
          {isCompleted
            ? <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e" }} />
            : <Circle style={{ width: "20px", height: "20px", color: "#cbd5e1" }} />}
        </button>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none" }}>
              {task.title}
            </span>
            <TypeBadge taskType={task.taskType} />
            <PriorityBadge priority={task.priority} />
            {task.assignToAll && (
              <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>All Members</span>
            )}
            {task.isDaily && (
              <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>Daily</span>
            )}
            {isOverdue && (
              <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: "#fee2e2", color: "#991b1b" }}>⚠ Overdue</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {task.assignedTo && (
              <span style={{ fontSize: "12px", color: "#64748b" }}>→ {task.assignedTo.name}</span>
            )}
            {task.dueDate && (
              <span style={{ fontSize: "11px", color: isOverdue ? "#dc2626" : "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                <Calendar style={{ width: "10px", height: "10px" }} />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Progress indicators */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
          {pct !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "80px" }}>
              <ProgressBar pct={pct} color={meta.color} />
              <span style={{ fontSize: "12px", fontWeight: "700", color: pct >= 100 ? "#22c55e" : "#0f172a", whiteSpace: "nowrap" }}>
                {pct}%
              </span>
            </div>
          )}
          {checklistPct !== null && (
            <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
              {doneItems}/{checklist.length} ✓
            </span>
          )}
          <StatusBadge status={task.status} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px 8px", color: "#64748b", display: "flex", alignItems: "center" }}>
            {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{ background: "none", border: "1px solid #fca5a5", borderRadius: "7px", cursor: "pointer", padding: "5px 8px", color: "#ef4444", display: "flex", alignItems: "center" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <Trash2 style={{ width: "13px", height: "13px" }} />
          </button>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px", background: "#fafbfc", display: "flex", flexDirection: "column", gap: "14px" }}>
          {task.description && (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>{task.description}</p>
          )}

          {/* Progress detail for PLAYER_ADDITION / REVENUE_TARGET */}
          {pct !== null && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {task.taskType === "REVENUE_TARGET" ? "Revenue Progress" : "Player Addition Progress"}
                </span>
                <span style={{ fontSize: "13px", fontWeight: "800", color: pct >= 100 ? "#22c55e" : meta.color }}>
                  {task.taskType === "REVENUE_TARGET"
                    ? `$${(task.currentValue ?? 0).toFixed(2)} / $${task.targetValue}`
                    : `${task.currentValue ?? 0} / ${task.targetValue} players`}
                </span>
              </div>
              <ProgressBar pct={pct} color={meta.color} />

              {/* Sub-tasks by member */}
              {subTasks.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Member Allocations</div>
                  {subTasks.map(st => {
                    const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                    return (
                      <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", minWidth: "120px" }}>
                          {st.assignedTo?.name || "Unassigned"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <ProgressBar pct={sPct} color={meta.color} />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: sPct >= 100 ? "#22c55e" : "#0f172a", whiteSpace: "nowrap", minWidth: "80px", textAlign: "right" }}>
                          {task.taskType === "REVENUE_TARGET"
                            ? `$${(st.currentValue ?? 0).toFixed(2)} / $${st.targetValue}`
                            : `${st.currentValue ?? 0} / ${st.targetValue}`}
                        </span>
                        {st.status === "COMPLETED" && <CheckCircle style={{ width: "13px", height: "13px", color: "#22c55e", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Admin progress log */}
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", width: "100%" }}>Log Progress (Admin)</div>
                <select value={logMemberId} onChange={e => setLogMemberId(e.target.value)} style={{ ...SELECT, maxWidth: "160px", fontSize: "12px", padding: "7px 10px" }}>
                  <option value="">Any member</option>
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div style={{ position: "relative", flex: 1, maxWidth: "120px" }}>
                  <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "#94a3b8", pointerEvents: "none" }} />
                  <input
                    type="number" min="0.01" step="any"
                    placeholder={task.taskType === "REVENUE_TARGET" ? "$ amount" : "# players"}
                    value={logValue}
                    onChange={e => setLogValue(e.target.value)}
                    style={{ ...INPUT, fontSize: "12px", padding: "7px 10px" }}
                  />
                </div>
                <button
                  onClick={handleLogProgress}
                  disabled={logging || !logValue}
                  style={{ padding: "7px 14px", background: logging ? "#e2e8f0" : meta.color, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: logging || !logValue ? "not-allowed" : "pointer" }}
                >
                  {logging ? "…" : "+ Log"}
                </button>
              </div>
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Checklist
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: doneItems === checklist.length ? "#22c55e" : "#64748b" }}>
                  {doneItems}/{checklist.length} done
                </span>
              </div>
              <ProgressBar pct={checklistPct} color="#0ea5e9" />
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {checklist.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    {item.done
                      ? <CheckCircle style={{ width: "13px", height: "13px", color: "#22c55e", flexShrink: 0 }} />
                      : <Circle style={{ width: "13px", height: "13px", color: "#cbd5e1", flexShrink: 0 }} />}
                    <span style={{ color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none", flex: 1 }}>{item.label}</span>
                    {item.doneBy && <span style={{ fontSize: "10px", color: "#94a3b8" }}>by {item.doneBy}</span>}
                    {item.required && !item.done && <span style={{ color: "#ef4444", fontSize: "10px" }}>*req</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Log */}
          {task.progressLogs?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Activity Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {task.progressLogs.slice(0, 8).map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", alignItems: "center" }}>
                    <Zap style={{ width: "10px", height: "10px", color: "#8b5cf6", flexShrink: 0 }} />
                    <span style={{ fontWeight: "600", color: "#0f172a" }}>{log.user?.name || "Admin"}</span>
                    <span style={{ color: "#64748b", flex: 1 }}>{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                    {log.value > 0 && (
                      <span style={{ fontWeight: "700", color: "#22c55e" }}>
                        +{task.taskType === "REVENUE_TARGET" ? `$${log.value}` : log.value}
                      </span>
                    )}
                    <span style={{ color: "#cbd5e1", flexShrink: 0 }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.notes && (
            <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
              <span style={{ fontWeight: "700" }}>Admin Note: </span>{task.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminTaskPage() {
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [teamMembers, setTeamMembers]   = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter]     = useState("ALL");
  const [searchQuery, setSearchQuery]   = useState("");
  const [form, setForm]                 = useState(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState("");
  const [success, setSuccess]           = useState("");
  const [error, setError]               = useState("");
  const sseRef = useRef(null);

  // ── Bootstrap ─────────────────────────────────────────────────
  useEffect(() => {
    loadTasks();
    loadMembers();
    setupSSE();
    return () => sseRef.current?.close();
  }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 5000); return () => clearTimeout(t); }
  }, [error]);
  
  

  function setupSSE() {
    const sse = new EventSource(`${API}/tasks/events`, { withCredentials: true });
    sse.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === "task_created") setTasks(prev => [data, ...prev.filter(t => t.id !== data.id)]);
        if (type === "task_updated") setTasks(prev => prev.map(t => t.id === data.id ? data : t));
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) {}
    };
    sseRef.current = sse;
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/tasks`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      setTasks(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // async function loadMembers() {
  //   try {
  //     const res  = await fetch(`${API}/team-members`, { credentials: "include" });
  //     const data = await res.json();
  //     setTeamMembers(data.data || data || []);
  //   } catch (_) {}
  // }
async function loadMembers() {
  try {
    const res = await fetch(`${API}/team-members`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) return; // bail early, don't touch state
    const members = data.data ?? data;
    setTeamMembers(Array.isArray(members) ? members : []);
  } catch (_) {}
}
  // ── Submit new task ───────────────────────────────────────────
  async function handleSubmit() {
    setFormError("");
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && !form.targetValue) {
      setFormError("Target value is required for this task type"); return;
    }
    const hasBlankChecklist = form.checklistItems.some(i => !i.label.trim());
    if (hasBlankChecklist) { setFormError("All checklist items must have a label"); return; }
    const hasBlankSubTask = form.subTasks.some(st => !st.assignedToId || !st.targetValue);
    if (hasBlankSubTask) { setFormError("All member allocations must have a member and target value"); return; }

    setSubmitting(true);
    try {
      const body = {
        ...form,
        targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined,
        subTasks: form.subTasks.map(st => ({ ...st, targetValue: parseFloat(st.targetValue) })),
      };
      const res  = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      setSuccess(`Task "${data.data?.title || form.title}" created successfully!`);
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSuccess("Task deleted.");
    } catch (e) {
      setError(e.message || "Failed to delete task");
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  async function handleDailyReset() {
    if (!confirm("Reset all daily checklist tasks for today? Members will see fresh checklists.")) return;
    try {
      const res = await fetch(`${API}/tasks/daily-reset`, { method: "POST", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSuccess("Daily checklists reset successfully.");
      loadTasks();
    } catch (e) {
      setError(e.message || "Reset failed");
    }
  }

  // ── Filtering + grouping ──────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const grouped = TASK_TYPES.reduce((acc, tt) => {
    acc[tt.value] = filtered.filter(t => t.taskType === tt.value);
    return acc;
  }, {});

  const totalCompleted = tasks.filter(t => t.status === "COMPLETED").length;
  const totalPending   = tasks.filter(t => t.status === "PENDING").length;
  const totalInProg    = tasks.filter(t => t.status === "IN_PROGRESS").length;

  // ── Form helpers ──────────────────────────────────────────────
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const selectedTypeMeta = TASK_TYPES.find(t => t.value === form.taskType) || TASK_TYPES[0];
  const TypeIcon = selectedTypeMeta.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "inherit" }}>

      {/* ════ HEADER CARD ════ */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", background: "#f5f3ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BarChart2 style={{ width: "22px", height: "22px", color: "#7c3aed" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Task Management</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {tasks.length} tasks · <span style={{ color: "#22c55e", fontWeight: "600" }}>{totalCompleted} done</span> · <span style={{ color: "#f59e0b", fontWeight: "600" }}>{totalInProg} in progress</span> · <span style={{ color: "#94a3b8", fontWeight: "600" }}>{totalPending} pending</span>
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleDailyReset}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer", color: "#475569" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#94a3b8"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            >
              <RefreshCw style={{ width: "13px", height: "13px" }} /> Reset Daily
            </button>
            <button
              onClick={() => { setForm(emptyForm()); setFormError(""); setShowForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
            >
              <Plus style={{ width: "15px", height: "15px" }} /> New Task
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={DIVIDER} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
          {TASK_TYPES.map(tt => {
            const count = tasks.filter(t => t.taskType === tt.value).length;
            const done  = tasks.filter(t => t.taskType === tt.value && t.status === "COMPLETED").length;
            const TIcon = tt.icon;
            return (
              <div
                key={tt.value}
                onClick={() => setTypeFilter(typeFilter === tt.value ? "ALL" : tt.value)}
                style={{ padding: "14px 16px", border: `1.5px solid ${typeFilter === tt.value ? tt.color : tt.border}`, borderRadius: "10px", background: typeFilter === tt.value ? tt.bg : "#fafafa", cursor: "pointer", transition: "all .15s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "800", color: tt.color }}>{count}</div>
                  <TIcon style={{ width: "16px", height: "16px", color: tt.color, opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>{tt.label}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{done} completed</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════ ALERTS ════ */}
      {error   && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* ════ FILTERS ════ */}
      <div style={CARD}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...INPUT, paddingLeft: "12px" }}
              placeholder="Search tasks by title…"
            />
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid", borderColor: statusFilter === s ? "#0f172a" : "#e2e8f0", background: statusFilter === s ? "#0f172a" : "#fff", color: statusFilter === s ? "#fff" : "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div style={{ position: "relative", minWidth: "160px" }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={SELECT}>
              <option value="ALL">All Types</option>
              {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
          </div>
          <button onClick={loadTasks} disabled={loading} style={{ padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600" }}>
            <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
        </div>
      </div>

      {/* ════ TASK LIST ════ */}
      {loading ? (
        <div style={{ ...CARD, textAlign: "center", padding: "60px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Loading tasks…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "60px" }}>
          <CheckCircle style={{ width: "36px", height: "36px", color: "#e2e8f0", margin: "0 auto 12px", display: "block" }} />
          <p style={{ color: "#64748b", fontSize: "15px", fontWeight: "600", margin: "0 0 4px" }}>No tasks found</p>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Create a new task or adjust your filters.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, typeTasks]) => {
          if (typeTasks.length === 0) return null;
          const meta = TASK_TYPES.find(t => t.value === type);
          const TIcon = meta.icon;
          return (
            <div key={type}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TIcon style={{ width: "13px", height: "13px", color: meta.color }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{meta.label}</span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>({typeTasks.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {typeTasks.map(task => (
                  <AdminTaskRow
                    key={task.id}
                    task={task}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    teamMembers={teamMembers}
                    onRefresh={loadTasks}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* ════ CREATE TASK MODAL ════ */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "580px", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>

            {/* Modal header — info banner style from AddTransactions */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                  <TypeIcon style={{ width: "18px", height: "18px", color: selectedTypeMeta.color }} />
                  Create New Task
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
                  <X style={{ width: "20px", height: "20px" }} />
                </button>
              </div>
              {/* Info banner like AddTransactions */}
              <div style={{ padding: "12px 14px", background: `${selectedTypeMeta.bg}`, borderLeft: `4px solid ${selectedTypeMeta.color}`, borderRadius: "8px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <TypeIcon style={{ width: "15px", height: "15px", color: selectedTypeMeta.color, flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontWeight: "700", color: "#0f172a", margin: "0 0 2px", fontSize: "13px" }}>{selectedTypeMeta.label}</p>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "12px", lineHeight: "1.5" }}>{selectedTypeMeta.desc}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Task Type Selector */}
              <div>
                <label style={LABEL}>Task Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {TASK_TYPES.map(tt => {
                    const TIcon2 = tt.icon;
                    const sel    = form.taskType === tt.value;
                    return (
                      <button key={tt.value} onClick={() => set("taskType", tt.value)} style={{ padding: "11px 13px", borderRadius: "10px", cursor: "pointer", border: `2px solid ${sel ? tt.color : "#e2e8f0"}`, background: sel ? tt.bg : "#fafafa", textAlign: "left", fontFamily: "inherit", transition: "all .15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <TIcon2 style={{ width: "13px", height: "13px", color: sel ? tt.color : "#94a3b8" }} />
                          <span style={{ fontSize: "12px", fontWeight: "700", color: sel ? tt.color : "#0f172a" }}>{tt.label}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", lineHeight: "1.3" }}>{tt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={DIVIDER} />

              {/* Title */}
              <div>
                <label style={LABEL}>Title <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={form.title} onChange={e => set("title", e.target.value)} style={INPUT} placeholder="e.g. Add 5 new players, $1000 revenue target…" />
              </div>

              {/* Description */}
              <div>
                <label style={LABEL}>Description</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} placeholder="What needs to be done…" />
              </div>

              {/* Priority + Due Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={LABEL}>Priority</label>
                  <div style={{ position: "relative" }}>
                    <select value={form.priority} onChange={e => set("priority", e.target.value)} style={SELECT}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Due Date (optional)</label>
                  <input type="datetime-local" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={INPUT} />
                </div>
              </div>

              {/* Target value for PLAYER_ADDITION / REVENUE_TARGET */}
              {["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && (
                <div>
                  <label style={LABEL}>
                    {form.taskType === "PLAYER_ADDITION" ? "Total Players to Add" : "Total Revenue Target ($)"}
                    <span style={{ color: "#ef4444" }}> *</span>
                  </label>
                  <input
                    type="number" min="1" step="any"
                    value={form.targetValue}
                    onChange={e => set("targetValue", e.target.value)}
                    style={{ ...INPUT, borderColor: !form.targetValue && formError ? "#fca5a5" : "#e2e8f0" }}
                    placeholder={form.taskType === "PLAYER_ADDITION" ? "e.g. 5" : "e.g. 1000.00"}
                  />
                  {form.targetValue > 0 && (
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      {form.taskType === "REVENUE_TARGET"
                        ? `Goal: $${parseFloat(form.targetValue).toFixed(2)} total revenue from all members`
                        : `Goal: ${form.targetValue} total players added across all members`}
                    </p>
                  )}
                </div>
              )}

              {/* Assign To */}
              <div>
                <label style={LABEL}>Assign To</label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "10px", padding: "10px 12px", border: `1.5px solid ${form.assignToAll ? "#7c3aed" : "#e2e8f0"}`, borderRadius: "8px", background: form.assignToAll ? "#f5f3ff" : "#fff" }}>
                  <input type="checkbox" checked={form.assignToAll} onChange={e => set("assignToAll", e.target.checked)} style={{ accentColor: "#7c3aed" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Assign to ALL members</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Every team member will see and work on this task</div>
                  </div>
                </label>
                {!form.assignToAll && (
                  <div style={{ position: "relative" }}>
                    <select value={form.assignedToId} onChange={e => set("assignedToId", e.target.value)} style={SELECT}>
                      <option value="">— Leave unassigned or pick a member —</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                    </select>
                    <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                  </div>
                )}
              </div>

              {/* Daily auto-reset toggle */}
              {form.taskType === "DAILY_CHECKLIST" && (
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "12px 14px", border: `1.5px solid ${form.isDaily ? "#0ea5e9" : "#e2e8f0"}`, borderRadius: "8px", background: form.isDaily ? "#f0f9ff" : "#fff" }}>
                  <input type="checkbox" checked={form.isDaily} onChange={e => set("isDaily", e.target.checked)} style={{ accentColor: "#0ea5e9", width: "16px", height: "16px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Auto-reset daily</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Checklist resets every morning — same tasks, fresh tracking</div>
                  </div>
                </label>
              )}

              {/* Checklist builder */}
              {["DAILY_CHECKLIST", "STANDARD"].includes(form.taskType) && (
                <div>
                  <div style={DIVIDER} />
                  <label style={LABEL}>Checklist Items</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                    {form.checklistItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Circle style={{ width: "14px", height: "14px", color: "#cbd5e1", flexShrink: 0 }} />
                        <input
                          value={item.label}
                          onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it))}
                          style={{ ...INPUT, flex: 1, padding: "8px 10px", fontSize: "13px" }}
                          placeholder={`Checklist item ${i + 1}`}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "700", color: "#64748b", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                          <input type="checkbox" checked={item.required} onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, required: e.target.checked } : it))} />
                          Required
                        </label>
                        <button onClick={() => set("checklistItems", form.checklistItems.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", display: "flex" }}>
                          <X style={{ width: "13px", height: "13px" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => set("checklistItems", [...form.checklistItems, { id: `item_${Date.now()}`, label: "", required: true, done: false }])}
                    style={{ fontSize: "12px", color: "#0ea5e9", background: "none", border: "1px dashed #bae6fd", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }}
                  >
                    + Add checklist item
                  </button>
                </div>
              )}

              {/* Member sub-allocations for PLAYER_ADDITION / REVENUE_TARGET */}
              {["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && (
                <div>
                  <div style={DIVIDER} />
                  <label style={LABEL}>Member Allocations <span style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none", letterSpacing: 0 }}>(optional — splits goal across specific members)</span></label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                    {form.subTasks.map((st, i) => {
                      const totalAllocated = form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0);
                      const pctOf = form.targetValue > 0 ? Math.round((parseFloat(st.targetValue || 0) / form.targetValue) * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <div style={{ position: "relative", flex: 2 }}>
                            <select value={st.assignedToId} onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, assignedToId: e.target.value } : s))} style={{ ...SELECT, fontSize: "12px", padding: "8px 10px" }}>
                              <option value="">Select member</option>
                              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "#94a3b8", pointerEvents: "none" }} />
                          </div>
                          <input
                            type="number" min="0.01" step="any"
                            value={st.targetValue}
                            onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, targetValue: e.target.value } : s))}
                            style={{ ...INPUT, width: "110px", fontSize: "12px", padding: "8px 10px" }}
                            placeholder={form.taskType === "REVENUE_TARGET" ? "$200" : "1"}
                          />
                          {pctOf > 0 && <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>{pctOf}%</span>}
                          <button onClick={() => set("subTasks", form.subTasks.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", display: "flex" }}>
                            <X style={{ width: "13px", height: "13px" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => set("subTasks", [...form.subTasks, { assignedToId: "", targetValue: "", label: "" }])}
                    style={{ fontSize: "12px", color: "#7c3aed", background: "none", border: "1px dashed #ddd6fe", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }}
                  >
                    + Add member allocation
                  </button>

                  {/* Allocation summary */}
                  {form.subTasks.length > 0 && form.targetValue && (
                    <div style={{ marginTop: "10px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#64748b" }}>Total allocated</span>
                        <span style={{ fontWeight: "700", color: (() => { const tot = form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0); return tot > parseFloat(form.targetValue) ? "#ef4444" : tot === parseFloat(form.targetValue) ? "#22c55e" : "#0f172a"; })() }}>
                          {form.taskType === "REVENUE_TARGET"
                            ? `$${form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0).toFixed(2)} / $${form.targetValue}`
                            : `${form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0)} / ${form.targetValue}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label style={LABEL}>Admin Notes (internal only)</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} placeholder="Internal notes — not shown to members…" />
              </div>

              {formError && <Alert type="error">{formError}</Alert>}
            </div>

            {/* Modal footer */}
            <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "10px", position: "sticky", bottom: 0, background: "#fff" }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px", color: "#475569" }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 2, padding: "11px", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "14px", cursor: submitting ? "not-allowed" : "pointer", background: submitting ? "#e2e8f0" : selectedTypeMeta.color, color: submitting ? "#94a3b8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
              >
                {submitting ? "Creating…" : (
                  <>{form.assignToAll ? <><Users style={{ width: "15px", height: "15px" }} /> Assign to All Members</> : <><Plus style={{ width: "15px", height: "15px" }} /> Create Task</>}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}
