import { useState, useEffect, useCallback, useRef } from "react";
import {
    ClipboardList, CheckCircle, Clock, Zap, X,
    Calendar, Inbox, AlertTriangle, RefreshCw,
    ArrowRight, CheckSquare, AlertCircle
} from "lucide-react";
import { api } from "../api";
import TeamReporttab from "./Teamreporttab";

// ─── Constants ────────────────────────────────────────────────────
const PRIORITY_META = {
    HIGH: { label: "High", bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", border: "#fca5a5" },
    MEDIUM: { label: "Medium", bg: "#fffbeb", text: "#92400e", dot: "#f59e0b", border: "#fde68a" },
    LOW: { label: "Low", bg: "#f0fdf4", text: "#166534", dot: "#22c55e", border: "#86efac" },
};

const STATUS_META = {
    PENDING: { label: "Pending", bg: "#f1f5f9", text: "#475569", icon: Clock, order: 0 },
    IN_PROGRESS: { label: "In Progress", bg: "#eff6ff", text: "#1d4ed8", icon: Zap, order: 1 },
    COMPLETED: { label: "Completed", bg: "#f0fdf4", text: "#166534", icon: CheckCircle, order: 2 },
    CANCELLED: { label: "Cancelled", bg: "#fee2e2", text: "#991b1b", icon: X, order: 3 },
};

const ROLE_LABELS = {
    TEAM1: "Team 1", TEAM2: "Team 2", TEAM3: "Team 3", TEAM4: "Team 4",
    ADMIN: "Admin", SUPER_ADMIN: "Super Admin",
};

const fmt_date = (raw) => {
    if (!raw) return null;
    return new Date(raw).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",  // ← add this
        month: "short", day: "numeric", year: "numeric"
    });
};

const isOverdue = (dueDate, status) =>
    dueDate && new Date(dueDate) < new Date() &&
    status !== "COMPLETED" && status !== "CANCELLED";

// ─── Task Card ─────────────────────────────────────────────────────
function TaskCard({ task, onStatusChange, onClaim, isUnassigned = false }) {
    const [updating, setUpdating] = useState(false);
    const p = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const s = STATUS_META[task.status] || STATUS_META.PENDING;
    const SIcon = s.icon;
    const overdue = isOverdue(task.dueDate, task.status);

    const handleStatus = async (newStatus) => {
        setUpdating(true);
        try { await onStatusChange(task.id, newStatus); }
        finally { setUpdating(false); }
    };

    const handleClaim = async () => {
        setUpdating(true);
        try { await onClaim(task.id); }
        finally { setUpdating(false); }
    };

    return (
        <div
            style={{
                background: "#fff", borderRadius: "12px",
                border: `1px solid ${overdue ? "#fca5a5" : "#e2e8f0"}`,
                padding: "16px 20px", transition: "box-shadow .15s",
                opacity: updating ? 0.55 : 1,
                boxShadow: overdue ? "0 0 0 1px #fca5a5" : "0 1px 6px rgba(15,23,42,.05)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = overdue
                ? "0 0 0 2px #fca5a5" : "0 4px 16px rgba(15,23,42,.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = overdue
                ? "0 0 0 1px #fca5a5" : "0 1px 6px rgba(15,23,42,.05)"}
        >
            {/* Top row: title + priority badge */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
                    <span style={{
                        fontWeight: "700", fontSize: "14px", color: "#0f172a",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                        {task.title}
                    </span>
                    {overdue && (
                        <span style={{
                            padding: "1px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700",
                            background: "#fee2e2", color: "#991b1b", flexShrink: 0
                        }}>
                            OVERDUE
                        </span>
                    )}
                </div>
                <span style={{
                    padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: "600",
                    background: p.bg, color: p.text, border: `1px solid ${p.border}`, flexShrink: 0,
                }}>{p.label}</span>
            </div>

            {/* Description */}
            {task.description && (
                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                    {task.description}
                </p>
            )}

            {/* Meta */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                {task.dueDate && (
                    <span style={{
                        display: "flex", alignItems: "center", gap: "4px", fontSize: "11px",
                        color: overdue ? "#ef4444" : "#64748b", fontWeight: overdue ? "700" : "400"
                    }}>
                        <Calendar style={{ width: "11px", height: "11px" }} />
                        {fmt_date(task.dueDate)}
                    </span>
                )}
                {task.notes && (
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                        "{task.notes}"
                    </span>
                )}
                {isUnassigned && task.createdBy && (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Created by {task.createdBy.name}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {isUnassigned ? (
                    <button onClick={handleClaim} disabled={updating} style={{
                        flex: 1, padding: "9px", border: "none", borderRadius: "7px",
                        background: "#0f172a", color: "#fff", fontWeight: "700", fontSize: "12px",
                        cursor: updating ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                    }}>
                        <ArrowRight style={{ width: "12px", height: "12px" }} />
                        {updating ? "Claiming…" : "Claim Task"}
                    </button>
                ) : (
                    <>
                        {task.status === "PENDING" && (
                            <button onClick={() => handleStatus("IN_PROGRESS")} style={{
                                flex: 1, padding: "8px", border: "none", borderRadius: "7px",
                                background: "#eff6ff", color: "#1d4ed8", fontWeight: "700", fontSize: "12px",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            }}>
                                <Zap style={{ width: "12px", height: "12px" }} /> Start
                            </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                            <button onClick={() => handleStatus("COMPLETED")} style={{
                                flex: 1, padding: "8px", border: "none", borderRadius: "7px",
                                background: "#f0fdf4", color: "#166534", fontWeight: "700", fontSize: "12px",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            }}>
                                <CheckCircle style={{ width: "12px", height: "12px" }} /> Mark Done
                            </button>
                        )}
                        {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                            <button onClick={() => handleStatus("CANCELLED")} style={{
                                padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: "7px",
                                background: "#fff", color: "#94a3b8", fontWeight: "600", fontSize: "12px", cursor: "pointer",
                            }}>
                                Cancel
                            </button>
                        )}
                        {(task.status === "COMPLETED" || task.status === "CANCELLED") && (
                            <span style={{
                                padding: "7px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: "600",
                                background: s.bg, color: s.text, display: "flex", alignItems: "center", gap: "5px"
                            }}>
                                <SIcon style={{ width: "12px", height: "12px" }} /> {s.label}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Online Dot ───────────────────────────────────────────────────
function OnlineDot() {
    return (
        <div style={{ position: "relative", display: "inline-flex", width: "10px", height: "10px" }}>
            <div style={{
                width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e",
                border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(34,197,94,.3)"
            }} />
            <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(34,197,94,.4)", animation: "ping 1.5s cubic-bezier(0,0,.2,1) infinite"
            }} />
        </div>
    );
}

// ─── Mini Stat ────────────────────────────────────────────────────
function MiniStat({ label, value, color, icon: Icon }) {
    return (
        <div style={{
            background: color.bg, borderRadius: "10px", padding: "14px 18px",
            border: `1px solid ${color.border}`, display: "flex", alignItems: "center", gap: "12px"
        }}>
            <Icon style={{ width: "16px", height: "16px", color: color.text, flexShrink: 0 }} />
            <div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "11px", color: color.text, marginTop: "2px" }}>{label}</div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// Props:
//   currentUser?: { id, name, role, ... }
//   If not provided, the component self-fetches from GET /api/user
// ═════════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser: currentUserProp }) {
    const [tab, setTab] = useState("my");
    const [myTasks, setMyTasks] = useState([]);
    const [availableTasks, setAvailableTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // ── FIX 1: self-fetch currentUser when prop is absent ─────────
    const [currentUser, setCurrentUser] = useState(currentUserProp || null);

    // ── FIX 2: stable ref so SSE closures always see current userId ─
    const userIdRef = useRef(null);
    useEffect(() => {
        if (currentUser?.id) userIdRef.current = currentUser.id;
    }, [currentUser?.id]);

    // Fetch the logged-in user from the server if prop not supplied
    useEffect(() => {
        if (currentUserProp) {
            setCurrentUser(currentUserProp);
            userIdRef.current = currentUserProp.id;
            return;
        }
        // api.auth.getUser hits GET /api/user — already in your api.js
        api.auth.getUser()
            .then(data => {
                // /api/user returns the object directly (not nested under .data)
                const user = data?.data ?? data;
                if (!user?.id) throw new Error("No user in response");
                setCurrentUser(user);
                userIdRef.current = user.id;
            })
            .catch(err => {
                console.error("TeamDashboard: could not fetch current user", err);
                setFetchError("Could not load your profile. Please refresh the page.");
                setLoading(false);
            });
    }, [currentUserProp]);

    // ── Data loaders ──────────────────────────────────────────────
    // Accepts userId as explicit param to avoid stale-closure issues
    const loadMyTasks = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const r = await api.tasks.getTasks({ assignedTo: userId });
            setMyTasks(r?.data || []);
        } catch (e) {
            console.error("loadMyTasks:", e);
        }
    }, []);

    const loadAvailable = useCallback(async () => {
        try {
            const r = await api.tasks.getTasks({ unassigned: true });
            setAvailableTasks(
                (r?.data || []).filter(t => t.status !== "CANCELLED" && t.status !== "COMPLETED")
            );
        } catch (e) {
            console.error("loadAvailable:", e);
        }
    }, []);

    const loadAll = useCallback(async (userId) => {
        setLoading(true);
        await Promise.all([loadMyTasks(userId), loadAvailable()]);
        setLoading(false);
    }, [loadMyTasks, loadAvailable]);

    // Trigger full load once we know the user ID
    useEffect(() => {
        if (!currentUser?.id) return;
        loadAll(currentUser.id);
    }, [currentUser?.id, loadAll]);

    // ── Presence ping ─────────────────────────────────────────────
    useEffect(() => {
        const ping = () =>
            fetch("/api/tasks/ping", { method: "POST", credentials: "include" }).catch(() => { });
        ping();
        const id = setInterval(ping, 30000);
        return () => clearInterval(id);
    }, []);

    // ── SSE — mounted ONCE; reads userId via ref (no stale closures) ─
    const eventSourceRef = useRef(null);
    useEffect(() => {
        const connectSSE = () => {
            const es = new EventSource("/api/tasks/events", { withCredentials: true });

            const refresh = (e) => {
                const task = JSON.parse(e.data);
                const meId = userIdRef.current; // always the latest value

                // Update "My Tasks"
                setMyTasks(prev => {
                    const exists = prev.some(t => t.id === task.id);
                    if (task.assignedToId === meId) {
                        // task belongs to me — add or update
                        return exists ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev];
                    }
                    // task no longer mine — remove if present
                    return exists ? prev.filter(t => t.id !== task.id) : prev;
                });

                // Update "Available Tasks"
                setAvailableTasks(prev => {
                    const isOpen = !task.assignedToId &&
                        task.status !== "CANCELLED" && task.status !== "COMPLETED";
                    const exists = prev.some(t => t.id === task.id);
                    if (isOpen) {
                        return exists ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev];
                    }
                    return prev.filter(t => t.id !== task.id);
                });
            };

            const handleDelete = (e) => {
                const { id } = JSON.parse(e.data);
                setMyTasks(prev => prev.filter(t => t.id !== id));
                setAvailableTasks(prev => prev.filter(t => t.id !== id));
            };

            es.addEventListener("task_created", refresh);
            es.addEventListener("task_updated", refresh);
            es.addEventListener("task_deleted", handleDelete);
            es.onerror = () => { es.close(); setTimeout(connectSSE, 3000); };
            eventSourceRef.current = es;
        };

        connectSSE();
        return () => eventSourceRef.current?.close();
    }, []); // ← intentionally empty — ref keeps it fresh

    // ── Claim & Status actions ────────────────────────────────────
    const handleStatusChange = useCallback(async (taskId, newStatus) => {
        // SSE broadcasts the update back — no need to manually set state
        await api.tasks.updateTask(taskId, { status: newStatus });
    }, []);

    const handleClaim = useCallback(async (taskId) => {
        const meId = userIdRef.current;
        if (!meId) return;
        await api.tasks.updateTask(taskId, {
            assignedToId: meId,
            status: "IN_PROGRESS",
        });
        // SSE will move it from availableTasks → myTasks automatically
    }, []);

    // ── Derived state ─────────────────────────────────────────────
    const myActive = myTasks.filter(t => t.status === "PENDING" || t.status === "IN_PROGRESS");
    const myDone = myTasks.filter(t => t.status === "COMPLETED" || t.status === "CANCELLED");
    const myOverdue = myTasks.filter(t => isOverdue(t.dueDate, t.status));

    const TABS = [
        { id: "my", label: "My Tasks", icon: ClipboardList },
        { id: "available", label: "Available Tasks", icon: Inbox },
    ];

    // ─── Guard states ──────────────────────────────────────────────
    if (!currentUser && !fetchError) {
        return (
            <div style={{ padding: "56px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                Loading your profile…
            </div>
        );
    }

    if (fetchError) {
        return (
            <div style={{
                padding: "20px", background: "#fee2e2", borderRadius: "12px",
                border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px",
                display: "flex", gap: "10px", alignItems: "center"
            }}>
                <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                {fetchError}
            </div>
        );
    }

    // ─── Main render ───────────────────────────────────────────────
    return (

        <>

            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

                {/* ── Profile Header ── */}
                <div style={{
                    background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
                    padding: "20px 28px", display: "flex", alignItems: "center", gap: "18px",
                    boxShadow: "0 2px 12px rgba(15,23,42,.06)", flexWrap: "wrap"
                }}>

                    {/* Avatar + online dot */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                            width: "52px", height: "52px", borderRadius: "50%", background: "#0f172a",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "18px", fontWeight: "900", color: "#fff"
                        }}>
                            {(currentUser?.name || "T")[0].toUpperCase()}
                        </div>
                        <div style={{ position: "absolute", bottom: "0", right: "0" }}>
                            <OnlineDot />
                        </div>
                    </div>

                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ fontWeight: "800", fontSize: "16px", color: "#0f172a" }}>
                            {currentUser?.name || "Team Member"}
                        </div>
                        <div style={{
                            fontSize: "12px", color: "#64748b", marginTop: "4px",
                            display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap"
                        }}>
                            <span style={{
                                padding: "2px 8px", background: "#f1f5f9", borderRadius: "4px",
                                fontSize: "11px", fontWeight: "600", color: "#475569"
                            }}>
                                {ROLE_LABELS[currentUser?.role] || currentUser?.role || "Team"}
                            </span>
                            <span>ID #{currentUser?.id}</span>
                            <span style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                color: "#16a34a", fontWeight: "600"
                            }}>
                                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                                Online
                            </span>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <MiniStat label="Pending" value={myTasks.filter(t => t.status === "PENDING").length}
                            icon={Clock} color={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }} />
                        <MiniStat label="In Progress" value={myTasks.filter(t => t.status === "IN_PROGRESS").length}
                            icon={Zap} color={{ bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }} />
                        <MiniStat label="Completed" value={myTasks.filter(t => t.status === "COMPLETED").length}
                            icon={CheckCircle} color={{ bg: "#f0fdf4", text: "#166534", border: "#86efac" }} />
                        {myOverdue.length > 0 && (
                            <MiniStat label="Overdue" value={myOverdue.length}
                                icon={AlertTriangle} color={{ bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" }} />
                        )}
                    </div>

                    <button onClick={() => loadAll(currentUser?.id)}
                        style={{
                            background: "none", border: "1px solid #e2e8f0", borderRadius: "8px",
                            padding: "7px 12px", cursor: "pointer", color: "#64748b",
                            display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600"
                        }}>
                        <RefreshCw style={{
                            width: "12px", height: "12px",
                            animation: loading ? "spin 1s linear infinite" : "none"
                        }} />
                        Refresh
                    </button>
                </div>

                {/* ── Tab Navigation ── */}
                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "4px" }}>
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        const badge = t.id === "available" ? availableTasks.length : null;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                flex: 1, padding: "10px 16px", border: "none", borderRadius: "7px",
                                cursor: "pointer", fontWeight: active ? "700" : "500",
                                fontSize: "13px", fontFamily: "inherit",
                                background: active ? "#fff" : "transparent",
                                color: active ? "#0f172a" : "#64748b",
                                boxShadow: active ? "0 1px 4px rgba(15,23,42,.1)" : "none",
                                transition: "all .15s", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: "7px",
                            }}>
                                <Icon style={{ width: "14px", height: "14px" }} />
                                {t.label}
                                {badge > 0 && (
                                    <span style={{
                                        padding: "1px 6px", borderRadius: "10px", fontSize: "10px",
                                        fontWeight: "800", background: active ? "#0f172a" : "#e2e8f0",
                                        color: active ? "#fff" : "#64748b"
                                    }}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── My Tasks tab ── */}
                {tab === "my" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {loading ? (
                            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                Loading your tasks…
                            </div>
                        ) : myTasks.length === 0 ? (
                            <div style={{
                                padding: "56px", textAlign: "center", background: "#fff",
                                borderRadius: "14px", border: "1px solid #e2e8f0"
                            }}>
                                <CheckSquare style={{
                                    width: "40px", height: "40px", margin: "0 auto 12px",
                                    display: "block", color: "#e2e8f0"
                                }} />
                                <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 6px", fontWeight: "600" }}>
                                    No tasks assigned to you yet
                                </p>
                                <p style={{ color: "#cbd5e1", fontSize: "12px", margin: 0 }}>
                                    Check the <strong>Available Tasks</strong> tab to claim one
                                </p>
                            </div>
                        ) : (
                            <>
                                {myActive.length > 0 && (
                                    <section>
                                        <h3 style={{
                                            margin: "0 0 12px", fontSize: "13px", fontWeight: "700",
                                            color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px",
                                            display: "flex", alignItems: "center", gap: "8px"
                                        }}>
                                            <Zap style={{ width: "13px", height: "13px" }} />
                                            Active ({myActive.length})
                                        </h3>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "12px" }}>
                                            {[...myActive]
                                                .sort((a, b) => (STATUS_META[a.status]?.order ?? 0) - (STATUS_META[b.status]?.order ?? 0))
                                                .map(task => (
                                                    <TaskCard key={task.id} task={task}
                                                        onStatusChange={handleStatusChange} onClaim={handleClaim} />
                                                ))}
                                        </div>
                                    </section>
                                )}

                                {myDone.length > 0 && (
                                    <section>
                                        <h3 style={{
                                            margin: "0 0 12px", fontSize: "13px", fontWeight: "700",
                                            color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px",
                                            display: "flex", alignItems: "center", gap: "8px"
                                        }}>
                                            <CheckCircle style={{ width: "13px", height: "13px" }} />
                                            Completed / Cancelled ({myDone.length})
                                        </h3>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "12px" }}>
                                            {myDone.map(task => (
                                                <TaskCard key={task.id} task={task}
                                                    onStatusChange={handleStatusChange} onClaim={handleClaim} />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── Available Tasks tab ── */}
                {tab === "available" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                            padding: "13px 18px", background: "#fffbeb", border: "1px solid #fde68a",
                            borderRadius: "10px", fontSize: "12px", color: "#92400e", display: "flex", gap: "10px"
                        }}>
                            <Inbox style={{ width: "15px", height: "15px", flexShrink: 0, marginTop: "1px" }} />
                            <span>
                                Tasks created by admins not yet assigned to anyone.
                                Click <strong>Claim Task</strong> to take it and start immediately.
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                Loading available tasks…
                            </div>
                        ) : availableTasks.length === 0 ? (
                            <div style={{
                                padding: "56px", textAlign: "center", background: "#fff",
                                borderRadius: "14px", border: "1px solid #e2e8f0"
                            }}>
                                <Inbox style={{
                                    width: "40px", height: "40px", margin: "0 auto 12px",
                                    display: "block", color: "#e2e8f0"
                                }} />
                                <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0, fontWeight: "600" }}>
                                    No unassigned tasks right now
                                </p>
                                <p style={{ color: "#cbd5e1", fontSize: "12px", margin: "6px 0 0" }}>
                                    New tasks created by admins will appear here in real-time
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: "12px" }}>
                                {[...availableTasks]
                                    .sort((a, b) =>
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] ?? 1) -
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority] ?? 1)
                                    )
                                    .map(task => (
                                        <TaskCard key={task.id} task={task}
                                            onStatusChange={handleStatusChange} onClaim={handleClaim} isUnassigned />
                                    ))}
                            </div>
                        )}
                    </div>
                )}


                {/* {tab === "R/eports" && ( */}
                {/* // )} */}

                <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>
            </div>

            <TeamReporttab currentUser={currentUser} />

        </>
    );
}