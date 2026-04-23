import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
    violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

const TIER_CASHOUT = { BRONZE: 250, SILVER: 500, GOLD: 750 };
const STATUS_OPTS = ['ACTIVE', 'CRITICAL', 'HIGHLY_CRITICAL', 'INACTIVE', 'UNREACHABLE'];
const TIER_OPTS = ['BRONZE', 'SILVER', 'GOLD'];

const INPUT = {
    width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`,
    borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
    boxSizing: 'border-box', background: C.white, color: C.slate, outline: 'none',
};
const LABEL = {
    display: 'block', fontSize: '10px', fontWeight: '700',
    color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px',
};
const selectStyle = {
    ...INPUT, cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px',
};

function Field({ label, children, hint }) {
    return (
        <div>
            <label style={LABEL}>{label}</label>
            {children}
            {hint && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.grayLt }}>{hint}</p>}
        </div>
    );
}

function SectionHead({ children }) {
    return (
        <p style={{
            margin: '0 0 12px', fontSize: '10px', fontWeight: '800', color: C.gray,
            textTransform: 'uppercase', letterSpacing: '0.6px',
            paddingBottom: '8px', borderBottom: `1px solid ${C.border}`,
        }}>{children}</p>
    );
}

function InfoBanner({ children }) {
    return (
        <div style={{
            padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '7px', fontSize: '11px', color: '#92400e', marginBottom: '10px',
        }}>
            ⚠️ {children}
        </div>
    );
}

function AtInput({ value, onChange, placeholder = 'handle' }) {
    return (
        <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.grayLt, fontWeight: '700', pointerEvents: 'none' }}>@</span>
            <input style={{ ...INPUT, paddingLeft: '24px' }} value={value} onChange={onChange} placeholder={placeholder} />
        </div>
    );
}

// ── Add this component above EditPlayer export ──────────────────────────
function PlayerSearch({ label, hint, value, onChange, exclude = [] }) {
    const [query, setQuery] = useState(value?.name || '');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        api.auth.getUser().then(u => {
            const user = u?.data || u?.user || u;
            setCurrentUserRole(user?.role || null);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
        const t = setTimeout(async () => {
            try {
                const r = await api.players.getPlayers(1, 10, query, '');
                setResults((r?.data || []).filter(p => !exclude.includes(p.id)));
                setOpen(true);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const select = (p) => {
        onChange(p);
        setQuery(p.name);
        setOpen(false);
    };
    const clear = () => { onChange(null); setQuery(''); };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <label style={LABEL}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); if (value) onChange(null); }}
                    placeholder="Search by name or username…"
                    style={{ ...INPUT, paddingRight: value ? '32px' : '12px' }}
                />
                {(value || query) && (
                    <button type="button" onClick={clear} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, fontSize: '14px', lineHeight: 1 }}>✕</button>
                )}
            </div>
            {hint && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.grayLt }}>{hint}</p>}
            {open && results.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,.12)', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                    {results.map(p => (
                        <div key={p.id} onClick={() => select(p)}
                            style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: C.slate }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: C.grayLt }}>@{p.username}</div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>${parseFloat(p.balance).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// EDIT PLAYER MODAL
// ══════════════════════════════════════════════════════════════
export default function EditPlayer({ player, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', source: '',
        tier: 'BRONZE', status: 'ACTIVE',
        balance: '', cashoutLimit: '250',
        currentStreak: '', totalBonusEarned: '',
        // Social
        facebook: '', telegram: '', instagram: '', x: '', snapchat: '',
        // Payment
        chimeTag: '', cashappTag: '', paypalEmail: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // Add to useState initializer:
    const [referredByPlayer, setReferredByPlayer] = useState(null);
    const [friendsList, setFriendsList] = useState([]);
    const [friendSearch, setFriendSearch] = useState('');
    const [friendResults, setFriendResults] = useState([]);
    const [friendSearchOpen, setFriendSearchOpen] = useState(false);
    const friendSearchRef = useRef(null);

    // In the useEffect that initializes form from player:
    // setReferredByPlayer(player.referredBy || null);
    // setFriendsList(player.friendsList || []);

    useEffect(() => {
        if (!player) return;
        setForm({
            name: player.name || '',
            email: player.email || '',
            phone: player.phone || '',
            source: player.source !== '—' ? (player.source || '') : '',
            tier: player.tier || 'BRONZE',
            status: player.status || 'ACTIVE',
            balance: String(parseFloat(player.balance || 0).toFixed(2)),
            cashoutLimit: String(parseFloat(player.cashoutLimit || TIER_CASHOUT[player.tier] || 250)),
            currentStreak: String(player.streak?.currentStreak ?? 0),
            totalBonusEarned: String(parseFloat(player.bonusTracker?.totalBonusEarned || 0).toFixed(2)),
            facebook: player.socials?.facebook || '',
            telegram: player.socials?.telegram || '',
            instagram: player.socials?.instagram || '',
            x: player.socials?.x || '',
            snapchat: player.socials?.snapchat || '',
            chimeTag: player.socials?.chimeTag || '',
            cashappTag: player.socials?.cashappTag || '',
            paypalEmail: player.socials?.paypalEmail || '',
        });
        setReferredByPlayer(player.referredBy || null);
        setFriendsList(player.friendsList || []);
        setError(''); setSuccess('');
    }, [player]);

    useEffect(() => {
        if (!friendSearch.trim() || friendSearch.length < 2) { setFriendResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const r = await api.players.getPlayers(1, 10, friendSearch, '');
                const currentIds = [player.id, ...friendsList.map(f => f.id)];
                setFriendResults((r?.data || []).filter(p => !currentIds.includes(p.id)));
                setFriendSearchOpen(true);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [friendSearch, friendsList]);

    useEffect(() => {
        const fn = e => { if (friendSearchRef.current && !friendSearchRef.current.contains(e.target)) setFriendSearchOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const onTierChange = (tier) => {
        setForm(p => ({ ...p, tier, cashoutLimit: String(TIER_CASHOUT[tier] ?? 250) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!form.name.trim()) return setError('Name is required.');
        try {
            setLoading(true);
            await api.players.updatePlayer(player.id, {
                name: form.name.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                tier: form.tier,
                status: form.status,
                balance: parseFloat(form.balance) || 0,
                cashoutLimit: parseFloat(form.cashoutLimit) || TIER_CASHOUT[form.tier],
                currentStreak: parseInt(form.currentStreak, 10) || 0,
                totalBonusEarned: parseFloat(form.totalBonusEarned) || 0,
                facebook: form.facebook.trim() || null,
                telegram: form.telegram.trim() || null,
                instagram: form.instagram.trim() || null,
                x: form.x.trim() || null,
                snapchat: form.snapchat.trim() || null,
                chimeTag: form.chimeTag.trim() || null,
                cashappTag: form.cashappTag.trim() || null,
                paypalEmail: form.paypalEmail.trim() || null,
                source: form.source.trim() || null,
                referredById: referredByPlayer?.id ?? null,
                friendIds: friendsList.map(f => f.id),
            });
            setSuccess('Player updated!');
            setTimeout(() => { onSaved(); onClose(); }, 700);
        } catch (err) {
            setError(err.message || 'Failed to update player.');
        } finally {
            setLoading(false);
        }
    };

    if (!player) return null;

    const socialFields = [
        { key: 'facebook', label: 'Facebook' },
        { key: 'telegram', label: 'Telegram' },
        { key: 'instagram', label: 'Instagram' },
        { key: 'x', label: 'X / Twitter' },
        { key: 'snapchat', label: 'Snapchat' },
    ];

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px', height: '100vh'
            }}
        >
            <div style={{
                background: C.white, borderRadius: '16px', boxShadow: '0 24px 60px rgba(15,23,42,.22)',
                width: '100%', maxWidth: '680px', maxHeight: '92vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <div style={{
                    padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: C.skyLt, flexShrink: 0,
                }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: C.slate }}>Edit Player</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.gray }}>
                            @{player.username} · ID {player.id}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: C.grayLt, lineHeight: 1 }}>✕</button>
                </div>

                {/* ── Scrollable body ─────────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {error && (
                        <div style={{ padding: '10px 14px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ padding: '10px 14px', background: C.greenLt, border: `1px solid ${C.greenBdr}`, borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
                            ✓ {success}
                        </div>
                    )}

                    <form id="edit-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                        {/* ── 1. Identity ─────────────────────────────────── */}
                        <div>
                            <SectionHead>Identity</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <Field label="Full Name *">
                                    <input style={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
                                </Field>
                                <Field label="Email" hint="Optional">
                                    <input style={INPUT} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                                </Field>
                                <Field label="Phone">
                                    <input style={INPUT} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                                </Field>
                                <Field label="Acquisition Source">
                                    <input style={INPUT} value={form.source} onChange={e => set('source', e.target.value)} placeholder="Instagram Ad, Friend Referral…" />
                                </Field>
                            </div>
                        </div>

                        {/* ── 2. Classification & Financials ──────────────── */}
                        <div>
                            <SectionHead>Classification &amp; Financials</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <Field label="Tier">
                                    <select style={selectStyle} value={form.tier} onChange={e => onTierChange(e.target.value)}>
                                        {TIER_OPTS.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                                    </select>
                                </Field>
                                <Field label="Status">
                                    {/* <select style={selectStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                                        {STATUS_OPTS.map(s => (
                                            <option key={s} value={s}>
                                                {s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select> */}
                                    <select
                                        style={selectStyle}
                                        value={form.status}
                                        onChange={e => set('status', e.target.value)}
                                    >
                                        {STATUS_OPTS.map(s => {
                                            const isUnreachable = s === 'UNREACHABLE';
                                            const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUserRole);
                                            const disabled = isUnreachable && !isAdmin;
                                            return (
                                                <option key={s} value={s} disabled={disabled} style={disabled ? { color: '#94a3b8' } : {}}>
                                                    {s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                    {isUnreachable && !isAdmin ? ' (Admin only)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {form.status === 'UNREACHABLE' && (
                                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#86198f' }}>
                                            📡 Only admins can set or change this status.
                                        </p>
                                    )}
                                </Field>
                                <Field label="Cashout Limit ($)" hint="Auto-set by tier">
                                    <input style={INPUT} type="number" min="0" step="0.01"
                                        value={form.cashoutLimit} onChange={e => set('cashoutLimit', e.target.value)} />
                                </Field>
                            </div>
                        </div>

                        {/* ── 3. Balance, Streak & Bonus ──────────────────── */}
                        <div>
                            <SectionHead>Balance, Streak &amp; Bonus (Manual Override)</SectionHead>
                            <InfoBanner>Editing these values directly bypasses the normal transaction flow. Use only for corrections.</InfoBanner>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <Field label="Balance ($)" hint="Player's current wallet balance">
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.grayLt, fontSize: '13px', fontWeight: '700', pointerEvents: 'none' }}>$</span>
                                        <input style={{ ...INPUT, paddingLeft: '22px' }} type="number" min="0" step="0.01"
                                            value={form.balance} onChange={e => set('balance', e.target.value)} />
                                    </div>
                                </Field>
                                <Field label="Current Streak (days)"
                                    hint={`Was: ${player.streak?.currentStreak ?? 0} days · Last: ${player.streak?.lastPlayedDate || '—'}`}>
                                    <input style={INPUT} type="number" min="0" step="1"
                                        value={form.currentStreak} onChange={e => set('currentStreak', e.target.value)} placeholder="0" />
                                </Field>
                                <Field label="Total Bonus Earned ($)"
                                    hint={`Was: $${parseFloat(player.bonusTracker?.totalBonusEarned || 0).toFixed(2)}`}>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.grayLt, fontSize: '13px', fontWeight: '700', pointerEvents: 'none' }}>$</span>
                                        <input style={{ ...INPUT, paddingLeft: '22px' }} type="number" min="0" step="0.01"
                                            value={form.totalBonusEarned} onChange={e => set('totalBonusEarned', e.target.value)} placeholder="0.00" />
                                    </div>
                                </Field>
                            </div>
                            <div style={{
                                marginTop: '10px', padding: '10px 14px', background: C.bg,
                                border: `1px solid ${C.border}`, borderRadius: '8px',
                                display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px',
                            }}>
                                <span>💰 Balance: <strong style={{ color: '#10b981' }}>${parseFloat(player.balance || 0).toFixed(2)}</strong></span>
                                <span>🔥 Streak: <strong style={{ color: '#7c3aed' }}>{player.streak?.currentStreak ?? 0} days</strong></span>
                                <span>🎁 Available: <strong style={{ color: '#10b981' }}>${parseFloat(player.bonusTracker?.availableBonus || 0).toFixed(2)}</strong></span>
                                <span>📊 Total earned: <strong style={{ color: C.slate }}>${parseFloat(player.bonusTracker?.totalBonusEarned || 0).toFixed(2)}</strong></span>
                            </div>
                        </div>

                        {/* ── 4. Social Handles ───────────────────────────── */}
                        <div>
                            <SectionHead>Social Handles — optional</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {socialFields.map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <AtInput value={form[key]} onChange={e => set(key, e.target.value)} />
                                    </Field>
                                ))}
                            </div>
                        </div>

                        {/* ── 6. Referred By ──────────────────────────────────────── */}
                        <div>
                            <SectionHead>Referred By — optional</SectionHead>
                            <PlayerSearch
                                label="Referred by player"
                                hint="The player who referred this person"
                                value={referredByPlayer}
                                onChange={setReferredByPlayer}
                                exclude={[player.id]}
                            />
                            {referredByPlayer && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                    <span>👤</span>
                                    <span style={{ fontWeight: '700', color: '#166534' }}>{referredByPlayer.name}</span>
                                    <span style={{ color: C.grayLt }}>@{referredByPlayer.username}</span>
                                </div>
                            )}
                        </div>

                        {/* ── 7. Friends ──────────────────────────────────────────── */}
                        <div>
                            <SectionHead>Friends — optional</SectionHead>

                            {/* Current friends chips */}
                            {friendsList.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {friendsList.map(f => (
                                        <div key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: C.skyLt, border: `1px solid #bae6fd`, borderRadius: '20px', fontSize: '12px', color: C.skyDk }}>
                                            🤝 {f.name}
                                            <button type="button" onClick={() => setFriendsList(prev => prev.filter(x => x.id !== f.id))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sky, fontSize: '13px', lineHeight: 1, padding: 0 }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Friend search */}
                            <div ref={friendSearchRef} style={{ position: 'relative' }}>
                                <input
                                    value={friendSearch}
                                    onChange={e => setFriendSearch(e.target.value)}
                                    placeholder="Search to add a friend…"
                                    style={INPUT}
                                />
                                {friendSearchOpen && friendResults.length > 0 && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,.12)', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                                        {friendResults.map(p => (
                                            <div key={p.id} onClick={() => { setFriendsList(prev => [...prev, { id: p.id, name: p.name, username: p.username }]); setFriendSearch(''); setFriendSearchOpen(false); }}
                                                style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}
                                                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '13px', color: C.slate }}>{p.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.grayLt }}>@{p.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── 5. Payment Handles ──────────────────────────── */}
                        <div>
                            <SectionHead>Payment Handles — optional</SectionHead>
                            <div style={{
                                padding: '8px 12px', background: C.violetLt, border: `1px solid ${C.violetBdr}`,
                                borderRadius: '7px', fontSize: '11px', color: '#6b21a8', marginBottom: '12px',
                            }}>
                                💳 Used for cashout payouts. Leave blank if unknown.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <Field label="Chime Tag" hint="$tag or username">
                                    <input style={INPUT} value={form.chimeTag}
                                        onChange={e => set('chimeTag', e.target.value)}
                                        placeholder="$ChimeUsername" />
                                </Field>
                                <Field label="Cash App Tag" hint="$cashtag or username">
                                    <input style={INPUT} value={form.cashappTag}
                                        onChange={e => set('cashappTag', e.target.value)}
                                        placeholder="$Cashtag" />
                                </Field>
                                <Field label="PayPal Email" hint="Email linked to PayPal">
                                    <input style={INPUT} type="email" value={form.paypalEmail}
                                        onChange={e => set('paypalEmail', e.target.value)}
                                        placeholder="email@paypal.com" />
                                </Field>
                            </div>
                        </div>

                    </form>
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                <div style={{
                    padding: '16px 24px', borderTop: `1px solid ${C.border}`,
                    display: 'flex', gap: '10px', background: C.bg, flexShrink: 0,
                }}>
                    <button type="button" onClick={onClose} disabled={loading} style={{
                        flex: 1, padding: '11px', background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: C.slate,
                    }}>Cancel</button>
                    <button type="submit" form="edit-form" disabled={loading} style={{
                        flex: 2, padding: '11px',
                        background: loading ? '#e2e8f0' : C.sky,
                        color: loading ? C.grayLt : '#fff',
                        border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                        {loading ? '⏳ Saving…' : '✓ Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
