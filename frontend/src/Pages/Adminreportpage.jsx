import { useState, useEffect, useCallback } from "react";
import {
    FileText, Download, RefreshCw, Calendar, Users, TrendingUp,
    TrendingDown, Gift, CheckCircle, Clock, AlertCircle,
    Activity, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
    DollarSign, BarChart2, Target, Wallet, Gamepad2, MessageSquare,
    ShieldCheck, AlertTriangle, ArrowLeft, Zap, Star, List,
    CalendarRange, ToggleLeft, ToggleRight, ChevronRight
} from "lucide-react";
import { useToast } from '../Context/toastContext';
import { api } from "../api";

// ── Design tokens ─────────────────────────────────────────────
const CARD = {
    background: "#fff",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(15,23,42,.06)",
};

const TH = {
    textAlign: "left",
    padding: "9px 14px",
    fontWeight: "700",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "2px solid #e2e8f0",
    background: "#f8fafc",
    whiteSpace: "nowrap",
};

const TD = {
    padding: "10px 14px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
    color: "#0f172a",
    verticalAlign: "middle",
};

const ROLE_LABEL = { TEAM1: "Team 1", TEAM2: "Team 2", TEAM3: "Team 3", TEAM4: "Team 4" };
const ROLE_COLORS = {
    TEAM1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    TEAM2: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
    TEAM3: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    TEAM4: { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
};

// ── Formatters ────────────────────────────────────────────────
const fmtMoney = (n) =>
    `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—";
const fmtDateShort = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }) : "—";
const toDateInput = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const fmtPts = (n) => `${(n ?? 0).toFixed(0)} pts`;
const clrNum = (v, invert = false) => {
    const pos = invert ? (v ?? 0) <= 0 : (v ?? 0) >= 0;
    return pos ? "#16a34a" : "#dc2626";
};
const signNum = (v) => (v ?? 0) >= 0 ? `+${fmtMoney(Math.abs(v))}` : `-${fmtMoney(Math.abs(v))}`;
const signPts = (v) => (v ?? 0) >= 0 ? `+${Math.abs(v ?? 0).toFixed(0)}` : `-${Math.abs(v ?? 0).toFixed(0)}`;

// ── Small atoms ───────────────────────────────────────────────
function Badge({ label, bg, color }) {
    return (
        <span style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", background: bg, color, whiteSpace: "nowrap" }}>
            {label}
        </span>
    );
}

function TypeBadge({ type }) {
    const t = (type || "").toString().toUpperCase();
    const map = {
        DEPOSIT: { bg: "#dcfce7", color: "#166534", label: "DEPOSIT" },
        WITHDRAWAL: { bg: "#fee2e2", color: "#991b1b", label: "CASHOUT" },
        CASHOUT: { bg: "#fee2e2", color: "#991b1b", label: "CASHOUT" },
        BONUS: { bg: "#fff7ed", color: "#c2410c", label: "BONUS" },
        "MATCH BONUS": { bg: "#fef3c7", color: "#b45309", label: "MATCH BONUS" },
        "SPECIAL BONUS": { bg: "#fdf4ff", color: "#7e22ce", label: "SPECIAL BONUS" },
        "STREAK BONUS": { bg: "#eff6ff", color: "#1d4ed8", label: "STREAK BONUS" },
        "REFERRAL BONUS": { bg: "#f0fdf4", color: "#15803d", label: "REFERRAL BONUS" },
        "POINT RELOAD": { bg: "#e0f2fe", color: "#0369a1", label: "POINT RELOAD" },
        RELOAD: { bg: "#e0f2fe", color: "#0369a1", label: "POINT RELOAD" },
    };
    const s = map[t] || map[type] || { bg: "#f1f5f9", color: "#475569", label: type };
    return <Badge label={s.label} bg={s.bg} color={s.color} />;
}

function DisplayTypeBadge({ type }) {
    const map = {
        Deposit: { bg: "#dcfce7", color: "#166534" },
        Cashout: { bg: "#fee2e2", color: "#991b1b" },
        "Match Bonus": { bg: "#fef3c7", color: "#b45309" },
        "Special Bonus": { bg: "#fdf4ff", color: "#7e22ce" },
        "Streak Bonus": { bg: "#eff6ff", color: "#1d4ed8" },
        "Referral Bonus": { bg: "#f0fdf4", color: "#15803d" },
        Bonus: { bg: "#fff7ed", color: "#c2410c" },
        DEPOSIT: { bg: "#dcfce7", color: "#166534" },
        WITHDRAWAL: { bg: "#fee2e2", color: "#991b1b" },
        BONUS: { bg: "#fff7ed", color: "#c2410c" },
    };
    const s = map[type] || { bg: "#f1f5f9", color: "#475569" };
    return <Badge label={type} bg={s.bg} color={s.color} />;
}

function PriorityBadge({ priority }) {
    const map = { HIGH: { bg: "#fee2e2", color: "#991b1b" }, MEDIUM: { bg: "#fffbeb", color: "#b45309" }, LOW: { bg: "#f0fdf4", color: "#166534" } };
    const s = map[priority] || map.MEDIUM;
    return <Badge label={priority} bg={s.bg} color={s.color} />;
}

function TaskTypeBadge({ taskType }) {
    const map = {
        STANDARD: { bg: "#f1f5f9", color: "#475569", label: "Standard" },
        DAILY_CHECKLIST: { bg: "#f0f9ff", color: "#0369a1", label: "Daily Checklist" },
        PLAYER_ADDITION: { bg: "#f5f3ff", color: "#6d28d9", label: "Player Addition" },
        REVENUE_TARGET: { bg: "#f0fdf4", color: "#15803d", label: "Revenue Target" },
    };
    const s = map[taskType] || map.STANDARD;
    return <Badge label={s.label} bg={s.bg} color={s.color} />;
}

function ProgressBar({ pct, color = "#3b82f6" }) {
    return (
        <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
        </div>
    );
}

// ── Summary stat card ─────────────────────────────────────────
function StatCard({ label, value, valueColor, sub, icon: Icon, accentColor }) {
    return (
        <div style={{ ...CARD, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                {Icon && <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: accentColor + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon style={{ width: "15px", height: "15px", color: accentColor }} />
                </div>}
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: valueColor || "#0f172a", letterSpacing: "-0.5px" }}>{value}</div>
            {sub && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{sub}</div>}
        </div>
    );
}

// ── Cash Flow Audit table (wallet snapshots) ──────────────────
function CashFlowAudit({ startSnapshot, endSnapshot, transactions }) {
    if (!startSnapshot || !endSnapshot) return null;

    const startWallets = startSnapshot.walletSnapshot ?? [];
    const endWallets = endSnapshot.walletSnapshot ?? [];
    const allIds = [...new Set([...startWallets.map(w => w.id), ...endWallets.map(w => w.id)])];

    const rows = allIds.map(id => {
        const sw = startWallets.find(w => w.id === id);
        const ew = endWallets.find(w => w.id === id);
        const delta = (ew?.balance ?? 0) - (sw?.balance ?? 0);
        return {
            name: sw?.name ?? ew?.name ?? id,
            method: sw?.method ?? ew?.method ?? "",
            start: sw?.balance ?? 0,
            end: ew?.balance ?? 0,
            delta
        };
    });

    const totalRevenue = transactions.reduce((aggr, tx) => {
        const amt = tx.amount || 0;
        const type = (tx.type || "").toUpperCase();
        if (type === "DEPOSIT") return aggr + amt;
        if (type === "WITHDRAWAL" || type === "CASHOUT") return aggr - amt;
        return aggr;
    }, 0);

    const totalBonuses = transactions.reduce((aggr, tx) => {
        const type = (tx.type || "").toUpperCase();
        if (type.includes("BONUS")) return aggr + (tx.amount || 0);
        return aggr;
    }, 0);

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Wallet style={{ width: "14px", height: "14px", color: "#2563eb" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Cash Flow Audit</span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Method", "Start", "End", "Change"].map(h => (
                                <th key={h} style={{ ...TH, textAlign: h === "Method" ? "left" : "right" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={TD}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.method === "Bitcoin" ? "#f7931a" : r.method === "CashApp" ? "#00d632" : r.method === "Chime" ? "#8ac341" : r.method === "PayPal" ? "#003087" : "#94a3b8", flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "13px" }}>{r.method || r.name}</div>
                                            {r.method && r.name !== r.method && <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.name}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...TD, textAlign: "right", color: "#64748b" }}>{fmtMoney(r.start)}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: "600" }}>{fmtMoney(r.end)}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: clrNum(r.delta) }}>
                                    {r.delta === 0 ? <span style={{ color: "#94a3b8" }}>$0.00</span> : signNum(r.delta)}
                                </td>
                            </tr>
                        ))}
                        <tr style={{ background: "#f8fafc" }}>
                            <td style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#475569" }}>Total</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{fmtMoney(startSnapshot.totalWallet ?? 0)}</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{fmtMoney(endSnapshot.totalWallet ?? 0)}</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: clrNum(endSnapshot.walletChange) }}>
                                {signNum(endSnapshot.walletChange ?? 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Game Point Audit table ────────────────────────────────────
function GamePointAudit({ startSnapshot, endSnapshot }) {
    if (!startSnapshot || !endSnapshot) return null;

    const startGames = startSnapshot.gameSnapshot ?? [];
    const endGames = endSnapshot.gameSnapshot ?? [];
    const allIds = [...new Set([...startGames.map(g => g.id), ...endGames.map(g => g.id)])];

    const rows = allIds.map(id => {
        const sg = startGames.find(g => g.id === id);
        const eg = endGames.find(g => g.id === id);
        const delta = (eg?.pointStock ?? 0) - (sg?.pointStock ?? 0);
        return { name: sg?.name ?? eg?.name ?? id, start: sg?.pointStock ?? 0, end: eg?.pointStock ?? 0, delta };
    });

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Gamepad2 style={{ width: "14px", height: "14px", color: "#7c3aed" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Game Point Audit</span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Game", "Start", "End", "Change"].map(h => (
                                <th key={h} style={{ ...TH, textAlign: h === "Game" ? "left" : "right" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={{ ...TD, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Gamepad2 style={{ width: "13px", height: "13px", color: "#7c3aed" }} />
                                    </div>
                                    <span style={{ fontWeight: "600" }}>{r.name}</span>
                                </td>
                                <td style={{ ...TD, textAlign: "right", color: "#64748b" }}>{r.start.toFixed(0)}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: "600" }}>{r.end.toFixed(0)}</td>
                                <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: clrNum(r.delta, true) }}>
                                    {r.delta === 0 ? <span style={{ color: "#94a3b8" }}>0</span> : <span>{signPts(r.delta)}</span>}
                                </td>
                            </tr>
                        ))}
                        <tr style={{ background: "#f8fafc" }}>
                            <td style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#475569" }}>Total</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{(startSnapshot.totalGames ?? 0).toFixed(0)}</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{(endSnapshot.totalGames ?? 0).toFixed(0)}</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: clrNum(endSnapshot.gameChange, true) }}>
                                {signPts(endSnapshot.gameChange ?? 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Full Shift Transactions Table ─────────────────────────────
function ShiftTransactionsTable({ transactions }) {
    if (!transactions?.length) return (
        <div style={{ ...CARD, padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            No transactions recorded for this shift
        </div>
    );
    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <List style={{ width: "14px", height: "14px", color: "#64748b" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Shift Transactions ({transactions.length})
                </span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Time", "Player", "Type", "Bonus Type", "Game / Wallet", "Pts Before → After", "Amount", "Fee", "Balance After", "Status"].map(h => (
                                <th key={h} style={{ ...TH, textAlign: h === "Amount" || h === "Fee" || h === "Balance After" ? "right" : "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => {
                            const isDeposit = t.type === "DEPOSIT";
                            const isCashout = t.type === "WITHDRAWAL";
                            const isBonus = t.type === "BONUS";
                            const isPending = t.status === "PENDING";
                            const amtColor = isDeposit ? "#16a34a" : isCashout ? "#dc2626" : isBonus ? "#c2410c" : "#475569";
                            const pts = t.gameStockAfter != null && t.gameStockBefore != null
                                ? Math.round(t.gameStockAfter - t.gameStockBefore) : null;

                            return (
                                <tr key={t.id}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                                    onMouseLeave={e => e.currentTarget.style.background = ""}
                                    style={{ opacity: isPending ? 0.75 : 1 }}
                                >
                                    <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(t.createdAt)}</td>
                                    <td style={TD}>
                                        <div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || t.playerName || `#${t.userId}`}</div>
                                        {t.user?.email && <div style={{ fontSize: "10px", color: "#94a3b8" }}>{t.user.email}</div>}
                                    </td>
                                    <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                    <td style={TD}>
                                        {t.bonusType
                                            ? <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>{t.bonusType.toUpperCase()}</span>
                                            : <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ ...TD, fontSize: "11px" }}>
                                        {t.gameName && <div style={{ fontWeight: "600", color: "#0f172a" }}>{t.gameName}</div>}
                                        {t.walletMethod && <div style={{ color: "#64748b" }}>{t.walletMethod}{t.walletName ? ` · ${t.walletName}` : ""}</div>}
                                        {!t.gameName && !t.walletMethod && <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ ...TD, fontSize: "11px" }}>
                                        {pts !== null
                                            ? <span style={{ color: "#64748b" }}>{t.gameStockBefore?.toFixed(0)} → <b style={{ color: pts < 0 ? "#7c3aed" : "#16a34a" }}>{t.gameStockAfter?.toFixed(0)}</b></span>
                                            : <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ ...TD, textAlign: "right", fontWeight: "800", fontSize: "13px", color: amtColor }}>{fmtMoney(t.amount)}</td>
                                    <td style={{ ...TD, textAlign: "right" }}>
                                        {t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "11px" }}>−{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ ...TD, textAlign: "right", fontSize: "12px", color: "#64748b" }}>{t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}</td>
                                    <td style={TD}>
                                        <Badge label={isPending ? "PENDING" : "DONE"} bg={isPending ? "#fef3c7" : "#dcfce7"} color={isPending ? "#b45309" : "#166534"} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: "#f8fafc" }}>
                            <td colSpan={6} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#475569" }}>Totals</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "800", fontSize: "13px" }}>
                                <div style={{ color: "#16a34a" }}>+{fmtMoney(transactions.filter(t => t.type === "DEPOSIT").reduce((s, t) => s + (t.amount ?? 0), 0))}</div>
                                <div style={{ color: "#dc2626", fontSize: "11px" }}>−{fmtMoney(transactions.filter(t => t.type === "WITHDRAWAL").reduce((s, t) => s + (t.amount ?? 0), 0))}</div>
                                <div style={{ color: "#c2410c", fontSize: "11px" }}>−{fmtMoney(transactions.filter(t => t.type === "BONUS").reduce((s, t) => s + (t.amount ?? 0), 0))} bonus</div>
                            </td>
                            <td colSpan={3} style={TD} />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Audit Verification ────────────────────────────────────────
function AuditVerification({ endSnapshot, transactions }) {
    if (!endSnapshot) return null;
    const { deposits, cashouts, bonuses, netProfit, walletChange, gameChange } = endSnapshot;

    const expectedWallet = (deposits ?? 0) - (cashouts ?? 0);
    const cashDiscrepancy = (walletChange ?? 0) - expectedWallet;
    const ptDiscrepancy = Math.round(endSnapshot.gameDiscrepancy ?? 0);

    const expectedGameDeduction = (deposits ?? 0) + (bonuses ?? 0) - (cashouts ?? 0);
    const actualGameDeduction = Math.abs(gameChange ?? 0);
    const fundsPointsDiscrepancy = Math.round(actualGameDeduction - expectedGameDeduction);
    const fundsPointsOk = Math.abs(fundsPointsDiscrepancy) < 2;

    const cashOk = Math.abs(cashDiscrepancy) < 0.02;
    const ptsOk = Math.abs(ptDiscrepancy) < 2;
    const allOk = cashOk && ptsOk && fundsPointsOk;

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck style={{ width: "14px", height: "14px", color: "#64748b" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Audit Verification</span>
                <div style={{ marginLeft: "auto" }}>
                    {allOk ? <Badge label="✓ All Clear" bg="#f0fdf4" color="#15803d" /> : <Badge label="⚠ Discrepancy Found" bg="#fee2e2" color="#991b1b" />}
                </div>
            </div>
            <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div style={{ border: `1px solid ${cashOk ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ padding: "8px 12px", background: cashOk ? "#f0fdf4" : "#fef2f2", borderBottom: `1px solid ${cashOk ? "#86efac" : "#fca5a5"}`, fontSize: "11px", fontWeight: "700", color: cashOk ? "#15803d" : "#991b1b", textTransform: "uppercase" }}>Cash Flow Check</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                                {[
                                    { label: "Actual Change", val: signNum(walletChange ?? 0), color: clrNum(walletChange) },
                                    { label: "Expected Change", val: signNum(expectedWallet), color: clrNum(expectedWallet) },
                                    { label: "Discrepancy", val: cashOk ? "$0.00" : signNum(cashDiscrepancy), color: cashOk ? "#16a34a" : "#dc2626" },
                                ].map(({ label, val, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                                        <div style={{ fontSize: "15px", fontWeight: "800", color }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ border: `1px solid ${ptsOk ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ padding: "8px 12px", background: ptsOk ? "#f0fdf4" : "#fef2f2", borderBottom: `1px solid ${ptsOk ? "#86efac" : "#fca5a5"}`, fontSize: "11px", fontWeight: "700", color: ptsOk ? "#15803d" : "#991b1b", textTransform: "uppercase" }}>Point Stock Check</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                                {[
                                    { label: "Actual Change", val: signPts(gameChange ?? 0) + " pts", color: clrNum(gameChange, true) },
                                    { label: "Expected Change", val: signPts(-(deposits + bonuses - cashouts)) + " pts", color: "#475569" },
                                    { label: "Discrepancy", val: ptsOk ? "0 pts" : signPts(ptDiscrepancy) + " pts", color: ptsOk ? "#16a34a" : "#dc2626" },
                                ].map(({ label, val, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                                        <div style={{ fontSize: "15px", fontWeight: "800", color }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ padding: "10px 14px", background: allOk ? "#f0fdf4" : "#fef2f2", border: `1px solid ${allOk ? "#86efac" : "#fca5a5"}`, borderLeft: `4px solid ${allOk ? "#16a34a" : "#dc2626"}`, borderRadius: "8px", fontSize: "12px" }}>
                    {!allOk && (
                        <div style={{ fontWeight: "700", color: "#991b1b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertTriangle style={{ width: "13px", height: "13px" }} />
                            {!cashOk && `Cash discrepancy: ${fmtMoney(Math.abs(cashDiscrepancy))}. `}
                            {!ptsOk && `Point discrepancy: ${Math.abs(ptDiscrepancy)} pts. `}
                        </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", color: "#475569" }}>
                        <span>Deposits: <b style={{ color: "#16a34a" }}>{fmtMoney(deposits)}</b></span>
                        <span>Cashouts: <b style={{ color: "#dc2626" }}>−{fmtMoney(cashouts)}</b></span>
                        <span>Bonuses: <b style={{ color: "#c2410c" }}>−{fmtMoney(bonuses)}</b></span>
                        <span>Net Profit: <b style={{ color: (netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(netProfit)}</b></span>
                        <span>Wallet Δ: <b style={{ color: clrNum(walletChange) }}>{signNum(walletChange)}</b></span>
                        <span>Game Δ: <b style={{ color: "#7c3aed" }}>{signPts(gameChange)} pts</b></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Member Feedback Panel ─────────────────────────────────────
function FeedbackPanel({ shift }) {
    const effort = shift.checkin?.effortRating ?? null;
    const effortReason = shift.effortReason ?? shift.checkin?.additionalNotes ?? null;
    const improvements = shift.improvements ?? null;
    const workSummary = shift.checkin?.workSummary ?? null;
    const issues = shift.checkin?.issuesEncountered ?? null;

    if (!effort && !effortReason && !workSummary) return (
        <div style={{ padding: "18px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>
            No feedback submitted for this shift
        </div>
    );

    const effortColor = !effort ? "#94a3b8" : effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626";
    const effortBg = !effort ? "#f1f5f9" : effort >= 8 ? "#f0fdf4" : effort >= 5 ? "#fffbeb" : "#fee2e2";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {effort && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px 18px", background: effortBg, borderRadius: "10px", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: "26px", fontWeight: "900", color: effortColor, lineHeight: 1 }}>{effort}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", fontWeight: "600", textTransform: "uppercase" }}>/ 10</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <div key={n} style={{ flex: 1, height: "7px", borderRadius: "3px", background: n <= effort ? effortColor : "#e2e8f0" }} />
                            ))}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {effort >= 8 ? "Excellent effort" : effort >= 5 ? "Moderate effort" : "Low effort this shift"}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {effortReason && (
                    <div style={{ padding: "11px 13px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>Why this rating?</div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{effortReason}</p>
                    </div>
                )}
                {workSummary && (
                    <div style={{ padding: "11px 13px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>Work summary</div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{workSummary}</p>
                    </div>
                )}
                {issues && (
                    <div style={{ padding: "11px 13px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>Issues encountered</div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{issues}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Expenses Table ────────────────────────────────────────────
function ExpensesTable({ expenses }) {
    if (!expenses?.length) return null;
    const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalPts = expenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign style={{ width: '14px', height: '14px', color: '#b45309' }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Expenses ({expenses.length})</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ fontWeight: '800', color: '#b45309' }}>−${total.toFixed(2)}</span>
                    {totalPts > 0 && <span style={{ color: '#7c3aed', fontWeight: '700' }}>+{totalPts} pts added</span>}
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Details', 'Category', 'Game', 'Amount', 'Points Added', 'Payment', 'Notes'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                        {expenses.map(e => (
                            <tr key={e.id} onMouseEnter={ev => ev.currentTarget.style.background = '#fefce8'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                                <td style={{ ...TD, fontWeight: '600' }}>{e.details}</td>
                                <td style={TD}><Badge label={e.category?.replace('_', ' ')} bg="#fffbeb" color="#b45309" /></td>
                                <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>{e.game?.name || '—'}</td>
                                <td style={{ ...TD, fontWeight: '700', color: '#b45309' }}>${(e.amount ?? 0).toFixed(2)}</td>
                                <td style={{ ...TD, color: '#7c3aed' }}>{e.pointsAdded > 0 ? `+${e.pointsAdded} pts` : '—'}</td>
                                <td style={{ ...TD, color: '#64748b', fontSize: '12px' }}>{e.paymentMade > 0 ? `$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}</td>
                                <td style={{ ...TD, fontSize: '11px', color: '#94a3b8' }}>{e.notes || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Profit Takeouts Table ─────────────────────────────────────
function ProfitTakeoutsTable({ takeouts }) {
    if (!takeouts?.length) return null;
    const total = takeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingDown style={{ width: '14px', height: '14px', color: '#991b1b' }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Profit Takeouts ({takeouts.length})</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>−${total.toFixed(2)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Taken By', 'Method', 'Amount', 'Notes'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                        {takeouts.map(t => (
                            <tr key={t.id} onMouseEnter={ev => ev.currentTarget.style.background = '#fff5f5'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                                <td style={{ ...TD, fontWeight: '600' }}>{t.takenBy}</td>
                                <td style={TD}><Badge label={t.method} bg="#fff1f2" color="#991b1b" /></td>
                                <td style={{ ...TD, fontWeight: '800', color: '#991b1b' }}>${parseFloat(t.amount).toFixed(2)}</td>
                                <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>{t.notes || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Single Shift Detail ───────────────────────────────────────
function ShiftDetail({ shift, index, total, memberName, teamRole }) {
    const [activeTab, setActiveTab] = useState("overview");
    const isLast = index === total - 1;
    const s = shift.stats || {};
    const rc = ROLE_COLORS[teamRole] || ROLE_COLORS.TEAM1;

    let startSnapshot = shift.startSnapshot ?? null;
    let endSnapshot = shift.endSnapshot ?? null;
    if (!startSnapshot && shift.checkin?.balanceNote) {
        try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { }
    }
    if (!endSnapshot && shift.checkin?.additionalNotes) {
        try { const p = JSON.parse(shift.checkin.additionalNotes); endSnapshot = p.endSnapshot ?? null; } catch (_) { }
    }

    const hasReconciliation = startSnapshot && endSnapshot;
    const transactions = shift.transactions || [];

    const tabs = [
        { id: "overview", label: "Shift Report" },
        { id: "transactions", label: `Transactions (${transactions.length})` },
        { id: "tasks", label: `Tasks (${shift.tasks?.length || 0})` },
        { id: "players", label: `Players Added (${shift.playersAdded?.length || 0})` },
        { id: "bonuses", label: `Bonuses (${shift.bonusesGranted?.length || 0})` },
    ];

    const netProfit = s.netProfit ?? 0;

    return (
        <div style={{ borderBottom: isLast ? "none" : "1px solid #e2e8f0" }}>
            <div style={{ padding: "14px 20px", background: shift.isActive ? "#f0fdf4" : "#fafbfc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: shift.isActive ? "#22c55e" : "#94a3b8", flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
                            {fmtTime(shift.startTime)} — {shift.isActive ? <span style={{ color: "#22c55e" }}>Active Now</span> : fmtTime(shift.endTime)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                            {shift.duration != null ? `${shift.duration} min` : "Ongoing"}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "8px" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Bonuses", val: fmtMoney(s.totalBonuses), color: "#c2410c", bg: "#fff7ed" },
                        { label: "Profit", val: fmtMoney(netProfit), color: netProfit >= 0 ? "#16a34a" : "#dc2626", bg: netProfit >= 0 ? "#f0fdf4" : "#fee2e2" },
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "5px 10px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{label}</span>
                            <span style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: "1px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", overflowX: "auto" }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "9px 16px", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: activeTab === t.id ? "#fff" : "transparent", color: activeTab === t.id ? "#0f172a" : "#94a3b8", borderBottom: `2px solid ${activeTab === t.id ? "#0f172a" : "transparent"}`, whiteSpace: "nowrap" }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                        <StatCard label="Player Deposits" value={`+${fmtMoney(s.totalDeposits)}`} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                        <StatCard label="Player Cashouts" value={`−${fmtMoney(s.totalCashouts)}`} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                        <StatCard label="Bonuses Given" value={`−${fmtMoney(s.totalBonuses)}`} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                        <StatCard label="Shift Net Profit" value={(netProfit >= 0 ? "+" : "") + fmtMoney(netProfit)} valueColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} accentColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} />
                    </div>
                    {hasReconciliation && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            <CashFlowAudit startSnapshot={startSnapshot} endSnapshot={endSnapshot} transactions={transactions} />
                            <GamePointAudit startSnapshot={startSnapshot} endSnapshot={endSnapshot} />
                        </div>
                    )}
                    <ShiftTransactionsTable transactions={transactions} />
                    {shift.expenses?.length > 0 && <ExpensesTable expenses={shift.expenses} />}
                    {shift.profitTakeouts?.length > 0 && <ProfitTakeoutsTable takeouts={shift.profitTakeouts} />}
                    {hasReconciliation && <AuditVerification endSnapshot={endSnapshot} transactions={transactions} />}
                    <div style={{ ...CARD, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                            <MessageSquare style={{ width: "14px", height: "14px", color: "#64748b" }} />
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Member Feedback</span>
                        </div>
                        <div style={{ padding: "16px" }}><FeedbackPanel shift={shift} /></div>
                    </div>
                </div>
            )}

            {activeTab === "transactions" && (
                <div style={{ overflowX: "auto" }}>
                    {!transactions.length
                        ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions this shift</div>
                        : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead><tr>{["Time", "Player", "Type", "Game", "Amount", "Balance After"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{fmtTime(t.createdAt)}</td>
                                            <td style={TD}><div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || `#${t.userId}`}</div></td>
                                            <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{t.gameName || "—"}</td>
                                            <td style={{ ...TD, fontWeight: "700", fontSize: "13px", color: t.type === "DEPOSIT" ? "#16a34a" : t.type === "WITHDRAWAL" ? "#dc2626" : "#c2410c" }}>{fmtMoney(t.amount)}</td>
                                            <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </div>
            )}

            {activeTab === "tasks" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.tasks?.length
                        ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No tasks this shift</div>
                        : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {shift.tasks.map(t => (
                                <div key={t.id} style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${t.status === "COMPLETED" ? "#22c55e" : "#f59e0b"}`, borderRadius: "0 8px 8px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "700" }}>{t.title}</span>
                                        <Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} />
                                    </div>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {activeTab === "players" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.playersAdded?.length
                        ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No players added this shift</div>
                        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                            {shift.playersAdded.map(p => (
                                <div key={p.id} style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "9px", background: "#f5f3ff" }}>
                                    <div style={{ fontWeight: "700", fontSize: "13px" }}>{p.name}</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>@{p.username}</div>
                                    <div style={{ marginTop: "6px" }}><Badge label={p.tier} bg="#fffbeb" color="#92400e" /></div>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {activeTab === "bonuses" && (
                <div style={{ overflowX: "auto" }}>
                    {!shift.bonusesGranted?.length
                        ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No bonuses this shift</div>
                        : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead><tr>{["Time", "Player", "Game", "Amount"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {shift.bonusesGranted.map(b => (
                                        <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{fmtTime(b.createdAt)}</td>
                                            <td style={{ ...TD, fontSize: "12px", fontWeight: "600" }}>{b.user?.name || "—"}</td>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{b.game?.name || "—"}</td>
                                            <td style={{ ...TD, fontWeight: "700", color: "#c2410c" }}>{fmtMoney(b.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </div>
            )}
        </div>
    );
}

// ── Member Section (collapsible) ──────────────────────────────
function MemberShiftSection({ team }) {
    const [expanded, setExpanded] = useState(true);
    const rc = ROLE_COLORS[team.role] || ROLE_COLORS.TEAM1;
    const memberName = team.member?.name || team.shifts[0]?.displayMember?.name || team.shifts[0]?.checkin?.user?.name || "Unassigned";

    const aggr = team.shifts.reduce((acc, s) => {
        const st = s.stats || {};
        acc.deposits += st.totalDeposits || 0;
        acc.cashouts += st.totalCashouts || 0;
        acc.bonuses += st.totalBonuses || 0;
        acc.profit += st.netProfit || 0;
        acc.players += st.playersAdded || 0;
        acc.tasks += st.tasksCompleted || 0;
        acc.duration += s.duration || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, players: 0, tasks: 0, duration: 0 });

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div onClick={() => setExpanded(v => !v)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", background: "#fafbfc", borderBottom: expanded ? "1px solid #e2e8f0" : "none", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: rc.bg, border: `2px solid ${rc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "800", color: rc.text, flexShrink: 0 }}>
                        {memberName[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>{memberName}</div>
                        <div style={{ display: "flex", gap: "6px", marginTop: "3px", alignItems: "center" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                                {ROLE_LABEL[team.role] || team.role}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{team.shifts.length} shift{team.shifts.length !== 1 ? "s" : ""} · {aggr.duration} min</span>
                        </div>
                    </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(aggr.deposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(aggr.cashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Profit", val: fmtMoney(aggr.profit), color: aggr.profit >= 0 ? "#16a34a" : "#dc2626", bg: aggr.profit >= 0 ? "#f0fdf4" : "#fee2e2" },
                        { label: "Players", val: aggr.players, color: "#6d28d9", bg: "#f5f3ff" },
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "4px 10px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>{label}</span>
                            <span style={{ fontSize: "12px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                    {expanded ? <ChevronUp style={{ width: "15px", height: "15px", color: "#94a3b8" }} /> : <ChevronDown style={{ width: "15px", height: "15px", color: "#94a3b8" }} />}
                </div>
            </div>
            {expanded && team.shifts.map((shift, si) => (
                <ShiftDetail key={shift.id} shift={shift} index={si} total={team.shifts.length} memberName={shift.displayMember?.name} teamRole={team.role} />
            ))}
        </div>
    );
}

// ── Day Report Block (used in range view) ─────────────────────
function DayReportBlock({ report, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const s = report.summary || {};
    const dayLabel = fmtDate(report.date + "T12:00:00");

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            {/* Day header — clickable to expand/collapse */}
            <div
                onClick={() => setExpanded(v => !v)}
                style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", background: "#f8fafc", borderBottom: expanded ? "1px solid #e2e8f0" : "none", flexWrap: "wrap" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Calendar style={{ width: "17px", height: "17px", color: "#2563eb" }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>{dayLabel}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            {s.totalShifts ?? 0} shift{s.totalShifts !== 1 ? "s" : ""} · {s.transactionCount ?? 0} transactions
                            {s.activeShifts > 0 && <span style={{ marginLeft: "6px", color: "#22c55e", fontWeight: "700" }}>● {s.activeShifts} live</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Bonuses", val: fmtMoney(s.totalBonuses), color: "#c2410c", bg: "#fff7ed" },
                        { label: "Profit", val: fmtMoney(s.netProfit), color: (s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626", bg: (s.netProfit ?? 0) >= 0 ? "#f0fdf4" : "#fee2e2" },
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "5px 11px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{label}</span>
                            <span style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                    {expanded ? <ChevronUp style={{ width: "15px", height: "15px", color: "#94a3b8" }} /> : <ChevronDown style={{ width: "15px", height: "15px", color: "#94a3b8" }} />}
                </div>
            </div>

            {/* Expanded: full day content */}
            {expanded && (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Day Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                        <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                        <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                        <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                        <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} valueColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} icon={(s.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown} accentColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} />
                        <StatCard label="Tasks Done" value={s.tasksCompleted ?? 0} icon={CheckCircle} accentColor="#16a34a" />
                        <StatCard label="Transactions" value={s.transactionCount ?? 0} icon={Activity} accentColor="#2563eb" />
                        <StatCard label="Shifts" value={s.totalShifts ?? 0} sub={`${s.activeShifts ?? 0} active`} icon={Clock} accentColor="#475569" />
                    </div>

                    {/* Team Shifts */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users style={{ width: "12px", height: "12px" }} /> Team Shifts
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(report.teams || []).map(team => <MemberShiftSection key={team.role} team={team} />)}
                        </div>
                    </div>

                    {/* Tasks */}
                    {report.dayTasks?.length > 0 && (
                        <div style={{ ...CARD, overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                                <CheckCircle style={{ width: "14px", height: "14px", color: "#64748b" }} />
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase" }}>Tasks ({report.dayTasks.length})</span>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead><tr>{["Task", "Type", "Assigned To", "Status", "Priority"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {report.dayTasks.map(t => (
                                            <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                <td style={TD}><div style={{ fontWeight: "600" }}>{t.title}</div></td>
                                                <td style={TD}><TaskTypeBadge taskType={t.taskType} /></td>
                                                <td style={{ ...TD, fontSize: "12px" }}>{t.assignToAll ? <Badge label="All Members" bg="#f5f3ff" color="#7c3aed" /> : t.assignedTo?.name || "—"}</td>
                                                <td style={TD}><Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} /></td>
                                                <td style={TD}><PriorityBadge priority={t.priority} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Wallets */}
                    {report.wallets?.length > 0 && (
                        <div style={{ ...CARD, padding: "16px 20px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Wallet Balances (End of Day)</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                                {report.wallets.map(w => (
                                    <div key={w.id} style={{ padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fafbfc" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: "700" }}>{w.method}</div>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "3px" }}>{fmtMoney(w.balance)}</div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>{w.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Range Aggregated Summary ──────────────────────────────────
function RangeSummaryCards({ reports }) {
    const totals = reports.reduce((acc, r) => {
        const s = r.summary || {};
        acc.deposits += s.totalDeposits || 0;
        acc.cashouts += s.totalCashouts || 0;
        acc.bonuses += s.totalBonuses || 0;
        acc.profit += s.netProfit || 0;
        acc.shifts += s.totalShifts || 0;
        acc.transactions += s.transactionCount || 0;
        acc.tasks += s.tasksCompleted || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0 });

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "10px" }}>
            <StatCard label="Total Deposits" value={fmtMoney(totals.deposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" sub={`across ${reports.length} days`} />
            <StatCard label="Total Cashouts" value={fmtMoney(totals.cashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
            <StatCard label="Total Bonuses" value={fmtMoney(totals.bonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
            <StatCard label="Net Profit" value={fmtMoney(totals.profit)} valueColor={totals.profit >= 0 ? "#16a34a" : "#dc2626"} icon={totals.profit >= 0 ? TrendingUp : TrendingDown} accentColor={totals.profit >= 0 ? "#16a34a" : "#dc2626"} sub="Deposits − Cashouts − Bonuses" />
            <StatCard label="Total Shifts" value={totals.shifts} icon={Clock} accentColor="#475569" />
            <StatCard label="Transactions" value={totals.transactions} icon={Activity} accentColor="#2563eb" />
            <StatCard label="Tasks Done" value={totals.tasks} icon={CheckCircle} accentColor="#16a34a" />
            <StatCard label="Days Covered" value={reports.length} icon={CalendarRange} accentColor="#7c3aed" />
        </div>
    );
}

// ── printReport (single day) ──────────────────────────────────
function printReport(report, date) {
    const win = window.open("", "_blank");
    const { summary, teams, wallets, dayTasks } = report;
    const s = summary || {};

    const memberRows = (teams || []).flatMap(team =>
        team.shifts.map(shift => {
            const st = shift.stats || {};
            const effort = shift.checkin?.effortRating ?? null;
            return `<tr>
              <td><strong>${shift.displayMember?.name || "—"}</strong><br/><span style="font-size:10px;color:#64748b">${ROLE_LABEL[team.role] || team.role}</span></td>
              <td>${fmtTime(shift.startTime)}</td>
              <td>${shift.isActive ? "<span style='color:#16a34a;font-weight:700'>ACTIVE</span>" : fmtTime(shift.endTime)}</td>
              <td>${shift.duration != null ? shift.duration + " min" : "—"}</td>
              <td>${st.transactionCount ?? 0}</td>
              <td style="color:#16a34a;font-weight:700">${fmtMoney(st.totalDeposits)}</td>
              <td style="color:#dc2626;font-weight:700">${fmtMoney(st.totalCashouts)}</td>
              <td style="color:#c2410c;font-weight:700">${fmtMoney(st.totalBonuses)}</td>
              <td style="font-weight:800;color:${(st.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(st.netProfit)}</td>
              <td>${st.playersAdded ?? 0}</td>
              <td style="font-weight:700;color:${effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626"}">${effort != null ? `${effort}/10` : "—"}</td>
            </tr>`;
        })
    ).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Operations Report — ${date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;padding:28px}
  h1{font-size:20px;font-weight:800;margin-bottom:3px}h2{font-size:13px;font-weight:700;margin:24px 0 10px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:5px;text-transform:uppercase}
  .meta{font-size:11px;color:#64748b;margin-bottom:20px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px}.val{font-size:18px;font-weight:800}.lbl{font-size:9px;color:#64748b;margin-top:1px;text-transform:uppercase}
  .green{color:#16a34a}.red{color:#dc2626}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}
  th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
  @media print{button{display:none}body{padding:16px}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
    <div><h1>Daily Operations Report</h1><p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} · Report Date: ${fmtDate(date + "T12:00:00")}</p></div>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <h2>Day Summary</h2>
  <div class="grid4">
    <div class="box"><div class="val green">${fmtMoney(s.totalDeposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(s.totalCashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val" style="color:#c2410c">${fmtMoney(s.totalBonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${(s.netProfit || 0) >= 0 ? "green" : "red"}">${fmtMoney(s.netProfit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val">${s.totalShifts}</div><div class="lbl">Shifts Logged</div></div>
    <div class="box"><div class="val">${s.tasksCompleted}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val">${s.transactionCount}</div><div class="lbl">Transactions</div></div>
  </div>
  <h2>Member Shift Summary</h2>
  <table><thead><tr><th>Member</th><th>Start</th><th>End</th><th>Duration</th><th>Txns</th><th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th><th>Players</th><th>Effort</th></tr></thead>
    <tbody>${memberRows || '<tr><td colspan="11" style="text-align:center;color:#94a3b8;padding:16px">No shifts today</td></tr>'}</tbody>
  </table>
  <p style="margin-top:28px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:12px">Confidential · Generated by Operations Dashboard · ${new Date().toISOString()}</p>
</body></html>`);
    win.document.close();
}

// ── printRangeReport (multi-day) ──────────────────────────────
function printRangeReport(reports, startDate, endDate) {
    const win = window.open("", "_blank");

    const totals = reports.reduce((acc, r) => {
        const s = r.summary || {};
        acc.deposits += s.totalDeposits || 0;
        acc.cashouts += s.totalCashouts || 0;
        acc.bonuses += s.totalBonuses || 0;
        acc.profit += s.netProfit || 0;
        acc.shifts += s.totalShifts || 0;
        acc.transactions += s.transactionCount || 0;
        acc.tasks += s.tasksCompleted || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0 });

    const dayRows = reports.map(r => {
        const s = r.summary || {};
        return `<tr>
          <td><b>${fmtDate(r.date + "T12:00:00")}</b></td>
          <td style="color:#16a34a;font-weight:700">${fmtMoney(s.totalDeposits)}</td>
          <td style="color:#dc2626;font-weight:700">${fmtMoney(s.totalCashouts)}</td>
          <td style="color:#c2410c;font-weight:700">${fmtMoney(s.totalBonuses)}</td>
          <td style="font-weight:800;color:${(s.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(s.netProfit)}</td>
          <td>${s.totalShifts ?? 0}</td>
          <td>${s.transactionCount ?? 0}</td>
          <td>${s.tasksCompleted ?? 0}</td>
        </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Range Report — ${startDate} to ${endDate}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;padding:28px}
  h1{font-size:20px;font-weight:800;margin-bottom:3px}h2{font-size:13px;font-weight:700;margin:24px 0 10px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:5px;text-transform:uppercase}
  .meta{font-size:11px;color:#64748b;margin-bottom:20px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px}.val{font-size:18px;font-weight:800}.lbl{font-size:9px;color:#64748b;margin-top:1px;text-transform:uppercase}
  .green{color:#16a34a}.red{color:#dc2626}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}
  th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  .total-row td{background:#f8fafc;font-weight:700}
  button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
  @media print{button{display:none}body{padding:16px}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
    <div>
      <h1>Range Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} · ${fmtDateShort(startDate + "T12:00:00")} – ${fmtDateShort(endDate + "T12:00:00")} (${reports.length} days)</p>
    </div>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <h2>Range Totals</h2>
  <div class="grid4">
    <div class="box"><div class="val green">${fmtMoney(totals.deposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(totals.cashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val" style="color:#c2410c">${fmtMoney(totals.bonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${totals.profit >= 0 ? "green" : "red"}">${fmtMoney(totals.profit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val">${totals.shifts}</div><div class="lbl">Total Shifts</div></div>
    <div class="box"><div class="val">${totals.transactions}</div><div class="lbl">Total Transactions</div></div>
    <div class="box"><div class="val">${totals.tasks}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val" style="color:#7c3aed">${reports.length}</div><div class="lbl">Days Covered</div></div>
  </div>
  <h2>Day-by-Day Breakdown</h2>
  <table>
    <thead><tr><th>Date</th><th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th><th>Shifts</th><th>Transactions</th><th>Tasks</th></tr></thead>
    <tbody>${dayRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td><b>TOTAL (${reports.length} days)</b></td>
        <td style="color:#16a34a;font-weight:800">${fmtMoney(totals.deposits)}</td>
        <td style="color:#dc2626;font-weight:800">${fmtMoney(totals.cashouts)}</td>
        <td style="color:#c2410c;font-weight:800">${fmtMoney(totals.bonuses)}</td>
        <td style="font-weight:800;color:${totals.profit >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(totals.profit)}</td>
        <td>${totals.shifts}</td>
        <td>${totals.transactions}</td>
        <td>${totals.tasks}</td>
      </tr>
    </tfoot>
  </table>
  <p style="margin-top:28px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:12px">Confidential · Generated by Operations Dashboard · ${new Date().toISOString()}</p>
</body></html>`);
    win.document.close();
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function AdminReportPage() {
    const { add: toast } = useToast();
    const todayStr = toDateInput(new Date());

    // Mode: "single" | "range"
    const [mode, setMode] = useState("single");
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [report, setReport] = useState(null);        // single-day report
    const [rangeReports, setRangeReports] = useState([]); // array of daily reports for range
    const [loading, setLoading] = useState(false);
    const [teamFilter, setTeamFilter] = useState("ALL");

    // ── Fetch single day ──
    const fetchSingleReport = useCallback(async (date, role) => {
        setLoading(true);
        try {
            const opts = { date };
            if (role && role !== "ALL") opts.teamRole = role;
            const data = await api.reports.getDailyReport(opts);
            setReport(data);
            setRangeReports([]);
        } catch (e) {
            toast(e.message || "Failed to load report", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch date range: fire parallel requests per day ──
    const fetchRangeReports = useCallback(async (start, end, role) => {
        if (!start || !end || start > end) {
            toast("Please select a valid date range (start ≤ end)", "error");
            return;
        }

        // Build list of dates in range
        const dates = [];
        const cur = new Date(start + "T12:00:00");
        const last = new Date(end + "T12:00:00");
        while (cur <= last) {
            dates.push(toDateInput(cur));
            cur.setDate(cur.getDate() + 1);
        }

        if (dates.length > 31) {
            toast("Date range cannot exceed 31 days", "error");
            return;
        }

        setLoading(true);
        setReport(null);
        try {
            const results = await Promise.all(
                dates.map(date => {
                    const opts = { date };
                    if (role && role !== "ALL") opts.teamRole = role;
                    return api.reports.getDailyReport(opts).catch(() => null);
                })
            );
            // Filter out failed fetches and sort chronologically
            const valid = results.filter(Boolean).sort((a, b) => a.date > b.date ? 1 : -1);
            setRangeReports(valid);
        } catch (e) {
            toast(e.message || "Failed to load range report", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Auto-fetch on change ──
    useEffect(() => {
        if (mode === "single") {
            fetchSingleReport(selectedDate, teamFilter);
        } else {
            fetchRangeReports(startDate, endDate, teamFilter);
        }
    }, [mode, selectedDate, startDate, endDate, teamFilter]);

    const handleRefresh = () => {
        if (mode === "single") fetchSingleReport(selectedDate, teamFilter);
        else fetchRangeReports(startDate, endDate, teamFilter);
    };

    const handleExport = () => {
        if (mode === "single" && report) {
            printReport(report, report.date);
        } else if (mode === "range" && rangeReports.length > 0) {
            printRangeReport(rangeReports, startDate, endDate);
        }
    };

    const canExport = mode === "single" ? !!report : rangeReports.length > 0;
    const s = report?.summary || {};

    // Determine the header subtitle
    const headerSubtitle = loading
        ? "Loading…"
        : mode === "single"
            ? (report ? fmtDate(report.date + "T12:00:00") : "—")
            : rangeReports.length > 0
                ? `${fmtDateShort(startDate + "T12:00:00")} – ${fmtDateShort(endDate + "T12:00:00")} (${rangeReports.length} days)`
                : "Select a date range";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── Page header ── */}
            <div style={{ ...CARD, padding: "18px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "42px", height: "42px", background: "#0ea5e9", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText style={{ width: "20px", height: "20px", color: "#fff" }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>Operations Report</h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{headerSubtitle}</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>

                        {/* ── Mode Toggle ── */}
                        <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", background: "#f8fafc" }}>
                            {[
                                { id: "single", label: "Single Day", icon: Calendar },
                                { id: "range", label: "Date Range", icon: CalendarRange },
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setMode(id)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "5px",
                                        padding: "8px 13px", border: "none", fontSize: "12px", fontWeight: "600",
                                        cursor: "pointer", fontFamily: "inherit",
                                        background: mode === id ? "#0f172a" : "transparent",
                                        color: mode === id ? "#fff" : "#64748b",
                                        transition: "all .15s",
                                    }}
                                >
                                    <Icon style={{ width: "13px", height: "13px" }} />{label}
                                </button>
                            ))}
                        </div>

                        {/* ── Date Inputs ── */}
                        {mode === "single" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                                <Calendar style={{ width: "13px", height: "13px", color: "#64748b" }} />
                                <input
                                    type="date" value={selectedDate} max={todayStr}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                                <CalendarRange style={{ width: "13px", height: "13px", color: "#64748b" }} />
                                <input
                                    type="date" value={startDate} max={endDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }}
                                />
                                <span style={{ fontSize: "12px", color: "#94a3b8", margin: "0 2px" }}>→</span>
                                <input
                                    type="date" value={endDate} min={startDate} max={todayStr}
                                    onChange={e => setEndDate(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }}
                                />
                            </div>
                        )}

                        {/* Team filter */}
                        <div style={{ position: "relative" }}>
                            <select
                                value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                                style={{ padding: "8px 30px 8px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", appearance: "none" }}
                            >
                                <option value="ALL">All Teams</option>
                                <option value="TEAM1">Team 1</option>
                                <option value="TEAM2">Team 2</option>
                                <option value="TEAM3">Team 3</option>
                                <option value="TEAM4">Team 4</option>
                            </select>
                            <ChevronDown style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none" }} />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={handleRefresh} disabled={loading}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 13px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", color: "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                        >
                            <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
                        </button>

                        {/* Export */}
                        <button
                            onClick={handleExport} disabled={!canExport || loading}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 16px", border: "none", borderRadius: "8px", background: "#0ea5e9", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: canExport ? "pointer" : "not-allowed", opacity: canExport ? 1 : 0.5 }}
                        >
                            <Download style={{ width: "13px", height: "13px" }} />
                            {mode === "range" ? "Export Range PDF" : "Export PDF"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "spin .8s linear infinite" }} />
                    {mode === "range" ? `Fetching reports for date range…` : "Generating report…"}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* SINGLE DAY VIEW                                        */}
            {/* ══════════════════════════════════════════════════════ */}
            {!loading && mode === "single" && report && (
                <>
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <BarChart2 style={{ width: "12px", height: "12px" }} /> Day Summary
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "10px" }}>
                            <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                            <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                            <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                            <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} valueColor={s.netProfit >= 0 ? "#16a34a" : "#dc2626"} icon={s.netProfit >= 0 ? TrendingUp : TrendingDown} accentColor={s.netProfit >= 0 ? "#16a34a" : "#dc2626"} />
                            <StatCard label="Tasks Completed" value={s.tasksCompleted} icon={CheckCircle} accentColor="#16a34a" />
                            <StatCard label="Transactions" value={s.transactionCount} icon={Activity} accentColor="#2563eb" />
                            <StatCard label="Shifts Logged" value={s.totalShifts} sub={`${s.activeShifts} active`} icon={Clock} accentColor="#475569" />
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users style={{ width: "12px", height: "12px" }} /> Team Shift Reports
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {report.teams?.map(team => <MemberShiftSection key={team.role} team={team} />)}
                        </div>
                    </div>

                    {report.dayTasks?.length > 0 && (
                        <div style={{ ...CARD, overflow: "hidden" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                <CheckCircle style={{ width: "15px", height: "15px", color: "#64748b" }} />
                                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>All Tasks Today ({report.dayTasks.length})</h3>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead><tr>{["Time", "Task", "Type", "Assigned To", "Status", "Priority"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {report.dayTasks.map(t => (
                                            <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                <td style={{ ...TD, color: "#94a3b8", fontSize: "12px" }}>{fmtTime(t.completedAt || t.updatedAt)}</td>
                                                <td style={TD}><div style={{ fontWeight: "600" }}>{t.title}</div></td>
                                                <td style={TD}><TaskTypeBadge taskType={t.taskType} /></td>
                                                <td style={{ ...TD, fontSize: "12px" }}>{t.assignToAll ? <Badge label="All Members" bg="#f5f3ff" color="#7c3aed" /> : t.assignedTo?.name || "—"}</td>
                                                <td style={TD}><Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} /></td>
                                                <td style={TD}><PriorityBadge priority={t.priority} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.wallets?.length > 0 && (
                        <div style={{ ...CARD, overflow: "hidden" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                <DollarSign style={{ width: "15px", height: "15px", color: "#64748b" }} />
                                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Current Wallet Balances</h3>
                            </div>
                            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px" }}>
                                {report.wallets.map(w => (
                                    <div key={w.id} style={{ padding: "13px 16px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fafbfc" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: "700" }}>{w.method}</div>
                                        <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>{fmtMoney(w.balance)}</div>
                                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{w.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* DATE RANGE VIEW                                        */}
            {/* ══════════════════════════════════════════════════════ */}
            {!loading && mode === "range" && rangeReports.length > 0 && (
                <>
                    {/* Range totals summary */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <BarChart2 style={{ width: "12px", height: "12px" }} /> Range Totals — {rangeReports.length} Days
                        </div>
                        <RangeSummaryCards reports={rangeReports} />
                    </div>

                    {/* Quick day-by-day table */}
                    <div style={{ ...CARD, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                            <CalendarRange style={{ width: "15px", height: "15px", color: "#64748b" }} />
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Day-by-Day Breakdown</h3>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Date", "Deposits", "Cashouts", "Bonuses", "Net Profit", "Shifts", "Transactions", "Tasks"].map(h => (
                                            <th key={h} style={{ ...TH, textAlign: h === "Date" ? "left" : "right" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rangeReports.map(r => {
                                        const s = r.summary || {};
                                        const profit = s.netProfit ?? 0;
                                        return (
                                            <tr key={r.date} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                <td style={TD}><span style={{ fontWeight: "600" }}>{fmtDate(r.date + "T12:00:00")}</span></td>
                                                <td style={{ ...TD, textAlign: "right", color: "#16a34a", fontWeight: "700" }}>{fmtMoney(s.totalDeposits)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#dc2626", fontWeight: "700" }}>{fmtMoney(s.totalCashouts)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#c2410c", fontWeight: "700" }}>{fmtMoney(s.totalBonuses)}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(profit)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#64748b" }}>{s.totalShifts ?? 0}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#64748b" }}>{s.transactionCount ?? 0}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#64748b" }}>{s.tasksCompleted ?? 0}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                                        {(() => {
                                            const t = rangeReports.reduce((acc, r) => {
                                                const s = r.summary || {};
                                                acc.deposits += s.totalDeposits || 0;
                                                acc.cashouts += s.totalCashouts || 0;
                                                acc.bonuses += s.totalBonuses || 0;
                                                acc.profit += s.netProfit || 0;
                                                acc.shifts += s.totalShifts || 0;
                                                acc.transactions += s.transactionCount || 0;
                                                acc.tasks += s.tasksCompleted || 0;
                                                return acc;
                                            }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0 });
                                            return (
                                                <>
                                                    <td style={{ ...TD, fontWeight: "700", color: "#475569" }}>TOTAL ({rangeReports.length} days)</td>
                                                    <td style={{ ...TD, textAlign: "right", color: "#16a34a", fontWeight: "800" }}>{fmtMoney(t.deposits)}</td>
                                                    <td style={{ ...TD, textAlign: "right", color: "#dc2626", fontWeight: "800" }}>{fmtMoney(t.cashouts)}</td>
                                                    <td style={{ ...TD, textAlign: "right", color: "#c2410c", fontWeight: "800" }}>{fmtMoney(t.bonuses)}</td>
                                                    <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: t.profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(t.profit)}</td>
                                                    <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.shifts}</td>
                                                    <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.transactions}</td>
                                                    <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.tasks}</td>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Per-day collapsible detailed reports */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <FileText style={{ width: "12px", height: "12px" }} /> Detailed Daily Reports (click to expand)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {rangeReports.map((r, idx) => (
                                <DayReportBlock key={r.date} report={r} defaultExpanded={idx === 0 && rangeReports.length === 1} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {!loading && mode === "range" && rangeReports.length === 0 && !loading && (
                <div style={{ ...CARD, padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    <CalendarRange style={{ width: "28px", height: "28px", margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
                    No data found for the selected date range. Try adjusting your dates.
                </div>
            )}

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6}
            `}</style>
        </div>
    );
}
