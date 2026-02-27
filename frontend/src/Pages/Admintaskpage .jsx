import { useState, useEffect, useCallback, useRef } from "react";
import {
    ClipboardList, Plus, X, CheckCircle, AlertCircle, Clock,
    User, Flag, Calendar, ChevronDown, Trash2, Edit3, Search,
    RefreshCw, Users, Zap, Filter
} from "lucide-react";
import { api } from "../api";

// ─── Constants ──────────────────────────────────────────────────
const PRIORITY_META = {
    HIGH: { label: "High", bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", border: "#fca5a5" },
    MEDIUM: { label: "Medium", bg: "#fffbeb", text: "#92400e", dot: "#f59e0b", border: "#fde68a" },
    LOW: { label: "Low", bg: "#f0fdf4", text: "#166534", dot: "#22c55e", border: "#86efac" },
};

const STATUS_META = {
    PENDING: { label: "Pending", bg: "#f1f5f9", text: "#475569", icon: Clock },
    IN_PROGRESS: { label: "In Progress", bg: "#eff6ff", text: "#1d4ed8", icon: Zap },
    COMPLETED: { label: "Completed", bg: "#f0fdf4", text: "#166534", icon: CheckCircle },
    CANCELLED: { label: "Cancelled", bg: "#fee2e2", text: "#991b1b", icon: X },
};

const ROLE_LABELS = { TEAM1: "Team 1", TEAM2: "Team 2", TEAM3: "Team 3", TEAM4: "Team 4" };

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
    boxShadow: "0 2px 12px rgba(15,23,42,.07)", padding: "28px 32px",
};

const fmt_date = (raw) => {
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div style={{
            background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0",
            padding: "18px 22px", display: "flex", alignItems: "center", gap: "16px",
            boxShadow: "0 1px 8px rgba(15,23,42,.05)",
        }}>
            <div style={{
                width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0,
                background: color.bg, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon style={{ width: "18px", height: "18px", color: color.text }} />
            </div>
            <div>
                <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{label}</div>
            </div>
        </div>
    );
}

// ─── Task Row ────────────────────────────────────────────────────
function TaskRow({ task, teamMembers, onUpdate, onDelete }) {
    const [assigning, setAssigning] = useState(false);
    const [updating, setUpdating] = useState(false);
    const p = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const s = STATUS_META[task.status] || STATUS_META.PENDING;
    const SIcon = s.icon;

    const handleAssign = async (memberId) => {
        setAssigning(false);
        setUpdating(true);
        try {
            await api.tasks.updateTask(task.id, { assignedToId: memberId || null });
        } finally { setUpdating(false); }
    };

    const handleStatus = async (newStatus) => {
        setUpdating(true);
        try {
            await api.tasks.updateTask(task.id, { status: newStatus });
        } finally { setUpdating(false); }
    };

    return (
        <tr
            style={{ borderBottom: "1px solid #f1f5f9", opacity: updating ? 0.5 : 1, transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
            {/* Priority + Title */}
            <td style={{ padding: "13px 16px", minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{
                        width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                        background: p.dot, marginTop: "5px",
                    }} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{task.title}</div>
                        {task.description && (
                            <div style={{
                                fontSize: "11px", color: "#94a3b8", marginTop: "2px", maxWidth: "280px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                                {task.description}
                            </div>
                        )}
                    </div>
                </div>
            </td>

            {/* Priority */}
            <td style={{ padding: "13px 16px" }}>
                <span style={{
                    display: "inline-block", padding: "3px 9px", borderRadius: "5px",
                    fontSize: "11px", fontWeight: "600", background: p.bg, color: p.text,
                    border: `1px solid ${p.border}`,
                }}>{p.label}</span>
            </td>

            {/* Status */}
            <td style={{ padding: "13px 16px" }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                    <select
                        value={task.status}
                        onChange={e => handleStatus(e.target.value)}
                        style={{
                            padding: "4px 28px 4px 10px", borderRadius: "6px", fontSize: "11px",
                            fontWeight: "600", border: `1px solid ${s.bg}`, background: s.bg,
                            color: s.text, cursor: "pointer", appearance: "none",
                            fontFamily: "inherit",
                        }}
                    >
                        {Object.entries(STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <ChevronDown style={{
                        position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
                        width: "10px", height: "10px", color: s.text, pointerEvents: "none",
                    }} />
                </div>
            </td>

            {/* Assigned To */}
            <td style={{ padding: "13px 16px", position: "relative" }}>
                {task.assignedTo ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{
                            width: "26px", height: "26px", borderRadius: "50%", background: "#eff6ff",
                            border: "1px solid #bfdbfe", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: "10px", fontWeight: "800", color: "#1d4ed8",
                            flexShrink: 0,
                        }}>
                            {task.assignedTo.name[0].toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{task.assignedTo.name}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{ROLE_LABELS[task.assignedTo.role] || task.assignedTo.role}</div>
                        </div>
                        <button
                            onClick={() => setAssigning(v => !v)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px", marginLeft: "2px" }}
                            title="Reassign"
                        >
                            <Edit3 style={{ width: "11px", height: "11px" }} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setAssigning(v => !v)}
                        style={{
                            padding: "5px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
                            border: "1px dashed #cbd5e1", background: "transparent", color: "#94a3b8",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                        }}
                    >
                        <User style={{ width: "11px", height: "11px" }} /> Assign
                    </button>
                )}

                {/* Assign dropdown */}
                {assigning && (
                    <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: "16px", zIndex: 50,
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(15,23,42,.12)", overflow: "hidden", minWidth: "200px",
                    }}>
                        {task.assignedTo && (
                            <div
                                onClick={() => handleAssign(null)}
                                style={{
                                    padding: "9px 14px", fontSize: "12px", color: "#ef4444", fontWeight: "600",
                                    cursor: "pointer", borderBottom: "1px solid #f1f5f9"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                                Remove assignment
                            </div>
                        )}
                        {teamMembers.map(m => (
                            <div
                                key={m.id}
                                onClick={() => handleAssign(m.id)}
                                style={{
                                    padding: "9px 14px", fontSize: "12px", cursor: "pointer",
                                    fontWeight: m.id === task.assignedToId ? "700" : "500",
                                    color: m.id === task.assignedToId ? "#1d4ed8" : "#0f172a",
                                    display: "flex", justifyContent: "space-between", alignItems: "center"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                                <span>{m.name}</span>
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>{ROLE_LABELS[m.role]}</span>
                            </div>
                        ))}
                    </div>
                )}
            </td>

            {/* Due Date */}
            <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                {task.dueDate ? (
                    <span style={{
                        color: new Date(task.dueDate) < new Date() && task.status !== "COMPLETED"
                            ? "#ef4444" : "#64748b",
                        fontWeight: new Date(task.dueDate) < new Date() && task.status !== "COMPLETED"
                            ? "700" : "400",
                    }}>
                        {fmt_date(task.dueDate)}
                    </span>
                ) : "—"}
            </td>

            {/* Created */}
            <td style={{ padding: "13px 16px", fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                {fmt_date(task.createdAt)}
            </td>

            {/* Actions */}
            <td style={{ padding: "13px 16px" }}>
                <button
                    onClick={() => onDelete(task.id)}
                    style={{
                        background: "none", border: "1px solid #fee2e2", borderRadius: "6px",
                        padding: "5px 8px", cursor: "pointer", color: "#ef4444", display: "flex",
                    }}
                >
                    <Trash2 style={{ width: "12px", height: "12px" }} />
                </button>
            </td>
        </tr>
    );
}

// ═════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function AdminTaskPage() {
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [dueDate, setDueDate] = useState("");
    const [assignedToId, setAssignedToId] = useState("");
    const [notes, setNotes] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterPriority, setFilterPriority] = useState("ALL");
    const [search, setSearch] = useState("");

    const eventSourceRef = useRef(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [tasksRes, membersRes] = await Promise.all([
                api.tasks.getTasks(),
                api.tasks.getTeamMembers(),
            ]);
            setTasks(tasksRes?.data || []);
            setTeamMembers(membersRes?.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    // Connect SSE for real-time updates
    useEffect(() => {
        loadData();

        const connectSSE = () => {
            const es = new EventSource("/api/tasks/events", { withCredentials: true });
            es.addEventListener("task_created", (e) => {
                const task = JSON.parse(e.data);
                setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)]);
            });
            es.addEventListener("task_updated", (e) => {
                const task = JSON.parse(e.data);
                setTasks(prev => prev.map(t => t.id === task.id ? task : t));
            });
            es.addEventListener("task_deleted", (e) => {
                const { id } = JSON.parse(e.data);
                setTasks(prev => prev.filter(t => t.id !== id));
            });
            es.onerror = () => {
                es.close();
                setTimeout(connectSSE, 3000); // reconnect after 3 s
            };
            eventSourceRef.current = es;
        };

        connectSSE();
        return () => eventSourceRef.current?.close();
    }, [loadData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!title.trim()) { setError("Title is required."); return; }

        try {
            setSubmitting(true);
            await api.tasks.createTask({
                title, description, priority,
                dueDate: dueDate || null,
                assignedToId: assignedToId || null,
                notes,
            });
            setSuccess("Task created successfully!");
            setTitle(""); setDescription(""); setPriority("MEDIUM");
            setDueDate(""); setAssignedToId(""); setNotes("");
            setShowForm(false);
        } catch (err) {
            setError(err.message || "Failed to create task.");
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            await api.tasks.deleteTask(taskId);
        } catch (err) {
            setError(err.message || "Failed to delete task.");
        }
    };

    // Filtered tasks
    const filtered = tasks.filter(t => {
        if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
        if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !(t.assignedTo?.name || "").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === "PENDING").length,
        inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
        completed: tasks.filter(t => t.status === "COMPLETED").length,
        unassigned: tasks.filter(t => !t.assignedToId).length,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: "42px", height: "42px", borderRadius: "10px", background: "#0f172a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <ClipboardList style={{ width: "20px", height: "20px", color: "#fff" }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>Task Management</h1>
                        <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Create and assign tasks to team members</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={loadData}
                        style={{
                            padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px",
                            fontWeight: "600", color: "#64748b"
                        }}
                    >
                        <RefreshCw style={{ width: "12px", height: "12px", animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        style={{
                            padding: "9px 18px", border: "none", borderRadius: "8px", background: "#0f172a",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                            fontSize: "13px", fontWeight: "700", color: "#fff",
                        }}
                    >
                        <Plus style={{ width: "14px", height: "14px" }} />
                        New Task
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "14px" }}>
                <StatCard label="Total Tasks" value={stats.total} icon={ClipboardList} color={{ bg: "#f1f5f9", text: "#475569" }} />
                <StatCard label="Pending" value={stats.pending} icon={Clock} color={{ bg: "#fffbeb", text: "#92400e" }} />
                <StatCard label="In Progress" value={stats.inProgress} icon={Zap} color={{ bg: "#eff6ff", text: "#1d4ed8" }} />
                <StatCard label="Completed" value={stats.completed} icon={CheckCircle} color={{ bg: "#f0fdf4", text: "#166534" }} />
                <StatCard label="Unassigned" value={stats.unassigned} icon={Users} color={{ bg: "#faf5ff", text: "#6b21a8" }} />
            </div>

            {/* ── Alerts ── */}
            {error && (
                <div style={{
                    padding: "11px 14px", background: "#fee2e2", border: "1px solid #fca5a5",
                    borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center"
                }}>
                    <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                </div>
            )}
            {success && (
                <div style={{
                    padding: "11px 14px", background: "#dcfce7", border: "1px solid #86efac",
                    borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center"
                }}>
                    <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}
                </div>
            )}

            {/* ── Create Task Form ── */}
            {showForm && (
                <div style={{ ...CARD, border: "1px solid #bfdbfe", boxShadow: "0 0 0 3px rgba(59,130,246,.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Plus style={{ width: "16px", height: "16px", color: "#3b82f6" }} />
                            Create New Task
                        </h3>
                        <button onClick={() => setShowForm(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                            <X style={{ width: "16px", height: "16px" }} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 200px", gap: "14px" }}>
                            <div>
                                <label style={LABEL}>Title *</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="Task title…" style={INPUT} />
                            </div>
                            <div>
                                <label style={LABEL}>Priority</label>
                                <select value={priority} onChange={e => setPriority(e.target.value)}
                                    style={{ ...INPUT, cursor: "pointer" }}>
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                            <div>
                                <label style={LABEL}>Assign To (optional)</label>
                                <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)}
                                    style={{ ...INPUT, cursor: "pointer" }}>
                                    <option value="">— Unassigned —</option>
                                    {teamMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({ROLE_LABELS[m.role] || m.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={LABEL}>Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Describe the task…" rows={2}
                                style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            <div>
                                <label style={LABEL}>Due Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={INPUT} />
                            </div>
                            <div>
                                <label style={LABEL}>Notes</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Additional notes…" style={INPUT} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                            <button type="button" onClick={() => setShowForm(false)}
                                style={{
                                    flex: 1, padding: "11px", background: "#fff", border: "1px solid #e2e8f0",
                                    borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px"
                                }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                style={{
                                    flex: 2, padding: "11px", border: "none", borderRadius: "8px",
                                    fontWeight: "700", fontSize: "13px",
                                    background: submitting ? "#e2e8f0" : "#0f172a",
                                    color: submitting ? "#94a3b8" : "#fff", cursor: submitting ? "not-allowed" : "pointer",
                                }}>
                                {submitting ? "Creating…" : "Create Task"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Tasks Table ── */}
            <div style={{
                background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(15,23,42,.07)", overflow: "hidden"
            }}>

                {/* Table header toolbar */}
                <div style={{
                    padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>All Tasks</h3>
                        <span style={{
                            padding: "2px 8px", background: "#f1f5f9", borderRadius: "20px",
                            fontSize: "11px", fontWeight: "600", color: "#64748b"
                        }}>
                            {filtered.length}
                        </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {/* Search */}
                        <div style={{ position: "relative" }}>
                            <Search style={{
                                position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                                width: "12px", height: "12px", color: "#94a3b8"
                            }} />
                            <input type="text" placeholder="Search…" value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ ...INPUT, width: "160px", paddingLeft: "30px", padding: "8px 10px 8px 30px" }} />
                        </div>
                        {/* Status filter */}
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ ...INPUT, width: "auto", padding: "8px 12px", cursor: "pointer" }}>
                            <option value="ALL">All Status</option>
                            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        {/* Priority filter */}
                        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                            style={{ ...INPUT, width: "auto", padding: "8px 12px", cursor: "pointer" }}>
                            <option value="ALL">All Priority</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Loading tasks…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center" }}>
                        <ClipboardList style={{ width: "36px", height: "36px", margin: "0 auto 10px", display: "block", color: "#e2e8f0" }} />
                        <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                            {tasks.length === 0 ? "No tasks yet — create the first one!" : "No tasks match your filters"}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    {["Task", "Priority", "Status", "Assigned To", "Due Date", "Created", ""].map(h => (
                                        <th key={h} style={{
                                            textAlign: "left", padding: "10px 16px", fontWeight: "600",
                                            color: "#64748b", fontSize: "11px", textTransform: "uppercase",
                                            letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap"
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        teamMembers={teamMembers}
                                        onUpdate={() => { }}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #fff; }
      `}</style>
        </div>
    );
}