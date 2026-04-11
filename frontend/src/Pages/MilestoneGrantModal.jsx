/**
 * MilestoneGrantModal.jsx — FIXED
 *
 * Fixes applied:
 *  1. fetch() now hits BACKEND_URL (Render) not relative URL (Vercel) → fixes 405
 *  2. todayDeposits prop required — bonus is blocked unless deposit >= milestone value
 *
 * Usage in PlayerDashboard:
 *   {grantingMilestone && (
 *     <MilestoneGrantModal
 *       milestone={grantingMilestone}
 *       player={player}
 *       todayDeposits={todayDeposits}        ← ADD this prop
 *       onClose={() => setGrantingMilestone(null)}
 *       onGranted={() => { setGrantingMilestone(null); loadPlayer(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500); }}
 *     />
 *   )}
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';

// Match the env var your api.js / axios instance uses.
// Common patterns: VITE_API_URL, VITE_BACKEND_URL, VITE_API_BASE_URL
const BACKEND_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://oceanappbackend.onrender.com'
).replace(/\/api\/?$/, ''); // strip trailing /api if already included

const C = {
  sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb',
  slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

export default function MilestoneGrantModal({ milestone, player, todayDeposits, onClose, onGranted }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Milestone-reached guard ───────────────────────────────────────────────
  const depositsToday = todayDeposits ?? 0;
  const milestoneReached = depositsToday >= milestone.milestone;
  const shortfall = parseFloat((milestone.milestone - depositsToday).toFixed(2));

  useEffect(() => {
    api.games.getGames()
      .then(res => {
        const healthy = (res.data || []).filter(
          g => g.status !== 'DEFICIT' && parseFloat(g.pointStock) >= (milestone.bonusAmount || 5)
        );
        setGames(healthy);
        if (healthy.length === 1) setSelectedGameId(healthy[0].id);
      })
      .catch(() => setError('Failed to load games'))
      .finally(() => setGamesLoading(false));
  }, []);

  const handleGrant = async () => {
    if (!milestoneReached) {
      return setError(`Cannot grant — player is $${shortfall} short of the $${milestone.milestone} milestone.`);
    }
    if (!selectedGameId) return setError('Please select a game.');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/milestone-bonuses/${milestone.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId: selectedGameId, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant bonus');
      setSuccess(data.message || `$${milestone.bonusAmount.toFixed(2)} milestone bonus granted!`);
      setTimeout(() => onGranted(), 1300);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedGame = games.find(g => g.id === selectedGameId);
  const canGrant = milestoneReached && !!selectedGameId && !success && !loading;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)',
        backdropFilter: 'blur(2px)', zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div style={{
        background: C.white, borderRadius: '16px',
        boxShadow: '0 24px 60px rgba(15,23,42,.28)',
        width: '100%', maxWidth: '440px',
        animation: 'msSlideIn .18s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px',
          background: milestoneReached ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : '#fff1f2',
          borderBottom: `1px solid ${milestoneReached ? '#fde68a' : '#fecdd3'}`,
          borderRadius: '16px 16px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{milestoneReached ? '🏆' : '🚫'}</span>
              <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: milestoneReached ? '#92400e' : C.red }}>
                {milestoneReached ? 'Grant Milestone Bonus' : 'Milestone Not Reached'}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: milestoneReached ? '#b45309' : '#f87171' }}>
              ${milestone.milestone} daily deposit threshold ·{' '}
              {milestoneReached
                ? `player deposited $${depositsToday.toFixed(2)} today ✓`
                : `only $${depositsToday.toFixed(2)} deposited — need $${shortfall} more`}
            </p>
          </div>
          <button onClick={onClose} disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, fontSize: '18px' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>

          {/* Player + bonus amount */}
          <div style={{
            padding: '12px 16px',
            background: milestoneReached ? '#f0fdf4' : C.bg,
            border: `1px solid ${milestoneReached ? '#86efac' : C.border}`,
            borderRadius: '10px', marginBottom: '18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: milestoneReached ? '#166534' : C.gray }}>
                {player.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: milestoneReached ? '#4ade80' : C.grayLt }}>
                @{player.username} · milestone date: {milestone.date}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '11px' }}>
                Today: <strong style={{ color: milestoneReached ? '#16a34a' : C.red }}>${depositsToday.toFixed(2)}</strong>
                <span style={{ color: C.grayLt }}> / ${milestone.milestone} target</span>
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: milestoneReached ? '#16a34a' : C.grayLt, lineHeight: 1 }}>
                +${milestone.bonusAmount.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: C.grayLt, marginTop: '2px' }}>bonus</div>
            </div>
          </div>

          {/* Game selector */}
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
          }}>
            Deduct from Game *
          </label>

          {gamesLoading ? (
            <div style={{
              height: '42px', border: `1px solid ${C.border}`, borderRadius: '8px',
              display: 'flex', alignItems: 'center', paddingLeft: '12px',
              fontSize: '13px', color: C.grayLt, gap: '8px',
            }}>
              <div style={{
                width: '13px', height: '13px',
                border: `2px solid ${C.border}`, borderTopColor: C.sky,
                borderRadius: '50%', animation: 'spin .8s linear infinite',
              }} />
              Loading games…
            </div>
          ) : (
            <select
              value={selectedGameId}
              onChange={e => { setSelectedGameId(e.target.value); setError(''); }}
              disabled={!milestoneReached}
              style={{
                width: '100%', padding: '10px 12px',
                border: `1px solid ${!selectedGameId && error ? C.red : C.border}`,
                borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
                background: milestoneReached ? C.white : C.bg,
                color: selectedGameId ? C.slate : C.grayLt,
                cursor: milestoneReached ? 'pointer' : 'not-allowed',
                opacity: milestoneReached ? 1 : 0.55, outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                paddingRight: '32px', boxSizing: 'border-box',
              }}
            >
              <option value="">— Choose a game —</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} · {parseFloat(g.pointStock).toFixed(0)} pts
                </option>
              ))}
            </select>
          )}

          {selectedGame && milestoneReached && (
            <div style={{
              marginTop: '7px', padding: '7px 12px',
              background: '#f8fafc', border: `1px solid ${C.border}`,
              borderRadius: '7px', fontSize: '11px', color: C.gray,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>Stock: <strong>{parseFloat(selectedGame.pointStock).toFixed(0)} pts</strong></span>
              <span style={{ color: '#d97706' }}>
                After: <strong>{(parseFloat(selectedGame.pointStock) - milestone.bonusAmount).toFixed(0)} pts</strong>
              </span>
            </div>
          )}

          {/* Notes */}
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray,
            textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 6px',
          }}>
            Notes <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!milestoneReached || loading}
            placeholder="e.g. milestone bonus granted"
            onKeyDown={e => e.key === 'Enter' && canGrant && handleGrant()}
            style={{
              width: '100%', padding: '10px 12px',
              border: `1px solid ${C.border}`, borderRadius: '8px',
              fontSize: '13px', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box', color: C.slate,
              background: milestoneReached ? C.white : C.bg,
              opacity: milestoneReached ? 1 : 0.55,
            }}
          />

          {error && (
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: '8px', fontSize: '13px', color: C.red,
              display: 'flex', gap: '6px',
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '8px', fontSize: '13px', color: '#166534',
            }}>
              ✅ {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: '10px', background: C.bg, borderRadius: '0 0 16px 16px',
        }}>
          <button onClick={onClose} disabled={loading}
            style={{
              flex: 1, padding: '10px', background: C.white,
              border: `1px solid ${C.border}`, borderRadius: '8px',
              fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', color: C.gray,
            }}>
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={!canGrant}
            style={{
              flex: 2, padding: '10px',
              background: canGrant ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#e2e8f0',
              color: canGrant ? '#fff' : C.grayLt,
              border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px',
              cursor: canGrant ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'background .15s ease',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '13px', height: '13px', border: '2px solid #fff3',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite',
                }} />
                Granting…
              </>
            ) : success
              ? '✅ Granted!'
              : !milestoneReached
                ? '🚫 Milestone Not Reached'
                : `🏆 Grant $${milestone.bonusAmount.toFixed(2)} Bonus`}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes msSlideIn { from { opacity:0; transform:scale(.96) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
