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

// ── Design tokens ─────────────────────────────────────────────────
const T = {
    radius: { sm: "6px", md: "10px", lg: "14px", xl: "20px", pill: "999px" },
    shadow: {
        xs: "0 1px 3px rgba(15,23,42,.06)",
        sm: "0 2px 8px rgba(15,23,42,.08)",
        md: "0 4px 20px rgba(15,23,42,.10)",
        lg: "0 8px 40px rgba(15,23,42,.14)",
    },
    font: {
        xs: "11px", sm: "12px", base: "13px", md: "14px", lg: "16px", xl: "20px",
    },
};

const LABEL = {
    display: "block", fontSize: T.font.xs, fontWeight: "700",
    color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "7px",
};

const INPUT_BASE = {
    width: "100%", padding: "10px 13px",
    border: "1.5px solid #e8edf5",
    borderRadius: T.radius.md, fontSize: T.font.base,
    fontFamily: "inherit", boxSizing: "border-box",
    background: "#fafbfd", color: "#0f172a", outline: "none",
    transition: "all .18s ease",
};

const CARD = {
    background: "#ffffff",
    borderRadius: T.radius.xl,
    border: "1px solid #eef0f6",
    boxShadow: T.shadow.sm,
    padding: "24px 28px",
};

const API = import.meta.env.VITE_API_URL ?? "";
const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);

function getAuthHeaders(includeContentType = false) {
    const token = localStorage.getItem('authToken');
    const headers = { 'X-Store-Id': String(getStoreId()) };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// ── Constants ─────────────────────────────────────────────────────
const TASK_TYPES = [
    { value: "STANDARD", label: "Standard", icon: List, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", accent: "#64748b", desc: "Custom one-off task with optional checklist and due date" },
    { value: "DAILY_CHECKLIST", label: "Daily", icon: CheckCircle, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", accent: "#0284c7", desc: "Recurring daily checklist" },
    { value: "PLAYER_ADDITION", label: "Players", icon: Users, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", accent: "#7c3aed", desc: "Player-addition goal with live tracking" },
    { value: "REVENUE_TARGET", label: "Revenue", icon: TrendingUp, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", accent: "#059669", desc: "Profit goal with member allocations" },
    { value: 'PLAYER_FOLLOWUP', label: 'Follow-up', icon: Users, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', desc: 'Inactive player outreach tasks' },
    { value: 'BONUS_FOLLOWUP', label: 'Bonuses', icon: Gift, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', accent: '#0891b2', desc: 'Bonus eligibility followup tasks' },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const PRIORITY_CONFIG = {
    LOW: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
    MEDIUM: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
    HIGH: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

function emptyForm() {
    return {
        title: "", description: "", priority: "MEDIUM", dueDate: "", notes: "",
        taskType: "STANDARD", targetValue: "", assignToAll: false,
        assignedToId: "", checklistItems: [], subTasks: [], isDaily: false,
    };
}

// ── Alert ────────────────────────────────────────────────────────
function Alert({ type, children }) {
    const cfg = type === "error"
        ? { bg: "#fef2f2", border: "#fecdd3", text: "#dc2626", Icon: AlertCircle }
        : { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", Icon: CheckCircle };
    return (
        <div style={{ padding: "10px 14px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: T.radius.md, color: cfg.text, fontSize: T.font.sm, display: "flex", gap: "8px", alignItems: "center" }}>
            <cfg.Icon style={{ width: "13px", height: "13px", flexShrink: 0 }} /> {children}
        </div>
    );
}

// ── FocusInput ───────────────────────────────────────────────────
function FocusInput({ as: Tag = "input", style: extraStyle = {}, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <Tag
            {...props}
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e => { setFocused(false); props.onBlur?.(e); }}
            style={{
                ...INPUT_BASE,
                ...(Tag === "select" ? { paddingRight: "32px", appearance: "none", cursor: "pointer" } : {}),
                ...(Tag === "textarea" ? { resize: "none", lineHeight: "1.65" } : {}),
                borderColor: focused ? "#7c3aed" : "#e8edf5",
                background: focused ? "#fff" : "#fafbfd",
                boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.10)" : "none",
                ...extraStyle,
            }}
        />
    );
}

// ── FormSection ──────────────────────────────────────────────────
function FormSection({ label, icon: SIcon, children, accent = "#7c3aed" }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {label && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {SIcon && <SIcon style={{ width: 11, height: 11, color: accent }} />}
                    <span style={{ fontSize: T.font.xs, fontWeight: "700", color: accent, textTransform: "uppercase", letterSpacing: "0.7px" }}>{label}</span>
                </div>
            )}
            {children}
        </div>
    );
}

// ── Stat Chip ────────────────────────────────────────────────────
function StatChip({ label, value, color }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: T.radius.pill, background: `${color}15`, fontSize: T.font.xs, fontWeight: "600", color }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
            {value} {label}
        </span>
    );
}

// ── Admin Task Row ───────────────────────────────────────────────
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
    const priorityDot = PRIORITY_CONFIG[task.priority]?.dot || "#94a3b8";
    const isTracked = ["PLAYER_ADDITION", "REVENUE_TARGET"].includes(task.taskType);
    const isRevenue = task.taskType === "REVENUE_TARGET";

    function formatAmount(val) {
        return isRevenue ? `$${(val ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}` : `${val ?? 0}`;
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
            style={{ borderBottom: "1px solid #f1f4fa" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Main row */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
                background: selected ? "rgba(124,58,237,0.035)" : hovered ? "#fafbfe" : "transparent",
                transition: "background .15s ease",
            }}>
                {/* Checkbox */}
                <button
                    onClick={() => onSelect(task.id, !selected)}
                    style={{
                        width: 16, height: 16, flexShrink: 0,
                        border: `1.5px solid ${selected ? "#7c3aed" : "#dde1eb"}`,
                        borderRadius: 4, background: selected ? "#7c3aed" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0, transition: "all .15s",
                    }}
                >
                    {selected && <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />}
                </button>

                {/* Done toggle */}
                <button
                    onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex", color: isCompleted ? "#22c55e" : "#c7cdd9", transition: "color .15s" }}
                >
                    {isCompleted
                        ? <CheckCircle style={{ width: 16, height: 16 }} />
                        : <Circle style={{ width: 16, height: 16 }} />
                    }
                </button>

                {/* Type badge */}
                <span style={{
                    width: 22, height: 22, borderRadius: T.radius.sm,
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                    <Icon style={{ width: 11, height: 11, color: meta.color }} />
                </span>

                {/* Title */}
                <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: T.font.base, fontWeight: isCompleted ? 400 : 500,
                    color: isCompleted ? "#b0bac8" : "#1e293b",
                    textDecoration: isCompleted ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    letterSpacing: "-0.01em",
                }}>
                    {task.title}
                </span>

                {/* Right meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                    {isOverdue && (
                        <span style={{ fontSize: T.font.xs, fontWeight: 600, color: "#dc2626", background: "#fef2f2", padding: "2px 7px", borderRadius: T.radius.pill }}>
                            overdue
                        </span>
                    )}
                    {task.assignToAll && (
                        <span style={{ fontSize: T.font.xs, color: "#7c3aed", background: "#f5f3ff", padding: "2px 7px", borderRadius: T.radius.pill, fontWeight: 600 }}>all</span>
                    )}
                    {task.isDaily && (
                        <span style={{ fontSize: T.font.xs, color: "#0284c7", background: "#f0f9ff", padding: "2px 7px", borderRadius: T.radius.pill, fontWeight: 600 }}>daily</span>
                    )}
                    {task.assignedTo && (
                        <span style={{ fontSize: T.font.xs, color: "#94a3b8", fontWeight: 500 }}>{task.assignedTo.name}</span>
                    )}

                    {isTracked && pct !== null && (
                        <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: T.radius.pill,
                            background: pct >= 100 ? "#dcfce7" : meta.bg,
                            border: `1px solid ${pct >= 100 ? "#86efac" : meta.border}`,
                            fontSize: T.font.xs, fontWeight: 600,
                            color: pct >= 100 ? "#15803d" : meta.color,
                        }}>
                            {formatAmount(task.currentValue)} / {formatAmount(task.targetValue)}
                            <span style={{ opacity: 0.5 }}>·</span>{pct}%
                        </span>
                    )}
                    {!isTracked && pct !== null && (
                        <span style={{ fontSize: T.font.xs, color: pct >= 100 ? "#22c55e" : "#94a3b8", fontWeight: 500, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                    )}
                    {checklist.length > 0 && pct === null && (
                        <span style={{ fontSize: T.font.xs, color: "#94a3b8", fontWeight: 500 }}>{doneItems}/{checklist.length}</span>
                    )}
                    {task.dueDate && (
                        <span style={{ fontSize: T.font.xs, color: isOverdue ? "#dc2626" : "#94a3b8", fontWeight: 500 }}>
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    )}
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: priorityDot, flexShrink: 0 }} />

                    {/* Hover actions */}
                    <div style={{ display: "flex", gap: 3, opacity: hovered ? 1 : 0, transition: "opacity .15s", pointerEvents: hovered ? "auto" : "none" }}>
                        <button
                            onClick={() => setExpanded(v => !v)}
                            style={{ background: "transparent", border: "1px solid #e8edf5", borderRadius: T.radius.sm, cursor: "pointer", padding: "3px 7px", color: "#94a3b8", display: "flex", alignItems: "center", transition: "all .15s" }}
                        >
                            {expanded ? <ChevronUp style={{ width: 11, height: 11 }} /> : <ChevronDown style={{ width: 11, height: 11 }} />}
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            style={{ background: "transparent", border: "1px solid #fecdd3", borderRadius: T.radius.sm, cursor: "pointer", padding: "3px 7px", color: "#ef4444", display: "flex", alignItems: "center", transition: "all .15s" }}
                        >
                            <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded detail panel */}
            {expanded && (
                <div style={{ padding: "12px 16px 16px 64px", borderTop: "1px solid #f1f4fa", background: "#fafbfd", display: "flex", flexDirection: "column", gap: 12 }}>
                    {task.description && (
                        <p style={{ fontSize: T.font.sm, color: "#64748b", margin: 0, lineHeight: 1.65 }}>{task.description}</p>
                    )}

                    {pct !== null && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: T.font.xs, color: "#94a3b8" }}>
                                <span>{isRevenue ? `$${(task.currentValue ?? 0).toFixed(0)} / $${task.targetValue}` : `${task.currentValue ?? 0} / ${task.targetValue}`}</span>
                                <span style={{ fontWeight: 600, color: pct >= 100 ? "#22c55e" : "#64748b" }}>{pct}%</span>
                            </div>
                            <div style={{ height: 4, background: "#e8edf5", borderRadius: T.radius.pill, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#22c55e" : meta.color, borderRadius: T.radius.pill, transition: "width .4s ease" }} />
                            </div>

                            {subTasks.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
                                    {subTasks.map(st => {
                                        const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                                        return (
                                            <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: T.font.xs }}>
                                                <span style={{ color: "#64748b", minWidth: 100 }}>{st.assignedTo?.name || "—"}</span>
                                                <div style={{ flex: 1, height: 3, background: "#e8edf5", borderRadius: T.radius.pill, overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${sPct}%`, background: sPct >= 100 ? "#22c55e" : meta.color, borderRadius: T.radius.pill }} />
                                                </div>
                                                <span style={{ color: "#94a3b8", minWidth: 50, textAlign: "right" }}>
                                                    {isRevenue ? `$${(st.currentValue ?? 0).toFixed(0)}/$${st.targetValue}` : `${st.currentValue ?? 0}/${st.targetValue}`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Log input */}
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                <select value={logMemberId} onChange={e => setLogMemberId(e.target.value)} style={{ padding: "5px 9px", border: "1px solid #e8edf5", borderRadius: T.radius.sm, fontSize: T.font.xs, background: "#fff", color: "#475569", fontFamily: "inherit", outline: "none", maxWidth: 130 }}>
                                    <option value="">Any member</option>
                                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <input type="number" min="0.01" step="any" placeholder="Value" value={logValue} onChange={e => setLogValue(e.target.value)}
                                    style={{ width: 86, padding: "5px 9px", border: "1px solid #e8edf5", borderRadius: T.radius.sm, fontSize: T.font.xs, background: "#fff", color: "#0f172a", fontFamily: "inherit", outline: "none" }} />
                                <button onClick={handleLogProgress} disabled={logging || !logValue}
                                    style={{ padding: "5px 12px", borderRadius: T.radius.sm, border: "none", background: logValue ? meta.color : "#e8edf5", color: logValue ? "#fff" : "#94a3b8", fontSize: T.font.xs, fontWeight: 600, cursor: logValue ? "pointer" : "default", fontFamily: "inherit", transition: "all .15s" }}>
                                    {logging ? "…" : "+ Log"}
                                </button>
                            </div>
                        </div>
                    )}

                    {checklist.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {checklist.map(item => (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: T.font.sm }}>
                                    {item.done
                                        ? <CheckCircle style={{ width: 12, height: 12, color: "#22c55e", flexShrink: 0 }} />
                                        : <Circle style={{ width: 12, height: 12, color: "#c7cdd9", flexShrink: 0 }} />}
                                    <span style={{ color: item.done ? "#b0bac8" : "#475569", textDecoration: item.done ? "line-through" : "none", flex: 1 }}>{item.label}</span>
                                    {item.doneBy && <span style={{ fontSize: T.font.xs, color: "#b0bac8" }}>{item.doneBy}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {task.progressLogs?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: "1px solid #e8edf5" }}>
                            {task.progressLogs.slice(0, 5).map((log, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, fontSize: T.font.xs, alignItems: "center", color: "#94a3b8" }}>
                                    <span style={{ fontWeight: 600, color: "#475569" }}>{log.user?.name || "Admin"}</span>
                                    <span style={{ flex: 1 }}>{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                                    {log.value > 0 && <span style={{ color: "#22c55e", fontWeight: 600 }}>+{isRevenue ? `$${log.value}` : log.value}</span>}
                                    <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {task.notes && <p style={{ fontSize: T.font.xs, color: "#b0bac8", margin: 0, fontStyle: "italic" }}>Note: {task.notes}</p>}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
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
    const [selectedIds, setSelectedIds] = useState(new Set());
    const sseRef = useRef(null);

    useEffect(() => {
        loadTasks(); loadMembers(); setupSSE();
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
            setSelectedIds(new Set());
        } catch (e) { toast(e.message, "error"); }
        finally { setLoading(false); }
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
            toast(`Task "${data.data?.title || form.title}" created!`, "success");
            setForm(emptyForm()); setShowForm(false);
        } catch (err) { setFormError(err.message); }
        finally { setSubmitting(false); }
    }

    async function handleDelete(taskId) {
        if (!confirm("Delete this task? This cannot be undone.")) return;
        try {
            const res = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE", credentials: "include", headers: getAuthHeaders() });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast("Task deleted.", "success"); loadTasks();
        } catch (e) { toast(e.message || "Failed to delete task", "error"); }
    }

    async function handleStatusChange(taskId, status) {
        try {
            const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) });
            const data = await res.json();
            if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
        } catch (_) { }
    }

    async function handleDailyReset() {
        if (!confirm("Reset all daily checklist tasks for today?")) return;
        try {
            const res = await fetch(`${API}/tasks/daily-reset`, { method: "POST", credentials: "include", headers: getAuthHeaders() });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast("Daily checklists reset.", "success"); loadTasks();
        } catch (e) { toast(e.message || "Reset failed", "error"); }
    }

    async function handleBulkMarkDone() {
        if (!selectedIds.size) return;
        const ids = [...selectedIds];
        try {
            await Promise.all(ids.map(id => fetch(`${API}/tasks/${id}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status: "COMPLETED" }) })));
            toast(`${ids.length} task(s) marked as completed.`, "success"); loadTasks();
        } catch (_) { toast("Some tasks couldn't be updated.", "error"); }
    }

    async function handleBulkDelete() {
        if (!selectedIds.size) return;
        if (!confirm(`Delete ${selectedIds.size} selected task(s)?`)) return;
        const ids = [...selectedIds];
        try {
            await Promise.all(ids.map(id => fetch(`${API}/tasks/${id}`, { method: "DELETE", credentials: "include", headers: getAuthHeaders() })));
            toast(`${ids.length} task(s) deleted.`, "success"); loadTasks();
        } catch (_) { toast("Some tasks couldn't be deleted.", "error"); }
    }

    function handleSelectTask(id, checked) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    }

    // Filtering + grouping
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
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "inherit" }}>

            {/* ═══ HEADER ══════════════════════════════════════════════ */}
            <div style={{ ...CARD, padding: "20px 24px" }}>
                {/* Title + Actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <div style={{
                            width: 42, height: 42, background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                            borderRadius: T.radius.lg, display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(124,58,237,.25)",
                        }}>
                            <BarChart2 style={{ width: 19, height: 19, color: "#fff" }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" }}>Task Management</h2>
                            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                <StatChip label="done" value={totalCompleted} color="#15803d" />
                                <StatChip label="in progress" value={totalInProg} color="#b45309" />
                                <StatChip label="pending" value={totalPending} color="#64748b" />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={handleDailyReset} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", background: "#fff",
                            border: "1.5px solid #e8edf5", borderRadius: T.radius.md,
                            fontWeight: 600, fontSize: T.font.sm, cursor: "pointer", color: "#475569",
                            transition: "all .15s",
                        }}>
                            <RefreshCw style={{ width: 12, height: 12 }} /> Reset Daily
                        </button>
                        <button onClick={() => { setForm(emptyForm()); setFormError(""); setShowForm(true); }} style={{
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "9px 18px",
                            background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                            color: "#fff", border: "none", borderRadius: T.radius.md,
                            fontWeight: 700, fontSize: T.font.sm, cursor: "pointer",
                            boxShadow: "0 3px 10px rgba(14,165,233,.30)",
                            transition: "all .15s",
                        }}>
                            <Plus style={{ width: 14, height: 14 }} /> New Task
                        </button>
                        <button onClick={() => setShowFollowupPanel(v => !v)} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px",
                            background: showFollowupPanel ? "#fff7ed" : "#fff",
                            border: `1.5px solid ${showFollowupPanel ? "#fed7aa" : "#e8edf5"}`,
                            borderRadius: T.radius.md, fontWeight: 600, fontSize: T.font.sm,
                            cursor: "pointer", color: showFollowupPanel ? "#ea580c" : "#475569",
                            transition: "all .15s",
                        }}>
                            <Users style={{ width: 12, height: 12 }} /> Follow-up Manager
                        </button>
                    </div>
                </div>

                {/* Type summary grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                    {TASK_TYPES.map(tt => {
                        const count = tasks.filter(t => t.taskType === tt.value).length;
                        const done = tasks.filter(t => t.taskType === tt.value && t.status === "COMPLETED").length;
                        const TIcon = tt.icon;
                        const isActive = typeFilter === tt.value;
                        return (
                            <div
                                key={tt.value}
                                onClick={() => setTypeFilter(typeFilter === tt.value ? "ALL" : tt.value)}
                                style={{
                                    padding: "12px 14px", borderRadius: T.radius.lg,
                                    border: `1.5px solid ${isActive ? tt.color : "#eef0f6"}`,
                                    background: isActive ? tt.bg : "#fafbfd",
                                    cursor: "pointer", transition: "all .18s ease",
                                    boxShadow: isActive ? T.shadow.xs : "none",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <span style={{ fontSize: "22px", fontWeight: "800", color: isActive ? tt.color : "#1e293b", letterSpacing: "-0.02em" }}>{count}</span>
                                    <div style={{ width: 26, height: 26, borderRadius: T.radius.sm, background: isActive ? tt.bg : "#f1f4fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <TIcon style={{ width: 13, height: 13, color: isActive ? tt.color : "#94a3b8" }} />
                                    </div>
                                </div>
                                <div style={{ fontSize: T.font.sm, fontWeight: "600", color: isActive ? tt.color : "#334155", marginTop: 6, letterSpacing: "-0.01em" }}>{tt.label}</div>
                                <div style={{ fontSize: T.font.xs, color: "#94a3b8", marginTop: 2 }}>{done} completed</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ FOLLOWUP PANEL ══════════════════════════════════════ */}
            {showFollowupPanel && (
                <div style={{ ...CARD }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f1f4fa" }}>
                        <div style={{ width: 38, height: 38, background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: T.radius.md, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Users style={{ width: 17, height: 17, color: "#ea580c" }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: T.font.lg, fontWeight: "700", color: "#0f172a", letterSpacing: "-0.015em" }}>Follow-up Task Manager</h3>
                            <p style={{ margin: 0, fontSize: T.font.xs, color: "#94a3b8", marginTop: 2 }}>Assign player and bonus followup tasks to specific team members</p>
                        </div>
                    </div>
                    <AdminFollowupPanel teamMembers={teamMembers} onTaskUpdated={loadTasks} />
                </div>
            )}

            {/* ═══ FILTERS ═════════════════════════════════════════════ */}
            <div style={{ ...CARD, padding: "14px 20px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ ...INPUT_BASE, paddingLeft: "13px" }}
                            placeholder="Search tasks…"
                        />
                    </div>

                    <div style={{ display: "flex", gap: 3, background: "#f1f4fa", borderRadius: T.radius.md, padding: "3px" }}>
                        {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)} style={{
                                padding: "6px 12px", borderRadius: T.radius.sm, border: "none",
                                background: statusFilter === s ? "#fff" : "transparent",
                                color: statusFilter === s ? "#1e293b" : "#94a3b8",
                                fontSize: T.font.xs, fontWeight: "600", cursor: "pointer",
                                fontFamily: "inherit",
                                boxShadow: statusFilter === s ? T.shadow.xs : "none",
                                transition: "all .15s",
                            }}>
                                {s.replace("_", " ")}
                            </button>
                        ))}
                    </div>

                    <div style={{ position: "relative" }}>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...INPUT_BASE, paddingRight: "30px", appearance: "none", cursor: "pointer", minWidth: 140, background: "#fff" }}>
                            <option value="ALL">All Types</option>
                            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#94a3b8", pointerEvents: "none" }} />
                    </div>

                    <button onClick={loadTasks} disabled={loading} style={{
                        padding: "9px 13px", border: "1.5px solid #e8edf5", borderRadius: T.radius.md,
                        background: "#fff", cursor: "pointer", color: "#64748b",
                        display: "flex", alignItems: "center", gap: 5, fontSize: T.font.xs, fontWeight: 600,
                    }}>
                        <RefreshCw style={{ width: 12, height: 12, animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ═══ TASK LIST ═══════════════════════════════════════════ */}
            {loading ? (
                <div style={{ padding: "50px 0", textAlign: "center", color: "#94a3b8", fontSize: T.font.sm }}>
                    <RefreshCw style={{ width: 15, height: 15, margin: "0 auto 10px", display: "block", animation: "spin .8s linear infinite", color: "#c7cdd9" }} />
                    Loading tasks…
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ ...CARD, textAlign: "center", padding: "56px 24px" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f1f4fa", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle style={{ width: 22, height: 22, color: "#cbd5e1" }} />
                    </div>
                    <p style={{ color: "#64748b", fontSize: T.font.md, fontWeight: "600", margin: "0 0 4px", letterSpacing: "-0.01em" }}>No tasks found</p>
                    <p style={{ color: "#94a3b8", fontSize: T.font.sm, margin: 0 }}>Create a task or adjust your filters.</p>
                </div>
            ) : (
                <div style={{ borderRadius: T.radius.xl, overflow: "hidden", border: "1px solid #eef0f6", background: "#fff", boxShadow: T.shadow.xs }}>

                    {/* Bulk action bar */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                        background: someSelected ? "rgba(124,58,237,0.03)" : "#fafbfd",
                        borderBottom: "1px solid #f1f4fa",
                        transition: "background .2s",
                    }}>
                        <button
                            onClick={() => handleSelectAll(!allSelected)}
                            style={{
                                width: 16, height: 16, flexShrink: 0,
                                border: `1.5px solid ${allSelected ? "#7c3aed" : someSelected ? "#7c3aed" : "#dde1eb"}`,
                                borderRadius: 4,
                                background: allSelected ? "#7c3aed" : someSelected ? "rgba(124,58,237,0.12)" : "transparent",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                padding: 0, transition: "all .15s",
                            }}
                        >
                            {allSelected
                                ? <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />
                                : someSelected ? <span style={{ width: 7, height: 1.5, background: "#7c3aed", borderRadius: 1, display: "block" }} /> : null}
                        </button>

                        {someSelected ? (
                            <>
                                <span style={{ fontSize: T.font.xs, fontWeight: 700, color: "#7c3aed" }}>{selectedIds.size} selected</span>
                                <div style={{ flex: 1 }} />
                                <button onClick={handleBulkMarkDone} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", border: "1px solid #a7f3d0", borderRadius: T.radius.md, background: "#ecfdf5", color: "#059669", fontSize: T.font.xs, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                    <CheckCircle style={{ width: 11, height: 11 }} /> Mark Done
                                </button>
                                <button onClick={handleBulkDelete} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", border: "1px solid #fecdd3", borderRadius: T.radius.md, background: "#fff1f2", color: "#dc2626", fontSize: T.font.xs, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                    <Trash2 style={{ width: 11, height: 11 }} /> Delete
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", border: "1px solid #e8edf5", borderRadius: T.radius.md, background: "transparent", color: "#94a3b8", fontSize: T.font.xs, cursor: "pointer", fontFamily: "inherit" }}>
                                    <X style={{ width: 10, height: 10 }} /> Clear
                                </button>
                            </>
                        ) : (
                            <span style={{ fontSize: T.font.xs, color: "#94a3b8", fontWeight: 500 }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
                        )}
                    </div>

                    {/* Grouped rows */}
                    {Object.entries(grouped).map(([type, typeTasks], sectionIdx) => {
                        if (!typeTasks.length) return null;
                        const meta = TASK_TYPES.find(t => t.value === type) || { value: type, label: type.replace(/_/g, " "), icon: List, color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
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
                                {/* Section header */}
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "7px 16px",
                                    background: "#f8fafc",
                                    borderTop: sectionIdx > 0 ? "1px solid #f1f4fa" : "none",
                                }}>
                                    <button
                                        onClick={handleSectionSelect}
                                        style={{
                                            width: 14, height: 14, flexShrink: 0,
                                            border: `1.5px solid ${sectionAllSelected ? meta.color : sectionSomeSelected ? meta.color : "#dde1eb"}`,
                                            borderRadius: 3,
                                            background: sectionAllSelected ? meta.color : sectionSomeSelected ? `${meta.color}22` : "transparent",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                        }}
                                    >
                                        {sectionAllSelected && <Check style={{ width: 8, height: 8, color: "#fff", strokeWidth: 3 }} />}
                                        {!sectionAllSelected && sectionSomeSelected && <span style={{ width: 6, height: 1.5, background: meta.color, borderRadius: 1, display: "block" }} />}
                                    </button>
                                    <div style={{ width: 20, height: 20, borderRadius: T.radius.sm, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <TIcon style={{ width: 10, height: 10, color: meta.color }} />
                                    </div>
                                    <span style={{ fontSize: T.font.xs, fontWeight: 700, color: meta.color, letterSpacing: "0.3px" }}>{meta.label}</span>
                                    <span style={{ fontSize: T.font.xs, color: "#b0bac8" }}>({typeTasks.length})</span>
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

            {/* ═══ CREATE TASK MODAL ═══════════════════════════════════ */}
            {showForm && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(15,23,42,0.45)", backdropFilter: "blur(8px)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
                }}>
                    <div style={{
                        background: "#fff", borderRadius: T.radius.xl,
                        width: "100%", maxWidth: "580px", maxHeight: "90vh",
                        display: "flex", flexDirection: "column",
                        boxShadow: "0 32px 80px rgba(0,0,0,.2), 0 0 0 1px rgba(0,0,0,.05)",
                        animation: "modalIn .22s cubic-bezier(0.34,1.56,0.64,1)",
                    }}>

                        {/* Modal header */}
                        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f1f4fa", flexShrink: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: T.radius.md,
                                        background: selectedTypeMeta.bg, border: `1.5px solid ${selectedTypeMeta.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <TypeIcon style={{ width: 16, height: 16, color: selectedTypeMeta.color }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: T.font.lg, fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" }}>Create Task</div>
                                        <div style={{ fontSize: T.font.xs, color: "#94a3b8", marginTop: 1 }}>{selectedTypeMeta.label}</div>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} style={{
                                    background: "#f8fafc", border: "1.5px solid #e8edf5",
                                    borderRadius: T.radius.md, cursor: "pointer", color: "#94a3b8",
                                    padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all .15s",
                                }}>
                                    <X style={{ width: 15, height: 15 }} />
                                </button>
                            </div>

                            {/* Task type pills */}
                            <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
                                {TASK_TYPES.map(tt => {
                                    const TI = tt.icon;
                                    const sel = form.taskType === tt.value;
                                    return (
                                        <button key={tt.value} onClick={() => set("taskType", tt.value)} style={{
                                            display: "flex", alignItems: "center", gap: 5,
                                            padding: "5px 11px", borderRadius: T.radius.pill,
                                            cursor: "pointer", whiteSpace: "nowrap",
                                            border: `1.5px solid ${sel ? tt.color : "#e8edf5"}`,
                                            background: sel ? tt.bg : "#fafbfd",
                                            fontFamily: "inherit", transition: "all .15s", flexShrink: 0,
                                        }}>
                                            <TI style={{ width: 10, height: 10, color: sel ? tt.color : "#b0bac8" }} />
                                            <span style={{ fontSize: T.font.xs, fontWeight: sel ? "700" : "500", color: sel ? tt.color : "#64748b" }}>{tt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ overflowY: "auto", flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }} className="modal-scroll">

                            {/* Basic info */}
                            <FormSection label="Details" icon={Tag}>
                                <div>
                                    <label style={LABEL}>Title <span style={{ color: "#ef4444" }}>*</span></label>
                                    <FocusInput value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Add 5 new players, $1000 revenue target…" />
                                </div>
                                <div>
                                    <label style={LABEL}>Description</label>
                                    <FocusInput as="textarea" rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What needs to be done…" />
                                </div>
                            </FormSection>

                            {/* Priority + Due Date */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label style={LABEL}>Priority</label>
                                    <div style={{ position: "relative" }}>
                                        <FocusInput as="select" value={form.priority} onChange={e => set("priority", e.target.value)}>
                                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </FocusInput>
                                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#b0bac8", pointerEvents: "none" }} />
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
                                            {form.taskType === "PLAYER_ADDITION" ? "Players to Add" : "Revenue Target ($)"}
                                            <span style={{ color: "#ef4444" }}> *</span>
                                        </label>
                                        <FocusInput as="input" type="number" min="1" step="any" value={form.targetValue} onChange={e => set("targetValue", e.target.value)} placeholder={form.taskType === "PLAYER_ADDITION" ? "e.g. 5" : "e.g. 1000"} />
                                        {form.targetValue > 0 && (
                                            <p style={{ fontSize: T.font.xs, color: "#94a3b8", margin: "5px 0 0" }}>
                                                {form.taskType === "REVENUE_TARGET" ? `Goal: $${parseFloat(form.targetValue).toFixed(2)}` : `Goal: ${form.targetValue} players`}
                                            </p>
                                        )}
                                    </div>
                                </FormSection>
                            )}

                            {/* Assignment */}
                            <FormSection label="Assignment" icon={Users}>
                                <label onClick={() => set("assignToAll", !form.assignToAll)} style={{
                                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                                    padding: "10px 13px",
                                    border: `1.5px solid ${form.assignToAll ? "#7c3aed" : "#e8edf5"}`,
                                    borderRadius: T.radius.md,
                                    background: form.assignToAll ? "#faf8ff" : "#fafbfd",
                                    transition: "all .15s",
                                }}>
                                    <div style={{
                                        width: 16, height: 16, borderRadius: 4,
                                        border: `1.5px solid ${form.assignToAll ? "#7c3aed" : "#c7cdd9"}`,
                                        background: form.assignToAll ? "#7c3aed" : "#fff",
                                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                    }}>
                                        <input type="checkbox" checked={form.assignToAll} onChange={e => set("assignToAll", e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                                        {form.assignToAll && <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: T.font.sm, fontWeight: "700", color: form.assignToAll ? "#7c3aed" : "#0f172a" }}>Assign to all members</div>
                                        <div style={{ fontSize: T.font.xs, color: "#94a3b8" }}>Every team member will see and work on this task</div>
                                    </div>
                                </label>
                                {!form.assignToAll && (
                                    <div style={{ position: "relative" }}>
                                        <FocusInput as="select" value={form.assignedToId} onChange={e => set("assignedToId", e.target.value)}>
                                            <option value="">— Leave unassigned or pick a member —</option>
                                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                                        </FocusInput>
                                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#b0bac8", pointerEvents: "none" }} />
                                    </div>
                                )}
                            </FormSection>

                            {/* Daily reset toggle */}
                            {form.taskType === "DAILY_CHECKLIST" && (
                                <label onClick={() => set("isDaily", !form.isDaily)} style={{
                                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                                    padding: "10px 13px",
                                    border: `1.5px solid ${form.isDaily ? "#0284c7" : "#e8edf5"}`,
                                    borderRadius: T.radius.md,
                                    background: form.isDaily ? "#f0f9ff" : "#fafbfd",
                                    transition: "all .15s",
                                }}>
                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${form.isDaily ? "#0284c7" : "#c7cdd9"}`, background: form.isDaily ? "#0284c7" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {form.isDaily && <Check style={{ width: 9, height: 9, color: "#fff", strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: T.font.sm, fontWeight: "700", color: form.isDaily ? "#0284c7" : "#0f172a" }}>Auto-reset daily</div>
                                        <div style={{ fontSize: T.font.xs, color: "#94a3b8" }}>Checklist resets every morning</div>
                                    </div>
                                </label>
                            )}

                            {/* Checklist builder */}
                            {["DAILY_CHECKLIST", "STANDARD"].includes(form.taskType) && (
                                <FormSection label="Checklist" icon={CheckCircle} accent="#0284c7">
                                    {form.checklistItems.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            {form.checklistItems.map((item, i) => (
                                                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "#fafbfd", border: "1px solid #eef0f6", borderRadius: T.radius.md }}>
                                                    <Circle style={{ width: 12, height: 12, color: "#c7cdd9", flexShrink: 0 }} />
                                                    <input
                                                        value={item.label}
                                                        onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it))}
                                                        style={{ flex: 1, border: "none", background: "transparent", fontSize: T.font.sm, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                                                        placeholder={`Item ${i + 1}`}
                                                    />
                                                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: T.font.xs, fontWeight: "600", color: "#94a3b8", cursor: "pointer", flexShrink: 0 }}>
                                                        <input type="checkbox" checked={item.required} onChange={e => set("checklistItems", form.checklistItems.map((it, idx) => idx === i ? { ...it, required: e.target.checked } : it))} />
                                                        req
                                                    </label>
                                                    <button onClick={() => set("checklistItems", form.checklistItems.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px", display: "flex" }}>
                                                        <X style={{ width: 11, height: 11 }} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button type="button" onClick={() => set("checklistItems", [...form.checklistItems, { id: `item_${Date.now()}`, label: "", required: true, done: false }])}
                                        style={{ fontSize: T.font.xs, color: "#0284c7", background: "#f0f9ff", border: "1.5px dashed #bae6fd", padding: "7px 14px", borderRadius: T.radius.md, cursor: "pointer", fontFamily: "inherit", fontWeight: "600", width: "100%", textAlign: "left", transition: "all .15s" }}>
                                        + Add checklist item
                                    </button>
                                </FormSection>
                            )}

                            {/* Member allocations */}
                            {["PLAYER_ADDITION", "REVENUE_TARGET"].includes(form.taskType) && (
                                <FormSection label="Member Allocations" icon={Users} accent={selectedTypeMeta.color}>
                                    {form.subTasks.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            {form.subTasks.map((st, i) => {
                                                const pctOf = form.targetValue > 0 ? Math.round((parseFloat(st.targetValue || 0) / form.targetValue) * 100) : 0;
                                                return (
                                                    <div key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                                        <div style={{ position: "relative", flex: 2 }}>
                                                            <FocusInput as="select" value={st.assignedToId} onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, assignedToId: e.target.value } : s))} style={{ fontSize: T.font.xs, padding: "7px 26px 7px 10px" }}>
                                                                <option value="">Select member</option>
                                                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                            </FocusInput>
                                                            <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#b0bac8", pointerEvents: "none" }} />
                                                        </div>
                                                        <FocusInput as="input" type="number" min="0.01" step="any" value={st.targetValue} onChange={e => set("subTasks", form.subTasks.map((s, idx) => idx === i ? { ...s, targetValue: e.target.value } : s))} placeholder={form.taskType === "REVENUE_TARGET" ? "$200" : "1"} style={{ width: "100px", fontSize: T.font.xs, padding: "7px 10px" }} />
                                                        {pctOf > 0 && <span style={{ fontSize: T.font.xs, color: "#94a3b8", whiteSpace: "nowrap", minWidth: 28 }}>{pctOf}%</span>}
                                                        <button onClick={() => set("subTasks", form.subTasks.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", display: "flex" }}>
                                                            <X style={{ width: 12, height: 12 }} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <button type="button" onClick={() => set("subTasks", [...form.subTasks, { assignedToId: "", targetValue: "", label: "" }])}
                                        style={{ fontSize: T.font.xs, color: selectedTypeMeta.color, background: selectedTypeMeta.bg, border: `1.5px dashed ${selectedTypeMeta.border}`, padding: "7px 14px", borderRadius: T.radius.md, cursor: "pointer", fontFamily: "inherit", fontWeight: "600", width: "100%", textAlign: "left" }}>
                                        + Add member allocation
                                    </button>
                                    {form.subTasks.length > 0 && form.targetValue && (() => {
                                        const tot = form.subTasks.reduce((s, x) => s + (parseFloat(x.targetValue) || 0), 0);
                                        const over = tot > parseFloat(form.targetValue);
                                        const exact = tot === parseFloat(form.targetValue);
                                        return (
                                            <div style={{ padding: "8px 12px", background: over ? "#fef2f2" : exact ? "#f0fdf4" : "#fafbfd", borderRadius: T.radius.md, border: `1px solid ${over ? "#fecdd3" : exact ? "#a7f3d0" : "#e8edf5"}` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: T.font.xs }}>
                                                    <span style={{ color: "#94a3b8" }}>Total allocated</span>
                                                    <span style={{ fontWeight: "700", color: over ? "#dc2626" : exact ? "#15803d" : "#0f172a" }}>
                                                        {form.taskType === "REVENUE_TARGET" ? `$${tot.toFixed(2)} / $${form.targetValue}` : `${tot} / ${form.targetValue}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </FormSection>
                            )}

                            {/* Notes */}
                            <div>
                                <label style={LABEL}>Internal Notes <span style={{ fontWeight: 400, color: "#c7cdd9", textTransform: "none", letterSpacing: 0 }}>(admin only)</span></label>
                                <FocusInput as="textarea" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Not shown to members…" />
                            </div>

                            {formError && <Alert type="error">{formError}</Alert>}
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: "13px 22px 18px", borderTop: "1px solid #f1f4fa", display: "flex", gap: 9, flexShrink: 0, background: "#fff", borderRadius: `0 0 ${T.radius.xl} ${T.radius.xl}` }}>
                            <button onClick={() => setShowForm(false)} style={{
                                flex: 1, padding: "10px",
                                background: "#f8fafc", border: "1.5px solid #e8edf5",
                                borderRadius: T.radius.md, fontWeight: "600", cursor: "pointer",
                                fontSize: T.font.md, color: "#475569", fontFamily: "inherit",
                                transition: "all .15s",
                            }}>
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={submitting} style={{
                                flex: 2, padding: "10px", border: "none",
                                borderRadius: T.radius.md, fontWeight: "700", fontSize: T.font.md,
                                cursor: submitting ? "not-allowed" : "pointer",
                                background: submitting ? "#e8edf5" : `linear-gradient(135deg, ${selectedTypeMeta.color}, ${selectedTypeMeta.color}dd)`,
                                color: submitting ? "#94a3b8" : "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                                fontFamily: "inherit", transition: "all .15s",
                                boxShadow: submitting ? "none" : `0 4px 14px ${selectedTypeMeta.color}35`,
                            }}>
                                {submitting ? "Creating…" : (
                                    form.assignToAll
                                        ? <><Users style={{ width: 14, height: 14 }} /> Assign to All Members</>
                                        : <><Plus style={{ width: 14, height: 14 }} /> Create Task</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .modal-scroll { scrollbar-width: thin; scrollbar-color: #e8edf5 transparent; }
                .modal-scroll::-webkit-scrollbar { width: 4px; }
                .modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .modal-scroll::-webkit-scrollbar-thumb { background: #e8edf5; border-radius: 10px; }
            `}</style>
        </div>
    );
}
