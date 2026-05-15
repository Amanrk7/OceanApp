import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../Context/toastContext';
import { RefreshCw, CheckCircle, Clock, ChevronDown, Check, X } from 'lucide-react';

// ─── Token palette (matches existing app tokens) ─────────────────
const T = {
  sky: '#0ea5e9',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fde68a',
  border: 'var(--color-border)',
  bg: 'var(--color-bg)',
  card: 'var(--color-cards)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-muted)',
  shadow: 'var(--color-shadow)',
};

const CARD = {
  background: T.card,
  borderRadius: 14,
  border: `1px solid ${T.border}`,
  boxShadow: `0 2px 12px ${T.shadow}`,
  overflow: 'hidden',
};

// Human-readable labels for every possible field
const FIELD_META = {
  name:           { label: 'Full Name',       group: 'identity' },
  email:          { label: 'Email',           group: 'identity' },
  phone:          { label: 'Phone',           group: 'identity' },
  source:         { label: 'Source',          group: 'identity' },
  tier:           { label: 'Tier',            group: 'account' },
  status:         { label: 'Status',          group: 'account' },
  balance:        { label: 'Balance',         group: 'account', prefix: '$' },
  cashoutLimit:   { label: 'Cashout Limit',   group: 'account', prefix: '$' },
  currentStreak:  { label: 'Streak',          group: 'account', suffix: ' days' },
  totalBonusEarned: { label: 'Total Bonus',   group: 'account', prefix: '$' },
  facebook:       { label: 'Facebook',        group: 'social' },
  telegram:       { label: 'Telegram',        group: 'social' },
  instagram:      { label: 'Instagram',       group: 'social' },
  x:              { label: 'Twitter / X',     group: 'social' },
  snapchat:       { label: 'Snapchat',        group: 'social' },
  chimeTag:       { label: 'Chime Tag',       group: 'payment' },
  cashappTag:     { label: 'Cash App',        group: 'payment' },
  paypalEmail:    { label: 'PayPal Email',    group: 'payment' },
  referredById:   { label: 'Referred By',     group: 'relations' },
  friendIds:      { label: 'Friends',         group: 'relations' },
};

const GROUP_LABELS = {
  identity: 'Identity',
  account:  'Account',
  social:   'Social',
  payment:  'Payment',
  relations:'Relations',
};

const TEAM_COLORS = {
  TEAM1: '#8b5cf6',
  TEAM2: '#ec4899',
  TEAM3: '#10b981',
  TEAM4: '#f59e0b',
};

function teamColor(role) { return TEAM_COLORS[role] || '#94a3b8'; }

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, size = 32 }) {
  const colors = [
    ['#6366f1', '#eef2ff'], ['#0ea5e9', '#f0f9ff'], ['#10b981', '#f0fdf4'],
    ['#f59e0b', '#fffbeb'], ['#8b5cf6', '#f5f3ff'], ['#ec4899', '#fdf2f8'],
  ];
  const [fg, bg] = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.33, flexShrink: 0,
      border: `1.5px solid ${fg}30`,
    }}>
      {initials(name)}
    </div>
  );
}

function TimeAgo({ date }) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  const s = diff < 60 ? 'just now'
    : diff < 3600 ? `${Math.floor(diff / 60)}m ago`
    : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
    : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <span style={{ fontSize: 11, color: T.muted }}>{s}</span>;
}

// Format a raw value for display
function fmt(field, val) {
  if (val === null || val === undefined || val === '') return null;
  const meta = FIELD_META[field] || {};
  if (Array.isArray(val)) return `${val.length} item(s)`;
  const str = String(val);
  return `${meta.prefix || ''}${str}${meta.suffix || ''}`;
}

// Single field change row
function FieldRow({ field, newVal, oldVal }) {
  const meta = FIELD_META[field] || { label: field };
  const newFmt = fmt(field, newVal);
  const oldFmt = fmt(field, oldVal);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr 20px 1fr',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {meta.label}
      </span>

      {/* Old value */}
      <div style={{
        fontSize: 12, color: T.muted,
        padding: '3px 8px', borderRadius: 6,
        background: oldFmt ? 'rgba(0,0,0,.04)' : 'transparent',
        textDecoration: oldFmt ? 'line-through' : 'none',
        opacity: 0.7,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontStyle: oldFmt ? 'normal' : 'italic',
      }}>
        {oldFmt || 'empty'}
      </div>

      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.5">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>

      {/* New value */}
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: newFmt ? T.sky : T.red,
        padding: '3px 8px', borderRadius: 6,
        background: newFmt ? 'rgba(14,165,233,.08)' : 'rgba(239,68,68,.06)',
        border: `1px solid ${newFmt ? 'rgba(14,165,233,.18)' : 'rgba(239,68,68,.15)'}`,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontStyle: newFmt ? 'normal' : 'italic',
      }}>
        {newFmt || 'cleared'}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function PlayerEditRequestsPanel() {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [note, setNote]           = useState({});
  const [acting, setActing]       = useState({});
  const { add: toast }            = useToast();
  const esRef                     = useRef(null);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.editRequests.getAll('PENDING');
      setRequests(res.data || []);
      if (res.data?.length && !Object.keys(expanded).length) {
        setExpanded({ [res.data[0].id]: true });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const token = localStorage.getItem('authToken');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const url = token ? `${base}/tasks/events?token=${encodeURIComponent(token)}` : `${base}/tasks/events`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (['edit_request_created', 'edit_request_updated', 'edit_request_reviewed'].includes(type)) load(true);
      } catch (_) {}
    };
    return () => es.close();
  }, []);

  const handle = async (id, action) => {
    try {
      setActing(a => ({ ...a, [id]: action }));
      const n = note[id] || '';
      if (action === 'approve') await api.editRequests.approve(id, n);
      else await api.editRequests.reject(id, n);
      toast(action === 'approve' ? '✓ Changes applied' : 'Request rejected', action === 'approve' ? 'success' : 'error');
      setNote(n => { const c = { ...n }; delete c[id]; return c; });
      load(true);
    } catch (err) {
      toast(err.message || 'Action failed', 'error');
    } finally {
      setActing(a => ({ ...a, [id]: null }));
    }
  };

  // Group fields by category
  const groupChanges = (changes) => {
    const groups = {};
    Object.entries(changes).forEach(([field, val]) => {
      const meta = FIELD_META[field] || { group: 'other' };
      if (!groups[meta.group]) groups[meta.group] = [];
      groups[meta.group].push({ field, val });
    });
    return groups;
  };

  if (loading) return (
    <div style={{ ...CARD, padding: '48px 24px', textAlign: 'center' }}>
      <RefreshCw style={{ width: 18, height: 18, margin: '0 auto 10px', display: 'block', color: T.muted, animation: 'spin .8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        ...CARD,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(14,165,233,.1)', border: '1px solid rgba(14,165,233,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Player Edit Requests</div>
            <div style={{ fontSize: 11, color: T.muted }}>
              {requests.length > 0 ? `${requests.length} pending review` : 'No pending requests'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {requests.length > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: T.amberLt, border: `1px solid ${T.amberBdr}`,
              color: T.amber, fontSize: 12, fontWeight: 700,
            }}>
              {requests.length}
            </span>
          )}
          <button onClick={() => load()} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', border: `1px solid ${T.border}`,
            borderRadius: 8, background: T.card, color: T.muted,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <RefreshCw style={{ width: 11, height: 11 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Empty ──────────────────────────────────── */}
      {requests.length === 0 && (
        <div style={{ ...CARD, padding: '52px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.greenLt, border: `1px solid ${T.greenBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <CheckCircle style={{ width: 22, height: 22, color: T.green }} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: T.text }}>All caught up</p>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>No pending edit requests</p>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────── */}
      {requests.map(r => {
        const isOpen    = !!expanded[r.id];
        const isActing  = acting[r.id];
        const changes   = r.changes || {};
        const fieldCount = Object.keys(changes).length;
        const groups    = groupChanges(changes);
        const tc        = teamColor(r.requester?.role);

        return (
          <div key={r.id} style={{ ...CARD, transition: 'box-shadow .15s' }}>

            {/* ── Card header ── */}
            <div
              onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
              style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                borderBottom: isOpen ? `1px solid ${T.border}` : 'none',
              }}
            >
              <Avatar name={r.player?.name} size={36} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.player?.name}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>@{r.player?.username}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {/* Team badge */}
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: `${tc}18`, border: `1px solid ${tc}40`,
                    color: tc, fontSize: 9, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(r.requester?.role || '?').replace('TEAM', 'T')}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted }}>{r.requester?.name}</span>
                  <span style={{ color: T.border }}>·</span>
                  <TimeAgo date={r.createdAt} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Field count pill */}
                <span style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.15)',
                  color: T.sky, fontSize: 11, fontWeight: 700,
                }}>
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                </span>

                {/* Pending dot */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 20,
                  background: T.amberLt, border: `1px solid ${T.amberBdr}`,
                  color: T.amber, fontSize: 10, fontWeight: 600,
                }}>
                  <Clock style={{ width: 9, height: 9 }} /> Pending
                </span>

                {/* Chevron */}
                <ChevronDown style={{
                  width: 14, height: 14, color: T.muted, flexShrink: 0,
                  transition: 'transform .2s',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                }} />
              </div>
            </div>

            {/* ── Expanded body ── */}
            {isOpen && (
              <div style={{ padding: '16px 16px 14px' }}>

                {/* Field diffs grouped */}
                <div style={{ marginBottom: 14 }}>
                  {Object.entries(groups).map(([group, fields]) => (
                    <div key={group} style={{ marginBottom: 12 }}>
                      {/* Group label */}
                      <div style={{
                        fontSize: 10, fontWeight: 800, color: T.muted,
                        textTransform: 'uppercase', letterSpacing: '.6px',
                        marginBottom: 4,
                      }}>
                        {GROUP_LABELS[group] || group}
                      </div>
                      <div style={{
                        background: T.bg,
                        borderRadius: 9,
                        border: `1px solid ${T.border}`,
                        padding: '2px 12px',
                      }}>
                        {fields.map(({ field, val }, idx) => (
                          <div
                            key={field}
                            style={{ borderBottom: idx < fields.length - 1 ? `1px solid ${T.border}` : 'none' }}
                          >
                            <FieldRow
                              field={field}
                              newVal={val}
                              oldVal={r.player?.[field === 'x' ? 'twitterX' : field]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note input */}
                <input
                  placeholder="Add a note (optional)…"
                  value={note[r.id] || ''}
                  onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontSize: 12, fontFamily: 'inherit',
                    background: T.bg, color: T.text,
                    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
                  }}
                  onFocus={e => e.target.style.borderColor = T.sky}
                  onBlur={e => e.target.style.borderColor = T.border}
                />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handle(r.id, 'approve')}
                    disabled={!!isActing}
                    style={{
                      flex: 2, padding: '9px 14px',
                      borderRadius: 8, border: 'none',
                      background: isActing === 'approve' ? '#15803d' : T.green,
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      cursor: isActing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isActing && isActing !== 'approve' ? 0.45 : 1,
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}
                  >
                    {isActing === 'approve'
                      ? <><RefreshCw style={{ width: 12, height: 12, animation: 'spin .8s linear infinite' }} /> Applying…</>
                      : <><Check style={{ width: 13, height: 13 }} /> Approve & Apply</>
                    }
                  </button>

                  <button
                    onClick={() => handle(r.id, 'reject')}
                    disabled={!!isActing}
                    style={{
                      flex: 1, padding: '9px 14px',
                      borderRadius: 8,
                      border: `1px solid ${T.redBdr}`,
                      background: T.redLt, color: T.red,
                      fontWeight: 700, fontSize: 13,
                      cursor: isActing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isActing && isActing !== 'reject' ? 0.45 : 1,
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}
                  >
                    {isActing === 'reject'
                      ? <><RefreshCw style={{ width: 12, height: 12, animation: 'spin .8s linear infinite' }} /> Rejecting…</>
                      : <><X style={{ width: 13, height: 13 }} /> Reject</>
                    }
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
