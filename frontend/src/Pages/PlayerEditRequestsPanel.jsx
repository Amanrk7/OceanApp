import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useToast } from '../Context/toastContext';

const ROLE_COLOR = {
  TEAM1: '#0ea5e9', TEAM2: '#8b5cf6', TEAM3: '#10b981', TEAM4: '#f59e0b',
};

export default function PlayerEditRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewNote, setNote]    = useState({});
  const { add: toast }           = useToast();
  const eventSourceRef           = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.editRequests.getAll('PENDING');
      setRequests(res.data || []);
    } finally { setLoading(false); }
  };

  // ── SSE: refresh whenever a new edit request comes in or is reviewed ──
  useEffect(() => {
    load();

    const token = localStorage.getItem('authToken');
    const url = token
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tasks/events?token=${encodeURIComponent(token)}`
      : `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tasks/events`;

    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (['edit_request_created', 'edit_request_updated', 'edit_request_reviewed'].includes(type)) {
          load(); // lightweight re-fetch — only pending requests
        }
      } catch (_) {}
    };

    return () => { es.close(); };
  }, []);

  const handle = async (id, action) => {
    try {
      const note = reviewNote[id] || '';
      if (action === 'approve') await api.editRequests.approve(id, note);
      else                       await api.editRequests.reject(id, note);
      toast(
        action === 'approve' ? 'Changes applied ✓' : 'Request rejected',
        action === 'approve' ? 'success' : 'error'
      );
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <p style={{ color: '#94a3b8', padding: 20 }}>Loading…</p>;
  if (!requests.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
      ✅ No pending edit requests
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {requests.map(r => (
        <div key={r.id} style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${ROLE_COLOR[r.requester?.role] || '#64748b'}`,
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{r.player?.name}</span>
              <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>@{r.player?.username}</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {r.requester?.name} ({r.requester?.role}) ·{' '}
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8, marginBottom: 14,
          }}>
            {Object.entries(r.changes).map(([field, val]) => (
              <div key={field} style={{
                background: '#f8fafc', borderRadius: 8,
                padding: '8px 12px', border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                  {field}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {val || <em style={{ color: '#94a3b8' }}>cleared</em>}
                </div>
              </div>
            ))}
          </div>

          <input
            placeholder="Optional note to member…"
            value={reviewNote[r.id] || ''}
            onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
            style={{
              width: '100%', padding: '8px 12px', marginBottom: 10,
              border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handle(r.id, 'approve')}
              style={{
                flex: 2, padding: '9px', borderRadius: 8, border: 'none',
                background: '#16a34a', color: '#fff', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✓ Approve & Apply
            </button>
            <button
              onClick={() => handle(r.id, 'reject')}
              style={{
                flex: 1, padding: '9px', borderRadius: 8,
                border: '1px solid #fecaca', background: '#fff1f2',
                color: '#dc2626', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
