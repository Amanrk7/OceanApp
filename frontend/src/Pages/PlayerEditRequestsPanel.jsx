import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../Context/toastContext';

const TEAM_COLORS = {
  TEAM1: { bg: '#ede9fe', text: '#6d28d9', label: 'T1' },
  TEAM2: { bg: '#fce7f3', text: '#be185d', label: 'T2' },
  TEAM3: { bg: '#d1fae5', text: '#065f46', label: 'T3' },
  TEAM4: { bg: '#fef3c7', text: '#92400e', label: 'T4' },
};

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, size = 32, style = {} }) {
  const colors = [
    ['#0369a1', '#e0f2fe'], ['#7c3aed', '#ede9fe'], ['#065f46', '#d1fae5'],
    ['#92400e', '#fef3c7'], ['#be185d', '#fce7f3'], ['#1e40af', '#dbeafe'],
  ];
  const [text, bg] = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 500, flexShrink: 0, ...style,
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
    : new Date(date).toLocaleDateString();
  return <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</span>;
}

export default function PlayerEditRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewNote, setNote]   = useState({});
  const [acting, setActing]     = useState({});
  const { add: toast }          = useToast();
  const eventSourceRef          = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.editRequests.getAll('PENDING');
      setRequests(res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const token = localStorage.getItem('authToken');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const url = token
      ? `${base}/tasks/events?token=${encodeURIComponent(token)}`
      : `${base}/tasks/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (['edit_request_created', 'edit_request_updated', 'edit_request_reviewed'].includes(type)) {
          load();
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
        action === 'approve' ? 'Changes applied ✓' : 'Request rejected',
        action === 'approve' ? 'success' : 'error'
      );
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActing(a => ({ ...a, [id]: null }));
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
      Loading requests…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-user-edit" style={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Player edit requests
          </span>
          {requests.length > 0 && (
            <span style={{
              background: 'var(--color-background-warning)',
              color: 'var(--color-text-warning)',
              border: '0.5px solid var(--color-border-warning)',
              borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 500,
            }}>
              {requests.length} pending
            </span>
          )}
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: 'var(--color-text-secondary)',
          background: 'none', border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)', padding: '5px 10px', cursor: 'pointer',
        }}>
          <i className="ti ti-refresh" style={{ fontSize: 14 }} /> Refresh
        </button>
      </div>

      {/* Empty state */}
      {!requests.length && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
        }}>
          <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#16a34a', display: 'block', marginBottom: 10 }} />
          <p style={{ fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>All caught up</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>No pending edit requests</p>
        </div>
      )}

      {/* Request cards */}
      {requests.map(r => {
        const tc = TEAM_COLORS[r.requester?.role] || { bg: '#f1f5f9', text: '#475569', label: '?' };
        const isActing = acting[r.id];
        return (
          <div key={r.id} style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
            transition: 'border-color .15s',
          }}>
            {/* Card header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.player?.name} size={34} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {r.player?.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      @{r.player?.username}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: tc.bg, color: tc.text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 600, flexShrink: 0,
                    }}>{tc.label}</div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {r.requester?.name}
                    </span>
                    <span style={{ color: 'var(--color-border-secondary)' }}>·</span>
                    <TimeAgo date={r.createdAt} />
                  </div>
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--color-background-warning)',
                color: 'var(--color-text-warning)',
                border: '0.5px solid var(--color-border-warning)',
                borderRadius: 20, padding: '3px 9px',
                fontSize: 11, fontWeight: 500, flexShrink: 0,
              }}>
                <i className="ti ti-clock" style={{ fontSize: 11 }} /> Pending
              </span>
            </div>

            {/* Card body */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Changed fields grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 8,
              }}>
                {Object.entries(r.changes).map(([field, val]) => (
                  <div key={field} style={{
                    background: 'var(--color-background-secondary)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px', minWidth: 0,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
                    }}>
                      {field}
                    </div>
                    {val
                      ? <div style={{ fontSize: 13, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>{val}</div>
                      : <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>cleared</div>
                    }
                  </div>
                ))}
              </div>

              {/* Note input */}
              <input
                placeholder="Add a note to the member (optional)…"
                value={reviewNote[r.id] || ''}
                onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 13, fontFamily: 'inherit',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handle(r.id, 'approve')}
                  disabled={!!isActing}
                  style={{
                    flex: 2, padding: '9px 16px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: isActing === 'approve' ? '#15803d' : '#16a34a',
                    color: '#fff', fontWeight: 500, fontSize: 13,
                    cursor: isActing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: isActing && isActing !== 'approve' ? 0.5 : 1,
                    transition: 'opacity .15s',
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 14 }} />
                  {isActing === 'approve' ? 'Applying…' : 'Approve & apply'}
                </button>
                <button
                  onClick={() => handle(r.id, 'reject')}
                  disabled={!!isActing}
                  style={{
                    flex: 1, padding: '9px 16px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '0.5px solid var(--color-border-danger)',
                    background: 'var(--color-background-danger)',
                    color: 'var(--color-text-danger)',
                    fontWeight: 500, fontSize: 13,
                    cursor: isActing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: isActing && isActing !== 'reject' ? 0.5 : 1,
                    transition: 'opacity .15s',
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                  {isActing === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
