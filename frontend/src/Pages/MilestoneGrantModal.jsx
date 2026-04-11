/**
 * MilestoneGrantModal.jsx
 *
 * Drop this file next to PlayerDashboard.jsx and import it:
 *   import MilestoneGrantModal from './MilestoneGrantModal';
 *
 * Then in PlayerDashboard, add state:
 *   const [grantingMilestone, setGrantingMilestone] = useState(null);
 *
 * Pass onGrantClick to DailyMilestoneBar:
 *   <DailyMilestoneBar
 *     todayDeposits={todayDeposits}
 *     pendingBonuses={pendingMilestones}
 *     onGrantClick={(m) => setGrantingMilestone(m)}
 *   />
 *
 * Render the modal:
 *   {grantingMilestone && (
 *     <MilestoneGrantModal
 *       milestone={grantingMilestone}
 *       player={player}
 *       onClose={() => setGrantingMilestone(null)}
 *       onGranted={() => { setGrantingMilestone(null); loadPlayer(false); }}
 *     />
 *   )}
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';

const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

export default function MilestoneGrantModal({ milestone, player, onClose, onGranted }) {
    const [games, setGames] = useState([]);
    const [selectedGameId, setSelectedGameId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [gamesLoading, setGamesLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadGames = async () => {
            try {
                const res = await api.games.getGames();
                const healthy = (res.data || []).filter(g => g.status !== 'DEFICIT' && g.pointStock >= (milestone?.bonusAmount || 5));
                setGames(healthy);
                if (healthy.length === 1) setSelectedGameId(healthy[0].id);
            } catch {
                setError('Failed to load games');
            } finally {
                setGamesLoading(false);
            }
        };
        loadGames();
    }, [milestone]);

    const handleGrant = async () => {
        if (!selectedGameId) return setError('Please select a game to deduct from.');
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`/api/milestone-bonuses/${milestone.id}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ gameId: selectedGameId, notes: notes.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to grant bonus');
            setSuccess(data.message || `$${milestone.bonusAmount.toFixed(2)} bonus granted!`);
            setTimeout(() => onGranted(), 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedGame = games.find(g => g.id === selectedGameId);

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(15,23,42,.65)',
                backdropFilter: 'blur(2px)',
                zIndex: 1200,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div style={{
                background: C.white, borderRadius: '16px',
                boxShadow: '0 24px 60px rgba(15,23,42,.25)',
                width: '100%', maxWidth: '440px',
                animation: 'milestoneSlideIn .2s ease',
            }}>

                {/* ── Header ── */}
                <div style={{
                    padding: '18px 22px',
                    background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                    borderBottom: '1px solid #fde68a',
                    borderRadius: '16px 16px 0 0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '20px' }}>🏆</span>
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#92400e' }}>
                                Grant Milestone Bonus
                            </p>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>
                            ${milestone.milestone} daily deposit milestone reached
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: C.grayLt, fontSize: '18px', padding: '0 0 0 8px',
                        }}
                    >✕</button>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '20px 22px' }}>

                    {/* Player + Amount strip */}
                    <div style={{
                        padding: '12px 16px',
                        background: '#f0fdf4', border: '1px solid #86efac',
                        borderRadius: '10px', marginBottom: '18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#166534' }}>
                                {player.name}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4ade80' }}>
                                @{player.username} · reached ${milestone.milestone} today ({milestone.date})
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>
                                +${milestone.bonusAmount.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#86efac', marginTop: '2px' }}>bonus amount</div>
                        </div>
                    </div>

                    {/* Game selector */}
                    <label style={{
                        display: 'block', fontSize: '11px', fontWeight: '700',
                        color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px',
                        marginBottom: '6px',
                    }}>
                        Select Game *
                    </label>

                    {gamesLoading ? (
                        <div style={{
                            height: '42px', border: `1px solid ${C.border}`, borderRadius: '8px',
                            display: 'flex', alignItems: 'center', paddingLeft: '12px',
                            fontSize: '13px', color: C.grayLt, gap: '8px',
                        }}>
                            <div style={{
                                width: '14px', height: '14px',
                                border: `2px solid ${C.border}`, borderTopColor: C.sky,
                                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            }} />
                            Loading games…
                        </div>
                    ) : (
                        <select
                            value={selectedGameId}
                            onChange={e => { setSelectedGameId(e.target.value); setError(''); }}
                            style={{
                                width: '100%', padding: '10px 12px',
                                border: `1px solid ${error && !selectedGameId ? C.red : C.border}`,
                                borderRadius: '8px', fontSize: '13px',
                                fontFamily: 'inherit', background: C.white,
                                color: selectedGameId ? C.slate : C.grayLt,
                                cursor: 'pointer', outline: 'none',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                paddingRight: '32px',
                                boxSizing: 'border-box',
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

                    {/* Stock preview */}
                    {selectedGame && (
                        <div style={{
                            marginTop: '8px', padding: '8px 12px',
                            background: '#f8fafc', border: `1px solid ${C.border}`,
                            borderRadius: '7px', fontSize: '11px', color: C.gray,
                            display: 'flex', justifyContent: 'space-between',
                        }}>
                            <span>Current stock: <strong>{parseFloat(selectedGame.pointStock).toFixed(0)} pts</strong></span>
                            <span style={{ color: '#d97706' }}>
                                After grant: <strong>{(parseFloat(selectedGame.pointStock) - milestone.bonusAmount).toFixed(0)} pts</strong>
                            </span>
                        </div>
                    )}

                    {/* Notes */}
                    <label style={{
                        display: 'block', fontSize: '11px', fontWeight: '700',
                        color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px',
                        margin: '14px 0 6px',
                    }}>
                        Notes <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. milestone bonus for $50 deposit today"
                        style={{
                            width: '100%', padding: '10px 12px',
                            border: `1px solid ${C.border}`, borderRadius: '8px',
                            fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                            boxSizing: 'border-box', color: C.slate,
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleGrant()}
                    />

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginTop: '10px', padding: '10px 14px',
                            background: '#fff1f2', border: '1px solid #fecdd3',
                            borderRadius: '8px', fontSize: '13px', color: C.red,
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div style={{
                            marginTop: '10px', padding: '10px 14px',
                            background: '#f0fdf4', border: '1px solid #86efac',
                            borderRadius: '8px', fontSize: '13px', color: '#166534',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            ✅ {success}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '14px 22px', borderTop: `1px solid ${C.border}`,
                    display: 'flex', gap: '10px', background: C.bg,
                    borderRadius: '0 0 16px 16px',
                }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '10px',
                            background: C.white, border: `1px solid ${C.border}`,
                            borderRadius: '8px', fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px',
                            color: C.gray, opacity: loading ? 0.6 : 1,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGrant}
                        disabled={loading || !selectedGameId || !!success}
                        style={{
                            flex: 2, padding: '10px',
                            background: loading || !selectedGameId || success
                                ? '#e2e8f0'
                                : 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: loading || !selectedGameId || success ? C.grayLt : '#fff',
                            border: 'none', borderRadius: '8px',
                            fontWeight: '700', fontSize: '13px',
                            cursor: (loading || !selectedGameId || success) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all .15s ease',
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '13px', height: '13px',
                                    border: '2px solid #fff3', borderTopColor: '#fff',
                                    borderRadius: '50%', animation: 'spin .8s linear infinite',
                                }} />
                                Granting…
                            </>
                        ) : success ? '✅ Granted!' : `🏆 Grant $${milestone.bonusAmount.toFixed(2)} Bonus`}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes milestoneSlideIn {
          from { opacity: 0; transform: scale(.96) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);   }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}