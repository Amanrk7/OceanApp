import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FileText, Download, RefreshCw, Calendar, Users, TrendingUp,
    TrendingDown, Gift, CheckCircle, Clock, Activity,
    ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
    DollarSign, BarChart2, Wallet, Gamepad2, MessageSquare,
    ShieldCheck, AlertTriangle, Zap, List, CalendarRange,
    ChevronRight, Receipt, PiggyBank, Database, Filter,
    CreditCard, Eye, XCircle, AlertCircle,
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
const fmtDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
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

// ── Date helpers ──────────────────────────────────────────────
const isoToDate = (iso) => iso ? new Date(iso) : null;
const inDateRange = (iso, from, to) => {
    if (!iso) return true;
    const d = new Date(iso);
    if (from && d < new Date(from + "T00:00:00")) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    return true;
};

// ── Aggregation helpers ───────────────────────────────────────
function aggregateDayExpenses(report) {
    const all = [];
    (report.teams || []).forEach(team => {
        (team.shifts || []).forEach(shift => {
            (shift.expenses || []).forEach(e => {
                all.push({ ...e, _teamRole: team.role, _shiftTime: shift.startTime });
            });
        });
    });
    return all;
}

function aggregateDayTakeouts(report) {
    const all = [];
    (report.teams || []).forEach(team => {
        (team.shifts || []).forEach(shift => {
            (shift.profitTakeouts || []).forEach(t => {
                all.push({ ...t, _teamRole: team.role, _shiftTime: shift.startTime });
            });
        });
    });
    return all;
}

function aggregateDayTransactions(report) {
    const all = [];
    (report.teams || []).forEach(team => {
        (team.shifts || []).forEach(shift => {
            (shift.transactions || []).forEach(t => {
                all.push({ ...t, _teamRole: team.role, _shiftId: shift.id, _shiftTime: shift.startTime });
            });
        });
    });
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function aggregateDayGameChanges(report) {
    const gameMap = {};
    (report.teams || []).forEach(team => {
        (team.shifts || []).forEach(shift => {
            const start = shift.startSnapshot;
            const end = shift.endSnapshot;
            if (!start || !end) return;
            const startGames = start.gameSnapshot ?? [];
            const endGames = end.gameSnapshot ?? [];
            const allIds = [...new Set([...startGames.map(g => g.id), ...endGames.map(g => g.id)])];
            allIds.forEach(id => {
                const sg = startGames.find(g => g.id === id);
                const eg = endGames.find(g => g.id === id);
                if (!gameMap[id]) gameMap[id] = { id, name: sg?.name ?? eg?.name ?? id, totalDelta: 0, shifts: 0 };
                gameMap[id].totalDelta += (eg?.pointStock ?? 0) - (sg?.pointStock ?? 0);
                gameMap[id].shifts += 1;
            });
        });
    });
    return Object.values(gameMap);
}

function aggregateDayWalletChanges(report) {
    const walletMap = {};
    (report.teams || []).forEach(team => {
        (team.shifts || []).forEach(shift => {
            const start = shift.startSnapshot;
            const end = shift.endSnapshot;
            if (!start || !end) return;
            const startWallets = start.walletSnapshot ?? [];
            const endWallets = end.walletSnapshot ?? [];
            const allIds = [...new Set([...startWallets.map(w => w.id), ...endWallets.map(w => w.id)])];
            allIds.forEach(id => {
                const sw = startWallets.find(w => w.id === id);
                const ew = endWallets.find(w => w.id === id);
                if (!walletMap[id]) walletMap[id] = { id, name: sw?.name ?? ew?.name ?? id, method: sw?.method ?? ew?.method ?? "", start: sw?.balance ?? 0, end: ew?.balance ?? 0, totalDelta: 0, shifts: 0 };
                walletMap[id].totalDelta += (ew?.balance ?? 0) - (sw?.balance ?? 0);
                walletMap[id].end = ew?.balance ?? walletMap[id].end;
                walletMap[id].shifts += 1;
            });
        });
    });
    return Object.values(walletMap);
}

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

// ── Summary stat card ─────────────────────────────────────────
function StatCard({ label, value, valueColor, sub, icon: Icon, accentColor }) {
    return (
        <div style={{ ...CARD, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                {Icon && <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: (accentColor || "#64748b") + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon style={{ width: "15px", height: "15px", color: accentColor || "#64748b" }} />
                </div>}
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: valueColor || "#0f172a", letterSpacing: "-0.5px" }}>{value}</div>
            {sub && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{sub}</div>}
        </div>
    );
}

// ── Sub-date filter bar ───────────────────────────────────────
function SubDateFilter({ fromDate, toDate, onFrom, onTo, count, totalCount, label }) {
    const isFiltered = fromDate || toDate;
    return (
        <div style={{ ...CARD, padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Filter style={{ width: "13px", height: "13px", color: "#64748b", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Filter {label} by date:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                    type="date"
                    value={fromDate}
                    onChange={e => onFrom(e.target.value)}
                    style={{ padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "#fff" }}
                />
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>→</span>
                <input
                    type="date"
                    value={toDate}
                    onChange={e => onTo(e.target.value)}
                    style={{ padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "#fff" }}
                />
            </div>
            {isFiltered && (
                <button
                    onClick={() => { onFrom(""); onTo(""); }}
                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
                >
                    <XCircle style={{ width: "11px", height: "11px" }} /> Clear
                </button>
            )}
            {isFiltered && (
                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "auto" }}>
                    Showing <b style={{ color: "#0f172a" }}>{count}</b> of {totalCount} records
                </span>
            )}
        </div>
    );
}

// ── Day-level Expenses Table ──────────────────────────────────
function DayExpensesSection({ expenses }) {
    if (!expenses?.length) return null;
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    const totalPaid = expenses.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);
    const totalPts = expenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);

    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#fffbeb", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Receipt style={{ width: "14px", height: "14px", color: "#b45309" }} />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        All Expenses — Day Total ({expenses.length})
                    </span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "800", color: "#b45309" }}>Cost: −{fmtMoney(total)}</span>
                    {totalPaid > 0 && <span style={{ fontWeight: "700", color: "#dc2626" }}>Wallet Paid: −{fmtMoney(totalPaid)}</span>}
                    {totalPts > 0 && <span style={{ color: "#7c3aed", fontWeight: "700" }}>+{totalPts.toFixed(0)} pts reloaded</span>}
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Time", "Shift", "Details", "Category", "Game", "Expense $", "Pts Added", "Wallet Paid", "Notes"].map(h => (
                                <th key={h} style={TH}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((e, i) => (
                            <tr key={e.id ?? i}
                                onMouseEnter={ev => ev.currentTarget.style.background = "#fefce8"}
                                onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                                <td style={{ ...TD, fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(e.createdAt)}</td>
                                <td style={TD}><Badge label={ROLE_LABEL[e._teamRole] || e._teamRole || "—"} bg="#f8fafc" color="#64748b" /></td>
                                <td style={{ ...TD, fontWeight: "600" }}>{e.details}</td>
                                <td style={TD}><Badge label={(e.category || "—").replace(/_/g, " ")} bg="#fffbeb" color="#b45309" /></td>
                                <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{e.game?.name || "—"}</td>
                                <td style={{ ...TD, fontWeight: "700", color: "#b45309" }}>{fmtMoney(e.amount ?? 0)}</td>
                                <td style={{ ...TD, color: "#7c3aed", fontWeight: "600" }}>{(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : "—"}</td>
                                <td style={{ ...TD, fontWeight: "700", color: "#dc2626" }}>{parseFloat(e.paymentMade ?? 0) > 0 ? `−${fmtMoney(e.paymentMade)}` : "—"}</td>
                                <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{e.notes || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: "#fef9c3" }}>
                            <td colSpan={5} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#92400e" }}>
                                Day Total ({expenses.length} expense{expenses.length !== 1 ? "s" : ""})
                            </td>
                            <td style={{ ...TD, fontWeight: "800", color: "#b45309" }}>{fmtMoney(total)}</td>
                            <td style={{ ...TD, fontWeight: "700", color: "#7c3aed" }}>{totalPts > 0 ? `+${totalPts.toFixed(0)} pts` : "—"}</td>
                            <td style={{ ...TD, fontWeight: "800", color: "#dc2626" }}>{totalPaid > 0 ? `−${fmtMoney(totalPaid)}` : "—"}</td>
                            <td style={TD} />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Day-level Profit Takeouts Table ──────────────────────────
function DayTakeoutsSection({ takeouts }) {
    if (!takeouts?.length) return null;
    const total = takeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const byMethod = takeouts.reduce((acc, t) => {
        const m = t.method || "Cash";
        acc[m] = (acc[m] || 0) + parseFloat(t.amount ?? 0);
        return acc;
    }, {});
    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#fff1f2", borderBottom: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <PiggyBank style={{ width: "14px", height: "14px", color: "#991b1b" }} />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        Profit Takeouts — Day Total ({takeouts.length})
                    </span>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    {Object.entries(byMethod).map(([method, amt]) => (
                        <span key={method} style={{ fontSize: "11px", color: "#64748b" }}>
                            {method}: <b style={{ color: "#991b1b" }}>−{fmtMoney(amt)}</b>
                        </span>
                    ))}
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#991b1b", borderLeft: "1px solid #fecdd3", paddingLeft: "12px" }}>
                        Total: −{fmtMoney(total)}
                    </span>
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Time", "Shift", "Taken By", "Method", "Amount", "Wallet", "Notes"].map(h => (
                                <th key={h} style={TH}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {takeouts.map((t, i) => (
                            <tr key={t.id ?? i}
                                onMouseEnter={ev => ev.currentTarget.style.background = "#fff5f5"}
                                onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                                <td style={{ ...TD, fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(t.takenAt || t._shiftTime)}</td>
                                <td style={TD}><Badge label={ROLE_LABEL[t._teamRole] || t._teamRole || "—"} bg="#f8fafc" color="#64748b" /></td>
                                <td style={{ ...TD, fontWeight: "600" }}>{t.takenBy}</td>
                                <td style={TD}><Badge label={t.method || "Cash"} bg="#fff1f2" color="#991b1b" /></td>
                                <td style={{ ...TD, fontWeight: "800", color: "#991b1b" }}>−{fmtMoney(t.amount)}</td>
                                <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{t.walletId ? `Wallet #${t.walletId}` : "—"}</td>
                                <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{t.notes || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: "#fee2e2" }}>
                            <td colSpan={4} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#991b1b" }}>
                                Day Total ({takeouts.length} takeout{takeouts.length !== 1 ? "s" : ""})
                            </td>
                            <td style={{ ...TD, fontWeight: "800", color: "#991b1b" }}>−{fmtMoney(total)}</td>
                            <td colSpan={2} style={TD} />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Day-level Game/Wallet Changes ─────────────────────────────
function DayGameChangesSection({ gameChanges, wallets }) {
    const hasGameData = gameChanges?.length > 0;
    const hasWalletData = wallets?.length > 0;
    if (!hasGameData && !hasWalletData) return null;
    return (
        <div style={{ display: "grid", gridTemplateColumns: hasGameData && hasWalletData ? "1fr 1fr" : "1fr", gap: "14px" }}>
            {hasGameData && (
                <div style={{ ...CARD, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "#f5f3ff", borderBottom: "1px solid #e9d5ff", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Gamepad2 style={{ width: "14px", height: "14px", color: "#7c3aed" }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.4px" }}>Game Point Changes</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr>{["Game", "Shifts", "Net Pts Change"].map(h => <th key={h} style={{ ...TH, textAlign: h === "Game" ? "left" : "right" }}>{h}</th>)}</tr></thead>
                            <tbody>
                                {gameChanges.map((g, i) => (
                                    <tr key={g.id ?? i} onMouseEnter={e => e.currentTarget.style.background = "#faf5ff"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                        <td style={{ ...TD, display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <Gamepad2 style={{ width: "12px", height: "12px", color: "#7c3aed" }} />
                                            </div>
                                            <span style={{ fontWeight: "600", fontSize: "13px" }}>{g.name}</span>
                                        </td>
                                        <td style={{ ...TD, textAlign: "right", color: "#94a3b8", fontSize: "12px" }}>{g.shifts}</td>
                                        <td style={{ ...TD, textAlign: "right", fontWeight: "800", fontSize: "13px", color: clrNum(g.totalDelta, true) }}>
                                            {g.totalDelta === 0 ? <span style={{ color: "#94a3b8" }}>0 pts</span> : <span>{signPts(g.totalDelta)} pts</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {hasWalletData && (
                <div style={{ ...CARD, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "#eff6ff", borderBottom: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Wallet style={{ width: "14px", height: "14px", color: "#2563eb" }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Wallet Balance Changes</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr>{["Wallet", "End Balance", "Net Change"].map(h => <th key={h} style={{ ...TH, textAlign: h === "Wallet" ? "left" : "right" }}>{h}</th>)}</tr></thead>
                            <tbody>
                                {wallets.map((w, i) => (
                                    <tr key={w.id ?? i} onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                        <td style={{ ...TD, display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: w.method === "Bitcoin" ? "#f7931a" : w.method === "CashApp" ? "#00d632" : "#94a3b8" }} />
                                            <div>
                                                <div style={{ fontWeight: "600", fontSize: "13px" }}>{w.method || w.name}</div>
                                                {w.name && w.name !== w.method && <div style={{ fontSize: "10px", color: "#94a3b8" }}>{w.name}</div>}
                                            </div>
                                        </td>
                                        <td style={{ ...TD, textAlign: "right", fontWeight: "600" }}>{fmtMoney(w.end)}</td>
                                        <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: clrNum(w.totalDelta) }}>
                                            {w.totalDelta === 0 ? <span style={{ color: "#94a3b8" }}>$0.00</span> : signNum(w.totalDelta)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Member Feedback ───────────────────────────────────────────
function FeedbackPanel({ shift }) {
    const effort = shift.checkin?.effortRating ?? null;
    const effortReason = shift.effortReason ?? shift.checkin?.additionalNotes ?? null;
    const workSummary = shift.checkin?.workSummary ?? null;
    const issues = shift.checkin?.issuesEncountered ?? null;
    if (!effort && !effortReason && !workSummary) return <div style={{ padding: "18px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No feedback submitted for this shift</div>;
    const effortColor = !effort ? "#94a3b8" : effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626";
    const effortBg = !effort ? "#f1f5f9" : effort >= 8 ? "#f0fdf4" : effort >= 5 ? "#fffbeb" : "#fee2e2";
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {effort && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px 18px", background: effortBg, borderRadius: "10px", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: "26px", fontWeight: "900", color: effortColor, lineHeight: 1 }}>{effort}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", fontWeight: "600" }}>/ 10</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>{[1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} style={{ flex: 1, height: "7px", borderRadius: "3px", background: n <= effort ? effortColor : "#e2e8f0" }} />)}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{effort >= 8 ? "Excellent effort" : effort >= 5 ? "Moderate effort" : "Low effort this shift"}</div>
                    </div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {effortReason && <div style={{ padding: "11px 13px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "5px" }}>Why this rating?</div><p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{effortReason}</p></div>}
                {workSummary && <div style={{ padding: "11px 13px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "5px" }}>Work summary</div><p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{workSummary}</p></div>}
                {issues && <div style={{ padding: "11px 13px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", marginBottom: "5px" }}>Issues encountered</div><p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{issues}</p></div>}
            </div>
        </div>
    );
}

// ── Expenses Table (per-shift) ────────────────────────────────
function ExpensesTable({ expenses }) {
    if (!expenses?.length) return null;
    const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalPts = expenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign style={{ width: '14px', height: '14px', color: '#b45309' }} /><span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Shift Expenses ({expenses.length})</span></div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}><span style={{ fontWeight: '800', color: '#b45309' }}>−${total.toFixed(2)}</span>{totalPts > 0 && <span style={{ color: '#7c3aed', fontWeight: '700' }}>+{totalPts} pts added</span>}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Details', 'Category', 'Game', 'Amount', 'Points Added', 'Payment', 'Notes'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{expenses.map(e => (
                        <tr key={e.id} onMouseEnter={ev => ev.currentTarget.style.background = '#fefce8'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                            <td style={{ ...TD, fontWeight: '600' }}>{e.details}</td>
                            <td style={TD}><Badge label={e.category?.replace('_', ' ')} bg="#fffbeb" color="#b45309" /></td>
                            <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>{e.game?.name || '—'}</td>
                            <td style={{ ...TD, fontWeight: '700', color: '#b45309' }}>${(e.amount ?? 0).toFixed(2)}</td>
                            <td style={{ ...TD, color: '#7c3aed' }}>{e.pointsAdded > 0 ? `+${e.pointsAdded} pts` : '—'}</td>
                            <td style={{ ...TD, color: '#64748b', fontSize: '12px' }}>{e.paymentMade > 0 ? `$${parseFloat(e.paymentMade).toFixed(2)}` : '—'}</td>
                            <td style={{ ...TD, fontSize: '11px', color: '#94a3b8' }}>{e.notes || '—'}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
}

// ── Profit Takeouts Table (per-shift) ─────────────────────────
function ProfitTakeoutsTable({ takeouts }) {
    if (!takeouts?.length) return null;
    const total = takeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiggyBank style={{ width: '14px', height: '14px', color: '#991b1b' }} /><span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Shift Profit Takeouts ({takeouts.length})</span></div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>−${total.toFixed(2)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Taken By', 'Method', 'Amount', 'Notes'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{takeouts.map(t => (
                        <tr key={t.id} onMouseEnter={ev => ev.currentTarget.style.background = '#fff5f5'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                            <td style={{ ...TD, fontWeight: '600' }}>{t.takenBy}</td>
                            <td style={TD}><Badge label={t.method} bg="#fff1f2" color="#991b1b" /></td>
                            <td style={{ ...TD, fontWeight: '800', color: '#991b1b' }}>${parseFloat(t.amount).toFixed(2)}</td>
                            <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>{t.notes || '—'}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
}

// ── Full Shift Transactions Table ─────────────────────────────
function ShiftTransactionsTable({ transactions }) {
    if (!transactions?.length) return (
        <div style={{ ...CARD, padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions recorded for this shift</div>
    );
    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                <List style={{ width: "14px", height: "14px", color: "#64748b" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.4px" }}>Shift Transactions ({transactions.length})</span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>{["Time", "Player", "Type", "Game / Wallet", "Amount", "Fee", "Status"].map(h => (
                            <th key={h} style={{ ...TH, textAlign: h === "Amount" || h === "Fee" ? "right" : "left" }}>{h}</th>
                        ))}</tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => {
                            const isDeposit = t.type === "DEPOSIT";
                            const isCashout = t.type === "WITHDRAWAL";
                            const isPending = t.status === "PENDING";
                            const amtColor = isDeposit ? "#16a34a" : isCashout ? "#dc2626" : "#c2410c";
                            return (
                                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""} style={{ opacity: isPending ? 0.75 : 1 }}>
                                    <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(t.createdAt)}</td>
                                    <td style={TD}><div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || t.playerName || `#${t.userId}`}</div></td>
                                    <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                    <td style={{ ...TD, fontSize: "11px" }}>
                                        {t.gameName && <div style={{ fontWeight: "600", color: "#0f172a" }}>{t.gameName}</div>}
                                        {t.walletMethod && <div style={{ color: "#64748b" }}>{t.walletMethod}{t.walletName ? ` · ${t.walletName}` : ""}</div>}
                                        {!t.gameName && !t.walletMethod && <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ ...TD, textAlign: "right", fontWeight: "800", fontSize: "13px", color: amtColor }}>{fmtMoney(t.amount)}</td>
                                    <td style={{ ...TD, textAlign: "right" }}>{t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "11px" }}>−{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                                    <td style={TD}><Badge label={isPending ? "PENDING" : "DONE"} bg={isPending ? "#fef3c7" : "#dcfce7"} color={isPending ? "#b45309" : "#166534"} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: "#f8fafc" }}>
                            <td colSpan={4} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#475569" }}>Totals</td>
                            <td style={{ ...TD, textAlign: "right", fontWeight: "800", fontSize: "13px" }}>
                                <div style={{ color: "#16a34a" }}>+{fmtMoney(transactions.filter(t => t.type === "DEPOSIT").reduce((s, t) => s + (t.amount ?? 0), 0))}</div>
                                <div style={{ color: "#dc2626", fontSize: "11px" }}>−{fmtMoney(transactions.filter(t => t.type === "WITHDRAWAL").reduce((s, t) => s + (t.amount ?? 0), 0))}</div>
                            </td>
                            <td colSpan={2} style={TD} />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Single Shift Detail ───────────────────────────────────────
function ShiftDetail({ shift, index, total }) {
    const [activeTab, setActiveTab] = useState("overview");
    const isLast = index === total - 1;
    const s = shift.stats || {};
    let startSnapshot = shift.startSnapshot ?? null;
    let endSnapshot = shift.endSnapshot ?? null;
    if (!startSnapshot && shift.checkin?.balanceNote) { try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { } }
    if (!endSnapshot && shift.checkin?.additionalNotes) { try { const p = JSON.parse(shift.checkin.additionalNotes); endSnapshot = p.endSnapshot ?? null; } catch (_) { } }
    const transactions = shift.transactions || [];
    const netProfit = s.netProfit ?? 0;
    const tabs = [
        { id: "overview", label: "Shift Report" },
        { id: "transactions", label: `Transactions (${transactions.length})` },
        { id: "tasks", label: `Tasks (${shift.tasks?.length || 0})` },
        { id: "players", label: `Players Added (${shift.playersAdded?.length || 0})` },
        { id: "bonuses", label: `Bonuses (${shift.bonusesGranted?.length || 0})` },
    ];
    return (
        <div style={{ borderBottom: isLast ? "none" : "1px solid #e2e8f0" }}>
            <div style={{ padding: "14px 20px", background: shift.isActive ? "#f0fdf4" : "#fafbfc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: shift.isActive ? "#22c55e" : "#94a3b8" }} />
                    <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>{fmtTime(shift.startTime)} — {shift.isActive ? <span style={{ color: "#22c55e" }}>Active Now</span> : fmtTime(shift.endTime)}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{shift.duration != null ? `${shift.duration} min` : "Ongoing"}</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "8px" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Bonuses", val: fmtMoney(s.totalBonuses), color: "#c2410c", bg: "#fff7ed" },
                        { label: "Profit", val: fmtMoney(netProfit), color: netProfit >= 0 ? "#16a34a" : "#dc2626", bg: netProfit >= 0 ? "#f0fdf4" : "#fee2e2" },
                        ...(s.totalExpenses > 0 ? [{ label: "Expenses", val: fmtMoney(s.totalExpenses), color: "#b45309", bg: "#fffbeb" }] : []),
                        ...(s.totalTakeouts > 0 ? [{ label: "Takeouts", val: fmtMoney(s.totalTakeouts), color: "#991b1b", bg: "#fff1f2" }] : []),
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "10px" }}>
                        <StatCard label="Player Deposits" value={`+${fmtMoney(s.totalDeposits)}`} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                        <StatCard label="Player Cashouts" value={`−${fmtMoney(s.totalCashouts)}`} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                        <StatCard label="Bonuses Given" value={`−${fmtMoney(s.totalBonuses)}`} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                        <StatCard label="Shift Net Profit" value={(netProfit >= 0 ? "+" : "") + fmtMoney(netProfit)} valueColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} accentColor={netProfit >= 0 ? "#16a34a" : "#dc2626"} />
                        {s.totalExpenses > 0 && <StatCard label="Expenses" value={`−${fmtMoney(s.totalExpenses)}`} valueColor="#b45309" icon={Receipt} accentColor="#b45309" sub={`${s.expenseCount} item${s.expenseCount !== 1 ? "s" : ""}`} />}
                        {s.totalTakeouts > 0 && <StatCard label="Profit Takeouts" value={`−${fmtMoney(s.totalTakeouts)}`} valueColor="#991b1b" icon={PiggyBank} accentColor="#991b1b" sub={`${s.takeoutCount} takeout${s.takeoutCount !== 1 ? "s" : ""}`} />}
                    </div>
                    <ShiftTransactionsTable transactions={transactions} />
                    {shift.expenses?.length > 0 && <ExpensesTable expenses={shift.expenses} />}
                    {shift.profitTakeouts?.length > 0 && <ProfitTakeoutsTable takeouts={shift.profitTakeouts} />}
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
                    {!transactions.length ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions this shift</div> : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr>{["Time", "Player", "Type", "Game", "Amount", "Balance After"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                            <tbody>{transactions.map(t => (
                                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{fmtTime(t.createdAt)}</td>
                                    <td style={TD}><div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || `#${t.userId}`}</div></td>
                                    <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                    <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{t.gameName || "—"}</td>
                                    <td style={{ ...TD, fontWeight: "700", fontSize: "13px", color: t.type === "DEPOSIT" ? "#16a34a" : t.type === "WITHDRAWAL" ? "#dc2626" : "#c2410c" }}>{fmtMoney(t.amount)}</td>
                                    <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}
            {activeTab === "tasks" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.tasks?.length ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No tasks this shift</div> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {shift.tasks.map(t => (
                                <div key={t.id} style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${t.status === "COMPLETED" ? "#22c55e" : "#f59e0b"}`, borderRadius: "0 8px 8px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "700" }}>{t.title}</span>
                                        <Badge label={t.status?.replace("_", " ")} bg={t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff"} color={t.status === "COMPLETED" ? "#166634" : "#1d4ed8"} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === "players" && (
                <div style={{ padding: "16px 20px" }}>
                    {!shift.playersAdded?.length ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No players added this shift</div> : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                            {shift.playersAdded.map(p => (
                                <div key={p.id} style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "9px", background: "#f5f3ff" }}>
                                    <div style={{ fontWeight: "700", fontSize: "13px" }}>{p.name}</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>@{p.username}</div>
                                    <div style={{ marginTop: "6px" }}><Badge label={p.tier} bg="#fffbeb" color="#92400e" /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === "bonuses" && (
                <div style={{ overflowX: "auto" }}>
                    {!shift.bonusesGranted?.length ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No bonuses this shift</div> : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr>{["Time", "Player", "Game", "Amount"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                            <tbody>{shift.bonusesGranted.map(b => (
                                <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{fmtTime(b.createdAt)}</td>
                                    <td style={{ ...TD, fontSize: "12px", fontWeight: "600" }}>{b.user?.name || "—"}</td>
                                    <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{b.game?.name || "—"}</td>
                                    <td style={{ ...TD, fontWeight: "700", color: "#c2410c" }}>{fmtMoney(b.amount)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Member Section ────────────────────────────────────────────
function MemberShiftSection({ team }) {
    const [expanded, setExpanded] = useState(true);
    const rc = ROLE_COLORS[team.role] || ROLE_COLORS.TEAM1;
    // const memberName = team.member?.name || team.shifts[0]?.displayMember?.name || team.shifts[0]?.checkin?.user?.name || "Unassigned";
    const performer = team.shifts[0]?.displayMember;
const isCrossStore = (performer?.storeAccess?.length ?? 0) > 1;

const memberName = isCrossStore
  ? "Cross Store Member"
  : (team.member?.name || performer?.name || team.shifts[0]?.checkin?.user?.name || "Unassigned");
    const aggr = team.shifts.reduce((acc, s) => {
        const st = s.stats || {};
        acc.deposits += st.totalDeposits || 0;
        acc.cashouts += st.totalCashouts || 0;
        acc.bonuses += st.totalBonuses || 0;
        acc.profit += st.netProfit || 0;
        acc.players += st.playersAdded || 0;
        acc.duration += s.duration || 0;
        acc.expenses += st.totalExpenses || 0;
        acc.takeouts += st.totalTakeouts || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, players: 0, duration: 0, expenses: 0, takeouts: 0 });
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
                            <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{ROLE_LABEL[team.role] || team.role}</span>
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
                        ...(aggr.expenses > 0 ? [{ label: "Expenses", val: fmtMoney(aggr.expenses), color: "#b45309", bg: "#fffbeb" }] : []),
                        ...(aggr.takeouts > 0 ? [{ label: "Takeouts", val: fmtMoney(aggr.takeouts), color: "#991b1b", bg: "#fff1f2" }] : []),
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
                <ShiftDetail key={shift.id} shift={shift} index={si} total={team.shifts.length} />
            ))}
        </div>
    );
}

// ── Day Report Block ──────────────────────────────────────────
function DayReportBlock({ report, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const s = report.summary || {};
    const dayLabel = fmtDate(report.date + "T12:00:00");
    const dayExpenses = aggregateDayExpenses(report);
    const dayTakeouts = aggregateDayTakeouts(report);
    const dayGameChanges = aggregateDayGameChanges(report);
    const dayWalletChanges = aggregateDayWalletChanges(report);
    const totalExpenses = dayExpenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    const totalTakeouts = dayTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    return (
        <div style={{ ...CARD, overflow: "hidden" }}>
            <div onClick={() => setExpanded(v => !v)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", background: "#f8fafc", borderBottom: expanded ? "1px solid #e2e8f0" : "none", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar style={{ width: "17px", height: "17px", color: "#2563eb" }} /></div>
                    <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>{dayLabel}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            {s.totalShifts ?? 0} shift{s.totalShifts !== 1 ? "s" : ""} · {s.transactionCount ?? 0} txns
                            {dayExpenses.length > 0 && <span style={{ marginLeft: "6px", color: "#b45309" }}>· {dayExpenses.length} expense{dayExpenses.length !== 1 ? "s" : ""}</span>}
                            {dayTakeouts.length > 0 && <span style={{ marginLeft: "6px", color: "#991b1b" }}>· {dayTakeouts.length} takeout{dayTakeouts.length !== 1 ? "s" : ""}</span>}
                            {s.activeShifts > 0 && <span style={{ marginLeft: "6px", color: "#22c55e", fontWeight: "700" }}>● {s.activeShifts} live</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                        { label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#dc2626", bg: "#fee2e2" },
                        { label: "Profit", val: fmtMoney(s.netProfit), color: (s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626", bg: (s.netProfit ?? 0) >= 0 ? "#f0fdf4" : "#fee2e2" },
                        ...(totalExpenses > 0 ? [{ label: "Expenses", val: fmtMoney(totalExpenses), color: "#b45309", bg: "#fffbeb" }] : []),
                        ...(totalTakeouts > 0 ? [{ label: "Takeouts", val: fmtMoney(totalTakeouts), color: "#991b1b", bg: "#fff1f2" }] : []),
                    ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: "5px 11px", borderRadius: "7px", background: bg, display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{label}</span>
                            <span style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</span>
                        </div>
                    ))}
                    {expanded ? <ChevronUp style={{ width: "15px", height: "15px", color: "#94a3b8" }} /> : <ChevronDown style={{ width: "15px", height: "15px", color: "#94a3b8" }} />}
                </div>
            </div>
            {expanded && (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "10px" }}>
                        <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                        <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                        <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                        <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} valueColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} icon={(s.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown} accentColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} />
                        {totalExpenses > 0 && <StatCard label="Total Expenses" value={fmtMoney(totalExpenses)} valueColor="#b45309" icon={Receipt} accentColor="#b45309" sub={`${dayExpenses.length} items`} />}
                        {totalTakeouts > 0 && <StatCard label="Profit Takeouts" value={fmtMoney(totalTakeouts)} valueColor="#991b1b" icon={PiggyBank} accentColor="#991b1b" sub={`${dayTakeouts.length} takeout${dayTakeouts.length !== 1 ? "s" : ""}`} />}
                        <StatCard label="Tasks Done" value={s.tasksCompleted ?? 0} icon={CheckCircle} accentColor="#16a34a" />
                        <StatCard label="Transactions" value={s.transactionCount ?? 0} icon={Activity} accentColor="#2563eb" />
                        <StatCard label="Shifts" value={s.totalShifts ?? 0} sub={`${s.activeShifts ?? 0} active`} icon={Clock} accentColor="#475569" />
                    </div>
                    {(dayGameChanges.length > 0 || dayWalletChanges.length > 0) && <DayGameChangesSection gameChanges={dayGameChanges} wallets={dayWalletChanges} />}
                    {dayExpenses.length > 0 && <DayExpensesSection expenses={dayExpenses} />}
                    {dayTakeouts.length > 0 && <DayTakeoutsSection takeouts={dayTakeouts} />}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><Users style={{ width: "12px", height: "12px" }} /> Team Shifts</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(report.teams || []).map(team => <MemberShiftSection key={team.role} team={team} />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Range Summary Cards ───────────────────────────────────────
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
        const dayExp = aggregateDayExpenses(r);
        const dayTake = aggregateDayTakeouts(r);
        acc.expenses += dayExp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
        acc.takeouts += dayTake.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
        acc.ptsReloaded += dayExp.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0, expenses: 0, takeouts: 0, ptsReloaded: 0 });
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "10px" }}>
            <StatCard label="Total Deposits" value={fmtMoney(totals.deposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" sub={`across ${reports.length} days`} />
            <StatCard label="Total Cashouts" value={fmtMoney(totals.cashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
            <StatCard label="Total Bonuses" value={fmtMoney(totals.bonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
            <StatCard label="Net Profit" value={fmtMoney(totals.profit)} valueColor={totals.profit >= 0 ? "#16a34a" : "#dc2626"} icon={totals.profit >= 0 ? TrendingUp : TrendingDown} accentColor={totals.profit >= 0 ? "#16a34a" : "#dc2626"} sub="Deposits − Cashouts" />
            {totals.expenses > 0 && <StatCard label="Total Expenses" value={fmtMoney(totals.expenses)} valueColor="#b45309" icon={Receipt} accentColor="#b45309" sub={totals.ptsReloaded > 0 ? `+${totals.ptsReloaded} pts reloaded` : undefined} />}
            {totals.takeouts > 0 && <StatCard label="Profit Takeouts" value={fmtMoney(totals.takeouts)} valueColor="#991b1b" icon={PiggyBank} accentColor="#991b1b" />}
            <StatCard label="Total Shifts" value={totals.shifts} icon={Clock} accentColor="#475569" />
            <StatCard label="Transactions" value={totals.transactions} icon={Activity} accentColor="#2563eb" />
            <StatCard label="Tasks Done" value={totals.tasks} icon={CheckCircle} accentColor="#16a34a" />
            <StatCard label="Days Covered" value={reports.length} icon={CalendarRange} accentColor="#7c3aed" />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// FILTER VIEWS (with sub-date filters)
// ══════════════════════════════════════════════════════════════

// ── Expenses Filter View ──────────────────────────────────────
function ExpensesFilterView({ expenses, rangeMode }) {
    const [catFilter, setCatFilter] = useState("ALL");
    const [subFrom, setSubFrom] = useState("");
    const [subTo, setSubTo] = useState("");

    if (!expenses?.length) return (
        <div style={{ ...CARD, padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <Receipt style={{ width: "32px", height: "32px", margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>No expenses found</div>
            <div style={{ fontSize: "12px" }}>No expenses recorded in the selected period.</div>
        </div>
    );

    const categories = [...new Set(expenses.map(e => e.category || "OTHER"))];

    // Sub-date + category filter
    const filtered = useMemo(() => expenses.filter(e => {
        const dateStr = e.createdAt || (e._date ? e._date + "T12:00:00" : null);
        if (!inDateRange(dateStr, subFrom, subTo)) return false;
        if (catFilter !== "ALL" && (e.category || "OTHER") !== catFilter) return false;
        return true;
    }), [expenses, catFilter, subFrom, subTo]);

    const total = filtered.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    const totalPaid = filtered.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);
    const totalPts = filtered.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);

    const byCat = expenses.reduce((acc, e) => {
        const c = e.category || "OTHER";
        if (!acc[c]) acc[c] = { count: 0, total: 0 };
        acc[c].count++;
        acc[c].total += parseFloat(e.amount ?? 0);
        return acc;
    }, {});

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                <StatCard label="Total Expense Cost" value={fmtMoney(expenses.reduce((s,e)=>s+parseFloat(e.amount??0),0))} valueColor="#b45309" icon={Receipt} accentColor="#b45309" sub={`${expenses.length} items total`} />
                <StatCard label="Wallet Paid Out" value={fmtMoney(expenses.reduce((s,e)=>s+parseFloat(e.paymentMade??0),0))} valueColor="#dc2626" icon={Wallet} accentColor="#dc2626" />
                <StatCard label="Points Reloaded" value={`+${expenses.reduce((s,e)=>s+(e.pointsAdded??0),0)} pts`} valueColor="#7c3aed" icon={Gamepad2} accentColor="#7c3aed" />
                <StatCard label="Categories" value={categories.length} icon={Filter} accentColor="#64748b" />
            </div>

            {/* Category breakdown */}
            {Object.keys(byCat).length > 0 && (
                <div style={{ ...CARD, padding: "14px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>By Category</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {Object.entries(byCat).map(([cat, { count, total: ct }]) => (
                            <div key={cat} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fffbeb", border: "1px solid #fde68a", fontSize: "12px" }}>
                                <span style={{ fontWeight: "700", color: "#b45309" }}>{cat.replace(/_/g, " ")}</span>
                                <span style={{ color: "#64748b", marginLeft: "6px" }}>{count}× · {fmtMoney(ct)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sub-date filter */}
            <SubDateFilter fromDate={subFrom} toDate={subTo} onFrom={setSubFrom} onTo={setSubTo} count={filtered.length} totalCount={expenses.length} label="expenses" />

            {/* Category filter */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Category:</span>
                {["ALL", ...categories].map(c => (
                    <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: catFilter === c ? "#b45309" : "#fff", color: catFilter === c ? "#fff" : "#64748b", borderColor: catFilter === c ? "#b45309" : "#e2e8f0" }}>
                        {c === "ALL" ? "All Categories" : c.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            {/* Full table */}
            <div style={{ ...CARD, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#fffbeb", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Receipt style={{ width: "14px", height: "14px", color: "#b45309" }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#b45309", textTransform: "uppercase" }}>
                            Expenses ({filtered.length}{catFilter !== "ALL" ? ` · ${catFilter.replace(/_/g," ")}` : ""}{(subFrom || subTo) ? " · Filtered" : ""})
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "800", color: "#b45309" }}>Cost: −{fmtMoney(total)}</span>
                        {totalPaid > 0 && <span style={{ fontWeight: "700", color: "#dc2626" }}>Paid: −{fmtMoney(totalPaid)}</span>}
                        {totalPts > 0 && <span style={{ color: "#7c3aed", fontWeight: "700" }}>+{totalPts} pts</span>}
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No expenses match the current filters.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    {[...(rangeMode ? ["Date"] : []), "Time", "Shift", "Details", "Category", "Game", "Amount $", "Pts Added", "Wallet Paid", "Notes"].map(h => (
                                        <th key={h} style={TH}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, i) => (
                                    <tr key={e.id ?? i} onMouseEnter={ev => ev.currentTarget.style.background = "#fefce8"} onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                                        {rangeMode && <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", fontWeight: "600" }}>{fmtDateShort((e._date || e.createdAt?.split("T")[0] || "") + "T12:00:00")}</td>}
                                        <td style={{ ...TD, fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(e.createdAt)}</td>
                                        <td style={TD}><Badge label={ROLE_LABEL[e._teamRole] || e._teamRole || "—"} bg="#f8fafc" color="#64748b" /></td>
                                        <td style={{ ...TD, fontWeight: "600" }}>{e.details}</td>
                                        <td style={TD}><Badge label={(e.category || "—").replace(/_/g, " ")} bg="#fffbeb" color="#b45309" /></td>
                                        <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{e.game?.name || "—"}</td>
                                        <td style={{ ...TD, fontWeight: "700", color: "#b45309" }}>{fmtMoney(e.amount ?? 0)}</td>
                                        <td style={{ ...TD, color: "#7c3aed", fontWeight: "600" }}>{(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : "—"}</td>
                                        <td style={{ ...TD, fontWeight: "700", color: "#dc2626" }}>{parseFloat(e.paymentMade ?? 0) > 0 ? `−${fmtMoney(e.paymentMade)}` : "—"}</td>
                                        <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{e.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: "#fef9c3" }}>
                                    <td colSpan={rangeMode ? 6 : 5} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#92400e" }}>
                                        Showing {filtered.length} of {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                                    </td>
                                    <td style={{ ...TD, fontWeight: "800", color: "#b45309" }}>{fmtMoney(total)}</td>
                                    <td style={{ ...TD, fontWeight: "700", color: "#7c3aed" }}>{totalPts > 0 ? `+${totalPts} pts` : "—"}</td>
                                    <td style={{ ...TD, fontWeight: "800", color: "#dc2626" }}>{totalPaid > 0 ? `−${fmtMoney(totalPaid)}` : "—"}</td>
                                    <td style={TD} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Profit Takeouts Filter View ───────────────────────────────
function TakeoutsFilterView({ takeouts, rangeMode }) {
    const [methodFilter, setMethodFilter] = useState("ALL");
    const [subFrom, setSubFrom] = useState("");
    const [subTo, setSubTo] = useState("");

    if (!takeouts?.length) return (
        <div style={{ ...CARD, padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <PiggyBank style={{ width: "32px", height: "32px", margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>No profit takeouts found</div>
            <div style={{ fontSize: "12px" }}>No profit takeouts recorded in the selected period.</div>
        </div>
    );

    const methods = [...new Set(takeouts.map(t => t.method || "Cash"))];

    const filtered = useMemo(() => takeouts.filter(t => {
        const dateStr = t.takenAt || t._shiftTime || (t._date ? t._date + "T12:00:00" : null);
        if (!inDateRange(dateStr, subFrom, subTo)) return false;
        if (methodFilter !== "ALL" && (t.method || "Cash") !== methodFilter) return false;
        return true;
    }), [takeouts, methodFilter, subFrom, subTo]);

    const total = filtered.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

    const byMethod = takeouts.reduce((acc, t) => {
        const m = t.method || "Cash";
        if (!acc[m]) acc[m] = { count: 0, total: 0 };
        acc[m].count++;
        acc[m].total += parseFloat(t.amount ?? 0);
        return acc;
    }, {});

    const byPerson = takeouts.reduce((acc, t) => {
        const p = t.takenBy || "Unknown";
        if (!acc[p]) acc[p] = { count: 0, total: 0 };
        acc[p].count++;
        acc[p].total += parseFloat(t.amount ?? 0);
        return acc;
    }, {});

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                <StatCard label="Total Takeouts" value={fmtMoney(takeouts.reduce((s,t)=>s+parseFloat(t.amount??0),0))} valueColor="#991b1b" icon={PiggyBank} accentColor="#991b1b" sub={`${takeouts.length} records total`} />
                {Object.entries(byMethod).map(([method, { count, total: mt }]) => (
                    <StatCard key={method} label={method} value={fmtMoney(mt)} valueColor="#991b1b" icon={CreditCard} accentColor="#dc2626" sub={`${count} takeout${count !== 1 ? "s" : ""}`} />
                ))}
                <StatCard label="Recipients" value={Object.keys(byPerson).length} icon={Users} accentColor="#64748b" sub="distinct payees" />
            </div>

            {/* Per-person breakdown */}
            {Object.keys(byPerson).length > 0 && (
                <div style={{ ...CARD, padding: "14px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>By Recipient</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {Object.entries(byPerson).sort((a,b)=>b[1].total-a[1].total).map(([person, { count, total: pt }]) => (
                            <div key={person} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fff1f2", border: "1px solid #fecdd3", fontSize: "12px" }}>
                                <span style={{ fontWeight: "700", color: "#991b1b" }}>{person}</span>
                                <span style={{ color: "#64748b", marginLeft: "6px" }}>{count}× · {fmtMoney(pt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sub-date filter */}
            <SubDateFilter fromDate={subFrom} toDate={subTo} onFrom={setSubFrom} onTo={setSubTo} count={filtered.length} totalCount={takeouts.length} label="takeouts" />

            {/* Method filter */}
            {methods.length > 1 && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Method:</span>
                    {["ALL", ...methods].map(m => (
                        <button key={m} onClick={() => setMethodFilter(m)} style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: methodFilter === m ? "#991b1b" : "#fff", color: methodFilter === m ? "#fff" : "#64748b", borderColor: methodFilter === m ? "#991b1b" : "#e2e8f0" }}>
                            {m === "ALL" ? "All Methods" : m}
                        </button>
                    ))}
                </div>
            )}

            {/* Full table */}
            <div style={{ ...CARD, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#fff1f2", borderBottom: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <PiggyBank style={{ width: "14px", height: "14px", color: "#991b1b" }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase" }}>
                            Profit Takeouts ({filtered.length}{methodFilter !== "ALL" ? ` · ${methodFilter}` : ""}{(subFrom || subTo) ? " · Filtered" : ""})
                        </span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#991b1b" }}>Total: −{fmtMoney(total)}</span>
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No takeouts match the current filters.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    {[...(rangeMode ? ["Date"] : []), "Time", "Shift", "Taken By", "Method", "Amount", "Wallet", "Notes"].map(h => (
                                        <th key={h} style={TH}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => (
                                    <tr key={t.id ?? i} onMouseEnter={ev => ev.currentTarget.style.background = "#fff5f5"} onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                                        {rangeMode && <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", fontWeight: "600" }}>{fmtDateShort((t._date || (t.takenAt||"").split("T")[0] || "") + "T12:00:00")}</td>}
                                        <td style={{ ...TD, fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(t.takenAt || t._shiftTime)}</td>
                                        <td style={TD}><Badge label={ROLE_LABEL[t._teamRole] || t._teamRole || "—"} bg="#f8fafc" color="#64748b" /></td>
                                        <td style={{ ...TD, fontWeight: "700" }}>{t.takenBy}</td>
                                        <td style={TD}><Badge label={t.method || "Cash"} bg="#fff1f2" color="#991b1b" /></td>
                                        <td style={{ ...TD, fontWeight: "800", color: "#991b1b", fontSize: "14px" }}>−{fmtMoney(t.amount)}</td>
                                        <td style={{ ...TD, fontSize: "12px", color: "#64748b" }}>{t.walletId ? `Wallet #${t.walletId}` : "—"}</td>
                                        <td style={{ ...TD, fontSize: "11px", color: "#94a3b8" }}>{t.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: "#fee2e2" }}>
                                    <td colSpan={rangeMode ? 5 : 4} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#991b1b" }}>
                                        Showing {filtered.length} of {takeouts.length} takeout{takeouts.length !== 1 ? "s" : ""}
                                    </td>
                                    <td style={{ ...TD, fontWeight: "800", color: "#991b1b", fontSize: "14px" }}>−{fmtMoney(total)}</td>
                                    <td colSpan={2} style={TD} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Transactions Filter View ──────────────────────────────────
function TransactionsFilterView({ transactions, rangeMode }) {
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [teamFilter, setTeamFilter] = useState("ALL");
    const [subFrom, setSubFrom] = useState("");
    const [subTo, setSubTo] = useState("");

    if (!transactions?.length) return (
        <div style={{ ...CARD, padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <Activity style={{ width: "32px", height: "32px", margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>No transactions found</div>
            <div style={{ fontSize: "12px" }}>No transactions recorded in the selected period.</div>
        </div>
    );

    const filtered = useMemo(() => transactions.filter(t => {
        if (!inDateRange(t.createdAt, subFrom, subTo)) return false;
        if (typeFilter !== "ALL" && t.type !== typeFilter && t.displayType !== typeFilter) return false;
        if (teamFilter !== "ALL" && t._teamRole !== teamFilter) return false;
        return true;
    }), [transactions, typeFilter, teamFilter, subFrom, subTo]);

    const deposits = transactions.filter(t => t.type === "DEPOSIT");
    const cashouts = transactions.filter(t => t.type === "WITHDRAWAL");
    const bonuses = transactions.filter(t => t.type === "BONUS");
    const totalDep = deposits.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const totalCash = cashouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const totalBonus = bonuses.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const teams = [...new Set(transactions.map(t => t._teamRole).filter(Boolean))];

    const TYPE_TABS = [
        { id: "ALL", label: `All (${transactions.length})` },
        { id: "DEPOSIT", label: `Deposits (${deposits.length})`, color: "#16a34a" },
        { id: "WITHDRAWAL", label: `Cashouts (${cashouts.length})`, color: "#dc2626" },
        { id: "BONUS", label: `Bonuses (${bonuses.length})`, color: "#c2410c" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                <StatCard label="Total Deposits" value={fmtMoney(totalDep)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" sub={`${deposits.length} txns`} />
                <StatCard label="Total Cashouts" value={fmtMoney(totalCash)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" sub={`${cashouts.length} txns`} />
                <StatCard label="Total Bonuses" value={fmtMoney(totalBonus)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" sub={`${bonuses.length} txns`} />
                <StatCard label="Net Profit" value={fmtMoney(totalDep - totalCash)} valueColor={totalDep - totalCash >= 0 ? "#16a34a" : "#dc2626"} icon={TrendingUp} accentColor="#16a34a" sub="Deposits − Cashouts" />
            </div>

            {/* Sub-date filter */}
            <SubDateFilter fromDate={subFrom} toDate={subTo} onFrom={setSubFrom} onTo={setSubTo} count={filtered.length} totalCount={transactions.length} label="transactions" />

            {/* Type + Team filters */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {TYPE_TABS.map(({ id, label, color }) => (
                        <button key={id} onClick={() => setTypeFilter(id)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: typeFilter === id ? (color || "#0f172a") : "#fff", color: typeFilter === id ? "#fff" : "#64748b", borderColor: typeFilter === id ? (color || "#0f172a") : "#e2e8f0" }}>
                            {label}
                        </button>
                    ))}
                </div>
                {teams.length > 1 && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {["ALL", ...teams].map(t => (
                            <button key={t} onClick={() => setTeamFilter(t)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: teamFilter === t ? "#475569" : "#fff", color: teamFilter === t ? "#fff" : "#64748b", borderColor: teamFilter === t ? "#475569" : "#e2e8f0" }}>
                                {t === "ALL" ? "All Teams" : ROLE_LABEL[t] || t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={{ ...CARD, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity style={{ width: "14px", height: "14px", color: "#64748b" }} />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase" }}>
                        Transactions ({filtered.length}{(subFrom || subTo || typeFilter !== "ALL" || teamFilter !== "ALL") ? " · Filtered" : ""})
                    </span>
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions match the current filters.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    {[...(rangeMode ? ["Date"] : []), "Time", "Shift", "Player", "Type", "Game / Wallet", "Amount", "Fee", "Status"].map(h => (
                                        <th key={h} style={{ ...TH, textAlign: h === "Amount" || h === "Fee" ? "right" : "left" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => {
                                    const isDeposit = t.type === "DEPOSIT";
                                    const isCashout = t.type === "WITHDRAWAL";
                                    const isPending = t.status === "PENDING";
                                    const amtColor = isDeposit ? "#16a34a" : isCashout ? "#dc2626" : "#c2410c";
                                    return (
                                        <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""} style={{ opacity: isPending ? 0.8 : 1 }}>
                                            {rangeMode && <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", fontWeight: "600" }}>{fmtDateShort((t._date || (t.createdAt||"").split("T")[0] || "") + "T12:00:00")}</td>}
                                            <td style={{ ...TD, fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(t.createdAt)}</td>
                                            <td style={TD}><Badge label={ROLE_LABEL[t._teamRole] || t._teamRole || "—"} bg="#f8fafc" color="#64748b" /></td>
                                            <td style={TD}><div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || t.playerName || `#${t.userId}`}</div></td>
                                            <td style={TD}><DisplayTypeBadge type={t.displayType || t.type} /></td>
                                            <td style={{ ...TD, fontSize: "11px" }}>
                                                {t.gameName && <div style={{ fontWeight: "600" }}>{t.gameName}</div>}
                                                {t.walletMethod && <div style={{ color: "#64748b" }}>{t.walletMethod}{t.walletName ? ` · ${t.walletName}` : ""}</div>}
                                                {!t.gameName && !t.walletMethod && <span style={{ color: "#cbd5e1" }}>—</span>}
                                            </td>
                                            <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: amtColor }}>{fmtMoney(t.amount)}</td>
                                            <td style={{ ...TD, textAlign: "right" }}>{t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "11px" }}>−{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                                            <td style={TD}><Badge label={isPending ? "PENDING" : "DONE"} bg={isPending ? "#fef3c7" : "#dcfce7"} color={isPending ? "#b45309" : "#166634"} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: "#f8fafc" }}>
                                    <td colSpan={rangeMode ? 6 : 5} style={{ ...TD, fontWeight: "700", fontSize: "12px", color: "#475569" }}>
                                        Showing {filtered.length} of {transactions.length}
                                    </td>
                                    <td style={{ ...TD, textAlign: "right", fontWeight: "800" }}>
                                        <div style={{ color: "#16a34a", fontSize: "12px" }}>+{fmtMoney(filtered.filter(t=>t.type==="DEPOSIT").reduce((s,t)=>s+(t.amount??0),0))}</div>
                                        <div style={{ color: "#dc2626", fontSize: "11px" }}>−{fmtMoney(filtered.filter(t=>t.type==="WITHDRAWAL").reduce((s,t)=>s+(t.amount??0),0))}</div>
                                    </td>
                                    <td colSpan={2} style={TD} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// PDF EXPORT FUNCTIONS
// ══════════════════════════════════════════════════════════════

function printReport(report, date) {
    const win = window.open("", "_blank");
    if (!win) return;
    const { summary, teams, wallets, dayTasks } = report;
    const s = summary || {};
    const dayExpenses = aggregateDayExpenses(report);
    const dayTakeouts = aggregateDayTakeouts(report);
    const totalExpenses = dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount ?? 0), 0);
    const totalTakeouts = dayTakeouts.reduce((sum, t) => sum + parseFloat(t.amount ?? 0), 0);
    const totalPtsReloaded = dayExpenses.reduce((sum, e) => sum + (e.pointsAdded ?? 0), 0);

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
              <td style="color:#b45309;font-weight:700">${st.totalExpenses > 0 ? fmtMoney(st.totalExpenses) : "—"}</td>
              <td style="color:#991b1b;font-weight:700">${st.totalTakeouts > 0 ? fmtMoney(st.totalTakeouts) : "—"}</td>
              <td>${st.playersAdded ?? 0}</td>
              <td style="font-weight:700;color:${effort >= 8 ? "#16a34a" : effort >= 5 ? "#d97706" : "#dc2626"}">${effort != null ? `${effort}/10` : "—"}</td>
            </tr>`;
        })
    ).join("");

    const expenseRows = dayExpenses.map(e => `<tr>
        <td>${fmtTime(e.createdAt)}</td>
        <td>${ROLE_LABEL[e._teamRole] || e._teamRole || "—"}</td>
        <td><strong>${e.details}</strong></td>
        <td>${(e.category || "").replace(/_/g, " ")}</td>
        <td>${e.game?.name || "—"}</td>
        <td style="color:#b45309;font-weight:700">${fmtMoney(e.amount ?? 0)}</td>
        <td style="color:#7c3aed">${(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : "—"}</td>
        <td style="color:#dc2626">${parseFloat(e.paymentMade ?? 0) > 0 ? `−${fmtMoney(e.paymentMade)}` : "—"}</td>
        <td style="color:#94a3b8;font-size:10px">${e.notes || "—"}</td>
    </tr>`).join("");

    const takeoutRows = dayTakeouts.map(t => `<tr>
        <td>${fmtTime(t.takenAt || t._shiftTime)}</td>
        <td>${ROLE_LABEL[t._teamRole] || t._teamRole || "—"}</td>
        <td><strong>${t.takenBy}</strong></td>
        <td>${t.method || "Cash"}</td>
        <td style="color:#991b1b;font-weight:800">−${fmtMoney(t.amount)}</td>
        <td>${t.walletId ? `Wallet #${t.walletId}` : "—"}</td>
        <td style="color:#94a3b8;font-size:10px">${t.notes || "—"}</td>
    </tr>`).join("");

    const takeoutByMethod = dayTakeouts.reduce((acc, t) => {
        const m = t.method || "Cash"; acc[m] = (acc[m] || 0) + parseFloat(t.amount ?? 0); return acc;
    }, {});
    const takeoutMethodSummary = Object.entries(takeoutByMethod).map(([m, a]) => `${m}: <strong style="color:#991b1b">−${fmtMoney(a)}</strong>`).join(" | ");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Operations Report — ${date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;padding:28px;line-height:1.5}
  h1{font-size:20px;font-weight:800;margin-bottom:3px}
  h2{font-size:12px;font-weight:700;margin:24px 0 10px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
  .meta{font-size:11px;color:#64748b;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  .box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px;background:#fafbfc}
  .val{font-size:18px;font-weight:800;line-height:1.2}
  .lbl{font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
  .green{color:#16a34a}.red{color:#dc2626}.amber{color:#b45309}.navy{color:#991b1b}.purple{color:#7c3aed}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
  th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e2e8f0;letter-spacing:.4px}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tfoot td{background:#f8fafc;font-weight:700;border-top:2px solid #e2e8f0}
  .section{border-radius:8px;overflow:hidden;margin-bottom:18px}
  .section-exp{border:1px solid #fde68a}.section-exp-hdr{padding:9px 14px;background:#fef9c3;font-weight:700;color:#92400e;font-size:11px;text-transform:uppercase;border-bottom:1px solid #fde68a}
  .section-take{border:1px solid #fecdd3}.section-take-hdr{padding:9px 14px;background:#fee2e2;font-weight:700;color:#991b1b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #fecdd3;display:flex;justify-content:space-between;align-items:center}
  .section-wallet{border:1px solid #bfdbfe}.section-wallet-hdr{padding:9px 14px;background:#dbeafe;font-weight:700;color:#1d4ed8;font-size:11px;text-transform:uppercase;border-bottom:1px solid #bfdbfe}
  button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
  @media print{button{display:none}body{padding:16px}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
    <div>
      <h1>Daily Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT · Report Date: ${fmtDate(date + "T12:00:00")} · <strong>CONFIDENTIAL</strong></p>
    </div>
    <button onclick="window.print()">🖨 Print / Save PDF</button>
  </div>
  <h2>📊 Day Summary</h2>
  <div class="grid">
    <div class="box"><div class="val green">${fmtMoney(s.totalDeposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(s.totalCashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val" style="color:#c2410c">${fmtMoney(s.totalBonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${(s.netProfit || 0) >= 0 ? "green" : "red"}">${fmtMoney(s.netProfit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val amber">${fmtMoney(totalExpenses)}</div><div class="lbl">Total Expenses (${dayExpenses.length})</div></div>
    <div class="box"><div class="val navy">${fmtMoney(totalTakeouts)}</div><div class="lbl">Profit Takeouts (${dayTakeouts.length})</div></div>
    <div class="box"><div class="val">${s.totalShifts ?? 0}</div><div class="lbl">Shifts Logged</div></div>
    <div class="box"><div class="val">${s.tasksCompleted ?? 0}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val">${s.transactionCount ?? 0}</div><div class="lbl">Transactions</div></div>
    ${totalPtsReloaded > 0 ? `<div class="box"><div class="val purple">+${totalPtsReloaded}</div><div class="lbl">Points Reloaded</div></div>` : ""}
  </div>
  <h2>👥 Member Shift Summary</h2>
  <table><thead><tr>
    <th>Member</th><th>Start</th><th>End</th><th>Duration</th><th>Txns</th>
    <th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th>
    <th>Expenses</th><th>Takeouts</th><th>Players</th><th>Effort</th>
  </tr></thead>
  <tbody>${memberRows || '<tr><td colspan="13" style="text-align:center;color:#94a3b8;padding:16px">No shifts today</td></tr>'}</tbody>
  </table>
  ${dayExpenses.length > 0 ? `
  <div class="section section-exp">
    <div class="section-exp-hdr">🧾 Expenses — ${dayExpenses.length} item${dayExpenses.length !== 1 ? "s" : ""} · Total Cost: <strong>−${fmtMoney(totalExpenses)}</strong>${totalPtsReloaded > 0 ? ` · +${totalPtsReloaded} pts reloaded` : ""}</div>
    <table style="margin:0"><thead><tr>
      <th>Time</th><th>Shift</th><th>Details</th><th>Category</th><th>Game</th>
      <th>Expense $</th><th>Pts Added</th><th>Wallet Paid</th><th>Notes</th>
    </tr></thead>
    <tbody>${expenseRows}</tbody>
    <tfoot><tr>
      <td colspan="5"><strong>Total (${dayExpenses.length} expense${dayExpenses.length !== 1 ? "s" : ""})</strong></td>
      <td style="color:#b45309;font-weight:800">${fmtMoney(totalExpenses)}</td>
      <td style="color:#7c3aed">${totalPtsReloaded > 0 ? `+${totalPtsReloaded} pts` : "—"}</td>
      <td colspan="2"></td>
    </tr></tfoot>
    </table>
  </div>` : ""}
  ${dayTakeouts.length > 0 ? `
  <div class="section section-take">
    <div class="section-take-hdr">
      <span>💸 Profit Takeouts — ${dayTakeouts.length} record${dayTakeouts.length !== 1 ? "s" : ""}</span>
      <span>${takeoutMethodSummary || ""} &nbsp;|&nbsp; <strong>Total: −${fmtMoney(totalTakeouts)}</strong></span>
    </div>
    <table style="margin:0"><thead><tr>
      <th>Time</th><th>Shift</th><th>Taken By</th><th>Method</th><th>Amount</th><th>Wallet</th><th>Notes</th>
    </tr></thead>
    <tbody>${takeoutRows}</tbody>
    <tfoot><tr>
      <td colspan="4"><strong>Total (${dayTakeouts.length} takeout${dayTakeouts.length !== 1 ? "s" : ""})</strong></td>
      <td style="color:#991b1b;font-weight:800">−${fmtMoney(totalTakeouts)}</td>
      <td colspan="2"></td>
    </tr></tfoot>
    </table>
  </div>` : ""}
  ${(wallets?.length > 0) ? `
  <div class="section section-wallet">
    <div class="section-wallet-hdr">💳 Wallet Balances (End of Day)</div>
    <table style="margin:0"><thead><tr><th>Method</th><th>Account Name</th><th style="text-align:right">Balance</th></tr></thead>
    <tbody>${wallets.map(w => `<tr><td><strong>${w.method}</strong></td><td>${w.name}</td><td style="text-align:right;font-weight:800">${fmtMoney(w.balance)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="2"><strong>Total</strong></td><td style="text-align:right;font-weight:800">${fmtMoney(wallets.reduce((s,w) => s + parseFloat(w.balance || 0), 0))}</td></tr></tfoot>
    </table>
  </div>` : ""}
  <p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:12px">
    Confidential · Generated by Operations Dashboard · ${new Date().toISOString()}
  </p>
</body></html>`);
    win.document.close();
}

function printRangeReport(reports, startDate, endDate) {
    const win = window.open("", "_blank");
    if (!win) return;
    const totals = reports.reduce((acc, r) => {
        const s = r.summary || {};
        acc.deposits += s.totalDeposits || 0; acc.cashouts += s.totalCashouts || 0;
        acc.bonuses += s.totalBonuses || 0; acc.profit += s.netProfit || 0;
        acc.shifts += s.totalShifts || 0; acc.transactions += s.transactionCount || 0;
        acc.tasks += s.tasksCompleted || 0;
        const dayExp = aggregateDayExpenses(r); const dayTake = aggregateDayTakeouts(r);
        acc.expenses += dayExp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
        acc.takeouts += dayTake.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
        acc.ptsReloaded += dayExp.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
        acc.expenseCount += dayExp.length; acc.takeoutCount += dayTake.length;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0, expenses: 0, takeouts: 0, ptsReloaded: 0, expenseCount: 0, takeoutCount: 0 });

    const dayRows = reports.map(r => {
        const s = r.summary || {};
        const dayExp = aggregateDayExpenses(r); const dayTake = aggregateDayTakeouts(r);
        const expTotal = dayExp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
        const takeTotal = dayTake.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
        return `<tr>
          <td><b>${fmtDateShort(r.date + "T12:00:00")}</b></td>
          <td style="color:#16a34a;font-weight:700">${fmtMoney(s.totalDeposits)}</td>
          <td style="color:#dc2626;font-weight:700">${fmtMoney(s.totalCashouts)}</td>
          <td style="color:#c2410c;font-weight:700">${fmtMoney(s.totalBonuses)}</td>
          <td style="font-weight:800;color:${(s.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(s.netProfit)}</td>
          <td style="color:#b45309;font-weight:700">${expTotal > 0 ? fmtMoney(expTotal) : "—"}</td>
          <td style="color:#991b1b;font-weight:700">${takeTotal > 0 ? `−${fmtMoney(takeTotal)}` : "—"}</td>
          <td>${s.totalShifts ?? 0}</td><td>${s.transactionCount ?? 0}</td><td>${s.tasksCompleted ?? 0}</td>
        </tr>`;
    }).join("");

    const allExpenses = reports.flatMap(r => aggregateDayExpenses(r).map(e => ({ ...e, _date: r.date })));
    const allTakeouts = reports.flatMap(r => aggregateDayTakeouts(r).map(t => ({ ...t, _date: r.date })));

    const allExpenseRows = allExpenses.map(e => `<tr>
        <td>${fmtDateShort(e._date + "T12:00:00")}</td><td>${fmtTime(e.createdAt)}</td>
        <td>${ROLE_LABEL[e._teamRole] || e._teamRole || "—"}</td>
        <td><strong>${e.details}</strong></td><td>${(e.category || "").replace(/_/g, " ")}</td>
        <td>${e.game?.name || "—"}</td>
        <td style="color:#b45309;font-weight:700">${fmtMoney(e.amount ?? 0)}</td>
        <td style="color:#7c3aed">${(e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : "—"}</td>
        <td style="color:#94a3b8;font-size:10px">${e.notes || "—"}</td>
    </tr>`).join("");

    const allTakeoutRows = allTakeouts.map(t => `<tr>
        <td>${fmtDateShort(t._date + "T12:00:00")}</td><td>${fmtTime(t.takenAt || t._shiftTime)}</td>
        <td>${ROLE_LABEL[t._teamRole] || t._teamRole || "—"}</td>
        <td><strong>${t.takenBy}</strong></td><td>${t.method || "Cash"}</td>
        <td style="color:#991b1b;font-weight:800">−${fmtMoney(t.amount)}</td>
        <td>${t.walletId ? `Wallet #${t.walletId}` : "—"}</td>
        <td style="color:#94a3b8;font-size:10px">${t.notes || "—"}</td>
    </tr>`).join("");

    const takeoutByMethod = allTakeouts.reduce((acc, t) => { const m = t.method || "Cash"; acc[m] = (acc[m] || 0) + parseFloat(t.amount ?? 0); return acc; }, {});
    const takeoutMethodSummary = Object.entries(takeoutByMethod).map(([m, a]) => `${m}: <strong style="color:#991b1b">−${fmtMoney(a)}</strong>`).join(" | ");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Range Report — ${startDate} to ${endDate}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#0f172a;padding:28px;line-height:1.5}
  h1{font-size:20px;font-weight:800;margin-bottom:3px}
  h2{font-size:12px;font-weight:700;margin:24px 0 10px;color:#374151;border-bottom:2px solid #e2e8f0;padding-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
  .meta{font-size:11px;color:#64748b;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  .box{border:1px solid #e2e8f0;border-radius:7px;padding:12px 14px;background:#fafbfc}
  .val{font-size:18px;font-weight:800;line-height:1.2}.lbl{font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
  .green{color:#16a34a}.red{color:#dc2626}.amber{color:#b45309}.navy{color:#991b1b}.purple{color:#7c3aed}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
  th{background:#f8fafc;text-align:left;padding:7px 10px;font-weight:700;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  .total-row td{background:#f8fafc;font-weight:700;border-top:2px solid #e2e8f0}
  .section{border-radius:8px;overflow:hidden;margin-bottom:18px}
  .section-exp{border:1px solid #fde68a}.section-exp-hdr{padding:9px 14px;background:#fef9c3;font-weight:700;color:#92400e;font-size:11px;text-transform:uppercase;border-bottom:1px solid #fde68a}
  .section-take{border:1px solid #fecdd3}.section-take-hdr{padding:9px 14px;background:#fee2e2;font-weight:700;color:#991b1b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #fecdd3;display:flex;justify-content:space-between;align-items:center}
  button{padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer}
  @media print{button{display:none}body{padding:16px}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
    <div>
      <h1>Range Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT · ${fmtDateShort(startDate + "T12:00:00")} – ${fmtDateShort(endDate + "T12:00:00")} · ${reports.length} days · <strong>CONFIDENTIAL</strong></p>
    </div>
    <button onclick="window.print()">🖨 Print / Save PDF</button>
  </div>
  <h2>📊 Range Totals</h2>
  <div class="grid">
    <div class="box"><div class="val green">${fmtMoney(totals.deposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(totals.cashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val" style="color:#c2410c">${fmtMoney(totals.bonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${totals.profit >= 0 ? "green" : "red"}">${fmtMoney(totals.profit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val amber">${fmtMoney(totals.expenses)}</div><div class="lbl">Expenses (${totals.expenseCount})</div></div>
    <div class="box"><div class="val navy">−${fmtMoney(totals.takeouts)}</div><div class="lbl">Profit Takeouts (${totals.takeoutCount})</div></div>
    <div class="box"><div class="val">${totals.shifts}</div><div class="lbl">Total Shifts</div></div>
    <div class="box"><div class="val">${totals.transactions}</div><div class="lbl">Total Transactions</div></div>
    <div class="box"><div class="val">${totals.tasks}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val purple">${reports.length}</div><div class="lbl">Days Covered</div></div>
    ${totals.ptsReloaded > 0 ? `<div class="box"><div class="val purple">+${totals.ptsReloaded}</div><div class="lbl">Pts Reloaded</div></div>` : ""}
  </div>
  <h2>📅 Day-by-Day Breakdown</h2>
  <table>
    <thead><tr><th>Date</th><th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th><th>Expenses</th><th>Takeouts</th><th>Shifts</th><th>Txns</th><th>Tasks</th></tr></thead>
    <tbody>${dayRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td><b>TOTAL (${reports.length} days)</b></td>
        <td style="color:#16a34a;font-weight:800">${fmtMoney(totals.deposits)}</td>
        <td style="color:#dc2626;font-weight:800">${fmtMoney(totals.cashouts)}</td>
        <td style="color:#c2410c;font-weight:800">${fmtMoney(totals.bonuses)}</td>
        <td style="font-weight:800;color:${totals.profit >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(totals.profit)}</td>
        <td style="color:#b45309;font-weight:800">${totals.expenses > 0 ? fmtMoney(totals.expenses) : "—"}</td>
        <td style="color:#991b1b;font-weight:800">${totals.takeouts > 0 ? `−${fmtMoney(totals.takeouts)}` : "—"}</td>
        <td>${totals.shifts}</td><td>${totals.transactions}</td><td>${totals.tasks}</td>
      </tr>
    </tfoot>
  </table>
  ${allExpenses.length > 0 ? `
  <div class="section section-exp">
    <div class="section-exp-hdr">🧾 All Expenses — ${allExpenses.length} items · Total: <strong>−${fmtMoney(totals.expenses)}</strong>${totals.ptsReloaded > 0 ? ` · +${totals.ptsReloaded} pts` : ""}</div>
    <table style="margin:0"><thead><tr>
      <th>Date</th><th>Time</th><th>Shift</th><th>Details</th><th>Category</th><th>Game</th><th>Amount</th><th>Pts Added</th><th>Notes</th>
    </tr></thead>
    <tbody>${allExpenseRows}</tbody>
    <tfoot><tr>
      <td colspan="6"><strong>Total (${allExpenses.length} expenses / ${reports.length} days)</strong></td>
      <td style="color:#b45309;font-weight:800">${fmtMoney(totals.expenses)}</td>
      <td style="color:#7c3aed">${totals.ptsReloaded > 0 ? `+${totals.ptsReloaded} pts` : "—"}</td><td></td>
    </tr></tfoot>
    </table>
  </div>` : ""}
  ${allTakeouts.length > 0 ? `
  <div class="section section-take">
    <div class="section-take-hdr">
      <span>💸 All Profit Takeouts — ${allTakeouts.length} records</span>
      <span>${takeoutMethodSummary} | <strong>Total: −${fmtMoney(totals.takeouts)}</strong></span>
    </div>
    <table style="margin:0"><thead><tr>
      <th>Date</th><th>Time</th><th>Shift</th><th>Taken By</th><th>Method</th><th>Amount</th><th>Wallet</th><th>Notes</th>
    </tr></thead>
    <tbody>${allTakeoutRows}</tbody>
    <tfoot><tr>
      <td colspan="5"><strong>Total (${allTakeouts.length} takeouts / ${reports.length} days)</strong></td>
      <td style="color:#991b1b;font-weight:800">−${fmtMoney(totals.takeouts)}</td><td colspan="2"></td>
    </tr></tfoot>
    </table>
  </div>` : ""}
  <p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:12px">
    Confidential · Generated by Operations Dashboard · ${new Date().toISOString()}
  </p>
</body></html>`);
    win.document.close();
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function AdminReportPage() {
    const { add: toast } = useToast();
    const todayStr = toDateInput(new Date());

    const [mode, setMode] = useState("single");
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [report, setReport] = useState(null);
    const [rangeReports, setRangeReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [teamFilter, setTeamFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState("report");

    const fetchSingleReport = useCallback(async (date, role) => {
        setLoading(true);
        setError(null);
        try {
            const opts = { date };
            if (role && role !== "ALL") opts.teamRole = role;
            const data = await api.reports.getDailyReport(opts);
            setReport(data);
            setRangeReports([]);
        } catch (e) {
            setError(e.message || "Failed to load report. Check your connection.");
            toast(e.message || "Failed to load report", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRangeReports = useCallback(async (start, end, role) => {
        if (!start || !end || start > end) { toast("Please select a valid date range (start ≤ end)", "error"); return; }
        const dates = [];
        const cur = new Date(start + "T12:00:00");
        const last = new Date(end + "T12:00:00");
        while (cur <= last) { dates.push(toDateInput(cur)); cur.setDate(cur.getDate() + 1); }
        if (dates.length > 31) { toast("Date range cannot exceed 31 days", "error"); return; }
        setLoading(true);
        setError(null);
        setReport(null);
        try {
            const results = await Promise.all(dates.map(date => {
                const opts = { date };
                if (role && role !== "ALL") opts.teamRole = role;
                return api.reports.getDailyReport(opts).catch(() => null);
            }));
            const valid = results.filter(Boolean).sort((a, b) => a.date > b.date ? 1 : -1);
            setRangeReports(valid);
            if (valid.length === 0) setError("No data found for the selected range.");
        } catch (e) {
            setError(e.message || "Failed to load range report.");
            toast(e.message || "Failed to load range report", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mode === "single") fetchSingleReport(selectedDate, teamFilter);
        else fetchRangeReports(startDate, endDate, teamFilter);
    }, [mode, selectedDate, startDate, endDate, teamFilter]);

    const handleRefresh = () => {
        if (mode === "single") fetchSingleReport(selectedDate, teamFilter);
        else fetchRangeReports(startDate, endDate, teamFilter);
    };

    const handleExport = () => {
        if (mode === "single" && report) printReport(report, report.date);
        else if (mode === "range" && rangeReports.length > 0) printRangeReport(rangeReports, startDate, endDate);
    };

    const canExport = mode === "single" ? !!report : rangeReports.length > 0;
    const hasData = mode === "single" ? !!report : rangeReports.length > 0;
    const isRangeMode = mode === "range";
    const s = report?.summary || {};

    // Aggregated data for filter views
    const allFilterExpenses = useMemo(() => mode === "single" && report
        ? aggregateDayExpenses(report)
        : rangeReports.flatMap(r => aggregateDayExpenses(r).map(e => ({ ...e, _date: r.date }))),
        [mode, report, rangeReports]);

    const allFilterTakeouts = useMemo(() => mode === "single" && report
        ? aggregateDayTakeouts(report)
        : rangeReports.flatMap(r => aggregateDayTakeouts(r).map(t => ({ ...t, _date: r.date }))),
        [mode, report, rangeReports]);

    const allFilterTransactions = useMemo(() => mode === "single" && report
        ? aggregateDayTransactions(report)
        : rangeReports.flatMap(r => aggregateDayTransactions(r).map(t => ({ ...t, _date: r.date }))),
        [mode, report, rangeReports]);

    const dayExpenses = report ? aggregateDayExpenses(report) : [];
    const dayTakeouts = report ? aggregateDayTakeouts(report) : [];
    const dayGameChanges = report ? aggregateDayGameChanges(report) : [];
    const dayWalletChanges = report ? aggregateDayWalletChanges(report) : [];
    const totalExpenses = dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount ?? 0), 0);
    const totalTakeouts = dayTakeouts.reduce((sum, t) => sum + parseFloat(t.amount ?? 0), 0);
    const totalPtsReloaded = dayExpenses.reduce((sum, e) => sum + (e.pointsAdded ?? 0), 0);

    const headerSubtitle = loading ? "Loading…"
        : mode === "single" ? (report ? fmtDate(report.date + "T12:00:00") : "—")
        : rangeReports.length > 0 ? `${fmtDateShort(startDate + "T12:00:00")} – ${fmtDateShort(endDate + "T12:00:00")} (${rangeReports.length} days)`
        : "Select a date range";

    const VIEW_TABS = [
        { id: "report", label: "Full Report", icon: FileText },
        { id: "transactions", label: `Transactions${hasData ? ` (${allFilterTransactions.length})` : ""}`, icon: Activity },
        { id: "expenses", label: `Expenses${hasData ? ` (${allFilterExpenses.length})` : ""}`, icon: Receipt },
        { id: "takeouts", label: `Profit Takeouts${hasData ? ` (${allFilterTakeouts.length})` : ""}`, icon: PiggyBank },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

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
                        {/* Mode Toggle */}
                        <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", background: "#f8fafc" }}>
                            {[{ id: "single", label: "Single Day", icon: Calendar }, { id: "range", label: "Date Range", icon: CalendarRange }].map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => { setMode(id); setViewMode("report"); }} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 13px", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: mode === id ? "#0f172a" : "transparent", color: mode === id ? "#fff" : "#64748b" }}>
                                    <Icon style={{ width: "13px", height: "13px" }} />{label}
                                </button>
                            ))}
                        </div>

                        {/* Date Inputs */}
                        {mode === "single" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                                <Calendar style={{ width: "13px", height: "13px", color: "#64748b" }} />
                                <input type="date" value={selectedDate} max={todayStr} onChange={e => setSelectedDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
                            </div>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                                <CalendarRange style={{ width: "13px", height: "13px", color: "#64748b" }} />
                                <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>→</span>
                                <input type="date" value={endDate} min={startDate} max={todayStr} onChange={e => setEndDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: "12px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
                            </div>
                        )}

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

                        <button onClick={handleRefresh} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 13px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", color: "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                            <RefreshCw style={{ width: "13px", height: "13px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
                        </button>

                        <button onClick={handleExport} disabled={!canExport || loading} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "9px 16px", border: "none", borderRadius: "8px", background: "#0ea5e9", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: canExport ? "pointer" : "not-allowed", opacity: canExport ? 1 : 0.5 }}>
                            <Download style={{ width: "13px", height: "13px" }} />
                            {mode === "range" ? "Export Range PDF" : "Export PDF"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    <RefreshCw style={{ width: 18, height: 18, margin: "0 auto 10px", display: "block", animation: "spin .8s linear infinite" }} />
                    {mode === "range" ? `Fetching reports for date range…` : "Generating report…"}
                </div>
            )}

            {/* ── Error ── */}
            {!loading && error && !hasData && (
                <div style={{ ...CARD, padding: "32px", textAlign: "center" }}>
                    <AlertCircle style={{ width: "32px", height: "32px", margin: "0 auto 12px", display: "block", color: "#dc2626", opacity: 0.6 }} />
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>Could not load report</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>{error}</div>
                    <button onClick={handleRefresh} style={{ padding: "8px 20px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>Try Again</button>
                </div>
            )}

            {/* ── View Mode Tabs ── */}
            {hasData && !loading && (
                <div style={{ ...CARD, overflow: "hidden" }}>
                    <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", overflowX: "auto" }}>
                        {VIEW_TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = viewMode === id;
                            const accentColors = { report: "#0ea5e9", transactions: "#2563eb", expenses: "#b45309", takeouts: "#991b1b" };
                            const accent = accentColors[id] || "#0f172a";
                            return (
                                <button key={id} onClick={() => setViewMode(id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 20px", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: isActive ? "#fff" : "transparent", color: isActive ? accent : "#94a3b8", borderBottom: `2px solid ${isActive ? accent : "transparent"}`, whiteSpace: "nowrap", transition: "all .15s" }}>
                                    <Icon style={{ width: "13px", height: "13px" }} />
                                    {label}
                                </button>
                            );
                        })}
                        <div style={{ flex: 1 }} />
                        {viewMode !== "report" && (
                            <div style={{ display: "flex", alignItems: "center", padding: "0 16px", gap: "6px" }}>
                                <Filter style={{ width: "12px", height: "12px", color: "#94a3b8" }} />
                                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
                                    {isRangeMode ? `${rangeReports.length}-day range` : fmtDateShort(selectedDate + "T12:00:00")}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Filter Views ── */}
            {!loading && hasData && viewMode === "expenses" && (
                <ExpensesFilterView expenses={allFilterExpenses} rangeMode={isRangeMode} />
            )}
            {!loading && hasData && viewMode === "takeouts" && (
                <TakeoutsFilterView takeouts={allFilterTakeouts} rangeMode={isRangeMode} />
            )}
            {!loading && hasData && viewMode === "transactions" && (
                <TransactionsFilterView transactions={allFilterTransactions} rangeMode={isRangeMode} />
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* SINGLE DAY — Full Report                              */}
            {/* ══════════════════════════════════════════════════════ */}
            {!loading && mode === "single" && report && viewMode === "report" && (
                <>
                    {/* Day Summary */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <BarChart2 style={{ width: "12px", height: "12px" }} /> Day Summary
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                            <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} valueColor="#16a34a" icon={ArrowUpRight} accentColor="#16a34a" />
                            <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} valueColor="#dc2626" icon={ArrowDownRight} accentColor="#dc2626" />
                            <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} valueColor="#c2410c" icon={Gift} accentColor="#c2410c" />
                            <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} valueColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} icon={(s.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown} accentColor={(s.netProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} />
                            {totalExpenses > 0 && <StatCard label="Total Expenses" value={fmtMoney(totalExpenses)} valueColor="#b45309" icon={Receipt} accentColor="#b45309" sub={`${dayExpenses.length} item${dayExpenses.length !== 1 ? "s" : ""}${totalPtsReloaded > 0 ? ` · +${totalPtsReloaded} pts` : ""}`} />}
                            {totalTakeouts > 0 && <StatCard label="Profit Takeouts" value={`−${fmtMoney(totalTakeouts)}`} valueColor="#991b1b" icon={PiggyBank} accentColor="#991b1b" sub={`${dayTakeouts.length} takeout${dayTakeouts.length !== 1 ? "s" : ""}`} />}
                            <StatCard label="Tasks Completed" value={s.tasksCompleted ?? 0} icon={CheckCircle} accentColor="#16a34a" />
                            <StatCard label="Transactions" value={s.transactionCount ?? 0} icon={Activity} accentColor="#2563eb" />
                            <StatCard label="Shifts Logged" value={s.totalShifts ?? 0} sub={`${s.activeShifts ?? 0} active`} icon={Clock} accentColor="#475569" />
                        </div>
                    </div>

                    {/* Balance Changes */}
                    {(dayGameChanges.length > 0 || dayWalletChanges.length > 0) && (
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Database style={{ width: "12px", height: "12px" }} /> Balance Changes (from Shift Snapshots)
                            </div>
                            <DayGameChangesSection gameChanges={dayGameChanges} wallets={dayWalletChanges} />
                        </div>
                    )}

                    {/* Expenses — All Shifts */}
                    {dayExpenses.length > 0 && (
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Receipt style={{ width: "12px", height: "12px" }} /> Expenses — All Shifts
                            </div>
                            <DayExpensesSection expenses={dayExpenses} />
                        </div>
                    )}

                    {/* Profit Takeouts — All Shifts */}
                    {dayTakeouts.length > 0 && (
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <PiggyBank style={{ width: "12px", height: "12px" }} /> Profit Takeouts — All Shifts
                            </div>
                            <DayTakeoutsSection takeouts={dayTakeouts} />
                        </div>
                    )}

                    {/* No expenses/takeouts placeholder */}
                    {dayExpenses.length === 0 && dayTakeouts.length === 0 && (
                        <div style={{ ...CARD, padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "3px solid #e2e8f0" }}>
                            <AlertCircle style={{ width: "16px", height: "16px", color: "#94a3b8", flexShrink: 0 }} />
                            <span style={{ fontSize: "13px", color: "#64748b" }}>
                                No expenses or profit takeouts recorded for this day.
                                {s.totalShifts === 0 && " No shifts were logged."}
                            </span>
                        </div>
                    )}

                    {/* Team Shift Reports */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users style={{ width: "12px", height: "12px" }} /> Team Shift Reports
                        </div>
                        {(report.teams || []).filter(t => t.shifts?.length > 0).length === 0 ? (
                            <div style={{ ...CARD, padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                No shift data found for this day. Shifts appear here once started and checked in.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {(report.teams || []).map(team => team.shifts?.length > 0 && <MemberShiftSection key={team.role} team={team} />)}
                            </div>
                        )}
                    </div>

                    {/* All Tasks */}
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

                    {/* Wallet Balances */}
                    {report.wallets?.length > 0 && (
                        <div style={{ ...CARD, overflow: "hidden" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                <Wallet style={{ width: "15px", height: "15px", color: "#64748b" }} />
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
            {/* DATE RANGE — Full Report                              */}
            {/* ══════════════════════════════════════════════════════ */}
            {!loading && mode === "range" && rangeReports.length > 0 && viewMode === "report" && (
                <>
                    {/* Range Totals */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <BarChart2 style={{ width: "12px", height: "12px" }} /> Range Totals — {rangeReports.length} Days
                        </div>
                        <RangeSummaryCards reports={rangeReports} />
                    </div>

                    {/* Day-by-Day Table */}
                    <div style={{ ...CARD, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                            <CalendarRange style={{ width: "15px", height: "15px", color: "#64748b" }} />
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Day-by-Day Breakdown</h3>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>{["Date", "Deposits", "Cashouts", "Bonuses", "Net Profit", "Expenses", "Takeouts", "Shifts", "Transactions", "Tasks"].map(h => (
                                        <th key={h} style={{ ...TH, textAlign: h === "Date" ? "left" : "right" }}>{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {rangeReports.map(r => {
                                        const s = r.summary || {};
                                        const profit = s.netProfit ?? 0;
                                        const dayExp = aggregateDayExpenses(r);
                                        const dayTake = aggregateDayTakeouts(r);
                                        const expTotal = dayExp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
                                        const takeTotal = dayTake.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
                                        return (
                                            <tr key={r.date} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                                                <td style={TD}><span style={{ fontWeight: "600" }}>{fmtDate(r.date + "T12:00:00")}</span></td>
                                                <td style={{ ...TD, textAlign: "right", color: "#16a34a", fontWeight: "700" }}>{fmtMoney(s.totalDeposits)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#dc2626", fontWeight: "700" }}>{fmtMoney(s.totalCashouts)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#c2410c", fontWeight: "700" }}>{fmtMoney(s.totalBonuses)}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(profit)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#b45309", fontWeight: expTotal > 0 ? "700" : "400" }}>{expTotal > 0 ? fmtMoney(expTotal) : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#991b1b", fontWeight: takeTotal > 0 ? "700" : "400" }}>{takeTotal > 0 ? `−${fmtMoney(takeTotal)}` : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
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
                                                const dayExp = aggregateDayExpenses(r);
                                                const dayTake = aggregateDayTakeouts(r);
                                                acc.deposits += s.totalDeposits || 0; acc.cashouts += s.totalCashouts || 0;
                                                acc.bonuses += s.totalBonuses || 0; acc.profit += s.netProfit || 0;
                                                acc.expenses += dayExp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
                                                acc.takeouts += dayTake.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
                                                acc.shifts += s.totalShifts || 0; acc.transactions += s.transactionCount || 0; acc.tasks += s.tasksCompleted || 0;
                                                return acc;
                                            }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, expenses: 0, takeouts: 0, shifts: 0, transactions: 0, tasks: 0 });
                                            return (<>
                                                <td style={{ ...TD, fontWeight: "700", color: "#475569" }}>TOTAL ({rangeReports.length} days)</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#16a34a", fontWeight: "800" }}>{fmtMoney(t.deposits)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#dc2626", fontWeight: "800" }}>{fmtMoney(t.cashouts)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#c2410c", fontWeight: "800" }}>{fmtMoney(t.bonuses)}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "800", color: t.profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmtMoney(t.profit)}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#b45309", fontWeight: "800" }}>{t.expenses > 0 ? fmtMoney(t.expenses) : "—"}</td>
                                                <td style={{ ...TD, textAlign: "right", color: "#991b1b", fontWeight: "800" }}>{t.takeouts > 0 ? `−${fmtMoney(t.takeouts)}` : "—"}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.shifts}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.transactions}</td>
                                                <td style={{ ...TD, textAlign: "right", fontWeight: "700" }}>{t.tasks}</td>
                                            </>);
                                        })()}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Daily Detail Blocks */}
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

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6}
            `}</style>
        </div>
    );
}
