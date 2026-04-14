import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, X, Lock } from 'lucide-react'
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
const IUsers = () => <Ico d={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z']} />;
const IShield = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IWarn = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={13} />;
const ISearch = () => <Ico d={['M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z', 'M16 16l4.5 4.5']} />;
const IWallet = () => <Ico d={['M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z', 'M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z', 'M12 14a1 1 0 100-2 1 1 0 000 2z']} />;
const ILink = () => <Ico d={['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71']} />;

// ─── Design tokens ────────────────────────────────────────────────────────────
function Card({ children, style = {}, accent }) {
    return (
        <div style={{
            background: "var(--color-background-primary)",
            borderRadius: "var(--border-radius-lg)",
            border: "0.5px solid var(--color-border-tertiary)",
            ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
            ...style,
        }}>
            {children}
        </div>
    );
}
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
const SOCIAL_RULES = {
    facebook: { pattern: /^[a-zA-Z0-9.]{1,50}$/, hint: '1–50 chars: letters, numbers, dots only', url: (h) => `https://facebook.com/${h}` },
    telegram: { pattern: /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/, hint: '5–32 chars, starts with a letter, letters/numbers/underscores', url: (h) => `https://t.me/${h}` },
    instagram: { pattern: /^[a-zA-Z0-9._]{1,30}$/, hint: '1–30 chars: letters, numbers, dots, underscores', url: (h) => `https://instagram.com/${h}` },
    x: { pattern: /^[a-zA-Z0-9_]{1,15}$/, hint: '1–15 chars: letters, numbers, underscores', url: (h) => `https://x.com/${h}` },
    snapchat: { pattern: /^[a-zA-Z][a-zA-Z0-9._-]{1,14}$/, hint: '2–15 chars, starts with a letter', url: (h) => `https://snapchat.com/add/${h}` },
    chimeTag: { pattern: /^\$[a-zA-Z0-9._-]{2,20}$|^[a-zA-Z0-9._-]{2,20}$/, hint: 'Chime $tag or username (2–20 chars)', url: null },
    cashappTag: { pattern: /^\$[a-zA-Z0-9._-]{1,20}$|^[a-zA-Z0-9._-]{1,20}$/, hint: '$cashtag or username (1–20 chars)', url: (h) => `https://cash.app/${h.startsWith('$') ? h : '$' + h}` },
    paypalEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, hint: 'Valid email address linked to PayPal', url: null },
};

function validateHandle(platform, handle) {
    if (!handle || !handle.trim()) return null;
    const rule = SOCIAL_RULES[platform];
    if (!rule) return null;
    return rule.pattern.test(handle.trim()) ? 'valid' : 'invalid';
}

// ─── Tier badge colors ────────────────────────────────────────────────────────
const TIER_MAP = {
    BRONZE: { bg: '#fed7aa', text: '#92400e', emoji: '🥉' },
    SILVER: { bg: '#e0e7ff', text: '#3730a3', emoji: '🥈' },
    GOLD: { bg: '#fef3c7', text: '#92400e', emoji: '🥇' },
};

// ─── Player search + multi-select picker ──────────────────────────────────────
function PlayerPicker({ label, hint, value, onChange, multi = true }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const dropRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const res = await api.players.getPlayers(1, 10, query.trim(), '');
                setResults(res?.data || []);
                setOpen(true);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 280);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

    const select = (p) => {
        const entry = { id: p.id, name: p.name, username: p.username };
        if (!multi) {
            onChange([entry]);
        } else {
            if (!value.find(x => x.id === p.id)) onChange([...value, entry]);
        }
        setQuery('');
        setResults([]);
        setOpen(false);
    };

    const remove = (id) => onChange(value.filter(p => p.id !== id));

    const TIER_COLORS = {
        GOLD: { bg: '#fef3c7', text: '#92400e' },
        SILVER: { bg: '#e0e7ff', text: '#3730a3' },
        BRONZE: { bg: '#fed7aa', text: '#9a3412' },
    };

    return (
        <div>
            <label style={LABEL}>{label}</label>

            {/* Selected chips */}
            {value.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {value.map(p => (
                        <span key={p.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 8px 4px 10px',
                            background: '#f0f9ff', border: '1px solid #bae6fd',
                            borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#0284c7',
                        }}>
                            {p.name}
                            <span style={{ opacity: 0.55, fontSize: '10px', fontWeight: '400' }}>@{p.username}</span>
                            <button type="button" onClick={() => remove(p.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#0284c7', display: 'flex', alignItems: 'center' }}>
                                <X style={{ width: '12px', height: '12px' }} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search input — hide when single-select and already picked */}
            {(multi || value.length === 0) && (
                <div ref={dropRef} style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name or username…"
                            autoComplete="off"
                            style={{ ...INPUT, paddingLeft: '34px', paddingRight: loading ? '34px' : '12px' }}
                        />
                        {loading && (
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#94a3b8' }}>…</span>
                        )}
                    </div>

                    {/* Dropdown */}
                    {open && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,.12)',
                            overflow: 'hidden', maxHeight: '240px', overflowY: 'auto',
                        }}>
                            {results.length === 0 ? (
                                <div style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>
                                    No players found for "{query}"
                                </div>
                            ) : results.map(p => {
                                const already = value.find(x => x.id === p.id);
                                const tc = TIER_COLORS[p.tier] || TIER_COLORS.BRONZE;
                                return (
                                    <div key={p.id}
                                        onClick={() => !already && select(p)}
                                        onMouseEnter={e => { if (!already) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                        style={{
                                            padding: '10px 16px', cursor: already ? 'not-allowed' : 'pointer',
                                            borderBottom: '1px solid #f1f5f9',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            opacity: already ? 0.45 : 1,
                                        }}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>{p.name}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                                @{p.username}
                                                {p.email ? ` · ${p.email}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#10b981' }}>{fmt(p.balance)}</span>
                                            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '4px', fontWeight: '700', background: tc.bg, color: tc.text }}>
                                                {p.tier}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {hint && <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>{hint}</p>}
        </div>
    );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ onPlayersClick, onDashboardClick }) {
    const navigate = useNavigate();

    return (

        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', flexWrap: 'wrap' }}>
            {[
                { label: 'Dashboard', onClick: () => navigate('/') },
                { label: 'Players', onClick: () => navigate('/?page=players') },
                { label: 'Add New Player', onClick: null },
            ].map((item, i, arr) => (
                <React.Fragment key={i}>
                    {item.onClick
                        ? <button onClick={item.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sky, fontWeight: '600', fontSize: '13px', padding: '2px 6px', borderRadius: '6px' }}
                            onMouseEnter={e => e.currentTarget.style.background = C.skyLt}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>{item.label}</button>
                        : <span style={{ fontWeight: '700', fontSize: '13px', padding: '2px 6px' }}>{item.label}</span>
                    }
                    {i < arr.length - 1 && <span style={{ color: C.grayLt, fontSize: '16px', userSelect: 'none' }}>›</span>}
                </React.Fragment>
            ))}

        </nav>
    );
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
    const t = TIER_MAP[tier] || TIER_MAP.BRONZE;
    return (
        <span style={{ padding: '2px 9px', background: t.bg, color: t.text, borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginLeft: '8px' }}>
            {t.emoji} {tier.charAt(0) + tier.slice(1).toLowerCase()}
        </span>
    );
}

// ─── Social / payment field with live format-validation feedback ──────────────
function ValidatedField({ platform, label, value, onChange, placeholder }) {
    const [focused, setFocused] = useState(false);
    const status = validateHandle(platform, value);
    const rule = SOCIAL_RULES[platform];
    const hasVal = value && value.trim().length > 0;
    const isAt = !['chimeTag', 'cashappTag', 'paypalEmail'].includes(platform);

    const borderColor = !hasVal ? C.border
        : status === 'valid' ? '#22c55e'
            : status === 'invalid' ? C.red
                : C.border;

    const profileUrl = status === 'valid' && rule?.url ? rule.url(value.trim()) : null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={LABEL}>{label}</label>
                {hasVal && status === 'valid' && profileUrl && (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', fontWeight: '700', color: C.sky, textDecoration: 'none' }}>
                        View ↗
                    </a>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                {isAt && (
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>@</span>
                )}
                <input
                    type={platform === 'paypalEmail' ? 'email' : 'text'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder || (isAt ? 'handle' : 'value')}
                    style={{
                        ...INPUT,
                        paddingLeft: isAt ? '26px' : '12px',
                        paddingRight: hasVal ? '28px' : '12px',
                        borderColor,
                        boxShadow: focused ? `0 0 0 3px ${borderColor}22` : 'none',
                    }}
                />
                {hasVal && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: status === 'valid' ? '#22c55e' : C.red }} />
                )}
            </div>
            {hasVal && (focused || status === 'invalid') && (
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: status === 'valid' ? '#16a34a' : C.red, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4' }}>
                    {status === 'valid'
                        ? <><ICheck /> Format looks good</>
                        : <><IWarn /> {rule.hint}</>
                    }
                </p>
            )}
            {!hasVal && focused && (
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: C.grayLt, lineHeight: '1.4' }}>{rule?.hint}</p>
            )}
        </div>
    );
}

// ─── Sources dynamic list ─────────────────────────────────────────────────────
function SourcesList({ items, onAdd, onChange, onRemove }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <label style={{ ...LABEL, marginBottom: 0 }}>Sources</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {items.map((val, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>#{i + 1}</span>
                            <input
                                type="text" value={val}
                                onChange={(e) => onChange(i, e.target.value)}
                                placeholder="e.g. Instagram Ad"
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
                <button type="button" onClick={onAdd}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: `1px dashed ${C.border}`, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: C.sky, fontSize: '12px', fontWeight: '600', justifyContent: 'center' }}>
                    <IPlus /> Add Source
                </button>
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
    const navigate = useNavigate();

    const goToPlayers = () => { setAddPlayer(false); };
    const goToDashboard = () => { setAddPlayer(false); navigate('/'); };

    const EMPTY = {
        name: '', username: '', email: '', phone: '',
        facebook: '', telegram: '', instagram: '', x: '', snapchat: '',
        // payment handles
        chimeTag: '', cashappTag: '', paypalEmail: '',
        tier: 'BRONZE',
        // player pickers — store as { id, name, username }[]
        referrals: [],
        friends: [],
        sources: [''],
    };

    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const onChange = (e) => set(e.target.name, e.target.value);

    const srcs = {
        add: () => setForm(p => ({ ...p, sources: [...p.sources, ''] })),
        change: (i, v) => setForm(p => ({ ...p, sources: p.sources.map((x, idx) => idx === i ? v : x) })),
        remove: (i) => setForm(p => ({ ...p, sources: p.sources.filter((_, idx) => idx !== i) })),
    };

    const onSocialChange = useCallback((platform, val) => {
        setForm(p => ({ ...p, [platform]: val }));
    }, []);

    // Validate all handle-type fields before submit
    const VALIDATED_FIELDS = ['facebook', 'telegram', 'instagram', 'x', 'snapchat', 'chimeTag', 'cashappTag', 'paypalEmail'];
    const socialWarnings = VALIDATED_FIELDS.filter(
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

        if (!form.name.trim()) return setError('Full name is required.');
        if (!form.username.trim()) return setError('Username is required.');

        if (socialWarnings.length > 0) {
            const names = socialWarnings.map(s => {
                const labels = { chimeTag: 'Chime Tag', cashappTag: 'Cash App Tag', paypalEmail: 'PayPal Email' };
                return labels[s] || s.charAt(0).toUpperCase() + s.slice(1);
            }).join(', ');
            setError(`Please fix the format for: ${names}. Clear the field to leave it blank, or correct the value.`);
            return;
        }

        try {
            setLoading(true);
            await api.players.createPlayer({
                name: form.name.trim(),
                username: form.username.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                tier: form.tier,
                facebook: form.facebook.trim() || null,
                telegram: form.telegram.trim() || null,
                instagram: form.instagram.trim() || null,
                x: form.x.trim() || null,
                snapchat: form.snapchat.trim() || null,
                chimeTag: form.chimeTag.trim() || null,
                cashappTag: form.cashappTag.trim() || null,
                paypalEmail: form.paypalEmail.trim() || null,
                // send IDs — backend resolveUsers already handles numeric IDs
                referrals: form.referrals.map(p => String(p.id)),
                friends: form.friends.map(p => String(p.id)),
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
        { key: 'facebook', label: 'Facebook', ph: 'johnsmith' },
        { key: 'telegram', label: 'Telegram', ph: 'johnsmith' },
        { key: 'instagram', label: 'Instagram', ph: 'johnsmith' },
        { key: 'x', label: 'X / Twitter', ph: 'johnsmith' },
        { key: 'snapchat', label: 'Snapchat', ph: 'johnsmith' },
    ];

    const payments = [
        { key: 'chimeTag', label: 'Chime Tag', ph: '$ChimeUsername' },
        { key: 'cashappTag', label: 'Cash App Tag', ph: '$CashtTag' },
        { key: 'paypalEmail', label: 'PayPal Email', ph: 'email@paypal.com' },
    ];

    // ── No active shift ─────────────────────────────────────────────────────────
        if (!shiftActive) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <button onClick={() => navigate('/shifts')} style={{ alignSelf: "flex-start", padding: "9px 18px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", fontWeight: "500", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    Start Shift
                </button>
                <Card style={{ padding: "14px 16px", borderLeft: "3px solid var(--color-border-warning)", background: "var(--color-background-warning)" }}>
                    <p style={{ fontWeight: "500", color: "var(--color-text-warning)", margin: "0 0 2px", fontSize: "13px" }}>Shift required</p>
                    <p style={{ color: "var(--color-text-warning)", margin: 0, fontSize: "12px" }}>You must have an active shift to grant bonuses and view tasks.</p>
                </Card>
                <Card style={{ padding: "60px 24px", textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", background: "var(--color-background-secondary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <Lock style={{ width: "20px", height: "20px", color: "var(--color-text-tertiary)" }} />
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "500", color: "var(--color-text-primary)" }}>Dashboard locked</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-tertiary)" }}>Go to Shifts and start your shift first.</p>
                </Card>
            </div>
        );
    }

    // ── Active shift: show form ─────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 'inherit' }}>

            <Breadcrumb onDashboardClick={goToDashboard} onPlayersClick={goToPlayers} />

            {/* Header */}
            <div style={{ padding: '14px 18px', background: C.skyLt, borderLeft: `4px solid ${C.sky}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <IUser />
                <div>
                    <p style={{ fontWeight: '700', margin: '0 0 2px', fontSize: '14px' }}>Add a New Player</p>
                    <p style={{ color: '#0369a1', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                        Fill in the player's details. Social and payment handles are validated for format. They'll be immediately active in the system.
                    </p>
                </div>
            </div>

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

                        <Field label="Email Address" hint="Optional">
                            <IconInput IconEl={IMail} type="email" name="email" value={form.email} onChange={onChange} placeholder="player@email.com" />
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

                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', padding: '10px 14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.gray }}><IShield /><span>Format validated as you type</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Valid format</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.red }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.red, display: 'inline-block' }} />Invalid format</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {socials.map(({ key, label, ph }) => (
                            <ValidatedField
                                key={key}
                                platform={key}
                                label={label}
                                value={form[key]}
                                onChange={(val) => onSocialChange(key, val)}
                                placeholder={ph}
                            />
                        ))}
                    </div>
                </div>

                {/* ══ 4 · Payment Handles ═══════════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="4">
                        Payment Handles
                        <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— all optional</span>
                    </SectionHead>

                    {/* Subtle info banner */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '18px', padding: '10px 14px', background: C.violetLt, border: `1px solid ${C.violetBdr}`, borderRadius: '8px' }}>
                        <span style={{ color: C.violet, display: 'flex', flexShrink: 0, marginTop: '1px' }}><IWallet /></span>
                        <p style={{ margin: 0, fontSize: '12px', color: C.violet, lineHeight: '1.5' }}>
                            These are used for cashout payouts. Leave blank if unknown — they can be added from the player profile later.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        {payments.map(({ key, label, ph }) => (
                            <ValidatedField
                                key={key}
                                platform={key}
                                label={label}
                                value={form[key]}
                                onChange={(val) => onSocialChange(key, val)}
                                placeholder={ph}
                            />
                        ))}
                    </div>
                </div>

                {/* ══ 5 · Connections & Sources ════════════════════════════════ */}
                <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
                    <SectionHead step="5">
                        Connections & Sources
                        <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— optional</span>
                    </SectionHead>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

                        {/* Referral — single select */}
                        <PlayerPicker
                            label="Referred By"
                            hint="The player who referred this new player (single)"
                            value={form.referrals}
                            onChange={(val) => set('referrals', val)}
                            multi={false}
                        />

                        {/* Friends — multi select */}
                        <PlayerPicker
                            label="Friends"
                            hint="Other players this person knows (multi)"
                            value={form.friends}
                            onChange={(val) => set('friends', val)}
                            multi={true}
                        />

                        {/* Sources — free text list */}
                        <SourcesList
                            items={form.sources}
                            onAdd={srcs.add}
                            onChange={srcs.change}
                            onRemove={srcs.remove}
                        />

                    </div>
                </div>

                {/* ── Action bar ── */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={goToPlayers} disabled={loading}
                        style={{ flex: 1, padding: '13px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', color: C.slate, opacity: loading ? 0.6 : 1 }}>
                        ← Back to Players
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
