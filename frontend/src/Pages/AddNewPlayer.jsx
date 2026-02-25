import { useState, useContext, useCallback } from "react";
import { AddPlayerContext } from "../Context/addPlayer";
import { ShiftStatusContext } from "../Context/membershiftStatus";
import { api } from "../api";

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);
const ICheck = () => <Ico d="M20 6L9 17l-5-5" />;
const IAlert = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const IPlus = () => <Ico d="M12 5v14M5 12h14" />;
const IX = () => <Ico d="M18 6L6 18M6 6l12 12" />;
const IUser = () => <Ico d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']} />;
const ILock = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;
const IMail = () => <Ico d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6']} />;
const IPhone = () => <Ico d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IEye = () => <Ico d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 100 6 3 3 0 000-6z']} />;
const IEyeOff = () => <Ico d={['M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24', 'M1 1l22 22']} />;
const IUsers = () => <Ico d={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z']} />;
const IShield = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IWarn = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={13} />;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
    violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
};
const LABEL = {
    display: 'block', fontSize: '11px', fontWeight: '700',
    color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT = {
    width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`,
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    boxSizing: 'border-box', background: C.white, color: C.slate, outline: 'none',
    transition: 'border-color .15s',
};

// ─── Social handle validation rules ──────────────────────────────────────────
// These check the *format* of handles client-side (real API verification would
// require server-side calls due to CORS restrictions on social platform APIs).
const SOCIAL_RULES = {
    facebook: { pattern: /^[a-zA-Z0-9.]{1,50}$/, hint: '1–50 chars: letters, numbers, dots only', url: (h) => `https://facebook.com/${h}` },
    telegram: { pattern: /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/, hint: '5–32 chars, starts with a letter, letters/numbers/underscores', url: (h) => `https://t.me/${h}` },
    instagram: { pattern: /^[a-zA-Z0-9._]{1,30}$/, hint: '1–30 chars: letters, numbers, dots, underscores', url: (h) => `https://instagram.com/${h}` },
    x: { pattern: /^[a-zA-Z0-9_]{1,15}$/, hint: '1–15 chars: letters, numbers, underscores', url: (h) => `https://x.com/${h}` },
    snapchat: { pattern: /^[a-zA-Z][a-zA-Z0-9._-]{1,14}$/, hint: '2–15 chars, starts with a letter', url: (h) => `https://snapchat.com/add/${h}` },
};

function validateHandle(platform, handle) {
    if (!handle || !handle.trim()) return null; // empty = OK (optional)
    const rule = SOCIAL_RULES[platform];
    if (!rule) return null;
    return rule.pattern.test(handle.trim()) ? 'valid' : 'invalid';
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
    return (
        <div>
            <label style={LABEL}>
                {label}
                {required && <span style={{ color: C.red, marginLeft: '3px' }}>*</span>}
            </label>
            {children}
            {hint && <p style={{ margin: '4px 0 0', fontSize: '11px', color: C.grayLt, lineHeight: '1.4' }}>{hint}</p>}
        </div>
    );
}

function IconInput({ IconEl, ...props }) {
    return (
        <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: C.grayLt, display: 'flex', pointerEvents: 'none' }}>
                <IconEl />
            </span>
            <input {...props} style={{ ...INPUT, paddingLeft: '36px', ...props.style }} />
        </div>
    );
}

function SectionHead({ step, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
            {step && (
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: C.sky, color: '#fff', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {step}
                </span>
            )}
            <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{children}</p>
        </div>
    );
}

function TierBadge({ tier }) {
    const map = {
        BRONZE: { bg: '#fed7aa', text: '#92400e', emoji: '🥉' },
        SILVER: { bg: '#e0e7ff', text: '#3730a3', emoji: '🥈' },
        GOLD: { bg: '#fef3c7', text: '#92400e', emoji: '🥇' },
    };
    const t = map[tier] || map.BRONZE;
    return (
        <span style={{ padding: '2px 9px', background: t.bg, color: t.text, borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginLeft: '8px' }}>
            {t.emoji} {tier.charAt(0) + tier.slice(1).toLowerCase()}
        </span>
    );
}

function AddRowBtn({ onClick, children }) {
    const [hover, setHover] = useState(false);
    return (
        <button type="button" onClick={onClick}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: hover ? C.skyLt : 'none', border: `1px dashed ${hover ? C.sky : C.border}`, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: C.sky, fontSize: '12px', fontWeight: '600', transition: 'all .15s', justifyContent: 'center' }}>
            <IPlus /> {children}
        </button>
    );
}

// ─── Social field with live format-validation feedback ────────────────────────
function SocialField({ platform, label, value, onChange }) {
    const [focused, setFocused] = useState(false);
    const status = validateHandle(platform, value);
    const rule = SOCIAL_RULES[platform];
    const hasVal = value && value.trim().length > 0;

    const borderColor = !hasVal ? C.border
        : status === 'valid' ? '#22c55e'
            : status === 'invalid' ? C.red
                : C.border;

    const profileUrl = status === 'valid' ? rule.url(value.trim()) : null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={LABEL}>{label}</label>
                {hasVal && status === 'valid' && profileUrl && (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', fontWeight: '700', color: C.sky, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        View ↗
                    </a>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>@</span>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="handle"
                    style={{ ...INPUT, paddingLeft: '26px', paddingRight: hasVal ? '28px' : '12px', borderColor, boxShadow: focused ? `0 0 0 3px ${borderColor}22` : 'none' }}
                />
                {/* Status indicator dot */}
                {hasVal && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: status === 'valid' ? '#22c55e' : C.red, flexShrink: 0 }} />
                )}
            </div>
            {/* Hint shown while focused or if invalid */}
            {hasVal && (focused || status === 'invalid') && (
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: status === 'valid' ? '#16a34a' : C.red, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4' }}>
                    {status === 'valid'
                        ? <><ICheck /> Format looks good</>
                        : <><IWarn /> {rule.hint}</>
                    }
                </p>
            )}
            {!hasVal && focused && (
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: C.grayLt, lineHeight: '1.4' }}>{rule.hint}</p>
            )}
        </div>
    );
}

// ─── Dynamic list section (Referrals / Friends / Sources) ─────────────────────
function DynamicList({ label, items, onAdd, onChange, onRemove, placeholder, icon: IconEl }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                {IconEl && <span style={{ color: C.grayLt, display: 'flex' }}><IconEl /></span>}
                <label style={{ ...LABEL, marginBottom: 0 }}>{label}</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {items.map((val, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>#{i + 1}</span>
                            <input
                                type="text" value={val}
                                onChange={(e) => onChange(i, e.target.value)}
                                placeholder={placeholder}
                                style={{ ...INPUT, paddingLeft: '30px', fontSize: '13px' }}
                            />
                        </div>
                        {items.length > 1 && (
                            <button type="button" onClick={() => onRemove(i)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', flexShrink: 0, background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '7px', cursor: 'pointer', color: C.red }}>
                                <IX />
                            </button>
                        )}
                    </div>
                ))}
                <AddRowBtn onClick={onAdd}>Add {label.replace(/s$/, '')}</AddRowBtn>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AddNewPlayer({ onIssueCreated }) {
    const { setAddPlayer } = useContext(AddPlayerContext);
    const { shiftActive } = useContext(ShiftStatusContext);

    const EMPTY = {
        name: '', username: '', password: '', email: '', phone: '',
        facebook: '', telegram: '', instagram: '', x: '', snapchat: '',
        tier: 'BRONZE',
        playerNames: [''],   // referrals
        friends: [''],       // friends (usernames of existing players)
        sources: [''],
    };

    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPass, setShowPass] = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const onChange = (e) => set(e.target.name, e.target.value);

    // Dynamic list helpers for any array field
    const listOf = (key) => ({
        add: () => setForm(p => ({ ...p, [key]: [...p[key], ''] })),
        change: (i, v) => setForm(p => ({ ...p, [key]: p[key].map((x, idx) => idx === i ? v : x) })),
        remove: (i) => setForm(p => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) })),
    });
    const refs = listOf('playerNames');
    const frds = listOf('friends');
    const srcs = listOf('sources');

    // Social handle change
    const onSocialChange = useCallback((platform, val) => {
        setForm(p => ({ ...p, [platform]: val }));
    }, []);

    // Check if any social has an invalid format (non-empty + failing pattern)
    const socialWarnings = ['facebook', 'telegram', 'instagram', 'x', 'snapchat'].filter(
        (p) => form[p] && form[p].trim() && validateHandle(p, form[p]) === 'invalid'
    );

    const selectStyle = {
        ...INPUT, cursor: 'pointer', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
    };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');

        // Required field checks
        if (!form.name.trim()) return setError('Full name is required.');
        if (!form.username.trim()) return setError('Username is required.');
        if (!form.password.trim()) return setError('Password is required.');
        if (!form.email.trim()) return setError('Email address is required.');

        // Warn if social handles have invalid format but still allow submit
        if (socialWarnings.length > 0) {
            const names = socialWarnings.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
            setError(`Please fix the format for: ${names}. Clear the field to leave it blank, or correct the handle.`);
            return;
        }

        try {
            setLoading(true);
            await api.players.createPlayer({
                name: form.name.trim(),
                username: form.username.trim(),
                password: form.password,
                email: form.email.trim(),
                phone: form.phone.trim() || null,
                tier: form.tier,
                facebook: form.facebook.trim() || null,
                telegram: form.telegram.trim() || null,
                instagram: form.instagram.trim() || null,
                x: form.x.trim() || null,
                snapchat: form.snapchat.trim() || null,
                referrals: form.playerNames.filter(n => n.trim()),
                friends: form.friends.filter(n => n.trim()),
                sources: form.sources.filter(s => s.trim()),
            });

            setSuccess(`✓ Player "${form.name}" created successfully!`);
            setTimeout(() => {
                if (onIssueCreated) onIssueCreated();
                setAddPlayer(false);
            }, 1400);
        } catch (err) {
            setError(err.message || 'Failed to create player. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const socials = [
        { key: 'facebook', label: 'Facebook' },
        { key: 'telegram', label: 'Telegram' },
        { key: 'instagram', label: 'Instagram' },
        { key: 'x', label: 'X / Twitter' },
        { key: 'snapchat', label: 'Snapchat' },
    ];

    // ── No active shift ─────────────────────────────────────────────────────────
    if (!shiftActive) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '14px 18px', background: C.amberLt, borderLeft: `4px solid ${C.amber}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <IAlert />
                    <div>
                        <p style={{ fontWeight: '700', color: '#78350f', margin: '0 0 2px', fontSize: '14px' }}>Shift Required</p>
                        <p style={{ color: '#92400e', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>You must have an active shift before adding players to the system.</p>
                    </div>
                </div>
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '60px 28px', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '60px', background: C.amberLt, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `1px solid ${C.amberBdr}` }}>
                        <ILock />
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: '#78350f' }}>Form Locked</p>
                    <p style={{ margin: 0, fontSize: '13px', color: C.amber }}>Go to Shifts and start your shift first.</p>
                </div>
            </div>
        );
    }

    // ── Active shift: show form ─────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 'inherit' }}>

            {/* Header */}
            <div style={{ padding: '14px 18px', background: C.skyLt, borderLeft: `4px solid ${C.sky}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <IUser />
                <div>
                    <p style={{ fontWeight: '700', color: C.skyDk, margin: '0 0 2px', fontSize: '14px' }}>Add a New Player</p>
                    <p style={{ color: '#0369a1', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                        Fill in the player's details. Social handles are validated for format. They'll be immediately active in the system.
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div style={{ padding: '11px 14px', background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, marginTop: '1px' }}><IAlert /></span> {error}
                </div>
            )}
            {success && (
                <div style={{ padding: '11px 14px', background: C.greenLt, border: `1px solid ${C.greenBdr}`, borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <ICheck /> {success}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* ══ 1 · Identity & Credentials ════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="1">Identity & Credentials</SectionHead>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        <Field label="Full Name" required>
                            <IconInput IconEl={IUser} type="text" name="name" value={form.name} onChange={onChange} placeholder="e.g. John Smith" required />
                        </Field>

                        <Field label="Username" required>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>@</span>
                                <input type="text" name="username" value={form.username} onChange={onChange} placeholder="player_handle" style={{ ...INPUT, paddingLeft: '27px' }} required />
                            </div>
                        </Field>

                        <Field label="Password" required>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: C.grayLt, display: 'flex', pointerEvents: 'none' }}><ILock /></span>
                                <input
                                    type={showPass ? 'text' : 'password'} name="password"
                                    value={form.password} onChange={onChange}
                                    placeholder="Set a secure password"
                                    style={{ ...INPUT, paddingLeft: '36px', paddingRight: '70px' }} required
                                />
                                <button type="button" onClick={() => setShowPass(p => !p)}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '5px', padding: '3px 7px', fontSize: '10px', fontWeight: '700', color: C.gray, cursor: 'pointer' }}>
                                    {showPass ? <><IEyeOff /> HIDE</> : <><IEye /> SHOW</>}
                                </button>
                            </div>
                        </Field>

                        <Field label="Email Address" required>
                            <IconInput IconEl={IMail} type="email" name="email" value={form.email} onChange={onChange} placeholder="player@email.com" required />
                        </Field>

                        <Field label="Phone Number" hint="Optional">
                            <IconInput IconEl={IPhone} type="text" name="phone" value={form.phone} onChange={onChange} placeholder="+1 (555) 000-0000" />
                        </Field>

                    </div>
                </div>

                {/* ══ 2 · Classification ════════════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="2">Classification</SectionHead>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={LABEL}>Tier</span>
                                <TierBadge tier={form.tier} />
                            </div>
                            <select name="tier" value={form.tier} onChange={onChange} style={selectStyle}>
                                <option value="BRONZE">Bronze</option>
                                <option value="SILVER">Silver</option>
                                <option value="GOLD">Gold</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ══ 3 · Social Handles ════════════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="3">
                        Social Handles
                        <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— all optional</span>
                    </SectionHead>

                    {/* Validation legend */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '10px 14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.gray }}>
                            <IShield />
                            <span>Format validated as you type</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            Valid format
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.red }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                            Invalid format
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.grayLt }}>
                            Valid formats open profile link ↗
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {socials.map(({ key, label }) => (
                            <SocialField
                                key={key}
                                platform={key}
                                label={label}
                                value={form[key]}
                                onChange={(val) => onSocialChange(key, val)}
                            />
                        ))}
                    </div>
                </div>

                {/* ══ 4 · Referrals, Friends & Sources ═════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="4">
                        Connections & Sources
                        <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— optional</span>
                    </SectionHead>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

                        <DynamicList
                            label="Referrals"
                            items={form.playerNames}
                            onAdd={refs.add}
                            onChange={refs.change}
                            onRemove={refs.remove}
                            placeholder="Player name"
                        />

                        <DynamicList
                            label="Friends"
                            icon={IUsers}
                            items={form.friends}
                            onAdd={frds.add}
                            onChange={frds.change}
                            onRemove={frds.remove}
                            placeholder="Username or name"
                        />

                        <DynamicList
                            label="Sources"
                            items={form.sources}
                            onAdd={srcs.add}
                            onChange={srcs.change}
                            onRemove={srcs.remove}
                            placeholder="e.g. Instagram Ad"
                        />

                    </div>
                </div>

                {/* ── Action bar ── */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAddPlayer(false)} disabled={loading}
                        style={{ flex: 1, padding: '13px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', color: C.slate, opacity: loading ? 0.6 : 1 }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.skyDk; }}
                        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.sky; }}
                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#e2e8f0' : C.sky, color: loading ? C.grayLt : '#fff', transition: 'background .2s' }}>
                        {loading
                            ? <><span style={{ fontSize: '15px' }}>⏳</span> Creating Player…</>
                            : <><ICheck /> Create Player</>
                        }
                    </button>
                </div>

            </form>
        </div>
    );
}