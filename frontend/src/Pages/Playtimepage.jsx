import { useState, useEffect, useRef, useCallback } from "react";
import {
    CheckCircle, AlertCircle, RefreshCw, Search, X, Zap,
    ChevronDown, Gift, Flame, Trophy, Clock, TrendingUp,
    Users, Star, Shield, ChevronLeft, ChevronRight,
} from "lucide-react";
import { api } from "../api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STREAK_TIERS = [
    { days: 2, bonus: 2, color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", label: "Starter" },
    { days: 3, bonus: 3, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", label: "Warming Up" },
    { days: 5, bonus: 5, color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe", label: "On A Roll" },
    { days: 7, bonus: 7, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "Hot Streak" },
    { days: 10, bonus: 15, color: "#f97316", bg: "#fff7ed", border: "#fdba74", label: "Fire" },
    { days: 15, bonus: 28, color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", label: "Blazing" },
    { days: 30, bonus: 38, color: "#10b981", bg: "#f0fdf4", border: "#86efac", label: "Legend", special: true },
];

function getBonusForStreak(streak) {
    if (streak < 2) return null;
    let best = null;
    for (const tier of STREAK_TIERS) {
        if (streak >= tier.days) best = tier;
    }
    return best;
}

function getNextTier(streak) {
    for (const tier of STREAK_TIERS) {
        if (streak < tier.days) return tier;
    }
    return null;
}

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// ─── Shared styles ─────────────────────────────────────────────────────────────

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
    boxShadow: "0 2px 12px rgba(15,23,42,.07)",
};

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 38 }) {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#0ea5e9", "#10b981", "#14b8a6"];
    const idx = name ? name.charCodeAt(0) % colors.length : 0;
    const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??";
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", background: colors[idx],
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: size * 0.35, fontWeight: "700", color: "#fff", letterSpacing: "-0.5px"
        }}>
            {initials}
        </div>
    );
}

// ─── Streak Badge ──────────────────────────────────────────────────────────────

function StreakBadge({ streak }) {
    if (!streak || streak < 2) return <span style={{ color: "#cbd5e1", fontSize: "13px" }}>—</span>;
    const tier = getBonusForStreak(streak);
    if (!tier) return <span style={{ color: "#cbd5e1", fontSize: "13px" }}>—</span>;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px",
            background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: "20px",
            fontSize: "12px", fontWeight: "700", color: tier.color
        }}>
            <Flame style={{ width: "11px", height: "11px" }} />
            {streak} day{streak !== 1 ? "s" : ""}
        </span>
    );
}

// ─── Bonus Guide Panel ──────────────────────────────────────────────────────────

function BonusGuidePanel({ collapsed, onToggle }) {
    return (
        <div style={{
            ...CARD, width: collapsed ? "44px" : "280px", transition: "width 0.25s ease",
            overflow: "hidden", flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: "24px"
        }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer"
            }}
                onClick={onToggle}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <div style={{
                        width: "28px", height: "28px", borderRadius: "8px", background: "#fffbeb",
                        border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                        <Zap style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
                    </div>
                    {!collapsed && <div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap" }}>Playtime Bonus</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap" }}>Always visible for staff</div>
                    </div>}
                </div>
                {!collapsed && <ChevronRight style={{ width: "14px", height: "14px", color: "#94a3b8", flexShrink: 0 }} />}
            </div>

            {!collapsed && (
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {STREAK_TIERS.map(tier => (
                        <div key={tier.days} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 10px", borderRadius: "8px", background: tier.bg, border: `1px solid ${tier.border}`
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                                <Flame style={{ width: "12px", height: "12px", color: tier.color }} />
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>Play {tier.days} days</span>
                                {tier.special && <span style={{ fontSize: "10px", padding: "1px 5px", background: "#dcfce7", borderRadius: "4px", color: "#166534", fontWeight: "700" }}>LEGEND</span>}
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: tier.color }}>${tier.bonus}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: "8px", padding: "10px 12px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #86efac" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", marginBottom: "3px" }}>30-day bonus:</div>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>no cashout limitation</span>
                    </div>
                    <div style={{ marginTop: "4px", padding: "10px 12px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Streak Rules</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", marginTop: "4px", flexShrink: 0 }} />
                            <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
                                <strong style={{ color: "#374151" }}>Streak breaks & resets</strong> if the bonus is redeemed, or if the player <strong style={{ color: "#374151" }}>fails to deposit on any consecutive running day.</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Redeem Modal ───────────────────────────────────────────────────────────────

function RedeemModal({ player, onConfirm, onClose, games, loading }) {
    const [gameId, setGameId] = useState("");
    const [notes, setNotes] = useState("");
    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const tier = getBonusForStreak(streak);

    if (!tier) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }} onClick={onClose} />
            <div style={{ ...CARD, position: "relative", zIndex: 1, padding: "28px 32px", width: "420px", maxWidth: "90vw" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <div style={{
                                width: "32px", height: "32px", borderRadius: "9px", background: tier.bg, border: `1px solid ${tier.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <Flame style={{ width: "16px", height: "16px", color: tier.color }} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Redeem Streak Bonus</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>This will reset the player's streak to 0</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
                        <X style={{ width: "16px", height: "16px" }} />
                    </button>
                </div>

                {/* Player info */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px",
                    background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px"
                }}>
                    <Avatar name={player.name} size={40} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{player.name}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Current balance: <strong style={{ color: "#10b981" }}>{fmt(player.balance)}</strong></div>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "900", color: tier.color }}>+{fmt(tier.bonus)}</div>
                        <StreakBadge streak={streak} />
                    </div>
                </div>

                {/* Game select */}
                <div style={{ marginBottom: "16px" }}>
                    <label style={LABEL}>Game (deduct bonus from) <span style={{ color: "#ef4444" }}>*</span></label>
                    <div style={{ position: "relative" }}>
                        <select value={gameId} onChange={e => setGameId(e.target.value)} style={SELECT}>
                            <option value="">— Select a game —</option>
                            {games.map(g => (
                                <option key={g.id} value={g.id} disabled={g.pointStock < tier.bonus}>
                                    {g.name}  ({(g.pointStock ?? 0).toFixed(0)} pts){g.pointStock < tier.bonus ? " — LOW STOCK" : ""}
                                </option>
                            ))}
                        </select>
                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                    </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: "20px" }}>
                    <label style={LABEL}>Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                        placeholder="Optional notes…"
                        style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} />
                </div>

                {/* Confirm */}
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: "11px", background: "#fff", border: "1px solid #e2e8f0",
                        borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px"
                    }}>Cancel</button>
                    <button disabled={!gameId || loading}
                        onClick={() => onConfirm({ playerId: player.id, gameId, notes, bonusType: "streak", amount: tier.bonus })}
                        style={{
                            flex: 2, padding: "11px", border: "none", borderRadius: "8px", fontWeight: "700",
                            fontSize: "14px", cursor: gameId && !loading ? "pointer" : "not-allowed",
                            background: gameId && !loading ? "#f59e0b" : "#e2e8f0",
                            color: gameId && !loading ? "#fff" : "#94a3b8",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px"
                        }}>
                        {loading ? "Processing…" : <><Flame style={{ width: "15px", height: "15px" }} /> Confirm & Redeem {fmt(tier.bonus)}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Player Row ─────────────────────────────────────────────────────────────────

function PlayerRow({ player, onRedeem, justRedeemed }) {
    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const tier = getBonusForStreak(streak);
    const nextTier = getNextTier(streak);
    const daysToNext = nextTier ? nextTier.days - streak : 0;
    const canRedeem = !!tier;

    return (
        <tr onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background = justRedeemed ? "#f0fdf4" : "transparent"}
            style={{ borderBottom: "1px solid #f1f5f9", background: justRedeemed ? "#f0fdf4" : "transparent", transition: "background .15s" }}>

            {/* Player */}
            <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar name={player.name} size={36} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{player.name}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                            {player.email || player.username || `ID ${player.id}`}
                        </div>
                    </div>
                </div>
            </td>

            {/* Tier */}
            <td style={{ padding: "12px 16px" }}>
                <span style={{
                    display: "inline-block", padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                    background: player.tier === "GOLD" ? "#fef3c7" : player.tier === "SILVER" ? "#e0e7ff" : "#fed7aa",
                    color: player.tier === "GOLD" ? "#92400e" : player.tier === "SILVER" ? "#3730a3" : "#9a3412"
                }}>
                    {player.tier}
                </span>
            </td>

            {/* Balance */}
            <td style={{ padding: "12px 16px" }}>
                <span style={{ fontWeight: "700", fontSize: "13px", color: "#10b981" }}>{fmt(player.balance)}</span>
            </td>

            {/* Streak */}
            <td style={{ padding: "12px 16px" }}>
                <StreakBadge streak={streak} />
            </td>

            {/* Progress */}
            <td style={{ padding: "12px 16px", minWidth: "150px" }}>
                {streak >= 30 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "700", color: "#10b981" }}>
                        <Trophy style={{ width: "12px", height: "12px" }} /> Legend — no limit!
                    </span>
                ) : nextTier ? (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{daysToNext} day{daysToNext !== 1 ? "s" : ""} to ${nextTier.bonus}</span>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{streak}/{nextTier.days}</span>
                        </div>
                        <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{
                                height: "100%", width: `${Math.min(100, (streak / nextTier.days) * 100)}%`,
                                background: nextTier.color, borderRadius: "2px", transition: "width 0.3s"
                            }} />
                        </div>
                    </div>
                ) : (
                    <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
                )}
            </td>

            {/* Bonus available */}
            <td style={{ padding: "12px 16px" }}>
                {tier ? (
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px",
                        background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: "6px",
                        fontSize: "12px", fontWeight: "800", color: tier.color
                    }}>
                        +{fmt(tier.bonus)}
                    </span>
                ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>None yet</span>}
            </td>

            {/* Last played */}
            <td style={{ padding: "12px 16px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {player?.streak?.lastPlayedDate || player?.lastPlayedDate
                        ? (player.streak?.lastPlayedDate || player.lastPlayedDate)
                        : "—"}
                </span>
            </td>

            {/* Action */}
            <td style={{ padding: "12px 16px" }}>
                {justRedeemed ? (
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px",
                        background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px",
                        fontSize: "12px", fontWeight: "700", color: "#166534"
                    }}>
                        <CheckCircle style={{ width: "12px", height: "12px" }} /> Redeemed
                    </span>
                ) : canRedeem ? (
                    <button onClick={() => onRedeem(player)}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px",
                            background: "linear-gradient(135deg, #f59e0b, #f97316)", border: "none", borderRadius: "8px",
                            color: "#fff", fontWeight: "700", fontSize: "12px", cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(245,158,11,0.4)", transition: "all .15s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,158,11,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(245,158,11,0.4)"; }}>
                        <Flame style={{ width: "12px", height: "12px" }} /> Redeem
                    </button>
                ) : (
                    <span style={{ color: "#cbd5e1", fontSize: "12px" }}>No Action</span>
                )}
            </td>
        </tr>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function PlaytimePage() {
    const [players, setPlayers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all"); // all | eligible | ineligible
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [games, setGames] = useState([]);
    const [redeemTarget, setRedeemTarget] = useState(null);
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [justRedeemed, setJustRedeemed] = useState(new Set());
    const [guideCollapsed, setGuideCollapsed] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [stats, setStats] = useState({ eligible: 0, legendary: 0, total: 0 });

    const searchRef = useRef(null);
    const sseRef = useRef(null);

    // ── Data loading ────────────────────────────────────────────────────────────

    const loadPlayers = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const r = await api.players.getPlayers(page, limit, search, "", true);
            const data = r?.data || [];
            setPlayers(data);
            setTotal(r?.pagination?.total || 0);
            setLastRefresh(new Date());

            // Compute stats
            const eligible = data.filter(p => {
                const streak = p?.streak?.currentStreak ?? p?.currentStreak ?? 0;
                return getBonusForStreak(streak) !== null;
            });
            const legendary = data.filter(p => {
                const streak = p?.streak?.currentStreak ?? p?.currentStreak ?? 0;
                return streak >= 30;
            });
            setStats({ eligible: eligible.length, legendary: legendary.length, total: r?.pagination?.total || 0 });
        } catch (e) {
            setError("Failed to load players.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    const loadGames = useCallback(async () => {
        try {
            const r = await api.games.getGames(true, { status: "", search: "" });
            setGames(r?.data || []);
        } catch { }
    }, []);

    useEffect(() => { loadPlayers(); loadGames(); }, [loadPlayers, loadGames]);

    // ── Auto refresh ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => loadPlayers(true), 15000);
        return () => clearInterval(id);
    }, [autoRefresh, loadPlayers]);

    // ── SSE for real-time updates ───────────────────────────────────────────────

    useEffect(() => {
        try {
            const token = document.cookie.match(/token=([^;]+)/)?.[1] ||
                localStorage.getItem("token") || "";
            const url = `/api/tasks/events${token ? `?token=${token}` : ""}`;
            const es = new EventSource(url, { withCredentials: true });
            sseRef.current = es;
            es.addEventListener("task_updated", () => loadPlayers(true));
            es.onerror = () => { };
        } catch { }
        return () => { sseRef.current?.close(); };
    }, [loadPlayers]);

    // ── Search debounce ─────────────────────────────────────────────────────────

    useEffect(() => {
        setPage(1);
    }, [search]);

    // ── Redeem ──────────────────────────────────────────────────────────────────

    const handleRedeem = async ({ playerId, gameId, notes, amount }) => {
        try {
            setRedeemLoading(true);
            await api.bonuses.grantBonus({ playerId, amount, gameId, notes, bonusType: "streak" });
            setSuccess(`✓ Streak bonus redeemed for ${redeemTarget?.name}! Streak has been reset.`);
            setJustRedeemed(prev => new Set([...prev, playerId]));
            setRedeemTarget(null);
            api.clearCache?.();
            await Promise.all([loadPlayers(true), loadGames()]);
            setTimeout(() => {
                setJustRedeemed(prev => { const n = new Set(prev); n.delete(playerId); return n; });
                setSuccess("");
            }, 4000);
        } catch (e) {
            setError(e.message || "Failed to redeem bonus.");
        } finally {
            setRedeemLoading(false);
        }
    };

    // ── Filtered players ────────────────────────────────────────────────────────

    const filteredPlayers = players.filter(p => {
        const streak = p?.streak?.currentStreak ?? p?.currentStreak ?? 0;
        const eligible = getBonusForStreak(streak) !== null;
        if (filter === "eligible") return eligible;
        if (filter === "ineligible") return !eligible;
        return true;
    });

    const pages = Math.ceil(total / limit) || 1;

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "inherit" }}>

            {/* ── Header Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                {[
                    { icon: Users, label: "Total Players", value: stats.total, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
                    { icon: Flame, label: "Eligible for Bonus", value: stats.eligible, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                    { icon: Trophy, label: "Legend (30-day)", value: stats.legendary, color: "#10b981", bg: "#f0fdf4", border: "#86efac" },
                ].map(({ icon: Icon, label, value, color, bg, border }) => (
                    <div key={label} style={{ ...CARD, padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                            width: "40px", height: "40px", borderRadius: "10px", background: bg, border: `1px solid ${border}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <Icon style={{ width: "18px", height: "18px", color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", fontWeight: "600" }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main layout ── */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

                {/* ── Table Card ── */}
                <div style={{ ...CARD, flex: 1, minWidth: 0, overflow: "hidden" }}>

                    {/* Toolbar */}
                    <div style={{
                        padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Playtime Directory</h3>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                                Total Players: {total} · Showing {filteredPlayers.length}
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            {/* Search */}
                            <div style={{ position: "relative" }}>
                                <Search style={{
                                    position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                                    width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none"
                                }} />
                                <input ref={searchRef} type="text" placeholder="Search players…"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ ...INPUT, paddingLeft: "32px", width: "200px", padding: "8px 12px 8px 32px" }} />
                                {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                                    <X style={{ width: "13px", height: "13px" }} />
                                </button>}
                            </div>

                            {/* Filter */}
                            <div style={{ position: "relative" }}>
                                <select value={filter} onChange={e => setFilter(e.target.value)}
                                    style={{ ...SELECT, width: "150px", padding: "8px 28px 8px 10px", fontSize: "13px" }}>
                                    <option value="all">All Players</option>
                                    <option value="eligible">🔥 Eligible</option>
                                    <option value="ineligible">— Not Eligible</option>
                                </select>
                                <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none" }} />
                            </div>

                            {/* Auto refresh toggle */}
                            <div onClick={() => setAutoRefresh(!autoRefresh)}
                                style={{
                                    padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0",
                                    background: autoRefresh ? "#dcfce7" : "#fff", color: autoRefresh ? "#166534" : "#64748b",
                                    fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px"
                                }}>
                                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#cbd5e1" }} />
                                Live {autoRefresh ? "ON" : "OFF"}
                            </div>

                            <button onClick={() => loadPlayers()} disabled={loading}
                                style={{
                                    background: "none", border: "1px solid #e2e8f0", borderRadius: "8px",
                                    padding: "7px 12px", cursor: "pointer", color: "#64748b",
                                    display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600"
                                }}>
                                <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} />
                                Refresh
                            </button>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{lastRefresh.toLocaleTimeString()}</span>
                        </div>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div style={{
                            margin: "12px 20px 0", padding: "11px 14px", background: "#fee2e2",
                            border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b",
                            fontSize: "13px", display: "flex", gap: "8px", alignItems: "center"
                        }}>
                            <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                            <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}><X style={{ width: "13px", height: "13px" }} /></button>
                        </div>
                    )}
                    {success && (
                        <div style={{
                            margin: "12px 20px 0", padding: "11px 14px", background: "#dcfce7",
                            border: "1px solid #86efac", borderRadius: "8px", color: "#166534",
                            fontSize: "13px", display: "flex", gap: "8px", alignItems: "center"
                        }}>
                            <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}
                        </div>
                    )}

                    {/* Table */}
                    {loading ? (
                        <div style={{ padding: "56px", textAlign: "center" }}>
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #e2e8f0",
                                borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
                            }} />
                            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Loading players…</p>
                        </div>
                    ) : filteredPlayers.length === 0 ? (
                        <div style={{ padding: "56px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            {search ? `No players found for "${search}"` : "No players found"}
                        </div>
                    ) : (
                        <div style={{
                            overflowX: "auto", overflowY: "auto", maxHeight: "580px",
                            scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f8fafc"
                        }}>
                            <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr style={{ background: "#f8fafc" }}>
                                        {["Player", "Tier", "Balance", "Streak", "Progress", "Bonus", "Last Played", "Action"].map(col => (
                                            <th key={col} style={{
                                                textAlign: "left", padding: "10px 16px",
                                                fontWeight: "700", color: "#64748b", fontSize: "11px",
                                                textTransform: "uppercase", letterSpacing: "0.4px",
                                                borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", background: "#f8fafc"
                                            }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPlayers.map((p, i) => (
                                        <PlayerRow
                                            key={p.id ?? i}
                                            player={p}
                                            onRedeem={setRedeemTarget}
                                            justRedeemed={justRedeemed.has(p.id)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && pages > 1 && (
                        <div style={{
                            padding: "12px 20px", borderTop: "1px solid #f1f5f9",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                Page {page} of {pages} · {total} total
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    style={{
                                        padding: "6px 12px", borderRadius: "7px", border: "1px solid #e2e8f0",
                                        background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer",
                                        color: page === 1 ? "#cbd5e1" : "#374151", fontWeight: "600",
                                        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px"
                                    }}>
                                    <ChevronLeft style={{ width: "13px", height: "13px" }} /> Prev
                                </button>
                                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                                    const pg = page <= 3 ? i + 1 : page + i - 2;
                                    if (pg < 1 || pg > pages) return null;
                                    return (
                                        <button key={pg} onClick={() => setPage(pg)}
                                            style={{
                                                padding: "6px 11px", borderRadius: "7px",
                                                border: `1px solid ${pg === page ? "#0ea5e9" : "#e2e8f0"}`,
                                                background: pg === page ? "#f0f9ff" : "#fff",
                                                color: pg === page ? "#0ea5e9" : "#374151",
                                                fontWeight: pg === page ? "700" : "500",
                                                cursor: "pointer", fontSize: "12px"
                                            }}>
                                            {pg}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                                    style={{
                                        padding: "6px 12px", borderRadius: "7px", border: "1px solid #e2e8f0",
                                        background: "#fff", cursor: page === pages ? "not-allowed" : "pointer",
                                        color: page === pages ? "#cbd5e1" : "#374151", fontWeight: "600",
                                        display: "flex", alignItems: "center", gap: "4px", fontSize: "12px"
                                    }}>
                                    Next <ChevronRight style={{ width: "13px", height: "13px" }} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bonus Guide ── */}
                <BonusGuidePanel collapsed={guideCollapsed} onToggle={() => setGuideCollapsed(!guideCollapsed)} />
            </div>

            {/* ── Redeem Modal ── */}
            {redeemTarget && (
                <RedeemModal
                    player={redeemTarget}
                    games={games}
                    loading={redeemLoading}
                    onConfirm={handleRedeem}
                    onClose={() => setRedeemTarget(null)}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}

export default PlaytimePage;