// components/AdminTeamShiftsSection.jsx
// Drop this below the "Past Shifts Log" section in ShiftsPage.jsx (admin-only).
// Fetches TEAM1–TEAM4 shift logs and lets admin rate any completed shift.
// Ratings reflect instantly in each member's dashboard via /api/members/:id/ratings.

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Download, RefreshCw, Star, Users } from 'lucide-react';
import ShiftRatingModal from './ShiftRatingModal.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const fj = async (path) => {
  const token = localStorage.getItem('authToken');
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
};

const ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];
const ROLE_COLORS = {
  TEAM1: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  TEAM2: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  TEAM3: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  TEAM4: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};

const r2 = v => Math.round((v ?? 0) * 100) / 100;
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const TH = { textAlign: 'left', padding: '9px 14px', fontWeight: '600', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc' };
const TD = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' };

function StarRow({ rating }) {
  if (!rating) return <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>;
  const n = Math.round(rating.overallRating ?? 0);
  const color = n >= 4 ? '#22c55e' : n >= 3 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
      <div style={{ display: 'flex', gap: '1px' }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize: '12px', color: i <= n ? '#f59e0b' : '#e2e8f0' }}>★</span>
        ))}
      </div>
      <span style={{ fontSize: '10px', fontWeight: '700', color }}>{(rating.overallRating ?? 0).toFixed(1)}/5</span>
    </div>
  );
}

function MemberSection({ role, onRated }) {
  const [shifts, setShifts] = useState([]);
  const [memberName, setMemberName] = useState(role);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [ratingModal, setRatingModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, membersRes] = await Promise.all([
        fj(`/reports/my-shifts?role=${role}&limit=20`),
        fj('/team-members'),
      ]);
      const member = (membersRes.data ?? []).find(m => m.role === role);
      if (member) setMemberName(member.name);
      setShifts((shiftsRes.data ?? []).filter(s => !s.isActive));
    } catch (_) {}
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const rc = ROLE_COLORS[role] || ROLE_COLORS.TEAM1;
  const rated = shifts.filter(s => s.checkin?.rating || s.rating).length;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
      {/* Member header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: '#fafbfc', userSelect: 'none' }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: rc.bg, border: `2px solid ${rc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: rc.text, flexShrink: 0 }}>
          {memberName[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{memberName}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{role}</span>
            <span>{shifts.length} shifts · {rated} rated</span>
            {shifts.length - rated > 0 && (
              <span style={{ padding: '1px 7px', background: '#fffbeb', color: '#b45309', borderRadius: '5px', fontSize: '10px', fontWeight: '700', border: '1px solid #fde68a' }}>
                {shifts.length - rated} unrated
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
      </div>

      {/* Shift table */}
      {expanded && (
        loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            <RefreshCw size={14} style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '6px' }} />
            Loading shifts…
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No completed shifts yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Date', 'Start → End', 'Duration', 'Deposits', 'Cashouts', 'Net Profit', 'Effort', 'Rating', 'Action'].map(h => (
                    <th key={h} style={{ ...TH, textAlign: ['Deposits','Cashouts','Net Profit'].includes(h) ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => {
                  const s = shift.stats || {};
                  const effort = shift.checkin?.effortRating ?? s.effortRating ?? null;
                  const rating = shift.checkin?.rating || shift.rating || null;
                  const netProfit = r2((s.totalDeposits ?? 0) - (s.totalCashouts ?? 0));
                  const effortColor = !effort ? '#94a3b8' : effort >= 8 ? '#16a34a' : effort >= 5 ? '#d97706' : '#dc2626';

                  return (
                    <tr key={shift.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ ...TD, fontWeight: '600' }}>{fmtDate(shift.startTime)}</td>
                      <td style={{ ...TD, fontSize: '12px', color: '#475569' }}>{fmtTime(shift.startTime)} → {fmtTime(shift.endTime)}</td>
                      <td style={TD}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
                          {shift.duration != null ? `${shift.duration} min` : '—'}
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                        {s.totalDeposits != null ? `$${r2(s.totalDeposits).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                        {s.totalCashouts != null ? `$${r2(s.totalCashouts).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: '700', color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                        {s.totalDeposits != null ? `${netProfit >= 0 ? '+' : ''}$${Math.abs(netProfit).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        {effort != null ? <span style={{ fontWeight: '700', color: effortColor }}>{effort}/10</span> : '—'}
                      </td>
                      <td style={{ ...TD }}>
                        <StarRow rating={rating} />
                      </td>
                      <td style={{ ...TD }}>
                        <button
                          onClick={() => setRatingModal({ shift, memberName })}
                          style={{
                            padding: '4px 12px', borderRadius: '7px', border: 'none', fontSize: '11px',
                            fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                            background: rating ? '#f0fdf4' : '#fffbeb',
                            color: rating ? '#15803d' : '#d97706',
                          }}
                        >
                          {rating ? '✓ Re-rate' : '⭐ Rate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Rating modal */}
      {ratingModal && (
        <ShiftRatingModal
          shift={ratingModal.shift}
          memberName={ratingModal.memberName}
          onClose={() => setRatingModal(null)}
          onSaved={(rating) => {
            setShifts(prev => prev.map(s => s.id === ratingModal.shift.id
              ? { ...s, rating, checkin: s.checkin ? { ...s.checkin, rating } : { rating } }
              : s
            ));
            setRatingModal(null);
            onRated?.();
          }}
        />
      )}
    </div>
  );
}

export default function AdminTeamShiftsSection() {
  const [expanded, setExpanded] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,.07)', overflow: 'hidden' }}>
      {/* Section header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: expanded ? '1px solid #f1f5f9' : 'none', background: '#fafbfc' }}
      >
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Rate Team Member Shifts</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>Review and rate completed shifts for all team members</div>
        </div>
        {expanded ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
      </div>

      {expanded && (
        <div style={{ padding: '16px 24px' }}>
          {ROLES.map(role => (
            <MemberSection
              key={`${role}-${refreshKey}`}
              role={role}
              onRated={() => setRefreshKey(k => k + 1)}
            />
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
