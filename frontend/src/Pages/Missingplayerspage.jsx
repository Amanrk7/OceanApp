/**
 * MissingPlayerInfoPage.jsx
 *
 * Shows players with incomplete contact details.
 * Missing fields = phone | email | snapchat | instagram | telegram  (NOT assignedMember)
 *
 * Role logic:
 *  - admin  → can "Assign to Team 1-4" (creates a task assigned to the team)
 *  - member → can "Claim" (creates a task assigned to themselves)
 *
 * Real-time: SSE on /api/tasks/events + 15s polling fallback.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    RefreshCw, Search, X, AlertTriangle, Phone, Mail,
    Camera, Instagram, Send, Users, ChevronDown,
    CheckCircle, AlertCircle, UserCheck, ShieldAlert,
    Zap, Edit3, Clock,
} from "lucide-react";
import { api } from "../api";

// ─── Shared styles ─────────────────────────────────────────────────────────────
const CARD = {
    background: "#fff", borderRadius: "14px",
    border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(15,23,42,.06)",
};
const INPUT = {
    width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0",
    borderRadius: "9px", fontSize: "14px", fontFamily: "inherit",
    boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};
const SELECT = { ...INPUT, paddingRight: "32px", appearance: "none", cursor: "pointer" };
const BTN_BASE = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "7px 14px", borderRadius: "8px", fontWeight: "700",
    fontSize: "12px", cursor: "pointer", border: "none",
    transition: "all .15s", whiteSpace: "nowrap",
};

// ─── Field definitions (the ONLY real missing fields) ──────────────────────────
const CONTACT_FIELDS = [
    { key: "phone",     label: "Phone",     aliases: ["phone","phoneNumber","mobile"],        Icon: Phone,     color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
    { key: "email",     label: "Email",     aliases: ["email"],                               Icon: Mail,      color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe" },
    { key: "snapchat",  label: "Snapchat",  aliases: ["snapchat","snapchatHandle","snap"],    Icon: Camera,    color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
    { key: "instagram", label: "Instagram", aliases: ["instagram","instagramHandle","ig"],    Icon: Instagram, color: "#ec4899", bg: "#fdf2f8", border: "#f9a8d4" },
    { key: "telegram",  label: "Telegram",  aliases: ["telegram","telegramHandle","tg"],     Icon: Send,      color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
];

// Extract which contact fields are missing for a player
function getMissingFields(player) {
    return CONTACT_FIELDS.filter(f =>
        f.aliases.every(alias => !player[alias] || String(player[alias]).trim() === "")
    );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 38 }) {
    const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#0ea5e9","#10b981","#14b8a6","#a855f7","#06b6d4"];
    const idx = name ? (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length : 0;
    const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??";
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", background: COLORS[idx],
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontSize: size * 0.36, fontWeight: "800", color: "#fff",
        }}>
            {initials}
        </div>
    );
}

// ─── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
    const map = {
        GOLD:   { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
        SILVER: { bg: "#e0e7ff", color: "#3730a3", border: "#c7d2fe" },
        BRONZE: { bg: "#fed7aa", color: "#9a3412", border: "#fdba74" },
    };
    const s = map[tier] || { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
    return (
        <span style={{ padding: "2px 9px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: "0.3px" }}>
            {tier || "—"}
        </span>
    );
}

// ─── Missing field chips ───────────────────────────────────────────────────────
function FieldChip({ field }) {
    const { Icon, color, bg, border, label } = field;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
            background: bg, border: `1px solid ${border}`, color,
        }}>
            <Icon style={{ width: "10px", height: "10px" }} /> {label}
        </span>
    );
}

// ─── Assign dropdown (admin only) ──────────────────────────────────────────────
function AssignDropdown({ player, onAssign, loading }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const teams = ["Team 1", "Team 2", "Team 3", "Team 4"];

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => setOpen(v => !v)}
                disabled={loading}
                style={{
                    ...BTN_BASE,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    boxShadow: "0 2px 10px #8b5cf655",
                    opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                <Users style={{ width: "12px", height: "12px" }} />
                Assign To
                <ChevronDown style={{ width: "11px", height: "11px", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {open && (
                <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 50,
                    ...CARD, padding: "5px", minWidth: "140px",
                    boxShadow: "0 8px 24px rgba(15,23,42,.14)",
                }}>
                    {teams.map(t => (
                        <button key={t} onClick={() => { setOpen(false); onAssign(player, t); }}
                            style={{ display: "flex", width: "100%", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", borderRadius: "7px", fontSize: "13px", fontWeight: "600", color: "#0f172a", transition: "background .1s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ["#6366f1","#10b981","#f59e0b","#ef4444"][parseInt(t.slice(-1)) - 1] }} />
                            {t}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ player, role, onAssign, onClaim, assigning, claiming, justDone }) {
    const missing = getMissingFields(player);
    const isCritical = missing.length >= 2;
    const isUnassigned = !player.assignedMember && !player.assignedTo;
    const addedDate = player.createdAt
        ? new Date(player.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
        : "—";

    return (
        <div style={{
            ...CARD,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            border: isCritical ? "1px solid #fca5a5" : justDone ? "1px solid #86efac" : "1px solid #e2e8f0",
            background: justDone ? "#f0fdf4" : "#fff",
            transition: "border-color .2s, background .2s",
        }}>
            {/* Header row: avatar + name + tier */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Avatar name={player.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "130px" }}>
                            {player.name}
                        </span>
                        <TierBadge tier={player.tier} />
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        @{player.username || player.email?.split("@")[0] || `id${player.id}`}
                    </div>
                </div>
            </div>

            {/* Assigned member row */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserCheck style={{ width: "12px", height: "12px", color: isUnassigned ? "#f87171" : "#10b981", flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: isUnassigned ? "#f87171" : "#10b981", fontWeight: "600" }}>
                    {isUnassigned
                        ? "No assigned member"
                        : `Assigned: ${player.assignedMember || player.assignedTo}`}
                </span>
            </div>

            {/* Missing fields section */}
            {missing.length > 0 ? (
                <div>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: isCritical ? "#ef4444" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                        Missing Fields ({missing.length})
                        {isCritical && <span style={{ marginLeft: "6px", padding: "1px 5px", background: "#fee2e2", borderRadius: "4px", color: "#ef4444" }}>Critical</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {missing.map(f => <FieldChip key={f.key} field={f} />)}
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <CheckCircle style={{ width: "13px", height: "13px", color: "#10b981" }} />
                    <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>All contact info complete</span>
                </div>
            )}

            {/* Footer: added date + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Clock style={{ width: "11px", height: "11px", color: "#94a3b8" }} />
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Added {addedDate}</span>
                </div>

                <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                    {/* Edit button — always visible */}
                    <button
                        onClick={() => {/* navigate to player edit */}}
                        style={{ ...BTN_BASE, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#374151", padding: "5px 12px" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; }}>
                        <Edit3 style={{ width: "11px", height: "11px" }} /> Edit
                    </button>

                    {justDone ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 11px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", fontWeight: "700", color: "#166534" }}>
                            <CheckCircle style={{ width: "11px", height: "11px" }} /> Done!
                        </span>
                    ) : role === "admin" ? (
                        <AssignDropdown player={player} onAssign={onAssign} loading={assigning === player.id} />
                    ) : role === "member" ? (
                        <button
                            onClick={() => onClaim(player)}
                            disabled={claiming === player.id}
                            style={{
                                ...BTN_BASE,
                                background: claiming === player.id ? "#e2e8f0" : "linear-gradient(135deg,#10b981,#34d399)",
                                color: claiming === player.id ? "#94a3b8" : "#fff",
                                boxShadow: claiming === player.id ? "none" : "0 2px 10px #34d39955",
                                opacity: claiming === player.id ? 0.8 : 1,
                            }}
                            onMouseEnter={e => { if (claiming !== player.id) e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                            <Zap style={{ width: "12px", height: "12px" }} />
                            {claiming === player.id ? "Claiming…" : "Claim"}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// ─── Stat tile ──────────────────────────────────────────────────────────────────
function StatTile({ Icon, label, value, color, bg, border, emphasis }) {
    return (
        <div style={{ ...CARD, padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", border: emphasis ? `1px solid ${border}` : "1px solid #e2e8f0", background: emphasis ? bg : "#fff" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "16px", height: "16px", color }} />
            </div>
            <div>
                <div style={{ fontSize: "22px", fontWeight: "900", color: emphasis ? color : "#0f172a", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px", fontWeight: "600" }}>{label}</div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function MissingPlayerInfoPage() {
    const [players, setPlayers]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState("");
    const [success, setSuccess]       = useState("");
    const [search, setSearch]         = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [assigning, setAssigning]   = useState(null); // player id being assigned
    const [claiming, setClaiming]     = useState(null); // player id being claimed
    const [justDone, setJustDone]     = useState(new Set());
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Role: pull from your auth context / store.
    // Fallback: try api.auth.me(), or accept a prop/context.
    const [role, setRole]             = useState("admin"); // "admin" | "member"
    const [currentUser, setCurrentUser] = useState(null);

    const sseRef = useRef(null);

    // ── Fetch current user & role ─────────────────────────────────────────────
    useEffect(() => {
        const loadMe = async () => {
            try {
                // Try common patterns — adapt to your actual auth endpoint
                const me = await (api.auth?.me?.() || api.users?.me?.() || Promise.resolve(null));
                if (me) {
                    setCurrentUser(me.data || me);
                    setRole((me.data || me).role === "admin" ? "admin" : "member");
                }
            } catch {
                // Keep default role
            }
        };
        loadMe();
    }, []);

    // ── Load ALL players (no server-side filter for missing fields) ────────────
    const loadPlayers = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            // Fetch all pages or a large limit to get complete picture
            const r = await api.players.getPlayers(1, 500, "", "", false);
            const all = r?.data || [];
            // Only keep players with at least 1 missing contact field
            setPlayers(all.filter(p => getMissingFields(p).length > 0));
            setLastRefresh(new Date());
        } catch {
            if (!silent) setError("Failed to load players.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPlayers(); }, [loadPlayers]);

    // ── Auto refresh ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => loadPlayers(true), 15000);
        return () => clearInterval(id);
    }, [autoRefresh, loadPlayers]);

    // ── SSE real-time ─────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const es = new EventSource("/api/tasks/events", { withCredentials: true });
            sseRef.current = es;
            const refresh = () => loadPlayers(true);
            es.addEventListener("task_updated", refresh);
            es.addEventListener("task_created", refresh);
            es.addEventListener("player_updated", refresh);
            es.onerror = () => {}; // silent reconnect
        } catch {}
        return () => { sseRef.current?.close(); };
    }, [loadPlayers]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const critical   = players.filter(p => getMissingFields(p).length >= 2).length;
        const misSnap    = players.filter(p => getMissingFields(p).some(f => f.key === "snapchat")).length;
        const misPhone   = players.filter(p => getMissingFields(p).some(f => f.key === "phone")).length;
        const misEmail   = players.filter(p => getMissingFields(p).some(f => f.key === "email")).length;
        const misIg      = players.filter(p => getMissingFields(p).some(f => f.key === "instagram")).length;
        const misTg      = players.filter(p => getMissingFields(p).some(f => f.key === "telegram")).length;
        const unassigned = players.filter(p => !p.assignedMember && !p.assignedTo).length;
        return { critical, misSnap, misPhone, misEmail, misIg, misTg, unassigned };
    }, [players]);

    // ── Filter tabs ───────────────────────────────────────────────────────────
    const TABS = [
        { id: "all",        label: "All",        count: players.length },
        { id: "critical",   label: "Critical",   count: stats.critical,  dotColor: "#ef4444" },
        { id: "snapchat",   label: "Snapchat",   count: stats.misSnap },
        { id: "phone",      label: "Phone",      count: stats.misPhone },
        { id: "email",      label: "Email",      count: stats.misEmail },
        { id: "instagram",  label: "Instagram",  count: stats.misIg },
        { id: "telegram",   label: "Telegram",   count: stats.misTg },
        { id: "unassigned", label: "Unassigned", count: stats.unassigned },
    ];

    // ── Filtered + searched list ──────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = players;

        if (activeFilter === "critical")   list = list.filter(p => getMissingFields(p).length >= 2);
        else if (activeFilter === "unassigned") list = list.filter(p => !p.assignedMember && !p.assignedTo);
        else if (activeFilter !== "all") {
            list = list.filter(p => getMissingFields(p).some(f => f.key === activeFilter));
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.username || "").toLowerCase().includes(q) ||
                (p.email || "").toLowerCase().includes(q)
            );
        }

        return list;
    }, [players, activeFilter, search]);

    // ── Assign (admin) ────────────────────────────────────────────────────────
    const handleAssign = async (player, teamName) => {
        try {
            setAssigning(player.id);
            // Create a task that represents this assignment — sits in member task page
            await api.tasks.createTask({
                playerId:    player.id,
                playerName:  player.name,
                type:        "missing_info",
                title:       `Complete info for ${player.name}`,
                description: `Missing fields: ${getMissingFields(player).map(f => f.label).join(", ")}`,
                assignedTo:  teamName,
                status:      "pending",
                priority:    getMissingFields(player).length >= 2 ? "high" : "normal",
            });
            setSuccess(`✓ ${player.name} assigned to ${teamName}. Task created in their queue.`);

            // Optimistic: mark as assigned
            setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, assignedTo: teamName } : p));
            setJustDone(prev => new Set([...prev, player.id]));
            setTimeout(() => {
                setJustDone(prev => { const n = new Set(prev); n.delete(player.id); return n; });
                setSuccess("");
            }, 4000);
            loadPlayers(true);
        } catch (e) {
            setError(e?.message || `Failed to assign ${player.name} to ${teamName}.`);
        } finally {
            setAssigning(null);
        }
    };

    // ── Claim (member) ────────────────────────────────────────────────────────
    const handleClaim = async (player) => {
        try {
            setClaiming(player.id);
            const myName = currentUser?.name || currentUser?.username || "You";
            // Create a task assigned to the claiming member
            await api.tasks.createTask({
                playerId:    player.id,
                playerName:  player.name,
                type:        "missing_info",
                title:       `Complete info for ${player.name}`,
                description: `Missing fields: ${getMissingFields(player).map(f => f.label).join(", ")}`,
                assignedTo:  currentUser?.id || myName,
                assignedToName: myName,
                status:      "pending",
                priority:    getMissingFields(player).length >= 2 ? "high" : "normal",
                claimedBy:   currentUser?.id,
            });
            setSuccess(`✓ You claimed ${player.name}. Task added to your task list.`);

            // Optimistic: show as assigned
            setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, assignedMember: myName } : p));
            setJustDone(prev => new Set([...prev, player.id]));
            setTimeout(() => {
                setJustDone(prev => { const n = new Set(prev); n.delete(player.id); return n; });
                setSuccess("");
            }, 4000);
            loadPlayers(true);
        } catch (e) {
            setError(e?.message || `Failed to claim ${player.name}.`);
        } finally {
            setClaiming(null);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#fee2e2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AlertTriangle style={{ width: "22px", height: "22px", color: "#ef4444" }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>Missing Player Info</h1>
                        <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>Players with incomplete or missing contact details</p>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* Role indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "8px", background: role === "admin" ? "#fef3c7" : "#eff6ff", border: `1px solid ${role === "admin" ? "#fde68a" : "#bfdbfe"}` }}>
                        <ShieldAlert style={{ width: "13px", height: "13px", color: role === "admin" ? "#92400e" : "#1d4ed8" }} />
                        <span style={{ fontSize: "11px", fontWeight: "700", color: role === "admin" ? "#92400e" : "#1d4ed8" }}>
                            {role === "admin" ? "Admin" : "Member"} View
                        </span>
                    </div>
                    {/* Live indicator */}
                    <div onClick={() => setAutoRefresh(v => !v)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 11px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", background: autoRefresh ? "#dcfce7" : "#fff" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#cbd5e1", boxShadow: autoRefresh ? "0 0 5px #22c55e" : "none" }} />
                        <span style={{ fontSize: "11px", fontWeight: "700", color: autoRefresh ? "#166534" : "#64748b" }}>Live {autoRefresh ? "ON" : "OFF"}</span>
                    </div>
                    <button onClick={() => loadPlayers()} disabled={loading}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px", color: "#374151" }}>
                        <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                    <span style={{ fontSize: "10px", color: "#cbd5e1" }}>{lastRefresh.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                <StatTile Icon={Users}     label="Total Players"    value={players.length}    color="#0f172a"  bg="#f8fafc"  border="#e2e8f0" />
                <StatTile Icon={AlertTriangle} label="Critical (2+ missing)" value={stats.critical} color="#ef4444" bg="#fee2e2" border="#fca5a5" emphasis={stats.critical > 0} />
                <StatTile Icon={Camera}    label="Missing Snapchat"  value={stats.misSnap}    color="#f59e0b"  bg="#fffbeb"  border="#fde68a" emphasis={stats.misSnap > 0} />
                <StatTile Icon={Phone}     label="Missing Phone"     value={stats.misPhone}   color="#0ea5e9"  bg="#f0f9ff"  border="#bae6fd" emphasis={stats.misPhone > 0} />
                <StatTile Icon={Mail}      label="Missing Email"     value={stats.misEmail}   color="#8b5cf6"  bg="#faf5ff"  border="#ddd6fe" emphasis={stats.misEmail > 0} />
                <StatTile Icon={UserCheck} label="Unassigned"        value={stats.unassigned} color="#f97316"  bg="#fff7ed"  border="#fdba74" emphasis={stats.unassigned > 0} />
            </div>

            {/* ── Alerts ── */}
            {error && (
                <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                    {error}
                    <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}><X style={{ width: "14px", height: "14px" }} /></button>
                </div>
            )}
            {success && (
                <div style={{ padding: "12px 16px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "10px", color: "#166534", fontSize: "13px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <CheckCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                    {success}
                </div>
            )}

            {/* ── Search ── */}
            <div style={{ ...CARD, padding: "0" }}>
                <div style={{ position: "relative" }}>
                    <Search style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#94a3b8", pointerEvents: "none" }} />
                    <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...INPUT, paddingLeft: "46px", paddingRight: search ? "40px" : "16px", border: "none", borderRadius: "14px", padding: "14px 16px 14px 46px", fontSize: "14px", background: "transparent" }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                            <X style={{ width: "15px", height: "15px" }} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filter Tabs ── */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {TABS.map(tab => {
                    const active = activeFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id)}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "7px 14px", borderRadius: "9px", border: "1px solid",
                                fontWeight: "700", fontSize: "12px", cursor: "pointer",
                                transition: "all .15s",
                                borderColor: active ? "#0f172a" : "#e2e8f0",
                                background: active ? "#0f172a" : "#fff",
                                color: active ? "#fff" : "#64748b",
                                boxShadow: active ? "0 2px 8px rgba(15,23,42,.2)" : "none",
                            }}>
                            {tab.dotColor && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: active ? "#fff" : tab.dotColor, display: "inline-block" }} />}
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{ padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800", background: active ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: active ? "#fff" : "#64748b" }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Count line ── */}
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
                Showing {filtered.length} of {players.length} players
                {search && ` matching "${search}"`}
            </div>

            {/* ── Grid ── */}
            {loading ? (
                <div style={{ padding: "80px", textAlign: "center" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#ef4444", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Loading players…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ ...CARD, padding: "60px", textAlign: "center" }}>
                    <CheckCircle style={{ width: "40px", height: "40px", color: "#10b981", margin: "0 auto 12px" }} />
                    <p style={{ color: "#10b981", fontSize: "15px", fontWeight: "700", margin: "0 0 6px" }}>All clear!</p>
                    <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                        {search ? `No players matching "${search}"` : "No players with missing info in this view."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                    {filtered.map(p => (
                        <PlayerCard
                            key={p.id}
                            player={p}
                            role={role}
                            onAssign={handleAssign}
                            onClaim={handleClaim}
                            assigning={assigning}
                            claiming={claiming}
                            justDone={justDone.has(p.id)}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            `}</style>
        </div>
    );
}
