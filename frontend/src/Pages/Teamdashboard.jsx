// MemberTasksSection.jsx — Redesigned Member Dashboard
// Drop-in replacement. Maintains all original API calls & logic.

import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Circle, Clock, AlertCircle, RefreshCw,
  TrendingUp, Users, List, ChevronDown, ChevronUp,
  Calendar, Plus, X, Check, Star, Award, Zap, Flame,
  UserCheck, Phone, Mail, Camera, Instagram, Send, User,
  ClipboardList, Lock, Unlock, Undo2, Gift, Search,
  BarChart2, Shield, Activity, Target, ArrowUpRight,
  ArrowDownRight, Minus, ChevronRight, DollarSign,
  TrendingDown, Briefcase, AlertTriangle, Layers
} from "lucide-react";
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { PlayerFollowupCard, BonusFollowupCard } from './FollowupTaskCards';
import AdminTeamShiftsSection from './AdminTeamShiftsSection.jsx';
import { useToast } from '../Context/toastContext';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── Config ───────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? "";

const getStoreId = () => parseInt(localStorage.getItem('__obStoreId') || '1', 10);
function getAuthHeaders(ct = false) {
  const token = localStorage.getItem('authToken');
  const h = { 'X-Store-Id': String(getStoreId()) };
  if (ct) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
function extractUserId(u) {
  if (!u) return null;
  const raw = u.id ?? u.userId ?? u.user?.id ?? null;
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return { label: fmtDate(iso) + " " + fmtTime(iso), isOverdue: d < new Date() };
}

// ─── Design tokens ────────────────────────────────────────────
const PRIORITY_COLOR = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", URGENT: "#dc2626" };
const TYPE_META = {
  STANDARD: { label: "Standard", color: "#6366f1", light: "#eef2ff" },
  DAILY_CHECKLIST: { label: "Daily Checklist", color: "#0ea5e9", light: "#f0f9ff" },
  PLAYER_ADDITION: { label: "Player Addition", color: "#8b5cf6", light: "#f5f3ff" },
  REVENUE_TARGET: { label: "Revenue Target", color: "#22c55e", light: "#f0fdf4" },
  PLAYER_FOLLOWUP: { label: "Player Followup", color: "#f97316", light: "#fff7ed" },
  BONUS_FOLLOWUP: { label: "Bonus Followup", color: "#10b981", light: "#ecfdf5" },
  MISSING_INFO: { label: "Missing Info", color: "#ec4899", light: "#fdf2f8" },
};
const MISSING_FIELD_META = {
  email: { label: "Email", placeholder: "player@email.com", type: "email" },
  phone: { label: "Phone", placeholder: "+1 234 567 8900", type: "tel" },
  snapchat: { label: "Snapchat", placeholder: "@snapchat", type: "text" },
  instagram: { label: "Instagram", placeholder: "@instagram", type: "text" },
  telegram: { label: "Telegram", placeholder: "@telegram", type: "text" },
  assigned_member: { label: "Assign Member", placeholder: "Select…", type: "select" },
};
const RATING_CATEGORIES = [
  { key: "communicationWithPlayer", label: "Communication", icon: "💬" },
  { key: "loadReloadSmoothness", label: "Load/Reload", icon: "⚡" },
  { key: "liveReportingToPlayers", label: "Live Reporting", icon: "📡" },
  { key: "playtimeBonus", label: "Playtime Bonus", icon: "🎮" },
  { key: "referralBonus", label: "Referral Bonus", icon: "👥" },
  { key: "matchAndRandomBonus", label: "Match Bonus", icon: "🎯" },
  { key: "playerEngagementOverall", label: "Engagement", icon: "🔥" },
  { key: "reachingOutInShifts", label: "Reach Out (Shift)", icon: "📲" },
  { key: "reachingOutFromOwnList", label: "Reach Out (Own)", icon: "📋" },
  { key: "cashoutTiming", label: "Cashout Timing", icon: "⏱️" },
];

// ─── Shared input/label styles ─────────────────────────────────
const INPUT_S = {
  width: "100%", padding: "8px 11px",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)", fontSize: "13px",
  fontFamily: "inherit", boxSizing: "border-box",
  background: "var(--color-background-primary)",
  color: "var(--color-text-primary)", outline: "none",
};
const LBL_S = {
  display: "block", fontSize: "11px", fontWeight: "500",
  color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px",
};

// ══════════════════════════════════════════════════════════════
// ── Atomic UI Components ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      borderRadius: "var(--border-radius-lg)",
      border: "0.5px solid var(--color-border-tertiary)",
      ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color = "#0ea5e9", trend, trendVal }) {
  const trendUp = trendVal > 0;
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
        {Icon && <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: "14px", height: "14px", color }} />
        </div>}
      </div>
      <span style={{ fontSize: "24px", fontWeight: "500", color: "var(--color-text-primary)", lineHeight: 1 }}>{value}</span>
      {(sub || trendVal != null) && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {trendVal != null && (
            <span style={{ fontSize: "11px", color: trendUp ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: "2px" }}>
              {trendUp ? <ArrowUpRight style={{ width: "11px", height: "11px" }} /> : <ArrowDownRight style={{ width: "11px", height: "11px" }} />}
              {Math.abs(trendVal)}%
            </span>
          )}
          {sub && <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function Badge({ label, color = "#6366f1", light = "#eef2ff" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: "999px", fontSize: "10px", fontWeight: "500",
      background: light, color,
      border: "0.5px solid " + color + "40",
    }}>{label}</span>
  );
}

function PriorityDot({ priority }) {
  return <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_COLOR[priority] || "#cbd5e1", flexShrink: 0, display: "inline-block" }} />;
}

function ProgressBar({ pct, color = "#0ea5e9", height = 4 }) {
  return (
    <div style={{ height, background: "var(--color-border-tertiary)", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .4s ease" }} />
    </div>
  );
}

function StarRating({ value = 0, max = 5, size = 12 }) {
  return (
    <span style={{ display: "inline-flex", gap: "1px" }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize: size, color: i < Math.round(value) ? "#f59e0b" : "var(--color-border-secondary)" }}>★</span>
      ))}
    </span>
  );
}

// ── Donut ring for completion % ────────────────────────────────
function DonutRing({ pct, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color = pct >= 75 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#f97316";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--color-text-primary)">{pct}%</text>
    </svg>
  );
}

// ── Custom chart tooltip ───────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = "$" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: "12px" }}>
      <p style={{ margin: "0 0 4px", color: "var(--color-text-secondary)", fontWeight: "500" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color, fontWeight: "500" }}>
          {p.name}: {prefix}{typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Section: Financial Charts ─────────────────────────────────
// ══════════════════════════════════════════════════════════════
function FinancialSection({ shifts }) {
  const [period, setPeriod] = useState("7d");

  // Build daily data from shift stats
  const data = useMemo(() => {
    const days = period === "1d" ? 1 : period === "7d" ? 7 : 30;
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = fmtDate(d.toISOString());
      map[key] = { date: key, deposits: 0, cashouts: 0, bonuses: 0, profit: 0 };
    }
    (shifts || []).forEach(s => {
      const st = s.stats || {};
      const key = fmtDate(s.startTime);
      if (map[key]) {
        map[key].deposits += st.totalDeposits || 0;
        map[key].cashouts += st.totalCashouts || 0;
        map[key].bonuses += st.totalBonuses || 0;
        map[key].profit += st.netProfit || 0;
      }
    });
    return Object.values(map);
  }, [shifts, period]);

  const totals = useMemo(() => data.reduce((acc, d) => ({
    deposits: acc.deposits + d.deposits,
    cashouts: acc.cashouts + d.cashouts,
    bonuses: acc.bonuses + d.bonuses,
    profit: acc.profit + d.profit,
  }), { deposits: 0, cashouts: 0, bonuses: 0, profit: 0 }), [data]);

  const PERIODS = [{ id: "1d", label: "Today" }, { id: "7d", label: "7 days" }, { id: "30d", label: "30 days" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header + period selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary)" }}>Financial Overview</span>
        <div style={{ display: "flex", gap: "2px", background: "var(--color-background-secondary)", padding: "3px", borderRadius: "var(--border-radius-md)" }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              padding: "4px 10px", borderRadius: "6px", border: "none",
              fontSize: "11px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit",
              background: period === p.id ? "var(--color-background-primary)" : "transparent",
              color: period === p.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              boxShadow: period === p.id ? "0 0 0 0.5px var(--color-border-secondary)" : "none",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Summary metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
        <MetricCard label="Deposits" value={`$${totals.deposits.toFixed(0)}`} color="#22c55e" icon={ArrowUpRight} />
        <MetricCard label="Cashouts" value={`$${totals.cashouts.toFixed(0)}`} color="#ef4444" icon={ArrowDownRight} />
        <MetricCard label="Bonuses" value={`$${totals.bonuses.toFixed(0)}`} color="#f59e0b" icon={Gift} />
        <MetricCard label="Net Profit" value={`$${totals.profit.toFixed(0)}`} color={totals.profit >= 0 ? "#22c55e" : "#ef4444"} icon={TrendingUp} />
      </div>

      {/* Area chart */}
      <Card style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Deposits vs Cashouts</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#22c55e" fill="url(#gDep)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="cashouts" name="Cashouts" stroke="#ef4444" fill="url(#gCash)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: "14px", marginTop: "8px" }}>
          {[{ c: "#22c55e", l: "Deposits" }, { c: "#ef4444", l: "Cashouts" }].map(x => (
            <span key={x.l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
              <span style={{ width: "10px", height: "3px", borderRadius: "2px", background: x.c, display: "inline-block" }} />{x.l}
            </span>
          ))}
        </div>
      </Card>

      {/* Profit bar chart */}
      <Card style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Net Profit per Day</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="profit" name="Profit" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Section: Shift Logs ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function ShiftLogsSection({ shifts }) {
  const [expanded, setExpanded] = useState(false);
  const recent = (shifts || []).slice(0, expanded ? 10 : 5);
  if (!shifts?.length) return null;

  return (
    <Card>
      <button onClick={() => setExpanded(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit",
      }}>
        <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Briefcase style={{ width: "14px", height: "14px", color: "var(--color-text-secondary)" }} />
          Shift Logs
          <span style={{ fontSize: "11px", fontWeight: "500", padding: "2px 7px", borderRadius: "999px", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{shifts.length}</span>
        </span>
        {expanded ? <ChevronUp style={{ width: "13px", height: "13px", color: "var(--color-text-tertiary)" }} /> : <ChevronDown style={{ width: "13px", height: "13px", color: "var(--color-text-tertiary)" }} />}
      </button>

      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "0 16px 14px" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {["Date", "Duration", "Deposits", "Cashouts", "Net", "Effort", "Rating"].map(h => (
                  <th key={h} style={{ padding: "8px 10px 6px", textAlign: h === "Date" ? "left" : "right", fontSize: "10px", fontWeight: "500", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(s => {
                const st = s.stats || {};
                const net = (st.totalDeposits || 0) - (st.totalCashouts || 0);
                const effort = s.checkin?.effortRating ?? st.effortRating ?? null;
                const rating = s.rating?.overallRating ?? s.checkin?.rating?.overallRating ?? null;
                return (
                  <tr key={s.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 10px", color: "var(--color-text-primary)", fontWeight: "500" }}>{fmtDate(s.startTime)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--color-text-secondary)" }}>{s.duration != null ? `${s.duration}m` : "—"}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#22c55e", fontWeight: "500" }}>${(st.totalDeposits || 0).toFixed(0)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#ef4444", fontWeight: "500" }}>${(st.totalCashouts || 0).toFixed(0)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: net >= 0 ? "#22c55e" : "#ef4444", fontWeight: "500" }}>
                      {net >= 0 ? "+" : ""}${Math.abs(net).toFixed(0)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: effort != null ? (effort >= 7 ? "#22c55e" : effort >= 4 ? "#f59e0b" : "#ef4444") : "var(--color-text-tertiary)" }}>
                      {effort != null ? `${effort}/10` : "—"}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>
                      {rating != null ? <StarRating value={rating} size={11} /> : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!expanded && shifts.length > 5 && (
          <button onClick={() => setExpanded(true)} style={{ marginTop: "10px", width: "100%", padding: "7px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", fontSize: "12px", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            Show {shifts.length - 5} more
          </button>
        )}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Rating Panel ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function RatingPanel({ ratings }) {
  const [expanded, setExpanded] = useState(false);
  if (!ratings?.lastShift) return null;
  const { lastShift, monthly, total, categoryAverages } = ratings;
  const overall = lastShift?.overallRating ?? 0;
  const color = overall >= 4 ? "#22c55e" : overall >= 3 ? "#f59e0b" : "#ef4444";

  return (
    <Card accent={color}>
      <button onClick={() => setExpanded(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
      }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Star style={{ width: "16px", height: "16px", color }} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <StarRating value={overall} size={13} />
            <span style={{ fontSize: "13px", fontWeight: "500", color }}>{overall.toFixed(1)}/5</span>
            <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>last shift</span>
          </div>
          {lastShift?.recommendations && (
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
              "{lastShift.recommendations.slice(0, 80)}{lastShift.recommendations.length > 80 ? "…" : ""}"
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <div style={{ textAlign: "center", padding: "6px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>{monthly?.avgRating?.toFixed(1) ?? "—"}</div>
            <div style={{ fontSize: "9px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Month</div>
          </div>
          <div style={{ textAlign: "center", padding: "6px 10px", background: "#fffbeb", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ fontSize: "14px", fontWeight: "500", color: "#d97706" }}>⭐{total?.totalStars ?? 0}</div>
            <div style={{ fontSize: "9px", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.4px" }}>Stars</div>
          </div>
        </div>
        {expanded ? <ChevronUp style={{ width: "13px", height: "13px", color: "var(--color-text-tertiary)", flexShrink: 0 }} /> : <ChevronDown style={{ width: "13px", height: "13px", color: "var(--color-text-tertiary)", flexShrink: 0 }} />}
      </button>

      {expanded && categoryAverages && (
        <div style={{ padding: "0 16px 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ ...LBL_S, marginTop: "12px", marginBottom: "10px" }}>Category breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {RATING_CATEGORIES.map(cat => {
              const val = lastShift[cat.key] ?? 0;
              const pct = (val / 5) * 100;
              const barColor = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
              return (
                <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>{cat.icon}</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", flex: "0 0 130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.label}</span>
                  <div style={{ flex: 1 }}><ProgressBar pct={pct} color={barColor} height={3} /></div>
                  <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--color-text-primary)", minWidth: "24px", textAlign: "right" }}>{val.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Task Cards ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function TaskTypeBadge({ taskType }) {
  const m = TYPE_META[taskType] || TYPE_META.STANDARD;
  return <Badge label={m.label} color={m.color} light={m.light} />;
}

function MissingInfoTaskCard({ task, currentUser, onClaim, onInfoSubmitted }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [form, setForm] = useState({});

  const myId = extractUserId(currentUser);
  const playerMeta = useMemo(() => { try { return JSON.parse(task.notes || "{}"); } catch { return {}; } }, [task.notes]);
  const missingFields = useMemo(() => (task.checklistItems || []).filter(i => !i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")), [task.checklistItems]);
  const doneFields = useMemo(() => (task.checklistItems || []).filter(i => i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")), [task.checklistItems]);
  const total = (task.checklistItems || []).length;
  const done = doneFields.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isOther = !!task.assignedToId && !isMe;
  const isDone = task.status === "COMPLETED";
  const m = TYPE_META.MISSING_INFO;

  useEffect(() => {
    if (missingFields.includes("assigned_member") && isMe) {
      fetch(`${API}/team-members`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.json()).then(d => setTeamMembers(d.data || [])).catch(() => { });
    }
  }, [isMe, missingFields]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`${API}/tasks/${task.id}/claim`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); onClaim(d.data);
    } catch (e) { toast(e.message, "error"); } finally { setClaiming(false); }
  };
  const handleSubmit = async () => {
    if (!Object.values(form).some(v => v?.trim?.())) { toast("Fill at least one field.", "error"); return; }
    setSubmitting(true);
    try {
      const body = {}; missingFields.forEach(k => { if (form[k]) body[k === "assigned_member" ? "assignedMemberId" : k] = form[k]; });
      const res = await fetch(`${API}/tasks/${task.id}/submit-missing-info`, { method: "POST", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); toast("Information submitted successfully.", "success"); setForm({}); onInfoSubmitted(d.data);
    } catch (e) { toast(e.message, "error"); } finally { setSubmitting(false); }
  };
  const handleUndo = async () => {
    setUndoing(true);
    try {
      const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); toast("Task completion undone.", "success"); onInfoSubmitted(d.data);
    } catch (e) { toast(e.message, "error"); } finally { setUndoing(false); }
  };

  return (
    <Card accent={isDone ? "#22c55e" : m.color} style={{ overflow: "hidden", opacity: isDone ? 0.85 : 1 }}>
      <div style={{ padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "9px", flexShrink: 0, background: isDone ? "#f0fdf4" : m.light, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ClipboardList style={{ width: "14px", height: "14px", color: isDone ? "#22c55e" : m.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginBottom: "5px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary)" }}>{task.title}</span>
            <TaskTypeBadge taskType="MISSING_INFO" />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "90px" }}><ProgressBar pct={pct} color={m.color} /></div>
            <span style={{ fontSize: "11px", color: isDone ? "#22c55e" : "var(--color-text-tertiary)" }}>{done}/{total}</span>
            {!isDone && !isOther && (
              <span style={{ fontSize: "10px", color: isMe ? "#ea580c" : m.color, fontWeight: "500", display: "flex", alignItems: "center", gap: "2px" }}>
                {isMe ? <><Lock style={{ width: "9px", height: "9px" }} /> You</> : <><Unlock style={{ width: "9px", height: "9px" }} /> Open</>}
              </span>
            )}
          </div>
        </div>
        {!isOther && !isDone && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "7px", cursor: "pointer", padding: "4px", color: "var(--color-text-tertiary)", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
          </button>
        )}
      </div>

      {expanded && !isDone && !isOther && (
        <div style={{ padding: "0 14px 13px", display: "flex", flexDirection: "column", gap: "9px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{task.description}</p>}
          {!task.assignedToId && (
            <button onClick={handleClaim} disabled={claiming} style={{ padding: "8px", borderRadius: "var(--border-radius-md)", border: "none", background: claiming ? "var(--color-background-secondary)" : m.color, color: claiming ? "var(--color-text-tertiary)" : "#fff", fontWeight: "500", fontSize: "12px", cursor: claiming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "inherit" }}>
              {claiming ? <><RefreshCw style={{ width: "11px", height: "11px" }} />Claiming…</> : <><UserCheck style={{ width: "11px", height: "11px" }} />Claim Task</>}
            </button>
          )}
          {isMe && missingFields.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {missingFields.map(k => {
                const fm = MISSING_FIELD_META[k]; if (!fm) return null;
                return k === "assigned_member" ? (
                  <div key={k}><label style={LBL_S}>{fm.label}</label>
                    <select value={form[k] || ""} onChange={set(k)} style={INPUT_S}>
                      <option value="">{fm.placeholder}</option>
                      {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>)}
                    </select></div>
                ) : (
                  <div key={k}><label style={LBL_S}>{fm.label}</label>
                    <input type={fm.type} value={form[k] || ""} onChange={set(k)} placeholder={fm.placeholder} style={INPUT_S} /></div>
                );
              })}
              {success && <span style={{ fontSize: "11px", color: "#22c55e" }}>✓ Submitted!</span>}
              <button onClick={handleSubmit} disabled={submitting || success} style={{ padding: "8px", borderRadius: "var(--border-radius-md)", border: "none", background: submitting || success ? "var(--color-background-secondary)" : m.color, color: submitting || success ? "var(--color-text-tertiary)" : "#fff", fontWeight: "500", fontSize: "12px", cursor: submitting || success ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                {submitting ? <><RefreshCw style={{ width: "11px", height: "11px" }} />Submitting…</> : <><Check style={{ width: "11px", height: "11px" }} />Submit</>}
              </button>
            </div>
          )}
          {error && <span style={{ fontSize: "11px", color: "#ef4444" }}>{error}</span>}
        </div>
      )}

      {isDone && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#22c55e" }}>✓ All info collected for @{playerMeta.username}</span>
          {(isMe || !task.assignedToId) && (
            <button onClick={handleUndo} disabled={undoing} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "none", color: "var(--color-text-secondary)", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", width: "fit-content" }}>
              <Undo2 style={{ width: "10px", height: "10px" }} />Undo
            </button>
          )}
          {error && <span style={{ fontSize: "11px", color: "#ef4444" }}>{error}</span>}
        </div>
      )}
      {isOther && !isDone && (
        <div style={{ padding: "0 14px 12px" }}>
          <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Lock style={{ width: "10px", height: "10px" }} />{task.assignedTo?.name} is working on this
          </span>
        </div>
      )}
    </Card>
  );
}

function DailyChecklistCard({ task, onChecklistToggle }) {
  const [expanded, setExpanded] = useState(true); const [toggling, setToggling] = useState(null);
  const cl = task.checklistItems || []; const done = cl.filter(i => i.done).length;
  const pct = cl.length > 0 ? Math.round((done / cl.length) * 100) : 0;
  const allDone = done === cl.length && cl.length > 0;
  const m = TYPE_META.DAILY_CHECKLIST;
  async function toggle(item) { setToggling(item.id); await onChecklistToggle(task.id, item.id, !item.done); setToggling(null); }

  return (
    <Card accent={allDone ? "#22c55e" : m.color}>
      <div style={{ padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <DonutRing pct={pct} size={44} stroke={5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginBottom: "3px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary)" }}>{task.title}</span>
            <TaskTypeBadge taskType="DAILY_CHECKLIST" />
            {task.isDaily && <Badge label="Daily" color="#2563eb" light="#eff6ff" />}
          </div>
          <span style={{ fontSize: "11px", color: allDone ? "#22c55e" : "var(--color-text-tertiary)" }}>{done}/{cl.length} complete</span>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "7px", cursor: "pointer", padding: "4px", color: "var(--color-text-tertiary)", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 13px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {cl.map(item => (
            <div key={item.id} onClick={() => !toggling && toggle(item)} style={{
              display: "flex", alignItems: "center", gap: "9px", cursor: "pointer",
              padding: "8px 10px", borderRadius: "var(--border-radius-md)",
              background: item.done ? "var(--color-background-success)" : "var(--color-background-secondary)",
              border: `0.5px solid ${item.done ? "var(--color-border-success)" : "var(--color-border-tertiary)"}`,
            }}>
              <div style={{ width: "17px", height: "17px", borderRadius: "5px", border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`, background: item.done ? "#22c55e" : "var(--color-background-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {item.done && <Check style={{ width: "9px", height: "9px", color: "#fff" }} />}
                {toggling === item.id && <RefreshCw style={{ width: "8px", height: "8px", color: "var(--color-text-tertiary)" }} />}
              </div>
              <span style={{ flex: 1, fontSize: "12px", color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
              {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444" }}>*</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProgressTaskCard({ task, currentUserId, onProgressLog, taskType }) {
  const [logVal, setLogVal] = useState(""); const [logging, setLogging] = useState(false);
  const [ok, setOk] = useState(false); const [expanded, setExpanded] = useState(true);
  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const m = TYPE_META[taskType] || TYPE_META.STANDARD;
  const isRevenue = taskType === "REVENUE_TARGET";
  async function log() {
    if (!logVal || parseFloat(logVal) <= 0) return; setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal)); setLogVal(""); setLogging(false); setOk(true);
    setTimeout(() => setOk(false), 2000);
  }

  return (
    <Card accent={pct >= 100 ? "#22c55e" : m.color}>
      <div style={{ padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <DonutRing pct={pct} size={44} stroke={5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginBottom: "3px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary)" }}>{task.title}</span>
            <TaskTypeBadge taskType={taskType} />
          </div>
          <span style={{ fontSize: "11px", color: pct >= 100 ? "#22c55e" : "var(--color-text-tertiary)" }}>
            {isRevenue ? `$${(task.currentValue ?? 0).toFixed(0)}` : task.currentValue ?? 0} / {isRevenue ? `$${task.targetValue}` : task.targetValue}
          </span>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "7px", cursor: "pointer", padding: "4px", color: "var(--color-text-tertiary)", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 13px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {pct < 100 && (
            <div style={{ display: "flex", gap: "6px" }}>
              <input type="number" min={isRevenue ? "0.01" : "1"} step={isRevenue ? "0.01" : "1"} value={logVal} onChange={e => setLogVal(e.target.value)}
                placeholder={isRevenue ? "Amount…" : "Count…"} style={{ ...INPUT_S, flex: 1 }} onKeyDown={e => e.key === "Enter" && log()} />
              <button onClick={log} disabled={logging || !logVal} style={{ padding: "8px 13px", background: logging ? "var(--color-background-secondary)" : m.color, color: logging ? "var(--color-text-tertiary)" : "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontWeight: "500", fontSize: "12px", cursor: logging || !logVal ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "3px" }}>
                {ok ? "✓" : <Plus style={{ width: "11px", height: "11px" }} />}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function StandardTaskCard({ task, onStatusChange, onChecklistToggle }) {
  const [expanded, setExpanded] = useState(false); const [toggling, setToggling] = useState(null);
  const isDone = task.status === "COMPLETED";
  const cl = task.checklistItems || [];
  const done = cl.filter(i => i.done).length;
  const due = fmtDue(task.dueDate);

  async function toggle(item) { setToggling(item.id); await onChecklistToggle(task.id, item.id, !item.done); setToggling(null); }

  return (
    <Card accent={isDone ? "#22c55e" : PRIORITY_COLOR[task.priority]} style={{ opacity: isDone ? 0.75 : 1 }}>
      <div style={{ padding: "11px 14px", display: "flex", gap: "9px", alignItems: "center" }}>
        <button onClick={() => onStatusChange(task.id, isDone ? "PENDING" : "COMPLETED")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}>
          {isDone
            ? <CheckCircle style={{ width: "17px", height: "17px", color: "#22c55e" }} />
            : <Circle style={{ width: "17px", height: "17px", color: "var(--color-text-tertiary)" }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "500", color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: isDone ? "line-through" : "none" }}>{task.title}</span>
            <TaskTypeBadge taskType="STANDARD" />
            {due?.isOverdue && !isDone && <Badge label="Overdue" color="#dc2626" light="#fef2f2" />}
          </div>
          {cl.length > 0 && !isDone && <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>{done}/{cl.length} items</span>}
        </div>
        {due && <span style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{due.label}</span>}
        {cl.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "6px", cursor: "pointer", padding: "4px", color: "var(--color-text-tertiary)", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "11px", height: "11px" }} /> : <ChevronDown style={{ width: "11px", height: "11px" }} />}
          </button>
        )}
      </div>

      {expanded && cl.length > 0 && (
        <div style={{ padding: "0 14px 11px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {cl.map(item => (
            <div key={item.id} onClick={() => !toggling && toggle(item)} style={{
              display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
              padding: "7px 9px", borderRadius: "var(--border-radius-md)",
              background: item.done ? "var(--color-background-success)" : "var(--color-background-secondary)",
            }}>
              <div style={{ width: "15px", height: "15px", borderRadius: "4px", border: `1.5px solid ${item.done ? "#22c55e" : "var(--color-border-secondary)"}`, background: item.done ? "#22c55e" : "var(--color-background-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {item.done && <Check style={{ width: "8px", height: "8px", color: "#fff" }} />}
              </div>
              <span style={{ flex: 1, fontSize: "12px", color: item.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Grouped task section with collapsible header ───────────────
function TaskGroup({ title, tasks, color, defaultOpen = true, renderTask }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!tasks.length) return null;
  return (
    <div style={{ marginBottom: "4px" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "7px",
        padding: "7px 10px", background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: open ? "var(--border-radius-md) var(--border-radius-md) 0 0" : "var(--border-radius-md)",
        cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", flex: 1, textAlign: "left" }}>{title}</span>
        <span style={{ fontSize: "11px", fontWeight: "500", padding: "1px 7px", borderRadius: "999px", background: color + "18", color }}>{tasks.length}</span>
        {open ? <ChevronUp style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} /> : <ChevronDown style={{ width: "11px", height: "11px", color: "var(--color-text-tertiary)" }} />}
      </button>
      {open && (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)", borderTop: "none",
          borderRadius: "0 0 var(--border-radius-md) var(--border-radius-md)",
          padding: "6px", display: "flex", flexDirection: "column", gap: "4px",
        }}>
          {tasks.map(t => renderTask(t))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser, isAdmin = false, viewingMember = null }) {
  const { shiftActive } = useContext(ShiftStatusContext);
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [ratings, setRatings] = useState(null);
  const [teamRatings, setTeamRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [resolvedUser, setResolvedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks"); // tasks | analytics | shifts | rating
  const sseRef = useRef(null);

  useEffect(() => {
    const id = extractUserId(currentUser);
    if (id !== null) setResolvedUser({ ...currentUser, id });
    else {
      fetch(`${API}/user`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.json()).then(data => { const u = data?.data ?? data?.user ?? data; if (u?.id) setResolvedUser(u); }).catch(() => { });
    }
  }, [currentUser]);

  const myId = resolvedUser ? extractUserId(resolvedUser) : null;
  const targetUserId = viewingMember?.id || myId;
  const memberRole = viewingMember?.role || resolvedUser?.role || "";
  const memberName = viewingMember?.name || resolvedUser?.name || "Member";

  // Load ratings + shifts
  useEffect(() => {
    if (!targetUserId) return;
    fetch(`${API}/members/${targetUserId}/ratings`, { credentials: "include", headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setRatings(d.data); }).catch(() => { });
    fetch(`${API}/reports/my-shifts?role=${memberRole}&limit=30`, { credentials: "include", headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setShifts(d.data); }).catch(() => { });
    if (isAdmin) {
      fetch(`${API}/members/all-ratings`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setTeamRatings(d.data); }).catch(() => { });
    }
  }, [targetUserId, isAdmin, memberRole]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tasks?myTasks=true`, { credentials: "include", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTasks(data.data || []);
    } catch (_) { } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadTasks();
    const token = localStorage.getItem('authToken');
    const storeId = getStoreId();
    const sseUrl = `${API}/tasks/events?${token ? `token=${encodeURIComponent(token)}&` : ''}storeId=${storeId}`;
    const es = new EventSource(sseUrl, { withCredentials: true });
    sseRef.current = es;
    es.onmessage = e => {
      try {
        const { type, data } = JSON.parse(e.data);

        // ── Store isolation ───────────────────────────────────
        // The server now sends storeId in every task event.
        // Skip events that don't belong to any store this user has access to.
        // Admins (storeAccess = null or length === 0) receive everything.
        const resolvedAccess = resolvedUser?.storeAccess;
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(resolvedUser?.role);
        if (
          !isAdmin &&
          data?.storeId &&
          resolvedAccess?.length &&
          !resolvedAccess.includes(data.storeId)
        ) {
          return; // not our store — ignore
        }
        // ─────────────────────────────────────────────────────

        if (type === "task_created") {
          setTasks(prev => {
            const ex = prev.find(t => t.id === data.id);
            if (ex) return prev.map(t => t.id === data.id ? data : t);
            if (data.assignToAll || (myId && parseInt(data.assignedToId, 10) === myId)) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_updated") {
          setTasks(prev => {
            const ex = prev.find(t => t.id === data.id);
            if (
              data.taskType === "MISSING_INFO" &&
              data.assignedToId &&
              myId !== null &&
              parseInt(data.assignedToId, 10) !== myId &&
              !data.assignToAll
            ) return prev.filter(t => t.id !== data.id);
            if (ex) return prev.map(t => t.id === data.id ? data : t);
            if (myId && parseInt(data.assignedToId, 10) === myId) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) { }
    };
    return () => es.close();
  }, [loadTasks, myId]);



  const handleChecklistToggle = useCallback(async (taskId, itemId, done) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, checklistItems: (t.checklistItems || []).map(i => i.id === itemId ? { ...i, done } : i) }));
    try {
      const res = await fetch(`${API}/tasks/${taskId}/checklist`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ itemId, done }) });
      const d = await res.json();
      if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t));
    } catch (_) { }
  }, []);

  const handleStatusChange = useCallback(async (taskId, status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) });
      const d = await res.json();
      if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t));
    } catch (_) { }
  }, []);

  const handleProgressLog = useCallback(async (taskId, value) => {
    try {
      const res = await fetch(`${API}/tasks/${taskId}/progress`, { method: "POST", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ value, action: "MEMBER_LOG" }) });
      const d = await res.json();
      if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t));
    } catch (_) { }
  }, []);

  const handleClaimTask = useCallback(u => setTasks(prev => prev.map(t => t.id === u.id ? u : t)), []);
  const handleInfoSubmitted = useCallback(u => setTasks(prev => prev.map(t => t.id === u.id ? u : t)), []);

  // Stats
  const totalDone = tasks.filter(t => t.status === "COMPLETED").length;
  const totalInProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const totalPending = tasks.filter(t => t.status === "PENDING").length;
  const totalOverdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
  const completionPct = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;
  const totalShifts = shifts.length;
  const issuesResolved = shifts.reduce((s, sh) => s + (sh.stats?.issuesResolved || 0), 0);

  const filtered = useMemo(() => tasks.filter(t => {
    if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
    if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
    if (statusFilter === "IN_PROGRESS" && t.status !== "IN_PROGRESS") return false;
    if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, typeFilter, statusFilter, search]);

  const renderTask = (task) => {
    switch (task.taskType) {
      case "MISSING_INFO": return <MissingInfoTaskCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onInfoSubmitted={handleInfoSubmitted} />;
      case "PLAYER_FOLLOWUP": return <PlayerFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />;
      case "BONUS_FOLLOWUP": return <BonusFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />;
      case "DAILY_CHECKLIST": return <DailyChecklistCard key={task.id} task={task} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />;
      case "PLAYER_ADDITION": return <ProgressTaskCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} taskType="PLAYER_ADDITION" />;
      case "REVENUE_TARGET": return <ProgressTaskCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} taskType="REVENUE_TARGET" />;
      default: return <StandardTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />;
    }
  };

  // ── Shift guard ────────────────────────────────────────────
  if (!shiftActive) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button onClick={() => navigate('/shifts')} style={{ alignSelf: "flex-start", padding: "9px 18px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", fontWeight: "500", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
          Start Shift
        </button>
        <Card style={{ padding: "14px 16px", borderLeft: "3px solid var(--color-border-warning)", background: "var(--color-background-warning)" }}>
          <p style={{ fontWeight: "500", color: "var(--color-text-warning)", margin: "0 0 2px", fontSize: "13px" }}>Shift required</p>
          <p style={{ color: "var(--color-text-warning)", margin: 0, fontSize: "12px" }}>You must have an active shift to grant bonuses and view tasks.</p>
        </Card>
        <Card style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", background: "var(--color-background-secondary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Lock style={{ width: "20px", height: "20px", color: "var(--color-text-tertiary)" }} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>Dashboard locked</p>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-tertiary)" }}>Go to Shifts and start your shift first.</p>
        </Card>
      </div>
    );
  }

  const TABS = [
    { id: "tasks", label: "Tasks", count: tasks.length },
    { id: "analytics", label: "Analytics", count: null },
    { id: "shifts", label: "Shifts", count: totalShifts },
    { id: "rating", label: "Rating", count: null },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ── HERO: Member Info + Quick Stats ─────────────────── */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          {/* Avatar + info */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "var(--color-background-info)", color: "var(--color-text-info)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "500", flexShrink: 0 }}>
              {memberName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div style={{ minWidth: 0 }}>
              {isAdmin && viewingMember && (
                <span style={{ fontSize: "10px", fontWeight: "500", color: "var(--color-text-info)", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "2px" }}>Admin view</span>
              )}
              <p style={{ margin: 0, fontSize: "16px", fontWeight: "500", color: "var(--color-text-primary)" }}>{memberName}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Shift active · {memberRole}</span>
              </div>
            </div>
          </div>

          {/* Completion ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <DonutRing pct={completionPct} size={70} stroke={7} />
            <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textAlign: "center" }}>completion</span>
          </div>
        </div>

        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", borderTop: "none" }}>
          {[
            { label: "Done", value: totalDone, color: "#22c55e" },
            { label: "Active", value: totalInProgress, color: "#0ea5e9" },
            { label: "Pending", value: totalPending, color: "var(--color-text-tertiary)" },
            { label: "Overdue", value: totalOverdue, color: totalOverdue > 0 ? "#ef4444" : "var(--color-text-tertiary)" },
            { label: "Shifts", value: totalShifts, color: "#8b5cf6" },
            { label: "Issues ✓", value: issuesResolved, color: "#f59e0b" },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "12px 14px", textAlign: "center",
              borderRight: i < 5 ? "0.5px solid var(--color-border-tertiary)" : "none",
              borderTop: "0.5px solid var(--color-border-tertiary)",
            }}>
              <div style={{ fontSize: "18px", fontWeight: "500", color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Tab nav ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "3px", border: "0.5px solid var(--color-border-tertiary)" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "7px 8px", borderRadius: "7px", border: "none",
            fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit",
            background: activeTab === tab.id ? "var(--color-background-primary)" : "transparent",
            color: activeTab === tab.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            boxShadow: activeTab === tab.id ? "0 0 0 0.5px var(--color-border-secondary)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
          }}>
            {tab.label}
            {tab.count != null && (
              <span style={{
                fontSize: "10px", fontWeight: "500", padding: "1px 6px", borderRadius: "999px",
                background: activeTab === tab.id ? "var(--color-background-secondary)" : "transparent",
                color: "var(--color-text-tertiary)"
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: TASKS ══════════ */}
      {activeTab === "tasks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Search + filters */}
          <div style={{ display: "flex", gap: "7px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 160px", minWidth: "140px" }}>
              <Search style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "var(--color-text-tertiary)", pointerEvents: "none" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
                style={{ ...INPUT_S, paddingLeft: "28px", paddingTop: "7px", paddingBottom: "7px" }} />
            </div>
            <div style={{ display: "flex", gap: "2px", background: "var(--color-background-secondary)", padding: "2px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              {[{ k: "ALL", l: "All" }, { k: "PENDING", l: "Pending" }, { k: "IN_PROGRESS", l: "Active" }, { k: "COMPLETED", l: "Done" }].map(s => (
                <button key={s.k} onClick={() => setStatusFilter(s.k)} style={{
                  padding: "5px 9px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: "500",
                  cursor: "pointer", fontFamily: "inherit",
                  background: statusFilter === s.k ? "var(--color-background-primary)" : "transparent",
                  color: statusFilter === s.k ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  boxShadow: statusFilter === s.k ? "0 0 0 0.5px var(--color-border-secondary)" : "none",
                }}>{s.l}</button>
              ))}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              style={{ ...INPUT_S, width: "auto", minWidth: "110px", paddingTop: "7px", paddingBottom: "7px", fontSize: "12px", cursor: "pointer" }}>
              <option value="ALL">All Types</option>
              {Object.keys(TYPE_META).map(k => <option key={k} value={k}>{TYPE_META[k].label}</option>)}
            </select>
            <button onClick={loadTasks} style={{ padding: "7px 11px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--color-text-secondary)", fontFamily: "inherit" }}>
              <RefreshCw style={{ width: "12px", height: "12px" }} />
            </button>
          </div>

          {/* Task list */}
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "13px" }}>
              <RefreshCw style={{ width: "16px", height: "16px", margin: "0 auto 8px", display: "block" }} />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>
                {search ? `No tasks matching "${search}"` : totalDone === tasks.length && tasks.length > 0 ? "All tasks complete!" : "No tasks found"}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-tertiary)" }}>
                {totalDone === tasks.length && tasks.length > 0 ? "Great work this shift" : "Tasks assigned by admin will appear here"}
              </p>
            </Card>
          ) : (typeFilter !== "ALL" || statusFilter !== "ALL" || search) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filtered.map(t => renderTask(t))}
            </div>
          ) : (
            <>
              <TaskGroup title="Overdue — action required" tasks={filtered.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")} color="#ef4444" defaultOpen={true} renderTask={renderTask} />
              <TaskGroup title="In progress" tasks={filtered.filter(t => t.status === "IN_PROGRESS" && !(t.dueDate && new Date(t.dueDate) < new Date()))} color="#0ea5e9" defaultOpen={true} renderTask={renderTask} />
              <TaskGroup title="Pending" tasks={filtered.filter(t => t.status === "PENDING")} color="var(--color-text-tertiary)" defaultOpen={true} renderTask={renderTask} />
              <TaskGroup title="Completed" tasks={filtered.filter(t => t.status === "COMPLETED")} color="#22c55e" defaultOpen={false} renderTask={renderTask} />
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: ANALYTICS ══════════ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <FinancialSection shifts={shifts} />

          {/* Task type breakdown donut */}
          {tasks.length > 0 && (() => {
            const byType = Object.keys(TYPE_META).map(k => ({ name: TYPE_META[k].label, value: tasks.filter(t => t.taskType === k).length, color: TYPE_META[k].color })).filter(d => d.value > 0);
            return (
              <Card style={{ padding: "16px" }}>
                <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Task Type Breakdown</p>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={byType} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>
                        {byType.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {byType.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "var(--color-text-primary)", flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--color-text-secondary)" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Admin: Team ratings overview */}
          {isAdmin && teamRatings.length > 0 && (
            <Card style={{ padding: "16px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: "500", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Team ratings</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {teamRatings.map(m => {
                  const sc = m.avgRating ?? 0;
                  const col = sc >= 4 ? "#22c55e" : sc >= 3 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: col + "15", color: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500", flexShrink: 0 }}>
                        {m.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: "500", color: "var(--color-text-primary)" }}>{m.name}</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-tertiary)" }}>{m.role} · {m.shiftCount ?? 0} shifts</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                        <StarRating value={sc} size={11} />
                        <span style={{ fontSize: "11px", fontWeight: "500", color: col }}>{sc.toFixed(1)}/5</span>
                      </div>
                      <div style={{ padding: "5px 9px", background: "#fffbeb", borderRadius: "var(--border-radius-md)", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: "#d97706" }}>⭐{m.totalStars ?? 0}</div>
                        <div style={{ fontSize: "9px", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.3px" }}>Stars</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════ TAB: SHIFTS ══════════ */}
      {activeTab === "shifts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Shift summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
            <MetricCard label="Total Shifts" value={shifts.length} icon={Briefcase} color="#8b5cf6" />
            <MetricCard label="Total Deposits" value={`$${shifts.reduce((s, sh) => s + (sh.stats?.totalDeposits || 0), 0).toFixed(0)}`} color="#22c55e" icon={ArrowUpRight} />
            <MetricCard label="Total Cashouts" value={`$${shifts.reduce((s, sh) => s + (sh.stats?.totalCashouts || 0), 0).toFixed(0)}`} color="#ef4444" icon={ArrowDownRight} />
            <MetricCard label="Avg Effort" value={(() => { const rated = shifts.filter(s => s.checkin?.effortRating != null); return rated.length ? (rated.reduce((a, s) => a + (s.checkin?.effortRating || 0), 0) / rated.length).toFixed(1) + "/10" : "—"; })()} color="#f59e0b" icon={Zap} />
          </div>
          <ShiftLogsSection shifts={shifts} />
          {isAdmin && <AdminTeamShiftsSection />}
        </div>
      )}

      {/* ══════════ TAB: RATING ══════════ */}
      {activeTab === "rating" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ratings ? <RatingPanel ratings={ratings} /> : (
            <Card style={{ padding: "36px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-tertiary)" }}>No ratings yet</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
