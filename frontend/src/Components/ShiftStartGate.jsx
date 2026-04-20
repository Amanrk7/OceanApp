import { useState, useEffect, useContext } from 'react';
import { CurrentUserContext } from '../Context/currentUser';

const TEAM_ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];

export default function ShiftStartGate({ children }) {
    const { usr } = useContext(CurrentUserContext);
    const [show, setShow] = useState(false);
    const [animate, setAnimate] = useState(false);

    const isTeamMember = TEAM_ROLES.includes(usr?.role);

    useEffect(() => {
        if (!usr || !isTeamMember) return;
        // Show once per session per user
        const key = `shift_notice_${usr.id}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            setShow(true);
            // Trigger entrance animation after mount
            requestAnimationFrame(() => setAnimate(true));
        }
    }, [usr?.id, isTeamMember]);

    const dismiss = () => {
        setAnimate(false);
        setTimeout(() => setShow(false), 300);
    };

    return (
        <>
            {show && (
                <>
                    {/* Spacer so content doesn't hide under the banner */}
                    <div style={{ height: 52 }} />

                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0,
                        zIndex: 10001,
                        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
                        borderBottom: '1px solid #334155',
                        color: '#f1f5f9',
                        padding: '0 20px',
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                        transform: animate ? 'translateY(0)' : 'translateY(-100%)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                        {/* Icon */}
                        <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(14,165,233,0.15)',
                            border: '1px solid rgba(14,165,233,0.3)',
                            flexShrink: 0,
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </span>

                        {/* Message */}
                        <p style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: '#cbd5e1' }}>
                            <span style={{ fontWeight: 700, color: '#38bdf8' }}>Shift Note — </span>
                            End the current store's shift before starting another store's shift.
                            {' '}Starting a new store's shift while one is active will{' '}
                            <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                                automatically end the current shift.
                            </span>
                        </p>

                        {/* Dismiss */}
                        <button
                            onClick={dismiss}
                            style={{
                                flexShrink: 0,
                                padding: '5px 14px',
                                borderRadius: 7,
                                border: '1px solid #334155',
                                background: 'rgba(255,255,255,0.06)',
                                color: '#94a3b8',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all .15s',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                                e.currentTarget.style.color = '#f1f5f9';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.color = '#94a3b8';
                            }}
                        >
                            Got it ✕
                        </button>
                    </div>
                </>
            )}
            {children}
        </>
    );
}
