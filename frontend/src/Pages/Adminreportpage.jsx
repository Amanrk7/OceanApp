// pages/AdminReportPage.jsx  —  Redesigned to match audit-style shift report
import { useState, useEffect, useCallback } from "react";
import {
    FileText, Download, RefreshCw, Calendar, Users, TrendingUp,
    TrendingDown, Gift, CheckCircle, Clock, AlertCircle,
    Activity, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
    DollarSign, BarChart2, Target, Wallet, Gamepad2, MessageSquare,
    ShieldCheck, AlertTriangle, ArrowLeft, Zap, Star, List,
} from "lucide-react";
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
        return { name: sw?.name ?? ew?.name ?? id, method: sw?.method ?? ew?.method ?? "", start: sw?.balance ?? 0, end: ew?.balance ?? 0, delta };
    });

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

// ── Shift Activity Log ────────────────────────────────────────
function ShiftActivityLog({ transactions }) {
    if (!transactions?.length) return (
        <div style={{ ...CARD, padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            No activity recorded for this shift
        </div>
    );

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <List style={{ width: "14px", height: "14px", color: "#64748b" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Shift Activity Log ({transactions.length})
                </span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Time", "Source", "Type", "Details", "Amount / Points"].map(h => (
                                <th key={h} style={{ ...TH, textAlign: h === "Amount / Points" ? "right" : "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => {
                            const isDeposit = t.type === "DEPOSIT";
                            const isCashout = t.type === "WITHDRAWAL";
                            const isBonus = t.type === "BONUS";
                            const amtColor = isDeposit ? "#16a34a" : isCashout ? "#dc2626" : isBonus ? "#c2410c" : "#475569";
                            const amtPrefix = isDeposit ? "+" : isCashout ? "−" : isBonus ? "−" : "";
                            const pts = t.gameStockAfter != null && t.gameStockBefore != null
                                ? (t.gameStockAfter - t.gameStockBefore)
                                : null;

                            return (
                                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td style={{ ...TD, fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                                        {fmtTime(t.createdAt)}
                                    </td>
                                    <td style={{ ...TD, fontSize: "12px" }}>
                                        {t.user?.name || t.playerName
                                            ? <div>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{t.user?.name || t.playerName}</div>
                                                {t.user?.email && <div style={{ fontSize: "11px", color: "#94a3b8" }}>{t.user.email}</div>}
                                            </div>
                                            : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>System Event</span>}
                                    </td>
                                    <td style={TD}>
                                        <DisplayTypeBadge type={t.displayType || t.type} />
                                        {t.bonusType && (
                                            <div style={{ marginTop: "3px" }}>
                                                <span style={{ fontSize: "10px", color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                                                    {t.bonusType.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...TD, fontSize: "12px" }}>
                                        <div>
                                            {t.gameName && <span style={{ fontWeight: "600" }}>{t.gameName}</span>}
                                            {t.walletMethod && (
                                                <div style={{ color: "#64748b", marginTop: "1px" }}>
                                                    {t.walletMethod}{t.walletName ? ` · ${t.walletName}` : ""}
                                                </div>
                                            )}
                                            {!t.gameName && !t.walletMethod && <span style={{ color: "#94a3b8" }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ ...TD, textAlign: "right" }}>
                                        <div style={{ fontWeight: "800", fontSize: "14px", color: amtColor }}>
                                            {amtPrefix}{fmtMoney(t.amount)}
                                        </div>
                                        {pts !== null && (
                                            <div style={{ fontSize: "11px", fontWeight: "600", color: pts < 0 ? "#7c3aed" : "#16a34a", marginTop: "2px" }}>
                                                {pts >= 0 ? "+" : ""}{pts.toFixed(0)} pts
                                            </div>
                                        )}
                                        {t.fee > 0 && (
                                            <div style={{ fontSize: "10px", color: "#f59e0b", marginTop: "2px" }}>
                                                fee −{fmtMoney(t.fee)}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Audit Verification ────────────────────────────────────────
function AuditVerification({ endSnapshot, transactions }) {
    if (!endSnapshot) return null;

    const { deposits, cashouts, bonuses, netProfit, walletChange, gameChange, isBalanced, totalDiscrepancy } = endSnapshot;

    const depositFees = (transactions || []).filter(t => t.type === "DEPOSIT")
        .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
    const cashoutFees = (transactions || []).filter(t => t.type === "WITHDRAWAL")
        .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
    const totalFees = depositFees + cashoutFees;

    const expectedWallet = (deposits ?? 0) - depositFees - (cashouts ?? 0) - cashoutFees;
    const cashDiscrepancy = (walletChange ?? 0) - expectedWallet;
    const ptDiscrepancy = Math.round(endSnapshot.gameDiscrepancy ?? 0);

    // ── NEW: Funds ↔ Game Points Balance ────────────────────────
    // deposits + bonuses - cashouts should equal |game points deducted|
    const expectedGameDeduction = (deposits ?? 0) + (bonuses ?? 0) - (cashouts ?? 0);
    const actualGameDeduction = Math.abs(gameChange ?? 0);
    const fundsPointsDiscrepancy = Math.round(actualGameDeduction - expectedGameDeduction);
    const fundsPointsOk = Math.abs(fundsPointsDiscrepancy) < 2;
    // ─────────────────────────────────────────────────────────────

    const cashOk = Math.abs(cashDiscrepancy) < 0.02;
    const ptsOk = Math.abs(ptDiscrepancy) < 2;
    const allOk = cashOk && ptsOk && fundsPointsOk;  // ← include new check

    const iconColor = allOk ? "#16a34a" : "#dc2626";
    const bgColor = allOk ? "#f0fdf4" : "#fef2f2";
    const borderColor = allOk ? "#86efac" : "#fca5a5";
    const leftBorder = allOk ? "#16a34a" : "#dc2626";

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck style={{ width: "14px", height: "14px", color: "#64748b" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Audit Verification</span>
                <div style={{ marginLeft: "auto" }}>
                    {allOk
                        ? <Badge label="✓ All Clear" bg="#f0fdf4" color="#15803d" />
                        : <Badge label="⚠ Discrepancy Found" bg="#fee2e2" color="#991b1b" />}
                </div>
            </div>
            <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>

                    {/* Row 1: Cash Flow + Point Stock (existing side-by-side) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        {/* Cash Flow Check — unchanged */}
                        <div style={{ border: `1px solid ${cashOk ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ padding: "8px 12px", background: cashOk ? "#f0fdf4" : "#fef2f2", borderBottom: `1px solid ${cashOk ? "#86efac" : "#fca5a5"}`, fontSize: "11px", fontWeight: "700", color: cashOk ? "#15803d" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Cash Flow Check
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                                {[
                                    { label: "Actual Change (Snapshots)", val: signNum(walletChange ?? 0), color: clrNum(walletChange) },
                                    { label: "Expected Change (Activities)", val: signNum(expectedWallet), color: clrNum(expectedWallet) },
                                    { label: "Cash Discrepancy", val: cashOk ? "$0.00" : signNum(cashDiscrepancy), color: cashOk ? "#16a34a" : "#dc2626" },
                                ].map(({ label, val, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" }}>{label}</div>
                                        <div style={{ fontSize: "15px", fontWeight: "800", color }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Point Stock Check — unchanged */}
                        <div style={{ border: `1px solid ${ptsOk ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ padding: "8px 12px", background: ptsOk ? "#f0fdf4" : "#fef2f2", borderBottom: `1px solid ${ptsOk ? "#86efac" : "#fca5a5"}`, fontSize: "11px", fontWeight: "700", color: ptsOk ? "#15803d" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Point Stock Check
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                                {[
                                    { label: "Actual Change (Snapshots)", val: signPts(gameChange ?? 0) + " pts", color: clrNum(gameChange, true) },
                                    { label: "Expected Change (Activities)", val: signPts(-(deposits + bonuses - cashouts)) + " pts", color: "#475569" },
                                    { label: "Point Discrepancy", val: ptsOk ? "0 pts" : signPts(ptDiscrepancy) + " pts", color: ptsOk ? "#16a34a" : "#dc2626" },
                                ].map(({ label, val, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" }}>{label}</div>
                                        <div style={{ fontSize: "15px", fontWeight: "800", color }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── NEW Row 2: Funds ↔ Game Points Balance (full width) ── */}
                    <div style={{ border: `1px solid ${fundsPointsOk ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", overflow: "hidden" }}>
                        <div style={{ padding: "8px 12px", background: fundsPointsOk ? "#f0fdf4" : "#fef2f2", borderBottom: `1px solid ${fundsPointsOk ? "#86efac" : "#fca5a5"}`, fontSize: "11px", fontWeight: "700", color: fundsPointsOk ? "#15803d" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "6px" }}>
                            Funds ↔ Game Points Balance
                            <span style={{ fontSize: "10px", fontWeight: "500", textTransform: "none", opacity: 0.8 }}>
                                (Deposits + Bonuses − Cashouts = |Game Pts Deducted|)
                            </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                            {[
                                {
                                    label: "Expected Game Deduction",
                                    val: `${expectedGameDeduction.toFixed(0)} pts`,
                                    sub: `$${(deposits ?? 0).toFixed(0)} + $${(bonuses ?? 0).toFixed(0)} − $${(cashouts ?? 0).toFixed(0)}`,
                                    color: "#475569",
                                },
                                {
                                    label: "Actual Game Deduction",
                                    val: `${actualGameDeduction.toFixed(0)} pts`,
                                    sub: `from snapshots`,
                                    color: clrNum(gameChange, true),
                                },
                                {
                                    label: "Funds↔Points Discrepancy",
                                    val: fundsPointsOk ? "0 pts" : `${fundsPointsDiscrepancy >= 0 ? "+" : ""}${fundsPointsDiscrepancy} pts`,
                                    sub: fundsPointsOk ? "Balanced ✓" : "Mismatch ⚠",
                                    color: fundsPointsOk ? "#16a34a" : "#dc2626",
                                },
                                {
                                    label: "Formula Breakdown",
                                    val: `${expectedGameDeduction.toFixed(0)}`,
                                    sub: `${(deposits ?? 0).toFixed(0)}+${(bonuses ?? 0).toFixed(0)}−${(cashouts ?? 0).toFixed(0)}=${expectedGameDeduction.toFixed(0)}`,
                                    color: "#7c3aed",
                                },
                            ].map(({ label, val, sub, color }) => (
                                <div key={label} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" }}>{label}</div>
                                    <div style={{ fontSize: "15px", fontWeight: "800", color }}>{val}</div>
                                    {sub && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>}
                                </div>
                            ))}
                        </div>
                        {!fundsPointsOk && (
                            <div style={{ padding: "8px 12px", background: "#fef2f2", borderTop: "1px solid #fca5a5", fontSize: "11px", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                                <AlertTriangle style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                                Game point deduction ({actualGameDeduction.toFixed(0)} pts) does not match expected
                                ({expectedGameDeduction.toFixed(0)} pts = Deposits ${(deposits ?? 0).toFixed(2)} +
                                Bonuses ${(bonuses ?? 0).toFixed(2)} − Cashouts ${(cashouts ?? 0).toFixed(2)}).
                                Discrepancy: {Math.abs(fundsPointsDiscrepancy)} pts.
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary formula row — add fundsPointsOk status */}
                <div style={{ padding: "10px 14px", background: allOk ? "#f0fdf4" : "#fef2f2", border: `1px solid ${allOk ? "#86efac" : "#fca5a5"}`, borderLeft: `4px solid ${allOk ? "#16a34a" : "#dc2626"}`, borderRadius: "8px", fontSize: "12px" }}>
                    {!allOk && (
                        <div style={{ fontWeight: "700", color: "#991b1b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertTriangle style={{ width: "13px", height: "13px" }} />
                            {!cashOk && `Cash discrepancy: ${fmtMoney(Math.abs(cashDiscrepancy))}. `}
                            {!ptsOk && `Point discrepancy: ${Math.abs(ptDiscrepancy)} pts. `}
                            {!fundsPointsOk && `Funds↔Points mismatch: ${Math.abs(fundsPointsDiscrepancy)} pts. `}
                            Please review the activity log.
                        </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", color: "#475569" }}>
                        <span>Deposits: <b style={{ color: "#16a34a" }}>{fmtMoney(deposits)}</b></span>
                        <span>Cashouts: <b style={{ color: "#dc2626" }}>−{fmtMoney(cashouts)}</b></span>
                        <span>Bonuses: <b style={{ color: "#c2410c" }}>−{fmtMoney(bonuses)}</b></span>
                        <span>Net Profit (D−C): <b style={{ color: (netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(netProfit)}</b></span>
                        {totalFees > 0 && <span>Fees: <b style={{ color: "#b45309" }}>−{fmtMoney(totalFees)}</b></span>}
                        <span>Wallet Δ: <b style={{ color: clrNum(walletChange) }}>{signNum(walletChange)}</b></span>
                        <span>Game Δ: <b style={{ color: "#7c3aed" }}>{signPts(gameChange)} pts</b></span>
                        <span>Funds↔Pts: <b style={{ color: fundsPointsOk ? "#16a34a" : "#dc2626" }}>{fundsPointsOk ? "✓ Balanced" : `⚠ ${Math.abs(fundsPointsDiscrepancy)} pts off`}</b></span>
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                        Verification: Cash Actual = Cash Expected · Points Actual = Points Expected · Deposits+Bonuses−Cashouts = |Game Pts Change|
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
                {improvements && (
                    <div style={{ padding: "11px 13px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>Could do better</div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{improvements}</p>
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

// ── Single Shift Detail (main redesign) ───────────────────────
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
            {/* ── Shift header bar ── */}
            <div style={{ padding: "14px 20px", background: shift.isActive ? "#f0fdf4" : "#fafbfc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: shift.isActive ? "#22c55e" : "#94a3b8", boxShadow: shift.isActive ? "0 0 0 3px rgba(34,197,94,.25)" : "none", flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
                            {fmtTime(shift.startTime)} — {shift.isActive ? <span style={{ color: "#22c55e" }}>Active Now</span> : fmtTime(shift.endTime)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                            {shift.duration != null ? `${shift.duration} min` : "Ongoing"}
                            {shift.isActive && <span style={{ marginLeft: "6px", color: "#22c55e", fontWeight: "600" }}>● LIVE</span>}
                            {hasReconciliation && (
                                <span style={{ marginLeft: "8px" }}>
                                    <Badge label={endSnapshot.isBalanced ? "✓ Balanced" : "⚠ Discrepancy"} bg={endSnapshot.isBalanced ? "#f0fdf4" : "#fee2e2"} color={endSnapshot.isBalanced ? "#16a34a" : "#dc2626"} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* KPI chips */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "8px" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Bonuses", val: fmtMoney(s.totalBonuses), color: "#c2410c", bg: "#fff7ed" },
                        { label: "Profit", val: fmtMoney(netProfit), color: netProfit >= 0 ? "#16a34a" : "#dc2626", bg: netProfit >= 0 ? "#f0fdf4" : "#fee2e2" },
                        { label: "Players", val: s.playersAdded ?? 0, color: "#6d28d9", bg: "#f5f3ff" },
                        { label: "Tasks", val: s.tasksCompleted ?? 0, color: "#475569", bg: "#f1f5f9" },
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "5px 10px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{label}</span>
                            <span style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                    {shift.checkin?.effortRating && (
                        <div style={{ padding: "5px 10px", borderRadius: "7px", background: shift.checkin.effortRating >= 8 ? "#f0fdf4" : shift.checkin.effortRating >= 5 ? "#fffbeb" : "#fee2e2", display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Effort</span>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: shift.checkin.effortRating >= 8 ? "#16a34a" : shift.checkin.effortRating >= 5 ? "#d97706" : "#dc2626" }}>
                                {shift.checkin.effortRating}/10
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div style={{ display: "flex", gap: "1px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", overflowX: "auto" }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "9px 16px", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: activeTab === t.id ? "#fff" : "transparent", color: activeTab === t.id ? "#0f172a" : "#94a3b8", borderBottom: `2px solid ${activeTab === t.id ? "#0f172a" : "transparent"}`, whiteSpace: "nowrap" }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW / SHIFT REPORT TAB ═══ */}
            {activeTab === "overview" && (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

                    {/* Header line mimicking screenshot */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Shift Report</div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                {fmtTime(shift.startTime)} – {shift.isActive ? "Active now" : fmtTime(shift.endTime)}
                                {memberName && <span style={{ marginLeft: "8px", padding: "1px 7px", borderRadius: "5px", background: rc.bg, color: rc.text, fontWeight: "700", fontSize: "11px", border: `1px solid ${rc.border}` }}>{memberName}</span>}
                            </div>
                        </div>
                    </div>

                    {/* 4 KPI cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                        <StatCard label="Player Deposits" value={`+${fmtMoney(s.totalDeposits)}`} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                        <StatCard label="Player Cashouts" value={`−${fmtMoney(s.totalCashouts)}`} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                        <StatCard label="Bonuses Given" value={`−${fmtMoney(s.totalBonuses)}`} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                        <StatCard label="Shift Net Profit" value={(netProfit >= 0 ? "+" : "") + fmtMoney(netProfit)} valueColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} accentColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} />
                    </div>

                    {/* Opening notes */}
                    {startSnapshot?.notes && (
                        <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "3px solid #94a3b8", borderRadius: "0 8px 8px 0", fontSize: "12px", color: "#475569" }}>
                            <span style={{ fontWeight: "700", color: "#374151" }}>Opening notes: </span>{startSnapshot.notes}
                        </div>
                    )}

                    {/* Cash Flow + Game Point Audits side by side */}
                    {hasReconciliation && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            <CashFlowAudit startSnapshot={startSnapshot} endSnapshot={endSnapshot} transactions={transactions} />
                            <GamePointAudit startSnapshot={startSnapshot} endSnapshot={endSnapshot} />
                        </div>
                    )}

                    {/* Activity Log */}
                    <ShiftActivityLog transactions={transactions} />

                    {/* Audit Verification */}
                    {hasReconciliation && <AuditVerification endSnapshot={endSnapshot} transactions={transactions} />}

                    {/* No snapshots notice */}
                    {!hasReconciliation && (
                        <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #e2e8f0", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
                            No balance snapshots recorded for this shift (shift may have started before snapshot feature was enabled)
                        </div>
                    )}

                    {/* Member Feedback */}
                    <div style={{ ...CARD, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                            <MessageSquare style={{ width: "14px", height: "14px", color: "#64748b" }} />
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Member Feedback</span>
                        </div>
                        <div style={{ padding: "16px" }}>
                            <FeedbackPanel shift={shift} />
                        </div>
                    </div>

                    {/* Top depositing players */}
                    {shift.playerDepositBreakdown?.length > 0 && (
                        <div style={{ ...CARD, padding: "16px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "12px" }}>Top Players by Deposits</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {shift.playerDepositBreakdown.sort((a, b) => b.total - a.total).slice(0, 5).map((p, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#64748b", flexShrink: 0 }}>
                                            {i + 1}
                                        </span>
                                        <span style={{ flex: 1, fontWeight: "600" }}>{p.name}</span>
                                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>{p.count} txns</span>
                                        <span style={{ fontWeight: "800", color: "#16a34a" }}>{fmtMoney(p.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TRANSACTIONS TAB ═══ */}
            {activeTab === "transactions" && (
                <div style={{ overflowX: "auto" }}>
                    {!transactions.length
                        ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions this shift</div>
                        : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>{["Time", "Player", "Type", "Bonus Type", "Game", "Game Pts", "Wallet", "Amount", "Fee", "Balance After"].map(h => <th key={h} style={{ ...TH }}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(t.createdAt)}</td>
                                            <td style={TD}>
                                                <div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || t.playerName || `#${t.userId}`}</div>
                                                {t.user?.email && <div style={{ fontSize: "10px", color: "#94a3b8" }}>{t.user.email}</div>}
                                            </td>
                                            <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                            <td style={TD}>
                                                {t.bonusType ? <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>{t.bonusType}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{t.gameName || t.game?.name || "—"}</td>
                                            <td style={TD}>
                                                {t.gameStockBefore != null
                                                    ? <span style={{ color: "#64748b", fontSize: "11px" }}>{t.gameStockBefore.toFixed(0)} → <b style={{ color: t.gameStockAfter < t.gameStockBefore ? "#dc2626" : "#16a34a" }}>{t.gameStockAfter?.toFixed(0)}</b></span>
                                                    : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ ...TD, fontSize: "11px" }}>
                                                {t.walletName ? <span>{t.walletMethod}<br /><span style={{ color: "#94a3b8" }}>{t.walletName}</span></span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ ...TD, fontWeight: "700", fontSize: "13px", color: t.type === "DEPOSIT" ? "#16a34a" : t.type === "WITHDRAWAL" ? "#dc2626" : "#c2410c" }}>
                                                {fmtMoney(t.amount)}
                                            </td>
                                            <td style={TD}>
                                                {t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "11px" }}>−{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </div>
            )}

            {/* ═══ TASKS TAB ═══ */}
            {activeTab === "tasks" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.tasks?.length
                        ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No tasks completed this shift</div>
                        : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {shift.tasks.map(t => {
                                    const pct = t.targetValue > 0 ? Math.min(100, Math.round(((t.currentValue ?? 0) / t.targetValue) * 100)) : null;
                                    const checklist = t.checklistItems || [];
                                    const doneItems = checklist.filter(i => i.done).length;
                                    return (
                                        <div key={t.id} style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${t.status === "COMPLETED" ? "#22c55e" : "#f59e0b"}`, borderRadius: "0 8px 8px 0" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                                                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{t.title}</span>
                                                        <TaskTypeBadge taskType={t.taskType} />
                                                        <PriorityBadge priority={t.priority} />
                                                    </div>
                                                    {pct !== null && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                            <div style={{ flex: 1 }}><ProgressBar pct={pct} /></div>
                                                            <span style={{ fontSize: "12px", fontWeight: "700" }}>{pct}%</span>
                                                        </div>
                                                    )}
                                                    {checklist.length > 0 && <div style={{ fontSize: "11px", color: "#64748b" }}>{doneItems}/{checklist.length} checklist items done</div>}
                                                </div>
                                                <Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </div>
            )}

            {/* ═══ PLAYERS ADDED TAB ═══ */}
            {activeTab === "players" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.playersAdded?.length
                        ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No players added this shift</div>
                        : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                                {shift.playersAdded.map(p => (
                                    <div key={p.id} style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "9px", background: "#f5f3ff" }}>
                                        <div style={{ fontWeight: "700", fontSize: "13px" }}>{p.name}</div>
                                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>@{p.username}</div>
                                        <div style={{ marginTop: "6px" }}>
                                            <Badge label={p.tier} bg="#fffbeb" color="#92400e" />
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>{fmtTime(p.createdAt)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            )}

            {/* ═══ BONUSES TAB ═══ */}
            {activeTab === "bonuses" && (
                <div style={{ overflowX: "auto" }}>
                    {!shift.bonusesGranted?.length
                        ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No bonuses granted this shift</div>
                        : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>{["Time", "Player", "Bonus Type", "Game", "Amount", "Granted By"].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {shift.bonusesGranted.map(b => (
                                        <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{fmtTime(b.createdAt)}</td>
                                            <td style={{ ...TD, fontSize: "12px", fontWeight: "600" }}>{b.user?.name || "—"}</td>
                                            <td style={TD}><Badge label="BONUS" bg="#fff7ed" color="#c2410c" /></td>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{b.game?.name || "—"}</td>
                                            <td style={{ ...TD, fontWeight: "700", fontSize: "13px", color: "#c2410c" }}>{fmtMoney(b.amount)}</td>
                                            <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{b.grantedBy?.name || "System"}</td>
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

    const aggr = team.shifts.reduce((acc, s) => {
        const st = s.stats || {};
        acc.deposits += st.totalDeposits || 0;
        acc.cashouts += st.totalCashouts || 0;
        acc.bonuses += st.totalBonuses || 0;
        acc.profit += st.netProfit || 0;
        acc.txns += st.transactionCount || 0;
        acc.tasks += st.tasksCompleted || 0;
        acc.players += st.playersAdded || 0;
        acc.duration += s.duration || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, txns: 0, tasks: 0, players: 0, duration: 0 });

    const memberName = team.member?.name || "Unassigned";

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            {/* Member header */}
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
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {team.shifts.length} shift{team.shifts.length !== 1 ? "s" : ""} · {aggr.duration} min
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(aggr.deposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(aggr.cashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Bonuses", val: fmtMoney(aggr.bonuses), color: "#c2410c", bg: "#fff7ed" },
                        { label: "Profit", val: fmtMoney(aggr.profit), color: aggr.profit >= 0 ? "#16a34a" : "#dc2626", bg: aggr.profit >= 0 ? "#f0fdf4" : "#fee2e2" },
                        { label: "Players", val: aggr.players, color: "#6d28d9", bg: "#f5f3ff" },
                        { label: "Tasks", val: aggr.tasks, color: "#475569", bg: "#f1f5f9" },
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "4px 10px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>{label}</span>
                            <span style={{ fontSize: "12px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                    {expanded ? <ChevronUp style={{ width: "15px", height: "15px", color: "#94a3b8" }} /> : <ChevronDown style={{ width: "15px", height: "15px", color: "#94a3b8" }} />}
                </div>
            </div>
            {expanded && (
                team.shifts.length === 0
                    ? <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No shifts recorded</div>
                    : team.shifts.map((shift, si) => (
                        <ShiftDetail key={shift.id} shift={shift} index={si} total={team.shifts.length} memberName={team.member?.name} teamRole={team.role} />
                    ))
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// PDF PRINT — full audit detail per shift
// ══════════════════════════════════════════════════════════════
function buildShiftAuditHtml(team, shift) {
    const s = shift.stats || {};
    const memberName = team.member?.name || "Unassigned";
    const roleLabel = ROLE_LABEL[team.role] || team.role;
    const netProfit = s.netProfit ?? 0;

    // ── Parse snapshots ────────────────────────────────────────
    let startSnapshot = shift.startSnapshot ?? null;
    let endSnapshot = shift.endSnapshot ?? null;
    if (!startSnapshot && shift.checkin?.balanceNote) {
        try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { }
    }
    if (!endSnapshot && shift.checkin?.additionalNotes) {
        try { const p = JSON.parse(shift.checkin.additionalNotes); endSnapshot = p.endSnapshot ?? null; } catch (_) { }
    }

    const effortReason = shift.effortReason ?? null;
    const improvements = shift.improvements ?? null;
    const workSummary = shift.checkin?.workSummary ?? null;
    const issues = shift.checkin?.issuesEncountered ?? null;
    const effort = shift.checkin?.effortRating ?? null;

    // ── KPI cards row ──────────────────────────────────────────
    const kpiCards = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-val green">+${fmtMoney(s.totalDeposits)}</div><div class="kpi-lbl">Player Deposits</div></div>
      <div class="kpi-card"><div class="kpi-val red">−${fmtMoney(s.totalCashouts)}</div><div class="kpi-lbl">Player Cashouts</div></div>
      <div class="kpi-card"><div class="kpi-val amber">−${fmtMoney(s.totalBonuses)}</div><div class="kpi-lbl">Bonuses Given</div></div>
      <div class="kpi-card"><div class="kpi-val ${netProfit >= 0 ? "green" : "red"}">${netProfit >= 0 ? "+" : ""}${fmtMoney(netProfit)}</div><div class="kpi-lbl">Shift Net Profit</div></div>
    </div>`;

    // ── Cash Flow Audit ────────────────────────────────────────
    let cashFlowHtml = "";
    if (startSnapshot && endSnapshot) {
        const startWs = startSnapshot.walletSnapshot ?? [];
        const endWs = endSnapshot.walletSnapshot ?? [];
        const allIds = [...new Set([...startWs.map(w => w.id), ...endWs.map(w => w.id)])];
        const wRows = allIds.map(id => {
            const sw = startWs.find(w => w.id === id);
            const ew = endWs.find(w => w.id === id);
            const delta = (ew?.balance ?? 0) - (sw?.balance ?? 0);
            const dColor = delta > 0.01 ? "#16a34a" : delta < -0.01 ? "#dc2626" : "#94a3b8";
            const dStr = delta === 0 ? "$0.00" : (delta > 0 ? "+" : "−") + fmtMoney(Math.abs(delta));
            return `<tr>
              <td>${sw?.method ?? ew?.method ?? ""}${sw?.name && sw.name !== sw?.method ? ` — ${sw.name}` : ""}</td>
              <td class="ta-r gray">${fmtMoney(sw?.balance ?? 0)}</td>
              <td class="ta-r b">${fmtMoney(ew?.balance ?? 0)}</td>
              <td class="ta-r b" style="color:${dColor}">${dStr}</td>
            </tr>`;
        }).join("");
        const wTotal = (endSnapshot.totalWallet ?? 0) - (startSnapshot.totalWallet ?? 0);
        const wTColor = wTotal > 0.01 ? "#16a34a" : wTotal < -0.01 ? "#dc2626" : "#94a3b8";
        cashFlowHtml = `
        <div class="audit-section">
          <div class="audit-header blue-hdr">💵 Cash Flow Audit</div>
          <table>
            <thead><tr><th>Method / Account</th><th class="ta-r">Start</th><th class="ta-r">End</th><th class="ta-r">Change</th></tr></thead>
            <tbody>
              ${wRows}
              <tr class="total-row">
                <td><b>Total</b></td>
                <td class="ta-r b">${fmtMoney(startSnapshot.totalWallet ?? 0)}</td>
                <td class="ta-r b">${fmtMoney(endSnapshot.totalWallet ?? 0)}</td>
                <td class="ta-r b" style="color:${wTColor}">${wTotal >= 0 ? "+" : "−"}${fmtMoney(Math.abs(wTotal))}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }

    // ── Game Point Audit ───────────────────────────────────────
    let gameAuditHtml = "";
    if (startSnapshot && endSnapshot) {
        const startGs = startSnapshot.gameSnapshot ?? [];
        const endGs = endSnapshot.gameSnapshot ?? [];
        const allIds = [...new Set([...startGs.map(g => g.id), ...endGs.map(g => g.id)])];
        const gRows = allIds.map(id => {
            const sg = startGs.find(g => g.id === id);
            const eg = endGs.find(g => g.id === id);
            const delta = Math.round((eg?.pointStock ?? 0) - (sg?.pointStock ?? 0));
            const dColor = delta < 0 ? "#16a34a" : delta > 0 ? "#dc2626" : "#94a3b8";
            return `<tr>
              <td>${sg?.name ?? eg?.name ?? id}</td>
              <td class="ta-r gray">${(sg?.pointStock ?? 0).toFixed(0)}</td>
              <td class="ta-r b">${(eg?.pointStock ?? 0).toFixed(0)}</td>
              <td class="ta-r b" style="color:${dColor}">${delta >= 0 ? "+" : ""}${delta}</td>
            </tr>`;
        }).join("");
        const gTotal = Math.round((endSnapshot.totalGames ?? 0) - (startSnapshot.totalGames ?? 0));
        const gTColor = gTotal < 0 ? "#16a34a" : gTotal > 0 ? "#dc2626" : "#94a3b8";
        gameAuditHtml = `
        <div class="audit-section">
          <div class="audit-header purple-hdr">🎮 Game Point Audit</div>
          <table>
            <thead><tr><th>Game</th><th class="ta-r">Start (pts)</th><th class="ta-r">End (pts)</th><th class="ta-r">Change</th></tr></thead>
            <tbody>
              ${gRows}
              <tr class="total-row">
                <td><b>Total</b></td>
                <td class="ta-r b">${(startSnapshot.totalGames ?? 0).toFixed(0)}</td>
                <td class="ta-r b">${(endSnapshot.totalGames ?? 0).toFixed(0)}</td>
                <td class="ta-r b" style="color:${gTColor}">${gTotal >= 0 ? "+" : ""}${gTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }

    // ── Activity Log ───────────────────────────────────────────
    const txns = shift.transactions || [];
    const activityRows = txns.map(t => {
        const isD = t.type === "DEPOSIT";
        const isCO = t.type === "WITHDRAWAL";
        const isB = t.type === "BONUS";
        const amtColor = isD ? "#16a34a" : isCO ? "#dc2626" : isB ? "#c2410c" : "#475569";
        const amtSign = isD ? "+" : isCO ? "−" : isB ? "−" : "";
        const typeLabel = t.displayType || (isD ? "DEPOSIT" : isCO ? "CASHOUT" : isB ? "BONUS" : t.type);
        const typeBg = isD ? "#dcfce7" : isCO ? "#fee2e2" : isB ? "#fff7ed" : "#f1f5f9";
        const typeClr = isD ? "#166534" : isCO ? "#991b1b" : isB ? "#c2410c" : "#475569";
        const pts = t.gameStockAfter != null && t.gameStockBefore != null
            ? Math.round(t.gameStockAfter - t.gameStockBefore) : null;
        const srcName = t.user?.name || t.playerName || "—";
        const detail = [t.gameName || t.game?.name, t.walletMethod, t.walletName].filter(Boolean).join(" · ") || "—";
        return `<tr>
          <td class="gray" style="white-space:nowrap">${fmtTime(t.createdAt)}</td>
          <td><b>${srcName}</b></td>
          <td><span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background:${typeBg};color:${typeClr}">${typeLabel}</span></td>
          <td class="gray" style="font-size:11px">${detail}</td>
          <td class="ta-r b" style="color:${amtColor}">${amtSign}${fmtMoney(t.amount)}${t.fee > 0 ? `<br><span style="font-size:9px;color:#f59e0b">fee −${fmtMoney(t.fee)}</span>` : ""}${pts !== null ? `<br><span style="font-size:9px;color:#7c3aed">${pts >= 0 ? "+" : ""}${pts} pts</span>` : ""}</td>
        </tr>`;
    }).join("");

    const activityHtml = `
    <div class="audit-section">
      <div class="audit-header gray-hdr">📋 Shift Activity Log (${txns.length})</div>
      ${txns.length === 0
            ? `<p style="padding:16px;text-align:center;color:#94a3b8;font-style:italic">No transactions recorded</p>`
            : `<table>
          <thead><tr><th>Time</th><th>Source</th><th>Type</th><th>Details</th><th class="ta-r">Amount / Points</th></tr></thead>
          <tbody>${activityRows}</tbody>
        </table>`}
    </div>`;

    // ── Audit Verification ─────────────────────────────────────
    let auditVerHtml = "";
    // if (endSnapshot) {
    //     const { deposits = 0, cashouts = 0, bonuses = 0, netProfit: np = 0, walletChange = 0, gameChange = 0 } = endSnapshot;
    //     const depFees = txns.filter(t => t.type === "DEPOSIT")
    //         .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
    //     const coFees = txns.filter(t => t.type === "WITHDRAWAL")
    //         .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
    //     const expectedW = deposits - depFees - cashouts - coFees;
    //     const cashDisc = walletChange - expectedW;
    //     const ptDisc = Math.round(endSnapshot.gameDiscrepancy ?? 0);
    //     const cashOk = Math.abs(cashDisc) < 0.02;
    //     const ptsOk = Math.abs(ptDisc) < 2;
    //     const allOk = cashOk && ptsOk;
    //     const statusColor = allOk ? "#16a34a" : "#dc2626";
    //     const statusBg = allOk ? "#f0fdf4" : "#fef2f2";
    //     const statusBorder = allOk ? "#86efac" : "#fca5a5";
    //     const feesNote = (depFees + coFees) > 0
    //         ? ` | Dep fees −${fmtMoney(depFees)}${coFees > 0 ? ` · CO fees −${fmtMoney(coFees)}` : ""}`
    //         : "";

    //     auditVerHtml = `
    //     <div class="audit-section">
    //       <div class="audit-header" style="background:${statusBg};border-bottom:1px solid ${statusBorder};color:${statusColor}">
    //         ${allOk ? "✓" : "⚠"} Audit Verification — ${allOk ? "All Clear" : "Discrepancy Found"}
    //       </div>
    //       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">
    //         <!-- Cash Flow Check -->
    //         <div style="border:1px solid ${cashOk ? "#86efac" : "#fca5a5"};border-radius:6px;overflow:hidden">
    //           <div style="padding:6px 10px;background:${cashOk ? "#f0fdf4" : "#fef2f2"};font-size:10px;font-weight:700;color:${cashOk ? "#15803d" : "#991b1b"};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${cashOk ? "#86efac" : "#fca5a5"}">Cash Flow Check</div>
    //           <table style="margin:0">
    //             <tr><td class="gray" style="font-size:10px;width:55%">Actual Change (Snapshots)</td><td class="ta-r b" style="color:${walletChange >= 0 ? "#16a34a" : "#dc2626"}">${walletChange >= 0 ? "+" : "−"}${fmtMoney(Math.abs(walletChange))}</td></tr>
    //             <tr><td class="gray" style="font-size:10px">Expected Change (Activities)</td><td class="ta-r b" style="color:${expectedW >= 0 ? "#16a34a" : "#dc2626"}">${expectedW >= 0 ? "+" : "−"}${fmtMoney(Math.abs(expectedW))}</td></tr>
    //             <tr style="background:#fafafa"><td class="gray" style="font-size:10px"><b>Cash Discrepancy</b></td><td class="ta-r b" style="color:${cashOk ? "#16a34a" : "#dc2626"}">${cashOk ? "$0.00" : (cashDisc >= 0 ? "+" : "−") + fmtMoney(Math.abs(cashDisc))}</td></tr>
    //           </table>
    //         </div>
    //         <!-- Point Stock Check -->
    //         <div style="border:1px solid ${ptsOk ? "#86efac" : "#fca5a5"};border-radius:6px;overflow:hidden">
    //           <div style="padding:6px 10px;background:${ptsOk ? "#f0fdf4" : "#fef2f2"};font-size:10px;font-weight:700;color:${ptsOk ? "#15803d" : "#991b1b"};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${ptsOk ? "#86efac" : "#fca5a5"}">Point Stock Check</div>
    //           <table style="margin:0">
    //             <tr><td class="gray" style="font-size:10px;width:55%">Actual Change (Snapshots)</td><td class="ta-r b" style="color:${gameChange <= 0 ? "#16a34a" : "#dc2626"}">${gameChange >= 0 ? "+" : ""}${Math.round(gameChange)} pts</td></tr>
    //             <tr><td class="gray" style="font-size:10px">Expected Change (Activities)</td><td class="ta-r b">${Math.round(-(deposits + bonuses - cashouts)) >= 0 ? "+" : ""}${Math.round(-(deposits + bonuses - cashouts))} pts</td></tr>
    //             <tr style="background:#fafafa"><td class="gray" style="font-size:10px"><b>Point Discrepancy</b></td><td class="ta-r b" style="color:${ptsOk ? "#16a34a" : "#dc2626"}">${ptsOk ? "0 pts" : (ptDisc >= 0 ? "+" : "") + ptDisc + " pts"}</td></tr>
    //           </table>
    //         </div>
    //       </div>
    //       <div style="margin:0 12px 12px;padding:10px 12px;background:${statusBg};border:1px solid ${statusBorder};border-left:4px solid ${statusColor};border-radius:6px;font-size:11px">
    //         ${!allOk ? `<div style="font-weight:700;color:${statusColor};margin-bottom:6px">⚠ A discrepancy was found (Cash: ${fmtMoney(Math.abs(cashDisc))}; Points: ${Math.abs(ptDisc)}). Please review the activity log.</div>` : ""}
    //         <span style="color:#475569">
    //           Deposits <b style="color:#16a34a">${fmtMoney(deposits)}</b> &nbsp;−&nbsp;
    //           Cashouts <b style="color:#dc2626">${fmtMoney(cashouts)}</b> &nbsp;=&nbsp;
    //           Net Profit <b style="color:${np >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(np)}</b> &nbsp;|&nbsp;
    //           Bonuses <b style="color:#c2410c">${fmtMoney(bonuses)}</b>${feesNote} &nbsp;|&nbsp;
    //           Wallet Δ <b style="color:${walletChange >= 0 ? "#16a34a" : "#dc2626"}">${walletChange >= 0 ? "+" : ""}${fmtMoney(walletChange)}</b> &nbsp;|&nbsp;
    //           Game Δ <b style="color:#7c3aed">${gameChange >= 0 ? "+" : ""}${Math.round(gameChange)} pts</b>
    //         </span>
    //         <div style="color:#94a3b8;font-style:italic;margin-top:4px;font-size:10px">Verification Check: Actual Change should equal Expected Change for both Cash and Points.</div>
    //       </div>
    //     </div>`;
    // }

    if (endSnapshot) {
        const { deposits = 0, cashouts = 0, bonuses = 0, netProfit: np = 0, walletChange = 0, gameChange = 0 } = endSnapshot;
        const depFees = txns.filter(t => t.type === "DEPOSIT")
            .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
        const coFees = txns.filter(t => t.type === "WITHDRAWAL")
            .reduce((s, t) => { const m = (t.notes || "").match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0); }, 0);
        const expectedW = deposits - depFees - cashouts - coFees;
        const cashDisc = walletChange - expectedW;
        const ptDisc = Math.round(endSnapshot.gameDiscrepancy ?? 0);
        const cashOk = Math.abs(cashDisc) < 0.02;
        const ptsOk = Math.abs(ptDisc) < 2;

        // ── Funds ↔ Game Points Balance ──────────────────────────────
        const expectedGameDeduction = deposits + bonuses - cashouts;
        const actualGameDeduction = Math.abs(gameChange);
        const fundsPointsDiscrepancy = Math.round(actualGameDeduction - expectedGameDeduction);
        const fundsPointsOk = Math.abs(fundsPointsDiscrepancy) < 2;
        // ─────────────────────────────────────────────────────────────

        const allOk = cashOk && ptsOk && fundsPointsOk;
        const statusColor = allOk ? "#16a34a" : "#dc2626";
        const statusBg = allOk ? "#f0fdf4" : "#fef2f2";
        const statusBorder = allOk ? "#86efac" : "#fca5a5";
        const feesNote = (depFees + coFees) > 0
            ? ` | Dep fees −${fmtMoney(depFees)}${coFees > 0 ? ` · CO fees −${fmtMoney(coFees)}` : ""}`
            : "";

        auditVerHtml = `
        <div class="audit-section">
          <div class="audit-header" style="background:${statusBg};border-bottom:1px solid ${statusBorder};color:${statusColor}">
            ${allOk ? "✓" : "⚠"} Audit Verification — ${allOk ? "All Clear" : "Discrepancy Found"}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 12px 0">
            <!-- Cash Flow Check -->
            <div style="border:1px solid ${cashOk ? "#86efac" : "#fca5a5"};border-radius:6px;overflow:hidden">
              <div style="padding:6px 10px;background:${cashOk ? "#f0fdf4" : "#fef2f2"};font-size:10px;font-weight:700;color:${cashOk ? "#15803d" : "#991b1b"};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${cashOk ? "#86efac" : "#fca5a5"}">Cash Flow Check</div>
              <table style="margin:0">
                <tr><td class="gray" style="font-size:10px;width:55%">Actual Change (Snapshots)</td><td class="ta-r b" style="color:${walletChange >= 0 ? "#16a34a" : "#dc2626"}">${walletChange >= 0 ? "+" : "−"}${fmtMoney(Math.abs(walletChange))}</td></tr>
                <tr><td class="gray" style="font-size:10px">Expected Change (Activities)</td><td class="ta-r b" style="color:${expectedW >= 0 ? "#16a34a" : "#dc2626"}">${expectedW >= 0 ? "+" : "−"}${fmtMoney(Math.abs(expectedW))}</td></tr>
                <tr style="background:#fafafa"><td class="gray" style="font-size:10px"><b>Cash Discrepancy</b></td><td class="ta-r b" style="color:${cashOk ? "#16a34a" : "#dc2626"}">${cashOk ? "$0.00" : (cashDisc >= 0 ? "+" : "−") + fmtMoney(Math.abs(cashDisc))}</td></tr>
              </table>
            </div>
            <!-- Point Stock Check -->
            <div style="border:1px solid ${ptsOk ? "#86efac" : "#fca5a5"};border-radius:6px;overflow:hidden">
              <div style="padding:6px 10px;background:${ptsOk ? "#f0fdf4" : "#fef2f2"};font-size:10px;font-weight:700;color:${ptsOk ? "#15803d" : "#991b1b"};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${ptsOk ? "#86efac" : "#fca5a5"}">Point Stock Check</div>
              <table style="margin:0">
                <tr><td class="gray" style="font-size:10px;width:55%">Actual Change (Snapshots)</td><td class="ta-r b" style="color:${gameChange <= 0 ? "#16a34a" : "#dc2626"}">${gameChange >= 0 ? "+" : ""}${Math.round(gameChange)} pts</td></tr>
                <tr><td class="gray" style="font-size:10px">Expected Change (Activities)</td><td class="ta-r b">${Math.round(-(deposits + bonuses - cashouts)) >= 0 ? "+" : ""}${Math.round(-(deposits + bonuses - cashouts))} pts</td></tr>
                <tr style="background:#fafafa"><td class="gray" style="font-size:10px"><b>Point Discrepancy</b></td><td class="ta-r b" style="color:${ptsOk ? "#16a34a" : "#dc2626"}">${ptsOk ? "0 pts" : (ptDisc >= 0 ? "+" : "") + ptDisc + " pts"}</td></tr>
              </table>
            </div>
          </div>

          <!-- ── NEW: Funds ↔ Game Points Balance (full width) ── -->
          <div style="padding:0 12px 0;margin-top:12px">
            <div style="border:1px solid ${fundsPointsOk ? "#86efac" : "#fca5a5"};border-radius:6px;overflow:hidden">
              <div style="padding:6px 10px;background:${fundsPointsOk ? "#f0fdf4" : "#fef2f2"};font-size:10px;font-weight:700;color:${fundsPointsOk ? "#15803d" : "#991b1b"};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${fundsPointsOk ? "#86efac" : "#fca5a5"}">
                Funds ↔ Game Points Balance
                <span style="font-size:9px;font-weight:500;text-transform:none;opacity:0.8;margin-left:6px">(Deposits + Bonuses − Cashouts = |Game Pts Deducted|)</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr">
                <div style="padding:8px 10px;text-align:center;border-right:1px solid #f1f5f9">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px">Expected Game Deduction</div>
                  <div style="font-size:13px;font-weight:800;color:#475569">${expectedGameDeduction.toFixed(0)} pts</div>
                  <div style="font-size:9px;color:#94a3b8;margin-top:2px">$${deposits.toFixed(0)}+$${bonuses.toFixed(0)}−$${cashouts.toFixed(0)}</div>
                </div>
                <div style="padding:8px 10px;text-align:center;border-right:1px solid #f1f5f9">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px">Actual Game Deduction</div>
                  <div style="font-size:13px;font-weight:800;color:${gameChange <= 0 ? "#16a34a" : "#dc2626"}">${actualGameDeduction.toFixed(0)} pts</div>
                  <div style="font-size:9px;color:#94a3b8;margin-top:2px">from snapshots</div>
                </div>
                <div style="padding:8px 10px;text-align:center;border-right:1px solid #f1f5f9">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px">Funds↔Points Discrepancy</div>
                  <div style="font-size:13px;font-weight:800;color:${fundsPointsOk ? "#16a34a" : "#dc2626"}">${fundsPointsOk ? "0 pts" : `${fundsPointsDiscrepancy >= 0 ? "+" : ""}${fundsPointsDiscrepancy} pts`}</div>
                  <div style="font-size:9px;color:#94a3b8;margin-top:2px">${fundsPointsOk ? "Balanced ✓" : "Mismatch ⚠"}</div>
                </div>
                <div style="padding:8px 10px;text-align:center">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px">Formula Breakdown</div>
                  <div style="font-size:13px;font-weight:800;color:#7c3aed">${expectedGameDeduction.toFixed(0)}</div>
                  <div style="font-size:9px;color:#94a3b8;margin-top:2px">${deposits.toFixed(0)}+${bonuses.toFixed(0)}−${cashouts.toFixed(0)}=${expectedGameDeduction.toFixed(0)}</div>
                </div>
              </div>
              ${!fundsPointsOk ? `
              <div style="padding:7px 10px;background:#fef2f2;border-top:1px solid #fca5a5;font-size:10px;color:#991b1b">
                ⚠ Game point deduction (${actualGameDeduction.toFixed(0)} pts) does not match expected
                (${expectedGameDeduction.toFixed(0)} pts = Deposits $${deposits.toFixed(2)} + Bonuses $${bonuses.toFixed(2)} − Cashouts $${cashouts.toFixed(2)}).
                Discrepancy: ${Math.abs(fundsPointsDiscrepancy)} pts.
              </div>` : ""}
            </div>
          </div>
          <!-- ── End Funds ↔ Game Points Balance ── -->

          <div style="margin:12px 12px 12px;padding:10px 12px;background:${statusBg};border:1px solid ${statusBorder};border-left:4px solid ${statusColor};border-radius:6px;font-size:11px">
            ${!allOk ? `<div style="font-weight:700;color:${statusColor};margin-bottom:6px">⚠ ${!cashOk ? `Cash discrepancy: ${fmtMoney(Math.abs(cashDisc))}. ` : ""}${!ptsOk ? `Point discrepancy: ${Math.abs(ptDisc)} pts. ` : ""}${!fundsPointsOk ? `Funds↔Points mismatch: ${Math.abs(fundsPointsDiscrepancy)} pts. ` : ""}Please review the activity log.</div>` : ""}
            <span style="color:#475569">
              Deposits <b style="color:#16a34a">${fmtMoney(deposits)}</b> &nbsp;−&nbsp;
              Cashouts <b style="color:#dc2626">${fmtMoney(cashouts)}</b> &nbsp;=&nbsp;
              Net Profit <b style="color:${np >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(np)}</b> &nbsp;|&nbsp;
              Bonuses <b style="color:#c2410c">${fmtMoney(bonuses)}</b>${feesNote} &nbsp;|&nbsp;
              Wallet Δ <b style="color:${walletChange >= 0 ? "#16a34a" : "#dc2626"}">${walletChange >= 0 ? "+" : ""}${fmtMoney(walletChange)}</b> &nbsp;|&nbsp;
              Game Δ <b style="color:#7c3aed">${gameChange >= 0 ? "+" : ""}${Math.round(gameChange)} pts</b> &nbsp;|&nbsp;
              Funds↔Pts <b style="color:${fundsPointsOk ? "#16a34a" : "#dc2626"}">${fundsPointsOk ? "✓ Balanced" : `⚠ ${Math.abs(fundsPointsDiscrepancy)} pts off`}</b>
            </span>
            <div style="color:#94a3b8;font-style:italic;margin-top:4px;font-size:10px">Verification: Cash Actual = Cash Expected · Points Actual = Points Expected · Deposits+Bonuses−Cashouts = |Game Pts Change|</div>
          </div>
        </div>`;
    }

    // ── Member Feedback ────────────────────────────────────────
    let feedbackHtml = "";
    if (effort || effortReason || workSummary || improvements || issues) {
        const effortColor = !effort ? "#94a3b8" : effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626";
        feedbackHtml = `
        <div class="audit-section">
          <div class="audit-header gray-hdr">💬 Member Feedback</div>
          <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${effort ? `<div style="grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">
              <div style="text-align:center;padding:8px 14px;background:${effortColor}15;border-radius:8px">
                <div style="font-size:24px;font-weight:900;color:${effortColor}">${effort}</div>
                <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase">/ 10</div>
              </div>
              <div style="flex:1">
                <div style="display:flex;gap:3px;margin-bottom:5px">
                  ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<div style="flex:1;height:6px;border-radius:3px;background:${n <= effort ? effortColor : "#e2e8f0"}"></div>`).join("")}
                </div>
                <div style="font-size:11px;color:#64748b">${effort >= 8 ? "Excellent effort" : effort >= 5 ? "Moderate effort" : "Low effort this shift"}</div>
              </div>
            </div>` : ""}
            ${effortReason ? `<div style="padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0"><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">Why this rating?</div><p style="margin:0;font-size:11px;color:#0f172a;line-height:1.5">${effortReason}</p></div>` : ""}
            ${improvements ? `<div style="padding:10px;background:#fffbeb;border-radius:6px;border:1px solid #fde68a"><div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">Could do better</div><p style="margin:0;font-size:11px;color:#0f172a;line-height:1.5">${improvements}</p></div>` : ""}
            ${workSummary ? `<div style="padding:10px;background:#f0fdf4;border-radius:6px;border:1px solid #86efac"><div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">Work summary</div><p style="margin:0;font-size:11px;color:#0f172a;line-height:1.5">${workSummary}</p></div>` : ""}
            ${issues ? `<div style="padding:10px;background:#fef2f2;border-radius:6px;border:1px solid #fca5a5"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">Issues encountered</div><p style="margin:0;font-size:11px;color:#0f172a;line-height:1.5">${issues}</p></div>` : ""}
          </div>
        </div>`;
    }

    // ── Players added ──────────────────────────────────────────
    const addedPlayers = shift.playersAdded || [];
    const playersHtml = addedPlayers.length > 0 ? `
    <div class="audit-section">
      <div class="audit-header gray-hdr">👥 Players Added (${addedPlayers.length})</div>
      <table><thead><tr><th>Name</th><th>Username</th><th>Tier</th><th>Time</th></tr></thead>
        <tbody>${addedPlayers.map(p => `<tr><td><b>${p.name}</b></td><td class="gray">@${p.username}</td><td><span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;background:#fffbeb;color:#92400e">${p.tier}</span></td><td class="gray">${fmtTime(p.createdAt)}</td></tr>`).join("")}</tbody>
      </table>
    </div>` : "";

    // ── Bonuses granted ────────────────────────────────────────
    const bonuses = shift.bonusesGranted || [];
    const bonusesHtml = bonuses.length > 0 ? `
    <div class="audit-section">
      <div class="audit-header gray-hdr">🎁 Bonuses Granted (${bonuses.length})</div>
      <table><thead><tr><th>Time</th><th>Player</th><th>Game</th><th class="ta-r">Amount</th></tr></thead>
        <tbody>${bonuses.map(b => `<tr><td class="gray">${fmtTime(b.createdAt)}</td><td><b>${b.user?.name || "—"}</b></td><td class="gray">${b.game?.name || "—"}</td><td class="ta-r b amber">+${fmtMoney(b.amount)}</td></tr>`).join("")}</tbody>
      </table>
    </div>` : "";

    return `
  <div class="shift-block">
    <div class="shift-block-header">
      <div>
        <span class="shift-title">${memberName}</span>
        <span class="shift-role-badge">${roleLabel}</span>
        ${shift.isActive ? `<span style="margin-left:8px;padding:2px 8px;background:#f0fdf4;color:#16a34a;border-radius:4px;font-size:10px;font-weight:700">● LIVE</span>` : ""}
      </div>
      <div class="shift-time">${fmtTime(shift.startTime)} – ${shift.isActive ? "Active Now" : fmtTime(shift.endTime)} &nbsp;·&nbsp; ${shift.duration != null ? shift.duration + " min" : "Ongoing"}</div>
    </div>
    ${kpiCards}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${cashFlowHtml}
      ${gameAuditHtml}
    </div>
    ${activityHtml}
    ${auditVerHtml}
    ${feedbackHtml}
    ${playersHtml}
    ${bonusesHtml}
  </div>`;
}

function printReport(report, date) {
    const win = window.open("", "_blank");
    const { summary, teams, wallets, dayTasks } = report;

    // ── Per-shift audit blocks ─────────────────────────────────
    const shiftAuditBlocks = teams.flatMap(team =>
        team.shifts.map(shift => buildShiftAuditHtml(team, shift))
    ).join("");

    // ── Summary table rows ─────────────────────────────────────
    const memberRows = teams.flatMap(team =>
        team.shifts.map(shift => {
            const s = shift.stats || {};
            const effort = shift.checkin?.effortRating ?? null;
            const balanced = s.isBalanced;
            return `<tr>
              <td><strong>${team.member?.name || "—"}</strong><br/><span style="font-size:10px;color:#64748b">${ROLE_LABEL[team.role] || team.role}</span></td>
              <td>${fmtTime(shift.startTime)}</td>
              <td>${shift.isActive ? "<span style='color:#16a34a;font-weight:700'>ACTIVE</span>" : fmtTime(shift.endTime)}</td>
              <td>${shift.duration != null ? shift.duration + " min" : "—"}</td>
              <td>${s.transactionCount ?? 0}</td>
              <td style="color:#16a34a;font-weight:700">${fmtMoney(s.totalDeposits)}</td>
              <td style="color:#dc2626;font-weight:700">${fmtMoney(s.totalCashouts)}</td>
              <td style="color:#c2410c;font-weight:700">${fmtMoney(s.totalBonuses)}</td>
              <td style="font-weight:800;color:${(s.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(s.netProfit)}</td>
              <td>${s.playersAdded ?? 0}</td>
              <td>${s.tasksCompleted ?? 0}</td>
              <td style="font-weight:700;color:${effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626"}">${effort != null ? `${effort}/10` : "—"}</td>
              <td style="font-weight:700;color:${balanced === true ? "#16a34a" : balanced === false ? "#dc2626" : "#94a3b8"}">${balanced === true ? "✓" : balanced === false ? "⚠" : "—"}</td>
            </tr>`;
        })
    ).join("");

    const taskRows = (dayTasks || []).map(t => {
        const pct = t.targetValue > 0 ? Math.round(((t.currentValue ?? 0) / t.targetValue) * 100) : null;
        return `<tr>
          <td>${fmtTime(t.completedAt || t.updatedAt)}</td>
          <td><strong>${t.title}</strong>${t.description ? `<br><span style="font-size:10px;color:#64748b">${t.description}</span>` : ""}</td>
          <td>${t.taskType?.replace("_", " ") || "STANDARD"}</td>
          <td>${t.assignedTo?.name || (t.assignToAll ? "All Members" : "—")}</td>
          <td>${t.status?.replace("_", " ")}</td>
          <td>${pct !== null ? `${t.currentValue} / ${t.targetValue} (${Math.min(100, pct)}%)` : (t.checklistItems ? `${t.checklistItems.filter(i => i.done).length}/${t.checklistItems.length} items` : "—")}</td>
          <td>${t.priority}</td>
        </tr>`;
    }).join("");

    const walletRows = (wallets || []).map(w =>
        `<tr><td><b>${w.name}</b></td><td>${w.method}</td><td style="font-weight:700;color:#16a34a;text-align:right">${fmtMoney(w.balance || 0)}</td></tr>`
    ).join("");

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Operations Report — ${date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;background:#fff;padding:28px}
  h1{font-size:20px;font-weight:800;margin-bottom:3px}
  h2{font-size:13px;font-weight:700;margin:28px 0 10px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:5px;text-transform:uppercase;letter-spacing:0.4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:20px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px}
  .val{font-size:18px;font-weight:800}.lbl{font-size:9px;color:#64748b;margin-top:1px;text-transform:uppercase;letter-spacing:0.4px}
  .green{color:#16a34a}.red{color:#dc2626}.amber{color:#c2410c}.purple{color:#7c3aed}.gray{color:#64748b}.b{font-weight:700}.ta-r{text-align:right}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}
  th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #e2e8f0}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  tr:hover td{background:#fafbfc}
  .total-row td{background:#f8fafc;font-weight:700}
  /* Shift blocks */
  .shift-block{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:28px;page-break-inside:avoid}
  .shift-block-header{padding:12px 16px;background:#f8fafc;border-bottom:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px}
  .shift-title{font-size:15px;font-weight:800;color:#0f172a}
  .shift-role-badge{margin-left:10px;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .shift-time{font-size:11px;color:#64748b}
  .kpi-card{border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px}
  .kpi-val{font-size:17px;font-weight:800}.kpi-lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin-top:1px}
  .audit-section{border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;margin:0 12px 14px}
  .audit-header{padding:8px 12px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.4px}
  .blue-hdr{background:#eff6ff;color:#1d4ed8;border-bottom:1px solid #bfdbfe}
  .purple-hdr{background:#f5f3ff;color:#6d28d9;border-bottom:1px solid #ddd6fe}
  .gray-hdr{background:#f8fafc;color:#374151;border-bottom:1px solid #e2e8f0}
  button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
  @media print{button{display:none}body{padding:16px}.shift-block{margin-bottom:20px}}
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
    <div>
      <h1>Daily Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} &nbsp;·&nbsp; Report Date: ${fmtDate(date + "T12:00:00")}</p>
    </div>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <h2>Day Summary</h2>
  <div class="grid4">
    <div class="box"><div class="val green">${fmtMoney(summary.totalDeposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(summary.totalCashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val amber">${fmtMoney(summary.totalBonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${summary.netProfit >= 0 ? "green" : "red"}">${fmtMoney(summary.netProfit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val">${summary.totalShifts}</div><div class="lbl">Shifts Logged</div></div>
    <div class="box"><div class="val">${summary.activeShifts}</div><div class="lbl">Active Shifts</div></div>
    <div class="box"><div class="val">${summary.tasksCompleted}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val">${summary.transactionCount}</div><div class="lbl">Transactions</div></div>
  </div>

  <h2>Member Shift Summary</h2>
  <table>
    <thead><tr>
      <th>Member</th><th>Start</th><th>End</th><th>Duration</th><th>Txns</th>
      <th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th>
      <th>Players</th><th>Tasks</th><th>Effort</th><th>Balanced</th>
    </tr></thead>
    <tbody>${memberRows || '<tr><td colspan="13" style="text-align:center;color:#94a3b8;padding:16px">No shifts today</td></tr>'}</tbody>
  </table>

  <h2>Detailed Shift Audit Reports</h2>
  ${shiftAuditBlocks || `<p style="color:#94a3b8;font-style:italic;padding:16px 0">No shifts recorded for this day.</p>`}

  ${(dayTasks || []).length > 0 ? `
  <h2>All Tasks (${dayTasks.length})</h2>
  <table>
    <thead><tr><th>Time</th><th>Task</th><th>Type</th><th>Assigned To</th><th>Status</th><th>Progress</th><th>Priority</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>` : ""}

  ${(wallets || []).length > 0 ? `
  <h2>Current Wallet Balances</h2>
  <table>
    <thead><tr><th>Name</th><th>Method</th><th class="ta-r">Balance</th></tr></thead>
    <tbody>${walletRows}</tbody>
  </table>` : ""}

  <p style="margin-top:28px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:12px">
    Confidential &nbsp;·&nbsp; Generated by Operations Dashboard &nbsp;·&nbsp; ${new Date().toISOString()}
  </p>
</body></html>`);
    win.document.close();
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function AdminReportPage() {
    const todayStr = toDateInput(new Date());
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [teamFilter, setTeamFilter] = useState("ALL");

    const fetchReport = useCallback(async (date, role) => {
        setLoading(true);
        setError("");
        try {
            const opts = { date };
            if (role && role !== "ALL") opts.teamRole = role;
            const data = await api.reports.getDailyReport(opts);
            setReport(data);
        } catch (e) {
            setError(e.message || "Failed to load report");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReport(selectedDate, teamFilter); }, [selectedDate, teamFilter, fetchReport]);

    const s = report?.summary || {};

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
                            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>Daily Operations Report</h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{report ? fmtDate(report.date + "T12:00:00") : "Loading…"}</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Date picker */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                            <Calendar style={{ width: "13px", height: "13px", color: "#64748b" }} />
                            <input type="date" value={selectedDate} max={todayStr} onChange={e => setSelectedDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
                        </div>
                        {/* Team filter */}
                        <div style={{ position: "relative" }}>
                            <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ padding: "8px 30px 8px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", appearance: "none" }}>
                                <option value="ALL">All Teams</option>
                                <option value="TEAM1">Team 1</option>
                                <option value="TEAM2">Team 2</option>
                                <option value="TEAM3">Team 3</option>
                                <option value="TEAM4">Team 4</option>
                            </select>
                            <ChevronDown style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none" }} />
                        </div>
                        {/* Refresh */}
                        <button onClick={() => fetchReport(selectedDate, teamFilter)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 13px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", color: "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                            <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
                        </button>
                        {/* Export PDF */}
                        <button onClick={() => report && printReport(report, report.date)} disabled={!report || loading} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 16px", border: "none", borderRadius: "8px", background: "#0ea5e9", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: report ? "pointer" : "not-allowed", opacity: report ? 1 : 0.5 }}>
                            <Download style={{ width: "13px", height: "13px" }} /> Export PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "11px 15px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && !report && (
                <div style={{ ...CARD, padding: "80px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0f172a", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    Generating report…
                </div>
            )}

            {report && (
                <>
                    {/* ── Day Summary ── */}
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

                    {/* ── Team Shift Reports ── */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users style={{ width: "12px", height: "12px" }} /> Team Shift Reports
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {report.teams?.map(team => <MemberShiftSection key={team.role} team={team} />)}
                        </div>
                    </div>

                    {/* ── All Tasks Today ── */}
                    {report.dayTasks?.length > 0 && (
                        <div style={{ ...CARD, overflow: "hidden" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                <CheckCircle style={{ width: "15px", height: "15px", color: "#64748b" }} />
                                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>All Tasks Today ({report.dayTasks.length})</h3>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>{["Time", "Task", "Type", "Assigned To", "Status", "Progress", "Priority"].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {report.dayTasks.map(t => {
                                            const pct = t.targetValue > 0 ? Math.min(100, Math.round(((t.currentValue ?? 0) / t.targetValue) * 100)) : null;
                                            const checklist = t.checklistItems || [];
                                            const doneItems = checklist.filter(i => i.done).length;
                                            return (
                                                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                    <td style={{ ...TD, color: "#94a3b8", fontSize: "12px" }}>{fmtTime(t.completedAt || t.updatedAt)}</td>
                                                    <td style={TD}>
                                                        <div style={{ fontWeight: "600" }}>{t.title}</div>
                                                        {t.description && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{t.description}</div>}
                                                    </td>
                                                    <td style={TD}><TaskTypeBadge taskType={t.taskType} /></td>
                                                    <td style={{ ...TD, fontSize: "12px" }}>
                                                        {t.assignToAll
                                                            ? <Badge label="All Members" bg="#f5f3ff" color="#7c3aed" />
                                                            : t.assignedTo?.name || "—"}
                                                    </td>
                                                    <td style={TD}>
                                                        <Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} />
                                                    </td>
                                                    <td style={{ ...TD, minWidth: "150px" }}>
                                                        {pct !== null ? (
                                                            <div>
                                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                                                                    <span>{t.taskType === "REVENUE_TARGET" ? `${fmtMoney(t.currentValue)} / ${fmtMoney(t.targetValue)}` : `${t.currentValue} / ${t.targetValue}`}</span>
                                                                    <span style={{ fontWeight: "700" }}>{pct}%</span>
                                                                </div>
                                                                <ProgressBar pct={pct} />
                                                            </div>
                                                        ) : checklist.length > 0
                                                            ? <span style={{ fontSize: "12px", color: "#64748b" }}>{doneItems}/{checklist.length} items</span>
                                                            : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
                                                    </td>
                                                    <td style={TD}><PriorityBadge priority={t.priority} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Wallet Balances ── */}
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

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6}
            `}</style>
        </div>
    );
}
