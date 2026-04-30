import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from '../Context/toastContext';
import {
    Plus, X, Trash2, CheckCircle, Clock, AlertCircle, Circle,
    BarChart2, Users, TrendingUp, List, RefreshCw, ChevronDown,
    ChevronUp, Zap, Tag, Calendar, Edit2, Eye, ArrowDownLeft,
    ArrowUpRight, Gift, Star, Check,
} from "lucide-react";
import { tasksAPI } from "../api";
import { AdminFollowupPanel } from './FollowupTaskCards';

// ── Style tokens ───────────────────────────────────────────────────
const LABEL = {
    display: "block", fontSize: "11px", fontWeight: "700",
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const INPUT = {
    width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0",
    borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
    boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
    transition: "border-color .15s, box-shadow .15s",
};
const INPUT_FOCUS_STYLE = "border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.08);";
const SELECT = { ...INPUT, paddingRight: "32px", appearance: "none", cursor: "pointer" };
const CARD = {
    background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
    boxShadow: "0 2px 12px rgba(15,23,42,.07)", padding: "28px 32px",
};
const DIVIDER = { height: "1px", background: "#f1f5f9", margin: "20px 0" };

const API = import.meta.env.VITE_API_URL ?? "";
const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);

function getAuthHeaders(includeContentType = false) {
    const token = localStorage.getItem('authToken');
    const headers = { 'X-Store-Id': String(getStoreId()) };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// ── Constants ──────────────────────────────────────────────────────
const TASK_TYPES = [
    { value: "STANDARD", label: "Standard Task", icon: List, color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", desc: "Custom one-off task with optional checklist and due date" },
    { value: "DAILY_CHECKLIST", label: "Daily Checklist", icon: CheckCircle, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", desc: "Recurring daily checklist — resets every day for all or specific members" },
    { value: "PLAYER_ADDITION", label: "Player Addition", icon: Users, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", desc: "Set a player-addition goal with per-member sub-targets and live tracking" },
    { value: "REVENUE_TARGET", label: "Revenue Target", icon: TrendingUp, color: "#22c55e", bg: "#f0fdf4", border: "#86efac", desc: "Set a profit goal with member sub-allocations and % tracking" },
    { value: 'PLAYER_FOLLOWUP', label: 'Player Followup', icon: Users, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', desc: 'Auto-generated tasks for inactive and highly-critical players needing outreach' },
    { value: 'BONUS_FOLLOWUP', label: 'Bonus Followup', icon: Gift, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Auto-generated tasks for players eligible for streak, referral, or match bonuses' },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const PRIORITY_COLORS = {
    LOW: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
    MEDIUM: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    HIGH: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
};
const STATUS_COLORS = {
    PENDING: { bg: "#f1f5f9", text: "#475569" },
    IN_PROGRESS: { bg: "#eff6ff", text: "#1d4ed8" },
    COMPLETED: { bg: "#dcfce7", text: "#166534" },
    CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
};

function emptyForm() {
    return {
        title: "", description: "", priority: "MEDIUM", dueDate: "", notes: "",
        taskType: "STANDARD", targetValue: "", assignToAll: false,
        assignedToId: "", checklistItems: [], subTasks: [], isDaily: false,
    };
}

// ── Reusable small components ──────────────────────────────────────
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

// ── Admin Task Row ─────────────────────────────────────────────────
function AdminTaskRow({ task, onDelete, onStatusChange, teamMembers, onRefresh, selected, onSelect }) {
    const [expanded, setExpanded] = useState(false);
    const [logValue, setLogValue] = useState("");
    const [logMemberId, setLogMemberId] = useState("");
    const [logging, setLogging] = useState(false);
    const [hovered, setHovered] = useState(false);

    const meta = TASK_TYPES.find(t => t.value === task.taskType) || TASK_TYPES[0];
    const Icon = meta.icon;
    const isCompleted = task.status === "COMPLETED";

    const pct = task.targetValue > 0
        ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100))
        : null;
    const checklist = task.checklistItems || [];
    const doneItems = checklist.filter(i => i.done).length;
    const subTasks = task.subTasks || [];
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
    const priorityColor = PRIORITY_COLORS[task.priority]?.text || "#64748b";

    // ── Amount display for PLAYER_ADDITION / REVENUE_TARGET ──────
    const isTracked = ["PLAYER_ADDITION", "REVENUE_TARGET"].includes(task.taskType);
    const isRevenue = task.taskType === "REVENUE_TARGET";

    function formatAmount(val) {
        if (isRevenue) return `$${(val ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        return `${val ?? 0}`;
    }

    async function handleLogProgress() {
        if (!logValue || parseFloat(logValue) <= 0) return;
        setLogging(true);
        try {
            await fetch(`${API}/tasks/${task.id}/progress`, {
                method: "POST", headers: getAuthHeaders(true), credentials: "include",
                body: JSON.stringify({ value: parseFloat(logValue), memberId: logMemberId || undefined, action: "ADMIN_LOG" }),
            });
            setLogValue(""); onRefresh();
        } catch (_) { }
        setLogging(false);
    }

    return (
        <div
            style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Main row */}
            <div
                style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    background: selected
                        ? "rgba(124,58,237,0.04)"
                        : hovered ? "var(--color-background-secondary)" : "transparent",
                    transition: "background .1s",
                }}
            >
                {/* Checkbox */}
                <button
                    onClick={() => onSelect(task.id, !selected)}
                    style={{
                        width: 15, height: 15, flexShrink: 0, border: `1.5px solid ${selected ? "#7c3aed" : "var(--color-border-secondary)"}`,
                        borderRadius: 3, background: selected ? "#7c3aed" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, transition: "all .12s",
                    }}
                >
                    {selected && <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />}
                </button>

                {/* Completion toggle */}
                <button
                    onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex", color: isCompleted ? "#22c55e" : "var(--color-border-secondary)" }}
                >
                    {isCompleted ? <CheckCircle style={{ width: 15, height: 15 }} /> : <Circle style={{ width: 15, height: 15 }} />}
                </button>

                {/* Type icon */}
                <span style={{ width: 18, height: 18, borderRadius: 4, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 10, height: 10, color: meta.color }} />
                </span>

                {/* Title */}
                <span style={{
                    flex: 1, minWidth: 0, fontSize: 13, fontWeight: 400,
                    color: isCompleted ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                    textDecoration: isCompleted ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                    {task.title}
                </span>

                {/* Right metadata */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {isOverdue && <span style={{ fontSize: 10, fontWeight: 500, color: "#ef4444", background: "#fef2f2", padding: "1px 6px", borderRadius: 4 }}>overdue</span>}
                    {task.assignToAll && <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>all</span>}
                    {task.isDaily && <span style={{ fontSize: 10, color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>daily</span>}
                    {task.assignedTo && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{task.assignedTo.name}</span>}

                    {/* ── PLAYER_ADDITION / REVENUE_TARGET: show amount + pct ── */}
                    {isTracked && pct !== null && (
                        <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "1px 7px", borderRadius: 5,
                            background: pct >= 100 ? "#dcfce7" : meta.bg,
                            border: `1px solid ${pct >= 100 ? "#86efac" : meta.border}`,
                            fontSize: 11, fontWeight: 600,
                            color: pct >= 100 ? "#16a34a" : meta.color,
                        }}>
                            {formatAmount(task.currentValue)} / {formatAmount(task.targetValue)}
                            <span style={{ opacity: 0.65, fontWeight: 400 }}>·</span>
                            {pct}%
                        </span>
                    )}

                    {/* Standard pct for non-tracked tasks */}
                    {!isTracked && pct !== null && (
                        <span style={{ fontSize: 11, color: pct >= 100 ? "#22c55e" : "var(--color-text-tertiary)", fontWeight: pct >= 100 ? 500 : 400, minWidth: 32, textAlign: "right" }}>{pct}%</span>
                    )}

                    {checklist.length > 0 && pct === null && (
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{doneItems}/{checklist.length}</span>
                    )}
                    {task.dueDate && (
                        <span style={{ fontSize: 11, color: isOverdue ? "#ef4444" : "var(--color-text-tertiary)" }}>
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    )}
                    {/* Priority dot */}
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor, flexShrink: 0 }} />

                    {/* Actions — visible on hover */}
                    <div style={{ display: "flex", gap: 3, opacity: hovered ? 1 : 0, transition: "opacity .1s" }}>
                        <button
                            onClick={() => setExpanded(v => !v)}
                            style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 5, cursor: "pointer", padding: "2px 6px", color: "var(--color-text-tertiary)", display: "flex", alignItems: "center" }}
                        >
                            {expanded ? <ChevronUp style={{ width: 11, height: 11 }} /> : <ChevronDown style={{ width: 11, height: 11 }} />}
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 5, cursor: "pointer", padding: "2px 6px", color: "#ef4444", display: "flex", alignItems: "center" }}
                        >
                            <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{ padding: "10px 12px 12px 65px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", gap: 10 }}>
                    {task.description && (
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>{task.description}</p>
                    )}

                    {/* Progress */}
                    {pct !== null && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                <span>{isRevenue ? `$${(task.currentValue ?? 0).toFixed(0)} / $${task.targetValue}` : `${task.currentValue ?? 0} / ${task.targetValue}`}</span>
                                <span style={{ fontWeight: 500, color: pct >= 100 ? "#22c55e" : "var(--color-text-secondary)" }}>{pct}%</span>
                            </div>
                            <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#22c55e" : meta.color, borderRadius: 2, transition: "width .3s" }} />
                            </div>
                            {subTasks.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                                    {subTasks.map(st => {
                                        const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                                        return (
                                            <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                                                <span style={{ color: "var(--color-text-secondary)", minWidth: 100, fontWeight: 400 }}>{st.assignedTo?.name || "—"}</span>
                                                <div style={{ flex: 1, height: 3, background: "var(--color-border-tertiary)", borderRadius: 2, overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${sPct}%`, background: sPct >= 100 ? "#22c55e" : meta.color, borderRadius: 2 }} />
                                                </div>
                                                <span style={{ color: "var(--color-text-tertiary)", minWidth: 48, textAlign: "right" }}>
                                                    {isRevenue ? `$${(st.currentValue ?? 0).toFixed(0)}/$${st.targetValue}` : `${st.currentValue ?? 0}/${st.targetValue}`}
                                                </span>
                                                {st.status === "COMPLETED" && <CheckCircle style={{ width: 11, height: 11, color: "#22c55e", flexShrink: 0 }} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                <select value={logMemberId} onChange={e => setLogMemberId(e.target.value)} style={{ padding: "4px 8px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, fontSize: 11, background: "var(--color-background-primary)", color: "var(--color-text-secondary)", fontFamily: "inherit", outline: "none", maxWidth: 130 }}>
                                    <option value="">Any member</option>
                                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <input type="number" min="0.01" step="any" placeholder="Count" value={logValue} onChange={e => setLogValue(e.target.value)}
                                    style={{ width: 90, padding: "4px 8px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, fontSize: 11, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none" }} />
                                <button onClick={handleLogProgress} disabled={logging || !logValue}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: logValue ? meta.color : "var(--color-background-secondary)", color: logValue ? "#fff" : "var(--color-text-tertiary)", fontSize: 11, cursor: logValue ? "pointer" : "default", fontFamily: "inherit" }}>
                                    {logging ? "…" : "+ Log"}
                                </button>
                            </div>
                        </div>
                    )}

                    {checklist.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {checklist.map(item => (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                    {item.done ? <CheckCircle style={{ width: 12, height: 12, color: "#22c55e", flexShrink: 0 }} /> : <Circle style={{ width: 12, height: 12, color: "var(--color-border-secondary)", flexShrink: 0 }} />}
                                    <span style={{ color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-secondary)", textDecoration: item.done ? "line-through" : "none", flex: 1 }}>{item.label}</span>
                                    {item.doneBy && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{item.doneBy}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {task.progressLogs?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 6, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                            {task.progressLogs.slice(0, 5).map((log, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, alignItems: "center", color: "var(--color-text-tertiary)" }}>
                                    <span style={{ fontWeight: 500, color: "var(--color-text-secondary)" }}>{log.user?.name || "Admin"}</span>
                                    <span style={{ flex: 1 }}>{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                                    {log.value > 0 && <span style={{ color: "#22c55e", fontWeight: 500 }}>+{isRevenue ? `$${log.value}` : log.value}</span>}
                                    <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {task.notes && <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, fontStyle: "italic" }}>Note: {task.notes}</p>}
                </div>
            )}
        </div>
    );
}

// ── Form Section wrapper ───────────────────────────────────────────
function FormSection({ label, icon: SIcon, children, accent = "#7c3aed" }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {label && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {SIcon && <SIcon style={{ width: 12, height: 12, color: accent }} />}
                    <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</span>
                </div>
            )}
            {children}
        </div>
    );
}

// ── FocusInput — adds focus ring ───────────────────────────────────
function FocusInput({ as: Tag = "input", style: extraStyle = {}, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <Tag
            {...props}
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e => { setFocused(false); props.onBlur?.(e); }}
            style={{
                ...INPUT,
                ...(Tag === "select" ? { paddingRight: "32px", appearance: "none", cursor: "pointer" } : {}),
                ...(Tag === "textarea" ? { resize: "none", lineHeight: "1.6" } : {}),
                borderColor: focused ? "#7c3aed" : "#e2e8f0",
                boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.08)" : "none",
                ...extraStyle,
            }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AdminTaskPage() {
    const { add: toast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState(emptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [showFollowupPanel, setShowFollowupPanel] = useState(false);

    // ── Bulk selection state ──────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(new Set());
    const sseRef = useRef(null);

    // ── Bootstrap ─────────────────────────────────────────────────
    useEffect(() => {
        loadTasks();
        loadMembers();
        setupSSE();
        return () => sseRef.current?.close();
    }, []);

    function setupSSE() {
        const token = localStorage.getItem('authToken');
        const storeId = getStoreId();
        const url = `${API}/tasks/events?${token ? `token=${encodeURIComponent(token)}&` : ''}storeId=${storeId}`;
        const sse = new EventSource(url, { withCredentials: true });
        sseRef.current = sse;
        sse.onmessage = () => loadTasks();
    }

    async function loadTasks() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tasks`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load tasks");
            setTasks(data.data || []);
            setSelectedIds(new Set()); // clear selection on reload
        } catch (e) {
            toast(e.message, "error");
        } finally {
            setLoading(false);
        }
    }

    async function loadMembers() {
        try {
            const res = await fetch(`${API}/team-members`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (!res.ok) return;
            const members = data.data ?? data;
            setTeamMembers(Array.isArray(members) ? members : []);
        } catch (_) { }
    }

    // ── Submit new task ───────────────────────────────────────────
    async function handleSubmit() {
        setFormError("");
        if (!form.title.trim()) { setFormError("Title is required"); return; }
        if (["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && !form.targetValue) {
            setFormError("Target value is required for this task type"); return;
        }
        if (form.checklistItems.some(i => !i.label.trim())) { setFormError("All checklist items must have a label"); return; }
        if (form.subTasks.some(st => !st.assignedToId || !st.targetValue)) { setFormError("All member allocations must have a member and target value"); return; }

        setSubmitting(true);
        try {
            const body = {
                ...form,
                targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined,
                subTasks: form.subTasks.map(st => ({ ...st, targetValue: parseFloat(st.targetValue) })),
            };
            const res = await fetch(`${API}/tasks`, { method: "POST", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create task");
            toast(`Task "${data.data?.title || form.title}" created successfully!`, "success");
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
            const res = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE", credentials: "include", headers: getAuthHeaders() });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast("Task deleted.", "success");
            loadTasks();
        } catch (e) {
            toast(e.message || "Failed to delete task", "error");
        }
    }

    async function handleStatusChange(taskId, status) {
        try {
            const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) });
            const data = await res.json();
            if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
        } catch (_) { }
    }

    async function handleDailyReset() {
        if (!confirm("Reset all daily checklist tasks for today? Members will see fresh checklists.")) return;
        try {
            const res = await fetch(`${API}/tasks/daily-reset`, { method: "POST", credentials: "include", headers: getAuthHeaders() });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast("Daily checklists reset successfully.", "success");
            loadTasks();
        } catch (e) {
            toast(e.message || "Reset failed", "error");
        }
    }

    // ── Bulk action handlers ──────────────────────────────────────
    async function handleBulkMarkDone() {
        if (!selectedIds.size) return;
        const ids = [...selectedIds];
        try {
            await Promise.all(ids.map(id =>
                fetch(`${API}/tasks/${id}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status: "COMPLETED" }) })
            ));
            toast(`${ids.length} task${ids.length > 1 ? "s" : ""} marked as completed.`, "success");
            loadTasks();
        } catch (_) {
            toast("Some tasks couldn't be updated.", "error");
        }
    }

    async function handleBulkDelete() {
        if (!selectedIds.size) return;
        if (!confirm(`Delete ${selectedIds.size} selected task${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
        const ids = [...selectedIds];
        try {
            await Promise.all(ids.map(id =>
                fetch(`${API}/tasks/${id}`, { method: "DELETE", credentials: "include", headers: getAuthHeaders() })
            ));
            toast(`${ids.length} task${ids.length > 1 ? "s" : ""} deleted.`, "success");
            loadTasks();
        } catch (_) {
            toast("Some tasks couldn't be deleted.", "error");
        }
    }

    function handleSelectTask(id, checked) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    }

    // ── Filtering + grouping ──────────────────────────────────────
    const filtered = tasks.filter(t => {
        if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
        if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const grouped = filtered.reduce((acc, t) => {
        const key = t.taskType || 'STANDARD';
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {});

    const allFilteredIds = filtered.map(t => t.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
    const someSelected = allFilteredIds.some(id => selectedIds.has(id));

    function handleSelectAll(checked) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) allFilteredIds.forEach(id => next.add(id));
            else allFilteredIds.forEach(id => next.delete(id));
            return next;
        });
    }

    const totalCompleted = tasks.filter(t => t.status === "COMPLETED").length;
    const totalPending = tasks.filter(t => t.status === "PENDING").length;
    const totalInProg = tasks.filter(t => t.status === "IN_PROGRESS").length;

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
                        <button onClick={handleDailyReset} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer", color: "#475569" }}>
                            <RefreshCw style={{ width: "13px", height: "13px" }} /> Reset Daily
                        </button>
                        <button onClick={() => { setForm(emptyForm()); setFormError(""); setShowForm(true); }} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", background: "rgb(14,165,233)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
                            <Plus style={{ width: "15px", height: "15px" }} /> New Task
                        </button>
                        <button onClick={() => setShowFollowupPanel(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: showFollowupPanel ? '#fff7ed' : '#fff', border: `1px solid ${showFollowupPanel ? '#fed7aa' : '#e2e8f0'}`, borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: showFollowupPanel ? '#ea580c' : '#475569' }}>
                            <Users style={{ width: '13px', height: '13px' }} /> Followup Manager
                        </button>
                    </div>
                </div>
                <div style={DIVIDER} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
                    {TASK_TYPES.map(tt => {
                        const count = tasks.filter(t => t.taskType === tt.value).length;
                        const done = tasks.filter(t => t.taskType === tt.value && t.status === "COMPLETED").length;
                        const TIcon = tt.icon;
                        return (
                            <div key={tt.value} onClick={() => setTypeFilter(typeFilter === tt.value ? "ALL" : tt.value)}
                                style={{ padding: "14px 16px", border: `1.5px solid ${typeFilter === tt.value ? tt.color : tt.border}`, borderRadius: "10px", background: typeFilter === tt.value ? tt.bg : "#fafafa", cursor: "pointer", transition: "all .15s" }}>
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

            {/* ════ FOLLOWUP PANEL ════ */}
            {showFollowupPanel && (
                <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: '40px', height: '40px', background: '#fff7ed', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users style={{ width: '18px', height: '18px', color: '#ea580c' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Followup Task Manager</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Assign player and bonus followup tasks to specific team members</p>
                        </div>
                    </div>
                    <AdminFollowupPanel teamMembers={teamMembers} onTaskUpdated={loadTasks} />
                </div>
            )}

            {/* ════ FILTERS ════ */}
            <div style={CARD}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={INPUT} placeholder="Search tasks by title…" />
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid", borderColor: statusFilter === s ? "#0f172a" : "#e2e8f0", background: statusFilter === s ? "rgb(14,165,233)" : "#fff", color: statusFilter === s ? "#fff" : "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
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
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", background: "var(--color-background-primary)" }}>

                    {/* ── Bulk action bar ── */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        background: someSelected ? "rgba(124,58,237,0.04)" : "var(--color-background-secondary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        transition: "background .15s",
                    }}>
                        {/* Select all checkbox */}
                        <button
                            onClick={() => handleSelectAll(!allSelected)}
                            style={{
                                width: 15, height: 15, flexShrink: 0,
                                border: `1.5px solid ${allSelected ? "#7c3aed" : someSelected ? "#7c3aed" : "var(--color-border-secondary)"}`,
                                borderRadius: 3,
                                background: allSelected ? "#7c3aed" : someSelected ? "rgba(124,58,237,0.15)" : "transparent",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                padding: 0, transition: "all .12s",
                            }}
                        >
                            {allSelected
                                ? <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />
                                : someSelected
                                    ? <span style={{ width: 7, height: 1.5, background: "#7c3aed", borderRadius: 1, display: "block" }} />
                                    : null
                            }
                        </button>

                        {someSelected ? (
                            <>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed" }}>
                                    {selectedIds.size} selected
                                </span>
                                <div style={{ flex: 1 }} />
                                <button
                                    onClick={handleBulkMarkDone}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", border: "1px solid #86efac", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                    <CheckCircle style={{ width: 11, height: 11 }} /> Mark Done
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", border: "1px solid #fca5a5", borderRadius: 6, background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                    <Trash2 style={{ width: 11, height: 11 }} /> Delete Selected
                                </button>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, background: "transparent", color: "var(--color-text-tertiary)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                    <X style={{ width: 10, height: 10 }} /> Clear
                                </button>
                            </>
                        ) : (
                            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                {filtered.length} task{filtered.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {Object.entries(grouped).map(([type, typeTasks], sectionIdx) => {
                        if (!typeTasks.length) return null;
                        const meta = TASK_TYPES.find(t => t.value === type) || { value: type, label: type.replace(/_/g, ' '), icon: List, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
                        const TIcon = meta.icon;
                        const sectionIds = typeTasks.map(t => t.id);
                        const sectionAllSelected = sectionIds.every(id => selectedIds.has(id));
                        const sectionSomeSelected = sectionIds.some(id => selectedIds.has(id));

                        function handleSectionSelect() {
                            setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (sectionAllSelected) sectionIds.forEach(id => next.delete(id));
                                else sectionIds.forEach(id => next.add(id));
                                return next;
                            });
                        }

                        return (
                            <div key={type}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: "var(--color-background-secondary)", borderTop: sectionIdx > 0 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                                    {/* Section checkbox */}
                                    <button
                                        onClick={handleSectionSelect}
                                        style={{
                                            width: 13, height: 13, flexShrink: 0,
                                            border: `1.5px solid ${sectionAllSelected ? meta.color : sectionSomeSelected ? meta.color : "var(--color-border-secondary)"}`,
                                            borderRadius: 3,
                                            background: sectionAllSelected ? meta.color : sectionSomeSelected ? `${meta.color}22` : "transparent",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                        }}
                                    >
                                        {sectionAllSelected && <Check style={{ width: 8, height: 8, color: "#fff", strokeWidth: 3 }} />}
                                        {!sectionAllSelected && sectionSomeSelected && <span style={{ width: 6, height: 1.5, background: meta.color, borderRadius: 1, display: "block" }} />}
                                    </button>
                                    <TIcon style={{ width: 11, height: 11, color: meta.color }} />
                                    <span style={{ fontSize: 11, fontWeight: 500, color: meta.color }}>{meta.label}</span>
                                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 2 }}>({typeTasks.length})</span>
                                </div>
                                {typeTasks.map(task => (
                                    <AdminTaskRow
                                        key={task.id} task={task}
                                        onDelete={handleDelete} onStatusChange={handleStatusChange}
                                        teamMembers={teamMembers} onRefresh={loadTasks}
                                        selected={selectedIds.has(task.id)}
                                        onSelect={handleSelectTask}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ════ CREATE TASK MODAL ════ */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 72px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)" }}>

                        {/* ── Modal Header ── */}
                        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: selectedTypeMeta.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${selectedTypeMeta.border}` }}>
                                        <TypeIcon style={{ width: 17, height: 17, color: selectedTypeMeta.color }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Create New Task</div>
                                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: 1 }}>{selectedTypeMeta.label} · {selectedTypeMeta.desc.split("—")[0].trim()}</div>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#94a3b8", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <X style={{ width: "16px", height: "16px" }} />
                                </button>
                            </div>

                            {/* Task Type Pills */}
                            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                                {TASK_TYPES.map(tt => {
                                    const TIcon2 = tt.icon;
                                    const sel = form.taskType === tt.value;
                                    return (
                                        <button
                                            key={tt.value}
                                            onClick={() => set("taskType", tt.value)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 5,
                                                padding: "6px 11px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap",
                                                border: `1.5px solid ${sel ? tt.color : "#e2e8f0"}`,
                                                background: sel ? tt.bg : "#fafafa",
                                                fontFamily: "inherit", transition: "all .15s", flexShrink: 0,
                                            }}
                                        >
                                            <TIcon2 style={{ width: 11, height: 11, color: sel ? tt.color : "#94a3b8" }} />
                                            <span style={{ fontSize: "12px", fontWeight: sel ? "700" : "500", color: sel ? tt.color : "#64748b" }}>{tt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Scrollable body ── */}
                        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }} className="modal-scroll">

                            {/* Title + Description */}
                            <FormSection label="Basic Info" icon={Tag}>
                                <div>
                                    <label style={LABEL}>Title <span style={{ color: "#ef4444" }}>*</span></label>
                                    <FocusInput
                                        value={form.title}
                                        onChange={e => set("title", e.target.value)}
                                        placeholder="e.g. Add 5 new players, $1000 revenue target…"
                                    />
                                </div>
                                <div>
                                    <label style={LABEL}>Description</label>
                                    <FocusInput
                                        as="textarea"
                                        rows={2}
                                        value={form.description}
                                        onChange={e => set("description", e.target.value)}
                                        placeholder="What needs to be done…"
                                    />
                                </div>
                            </FormSection>

                            {/* Priority + Due Date */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                    <label style={LABEL}>Priority</label>
                                    <div style={{ position: "relative" }}>
                                        <FocusInput as="select" value={form.priority} onChange={e => set("priority", e.target.value)}>
                                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </FocusInput>
                                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={LABEL}>Due Date</label>
                                    <FocusInput as="input" type="datetime-local" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
                                </div>
                            </div>

                            {/* Target value */}
                            {["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && (
                                <FormSection label="Target" icon={TrendingUp} accent={selectedTypeMeta.color}>
                                    <div>
                                        <label style={LABEL}>
                                            {form.taskType === "PLAYER_ADDITION" ? "Total Players to Add" : "Total Revenue Target ($)"}
                                            <span style={{ color: "#ef4444" }}> *</span>
                                        </label>
                                        <FocusInput
                                            as="input"
                                            type="number" min="1" step="any"
                                            value={form.targetValue}
                                            onChange={e => set("targetValue", e.target.value)}
                                            placeholder={form.taskType === "PLAYER_ADDITION" ? "e.g. 5" : "e.g. 1000.00"}
                                        />
                                        {form.targetValue > 0 && (
                                            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "5px", margin: "5px 0 0" }}>
                                                {form.taskType === "REVENUE_TARGET"
                                                    ? `Goal: $${parseFloat(form.targetValue).toFixed(2)} total revenue`
                                                    : `Goal: ${form.targetValue} players added`}
                                            </p>
                                        )}
                                    </div>
                                </FormSection>
                            )}

                            {/* Assign To */}
                            <FormSection label="Assignment" icon={Users}>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${form.assignToAll ? "#7c3aed" : "#e2e8f0"}`, borderRadius: "9px", background: form.assignToAll ? "#f5f3ff" : "#fafafa", transition: "all .15s" }}>
                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${form.assignToAll ? "#7c3aed" : "#cbd5e1"}`, background: form.assignToAll ? "#7c3aed" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <input type="checkbox" checked={form.assignToAll} onChange={e => set("assignToAll", e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                                        {form.assignToAll && <Check style={{ width: 10, height: 10, color: "#fff", strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: "700", color: form.assignToAll ? "#7c3aed" : "#0f172a" }}>Assign to ALL members</div>
                                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Every team member will see and work on this task</div>
                                    </div>
                                </label>
                                {!form.assignToAll && (
                                    <div style={{ position: "relative" }}>
                                        <FocusInput as="select" value={form.assignedToId} onChange={e => set("assignedToId", e.target.value)}>
                                            <option value="">— Leave unassigned or pick a member —</option>
                                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                                        </FocusInput>
                                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                    </div>
                                )}
                            </FormSection>

                            {/* Daily reset toggle */}
                            {form.taskType === "DAILY_CHECKLIST" && (
                                <label onClick={() => set("isDaily", !form.isDaily)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${form.isDaily ? "#0ea5e9" : "#e2e8f0"}`, borderRadius: "9px", background: form.isDaily ? "#f0f9ff" : "#fafafa", transition: "all .15s" }}>
                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${form.isDaily ? "#0ea5e9" : "#cbd5e1"}`, background: form.isDaily ? "#0ea5e9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {form.isDaily && <Check style={{ width: 10, height: 10, color: "#fff", strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: "700", color: form.isDaily ? "#0ea5e9" : "#0f172a" }}>Auto-reset daily</div>
                                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Checklist resets every morning — same tasks, fresh tracking</div>
                                    </div>
                                </label>
                            )}

                            {/* Checklist builder */}
                            {["DAILY_CHECKLIST", "STANDARD"].includes(form.taskType) && (
                                <FormSection label="Checklist Items" icon={CheckCircle} accent="#0ea5e9">
                                    {form.checklistItems.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                            {form.checklistItems.map((item, i) => (
                                                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: 8 }}>
                                                    <Circle style={{ width: "13px", height: "13px", color: "#cbd5e1", flexShrink: 0 }} />
                                                    <input
                                                        value={item.label}
                                                        onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it))}
                                                        style={{ flex: 1, border: "none", background: "transparent", fontSize: "13px", color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                                                        placeholder={`Checklist item ${i + 1}`}
                                                    />
                                                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: "600", color: "#64748b", cursor: "pointer", flexShrink: 0 }}>
                                                        <input type="checkbox" checked={item.required} onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, required: e.target.checked } : it))} />
                                                        Req
                                                    </label>
                                                    <button onClick={() => set("checklistItems", form.checklistItems.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px", display: "flex" }}>
                                                        <X style={{ width: "12px", height: "12px" }} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => set("checklistItems", [...form.checklistItems, { id: `item_${Date.now()}`, label: "", required: true, done: false }])}
                                        style={{ fontSize: "12px", color: "#0ea5e9", background: "#f0f9ff", border: "1px dashed #bae6fd", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", width: "100%", textAlign: "left" }}
                                    >
                                        + Add checklist item
                                    </button>
                                </FormSection>
                            )}

                            {/* Member allocations */}
                            {["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && (
                                <FormSection label="Member Allocations" icon={Users} accent={selectedTypeMeta.color}>
                                    {form.subTasks.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                            {form.subTasks.map((st, i) => {
                                                const pctOf = form.targetValue > 0 ? Math.round((parseFloat(st.targetValue || 0) / form.targetValue) * 100) : 0;
                                                return (
                                                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <div style={{ position: "relative", flex: 2 }}>
                                                            <FocusInput as="select" value={st.assignedToId} onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, assignedToId: e.target.value } : s))} style={{ fontSize: "12px", padding: "8px 28px 8px 10px" }}>
                                                                <option value="">Select member</option>
                                                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                            </FocusInput>
                                                            <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "#94a3b8", pointerEvents: "none" }} />
                                                        </div>
                                                        <FocusInput as="input" type="number" min="0.01" step="any" value={st.targetValue} onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, targetValue: e.target.value } : s))} placeholder={form.taskType === "REVENUE_TARGET" ? "$200" : "1"} style={{ width: "110px", fontSize: "12px", padding: "8px 10px" }} />
                                                        {pctOf > 0 && <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", minWidth: 30 }}>{pctOf}%</span>}
                                                        <button onClick={() => set("subTasks", form.subTasks.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", display: "flex" }}>
                                                            <X style={{ width: "13px", height: "13px" }} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => set("subTasks", [...form.subTasks, { assignedToId: "", targetValue: "", label: "" }])}
                                        style={{ fontSize: "12px", color: selectedTypeMeta.color, background: selectedTypeMeta.bg, border: `1px dashed ${selectedTypeMeta.border}`, padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", width: "100%", textAlign: "left" }}
                                    >
                                        + Add member allocation
                                    </button>
                                    {form.subTasks.length > 0 && form.targetValue && (() => {
                                        const tot = form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0);
                                        const over = tot > parseFloat(form.targetValue);
                                        const exact = tot === parseFloat(form.targetValue);
                                        return (
                                            <div style={{ padding: "9px 12px", background: over ? "#fef2f2" : exact ? "#f0fdf4" : "#f8fafc", borderRadius: "8px", border: `1px solid ${over ? "#fca5a5" : exact ? "#86efac" : "#e2e8f0"}` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                                    <span style={{ color: "#64748b" }}>Total allocated</span>
                                                    <span style={{ fontWeight: "700", color: over ? "#ef4444" : exact ? "#22c55e" : "#0f172a" }}>
                                                        {form.taskType === "REVENUE_TARGET" ? `$${tot.toFixed(2)} / $${form.targetValue}` : `${tot} / ${form.targetValue}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </FormSection>
                            )}

                            {/* Admin Notes */}
                            <div>
                                <label style={LABEL}>Admin Notes <span style={{ fontWeight: 400, color: "#cbd5e1", textTransform: "none", letterSpacing: 0 }}>(internal only)</span></label>
                                <FocusInput as="textarea" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes — not shown to members…" />
                            </div>

                            {formError && <Alert type="error">{formError}</Alert>}
                        </div>

                        {/* ── Modal Footer ── */}
                        <div style={{ padding: "14px 24px 18px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "10px", flexShrink: 0, background: "#fff", borderRadius: "0 0 20px 20px" }}>
                            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "9px", fontWeight: "600", cursor: "pointer", fontSize: "14px", color: "#475569", fontFamily: "inherit" }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{ flex: 2, padding: "11px", border: "none", borderRadius: "9px", fontWeight: "700", fontSize: "14px", cursor: submitting ? "not-allowed" : "pointer", background: submitting ? "#e2e8f0" : selectedTypeMeta.color, color: submitting ? "#94a3b8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", fontFamily: "inherit", transition: "opacity .15s" }}
                            >
                                {submitting ? "Creating…" : (
                                    form.assignToAll
                                        ? <><Users style={{ width: "15px", height: "15px" }} /> Assign to All Members</>
                                        : <><Plus style={{ width: "15px", height: "15px" }} /> Create Task</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .modal-scroll { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
                .modal-scroll::-webkit-scrollbar { width: 5px; }
                .modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .modal-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .modal-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            `}</style>
        </div>
    );
}
