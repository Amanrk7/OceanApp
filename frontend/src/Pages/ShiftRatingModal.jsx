// pages/ShiftRatingModal.jsx
// Admin rates a completed shift across 10 performance categories.
// Imported by ShiftsPage.jsx — was missing, causing runtime crashes.

import { useState, useCallback } from 'react';
import { X, RefreshCw, Star, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchAPI(path, opts = {}) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const CATEGORIES = [
  { key: 'communicationWithPlayer',  label: 'Communication with Player',     icon: '💬', desc: 'How well did they communicate with players?' },
  { key: 'loadReloadSmoothness',     label: 'Load / Reload Smoothness',      icon: '⚡', desc: 'Were deposits and reloads handled quickly?' },
  { key: 'liveReportingToPlayers',   label: 'Live Reporting to Players',     icon: '📡', desc: 'Did they keep players updated on their status?' },
  { key: 'playtimeBonus',            label: 'Playtime Bonus',                icon: '🎮', desc: 'Were playtime bonuses granted correctly?' },
  { key: 'referralBonus',            label: 'Referral Bonus (old & new)',    icon: '👥', desc: 'Were referral bonuses handled for both sides?' },
  { key: 'matchAndRandomBonus',      label: 'Match & Random Bonus',          icon: '🎯', desc: 'Were match/random bonuses applied on time?' },
  { key: 'playerEngagementOverall',  label: 'Player Engagement Overall',     icon: '🔥', desc: 'How engaged were players during this shift?' },
  { key: 'reachingOutInShifts',      label: 'Reaching Out in Shifts',        icon: '📲', desc: 'Did they proactively reach out to players?' },
  { key: 'reachingOutFromOwnList',   label: 'Reaching Out from Own List',    icon: '📋', desc: 'Did they work their personal player list?' },
  { key: 'cashoutTiming',            label: 'Cashout Timing',                icon: '⏱️', desc: 'Were cashouts processed promptly?' },
];

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
  zIndex: 1000, display: 'flex', alignItems: 'flex-start',
  justifyContent: 'center', padding: '20px', backdropFilter: 'blur(3px)',
  overflowY: 'auto',
};
const MODAL = {
  background: '#fff', borderRadius: '18px',
  boxShadow: '0 24px 64px rgba(15,23,42,.25)',
  width: '100%', maxWidth: '640px', marginTop: 'auto', marginBottom: 'auto',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};

function StarPicker({ value, onChange, size = 32 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            fontSize: `${size}px`, lineHeight: 1,
            color: n <= active ? '#f59e0b' : '#e2e8f0',
            transform: hover === n ? 'scale(1.15)' : 'scale(1)',
            transition: 'all .1s',
          }}
        >★</button>
      ))}
    </div>
  );
}

function CategoryRow({ cat, value, onChange, expanded, onToggle }) {
  const starColor = value >= 4 ? '#22c55e' : value >= 3 ? '#f59e0b' : value > 0 ? '#ef4444' : '#94a3b8';
  return (
    <div style={{ border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', background: value > 0 ? '#fafbfc' : '#fff' }}
        onClick={onToggle}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{cat.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>{cat.label}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{cat.desc}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {value > 0 ? (
            <span style={{ fontSize: '13px', fontWeight: '800', color: starColor }}>{value}/5</span>
          ) : (
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>not rated</span>
          )}
          {expanded ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
          <StarPicker value={value} onChange={onChange} />
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                style={{
                  padding: '3px 10px', borderRadius: '6px', border: 'none',
                  fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                  background: value === n ? (n >= 4 ? '#dcfce7' : n >= 3 ? '#fef9c3' : '#fee2e2') : '#f1f5f9',
                  color: value === n ? (n >= 4 ? '#15803d' : n >= 3 ? '#b45309' : '#991b1b') : '#64748b',
                }}
              >
                {n === 1 ? '1 — Poor' : n === 2 ? '2 — Below avg' : n === 3 ? '3 — Average' : n === 4 ? '4 — Good' : '5 — Excellent'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShiftRatingModal({ shift, memberName, onClose, onSaved }) {
  const initial = {};
  CATEGORIES.forEach(c => { initial[c.key] = shift?.rating?.[c.key] ?? 0; });

  const [ratings, setRatings] = useState(initial);
  const [recommendations, setRecommendations] = useState(shift?.rating?.recommendations ?? '');
  const [expandedKey, setExpandedKey] = useState(CATEGORIES[0].key);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const overallRating = parseFloat(
    (Object.values(ratings).reduce((a, b) => a + b, 0) / 10).toFixed(2)
  );
  const rated = Object.values(ratings).filter(v => v > 0).length;
  const allRated = rated === 10;

  const overallColor = overallRating >= 4 ? '#22c55e' : overallRating >= 3 ? '#f59e0b' : '#ef4444';
  const overallBg = overallRating >= 4 ? '#f0fdf4' : overallRating >= 3 ? '#fffbeb' : '#fef2f2';

  const setRating = useCallback((key, val) => {
    setRatings(prev => ({ ...prev, [key]: val }));
    const idx = CATEGORIES.findIndex(c => c.key === key);
    if (idx < CATEGORIES.length - 1) setExpandedKey(CATEGORIES[idx + 1].key);
  }, []);

  const handleSubmit = async () => {
    if (!allRated) { setError('Please rate all 10 categories before submitting.'); return; }
    setSubmitting(true); setError('');
    try {
      const data = await fetchAPI(`/shifts/${shift.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ ...ratings, recommendations }),
      });
      setDone(true);
      setTimeout(() => { onSaved?.(data.data); onClose(); }, 1400);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={OVERLAY} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={MODAL}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '7px' }}>
              ⭐ Rate Shift Performance
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              <strong>{memberName}</strong> · {fmtDate(shift?.startTime)} · {fmtTime(shift?.startTime)} – {fmtTime(shift?.endTime)}
              {shift?.duration && <span style={{ marginLeft: '6px', color: '#94a3b8' }}>({shift.duration} min)</span>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', flexShrink: 0 }}>
            <X size={17} />
          </button>
        </div>

        {/* Overall score bar */}
        <div style={{ padding: '12px 22px', background: '#fafbfc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ padding: '8px 14px', background: overallBg, borderRadius: '10px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: overallColor, lineHeight: 1 }}>{overallRating.toFixed(1)}</div>
            <div style={{ fontSize: '10px', color: overallColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>/ 5.0</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '2px', marginBottom: '5px' }}>
              {CATEGORIES.map(c => {
                const v = ratings[c.key];
                const bg = v >= 4 ? '#22c55e' : v >= 3 ? '#f59e0b' : v > 0 ? '#ef4444' : '#e2e8f0';
                return <div key={c.key} style={{ flex: 1, height: '7px', borderRadius: '3px', background: bg, transition: 'background .2s' }} title={c.label} />;
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {rated}/10 categories rated
              {allRated && <span style={{ marginLeft: '8px', color: '#22c55e', fontWeight: '700' }}>✓ All rated</span>}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}>
          {done ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <CheckCircle size={36} color="#22c55e" style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Rating submitted!</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Overall: {overallRating.toFixed(1)}/5</p>
            </div>
          ) : (
            <>
              {CATEGORIES.map(cat => (
                <CategoryRow
                  key={cat.key}
                  cat={cat}
                  value={ratings[cat.key]}
                  onChange={v => setRating(cat.key, v)}
                  expanded={expandedKey === cat.key}
                  onToggle={() => setExpandedKey(prev => prev === cat.key ? null : cat.key)}
                />
              ))}

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  💬 Recommendations & Feedback
                  <span style={{ color: '#94a3b8', fontWeight: '400', marginLeft: '6px' }}>(optional)</span>
                </label>
                <textarea
                  value={recommendations}
                  onChange={e => setRecommendations(e.target.value)}
                  placeholder="Any specific feedback, praise, or areas to improve for next shift…"
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', lineHeight: 1.5, color: '#0f172a' }}
                />
              </div>

              {error && (
                <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', color: '#991b1b' }}>
                  ⚠️ {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: '#fafbfc', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {allRated ? `Overall: ${overallRating.toFixed(1)}/5 ✓` : `${10 - rated} categor${10 - rated === 1 ? 'y' : 'ies'} remaining`}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allRated || submitting}
                style={{ padding: '8px 18px', background: allRated && !submitting ? '#0f172a' : '#e2e8f0', color: allRated && !submitting ? '#fff' : '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: allRated && !submitting ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : '⭐ Submit Rating'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
