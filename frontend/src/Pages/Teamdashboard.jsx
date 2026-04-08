// components/MemberTasksSection.jsx
import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Circle, Clock, AlertCircle, RefreshCw,
  TrendingUp, Users, List, ChevronDown, ChevronUp,
  Calendar, Plus, X, Check,
  UserCheck, Phone, Mail, Camera, Instagram, Send, User,
  ClipboardList, Lock, Unlock, Undo2, Gift, Search, Filter
} from "lucide-react";
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { PlayerFollowupCard, BonusFollowupCard } from './FollowupTaskCards';

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const IAlert = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const ILock = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;

const API = import.meta.env.VITE_API_URL ?? "";

function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem('authToken');
  const headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function extractUserId(currentUser) {
  if (!currentUser) return null;
  const raw = currentUser.id ?? currentUser.userId ?? currentUser.user?.id ?? null;
  if (raw === null || raw === undefined) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

const MISSING_FIELD_META = {
  email: { icon: Mail, label: "Email", placeholder: "player@email.com", type: "email", color: "#3b82f6" },
  phone: { icon: Phone, label: "Phone", placeholder: "+1 234 567 8900", type: "tel", color: "#8b5cf6" },
  snapchat: { icon: Camera, label: "Snapchat", placeholder: "@snapchathandle", type: "text", color: "#eab308" },
  instagram: { icon: Instagram, label: "Instagram", placeholder: "@instagramhandle", type: "text", color: "#ec4899" },
  telegram: { icon: Send, label: "Telegram", placeholder: "@telegramhandle", type: "text", color: "#0ea5e9" },
  assigned_member: { icon: User, label: "Assigned Member", placeholder: "Select member…", type: "select", color: "#ef4444" },
};

// ── Type config ──────────────────────────────────────────────────
const TYPE_META = {
  MISSING_INFO:     { label: "Missing Info",     icon: ClipboardList, color: "#f97316", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316" },
  PLAYER_FOLLOWUP:  { label: "Player Followup",  icon: Users,        color: "#dc2626", bg: "#fff1f2", border: "#fecdd3", dot: "#dc2626" },
  BONUS_FOLLOWUP:   { label: "Bonus Followup",   icon: Gift,         color: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  DAILY_CHECKLIST:  { label: "Daily Checklist",  icon: CheckCircle,  color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", dot: "#0ea5e9" },
  PLAYER_ADDITION:  { label: "Player Addition",  icon: Users,        color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", dot: "#8b5cf6" },
  REVENUE_TARGET:   { label: "Revenue Target",   icon: TrendingUp,   color: "#16a34a", bg: "#f0fdf4", border: "#86efac", dot: "#22c55e" },
  STANDARD:         { label: "Standard",         icon: List,         color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8" },
};

const PRIORITY_COLOR = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", URGENT: "#dc2626" };

const LABEL = {
  display: "block", fontSize: "11px", fontWeight: "700",
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const INPUT = {
  width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
  borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none",
};
const CARD = {
  background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(15,23,42,.05)",
};

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const isOverdue = d < new Date();
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + fmtTime(iso);
  return { label, isOverdue };
}

function ProgressBar({ pct, color, thin }) {
  const h = thin ? "4px" : "6px";
  return (
    <div style={{ height: h, background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .4s ease" }} />
    </div>
  );
}

function TypePill({ taskType }) {
  const meta = TYPE_META[taskType] || TYPE_META.STANDARD;
  const Icon = meta.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "700",
      background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
      letterSpacing: "0.2px", whiteSpace: "nowrap",
    }}>
      <Icon style={{ width: "9px", height: "9px" }} />
      {meta.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const color = PRIORITY_COLOR[priority] || "#94a3b8";
  return (
    <span title={priority} style={{
      display: "inline-block", width: "7px", height: "7px",
      borderRadius: "50%", background: color, flexShrink: 0,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════
// MISSING INFO TASK CARD
// ═══════════════════════════════════════════════════════════════
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

  const playerMeta = useMemo(() => {
    try { return JSON.parse(task.notes || "{}"); } catch { return {}; }
  }, [task.notes]);

  const missingFields = useMemo(
    () => (task.checklistItems || []).filter(i => !i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")),
    [task.checklistItems]
  );
  const doneFields = useMemo(
    () => (task.checklistItems || []).filter(i => i.done).map(i => i.fieldKey || i.label?.toLowerCase().replace(/ /g, "_")),
    [task.checklistItems]
  );

  const totalFields = (task.checklistItems || []).length;
  const doneCount = doneFields.length;
  const pct = totalFields > 0 ? Math.round((doneCount / totalFields) * 100) : 0;

  const isClaimedByMe = !!task.assignedToId && myId !== null && parseInt(task.assignedToId, 10) === myId;
  const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
  const isClaimable = !task.assignedToId;
  const isCompleted = task.status === "COMPLETED";

  useEffect(() => {
    if (missingFields.includes("assigned_member") && isClaimedByMe) {
      fetch(`${API}/team-members`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.json()).then(d => setTeamMembers(d.data || [])).catch(() => {});
    }
  }, [isClaimedByMe, missingFields]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleClaim = async () => {
    setClaiming(true); setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/claim`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim task");
      onClaim(data.data);
    } catch (err) { setError(err.message); } finally { setClaiming(false); }
  };

  const handleSubmit = async () => {
    const hasAnyValue = Object.values(form).some(v => v && v.trim?.() !== "");
    if (!hasAnyValue) { setError("Please fill in at least one field before submitting."); return; }
    setSubmitting(true); setError("");
    try {
      const body = {};
      missingFields.forEach(key => {
        if (form[key] !== undefined && form[key] !== "") {
          if (key === "assigned_member") body.assignedMemberId = form[key];
          else body[key] = form[key];
        }
      });
      const res = await fetch(`${API}/tasks/${task.id}/submit-missing-info`, { method: "POST", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit info");
      setSuccess(true); setForm({}); onInfoSubmitted(data.data);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleUndo = async () => {
    setUndoing(true); setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, { method: "POST", credentials: "include", headers: getAuthHeaders(true) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to undo");
      setSuccess(false); onInfoSubmitted(data.data);
    } catch (err) { setError(err.message); } finally { setUndoing(false); }
  };

  return (
    <div style={{
      ...CARD, overflow: "hidden",
      borderLeft: `3px solid ${isCompleted ? "#22c55e" : "#f97316"}`,
      opacity: isCompleted ? 0.8 : 1,
    }}>
      {/* Header */}
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
          background: isCompleted ? "#dcfce7" : "#fff7ed",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ClipboardList style={{ width: "16px", height: "16px", color: isCompleted ? "#22c55e" : "#f97316" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "5px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "120px" }}>
              <div style={{ flex: 1, maxWidth: "100px" }}><ProgressBar pct={pct} color="#f97316" thin /></div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: isCompleted ? "#16a34a" : "#64748b", whiteSpace: "nowrap" }}>
                {doneCount}/{totalFields}
              </span>
            </div>
            {isCompleted ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#16a34a", display: "flex", alignItems: "center", gap: "3px" }}>
                <CheckCircle style={{ width: "10px", height: "10px" }} /> Done
              </span>
            ) : isClaimedByMe ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#ea580c", display: "flex", alignItems: "center", gap: "3px" }}>
                <Lock style={{ width: "9px", height: "9px" }} /> Claimed by you
              </span>
            ) : isClaimedByOther ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                <Lock style={{ width: "9px", height: "9px" }} /> {task.assignedTo?.name || "Claimed"}
              </span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#f97316", display: "flex", alignItems: "center", gap: "3px" }}>
                <Unlock style={{ width: "9px", height: "9px" }} /> Open
              </span>
            )}
          </div>
        </div>
        {!isClaimedByOther && !isCompleted && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex", flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
          </button>
        )}
      </div>

      {/* Body */}
      {expanded && !isCompleted && !isClaimedByOther && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}

          {doneFields.length > 0 && (
            <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", marginBottom: "5px", textTransform: "uppercase" }}>Already collected</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {doneFields.map(key => {
                  const meta = MISSING_FIELD_META[key];
                  const Icon = meta?.icon || CheckCircle;
                  return (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "600", background: "#dcfce7", color: "#16a34a" }}>
                      <Icon style={{ width: "9px", height: "9px" }} /> {meta?.label || key}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {isClaimable && !isClaimedByMe && (
            <div style={{ padding: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", color: "#9a3412", margin: "0 0 8px", lineHeight: "1.5" }}>
                Claim to collect info for <strong>@{playerMeta.username || "player"}</strong>
              </p>
              <button onClick={handleClaim} disabled={claiming} style={{ width: "100%", padding: "9px", borderRadius: "7px", border: "none", background: claiming ? "#e2e8f0" : "#f97316", color: claiming ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: claiming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "inherit" }}>
                {claiming ? <><RefreshCw style={{ width: "12px", height: "12px", animation: "spin 0.8s linear infinite" }} /> Claiming…</> : <><UserCheck style={{ width: "12px", height: "12px" }} /> Claim Task</>}
              </button>
            </div>
          )}

          {isClaimedByMe && missingFields.length > 0 && (
            <div style={{ padding: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.4px" }}>Fill in Missing Fields</div>
              {missingFields.map(key => {
                const meta = MISSING_FIELD_META[key];
                if (!meta) return null;
                const Icon = meta.icon;
                if (key === "assigned_member") {
                  return (
                    <div key={key}>
                      <label style={{ ...LABEL, color: meta.color }}><Icon style={{ width: "9px", height: "9px", verticalAlign: "middle", marginRight: "3px" }} />{meta.label}</label>
                      <select value={form[key] || ""} onChange={set(key)} style={{ ...INPUT, borderColor: form[key] ? meta.color : "#e2e8f0" }}>
                        <option value="">{meta.placeholder}</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                      </select>
                    </div>
                  );
                }
                return (
                  <div key={key}>
                    <label style={{ ...LABEL, color: meta.color }}><Icon style={{ width: "9px", height: "9px", verticalAlign: "middle", marginRight: "3px" }} />{meta.label}</label>
                    <input type={meta.type} value={form[key] || ""} onChange={set(key)} placeholder={meta.placeholder} style={{ ...INPUT, borderColor: form[key] ? meta.color : "#e2e8f0" }} />
                  </div>
                );
              })}
              {success && <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px", fontSize: "12px", color: "#16a34a" }}>✅ Submitted!</div>}
              <button onClick={handleSubmit} disabled={submitting || success} style={{ padding: "9px", borderRadius: "7px", border: "none", background: submitting || success ? "#e2e8f0" : "#f97316", color: submitting || success ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: submitting || success ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "inherit" }}>
                {submitting ? <><RefreshCw style={{ width: "12px", height: "12px", animation: "spin 0.8s linear infinite" }} /> Submitting…</> : success ? "✓ Submitted!" : <><Check style={{ width: "12px", height: "12px" }} /> Submit Info</>}
              </button>
            </div>
          )}

          {error && <div style={{ padding: "8px 10px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "7px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        </div>
      )}

      {isCompleted && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px", fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle style={{ width: "13px", height: "13px", flexShrink: 0 }} />
            All info collected for <strong>@{playerMeta.username}</strong>
          </div>
          {(isClaimedByMe || !task.assignedToId) && (
            <button onClick={handleUndo} disabled={undoing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px 12px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "11px", fontWeight: "700", cursor: undoing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {undoing ? <><RefreshCw style={{ width: "11px", height: "11px", animation: "spin 0.8s linear infinite" }} /> Undoing…</> : <><Undo2 style={{ width: "11px", height: "11px" }} /> Undo</>}
            </button>
          )}
          {error && <div style={{ padding: "8px 10px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "7px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        </div>
      )}

      {isClaimedByOther && !isCompleted && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
            <Lock style={{ width: "12px", height: "12px", flexShrink: 0 }} />
            <strong>{task.assignedTo?.name}</strong> is working on this
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Checklist Card ─────────────────────────────────────
function DailyChecklistCard({ task, onChecklistToggle, currentUserId }) {
  const [expanded, setExpanded] = useState(true);
  const [toggling, setToggling] = useState(null);
  const checklist = task.checklistItems || [];
  const doneItems = checklist.filter(i => i.done).length;
  const pct = checklist.length > 0 ? Math.round((doneItems / checklist.length) * 100) : 0;
  const allDone = doneItems === checklist.length && checklist.length > 0;
  const due = fmtDue(task.dueDate);

  async function toggle(item) {
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : "#0ea5e9"}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: allDone ? "#dcfce7" : "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckCircle style={{ width: "16px", height: "16px", color: allDone ? "#22c55e" : "#0ea5e9" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            {task.isDaily && <span style={{ padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>Daily</span>}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "120px" }}><ProgressBar pct={pct} color="#0ea5e9" thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {doneItems}/{checklist.length} {allDone ? "✓" : ""}
            </span>
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
            {checklist.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: toggling === item.id ? "wait" : "pointer", padding: "8px 10px", borderRadius: "7px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#e2e8f0"}` }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => toggle(item)}>
                  {item.done && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
                  {toggling === item.id && <RefreshCw style={{ width: "9px", height: "9px", color: "#cbd5e1", animation: "spin 0.8s linear infinite" }} />}
                </div>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: "500", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700" }}>req</span>}
              </label>
            ))}
          </div>
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", marginTop: "8px", display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Player Addition Card ─────────────────────────────────────
function PlayerAdditionCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState("");
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100;
  const due = fmtDue(task.dueDate);
  const mySubTask = (task.subTasks || []).find(st => String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId));
  const myPct = mySubTask?.targetValue > 0 ? Math.min(100, Math.round(((mySubTask.currentValue ?? 0) / mySubTask.targetValue) * 100)) : null;

  async function handleLog() {
    if (!logVal || parseFloat(logVal) <= 0) return;
    setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal));
    setLogVal(""); setLogging(false); setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : "#8b5cf6"}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: allDone ? "#dcfce7" : "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users style={{ width: "16px", height: "16px", color: allDone ? "#22c55e" : "#8b5cf6" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "120px" }}><ProgressBar pct={pct} color="#8b5cf6" thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {task.currentValue ?? 0}/{task.targetValue} players
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}
          {mySubTask && (
            <div style={{ padding: "10px 12px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>My Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>Progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#8b5cf6" }}>{mySubTask.currentValue ?? 0}/{mySubTask.targetValue} ({myPct ?? 0}%)</span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#8b5cf6" />
            </div>
          )}
          {(task.subTasks || []).length > 0 && (
            <div style={{ padding: "10px 12px", background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Team</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {task.subTasks.map(st => {
                  const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                  const isMe = String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId);
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: isMe ? "700" : "500", color: isMe ? "#8b5cf6" : "#0f172a", minWidth: "80px" }}>{isMe ? "⭐ You" : (st.assignedTo?.name || "Member")}</span>
                      <div style={{ flex: 1 }}><ProgressBar pct={sPct} color={isMe ? "#8b5cf6" : "#cbd5e1"} thin /></div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: sPct >= 100 ? "#22c55e" : "#64748b", whiteSpace: "nowrap", minWidth: "55px", textAlign: "right" }}>{st.currentValue ?? 0}/{st.targetValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!allDone && (
            <div style={{ display: "flex", gap: "7px" }}>
              <input type="number" min="1" step="1" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT, flex: 1, borderColor: "#ddd6fe" }} placeholder="Players added…" onKeyDown={e => e.key === "Enter" && handleLog()} />
              <button onClick={handleLog} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "10px 14px", background: logging ? "#e2e8f0" : "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}>
                {logging ? <RefreshCw style={{ width: "12px", height: "12px", animation: "spin 0.8s linear infinite" }} /> : <Plus style={{ width: "12px", height: "12px" }} />}
                {logSuccess ? "✓" : "Log"}
              </button>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Target Card ──────────────────────────────────────
function RevenueTargetCard({ task, currentUserId, onProgressLog }) {
  const [logVal, setLogVal] = useState("");
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const pct = task.targetValue > 0 ? Math.min(100, Math.round(((task.currentValue ?? 0) / task.targetValue) * 100)) : 0;
  const allDone = pct >= 100;
  const mySubTask = (task.subTasks || []).find(st => String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId));
  const myPct = mySubTask?.targetValue > 0 ? Math.min(100, Math.round(((mySubTask.currentValue ?? 0) / mySubTask.targetValue) * 100)) : null;
  const due = fmtDue(task.dueDate);

  async function handleLog() {
    if (!logVal || parseFloat(logVal) <= 0) return;
    setLogging(true);
    await onProgressLog(task.id, parseFloat(logVal));
    setLogVal(""); setLogging(false); setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `3px solid ${allDone ? "#22c55e" : "#16a34a"}` }}>
      <div style={{ padding: "13px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp style={{ width: "16px", height: "16px", color: "#22c55e" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "120px" }}><ProgressBar pct={pct} color="#22c55e" thin /></div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              ${(task.currentValue ?? 0).toFixed(0)}/${task.targetValue}
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#94a3b8", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {mySubTask && (
            <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>My Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>Progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#16a34a" }}>${(mySubTask.currentValue ?? 0).toFixed(2)} / ${mySubTask.targetValue}</span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#22c55e" />
            </div>
          )}
          {!allDone && (
            <div style={{ display: "flex", gap: "7px" }}>
              <input type="number" min="0.01" step="0.01" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT, flex: 1, borderColor: "#86efac" }} placeholder="Amount achieved…" onKeyDown={e => e.key === "Enter" && handleLog()} />
              <button onClick={handleLog} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "10px 14px", background: logging ? "#e2e8f0" : "#22c55e", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}>
                {logging ? <RefreshCw style={{ width: "12px", height: "12px", animation: "spin 0.8s linear infinite" }} /> : <TrendingUp style={{ width: "12px", height: "12px" }} />}
                {logSuccess ? "✓" : "Log"}
              </button>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "3px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due {due.label}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Standard Task Card ───────────────────────────────────────
function StandardTaskCard({ task, onStatusChange, onChecklistToggle, currentUserId }) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(null);
  const isCompleted = task.status === "COMPLETED";
  const checklist = task.checklistItems || [];
  const doneItems = checklist.filter(i => i.done).length;
  const due = fmtDue(task.dueDate);
  const barColor = PRIORITY_COLOR[task.priority] || "#64748b";

  async function toggle(item) {
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `3px solid ${isCompleted ? "#22c55e" : barColor}`, opacity: isCompleted ? 0.7 : 1 }}>
      <div style={{ padding: "12px 14px", display: "flex", gap: "9px", alignItems: "center" }}>
        <button onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          {isCompleted ? <CheckCircle style={{ width: "18px", height: "18px", color: "#22c55e" }} /> : <Circle style={{ width: "18px", height: "18px", color: "#cbd5e1" }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <PriorityDot priority={task.priority} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none" }}>{task.title}</span>
            {due?.isOverdue && !isCompleted && <span style={{ padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#fee2e2", color: "#dc2626" }}>Overdue</span>}
          </div>
          {checklist.length > 0 && !isCompleted && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{doneItems}/{checklist.length} items</div>}
        </div>
        {due && <span style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{due.label}</span>}
        {checklist.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", padding: "4px", color: "#94a3b8", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
          </button>
        )}
      </div>
      {expanded && checklist.length > 0 && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 6px", lineHeight: "1.5" }}>{task.description}</p>}
          {checklist.map(item => (
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

// ─── Section Group ────────────────────────────────────────────
function TaskSection({ label, emoji, tasks, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const pendingCount = tasks.filter(t => t.status !== "COMPLETED").length;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "7px", width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: "6px 2px",
          marginBottom: open ? "8px" : "0",
        }}
      >
        <span style={{ fontSize: "12px" }}>{emoji}</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", flex: 1, textAlign: "left" }}>{label}</span>
        <span style={{
          padding: "1px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "700",
          background: pendingCount > 0 ? "#f1f5f9" : "#f0fdf4",
          color: pendingCount > 0 ? "#475569" : "#16a34a",
        }}>{tasks.length}</span>
        {open ? <ChevronUp style={{ width: "12px", height: "12px", color: "#94a3b8" }} /> : <ChevronDown style={{ width: "12px", height: "12px", color: "#94a3b8" }} />}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Type filter tab config ───────────────────────────────────────
const TYPE_TABS = [
  { key: "all",              label: "All",          emoji: "📋" },
  { key: "MISSING_INFO",     label: "Missing Info", emoji: "📝" },
  { key: "PLAYER_FOLLOWUP",  label: "Follow-up",    emoji: "🔴" },
  { key: "BONUS_FOLLOWUP",   label: "Bonus",        emoji: "🎁" },
  { key: "DAILY_CHECKLIST",  label: "Daily",        emoji: "✅" },
  { key: "PLAYER_ADDITION",  label: "Players",      emoji: "👥" },
  { key: "REVENUE_TARGET",   label: "Revenue",      emoji: "💰" },
  { key: "STANDARD",         label: "Tasks",        emoji: "📌" },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser, activeShift }) {
  const { shiftActive } = useContext(ShiftStatusContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [resolvedUser, setResolvedUser] = useState(null);
  const sseRef = useRef(null);

  useEffect(() => {
    const id = extractUserId(currentUser);
    if (id !== null) {
      setResolvedUser({ ...currentUser, id });
    } else {
      fetch(`${API}/user`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.json())
        .then(data => { const u = data?.data ?? data?.user ?? data; if (u?.id) setResolvedUser(u); })
        .catch(() => {});
    }
  }, [currentUser]);

  const myId = resolvedUser ? extractUserId(resolvedUser) : null;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tasks?myTasks=true`, { credentials: "include", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
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
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.id);
            if (exists) return prev.map(t => t.id === data.id ? data : t);
            if (data.taskType === "MISSING_INFO" && data.assignToAll) return [data, ...prev];
            if (data.assignToAll || (myId && parseInt(data.assignedToId, 10) === myId)) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_updated") {
          setTasks(prev => {
            const existing = prev.find(t => t.id === data.id);
            if (data.taskType === "MISSING_INFO" && data.assignedToId && myId !== null && parseInt(data.assignedToId, 10) !== myId && !data.assignToAll) {
              return prev.filter(t => t.id !== data.id);
            }
            if (existing) return prev.map(t => t.id === data.id ? data : t);
            if (myId && parseInt(data.assignedToId, 10) === myId) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) {}
    };

    es.onerror = () => console.warn("SSE disconnected");
    return () => es.close();
  }, [loadTasks, myId]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleChecklistToggle = useCallback(async (taskId, itemId, done) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, checklistItems: (t.checklistItems || []).map(i => i.id === itemId ? { ...i, done } : i) }));
    try {
      const res = await fetch(`${API}/tasks/${taskId}/checklist`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ itemId, done }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }, []);

  const handleStatusChange = useCallback(async (taskId, status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }, []);

  const handleProgressLog = useCallback(async (taskId, value) => {
    try {
      const res = await fetch(`${API}/tasks/${taskId}/progress`, { method: "POST", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ value, action: "MEMBER_LOG" }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }, []);

  const handleClaimTask = useCallback((updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)), []);
  const handleInfoSubmitted = useCallback((updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)), []);

  // ── Counts per type (for tab badges) ─────────────────────────
  const countByType = useMemo(() => {
    const counts = {};
    const pending = tasks.filter(t => t.status !== "COMPLETED");
    TYPE_TABS.forEach(tab => {
      if (tab.key === "all") counts["all"] = pending.length;
      else counts[tab.key] = pending.filter(t => t.taskType === tab.key).length;
    });
    return counts;
  }, [tasks]);

  // ── Filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => tasks.filter(t => {
    const matchType = typeFilter === "all" || t.taskType === typeFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "pending" ? t.status !== "COMPLETED" : t.status === "COMPLETED");
    return matchType && matchStatus;
  }), [tasks, typeFilter, statusFilter]);

  const groups = {
    missingInfo:    filtered.filter(t => t.taskType === "MISSING_INFO"),
    playerFollowup: filtered.filter(t => t.taskType === "PLAYER_FOLLOWUP"),
    bonusFollowup:  filtered.filter(t => t.taskType === "BONUS_FOLLOWUP"),
    daily:          filtered.filter(t => t.taskType === "DAILY_CHECKLIST"),
    players:        filtered.filter(t => t.taskType === "PLAYER_ADDITION"),
    revenue:        filtered.filter(t => t.taskType === "REVENUE_TARGET"),
    standard:       filtered.filter(t => t.taskType === "STANDARD"),
  };

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const pendingCount = tasks.filter(t => t.status !== "COMPLETED").length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
  const totalVisible = Object.values(groups).reduce((s, g) => s + g.length, 0);

  // ── Visible type tabs (only show types that have tasks) ────────
  const visibleTypeTabs = TYPE_TABS.filter(tab => {
    if (tab.key === "all") return true;
    return tasks.some(t => t.taskType === tab.key);
  });

  // ── Shift guard ───────────────────────────────────────────────
  if (!shiftActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <nav>
          <button onClick={() => navigate('/shifts')} style={{ padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            Start Shift
          </button>
        </nav>
        <div style={{ padding: '12px 16px', background: '#fffbeb', borderLeft: '4px solid #d97706', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <IAlert />
          <div>
            <p style={{ fontWeight: '700', color: '#78350f', margin: '0 0 2px', fontSize: '13px' }}>Shift Required</p>
            <p style={{ color: '#92400e', margin: 0, fontSize: '12px' }}>Start your shift to access the dashboard.</p>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: '#fffbeb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <ILock />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '800', color: '#78350f' }}>Dashboard Locked</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#d97706' }}>Go to Shifts and start your shift first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "800", margin: 0, color: "#0f172a" }}>My Tasks</h2>
          <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#f0f9ff", color: "#0284c7" }}>{completedCount}/{tasks.length}</span>
          {overdueCount > 0 && (
            <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", gap: "3px" }}>
              <AlertCircle style={{ width: "10px", height: "10px" }} />{overdueCount} overdue
            </span>
          )}
        </div>
        <button onClick={loadTasks} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#fff", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "600", fontFamily: "inherit" }}>
          <RefreshCw style={{ width: "11px", height: "11px" }} /> Refresh
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[
          { label: "Pending", val: pendingCount, bg: "#f1f5f9", color: "#475569" },
          { label: "Done", val: completedCount, bg: "#f0fdf4", color: "#16a34a" },
          ...(overdueCount > 0 ? [{ label: "Overdue", val: overdueCount, bg: "#fff1f2", color: "#dc2626" }] : []),
          ...(countByType["MISSING_INFO"] > 0 ? [{ label: "Info tasks", val: countByType["MISSING_INFO"], bg: "#fff7ed", color: "#ea580c" }] : []),
          ...(countByType["PLAYER_FOLLOWUP"] > 0 ? [{ label: "Followups", val: countByType["PLAYER_FOLLOWUP"], bg: "#fff1f2", color: "#dc2626" }] : []),
          ...(countByType["BONUS_FOLLOWUP"] > 0 ? [{ label: "Bonuses", val: countByType["BONUS_FOLLOWUP"], bg: "#fffbeb", color: "#b45309" }] : []),
        ].map(s => (
          <div key={s.label} style={{ padding: "5px 10px", borderRadius: "7px", background: s.bg, display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "13px", fontWeight: "800", color: s.color }}>{s.val}</span>
            <span style={{ fontSize: "11px", color: s.color, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter panel ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Type tabs */}
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {visibleTypeTabs.map(tab => {
            const count = countByType[tab.key] ?? 0;
            const active = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "5px 10px", border: "1px solid", borderRadius: "7px",
                  fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                  background: active ? "#0f172a" : "#f8fafc",
                  color: active ? "#fff" : "#475569",
                  borderColor: active ? "#0f172a" : "#e2e8f0",
                  transition: "all .15s",
                }}
              >
                <span>{tab.emoji}</span>
                {tab.label}
                {count > 0 && (
                  <span style={{ padding: "0 4px", borderRadius: "4px", fontSize: "10px", fontWeight: "800", background: active ? "rgba(255,255,255,.2)" : "#e2e8f0", color: active ? "#fff" : "#64748b" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status row */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginRight: "4px" }}>Status</span>
          {[
            { key: "pending", label: "Pending" },
            { key: "done",    label: "Completed" },
            { key: "all",     label: "All" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              style={{
                padding: "4px 10px", border: "1px solid", borderRadius: "6px",
                fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                background: statusFilter === s.key ? "#0ea5e9" : "#fff",
                color: statusFilter === s.key ? "#fff" : "#64748b",
                borderColor: statusFilter === s.key ? "#0ea5e9" : "#e2e8f0",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: "9px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "7px", color: "#991b1b", fontSize: "12px", display: "flex", gap: "7px", alignItems: "center" }}>
          <AlertCircle style={{ width: "12px", height: "12px", flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Loading / Empty ── */}
      {loading ? (
        <div style={{ padding: "36px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
          <RefreshCw style={{ width: "18px", height: "18px", margin: "0 auto 8px", display: "block", opacity: 0.4, animation: "spin 1s linear infinite" }} />
          Loading tasks…
        </div>
      ) : totalVisible === 0 ? (
        <div style={{ padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <CheckCircle style={{ width: "22px", height: "22px", margin: "0 auto 8px", display: "block", opacity: 0.25 }} />
          {statusFilter === "done" ? "No completed tasks" : statusFilter === "pending" ? "All tasks completed! 🎉" : "No tasks found"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {groups.missingInfo.length > 0 && (
            <TaskSection label="Missing Player Info" emoji="📝" tasks={groups.missingInfo}>
              {groups.missingInfo.map(task => (
                <MissingInfoTaskCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onInfoSubmitted={handleInfoSubmitted} />
              ))}
            </TaskSection>
          )}

          {groups.playerFollowup.length > 0 && (
            <TaskSection label="Player Follow-ups" emoji="🔴" tasks={groups.playerFollowup}>
              {groups.playerFollowup.map(task => (
                <PlayerFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />
              ))}
            </TaskSection>
          )}

          {groups.bonusFollowup.length > 0 && (
            <TaskSection label="Bonus Follow-ups" emoji="🎁" tasks={groups.bonusFollowup}>
              {groups.bonusFollowup.map(task => (
                <BonusFollowupCard key={task.id} task={task} currentUser={resolvedUser} onClaim={handleClaimTask} onUpdated={handleInfoSubmitted} />
              ))}
            </TaskSection>
          )}

          {groups.daily.length > 0 && (
            <TaskSection label="Daily Checklists" emoji="✅" tasks={groups.daily}>
              {groups.daily.map(task => <DailyChecklistCard key={task.id} task={task} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />)}
            </TaskSection>
          )}

          {groups.players.length > 0 && (
            <TaskSection label="Player Addition Goals" emoji="👥" tasks={groups.players}>
              {groups.players.map(task => <PlayerAdditionCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} />)}
            </TaskSection>
          )}

          {groups.revenue.length > 0 && (
            <TaskSection label="Revenue Targets" emoji="💰" tasks={groups.revenue}>
              {groups.revenue.map(task => <RevenueTargetCard key={task.id} task={task} currentUserId={myId} onProgressLog={handleProgressLog} />)}
            </TaskSection>
          )}

          {groups.standard.length > 0 && (
            <TaskSection label="Other Tasks" emoji="📌" tasks={groups.standard}>
              {groups.standard.map(task => <StandardTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onChecklistToggle={handleChecklistToggle} currentUserId={myId} />)}
            </TaskSection>
          )}

        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
