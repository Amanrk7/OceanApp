// components/MemberTasksSection.jsx — Enhanced Dashboard
import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Circle, Clock, AlertCircle, RefreshCw,
  TrendingUp, Users, List, ChevronDown, ChevronUp,
  Calendar, Plus, X, Check, Star, Award, Zap, Flame,
  UserCheck, Phone, Mail, Camera, Instagram, Send, User,
  ClipboardList, Lock, Unlock, Undo2, Gift, Search,
  BarChart2, Shield, Activity, Target
} from "lucide-react";
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { PlayerFollowupCard, BonusFollowupCard } from './FollowupTaskCards';
import AdminTeamShiftsSection from './AdminTeamShiftsSection.jsx';

// ─── helpers ──────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? "";

function getAuthHeaders(ct = false) {
  const token = localStorage.getItem('authToken');
  const h = {};
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
function fmtDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + fmtTime(iso), isOverdue: d < new Date() };
}

const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const IAlert = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const ILock = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;

const C = {
  sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
  violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
  slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};
// ─── style tokens ─────────────────────────────────────────────
const INPUT_BASE = {
  width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
  borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};
const CARD_STYLE = {
  background: "#fff", borderRadius: "12px",
  border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,.06)",
};
const LABEL_STYLE = {
  display: "block", fontSize: "10px", fontWeight: "700",
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px",
};
const PRIORITY_COLOR = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", URGENT: "#dc2626" };

const TYPE_META = {
  STANDARD: { label: "Standard", icon: List, color: "#6366f1", lightBg: "#eef2ff", border: "#c7d2fe" },
  DAILY_CHECKLIST: { label: "Daily Checklist", icon: CheckCircle, color: "#0ea5e9", lightBg: "#f0f9ff", border: "#bae6fd" },
  PLAYER_ADDITION: { label: "Player Addition", icon: Users, color: "#8b5cf6", lightBg: "#f5f3ff", border: "#ddd6fe" },
  REVENUE_TARGET: { label: "Revenue Target", icon: TrendingUp, color: "#22c55e", lightBg: "#f0fdf4", border: "#86efac" },
  PLAYER_FOLLOWUP: { label: "Player Followup", icon: Users, color: "#f97316", lightBg: "#fff7ed", border: "#fed7aa" },
  BONUS_FOLLOWUP: { label: "Bonus Followup", icon: Gift, color: "#10b981", lightBg: "#ecfdf5", border: "#6ee7b7" },
  MISSING_INFO: { label: "Missing Info", icon: ClipboardList, color: "#ec4899", lightBg: "#fdf2f8", border: "#f9a8d4" },
};

const STAT_TYPES = ["STANDARD", "DAILY_CHECKLIST", "PLAYER_ADDITION", "REVENUE_TARGET", "PLAYER_FOLLOWUP", "BONUS_FOLLOWUP"];

const MISSING_FIELD_META = {
  email: { icon: Mail, label: "Email", placeholder: "player@email.com", type: "email", color: "#3b82f6" },
  phone: { icon: Phone, label: "Phone", placeholder: "+1 234 567 8900", type: "tel", color: "#8b5cf6" },
  snapchat: { icon: Camera, label: "Snapchat", placeholder: "@snapchat", type: "text", color: "#eab308" },
  instagram: { icon: Instagram, label: "Instagram", placeholder: "@instagram", type: "text", color: "#ec4899" },
  telegram: { icon: Send, label: "Telegram", placeholder: "@telegram", type: "text", color: "#0ea5e9" },
  assigned_member: { icon: User, label: "Assigned Member", placeholder: "Select member…", type: "select", color: "#ef4444" },
};

// ─── Rating categories ────────────────────────────────────────
const RATING_CATEGORIES = [
  { key: "communicationWithPlayer", label: "Communication with Player", icon: "💬" },
  { key: "loadReloadSmoothness", label: "Load/Reload Smoothness", icon: "⚡" },
  { key: "liveReportingToPlayers", label: "Live Reporting to Players", icon: "📡" },
  { key: "playtimeBonus", label: "Playtime Bonus", icon: "🎮" },
  { key: "referralBonus", label: "Referral Bonus (old & new)", icon: "👥" },
  { key: "matchAndRandomBonus", label: "Match & Random Bonus", icon: "🎯" },
  { key: "playerEngagementOverall", label: "Player Engagement Overall", icon: "🔥" },
  { key: "reachingOutInShifts", label: "Reaching Out in Shifts", icon: "📲" },
  { key: "reachingOutFromOwnList", label: "Reaching Out from Own List", icon: "📋" },
  { key: "cashoutTiming", label: "Cashout Timing", icon: "⏱️" },
];

// ══════════════════════════════════════════════════════════════
// ── NEW: Visual Components ─────────────────────────────────
// ══════════════════════════════════════════════════════════════

function PerformanceRing({ pct, size = 100 }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color = pct >= 75 ? '#4ade80' : pct >= 45 ? '#fbbf24' : '#f87171';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color}
        strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      <text x="50" y="45" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{pct}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" fontWeight="500">% DONE</text>
    </svg>
  );
}

function StarDisplay({ value, max = 5, size = 13 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.4;
  return (
    <span style={{ display: 'inline-flex', gap: '1px', alignItems: 'center' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{
          fontSize: `${size}px`, lineHeight: 1,
          color: i < full ? '#f59e0b' : (i === full && half) ? '#fbbf24' : '#d1d5db',
          filter: i < full ? 'drop-shadow(0 0 2px #f59e0b80)' : 'none',
        }}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ label, value, max = 5, color = "#f59e0b" }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
      <span style={{ color: '#64748b', flex: '0 0 140px', fontWeight: '500', fontSize: '10.5px' }}>{label}</span>
      <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: '999px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontWeight: '700', color: '#0f172a', minWidth: '20px', textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color, sub, glow }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '14px 16px',
      border: `1.5px solid ${color}25`,
      boxShadow: glow ? `0 4px 20px ${color}20` : '0 1px 4px rgba(15,23,42,.06)',
      flex: '1 1 80px', minWidth: '70px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderRadius: '50%', background: `${color}10` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '26px', fontWeight: '900', color, lineHeight: 1, letterSpacing: '-1px' }}>{value}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '9px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: '13px', height: '13px', color }} />
        </div>
      </div>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', lineHeight: 1.2 }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ── Rating Display Panel ────────────────────────────────────────
function RatingPanel({ ratings, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  if (!ratings) return null;
  const { lastShift, monthly, total, categoryAverages } = ratings;
  const overall = lastShift?.overallRating ?? 0;
  const starColor = overall >= 4 ? '#22c55e' : overall >= 3 ? '#f59e0b' : '#ef4444';
  const starBg = overall >= 4 ? '#f0fdf4' : overall >= 3 ? '#fffbeb' : '#fef2f2';
  const starBorder = overall >= 4 ? '#86efac' : overall >= 3 ? '#fde68a' : '#fca5a5';

  return (
    <div style={{ ...CARD_STYLE, overflow: 'hidden', borderLeft: `3px solid ${starColor}` }}>
      <div style={{ padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: starBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⭐</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>
            {isAdmin ? 'Admin Performance Rating' : 'Your Performance Rating'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StarDisplay value={overall} size={15} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: starColor }}>{overall.toFixed(1)}/5</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last Shift</span>
          </div>
          {lastShift?.recommendations && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>"{lastShift.recommendations}"</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{monthly?.avgRating?.toFixed(1) ?? '—'}</div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '1px' }}>This Month</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#d97706' }}>⭐ {total?.totalStars ?? 0}</div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '1px' }}>Total Stars</div>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '6px', color: '#94a3b8', display: 'flex', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {expanded && categoryAverages && (
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: '7px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Category Breakdown (Last Shift)</div>
          {RATING_CATEGORIES.map(cat => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', flex: '0 0 18px' }}>{cat.icon}</span>
              <span style={{ fontSize: '11px', color: '#475569', flex: '0 0 160px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
              <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, #f59e0b, #fb923c)`, borderRadius: '999px', width: `${((lastShift[cat.key] ?? 0) / 5) * 100}%`, transition: 'width 0.5s' }} />
              </div>
              <StarDisplay value={lastShift[cat.key] ?? 0} size={11} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin All-Member Ratings Overview ─────────────────────────
function AdminRatingOverview({ teamRatings }) {
  if (!teamRatings?.length) return null;
  return (
    <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>⭐</div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Team Performance Ratings</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>All members · latest shift ratings</div>
        </div>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {teamRatings.map(member => {
          const sc = member.avgRating ?? 0;
          const col = sc >= 4 ? '#22c55e' : sc >= 3 ? '#f59e0b' : '#ef4444';
          return (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${col}20, ${col}10)`, border: `1.5px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: col, flexShrink: 0 }}>
                {member.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{member.name}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{member.role} · {member.shiftCount ?? 0} shifts rated</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <StarDisplay value={sc} size={12} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: col }}>{sc.toFixed(1)}/5</span>
              </div>
              <div style={{ textAlign: 'center', padding: '6px 10px', background: '#fffbeb', borderRadius: '8px', flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706' }}>⭐{member.totalStars ?? 0}</div>
                <div style={{ fontSize: '9px', color: '#92400e', fontWeight: '600' }}>TOTAL</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Category Progress Bars (task type breakdown) ──────────────
function TaskTypeBreakdown({ byType, onSelect, selected }) {
  const types = Object.keys(byType).filter(k => byType[k].length > 0);
  if (!types.length) return null;
  const max = Math.max(...types.map(k => byType[k].length));
  return (
    <div style={{ ...CARD_STYLE, padding: '14px 18px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Task Breakdown</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {types.map(k => {
          const m = TYPE_META[k] || TYPE_META.STANDARD;
          const Icon = m.icon;
          const tasks = byType[k];
          const done = tasks.filter(t => t.status === 'COMPLETED').length;
          const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
          const isActive = selected === k;
          return (
            <button key={k} onClick={() => onSelect(isActive ? 'ALL' : k)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isActive ? `${m.lightBg}` : 'transparent', border: `1.5px solid ${isActive ? m.color : 'transparent'}`, borderRadius: '8px', padding: '7px 9px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .12s' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: m.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '12px', height: '12px', color: m.color }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', flex: '0 0 120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
              <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : m.color, borderRadius: '999px', transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: '700', color: pct === 100 ? '#22c55e' : '#64748b', minWidth: '40px', textAlign: 'right' }}>{done}/{tasks.length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Existing Task Card Components (preserved) ─────────────────
// ══════════════════════════════════════════════════════════════

function ProgressBar({ pct, color, thin }) {
  return (
    <div style={{ height: thin ? "4px" : "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
    </div>
  );
}
function PriorityDot({ priority }) {
  return <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_COLOR[priority] || "#cbd5e1", flexShrink: 0 }} />;
}
function TypeBadge({ taskType }) {
  const m = TYPE_META[taskType] || TYPE_META.STANDARD;
  const Icon = m.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "700", background: m.lightBg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: "nowrap" }}>
      <Icon style={{ width: "9px", height: "9px" }} />{m.label}
    </span>
  );
}

function MissingInfoTaskCard({ task, currentUser, onClaim, onInfoSubmitted }) {
  const [expanded, setExpanded] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [form, setForm] = useState({});

  const myId = extractUserId(currentUser);
  const playerMeta = useMemo(() => { try { return JSON.parse(task.notes || "{}"); } catch { return {}; } }, [task.notes]);
  const missingFields = useMemo(() => (task.checklistItems || []).filter(i => !i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")), [task.checklistItems]);
  const doneFields = useMemo(() => (task.checklistItems || []).filter(i => i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")), [task.checklistItems]);
  const totalFields = (task.checklistItems || []).length;
  const doneCount = doneFields.length;
  const pct = totalFields > 0 ? Math.round((doneCount / totalFields) * 100) : 0;
  const isClaimedByMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
  const isCompleted = task.status === "COMPLETED";
  const m = TYPE_META.MISSING_INFO;

  useEffect(() => {
    if (missingFields.includes("assigned_member") && isClaimedByMe) {
      fetch(`${API}/team-members`, { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()).then(d => setTeamMembers(d.data || [])).catch(() => { });
    }
  }, [isClaimedByMe, missingFields]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleClaim = async () => {
    setClaiming(true); setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/claim`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); onClaim(d.data);
    } catch (e) { setError(e.message); } finally { setClaiming(false); }
  };
  const handleSubmit = async () => {
    if (!Object.values(form).some(v => v?.trim?.())) { setError("Fill at least one field."); return; }
    setSubmitting(true); setError("");
    try {
      const body = {}; missingFields.forEach(k => { if (form[k]) body[k === "assigned_member" ? "assignedMemberId" : k] = form[k]; });
      const res = await fetch(`${API}/tasks/${task.id}/submit-missing-info`, { method: "POST", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); setSuccess(true); setForm({}); onInfoSubmitted(d.data);
    } catch (e) { setError(e.message); } finally { setSubmitting(false); }
  };
  const handleUndo = async () => {
    setUndoing(true); setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); setSuccess(false); onInfoSubmitted(d.data);
    } catch (e) { setError(e.message); } finally { setUndoing(false); }
  };

  return (
    <div style={{ ...CARD_STYLE, overflow: "hidden", borderLeft: `3px solid ${isCompleted ? "#22c55e" : m.color}`, opacity: isCompleted ? 0.82 : 1 }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0, background: isCompleted ? "#dcfce7" : m.lightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ClipboardList style={{ width: "16px", height: "16px", color: isCompleted ? "#22c55e" : m.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "5px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="MISSING_INFO" />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "80px" }}><ProgressBar pct={pct} color={m.color} thin /></div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: isCompleted ? "#16a34a" : "#64748b" }}>{doneCount}/{totalFields}</span>
            </div>
            {isCompleted ? <span style={{ fontSize: "11px", fontWeight: "600", color: "#16a34a", display: "flex", alignItems: "center", gap: "3px" }}><CheckCircle style={{ width: "10px", height: "10px" }} />Done</span>
              : isClaimedByMe ? <span style={{ fontSize: "11px", fontWeight: "600", color: "#ea580c", display: "flex", alignItems: "center", gap: "3px" }}><Lock style={{ width: "9px", height: "9px" }} />Claimed by you</span>
                : isClaimedByOther ? <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}><Lock style={{ width: "9px", height: "9px" }} />{task.assignedTo?.name}</span>
                  : <span style={{ fontSize: "11px", fontWeight: "600", color: m.color, display: "flex", alignItems: "center", gap: "3px" }}><Unlock style={{ width: "9px", height: "9px" }} />Open</span>}
          </div>
        </div>
        {!isClaimedByOther && !isCompleted && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex", flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
          </button>
        )}
      </div>
      {expanded && !isCompleted && !isClaimedByOther && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}
          {doneFields.length > 0 && (
            <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", marginBottom: "5px", textTransform: "uppercase" }}>Already collected</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {doneFields.map(k => { const fm = MISSING_FIELD_META[k]; const Ic = fm?.icon || CheckCircle; return <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "600", background: "#dcfce7", color: "#16a34a" }}><Ic style={{ width: "9px", height: "9px" }} />{fm?.label || k}</span>; })}
              </div>
            </div>
          )}
          {!task.assignedToId && (
            <div style={{ padding: "11px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", color: "#9a3412", margin: "0 0 8px", lineHeight: "1.5" }}>Claim to collect info for <strong>@{playerMeta.username || "player"}</strong></p>
              <button onClick={handleClaim} disabled={claiming} style={{ width: "100%", padding: "9px", borderRadius: "7px", border: "none", background: claiming ? "#e2e8f0" : m.color, color: claiming ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: claiming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "inherit" }}>
                {claiming ? <><RefreshCw style={{ width: "12px", height: "12px", animation: "spin .8s linear infinite" }} />Claiming…</> : <><UserCheck style={{ width: "12px", height: "12px" }} />Claim Task</>}
              </button>
            </div>
          )}
          {isClaimedByMe && missingFields.length > 0 && (
            <div style={{ padding: "12px", background: "#fdf2f8", border: "1px solid #f9a8d4", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#be185d", textTransform: "uppercase", letterSpacing: "0.4px" }}>Fill Missing Fields</div>
              {missingFields.map(k => {
                const fm = MISSING_FIELD_META[k]; if (!fm) return null; const Ic = fm.icon;
                return k === "assigned_member" ? (
                  <div key={k}><label style={{ ...LABEL_STYLE, color: fm.color }}><Ic style={{ width: "9px", height: "9px", verticalAlign: "middle", marginRight: "3px" }} />{fm.label}</label>
                    <select value={form[k] || ""} onChange={set(k)} style={{ ...INPUT_BASE, borderColor: form[k] ? fm.color : "#e2e8f0" }}>
                      <option value="">{fm.placeholder}</option>
                      {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>)}
                    </select></div>
                ) : (
                  <div key={k}><label style={{ ...LABEL_STYLE, color: fm.color }}><Ic style={{ width: "9px", height: "9px", verticalAlign: "middle", marginRight: "3px" }} />{fm.label}</label>
                    <input type={fm.type} value={form[k] || ""} onChange={set(k)} placeholder={fm.placeholder} style={{ ...INPUT_BASE, borderColor: form[k] ? fm.color : "#e2e8f0" }} /></div>
                );
              })}
              {success && <div style={{ padding: "7px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", fontSize: "12px", color: "#16a34a" }}>✅ Submitted!</div>}
              <button onClick={handleSubmit} disabled={submitting || success} style={{ padding: "9px", borderRadius: "7px", border: "none", background: submitting || success ? "#e2e8f0" : m.color, color: submitting || success ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: submitting || success ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "inherit" }}>
                {submitting ? <><RefreshCw style={{ width: "12px", height: "12px", animation: "spin .8s linear infinite" }} />Submitting…</> : success ? "✓ Submitted!" : <><Check style={{ width: "12px", height: "12px" }} />Submit Info</>}
              </button>
            </div>
          )}
          {error && <div style={{ padding: "7px 10px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "6px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        </div>
      )}
      {isCompleted && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "7px" }}>
          <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px", fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle style={{ width: "13px", height: "13px", flexShrink: 0 }} />All info collected for <strong>@{playerMeta.username}</strong>
          </div>
          {(isClaimedByMe || !task.assignedToId) && (
            <button onClick={handleUndo} disabled={undoing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px 12px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "11px", fontWeight: "700", cursor: undoing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {undoing ? <><RefreshCw style={{ width: "11px", height: "11px", animation: "spin .8s linear infinite" }} />Undoing…</> : <><Undo2 style={{ width: "11px", height: "11px" }} />Undo</>}
            </button>
          )}
          {error && <div style={{ padding: "7px 10px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "6px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        </div>
      )}
      {isClaimedByOther && !isCompleted && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
            <Lock style={{ width: "12px", height: "12px", flexShrink: 0 }} /><strong>{task.assignedTo?.name}</strong> is working on this
          </div>
        </div>
      )}
    </div>
  );
}

function DailyChecklistCard({ task, onChecklistToggle }) {
  const [expanded, setExpanded] = useState(true); const [toggling, setToggling] = useState(null);
  const cl = task.checklistItems || []; const done = cl.filter(i => i.done).length;
  const pct = cl.length > 0 ? Math.round((done / cl.length) * 100) : 0;
  const allDone = done === cl.length && cl.length > 0; const due = fmtDue(task.dueDate);
  const m = TYPE_META.DAILY_CHECKLIST;
  async function toggle(item) { setToggling(item.id); await onChecklistToggle(task.id, item.id, !item.done); setToggling(null); }
  return (
    <div style={{ ...CARD_STYLE, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : m.color}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: allDone ? "#dcfce7" : m.lightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckCircle style={{ width: "16px", height: "16px", color: allDone ? "#22c55e" : m.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} /><span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="DAILY_CHECKLIST" />
            {task.isDaily && <span style={{ padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>Daily</span>}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ width: "100px" }}><ProgressBar pct={pct} color={m.color} thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b" }}>{done}/{cl.length}{allDone ? " ✓" : ""}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: "1.5" }}>{task.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {cl.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: toggling === item.id ? "wait" : "pointer", padding: "8px 10px", borderRadius: "7px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#f1f5f9"}` }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => toggle(item)}>
                  {item.done && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
                  {toggling === item.id && <RefreshCw style={{ width: "9px", height: "9px", color: "#cbd5e1", animation: "spin .8s linear infinite" }} />}
                </div>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: "500", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700" }}>req</span>}
              </label>
            ))}
          </div>
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", marginTop: "8px", display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} />Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

function PlayerAdditionCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState(""); const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false); const [expanded, setExpanded] = useState(true);
  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100; const due = fmtDue(task.dueDate);
  const mySub = (task.subTasks || []).find(st => String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId));
  const myPct = mySub?.targetValue > 0 ? Math.min(100, Math.round(((mySub.currentValue ?? 0) / mySub.targetValue) * 100)) : null;
  const m = TYPE_META.PLAYER_ADDITION;
  async function log() {
    if (!logVal || parseFloat(logVal) <= 0) return; setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal)); setLogVal(""); setLogging(false); setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }
  return (
    <div style={{ ...CARD_STYLE, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : m.color}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: allDone ? "#dcfce7" : m.lightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users style={{ width: "16px", height: "16px", color: allDone ? "#22c55e" : m.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} /><span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="PLAYER_ADDITION" />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ width: "100px" }}><ProgressBar pct={pct} color={m.color} thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b" }}>{task.currentValue ?? 0}/{task.targetValue} players</span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}
          {mySub && (
            <div style={{ padding: "10px 12px", background: m.lightBg, border: `1px solid ${m.border}`, borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>My target</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : m.color }}>{mySub.currentValue ?? 0}/{mySub.targetValue} ({myPct ?? 0}%)</span>
              </div>
              <ProgressBar pct={myPct ?? 0} color={m.color} />
            </div>
          )}
          {(task.subTasks || []).length > 0 && (
            <div style={{ padding: "10px 12px", background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Team Progress</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {task.subTasks.map(st => {
                  const sp = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                  const isMe = String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId);
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: isMe ? "700" : "500", color: isMe ? m.color : "#0f172a", minWidth: "75px" }}>{isMe ? "⭐ You" : (st.assignedTo?.name || "Member")}</span>
                      <div style={{ flex: 1 }}><ProgressBar pct={sp} color={isMe ? m.color : "#cbd5e1"} thin /></div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: sp >= 100 ? "#22c55e" : "#64748b", whiteSpace: "nowrap", minWidth: "50px", textAlign: "right" }}>{st.currentValue ?? 0}/{st.targetValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!allDone && (
            <div style={{ display: "flex", gap: "6px" }}>
              <input type="number" min="1" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT_BASE, flex: 1, borderColor: m.border }} placeholder="Players added…" onKeyDown={e => e.key === "Enter" && log()} />
              <button onClick={log} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "9px 14px", background: logging ? "#e2e8f0" : m.color, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}>
                {logging ? <RefreshCw style={{ width: "11px", height: "11px", animation: "spin .8s linear infinite" }} /> : <Plus style={{ width: "11px", height: "11px" }} />}{logSuccess ? "✓" : "Log"}
              </button>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} />Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

function RevenueTargetCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState(""); const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false); const [expanded, setExpanded] = useState(true);
  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100; const due = fmtDue(task.dueDate);
  const mySub = (task.subTasks || []).find(st => String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId));
  const myPct = mySub?.targetValue > 0 ? Math.min(100, Math.round(((mySub.currentValue ?? 0) / mySub.targetValue) * 100)) : null;
  const m = TYPE_META.REVENUE_TARGET;
  async function log() {
    if (!logVal || parseFloat(logVal) <= 0) return; setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal)); setLogVal(""); setLogging(false); setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }
  return (
    <div style={{ ...CARD_STYLE, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : m.color}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: m.lightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp style={{ width: "16px", height: "16px", color: m.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} /><span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="REVENUE_TARGET" />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ width: "100px" }}><ProgressBar pct={pct} color={m.color} thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b" }}>${(task.currentValue ?? 0).toFixed(0)}/${task.targetValue}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {mySub && (
            <div style={{ padding: "10px 12px", background: m.lightBg, border: `1px solid ${m.border}`, borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>My target</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : m.color }}>${(mySub.currentValue ?? 0).toFixed(2)} / ${mySub.targetValue}</span>
              </div>
              <ProgressBar pct={myPct ?? 0} color={m.color} />
            </div>
          )}
          {!allDone && (
            <div style={{ display: "flex", gap: "6px" }}>
              <input type="number" min="0.01" step="0.01" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT_BASE, flex: 1, borderColor: m.border }} placeholder="Amount achieved…" onKeyDown={e => e.key === "Enter" && log()} />
              <button onClick={log} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "9px 14px", background: logging ? "#e2e8f0" : m.color, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}>
                {logging ? <RefreshCw style={{ width: "11px", height: "11px", animation: "spin .8s linear infinite" }} /> : <TrendingUp style={{ width: "11px", height: "11px" }} />}{logSuccess ? "✓" : "Log"}
              </button>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} />Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

function StandardTaskCard({ task, onStatusChange, onChecklistToggle }) {
  const [expanded, setExpanded] = useState(false); const [toggling, setToggling] = useState(null);
  const isCompleted = task.status === "COMPLETED"; const cl = task.checklistItems || [];
  const done = cl.filter(i => i.done).length; const due = fmtDue(task.dueDate);
  async function toggle(item) { setToggling(item.id); await onChecklistToggle(task.id, item.id, !item.done); setToggling(null); }
  return (
    <div style={{ ...CARD_STYLE, overflow: "hidden", borderLeft: `3px solid ${isCompleted ? "#22c55e" : PRIORITY_COLOR[task.priority] || "#e2e8f0"}`, opacity: isCompleted ? 0.72 : 1 }}>
      <div style={{ padding: "12px 14px", display: "flex", gap: "9px", alignItems: "center" }}>
        <button onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          {isCompleted ? <CheckCircle style={{ width: "18px", height: "18px", color: "#22c55e" }} /> : <Circle style={{ width: "18px", height: "18px", color: "#cbd5e1" }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none" }}>{task.title}</span>
            <TypeBadge taskType="STANDARD" />
            {due?.isOverdue && !isCompleted && <span style={{ padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#fee2e2", color: "#dc2626" }}>Overdue</span>}
          </div>
          {cl.length > 0 && !isCompleted && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{done}/{cl.length} items</div>}
        </div>
        {due && <span style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{due.label}</span>}
        {cl.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", padding: "4px", color: "#94a3b8", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
          </button>
        )}
      </div>
      {expanded && cl.length > 0 && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {cl.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "7px 9px", borderRadius: "6px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#f1f5f9"}` }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "4px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => !toggling && toggle(item)}>
                {item.done && <Check style={{ width: "9px", height: "9px", color: "#fff" }} />}
              </div>
              <span style={{ flex: 1, fontSize: "12px", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
              {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444" }}>*</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskSection({ title, tasks, color, bg, defaultOpen = true, renderTask }) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: bg, border: `1px solid ${color}25`,
          borderRadius: open ? '8px 8px 0 0' : '8px',
          padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit',
          width: '100%', textAlign: 'left',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: '700', color, flex: 1 }}>{title}</span>
        <span style={{
          fontSize: '11px', fontWeight: '700', padding: '1px 8px', borderRadius: '999px',
          background: color + '20', color,
        }}>{tasks.length}</span>
        {open
          ? <ChevronUp style={{ width: '12px', height: '12px', color }} />
          : <ChevronDown style={{ width: '12px', height: '12px', color }} />}
      </button>
      {open && (
        <div style={{
          border: `1px solid ${color}20`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', padding: '6px',
          display: 'flex', flexDirection: 'column', gap: '5px',
          marginBottom: '6px',
        }}>
          {tasks.map(task => renderTask(task))}
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════
// ── MAIN EXPORT: TeamDashboard ─────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser, isAdmin = false, viewingMember = null }) {
  const { shiftActive } = useContext(ShiftStatusContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [resolvedUser, setResolvedUser] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [teamRatings, setTeamRatings] = useState([]);
  const sseRef = useRef(null);

  // Shift time display
  const [shiftDuration, setShiftDuration] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShiftDuration(d => d + 1), 60000);
    return () => clearInterval(t);
  }, []);

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

  // Fetch ratings
  useEffect(() => {
    if (!targetUserId) return;
    fetch(`${API}/members/${targetUserId}/ratings`, { credentials: "include", headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setRatings(d.data); }).catch(() => { });
    if (isAdmin) {
      fetch(`${API}/members/all-ratings`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null).then(d => { if (d?.data) setTeamRatings(d.data); }).catch(() => { });
    }
  }, [targetUserId, isAdmin]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tasks?myTasks=true`, { credentials: "include", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTasks(data.data || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadTasks();
    const token = localStorage.getItem('authToken');
    const sseUrl = `${API}/tasks/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const es = new EventSource(sseUrl, { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === "task_created") {
          setTasks(prev => { const ex = prev.find(t => t.id === data.id); if (ex) return prev.map(t => t.id === data.id ? data : t); if (data.taskType === "MISSING_INFO" && data.assignToAll) return [data, ...prev]; if (data.assignToAll || (myId && parseInt(data.assignedToId, 10) === myId)) return [data, ...prev]; return prev; });
        }
        if (type === "task_updated") {
          setTasks(prev => { const ex = prev.find(t => t.id === data.id); if (data.taskType === "MISSING_INFO" && data.assignedToId && myId !== null && parseInt(data.assignedToId, 10) !== myId && !data.assignToAll) return prev.filter(t => t.id !== data.id); if (ex) return prev.map(t => t.id === data.id ? data : t); if (myId && parseInt(data.assignedToId, 10) === myId) return [data, ...prev]; return prev; });
        }
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) { }
    };
    return () => es.close();
  }, [loadTasks, myId]);

  const handleChecklistToggle = useCallback(async (taskId, itemId, done) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, checklistItems: (t.checklistItems || []).map(i => i.id === itemId ? { ...i, done } : i) }));
    try { const res = await fetch(`${API}/tasks/${taskId}/checklist`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ itemId, done }) }); const d = await res.json(); if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t)); } catch (_) { }
  }, []);
  const handleStatusChange = useCallback(async (taskId, status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try { const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) }); const d = await res.json(); if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t)); } catch (_) { }
  }, []);
  const handleProgressLog = useCallback(async (taskId, value) => {
    try { const res = await fetch(`${API}/tasks/${taskId}/progress`, { method: "POST", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ value, action: "MEMBER_LOG" }) }); const d = await res.json(); if (res.ok && d.data) setTasks(prev => prev.map(t => t.id === taskId ? d.data : t)); } catch (_) { }
  }, []);
  const handleClaimTask = useCallback((u) => setTasks(prev => prev.map(t => t.id === u.id ? u : t)), []);
  const handleInfoSubmitted = useCallback((u) => setTasks(prev => prev.map(t => t.id === u.id ? u : t)), []);

  const byType = useMemo(() => {
    const map = {};
    [...STAT_TYPES, "MISSING_INFO"].forEach(k => { map[k] = tasks.filter(t => t.taskType === k); });
    return map;
  }, [tasks]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
    if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
    if (statusFilter === "IN_PROGRESS" && t.status !== "IN_PROGRESS") return false;
    if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, typeFilter, statusFilter, search]);

  const totalDone = tasks.filter(t => t.status === "COMPLETED").length;
  const totalInProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const totalPending = tasks.filter(t => t.status === "PENDING").length;
  const totalOverdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
  const completionPct = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  // ── Shift guard ────────────────────────────────────────────
  // if (!shiftActive) {
  //   return (
  //     <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
  //       <button onClick={() => navigate('/shifts')} style={{ alignSelf: "flex-start", padding: "9px 18px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px #2563eb40" }}>▶ Start Shift</button>
  //       <div style={{ padding: "14px 18px", background: "#fffbeb", borderLeft: "4px solid #d97706", borderRadius: "10px", fontSize: "13px", color: "#78350f", fontWeight: "600" }}>
  //         ⚠️ You must have an active shift to view your tasks.
  //       </div>
  //       <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
  //         <Lock style={{ width: "32px", height: "32px", color: "#f59e0b", margin: "0 auto 12px", display: "block" }} />
  //         <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "800", color: "#fff" }}>Dashboard Locked</p>
  //         <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Start your shift first to unlock your tasks.</p>
  //       </div>
  //     </div>
  //   );
  // }
  if (!shiftActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', background: 'none' }}>
          <button onClick={() => navigate('/shifts')} style={{ padding: '9px 18px', background: 'rgb(14, 165, 233)', color: '#fff' }}>
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
      </div>
    );
  }

  const memberName = viewingMember?.name || resolvedUser?.name || "Member";
  const memberRole = viewingMember?.role || resolvedUser?.role || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ─── HERO HEADER ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e293b 100%)",
        borderRadius: "16px", padding: "20px 22px", color: "#fff",
        position: "relative", overflow: "hidden",
        boxShadow: "0 8px 32px rgba(15,23,42,0.28)",
      }}>
        {/* Background decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(59,130,246,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: 60, width: 100, height: 100, borderRadius: "50%", background: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isAdmin && viewingMember ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ padding: "3px 10px", background: "rgba(59,130,246,0.25)", borderRadius: "999px", fontSize: "10px", fontWeight: "700", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid rgba(59,130,246,0.3)" }}>
                    👁 Admin View · {memberRole}
                  </div>
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "900", color: "#fff", letterSpacing: "-0.3px" }}>{memberName}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Monitoring performance and tasks</p>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600", letterSpacing: "0.3px" }}>SHIFT ACTIVE</span>
                </div>
                <h2 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: "900", color: "#fff", letterSpacing: "-0.3px" }}>
                  {isAdmin ? "Team Command Center" : "My Tasks"}
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                  {tasks.length} total tasks · tracking your shift
                </p>
              </>
            )}

            {/* Quick stats row */}
            <div style={{ display: "flex", gap: "6px", marginTop: "14px", flexWrap: "wrap" }}>
              {[
                { label: "Done", val: totalDone, color: "#4ade80" },
                { label: "Active", val: totalInProgress, color: "#60a5fa" },
                { label: "Pending", val: totalPending, color: "#94a3b8" },
                ...(totalOverdue > 0 ? [{ label: "Overdue", val: totalOverdue, color: "#f87171" }] : []),
              ].map(s => (
                <div key={s.label} style={{ padding: "5px 11px", background: "rgba(255,255,255,0.07)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginLeft: "4px", fontWeight: "500" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <PerformanceRing pct={completionPct} size={95} />
            <button onClick={loadTasks} style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "7px", color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: "600", padding: "4px 9px", cursor: "pointer", fontFamily: "inherit" }}>
              <RefreshCw style={{ width: "9px", height: "9px" }} />Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── ADMIN TEAM RATINGS OVERVIEW ─────────────────────── */}
      {isAdmin && teamRatings.length > 0 && <AdminRatingOverview teamRatings={teamRatings} />}

      {/* ─── MEMBER RATING PANEL ──────────────────────────────── */}
      {ratings && <RatingPanel ratings={ratings} isAdmin={isAdmin} />}

      {/* ─── TASK TYPE BREAKDOWN ──────────────────────────────── */}
      <TaskTypeBreakdown byType={byType} onSelect={setTypeFilter} selected={typeFilter} />

      {/* ─── SEARCH + FILTER BAR ──────────────────────────────── */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: "150px" }}>
          <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ ...INPUT_BASE, paddingLeft: "30px", paddingTop: "7px", paddingBottom: "7px" }} />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94a3b8", display: "flex" }}>
              <X style={{ width: "13px", height: "13px" }} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "3px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
          {[
            { key: "ALL", label: "All" },
            { key: "PENDING", label: "Pending" },
            { key: "IN_PROGRESS", label: "Active" },
            { key: "COMPLETED", label: "Done" },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)} style={{
              padding: "5px 10px", borderRadius: "6px", border: "none", fontSize: "11px",
              fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              background: statusFilter === s.key ? "#0ea5e9" : "transparent",
              color: statusFilter === s.key ? "#fff" : "#64748b",
              transition: "all .12s",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ ...INPUT_BASE, width: "auto", minWidth: "120px", paddingRight: "26px", paddingLeft: "10px", paddingTop: "7px", paddingBottom: "7px", appearance: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
            <option value="ALL">All Types</option>
            {Object.keys(TYPE_META).map(k => <option key={k} value={k}>{TYPE_META[k].label}</option>)}
          </select>
          <ChevronDown style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "#94a3b8", pointerEvents: "none" }} />
        </div>
      </div>

      {/* ─── ERROR ────────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: "9px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "12px", display: "flex", gap: "7px", alignItems: "center" }}>
          <AlertCircle style={{ width: "12px", height: "12px", flexShrink: 0 }} />{error}
        </div>
      )}

      {/* ─── TASK LIST ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
          <RefreshCw style={{ width: "18px", height: "18px", margin: "0 auto 8px", display: "block", opacity: 0.4, animation: "spin 1s linear infinite" }} />
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px", background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>{search ? "🔍" : totalDone === tasks.length && tasks.length > 0 ? "🎉" : "📋"}</div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            {search ? `No tasks matching "${search}"` : totalDone === tasks.length && tasks.length > 0 ? "All tasks complete!" : "No tasks found"}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            {totalDone === tasks.length && tasks.length > 0 ? "Great work this shift 🚀" : "Tasks assigned by admin will appear here"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {(() => {
            const renderTask = (task) => {
              switch (task.taskType) {
                case "MISSING_INFO": return <MissingInfoTaskCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onInfoSubmitted={handleInfoSubmitted} />;
                case "PLAYER_FOLLOWUP": return <PlayerFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />;
                case "BONUS_FOLLOWUP": return <BonusFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />;
                case "DAILY_CHECKLIST": return <DailyChecklistCard key={task.id} task={task} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />;
                case "PLAYER_ADDITION": return <PlayerAdditionCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} />;
                case "REVENUE_TARGET": return <RevenueTargetCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} />;
                default: return <StandardTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />;
              }
            };

            // If filtering by specific type or status, show flat list
            if (typeFilter !== "ALL" || statusFilter !== "ALL" || search) {
              return filtered.length === 0 ? null : filtered.map(task => renderTask(task));
            }

            // Default: grouped by status
            const overdue = filtered.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED");
            const active = filtered.filter(t => t.status === "IN_PROGRESS" && !(t.dueDate && new Date(t.dueDate) < new Date()));
            const pending = filtered.filter(t => t.status === "PENDING");
            const done = filtered.filter(t => t.status === "COMPLETED");

            return (
              <>
                <TaskSection title="Overdue — action required" tasks={overdue} color="#dc2626" bg="#fff5f5" defaultOpen={true} renderTask={renderTask} />
                <TaskSection title="In Progress" tasks={active} color="#0ea5e9" bg="#f0f9ff" defaultOpen={true} renderTask={renderTask} />
                <TaskSection title="Pending" tasks={pending} color="#64748b" bg="#f8fafc" defaultOpen={true} renderTask={renderTask} />
                <TaskSection title="Completed" tasks={done} color="#22c55e" bg="#f0fdf4" defaultOpen={false} renderTask={renderTask} />
              </>
            );
          })()}
        </div>

      )}

      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
        <AdminTeamShiftsSection />
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
