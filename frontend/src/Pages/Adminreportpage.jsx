// pages/AdminReportPage.jsx
// Comprehensive shift report — shows EVERYTHING that happened between shift start/end:
// transactions, players added, bonuses granted, tasks completed (with metrics), per-member breakdown.
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Download, RefreshCw, Calendar, Users, TrendingUp,
  TrendingDown, Gift, CheckCircle, Clock, Zap, AlertCircle,
  Activity, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  DollarSign, Star, Shield, BarChart2, User, Target, List,
} from "lucide-react";
import { api } from "../api";

// ── Design tokens (matching AddTransactionsPage) ───────────────────
const CARD = {
  background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
  boxShadow: "0 2px 12px rgba(15,23,42,.07)",
};
const TH = {
  textAlign: "left", padding: "10px 16px", fontWeight: "700",
  color: "#64748b", fontSize: "11px", textTransform: "uppercase",
  letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc", whiteSpace: "nowrap",
};
const TD = {
  padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
  fontSize: "13px", color: "#0f172a", verticalAlign: "top",
};
const DIVIDER = { height: "1px", background: "#f1f5f9", margin: "20px 0" };

const ROLE_LABEL = { TEAM1: "Team 1", TEAM2: "Team 2", TEAM3: "Team 3", TEAM4: "Team 4" };
const ROLE_COLORS = {
  TEAM1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  TEAM2: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  TEAM3: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  TEAM4: { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
};

const fmtMoney = (n) =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime  = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtDate  = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—";
const toDateInput = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// ── Small components ───────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{ ...CARD, padding: "18px 20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: "18px", height: "18px", color: color.icon }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "21px", fontWeight: "800", color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", fontWeight: "500" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

function Pill({ label, value, bg, text, bold, icon: Icon }) {
  return (
    <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", background: bg, color: text, fontWeight: bold ? "700" : "600", display: "inline-flex", gap: "5px", alignItems: "center", whiteSpace: "nowrap" }}>
      {Icon && <Icon style={{ width: "10px", height: "10px" }} />}
      <span style={{ opacity: 0.75 }}>{label}</span> {value}
    </span>
  );
}

function ProgressBar({ pct, color = "#3b82f6" }) {
  return (
    <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    DEPOSIT:         { bg: "#dcfce7", text: "#166534" },
    WITHDRAWAL:      { bg: "#fee2e2", text: "#991b1b" },
    BONUS:           { bg: "#fffbeb", text: "#92400e" },
    REFERRAL:        { bg: "#fdf4ff", text: "#7e22ce" },
    FREEPLAY_DAILY:  { bg: "#eff6ff", text: "#1d4ed8" },
    FREEPLAY_WEEKLY: { bg: "#eff6ff", text: "#1d4ed8" },
    ATTENDANCE:      { bg: "#f1f5f9", text: "#475569" },
    ADJUSTMENT:      { bg: "#f1f5f9", text: "#475569" },
  };
  const s = map[type] || { bg: "#f1f5f9", text: "#475569" };
  return <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{type?.replace(/_/g, " ")}</span>;
}

function PriorityBadge({ priority }) {
  const map = { HIGH: { bg: "#fee2e2", text: "#991b1b" }, MEDIUM: { bg: "#fffbeb", text: "#b45309" }, LOW: { bg: "#f0fdf4", text: "#166534" }, URGENT: { bg: "#fee2e2", text: "#991b1b" } };
  const s = map[priority] || map.MEDIUM;
  return <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{priority}</span>;
}

function TaskTypeBadge({ taskType }) {
  const map = {
    STANDARD:        { bg: "#f1f5f9", text: "#475569", label: "Standard" },
    DAILY_CHECKLIST: { bg: "#f0f9ff", text: "#0369a1", label: "Daily Checklist" },
    PLAYER_ADDITION: { bg: "#f5f3ff", text: "#6d28d9", label: "Player Addition" },
    REVENUE_TARGET:  { bg: "#f0fdf4", text: "#15803d", label: "Revenue Target" },
  };
  const s = map[taskType] || map.STANDARD;
  return <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{s.label}</span>;
}

// ── Member Shift Section ───────────────────────────────────────────
function MemberShiftSection({ team }) {
  const [expanded, setExpanded] = useState(true);
  const rc = ROLE_COLORS[team.role] || ROLE_COLORS.TEAM1;

  const aggr = team.shifts.reduce((acc, s) => {
    const st = s.stats || {};
    acc.deposits    += st.totalDeposits    || 0;
    acc.cashouts    += st.totalCashouts    || 0;
    acc.bonuses     += st.totalBonuses     || 0;
    acc.profit      += st.netProfit        || 0;
    acc.txns        += st.transactionCount || 0;
    acc.tasks       += st.tasksCompleted   || 0;
    acc.players     += st.playersAdded     || 0;
    acc.bonusGrants += st.bonusesGranted   || 0;
    acc.duration    += s.duration          || 0;
    return acc;
  }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, txns: 0, tasks: 0, players: 0, bonusGrants: 0, duration: 0 });

  return (
    <div style={{ ...CARD, overflow: "hidden" }}>
      {/* Member header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", borderBottom: expanded ? "1px solid #e2e8f0" : "none", background: "#fafbfc", flexWrap: "wrap" }}
      >
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: rc.bg, border: `2px solid ${rc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: rc.text, flexShrink: 0 }}>
            {(team.member?.name || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>{team.member?.name || "Unassigned"}</div>
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

        {/* Aggregate pills */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <Pill icon={ArrowUpRight}  label="Deposits"  value={fmtMoney(aggr.deposits)} bg="#f0fdf4" text="#166534" />
          <Pill icon={ArrowDownRight} label="Cashouts" value={fmtMoney(aggr.cashouts)} bg="#fee2e2" text="#991b1b" />
          <Pill icon={Gift}          label="Bonuses"   value={fmtMoney(aggr.bonuses)}  bg="#fffbeb" text="#b45309" />
          <Pill icon={TrendingUp}    label="Profit"    value={fmtMoney(aggr.profit)}   bg={aggr.profit >= 0 ? "#f0fdf4" : "#fee2e2"} text={aggr.profit >= 0 ? "#166534" : "#991b1b"} bold />
          <Pill icon={Users}         label="Players"   value={aggr.players}            bg="#f5f3ff" text="#6d28d9" />
          <Pill icon={CheckCircle}   label="Tasks"     value={aggr.tasks}              bg="#f1f5f9" text="#475569" />
          {expanded
            ? <ChevronUp style={{ width: "16px", height: "16px", color: "#94a3b8", marginLeft: "4px" }} />
            : <ChevronDown style={{ width: "16px", height: "16px", color: "#94a3b8", marginLeft: "4px" }} />}
        </div>
      </div>

      {/* Shifts */}
      {expanded && (
        <div>
          {team.shifts.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No shifts recorded</div>
            : team.shifts.map((shift, si) => <ShiftDetail key={shift.id} shift={shift} index={si} total={team.shifts.length} />)}
        </div>
      )}
    </div>
  );
}

// ── Single Shift Detail ────────────────────────────────────────────
function ShiftDetail({ shift, index, total }) {
  const [activeTab, setActiveTab] = useState("overview");
  const isLast = index === total - 1;
  const s = shift.stats || {};

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "transactions", label: `Transactions (${shift.transactions?.length || 0})` },
    { id: "tasks",        label: `Tasks (${shift.tasks?.length || 0})` },
    { id: "players",      label: `Players Added (${shift.playersAdded?.length || 0})` },
    { id: "bonuses",      label: `Bonuses (${shift.bonusesGranted?.length || 0})` },
  ];

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}>

      {/* Shift summary row */}
      <div style={{ padding: "16px 24px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", background: shift.isActive ? "#f0fdf4" : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "200px" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", flexShrink: 0, background: shift.isActive ? "#22c55e" : "#94a3b8", boxShadow: shift.isActive ? "0 0 0 3px rgba(34,197,94,.25)" : "none" }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              {fmtTime(shift.startTime)} → {shift.isActive ? <span style={{ color: "#22c55e" }}>Active Now</span> : fmtTime(shift.endTime)}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              {shift.duration != null ? `${shift.duration} min` : "Ongoing"}
              {shift.isActive && <span style={{ marginLeft: "6px", color: "#22c55e", fontWeight: "600" }}>● LIVE</span>}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
          {[
            { icon: Activity,       label: "Txns",    val: s.transactionCount ?? 0, color: "#475569", bg: "#f1f5f9" },
            { icon: ArrowUpRight,   label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#166534", bg: "#f0fdf4" },
            { icon: ArrowDownRight, label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#991b1b", bg: "#fee2e2" },
            { icon: Gift,           label: "Bonuses",  val: fmtMoney(s.totalBonuses), color: "#b45309", bg: "#fffbeb" },
            { icon: TrendingUp,     label: "Profit",   val: fmtMoney(s.netProfit), color: (s.netProfit ?? 0) >= 0 ? "#166534" : "#991b1b", bg: (s.netProfit ?? 0) >= 0 ? "#f0fdf4" : "#fee2e2" },
            { icon: Users,         label: "Players", val: s.playersAdded ?? 0, color: "#6d28d9", bg: "#f5f3ff" },
            { icon: CheckCircle,   label: "Tasks",   val: s.tasksCompleted ?? 0, color: "#475569", bg: "#f1f5f9" },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} style={{ padding: "7px 11px", borderRadius: "8px", background: bg, display: "flex", flexDirection: "column", gap: "1px", minWidth: "70px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                <Icon style={{ width: "9px", height: "9px" }} /> {label}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "2px", padding: "0 24px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "8px 14px", border: "none", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", background: activeTab === t.id ? "#fff" : "transparent", color: activeTab === t.id ? "#0f172a" : "#94a3b8", borderBottom: `2px solid ${activeTab === t.id ? "#0f172a" : "transparent"}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div style={{ padding: "20px 24px" }}>
          {/* Revenue from tasks breakdown */}
          {shift.taskSummary && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "12px" }}>Task Performance</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                {shift.taskSummary.playerAddition != null && (
                  <div style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "10px", background: "#f5f3ff" }}>
                    <div style={{ fontSize: "11px", color: "#6d28d9", fontWeight: "600", marginBottom: "4px" }}>Player Addition</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#6d28d9" }}>{shift.taskSummary.playerAddition}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>players added this shift</div>
                  </div>
                )}
                {shift.taskSummary.revenueAchieved != null && (
                  <div style={{ padding: "12px 14px", border: "1px solid #86efac", borderRadius: "10px", background: "#f0fdf4" }}>
                    <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600", marginBottom: "4px" }}>Revenue Achieved</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#166534" }}>{fmtMoney(shift.taskSummary.revenueAchieved)}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>of {fmtMoney(shift.taskSummary.revenueTarget)} target</div>
                    {shift.taskSummary.revenueTarget > 0 && (
                      <div style={{ marginTop: "6px" }}>
                        <ProgressBar pct={Math.min(100, Math.round((shift.taskSummary.revenueAchieved / shift.taskSummary.revenueTarget) * 100))} color="#22c55e" />
                      </div>
                    )}
                  </div>
                )}
                {shift.taskSummary.checklistCompletion != null && (
                  <div style={{ padding: "12px 14px", border: "1px solid #bae6fd", borderRadius: "10px", background: "#f0f9ff" }}>
                    <div style={{ fontSize: "11px", color: "#0369a1", fontWeight: "600", marginBottom: "4px" }}>Checklist</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#0369a1" }}>{shift.taskSummary.checklistCompletion}%</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{shift.taskSummary.checklistDone}/{shift.taskSummary.checklistTotal} items</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top depositing players */}
          {shift.playerDepositBreakdown?.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Top Players by Deposits This Shift</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {shift.playerDepositBreakdown.sort((a, b) => b.total - a.total).slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                    <span style={{ width: "18px", color: "#94a3b8", fontWeight: "700" }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: "600" }}>{p.name}</span>
                    <span style={{ color: "#94a3b8" }}>{p.count} txns</span>
                    <span style={{ fontWeight: "800", color: "#166534" }}>{fmtMoney(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / issues */}
          {shift.notes && (
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
              <span style={{ fontWeight: "700" }}>Shift Notes: </span>{shift.notes}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "transactions" && (
        <div style={{ overflowX: "auto" }}>
          {!shift.transactions?.length
            ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No transactions this shift</div>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Time", "Player", "Type", "Game", "Wallet", "Amount", "Fee", "Balance After"].map(h => <th key={h} style={{ ...TH, padding: "8px 12px", fontSize: "10px" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shift.transactions.map(t => (
                    <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{fmtTime(t.createdAt)}</td>
                      <td style={{ ...TD, padding: "9px 12px" }}>
                        <div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || t.playerName || `#${t.userId}`}</div>
                        {t.user?.email && <div style={{ fontSize: "10px", color: "#94a3b8" }}>{t.user.email}</div>}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px" }}><TypeBadge type={t.type || t.bonusType?.toUpperCase()} /></td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{t.game?.name || t.gameName || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{t.walletMethod || t.paymentMethod || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontWeight: "700", fontSize: "13px", color: ["DEPOSIT", "deposit"].includes(t.type) ? "#166534" : ["WITHDRAWAL", "cashout", "CASHOUT"].includes(t.type) ? "#991b1b" : "#b45309" }}>
                        {fmtMoney(t.amount)}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px" }}>
                        {t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700" }}>-{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "12px", color: "#64748b" }}>
                        {t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={5} style={{ padding: "10px 12px", fontWeight: "700", fontSize: "12px", color: "#64748b" }}>
                      SHIFT TOTALS — {shift.transactions.length} transactions
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: "800", fontSize: "13px", color: "#166534" }}>
                      {fmtMoney(shift.transactions.filter(t => ["DEPOSIT", "deposit"].includes(t.type)).reduce((s, t) => s + (t.amount || 0), 0))} deposits
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {activeTab === "tasks" && (
        <div style={{ padding: "16px 24px" }}>
          {!shift.tasks?.length
            ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No tasks completed this shift</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {shift.tasks.map(t => {
                  const pct = t.targetValue > 0 ? Math.min(100, Math.round(((t.currentValue ?? 0) / t.targetValue) * 100)) : null;
                  const checklist = t.checklistItems || [];
                  const doneItems = checklist.filter(i => i.done).length;
                  return (
                    <div key={t.id} style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${t.status === "COMPLETED" ? "#22c55e" : "#f59e0b"}`, borderRadius: "10px", background: t.status === "COMPLETED" ? "#fafffe" : "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{t.title}</span>
                            <TaskTypeBadge taskType={t.taskType} />
                            <PriorityBadge priority={t.priority} />
                          </div>
                          {t.description && <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>{t.description}</div>}

                          {/* Metrics */}
                          {pct !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <ProgressBar pct={pct} color={t.taskType === "REVENUE_TARGET" ? "#22c55e" : "#8b5cf6"} />
                              <span style={{ fontSize: "12px", fontWeight: "700", color: pct >= 100 ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
                                {t.taskType === "REVENUE_TARGET"
                                  ? `${fmtMoney(t.currentValue)} / ${fmtMoney(t.targetValue)}`
                                  : `${t.currentValue} / ${t.targetValue} players`}
                                &nbsp;({pct}%)
                              </span>
                            </div>
                          )}
                          {checklist.length > 0 && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              Checklist: {doneItems}/{checklist.length} items done
                              ({Math.round((doneItems / checklist.length) * 100)}%)
                            </div>
                          )}

                          {/* Progress logs */}
                          {t.progressLogs?.length > 0 && (
                            <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #f1f5f9" }}>
                              {t.progressLogs.map((log, li) => (
                                <div key={li} style={{ fontSize: "11px", color: "#94a3b8", display: "flex", gap: "5px", alignItems: "center" }}>
                                  <Zap style={{ width: "9px", height: "9px", color: "#8b5cf6" }} />
                                  <span style={{ fontWeight: "600", color: "#64748b" }}>{log.user?.name}</span>
                                  <span>+{t.taskType === "REVENUE_TARGET" ? fmtMoney(log.value) : log.value}</span>
                                  <span style={{ color: "#cbd5e1" }}>{fmtTime(log.createdAt)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Sub-tasks (member allocations) */}
                          {t.subTasks?.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Member Allocations</div>
                              {t.subTasks.map(st => {
                                const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                                return (
                                  <div key={st.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", marginBottom: "3px" }}>
                                    <span style={{ flex: 1, color: "#64748b" }}>{st.assignedTo?.name || "Unassigned"}</span>
                                    <span style={{ fontWeight: "700" }}>
                                      {t.taskType === "REVENUE_TARGET" ? fmtMoney(st.currentValue) : st.currentValue} / {t.taskType === "REVENUE_TARGET" ? fmtMoney(st.targetValue) : st.targetValue}
                                    </span>
                                    <span style={{ color: sPct >= 100 ? "#22c55e" : "#94a3b8", fontWeight: "700" }}>{sPct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                          <span style={{ padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: t.status === "COMPLETED" ? "#dcfce7" : t.status === "IN_PROGRESS" ? "#eff6ff" : "#f1f5f9", color: t.status === "COMPLETED" ? "#166634" : t.status === "IN_PROGRESS" ? "#1d4ed8" : "#475569" }}>
                            {t.status?.replace("_", " ")}
                          </span>
                          {t.assignedTo && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{t.assignedTo.name}</span>}
                          {t.completedAt && <span style={{ fontSize: "10px", color: "#94a3b8" }}>{fmtTime(t.completedAt)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* ── PLAYERS ADDED TAB ── */}
      {activeTab === "players" && (
        <div style={{ padding: "16px 24px" }}>
          {!shift.playersAdded?.length
            ? <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No players added this shift</div>
            : (
              <>
                <div style={{ marginBottom: "12px", fontSize: "13px", color: "#64748b" }}>
                  <span style={{ fontWeight: "700", color: "#6d28d9" }}>{shift.playersAdded.length}</span> player{shift.playersAdded.length !== 1 ? "s" : ""} added this shift
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                  {shift.playersAdded.map(p => (
                    <div key={p.id} style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "10px", background: "#f5f3ff" }}>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>@{p.username}</div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", alignItems: "center" }}>
                        <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#fffbeb", color: "#92400e" }}>{p.tier}</span>
                        {p.referredBy && <span style={{ fontSize: "10px", color: "#94a3b8" }}>ref by {p.referredBy.name}</span>}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>Added {fmtTime(p.createdAt)}</div>
                      {p.addedByMember && (
                        <div style={{ fontSize: "11px", color: "#6d28d9", fontWeight: "600", marginTop: "4px" }}>
                          by {p.addedByMember.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      )}

      {/* ── BONUSES TAB ── */}
      {activeTab === "bonuses" && (
        <div style={{ overflowX: "auto" }}>
          {!shift.bonusesGranted?.length
            ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No bonuses granted this shift</div>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Time", "Player", "Bonus Type", "Game", "Amount", "Granted By"].map(h => <th key={h} style={{ ...TH, padding: "8px 12px", fontSize: "10px" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shift.bonusesGranted.map(b => (
                    <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{fmtTime(b.createdAt)}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "12px", fontWeight: "600" }}>{b.user?.name || b.playerName || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px" }}><TypeBadge type={b.bonusType?.toUpperCase() || "BONUS"} /></td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{b.game?.name || b.gameName || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontWeight: "700", fontSize: "13px", color: "#b45309" }}>{fmtMoney(b.amount)}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{b.grantedBy?.name || "System"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#fffbeb" }}>
                    <td colSpan={4} style={{ padding: "10px 12px", fontWeight: "700", fontSize: "12px", color: "#92400e" }}>TOTAL BONUSES</td>
                    <td style={{ padding: "10px 12px", fontWeight: "800", fontSize: "13px", color: "#b45309" }}>
                      {fmtMoney(shift.bonusesGranted.reduce((s, b) => s + (b.amount || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
        </div>
      )}
    </div>
  );
}

// ── PDF print ──────────────────────────────────────────────────────
function printReport(report, date) {
  const win = window.open("", "_blank");
  const { summary, teams, wallets, dayTasks } = report;

  const memberRows = teams.flatMap(team =>
    team.shifts.map(shift => {
      const s = shift.stats || {};
      const rc = ROLE_COLORS[team.role] || ROLE_COLORS.TEAM1;
      return `<tr>
        <td><strong>${team.member?.name || "—"}</strong><br/><span style="font-size:10px;color:#64748b">${ROLE_LABEL[team.role] || team.role}</span></td>
        <td>${fmtTime(shift.startTime)}</td>
        <td>${shift.isActive ? "<span style='color:#16a34a;font-weight:700'>ACTIVE</span>" : fmtTime(shift.endTime)}</td>
        <td>${shift.duration != null ? shift.duration + " min" : "—"}</td>
        <td>${s.transactionCount ?? 0}</td>
        <td style="color:#16a34a;font-weight:700">${fmtMoney(s.totalDeposits)}</td>
        <td style="color:#dc2626;font-weight:700">${fmtMoney(s.totalCashouts)}</td>
        <td style="color:#d97706;font-weight:700">${fmtMoney(s.totalBonuses)}</td>
        <td style="font-weight:800;color:${(s.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(s.netProfit)}</td>
        <td>${s.playersAdded ?? 0}</td>
        <td>${s.tasksCompleted ?? 0}</td>
        <td>${s.bonusesGranted ?? 0}</td>
      </tr>`;
    })
  ).join("");

  const taskRows = (dayTasks || []).map(t => {
    const pct = t.targetValue > 0 ? Math.round(((t.currentValue ?? 0) / t.targetValue) * 100) : null;
    return `<tr>
      <td>${fmtTime(t.completedAt || t.updatedAt)}</td>
      <td><strong>${t.title}</strong>${t.description ? `<br/><span style="font-size:10px;color:#64748b">${t.description}</span>` : ""}</td>
      <td>${t.taskType?.replace("_", " ") || "STANDARD"}</td>
      <td>${t.assignedTo?.name || (t.assignToAll ? "All Members" : "—")}</td>
      <td>${t.status?.replace("_", " ")}</td>
      <td>${pct !== null ? `${t.taskType === "REVENUE_TARGET" ? fmtMoney(t.currentValue) : t.currentValue} / ${t.taskType === "REVENUE_TARGET" ? fmtMoney(t.targetValue) : t.targetValue} (${Math.min(100, pct)}%)` : (t.checklistItems ? `${t.checklistItems.filter(i => i.done).length}/${t.checklistItems.length} items` : "—")}</td>
    </tr>`;
  }).join("");

  const walletRows = (wallets || []).map(w =>
    `<tr><td>${w.name}</td><td>${w.method}</td><td style="font-weight:700;color:#16a34a">$${(w.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>`
  ).join("");

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Operations Report — ${date}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Segoe UI",Arial,sans-serif; font-size:12px; color:#0f172a; background:#fff; padding:32px; }
  h1 { font-size:22px; font-weight:800; margin-bottom:4px; }
  h2 { font-size:14px; font-weight:700; margin:24px 0 10px; color:#374151; border-bottom:2px solid #e5e7eb; padding-bottom:6px; }
  .meta { font-size:12px; color:#64748b; margin-bottom:24px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .box { border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; }
  .val { font-size:20px; font-weight:800; }
  .lbl { font-size:10px; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.4px; }
  .green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}.amber{color:#d97706}.purple{color:#7c3aed}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px}
  th{background:#f8fafc;text-align:left;padding:8px 10px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e2e8f0}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
  .highlight{background:#f0fdf4}
  button{padding:10px 20px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}
  @media print{button{display:none}.no-break{page-break-inside:avoid}}
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
    <div>
      <h1>📊 Daily Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} &nbsp;|&nbsp; Report Date: ${fmtDate(date + "T12:00:00")}</p>
    </div>
    <button onclick="window.print()">🖨 Print / Save PDF</button>
  </div>

  <h2>Day Summary</h2>
  <div class="grid">
    <div class="box"><div class="val green">${fmtMoney(summary.totalDeposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val red">${fmtMoney(summary.totalCashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val amber">${fmtMoney(summary.totalBonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val ${summary.netProfit >= 0 ? "green" : "red"}">${fmtMoney(summary.netProfit)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val">${summary.totalShifts}</div><div class="lbl">Shifts Logged</div></div>
    <div class="box"><div class="val blue">${summary.activeShifts}</div><div class="lbl">Active Shifts</div></div>
    <div class="box"><div class="val purple">${summary.playersAdded ?? 0}</div><div class="lbl">Players Added</div></div>
    <div class="box"><div class="val amber">${summary.bonusesGranted ?? 0}</div><div class="lbl">Bonuses Granted</div></div>
    <div class="box"><div class="val">${summary.tasksCompleted}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val">${summary.transactionCount}</div><div class="lbl">Transactions</div></div>
    <div class="box"><div class="val">${summary.checklistProgress ?? "—"}</div><div class="lbl">Checklist Completion</div></div>
    <div class="box"><div class="val green">${fmtMoney(summary.totalRevenue ?? 0)}</div><div class="lbl">Revenue Achieved</div></div>
  </div>

  <h2>Member Shift Breakdown</h2>
  <table>
    <thead><tr>
      <th>Member</th><th>Start</th><th>End</th><th>Duration</th><th>Txns</th>
      <th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th>
      <th>Players</th><th>Tasks</th><th>Bonuses Granted</th>
    </tr></thead>
    <tbody>${memberRows || '<tr><td colspan="12" style="text-align:center;color:#94a3b8;padding:20px">No shifts today</td></tr>'}</tbody>
  </table>

  ${(dayTasks || []).length > 0 ? `
  <h2>All Tasks (${dayTasks.length})</h2>
  <table>
    <thead><tr><th>Time</th><th>Task</th><th>Type</th><th>Assigned To</th><th>Status</th><th>Progress / Metrics</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>` : ""}

  ${(wallets || []).length > 0 ? `
  <h2>Wallet Balances — Current Snapshot</h2>
  <table>
    <thead><tr><th>Name</th><th>Method</th><th>Balance</th></tr></thead>
    <tbody>${walletRows}</tbody>
  </table>` : ""}

  <p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center">
    Confidential &nbsp;·&nbsp; Generated by Operations Dashboard &nbsp;·&nbsp; ${new Date().toISOString()}
  </p>
</body></html>`);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminReportPage() {
  const todayStr = toDateInput(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [report, setReport]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [teamFilter, setTeamFilter]     = useState("ALL");

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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Header ── */}
      <div style={{ ...CARD, padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", background: "rgb(14, 165, 233)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText style={{ width: "22px", height: "22px", color: "#fff" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Daily Operations Report</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {report ? fmtDate(report.date + "T12:00:00") : "Loading…"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Date picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff" }}>
              <Calendar style={{ width: "14px", height: "14px", color: "#64748b" }} />
              <input
                type="date" value={selectedDate} max={todayStr}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: "13px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }}
              />
            </div>

            {/* Team filter */}
            <div style={{ position: "relative" }}>
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ padding: "9px 32px 9px 12px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff", fontSize: "13px", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", appearance: "none" }}>
                <option value="ALL">All Teams</option>
                <option value="TEAM1">Team 1</option>
                <option value="TEAM2">Team 2</option>
                <option value="TEAM3">Team 3</option>
                <option value="TEAM4">Team 4</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8", pointerEvents: "none" }} />
            </div>

            <button
              onClick={() => fetchReport(selectedDate, teamFilter)}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              <RefreshCw style={{ width: "14px", height: "14px", animation: loading ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>

            <button
              onClick={() => report && printReport(report, report.date)}
              disabled={!report || loading}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", border: "none", borderRadius: "9px", background: "rgb(14, 165, 233)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: report ? "pointer" : "not-allowed", opacity: report ? 1 : 0.5 }}
            >
              <Download style={{ width: "14px", height: "14px" }} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !report && (
        <div style={{ ...CARD, padding: "80px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0f172a", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          Generating comprehensive report…
        </div>
      )}

      {report && (
        <>
          {/* ── Summary stats ── */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <BarChart2 style={{ width: "13px", height: "13px" }} /> Day Summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "12px" }}>
              <StatCard label="Total Deposits"      value={fmtMoney(s.totalDeposits)}  icon={ArrowUpRight}   color={{ bg: "#f0fdf4", icon: "#16a34a" }} />
              <StatCard label="Total Cashouts"      value={fmtMoney(s.totalCashouts)}  icon={ArrowDownRight} color={{ bg: "#fee2e2", icon: "#dc2626" }} />
              <StatCard label="Total Bonuses Paid"  value={fmtMoney(s.totalBonuses)}   icon={Gift}           color={{ bg: "#fffbeb", icon: "#d97706" }} />
              <StatCard label="Net Profit"          value={fmtMoney(s.netProfit)}      icon={s.netProfit >= 0 ? TrendingUp : TrendingDown} color={{ bg: s.netProfit >= 0 ? "#f0fdf4" : "#fee2e2", icon: s.netProfit >= 0 ? "#16a34a" : "#dc2626" }} />
              <StatCard label="Players Added"       value={s.playersAdded ?? 0}        icon={Users}          color={{ bg: "#f5f3ff", icon: "#7c3aed" }} />
              <StatCard label="Bonuses Granted"     value={s.bonusesGranted ?? 0}      icon={Star}           color={{ bg: "#fffbeb", icon: "#d97706" }} />
              <StatCard label="Tasks Completed"     value={s.tasksCompleted}           icon={CheckCircle}    color={{ bg: "#f0fdf4", icon: "#16a34a" }} sub={`of ${s.totalTasks ?? "?"} assigned`} />
              <StatCard label="Transactions"        value={s.transactionCount}         icon={Activity}       color={{ bg: "#eff6ff", icon: "#2563eb" }} />
              <StatCard label="Shifts Logged"       value={s.totalShifts}              icon={Clock}          color={{ bg: "#f1f5f9", icon: "#475569" }} sub={`${s.activeShifts} active`} />
              <StatCard label="Revenue Achieved"    value={fmtMoney(s.totalRevenue ?? 0)}  icon={Target}    color={{ bg: "#f0fdf4", icon: "#16a34a" }} />
            </div>
          </div>

          {/* ── Revenue + Player task metrics ── */}
          {(report.taskMetrics) && (
            <div style={{ ...CARD, padding: "22px 28px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Target style={{ width: "16px", height: "16px", color: "#7c3aed" }} /> Task Metrics Overview
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "14px" }}>
                {report.taskMetrics.playerAddition && (
                  <div style={{ padding: "16px", border: "1px solid #ddd6fe", borderRadius: "12px", background: "#f5f3ff" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#7c3aed", marginBottom: "8px" }}>Player Addition Goal</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#7c3aed" }}>
                      {report.taskMetrics.playerAddition.current} / {report.taskMetrics.playerAddition.target}
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ height: "8px", background: "#ddd6fe", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.round((report.taskMetrics.playerAddition.current / report.taskMetrics.playerAddition.target) * 100))}%`, background: "#7c3aed", borderRadius: "999px" }} />
                      </div>
                    </div>
                    {report.taskMetrics.playerAddition.byMember?.length > 0 && (
                      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {report.taskMetrics.playerAddition.byMember.map((m, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span style={{ color: "#64748b" }}>{m.name}</span>
                            <span style={{ fontWeight: "700", color: "#7c3aed" }}>{m.count} players</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {report.taskMetrics.revenueTarget && (
                  <div style={{ padding: "16px", border: "1px solid #86efac", borderRadius: "12px", background: "#f0fdf4" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a", marginBottom: "8px" }}>Revenue Target</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#16a34a" }}>
                      {fmtMoney(report.taskMetrics.revenueTarget.current)} / {fmtMoney(report.taskMetrics.revenueTarget.target)}
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ height: "8px", background: "#86efac", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.round((report.taskMetrics.revenueTarget.current / report.taskMetrics.revenueTarget.target) * 100))}%`, background: "#22c55e", borderRadius: "999px" }} />
                      </div>
                    </div>
                    {report.taskMetrics.revenueTarget.byMember?.length > 0 && (
                      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {report.taskMetrics.revenueTarget.byMember.map((m, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span style={{ color: "#64748b" }}>{m.name}</span>
                            <span style={{ fontWeight: "700", color: "#16a34a" }}>{fmtMoney(m.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Member shift sections ── */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Users style={{ width: "13px", height: "13px" }} /> Team Shift Reports
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {report.teams?.map(team => <MemberShiftSection key={team.role} team={team} />)}
            </div>
          </div>

          {/* ── All tasks today ── */}
          {report.dayTasks?.length > 0 && (
            <div style={{ ...CARD, overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle style={{ width: "16px", height: "16px", color: "#64748b" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  All Tasks Today ({report.dayTasks.length})
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Time", "Task", "Type", "Assigned To", "Status", "Progress / Metrics", "Priority"].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {report.dayTasks.map(t => {
                      const pct = t.targetValue > 0 ? Math.min(100, Math.round(((t.currentValue ?? 0) / t.targetValue) * 100)) : null;
                      const checklist = t.checklistItems || [];
                      const doneItems = checklist.filter(i => i.done).length;
                      return (
                        <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...TD, color: "#94a3b8", fontSize: "12px" }}>{fmtTime(t.completedAt || t.updatedAt)}</td>
                          <td style={TD}>
                            <div style={{ fontWeight: "600" }}>{t.title}</div>
                            {t.description && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{t.description}</div>}
                          </td>
                          <td style={TD}><TaskTypeBadge taskType={t.taskType} /></td>
                          <td style={{ ...TD, fontSize: "12px" }}>
                            {t.assignToAll ? <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>All Members</span> : t.assignedTo?.name || "—"}
                          </td>
                          <td style={TD}>
                            <span style={{ padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", background: t.status === "COMPLETED" ? "#dcfce7" : t.status === "IN_PROGRESS" ? "#eff6ff" : "#f1f5f9", color: t.status === "COMPLETED" ? "#166634" : t.status === "IN_PROGRESS" ? "#1d4ed8" : "#475569" }}>
                              {t.status?.replace("_", " ")}
                            </span>
                          </td>
                          <td style={{ ...TD, minWidth: "160px" }}>
                            {pct !== null ? (
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                                  <span>{t.taskType === "REVENUE_TARGET" ? `${fmtMoney(t.currentValue)} / ${fmtMoney(t.targetValue)}` : `${t.currentValue} / ${t.targetValue} players`}</span>
                                  <span style={{ fontWeight: "700", color: pct >= 100 ? "#22c55e" : "#0f172a" }}>{pct}%</span>
                                </div>
                                <ProgressBar pct={pct} color={t.taskType === "REVENUE_TARGET" ? "#22c55e" : "#8b5cf6"} />
                              </div>
                            ) : checklist.length > 0 ? (
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{doneItems}/{checklist.length} items ({Math.round((doneItems / checklist.length) * 100)}%)</span>
                            ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
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

          {/* ── Wallet balances ── */}
          {report.wallets?.length > 0 && (
            <div style={{ ...CARD, overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                <DollarSign style={{ width: "16px", height: "16px", color: "#64748b" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Wallet Balances — Current Snapshot
                </h3>
              </div>
              <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                {report.wallets.map(w => (
                  <div key={w.id} style={{ padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fafbfc" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: "600" }}>{w.method}</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>{fmtMoney(w.balance)}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{w.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } } input[type=date]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:0.6; }`}</style>
    </div>
  );
}
