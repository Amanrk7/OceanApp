import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    CheckCircle, AlertCircle, RefreshCw, Search, X, Zap,
    ChevronDown, Flame, Trophy, ChevronLeft, ChevronRight,
    Calendar, Gamepad2, TrendingUp, Users, RotateCcw, Star,
} from "lucide-react";
import { api } from "../api";

// ─── Streak Tiers (from guide) ────────────────────────────────────────────────
const STREAK_TIERS = [
    { days: 2,  bonus: 2,  label: "Starter",    color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", ring: "#94a3b8" },
    { days: 3,  bonus: 3,  label: "Warming Up", color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", ring: "#38bdf8" },
    { days: 5,  bonus: 5,  label: "On A Roll",  color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe", ring: "#a78bfa" },
    { days: 7,  bonus: 7,  label: "Hot Streak", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", ring: "#fbbf24" },
    { days: 10, bonus: 15, label: "Fire",        color: "#f97316", bg: "#fff7ed", border: "#fdba74", ring: "#fb923c" },
    { days: 15, bonus: 28, label: "Blazing",     color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", ring: "#f87171" },
    { days: 30, bonus: 38, label: "LEGEND",      color: "#10b981", bg: "#f0fdf4", border: "#86efac", ring: "#34d399", special: true },
];

function getEarnedTier(streak) {
    if (!streak || streak < 2) return null;
    let best = null;
    for (const t of STREAK_TIERS) { if (streak >= t.days) best = t; }
    return best;
}

function getNextTier(streak) {
    for (const t of STREAK_TIERS) { if (streak < t.days) return t; }
    return null;
}

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// ─── Shared styles (matching AddTransactions) ─────────────────────────────────
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
function Avatar({ name, size = 36 }) {
    const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#0ea5e9","#10b981","#14b8a6","#a855f7","#06b6d4"];
    const idx = name ? (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length : 0;
    const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??";
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", background: COLORS[idx],
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontSize: size * 0.36, fontWeight: "800", color: "#fff", letterSpacing: "-0.5px",
        }}>
            {initials}
        </div>
    );
}

// ─── Streak Pill ───────────────────────────────────────────────────────────────
function StreakPill({ streak }) {
    const tier = getEarnedTier(streak);
    if (!streak || streak < 1) return <span style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: "500" }}>No streak</span>;
    if (streak < 2) return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>
            <Flame style={{ width: "11px", height: "11px" }} /> {streak} day
        </span>
    );
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px",
            borderRadius: "20px", fontWeight: "800", fontSize: "12px",
            background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
        }}>
            <Flame style={{ width: "12px", height: "12px" }} />
            {streak} day{streak !== 1 ? "s" : ""}
            {tier.special && <Star style={{ width: "10px", height: "10px" }} />}
        </span>
    );
}

// ─── Game Chips ────────────────────────────────────────────────────────────────
const GAME_COLORS = [
    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    { bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8" },
    { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
    { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    { bg: "#fefce8", border: "#fde047", text: "#713f12" },
    { bg: "#fce7f3", border: "#f9a8d4", text: "#831843" },
];
const gameColor = (name) => GAME_COLORS[(name?.charCodeAt(0) || 0) % GAME_COLORS.length];

function GameChips({ games, loading }) {
    if (loading) return (
        <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#0ea5e9", animation: "spin 0.7s linear infinite" }} />
    );
    if (!games || games.length === 0) return <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>;
    const shown = games.slice(0, 2);
    const rest = games.length - 2;
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
            {shown.map(g => {
                const c = gameColor(g);
                return (
                    <span key={g} style={{
                        display: "inline-flex", alignItems: "center", gap: "3px",
                        padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
                        background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap",
                    }}>
                        <Gamepad2 style={{ width: "10px", height: "10px" }} /> {g}
                    </span>
                );
            })}
            {rest > 0 && <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>+{rest}</span>}
        </div>
    );
}

// ─── Streak Progress Bar ────────────────────────────────────────────────────────
function StreakProgress({ streak }) {
    if (streak >= 30) return (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Trophy style={{ width: "12px", height: "12px", color: "#10b981" }} />
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981" }}>Legend! No cashout limit</span>
        </div>
    );
    const next = getNextTier(streak);
    if (!next) return null;
    const pct = Math.min(100, Math.round((streak / next.days) * 100));
    const daysLeft = next.days - streak;
    return (
        <div style={{ minWidth: "130px", maxWidth: "200px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "500" }}>{daysLeft}d to ${next.bonus}</span>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>{streak}/{next.days}</span>
            </div>
            <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: next.color, borderRadius: "3px", transition: "width 0.4s ease", boxShadow: `0 0 6px ${next.ring}88` }} />
            </div>
        </div>
    );
}

// ─── Bonus Guide Sidebar ────────────────────────────────────────────────────────
function BonusGuide({ open, onClose }) {
    if (!open) return null;
    return (
        <div style={{ ...CARD, width: "264px", minWidth: "264px", flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: "0", overflow: "hidden" }}>
            <div style={{ padding: "13px 15px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Zap style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>Playtime Bonus</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>Always visible for staff</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px" }}>
                    <X style={{ width: "14px", height: "14px" }} />
                </button>
            </div>
            <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: "5px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                {STREAK_TIERS.map(t => (
                    <div key={t.days} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", background: t.bg, border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Flame style={{ width: "12px", height: "12px", color: t.color }} />
                            <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>Play {t.days} days</span>
                            {t.special && <span style={{ fontSize: "9px", padding: "1px 5px", background: "#dcfce7", borderRadius: "4px", color: "#166534", fontWeight: "800" }}>LEGEND</span>}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "900", color: t.color }}>${t.bonus}</span>
                    </div>
                ))}
                <div style={{ marginTop: "4px", padding: "9px 11px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", marginBottom: "2px" }}>30-day bonus:</div>
                    <span style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>no cashout limitation</span>
                </div>
                <div style={{ padding: "9px 11px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: "#374151", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Streak Rules</div>
                    <div style={{ display: "flex", gap: "7px", alignItems: "flex-start" }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#94a3b8", marginTop: "5px", flexShrink: 0 }} />
                        <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.65" }}>
                            <strong style={{ color: "#374151" }}>Streak breaks & resets</strong> if the bonus is redeemed, or if the player <strong style={{ color: "#374151" }}>fails to deposit on any consecutive running day.</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Redeem Modal ───────────────────────────────────────────────────────────────
function RedeemModal({ player, tier, games, loading, onConfirm, onClose }) {
    const [gameId, setGameId] = useState("");
    const [notes, setNotes]   = useState("");
    const streak   = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const selGame  = games.find(g => String(g.id) === String(gameId));
    const stockOk  = !selGame || selGame.pointStock >= tier.bonus;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }} onClick={onClose} />
            <div style={{ ...CARD, position: "relative", zIndex: 1, padding: "28px 32px", width: "440px", maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: tier.bg, border: `1px solid ${tier.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Flame style={{ width: "16px", height: "16px", color: tier.color }} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>Redeem Streak Bonus</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Streak resets to 0 after redemption — cannot be undone</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
                        <X style={{ width: "16px", height: "16px" }} />
                    </button>
                </div>

                {/* Player card */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <Avatar name={player.name} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>{player.name}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Balance: <strong style={{ color: "#10b981" }}>{fmt(player.balance)}</strong>
                            {" · "}After: <strong style={{ color: "#10b981" }}>{fmt(parseFloat(player.balance || 0) + tier.bonus)}</strong>
                        </div>
                        <div style={{ marginTop: "5px" }}><StreakPill streak={streak} /></div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "28px", fontWeight: "900", color: tier.color, lineHeight: 1 }}>+{fmt(tier.bonus)}</div>
                        <div style={{ fontSize: "11px", color: tier.color, fontWeight: "700", marginTop: "2px" }}>{tier.label}</div>
                    </div>
                </div>

                {/* Reset warning */}
                <div style={{ padding: "10px 13px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", marginBottom: "18px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <RotateCcw style={{ width: "13px", height: "13px", color: "#92400e", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>
                        After redemption, <strong>{player.name}</strong>'s streak resets from <strong>{streak} → 0 days</strong>
                    </span>
                </div>

                {/* Game select */}
                <div style={{ marginBottom: "16px" }}>
                    <label style={LABEL}>Deduct from Game <span style={{ color: "#ef4444" }}>*</span></label>
                    <div style={{ position: "relative" }}>
                        <select value={gameId} onChange={e => setGameId(e.target.value)}
                            style={{ ...SELECT, borderColor: !gameId ? "#fca5a5" : stockOk ? "#86efac" : "#fca5a5" }}>
                            <option value="">— Select a game —</option>
                            {games.map(g => (
                                <option key={g.id} value={g.id} disabled={g.pointStock < tier.bonus}>
                                    {g.name}  ({(g.pointStock ?? 0).toFixed(0)} pts){g.pointStock < tier.bonus ? " — LOW STOCK" : ""}
                                </option>
                            ))}
                        </select>
                        <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                    </div>
                    {selGame && (
                        <p style={{ marginTop: "6px", fontSize: "12px", fontWeight: "600", color: stockOk ? "#16a34a" : "#dc2626" }}>
                            {stockOk
                                ? `✓ ${selGame.name}: ${selGame.pointStock.toFixed(0)} pts → ${(selGame.pointStock - tier.bonus).toFixed(0)} pts after`
                                : `⚠ Only ${selGame.pointStock.toFixed(0)} pts — need ${tier.bonus} pts`}
                        </p>
                    )}
                </div>

                {/* Notes */}
                <div style={{ marginBottom: "22px" }}>
                    <label style={LABEL}>Notes <span style={{ fontWeight: 400, fontSize: "10px", color: "#94a3b8" }}>optional</span></label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                        placeholder="Any notes about this redemption…"
                        style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={onClose} disabled={loading}
                        style={{ flex: 1, padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                        Cancel
                    </button>
                    <button
                        disabled={!gameId || !stockOk || loading}
                        onClick={() => onConfirm({ playerId: player.id, gameId, notes, amount: tier.bonus, bonusType: "streak" })}
                        style={{
                            flex: 2, padding: "12px", border: "none", borderRadius: "8px", fontWeight: "700",
                            fontSize: "14px", cursor: (gameId && stockOk && !loading) ? "pointer" : "not-allowed",
                            background: (gameId && stockOk && !loading) ? `linear-gradient(135deg, ${tier.color}, ${tier.ring})` : "#e2e8f0",
                            color: (gameId && stockOk && !loading) ? "#fff" : "#94a3b8",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                            boxShadow: (gameId && stockOk && !loading) ? `0 4px 14px ${tier.ring}55` : "none",
                            transition: "all .15s",
                        }}>
                        {loading ? "⏳ Processing…" : <><Flame style={{ width: "15px", height: "15px" }} /> Confirm & Redeem {fmt(tier.bonus)}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Player Row ─────────────────────────────────────────────────────────────────
function PlayerRow({ player, depositGames, gamesLoading, onRedeem, justRedeemed }) {
    const streak    = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const tier      = getEarnedTier(streak);
    const canRedeem = !!tier;
    const lastPlayed = player?.streak?.lastPlayedDate || player?.lastPlayedDate;

    return (
        <tr
            onMouseEnter={e => { if (!justRedeemed) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { e.currentTarget.style.background = justRedeemed ? "#f0fdf4" : "transparent"; }}
            style={{ borderBottom: "1px solid #f1f5f9", background: justRedeemed ? "#f0fdf4" : "transparent", transition: "background .12s" }}>

            {/* Player */}
            <td style={{ padding: "11px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Avatar name={player.name} size={34} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>{player.name}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>
                            {player.email || player.username || `ID ${player.id}`}
                        </div>
                    </div>
                </div>
            </td>

            {/* Tier */}
            <td style={{ padding: "11px 12px" }}>
                <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: player.tier === "GOLD" ? "#fef3c7" : player.tier === "SILVER" ? "#e0e7ff" : "#fed7aa", color: player.tier === "GOLD" ? "#92400e" : player.tier === "SILVER" ? "#3730a3" : "#9a3412" }}>
                    {player.tier}
                </span>
            </td>

            {/* Balance */}
            <td style={{ padding: "11px 12px" }}>
                <span style={{ fontWeight: "700", fontSize: "13px", color: "#10b981" }}>{fmt(player.balance)}</span>
            </td>

            {/* Streak */}
            <td style={{ padding: "11px 12px" }}>
                <StreakPill streak={streak} />
            </td>

            {/* Progress */}
            <td style={{ padding: "11px 12px" }}>
                <StreakProgress streak={streak} />
            </td>

            {/* Last deposit date */}
            <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Calendar style={{ width: "11px", height: "11px", color: "#94a3b8" }} />
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>{lastPlayed || "—"}</span>
                </div>
            </td>

            {/* Games deposited to */}
            <td style={{ padding: "11px 12px", minWidth: "155px" }}>
                <GameChips games={depositGames} loading={gamesLoading} />
            </td>

            {/* Bonus earned */}
            <td style={{ padding: "11px 12px" }}>
                {tier ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 11px", borderRadius: "7px", background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color, fontSize: "13px", fontWeight: "900" }}>
                        +{fmt(tier.bonus)}
                    </span>
                ) : (
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>—</span>
                )}
            </td>

            {/* Action — rightmost column */}
            <td style={{ padding: "11px 16px", textAlign: "right" }}>
                {justRedeemed ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 13px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", fontWeight: "700", color: "#166534", whiteSpace: "nowrap" }}>
                        <CheckCircle style={{ width: "12px", height: "12px" }} /> Redeemed!
                    </span>
                ) : canRedeem ? (
                    <button
                        onClick={() => onRedeem(player)}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px",
                            border: "none", borderRadius: "8px",
                            background: `linear-gradient(135deg, ${tier.color}, ${tier.ring})`,
                            color: "#fff", fontWeight: "700", fontSize: "12px", cursor: "pointer",
                            boxShadow: `0 2px 10px ${tier.ring}55`, whiteSpace: "nowrap",
                            transition: "all .15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 5px 16px ${tier.ring}77`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 2px 10px ${tier.ring}55`; }}>
                        <Flame style={{ width: "13px", height: "13px" }} />
                        Redeem {fmt(tier.bonus)}
                    </button>
                ) : (
                    <span style={{ fontSize: "12px", color: "#cbd5e1", whiteSpace: "nowrap" }}>No Action</span>
                )}
            </td>
        </tr>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PlaytimePage() {
    const [players, setPlayers]               = useState([]);
    const [total, setTotal]                   = useState(0);
    const [page, setPage]                     = useState(1);
    const LIMIT = 20;
    const [search, setSearch]                 = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filter, setFilter]                 = useState("all");
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState("");
    const [success, setSuccess]               = useState("");
    const [games, setGames]                   = useState([]);
    const [redeemTarget, setRedeemTarget]     = useState(null);
    const [redeemTier, setRedeemTier]         = useState(null);
    const [redeemLoading, setRedeemLoading]   = useState(false);
    const [justRedeemed, setJustRedeemed]     = useState(new Set());
    const [guideOpen, setGuideOpen]           = useState(true);
    const [autoRefresh, setAutoRefresh]       = useState(true);
    const [lastRefresh, setLastRefresh]       = useState(new Date());

    // Per-player deposit games cache
    const [playerGames, setPlayerGames]           = useState({}); // id → string[]
    const [playerGamesLoading, setPlayerGamesLoading] = useState(new Set());
    const detailCache = useRef({});
    const sseRef = useRef(null);

    // ── Debounce search ─────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // ── Load players ────────────────────────────────────────────────────────────
    const loadPlayers = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const r = await api.players.getPlayers(page, LIMIT, debouncedSearch, "", true);
            const data = r?.data || [];
            setPlayers(data);
            setTotal(r?.pagination?.total || 0);
            setLastRefresh(new Date());
        } catch {
            if (!silent) setError("Failed to load players.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { loadPlayers(); }, [loadPlayers]);

    // ── Batch-fetch player game data ────────────────────────────────────────────
    useEffect(() => {
        if (!players.length) return;
        const toFetch = players.filter(p => !detailCache.current[p.id]);
        if (!toFetch.length) {
            const snap = {};
            players.forEach(p => { snap[p.id] = detailCache.current[p.id] || []; });
            setPlayerGames(snap);
            return;
        }

        const ids = toFetch.map(p => p.id);
        setPlayerGamesLoading(new Set(ids));

        Promise.allSettled(ids.map(id => api.players.getPlayer(id))).then(results => {
            const updated = { ...detailCache.current };
            results.forEach((res, i) => {
                const detail = res.status === "fulfilled" ? res.value?.data : null;
                if (detail) {
                    // Extract unique games from deposit transactions
                    const seen = new Set();
                    const gs = (detail.transactionHistory || [])
                        .filter(t => (t.type === "deposit" || t.type === "Deposit") && t.gameName)
                        .map(t => t.gameName)
                        .filter(g => { if (seen.has(g)) return false; seen.add(g); return true; });
                    updated[ids[i]] = gs;
                } else {
                    updated[ids[i]] = [];
                }
            });
            detailCache.current = updated;
            const snap = {};
            players.forEach(p => { snap[p.id] = updated[p.id] || []; });
            setPlayerGames(snap);
            setPlayerGamesLoading(new Set());
        });
    }, [players]);

    // ── Load games list ─────────────────────────────────────────────────────────
    const loadGames = useCallback(async () => {
        try {
            const r = await api.games.getGames(true, { status: "", search: "" });
            setGames(r?.data || []);
        } catch {}
    }, []);

    useEffect(() => { loadGames(); }, [loadGames]);

    // ── Auto refresh ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => loadPlayers(true), 12000);
        return () => clearInterval(id);
    }, [autoRefresh, loadPlayers]);

    // ── SSE real-time ───────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const es = new EventSource("/api/tasks/events", { withCredentials: true });
            sseRef.current = es;
            const refresh = () => {
                detailCache.current = {};
                loadPlayers(true);
            };
            es.addEventListener("task_updated", refresh);
            es.addEventListener("task_created", refresh);
            es.onerror = () => {};
        } catch {}
        return () => { sseRef.current?.close(); };
    }, [loadPlayers]);

    // ── Stats ───────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const eligible  = players.filter(p => getEarnedTier(p?.streak?.currentStreak ?? p?.currentStreak ?? 0) !== null).length;
        const legendary = players.filter(p => (p?.streak?.currentStreak ?? p?.currentStreak ?? 0) >= 30).length;
        const streaks   = players.map(p => p?.streak?.currentStreak ?? p?.currentStreak ?? 0);
        const avg = streaks.length ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0;
        return { eligible, legendary, avg };
    }, [players]);

    // ── Filtered players ────────────────────────────────────────────────────────
    const filtered = useMemo(() => players.filter(p => {
        const streak = p?.streak?.currentStreak ?? p?.currentStreak ?? 0;
        if (filter === "eligible") return getEarnedTier(streak) !== null;
        if (filter === "ineligible") return getEarnedTier(streak) === null;
        return true;
    }), [players, filter]);

    const pages = Math.ceil(total / LIMIT) || 1;

    // ── Redeem ──────────────────────────────────────────────────────────────────
    const openRedeem = useCallback((player) => {
        const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
        const tier = getEarnedTier(streak);
        if (!tier) return;
        setRedeemTarget(player);
        setRedeemTier(tier);
    }, []);

    const handleConfirmRedeem = async ({ playerId, gameId, notes, amount, bonusType }) => {
        try {
            setRedeemLoading(true);
            await api.bonuses.grantBonus({ playerId, amount, gameId, notes, bonusType });

            // Optimistic update — reset streak immediately in local state
            setPlayers(prev => prev.map(p =>
                p.id === playerId
                    ? { ...p, streak: { ...(p.streak || {}), currentStreak: 0, lastPlayedDate: null }, currentStreak: 0, lastPlayedDate: null }
                    : p
            ));
            // Invalidate detail cache for this player so games re-fetch
            delete detailCache.current[playerId];

            setSuccess(`✓ ${fmt(amount)} streak bonus redeemed for ${redeemTarget?.name}. Streak has been reset to 0.`);
            setJustRedeemed(prev => new Set([...prev, playerId]));
            setRedeemTarget(null);
            setRedeemTier(null);
            api.clearCache?.();

            await Promise.all([loadPlayers(true), loadGames()]);

            setTimeout(() => {
                setJustRedeemed(prev => { const n = new Set(prev); n.delete(playerId); return n; });
                setSuccess("");
            }, 5000);
        } catch (e) {
            setError(e.message || "Failed to redeem bonus.");
        } finally {
            setRedeemLoading(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* ── Stat Strip ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "12px" }}>
                {[
                    { Icon: Users,      label: "Total Players",     value: total,           color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
                    { Icon: Flame,      label: "Eligible for Bonus", value: stats.eligible,  color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                    { Icon: Trophy,     label: "Legend (30-day)",   value: stats.legendary,  color: "#10b981", bg: "#f0fdf4", border: "#86efac" },
                    { Icon: TrendingUp, label: "Avg Streak (page)",  value: `${stats.avg}d`, color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe" },
                ].map(({ Icon, label, value, color, bg, border }) => (
                    <div key={label} style={{ ...CARD, padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon style={{ width: "17px", height: "17px", color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px", fontWeight: "600" }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main ── */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>

                {/* ── Table Card ── */}
                <div style={{ ...CARD, flex: 1, minWidth: 0, overflow: "hidden" }}>

                    {/* Toolbar */}
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                            <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>Playtime Directory</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>Streak = consecutive daily deposits · Redeem → streak resets to 0</div>
                        </div>

                        {/* Search */}
                        <div style={{ position: "relative", flex: "0 0 auto" }}>
                            <Search style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none" }} />
                            <input type="text" placeholder="Search players…" value={search} onChange={e => setSearch(e.target.value)}
                                style={{ ...INPUT, paddingLeft: "30px", paddingRight: search ? "30px" : "12px", width: "175px", padding: "8px 12px 8px 30px", fontSize: "12px" }} />
                            {search && (
                                <button onClick={() => setSearch("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                                    <X style={{ width: "13px", height: "13px" }} />
                                </button>
                            )}
                        </div>

                        {/* Filter */}
                        <div style={{ position: "relative", flex: "0 0 auto" }}>
                            <select value={filter} onChange={e => setFilter(e.target.value)}
                                style={{ ...SELECT, width: "140px", padding: "8px 26px 8px 10px", fontSize: "12px" }}>
                                <option value="all">All Players</option>
                                <option value="eligible">🔥 Eligible</option>
                                <option value="ineligible">— Not Eligible</option>
                            </select>
                            <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "#94a3b8", pointerEvents: "none" }} />
                        </div>

                        {/* Live */}
                        <div onClick={() => setAutoRefresh(v => !v)}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", background: autoRefresh ? "#dcfce7" : "#fff", flexShrink: 0 }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#cbd5e1", boxShadow: autoRefresh ? "0 0 5px #22c55e" : "none" }} />
                            <span style={{ fontSize: "11px", fontWeight: "700", color: autoRefresh ? "#166534" : "#64748b" }}>Live {autoRefresh ? "ON" : "OFF"}</span>
                        </div>

                        <button onClick={() => { loadPlayers(); loadGames(); }} disabled={loading}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#64748b", fontSize: "12px", fontWeight: "600", flexShrink: 0 }}>
                            <RefreshCw style={{ width: "12px", height: "12px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
                        </button>

                        <button onClick={() => setGuideOpen(v => !v)}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", border: `1px solid ${guideOpen ? "#fde68a" : "#e2e8f0"}`, borderRadius: "8px", background: guideOpen ? "#fffbeb" : "#fff", cursor: "pointer", color: guideOpen ? "#92400e" : "#64748b", fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>
                            <Zap style={{ width: "12px", height: "12px" }} /> {guideOpen ? "Hide" : "Show"} Guide
                        </button>

                        <span style={{ fontSize: "10px", color: "#cbd5e1", flexShrink: 0 }}>{lastRefresh.toLocaleTimeString()}</span>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div style={{ margin: "10px 18px 0", padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                            <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}><X style={{ width: "13px", height: "13px" }} /></button>
                        </div>
                    )}
                    {success && (
                        <div style={{ margin: "10px 18px 0", padding: "10px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}
                        </div>
                    )}

                    {/* Table */}
                    {loading ? (
                        <div style={{ padding: "60px", textAlign: "center" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Loading players…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            {debouncedSearch ? `No players found for "${debouncedSearch}"` : "No players found"}
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "62vh", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f8fafc" }}>
                            <table style={{ width: "100%", minWidth: "960px", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr style={{ background: "#f8fafc" }}>
                                        {[
                                            { label: "Player",        w: "185px" },
                                            { label: "Tier",          w: "70px"  },
                                            { label: "Balance",       w: "90px"  },
                                            { label: "Streak",        w: "115px" },
                                            { label: "To Next Bonus", w: "165px" },
                                            { label: "Last Deposit",  w: "110px" },
                                            { label: "Games Played",  w: "165px" },
                                            { label: "Bonus Ready",   w: "100px" },
                                            { label: "Action",        w: "145px" },
                                        ].map(col => (
                                            <th key={col.label} style={{ textAlign: col.label === "Action" ? "right" : "left", padding: "10px 12px", fontWeight: "700", color: "#64748b", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", width: col.w, minWidth: col.w, background: "#f8fafc" }}>
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((p, i) => (
                                        <PlayerRow
                                            key={p.id ?? i}
                                            player={p}
                                            depositGames={playerGames[p.id]}
                                            gamesLoading={playerGamesLoading.has(p.id)}
                                            onRedeem={openRedeem}
                                            justRedeemed={justRedeemed.has(p.id)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && pages > 1 && (
                        <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Page {page} of {pages} · {total} players</span>
                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#cbd5e1" : "#374151", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px", fontSize: "12px" }}>
                                    <ChevronLeft style={{ width: "12px", height: "12px" }} /> Prev
                                </button>
                                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                                    const pg = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                                    if (pg < 1 || pg > pages) return null;
                                    return (
                                        <button key={pg} onClick={() => setPage(pg)}
                                            style={{ padding: "5px 10px", borderRadius: "7px", border: `1px solid ${pg === page ? "#0ea5e9" : "#e2e8f0"}`, background: pg === page ? "#f0f9ff" : "#fff", color: pg === page ? "#0ea5e9" : "#374151", fontWeight: pg === page ? "800" : "500", cursor: "pointer", fontSize: "12px" }}>
                                            {pg}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                                    style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === pages ? "not-allowed" : "pointer", color: page === pages ? "#cbd5e1" : "#374151", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px", fontSize: "12px" }}>
                                    Next <ChevronRight style={{ width: "12px", height: "12px" }} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bonus Guide ── */}
                <BonusGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
            </div>

            {/* ── Redeem Modal ── */}
            {redeemTarget && redeemTier && (
                <RedeemModal
                    player={redeemTarget}
                    tier={redeemTier}
                    games={games}
                    loading={redeemLoading}
                    onConfirm={handleConfirmRedeem}
                    onClose={() => { setRedeemTarget(null); setRedeemTier(null); }}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}
