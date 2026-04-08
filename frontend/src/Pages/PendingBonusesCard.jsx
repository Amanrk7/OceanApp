// PendingBonusesCard.jsx
// Drop this component into your components/ folder.
// Then use it in PlayerDashboard.jsx (see integration notes at bottom of file).

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const C = {
  sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
  violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
  slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

const card = (extra = {}) => ({
  background: C.white, borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 2px 12px rgba(15,23,42,.07)', ...extra,
});

// ── Mini claim modal ──────────────────────────────────────────────
function ClaimModal({ bonus, games, onClose, onClaimed }) {
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMilestone      = bonus.type === 'milestone';
  const endpoint         = isMilestone
    ? `/milestone-bonuses/${bonus.id}/claim`
    : `/referral-weekly-bonuses/${bonus.id}/claim`;

  const handleClaim = async () => {
    if (!gameId) { setError('Please select a game.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? ''}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          credentials: 'include',
          body: JSON.stringify({ gameId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim');
      onClaimed(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedGame = games.find(g => g.id === gameId);
  const bonusAmt     = bonus.bonusAmount;
  const stockOk      = selectedGame ? selectedGame.pointStock >= bonusAmt : false;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)',
        zIndex: 1200, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '20px',
      }}
    >
      <div style={{
        background: C.white, borderRadius: '16px',
        boxShadow: '0 24px 60px rgba(15,23,42,.25)',
        width: '100%', maxWidth: '420px',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', background: isMilestone ? C.amberLt : C.greenLt,
          borderBottom: `1px solid ${isMilestone ? C.amberBdr : C.greenBdr}`,
          borderRadius: '16px 16px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: C.slate }}>
              {isMilestone ? `💰 Claim $${bonus.milestone} Milestone Bonus` : `🔗 Claim Referral Weekly Bonus`}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.gray }}>
              {isMilestone
                ? `$${bonusAmt.toFixed(2)} bonus for hitting $${bonus.milestone} daily deposits`
                : `$${bonusAmt.toFixed(2)} (10% of $${bonus.totalDeposits?.toFixed(2)} from ${bonus.referredPlayer?.name})`
              }
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.grayLt, fontSize: '18px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: '700',
            color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
          }}>
            Select Game *
          </label>
          <select
            value={gameId}
            onChange={e => setGameId(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
              borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
              boxSizing: 'border-box', background: C.white, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">— Choose a game —</option>
            {games.map(g => (
              <option key={g.id} value={g.id} disabled={g.pointStock <= 0}>
                {g.name} · {g.pointStock.toFixed(0)} pts
                {g.pointStock <= 0 ? ' (no stock)' : g.pointStock < bonusAmt ? ' ⚠ low' : ''}
              </option>
            ))}
          </select>

          {selectedGame && (
            <div style={{
              marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
              background: stockOk ? C.greenLt : '#fee2e2',
              border: `1px solid ${stockOk ? C.greenBdr : '#fca5a5'}`,
              fontSize: '12px', color: stockOk ? C.green : '#991b1b', fontWeight: '600',
            }}>
              {stockOk
                ? `✓ ${selectedGame.name}: ${selectedGame.pointStock.toFixed(0)} pts → ${(selectedGame.pointStock - bonusAmt).toFixed(0)} pts after`
                : `⚠ Need ${bonusAmt} pts, only ${selectedGame.pointStock.toFixed(0)} available`}
            </div>
          )}

          {error && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#dc2626' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: '10px', background: C.bg,
          borderRadius: '0 0 16px 16px',
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: C.white,
            border: `1px solid ${C.border}`, borderRadius: '8px',
            fontWeight: '600', cursor: 'pointer', fontSize: '13px',
          }}>
            Cancel
          </button>
          <button
            onClick={handleClaim}
            disabled={loading || !stockOk || !gameId}
            style={{
              flex: 2, padding: '10px', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px', cursor: loading || !stockOk || !gameId ? 'not-allowed' : 'pointer',
              background: loading || !stockOk || !gameId
                ? '#e2e8f0'
                : isMilestone ? C.amber : C.green,
              color: loading || !stockOk || !gameId ? C.grayLt : '#fff',
            }}
          >
            {loading ? '⏳ Claiming…' : `Grant +$${bonusAmt.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main card component ───────────────────────────────────────────
export default function PendingBonusesCard({ playerId, onRefresh }) {
  const navigate = useNavigate();

  const [pending,  setPending]  = useState(null);   // { milestones, referralWeekly, totalAmount }
  const [games,    setGames]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [claiming, setClaiming] = useState(null);   // the bonus being claimed
  const [toast,    setToast]    = useState('');

  const load = useCallback(async () => {
    try {
      const [pb, gm] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_API_URL ?? ''}/api/players/${playerId}/pending-bonuses`,
          {
            credentials: 'include',
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
          }
        ).then(r => r.json()),
        api.games.getGames(),
      ]);
      setPending(pb.data);
      setGames(gm?.data || []);
    } catch (_) {
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const handleClaimed = (message) => {
    setClaiming(null);
    setToast(message);
    setTimeout(() => setToast(''), 3500);
    load();
    onRefresh?.();
  };

  const allBonuses = [
    ...(pending?.milestones    || []),
    ...(pending?.referralWeekly || []),
  ];

  if (loading) return null;
  if (!pending || allBonuses.length === 0) return null;

  return (
    <>
      <div style={card({
        padding: '20px 24px',
        border: '1.5px solid #fcd34d',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fff 60%)',
      })}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px', paddingBottom: '12px',
          borderBottom: '1px solid #fde68a', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: C.amberLt, border: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>🎁</div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: C.slate }}>
                Pending Bonuses
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: C.gray }}>
                {allBonuses.length} bonus{allBonuses.length !== 1 ? 'es' : ''} awaiting — total{' '}
                <strong style={{ color: C.amber }}>${pending.totalAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          {/* Success toast */}
          {toast && (
            <span style={{
              padding: '5px 14px', background: C.greenLt,
              border: `1px solid ${C.greenBdr}`, borderRadius: '20px',
              fontSize: '12px', fontWeight: '700', color: C.green,
            }}>
              ✓ {toast}
            </span>
          )}
        </div>

        {/* Milestone bonuses */}
        {pending.milestones.length > 0 && (
          <div style={{ marginBottom: pending.referralWeekly.length > 0 ? '16px' : 0 }}>
            <p style={{
              margin: '0 0 10px', fontSize: '11px', fontWeight: '700',
              color: C.amber, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              💰 Daily Deposit Milestones
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pending.milestones.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#fffbeb',
                  border: '1px solid #fde68a', borderRadius: '10px',
                  flexWrap: 'wrap', gap: '10px',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#92400e' }}>
                      🏆 Hit ${m.milestone} in daily deposits
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                      {m.date} · Earn ${m.bonusAmount.toFixed(2)} bonus
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '20px', fontWeight: '900', color: C.amber,
                    }}>
                      +${m.bonusAmount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setClaiming(m)}
                      style={{
                        padding: '7px 16px', background: C.amber, color: '#fff',
                        border: 'none', borderRadius: '8px', fontWeight: '700',
                        fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Claim →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral weekly bonuses */}
        {pending.referralWeekly.length > 0 && (
          <div>
            <p style={{
              margin: '0 0 10px', fontSize: '11px', fontWeight: '700',
              color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              🔗 Referral Weekly Bonuses (10%)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pending.referralWeekly.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: C.greenLt,
                  border: `1px solid ${C.greenBdr}`, borderRadius: '10px',
                  flexWrap: 'wrap', gap: '10px',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#166534' }}>
                      👤 {r.referredPlayer?.name} deposited ${r.totalDeposits.toFixed(2)} this week
                    </div>
                    <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                      Week of {r.weekOf} · Earn 10% = ${r.bonusAmount.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: C.green }}>
                      +${r.bonusAmount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setClaiming(r)}
                      style={{
                        padding: '7px 16px', background: C.green, color: '#fff',
                        border: 'none', borderRadius: '8px', fontWeight: '700',
                        fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Claim →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p style={{
          margin: '14px 0 0', fontSize: '11px', color: C.grayLt,
          borderTop: `1px solid ${C.border}`, paddingTop: '10px',
        }}>
          💡 Milestones reset daily. Referral weekly bonuses reset every Monday.
          Once claimed, they won't appear again.
        </p>
      </div>

      {/* Claim modal */}
      {claiming && (
        <ClaimModal
          bonus={claiming}
          games={games}
          onClose={() => setClaiming(null)}
          onClaimed={handleClaimed}
        />
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════
// INTEGRATION: PlayerDashboard.jsx
// ═══════════════════════════════════════════════════════════════
//
// 1. Add import at top of PlayerDashboard.jsx:
//    import PendingBonusesCard from './PendingBonusesCard';
//
// 2. In the JSX return, add the card AFTER <StreakFreezeCard>
//    and BEFORE the eligible bonuses section:
//
//    <StreakFreezeCard player={player} />
//
//    {/* ── PENDING MILESTONE + REFERRAL WEEKLY BONUSES ── */}
//    <PendingBonusesCard
//      playerId={player.id}
//      onRefresh={() => loadPlayer(false)}
//    />
//
//    {/* ── ELIGIBLE BONUSES (existing) ── */}
//    {(eligLoading || eligibleBonuses.length > 0) && ( ... )}
//
// ─────────────────────────────────────────────────────────────
// BALANCE DISPLAY: To show "Net Deposits - Cashouts" breakdown,
// add this helper in your StatCard row inside PlayerDashboard:
//
//    const netDeposits  = (player.transactionHistory || [])
//      .filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
//    const netCashouts  = (player.transactionHistory || [])
//      .filter(t => t.type === 'cashout').reduce((s, t) => s + t.amount, 0);
//    const trueBalance  = netDeposits - netCashouts; // last 30 days
//
// Then add a StatCard:
//    <StatCard
//      label="Net Balance (30d)"
//      value={`$${trueBalance.toFixed(2)}`}
//      sub={`$${netDeposits.toFixed(2)} dep − $${netCashouts.toFixed(2)} out`}
//      color={trueBalance >= 0 ? '#10b981' : '#dc2626'}
//    />
// ═══════════════════════════════════════════════════════════════