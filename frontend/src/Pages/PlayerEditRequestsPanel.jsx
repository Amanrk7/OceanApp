import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../Context/toastContext';
import {
  RefreshCw, UserCheck, UserX, Clock, CheckCircle,
  AlertCircle, ChevronRight, Edit3, User, X,
} from 'lucide-react';

// ─── Consistent with the rest of the app ────────────────────────
const CARD = {
  background: 'var(--color-cards)',
  borderRadius: '14px',
  border: '1px solid var(--color-border)',
  boxShadow: '0 2px 12px var(--color-shadow)',
};

const TEAM_COLORS = {
  TEAM1: { bg: '#ede9fe', text: '#6d28d9', label: 'T1' },
  TEAM2: { bg: '#fce7f3', text: '#be185d', label: 'T2' },
  TEAM3: { bg: '#d1fae5', text: '#065f46', label: 'T3' },
  TEAM4: { bg: '#fef3c7', text: '#92400e', label: 'T4' },
};

const FIELD_LABELS = {
  name: 'Name', email: 'Email', phone: 'Phone',
  facebook: 'Facebook', telegram: 'Telegram',
  instagram: 'Instagram', x: 'Twitter / X',
  snapchat: 'Snapchat', chimeTag: 'Chime Tag',
  cashappTag: 'Cash App', paypalEmail: 'PayPal Email',
  source: 'Source',
};

// ─── Helpers ─────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, size = 36 }) {
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
      fontWeight: '700', fontSize: size * 0.35, flexShrink: 0,
      border: `1.5px solid ${fg}30`,
    }}>
      {initials(name)}
    </div>
  );
}

function TimeAgo({ date }) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  const label = diff < 60 ? 'just now'
    : diff < 3600 ? `${Math.floor(diff / 60)}m ago`
    : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
    : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>;
}

function TeamBadge({ role }) {
  const tc = TEAM_COLORS[role] || { bg: '#f1f5f9', text: '#475569', label: '?' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: '50%',
      background: tc.bg, color: tc.text,
      fontSize: 9, fontWeight: 700, flexShrink: 0,
    }}>
      {tc.label}
    </span>
  );
}

// ─── Field diff row ───────────────────────────────────────────────
function FieldDiff({ field, newValue, currentValue }) {
  const label = FIELD_LABELS[field] || field;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: 'var(--color-bg)',
      borderRadius: 10,
      border: '1px solid var(--color-border)',
    }}>
      {/* Field label */}
      <div style={{
        minWidth: 90, fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '.5px',
      }}>
        {label}
      </div>

      {/* Current value */}
      {currentValue ? (
        <div style={{
          flex: 1, fontSize: 12, color: 'var(--color-text-muted)',
          padding: '3px 8px', borderRadius: 6,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          textDecoration: 'line-through', opacity: 0.65,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {currentValue}
        </div>
      ) : (
        <div style={{
          flex: 1, fontSize: 12, color: 'var(--color-text-muted)',
          padding: '3px 8px', borderRadius: 6, opacity: 0.5,
          fontStyle: 'italic',
        }}>
          —
        </div>
      )}

      {/* Arrow */}
      <ChevronRight style={{ width: 13, height: 13, color: 'var(--color-text-muted)', flexShrink: 0 }} />

      {/* New value */}
      <div style={{
        flex: 1, fontSize: 13, fontWeight: 600,
        color: newValue ? '#0ea5e9' : '#ef4444',
        padding: '3px 8px', borderRadius: 6,
        background: newValue ? 'rgba(14,165,233,.08)' : 'rgba(239,68,68,.06)',
        border: `1px solid ${newValue ? 'rgba(14,165,233,.2)' : 'rgba(239,68,68,.15)'}`,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {newValue || 'cleared'}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function PlayerEditRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewNote, setNote]   = useState({});
  const [acting, setActing]     = useState({});
  const [expanded, setExpanded] = useState({});
  const { add: toast }          = useToast();
  const esRef                   = useRef(null);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.editRequests.getAll('PENDING');
      setRequests(res.data || []);
      // Auto-expand first card
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
        if (['edit_request_created', 'edit_request_updated', 'edit_request_reviewed'].includes(type)) {
          load(true);
        }
      } catch (_) {}
    };
    return () => { es.close(); };
  }, []);

  const handle = async (id, action) => {
    try {
      setActing(a => ({ ...a, [id]: action }));
      const note = reviewNote[id] || '';
      if (action === 'approve') await api.editRequests.approve(id, note);
      else await api.editRequests.reject(id, note);
      toast(
        action === 'approve' ? '✓ Changes applied to player profile' : 'Request rejected',
        action === 'approve' ? 'success' : 'error'
      );
      setNote(n => { const c = { ...n }; delete c[id]; return c; });
      load(true);
    } catch (err) {
      toast(err.message || 'Action failed', 'error');
    } finally {
      setActing(a => ({ ...a, [id]: null }));
    }
  };

  const toggleExpand = (id) =>
    setExpanded(e => ({ ...e, [id]: !e[id] }));

  // ── Loading state — consistent with Playtimepage pattern ─────
  if (loading) return (
    <div style={{ ...CARD, padding: '60px 24px', textAlign: 'center' }}>
      <RefreshCw style={{
        width: 18, height: 18, margin: '0 auto 10px', display: 'block',
        color: 'var(--color-text-muted)',
        animation: 'spin .8s linear infinite',
      }} />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
        Loading edit requests…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div style={{
        ...CARD, padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(14,165,233,.1)', border: '1px solid rgba(14,165,233,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Edit3 style={{ width: 16, height: 16, color: '#0ea5e9' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              Player Edit Requests
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
              Review and approve profile changes submitted by team members
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {requests.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: '#fef3c7', border: '1px solid #fde68a',
              color: '#92400e', fontSize: 12, fontWeight: 700,
            }}>
              <Clock style={{ width: 11, height: 11 }} />
              {requests.length} pending
            </span>
          )}
          <button
            onClick={() => load()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', border: '1px solid var(--color-border)',
              borderRadius: 8, background: 'var(--color-cards)',
              color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────── */}
      {requests.length === 0 && (
        <div style={{
          ...CARD, padding: '56px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#f0fdf4', border: '1px solid #86efac',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <CheckCircle style={{ width: 24, height: 24, color: '#16a34a' }} />
          </div>
          <p style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            All caught up
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
            No pending edit requests right now
          </p>
        </div>
      )}

      {/* ── Request cards ────────────────────────────────── */}
      {requests.map(r => {
        const isOpen   = !!expanded[r.id];
        const isActing = acting[r.id];
        const fieldCount = Object.keys(r.changes || {}).length;

        return (
          <div key={r.id} style={{
            ...CARD,
            overflow: 'hidden',
            transition: 'box-shadow .15s',
          }}>

            {/* Card header — always visible, click to expand */}
            <div
              onClick={() => toggleExpand(r.id)}
              style={{
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                borderBottom: isOpen ? '1px solid var(--color-border)' : 'none',
                background: isOpen ? 'var(--color-cards)' : 'transparent',
                transition: 'background .15s',
              }}
            >
              <Avatar name={r.player?.name} size={36} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                    {r.player?.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    @{r.player?.username}
                  </span>
                  <span style={{
                    padding: '2px 7px', borderRadius: 5,
                    background: 'rgba(14,165,233,.1)', color: '#0ea5e9',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''} changed
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <TeamBadge role={r.requester?.role} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {r.requester?.name}
                  </span>
                  <span style={{ color: 'var(--color-border)', fontSize: 14 }}>·</span>
                  <TimeAgo date={r.createdAt} />
                </div>
              </div>

              {/* Pending badge + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 20,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  color: '#92400e', fontSize: 11, fontWeight: 600,
                }}>
                  <Clock style={{ width: 10, height: 10 }} /> Pending
                </span>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform .2s',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}>
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Field diffs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '.5px',
                    marginBottom: 2,
                  }}>
                    Proposed changes
                  </div>
                  {Object.entries(r.changes).map(([field, val]) => (
                    <FieldDiff
                      key={field}
                      field={field}
                      newValue={val}
                      currentValue={r.player?.[field === 'x' ? 'twitterX' : field]}
                    />
                  ))}
                </div>

                {/* Note input */}
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="Add a note to the member (optional)…"
                    value={reviewNote[r.id] || ''}
                    onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 32px 9px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                      background: 'var(--color-bg)', color: 'var(--color-text)',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color .15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  {reviewNote[r.id] && (
                    <button
                      onClick={() => setNote(n => ({ ...n, [r.id]: '' }))}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-text-muted)', display: 'flex', padding: 2,
                      }}
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handle(r.id, 'approve')}
                    disabled={!!isActing}
                    style={{
                      flex: 2, padding: '10px 16px',
                      borderRadius: 8, border: 'none',
                      background: isActing === 'approve' ? '#15803d' : '#16a34a',
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      cursor: isActing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isActing && isActing !== 'approve' ? 0.4 : 1,
                      transition: 'all .15s', fontFamily: 'inherit',
                    }}
                  >
                    {isActing === 'approve'
                      ? <><RefreshCw style={{ width: 13, height: 13, animation: 'spin .8s linear infinite' }} /> Applying…</>
                      : <><UserCheck style={{ width: 14, height: 14 }} /> Approve & apply</>
                    }
                  </button>
                  <button
                    onClick={() => handle(r.id, 'reject')}
                    disabled={!!isActing}
                    style={{
                      flex: 1, padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid #fca5a5',
                      background: '#fff1f2', color: '#dc2626',
                      fontWeight: 700, fontSize: 13,
                      cursor: isActing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isActing && isActing !== 'reject' ? 0.4 : 1,
                      transition: 'all .15s', fontFamily: 'inherit',
                    }}
                  >
                    {isActing === 'reject'
                      ? <><RefreshCw style={{ width: 13, height: 13, animation: 'spin .8s linear infinite' }} /> Rejecting…</>
                      : <><UserX style={{ width: 14, height: 14 }} /> Reject</>
                    }
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
