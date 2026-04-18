import { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { CurrentUserContext } from '../Context/currentUser';

const TEAM_ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];

export default function ShiftStartGate({ children }) {
    const { usr } = useContext(CurrentUserContext);
    const [status, setStatus] = useState('loading'); // loading | checking | show_modal | done
    const [shiftStatus, setShiftStatus] = useState({}); // { 1: shift|null, 2: shift|null }
    const [storeAccess, setStoreAccess] = useState([]);
    const [selectedStores, setSelectedStores] = useState([]);
    const [step, setStep] = useState('ask_stores'); // ask_stores | start_shifts | done
    const [loading, setLoading] = useState(false);
    const [games, setGames] = useState([]);

    const isTeamMember = TEAM_ROLES.includes(usr?.role);

    useEffect(() => {
        if (!usr || !isTeamMember) { setStatus('done'); return; }

        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/shifts/my-status`, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'X-Store-Id': '1'
                    }
                });
                const data = await res.json();
                setShiftStatus(data.data || {});
                setStoreAccess(data.storeAccess || [1]);

                // If all accessible stores already have active shifts → skip modal
                const allActive = (data.storeAccess || [1]).every(s => data.data?.[s]?.isActive);
                if (allActive) { setStatus('done'); return; }

                setStatus('show_modal');
            } catch {
                setStatus('done'); // fail-open
            }
        })();
    }, [usr?.id]);

    const handleStoreSelection = async () => {
        if (!selectedStores.length) return;
        setLoading(true);
        try {
            for (const storeId of selectedStores) {
                if (shiftStatus[storeId]?.isActive) continue; // already active
                await fetch(`${import.meta.env.VITE_API_URL}/shifts/start`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'X-Store-Id': String(storeId)
                    },
                    body: JSON.stringify({ teamRole: usr.role })
                });
            }
            setStatus('done');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || status === 'checking') {
        return <>{children}</>;  // render app, modal appears on top
    }

    if (status === 'done') return <>{children}</>;

    return (
        <>
            {children}
            {/* Overlay */}
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }}>
                <div style={{
                    background: 'var(--color-cards)', border: '1px solid var(--color-border)',
                    borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                }}>
                    <h2 style={{ color: 'var(--color-text)', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
                        🌅 Start Your Shift
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
                        Which store(s) are you working on today?
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        {storeAccess.map(storeId => {
                            const isActive = shiftStatus[storeId]?.isActive;
                            const isSelected = selectedStores.includes(storeId);
                            return (
                                <label key={storeId} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderRadius: 10, cursor: isActive ? 'default' : 'pointer',
                                    border: `1px solid ${isActive ? 'var(--success)' : isSelected ? 'var(--brand)' : 'var(--color-border)'}`,
                                    background: isActive ? 'var(--color-background-success)' : isSelected ? 'rgba(14,165,233,0.08)' : 'var(--color-background-secondary)',
                                    opacity: isActive ? 0.7 : 1
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isActive || isSelected}
                                        disabled={isActive}
                                        onChange={e => {
                                            if (isActive) return;
                                            setSelectedStores(prev =>
                                                e.target.checked ? [...prev, storeId] : prev.filter(s => s !== storeId)
                                            );
                                        }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>
                                            Store {storeId}
                                        </div>
                                        <div style={{ fontSize: 12, color: isActive ? 'var(--success)' : 'var(--color-text-muted)' }}>
                                            {isActive ? '✅ Shift already active' : 'Start new shift'}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={handleStoreSelection}
                            disabled={loading || !selectedStores.length}
                            style={{
                                flex: 1, padding: '11px 18px', borderRadius: 10,
                                background: 'var(--brand)', color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Starting...' : 'Start Shift'}
                        </button>
                        <button
                            onClick={() => setStatus('done')}
                            style={{
                                padding: '11px 18px', borderRadius: 10,
                                background: 'transparent', color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)', fontWeight: 600,
                                fontSize: 14, cursor: 'pointer'
                            }}
                        >
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}