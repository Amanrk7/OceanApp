import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { CheckCircle, Search, X, Gift, RefreshCw, Flame, Tag, Users, Lock, ChevronRight, Zap } from "lucide-react";
import { api } from "../api";
import { fmtTX } from "../utils/txTime";
import { useNavigate } from 'react-router-dom';
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';
import { useToast } from '../Context/toastContext';

/* ─── Micro helpers ──────────────────────────────────────────────────────── */
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

/* ─── Bonus type config ───────────────────────────────────────────────────── */
const BONUS_TYPES = [
    {
        id: "streak",
        label: "Streak",
        sublabel: "Daily streak reward",
        icon: Flame,
        accent: "#f59e0b",
        bg: "#fffbeb",
        border: "#fde68a",
        text: "#92400e",
    },
    {
        id: "referral",
        label: "Referral",
        sublabel: "Deposit-linked bonus",
        icon: Users,
        accent: "#22c55e",
        bg: "#f0fdf4",
        border: "#86efac",
        text: "#166534",
    },
    {
        id: "other",
        label: "Custom",
        sublabel: "Any label & amount",
        icon: Tag,
        accent: "#0ea5e9",
        bg: "#f0f9ff",
        border: "#bae6fd",
        text: "#0369a1",
    },
];

/* ─── Reusable atoms ──────────────────────────────────────────────────────── */
const Label = ({ children, hint }) => (
    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "7px" }}>
        {children}
        {hint && <span style={{ marginLeft: "6px", fontWeight: "400", textTransform: "none", letterSpacing: 0, color: "#94a3b8" }}>{hint}</span>}
    </label>
);

const inputBase = {
    width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
    borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
    boxSizing: "border-box", background: "#fff", color: "#0f172a",
    outline: "none", transition: "border-color .15s",
};

/* Step pill shown inside referral panel */
const StepPill = ({ n, label, active, done }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
            width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: "800",
            background: done ? "#22c55e" : active ? "#0f172a" : "#e2e8f0",
            color: done || active ? "#fff" : "#94a3b8",
            flexShrink: 0,
            transition: "all .2s",
        }}>
            {done ? "✓" : n}
        </div>
        <span style={{ fontSize: "12px", fontWeight: done || active ? "700" : "500", color: done ? "#16a34a" : active ? "#0f172a" : "#94a3b8", transition: "color .2s" }}>
            {label}
        </span>
    </div>
);

const Divider = () => <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function BonusPage() {
    const { shiftActive, shiftLoading } = useContext(ShiftStatusContext);
    const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);
    const navigate = useNavigate();
    const { add: toast } = useToast();

    /* Player search */
    const [player, setPlayer] = useState(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [eligLoading, setEligLoading] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const [eligibleBonuses, setEligibleBonuses] = useState([]);
    const [selectedRbId, setSelectedRbId] = useState(null);
    const [referralSide, setReferralSide] = useState('referred');
    const dropRef = useRef(null);

    /* Form */
    const [bonusType, setBonusType] = useState("streak");
    const [customLabel, setCustomLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [selectedGameId, setSelectedGameId] = useState("");
    const [notes, setNotes] = useState("");
    const [referralTarget, setReferralTarget] = useState("player");
    const [bonusPct, setBonusPct] = useState(50);
    const [grantBoth, setGrantBoth] = useState(false);

    /* Data */
    const [games, setGames] = useState([]);
    const [gamesLoading, setGamesLoading] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [lastLedgerRefresh, setLastLedgerRefresh] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleView = (p) => { setSelectedPlayer(p); navigate(`/playerDashboard/${p.id}`); };

    /* Load eligible bonuses */
    useEffect(() => {
        if (!player?.id) { setEligibleBonuses([]); setSelectedRbId(null); return; }
        setEligLoading(true);
        api.referralBonuses.getEligible(player.id)
            .then(r => setEligibleBonuses(r?.data || []))
            .catch(() => setEligibleBonuses([]))
            .finally(() => setEligLoading(false));
    }, [player?.id]);

    useEffect(() => {
        if (bonusType !== 'referral') return;
        const rb = eligibleBonuses.find(e => e.id === selectedRbId);
        if (rb) setAmount(parseFloat((rb.depositAmount * (bonusPct / 100)).toFixed(2)).toFixed(2));
        else setAmount('');
    }, [selectedRbId, bonusType, eligibleBonuses, bonusPct]);

    const loadGames = useCallback(async (silent = false) => {
        try { if (!silent) setGamesLoading(true); const r = await api.games.getGames(); setGames(r?.data || []); }
        catch (e) { console.error(e); } finally { if (!silent) setGamesLoading(false); }
    }, []);

    const loadLedger = useCallback(async (silent = false) => {
        try {
            if (!silent) setLedgerLoading(true);
            const r = await api.bonuses.getLedger();
            setLedger(r?.data || []); setLastLedgerRefresh(new Date());
        } catch (e) { console.error(e); } finally { if (!silent) setLedgerLoading(false); }
    }, []);

    useEffect(() => {
        loadGames(); loadLedger();
        const li = setInterval(() => loadLedger(true), 10000);
        const gi = setInterval(() => loadGames(true), 15000);
        return () => { clearInterval(li); clearInterval(gi); };
    }, [loadGames, loadLedger]);

    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const hasReferrer = !!(player?.referredBy);
    const referrerInfo = player?.referredBy || null;

    const playerReferralUsed = (() => {
        if (!player) return false;
        return (player.transactionHistory || []).some(tx =>
            tx.type === "Referral Bonus" || (typeof tx.type === "string" && tx.type.toLowerCase().includes("referral"))
        );
    })();

    const referralEligible = hasReferrer;

    useEffect(() => { setReferralTarget("player"); }, [bonusType]);

    useEffect(() => {
        if (bonusType === "streak" && player) setAmount(streak > 0 ? (streak * 1.0).toFixed(2) : "");
        else if (bonusType === "referral" || bonusType === "other") setAmount("");
    }, [bonusType, player, streak]);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setShowDrop(false); return; }
        const t = setTimeout(async () => {
            try {
                setSearching(true);
                const r = await api.players.getPlayers(1, 10, query, "");
                setResults(r?.data || []); setShowDrop(true);
            } catch (e) { console.error(e); } finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    const selectPlayer = async (p) => {
        setQuery(p.name); setShowDrop(false); setResults([]); setPlayer(null); setEligLoading(true);
        try { const r = await api.players.getPlayer(p.id); setPlayer(r?.data || p); }
        catch { setPlayer(p); } finally { setEligLoading(false); }
    };

    const clearPlayer = () => { setPlayer(null); setQuery(""); setAmount(""); setSelectedGameId(""); setReferralTarget("player"); };

    const amt = parseFloat(amount) || 0;
    const selectedGame = games.find(g => g.id === selectedGameId) || null;
    const stockNeeded = amt;
    const stockOk = selectedGame ? stockNeeded <= selectedGame.pointStock : false;
    const customLabelOk = bonusType === "streak" || bonusType === "referral" || customLabel.trim().length > 0;
    const referralOk = bonusType !== "referral" || eligibleBonuses.length > 0;

    const canSubmit = !!player?.id && amt > 0 && !!selectedGameId && stockOk && customLabelOk && referralOk && !submitting;

    const matchUsedToday = (() => {
        if (!player) return false;
        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return (player.transactionHistory || []).some(tx => tx.date === todayStr && tx.type === "Match Bonus");
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!player?.id) { toast("Please select a player.", "error"); return; }
        if (!selectedGameId) { toast("Please select a game.", "error"); return; }
        if (!amt || amt <= 0) { toast("Enter a valid bonus amount.", "error"); return; }
        if (bonusType === "other" && !customLabel.trim()) { toast("Enter a label for the custom bonus.", "error"); return; }
        if (bonusType === "referral" && eligibleBonuses.length === 0) { toast("No eligible referral bonus records found.", "error"); return; }
        if (!stockOk) { toast(`Insufficient game stock. ${selectedGame?.name} has ${selectedGame?.pointStock?.toFixed(0)} pts, need ${amt.toFixed(0)} pts.`, "error"); return; }

        let recipientPlayerId = player.id;
        let bonusTypePayload;

        if (bonusType === "streak") {
            bonusTypePayload = "streak"; recipientPlayerId = player.id;
        } else if (bonusType === "referral") {
            bonusTypePayload = "Referral Bonus";
            if (referralTarget === "referrer") {
                const refId = referrerInfo?.id || referrerInfo;
                if (!refId) { toast("Could not resolve referrer ID.", "error"); return; }
                recipientPlayerId = parseInt(refId);
            } else { recipientPlayerId = player.id; }
        } else {
            bonusTypePayload = customLabel.trim(); recipientPlayerId = player.id;
        }

        if (bonusType === 'referral') {
            if (!selectedRbId) { toast("Please select a referral bonus record.", "error"); return; }
            try {
                setSubmitting(true);
                const result = await api.referralBonuses.claim(selectedRbId, {
                    side: referralSide, gameId: selectedGameId,
                    notes: notes.trim() || undefined,
                    amount: parseFloat(amount), grantBoth,
                });
                toast(result.message, "success");
                setAmount(''); setNotes(''); setSelectedGameId(''); setSelectedRbId(null);
                const fresh = await api.players.getPlayer(player.id);
                setPlayer(fresh?.data || player);
                await Promise.all([loadGames(true), loadLedger()]);
                const rb = await api.referralBonuses.getEligible(player.id);
                setEligibleBonuses(rb?.data || []);
            } catch { toast("Failed to claim referral bonus.", "error"); }
            finally { setSubmitting(false); }
            return;
        }

        try {
            setSubmitting(true);
            await api.bonuses.grantBonus({ playerId: recipientPlayerId, amount: amt, gameId: selectedGameId, bonusType: bonusTypePayload, notes: notes.trim() || undefined });
            let msg = bonusType === "streak"
                ? `${fmt(amt)} Streak Bonus granted to ${player.name}. Streak reset to 0.`
                : bonusType === "referral"
                    ? `${fmt(amt)} Referral Bonus granted from ${selectedGame?.name}.`
                    : `${fmt(amt)} ${customLabel.trim()} granted to ${player.name} from ${selectedGame?.name}.`;
            toast(msg, "success");
            setAmount(""); setNotes(""); setSelectedGameId(""); setCustomLabel(""); setReferralTarget("player");
            const fresh = await api.players.getPlayer(player.id);
            setPlayer(fresh?.data || player);
            await Promise.all([loadGames(true), loadLedger()]);
        } catch { toast("Failed to grant bonus. Please try again.", "error"); }
        finally { setSubmitting(false); }
    };

    const handleClear = () => {
        setAmount(""); setNotes(""); setSelectedGameId(""); setCustomLabel(""); setReferralTarget("player");
        clearPlayer(); setBonusType("streak");
    };

    const resolveLedgerType = (b) => {
        const desc = (b.description || "").toLowerCase();
        if (desc.startsWith("streak bonus")) return { label: "Streak Bonus", emoji: "🔥", bg: "#fffbeb", color: "#92400e" };
        if (desc.startsWith("referral bonus")) return { label: "Referral Bonus", emoji: "👤", bg: "#f0fdf4", color: "#166534" };
        if (desc.startsWith("match bonus")) return { label: "Match Bonus", emoji: "💰", bg: "#eff6ff", color: "#0369a1" };
        const fromIdx = (b.description || "").indexOf(" from ");
        const customType = fromIdx > 0 ? (b.description || "").slice(0, fromIdx).trim() : "Custom Bonus";
        return { label: customType, emoji: "🏷️", bg: "#f5f3ff", color: "#5b21b6" };
    };

    /* ── Shift guards ──────────────────────────────────────────────────────── */
    if (shiftLoading) return (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ width: 28, height: 28, border: "2.5px solid #e2e8f0", borderTopColor: "#0ea5e9", borderRadius: "50%", margin: "0 auto 12px", animation: "spin .8s linear infinite" }} />
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Checking shift status…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (!shiftActive) return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button onClick={() => navigate('/shifts')} style={{ alignSelf: "flex-start", padding: "9px 18px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", fontWeight: 500, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Start Shift
            </button>
            <div style={{ padding: "14px 16px", borderLeft: "3px solid var(--color-border-warning)", background: "var(--color-background-warning)", borderRadius: "var(--border-radius-md)" }}>
                <p style={{ fontWeight: 500, color: "var(--color-text-warning)", margin: "0 0 2px", fontSize: 13 }}>Shift required</p>
                <p style={{ color: "var(--color-text-warning)", margin: 0, fontSize: 12 }}>You must have an active shift to grant bonuses.</p>
            </div>
            <div style={{ padding: "60px 24px", textAlign: "center", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ width: 48, height: 48, background: "var(--color-background-secondary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Lock style={{ width: 20, height: 20, color: "var(--color-text-tertiary)" }} />
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Dashboard locked</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>Go to Shifts and start your shift first.</p>
            </div>
        </div>
    );

    /* ── Referral panel helpers ─────────────────────────────────────────────── */
    const selectedRb = eligibleBonuses.find(e => e.id === selectedRbId) || null;
    const depositAmt = selectedRb?.depositAmount || 0;
    const computedAmt = parseFloat((depositAmt * (bonusPct / 100)).toFixed(2));

    const referralStep = !selectedRbId ? 1 : 2; // step 1 = pick record, step 2 = configure

    /* ══════════════════════════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════════════════════════ */
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "inherit" }}>

            {/* ── FORM CARD ─────────────────────────────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(15,23,42,.06)", overflow: "hidden" }}>

                {/* Header */}
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Gift style={{ width: 16, height: 16, color: "#d97706" }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Award Player Bonus</h2>
                        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Streak · Referral · Custom — all deducted from game stock</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

                    {/* ── 1. Player search ──────────────────────────────────── */}
                    <div>
                        <Label>Player <span style={{ color: "#ef4444" }}>*</span></Label>
                        <div ref={dropRef} style={{ position: "relative" }}>
                            <div style={{ position: "relative" }}>
                                <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }} />
                                <input
                                    type="text"
                                    placeholder="Search by name or username…"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); if (player) clearPlayer(); }}
                                    style={{ ...inputBase, paddingLeft: 34, paddingRight: (player || query) ? 36 : 12 }}
                                />
                                {(player || query) && (
                                    <button type="button" onClick={clearPlayer}
                                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 2 }}>
                                        <X style={{ width: 14, height: 14 }} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown */}
                            {(searching || (showDrop && !searching)) && (
                                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 28px rgba(15,23,42,.12)", overflow: "hidden" }}>
                                    {searching
                                        ? <div style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 13 }}>Searching…</div>
                                        : results.length === 0
                                            ? <div style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 13 }}>No players found for "{query}"</div>
                                            : results.map(p => (
                                                <div key={p.id} onClick={() => selectPlayer(p)}
                                                    style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background .1s" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{p.name}</div>
                                                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{p.email}</div>
                                                    </div>
                                                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: "#10b981" }}>{fmt(p.balance)}</div>
                                                        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, fontWeight: 700, display: "inline-block", marginTop: 2, background: p.tier === "GOLD" ? "#fef3c7" : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa", color: p.tier === "GOLD" ? "#92400e" : p.tier === "SILVER" ? "#3730a3" : "#9a3412" }}>
                                                            {p.tier}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                    }
                                </div>
                            )}

                            {eligLoading && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>Loading player data…</p>}

                            {/* Player status chips */}
                            {player && !eligLoading && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                                    <Chip
                                        emoji={streak > 0 ? "🔥" : "🔥"}
                                        label={streak > 0 ? `${streak}-day streak` : "No active streak"}
                                        sub={streak > 0 ? `= ${fmt(streak)}` : null}
                                        color={streak > 0 ? { bg: "#fffbeb", border: "#fde68a", text: "#92400e" } : { bg: "#f1f5f9", border: "#e2e8f0", text: "#94a3b8" }}
                                    />
                                    <Chip
                                        emoji={matchUsedToday ? "⚠" : "✓"}
                                        label={matchUsedToday ? "Match used today" : "Match available"}
                                        color={matchUsedToday ? { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" } : { bg: "#f0fdf4", border: "#86efac", text: "#166534" }}
                                    />
                                    {hasReferrer ? (
                                        eligibleBonuses.length > 0
                                            ? <Chip emoji="👥" label={`${eligibleBonuses.length} referral pending`} sub={`$${eligibleBonuses.reduce((s, b) => s + b.bonusAmount, 0).toFixed(2)}`} color={{ bg: "#f0fdf4", border: "#86efac", text: "#166534" }} />
                                            : <Chip emoji="👥" label={`Referred by ${referrerInfo?.name || "—"}`} sub="no pending" color={{ bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" }} />
                                    ) : (
                                        <Chip emoji="👥" label="No referrer" color={{ bg: "#f1f5f9", border: "#e2e8f0", text: "#94a3b8" }} />
                                    )}
                                    <Chip emoji="⭐" label={player.tier} color={{ bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 2. Bonus type ────────────────────────────────────── */}
                    <div>
                        <Label>Bonus Type <span style={{ color: "#ef4444" }}>*</span></Label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            {BONUS_TYPES.map(bt => {
                                const Icon = bt.icon;
                                const selected = bonusType === bt.id;
                                const disabled = bt.id === "referral" && player && !eligLoading && eligibleBonuses.length === 0;
                                return (
                                    <button key={bt.id} type="button"
                                        onClick={() => { if (!disabled) setBonusType(bt.id); }}
                                        style={{
                                            padding: "14px 16px", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
                                            border: `1.5px solid ${selected ? bt.accent : "#e2e8f0"}`,
                                            background: selected ? bt.bg : "#fafafa",
                                            fontFamily: "inherit", textAlign: "left",
                                            transition: "all .15s", opacity: disabled ? 0.45 : 1,
                                            display: "flex", alignItems: "center", gap: 12,
                                        }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "#fff" : "#f1f5f9", border: `1px solid ${selected ? bt.border : "#e2e8f0"}`, transition: "all .15s" }}>
                                            <Icon style={{ width: 15, height: 15, color: selected ? bt.accent : "#94a3b8" }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: selected ? bt.text : "#374151", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                {bt.label}
                                                {selected && <CheckCircle style={{ width: 13, height: 13, color: bt.accent }} />}
                                            </div>
                                            <div style={{ fontSize: 11, color: selected ? bt.text : "#94a3b8", marginTop: 1, opacity: selected ? 0.8 : 0.7 }}>
                                                {disabled ? <span style={{ color: "#f59e0b", fontWeight: 600 }}>⚠ No eligible records</span> : bt.sublabel}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom label */}
                        {bonusType === "other" && (
                            <div style={{ marginTop: 14 }}>
                                <Label hint="— shown in ledger & transactions">Custom Label <span style={{ color: "#ef4444" }}>*</span></Label>
                                <div style={{ position: "relative" }}>
                                    <Tag style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }} />
                                    <input type="text" placeholder="e.g. Tournament Prize, Loyalty Bonus…" value={customLabel} onChange={e => setCustomLabel(e.target.value)} maxLength={60}
                                        style={{ ...inputBase, paddingLeft: 34, borderColor: customLabel.trim() ? "#bfdbfe" : "#e2e8f0" }} />
                                </div>
                                {customLabel.trim() && (
                                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#5b21b6", fontWeight: 600 }}>
                                        🏷️ Will display as: <strong>"{customLabel.trim()}"</strong>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── Referral Panel ──────────────────────────────── */}
                        {bonusType === "referral" && player && (
                            <ReferralPanel
                                player={player}
                                eligLoading={eligLoading}
                                eligibleBonuses={eligibleBonuses}
                                selectedRbId={selectedRbId}
                                setSelectedRbId={setSelectedRbId}
                                setReferralSide={setReferralSide}
                                bonusPct={bonusPct}
                                setBonusPct={setBonusPct}
                                grantBoth={grantBoth}
                                setGrantBoth={setGrantBoth}
                                computedAmt={computedAmt}
                                depositAmt={depositAmt}
                                selectedRb={selectedRb}
                            />
                        )}
                    </div>

                    {/* ── 3. Amount + Game ─────────────────────────────────── */}
                    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "start" }}>
                        <div>
                            <Label hint={bonusType === "streak" && streak > 0 ? "auto-filled" : bonusType === "referral" ? "from % above" : null}>
                                Amount ($) <span style={{ color: "#ef4444" }}>*</span>
                            </Label>
                            <input
                                type="number" placeholder="0.00" min="0.01" step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                readOnly={bonusType === "streak" && player && streak > 0}
                                style={{
                                    ...inputBase,
                                    background: bonusType === "streak" && player && streak > 0 ? "#fffbeb" : bonusType === "referral" ? "#f0fdf4" : "#fff",
                                    color: bonusType === "streak" && player && streak > 0 ? "#92400e" : bonusType === "referral" ? "#166534" : "#0f172a",
                                    fontWeight: ((bonusType === "streak" && player && streak > 0) || bonusType === "referral") ? 700 : 400,
                                    cursor: bonusType === "streak" && player && streak > 0 ? "default" : "text",
                                    borderColor: bonusType === "referral" && selectedRb ? "#86efac" : "#e2e8f0",
                                }}
                            />
                            {bonusType === "streak" && player && streak === 0 && (
                                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#ef4444" }}>⚠ No active streak</p>
                            )}
                        </div>

                        <div>
                            <Label hint={bonusType === "referral" && amt > 0 ? `needs ${amt.toFixed(0)} pts` : null}>
                                Game <span style={{ color: "#ef4444" }}>*</span>
                            </Label>
                            {gamesLoading
                                ? <div style={{ ...inputBase, color: "#94a3b8", display: "flex", alignItems: "center" }}>Loading…</div>
                                : <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)}
                                    style={{ ...inputBase, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                                    <option value="">— Choose a game —</option>
                                    {games.map(g => (
                                        <option key={g.id} value={g.id} disabled={g.pointStock <= 0}>
                                            {g.name}  ·  {g.pointStock.toFixed(0)} pts{g.pointStock <= 0 ? " (No stock)" : g.pointStock <= 500 ? " (Low)" : ""}
                                        </option>
                                    ))}
                                </select>
                            }
                            {selectedGame && amt > 0 && (
                                <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: stockOk ? "#f0fdf4" : "#fee2e2", border: `1px solid ${stockOk ? "#86efac" : "#fca5a5"}`, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: stockOk ? "#166534" : "#991b1b", fontWeight: 600 }}>
                                        {stockOk
                                            ? `✓ ${selectedGame.pointStock.toFixed(0)} → ${(selectedGame.pointStock - stockNeeded).toFixed(0)} pts`
                                            : `⚠ Need ${stockNeeded.toFixed(0)}, only ${selectedGame.pointStock.toFixed(0)} available`}
                                    </span>
                                    <span style={{ color: stockOk ? "#16a34a" : "#ef4444", fontWeight: 700 }}>−{stockNeeded.toFixed(0)} pts</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 4. Notes ─────────────────────────────────────────── */}
                    <div>
                        <Label hint="— optional">Notes</Label>
                        <textarea rows={2} placeholder="Additional context…" value={notes} onChange={e => setNotes(e.target.value)}
                            style={{ ...inputBase, resize: "none", lineHeight: "1.6" }} />
                    </div>

                    {/* ── Summary bar ──────────────────────────────────────── */}
                    {player && amt > 0 && selectedGame && (
                        <div style={{ padding: "14px 18px", background: stockOk && referralOk ? "#f0fdf4" : "#fee2e2", border: `1px solid ${stockOk && referralOk ? "#86efac" : "#fca5a5"}`, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: stockOk && referralOk ? "#166534" : "#991b1b" }}>
                                    {!referralOk ? "⚠ No eligible referral records" : !stockOk ? "⚠ Insufficient game stock" : "✓ Ready to grant"}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                    {bonusType === "streak" ? "Streak Bonus" : bonusType === "referral" ? "Referral Bonus" : (customLabel.trim() || "Custom Bonus")}
                                    {" · "}{selectedGame.name}{" · "}{player.name}
                                    {bonusType === "streak" && <span style={{ color: "#f59e0b", marginLeft: 6 }}>· streak resets</span>}
                                    {bonusType === "referral" && <span style={{ color: "#166534", marginLeft: 6 }}>· 1× deduction</span>}
                                </div>
                            </div>
                            <span style={{ fontSize: 22, fontWeight: 900, color: stockOk && referralOk ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                                +{fmt(amt)}
                            </span>
                        </div>
                    )}

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={handleClear}
                            style={{ flex: 1, padding: "11px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#64748b" }}>
                            Clear
                        </button>
                        <button type="submit" disabled={!canSubmit}
                            style={{
                                flex: 3, padding: "11px", border: "none", borderRadius: 8,
                                fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                                cursor: canSubmit ? "pointer" : "not-allowed",
                                background: canSubmit ? (bonusType === "referral" ? "#16a34a" : "#d97706") : "#e2e8f0",
                                color: canSubmit ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                                transition: "background .2s, opacity .15s",
                            }}>
                            {submitting
                                ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Granting…</>
                                : bonusType === "referral"
                                    ? <><Users style={{ width: 14, height: 14 }} /> Grant Referral Bonus{amt > 0 ? ` · +${fmt(amt)}` : ""}</>
                                    : <><Gift style={{ width: 14, height: 14 }} /> Grant {bonusType === "streak" ? "Streak Bonus" : (customLabel.trim() || "Custom Bonus")}{amt > 0 ? ` · +${fmt(amt)}` : ""}</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ── BONUS LEDGER ────────────────────────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(15,23,42,.06)", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Bonus Ledger</h3>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                            {ledger.length > 0 ? `${ledger.length} grant${ledger.length !== 1 ? "s" : ""}` : "No bonuses yet"}
                            {lastLedgerRefresh && <span style={{ marginLeft: 8, color: "#16a34a", fontWeight: 600 }}>· Live · {fmtTX(lastLedgerRefresh)}</span>}
                        </p>
                    </div>
                    <button onClick={() => loadLedger()} disabled={ledgerLoading}
                        style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                        <RefreshCw style={{ width: 13, height: 13, animation: ledgerLoading ? "spin 1s linear infinite" : "none" }} />
                        Refresh
                    </button>
                </div>

                {ledgerLoading ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                        <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "spin .8s linear infinite" }} />
                        Loading history…
                    </div>
                ) : ledger.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center" }}>
                        <Gift style={{ width: 36, height: 36, margin: "0 auto 10px", display: "block", color: "#e2e8f0" }} />
                        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No bonuses granted yet</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                                    {["#", "Player", "Type", "Amount", "Game", "Balance", "Status", "Date"].map(h => (
                                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
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
                                            <td style={{ padding: "10px 14px", color: "#cbd5e1", fontSize: 12 }}>#{ledger.length - i}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <div onClick={() => b.playerName && handleView({ id: b.playerId, name: b.playerName })}
                                                    style={{ fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#0f172a" }}
                                                    className="hover-color">
                                                    {b.playerName || "—"}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>ID: {b.playerId}</div>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: bt.bg, color: bt.color, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                                    {bt.emoji} {bt.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ fontWeight: 800, color: "#d97706", fontSize: 15 }}>+{fmt(b.amount)}</span>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                {b.gameName
                                                    ? <span style={{ display: "inline-block", padding: "3px 9px", background: "#f1f5f9", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "#475569", whiteSpace: "nowrap" }}>
                                                        {b.gameName.match(/^[^-]+/)[0].trim()}
                                                    </span>
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                                                {b.balanceBefore != null && b.balanceAfter != null
                                                    ? <><span>${parseFloat(b.balanceBefore).toFixed(2)}</span>{" "}<span style={{ color: "#22c55e", fontWeight: 700 }}>→ ${parseFloat(b.balanceAfter).toFixed(2)}</span></>
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                {b.status === 'CANCELLED'
                                                    ? <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>CANCELLED</span>
                                                    : b.status === 'COMPLETED'
                                                        ? <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#166534" }}>COMPLETED</span>
                                                        : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>{fmtTX(b.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

/* ═══════════════════════════════════════════════════════════════════════════
   REFERRAL PANEL — extracted for clarity
═══════════════════════════════════════════════════════════════════════════ */
function ReferralPanel({ player, eligLoading, eligibleBonuses, selectedRbId, setSelectedRbId, setReferralSide, bonusPct, setBonusPct, grantBoth, setGrantBoth, computedAmt, depositAmt, selectedRb }) {

    if (eligLoading) return (
        <div style={{ marginTop: 14, padding: "16px 18px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, color: "#94a3b8" }}>
            Checking referral records…
        </div>
    );

    if (eligibleBonuses.length === 0) return (
        <div style={{ marginTop: 14, padding: "14px 18px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
            <strong>⚠ No unclaimed referral bonuses</strong> for {player.name}.<br />
            Record one first via the referral toggle on the Transactions page.
        </div>
    );

    const step = !selectedRbId ? 1 : 2;

    return (
        <div style={{ marginTop: 14, borderRadius: 14, border: "1px solid #d1fae5", overflow: "hidden" }}>

            {/* Panel header with step progress */}
            <div style={{ padding: "12px 18px", background: "#f0fdf4", borderBottom: "1px solid #d1fae5", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users style={{ width: 14, height: 14, color: "#16a34a" }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#14532d" }}>Referral Bonus</div>
                    <div style={{ fontSize: 11, color: "#4ade80", marginTop: 1 }}>
                        {eligibleBonuses.length} eligible record{eligibleBonuses.length !== 1 ? "s" : ""} · ${eligibleBonuses.reduce((s, b) => s + b.bonusAmount, 0).toFixed(2)} total
                    </div>
                </div>
                {/* Step tracker */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StepPill n={1} label="Pick record" active={step === 1} done={step > 1} />
                    <ChevronRight style={{ width: 12, height: 12, color: "#d1fae5" }} />
                    <StepPill n={2} label="Configure" active={step === 2} done={false} />
                </div>
            </div>

            <div style={{ padding: "18px" }}>

                {/* ── STEP 1: Record picker ─────────────────────────────── */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                        Select Bonus Record
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {eligibleBonuses.map(rb => {
                            const isSelected = selectedRbId === rb.id;
                            const isBside = rb.side === 'referred';
                            const sideLabel = isBside
                                ? `${player.name} was referred by ${rb.counterpartName}`
                                : `${player.name} referred ${rb.counterpartName}`;
                            return (
                                <button key={rb.id} type="button"
                                    onClick={() => { setSelectedRbId(rb.id); setReferralSide(rb.side); }}
                                    style={{
                                        padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                                        border: `1.5px solid ${isSelected ? "#16a34a" : "#d1fae5"}`,
                                        background: isSelected ? "#dcfce7" : "#f0fdf4",
                                        textAlign: "left", transition: "all .15s",
                                        display: "flex", alignItems: "center", gap: 12,
                                    }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: "#14532d" }}>
                                                {isBside ? "🙋 Player (B side)" : "👤 Referrer (A side)"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#166534" }}>{sideLabel}</div>
                                        <div style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>
                                            Deposit: <strong>${rb.depositAmount.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>stored</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: "#16a34a" }}>${rb.bonusAmount.toFixed(2)}</div>
                                        {isSelected && <CheckCircle style={{ width: 14, height: 14, color: "#16a34a", marginTop: 4 }} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── STEP 2: Configure (only when record selected) ─────── */}
                {selectedRbId && selectedRb && (
                    <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #d1fae5" }}>

                        {/* Percentage */}
                        <div style={{ marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                                Bonus % of Deposit
                                <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none", color: "#94a3b8" }}>
                                    — deposit was ${depositAmt.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                {/* Quick presets */}
                                <div style={{ display: "flex", gap: 6 }}>
                                    {[25, 50, 75, 100].map(p => (
                                        <button key={p} type="button" onClick={() => setBonusPct(p)}
                                            style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${bonusPct === p ? "#16a34a" : "#e2e8f0"}`, background: bonusPct === p ? "#f0fdf4" : "#fff", color: bonusPct === p ? "#16a34a" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all .12s" }}>
                                            {p}%
                                        </button>
                                    ))}
                                </div>
                                {/* Custom input */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 10px 4px 4px" }}>
                                    <input type="number" min="1" max="200" step="1" value={bonusPct}
                                        onChange={e => setBonusPct(Math.max(1, parseFloat(e.target.value) || 50))}
                                        style={{ width: 56, padding: "4px 8px", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "#16a34a", fontFamily: "inherit", outline: "none", textAlign: "center" }} />
                                    <span style={{ fontSize: 12, color: "#64748b" }}>%</span>
                                </div>
                                {/* Result display */}
                                <div style={{ marginLeft: "auto", padding: "6px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8 }}>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: "#16a34a" }}>${computedAmt.toFixed(2)}</span>
                                    <span style={{ fontSize: 11, color: "#4ade80", marginLeft: 4 }}>per person</span>
                                </div>
                            </div>
                        </div>

                        {/* Grant mode */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                                Grant To
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {[
                                    {
                                        value: false,
                                        emoji: "👤",
                                        label: "Referrer only",
                                        // sub: `${selectedRb?.counterpartName|| "Referrer"} receives $${computedAmt.toFixed(2)}`,
                                          sub: `${selectedRb?.side === 'referrer' ? player.name : selectedRb?.counterpartName || "Referrer"} receives $${computedAmt.toFixed(2)}`,

                                        deduction: `${computedAmt.toFixed(2)} pts deducted`,
                                        accent: "#0ea5e9",
                                        bg: "#f0f9ff",
                                        border: "#bae6fd",
                                    },
                                    {
                                        value: true,
                                        emoji: "👥",
                                        label: "Both players",
                                        sub: `Each receive $${computedAmt.toFixed(2)}`,
                                        deduction: `${(computedAmt * 2).toFixed(2)} pts deducted`,
                                        accent: "#16a34a",
                                        bg: "#f0fdf4",
                                        border: "#86efac",
                                    },
                                ].map(opt => {
                                    const active = grantBoth === opt.value;
                                    return (
                                        <button key={String(opt.value)} type="button" onClick={() => setGrantBoth(opt.value)}
                                            style={{
                                                padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                                                border: `1.5px solid ${active ? opt.accent : "#e2e8f0"}`,
                                                background: active ? opt.bg : "#fafafa",
                                                textAlign: "left", transition: "all .15s",
                                            }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: active ? opt.accent : "#374151" }}>
                                                    {opt.emoji} {opt.label}
                                                </span>
                                                {active && <CheckCircle style={{ width: 13, height: 13, color: opt.accent }} />}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, marginBottom: 6 }}>{opt.sub}</div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: active ? opt.accent : "#94a3b8", padding: "3px 8px", background: active ? opt.bg : "#f1f5f9", border: `1px solid ${active ? opt.border : "#e2e8f0"}`, borderRadius: 6, display: "inline-block" }}>
                                                {opt.deduction}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Chip atom ───────────────────────────────────────────────────────────── */
function Chip({ emoji, label, sub, color }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: color.bg, border: `1px solid ${color.border}`, color: color.text,
        }}>
            {emoji} {label}
            {sub && <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 11, marginLeft: 2 }}>· {sub}</span>}
        </span>
    );
}
