import { useState, useEffect } from 'react';
import { api } from '../api';

// ─── Design tokens (matching Players page) ────────────────────
const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};

const TIER_CASHOUT = { BRONZE: 250, SILVER: 500, GOLD: 750 };
const STATUS_OPTS = ['ACTIVE', 'CRITICAL', 'HIGHLY_CRITICAL', 'INACTIVE'];
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

// ══════════════════════════════════════════════════════════════
// EDIT PLAYER MODAL
// ══════════════════════════════════════════════════════════════
export default function EditPlayer({ player, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        tier: 'BRONZE',
        status: 'ACTIVE',
        balance: '',
        cashoutLimit: '250',
        facebook: '',
        telegram: '',
        instagram: '',
        x: '',
        snapchat: '',
        source: '',
        streak: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pre-fill form from player prop
    useEffect(() => {
        if (!player) return;
        console.log("player is: ", player)
        setForm({
            name: player.name || '',
            email: player.email || '',
            phone: player.phone || '',
            tier: player.tier || 'BRONZE',
            status: player.status || 'ACTIVE',
            balance: String(parseFloat(player.balance || 0).toFixed(2)),
            cashoutLimit: String(parseFloat(player.cashoutLimit || TIER_CASHOUT[player.tier] || 250)),
            facebook: player.socials.facebook || '',
            telegram: player.socials.telegram || '',
            instagram: player.socials.instagram || '',
            x: player.socials.x || '',
            snapchat: player.socials.snapchat || '',
            source: player.source || '',
            streak: player.streak.currentStreak || '',
        });
        setError('');
        setSuccess('');
    }, [player]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // When tier changes, auto-adjust cashoutLimit
    const onTierChange = (tier) => {
        setForm(p => ({ ...p, tier, cashoutLimit: String(TIER_CASHOUT[tier] ?? 250) }));

    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("edit user data: ", form);
        setError(''); setSuccess('');
        if (!form.name.trim() || !form.email.trim()) {
            return setError('Name and email are required.');
        }
        try {
            setLoading(true);
            await api.players.updatePlayer(player.id, {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || null,
                tier: form.tier,
                status: form.status,
                balance: parseFloat(form.balance) || 0,
                cashoutLimit: parseFloat(form.cashoutLimit) || TIER_CASHOUT[form.tier],
                facebook: form.facebook.trim() || null,
                telegram: form.telegram.trim() || null,
                instagram: form.instagram.trim() || null,
                x: form.x.trim() || null,
                snapchat: form.snapchat.trim() || null,
                source: form.source.trim() || null,
                // source: form.source.trim() || null,
                streak: form.streak.trim() || null,

            });
            setSuccess('Player updated!');
            setTimeout(() => { onSaved(); onClose(); }, 900);
        } catch (err) {
            setError(err.message || 'Failed to update player.');
        } finally {
            setLoading(false);
        }
    };

    if (!player) return null;

    return (
        // Backdrop
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
        >
            {/* Modal */}
            <div style={{
                background: C.white, borderRadius: '16px', boxShadow: '0 24px 60px rgba(15,23,42,.22)',
                width: '100%', maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: C.skyLt,
                }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: C.slate }}>
                            Edit Player
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.gray }}>
                            @{player.username} · ID {player.id}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
                        color: C.grayLt, lineHeight: 1, padding: '4px',
                    }}>✕</button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {error && (
                        <div style={{
                            padding: '10px 14px', background: C.redLt, border: `1px solid ${C.redBdr}`,
                            borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px',
                        }}>{error}</div>
                    )}
                    {success && (
                        <div style={{
                            padding: '10px 14px', background: C.greenLt, border: `1px solid ${C.greenBdr}`,
                            borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px',
                        }}>✓ {success}</div>
                    )}

                    <form id="edit-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* ── Identity ── */}
                        <div>
                            <SectionHead>Identity</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <Field label="Full Name *">
                                    <input style={INPUT} value={form.name}
                                        onChange={e => set('name', e.target.value)} placeholder="Full name" />
                                </Field>
                                <Field label="Email *">
                                    <input style={INPUT} type="email" value={form.email}
                                        onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                                </Field>
                                <Field label="Phone">
                                    <input style={INPUT} value={form.phone}
                                        onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                                </Field>
                                <Field label="Acquisition Source">
                                    <input style={INPUT} value={form.source}
                                        onChange={e => set('source', e.target.value)} placeholder="Instagram Ad, Friend Referral…" />
                                </Field>
                            </div>
                        </div>

                        {/* ── Classification ── */}
                        <div>
                            <SectionHead>Classification & Balance</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                                <Field label="Tier">
                                    <select style={selectStyle} value={form.tier}
                                        onChange={e => onTierChange(e.target.value)}>
                                        {TIER_OPTS.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                                    </select>
                                </Field>
                                <Field label="Status">
                                    <select style={selectStyle} value={form.status}
                                        onChange={e => set('status', e.target.value)}>
                                        {STATUS_OPTS.map(s => (
                                            <option key={s} value={s}>
                                                {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Streak">
                                    <input style={INPUT} type="number" min="0" step="0.01"
                                        value={form.streak} onChange={e => set('streak', e.target.value)} />
                                </Field>
                                <Field label="Balance ($)">
                                    <input style={INPUT} type="number" min="0" step="0.01"
                                        value={form.balance} onChange={e => set('balance', e.target.value)} />
                                </Field>
                                <Field label="Cashout Limit ($)" hint="Auto-set by tier">
                                    <input style={INPUT} type="number" min="0" step="0.01"
                                        value={form.cashoutLimit} onChange={e => set('cashoutLimit', e.target.value)} />
                                </Field>
                            </div>
                        </div>

                        {/* ── Socials ── */}
                        <div>
                            <SectionHead>Social Handles — optional</SectionHead>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { key: 'facebook', label: 'Facebook', prefix: 'fb.com/' },
                                    { key: 'telegram', label: 'Telegram', prefix: 't.me/' },
                                    { key: 'instagram', label: 'Instagram', prefix: 'ig/' },
                                    { key: 'x', label: 'X / Twitter', prefix: 'x.com/' },
                                    { key: 'snapchat', label: 'Snapchat', prefix: 'snap/' },
                                ].map(({ key, label, prefix }) => (
                                    <Field key={key} label={label}>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute', left: '10px', top: '50%',
                                                transform: 'translateY(-50%)', fontSize: '11px',
                                                color: C.grayLt, fontWeight: '700', pointerEvents: 'none',
                                            }}>@</span>
                                            <input
                                                style={{ ...INPUT, paddingLeft: '24px' }}
                                                value={form[key]}
                                                onChange={e => set(key, e.target.value)}
                                                placeholder="handle"
                                            />
                                        </div>
                                    </Field>
                                ))}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', borderTop: `1px solid ${C.border}`,
                    display: 'flex', gap: '10px', background: C.bg,
                }}>
                    <button type="button" onClick={onClose} disabled={loading} style={{
                        flex: 1, padding: '11px', background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: C.slate,
                    }}>Cancel</button>
                    <button
                        type="submit" form="edit-form" disabled={loading}
                        style={{
                            flex: 2, padding: '11px', background: loading ? '#e2e8f0' : C.sky,
                            color: loading ? C.grayLt : '#fff', border: 'none', borderRadius: '8px',
                            fontWeight: '700', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '⏳ Saving…' : '✓ Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}