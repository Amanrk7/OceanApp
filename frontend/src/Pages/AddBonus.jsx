import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { CheckCircle, AlertCircle, Search, X, Gift, RefreshCw, Flame, Tag } from "lucide-react";
import { api } from "../api";
import { fmtTX } from "../utils/txTime";
import { useParams, useNavigate } from 'react-router-dom';
import { ShiftStatusContext } from "../Context/membershiftStatus";


const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);
const ICheck = () => <Ico d="M20 6L9 17l-5-5" />;
const IAlert = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const IPlus = () => <Ico d="M12 5v14M5 12h14" />;
const IX = () => <Ico d="M18 6L6 18M6 6l12 12" />;
const IUser = () => <Ico d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']} />;
const ILock = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;
const IMail = () => <Ico d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6']} />;
const IPhone = () => <Ico d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IUsers = () => <Ico d={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z']} />;
const IShield = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IWarn = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={13} />;
const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
    violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};


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

// ─── Bonus type config ────────────────────────────────────────────────────────
const BONUS_TYPES = [
    {
        id: "streak",
        label: "Streak Bonus",
        icon: Flame,
        color: { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", text: "#92400e", badge: "#fef3c7" },
        description: (streak) => `$1 × ${streak} day${streak !== 1 ? "s" : ""} = ${fmt(streak)} — streak resets to 0 after granting`,
    },
    {
        id: "other",
        label: "Custom Bonus",
        icon: Tag,
        color: { bg: "#eff6ff", border: "#bfdbfe", dot: "rgb(14, 165, 233)", text: "rgb(14, 165, 233)", badge: "#dbeafe" },
        description: () => "Enter a label (e.g. 'Tournament Prize') and a custom amount",
    },
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN BONUS PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function BonusPage() {
    const { shiftActive } = useContext(ShiftStatusContext);
    const navigate = useNavigate();

    // ── Player search state ───────────────────────────────────────────────────
    const [player, setPlayer] = useState(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [eligLoading, setEligLoading] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef(null);

    // ── Form state ────────────────────────────────────────────────────────────
    const [bonusType, setBonusType] = useState("streak");
    const [customLabel, setCustomLabel] = useState("");   // only used when bonusType === "other"
    const [amount, setAmount] = useState("");
    const [selectedGameId, setSelectedGameId] = useState("");
    const [notes, setNotes] = useState("");

    // ── Data state ────────────────────────────────────────────────────────────
    const [games, setGames] = useState([]);
    const [gamesLoading, setGamesLoading] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [lastLedgerRefresh, setLastLedgerRefresh] = useState(null);

    // ── Submission state ──────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // ── Load games ────────────────────────────────────────────────────────────
    const loadGames = useCallback(async (silent = false) => {
        try {
            if (!silent) setGamesLoading(true);
            const r = await api.games.getGames();
            setGames(r?.data || []);
        } catch (e) { console.error(e); }
        finally { if (!silent) setGamesLoading(false); }
    }, []);

    // ── Load ledger ───────────────────────────────────────────────────────────
    const loadLedger = useCallback(async (silent = false) => {
        try {
            if (!silent) setLedgerLoading(true);
            const r = await api.bonuses.getLedger();
            setLedger(r?.data || []);
            setLastLedgerRefresh(new Date());
        } catch (e) { console.error(e); }
        finally { if (!silent) setLedgerLoading(false); }
    }, []);

    useEffect(() => {
        loadGames();
        loadLedger();
        const ledgerInterval = setInterval(() => loadLedger(true), 10000);
        const gamesInterval = setInterval(() => loadGames(true), 15000);
        return () => { clearInterval(ledgerInterval); clearInterval(gamesInterval); };
    }, [loadGames, loadLedger]);

    // ── Auto-fill amount when streak bonus + player selected ──────────────────
    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;

    useEffect(() => {
        if (bonusType === "streak" && player) {
            setAmount(streak > 0 ? (streak * 1.0).toFixed(2) : "");
        } else if (bonusType === "other") {
            setAmount(""); // clear when switching to other
        }
    }, [bonusType, player, streak]);

    // ── Player search dropdown ────────────────────────────────────────────────
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
        setAmount("");
        setSelectedGameId("");
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const amt = parseFloat(amount) || 0;
    const selectedGame = games.find(g => g.id === selectedGameId) || null;
    const stockOk = selectedGame ? amt <= selectedGame.pointStock : false;
    const customLabelOk = bonusType === "streak" || customLabel.trim().length > 0;
    const canSubmit = !!player?.id && amt > 0 && !!selectedGameId && stockOk && customLabelOk && !submitting;

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!player?.id) { setError("Please select a player."); return; }
        if (!selectedGameId) { setError("Please select a game."); return; }
        if (!amt || amt <= 0) { setError("Enter a valid bonus amount."); return; }
        if (bonusType === "other" && !customLabel.trim()) { setError("Enter a label for the custom bonus."); return; }
        if (!stockOk) { setError(`Insufficient game stock. ${selectedGame?.name} has ${selectedGame?.pointStock?.toFixed(0)} pts, need ${amt.toFixed(2)} pts.`); return; }

        // For custom bonus: send the label text as bonusType so backend
        // uses it as the description prefix (requires backend one-liner — see note below).
        const bonusTypePayload = bonusType === "streak" ? "streak" : customLabel.trim();

        try {
            setSubmitting(true);
            await api.bonuses.grantBonus({
                playerId: player.id,
                amount: amt,
                gameId: selectedGameId,
                bonusType: bonusTypePayload,
                notes: notes.trim() || undefined,
            });

            const displayLabel = bonusType === "streak" ? "Streak Bonus" : customLabel.trim();
            let msg = `${fmt(amt)} ${displayLabel} granted to ${player.name} from ${selectedGame?.name}.`;
            if (bonusType === "streak") msg += " Streak has been reset to 0.";
            setSuccess(msg);

            setAmount("");
            setNotes("");
            setSelectedGameId("");
            setCustomLabel("");

            const fresh = await api.players.getPlayer(player.id);
            setPlayer(fresh?.data || player);
            await Promise.all([loadGames(true), loadLedger()]);
        } catch (err) {
            setError(err.message || "Failed to grant bonus. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClear = () => {
        setAmount("");
        setNotes("");
        setSelectedGameId("");
        setCustomLabel("");
        setError("");
        setSuccess("");
        clearPlayer();
        setBonusType("streak");
    };

    // ── Ledger type resolver ──────────────────────────────────────────────────
    // Description format from backend: "<BonusLabel> from <GameName> — <notes>"
    // For custom bonuses the label is whatever the admin typed.
    const resolveLedgerType = (b) => {
        const desc = (b.description || "");
        const descLower = desc.toLowerCase();
        if (descLower.startsWith("streak bonus")) return { label: "Streak Bonus", emoji: "🔥", bg: "#fffbeb", color: "#92400e" };
        if (descLower.startsWith("referral bonus")) return { label: "Referral Bonus", emoji: "👤", bg: "#f0fdf4", color: "#166534" };
        if (descLower.startsWith("match bonus")) return { label: "Match Bonus", emoji: "💰", bg: "#eff6ff", color: "rgb(14, 165, 233)" };
        // Extract custom label: everything before " from " in description
        const fromIdx = desc.indexOf(" from ");
        const customType = fromIdx > 0 ? desc.slice(0, fromIdx).trim() : "Custom Bonus";
        return { label: customType, emoji: "🏷️", bg: "#f5f3ff", color: "#5b21b6" };
    };


    if (!shiftActive) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Breadcrumb */}
                {/* <Breadcrumb /> */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', background: 'none' }}>
                    <button onClick={() => navigate('/shifts')} style={{
                        padding: '9px 18px',
                        background: 'rgb(14, 165, 233)',
                        color: 'rgb(255, 255, 255)'
                    }}
                    >
                        Start Shift
                    </button>
                </nav>


                <div style={{ padding: '14px 18px', background: C.amberLt, borderLeft: `4px solid ${C.amber}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <IAlert />
                    <div>
                        <p style={{ fontWeight: '700', color: '#78350f', margin: '0 0 2px', fontSize: '14px' }}>Shift Required</p>
                        <p style={{ color: '#92400e', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>You must have an active shift to grant bonus to the players.</p>
                    </div>
                </div>
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '60px 28px', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '60px', background: C.amberLt, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `1px solid ${C.amberBdr}` }}>
                        <ILock />
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: '#78350f' }}>Form Locked</p>
                    <p style={{ margin: 0, fontSize: '13px', color: C.amber }}>Go to Shifts and start your shift first.</p>
                </div>
            </div >
        );
    }


    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* ════ FORM CARD ════ */}
            <div style={CARD}>

                {/* Header banner */}
                <div style={{ marginBottom: "24px", padding: "14px 16px", background: "#fffbeb", borderLeft: "4px solid #f59e0b", borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <Gift style={{ width: "18px", height: "18px", color: "#b45309", flexShrink: 0, marginTop: "1px" }} />
                    <div>
                        <p style={{ fontWeight: "700", color: "#78350f", margin: "0 0 2px", fontSize: "14px" }}>Award Player Bonuses</p>
                        <p style={{ color: "#92400e", margin: 0, fontSize: "12px", lineHeight: "1.6" }}>
                            <strong>Streak Bonus:</strong> $1 per consecutive day — amount is auto-filled from the player's streak. Streak resets to 0 after granting.<br />
                            <strong>Other Bonus:</strong> Enter a custom amount to credit to the player. Points are deducted from the selected game.
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
                    <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "1px" }} /> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

                    {/* ── 1. Player search ── */}
                    <div>
                        <label style={LABEL}>Player * — search by name or username</label>
                        <div ref={dropRef} style={{ position: "relative" }}>
                            <div style={{ position: "relative" }}>
                                <Search style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                <input
                                    type="text"
                                    placeholder="Type at least 2 characters…"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); if (player) clearPlayer(); }}
                                    style={{ ...INPUT, paddingLeft: "34px", paddingRight: player ? "36px" : "12px" }}
                                />
                                {(player || query) && (
                                    <button type="button" onClick={clearPlayer}
                                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                                        <X style={{ width: "14px", height: "14px" }} />
                                    </button>
                                )}
                            </div>

                            {searching && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", color: "#94a3b8", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                                    Searching…
                                </div>
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
                                                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: "700", display: "inline-block", marginTop: "2px", background: p.tier === "GOLD" ? "#fef3c7" : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa", color: p.tier === "GOLD" ? "#92400e" : p.tier === "SILVER" ? "#3730a3" : "#9a3412" }}>
                                                        {p.tier}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {eligLoading && (
                                <div style={{ marginTop: "6px", fontSize: "12px", color: "#94a3b8" }}>Loading player data…</div>
                            )}

                            {/* Selected player info strip */}
                            {player && !eligLoading && (
                                <div style={{ marginTop: "10px", padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{player.name}</div>
                                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>ID {player.id} · Balance: <strong style={{ color: "#10b981" }}>{fmt(player.balance)}</strong></div>
                                    </div>
                                    {/* Streak badge */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                        {streak > 0 ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "20px", fontSize: "13px", fontWeight: "700", color: "#92400e" }}>
                                                🔥 {streak}-day streak
                                                <span style={{ fontWeight: "500", color: "#b45309", fontSize: "11px" }}>= {fmt(streak * 1.0)} bonus</span>
                                            </span>
                                        ) : (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#94a3b8" }}>
                                                🔥 No active streak
                                            </span>
                                        )}
                                        <span style={{ padding: "5px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "20px", fontSize: "12px", fontWeight: "700", color: "rgb(14, 165, 233)" }}>
                                            {player.tier}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 2. Bonus type selector ── */}
                    <div>
                        <label style={LABEL}>Bonus Type *</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            {BONUS_TYPES.map(bt => {
                                const Icon = bt.icon;
                                const selected = bonusType === bt.id;
                                const playerStreak = player ? streak : 0;
                                const desc = bt.description(playerStreak);
                                return (
                                    <button
                                        key={bt.id}
                                        type="button"
                                        onClick={() => setBonusType(bt.id)}
                                        style={{
                                            display: "flex", alignItems: "flex-start", gap: "10px",
                                            padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
                                            border: `2px solid ${selected ? bt.color.dot : "#e2e8f0"}`,
                                            background: selected ? bt.color.bg : "#fafafa",
                                            fontFamily: "inherit", textAlign: "left", transition: "all .15s",
                                        }}>
                                        <div style={{ width: "34px", height: "34px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? bt.color.badge : "#f1f5f9", border: `1px solid ${selected ? bt.color.border : "#e2e8f0"}` }}>
                                            <Icon style={{ width: "15px", height: "15px", color: selected ? bt.color.dot : "#94a3b8" }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: "700", fontSize: "13px", color: selected ? bt.color.text : "#374151" }}>{bt.label}</div>
                                            <div style={{ fontSize: "11px", color: selected ? bt.color.text : "#94a3b8", marginTop: "2px", lineHeight: "1.5", opacity: selected ? 0.9 : 0.7 }}>{desc}</div>
                                        </div>
                                        {selected && (
                                            <CheckCircle style={{ width: "14px", height: "14px", color: bt.color.dot, flexShrink: 0, marginTop: "2px" }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom label input — only shown when "other" is selected */}
                        {bonusType === "other" && (
                            <div style={{ marginTop: "12px" }}>
                                <label style={LABEL}>
                                    Custom Bonus Label *
                                    <span style={{ marginLeft: "6px", fontWeight: "400", textTransform: "none", letterSpacing: 0, color: "#94a3b8" }}>
                                        — this will appear as the bonus type in the ledger and transactions
                                    </span>
                                </label>
                                <div style={{ position: "relative" }}>
                                    <Tag style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                    <input
                                        type="text"
                                        placeholder="e.g. Tournament Prize, Loyalty Bonus, Weekend Promo…"
                                        value={customLabel}
                                        onChange={e => setCustomLabel(e.target.value)}
                                        maxLength={60}
                                        style={{ ...INPUT, paddingLeft: "34px", borderColor: customLabel.trim() ? "#bfdbfe" : "#e2e8f0" }}
                                    />
                                </div>
                                {customLabel.trim() && (
                                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#5b21b6", fontWeight: "600" }}>
                                        🏷️ Will display as: <strong>"{customLabel.trim()}"</strong> in ledger &amp; transactions
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── 3. Amount + Game row ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "start" }}>

                        {/* Amount */}
                        <div>
                            <label style={LABEL}>
                                Bonus Amount ($) *
                                {bonusType === "streak" && player && streak > 0 && (
                                    <span style={{ marginLeft: "6px", fontWeight: "500", textTransform: "none", letterSpacing: 0, color: "#f59e0b" }}>auto-filled from streak</span>
                                )}
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                readOnly={bonusType === "streak" && player && streak > 0}
                                style={{
                                    ...INPUT,
                                    background: bonusType === "streak" && player && streak > 0 ? "#fffbeb" : "#fff",
                                    color: bonusType === "streak" && player && streak > 0 ? "#92400e" : "#0f172a",
                                    fontWeight: bonusType === "streak" && player && streak > 0 ? "700" : "400",
                                    cursor: bonusType === "streak" && player && streak > 0 ? "default" : "text",
                                }}
                            />
                            {bonusType === "streak" && player && streak === 0 && (
                                <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>
                                    ⚠ Player has no active streak
                                </div>
                            )}
                        </div>

                        {/* Game selector */}
                        <div>
                            <label style={LABEL}>Select Game * — points will be deducted from this game</label>
                            {gamesLoading ? (
                                <div style={{ ...INPUT, color: "#94a3b8", display: "flex", alignItems: "center" }}>Loading games…</div>
                            ) : (
                                <select
                                    value={selectedGameId}
                                    onChange={e => setSelectedGameId(e.target.value)}
                                    style={{ ...INPUT, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                                    <option value="">— Choose a game —</option>
                                    {games.map(g => (
                                        <option key={g.id} value={g.id} disabled={g.pointStock <= 0}>
                                            {g.name}  ·  {g.pointStock.toFixed(0)} pts available{g.pointStock <= 0 ? "  (No stock)" : g.pointStock <= 500 ? "  (Low stock)" : ""}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Stock indicator */}
                            {selectedGame && amt > 0 && (
                                <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: stockOk ? "#f0fdf4" : "#fee2e2", border: `1px solid ${stockOk ? "#86efac" : "#fca5a5"}`, fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: stockOk ? "#166534" : "#991b1b", fontWeight: "600" }}>
                                        {stockOk
                                            ? `✓ ${selectedGame.name}: ${selectedGame.pointStock.toFixed(0)} pts → ${(selectedGame.pointStock - amt).toFixed(0)} pts after`
                                            : `⚠ Need ${amt.toFixed(0)} pts, only ${selectedGame.pointStock.toFixed(0)} available`
                                        }
                                    </span>
                                    <span style={{ color: stockOk ? "#16a34a" : "#ef4444", fontWeight: "700" }}>
                                        -{amt.toFixed(0)} pts
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 4. Notes ── */}
                    <div>
                        <label style={LABEL}>Notes (optional)</label>
                        <textarea
                            placeholder={bonusType === "streak" ? "e.g., 'Weekly streak reward'…" : "e.g., 'Tournament prize', 'Weekend promotion'…"}
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            style={{ ...INPUT, resize: "none", lineHeight: "1.6" }}
                        />
                    </div>

                    {/* ── Summary bar ── */}
                    {player && amt > 0 && selectedGame && (
                        <div style={{ padding: "14px 18px", background: stockOk ? "#f0fdf4" : "#fee2e2", border: `1px solid ${stockOk ? "#86efac" : "#fca5a5"}`, borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: "700", fontSize: "13px", color: stockOk ? "#166534" : "#991b1b" }}>
                                    {stockOk ? `✓ Ready to grant` : "⚠ Cannot grant — insufficient game stock"}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                    {bonusType === "streak" ? "Streak Bonus" : (customLabel.trim() || "Custom Bonus")} · {selectedGame.name} · {player.name}
                                    {bonusType === "streak" && <span style={{ color: "#f59e0b", marginLeft: "6px" }}>· Streak resets to 0</span>}
                                </div>
                            </div>
                            <span style={{ fontSize: "22px", fontWeight: "900", color: stockOk ? "#10b981" : "#ef4444" }}>
                                +{fmt(amt)}
                            </span>
                        </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                        <button type="button" onClick={handleClear}
                            style={{ flex: 1, padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                            Clear
                        </button>
                        <button type="submit" disabled={!canSubmit}
                            style={{
                                flex: 2, padding: "12px", border: "none", borderRadius: "8px",
                                fontWeight: "700", fontSize: "14px", fontFamily: "inherit",
                                cursor: canSubmit ? "pointer" : "not-allowed",
                                background: canSubmit ? "#d97706" : "#e2e8f0",
                                color: canSubmit ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                transition: "background .2s",
                            }}>
                            {submitting
                                ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Granting…</>
                                : <><Gift style={{ width: "15px", height: "15px" }} /> Grant {bonusType === "streak" ? "Streak Bonus" : (customLabel.trim() || "Custom Bonus")} {amt > 0 ? `(+${fmt(amt)})` : ""}</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ════ BONUS LEDGER ════ */}
            <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(15,23,42,.07)", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Bonus Ledger</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                            {ledger.length > 0 ? `${ledger.length} bonus grant${ledger.length !== 1 ? "s" : ""}` : "No bonuses yet"}
                            {lastLedgerRefresh && (
                                <span style={{ marginLeft: "8px", color: "#16a34a", fontWeight: "600" }}>
                                    · Live · {fmtTX(lastLedgerRefresh)}
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={() => loadLedger()} disabled={ledgerLoading}
                        style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600", fontFamily: "inherit" }}>
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
                    <div style={{ overflowX: "auto", maxHeight: "500px", overflowY: "auto", scrollbarWidth: "thin" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                                    {["#", "Player", "Bonus Type", "Amount", "Game", "Bal. Before → After", "Date"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: "600", color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((b, i) => {
                                    const bt = resolveLedgerType(b);
                                    return (
                                        <tr key={b.id ?? i}
                                            onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            style={{ borderBottom: "1px solid #f1f5f9" }}>

                                            {/* # */}
                                            <td style={{ padding: "11px 14px", color: "#cbd5e1", fontSize: "12px" }}>#{ledger.length - i}</td>

                                            {/* Player */}
                                            <td style={{ padding: "11px 14px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "13px" }}>{b.playerName || "—"}</div>
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {b.playerId}</div>
                                            </td>

                                            {/* Bonus Type */}
                                            <td style={{ padding: "11px 14px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", background: bt.bg, color: bt.color, borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                                                    {bt.emoji} {bt.label}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td style={{ padding: "11px 14px" }}>
                                                <span style={{ fontWeight: "800", color: "#d97706", fontSize: "15px" }}>
                                                    +{fmt(b.amount)}
                                                </span>
                                            </td>

                                            {/* Game */}
                                            <td style={{ padding: "11px 14px" }}>
                                                {b.gameName
                                                    ? <span style={{ display: "inline-block", padding: "3px 9px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "500", color: "#475569", whiteSpace: "nowrap" }}>
                                                        {b.gameName.match(/^[^-]+/)[0].trim()}
                                                    </span>
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>
                                                }
                                            </td>

                                            {/* Balance before → after */}
                                            <td style={{ padding: "11px 14px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                                                {b.balanceBefore != null && b.balanceAfter != null
                                                    ? <><span>${parseFloat(b.balanceBefore).toFixed(2)}</span>{" "}<span style={{ color: "#22c55e", fontWeight: "700" }}>→ ${parseFloat(b.balanceAfter).toFixed(2)}</span></>
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>
                                                }
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap", fontSize: "12px" }}>
                                                {fmtTX(b.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
