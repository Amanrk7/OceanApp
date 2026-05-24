import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Lock, Eye, EyeOff, Shield, Users } from 'lucide-react';
import { AddPlayerContext } from '../Context/addPlayer';
import { ShiftStatusContext } from '../Context/membershiftStatus';
import { useToast } from '../Context/toastContext';
import { api } from '../api';
import { CurrentUserContext } from '../Context/currentUser';

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const Ico = ({ d, size = 15, stroke = 'currentColor', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const ICheck  = () => <Ico d="M20 6L9 17l-5-5" />;
const IPlus   = () => <Ico d="M12 5v14M5 12h14" />;
const IX      = () => <Ico d="M18 6L6 18M6 6l12 12" />;
const IUser   = () => <Ico d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']} />;
const IMail   = () => <Ico d={['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6']} />;
const IPhone  = () => <Ico d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IUsers  = () => <Ico d={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z']} />;
const IShield = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IWarn   = () => <Ico d={['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={13} />;
const IWallet = () => <Ico d={['M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z', 'M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z', 'M12 14a1 1 0 100-2 1 1 0 000 2z']} />;
const ILock   = () => <Ico d={['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4']} />;

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fcd34d',
  violet: '#7c3aed', violetLt: '#f5f3ff', violetBdr: '#ddd6fe',
  indigo: '#4f46e5', indigoLt: '#eef2ff',
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
  transition: 'border-color .15s, box-shadow .15s',
};
const ERROR_INPUT = {
  ...INPUT, borderColor: C.red, boxShadow: `0 0 0 3px ${C.red}18`,
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p style={{ margin: '4px 0 0', fontSize: '11px', color: C.red, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4' }}>
      <span style={{ flexShrink: 0, marginTop: '1px' }}><IWarn /></span>
      {message}
    </p>
  );
}

const SOCIAL_RULES = {
  facebook:   { pattern: /^[a-zA-Z0-9.]{1,50}$|^https?:\/\/(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)\/.+$/i, hint: 'Handle or facebook.com URL', url: (h) => h.startsWith('http') ? h : `https://facebook.com/${h}` },
  telegram:   { pattern: /^[a-zA-Z][a-zA-Z0-9_]{4,31}$|^https?:\/\/(www\.)?t\.me\/.+$/i, hint: '5–32 char handle or t.me URL', url: (h) => h.startsWith('http') ? h : `https://t.me/${h}` },
  instagram:  { pattern: /^[a-zA-Z0-9._]{1,30}$|^https?:\/\/(www\.)?instagram\.com\/.+$/i, hint: '1–30 char handle or instagram.com URL', url: (h) => h.startsWith('http') ? h : `https://instagram.com/${h}` },
  x:          { pattern: /^[a-zA-Z0-9_]{1,15}$|^https?:\/\/(www\.)?(x\.com|twitter\.com)\/.+$/i, hint: '1–15 char handle or x.com URL', url: (h) => h.startsWith('http') ? h : `https://x.com/${h}` },
  snapchat:   { pattern: /^[a-zA-Z][a-zA-Z0-9._-]{1,14}$|^https?:\/\/(www\.)?snapchat\.com\/.+$/i, hint: '2–15 char handle or snapchat.com URL', url: (h) => h.startsWith('http') ? h : `https://snapchat.com/add/${h}` },
  chimeTag:   { pattern: /^\$[a-zA-Z0-9._-]{2,20}$|^[a-zA-Z0-9._-]{2,20}$/, hint: 'Chime $tag or username (2–20 chars)', url: null },
  cashappTag: { pattern: /^\$[a-zA-Z0-9._-]{1,20}$|^[a-zA-Z0-9._-]{1,20}$/, hint: '$cashtag or username (1–20 chars)', url: (h) => `https://cash.app/${h.startsWith('$') ? h : '$' + h}` },
  paypalEmail:{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, hint: 'Valid PayPal email address', url: null },
};

function validateHandle(platform, handle) {
  if (!handle || !handle.trim()) return null;
  const rule = SOCIAL_RULES[platform];
  if (!rule) return null;
  return rule.pattern.test(handle.trim()) ? 'valid' : 'invalid';
}

const TIER_MAP = {
  BRONZE: { bg: '#fed7aa', text: '#92400e', emoji: '🥉' },
  SILVER: { bg: '#e0e7ff', text: '#3730a3', emoji: '🥈' },
  GOLD:   { bg: '#fef3c7', text: '#92400e', emoji: '🥇' },
};
const FIELD_LABELS = {
  name: 'Full name', username: 'Username', email: 'Email address', phone: 'Phone number',
  facebook: 'Facebook', telegram: 'Telegram', instagram: 'Instagram',
  x: 'X / Twitter', snapchat: 'Snapchat', chimeTag: 'Chime Tag',
  cashappTag: 'Cash App Tag', paypalEmail: 'PayPal Email',
};

// ─── Tab Toggle (matching deposit/cashout style) ───────────────────────────────
function TabToggle({ tab, setTab, isSuperAdmin }) {
  const tabs = [
    { id: 'player', icon: '↙', label: 'Add Player' },
    ...(isSuperAdmin ? [{ id: 'TEAM_MEMBER', icon: '🛡', label: 'Add Member / Admin' }] : []),
  ];
  return (
    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px', width: 'fit-content' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: '7px',
            background: tab === t.id ? C.white : 'transparent',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.10)' : 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
            color: tab === t.id ? C.slate : C.gray,
            transition: 'all .15s',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '14px' }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Player search picker ──────────────────────────────────────────────────────
function PlayerPicker({ label, hint, value, onChange, multi = true }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const dropRef  = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.players.getPlayers(1, 10, query.trim(), '');
        setResults(res?.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const select = (p) => {
    const entry = { id: p.id, name: p.name, username: p.username };
    if (!multi) onChange([entry]);
    else if (!value.find(x => x.id === p.id)) onChange([...value, entry]);
    setQuery(''); setResults([]); setOpen(false);
  };
  const remove = (id) => onChange(value.filter(p => p.id !== id));

  return (
    <div>
      <label style={LABEL}>{label}</label>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {value.map(p => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px 4px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#0284c7' }}>
              {p.name}
              <span style={{ opacity: 0.55, fontSize: '10px', fontWeight: '400' }}>@{p.username}</span>
              <button type="button" onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#0284c7', display: 'flex', alignItems: 'center' }}>
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            </span>
          ))}
        </div>
      )}
      {(multi || value.length === 0) && (
        <div ref={dropRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or username…" autoComplete="off" style={{ ...INPUT, paddingLeft: '34px' }} />
          </div>
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,.12)', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
              {results.length === 0
                ? <div style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>No players found for "{query}"</div>
                : results.map(p => {
                  const already = value.find(x => x.id === p.id);
                  return (
                    <div key={p.id} onClick={() => !already && select(p)}
                      style={{ padding: '10px 16px', cursor: already ? 'not-allowed' : 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: already ? 0.45 : 1 }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>@{p.username}</div>
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#10b981' }}>${parseFloat(p.balance || 0).toFixed(2)}</span>
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

// ─── Shared UI helpers ─────────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label style={LABEL}>
        {label}{required && <span style={{ color: C.red, marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {error
        ? <FieldError message={error} />
        : hint && <p style={{ margin: '4px 0 0', fontSize: '11px', color: C.grayLt, lineHeight: '1.4' }}>{hint}</p>
      }
    </div>
  );
}

function IconInput({ IconEl, hasError, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: hasError ? C.red : C.grayLt, display: 'flex', pointerEvents: 'none' }}>
        <IconEl />
      </span>
      <input {...props} style={{ ...(hasError ? ERROR_INPUT : INPUT), paddingLeft: '36px', ...props.style }} />
    </div>
  );
}

function SectionHead({ step, children, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
      {step && (
        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: color || C.sky, color: '#fff', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

function ValidatedField({ platform, label, value, onChange, placeholder, error, onBlurValidate }) {
  const [focused, setFocused] = useState(false);
  const status = validateHandle(platform, value);
  const rule = SOCIAL_RULES[platform];
  const hasVal = value && value.trim().length > 0;
  const isUrl = value && value.trim().startsWith('http');
  const isAt  = !isUrl && !['chimeTag', 'cashappTag', 'paypalEmail'].includes(platform);

  const borderColor = error ? C.red : !hasVal ? C.border : status === 'valid' ? '#22c55e' : status === 'invalid' ? C.red : C.border;
  const shadowColor = error ? C.red : (status === 'valid' && hasVal) ? '#22c55e' : (status === 'invalid' && hasVal) ? C.red : 'transparent';
  const profileUrl = status === 'valid' && rule?.url ? rule.url(value.trim()) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label style={LABEL}>{label}</label>
        {hasVal && status === 'valid' && profileUrl && (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', fontWeight: '700', color: C.sky, textDecoration: 'none' }}>View ↗</a>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        {isAt && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: C.grayLt, pointerEvents: 'none' }}>@</span>}
        <input
          type={platform === 'paypalEmail' ? 'email' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (onBlurValidate) onBlurValidate(platform, value); }}
          placeholder={placeholder || (isAt ? 'handle' : 'value')}
          style={{ ...INPUT, paddingLeft: isAt ? '26px' : '12px', paddingRight: hasVal ? '28px' : '12px', borderColor, boxShadow: focused ? `0 0 0 3px ${shadowColor}22` : error ? `0 0 0 3px ${C.red}18` : 'none' }}
        />
        {hasVal && !error && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: status === 'valid' ? '#22c55e' : C.red }} />}
      </div>
      {error ? <FieldError message={error} />
        : hasVal && (focused || status === 'invalid') ? (
          <p style={{ margin: '4px 0 0', fontSize: '10px', color: status === 'valid' ? '#16a34a' : C.red, display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.4' }}>
            {status === 'valid' ? <><ICheck /> Format looks good</> : <><IWarn /> {rule.hint}</>}
          </p>
        ) : !hasVal && focused ? (
          <p style={{ margin: '4px 0 0', fontSize: '10px', color: C.grayLt, lineHeight: '1.4' }}>{rule?.hint}</p>
        ) : null}
    </div>
  );
}

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
              <input type="text" value={val} onChange={(e) => onChange(i, e.target.value)} placeholder="e.g. Instagram Ad" style={{ ...INPUT, paddingLeft: '30px', fontSize: '13px' }} />
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => onRemove(i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', flexShrink: 0, background: C.redLt, border: `1px solid ${C.redBdr}`, borderRadius: '7px', cursor: 'pointer', color: C.red }}>
                <IX />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: `1px dashed ${C.border}`, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: C.sky, fontSize: '12px', fontWeight: '600', justifyContent: 'center' }}>
          <IPlus /> Add Source
        </button>
      </div>
    </div>
  );
}

// ─── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ tab }) {
  const navigate = useNavigate();
  const lastLabel = tab === 'member' ? 'Add Member / Admin' : 'Add New Player';
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {[
        { label: 'Dashboard', onClick: () => navigate('/') },
        { label: 'Players', onClick: () => navigate('/?page=players') },
        { label: lastLabel, onClick: null },
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

// ═══════════════════════════════════════════════════════════════
// ADD MEMBER / ADMIN FORM
// ═══════════════════════════════════════════════════════════════
function AddMemberForm({ onSuccess, onCancel }) {
  const { add: toast } = useToast();

  const EMPTY = { name: '', username: '', email: '', phone: '', password: '', confirmPassword: '', roleType: 'TEAM_MEMBER', storeAccess: [1] };
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [showPw, setShowPw]   = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [slotInfo, setSlotInfo] = useState(null); // { nextSlot, nextSlotNumber, usedCount, totalSlots }

  // Fetch available slot info on mount
  useEffect(() => {
    api.members?.getAvailableRoles().then(res => setSlotInfo(res.data)).catch(() => {});
  }, []);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const toggleStore = (storeId) => {
    setForm(p => ({
      ...p,
      storeAccess: p.storeAccess.includes(storeId)
        ? p.storeAccess.filter(s => s !== storeId)
        : [...p.storeAccess, storeId],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Full name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.password)        e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.storeAccess.length === 0) e.storeAccess = 'Select at least one store';
    // if (form.roleType === 'TEAM_MEMBER' && slotInfo && !slotInfo.nextSlot) {
    //   e.roleType = 'All 8 team slots are filled. Remove a member first.';
    // }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast('Please fix the errors before submitting.', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await api.members.createMember({
        username:    form.username.trim(),
        name:        form.name.trim(),
        email:       form.email.trim() || null,
        phone:       form.phone.trim() || null,
        password:    form.password,
        roleType:    form.roleType,
        storeAccess: form.storeAccess,
      });
      toast(res.message || 'Member created!', 'success');
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('username')) {
        setErrors(p => ({ ...p, username: 'Username already in use' }));
        toast('Username already taken.', 'error');
      } else {
        toast(msg || 'Failed to create member.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

//   const nextSlotNum = slotInfo?.nextSlotNumber;
//   const usedCount   = slotInfo?.usedCount ?? '…';
//   // const totalSlots  = slotInfo?.totalSlots ?? 8;
//   // const slotsLeft   = slotInfo ? totalSlots - usedCount : '…';
//   const usedCount   = slotInfo?.usedCount ?? 0;
// const nextSlotNum = slotInfo?.nextSlotNumber;
  const nextSlotNum = slotInfo?.nextSlotNumber;
const usedCount   = slotInfo?.usedCount ?? 0;

// Remove totalSlots and slotsLeft entirely, replace the info text:

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header banner */}
      <div style={{ padding: '14px 18px', background: 'none', borderLeft: `4px solid ${C.indigo}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <IShield />
        <div>
          <p style={{ fontWeight: '700', margin: '0 0 2px', fontSize: '14px' }}>Add a Member or Admin</p>
          <p style={{ color: C.gray, margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
  Team members are auto-assigned to the next available slot.
  {slotInfo && <> Currently <strong>{usedCount}</strong> member{usedCount !== 1 ? 's' : ''} — next slot will be <strong style={{ color: C.green }}>Team {nextSlotNum}</strong>.</>}
</p>
        </div>
      </div>

      {/* ── Section 1: Identity ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="1" color={C.indigo}>Identity</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          <Field label="Full Name" required error={errors.name}>
            <IconInput IconEl={IUser} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane Doe" hasError={!!errors.name} />
          </Field>

          <Field label="Username" required error={errors.username}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: errors.username ? C.red : C.grayLt, pointerEvents: 'none' }}>@</span>
              <input type="text" value={form.username} onChange={e => set('username', e.target.value)} placeholder="member_handle" style={{ ...(errors.username ? ERROR_INPUT : INPUT), paddingLeft: '27px' }} />
            </div>
          </Field>

          <Field label="Email Address" hint="Optional" error={errors.email}>
            <IconInput IconEl={IMail} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="member@example.com" hasError={!!errors.email} />
          </Field>

          <Field label="Phone Number" hint="Optional" error={errors.phone}>
            <IconInput IconEl={IPhone} type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" hasError={!!errors.phone} />
          </Field>

        </div>
      </div>

      {/* ── Section 2: Password ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="2" color={C.indigo}>Password</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          <Field label="Password" required error={errors.password}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: errors.password ? C.red : C.grayLt, display: 'flex', pointerEvents: 'none' }}>
                <ILock />
              </span>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min. 6 characters"
                style={{ ...(errors.password ? ERROR_INPUT : INPUT), paddingLeft: '36px', paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, display: 'flex', padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password" required error={errors.confirmPassword}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: errors.confirmPassword ? C.red : C.grayLt, display: 'flex', pointerEvents: 'none' }}>
                <ILock />
              </span>
              <input
                type={showCpw ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
                style={{ ...(errors.confirmPassword ? ERROR_INPUT : INPUT), paddingLeft: '36px', paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowCpw(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, display: 'flex', padding: 0 }}>
                {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

        </div>
      </div>

      {/* ── Section 3: Role & Store Access ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="3" color={C.indigo}>Role & Access</SectionHead>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Role type selector */}
          <div>
            <label style={LABEL}>Role Type <span style={{ color: C.red }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Team Member option */}
              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px',
                  border: `1.5px solid ${form.roleType === 'TEAM_MEMBER' ? C.indigo : C.border}`,
                  borderRadius: '10px', cursor: 'pointer',
                  background: form.roleType === 'TEAM_MEMBER' ? C.indigoLt : C.white,
                  transition: 'all .15s',
                }}
              >
                <input type="radio" name="roleType" value="TEAM_MEMBER" checked={form.roleType === 'TEAM_MEMBER'} onChange={() => set('roleType', 'TEAM_MEMBER')} style={{ marginTop: '2px', accentColor: C.indigo }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: C.slate }}>
                    Team Member
                    {slotInfo?.nextSlot && form.roleType === 'TEAM_MEMBER' && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', background: C.indigoLt, color: C.indigo, padding: '2px 8px', borderRadius: '20px' }}>
                        → Slot {nextSlotNum} auto-assigned
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '2px' }}>
                    Can manage players and run shifts. Auto-gets next free team slot.
                  </div>
                  
                </div>
              </label>

              {/* Admin option */}
              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px',
                  border: `1.5px solid ${form.roleType === 'ADMIN' ? C.violet : C.border}`,
                  borderRadius: '10px', cursor: 'pointer',
                  background: form.roleType === 'ADMIN' ? C.violetLt : C.white,
                  transition: 'all .15s',
                }}
              >
                <input type="radio" name="roleType" value="ADMIN" checked={form.roleType === 'ADMIN'} onChange={() => set('roleType', 'ADMIN')} style={{ marginTop: '2px', accentColor: C.violet }} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: C.slate }}>
                    Admin
                    <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', background: C.violetLt, color: C.violet, padding: '2px 8px', borderRadius: '20px' }}>Full access</span>
                  </div>
                  <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '2px' }}>
                    Can approve transactions, manage games, wallets, and team.
                  </div>
                </div>
              </label>

            </div>
            {errors.roleType && <FieldError message={errors.roleType} />}
          </div>

          {/* Store access */}
          <div>
            <label style={LABEL}>Store Access <span style={{ color: C.red }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map(storeId => (
                <label key={storeId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
                    border: `1.5px solid ${form.storeAccess.includes(storeId) ? C.sky : C.border}`,
                    borderRadius: '10px', cursor: 'pointer',
                    background: form.storeAccess.includes(storeId) ? C.skyLt : C.white,
                    transition: 'all .15s',
                  }}
                >
                  <input type="checkbox" checked={form.storeAccess.includes(storeId)} onChange={() => toggleStore(storeId)} style={{ accentColor: C.sky }} />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: C.slate }}>Store {storeId}</div>
                    <div style={{ fontSize: '11px', color: C.grayLt }}>
                      {storeId === 1 ? 'Primary store' : 'Secondary store'}
                    </div>
                  </div>
                  {form.storeAccess.includes(storeId) && (
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: C.sky }}>✓</span>
                  )}
                </label>
              ))}
            </div>
            {errors.storeAccess && <FieldError message={errors.storeAccess} />}
          </div>

        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" onClick={onCancel} disabled={loading}
          style={{ flex: 1, padding: '13px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', color: C.slate, opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
          ← Back
        </button>
        <button type="submit" disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#4338ca'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.indigo; }}
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#e2e8f0' : C.indigo, color: loading ? C.grayLt : '#fff', transition: 'background .2s', fontFamily: 'inherit' }}>
          {loading
            ? <><span style={{ fontSize: '15px' }}>⏳</span> Creating…</>
            : <><IShield /> Create {form.roleType === 'ADMIN' ? 'Admin' : 'Team Member'}</>
          }
        </button>
      </div>

    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD PLAYER FORM
// ═══════════════════════════════════════════════════════════════
function AddPlayerForm({ onSuccess, onCancel }) {
  const { add: toast } = useToast();

  const EMPTY = {
    name: '', username: '', email: '', phone: '',
    facebook: '', telegram: '', instagram: '', x: '', snapchat: '',
    chimeTag: '', cashappTag: '', paypalEmail: '',
    tier: 'BRONZE',
    referrals: [],
    friends: [],
    sources: [''],
  };

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onChange = (e) => {
    set(e.target.name, e.target.value);
    if (fieldErrors[e.target.name]) setFieldErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const srcs = {
    add:    () => setForm(p => ({ ...p, sources: [...p.sources, ''] })),
    change: (i, v) => setForm(p => ({ ...p, sources: p.sources.map((x, idx) => idx === i ? v : x) })),
    remove: (i) => setForm(p => ({ ...p, sources: p.sources.filter((_, idx) => idx !== i) })),
  };

  const onSocialChange = useCallback((platform, val) => {
    setForm(p => ({ ...p, [platform]: val }));
    setFieldErrors(p => ({ ...p, [platform]: '' }));
  }, []);

  const onSocialBlur = useCallback((platform, val) => {
    if (!val || !val.trim()) return;
    const status = validateHandle(platform, val);
    if (status === 'invalid') {
      const rule = SOCIAL_RULES[platform];
      setFieldErrors(p => ({ ...p, [platform]: rule?.hint || 'Invalid format' }));
    } else {
      setFieldErrors(p => ({ ...p, [platform]: '' }));
    }
  }, []);

  const onRequiredBlur = useCallback((fieldName, val) => {
    if (!val || !val.trim()) setFieldErrors(p => ({ ...p, [fieldName]: `${FIELD_LABELS[fieldName] || fieldName} is required` }));
    else setFieldErrors(p => ({ ...p, [fieldName]: '' }));
  }, []);

  const VALIDATED_FIELDS = ['facebook', 'telegram', 'instagram', 'x', 'snapchat', 'chimeTag', 'cashappTag', 'paypalEmail'];

  const selectStyle = {
    ...INPUT, cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const missingRequired = [];
    if (!form.name.trim())     { newErrors.name     = 'Full name is required'; missingRequired.push('Full name'); }
    if (!form.username.trim()) { newErrors.username = 'Username is required';  missingRequired.push('Username'); }
    const formatErrors = [];
    VALIDATED_FIELDS.forEach(platform => {
      if (form[platform] && form[platform].trim()) {
        const status = validateHandle(platform, form[platform]);
        if (status === 'invalid') {
          const rule = SOCIAL_RULES[platform];
          newErrors[platform] = rule?.hint || 'Invalid format';
          formatErrors.push(FIELD_LABELS[platform] || platform);
        }
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(p => ({ ...p, ...newErrors }));
      if (missingRequired.length > 0) toast(`Missing: ${missingRequired.join(', ')}.`, 'error');
      else if (formatErrors.length > 0) toast(`Fix format for: ${formatErrors.join(', ')}.`, 'error');
      return;
    }
    try {
      setLoading(true);
      await api.players.createPlayer({
        name:        form.name.trim(),
        username:    form.username.trim(),
        email:       form.email.trim() || null,
        phone:       form.phone.trim() || null,
        tier:        form.tier,
        facebook:    form.facebook.trim() || null,
        telegram:    form.telegram.trim() || null,
        instagram:   form.instagram.trim() || null,
        x:           form.x.trim() || null,
        snapchat:    form.snapchat.trim() || null,
        chimeTag:    form.chimeTag.trim() || null,
        cashappTag:  form.cashappTag.trim() || null,
        paypalEmail: form.paypalEmail.trim() || null,
        referrals:   form.referrals.map(p => String(p.id)),
        friends:     form.friends.map(p => String(p.id)),
        sources:     form.sources.filter(s => s.trim()),
      });
      toast(`Player "${form.name}" created successfully!`, 'success');
      setTimeout(() => onSuccess?.(), 1400);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('username')) {
        setFieldErrors(p => ({ ...p, username: 'This username is already taken' }));
        toast('Username already taken.', 'error');
      } else if (msg.toLowerCase().includes('email')) {
        setFieldErrors(p => ({ ...p, email: 'This email is already in use' }));
        toast('Email already in use.', 'error');
      } else {
        toast(msg || 'Failed to create player. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const socials  = [
    { key: 'facebook', label: 'Facebook', ph: 'johnsmith' },
    { key: 'telegram', label: 'Telegram', ph: 'johnsmith' },
    { key: 'instagram', label: 'Instagram', ph: 'johnsmith' },
    { key: 'x', label: 'X / Twitter', ph: 'johnsmith' },
    { key: 'snapchat', label: 'Snapchat', ph: 'johnsmith' },
  ];
  const payments = [
    { key: 'chimeTag',    label: 'Chime Tag',    ph: '$ChimeUsername' },
    { key: 'cashappTag',  label: 'Cash App Tag',  ph: '$CashTag' },
    { key: 'paypalEmail', label: 'PayPal Email',  ph: 'email@paypal.com' },
  ];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header banner */}
      <div style={{ padding: '14px 18px', background: 'none', borderLeft: `4px solid ${C.sky}`, borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <IUser />
        <div>
          <p style={{ fontWeight: '700', margin: '0 0 2px', fontSize: '14px' }}>Add a New Player</p>
          <p style={{ color: '#0369a1', margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
            Fill in the player's details. Social handles are validated as you type.
          </p>
        </div>
      </div>

      {/* ── 1 · Identity ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="1">Identity & Credentials</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="Full Name" required error={fieldErrors.name}>
            <IconInput IconEl={IUser} type="text" name="name" value={form.name} onChange={onChange} onBlur={() => onRequiredBlur('name', form.name)} placeholder="e.g. John Smith" hasError={!!fieldErrors.name} required />
          </Field>
          <Field label="Username" required error={fieldErrors.username}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: fieldErrors.username ? C.red : C.grayLt, pointerEvents: 'none' }}>@</span>
              <input type="text" name="username" value={form.username} onChange={onChange} onBlur={() => onRequiredBlur('username', form.username)} placeholder="player_handle" style={{ ...(fieldErrors.username ? ERROR_INPUT : INPUT), paddingLeft: '27px' }} required />
            </div>
          </Field>
          <Field label="Email Address" hint="Optional" error={fieldErrors.email}>
            <IconInput IconEl={IMail} type="email" name="email" value={form.email} onChange={onChange} placeholder="player@email.com" hasError={!!fieldErrors.email} />
          </Field>
          <Field label="Phone Number" hint="Optional" error={fieldErrors.phone}>
            <IconInput IconEl={IPhone} type="text" name="phone" value={form.phone} onChange={onChange} placeholder="+1 (555) 000-0000" hasError={!!fieldErrors.phone} />
          </Field>
        </div>
      </div>

      {/* ── 2 · Classification ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="2">Classification</SectionHead>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <span style={LABEL}>Tier</span>
            <TierBadge tier={form.tier} />
          </div>
          <select name="tier" value={form.tier} onChange={onChange} style={{ ...INPUT, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}>
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
          </select>
        </div>
      </div>

      {/* ── 3 · Social Handles ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="3">
          Social Handles
          <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— all optional</span>
        </SectionHead>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', padding: '10px 14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.gray }}><IShield /><span>Format validated as you type</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Valid format</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.red }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.red, display: 'inline-block' }} />Invalid format</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {socials.map(({ key, label, ph }) => (
            <ValidatedField key={key} platform={key} label={label} value={form[key]} onChange={(val) => onSocialChange(key, val)} onBlurValidate={onSocialBlur} placeholder={ph} error={fieldErrors[key]} />
          ))}
        </div>
      </div>

      {/* ── 4 · Payment Handles ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="4">
          Payment Handles
          <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— all optional</span>
        </SectionHead>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '18px', padding: '10px 14px', background: C.violetLt, border: `1px solid ${C.violetBdr}`, borderRadius: '8px' }}>
          <span style={{ color: C.violet, display: 'flex', flexShrink: 0, marginTop: '1px' }}><IWallet /></span>
          <p style={{ margin: 0, fontSize: '12px', color: C.violet, lineHeight: '1.5' }}>
            Used for cashout payouts. Leave blank if unknown — can be added from the player profile later.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {payments.map(({ key, label, ph }) => (
            <ValidatedField key={key} platform={key} label={label} value={form[key]} onChange={(val) => onSocialChange(key, val)} onBlurValidate={onSocialBlur} placeholder={ph} error={fieldErrors[key]} />
          ))}
        </div>
      </div>

      {/* ── 5 · Connections & Sources ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '24px 28px' }}>
        <SectionHead step="5">
          Connections & Sources
          <span style={{ fontWeight: '400', fontSize: '10px', letterSpacing: 0, textTransform: 'none', color: C.grayLt, marginLeft: '6px' }}>— optional</span>
        </SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <PlayerPicker label="Referred By" hint="The player who referred this new player (single)" value={form.referrals} onChange={(val) => set('referrals', val)} multi={false} />
          <PlayerPicker label="Friends" hint="Other players this person knows (multi)" value={form.friends} onChange={(val) => set('friends', val)} multi={true} />
          <SourcesList items={form.sources} onAdd={srcs.add} onChange={srcs.change} onRemove={srcs.remove} />
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" onClick={onCancel} disabled={loading}
          style={{ flex: 1, padding: '13px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', color: C.slate, opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
          ← Back to Players
        </button>
        <button type="submit" disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.skyDk; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.sky; }}
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#e2e8f0' : C.sky, color: loading ? C.grayLt : '#fff', transition: 'background .2s', fontFamily: 'inherit' }}>
          {loading ? <><span style={{ fontSize: '15px' }}>⏳</span> Creating Player…</> : <><ICheck /> Create Player</>}
        </button>
      </div>

    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AddNewPlayer({ onIssueCreated }) {
  const { setAddPlayer }  = useContext(AddPlayerContext);
  const { shiftActive, shiftLoading } = useContext(ShiftStatusContext);
  const { usr }           = useContext(CurrentUserContext);
  const { add: toast }    = useToast();
  const navigate          = useNavigate();

  const isAdmin      = ['ADMIN', 'SUPER_ADMIN'].includes(usr?.role);
  const isSuperAdmin = usr?.role === 'SUPER_ADMIN';

  // Only SUPER_ADMIN can see member tab; default tab depends on role
  const [tab, setTab] = useState('player');

  const goToPlayers = () => { setAddPlayer(false); navigate('/?page=players'); };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (shiftLoading && !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-border-tertiary)', borderTopColor: '#0ea5e9', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Checking shift status…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── No active shift (non-admins) ────────────────────────────────────────────
  if (!shiftActive && !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={() => navigate('/shifts')} style={{ alignSelf: 'flex-start', padding: '9px 18px', background: 'var(--color-background-info)', color: 'var(--color-text-info)', border: '0.5px solid var(--color-border-info)', borderRadius: 'var(--border-radius-md)', fontWeight: '500', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
          Start Shift
        </button>
        <div style={{ padding: '14px 16px', borderLeft: '3px solid var(--color-border-warning)', background: 'var(--color-background-warning)', borderRadius: '8px' }}>
          <p style={{ fontWeight: '500', color: 'var(--color-text-warning)', margin: '0 0 2px', fontSize: '13px' }}>Shift required</p>
          <p style={{ color: 'var(--color-text-warning)', margin: 0, fontSize: '12px' }}>You must have an active shift to add players.</p>
        </div>
        <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--color-background-secondary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Lock style={{ width: '20px', height: '20px', color: 'var(--color-text-tertiary)' }} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Dashboard locked</p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Go to Shifts and start your shift first.</p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 'inherit' }}>

      <Breadcrumb tab={tab} />

      {/* ── Tab toggle (only visible to SUPER_ADMIN) ── */}
      {isSuperAdmin && (
        <TabToggle tab={tab} setTab={setTab} isSuperAdmin={isSuperAdmin} />
      )}

      {/* ── Form content ── */}
      {tab === 'player' ? (
        <AddPlayerForm
          onSuccess={() => { if (onIssueCreated) onIssueCreated(); goToPlayers(); }}
          onCancel={goToPlayers}
        />
      ) : (
        <AddMemberForm
          onSuccess={() => { toast('Member created! They can now log in.', 'success'); goToPlayers(); }}
          onCancel={goToPlayers}
        />
      )}

    </div>
  );
}
