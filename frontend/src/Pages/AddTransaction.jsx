import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, Search, X, RefreshCw, ChevronDown,
    ArrowDownLeft, ArrowUpRight, Zap, Gift, Star, Wallet, Clock, Users, Lock
} from "lucide-react";
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';
import { useToast } from '../Context/toastContext';
import { api } from "../api";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
    // Typography
    fontMono: " ",
    fontSans: "'DM Sans', -apple-system, sans-serif",

    // Surfaces
    bg: "#fafaf9",
    surface: "#ffffff",
    surfaceSubtle: "#f5f5f4",
    surfaceHover: "#f9f9f8",

    // Borders
    border: "#e7e5e4",
    borderStrong: "#d6d3d1",

    // Text
    textPrimary: "#1c1917",
    textSecondary: "#57534e",
    textTertiary: "#a8a29e",
    textInverse: "#ffffff",

    // Accent — slate-indigo
    accent: "#4f46e5",
    accentHover: "#4338ca",
    accentSurface: "#eef2ff",
    accentBorder: "#c7d2fe",

    // Semantic
    deposit: "#059669",
    depositSurface: "#ecfdf5",
    depositBorder: "#6ee7b7",

    cashout: "#dc2626",
    cashoutSurface: "#fef2f2",
    cashoutBorder: "#fca5a5",

    bonus: "#7c3aed",
    bonusSurface: "#f5f3ff",
    bonusBorder: "#ddd6fe",

    warn: "#d97706",
    warnSurface: "#fffbeb",
    warnBorder: "#fde68a",

    // Shadows
    shadowSm: "0 1px 3px rgba(28,25,23,.06), 0 1px 2px rgba(28,25,23,.04)",
    shadowMd: "0 4px 16px rgba(28,25,23,.08), 0 1px 4px rgba(28,25,23,.04)",
    shadowLg: "0 12px 40px rgba(28,25,23,.1), 0 2px 8px rgba(28,25,23,.05)",

    // Radii
    radiusSm: "6px",
    radiusMd: "10px",
    radiusLg: "14px",
    radiusXl: "18px",
    radiusFull: "9999px",
};

// ─── Shared style objects ──────────────────────────────────────────────────────
const S = {
    label: {
        display: "block",
        fontSize: "11px",
        fontWeight: "600",
        color: T.textTertiary,
        textTransform: "uppercase",
        letterSpacing: "0.7px",
        marginBottom: "7px",
        fontFamily: T.fontSans,
    },
    input: {
        width: "100%",
        padding: "10px 14px",
        border: `1.5px solid ${T.border}`,
        borderRadius: T.radiusMd,
        fontSize: "14px",
        fontFamily: T.fontSans,
        boxSizing: "border-box",
        background: T.surface,
        color: T.textPrimary,
        outline: "none",
        transition: "border-color .15s, box-shadow .15s",
    },
    select: {
        width: "100%",
        padding: "10px 36px 10px 14px",
        border: `1.5px solid ${T.border}`,
        borderRadius: T.radiusMd,
        fontSize: "14px",
        fontFamily: T.fontSans,
        boxSizing: "border-box",
        background: T.surface,
        color: T.textPrimary,
        outline: "none",
        appearance: "none",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
    },
    card: {
        background: T.surface,
        borderRadius: T.radiusXl,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadowMd,
    },
    divider: {
        height: "1px",
        background: T.border,
        margin: "24px 0",
        opacity: 0.7,
    },
};

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

function formatDate(raw) {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Pill / Badge ──────────────────────────────────────────────────────────────
function Pill({ children, color = T.textTertiary, bg = T.surfaceSubtle, border = T.border, icon }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "3px 10px",
            background: bg, border: `1px solid ${border}`, borderRadius: T.radiusFull,
            fontSize: "11.5px", fontWeight: "600", color,
            fontFamily: T.fontSans, whiteSpace: "nowrap",
        }}>
            {icon && icon}
            {children}
        </span>
    );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onClick, color = T.accent, disabled }) {
    return (
        <div
            onClick={() => !disabled && onClick(!on)}
            style={{
                width: "38px", height: "22px", borderRadius: T.radiusFull,
                background: on && !disabled ? color : T.border,
                cursor: disabled ? "not-allowed" : "pointer",
                position: "relative", transition: "background .2s", flexShrink: 0,
                opacity: disabled ? 0.45 : 1,
            }}
        >
            <div style={{
                width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                position: "absolute", top: "3px",
                left: on && !disabled ? "19px" : "3px",
                transition: "left .2s",
                boxShadow: "0 1px 4px rgba(0,0,0,.18)",
            }} />
        </div>
    );
}

// ─── BonusToggle ──────────────────────────────────────────────────────────────
const DEPOSIT_BONUSES = [
    {
        id: "match", label: "Match Bonus", icon: Gift,
        color: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#1d4ed8" },
        subtitle: "50% of deposit amount — once per player per day",
        calc: (amt) => amt * 0.5,
    },
    {
        id: "special", label: "Special / Promo Bonus", icon: Star,
        color: { bg: "#fdf4ff", border: "#e9d5ff", dot: "#a855f7", text: "#6b21a8" },
        subtitle: "20% of deposit — for promotions or special occasions",
        calc: (amt) => amt * 0.2,
    },
];

function BonusToggle({ bonus, amount, enabled, onToggle, eligible = true, disabledReason = "" }) {
    const { icon: Icon, label, subtitle, color, calc } = bonus;
    const bonusAmt = calc(amount);
    const canEnable = eligible && amount > 0;
    const active = enabled && canEnable;

    return (
        <div className="bonus-card" style={{
            border: `1.5px solid ${active ? color.border : T.border}`,
            borderRadius: T.radiusLg,
            padding: "14px 16px",
            background: active ? color.bg : T.surfaceSubtle,
            opacity: eligible ? 1 : 0.5,
            transition: "all .2s",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                    <div style={{
                        width: "36px", height: "36px", borderRadius: T.radiusMd, flexShrink: 0,
                        background: active ? color.bg : T.surface,
                        border: `1.5px solid ${active ? color.border : T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all .2s",
                    }}>
                        <Icon style={{ width: "15px", height: "15px", color: active ? color.dot : T.textTertiary }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: T.textPrimary, fontFamily: T.fontSans }}>{label}</div>
                        <div style={{ fontSize: "12px", color: T.textSecondary, marginTop: "2px", lineHeight: "1.5" }}>
                            {!eligible ? disabledReason : subtitle}
                        </div>
                        {active && (
                            <Pill
                                bg={color.bg} border={color.border} color={color.text}
                                style={{ marginTop: "7px" }}
                            >
                                +{fmt(bonusAmt)} bonus
                            </Pill>
                        )}
                    </div>
                </div>
                <Toggle on={active} onClick={onToggle} color={color.dot} disabled={!canEnable} />
            </div>
        </div>
    );
}

// ─── Ledger Row ────────────────────────────────────────────────────────────────
function LedgerRow({ tx, undoingId, onUndo }) {
    const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);
    const navigate = useNavigate();
    const [hover, setHover] = useState(false);

    const isUndoing = undoingId === tx.id;
    const canUndo = (tx.status === "COMPLETED" || tx.status === "PENDING") && !isUndoing;
    const isCashoutRow = ["Cashout", "cashout"].includes(tx.type);
    const positive = !isCashoutRow;

    const handleView = (player) => {
        setSelectedPlayer(player);
        navigate(`/playerDashboard/${player.id}`);
    };

    let displayType = tx.type;
    let typeColor = { bg: T.surfaceSubtle, text: T.textSecondary };
    if (["Deposit", "deposit"].includes(tx.type)) { displayType = "Deposit"; typeColor = { bg: T.depositSurface, text: T.deposit }; }
    else if (isCashoutRow) { displayType = "Cashout"; typeColor = { bg: T.cashoutSurface, text: T.cashout }; }
    else if (tx.bonusType === "match") { displayType = "Match Bonus"; typeColor = { bg: "#eff6ff", text: "#0369a1" }; }
    else if (tx.bonusType === "special") { displayType = "Special Bonus"; typeColor = { bg: T.bonusSurface, text: T.bonus }; }
    else if (tx.bonusType === "streak") { displayType = "Streak Bonus"; typeColor = { bg: T.warnSurface, text: "#92400e" }; }
    else if (tx.bonusType === "referral") { displayType = "Referral Bonus"; typeColor = { bg: T.depositSurface, text: T.deposit }; }

    const isPending = tx.status === "PENDING";
    const paidAmount = parseFloat(tx.paidAmount) || 0;
    const totalAmount = parseFloat(tx.amount) || 0;
    const isPartial = isCashoutRow && isPending && paidAmount > 0 && paidAmount < totalAmount;
    const statusLabel = isPartial ? "PARTIAL" : tx.status;
    const statusColor =
        statusLabel === "COMPLETED" ? { bg: T.depositSurface, text: T.deposit } :
            statusLabel === "PARTIAL" ? { bg: T.warnSurface, text: T.warn } :
                statusLabel === "PENDING" ? { bg: T.warnSurface, text: "#92400e" } :
                    statusLabel === "CANCELLED" ? { bg: T.cashoutSurface, text: T.cashout } :
                        { bg: T.surfaceSubtle, text: T.textSecondary };

    return (
        <tr className="ledger-row" style={{ borderBottom: `1px solid ${T.border}`, opacity: tx.status === "CANCELLED" ? 0.5 : 1 }}>
            <td style={{ padding: "11px 14px", color: '#0ea5e9', fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap", fontFamily: T.fontMono }}>
                #{tx.id}
            </td>
            <td style={{ padding: "11px 14px" }}>
                <div
                    onClick={() => handleView(tx.playerName ? { id: tx.playerId, name: tx.playerName } : null)}
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                    style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap", cursor: "pointer", color: hover ? T.accent : T.textPrimary, transition: "color .15s" }}
                >
                    {tx.playerName || "—"}
                </div>
                {tx.email && (
                    <div style={{ fontSize: "11px", color: T.textTertiary, marginTop: "1px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.email}
                    </div>
                )}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", padding: "3px 9px", background: typeColor.bg, color: typeColor.text, borderRadius: T.radiusFull, fontSize: "11px", fontWeight: "700" }}>
                    {displayType}
                </span>
            </td>
            <td style={{ padding: "11px 14px", fontWeight: "700", fontSize: "13px", color: positive ? '#10b981' : T.cashout, whiteSpace: "nowrap", fontFamily: T.fontMono }}>
                {positive ? "+" : "−"}{fmt(tx.amount)}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap", fontFamily: T.fontMono }}>
                {tx.fee != null && tx.fee > 0
                    ? <span style={{ color: T.warn, fontWeight: "600", fontSize: "12px" }}>−{fmt(tx.fee)}</span>
                    : <span style={{ color: T.border, fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                {["Deposit", "deposit"].includes(tx.type)
                    ? <span style={{ fontWeight: "700", fontSize: "13px", color: '#0ea5e9', fontFamily: T.fontMono }}>{fmt((parseFloat(tx.amount) || 0) - (parseFloat(tx.fee) || 0))}</span>
                    : isCashoutRow
                        ? <div style={{ minWidth: "110px" }}>
                            <div style={{ fontSize: "11px", color: T.textTertiary, marginBottom: "4px", fontFamily: T.fontMono }}>{fmt(paidAmount)} / {fmt(totalAmount)}</div>
                            <div style={{ height: "4px", background: T.cashoutSurface, borderRadius: T.radiusFull, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0}%`,
                                    background: paidAmount >= totalAmount ? T.deposit : T.warn,
                                    borderRadius: T.radiusFull,
                                    transition: "width .3s",
                                }} />
                            </div>
                        </div>
                        : <span style={{ color: T.border, fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                {tx.gameName
                    ? <span style={{ display: "inline-block", padding: "3px 9px", background: T.surfaceSubtle, borderRadius: T.radiusSm, fontSize: "11px", fontWeight: "500", color: T.textSecondary, border: `1px solid ${T.border}` }}>
                        {tx.gameName}
                    </span>
                    : <span style={{ color: T.border, fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "11px 14px" }}>
                {(tx.walletMethod || tx.walletName)
                    ? <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: T.textPrimary, whiteSpace: "nowrap" }}>{tx.walletMethod || "—"}</div>
                        <div style={{ fontSize: "11px", color: T.textTertiary, whiteSpace: "nowrap" }}>{tx.walletName || ""}</div>
                    </div>
                    : <span style={{ color: T.border, fontSize: "12px" }}>—</span>}
            </td>
            <td style={{ padding: "11px 14px", fontSize: "12px", whiteSpace: "nowrap" }}>
                {tx.gameStockBefore != null && tx.gameStockAfter != null && (() => {
                    const stockBefore = parseFloat(tx.gameStockBefore);
                    const stockAfter = parseFloat(tx.gameStockAfter);
                    const isUp = stockAfter >= stockBefore;
                    return (
                        <div>
                            <div style={{ fontSize: "10px", color: T.textTertiary, marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Points</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: T.fontMono }}>
                                <span style={{ color: T.textTertiary }}>{stockBefore.toFixed(0)}</span>
                                <span style={{ color: T.border }}>→</span>
                                <span style={{ color: isUp ? T.deposit : T.cashout, fontWeight: "700" }}>{stockAfter.toFixed(0)}</span>
                            </div>
                        </div>
                    );
                })()}
                {tx.gameStockBefore == null && <span style={{ color: T.border }}>—</span>}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                <span style={{
                    display: "inline-block", padding: "3px 9px",
                    borderRadius: T.radiusFull, fontSize: "11px", fontWeight: "700",
                    background: statusColor.bg, color: statusColor.text,
                }}>
                    {statusLabel}
                </span>
            </td>
            <td style={{ padding: "11px 14px", color: T.textTertiary, fontSize: "11px", whiteSpace: "nowrap", fontFamily: T.fontMono }}>
                {formatDate(tx.timestamp ?? tx.createdAt)}
            </td>
            <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                {canUndo && !isUndoing && (
                    <button
                        className="undo-btn"
                        onClick={() => onUndo(tx.id, tx.playerId)}
                        style={{
                            background: "none", border: `1px solid ${T.border}`,
                            color: T.textSecondary, cursor: "pointer",
                            fontWeight: "600", fontSize: "12px",
                            borderRadius: T.radiusMd, padding: "4px 11px",
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            transition: "all .15s", fontFamily: T.fontSans,
                        }}
                    >
                        ↩ Undo
                    </button>
                )}
                {isUndoing && <span style={{ fontSize: "11px", color: T.textTertiary }}>Reversing…</span>}
            </td>
        </tr>
    );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, iconColor }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <div style={{
                width: "28px", height: "28px", borderRadius: T.radiusMd,
                background: T.surfaceSubtle, border: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon style={{ width: "13px", height: "13px", color: iconColor || T.textSecondary }} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: T.textPrimary, letterSpacing: "-0.1px" }}>
                {label}
            </span>
        </div>
    );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({ label, value, valueColor, bg, border, accent }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: accent ? "10px 14px" : "6px 0",
            background: bg || "transparent",
            borderRadius: accent ? T.radiusMd : 0,
            border: border ? `1px solid ${border}` : "none",
        }}>
            <span style={{ fontSize: "13px", color: accent ? T.textPrimary : T.textSecondary, fontWeight: accent ? "600" : "400" }}>
                {label}
            </span>
            <span style={{ fontSize: accent ? "16px" : "13px", fontWeight: accent ? "800" : "700", color: valueColor || T.textPrimary, fontFamily: T.fontMono }}>
                {value}
            </span>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
function AddTransactionsPage() {
    const EMPTY = { txType: "deposit", amount: "", fee: "", gameId: "", walletId: "", notes: "", bonusMatch: false, bonusSpecial: false };

    const { shiftActive, shiftLoading } = useContext(ShiftStatusContext);
    const { add: toast } = useToast();
    const navigate = useNavigate();

    const [bonusReferral, setBonusReferral] = useState(false);
    const [referralAlreadyRecorded, setReferralAlreadyRecorded] = useState(false);
    const [referralCheckLoading, setReferralCheckLoading] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [player, setPlayer] = useState(null);
    const [eligLoading, setEligLoading] = useState(false);
    const [matchUsedToday, setMatchUsedToday] = useState(false);
    const [games, setGames] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [undoingId, setUndoingId] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDrop, setShowDrop] = useState(false);
    const [eligibleBonuses, setEligibleBonuses] = useState([]);
    const dropRef = useRef(null);

    const loadGames = useCallback(async (force = false) => {
        try {
            const r = await api.games.getGames(force, { status: "", search: "" });
            setGames(r?.data || []);
        } catch (e) { console.error(e); }
    }, []);

    const loadWallets = useCallback(async () => {
        try {
            const r = await api.wallets.getGroupedWallets(true);
            const flat = (r?.data || []).flatMap(g =>
                g.subAccounts
                    .filter(s => s.isLive !== false)
                    .map(s => ({ ...s, label: `${g.method} — ${s.name}  (${fmt(s.balance)})`, methodName: g.method, methodId: g.id }))
            );
            setWallets(flat);
        } catch (e) { console.error(e); }
    }, []);

    const loadLedger = useCallback(async () => {
        try {
            setLedgerLoading(true);
            const r = await api.transactions.getTransactions(1, 50, "", "", true);
            setLedger(r?.data || []);
            setLastRefresh(new Date());
        } catch (e) { toast("Failed to load transaction ledger", "error"); }
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
        setMatchUsedToday(usedMatchToday);
        if (usedMatchToday) setForm(f => ({ ...f, bonusMatch: false }));
    };

    const checkReferralStatus = async (fullPlayer) => {
        if (!fullPlayer?.id || !fullPlayer?.referredBy) {
            setReferralAlreadyRecorded(false);
            setEligibleBonuses([]);
            return;
        }
        setReferralCheckLoading(true);
        try {
            const r = await api.referralBonuses.getEligible(fullPlayer.id);
            const bonuses = r?.data || [];
            setEligibleBonuses(bonuses);
            const hasPending = bonuses.some(e => e.side === 'referred');
            setReferralAlreadyRecorded(hasPending);
        } catch {
            setReferralAlreadyRecorded(false);
            setEligibleBonuses([]);
        } finally {
            setReferralCheckLoading(false);
        }
    };

    const selectPlayer = async (p) => {
        setQuery(p.name); setShowDrop(false); setResults([]);
        setPlayer(null); setMatchUsedToday(false); setReferralAlreadyRecorded(false);
        setForm(f => ({ ...EMPTY, txType: f.txType }));
        setBonusReferral(false);
        setEligLoading(true);
        try {
            const r = await api.players.getPlayer(p.id);
            const fp = r?.data || p;
            setPlayer(fp);
            computeEligibility(fp);
            await checkReferralStatus(fp);
        } catch {
            setPlayer(p);
        } finally {
            setEligLoading(false);
        }
    };

    const clearPlayer = () => {
        setPlayer(null); setQuery(""); setMatchUsedToday(false); setBonusReferral(false);
        setReferralAlreadyRecorded(false); setEligibleBonuses([]);
        setForm(f => ({ ...EMPTY, txType: f.txType }));
    };

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const amt = parseFloat(form.amount) || 0;
    const feeAmt = parseFloat(form.fee) || 0;
    const isDeposit = form.txType === "deposit";
    const selGame = games.find(g => String(g.id) === String(form.gameId));
    const selWallet = wallets.find(w => w.id === parseInt(form.walletId));

    const streak = player?.streak?.currentStreak ?? player?.currentStreak ?? 0;
    const cashoutLimit = parseFloat(player?.cashoutLimit ?? 250);
    const streakWaived = streak >= 30;

    const matchAmt = (form.bonusMatch && amt > 0) ? amt * 0.5 : 0;
    const specialAmt = (form.bonusSpecial && amt > 0) ? amt * 0.2 : 0;
    const totalBonus = matchAmt + specialAmt;
    const stockNeeded = isDeposit ? amt + matchAmt + specialAmt : amt;
    const stockOk = !selGame || !isDeposit || stockNeeded <= selGame.pointStock;

    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const todayCashoutTotal = (!isDeposit && player)
        ? (player.transactionHistory || [])
            .filter(t => t.date === todayStr && ["cashout", "Cashout"].includes(t.type) && t.status === "COMPLETED")
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
        : 0;
    const cashoutOverLimit = !isDeposit && !streakWaived && cashoutLimit > 0 && (todayCashoutTotal + amt) > cashoutLimit;

    const playerHasReferrer = !!(player?.referredBy);
    const referrerName = player?.referredBy?.name || (player?.referredBy ? `ID ${player.referredBy}` : null);
    const referralBonusAmt = amt > 0 ? parseFloat((amt / 2).toFixed(2)) : 0;

    const canSubmit =
        !!player?.id && amt > 0 && !!form.walletId && !!form.gameId &&
        stockOk && !cashoutOverLimit && !submitting &&
        feeAmt >= 0 && (amt === 0 || feeAmt <= amt);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!player?.id) { toast("Please select a player.", "error"); return; }
        if (!amt) { toast("Enter a valid amount.", "error"); return; }
        if (!form.walletId) { toast("Please select a wallet.", "error"); return; }
        if (!form.gameId) { toast("Please select a game.", "error"); return; }
        if (!stockOk) { toast(`Insufficient game stock — need ${stockNeeded.toFixed(2)} pts.`, "error"); return; }
        if (cashoutOverLimit) { toast(`Cashout exceeds limit of ${fmt(cashoutLimit)}.`, "error"); return; }
        if (feeAmt < 0 || feeAmt > amt) { toast("Fee must be between $0 and the deposit amount.", "error"); return; }

        try {
            setSubmitting(true);
            const payload = isDeposit
                ? {
                    playerId: player.id, amount: amt, fee: feeAmt,
                    walletId: parseInt(form.walletId),
                    walletMethod: selWallet?.methodName || selWallet?.method || null,
                    walletName: selWallet?.name || null,
                    gameId: form.gameId, notes: form.notes,
                    bonusMatch: form.bonusMatch && amt > 0,
                    bonusSpecial: form.bonusSpecial && amt > 0,
                    bonusReferral: bonusReferral && !referralAlreadyRecorded && playerHasReferrer,
                }
                : {
                    playerId: player.id, amount: amt, fee: feeAmt,
                    gameId: form.gameId, walletId: parseInt(form.walletId),
                    walletMethod: selWallet?.methodName || selWallet?.method || null,
                    walletName: selWallet?.name || null,
                    notes: form.notes,
                };

            const data = isDeposit
                ? await api.transactions.deposit(payload)
                : await api.transactions.cashout(payload);

            let msg = data.message || (isDeposit
                ? "Deposit recorded successfully!"
                : "Cashout recorded — status set to Pending.");
            if (feeAmt > 0 && isDeposit) msg += ` Wallet credited with ${fmt(amt - feeAmt)}.`;
            toast(`${msg}`, 'success');

            setForm(EMPTY); setQuery(""); setPlayer(null);
            setMatchUsedToday(false); setBonusReferral(false); setReferralAlreadyRecorded(false);
            api.clearCache?.();
            await Promise.all([loadLedger(), loadGames(true), loadWallets()]);
        } catch (err) {
            toast(err.message || "Transaction failed.", "error");
        } finally { setSubmitting(false); }
    };

    const handleUndo = async (txId, playerIdFromTx) => {
        try {
            setUndoingId(txId);
            await api.transactions.undoTransaction(String(txId).replace(/\D/g, ""));
            api.clearCache?.();
            await Promise.all([loadLedger(), loadWallets(), loadGames(true)]);
            if (player && playerIdFromTx && player.id === playerIdFromTx) {
                try { const r = await api.players.getPlayer(player.id); const u = r?.data || player; setPlayer(u); computeEligibility(u); } catch { }
            }
            window.dispatchEvent(new CustomEvent("transactionUndone", { detail: { playerId: playerIdFromTx, txId, timestamp: new Date().toISOString() } }));
            toast(`✓ Transaction #${txId} reversed. All data synced.`, 'success');
        } catch (err) { toast(err.message || "Undo failed.", "error"); }
        finally { setUndoingId(null); }
    };

    // ── Shift loading/locked states ───────────────────────────────────────────
    if (shiftLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: T.fontSans }}>
                <div style={{ ...S.card, padding: "72px 24px", textAlign: "center" }}>
                    <div style={{
                        width: "32px", height: "32px",
                        border: `2.5px solid ${T.border}`,
                        borderTopColor: T.accent,
                        borderRadius: "50%",
                        margin: "0 auto 16px",
                        animation: "spin 0.8s linear infinite",
                    }} />
                    <p style={{ margin: 0, fontSize: "13px", color: T.textTertiary }}>Checking shift status…</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!shiftActive) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: T.fontSans }}>
                <button
                    onClick={() => navigate('/shifts')}
                    style={{
                        alignSelf: "flex-start", padding: "9px 18px",
                        background: T.accentSurface, color: T.accent,
                        border: `1px solid ${T.accentBorder}`,
                        borderRadius: T.radiusMd, fontWeight: "600",
                        cursor: "pointer", fontSize: "13px", fontFamily: T.fontSans,
                    }}
                >
                    Start Shift
                </button>
                <div style={{
                    padding: "12px 16px", borderRadius: T.radiusMd,
                    borderLeft: `3px solid ${T.warn}`,
                    background: T.warnSurface, border: `1px solid ${T.warnBorder}`,
                }}>
                    <p style={{ fontWeight: "600", color: T.warn, margin: "0 0 2px", fontSize: "13px" }}>Shift required</p>
                    <p style={{ color: "#92400e", margin: 0, fontSize: "12px" }}>You must have an active shift to record transactions.</p>
                </div>
                <div style={{ ...S.card, padding: "72px 24px", textAlign: "center" }}>
                    <div style={{
                        width: "44px", height: "44px", background: T.surfaceSubtle,
                        borderRadius: T.radiusLg, border: `1px solid ${T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
                    }}>
                        <Lock style={{ width: "18px", height: "18px", color: T.textTertiary }} />
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: T.textPrimary }}>Dashboard locked</p>
                    <p style={{ margin: 0, fontSize: "12px", color: T.textTertiary }}>Start your shift first to unlock transactions.</p>
                </div>
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: T.fontSans }}>

            {/* ═══ FORM CARD ═══ */}
            <div style={{ ...S.card, padding: "28px 32px" }}>

                {/* ── Type Toggle ── */}
                <div style={{
                    display: "inline-flex", background: T.surfaceSubtle, borderRadius: T.radiusLg,
                    padding: "4px", border: `1px solid ${T.border}`, marginBottom: "28px",
                    gap: "2px",
                }}>
                    {[
                        { id: "deposit", label: "Deposit", Icon: ArrowDownLeft, color: T.deposit },
                        { id: "cashout", label: "Cashout", Icon: ArrowUpRight, color: T.cashout },
                    ].map(({ id, label, Icon, color }) => {
                        const active = form.txType === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => set("txType", id)}
                                style={{
                                    padding: "9px 22px", borderRadius: T.radiusMd,
                                    fontWeight: "600", fontSize: "13.5px", cursor: "pointer",
                                    border: "none", transition: "all .2s",
                                    display: "flex", alignItems: "center", gap: "7px",
                                    background: active ? T.surface : "transparent",
                                    color: active ? color : T.textTertiary,
                                    boxShadow: active ? T.shadowSm : "none",
                                    fontFamily: T.fontSans,
                                }}
                            >
                                <Icon style={{ width: "14px", height: "14px" }} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Context Banner ── */}
                <div style={{
                    marginBottom: "28px", padding: "14px 18px",
                    background: isDeposit ? T.depositSurface : T.warnSurface,
                    border: `1px solid ${isDeposit ? T.depositBorder : T.warnBorder}`,
                    borderRadius: T.radiusLg,
                    display: "flex", gap: "12px", alignItems: "flex-start",
                }}>
                    {isDeposit
                        ? <ArrowDownLeft style={{ width: "16px", height: "16px", color: T.deposit, flexShrink: 0, marginTop: "1px" }} />
                        : <Clock style={{ width: "16px", height: "16px", color: T.warn, flexShrink: 0, marginTop: "1px" }} />
                    }
                    <div>
                        <p style={{ fontWeight: "700", color: isDeposit ? T.deposit : "#92400e", margin: "0 0 3px", fontSize: "13px" }}>
                            {isDeposit ? "Record a Deposit" : "Record a Cashout — starts as Pending"}
                        </p>
                        <p style={{ color: isDeposit ? "#047857" : "#92400e", margin: 0, fontSize: "12px", lineHeight: "1.6" }}>
                            {isDeposit
                                ? "Player receives the full deposit amount. The wallet is credited with (deposit − fee). Game stock deducted for full deposit + bonuses."
                                : "Cashout is saved as PENDING. Go to the Transactions page to approve it (full or partial payments). Balance is deducted at approval."
                            }
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

                    {/* ── Player Search ── */}
                    <div>
                        <label style={S.label}>Player * — search by name, username, email or phone</label>
                        <div ref={dropRef} style={{ position: "relative" }}>
                            <div style={{ position: "relative" }}>
                                <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: T.textTertiary, pointerEvents: "none" }} />
                                <input
                                    type="text"
                                    placeholder="Type at least 2 characters…"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); if (player) clearPlayer(); }}
                                    className="atx-input"
                                    style={{ ...S.input, paddingLeft: "38px", paddingRight: player ? "36px" : "14px" }}
                                />
                                {(player || query) && (
                                    <button type="button" onClick={clearPlayer} style={{ position: "absolute", right: "11px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textTertiary, display: "flex", padding: "2px" }}>
                                        <X style={{ width: "13px", height: "13px" }} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown */}
                            {searching && (
                                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "14px 16px", color: T.textTertiary, fontSize: "13px", boxShadow: T.shadowLg }}>
                                    Searching…
                                </div>
                            )}
                            {showDrop && !searching && (
                                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadowLg, overflow: "hidden", maxHeight: "260px", overflowY: "auto" }}>
                                    {results.length === 0
                                        ? <div style={{ padding: "16px", color: T.textTertiary, fontSize: "13px" }}>No players found</div>
                                        : results.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => selectPlayer(p)}
                                                className="dropdown-item"
                                                style={{ padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "13px", color: T.textPrimary }}>{p.name}</div>
                                                    <div style={{ fontSize: "11px", color: T.textTertiary, marginTop: "1px" }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                                                </div>
                                                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                                                    <div style={{ fontWeight: "700", fontSize: "13px", color: T.deposit, fontFamily: T.fontMono }}>{fmt(p.balance)}</div>
                                                    <span style={{
                                                        fontSize: "10px", padding: "2px 7px", borderRadius: T.radiusFull,
                                                        fontWeight: "700", display: "inline-block", marginTop: "2px",
                                                        background: p.tier === "GOLD" ? "#fef3c7" : p.tier === "SILVER" ? "#e0e7ff" : "#fed7aa",
                                                        color: p.tier === "GOLD" ? "#92400e" : p.tier === "SILVER" ? "#3730a3" : "#9a3412",
                                                    }}>
                                                        {p.tier}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {eligLoading && (
                                <div style={{ marginTop: "8px", fontSize: "12px", color: T.textTertiary, display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ width: "12px", height: "12px", border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                                    Loading player data…
                                </div>
                            )}

                            {/* Player Badges */}
                            {player && !eligLoading && (
                                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                    <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit} icon={<CheckCircle style={{ width: "11px", height: "11px" }} />}>
                                        {player.name} · ID {player.id}
                                    </Pill>
                                    <Pill bg={T.accentSurface} border={T.accentBorder} color={T.accent}>
                                        Balance: {fmt(player.balance)}
                                    </Pill>
                                    {streak > 0 && (
                                        <Pill bg={T.warnSurface} border={T.warnBorder} color={T.warn}>
                                            🔥 {streak}-day streak
                                        </Pill>
                                    )}
                                    {!isDeposit && cashoutLimit > 0 && !streakWaived && (
                                        <Pill
                                            bg={cashoutOverLimit ? T.cashoutSurface : T.surfaceSubtle}
                                            border={cashoutOverLimit ? T.cashoutBorder : T.border}
                                            color={cashoutOverLimit ? T.cashout : T.textSecondary}
                                        >
                                            Daily limit: {fmt(cashoutLimit - todayCashoutTotal)} remaining
                                        </Pill>
                                    )}
                                    {!isDeposit && streakWaived && (
                                        <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit}>
                                            ✓ Limit waived (30-day streak)
                                        </Pill>
                                    )}
                                    {isDeposit && (
                                        matchUsedToday
                                            ? <Pill bg={T.warnSurface} border={T.warnBorder} color={T.warn}>⚠ Match used today</Pill>
                                            : <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit}>✓ Match available</Pill>
                                    )}
                                    {isDeposit && playerHasReferrer && (
                                        referralCheckLoading
                                            ? <Pill>Checking referral…</Pill>
                                            : eligibleBonuses.length > 0
                                                ? <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit}>
                                                    👥 {eligibleBonuses.length} referral pending · ${eligibleBonuses.reduce((s, b) => s + b.bonusAmount, 0).toFixed(2)}
                                                </Pill>
                                                : referralAlreadyRecorded
                                                    ? <Pill bg={T.warnSurface} border={T.warnBorder} color={T.warn}>⚠ Referral recorded</Pill>
                                                    : <Pill>👥 Referral not yet recorded</Pill>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Amount / Fee / Wallet ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={S.label}>
                                {isDeposit ? "Deposit Amount ($) *" : `Cashout Amount ($) *`}
                                {!isDeposit && !streakWaived && cashoutLimit > 0 && (
                                    <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0, marginLeft: "4px", color: T.warn }}>
                                        limit {fmt(cashoutLimit)}
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={e => set("amount", e.target.value)}
                                className="atx-input"
                                style={{ ...S.input, borderColor: cashoutOverLimit ? T.cashoutBorder : S.input.borderColor, fontFamily: T.fontMono }}
                            />
                            {cashoutOverLimit && (
                                <p style={{ color: T.cashout, fontSize: "11px", marginTop: "5px", fontWeight: "600" }}>
                                    ⚠ Exceeds cashout limit of {fmt(cashoutLimit)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={S.label}>
                                Fee ($)
                                <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0, marginLeft: "4px", color: T.textTertiary }}>optional</span>
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={form.fee}
                                onChange={e => set("fee", e.target.value)}
                                className="atx-input"
                                style={{ ...S.input, borderColor: feeAmt > 0 ? T.warnBorder : S.input.borderColor, fontFamily: T.fontMono }}
                            />
                            {amt > 0 && (
                                <p style={{ fontSize: "11.5px", marginTop: "5px", fontWeight: "500", color: feeAmt > 0 ? T.warn : T.textTertiary }}>
                                    {feeAmt > 0
                                        ? isDeposit
                                            ? `Wallet gets ${fmt(amt - feeAmt)}`
                                            : `Wallet pays ${fmt(amt + feeAmt)}`
                                        : isDeposit ? "Wallet gets full deposit" : "Wallet pays exact amount"}
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={S.label}>
                                {isDeposit ? "Wallet * (receives deposit − fee)" : "Deduct From Wallet *"}
                            </label>
                            <div style={{ position: "relative" }}>
                                <select
                                    value={form.walletId}
                                    onChange={e => set("walletId", e.target.value)}
                                    className="atx-select"
                                    style={S.select}
                                >
                                    <option value="">— Select wallet —</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id} disabled={!isDeposit && w.balance < amt}>
                                            {w.label}{!isDeposit && w.balance < amt ? " — INSUFFICIENT" : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown style={{ position: "absolute", right: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: T.textTertiary, pointerEvents: "none" }} />
                            </div>
                            {selWallet && amt > 0 && (
                                <p style={{ fontSize: "11.5px", marginTop: "5px", fontWeight: "600", color: '#10b981', fontFamily: T.fontMono }}>
                                    {isDeposit
                                        ? `${fmt(selWallet.balance)} → ${fmt(selWallet.balance + amt - feeAmt)}`
                                        : `${fmt(selWallet.balance)} → ${fmt(selWallet.balance - amt - feeAmt)}`}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Game Selector ── */}
                    <div>
                        <label style={S.label}>
                            Game <span style={{ color: T.cashout }}>*</span>
                            <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0, marginLeft: "4px", color: T.textTertiary }}>required for all transactions</span>
                        </label>
                        <div style={{ position: "relative" }}>
                            <select
                                value={form.gameId}
                                onChange={e => set("gameId", e.target.value)}
                                className="atx-select"
                                style={{ ...S.select, borderColor: !form.gameId ? "#fca5a5" : T.border }}
                            >
                                <option value="">— Select a game —</option>
                                {games.map(g => {
                                    const isDeficit = g.pointStock <= 0;
                                    const disableForDeposit = isDeposit && isDeficit;
                                    return (
                                        <option key={g.id} value={g.id} disabled={disableForDeposit}>
                                            {g.name}  ({(g.pointStock ?? 0).toFixed(0)} pts)
                                            {isDeficit ? (isDeposit ? " — EMPTY" : " — 0 pts (will refill)") : ""}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown style={{ position: "absolute", right: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: T.textTertiary, pointerEvents: "none" }} />
                        </div>
                        {selGame && (
                            <div style={{
                                marginTop: "8px", padding: "10px 14px", borderRadius: T.radiusMd,
                                fontSize: "12px", fontWeight: "500",
                                background: !stockOk ? T.cashoutSurface : T.depositSurface,
                                border: `1px solid ${!stockOk ? T.cashoutBorder : T.depositBorder}`,
                                color: !stockOk ? T.cashout : T.deposit,
                                fontFamily: T.fontMono,
                            }}>
                                {isDeposit
                                    ? (!stockOk
                                        ? `⚠ Insufficient — ${selGame.name} has ${selGame.pointStock.toFixed(2)} pts, need ${stockNeeded.toFixed(2)}`
                                        : `✓ ${selGame.name}: ${selGame.pointStock.toFixed(2)} → ${(selGame.pointStock - stockNeeded).toFixed(2)} pts after`)
                                    : `✓ ${selGame.name}: ${selGame.pointStock.toFixed(2)} → ${(selGame.pointStock + stockNeeded).toFixed(2)} pts after`
                                }
                            </div>
                        )}
                    </div>

                    {/* ── Bonuses — deposit only ── */}
                    {isDeposit && (
                        <>
                            <div style={S.divider} />
                            <div>
                                <SectionHeader icon={Zap} label="Deposit Bonuses" iconColor={T.warn} />
                                <p style={{ fontSize: "12px", color: T.textTertiary, margin: "0 0 14px", lineHeight: "1.6" }}>
                                    Match bonus: once per day · Referral bonuses: toggle below to record eligibility, then grant from the Bonus page.
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <BonusToggle
                                        bonus={DEPOSIT_BONUSES[0]} amount={amt} enabled={form.bonusMatch}
                                        onToggle={v => set("bonusMatch", v)}
                                        eligible={!matchUsedToday}
                                        disabledReason="Match bonus already used today for this player"
                                    />
                                    <BonusToggle
                                        bonus={DEPOSIT_BONUSES[1]} amount={amt} enabled={form.bonusSpecial}
                                        onToggle={v => set("bonusSpecial", v)}
                                    />
                                </div>

                                {/* Transaction Summary */}
                                {amt > 0 && (
                                    <div style={{ marginTop: "16px", borderRadius: T.radiusLg, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                        <div style={{ background: T.surfaceSubtle, padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                                                Transaction Summary
                                            </span>
                                        </div>
                                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                            <SummaryRow label="Deposit amount" value={fmt(amt)} />
                                            <SummaryRow
                                                label="👤 Player receives" value={fmt(amt)}
                                                valueColor={'#10b981'} bg={T.depositSurface} border={T.depositBorder} accent
                                            />
                                            <SummaryRow
                                                label={<span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <Wallet style={{ width: "11px", height: "11px" }} /> Wallet credited
                                                    {feeAmt > 0 && <span style={{ fontWeight: "400", fontSize: "11px", color: T.textTertiary }}>(deposit − fee)</span>}
                                                </span>}
                                                value={fmt(amt - feeAmt)}
                                                valueColor={'#0ea5e9'} bg={T.accentSurface} border={T.accentBorder} accent
                                            />
                                            {feeAmt > 0 && <SummaryRow label="Fee" value={fmt(feeAmt)} valueColor={T.warn} />}
                                            {matchAmt > 0 && <SummaryRow label="Match bonus (50%)" value={`+${fmt(matchAmt)}`} valueColor="#0ea5e9" />}
                                            {specialAmt > 0 && <SummaryRow label="Special bonus (20%)" value={`+${fmt(specialAmt)}`} valueColor={T.bonus} />}
                                            <div style={{ height: "1px", background: T.border, margin: "4px 0" }} />
                                            <SummaryRow
                                                label="Total to player's balance" value={fmt(amt + totalBonus)}
                                                valueColor={'#10b981'} bg={T.depositSurface} border={T.depositBorder} accent
                                            />
                                            {selGame && stockNeeded > 0 && (
                                                <div style={{ fontSize: "11px", color: T.textTertiary, marginTop: "2px" }}>
                                                    Game stock deduction: {fmt(stockNeeded)} pts from {selGame.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Referral Toggle ── */}
                    {isDeposit && player && playerHasReferrer && (
                        <div style={{
                            border: `1.5px solid ${referralAlreadyRecorded ? T.warnBorder : bonusReferral ? T.depositBorder : T.border}`,
                            borderRadius: T.radiusLg, padding: "14px 16px",
                            background: referralAlreadyRecorded ? T.warnSurface : bonusReferral ? T.depositSurface : T.surfaceSubtle,
                            transition: "all .2s",
                            opacity: referralAlreadyRecorded ? 0.75 : 1,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                                    <div style={{
                                        width: "36px", height: "36px", borderRadius: T.radiusMd, flexShrink: 0,
                                        background: bonusReferral && !referralAlreadyRecorded ? T.depositSurface : T.surface,
                                        border: `1.5px solid ${bonusReferral && !referralAlreadyRecorded ? T.depositBorder : T.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Users style={{ width: "15px", height: "15px", color: bonusReferral && !referralAlreadyRecorded ? T.deposit : T.textTertiary }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "600", fontSize: "13px", color: T.textPrimary }}>Record Referral Bonus Eligibility</div>
                                        {referralAlreadyRecorded
                                            ? <div style={{ fontSize: "12px", color: T.warn, marginTop: "3px", fontWeight: "600" }}>
                                                ⚠ Already recorded — grant the pending bonus from the Bonus page
                                            </div>
                                            : <div style={{ fontSize: "12px", color: T.textSecondary, marginTop: "3px", lineHeight: "1.5" }}>
                                                Records <strong style={{ color: T.textPrimary }}>${amt > 0 ? referralBonusAmt.toFixed(2) : "x÷2"}</strong> eligibility for{" "}
                                                <strong style={{ color: T.textPrimary }}>{player?.name}</strong> and referrer{" "}
                                                <strong style={{ color: T.textPrimary }}>{referrerName}</strong>.
                                                No game deduction now — grant is done separately.
                                            </div>
                                        }
                                        {bonusReferral && !referralAlreadyRecorded && amt > 0 && (
                                            <div style={{ display: "flex", gap: "7px", marginTop: "9px", flexWrap: "wrap" }}>
                                                <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit}>
                                                    👤 {player?.name}: +${referralBonusAmt.toFixed(2)}
                                                </Pill>
                                                <Pill bg={T.depositSurface} border={T.depositBorder} color={T.deposit}>
                                                    👤 {referrerName}: +${referralBonusAmt.toFixed(2)}
                                                </Pill>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Toggle
                                    on={bonusReferral && !referralAlreadyRecorded}
                                    onClick={() => !referralAlreadyRecorded && amt > 0 && setBonusReferral(v => !v)}
                                    color={T.deposit}
                                    disabled={referralAlreadyRecorded || amt <= 0}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Notes ── */}
                    <div>
                        <label style={S.label}>
                            Notes
                            <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0, marginLeft: "4px", color: T.textTertiary }}>optional</span>
                        </label>
                        <textarea
                            placeholder="Add any notes…"
                            rows={2}
                            value={form.notes}
                            onChange={e => set("notes", e.target.value)}
                            className="atx-input"
                            style={{ ...S.input, resize: "none", lineHeight: "1.6" }}
                        />
                    </div>

                    {/* ── Action Buttons ── */}
                    <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                        <button
                            type="button"
                            onClick={() => { setForm(EMPTY); setQuery(""); clearPlayer(); }}
                            style={{
                                flex: "0 0 auto", padding: "11px 22px",
                                background: T.surface,
                                border: `1.5px solid ${T.border}`,
                                borderRadius: T.radiusMd, fontWeight: "600",
                                cursor: "pointer", fontSize: "13.5px",
                                color: T.textSecondary, fontFamily: T.fontSans,
                                transition: "all .15s",
                            }}
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            style={{
                                flex: 1, padding: "11px 22px", border: "none",
                                borderRadius: T.radiusMd, fontWeight: "700",
                                fontSize: "13.5px",
                                cursor: canSubmit ? "pointer" : "not-allowed",
                                background: canSubmit
                                    ? isDeposit ? T.deposit : T.warn
                                    : T.surfaceSubtle,
                                color: canSubmit ? T.textInverse : T.textTertiary,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                transition: "all .2s", fontFamily: T.fontSans,
                                boxShadow: canSubmit ? (isDeposit ? "0 2px 8px rgba(5,150,105,.3)" : "0 2px 8px rgba(217,119,6,.3)") : "none",
                            }}
                        >
                            {submitting
                                ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Processing…</>
                                : isDeposit
                                    ? <><ArrowDownLeft style={{ width: "14px", height: "14px" }} /> Record Deposit</>
                                    : <><Clock style={{ width: "14px", height: "14px" }} /> Record Cashout (→ Pending)</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ═══ LEDGER ═══ */}
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>

                {/* Ledger Header */}
                <div style={{
                    padding: "16px 24px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", flexWrap: "wrap", gap: "12px",
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: T.textPrimary, letterSpacing: "-0.2px" }}>
                            Recent Transactions
                        </h3>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: T.textTertiary }}>
                            Deposits complete immediately · Cashouts start as Pending
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <div
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{
                                padding: "6px 12px", borderRadius: T.radiusMd,
                                border: `1px solid ${autoRefresh ? T.depositBorder : T.border}`,
                                background: autoRefresh ? T.depositSurface : T.surface,
                                color: autoRefresh ? T.deposit : T.textSecondary,
                                fontSize: "12px", fontWeight: "600", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                                transition: "all .15s",
                            }}
                        >
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: autoRefresh ? T.deposit : T.border, transition: "background .2s" }} />
                            Auto {autoRefresh ? "ON" : "OFF"}
                        </div>
                        <button
                            onClick={() => loadLedger()}
                            disabled={ledgerLoading}
                            style={{
                                background: T.surface, border: `1px solid ${T.border}`,
                                borderRadius: T.radiusMd, padding: "6px 12px",
                                cursor: "pointer", color: T.textSecondary,
                                display: "flex", alignItems: "center", gap: "5px",
                                fontSize: "12px", fontWeight: "600", fontFamily: T.fontSans,
                                transition: "all .15s",
                            }}
                        >
                            <RefreshCw style={{ width: "12px", height: "12px", animation: ledgerLoading ? "spin 1s linear infinite" : "none" }} />
                            Refresh
                        </button>
                        <span style={{ fontSize: "11px", color: T.textTertiary, fontFamily: T.fontMono }}>
                            {lastRefresh.toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Ledger Body */}
                {ledgerLoading ? (
                    <div style={{ padding: "52px 0", textAlign: "center", color: T.textTertiary, fontSize: "13px" }}>
                        <RefreshCw style={{ width: "14px", height: "14px", margin: "0 auto 10px", display: "block", animation: "spin .8s linear infinite" }} />
                        Loading transaction history…
                    </div>
                ) : ledger.length === 0 ? (
                    <div style={{ padding: "52px", textAlign: "center", color: T.textTertiary, fontSize: "13px" }}>
                        No transactions yet
                    </div>
                ) : (
                    <div style={{ width: "100%", overflowX: "auto", overflowY: "auto", maxHeight: "560px" }}>
                        <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                <tr style={{ background: T.surfaceSubtle }}>
                                    {[
                                        { label: "ID", w: "60px" }, { label: "Player", w: "150px" }, { label: "Type", w: "120px" },
                                        { label: "Amount", w: "100px" }, { label: "Fee", w: "80px" }, { label: "Received / Paid", w: "130px" },
                                        { label: "Game", w: "110px" }, { label: "Wallet", w: "130px" }, { label: "Before → After", w: "155px" },
                                        { label: "Status", w: "95px" }, { label: "Date", w: "155px" }, { label: "", w: "80px" },
                                    ].map(col => (
                                        <th key={col.label} style={{
                                            textAlign: "left", padding: "10px 14px",
                                            fontWeight: "700", color: T.textTertiary,
                                            fontSize: "10.5px", textTransform: "uppercase",
                                            letterSpacing: "0.6px",
                                            borderBottom: `2px solid ${T.border}`,
                                            whiteSpace: "nowrap", width: col.w, minWidth: col.w,
                                            background: T.surfaceSubtle,
                                        }}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((tx, i) => (
                                    <LedgerRow key={tx.id ?? i} tx={tx} undoingId={undoingId} onUndo={handleUndo} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!ledgerLoading && ledger.length > 0 && (
                    <div style={{
                        padding: "10px 24px", borderTop: `1px solid ${T.border}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        <span style={{ fontSize: "12px", color: T.textTertiary }}>
                            Showing {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize: "11px", color: T.border }}>← scroll horizontally to see all columns</span>
                    </div>
                )}
            </div>

            {/* ─── Global Styles ─── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

                .atx-input:focus, .atx-select:focus {
                    border-color: ${T.accent} !important;
                    box-shadow: 0 0 0 3px ${T.accentSurface};
                }
                .atx-input::placeholder { color: ${T.textTertiary}; }

                .dropdown-item:hover { background: ${T.surfaceHover} !important; }

                .ledger-row:hover td { background: ${T.surfaceHover} !important; }

                .undo-btn:hover {
                    border-color: ${T.cashout} !important;
                    color: ${T.cashout} !important;
                    background: ${T.cashoutSurface} !important;
                }

                .bonus-card { transition: all .2s ease; }

                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: ${T.borderStrong}; }
            `}</style>
        </div>
    );
}

export default AddTransactionsPage;
