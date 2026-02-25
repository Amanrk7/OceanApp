import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, AlertCircle, Search, X, Gift, RefreshCw, ChevronDown, Flame, Users, Star, Zap } from "lucide-react";
import { api } from "../api";

// ─── Style constants ─────────────────────────────────────────────────────────
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

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

function formatDate(raw) {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Bonus type definitions ────────────────────────────────────────────────────
const BONUS_TYPES = [
    {
        id: "match",
        label: "Match Bonus",
        icon: Gift,
        color: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#1d4ed8" },
        description: "50% of deposit amount",
        calc: (amount) => amount * 0.5,
    },
    {
        id: "streak",
        label: "Streak Bonus",
        icon: Flame,
        color: { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", text: "#92400e" },
        description: "$1 per consecutive day (resets streak)",
        calc: (amount, player) => (player?.streak?.currentStreak ?? player?.currentStreak ?? 0) * 1.0,
    },
    {
        id: "referral",
        label: "Referral Bonus",
        icon: Users,
        color: { bg: "#f0fdf4", border: "#86efac", dot: "#22c55e", text: "#166534" },
        description: "50% of deposit to referrer",
        calc: (amount) => amount * 0.5,
        requiresReferral: true,
    },
    {
        id: "special",
        label: "Special / Promo Bonus",
        icon: Star,
        color: { bg: "#faf5ff", border: "#e9d5ff", dot: "#a855f7", text: "#6b21a8" },
        description: "20% — admin-granted for promotions",
        calc: (amount) => amount * 0.2,
    },
];

// ─── Single toggle row inside a game card ─────────────────────────────────────
function BonusRow({ bonusType, amount, player, enabled, onToggle }) {
    const { icon: Icon, label, description, color, calc, requiresReferral } = bonusType;
    const hasReferral = !!(player?.referredBy);
    const eligible = requiresReferral ? hasReferral : true;
    const bonusAmt = calc(amount, player);
    const canEnable = eligible && amount > 0;

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px",
            borderRadius: "9px", border: `1px solid ${enabled && canEnable ? color.border : "#f1f5f9"}`,
            background: enabled && canEnable ? color.bg : "#fafafa",
            opacity: eligible ? 1 : 0.5, transition: "all .15s",
        }}>
            <div style={{
                width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                background: enabled && canEnable ? color.bg : "#f1f5f9",
                border: `1px solid ${enabled && canEnable ? color.border : "#e2e8f0"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon style={{ width: "14px", height: "14px", color: enabled && canEnable ? color.dot : "#94a3b8" }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "700", fontSize: "12px", color: "#0f172a" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                    {requiresReferral && !hasReferral
                        ? "Player was not referred — not eligible"
                        : description
                    }
                </div>
            </div>

            {amount > 0 && eligible && (
                <span style={{
                    fontWeight: "800", fontSize: "13px",
                    color: enabled ? color.text : "#94a3b8",
                    minWidth: "60px", textAlign: "right", flexShrink: 0,
                }}>
                    +{fmt(bonusAmt)}
                </span>
            )}

            {/* Toggle */}
            <div
                onClick={() => canEnable && onToggle(!enabled)}
                style={{
                    width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                    background: enabled && canEnable ? color.dot : "#cbd5e1",
                    cursor: canEnable ? "pointer" : "not-allowed",
                    position: "relative", transition: "background .2s",
                }}>
                <div style={{
                    width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                    position: "absolute", top: "3px",
                    left: enabled && canEnable ? "19px" : "3px",
                    transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                }} />
            </div>
        </div>
    );
}

// ─── Per-game bonus card ───────────────────────────────────────────────────────
function GameBonusCard({ game, player, amount, selections, onToggle }) {
    const [collapsed, setCollapsed] = useState(false);

    // Total points this game will deduct
    const totalDeduction = BONUS_TYPES.reduce((sum, bt) => {
        if (!selections[bt.id]) return sum;
        const eligible = bt.requiresReferral ? !!(player?.referredBy) : true;
        if (!eligible) return sum;
        return sum + bt.calc(amount, player);
    }, 0);

    const stockAfter = game.pointStock - totalDeduction;
    const stockOk = totalDeduction <= game.pointStock;
    const anyEnabled = Object.values(selections).some(Boolean);

    return (
        <div style={{
            border: `1px solid ${anyEnabled ? "#bfdbfe" : "#e2e8f0"}`,
            borderRadius: "12px", overflow: "hidden", transition: "all .2s",
            boxShadow: anyEnabled ? "0 0 0 2px rgba(59,130,246,.1)" : "none",
        }}>
            {/* Game header */}
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 16px", background: anyEnabled ? "#f0f9ff" : "#f8fafc",
                    border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    borderBottom: collapsed ? "none" : `1px solid ${anyEnabled ? "#bfdbfe" : "#f1f5f9"}`,
                }}>
                <div style={{
                    width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
                    background: anyEnabled ? "#0ea5e9" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: "800", color: anyEnabled ? "#fff" : "#94a3b8",
                }}>
                    {game.name?.[0]?.toUpperCase() || "G"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>{game.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                        {stockOk || !anyEnabled
                            ? <><span style={{ color: "#22c55e", fontWeight: "600" }}>{game.pointStock.toFixed(0)} pts available</span>
                                {totalDeduction > 0 && <span style={{ color: "#94a3b8" }}> → {stockAfter.toFixed(0)} pts after</span>}
                            </>
                            : <span style={{ color: "#ef4444", fontWeight: "600" }}>⚠ Insufficient — need {totalDeduction.toFixed(0)} pts, have {game.pointStock.toFixed(0)}</span>
                        }
                    </div>
                </div>

                {anyEnabled && totalDeduction > 0 && (
                    <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "12px",
                        fontWeight: "800", background: stockOk ? "#f0fdf4" : "#fee2e2",
                        color: stockOk ? "#16a34a" : "#991b1b", border: `1px solid ${stockOk ? "#86efac" : "#fca5a5"}`,
                        flexShrink: 0,
                    }}>
                        +{fmt(totalDeduction)}
                    </span>
                )}

                <div style={{
                    fontSize: "12px", color: "#94a3b8", flexShrink: 0,
                    transform: collapsed ? "none" : "rotate(180deg)", transition: "transform .2s",
                }}>
                    ▾
                </div>
            </button>

            {/* Bonus rows */}
            {!collapsed && (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px", background: "#fff" }}>
                    {game.pointStock <= 0 && (
                        <div style={{ padding: "8px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "12px", color: "#991b1b", fontWeight: "600" }}>
                            🚫 This game has 0 points — cannot grant bonuses from it
                        </div>
                    )}
                    {BONUS_TYPES.map(bt => (
                        <BonusRow
                            key={bt.id}
                            bonusType={bt}
                            amount={amount}
                            player={player}
                            enabled={!!selections[bt.id]}
                            onToggle={(val) => onToggle(game.id, bt.id, val)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Ledger bonus breakdown badge ─────────────────────────────────────────────
function BonusBadges({ entry }) {
    const types = [];
    if (entry.bonusBreakdown) {
        entry.bonusBreakdown.forEach(b => types.push(b));
    } else if (entry.bonusType || entry.type) {
        types.push({ type: entry.bonusType || entry.type, amount: entry.amount, gameName: entry.gameName });
    }

    if (types.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;

    const colorMap = {
        match: { bg: "#eff6ff", text: "#1d4ed8" },
        streak: { bg: "#fffbeb", text: "#92400e" },
        referral: { bg: "#f0fdf4", text: "#166534" },
        special: { bg: "#faf5ff", text: "#6b21a8" },
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {types.map((b, i) => {
                const c = colorMap[b.type?.toLowerCase()] || { bg: "#f1f5f9", text: "#475569" };
                return (
                    <span key={i} style={{
                        display: "inline-block", padding: "2px 7px", borderRadius: "5px",
                        fontSize: "11px", fontWeight: "600", background: c.bg, color: c.text,
                        whiteSpace: "nowrap",
                    }}>
                        {b.type}{b.gameName ? ` (${b.gameName})` : ""}
                        {b.amount ? `: ${fmt(b.amount)}` : ""}
                    </span>
                );
            })}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function BonusPage() {
    // Form state
    const [player, setPlayer] = useState(null);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    // { [gameId]: { match: bool, streak: bool, referral: bool, special: bool } }
    const [gameSelections, setGameSelections] = useState({});

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Player search
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [eligLoading, setEligLoading] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef(null);

    // Data
    const [games, setGames] = useState([]);
    const [gamesLoading, setGamesLoading] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(true);

    // ── Load data ────────────────────────────────────────────────────────────
    const loadGames = useCallback(async (force = false) => {
        try {
            setGamesLoading(true);
            const r = await api.games.getGames(force);
            setGames(r?.data || []);
        } catch (e) { console.error(e); }
        finally { setGamesLoading(false); }
    }, []);

    const loadLedger = useCallback(async () => {
        try {
            setLedgerLoading(true);
            const r = await api.bonuses.getLedger();
            setLedger(r?.data || []);
        } catch (e) { console.error(e); }
        finally { setLedgerLoading(false); }
    }, []);

    useEffect(() => { loadGames(); loadLedger(); }, [loadGames, loadLedger]);

    // ── Player search ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setShowDrop(false); return; }
        const t = setTimeout(async () => {
            try {
                setSearching(true);
                const r = await api.players.getPlayers(1, 10, query, "");
                setResults(r?.data || []);
                setShowDrop(true);
            } catch (e) { console.error(e); }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    const selectPlayer = async (p) => {
        setQuery(p.name);
        setShowDrop(false);
        setResults([]);
        setPlayer(null);
        setEligLoading(true);
        try {
            const r = await api.players.getPlayer(p.id);
            setPlayer(r?.data || p);
        } catch { setPlayer(p); }
        finally { setEligLoading(false); }
    };

    const clearPlayer = () => {
        setPlayer(null);
        setQuery("");
        setGameSelections({});
    };

    // ── Toggle handler ────────────────────────────────────────────────────────
    const handleToggle = (gameId, bonusTypeId, val) => {
        setGameSelections(prev => ({
            ...prev,
            [gameId]: { ...(prev[gameId] || {}), [bonusTypeId]: val },
        }));
    };

    // ── Computed values ───────────────────────────────────────────────────────
    const amt = parseFloat(amount) || 0;
    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const hasReferral = !!(player?.referredBy);

    // Per-game totals
    const gameTotals = games.map(game => {
        const sel = gameSelections[game.id] || {};
        const total = BONUS_TYPES.reduce((sum, bt) => {
            if (!sel[bt.id]) return sum;
            const eligible = bt.requiresReferral ? hasReferral : true;
            if (!eligible) return sum;
            return sum + bt.calc(amt, player);
        }, 0);
        return { gameId: game.id, game, total, stockOk: total <= game.pointStock };
    });

    const grandTotal = gameTotals.reduce((sum, g) => sum + g.total, 0);
    const anySelected = grandTotal > 0;
    const allStockOk = gameTotals.every(g => g.stockOk);

    const canSubmit = !!player?.id && anySelected && amt > 0 && allStockOk && !submitting;

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!player?.id) { setError("Please select a player."); return; }
        if (!amt || amt <= 0) { setError("Enter a valid base amount for bonus calculations."); return; }
        if (!anySelected) { setError("Toggle at least one bonus to grant."); return; }
        if (!allStockOk) { setError("One or more selected games have insufficient point stock."); return; }

        // Build list of bonuses to grant: one entry per game × bonus-type combination
        const bonusGrants = [];
        gameTotals.forEach(({ game, total }) => {
            if (total <= 0) return;
            const sel = gameSelections[game.id] || {};
            BONUS_TYPES.forEach(bt => {
                if (!sel[bt.id]) return;
                const eligible = bt.requiresReferral ? hasReferral : true;
                if (!eligible) return;
                const bonusAmt = bt.calc(amt, player);
                if (bonusAmt <= 0) return;
                bonusGrants.push({
                    playerId: player.id,
                    amount: bonusAmt,
                    gameId: game.id,
                    bonusType: bt.id,
                    notes: notes || `${bt.label} from ${game.name}`,
                });
            });
        });

        try {
            setSubmitting(true);
            // Grant each bonus (parallel)
            await Promise.all(bonusGrants.map(grant => api.bonuses.grantBonus(grant)));
            setSuccess(`${bonusGrants.length} bonus grant${bonusGrants.length !== 1 ? "s" : ""} totaling ${fmt(grandTotal)} awarded to ${player.name}!`);
            setAmount("");
            setNotes("");
            setGameSelections({});
            await Promise.all([loadGames(true), loadLedger()]);
        } catch (err) {
            setError(err.message || "Failed to grant bonus. Please try again.");
        } finally {
            setSubmitting(false); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* ════ FORM CARD ════ */}
            <div style={CARD}>

                {/* Header banner */}
                <div style={{ marginBottom: "24px", padding: "14px 16px", background: "#fffbeb", borderLeft: "4px solid #f59e0b", borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <Gift style={{ width: "18px", height: "18px", color: "#b45309", flexShrink: 0, marginTop: "1px" }} />
                    <div>
                        <p style={{ fontWeight: "700", color: "#78350f", margin: "0 0 2px", fontSize: "14px" }}>Award Bonuses to a Player</p>
                        <p style={{ color: "#92400e", margin: 0, fontSize: "12px", lineHeight: "1.5" }}>
                            Select a player and a base deposit amount. Toggle the bonus types you want to grant from each game — points are deducted from that game's stock in real-time.
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                        <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                    </div>
                )}
                {success && (
                    <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                        <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

                    {/* ── Player + Amount row ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "16px", alignItems: "end" }}>

                        {/* Player search */}
                        <div>
                            <label style={LABEL}>Player * — search by name, username, email or phone</label>
                            <div ref={dropRef} style={{ position: "relative" }}>
                                <div style={{ position: "relative" }}>
                                    <Search style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                    <input
                                        type="text" placeholder="Type at least 2 characters…"
                                        value={query}
                                        onChange={e => { setQuery(e.target.value); if (player) clearPlayer(); }}
                                        style={{ ...INPUT, paddingLeft: "34px", paddingRight: player ? "36px" : "12px" }}
                                    />
                                    {(player || query) && (
                                        <button type="button" onClick={clearPlayer} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                                            <X style={{ width: "14px", height: "14px" }} />
                                        </button>
                                    )}
                                </div>
                                {searching && (
                                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", color: "#94a3b8", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>Searching…</div>
                                )}
                                {showDrop && !searching && (
                                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 8px 24px rgba(15,23,42,.12)", overflow: "hidden", maxHeight: "260px", overflowY: "auto" }}>
                                        {results.length === 0
                                            ? <div style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>No players found for "{query}"</div>
                                            : results.map(p => (
                                                <div key={p.id} onClick={() => selectPlayer(p)}
                                                    style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                    <div>
                                                        <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a" }}>{p.name}</div>
                                                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{p.email}</div>
                                                    </div>
                                                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                                                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#10b981" }}>{fmt(p.balance)}</div>
                                                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: "700", display: "inline-block", marginTop: "2px", background: p.tier === "GOLD" ? "#fef3c7" : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa", color: p.tier === "GOLD" ? "#92400e" : p.tier === "SILVER" ? "#3730a3" : "#9a3412" }}>{p.tier}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Player badges */}
                                {eligLoading && <div style={{ marginTop: "6px", fontSize: "12px", color: "#94a3b8" }}>Loading player data…</div>}
                                {player && !eligLoading && (
                                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#166534" }}>
                                            <CheckCircle style={{ width: "11px", height: "11px" }} /> {player.name} <span style={{ fontWeight: "400", color: "#4ade80" }}>· ID {player.id}</span>
                                        </span>
                                        <span style={{ padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#1d4ed8" }}>
                                            Balance: {fmt(player.balance)}
                                        </span>
                                        {streak > 0 && (
                                            <span style={{ padding: "4px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>
                                                🔥 {streak}-day streak
                                            </span>
                                        )}
                                        {hasReferral && (
                                            <span style={{ padding: "4px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#166534" }}>
                                                👤 Referred by {player.referredBy?.name || `ID ${player.referredBy}`}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Base amount */}
                        <div>
                            <label style={LABEL}>Base Amount ($) *</label>
                            <input
                                type="number" placeholder="0.00" min="0.01" step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                style={INPUT}
                            />
                            {amt > 0 && (
                                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                                    Used for % calculations below
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Per-game bonus cards ── */}
                    {player && (
                        <>
                            <div style={{ height: "1px", background: "#f1f5f9" }} />
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                    <Zap style={{ width: "16px", height: "16px", color: "#f59e0b" }} />
                                    <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                                        Available Bonuses per Game
                                    </span>
                                    {gamesLoading && <span style={{ fontSize: "12px", color: "#94a3b8" }}>Loading games…</span>}
                                </div>

                                {!gamesLoading && games.length === 0 && (
                                    <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No games available</div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {games.map(game => (
                                        <GameBonusCard
                                            key={game.id}
                                            game={game}
                                            player={player}
                                            amount={amt}
                                            selections={gameSelections[game.id] || {}}
                                            onToggle={handleToggle}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* ── Grand total bar ── */}
                            {anySelected && grandTotal > 0 && (
                                <div style={{ padding: "14px 18px", background: allStockOk ? "#f0fdf4" : "#fee2e2", border: `1px solid ${allStockOk ? "#86efac" : "#fca5a5"}`, borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: "700", fontSize: "13px", color: allStockOk ? "#166534" : "#991b1b" }}>
                                            {allStockOk ? "✓ Total bonus payout" : "⚠ Stock insufficient for some games"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                            {gameTotals.filter(g => g.total > 0).map(g => `${g.game.name}: ${fmt(g.total)}`).join(" · ")}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: "20px", fontWeight: "900", color: allStockOk ? "#10b981" : "#ef4444" }}>
                                        +{fmt(grandTotal)}
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Notes ── */}
                    <div>
                        <label style={LABEL}>Notes (optional)</label>
                        <textarea
                            placeholder="e.g., 'Tournament prize', 'Weekend promotion'…" rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            style={{ ...INPUT, resize: "none", lineHeight: "1.6" }}
                        />
                    </div>

                    {/* ── Action buttons ── */}
                    <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                        <button type="button"
                            onClick={() => { setAmount(""); setNotes(""); setGameSelections({}); setError(""); setSuccess(""); clearPlayer(); }}
                            style={{ flex: 1, padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                            Clear
                        </button>
                        <button type="submit" disabled={!canSubmit}
                            style={{
                                flex: 2, padding: "12px", border: "none", borderRadius: "8px",
                                fontWeight: "700", fontSize: "14px", cursor: canSubmit ? "pointer" : "not-allowed",
                                background: canSubmit ? "#d97706" : "#e2e8f0",
                                color: canSubmit ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                transition: "background .2s",
                            }}>
                            {submitting
                                ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Granting…</>
                                : <><Gift style={{ width: "15px", height: "15px" }} /> Grant {anySelected ? `${gameTotals.filter(g => g.total > 0).reduce((sum, g) => {
                                    const sel = gameSelections[g.gameId] || {};
                                    return sum + Object.values(sel).filter(Boolean).length;
                                }, 0)} Bonus${grandTotal !== 0 ? ` (+${fmt(grandTotal)})` : ""}` : "Bonuses"}</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ════ BONUS LEDGER ════ */}
            <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(15,23,42,.07)", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Bonus Ledger</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                            {ledger.length > 0 ? `${ledger.length} bonus grant${ledger.length !== 1 ? "s" : ""}` : "All bonuses granted, newest first"}
                        </p>
                    </div>
                    <button onClick={loadLedger} disabled={ledgerLoading}
                        style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600" }}>
                        <RefreshCw style={{ width: "13px", height: "13px", animation: ledgerLoading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                </div>

                {ledgerLoading ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Loading bonus history…</div>
                ) : ledger.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center" }}>
                        <Gift style={{ width: "36px", height: "36px", margin: "0 auto 10px", display: "block", color: "#e2e8f0" }} />
                        <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>No bonuses granted yet</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", maxHeight: "500px", overflowY: "scroll", scrollbarWidth: "thin" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    {["#", "Player", "Bonus Types", "Game Deducted", "Amount", "Bal. Before → After", "Date"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: "600", color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((b, i) => (
                                    <tr key={b.id ?? i}
                                        onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "11px 14px", color: "#cbd5e1", fontSize: "12px" }}>#{ledger.length - i}</td>
                                        <td style={{ padding: "11px 14px" }}>
                                            <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "13px" }}>{b.playerName || "—"}</div>
                                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {b.playerId}</div>
                                        </td>
                                        <td style={{ padding: "11px 14px", minWidth: "160px" }}>
                                            <BonusBadges entry={b} />
                                        </td>
                                        <td style={{ padding: "11px 14px" }}>
                                            <span style={{ display: "inline-block", padding: "3px 9px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "500", color: "#475569", whiteSpace: "nowrap" }}>
                                                {b.gameName || "—"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "11px 14px" }}>
                                            <span style={{ fontWeight: "800", color: "#d97706", fontSize: "14px" }}>{fmt(b.amount)}</span>
                                        </td>
                                        <td style={{ padding: "11px 14px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                                            {b.balanceBefore != null && b.balanceAfter != null
                                                ? <><span>{fmt(b.balanceBefore)}</span> <span style={{ color: "#22c55e", fontWeight: "700" }}>→ {fmt(b.balanceAfter)}</span></>
                                                : <span style={{ color: "#cbd5e1" }}>—</span>
                                            }
                                        </td>
                                        <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap", fontSize: "12px" }}>
                                            {formatDate(b.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}