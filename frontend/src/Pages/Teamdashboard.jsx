// components/MemberTasksSection.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  CheckCircle, Circle, Clock, AlertCircle, RefreshCw,
  TrendingUp, Users, List, ChevronDown, ChevronUp,
  Calendar, Plus, X, Check,
  UserCheck, Phone, Mail, Camera, Instagram, Send, User,
  ClipboardList, Lock, Unlock, Undo2
} from "lucide-react";
import { tasksAPI } from "../api";

// ── Style tokens ───────────────────────────────────────────────
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
  background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
  boxShadow: "0 2px 12px rgba(15,23,42,.07)",
};

const API = import.meta.env.VITE_API_URL ?? "";
function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem('authToken');
  const headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── MISSING_INFO field config ─────────────────────────────────
const MISSING_FIELD_META = {
  email: { icon: Mail, label: "Email", placeholder: "player@email.com", type: "email", color: "#3b82f6" },
  phone: { icon: Phone, label: "Phone", placeholder: "+1 234 567 8900", type: "tel", color: "#8b5cf6" },
  snapchat: { icon: Camera, label: "Snapchat", placeholder: "@snapchathandle", type: "text", color: "#eab308" },
  instagram: { icon: Instagram, label: "Instagram", placeholder: "@instagramhandle", type: "text", color: "#ec4899" },
  telegram: { icon: Send, label: "Telegram", placeholder: "@telegramhandle", type: "text", color: "#0ea5e9" },
  assigned_member: { icon: User, label: "Assigned Member", placeholder: "Select member…", type: "select", color: "#ef4444" },
};

const TASK_TYPES = [
  { value: "STANDARD", label: "Standard", icon: List, color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  { value: "DAILY_CHECKLIST", label: "Daily Checklist", icon: CheckCircle, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
  { value: "PLAYER_ADDITION", label: "Player Addition", icon: Users, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "REVENUE_TARGET", label: "Revenue Target", icon: TrendingUp, color: "#22c55e", bg: "#f0fdf4", border: "#86efac" },
  { value: "MISSING_INFO", label: "Missing Info", icon: ClipboardList, color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
];

const PRIORITY_BAR = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316" };

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
  const h = thin ? "5px" : "8px";
  return (
    <div style={{ height: h, background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : color, borderRadius: "999px", transition: "width .3s" }} />
    </div>
  );
}

function TypeBadge({ taskType }) {
  const meta = TASK_TYPES.find(t => t.value === taskType) || TASK_TYPES[0];
  const Icon = meta.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "700", background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
      <Icon style={{ width: "9px", height: "9px" }} /> {meta.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MISSING INFO TASK CARD
// ═══════════════════════════════════════════════════════════════
function MissingInfoTaskCard({ task, currentUser, onClaim, onInfoSubmitted }) {
  const [expanded, setExpanded] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);   // ← was missing
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [form, setForm] = useState({});

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

  // ── FIX: coerce both sides to String so number vs string never mismatches ──
  const isClaimedByMe = !!task.assignedToId && String(task.assignedToId) === String(currentUser?.id);
  const isClaimedByOther = !!task.assignedToId && !isClaimedByMe;
  const isClaimable = !task.assignedToId; // no owner yet → open to all
  const isCompleted = task.status === "COMPLETED";

  // Fetch team members for assigned_member dropdown
  useEffect(() => {
    if (missingFields.includes("assigned_member") && isClaimedByMe) {
      fetch(`${API}/team-members`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setTeamMembers(d.data || []))
        .catch(() => { });
    }
  }, [isClaimedByMe, missingFields]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Claim ──────────────────────────────────────────────────────
  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/claim`, {
        method: "POST", credentials: "include", headers: getAuthHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim task");
      onClaim(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  // ── Submit missing info ────────────────────────────────────────
  const handleSubmit = async () => {
    const hasAnyValue = Object.values(form).some(v => v && v.trim?.() !== "");
    if (!hasAnyValue) { setError("Please fill in at least one field before submitting."); return; }

    setSubmitting(true);
    setError("");
    try {
      const body = {};
      missingFields.forEach(key => {
        if (form[key] !== undefined && form[key] !== "") {
          if (key === "assigned_member") body.assignedMemberId = form[key];
          else body[key] = form[key];
        }
      });

      const res = await fetch(`${API}/tasks/${task.id}/submit-missing-info`, {
        method: "POST", credentials: "include", headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit info");

      setSuccess(true);
      setForm({});
      onInfoSubmitted(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Undo completion ── (was MISSING — this is the fix)
  const handleUndo = async () => {
    setUndoing(true);
    setError("");
    try {
      const res = await fetch(`${API}/tasks/${task.id}/undo-completion`, {
        method: "POST", credentials: "include", headers: getAuthHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to undo");
      setSuccess(false);
      onInfoSubmitted(data.data); // reuse callback to update task in parent state
    } catch (err) {
      setError(err.message);
    } finally {
      setUndoing(false);
    }
  };

  const borderColor = isCompleted ? "#86efac" : isClaimedByMe ? "#fed7aa" : isClaimedByOther ? "#e2e8f0" : "#fed7aa";
  const borderLeft = isCompleted ? "#22c55e" : "#f97316";

  return (
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${borderColor}`, borderLeft: `4px solid ${borderLeft}`, opacity: isCompleted ? 0.85 : 1 }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          background: isCompleted ? "#dcfce7" : "#fff7ed",
          border: `1px solid ${isCompleted ? "#86efac" : "#fed7aa"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ClipboardList style={{ width: "17px", height: "17px", color: isCompleted ? "#22c55e" : "#f97316" }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", wordBreak: "break-word" }}>{task.title}</span>
            <TypeBadge taskType="MISSING_INFO" />
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ flex: 1, maxWidth: "160px" }}><ProgressBar pct={pct} color="#f97316" thin /></div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: isCompleted ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {doneCount}/{totalFields} fields {isCompleted ? "✓ done" : "collected"}
            </span>
          </div>

          {/* Claim status chip */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
            {isCompleted ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle style={{ width: "11px", height: "11px" }} /> Completed
              </span>
            ) : isClaimedByMe ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#ea580c", display: "flex", alignItems: "center", gap: "4px" }}>
                <Lock style={{ width: "10px", height: "10px" }} /> Claimed by you
              </span>
            ) : isClaimedByOther ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                <Lock style={{ width: "10px", height: "10px" }} /> Claimed by {task.assignedTo?.name || "another member"}
              </span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#f97316", display: "flex", alignItems: "center", gap: "4px" }}>
                <Unlock style={{ width: "10px", height: "10px" }} /> Open to claim
              </span>
            )}
          </div>
        </div>

        {/* Expand / collapse — only when there's something interactive to show */}
        {!isClaimedByOther && !isCompleted && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex", flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
          </button>
        )}
      </div>

      {/* ── Body: active / unclaimed ── */}
      {expanded && !isCompleted && !isClaimedByOther && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {task.description && (
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5", wordBreak: "break-word" }}>{task.description}</p>
          )}

          {/* Already-filled fields */}
          {doneFields.length > 0 && (
            <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", marginBottom: "6px" }}>✓ Already Filled</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {doneFields.map(key => {
                  const meta = MISSING_FIELD_META[key];
                  const Icon = meta?.icon || CheckCircle;
                  return (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", background: "#dcfce7", color: "#16a34a" }}>
                      <Icon style={{ width: "10px", height: "10px" }} /> {meta?.label || key}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Claim section */}
          {isClaimable && !isClaimedByMe && (
            <div style={{ padding: "14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#9a3412", marginBottom: "10px", lineHeight: "1.5" }}>
                <strong>Unclaimed task.</strong> Claim this task to start collecting contact info for{" "}
                <strong>@{playerMeta.username || "player"}</strong>. Once claimed, it will be assigned to you.
              </div>
              <button onClick={handleClaim} disabled={claiming} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: claiming ? "#e2e8f0" : "#f97316", color: claiming ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: claiming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit" }}>
                {claiming
                  ? <><RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> Claiming…</>
                  : <><UserCheck style={{ width: "13px", height: "13px" }} /> Claim This Task</>
                }
              </button>
            </div>
          )}

          {/* Fill-in form — only for the claimer */}
          {isClaimedByMe && missingFields.length > 0 && (
            <div style={{ padding: "14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                📋 Fill in Missing Fields
              </div>

              {missingFields.map(key => {
                const meta = MISSING_FIELD_META[key];
                if (!meta) return null;
                const Icon = meta.icon;

                if (key === "assigned_member") {
                  return (
                    <div key={key}>
                      <label style={{ ...LABEL, color: meta.color }}>
                        <Icon style={{ width: "10px", height: "10px", verticalAlign: "middle", marginRight: "4px" }} />
                        {meta.label}
                      </label>
                      <select value={form[key] || ""} onChange={set(key)} style={{ ...INPUT, borderColor: form[key] ? meta.color : "#e2e8f0", cursor: "pointer" }}>
                        <option value="">{meta.placeholder}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <label style={{ ...LABEL, color: meta.color }}>
                      <Icon style={{ width: "10px", height: "10px", verticalAlign: "middle", marginRight: "4px" }} />
                      {meta.label}
                    </label>
                    <input
                      type={meta.type} value={form[key] || ""} onChange={set(key)}
                      placeholder={meta.placeholder}
                      style={{ ...INPUT, borderColor: form[key] ? meta.color : "#e2e8f0" }}
                      onFocus={e => e.target.style.borderColor = meta.color}
                      onBlur={e => e.target.style.borderColor = form[key] ? meta.color : "#e2e8f0"}
                    />
                  </div>
                );
              })}

              {success && (
                <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", color: "#16a34a" }}>
                  ✅ Information submitted successfully!
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting || success} style={{ padding: "10px", borderRadius: "8px", border: "none", background: submitting || success ? "#e2e8f0" : "#f97316", color: submitting || success ? "#94a3b8" : "#fff", fontWeight: "700", fontSize: "13px", cursor: submitting || success ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit" }}>
                {submitting
                  ? <><RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> Submitting…</>
                  : success
                    ? <><Check style={{ width: "13px", height: "13px" }} /> Submitted!</>
                    : <><Check style={{ width: "13px", height: "13px" }} /> Submit Info</>
                }
              </button>
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 12px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", fontSize: "12px", color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* ── Body: completed ── */}
      {isCompleted && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "10px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            All missing info for <strong>@{playerMeta.username}</strong> has been collected.
          </div>

          {/* ✅ FIX: was `isClaimedByMe` only — now shows for claimer OR if task has no specific owner (assignToAll) */}
          {(isClaimedByMe || !task.assignedToId) && (
            <button
              onClick={handleUndo}
              disabled={undoing}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: undoing ? "#f8fafc" : "#fff",
                color: undoing ? "#94a3b8" : "#64748b",
                fontSize: "12px", fontWeight: "700",
                cursor: undoing ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {undoing
                ? <><RefreshCw style={{ width: "12px", height: "12px", animation: "spin 0.8s linear infinite" }} /> Undoing…</>
                : <><Undo2 style={{ width: "12px", height: "12px" }} /> Undo Completion</>
              }
            </button>
          )}

          {error && (
            <div style={{ padding: "10px 12px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", fontSize: "12px", color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* ── Body: claimed by someone else ── */}
      {isClaimedByOther && !isCompleted && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <Lock style={{ width: "13px", height: "13px", flexShrink: 0 }} />
            <span><strong>{task.assignedTo?.name}</strong> is currently working on this task.</span>
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
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${allDone ? "#86efac" : "#bae6fd"}`, borderLeft: `4px solid ${allDone ? "#22c55e" : "#0ea5e9"}` }}>
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f0f9ff", border: `1px solid ${allDone ? "#86efac" : "#bae6fd"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckCircle style={{ width: "17px", height: "17px", color: allDone ? "#22c55e" : "#0ea5e9" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="DAILY_CHECKLIST" />
            {task.isDaily && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>Auto-Daily</span>}
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "5px", alignItems: "center" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}><ProgressBar pct={pct} color="#0ea5e9" thin /></div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {doneItems}/{checklist.length} {allDone ? "✓ All done!" : "completed"}
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: "1.5" }}>{task.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {checklist.map(item => (
              <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: toggling === item.id ? "wait" : "pointer", padding: "9px 12px", borderRadius: "8px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#e2e8f0"}` }}>
                <div
                  style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  onClick={() => toggle(item)}
                >
                  {item.done && <Check style={{ width: "11px", height: "11px", color: "#fff" }} />}
                  {toggling === item.id && <RefreshCw style={{ width: "10px", height: "10px", color: "#cbd5e1", animation: "spin 0.8s linear infinite" }} />}
                </div>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: "500", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700", flexShrink: 0 }}>required</span>}
              </label>
            ))}
          </div>
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}</p>}
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
    <div style={{ ...CARD, overflow: "hidden", border: `1px solid ${allDone ? "#86efac" : "#ddd6fe"}`, borderLeft: `4px solid ${allDone ? "#22c55e" : "#8b5cf6"}` }}>
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f5f3ff", border: `1px solid ${allDone ? "#86efac" : "#ddd6fe"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users style={{ width: "17px", height: "17px", color: allDone ? "#22c55e" : "#8b5cf6" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="PLAYER_ADDITION" />
            {task.assignToAll && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#f5f3ff", color: "#0ea5e9" }}>All Members</span>}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "5px" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}><ProgressBar pct={pct} color="#8b5cf6" thin /></div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              {task.currentValue ?? 0}/{task.targetValue} players ({pct}%)
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{task.description}</p>}
          {mySubTask && (
            <div style={{ padding: "12px 14px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#0ea5e9", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>My Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>My progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#8b5cf6" }}>
                  {mySubTask.currentValue ?? 0} / {mySubTask.targetValue} players ({myPct ?? 0}%)
                </span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#8b5cf6" />
            </div>
          )}
          {(task.subTasks || []).length > 0 && (
            <div style={{ padding: "12px 14px", background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>Team Progress</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {task.subTasks.map(st => {
                  const sPct = st.targetValue > 0 ? Math.min(100, Math.round(((st.currentValue ?? 0) / st.targetValue) * 100)) : 0;
                  const isMe = String(st.assignedToId) === String(currentUserId) || String(st.assignedTo?.id) === String(currentUserId);
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: isMe ? "700" : "500", color: isMe ? "#8b5cf6" : "#0f172a", minWidth: "90px" }}>
                        {isMe ? "⭐ You" : (st.assignedTo?.name || "Member")}
                      </span>
                      <div style={{ flex: 1 }}><ProgressBar pct={sPct} color={isMe ? "#8b5cf6" : "#94a3b8"} thin /></div>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: sPct >= 100 ? "#22c55e" : "#0f172a", whiteSpace: "nowrap", minWidth: "70px", textAlign: "right" }}>
                        {st.currentValue ?? 0}/{st.targetValue}
                        {sPct >= 100 && <CheckCircle style={{ width: "11px", height: "11px", color: "#22c55e", marginLeft: "4px", verticalAlign: "middle" }} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!allDone && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Log Players Added</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" min="1" step="1" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT, flex: 1, borderColor: "#86efac" }} placeholder="How many players did you add?" onKeyDown={e => e.key === "Enter" && handleLog()} />
                <button onClick={handleLog} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "10px 18px", background: logging ? "#e2e8f0" : "#22c55e", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px" }}>
                  {logging ? <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> : <Plus style={{ width: "13px", height: "13px" }} />}
                  {logSuccess ? "✓ Logged!" : "Log"}
                </button>
              </div>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}</p>}
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
    <div style={{ ...CARD, overflow: "hidden", border: "1px solid #86efac", borderLeft: `4px solid ${allDone ? "#22c55e" : "#22c55e"}` }}>
      <div style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: allDone ? "#dcfce7" : "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp style={{ width: "17px", height: "17px", color: "#22c55e" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{task.title}</span>
            <TypeBadge taskType="REVENUE_TARGET" />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "5px" }}>
            <div style={{ flex: 1, maxWidth: "200px" }}><ProgressBar pct={pct} color="#22c55e" thin /></div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: allDone ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>
              ${(task.currentValue ?? 0).toFixed(2)} / ${task.targetValue} ({pct}%)
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "6px", color: "#64748b", display: "flex" }}>
          {expanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {mySubTask && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>My Revenue Target</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12px" }}>
                <span style={{ color: "#64748b" }}>My progress</span>
                <span style={{ fontWeight: "800", color: myPct >= 100 ? "#22c55e" : "#16a34a" }}>
                  ${(mySubTask.currentValue ?? 0).toFixed(2)} / ${mySubTask.targetValue} ({myPct ?? 0}%)
                </span>
              </div>
              <ProgressBar pct={myPct ?? 0} color="#22c55e" />
            </div>
          )}
          {!allDone && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Log Revenue Achieved ($)</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" min="0.01" step="0.01" value={logVal} onChange={e => setLogVal(e.target.value)} style={{ ...INPUT, flex: 1, borderColor: "#86efac" }} placeholder="Enter amount achieved…" onKeyDown={e => e.key === "Enter" && handleLog()} />
                <button onClick={handleLog} disabled={logging || !logVal || parseFloat(logVal) <= 0} style={{ padding: "10px 18px", background: logging ? "#e2e8f0" : "#22c55e", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: logging || !logVal ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px" }}>
                  {logging ? <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 0.8s linear infinite" }} /> : <TrendingUp style={{ width: "13px", height: "13px" }} />}
                  {logSuccess ? "✓ Logged!" : "Log Revenue"}
                </button>
              </div>
            </div>
          )}
          {due && <p style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}><Calendar style={{ width: "10px", height: "10px" }} /> Due: {due.label}</p>}
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
  const barColor = PRIORITY_BAR[task.priority] || "#64748b";

  async function toggle(item) {
    setToggling(item.id);
    await onChecklistToggle(task.id, item.id, !item.done);
    setToggling(null);
  }

  return (
    <div style={{ ...CARD, overflow: "hidden", borderLeft: `4px solid ${isCompleted ? "#22c55e" : barColor}`, opacity: isCompleted ? 0.75 : 1 }}>
      <div style={{ padding: "13px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => onStatusChange(task.id, isCompleted ? "PENDING" : "COMPLETED")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          {isCompleted ? <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e" }} /> : <Circle style={{ width: "20px", height: "20px", color: "#cbd5e1" }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: isCompleted ? "#94a3b8" : "#0f172a", textDecoration: isCompleted ? "line-through" : "none" }}>{task.title}</span>
            <TypeBadge taskType="STANDARD" />
            {due?.isOverdue && !isCompleted && <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: "#fee2e2", color: "#dc2626" }}>Overdue</span>}
          </div>
          {checklist.length > 0 && !isCompleted && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{doneItems}/{checklist.length} checklist items done</div>}
        </div>
        {due && <span style={{ fontSize: "11px", color: due.isOverdue ? "#dc2626" : "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{due.label}</span>}
        {checklist.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", cursor: "pointer", padding: "5px", color: "#64748b", display: "flex" }}>
            {expanded ? <ChevronUp style={{ width: "13px", height: "13px" }} /> : <ChevronDown style={{ width: "13px", height: "13px" }} />}
          </button>
        )}
      </div>
      {expanded && checklist.length > 0 && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {task.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px", lineHeight: "1.5" }}>{task.description}</p>}
          {checklist.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "7px 10px", borderRadius: "7px", background: item.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.done ? "#86efac" : "#e2e8f0"}` }}>
              <div
                style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${item.done ? "#22c55e" : "#cbd5e1"}`, background: item.done ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onClick={() => !toggling && toggle(item)}
              >
                {item.done && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
              </div>
              <span style={{ flex: 1, fontSize: "13px", color: item.done ? "#94a3b8" : "#0f172a", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
              {item.required && !item.done && <span style={{ fontSize: "10px", color: "#ef4444" }}>*</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TeamDashboard({ currentUser, activeShift }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const sseRef = useRef(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tasks?myTasks=true`, { credentials: "include", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      setTasks(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    const es = tasksAPI.connectSSE();
    sseRef.current = es;
    es.addEventListener("connected", () => console.log("SSE connected ✓"));

    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === "task_created") {
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.id);
            if (exists) return prev.map(t => t.id === data.id ? data : t);
            if (data.taskType === "MISSING_INFO" && data.assignToAll) return [data, ...prev];
            if (data.assignToAll || String(data.assignedToId) === String(currentUser?.id)) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_updated") {
          setTasks(prev => {
            const existing = prev.find(t => t.id === data.id);
            // MISSING_INFO claimed by someone else → remove from my list
            if (
              data.taskType === "MISSING_INFO" &&
              data.assignedToId &&
              String(data.assignedToId) !== String(currentUser?.id) &&
              !data.assignToAll
            ) {
              return prev.filter(t => t.id !== data.id);
            }
            if (existing) return prev.map(t => t.id === data.id ? data : t);
            if (String(data.assignedToId) === String(currentUser?.id)) return [data, ...prev];
            return prev;
          });
        }
        if (type === "task_deleted") setTasks(prev => prev.filter(t => t.id !== data.id));
      } catch (_) { }
    };

    es.onerror = () => console.warn("SSE disconnected, will auto-reconnect");
    return () => es.close();
  }, [loadTasks, currentUser?.id]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleChecklistToggle = useCallback(async (taskId, itemId, done) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, checklistItems: (t.checklistItems || []).map(i => i.id === itemId ? { ...i, done } : i) };
    }));
    try {
      const res = await fetch(`${API}/tasks/${taskId}/checklist`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ itemId, done }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) { }
  }, []);

  const handleStatusChange = useCallback(async (taskId, status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, { method: "PATCH", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ status }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) { }
  }, []);

  const handleProgressLog = useCallback(async (taskId, value) => {
    try {
      const res = await fetch(`${API}/tasks/${taskId}/progress`, { method: "POST", headers: getAuthHeaders(true), credentials: "include", body: JSON.stringify({ value, action: "MEMBER_LOG" }) });
      const data = await res.json();
      if (res.ok && data.data) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) { }
  }, []);

  const handleClaimTask = useCallback((updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)), []);
  const handleInfoSubmitted = useCallback((updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)), []);

  // ── Filter ────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (taskFilter === "pending") return t.status !== "COMPLETED";
    if (taskFilter === "done") return t.status === "COMPLETED";
    return true;
  });

  const missingInfo = filtered.filter(t => t.taskType === "MISSING_INFO");
  const daily = filtered.filter(t => t.taskType === "DAILY_CHECKLIST");
  const players = filtered.filter(t => t.taskType === "PLAYER_ADDITION");
  const revenue = filtered.filter(t => t.taskType === "REVENUE_TARGET");
  const standard = filtered.filter(t => t.taskType === "STANDARD");
  const hasOtherTypes = daily.length + players.length + revenue.length > 0;

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
  const missingInfoPending = tasks.filter(t => t.taskType === "MISSING_INFO" && t.status !== "COMPLETED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>My Tasks</h2>
          <span style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" }}>{completedCount}/{tasks.length} done</span>
          {overdueCount > 0 && (
            <span style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle style={{ width: "10px", height: "10px" }} /> {overdueCount} overdue
            </span>
          )}
          {missingInfoPending > 0 && (
            <span style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "#fff7ed", color: "#f97316", display: "flex", alignItems: "center", gap: "4px" }}>
              <ClipboardList style={{ width: "10px", height: "10px" }} /> {missingInfoPending} info task{missingInfoPending > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {["all", "pending", "done"].map(f => (
            <button key={f} onClick={() => setTaskFilter(f)} style={{ padding: "6px 12px", border: "1px solid", borderRadius: "8px", fontSize: "11px", fontWeight: "700", background: taskFilter === f ? "#0ea5e9" : "#fff", color: taskFilter === f ? "#fff" : "#0ea5e9", cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
          ))}
          <button onClick={loadTasks} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}>
            <RefreshCw style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle style={{ width: "13px", height: "13px", flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Loading / Empty ── */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
          <Clock style={{ width: "20px", height: "20px", margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: "13px", background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <CheckCircle style={{ width: "24px", height: "24px", margin: "0 auto 8px", display: "block", opacity: 0.3 }} />
          {taskFilter === "done" ? "No completed tasks yet" : taskFilter === "pending" ? "All tasks completed! 🎉" : "No tasks assigned to you"}
        </div>
      ) : (
        <>
          {missingInfo.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>📋 Missing Player Info Tasks</div>
              {missingInfo.map(task => (
                <MissingInfoTaskCard key={task.id} task={task} currentUser={currentUser} onClaim={handleClaimTask} onInfoSubmitted={handleInfoSubmitted} />
              ))}
            </div>
          )}

          {daily.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>📋 Daily Checklists</div>
              {daily.map(task => <DailyChecklistCard key={task.id} task={task} onChecklistToggle={handleChecklistToggle} currentUserId={currentUser?.id} />)}
            </div>
          )}

          {players.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>👥 Player Addition Goals</div>
              {players.map(task => <PlayerAdditionCard key={task.id} task={task} currentUserId={currentUser?.id} onProgressLog={handleProgressLog} />)}
            </div>
          )}

          {revenue.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 2px" }}>💰 Revenue Targets</div>
              {revenue.map(task => <RevenueTargetCard key={task.id} task={task} currentUserId={currentUser?.id} onProgressLog={handleProgressLog} />)}
            </div>
          )}

          {standard.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {hasOtherTypes && <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 2px 0" }}>📌 Other Tasks</div>}
              {standard.map(task => <StandardTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onChecklistToggle={handleChecklistToggle} currentUserId={currentUser?.id} />)}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
