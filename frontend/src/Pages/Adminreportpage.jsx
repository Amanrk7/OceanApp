// pages/AdminReportPage.jsx
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Download, RefreshCw, Calendar, Users, TrendingUp,
  TrendingDown, Gift, CheckCircle, Clock, Zap, AlertCircle,
  Activity, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  DollarSign, Star, Shield, BarChart2, User, Target, List,
  Wallet, Gamepad2, MessageSquare,
} from "lucide-react";
import { api } from "../api";

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

const ROLE_LABEL = { TEAM1: "Team 1", TEAM2: "Team 2", TEAM3: "Team 3", TEAM4: "Team 4" };
const ROLE_COLORS = {
  TEAM1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  TEAM2: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  TEAM3: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  TEAM4: { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
};

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
    DEPOSIT: { bg: "#dcfce7", text: "#166534" },
    WITHDRAWAL: { bg: "#fee2e2", text: "#991b1b" },
    BONUS: { bg: "#fffbeb", text: "#92400e" },
    REFERRAL: { bg: "#fdf4ff", text: "#7e22ce" },
  };
  const s = map[type] || { bg: "#f1f5f9", text: "#475569" };
  return <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{type?.replace(/_/g, " ")}</span>;
}

function PriorityBadge({ priority }) {
  const map = { HIGH: { bg: "#fee2e2", text: "#991b1b" }, MEDIUM: { bg: "#fffbeb", text: "#b45309" }, LOW: { bg: "#f0fdf4", text: "#166534" } };
  const s = map[priority] || map.MEDIUM;
  return <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{priority}</span>;
}

function TaskTypeBadge({ taskType }) {
  const map = {
    STANDARD: { bg: "#f1f5f9", text: "#475569", label: "Standard" },
    DAILY_CHECKLIST: { bg: "#f0f9ff", text: "#0369a1", label: "Daily Checklist" },
    PLAYER_ADDITION: { bg: "#f5f3ff", text: "#6d28d9", label: "Player Addition" },
    REVENUE_TARGET: { bg: "#f0fdf4", text: "#15803d", label: "Revenue Target" },
  };
  const s = map[taskType] || map.STANDARD;
  return <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: s.bg, color: s.text }}>{s.label}</span>;
}

// ── Effort star display ────────────────────────────────────────────
function EffortStars({ rating }) {
  if (!rating) return <span style={{ color: "#94a3b8" }}>—</span>;
  const color = rating >= 8 ? "#16a34a" : rating >= 5 ? "#d97706" : "#dc2626";
  return (
    <span style={{ fontWeight: "800", fontSize: "16px", color }}>
      {rating}<span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "400" }}>/10</span>
    </span>
  );
}

// ── Reconciliation Table (wallet or game) ──────────────────────────
function ReconciliationTable({ title, rows, startTotal, endTotal, expectedChange, actualChange, discrepancy, unit = "$", icon: Icon, iconColor, depositFees = 0, cashoutFees = 0 }) {
  const isBalanced = Math.abs(discrepancy ?? 0) < 0.02;
  const fmt = (v) => unit === "$" ? fmtMoney(v) : `${(v ?? 0).toFixed(0)} pts`;
  const sign = (v) => (v ?? 0) >= 0 ? "+" : "−";
  const clr = (v) => unit === "$" ? ((v ?? 0) >= 0 ? "#16a34a" : "#dc2626") : ((v ?? 0) <= 0 ? "#16a34a" : "#dc2626");
  const totalFees = depositFees + cashoutFees;

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {Icon && <Icon style={{ width: "14px", height: "14px", color: iconColor }} />}
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {unit === "$" && totalFees > 0 && (
            <span style={{ fontSize: "11px", color: "#64748b", padding: "2px 8px", background: "#fffbeb", borderRadius: "5px", border: "1px solid #fde68a" }}>
              Fees: <b style={{ color: "#b45309" }}>−{fmtMoney(totalFees)}</b>
              {depositFees > 0 && cashoutFees > 0 && (
                <span style={{ color: "#94a3b8", marginLeft: "4px" }}>
                  (dep −{fmtMoney(depositFees)} · co −{fmtMoney(cashoutFees)})
                </span>
              )}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Expected: <b style={{ color: "#475569" }}>{sign(expectedChange)}{fmt(Math.abs(expectedChange ?? 0))}</b>
            {" · "}Actual: <b style={{ color: clr(actualChange) }}>{sign(actualChange)}{fmt(Math.abs(actualChange ?? 0))}</b>
          </span>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={{ ...TH, padding: "7px 12px", fontSize: "10px" }}>Account</th>
            <th style={{ ...TH, padding: "7px 12px", fontSize: "10px", textAlign: "right" }}>Start</th>
            <th style={{ ...TH, padding: "7px 12px", fontSize: "10px", textAlign: "right" }}>End</th>
            {unit === "$" && totalFees > 0 && <th style={{ ...TH, padding: "7px 12px", fontSize: "10px", textAlign: "right" }}>Fees</th>}
            <th style={{ ...TH, padding: "7px 12px", fontSize: "10px", textAlign: "right" }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const delta = (r.end ?? 0) - (r.start ?? 0);
            return (
              <tr key={i}>
                <td style={{ ...TD, padding: "8px 12px", fontSize: "12px" }}>{r.name}{r.method ? <span style={{ color: "#94a3b8", marginLeft: "6px" }}>{r.method}</span> : null}</td>
                <td style={{ ...TD, padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{fmt(r.start)}</td>
                <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "600" }}>{fmt(r.end)}</td>
                {unit === "$" && totalFees > 0 && (
                  <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontSize: "11px", color: "#b45309" }}>
                    {r.fee != null && r.fee > 0 ? `−${fmtMoney(r.fee)}` : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                )}
                <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "700", color: clr(unit === "$" ? delta : -delta) }}>
                  {delta >= 0 ? "+" : "−"}{fmt(Math.abs(delta))}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr style={{ background: "#f8fafc" }}>
            <td style={{ ...TD, padding: "8px 12px", fontWeight: "700", fontSize: "12px" }}>Total</td>
            <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "600" }}>{fmt(startTotal)}</td>
            <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>{fmt(endTotal)}</td>
            {unit === "$" && totalFees > 0 && (
              <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "700", color: "#b45309" }}>−{fmtMoney(totalFees)}</td>
            )}
            <td style={{ ...TD, padding: "8px 12px", textAlign: "right", fontWeight: "700", color: clr(unit === "$" ? actualChange : -actualChange) }}>
              {(actualChange ?? 0) >= 0 ? "+" : "−"}{fmt(Math.abs(actualChange ?? 0))}
              {!isBalanced && (
                <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600", marginTop: "2px" }}>
                  ⚠️ {(discrepancy ?? 0) >= 0 ? "+" : ""}{fmt(discrepancy)} vs expected
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Discrepancy Banner ─────────────────────────────────────────────
function DiscrepancyBanner({ endSnapshot }) {
  if (!endSnapshot) return null;
  const { isBalanced, totalDiscrepancy, deposits, cashouts, bonuses, netProfit, walletChange, gameChange } = endSnapshot;
  return (
    <div style={{
      padding: "14px 18px",
      background: isBalanced ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${isBalanced ? "#86efac" : "#fca5a5"}`,
      borderLeft: `4px solid ${isBalanced ? "#16a34a" : "#dc2626"}`,
      borderRadius: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {isBalanced
          ? <CheckCircle style={{ width: "16px", height: "16px", color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
          : <AlertCircle style={{ width: "16px", height: "16px", color: "#dc2626", flexShrink: 0, marginTop: "2px" }} />}
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 6px", fontWeight: "700", fontSize: "13px", color: isBalanced ? "#166534" : "#991b1b" }}>
            {isBalanced ? "✓ Balances fully reconciled" : `⚠️ Discrepancy: ${fmtMoney(Math.abs(totalDiscrepancy ?? 0))}`}
          </p>
          {/* Formula breakdown */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11px" }}>
            {[
              { label: "Deposits", val: fmtMoney(deposits), color: "#16a34a" },
              { label: "Cashouts", val: `−${fmtMoney(cashouts)}`, color: "#dc2626" },
              { label: "Bonuses", val: `−${fmtMoney(bonuses)}`, color: "#d97706" },
              { label: "Net Profit", val: fmtMoney(netProfit), color: netProfit >= 0 ? "#16a34a" : "#dc2626" },
              { label: "Wallet Δ", val: `${(walletChange ?? 0) >= 0 ? "+" : ""}${fmtMoney(walletChange)}`, color: "#475569" },
              { label: "Game Δ", val: `${(gameChange ?? 0) >= 0 ? "+" : ""}${(gameChange ?? 0).toFixed(0)} pts`, color: "#7c3aed" },
              { label: "Discrepancy", val: fmtMoney(totalDiscrepancy ?? 0), color: isBalanced ? "#16a34a" : "#dc2626" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ padding: "3px 8px", background: "rgba(255,255,255,0.7)", borderRadius: "6px", display: "flex", gap: "4px" }}>
                <span style={{ color: "#94a3b8" }}>{label}:</span>
                <span style={{ fontWeight: "700", color }}>{val}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
            Formula: (Deposits − Cashouts − Bonuses) should equal (Wallet Δ) and (−Game Δ) = 0 net
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Member Feedback Panel ──────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Effort rating */}
      {effort && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px 20px", background: effortBg, borderRadius: "12px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "28px", fontWeight: "900", color: effortColor, lineHeight: 1 }}>{effort}</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.4px" }}>out of 10</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <div key={n} style={{
                  width: "22px", height: "8px", borderRadius: "4px",
                  background: n <= effort ? effortColor : "#e2e8f0",
                  opacity: n <= effort ? 1 : 0.5,
                }} />
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {effort >= 8 ? "Excellent effort" : effort >= 5 ? "Moderate effort" : "Low effort this shift"}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {effortReason && (
          <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "9px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              Why this rating?
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{effortReason}</p>
          </div>
        )}
        {improvements && (
          <div style={{ padding: "12px 14px", background: "#fffbeb", borderRadius: "9px", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              Could do better
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{improvements}</p>
          </div>
        )}
        {workSummary && (
          <div style={{ padding: "12px 14px", background: "#f0fdf4", borderRadius: "9px", border: "1px solid #86efac" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              Work summary
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{workSummary}</p>
          </div>
        )}
        {issues && (
          <div style={{ padding: "12px 14px", background: "#fef2f2", borderRadius: "9px", border: "1px solid #fca5a5" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
              Issues encountered
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#0f172a", lineHeight: 1.5 }}>{issues}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Member Shift Section ───────────────────────────────────────────
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
    acc.bonusGrants += st.bonusesGranted || 0;
    acc.duration += s.duration || 0;
    return acc;
  }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, txns: 0, tasks: 0, players: 0, bonusGrants: 0, duration: 0 });

  return (
    <div style={{ ...CARD, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", borderBottom: expanded ? "1px solid #e2e8f0" : "none", background: "#fafbfc", flexWrap: "wrap" }}
      >
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
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <Pill icon={ArrowUpRight} label="Deposits" value={fmtMoney(aggr.deposits)} bg="#f0fdf4" text="#166534" />
          <Pill icon={ArrowDownRight} label="Cashouts" value={fmtMoney(aggr.cashouts)} bg="#fee2e2" text="#991b1b" />
          <Pill icon={Gift} label="Bonuses" value={fmtMoney(aggr.bonuses)} bg="#fffbeb" text="#b45309" />
          <Pill icon={TrendingUp} label="Profit" value={fmtMoney(aggr.profit)} bg={aggr.profit >= 0 ? "#f0fdf4" : "#fee2e2"} text={aggr.profit >= 0 ? "#166534" : "#991b1b"} bold />
          <Pill icon={Users} label="Players" value={aggr.players} bg="#f5f3ff" text="#6d28d9" />
          <Pill icon={CheckCircle} label="Tasks" value={aggr.tasks} bg="#f1f5f9" text="#475569" />
          {expanded
            ? <ChevronUp style={{ width: "16px", height: "16px", color: "#94a3b8", marginLeft: "4px" }} />
            : <ChevronDown style={{ width: "16px", height: "16px", color: "#94a3b8", marginLeft: "4px" }} />}
        </div>
      </div>
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

  // ── Parse snapshots (may come from enrichShift or from checkin JSON) ──
  let startSnapshot = shift.startSnapshot ?? null;
  let endSnapshot = shift.endSnapshot ?? null;
  if (!startSnapshot && shift.checkin?.balanceNote) {
    try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { }
  }
  if (!endSnapshot && shift.checkin?.additionalNotes) {
    try {
      const p = JSON.parse(shift.checkin.additionalNotes);
      endSnapshot = p.endSnapshot ?? null;
    } catch (_) { }
  }

  // Build wallet comparison rows
  const walletRows = [];
  const endWallets = endSnapshot?.walletSnapshot ?? [];
  const startWallets = startSnapshot?.walletSnapshot ?? [];
  const allWalletIds = [...new Set([...startWallets.map(w => w.id), ...endWallets.map(w => w.id)])];
  allWalletIds.forEach(id => {
    const sw = startWallets.find(w => w.id === id);
    const ew = endWallets.find(w => w.id === id);
    walletRows.push({ name: sw?.name ?? ew?.name ?? id, method: sw?.method ?? ew?.method ?? "", start: sw?.balance ?? 0, end: ew?.balance ?? 0 });
  });

  // Build game comparison rows
  const gameRows = [];
  const endGames = endSnapshot?.gameSnapshot ?? [];
  const startGames = startSnapshot?.gameSnapshot ?? [];
  const allGameIds = [...new Set([...startGames.map(g => g.id), ...endGames.map(g => g.id)])];
  allGameIds.forEach(id => {
    const sg = startGames.find(g => g.id === id);
    const eg = endGames.find(g => g.id === id);
    gameRows.push({ name: sg?.name ?? eg?.name ?? id, start: sg?.pointStock ?? 0, end: eg?.pointStock ?? 0 });
  });

  // ── Compute fees from transaction notes ──────────────────────────
  const txns = shift.transactions || [];
  const depositFees = txns
    .filter(t => t.type === 'DEPOSIT')
    .reduce((sum, t) => {
      const m = (t.notes || '').match(/fee:([\d.]+)/);
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);
  const cashoutFees = txns
    .filter(t => t.type === 'WITHDRAWAL')
    .reduce((sum, t) => {
      const m = (t.notes || '').match(/fee:([\d.]+)/);
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);

  // Fee-adjusted wallet expected change:
  //   deposits credited as (depositAmt - depositFee) each
  //   cashouts debited as  (cashoutAmt + cashoutFee)  each
  const feeAdjustedExpectedWalletChange =
    (endSnapshot?.deposits ?? 0) - depositFees
    - (endSnapshot?.cashouts ?? 0) - cashoutFees;
  const feeAdjustedWalletDiscrepancy =
    (endSnapshot?.walletChange ?? 0) - feeAdjustedExpectedWalletChange;

  // Build wallet rows with per-wallet fee (from transactions)
  const walletFeeMap = {};
  txns.filter(t => t.type === 'DEPOSIT').forEach(t => {
    const wMatch = (t.description || '').match(/via ([^ ]+) - (.+)$/);
    if (wMatch) {
      const key = `${wMatch[1]}__${wMatch[2]}`;
      const feeMatch = (t.notes || '').match(/fee:([\d.]+)/);
      walletFeeMap[key] = (walletFeeMap[key] || 0) + (feeMatch ? parseFloat(feeMatch[1]) : 0);
    }
  });
  // Re-attach fee to walletRows
  walletRows.forEach(r => {
    const key = `${r.method}__${r.name}`;
    r.fee = walletFeeMap[key] ?? null;
  });
  // ─────────────────────────────────────────────────────────────────

  const hasReconciliation = startSnapshot && endSnapshot;
  const hasCheckinNotes = startSnapshot?.notes;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "transactions", label: `Transactions (${shift.transactions?.length || 0})` },
    { id: "tasks", label: `Tasks (${shift.tasks?.length || 0})` },
    { id: "players", label: `Players Added (${shift.playersAdded?.length || 0})` },
    { id: "bonuses", label: `Bonuses (${shift.bonusesGranted?.length || 0})` },
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
              {hasReconciliation && (
                <span style={{ marginLeft: "8px", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: endSnapshot.isBalanced ? "#f0fdf4" : "#fee2e2", color: endSnapshot.isBalanced ? "#16a34a" : "#dc2626" }}>
                  {endSnapshot.isBalanced ? "✓ Balanced" : "⚠️ Discrepancy"}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
          {[
            { icon: Activity, label: "Txns", val: s.transactionCount ?? 0, color: "#475569", bg: "#f1f5f9" },
            { icon: ArrowUpRight, label: "Deposits", val: fmtMoney(s.totalDeposits), color: "#166534", bg: "#f0fdf4" },
            { icon: ArrowDownRight, label: "Cashouts", val: fmtMoney(s.totalCashouts), color: "#991b1b", bg: "#fee2e2" },
            { icon: Gift, label: "Bonuses", val: fmtMoney(s.totalBonuses), color: "#b45309", bg: "#fffbeb" },
            { icon: TrendingUp, label: "Profit", val: fmtMoney(s.netProfit), color: (s.netProfit ?? 0) >= 0 ? "#166534" : "#991b1b", bg: (s.netProfit ?? 0) >= 0 ? "#f0fdf4" : "#fee2e2" },
            { icon: Users, label: "Players", val: s.playersAdded ?? 0, color: "#6d28d9", bg: "#f5f3ff" },
            { icon: CheckCircle, label: "Tasks", val: s.tasksCompleted ?? 0, color: "#475569", bg: "#f1f5f9" },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} style={{ padding: "7px 11px", borderRadius: "8px", background: bg, display: "flex", flexDirection: "column", gap: "1px", minWidth: "70px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                <Icon style={{ width: "9px", height: "9px" }} /> {label}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "800", color }}>{val}</div>
            </div>
          ))}
          {/* Effort rating chip */}
          {shift.checkin?.effortRating && (
            <div style={{ padding: "7px 11px", borderRadius: "8px", background: shift.checkin.effortRating >= 8 ? "#f0fdf4" : shift.checkin.effortRating >= 5 ? "#fffbeb" : "#fee2e2", minWidth: "70px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Effort</div>
              <div style={{ fontSize: "13px", fontWeight: "800", color: shift.checkin.effortRating >= 8 ? "#16a34a" : shift.checkin.effortRating >= 5 ? "#d97706" : "#dc2626" }}>
                {shift.checkin.effortRating}/10
              </div>
            </div>
          )}
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
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Opening notes (if any) */}
          {hasCheckinNotes && (
            <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "3px solid #94a3b8", borderRadius: "8px", fontSize: "12px", color: "#475569" }}>
              <span style={{ fontWeight: "700", color: "#374151" }}>Opening notes: </span>{startSnapshot.notes}
            </div>
          )}

          {/* Reconciliation section */}
          {hasReconciliation ? (
            <>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Wallet style={{ width: "12px", height: "12px" }} /> Balance Reconciliation
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Wallet table */}
                  {walletRows.length > 0 && (
                    <ReconciliationTable
                      title="Wallet Balances"
                      rows={walletRows}
                      startTotal={startSnapshot?.totalWallet ?? 0}
                      endTotal={endSnapshot?.totalWallet ?? 0}
                      expectedChange={feeAdjustedExpectedWalletChange}
                      actualChange={endSnapshot?.walletChange}
                      discrepancy={feeAdjustedWalletDiscrepancy}
                      unit="$"
                      icon={Wallet}
                      iconColor="#2563eb"
                      depositFees={depositFees}
                      cashoutFees={cashoutFees}
                    />
                  )}
                  {/* Game table */}
                  {gameRows.length > 0 && (
                    <ReconciliationTable
                      title="Game Point Stock"
                      rows={gameRows}
                      startTotal={startSnapshot?.totalGames ?? 0}
                      endTotal={endSnapshot?.totalGames ?? 0}
                      expectedChange={-(endSnapshot?.deposits + endSnapshot?.bonuses - endSnapshot?.cashouts)}
                      actualChange={endSnapshot?.gameChange}
                      discrepancy={endSnapshot?.gameDiscrepancy}
                      unit="pts"
                      icon={Gamepad2}
                      iconColor="#7c3aed"
                    />
                  )}
                  {/* Discrepancy banner */}
                  <DiscrepancyBanner endSnapshot={endSnapshot} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "9px", border: "1px dashed #e2e8f0", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
              No balance snapshots recorded for this shift (shift may have started before snapshot feature was enabled)
            </div>
          )}

          {/* Member feedback */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageSquare style={{ width: "12px", height: "12px" }} /> Member Feedback
            </div>
            <FeedbackPanel shift={shift} />
          </div>

          {/* Top depositing players */}
          {shift.playerDepositBreakdown?.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Top Players by Deposits</div>
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
                  <tr>{["Time", "Player", "Type", "Game", "Wallet", "Amount", "Fee", "Balance After"].map(h => <th key={h} style={{ ...TH, padding: "8px 12px", fontSize: "10px" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shift.transactions.map(t => (
                    <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{fmtTime(t.createdAt)}</td>
                      <td style={{ ...TD, padding: "9px 12px" }}>
                        <div style={{ fontWeight: "600", fontSize: "12px" }}>{t.user?.name || `#${t.userId}`}</div>
                        {t.user?.email && <div style={{ fontSize: "10px", color: "#94a3b8" }}>{t.user.email}</div>}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px" }}><TypeBadge type={t.type} /></td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{t.game?.name || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{t.paymentMethod || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontWeight: "700", fontSize: "13px", color: t.type === "DEPOSIT" ? "#166534" : t.type === "WITHDRAWAL" ? "#991b1b" : "#b45309" }}>
                        {fmtMoney(t.amount)}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px" }}>
                        {t.fee > 0 ? <span style={{ color: "#f59e0b", fontWeight: "700" }}>-{fmtMoney(t.fee)}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "12px", color: "#64748b" }}>{t.balanceAfter != null ? fmtMoney(t.balanceAfter) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
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
                    <div key={t.id} style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${t.status === "COMPLETED" ? "#22c55e" : "#f59e0b"}`, borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{t.title}</span>
                            <TaskTypeBadge taskType={t.taskType} />
                            <PriorityBadge priority={t.priority} />
                          </div>
                          {pct !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <ProgressBar pct={pct} />
                              <span style={{ fontSize: "12px", fontWeight: "700" }}>{pct}%</span>
                            </div>
                          )}
                          {checklist.length > 0 && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{doneItems}/{checklist.length} checklist items done</div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span style={{ padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff", color: t.status === "COMPLETED" ? "#166634" : "#1d4ed8" }}>
                            {t.status?.replace("_", " ")}
                          </span>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                {shift.playersAdded.map(p => (
                  <div key={p.id} style={{ padding: "12px 14px", border: "1px solid #ddd6fe", borderRadius: "10px", background: "#f5f3ff" }}>
                    <div style={{ fontWeight: "700", fontSize: "13px" }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>@{p.username}</div>
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#fffbeb", color: "#92400e" }}>{p.tier}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>{fmtTime(p.createdAt)}</div>
                  </div>
                ))}
              </div>
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
                  <tr>{["Time", "Player", "Bonus Type", "Game", "Amount", "Granted By"].map(h => <th key={h} style={{ ...TH, padding: "8px 12px", fontSize: "10px" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shift.bonusesGranted.map(b => (
                    <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{fmtTime(b.createdAt)}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "12px", fontWeight: "600" }}>{b.user?.name || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px" }}><TypeBadge type="BONUS" /></td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{b.game?.name || "—"}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontWeight: "700", fontSize: "13px", color: "#b45309" }}>{fmtMoney(b.amount)}</td>
                      <td style={{ ...TD, padding: "9px 12px", fontSize: "11px", color: "#94a3b8" }}>{b.grantedBy?.name || "System"}</td>
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

// ══════════════════════════════════════════════════════════════════
// PDF PRINT
// ══════════════════════════════════════════════════════════════════
function printReport(report, date) {
  const win = window.open("", "_blank");
  const { summary, teams, wallets, dayTasks } = report;

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
        <td style="color:#d97706;font-weight:700">${fmtMoney(s.totalBonuses)}</td>
        <td style="font-weight:800;color:${(s.netProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoney(s.netProfit)}</td>
        <td>${s.playersAdded ?? 0}</td>
        <td>${s.tasksCompleted ?? 0}</td>
        <td style="font-weight:700;color:${effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626'}">${effort != null ? `${effort}/10` : "—"}</td>
        <td style="font-weight:700;color:${balanced === true ? '#16a34a' : balanced === false ? '#dc2626' : '#94a3b8'}">${balanced === true ? "✓" : balanced === false ? "⚠️" : "—"}</td>
      </tr>`;
    })
  ).join("");

  // ── Per-shift reconciliation sections ──
  const shiftReconciliationHtml = teams.flatMap(team =>
    team.shifts.filter(shift => !shift.isActive).map(shift => {
      // Parse snapshots
      let startSnapshot = shift.startSnapshot ?? null;
      let endSnapshot = shift.endSnapshot ?? null;
      if (!startSnapshot && shift.checkin?.balanceNote) {
        try { startSnapshot = JSON.parse(shift.checkin.balanceNote); } catch (_) { }
      }
      if (!endSnapshot && shift.checkin?.additionalNotes) {
        try { const p = JSON.parse(shift.checkin.additionalNotes); endSnapshot = p.endSnapshot ?? null; } catch (_) { }
      }

      const effort = shift.checkin?.effortRating;
      const effortReason = shift.effortReason ?? null;
      const improvements = shift.improvements ?? null;
      const workSummary = shift.checkin?.workSummary ?? null;
      const issues = shift.checkin?.issuesEncountered ?? null;

      if (!startSnapshot && !endSnapshot && !effort) return "";

      const walletHtml = (() => {
        if (!startSnapshot || !endSnapshot) return "";
        const startWs = startSnapshot.walletSnapshot ?? [];
        const endWs = endSnapshot.walletSnapshot ?? [];
        const allIds = [...new Set([...startWs.map(w => w.id), ...endWs.map(w => w.id)])];

        // Compute per-wallet fees from transactions
        const wFeeMap = {};
        (shift.transactions || []).filter(t => t.type === 'DEPOSIT').forEach(t => {
          const wMatch = (t.description || '').match(/via ([^ ]+) - (.+)$/);
          if (wMatch) {
            const key = `${wMatch[1]}__${wMatch[2]}`;
            const feeMatch = (t.notes || '').match(/fee:([\d.]+)/);
            wFeeMap[key] = (wFeeMap[key] || 0) + (feeMatch ? parseFloat(feeMatch[1]) : 0);
          }
        });
        const pDepFees = (shift.transactions || []).filter(t => t.type === 'DEPOSIT').reduce((s, t) => {
          const m = (t.notes || '').match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0);
        }, 0);
        const pCoFees = (shift.transactions || []).filter(t => t.type === 'WITHDRAWAL').reduce((s, t) => {
          const m = (t.notes || '').match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0);
        }, 0);
        const pTotalFees = pDepFees + pCoFees;
        const hasFees = pTotalFees > 0;

        const rows = allIds.map(id => {
          const sw = startWs.find(w => w.id === id);
          const ew = endWs.find(w => w.id === id);
          const delta = (ew?.balance ?? 0) - (sw?.balance ?? 0);
          const wKey = `${sw?.method ?? ew?.method ?? ""}__${sw?.name ?? ew?.name ?? id}`;
          const rowFee = wFeeMap[wKey] ?? 0;
          return `<tr>
            <td>${sw?.method ?? ew?.method ?? ""} — ${sw?.name ?? ew?.name ?? id}</td>
            <td style="text-align:right;color:#64748b">${fmtMoney(sw?.balance ?? 0)}</td>
            <td style="text-align:right;font-weight:600">${fmtMoney(ew?.balance ?? 0)}</td>
            ${hasFees ? `<td style="text-align:right;color:#b45309;font-size:10px">${rowFee > 0 ? `−${fmtMoney(rowFee)}` : '—'}</td>` : ''}
            <td style="text-align:right;font-weight:700;color:${delta >= 0 ? '#16a34a' : '#dc2626'}">${delta >= 0 ? '+' : '−'}${fmtMoney(Math.abs(delta))}</td>
          </tr>`;
        }).join("");
        const walletDelta = (endSnapshot.totalWallet ?? 0) - (startSnapshot.totalWallet ?? 0);
        const feesNote = hasFees ? `<span style="color:#b45309;font-size:10px"> (incl. fees −${fmtMoney(pTotalFees)})</span>` : '';
        return `
          <p style="font-weight:700;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 6px">Wallet Balances</p>
          <table style="margin-bottom:12px">
            <thead><tr><th>Account</th><th style="text-align:right">Start</th><th style="text-align:right">End</th>${hasFees ? '<th style="text-align:right;color:#b45309">Fees</th>' : ''}<th style="text-align:right">Change</th></tr></thead>
            <tbody>
              ${rows}
              <tr style="background:#f8fafc">
                <td><strong>Total</strong>${feesNote}</td>
                <td style="text-align:right;font-weight:600">${fmtMoney(startSnapshot.totalWallet ?? 0)}</td>
                <td style="text-align:right;font-weight:700">${fmtMoney(endSnapshot.totalWallet ?? 0)}</td>
                ${hasFees ? `<td style="text-align:right;font-weight:700;color:#b45309">−${fmtMoney(pTotalFees)}</td>` : ''}
                <td style="text-align:right;font-weight:800;color:${walletDelta >= 0 ? '#16a34a' : '#dc2626'}">${walletDelta >= 0 ? '+' : '−'}${fmtMoney(Math.abs(walletDelta))}</td>
              </tr>
            </tbody>
          </table>`;
      })();

      const gameHtml = (() => {
        if (!startSnapshot || !endSnapshot) return "";
        const startGs = startSnapshot.gameSnapshot ?? [];
        const endGs = endSnapshot.gameSnapshot ?? [];
        const allIds = [...new Set([...startGs.map(g => g.id), ...endGs.map(g => g.id)])];
        const rows = allIds.map(id => {
          const sg = startGs.find(g => g.id === id);
          const eg = endGs.find(g => g.id === id);
          const delta = (eg?.pointStock ?? 0) - (sg?.pointStock ?? 0);
          return `<tr>
            <td>${sg?.name ?? eg?.name ?? id}</td>
            <td style="text-align:right;color:#64748b">${(sg?.pointStock ?? 0).toFixed(0)} pts</td>
            <td style="text-align:right;font-weight:600">${(eg?.pointStock ?? 0).toFixed(0)} pts</td>
            <td style="text-align:right;font-weight:700;color:${delta <= 0 ? '#16a34a' : '#dc2626'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(0)} pts</td>
          </tr>`;
        }).join("");
        const gameDelta = (endSnapshot.totalGames ?? 0) - (startSnapshot.totalGames ?? 0);
        return `
          <p style="font-weight:700;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin:12px 0 6px">Game Point Stock</p>
          <table style="margin-bottom:12px">
            <thead><tr><th>Game</th><th style="text-align:right">Start</th><th style="text-align:right">End</th><th style="text-align:right">Change</th></tr></thead>
            <tbody>
              ${rows}
              <tr style="background:#f8fafc">
                <td><strong>Total</strong></td>
                <td style="text-align:right;font-weight:600">${(startSnapshot.totalGames ?? 0).toFixed(0)} pts</td>
                <td style="text-align:right;font-weight:700">${(endSnapshot.totalGames ?? 0).toFixed(0)} pts</td>
                <td style="text-align:right;font-weight:800;color:${gameDelta <= 0 ? '#16a34a' : '#dc2626'}">${gameDelta >= 0 ? '+' : '−'}${Math.abs(gameDelta).toFixed(0)} pts</td>
              </tr>
            </tbody>
          </table>`;
      })();

      const discrepancyHtml = endSnapshot ? (() => {
        const { deposits, cashouts, bonuses, netProfit, walletChange, gameChange } = endSnapshot;
        // Recompute discrepancy with fees
        const pDepFees2 = (shift.transactions || []).filter(t => t.type === 'DEPOSIT').reduce((s, t) => {
          const m = (t.notes || '').match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0);
        }, 0);
        const pCoFees2 = (shift.transactions || []).filter(t => t.type === 'WITHDRAWAL').reduce((s, t) => {
          const m = (t.notes || '').match(/fee:([\d.]+)/); return s + (m ? parseFloat(m[1]) : 0);
        }, 0);
        const feeAdjExp = (deposits ?? 0) - pDepFees2 - (cashouts ?? 0) - pCoFees2;
        const feeAdjDisc = (walletChange ?? 0) - feeAdjExp;
        const isOk = Math.abs(feeAdjDisc) < 0.02;
        const feesLine = (pDepFees2 + pCoFees2) > 0
          ? ` | Dep fees −${fmtMoney(pDepFees2)}${pCoFees2 > 0 ? ` · CO fees −${fmtMoney(pCoFees2)}` : ''}`
          : '';
        return `<div style="padding:10px 14px;background:${isOk ? '#f0fdf4' : '#fef2f2'};border-left:4px solid ${isOk ? '#16a34a' : '#dc2626'};border-radius:6px;margin-bottom:12px;font-size:11px">
          <strong style="color:${isOk ? '#166534' : '#991b1b'}">${isOk ? "✓ Fully balanced" : `⚠️ Discrepancy: ${fmtMoney(Math.abs(feeAdjDisc))}`}</strong><br/>
          Deposits ${fmtMoney(deposits)} − Cashouts ${fmtMoney(cashouts)} − Bonuses ${fmtMoney(bonuses)} = Net ${fmtMoney(netProfit)}${feesLine} | Wallet Δ ${walletChange >= 0 ? '+' : ''}${fmtMoney(walletChange)} | Game Δ ${(gameChange ?? 0) >= 0 ? '+' : ''}${(gameChange ?? 0).toFixed(0)} pts | Discrepancy (fee-adj): ${fmtMoney(feeAdjDisc)}
        </div>`;
      })() : "";

      const feedbackHtml = (effort || effortReason || improvements || workSummary || issues) ? `
        <p style="font-weight:700;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin:12px 0 6px">Member Feedback</p>
        <table style="margin-bottom:8px">
          <tbody>
            ${effort ? `<tr><td style="font-weight:700;width:160px">Effort rating</td><td style="font-weight:800;color:${effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626'}">${effort}/10</td></tr>` : ""}
            ${effortReason ? `<tr><td style="font-weight:700;vertical-align:top">Why this rating?</td><td>${effortReason}</td></tr>` : ""}
            ${improvements ? `<tr><td style="font-weight:700;vertical-align:top">Could do better</td><td>${improvements}</td></tr>` : ""}
            ${workSummary ? `<tr><td style="font-weight:700;vertical-align:top">Work summary</td><td>${workSummary}</td></tr>` : ""}
            ${issues ? `<tr><td style="font-weight:700;vertical-align:top">Issues encountered</td><td>${issues}</td></tr>` : ""}
          </tbody>
        </table>` : "";

      if (!walletHtml && !gameHtml && !feedbackHtml) return "";

      return `
        <div style="margin-bottom:20px;page-break-inside:avoid">
          <h3 style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">
            ${ROLE_LABEL[team.role] || team.role} — ${team.member?.name || "?"} · ${fmtTime(shift.startTime)} → ${fmtTime(shift.endTime)} (${shift.duration ?? "?"} min)
          </h3>
          ${walletHtml}${gameHtml}${discrepancyHtml}${feedbackHtml}
        </div>`;
    })
  ).filter(Boolean).join("");

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
    `<tr><td>${w.name}</td><td>${w.method}</td><td style="font-weight:700;color:#16a34a">${fmtMoney(w.balance || 0)}</td></tr>`
  ).join("");

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Operations Report — ${date}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Segoe UI",Arial,sans-serif; font-size:12px; color:#0f172a; background:#fff; padding:32px; }
  h1 { font-size:22px; font-weight:800; margin-bottom:4px; }
  h2 { font-size:14px; font-weight:700; margin:28px 0 10px; color:#374151; border-bottom:2px solid #e5e7eb; padding-bottom:6px; }
  h3 { font-size:12px; font-weight:700; }
  .meta { font-size:12px; color:#64748b; margin-bottom:24px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .box { border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; }
  .val { font-size:20px; font-weight:800; }
  .lbl { font-size:10px; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.4px; }
  .green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}.amber{color:#d97706}.purple{color:#7c3aed}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px}
  th{background:#f8fafc;text-align:left;padding:8px 10px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e2e8f0}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
  button{padding:10px 20px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}
  .section{margin-bottom:32px;page-break-inside:avoid}
  @media print{button{display:none}}
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
    <div>
      <h1>📊 Daily Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} &nbsp;·&nbsp; Report Date: ${fmtDate(date + "T12:00:00")}</p>
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
    <tbody>${memberRows || '<tr><td colspan="13" style="text-align:center;color:#94a3b8;padding:20px">No shifts today</td></tr>'}</tbody>
  </table>

  ${shiftReconciliationHtml ? `<h2>Shift-Level Reconciliation &amp; Feedback</h2><div class="section">${shiftReconciliationHtml}</div>` : ""}

  ${(dayTasks || []).length > 0 ? `
  <h2>All Tasks (${dayTasks.length})</h2>
  <table>
    <thead><tr><th>Time</th><th>Task</th><th>Type</th><th>Assigned To</th><th>Status</th><th>Progress</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>` : ""}

  ${(wallets || []).length > 0 ? `
  <h2>Current Wallet Balances</h2>
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

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Header ── */}
      <div style={{ ...CARD, padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", background: "rgb(14,165,233)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText style={{ width: "22px", height: "22px", color: "#fff" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Daily Operations Report</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{report ? fmtDate(report.date + "T12:00:00") : "Loading…"}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff" }}>
              <Calendar style={{ width: "14px", height: "14px", color: "#64748b" }} />
              <input type="date" value={selectedDate} max={todayStr} onChange={e => setSelectedDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: "13px", color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
            </div>
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
            <button onClick={() => fetchReport(selectedDate, teamFilter)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              <RefreshCw style={{ width: "14px", height: "14px", animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <button onClick={() => report && printReport(report, report.date)} disabled={!report || loading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", border: "none", borderRadius: "9px", background: "rgb(14,165,233)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: report ? "pointer" : "not-allowed", opacity: report ? 1 : 0.5 }}>
              <Download style={{ width: "14px", height: "14px" }} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} /> {error}
        </div>
      )}

      {loading && !report && (
        <div style={{ ...CARD, padding: "80px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0f172a", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          Generating report…
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
              <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} icon={ArrowUpRight} color={{ bg: "#f0fdf4", icon: "#16a34a" }} />
              <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} icon={ArrowDownRight} color={{ bg: "#fee2e2", icon: "#dc2626" }} />
              <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} icon={Gift} color={{ bg: "#fffbeb", icon: "#d97706" }} />
              <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} icon={s.netProfit >= 0 ? TrendingUp : TrendingDown} color={{ bg: s.netProfit >= 0 ? "#f0fdf4" : "#fee2e2", icon: s.netProfit >= 0 ? "#16a34a" : "#dc2626" }} />
              <StatCard label="Tasks Completed" value={s.tasksCompleted} icon={CheckCircle} color={{ bg: "#f0fdf4", icon: "#16a34a" }} />
              <StatCard label="Transactions" value={s.transactionCount} icon={Activity} color={{ bg: "#eff6ff", icon: "#2563eb" }} />
              <StatCard label="Shifts Logged" value={s.totalShifts} icon={Clock} color={{ bg: "#f1f5f9", icon: "#475569" }} sub={`${s.activeShifts} active`} />
            </div>
          </div>

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
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>All Tasks Today ({report.dayTasks.length})</h3>
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
                        <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ ...TD, color: "#94a3b8", fontSize: "12px" }}>{fmtTime(t.completedAt || t.updatedAt)}</td>
                          <td style={TD}>
                            <div style={{ fontWeight: "600" }}>{t.title}</div>
                            {t.description && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{t.description}</div>}
                          </td>
                          <td style={TD}><TaskTypeBadge taskType={t.taskType} /></td>
                          <td style={{ ...TD, fontSize: "12px" }}>{t.assignToAll ? <span style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed" }}>All Members</span> : t.assignedTo?.name || "—"}</td>
                          <td style={TD}>
                            <span style={{ padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", background: t.status === "COMPLETED" ? "#dcfce7" : "#eff6ff", color: t.status === "COMPLETED" ? "#166634" : "#1d4ed8" }}>
                              {t.status?.replace("_", " ")}
                            </span>
                          </td>
                          <td style={{ ...TD, minWidth: "160px" }}>
                            {pct !== null ? (
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                                  <span>{t.taskType === "REVENUE_TARGET" ? `${fmtMoney(t.currentValue)} / ${fmtMoney(t.targetValue)}` : `${t.currentValue} / ${t.targetValue}`}</span>
                                  <span style={{ fontWeight: "700" }}>{pct}%</span>
                                </div>
                                <ProgressBar pct={pct} />
                              </div>
                            ) : checklist.length > 0 ? (
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{doneItems}/{checklist.length} items</span>
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
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Current Wallet Balances</h3>
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

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} } input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6}`}</style>
    </div>
  );
}
