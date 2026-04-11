// components/ShiftRatingModal.jsx
// Admin rates a completed shift across 10 performance categories.
// Drop this component in ShiftsPage.jsx and trigger it from the past shifts table.

import { useState, useCallback } from "react";
import { X, RefreshCw, Star, ChevronDown, ChevronUp, CheckCircle, Award } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
function getAuthHeaders(ct = false) {
    const token = localStorage.getItem('authToken');
    const h = {};
    if (ct) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

// ─── 10 rating categories ────────────────────────────────────
const CATEGORIES = [
    { key: "communicationWithPlayer", label: "Communication with Player", icon: "💬", desc: "How well did they communicate with players during the shift?" },
    { key: "loadReloadSmoothness", label: "Load / Reload Smoothness", icon: "⚡", desc: "Were loads and reloads processed quickly and accurately?" },
    { key: "liveReportingToPlayers", label: "Live Reporting to Players", icon: "📡", desc: "Did they send timely updates and reports to players?" },
    { key: "playtimeBonus", label: "Playtime Bonus", icon: "🎮", desc: "Were playtime bonuses tracked and awarded correctly?" },
    { key: "referralBonus", label: "Referral Bonus (Old & New)", icon: "👥", desc: "Did they actively push referral bonuses for old and new friends?" },
    { key: "matchAndRandomBonus", label: "Match & Random Bonus", icon: "🎯", desc: "Were match and random bonuses handled well?" },
    { key: "playerEngagementOverall", label: "Player Engagement Overall", icon: "🔥", desc: "How engaged were players during this member's shift?" },
    { key: "reachingOutInShifts", label: "Reaching Out to Players in Shift", icon: "📲", desc: "Did they proactively reach out to players during the shift?" },
    { key: "reachingOutFromOwnList", label: "Reaching Out from Own List", icon: "📋", desc: "Did they work through their own player list effectively?" },
    { key: "cashoutTiming", label: "Cashout Timing", icon: "⏱️", desc: "Were cashouts processed in a timely and professional manner?" },
];

const STAR_LABELS = ["", "Poor", "Below Avg", "Average", "Good", "Excellent"];

function StarRating({ value, onChange, disabled }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map(n => {
                const active = n <= (hovered || value);
                return (
                    <button
                        key={n}
                        disabled={disabled}
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        style={{
                            background: "none", border: "none", cursor: disabled ? "default" : "pointer",
                            padding: "2px", fontSize: "22px", lineHeight: 1, transition: "transform .1s",
                            transform: active ? "scale(1.15)" : "scale(1)",
                            color: active ? (hovered || value) >= 4 ? "#22c55e" : (hovered || value) >= 3 ? "#f59e0b" : "#ef4444" : "#d1d5db",
                            filter: active ? "drop-shadow(0 0 4px currentColor)" : "none",
                        }}
                    >★</button>
                );
            })}
            {(hovered || value) > 0 && (
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px", fontWeight: "600", minWidth: "70px" }}>
                    {STAR_LABELS[hovered || value]}
                </span>
            )}
        </div>
    );
}

function ScoreMeter({ score }) {
    const pct = (score / 5) * 100;
    const color = score >= 4 ? "#22c55e" : score >= 3 ? "#f59e0b" : score >= 2 ? "#f97316" : "#ef4444";
    const label = score >= 4.5 ? "Outstanding 🏆" : score >= 4 ? "Excellent 🌟" : score >= 3 ? "Good 👍" : score >= 2 ? "Needs Work ⚠️" : "Poor ❌";
    return (
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px 20px", border: `1.5px solid ${color}30` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall Rating</div>
                    <div style={{ fontSize: "28px", fontWeight: "900", color, lineHeight: 1, marginTop: "2px" }}>
                        {score.toFixed(1)}<span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500" }}>/5</span>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", marginBottom: "2px" }}>
                        {[1, 2, 3, 4, 5].map(n => (
                            <span key={n} style={{ color: n <= Math.round(score) ? color : "#d1d5db", filter: n <= Math.round(score) ? `drop-shadow(0 0 3px ${color})` : "none" }}>★</span>
                        ))}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color }}>{label}</div>
                </div>
            </div>
            <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{
                    height: "100%", width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius: "999px", transition: "width .4s cubic-bezier(.4,0,.2,1)",
                    boxShadow: `0 0 8px ${color}60`,
                }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", color: "#94a3b8" }}>
                <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
        </div>
    );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function ShiftRatingModal({ shift, memberName, onClose, onSaved }) {
    const [ratings, setRatings] = useState(() => {
        const init = {};
        CATEGORIES.forEach(c => { init[c.key] = shift.existingRating?.[c.key] ?? 0; });
        return init;
    });
    const [recommendations, setRecommendations] = useState(shift.existingRating?.recommendations ?? "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [expandedCat, setExpandedCat] = useState(null);

    const overallScore = useMemo(() => {
        const vals = Object.values(ratings).filter(v => v > 0);
        if (!vals.length) return 0;
        return vals.reduce((a, b) => a + b, 0) / CATEGORIES.length;
    }, [ratings]);

    const ratedCount = Object.values(ratings).filter(v => v > 0).length;
    const canSubmit = ratedCount === CATEGORIES.length;

    const handleSave = async () => {
        setSaving(true); setError("");
        try {
            const body = { ...ratings, overallRating: overallScore, recommendations };
            const res = await fetch(`${API}/shifts/${shift.id}/rate`, {
                method: "POST", credentials: "include",
                headers: getAuthHeaders(true),
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "Failed to save rating");
            setSaved(true);
            onSaved?.(d.data);
            setTimeout(onClose, 1500);
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,.65)", zIndex: 1000,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "20px 16px", backdropFilter: "blur(4px)", overflowY: "auto",
        }}>
            <div style={{
                background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "600px",
                boxShadow: "0 24px 80px rgba(15,23,42,.4)", overflow: "hidden",
                display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto",
            }}>

                {/* HEADER */}
                <div style={{
                    background: "linear-gradient(135deg, #0f172a, #1e3a5f)",
                    padding: "20px 24px", color: "#fff",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>⭐</div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Admin Shift Rating</div>
                                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>{memberName}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                                {fmtDate(shift.startTime)} · {fmtTime(shift.startTime)} → {fmtTime(shift.endTime)}
                                {shift.duration && <span> · {shift.duration} min</span>}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", padding: "7px", color: "rgba(255,255,255,0.6)", display: "flex" }}>
                            <X size={15} />
                        </button>
                    </div>
                    {/* Progress bar of rated categories */}
                    <div style={{ marginTop: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
                            <span>{ratedCount}/{CATEGORIES.length} categories rated</span>
                            <span>{Math.round((ratedCount / CATEGORIES.length) * 100)}%</span>
                        </div>
                        <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(ratedCount / CATEGORIES.length) * 100}%`, background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: "999px", transition: "width .3s" }} />
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div style={{ overflowY: "auto", maxHeight: "70vh", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>

                    {/* Overall Score Meter */}
                    {ratedCount > 0 && <ScoreMeter score={overallScore} />}

                    {/* Categories */}
                    {CATEGORIES.map((cat, idx) => {
                        const val = ratings[cat.key];
                        const isOpen = expandedCat === cat.key;
                        const rated = val > 0;
                        return (
                            <div key={cat.key} style={{
                                border: `1.5px solid ${rated ? (val >= 4 ? "#86efac" : val >= 3 ? "#fde68a" : "#fca5a5") : "#e2e8f0"}`,
                                borderRadius: "12px", overflow: "hidden",
                                background: rated ? (val >= 4 ? "#f0fdf4" : val >= 3 ? "#fffbeb" : "#fef2f2") : "#fff",
                                transition: "all .15s",
                            }}>
                                <div
                                    style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                                    onClick={() => setExpandedCat(isOpen ? null : cat.key)}
                                >
                                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{cat.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                                            <span style={{ color: "#94a3b8", fontSize: "10px", marginRight: "4px" }}>#{idx + 1}</span>
                                            {cat.label}
                                        </div>
                                        <StarRating value={val} onChange={v => setRatings(r => ({ ...r, [cat.key]: v }))} />
                                    </div>
                                    {rated && (
                                        <div style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "800", background: val >= 4 ? "#dcfce7" : val >= 3 ? "#fef9c3" : "#fee2e2", color: val >= 4 ? "#16a34a" : val >= 3 ? "#854d0e" : "#dc2626", flexShrink: 0 }}>
                                            {val}/5
                                        </div>
                                    )}
                                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#94a3b8", display: "flex", flexShrink: 0 }}>
                                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                </div>
                                {isOpen && (
                                    <div style={{ padding: "0 16px 12px", borderTop: "1px solid #f1f5f9" }}>
                                        <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>{cat.desc}</p>
                                        <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button key={n} onClick={() => setRatings(r => ({ ...r, [cat.key]: n }))} style={{
                                                    flex: "1 1 60px", padding: "7px 4px", borderRadius: "8px", border: `1.5px solid ${val === n ? "#0f172a" : "#e2e8f0"}`,
                                                    background: val === n ? "#0f172a" : "#fafafa", color: val === n ? "#fff" : "#475569",
                                                    fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                                                }}>
                                                    {n}★ {STAR_LABELS[n]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Recommendations */}
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#374151", marginBottom: "7px" }}>
                            💡 Recommendations & Feedback
                            <span style={{ fontWeight: "400", color: "#94a3b8", marginLeft: "4px" }}>(optional)</span>
                        </label>
                        <textarea
                            value={recommendations}
                            onChange={e => setRecommendations(e.target.value)}
                            placeholder="Leave specific feedback, things done well, areas to improve, recommendations for next shift..."
                            rows={4}
                            style={{
                                width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0",
                                borderRadius: "10px", fontSize: "13px", resize: "vertical",
                                fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                                lineHeight: 1.5, background: "#fafafa", color: "#0f172a",
                            }}
                        />
                    </div>

                    {/* Validation message */}
                    {!canSubmit && (
                        <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
                            ⚠️ Please rate all {CATEGORIES.length} categories to submit.
                            <span style={{ color: "#d97706", marginLeft: "6px" }}>{CATEGORIES.length - ratedCount} remaining</span>
                        </div>
                    )}
                    {error && (
                        <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "12px", color: "#dc2626" }}>
                            ⚠️ {error}
                        </div>
                    )}
                    {saved && (
                        <div style={{ padding: "10px 14px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "7px" }}>
                            <CheckCircle size={14} /> Rating saved successfully!
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {ratedCount > 0 ? (
                            <>Score: <strong style={{ color: overallScore >= 4 ? "#22c55e" : overallScore >= 3 ? "#f59e0b" : "#ef4444" }}>{overallScore.toFixed(1)}/5</strong></>
                        ) : "Rate all categories to submit"}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={onClose} style={{ padding: "10px 18px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "9px", fontWeight: "600", fontSize: "13px", cursor: "pointer", color: "#374151", fontFamily: "inherit" }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!canSubmit || saving || saved}
                            style={{
                                padding: "10px 22px", background: canSubmit && !saving && !saved ? "linear-gradient(135deg, #f59e0b, #f97316)" : "#e2e8f0",
                                color: canSubmit && !saving && !saved ? "#fff" : "#94a3b8",
                                border: "none", borderRadius: "9px", fontWeight: "700", fontSize: "13px",
                                cursor: !canSubmit || saving || saved ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: "7px", fontFamily: "inherit",
                                boxShadow: canSubmit && !saving && !saved ? "0 4px 12px rgba(245,158,11,0.35)" : "none",
                                transition: "all .15s",
                            }}
                        >
                            {saving ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                                : saved ? <><CheckCircle size={13} /> Saved!</>
                                    : <><Award size={13} /> Submit Rating</>}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
        </div>
    );
}

// Export the useMemo hook for the overall calculation (also used in the component)
function useMemo(fn, deps) {
    const { useMemo: reactUseMemo } = require('react');
    return reactUseMemo(fn, deps);
}