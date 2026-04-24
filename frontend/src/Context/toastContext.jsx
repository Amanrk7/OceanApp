import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

// ─── Human-friendly error translation ────────────────────────
const ERROR_MAP = [
    // Auth
    { match: /invalid credentials/i, msg: "Wrong username or password. Please try again." },
    { match: /account suspended/i, msg: "Your account has been suspended. Contact an admin." },
    { match: /unauthorized|no token/i, msg: "Your session has expired. Please log out and log back in." },
    { match: /forbidden|admin access/i, msg: "You don't have permission to do that. Admins only." },

    // Players
    { match: /player not found/i, msg: "This player no longer exists. They may have been deleted." },
    { match: /username.*already exists|email.*already in use/i, msg: "A player with that username or email already exists. Choose a different one." },
    { match: /only admins can mark.*unreachable/i, msg: "Only admins can mark a player as Unreachable." },
    { match: /name.*required/i, msg: "Any one social field is required. Please fill it in." },

    // Transactions / Deposits
    { match: /insufficient.*balance/i, msg: "Not enough balance in the wallet to cover this transaction." },
    { match: /insufficient.*stock|insufficient game stock/i, msg: "Not enough points in the game to cover this. Reload the game first." },
    { match: /deposit.*limit|cashout.*limit/i, msg: "This transaction would exceed the daily cashout limit for this player." },
    { match: /fee.*exceed|fee.*amount/i, msg: "The fee cannot be more than the deposit amount." },
    { match: /gameid.*required/i, msg: "Please select a game before submitting." },
    { match: /walletid.*required|select.*wallet/i, msg: "Please select a wallet before submitting." },
    { match: /wallet.*offline/i, msg: "That wallet is currently offline and can't be used for transactions." },
    { match: /match bonus.*already used/i, msg: "Match bonus has already been used for this player today." },
    { match: /referral.*already recorded/i, msg: "A referral bonus for this player has already been recorded." },
    { match: /player has no referrer/i, msg: "This player wasn't referred by anyone — referral bonus can't be granted." },
    { match: /transaction.*already cancelled/i, msg: "This transaction has already been cancelled." },
    { match: /cannot approve.*cancelled/i, msg: "You can't approve a cancelled transaction." },
    { match: /only cashout.*approved/i, msg: "Only cashout transactions can be approved." },

    // Bonuses
    { match: /no eligible referral/i, msg: "No pending referral bonus records found for this player. Record it first during a deposit." },
    { match: /bonus already claimed/i, msg: "This bonus has already been claimed." },
    { match: /milestone.*not found/i, msg: "This milestone bonus no longer exists." },
    { match: /streak.*no active/i, msg: "This player has no active streak to freeze." },

    // Games
    { match: /game not found/i, msg: "That game doesn't exist anymore. Please refresh the page." },
    { match: /game.*already exists|name.*already exists/i, msg: "A game with that name or slug already exists." },
    { match: /name.*slug.*required/i, msg: "Game name and slug are both required." },
    { match: /incorrect admin password/i, msg: "The admin password you entered is wrong. Please try again." },

    // Wallets
    { match: /wallet not found/i, msg: "That wallet no longer exists. Please refresh the page." },
    { match: /name.*method.*required/i, msg: "Wallet name and payment method are both required." },

    // Tasks
    { match: /task not found/i, msg: "This task no longer exists." },
    { match: /task.*already completed/i, msg: "This task is already marked as complete." },
    { match: /task.*not completed/i, msg: "This task hasn't been completed yet — nothing to undo." },
    { match: /already claimed.*task/i, msg: "Another team member just claimed this task. Refresh to see who." },
    { match: /not a.*followup task/i, msg: "This action is only available for followup tasks." },
    { match: /assigned.*another member/i, msg: "This task is assigned to someone else. Only they can edit it." },

    // Shifts
    { match: /shift not found/i, msg: "This shift no longer exists." },
    { match: /cannot rate.*active shift/i, msg: "The shift must be ended before it can be rated." },
    { match: /no member checkin/i, msg: "No check-in was recorded for this shift, so it can't be rated yet." },

    // Issues
    { match: /title.*description.*required/i, msg: "Both a title and description are required for the issue." },
    { match: /priority.*low.*medium.*high/i, msg: "Priority must be Low, Medium, or High." },

    // Expenses
    { match: /details.*amount.*required/i, msg: "Expense details and amount are both required." },
    { match: /game.*not found.*expense/i, msg: "The selected game wasn't found. Please choose from the list or leave it blank." },

    // Payments
    { match: /amount.*walletid.*required/i, msg: "Both an amount and a payment method are required." },

    // Network / Server
    { match: /failed to fetch|networkerror|network error/i, msg: "Can't reach the server. Check your internet connection and try again." },
    { match: /backend.*starting|502|503/i, msg: "The server is starting up. Please wait a moment and try again." },
    { match: /500|internal server error/i, msg: "Something went wrong on the server. Please try again in a moment." },
    { match: /404/i, msg: "That page or item doesn't exist." },

    // Partial payments
    { match: /exceeds remaining/i, msg: "The payment amount is more than what's still owed." },
    { match: /fully paid/i, msg: "This transaction has already been fully paid." },

    // Generic fallback — keep last
    { match: /is not defined|cannot read|undefined/i, msg: "Something went wrong on this page. Please refresh and try again." },
];

export function translateError(raw) {
    if (!raw) return "Something went wrong. Please try again.";
    for (const { match, msg } of ERROR_MAP) {
        if (match.test(raw)) return msg;
    }
    // If it looks like a JS crash, hide it
    if (/is not defined|cannot read|undefined/.test(raw)) {
        return "An unexpected error occurred. Please refresh the page.";
    }
    return raw;
}

// ─── Toast provider ───────────────────────────────────────────
let _id = 0;



// 2. Inside ToastProvider, after the `add` definition:
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    // const add = useCallback((message, type = 'error', duration = 6000) => {
    //     const id = ++_id;
    //     const friendly = type === 'error' ? translateError(message) : message;
    //     setToasts(prev => [...prev.slice(-4), { id, message: friendly, type }]);
    //     setTimeout(() => remove(id), duration);
    //     return id;
    // }, []);
    // In toastContext.jsx
const add = useCallback((message, type = 'error', duration = 6000) => {
    const friendly = type === 'error' ? translateError(message) : message;
    
    // ✅ Don't stack duplicate messages
    setToasts(prev => {
        if (prev.some(t => t.message === friendly && t.type === type)) return prev;
        const id = ++_id;
        setTimeout(() => remove(id), duration);
        return [...prev.slice(-4), { id, message: friendly, type }];
    });
}, []);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    // ✅ Move it here, where `add` is in scope
    useEffect(() => {
        window.__toastAdd = add;
        return () => { delete window.__toastAdd; };
    }, [add]);



    return (
        <ToastContext.Provider value={{ add, remove }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={remove} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
}

// ─── Toast UI ─────────────────────────────────────────────────
const TOAST_STYLES = {
    error: { bg: '#fef2f2', border: '#fca5a5', accent: '#ef4444', title: 'Something went wrong', icon: '✕' },
    success: { bg: '#f0fdf4', border: '#86efac', accent: '#22c55e', title: 'Done!', icon: '✓' },
    warning: { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', title: 'Heads up', icon: '!' },
    info: { bg: '#f0f9ff', border: '#bae6fd', accent: '#0ea5e9', title: 'Info', icon: 'i' },
};



function ToastContainer({ toasts, onDismiss }) {
    if (!toasts.length) return null;
    return (
        <>
            <div style={{
                position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
                display: 'flex', flexDirection: 'column', gap: 10,
                maxWidth: 400, width: 'calc(100vw - 48px)',
                pointerEvents: 'none',
            }}>
                {toasts.map(t => {
                    const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
                    return (
                        <div key={t.id} style={{
                            display: 'flex', gap: 12, padding: '14px 16px',
                            background: s.bg,
                            border: `1px solid ${s.border}`,
                            borderLeft: `4px solid ${s.accent}`,
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            pointerEvents: 'all',
                            animation: 'toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                        }}>
                            {/* Icon bubble */}
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: s.accent + '18',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, fontSize: 13, fontWeight: 800, color: s.accent,
                            }}>
                                {s.icon}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: s.accent, marginBottom: 3 }}>
                                    {s.title}
                                </div>
                                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                                    {t.message}
                                </div>
                            </div>

                            {/* Close */}
                            <button onClick={() => onDismiss(t.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#9ca3af', padding: 2, flexShrink: 0,
                                fontSize: 16, lineHeight: 1, alignSelf: 'flex-start',
                            }}>✕</button>
                        </div>
                    );
                })}
            </div>
            <style>{`
        @keyframes toastIn {
          from { transform: translateX(60px) scale(0.92); opacity: 0; }
          to   { transform: translateX(0)    scale(1);    opacity: 1; }
        }
      `}</style>
        </>
    );
}
