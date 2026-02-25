import { useState, useEffect, useRef, useCallback } from "react";
import {
    CheckCircle, AlertCircle, Search, X, RefreshCw, ChevronDown,
    ArrowDownLeft, ArrowUpRight, Zap, Gift, Star,
} from "lucide-react";
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
const SELECT = { ...INPUT, paddingRight: "32px", appearance: "none", cursor: "pointer" };
const CARD = {
    background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
    boxShadow: "0 2px 12px rgba(15,23,42,.07)", padding: "28px 32px",
};
const DIVIDER = { height: "1px", background: "#f1f5f9", margin: "20px 0" };

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

function formatDate(raw) {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ═══════════════════════════════════════════════════════════════
// BONUS TOGGLE COMPONENT
// ═══════════════════════════════════════════════════════════════
const DEPOSIT_BONUSES = [
    {
        id: "match",
        label: "Match Bonus",
        icon: Gift,
        color: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#1d4ed8" },
        subtitle: "50% of deposit amount — applied once per player per day",
        calc: (amt) => amt * 0.5,
    },
    {
        id: "special",
        label: "Special / Promo Bonus",
        icon: Star,
        color: { bg: "#faf5ff", border: "#e9d5ff", dot: "#a855f7", text: "#6b21a8" },
        subtitle: "20% of deposit — for game promotions or special occasions",
        calc: (amt) => amt * 0.2,
    },
];

function BonusToggle({ bonus, amount, enabled, onToggle, eligible = true }) {
    const { icon: Icon, label, subtitle, color, calc } = bonus;
    const bonusAmt = calc(amount);
    const canEnable = eligible && amount > 0;
    return (
        <div style={{
            border: `1px solid ${enabled && canEnable ? color.border : "#e2e8f0"}`,
            borderRadius: "10px", padding: "13px 16px",
            background: enabled && canEnable ? color.bg : "#fafafa",
            transition: "all .15s",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                    <div style={{
                        width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
                        background: enabled && canEnable ? color.bg : "#f1f5f9",
                        border: `1px solid ${enabled && canEnable ? color.border : "#e2e8f0"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Icon style={{ width: "15px", height: "15px", color: enabled && canEnable ? color.dot : "#94a3b8" }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{label}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", lineHeight: "1.4" }}>{subtitle}</div>
                        {enabled && canEnable && (
                            <span style={{
                                display: "inline-block", marginTop: "6px", padding: "3px 10px",
                                borderRadius: "20px", fontSize: "12px", fontWeight: "700",
                                background: color.bg, border: `1px solid ${color.border}`, color: color.text,
                            }}>+{fmt(bonusAmt)} bonus</span>
                        )}
                    </div>
                </div>
                <div
                    onClick={() => canEnable && onToggle(!enabled)}
                    style={{
                        width: "40px", height: "23px", borderRadius: "12px", flexShrink: 0, marginTop: "2px",
                        background: enabled && canEnable ? color.dot : "#cbd5e1",
                        cursor: canEnable ? "pointer" : "not-allowed",
                        position: "relative", transition: "background .2s",
                    }}>
                    <div style={{
                        width: "17px", height: "17px", borderRadius: "50%", background: "#fff",
                        position: "absolute", top: "3px",
                        left: enabled && canEnable ? "20px" : "3px",
                        transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                    }} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
function AddTransactionsPage() {
    const EMPTY = {
        txType: "deposit",
        amount: "", gameId: "", walletId: "", notes: "",
        bonusMatch: false, bonusSpecial: false,
    };

    const [form, setForm] = useState(EMPTY);
    const [player, setPlayer] = useState(null);
    const [games, setGames] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [undoingId, setUndoingId] = useState(null);
    const [undoSuccess, setUndoSuccess] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Player search
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const [eligLoading, setEligLoading] = useState(false);
    const dropRef = useRef(null);

    // ══════════════════════════════════════════════════════════════
    // LOAD DATA FUNCTIONS
    // ══════════════════════════════════════════════════════════════
    const loadGames = useCallback(async (force = false) => {
        try {
            const r = await api.games.getGames(force);
            setGames(r?.data || []);
        } catch (e) { console.error("Load games error:", e); }
    }, []);

    const loadWallets = useCallback(async () => {
        try {
            const r = await api.wallets.getGroupedWallets(true);
            const flat = (r?.data || []).flatMap(g =>
                g.subAccounts.map(s => ({
                    ...s,
                    label: `${g.method} — ${s.name}  (${fmt(s.balance)})`,
                    methodName: g.method,
                    methodId: g.id,
                }))
            );
            setWallets(flat);
        } catch (e) { console.error("Load wallets error:", e); }
    }, []);

    const loadLedger = useCallback(async () => {
        try {
            setLedgerLoading(true);
            // Force bypass cache to get latest data
            const r = await api.transactions.getTransactions(1, 50, "", "", true);
            setLedger(r?.data || []);
            setLastRefresh(new Date());
        } catch (e) {
            console.error("Load ledger error:", e);
            setError("Failed to load transaction ledger");
        } finally {
            setLedgerLoading(false);
        }
    }, []);

    // ══════════════════════════════════════════════════════════════
    // INITIAL DATA LOAD
    // ══════════════════════════════════════════════════════════════
    useEffect(() => {
        loadGames();
        loadWallets();
        loadLedger();
    }, [loadGames, loadWallets, loadLedger]);

    // ══════════════════════════════════════════════════════════════
    // AUTO-REFRESH LEDGER (every 10 seconds when enabled)
    // ══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadLedger();
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, loadLedger]);

    // ══════════════════════════════════════════════════════════════
    // PLAYER SEARCH
    // ══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults([]);
            setShowDrop(false);
            return;
        }
        const t = setTimeout(async () => {
            try {
                setSearching(true);
                const r = await api.players.getPlayers(1, 10, query, "");
                setResults(r?.data || []);
                setShowDrop(true);
            } catch (e) { console.error("Search error:", e); }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const fn = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
        };
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
        setForm(f => ({ ...EMPTY, txType: f.txType }));
    };

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    // ══════════════════════════════════════════════════════════════
    // DERIVED VALUES
    // ══════════════════════════════════════════════════════════════
    const amt = parseFloat(form.amount) || 0;
    const isDeposit = form.txType === "deposit";
    const selGame = games.find(g => String(g.id) === String(form.gameId));
    const selWallet = wallets.find(w => w.id === parseInt(form.walletId));

    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const cashoutLimit = parseFloat(player?.cashoutLimit ?? 250);
    const streakWaived = streak >= 30;

    const matchAmt = amt * 0.5;
    const specialAmt = amt * 0.2;

    const totalBonus =
        (form.bonusMatch && amt > 0 ? matchAmt : 0) +
        (form.bonusSpecial && amt > 0 ? specialAmt : 0);

    const anyBonus = totalBonus > 0;
    const stockOk = !selGame || !anyBonus || totalBonus <= selGame.pointStock;
    const cashoutOverLimit = !isDeposit && !streakWaived && amt > cashoutLimit && cashoutLimit > 0;
    const walletInsufficient = !isDeposit && selWallet && amt > selWallet.balance;

    const canSubmit =
        !!player?.id && amt > 0 && !!form.walletId &&
        (!anyBonus || !!form.gameId) &&
        stockOk && !cashoutOverLimit && !walletInsufficient && !submitting;

    // ══════════════════════════════════════════════════════════════
    // SUBMIT TRANSACTION
    // ══════════════════════════════════════════════════════════════
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!player?.id) { setError("Please select a player."); return; }
        if (!amt) { setError("Enter a valid amount."); return; }
        if (!form.walletId) { setError("Please select a wallet."); return; }
        if (anyBonus && !form.gameId) { setError("Select a game for bonus deduction."); return; }
        if (!stockOk) { setError(`Insufficient game stock for ${totalBonus.toFixed(2)} pts.`); return; }
        if (cashoutOverLimit) { setError(`Cashout exceeds limit of ${fmt(cashoutLimit)}.`); return; }
        if (walletInsufficient) { setError(`Wallet only has ${fmt(selWallet?.balance)}.`); return; }

        try {
            setSubmitting(true);

            const endpoint = isDeposit ? "/api/transactions/deposit" : "/api/transactions/cashout";

            const payload = isDeposit
                ? {
                    playerId: player.id,
                    amount: amt,
                    walletId: parseInt(form.walletId),
                    gameId: form.gameId || null,
                    notes: form.notes,
                    bonusMatch: form.bonusMatch && amt > 0,
                    bonusSpecial: form.bonusSpecial && amt > 0,
                }
                : {
                    playerId: player.id,
                    amount: amt,
                    walletId: parseInt(form.walletId),
                    notes: form.notes,
                };

            const res = await fetch(`http://localhost:3000${endpoint}`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Transaction failed");

            setSuccess(data.message || "Transaction recorded successfully!");
            setForm(EMPTY);
            setQuery("");
            setPlayer(null);

            // ✅ CRITICAL: Reload ALL data synchronously + clear cache
            api.clearCache?.();
            await Promise.all([
                loadLedger(),
                loadGames(true),
                loadWallets()
            ]);

        } catch (err) {
            console.error("Submit error:", err);
            setError(err.message || "Transaction failed.");
        } finally {
            setSubmitting(false);
        }
    };

    // ══════════════════════════════════════════════════════════════
    // UNDO TRANSACTION WITH REAL-TIME UPDATES
    // ══════════════════════════════════════════════════════════════
    const handleUndo = async (txId, playerIdFromTx) => {
        const numericId = String(txId).replace(/\D/g, "");
        try {
            setUndoingId(txId);
            setError("");
            setUndoSuccess("");

            // Call undo endpoint
            await api.transactions.undoTransaction(numericId);

            // ✅ CRITICAL: Clear all caches and reload everything
            api.clearCache?.();

            await Promise.all([
                loadLedger(),
                loadWallets(),
                loadGames(true),
            ]);

            // Reload selected player if undo affected them
            if (player && playerIdFromTx && player.id === playerIdFromTx) {
                try {
                    const r = await api.players.getPlayer(player.id);
                    setPlayer(r?.data || player);
                } catch (e) { console.error("Failed to refresh player:", e); }
            }

            // Dispatch event for cross-component updates
            window.dispatchEvent(new CustomEvent('transactionUndone', {
                detail: { playerId: playerIdFromTx, txId, timestamp: new Date().toISOString() }
            }));

            setUndoSuccess(`✓ Transaction #${txId} reversed. All data synced in real-time.`);

            // Auto-dismiss after 3 seconds
            setTimeout(() => setUndoSuccess(""), 3000);
        } catch (err) {
            console.error("Undo error:", err);
            setError(err.message || "Undo failed — please try again.");
        } finally {
            setUndoingId(null);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // MANUAL REFRESH
    // ═══════════════════════════════════════════════════════════════
    const handleManualRefresh = async () => {
        await loadLedger();
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "inherit" }}>

            {/* ════ FORM CARD ════ */}
            <div style={CARD}>

                {/* Tx type toggle */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
                    {[
                        { id: "deposit", label: "Deposit", Icon: ArrowDownLeft, color: "#10b981" },
                        { id: "cashout", label: "Cashout", Icon: ArrowUpRight, color: "#ef4444" },
                    ].map(({ id, label, Icon, color }) => (
                        <button key={id} type="button"
                            onClick={() => {
                                set("txType", id);
                                setError("");
                                setSuccess("");
                                setUndoSuccess("");
                            }}
                            style={{
                                flex: 1, padding: "11px 20px", borderRadius: "10px", fontWeight: "700",
                                fontSize: "14px", cursor: "pointer", transition: "all .2s",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                border: form.txType === id ? `2px solid ${color}` : "2px solid #e2e8f0",
                                background: form.txType === id ? `${color}14` : "#fafafa",
                                color: form.txType === id ? color : "#64748b",
                            }}>
                            <Icon style={{ width: "15px", height: "15px" }} /> {label}
                        </button>
                    ))}
                </div>

                {/* Info banner */}
                <div style={{
                    marginBottom: "22px", padding: "14px 16px",
                    background: isDeposit ? "#f0fdf4" : "#fef2f2",
                    borderLeft: `4px solid ${isDeposit ? "#22c55e" : "#ef4444"}`,
                    borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start"
                }}>
                    {isDeposit
                        ? <ArrowDownLeft style={{ width: "17px", height: "17px", color: "#16a34a", flexShrink: 0, marginTop: "1px" }} />
                        : <ArrowUpRight style={{ width: "17px", height: "17px", color: "#dc2626", flexShrink: 0, marginTop: "1px" }} />
                    }
                    <div>
                        <p style={{
                            fontWeight: "700",
                            color: isDeposit ? "#14532d" : "#7f1d1d",
                            margin: "0 0 2px", fontSize: "14px"
                        }}>
                            {isDeposit ? "Record a Deposit" : "Record a Cashout"}
                        </p>
                        <p style={{
                            color: isDeposit ? "#166534" : "#991b1b",
                            margin: 0, fontSize: "12px", lineHeight: "1.5"
                        }}>
                            {isDeposit
                                ? "Deposits credit the player and wallet in real-time. Match and Special bonuses can be applied here — points deducted from selected game."
                                : "Cashouts deduct from player balance and wallet. Cashout limit is enforced (waived at 30-day streak). No bonuses apply to cashouts."
                            }
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{
                        padding: "11px 14px", marginBottom: "18px",
                        background: "#fee2e2", border: "1px solid #fca5a5",
                        borderRadius: "8px", color: "#991b1b", fontSize: "13px",
                        display: "flex", gap: "8px", alignItems: "center"
                    }}>
                        <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                    </div>
                )}
                {success && (
                    <div style={{
                        padding: "11px 14px", marginBottom: "18px",
                        background: "#dcfce7", border: "1px solid #86efac",
                        borderRadius: "8px", color: "#166534", fontSize: "13px",
                        display: "flex", gap: "8px", alignItems: "center"
                    }}>
                        <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}
                    </div>
                )}
                {undoSuccess && (
                    <div style={{
                        padding: "11px 14px", marginBottom: "18px",
                        background: "#dcfce7", border: "1px solid #86efac",
                        borderRadius: "8px", color: "#166534", fontSize: "13px",
                        display: "flex", gap: "8px", alignItems: "center"
                    }}>
                        <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {undoSuccess}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* ── Player search ── */}
                    <div>
                        <label style={LABEL}>Player * — search by name, username, email or phone</label>
                        <div ref={dropRef} style={{ position: "relative" }}>
                            <div style={{ position: "relative" }}>
                                <Search style={{
                                    position: "absolute", left: "11px", top: "50%",
                                    transform: "translateY(-50%)", width: "14px", height: "14px",
                                    color: "#94a3b8", pointerEvents: "none"
                                }} />
                                <input
                                    type="text"
                                    placeholder="Type at least 2 characters…"
                                    value={query}
                                    onChange={e => {
                                        setQuery(e.target.value);
                                        if (player) clearPlayer();
                                    }}
                                    style={{
                                        ...INPUT,
                                        paddingLeft: "34px",
                                        paddingRight: player ? "36px" : "12px"
                                    }}
                                />
                                {(player || query) && (
                                    <button
                                        type="button"
                                        onClick={clearPlayer}
                                        style={{
                                            position: "absolute", right: "10px", top: "50%",
                                            transform: "translateY(-50%)", background: "none",
                                            border: "none", cursor: "pointer", color: "#94a3b8",
                                            display: "flex"
                                        }}>
                                        <X style={{ width: "14px", height: "14px" }} />
                                    </button>
                                )}
                            </div>
                            {searching && (
                                <div style={{
                                    position: "absolute", top: "calc(100% + 4px)",
                                    left: 0, right: 0, zIndex: 60, background: "#fff",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    padding: "12px 16px", color: "#94a3b8", fontSize: "13px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,.08)"
                                }}>
                                    Searching…
                                </div>
                            )}
                            {showDrop && !searching && (
                                <div style={{
                                    position: "absolute", top: "calc(100% + 4px)",
                                    left: 0, right: 0, zIndex: 60, background: "#fff",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    boxShadow: "0 8px 24px rgba(15,23,42,.12)",
                                    overflow: "hidden", maxHeight: "260px", overflowY: "auto"
                                }}>
                                    {results.length === 0
                                        ? <div style={{
                                            padding: "14px 16px",
                                            color: "#94a3b8",
                                            fontSize: "13px"
                                        }}>No players found</div>
                                        : results.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => selectPlayer(p)}
                                                style={{
                                                    padding: "10px 16px", cursor: "pointer",
                                                    borderBottom: "1px solid #f1f5f9",
                                                    display: "flex", justifyContent: "space-between",
                                                    alignItems: "center"
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                <div>
                                                    <div style={{
                                                        fontWeight: "600",
                                                        fontSize: "13px",
                                                        color: "#0f172a"
                                                    }}>{p.name}</div>
                                                    <div style={{
                                                        fontSize: "11px",
                                                        color: "#94a3b8",
                                                        marginTop: "1px"
                                                    }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                                                </div>
                                                <div style={{
                                                    textAlign: "right",
                                                    flexShrink: 0,
                                                    marginLeft: "12px"
                                                }}>
                                                    <div style={{
                                                        fontWeight: "700",
                                                        fontSize: "13px",
                                                        color: "#10b981"
                                                    }}>{fmt(p.balance)}</div>
                                                    <span style={{
                                                        fontSize: "10px",
                                                        padding: "1px 6px",
                                                        borderRadius: "4px",
                                                        fontWeight: "700",
                                                        display: "inline-block",
                                                        marginTop: "2px",
                                                        background: p.tier === "GOLD" ? "#fef3c7"
                                                            : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa",
                                                        color: p.tier === "GOLD" ? "#92400e"
                                                            : p.tier === "SILVER" ? "#3730a3" : "#9a3412"
                                                    }}>{p.tier}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                            {eligLoading && (
                                <div style={{
                                    marginTop: "6px",
                                    fontSize: "12px",
                                    color: "#94a3b8"
                                }}>Loading player data…</div>
                            )}
                            {player && !eligLoading && (
                                <div style={{
                                    marginTop: "8px", display: "flex",
                                    alignItems: "center", gap: "8px", flexWrap: "wrap"
                                }}>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center",
                                        gap: "5px", padding: "4px 10px",
                                        background: "#f0fdf4", border: "1px solid #86efac",
                                        borderRadius: "20px", fontSize: "12px",
                                        fontWeight: "600", color: "#166534"
                                    }}>
                                        <CheckCircle style={{ width: "11px", height: "11px" }} />
                                        {player.name}
                                        <span style={{
                                            fontWeight: "400",
                                            color: "#4ade80"
                                        }}>· ID {player.id}</span>
                                    </span>
                                    <span style={{
                                        padding: "4px 10px", background: "#eff6ff",
                                        border: "1px solid #bfdbfe", borderRadius: "20px",
                                        fontSize: "12px", fontWeight: "600", color: "#1d4ed8"
                                    }}>Balance: {fmt(player.balance)}</span>
                                    {streak > 0 && (
                                        <span style={{
                                            padding: "4px 10px", background: "#fffbeb",
                                            border: "1px solid #fde68a", borderRadius: "20px",
                                            fontSize: "12px", fontWeight: "600", color: "#92400e"
                                        }}>🔥 {streak}-day streak</span>
                                    )}
                                    {!isDeposit && cashoutLimit > 0 && !streakWaived && (
                                        <span style={{
                                            padding: "4px 10px",
                                            background: cashoutOverLimit ? "#fee2e2" : "#fef2f2",
                                            border: `1px solid ${cashoutOverLimit ? "#fca5a5" : "#fecaca"}`,
                                            borderRadius: "20px", fontSize: "12px",
                                            fontWeight: "600", color: "#991b1b"
                                        }}>
                                            Cashout limit: {fmt(cashoutLimit)}
                                        </span>
                                    )}
                                    {!isDeposit && streakWaived && (
                                        <span style={{
                                            padding: "4px 10px", background: "#f0fdf4",
                                            border: "1px solid #86efac", borderRadius: "20px",
                                            fontSize: "12px", fontWeight: "600", color: "#166534"
                                        }}>✓ Limit waived (30-day streak)</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Amount & Wallet ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={LABEL}>
                                {isDeposit
                                    ? "Deposit Amount ($) *"
                                    : `Cashout Amount ($) *${!streakWaived && cashoutLimit > 0
                                        ? ` — Limit: ${fmt(cashoutLimit)}` : ""}`
                                }
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={e => set("amount", e.target.value)}
                                style={{
                                    ...INPUT,
                                    borderColor: cashoutOverLimit ? "#fca5a5" : "#e2e8f0"
                                }}
                            />
                            {cashoutOverLimit && (
                                <p style={{
                                    color: "#ef4444",
                                    fontSize: "11px",
                                    marginTop: "4px"
                                }}>⚠ Exceeds cashout limit of {fmt(cashoutLimit)}</p>
                            )}
                        </div>
                        <div>
                            <label style={LABEL}>
                                {isDeposit ? "Credit Wallet *" : "Deduct From Wallet *"}
                            </label>
                            <div style={{ position: "relative" }}>
                                <select
                                    value={form.walletId}
                                    onChange={e => set("walletId", e.target.value)}
                                    style={SELECT}>
                                    <option value="">— Select wallet —</option>
                                    {wallets.map(w => (
                                        <option
                                            key={w.id}
                                            value={w.id}
                                            disabled={!isDeposit && w.balance < amt}>
                                            {w.label}{!isDeposit && w.balance < amt ? " — INSUFFICIENT" : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown style={{
                                    position: "absolute", right: "10px", top: "50%",
                                    transform: "translateY(-50%)", width: "14px",
                                    height: "14px", color: "#94a3b8", pointerEvents: "none"
                                }} />
                            </div>
                            {selWallet && amt > 0 && (
                                <p style={{
                                    fontSize: "12px", marginTop: "4px",
                                    fontWeight: "600",
                                    color: isDeposit
                                        ? "#22c55e"
                                        : walletInsufficient ? "#ef4444" : "#64748b"
                                }}>
                                    {isDeposit
                                        ? `✓ ${fmt(selWallet.balance)} → ${fmt(selWallet.balance + amt)}`
                                        : walletInsufficient
                                            ? `⚠ Only ${fmt(selWallet.balance)} available`
                                            : `${fmt(selWallet.balance)} → ${fmt(selWallet.balance - amt)}`
                                    }
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Game selector (deposit only, when any bonus enabled) ── */}
                    {isDeposit && (
                        <div>
                            <label style={LABEL}>
                                Game {anyBonus ? "* (required for bonus deduction)" : "(optional)"}
                            </label>
                            <div style={{ position: "relative" }}>
                                <select
                                    value={form.gameId}
                                    onChange={e => set("gameId", e.target.value)}
                                    style={{
                                        ...SELECT,
                                        borderColor: anyBonus && !form.gameId ? "#fca5a5" : "#e2e8f0"
                                    }}>
                                    <option value="">— Select a game —</option>
                                    {games.map(g => (
                                        <option
                                            key={g.id}
                                            value={g.id}
                                            disabled={g.pointStock <= 0}>
                                            {g.name}  ({(g.pointStock ?? 0).toFixed(0)} pts)
                                            {g.pointStock <= 0 ? " — EMPTY" : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown style={{
                                    position: "absolute", right: "10px", top: "50%",
                                    transform: "translateY(-50%)", width: "14px",
                                    height: "14px", color: "#94a3b8", pointerEvents: "none"
                                }} />
                            </div>
                            {selGame && anyBonus && (
                                <div style={{
                                    marginTop: "8px", padding: "10px 14px",
                                    borderRadius: "8px", fontSize: "12px", fontWeight: "500",
                                    background: !stockOk ? "#fee2e2" : "#f0fdf4",
                                    border: `1px solid ${!stockOk ? "#fca5a5" : "#86efac"}`,
                                    color: !stockOk ? "#991b1b" : "#166534"
                                }}>
                                    {!stockOk
                                        ? `⚠ Insufficient — ${selGame.name} has ${selGame.pointStock.toFixed(2)} pts, need ${totalBonus.toFixed(2)}`
                                        : `✓ ${selGame.name}: ${selGame.pointStock.toFixed(2)} pts → ${(selGame.pointStock - totalBonus).toFixed(2)} pts`
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ BONUS SECTION (deposit only — Match & Special only) ══ */}
                    {isDeposit && (
                        <>
                            <div style={DIVIDER} />
                            <div>
                                <div style={{
                                    fontSize: "13px", fontWeight: "700",
                                    color: "#0f172a", display: "flex",
                                    alignItems: "center", gap: "8px", marginBottom: "6px"
                                }}>
                                    <Zap style={{ width: "15px", height: "15px", color: "#f59e0b" }} />
                                    Deposit Bonuses
                                </div>
                                <p style={{
                                    fontSize: "12px", color: "#94a3b8", margin: "0 0 14px"
                                }}>
                                    Both Match and Special bonuses apply during a deposit.
                                    For Streak and Referral bonuses, use the <strong>Add Bonus</strong> page.
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {DEPOSIT_BONUSES.map(bonus => (
                                        <BonusToggle
                                            key={bonus.id}
                                            bonus={bonus}
                                            amount={amt}
                                            enabled={form[`bonus${bonus.id.charAt(0).toUpperCase() + bonus.id.slice(1)}`]}
                                            onToggle={v => set(`bonus${bonus.id.charAt(0).toUpperCase() + bonus.id.slice(1)}`, v)}
                                        />
                                    ))}
                                </div>
                                {totalBonus > 0 && (
                                    <div style={{
                                        marginTop: "12px", padding: "12px 16px",
                                        background: "#f8fafc", borderRadius: "8px",
                                        border: "1px solid #e2e8f0",
                                        display: "flex", justifyContent: "space-between",
                                        alignItems: "center"
                                    }}>
                                        <div>
                                            <span style={{
                                                fontSize: "13px", fontWeight: "600",
                                                color: "#475569"
                                            }}>
                                                Applying: {[
                                                    form.bonusMatch && "Match Bonus (50%)",
                                                    form.bonusSpecial && "Special Bonus (20%)"
                                                ].filter(Boolean).join(" + ")}
                                            </span>
                                            {selGame && (
                                                <div style={{
                                                    fontSize: "11px", color: "#94a3b8",
                                                    marginTop: "2px"
                                                }}>
                                                    Deducting {totalBonus.toFixed(2)} pts from {selGame.name}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: "18px", fontWeight: "800",
                                            color: "#10b981"
                                        }}>+{fmt(totalBonus)}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Notes ── */}
                    <div>
                        <label style={LABEL}>Notes (optional)</label>
                        <textarea
                            placeholder="Add any notes…"
                            rows={2}
                            value={form.notes}
                            onChange={e => set("notes", e.target.value)}
                            style={{ ...INPUT, resize: "none", lineHeight: "1.6" }}
                        />
                    </div>

                    {/* ── Buttons ── */}
                    <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                        <button
                            type="button"
                            onClick={() => {
                                setForm(EMPTY);
                                setQuery("");
                                clearPlayer();
                                setError("");
                                setSuccess("");
                                setUndoSuccess("");
                            }}
                            style={{
                                flex: 1, padding: "12px", background: "#fff",
                                border: "1px solid #e2e8f0", borderRadius: "8px",
                                fontWeight: "600", cursor: "pointer", fontSize: "14px"
                            }}>
                            Clear
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            style={{
                                flex: 1, padding: "12px", border: "none",
                                borderRadius: "8px", fontWeight: "700", fontSize: "14px",
                                cursor: canSubmit ? "pointer" : "not-allowed",
                                background: canSubmit
                                    ? (isDeposit ? "#10b981" : "#ef4444")
                                    : "#e2e8f0",
                                color: canSubmit ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center",
                                justifyContent: "center", gap: "7px",
                                transition: "background .2s",
                            }}>
                            {submitting
                                ? <>
                                    <span style={{
                                        animation: "spin 1s linear infinite",
                                        display: "inline-block"
                                    }}>⏳</span> Processing…
                                </>
                                : isDeposit
                                    ? <><ArrowDownLeft style={{ width: "15px", height: "15px" }} /> Record Deposit</>
                                    : <><ArrowUpRight style={{ width: "15px", height: "15px" }} /> Record Cashout</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ════ TRANSACTION LEDGER WITH REAL-TIME REFRESH ════ */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
                <div style={{
                    padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <div>
                        <h3 style={{
                            margin: 0, fontSize: "15px",
                            fontWeight: "700", color: "#0f172a"
                        }}>All Transactions</h3>
                        <p style={{
                            margin: "2px 0 0", fontSize: "12px", color: "#94a3b8"
                        }}>
                            Deposits · Cashouts · Bonuses — with wallet, game & balance details
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {/* Auto-refresh toggle */}
                        <div
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            title={autoRefresh ? "Auto-refresh ON (every 10s)" : "Auto-refresh OFF"}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                background: autoRefresh ? "#dcfce7" : "#fff",
                                color: autoRefresh ? "#166534" : "#64748b",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                transition: "all .2s",
                            }}>
                            <div style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: autoRefresh ? "#22c55e" : "#cbd5e1",
                            }} />
                            Auto {autoRefresh ? "ON" : "OFF"}
                        </div>

                        {/* Manual refresh button */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={ledgerLoading}
                            title="Refresh transaction list"
                            style={{
                                background: "none", border: "1px solid #e2e8f0",
                                borderRadius: "8px", padding: "7px 12px",
                                cursor: "pointer", color: "#64748b",
                                display: "flex", alignItems: "center", gap: "5px",
                                fontSize: "12px", fontWeight: "600"
                            }}>
                            <RefreshCw style={{
                                width: "13px", height: "13px",
                                animation: ledgerLoading ? "spin 1s linear infinite" : "none"
                            }} />
                            Refresh
                        </button>

                        {/* Last refresh timestamp */}
                        <span style={{
                            fontSize: "11px", color: "#94a3b8",
                            marginLeft: "4px"
                        }}>
                            {lastRefresh.toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {ledgerLoading ? (
                    <div style={{
                        padding: "40px", textAlign: "center",
                        color: "#94a3b8", fontSize: "13px"
                    }}>Loading…</div>
                ) : ledger.length === 0 ? (
                    <div style={{
                        padding: "40px", textAlign: "center",
                        color: "#94a3b8", fontSize: "13px"
                    }}>No transactions yet</div>
                ) : (
                    <div style={{
                        overflowX: "auto", maxHeight: "520px",
                        overflowY: "scroll", scrollbarWidth: "thin"
                    }}>
                        <table style={{
                            width: "100%", borderCollapse: "collapse",
                            fontSize: "13px"
                        }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    {[
                                        "ID", "Player", "Type", "Amount", "Game",
                                        "Wallet Info", "Bal Before → After",
                                        "Status", "Date", ""
                                    ].map(h => (
                                        <th key={h} style={{
                                            textAlign: "left", padding: "10px 14px",
                                            fontWeight: "600", color: "#64748b",
                                            fontSize: "11px", textTransform: "uppercase",
                                            letterSpacing: "0.4px",
                                            borderBottom: "1px solid #e2e8f0",
                                            whiteSpace: "nowrap"
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((tx, i) => {
                                    let displayType = tx.type;
                                    let typeColor = { bg: "#f1f5f9", text: "#475569" };

                                    if (tx.type === 'Deposit' || tx.type === 'deposit') {
                                        displayType = 'Deposit';
                                        typeColor = { bg: "#dcfce7", text: "#166534" };
                                    } else if (tx.type === 'Cashout' || tx.type === 'cashout') {
                                        displayType = 'Cashout';
                                        typeColor = { bg: "#fee2e2", text: "#991b1b" };
                                    } else if (tx.bonusType === 'match') {
                                        displayType = 'Match Bonus';
                                        typeColor = { bg: "#eff6ff", text: "#0369a1" };
                                    } else if (tx.bonusType === 'special') {
                                        displayType = 'Special Bonus';
                                        typeColor = { bg: "#faf5ff", text: "#6b21a8" };
                                    } else if (tx.bonusType === 'streak') {
                                        displayType = 'Streak Bonus';
                                        typeColor = { bg: "#fffbeb", text: "#92400e" };
                                    } else if (tx.bonusType === 'referral') {
                                        displayType = 'Referral Bonus';
                                        typeColor = { bg: "#f0fdf4", text: "#166534" };
                                    }

                                    const positive = !['Cashout', 'cashout'].includes(tx.type);
                                    const isUndoing = undoingId === tx.id;
                                    const canUndo = (tx.status === "COMPLETED" || tx.status === "PENDING") && !isUndoing;

                                    return (
                                        <tr
                                            key={tx.id ?? i}
                                            onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            style={{
                                                borderBottom: "1px solid #f1f5f9",
                                                opacity: tx.status === "CANCELLED" ? 0.6 : 1
                                            }}>

                                            <td style={{
                                                padding: "11px 14px", color: "#0ea5e9",
                                                fontWeight: "600", fontSize: "12px"
                                            }}>{tx.id}</td>

                                            <td style={{ padding: "11px 14px", minWidth: "120px" }}>
                                                <div style={{
                                                    fontWeight: "600", color: "#0f172a",
                                                    fontSize: "13px"
                                                }}>{tx.playerName || "—"}</div>
                                                <div style={{
                                                    fontSize: "11px", color: "#94a3b8"
                                                }}>{tx.email || ""}</div>
                                            </td>

                                            <td style={{ padding: "11px 14px" }}>
                                                <span style={{
                                                    display: "inline-block", padding: "3px 9px",
                                                    background: typeColor.bg, color: typeColor.text,
                                                    borderRadius: "6px", fontSize: "12px",
                                                    fontWeight: "600", whiteSpace: "nowrap"
                                                }}>
                                                    {displayType}
                                                </span>
                                            </td>

                                            <td style={{
                                                padding: "11px 14px", fontWeight: "700",
                                                fontSize: "14px",
                                                color: positive ? "#10b981" : "#ef4444",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {positive ? "+" : "−"}{fmt(tx.amount)}
                                            </td>

                                            {/* ✅ Game name - NOW PROPERLY DISPLAYED */}
                                            <td style={{ padding: "11px 14px" }}>
                                                {tx.gameName
                                                    ? <span style={{
                                                        display: "inline-block", padding: "2px 8px",
                                                        background: "#f1f5f9", borderRadius: "5px",
                                                        fontSize: "11px", fontWeight: "500",
                                                        color: "#475569", whiteSpace: "nowrap"
                                                    }}>{tx.gameName}</span>
                                                    : <span style={{
                                                        color: "#cbd5e1", fontSize: "12px"
                                                    }}>—</span>
                                                }
                                            </td>

                                            {/* ✅ Wallet info - NOW PROPERLY DISPLAYED */}
                                            <td style={{ padding: "11px 14px", minWidth: "150px" }}>
                                                {(tx.walletMethod || tx.walletName) ? (
                                                    <div>
                                                        <div style={{
                                                            fontSize: "12px", fontWeight: "600",
                                                            color: "#0f172a"
                                                        }}>
                                                            {tx.walletMethod || "Unknown"}
                                                        </div>
                                                        <div style={{
                                                            fontSize: "11px", color: "#94a3b8",
                                                            marginTop: "1px"
                                                        }}>
                                                            {tx.walletName || "—"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{
                                                        color: "#cbd5e1", fontSize: "12px"
                                                    }}>No wallet</span>
                                                )}
                                            </td>

                                            {/* ✅ Balance before → after - NOW PROPERLY DISPLAYED */}
                                            <td style={{
                                                padding: "11px 14px", fontSize: "12px",
                                                whiteSpace: "nowrap", minWidth: "140px"
                                            }}>
                                                {tx.balanceBefore != null && tx.balanceAfter != null ? (
                                                    <>
                                                        <span style={{ color: "#64748b" }}>
                                                            {fmt(tx.balanceBefore)}
                                                        </span>
                                                        <span style={{
                                                            color: positive ? "#22c55e" : "#ef4444",
                                                            fontWeight: "700"
                                                        }}> → {fmt(tx.balanceAfter)}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ color: "#cbd5e1" }}>—</span>
                                                )}
                                            </td>

                                            <td style={{ padding: "11px 14px" }}>
                                                <span style={{
                                                    display: "inline-block", padding: "3px 9px",
                                                    borderRadius: "6px", fontSize: "12px",
                                                    fontWeight: "600",
                                                    background: tx.status === "COMPLETED"
                                                        ? "#dcfce7"
                                                        : tx.status === "CANCELLED"
                                                            ? "#fee2e2" : "#fef3c7",
                                                    color: tx.status === "COMPLETED"
                                                        ? "#166534"
                                                        : tx.status === "CANCELLED"
                                                            ? "#991b1b" : "#92400e",
                                                }}>{tx.status}</span>
                                            </td>

                                            <td style={{
                                                padding: "11px 14px", color: "#64748b",
                                                fontSize: "12px", whiteSpace: "nowrap"
                                            }}>
                                                {formatDate(tx.timestamp ?? tx.createdAt)}
                                            </td>

                                            {/* Undo button */}
                                            <td style={{ padding: "11px 14px" }}>
                                                {canUndo && (
                                                    <button
                                                        onClick={() => handleUndo(tx.id, tx.playerId)}
                                                        title="Undo — reverses transaction and syncs all data in real-time"
                                                        style={{
                                                            background: "none",
                                                            border: "1px solid #e2e8f0",
                                                            color: "#64748b", cursor: "pointer",
                                                            fontWeight: "600", fontSize: "12px",
                                                            borderRadius: "6px", padding: "4px 10px",
                                                            display: "flex", alignItems: "center",
                                                            gap: "4px", whiteSpace: "nowrap",
                                                            transition: "all .15s"
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.borderColor = "#ef4444";
                                                            e.currentTarget.style.color = "#ef4444";
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.borderColor = "#e2e8f0";
                                                            e.currentTarget.style.color = "#64748b";
                                                        }}>
                                                        ↩ Undo
                                                    </button>
                                                )}
                                                {isUndoing && (
                                                    <span style={{
                                                        fontSize: "12px", color: "#94a3b8"
                                                    }}>Reversing…</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { 
                    from { transform: rotate(0deg); } 
                    to { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
}

export default AddTransactionsPage;