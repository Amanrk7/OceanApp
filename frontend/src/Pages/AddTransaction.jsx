import { useState, useEffect, useRef, useCallback } from "react";
import {
    CheckCircle, AlertCircle, Search, X, RefreshCw, ChevronDown,
    ArrowDownLeft, ArrowUpRight, Zap, Gift, Star, Users, Wallet,
} from "lucide-react";
import { api } from "../api";

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

const DEPOSIT_BONUSES = [
    {
        id: "match", label: "Match Bonus", icon: Gift,
        color: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#1d4ed8" },
        subtitle: "50% of deposit amount — once per player per day",
        calc: (amt) => amt * 0.5,
    },
    {
        id: "special", label: "Special / Promo Bonus", icon: Star,
        color: { bg: "#faf5ff", border: "#e9d5ff", dot: "#a855f7", text: "#6b21a8" },
        subtitle: "20% of deposit — for promotions or special occasions",
        calc: (amt) => amt * 0.2,
    },
];

const REFERRAL_BONUS_DEF = {
    id: "referral", label: "Referral Bonus", icon: Users,
    color: { bg: "#f0fdf4", border: "#86efac", dot: "#22c55e", text: "#166534" },
    subtitle: "50% of deposit — BOTH player AND referrer each receive this. One-time only.",
    calc: (amt) => amt * 0.5,
};

function BonusToggle({ bonus, amount, player, enabled, onToggle, eligible = true, disabledReason = "" }) {
    const { icon: Icon, label, subtitle, color, calc } = bonus;
    const bonusAmt = calc(amount);
    const canEnable = eligible && amount > 0;
    return (
        <div style={{ border: `1px solid ${enabled && canEnable ? color.border : "#e2e8f0"}`, borderRadius: "10px", padding: "13px 16px", background: enabled && canEnable ? color.bg : "#fafafa", opacity: eligible ? 1 : 0.55, transition: "all .15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0, background: enabled && canEnable ? color.bg : "#f1f5f9", border: `1px solid ${enabled && canEnable ? color.border : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon style={{ width: "15px", height: "15px", color: enabled && canEnable ? color.dot : "#94a3b8" }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{label}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", lineHeight: "1.4" }}>{!eligible ? disabledReason : subtitle}</div>
                        {enabled && canEnable && bonus.id === "referral" && player?.referredBy && (
                            <div style={{ fontSize: "11px", color: color.text, marginTop: "4px", fontWeight: "600" }}>
                                👤 Referrer <strong>{player.referredBy?.name || `ID ${player.referredBy?.id || player.referredBy}`}</strong>&nbsp;also gets {fmt(bonusAmt)} — game deducted {fmt(bonusAmt * 2)} total
                            </div>
                        )}
                        {enabled && canEnable && (
                            <span style={{ display: "inline-block", marginTop: "6px", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>+{fmt(bonusAmt)} bonus</span>
                        )}
                    </div>
                </div>
                <div onClick={() => canEnable && onToggle(!enabled)} style={{ width: "40px", height: "23px", borderRadius: "12px", flexShrink: 0, marginTop: "2px", background: enabled && canEnable ? color.dot : "#cbd5e1", cursor: canEnable ? "pointer" : "not-allowed", position: "relative", transition: "background .2s" }}>
                    <div style={{ width: "17px", height: "17px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: enabled && canEnable ? "20px" : "3px", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                </div>
            </div>
        </div>
    );
}

function LedgerRow({ tx, undoingId, onUndo }) {
    const isUndoing = undoingId === tx.id;
    const canUndo = (tx.status === "COMPLETED" || tx.status === "PENDING") && !isUndoing;
    const isDepositRow = ["Deposit", "deposit"].includes(tx.type);
    const positive = !["Cashout", "cashout"].includes(tx.type);

    let displayType = tx.type;
    let typeColor = { bg: "#f1f5f9", text: "#475569" };
    if (["Deposit", "deposit"].includes(tx.type)) { displayType = "Deposit"; typeColor = { bg: "#dcfce7", text: "#166534" }; }
    else if (["Cashout", "cashout"].includes(tx.type)) { displayType = "Cashout"; typeColor = { bg: "#fee2e2", text: "#991b1b" }; }
    else if (tx.bonusType === "match") { displayType = "Match Bonus"; typeColor = { bg: "#eff6ff", text: "#0369a1" }; }
    else if (tx.bonusType === "special") { displayType = "Special Bonus"; typeColor = { bg: "#faf5ff", text: "#6b21a8" }; }
    else if (tx.bonusType === "streak") { displayType = "Streak Bonus"; typeColor = { bg: "#fffbeb", text: "#92400e" }; }
    else if (tx.bonusType === "referral") { displayType = "Referral Bonus"; typeColor = { bg: "#f0fdf4", text: "#166534" }; }

    const statusColor = tx.status === "COMPLETED" ? { bg: "#dcfce7", text: "#166534" } : tx.status === "CANCELLED" ? { bg: "#fee2e2", text: "#991b1b" } : { bg: "#fef3c7", text: "#92400e" };

    return (
        <tr onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} style={{ borderBottom: "1px solid #f1f5f9", opacity: tx.status === "CANCELLED" ? 0.6 : 1 }}>
            <td style={{ padding: "10px 12px", color: "#0ea5e9", fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap" }}>#{tx.id}</td>
            <td style={{ padding: "10px 12px" }}>
                <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "13px", whiteSpace: "nowrap" }}>{tx.playerName || "—"}</div>
                {tx.email && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.email}</div>}
            </td>
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", padding: "3px 9px", background: typeColor.bg, color: typeColor.text, borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>{displayType}</span>
            </td>
            <td style={{ padding: "10px 12px", fontWeight: "700", fontSize: "14px", color: positive ? "#10b981" : "#ef4444", whiteSpace: "nowrap" }}>
                {positive ? "+" : "−"}{fmt(tx.amount)}
            </td>
            {/* Fee */}
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                {/* {isDepositRow && tx.fee != null && tx.fee > 0
                    ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "12px" }}>−{fmt(tx.fee)}</span>
                    : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
                } */}
                {tx.fee != null && tx.fee > 0
                    ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "12px" }}>−{fmt(tx.fee)}</span>
                    : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
                }
            </td>
            {/* Received Amt (deposit amt − fee = what we actually receive) */}
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                {isDepositRow
                    ? <span style={{ fontWeight: "700", fontSize: "13px", color: "#0ea5e9" }}>
                        {fmt((parseFloat(tx.amount) || 0) - (parseFloat(tx.fee) || 0))}
                    </span>
                    : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
                }
            </td>
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                {tx.gameName ? <span style={{ display: "inline-block", padding: "2px 8px", background: "#f1f5f9", borderRadius: "5px", fontSize: "11px", fontWeight: "500", color: "#475569" }}>{tx.gameName}</span> : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "10px 12px" }}>
                {(tx.walletMethod || tx.walletName) ? (
                    <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>{tx.walletMethod || "—"}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{tx.walletName || ""}</div>
                    </div>
                ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "10px 12px", fontSize: "12px", whiteSpace: "nowrap" }}>
                {tx.balanceBefore != null && tx.balanceAfter != null ? (
                    <><span style={{ color: "#64748b" }}>{fmt(tx.balanceBefore)}</span><span style={{ color: "#94a3b8", margin: "0 3px" }}>→</span><span style={{ color: positive ? "#22c55e" : "#ef4444", fontWeight: "700" }}>{fmt(tx.balanceAfter)}</span></>
                ) : <span style={{ color: "#cbd5e1" }}>—</span>}
            </td>
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: statusColor.bg, color: statusColor.text }}>{tx.status}</span>
            </td>
            <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "11px", whiteSpace: "nowrap" }}>{formatDate(tx.timestamp ?? tx.createdAt)}</td>
            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                {canUndo && (
                    <button onClick={() => onUndo(tx.id, tx.playerId)}
                        style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer", fontWeight: "600", fontSize: "12px", borderRadius: "6px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fff5f5"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "none"; }}>
                        ↩ Undo
                    </button>
                )}
                {isUndoing && <span style={{ fontSize: "11px", color: "#94a3b8" }}>Reversing…</span>}
            </td>
        </tr>
    );
}

function AddTransactionsPage() {
    const EMPTY = { txType: "deposit", amount: "", fee: "", gameId: "", walletId: "", notes: "", bonusMatch: false, bonusSpecial: false, bonusReferral: false };

    const [form, setForm] = useState(EMPTY);
    const [player, setPlayer] = useState(null);
    const [eligLoading, setEligLoading] = useState(false);
    const [matchUsedToday, setMatchUsedToday] = useState(false);
    const [referralUsedEver, setReferralUsedEver] = useState(false);
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
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const dropRef = useRef(null);

    const loadGames = useCallback(async (force = false) => {
        try {
            if (force) { api.clearCache?.(); api.games?.clearCache?.(); }
            const r = await api.games.getGames(force, { status: "", search: "" });
            setGames(r?.data || []);
        } catch (e) { console.error(e); }
    }, []);

    const loadWallets = useCallback(async () => {
        try {
            const r = await api.wallets.getGroupedWallets(true);
            const flat = (r?.data || []).flatMap(g => g.subAccounts.map(s => ({ ...s, label: `${g.method} — ${s.name}  (${fmt(s.balance)})`, methodName: g.method, methodId: g.id })));
            setWallets(flat);
        } catch (e) { console.error(e); }
    }, []);

    const loadLedger = useCallback(async () => {
        try {
            setLedgerLoading(true);
            const r = await api.transactions.getTransactions(1, 50, "", "", true);
            setLedger(r?.data || []);
            setLastRefresh(new Date());
        } catch (e) { setError("Failed to load transaction ledger"); }
        finally { setLedgerLoading(false); }
    }, []);

    useEffect(() => { loadGames(); loadWallets(); loadLedger(); }, [loadGames, loadWallets, loadLedger]);
    useEffect(() => { if (!autoRefresh) return; const id = setInterval(() => loadLedger(), 10000); return () => clearInterval(id); }, [autoRefresh, loadLedger]);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setShowDrop(false); return; }
        const t = setTimeout(async () => {
            try { setSearching(true); const r = await api.players.getPlayers(1, 10, query, ""); setResults(r?.data || []); setShowDrop(true); }
            catch (e) { console.error(e); } finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    const computeEligibility = (fullPlayer) => {
        const history = fullPlayer?.transactionHistory || [];
        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const usedMatchToday = history.some(tx => tx.date === todayStr && tx.type === "Match Bonus");
        const usedReferralEver = history.some(tx => tx.type === "Referral Bonus");
        setMatchUsedToday(usedMatchToday);
        setReferralUsedEver(usedReferralEver);
        if (usedMatchToday) setForm(f => ({ ...f, bonusMatch: false }));
        if (usedReferralEver) setForm(f => ({ ...f, bonusReferral: false }));
    };

    const selectPlayer = async (p) => {
        setQuery(p.name); setShowDrop(false); setResults([]);
        setPlayer(null); setMatchUsedToday(false); setReferralUsedEver(false);
        setForm(f => ({ ...EMPTY, txType: f.txType }));
        setEligLoading(true);
        try { const r = await api.players.getPlayer(p.id); const fp = r?.data || p; setPlayer(fp); computeEligibility(fp); }
        catch { setPlayer(p); } finally { setEligLoading(false); }
    };

    const clearPlayer = () => { setPlayer(null); setQuery(""); setMatchUsedToday(false); setReferralUsedEver(false); setForm(f => ({ ...EMPTY, txType: f.txType })); };
    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    // ══ DERIVED VALUES ════════════════════════════════════════
    const amt = parseFloat(form.amount) || 0;
    const feeAmt = parseFloat(form.fee) || 0;
    const isDeposit = form.txType === "deposit";
    const selGame = games.find(g => String(g.id) === String(form.gameId));
    const selWallet = wallets.find(w => w.id === parseInt(form.walletId));

    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const cashoutLimit = parseFloat(player?.cashoutLimit ?? 250);
    const streakWaived = streak >= 30;
    const hasReferrer = !!(player?.referredBy);

    const matchAmt = (form.bonusMatch && amt > 0) ? amt * 0.5 : 0;
    const specialAmt = (form.bonusSpecial && amt > 0) ? amt * 0.2 : 0;
    const referralAmt = (form.bonusReferral && hasReferrer && amt > 0) ? amt * 0.5 : 0;
    const totalBonus = matchAmt + specialAmt + referralAmt;

    // ★ Full deposit amount to player. Game stock = full amt + bonuses (NOT amt - fee)
    // const stockNeeded =
    //     (isDeposit ? amt : 0) +
    //     matchAmt + specialAmt +
    //     (form.bonusReferral && hasReferrer && amt > 0 ? referralAmt * 2 : 0);

    const stockNeeded = isDeposit
        ? amt + matchAmt + specialAmt + (form.bonusReferral && hasReferrer && amt > 0 ? referralAmt * 2 : 0)
        : amt;

    // const stockOk            = !selGame || stockNeeded <= selGame.pointStock;
    // const cashoutOverLimit   = !isDeposit && !streakWaived && amt > cashoutLimit && cashoutLimit > 0;
    // const walletInsufficient = !isDeposit && selWallet && amt > selWallet.balance;
    // const gameRequired       = isDeposit && !form.gameId;

    const stockOk = !selGame || stockNeeded <= selGame.pointStock;
    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const todayCashoutTotal = (!isDeposit && player)
        ? (player.transactionHistory || [])
            .filter(t => t.date === todayStr && ["cashout", "Cashout"].includes(t.type) && t.status === "COMPLETED")
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
        : 0;
    const cashoutOverLimit = !isDeposit && !streakWaived && cashoutLimit > 0 && (todayCashoutTotal + amt) > cashoutLimit;
    const walletInsufficient = !isDeposit && selWallet && amt > selWallet.balance;
    const gameRequired = !form.gameId;

    // const canSubmit =
    //     !!player?.id && amt > 0 && !!form.walletId &&
    //     (isDeposit ? !!form.gameId : true) &&
    //     stockOk && !cashoutOverLimit && !walletInsufficient && !submitting &&
    //     feeAmt >= 0 && (amt === 0 || feeAmt <= amt);

    const canSubmit =
        !!player?.id && amt > 0 && !!form.walletId && !!form.gameId &&
        stockOk && !cashoutOverLimit && !walletInsufficient && !submitting &&
        feeAmt >= 0 && (amt === 0 || feeAmt <= amt);

    // ══ SUBMIT ════════════════════════════════════════════════
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!player?.id) { setError("Please select a player."); return; }
        if (!amt) { setError("Enter a valid amount."); return; }
        if (!form.walletId) { setError("Please select a wallet."); return; }
        if (isDeposit && !form.gameId) { setError("Please select a game — required for all deposits."); return; }
        if (!stockOk) { setError(`Insufficient game stock — need ${stockNeeded.toFixed(2)} pts.`); return; }
        if (cashoutOverLimit) { setError(`Cashout exceeds limit of ${fmt(cashoutLimit)}.`); return; }
        if (walletInsufficient) { setError(`Wallet only has ${fmt(selWallet?.balance)}.`); return; }
        if (feeAmt < 0 || feeAmt > amt) { setError("Fee must be between $0 and the deposit amount."); return; }

        try {
            setSubmitting(true);
            const payload = isDeposit
                ? { playerId: player.id, amount: amt, fee: feeAmt, walletId: parseInt(form.walletId), walletMethod: selWallet?.methodName || selWallet?.method || null, walletName: selWallet?.name || null, gameId: form.gameId, notes: form.notes, bonusMatch: form.bonusMatch && amt > 0, bonusSpecial: form.bonusSpecial && amt > 0, bonusReferral: form.bonusReferral && hasReferrer && amt > 0 }
                // : { playerId: player.id, amount: amt, walletId: parseInt(form.walletId), walletMethod: selWallet?.methodName || selWallet?.method || null, walletName: selWallet?.name || null, notes: form.notes };
                : { playerId: player.id, amount: amt, fee: feeAmt, gameId: form.gameId, walletId: parseInt(form.walletId), walletMethod: selWallet?.methodName || selWallet?.method || null, walletName: selWallet?.name || null, notes: form.notes };

            const data = isDeposit ? await api.transactions.deposit(payload) : await api.transactions.cashout(payload);

            let msg = data.message || "Transaction recorded successfully!";
            if (data.transaction?.referralBonus) { const rb = data.transaction.referralBonus; msg += ` Referral bonus of ${fmt(rb.amount)} also sent to ${rb.referrerName}.`; }
            if (feeAmt > 0) msg += ` Wallet credited with ${fmt(amt - feeAmt)} (${fmt(amt)} deposit − ${fmt(feeAmt)} fee).`;
            setSuccess(msg);
            setForm(EMPTY); setQuery(""); setPlayer(null); setMatchUsedToday(false); setReferralUsedEver(false);
            api.clearCache?.();
            await Promise.all([loadLedger(), loadGames(true), loadWallets()]);
        } catch (err) {
            setError(err.message || "Transaction failed.");
        } finally { setSubmitting(false); }
    };

    // ══ UNDO ══════════════════════════════════════════════════
    const handleUndo = async (txId, playerIdFromTx) => {
        try {
            setUndoingId(txId); setError(""); setUndoSuccess("");
            await api.transactions.undoTransaction(String(txId).replace(/\D/g, ""));
            api.clearCache?.(); api.games?.clearCache?.();
            await Promise.all([loadLedger(), loadWallets(), loadGames(true)]);
            if (player && playerIdFromTx && player.id === playerIdFromTx) {
                try { const r = await api.players.getPlayer(player.id); const u = r?.data || player; setPlayer(u); computeEligibility(u); } catch { }
            }
            window.dispatchEvent(new CustomEvent("transactionUndone", { detail: { playerId: playerIdFromTx, txId, timestamp: new Date().toISOString() } }));
            setUndoSuccess(`✓ Transaction #${txId} reversed. All data synced.`);
            setTimeout(() => setUndoSuccess(""), 3000);
        } catch (err) { setError(err.message || "Undo failed."); }
        finally { setUndoingId(null); }
    };

    // ══ RENDER ════════════════════════════════════════════════
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "inherit" }}>

            {/* ════ FORM CARD ════ */}
            <div style={CARD}>
                {/* Type toggle */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
                    {[{ id: "deposit", label: "Deposit", Icon: ArrowDownLeft, color: "#10b981" }, { id: "cashout", label: "Cashout", Icon: ArrowUpRight, color: "#ef4444" }].map(({ id, label, Icon, color }) => (
                        <button key={id} type="button" onClick={() => { set("txType", id); setError(""); setSuccess(""); setUndoSuccess(""); }}
                            style={{ flex: 1, padding: "11px 20px", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", border: form.txType === id ? `2px solid ${color}` : "2px solid #e2e8f0", background: form.txType === id ? `${color}14` : "#fafafa", color: form.txType === id ? color : "#64748b" }}>
                            <Icon style={{ width: "15px", height: "15px" }} /> {label}
                        </button>
                    ))}
                </div>

                {/* Info banner */}
                <div style={{ marginBottom: "22px", padding: "14px 16px", background: isDeposit ? "#f0fdf4" : "#fef2f2", borderLeft: `4px solid ${isDeposit ? "#22c55e" : "#ef4444"}`, borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {isDeposit ? <ArrowDownLeft style={{ width: "17px", height: "17px", color: "#16a34a", flexShrink: 0, marginTop: "1px" }} /> : <ArrowUpRight style={{ width: "17px", height: "17px", color: "#dc2626", flexShrink: 0, marginTop: "1px" }} />}
                    <div>
                        <p style={{ fontWeight: "700", color: isDeposit ? "#14532d" : "#7f1d1d", margin: "0 0 2px", fontSize: "14px" }}>{isDeposit ? "Record a Deposit" : "Record a Cashout"}</p>
                        <p style={{ color: isDeposit ? "#166534" : "#991b1b", margin: 0, fontSize: "12px", lineHeight: "1.5" }}>
                            {isDeposit
                                ? "Player receives the full deposit amount. The wallet is credited with (deposit − fee). Game stock deducted for full deposit + bonuses."
                                : "Cashout deducts from player balance and wallet. Cashout limit enforced (waived at 30-day streak)."}
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {error && <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}><AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}</div>}
                {success && <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}><CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {success}</div>}
                {undoSuccess && <div style={{ padding: "11px 14px", marginBottom: "18px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}><CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {undoSuccess}</div>}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Player search */}
                    <div>
                        <label style={LABEL}>Player * — search by name, username, email or phone</label>
                        <div ref={dropRef} style={{ position: "relative" }}>
                            <div style={{ position: "relative" }}>
                                <Search style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                                <input type="text" placeholder="Type at least 2 characters…" value={query} onChange={e => { setQuery(e.target.value); if (player) clearPlayer(); }} style={{ ...INPUT, paddingLeft: "34px", paddingRight: player ? "36px" : "12px" }} />
                                {(player || query) && <button type="button" onClick={clearPlayer} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}><X style={{ width: "14px", height: "14px" }} /></button>}
                            </div>
                            {searching && <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", color: "#94a3b8", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>Searching…</div>}
                            {showDrop && !searching && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 8px 24px rgba(15,23,42,.12)", overflow: "hidden", maxHeight: "260px", overflowY: "auto" }}>
                                    {results.length === 0 ? <div style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>No players found</div> :
                                        results.map(p => (
                                            <div key={p.id} onClick={() => selectPlayer(p)} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a" }}>{p.name}</div>
                                                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                                                </div>
                                                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                                                    <div style={{ fontWeight: "700", fontSize: "13px", color: "#10b981" }}>{fmt(p.balance)}</div>
                                                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: "700", display: "inline-block", marginTop: "2px", background: p.tier === "GOLD" ? "#fef3c7" : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa", color: p.tier === "GOLD" ? "#92400e" : p.tier === "SILVER" ? "#3730a3" : "#9a3412" }}>{p.tier}</span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                            {eligLoading && <div style={{ marginTop: "6px", fontSize: "12px", color: "#94a3b8" }}>Loading player data…</div>}
                            {player && !eligLoading && (
                                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#166534" }}><CheckCircle style={{ width: "11px", height: "11px" }} />{player.name}<span style={{ fontWeight: "400", color: "#4ade80" }}>· ID {player.id}</span></span>
                                    <span style={{ padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#1d4ed8" }}>Balance: {fmt(player.balance)}</span>
                                    {streak > 0 && <span style={{ padding: "4px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>🔥 {streak}-day streak</span>}
                                    {hasReferrer && <span style={{ padding: "4px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#166534" }}>👤 Referred by {player.referredBy?.name || `ID ${player.referredBy?.id || player.referredBy}`}</span>}
                                    {matchUsedToday && <span style={{ padding: "4px 10px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>⚠ Match bonus used today</span>}
                                    {referralUsedEver && <span style={{ padding: "4px 10px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>⚠ Referral bonus already used</span>}
                                    {/* {!isDeposit && cashoutLimit > 0 && !streakWaived && <span style={{ padding: "4px 10px", background: cashoutOverLimit ? "#fee2e2" : "#fef2f2", border: `1px solid ${cashoutOverLimit ? "#fca5a5" : "#fecaca"}`, borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#991b1b" }}>Cashout limit: {fmt(cashoutLimit)}</span>} */}
                                    {!isDeposit && cashoutLimit > 0 && !streakWaived && <span style={{ padding: "4px 10px", background: cashoutOverLimit ? "#fee2e2" : "#fef2f2", border: `1px solid ${cashoutOverLimit ? "#fca5a5" : "#fecaca"}`, borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#991b1b" }}>Daily limit: {fmt(cashoutLimit - todayCashoutTotal)} remaining (of {fmt(cashoutLimit)})</span>}
                                    {!isDeposit && streakWaived && <span style={{ padding: "4px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#166534" }}>✓ Limit waived (30-day streak)</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amount + Fee + Wallet */}
                    {/* <div style={{ display: "grid", gridTemplateColumns: isDeposit ? "1fr 1fr 1fr" : "1fr 1fr", gap: "16px" }}> */}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={LABEL}>{isDeposit ? "Deposit Amount ($) *" : `Cashout Amount ($) *${!streakWaived && cashoutLimit > 0 ? ` — Limit: ${fmt(cashoutLimit)}` : ""}`}</label>
                            <input type="number" placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} style={{ ...INPUT, borderColor: cashoutOverLimit ? "#fca5a5" : "#e2e8f0" }} />
                            {cashoutOverLimit && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px" }}>⚠ Exceeds cashout limit of {fmt(cashoutLimit)}</p>}
                        </div>

                        <div>
                            <label style={LABEL}>Fee ($) <span style={{ fontWeight: 400, fontSize: "10px", color: "#f59e0b" }}>optional</span></label>
                            <input type="number" placeholder="0.00" min="0" step="0.01" value={form.fee} onChange={e => set("fee", e.target.value)} style={{ ...INPUT, borderColor: feeAmt > 0 ? "#f59e0b" : "#e2e8f0" }} />
                            {amt > 0 && (
                                <p style={{ fontSize: "11px", marginTop: "4px", fontWeight: "600", color: feeAmt > 0 ? "#92400e" : "#94a3b8" }}>
                                    {feeAmt > 0
                                        ? isDeposit
                                            ? `Wallet gets: ${fmt(amt - feeAmt)} (${fmt(amt)} − ${fmt(feeAmt)} fee)`
                                            : `Wallet pays: ${fmt(amt + feeAmt)} (${fmt(amt)} cashout + ${fmt(feeAmt)} bank fee)`
                                        : isDeposit ? "No fee — wallet gets full deposit amount" : "No fee — wallet pays exact cashout amount"}
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={LABEL}>{isDeposit ? "Wallet * (receives deposit − fee)" : "Deduct From Wallet *"}</label>
                            <div style={{ position: "relative" }}>
                                <select value={form.walletId} onChange={e => set("walletId", e.target.value)} style={SELECT}>
                                    <option value="">— Select wallet —</option>
                                    {wallets.map(w => <option key={w.id} value={w.id} disabled={!isDeposit && w.balance < amt}>{w.label}{!isDeposit && w.balance < amt ? " — INSUFFICIENT" : ""}</option>)}
                                </select>
                                <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                            </div>
                            {selWallet && amt > 0 && isDeposit && (
                                <p style={{ fontSize: "12px", marginTop: "4px", fontWeight: "600", color: "#22c55e" }}>
                                    ✓ {fmt(selWallet.balance)} → {fmt(selWallet.balance + amt - feeAmt)}
                                    {feeAmt > 0 && <span style={{ fontWeight: "400", color: "#94a3b8", fontSize: "11px" }}> (deposit − fee)</span>}
                                </p>
                            )}
                            {selWallet && amt > 0 && !isDeposit && (
                                <p style={{ fontSize: "12px", marginTop: "4px", fontWeight: "600", color: walletInsufficient ? "#ef4444" : "#64748b" }}>
                                    {walletInsufficient ? `⚠ Only ${fmt(selWallet.balance)} available` : `${fmt(selWallet.balance)} → ${fmt(selWallet.balance - amt)}`}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Game selector
                    {isDeposit && (
                        <div>
                            <label style={LABEL}>Game <span style={{ color: "#ef4444" }}>*</span> required for all deposits</label> */}
                    {/* Game selector */}
                    {(
                        <div>
                            <label style={LABEL}>Game <span style={{ color: "#ef4444" }}>*</span> required for all transactions</label>
                            <div style={{ position: "relative" }}>
                                <select value={form.gameId} onChange={e => set("gameId", e.target.value)} style={{ ...SELECT, borderColor: gameRequired ? "#fca5a5" : "#e2e8f0" }}>
                                    <option value="">— Select a game —</option>
                                    {games.map(g => <option key={g.id} value={g.id} disabled={g.pointStock <= 0}>{g.name}  ({(g.pointStock ?? 0).toFixed(0)} pts){g.pointStock <= 0 ? " — EMPTY" : ""}</option>)}
                                </select>
                                <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
                            </div>
                            {selGame && (
  <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "500", background: !stockOk ? "#fee2e2" : "#f0fdf4", border: `1px solid ${!stockOk ? "#fca5a5" : "#86efac"}`, color: !stockOk ? "#991b1b" : "#166534" }}>
    {isDeposit
      ? (!stockOk
          ? `⚠ Insufficient — ${selGame.name} has ${selGame.pointStock.toFixed(2)} pts, need ${stockNeeded.toFixed(2)}`
          : `✓ ${selGame.name}: ${selGame.pointStock.toFixed(2)} pts → ${(selGame.pointStock - stockNeeded).toFixed(2)} pts after`)
      : `✓ ${selGame.name}: ${selGame.pointStock.toFixed(2)} pts → ${(selGame.pointStock + stockNeeded).toFixed(2)} pts after`
    }
  </div>
)}

                            {gameRequired && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px" }}>⚠ Game is required to proceed</p>}
                        </div>)}

                    {/* Bonus section */}
                    {isDeposit && (

                        <>
                            <div style={DIVIDER} />
                            <div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                    <Zap style={{ width: "15px", height: "15px", color: "#f59e0b" }} /> Deposit Bonuses
                                </div>
                                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 14px" }}>Match bonus: once per day · Referral bonus: one-time only</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <BonusToggle bonus={DEPOSIT_BONUSES[0]} amount={amt} player={player} enabled={form.bonusMatch} onToggle={v => set("bonusMatch", v)} eligible={!matchUsedToday} disabledReason="Match bonus already used today for this player" />
                                    <BonusToggle bonus={DEPOSIT_BONUSES[1]} amount={amt} player={player} enabled={form.bonusSpecial} onToggle={v => set("bonusSpecial", v)} />
                                    <BonusToggle bonus={REFERRAL_BONUS_DEF} amount={amt} player={player} enabled={form.bonusReferral} onToggle={v => set("bonusReferral", v)} eligible={hasReferrer && !referralUsedEver} disabledReason={!player ? "Select a player first" : eligLoading ? "Loading…" : referralUsedEver ? "Referral bonus already used (one-time only)" : "This player was not referred by anyone"} />
                                </div>

                                {/* Summary panel */}
                                {amt > 0 && (
                                    <div style={{ marginTop: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                        <div style={{ background: "#f8fafc", padding: "9px 16px", borderBottom: "1px solid #e2e8f0" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Transaction Summary</span>
                                        </div>
                                        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                                <span style={{ color: "#64748b" }}>Deposit amount entered</span>
                                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{fmt(amt)}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                                                <span style={{ color: "#166534", fontWeight: "600" }}>👤 Player receives (full amount)</span>
                                                <span style={{ fontWeight: "800", color: "#10b981" }}>{fmt(amt)}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 12px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                                                <span style={{ color: "#0369a1", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <Wallet style={{ width: "12px", height: "12px" }} /> Wallet credited
                                                    {feeAmt > 0 && <span style={{ fontWeight: "400", fontSize: "11px", color: "#64748b" }}>(deposit − fee)</span>}
                                                </span>
                                                <span style={{ fontWeight: "800", color: "#0369a1" }}>{fmt(amt - feeAmt)}</span>
                                            </div>
                                            {feeAmt > 0 && (
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", paddingLeft: "4px" }}>
                                                    <span>Fee retained</span>
                                                    <span style={{ color: "#f59e0b", fontWeight: "600" }}>{fmt(feeAmt)}</span>
                                                </div>
                                            )}
                                            {matchAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}><span style={{ color: "#64748b" }}>Match bonus (50%)</span><span style={{ fontWeight: "700", color: "#3b82f6" }}>+ {fmt(matchAmt)}</span></div>}
                                            {specialAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}><span style={{ color: "#64748b" }}>Special bonus (20%)</span><span style={{ fontWeight: "700", color: "#a855f7" }}>+ {fmt(specialAmt)}</span></div>}
                                            {referralAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}><span style={{ color: "#64748b" }}>Referral bonus (50%)</span><span style={{ fontWeight: "700", color: "#22c55e" }}>+ {fmt(referralAmt)}</span></div>}
                                            <div style={{ height: "1px", background: "#e2e8f0", margin: "2px 0" }} />
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Total to player's balance</span>
                                                <span style={{ fontSize: "17px", fontWeight: "800", color: "#10b981" }}>{fmt(amt + totalBonus)}</span>
                                            </div>
                                            {selGame && stockNeeded > 0 && <div style={{ fontSize: "11px", color: "#94a3b8" }}>Game stock deduction: {fmt(stockNeeded)} pts from {selGame.name}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    <div>
                        <label style={LABEL}>Notes (optional)</label>
                        <textarea placeholder="Add any notes…" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...INPUT, resize: "none", lineHeight: "1.6" }} />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                        <button type="button" onClick={() => { setForm(EMPTY); setQuery(""); clearPlayer(); setError(""); setSuccess(""); setUndoSuccess(""); }} style={{ flex: 1, padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>Clear</button>
                        <button type="submit" disabled={!canSubmit} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "14px", cursor: canSubmit ? "pointer" : "not-allowed", background: canSubmit ? (isDeposit ? "#10b981" : "#ef4444") : "#e2e8f0", color: canSubmit ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                            {submitting ? <span>⏳ Processing…</span> : isDeposit ? <><ArrowDownLeft style={{ width: "15px", height: "15px" }} /> Record Deposit</> : <><ArrowUpRight style={{ width: "15px", height: "15px" }} /> Record Cashout</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* ════ TRANSACTION LEDGER ════ */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>All Transactions</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>Full amount → player · Fee → wallet revenue</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <div onClick={() => setAutoRefresh(!autoRefresh)} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: autoRefresh ? "#dcfce7" : "#fff", color: autoRefresh ? "#166534" : "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#cbd5e1" }} />Auto {autoRefresh ? "ON" : "OFF"}
                        </div>
                        <button onClick={() => loadLedger()} disabled={ledgerLoading} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 12px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "600" }}>
                            <RefreshCw style={{ width: "13px", height: "13px", animation: ledgerLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
                        </button>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{lastRefresh.toLocaleTimeString()}</span>
                    </div>
                </div>

                {ledgerLoading ? (
                    <div style={{ padding: "48px", textAlign: "center" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#10b981", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Loading transactions…</p>
                    </div>
                ) : ledger.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions yet</div>
                ) : (
                    <div style={{ width: "100%", overflowX: "auto", overflowY: "auto", maxHeight: "560px", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f8fafc" }}>
                        <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                <tr style={{ background: "#f8fafc" }}>
                                    {[
                                        { label: "ID", w: "60px" },
                                        { label: "Player", w: "150px" },
                                        { label: "Type", w: "120px" },
                                        { label: "Amount", w: "100px" },
                                        { label: "Fee", w: "80px" },
                                        { label: "Received Amt", w: "110px" },
                                        { label: "Game", w: "110px" },
                                        { label: "Wallet", w: "130px" },
                                        { label: "Balance", w: "155px" },
                                        { label: "Status", w: "95px" },
                                        { label: "Date", w: "155px" },
                                        { label: "", w: "80px" },
                                    ].map(col => (
                                        <th key={col.label} style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", width: col.w, minWidth: col.w, background: "#f8fafc" }}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((tx, i) => <LedgerRow key={tx.id ?? i} tx={tx} undoingId={undoingId} onUndo={handleUndo} />)}
                            </tbody>
                        </table>
                    </div>
                )}

                {!ledgerLoading && ledger.length > 0 && (
                    <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Showing {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}</span>
                        <span style={{ fontSize: "11px", color: "#cbd5e1" }}>← scroll horizontally to see all columns</span>
                    </div>
                )}
            </div>

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

export default AddTransactionsPage;
