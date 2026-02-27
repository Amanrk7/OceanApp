import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

// ─── Helpers ──────────────────────────────────────────────────

function getStatusConfig(status) {
  const map = {
    HEALTHY: { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: 'Healthy' },
    LOW_STOCK: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Low Stock' },
    DEFICIT: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Deficit' },
  };
  return map[status] || map.HEALTHY;
}

function getStockColor(pointStock) {
  if (pointStock < 100) return '#ef4444';
  if (pointStock < 1000) return '#f59e0b';
  return '#16a34a';
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function computeStatus(stock) {
  if (stock <= 0) return 'DEFICIT';
  if (stock <= 500) return 'LOW_STOCK';
  return 'HEALTHY';
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = getStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: cfg.bg, color: cfg.text,
      fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#991b1b' : '#166534',
          padding: '12px 18px', borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.25s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{t.type === 'error' ? '✗' : '✓'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Game Card ────────────────────────────────────────────────

function GameCard({ game, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    setInputValue(Number(game.pointStock).toFixed(2));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setInputValue('');
  };

  const saveEdit = async () => {
    const newStock = parseFloat(inputValue);
    if (isNaN(newStock)) { cancelEdit(); return; }
    if (newStock === parseFloat(game.pointStock)) { cancelEdit(); return; }

    setSaving(true);
    try {
      await onUpdate(game.id, newStock);
      setEditing(false);
    } catch {
      // parent handles error toast
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const previewStatus = editing ? computeStatus(parseFloat(inputValue) || 0) : game.status;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'box-shadow 0.2s, transform 0.2s',
      position: 'relative',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Delete button — top right */}
      <button
        onClick={() => onDelete(game)}
        title="Delete game"
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 28, height: 28, borderRadius: 8,
          border: '1px solid #fecaca',
          background: '#fff5f5',
          color: '#ef4444',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#ef4444';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = '#ef4444';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#fff5f5';
          e.currentTarget.style.color = '#ef4444';
          e.currentTarget.style.borderColor = '#fecaca';
        }}
      >
        ✕
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 32 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {getInitials(game.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{game.name}</div>
          <div style={{ marginTop: 4 }}><StatusBadge status={previewStatus} /></div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f1f3f8' }} />

      {/* Point stock */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Point Stock</span>
          {!editing && (
            <button
              onClick={startEdit}
              style={{
                background: 'none', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '2px 8px',
                fontSize: 10, fontWeight: 600, color: '#6366f1',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#eef2ff';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              ✎ Edit
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={saving}
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: 10, border: '2px solid #6366f1',
                  fontSize: 20, fontWeight: 700,
                  fontFamily: "'DM Mono', 'Fira Code', monospace",
                  color: getStockColor(parseFloat(inputValue) || 0),
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  outline: 'none', boxSizing: 'border-box',
                  boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
                  opacity: saving ? 0.6 : 1,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  background: saving ? '#a5b4fc' : '#6366f1',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? '…' : '✓ Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  color: '#6b7280', fontWeight: 600, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              Enter ↵ to save · Esc to cancel
            </div>
          </div>
        ) : (
          <div
            onClick={startEdit}
            title="Click to edit points"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: 10, padding: '12px 16px', textAlign: 'center',
              cursor: 'pointer', transition: 'opacity 0.15s',
              border: '2px solid transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.background = 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
            }}
          >
            <span style={{
              fontSize: 26, fontWeight: 700,
              color: getStockColor(game.pointStock),
              fontFamily: "'DM Mono', 'Fira Code', monospace",
            }}>
              {Number(game.pointStock).toFixed(2)}
            </span>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>click to edit</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter Tab ───────────────────────────────────────────────

function FilterTab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
      border: active ? 'none' : '1px solid #e5e7eb',
      background: active ? '#6366f1' : '#fff',
      color: active ? '#fff' : '#6b7280',
      fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────

function DeleteModal({ game, onClose, onDeleted }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleDelete = async () => {
    if (!adminPassword.trim()) { setError('Admin password is required.'); return; }
    setLoading(true); setError(null);
    try {
      await api.games.deleteGame(game.id, adminPassword);
      onDeleted(game.id);
    } catch (e) {
      setError(e.message || 'Deletion failed. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, width: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 18,
        animation: 'scaleIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🗑️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Delete Game</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
              This will permanently remove <strong>{game.name}</strong> and cannot be undone.
            </div>
          </div>
        </div>

        {/* Warning box */}
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 12, color: '#713f12', fontWeight: 600,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          ⚠️ Current point stock: <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>
            {Number(game.pointStock).toFixed(2)} pts
          </span> will be lost.
        </div>

        {/* Admin password input */}
        <div>
          <label style={{
            fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'block', marginBottom: 6,
          }}>
            Admin Password to Confirm
          </label>
          <input
            ref={inputRef}
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleDelete()}
            placeholder="Enter admin password"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${error ? '#f87171' : '#e5e7eb'}`,
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = error ? '#f87171' : '#e5e7eb'}
          />
          {error && (
            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1px solid #e5e7eb', background: '#fff',
              color: '#6b7280', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || !adminPassword.trim()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: loading || !adminPassword.trim() ? '#fca5a5' : '#ef4444',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading || !adminPassword.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Deleting…' : 'Delete Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Game Modal ───────────────────────────────────────────

function NewGameModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', slug: '', pointStock: 0, status: 'HEALTHY' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'pointStock' ? parseFloat(value) || 0 : value,
      ...(name === 'name'
        ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }
        : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { setError('Name and slug are required.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.games.createGame(form);
      onCreated(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#1e1f26' }}>New Game</div>

        {[
          { label: 'Game Name', name: 'name', type: 'text', placeholder: 'e.g. Cash Frenzy' },
          { label: 'Slug', name: 'slug', type: 'text', placeholder: 'e.g. cash-frenzy' },
          { label: 'Point Stock', name: 'pointStock', type: 'number', placeholder: '0' },
        ].map(field => (
          <div key={field.name}>
            <label style={{
              fontSize: 11, fontWeight: 600, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'block', marginBottom: 4,
            }}>
              {field.label}
            </label>
            <input
              name={field.name}
              type={field.type}
              value={form[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              style={inputStyle}
            />
          </div>
        ))}

        <div>
          <label style={{
            fontSize: 11, fontWeight: 600, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'block', marginBottom: 4,
          }}>Status</label>
          <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
            <option value="HEALTHY">Healthy</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="DEFICIT">Deficit</option>
          </select>
        </div>

        {error && (
          <div style={{
            color: '#dc2626', fontSize: 13,
            background: '#fef2f2', padding: '8px 12px', borderRadius: 8,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: loading ? '#a5b4fc' : '#6366f1',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating…' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'LOW_STOCK', label: 'Low Stock' },
  { key: 'DEFICIT', label: 'Deficit' },
];

let toastCounter = 0;

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Toast helpers ─────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── Load games ────────────────────────────────────────────────
  const loadGames = useCallback(async (currentFilter, currentSearch) => {
    try {
      setLoading(true); setError(null);
      if (typeof api.clearCache === 'function') api.clearCache();
      if (typeof api.games?.clearCache === 'function') api.games.clearCache();

      const res = await api.games.getGames(true, {
        status: currentFilter || '',
        search: currentSearch || '',
      });
      setGames(res?.data || []);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGames(filter, search); }, [filter, search, refreshKey, loadGames]);

  // Listen for undo events
  useEffect(() => {
    const handleUndone = () => setRefreshKey(k => k + 1);
    window.addEventListener('transactionUndone', handleUndone);
    window.addEventListener('apiUndoTransaction', handleUndone);
    return () => {
      window.removeEventListener('transactionUndone', handleUndone);
      window.removeEventListener('apiUndoTransaction', handleUndone);
    };
  }, []);

  // ── Update handler (optimistic) ───────────────────────────────
  const handleUpdate = useCallback(async (gameId, newStock) => {
    const newStatus = computeStatus(newStock);

    // Optimistic update
    setGames(prev => prev.map(g =>
      g.id === gameId ? { ...g, pointStock: newStock, status: newStatus } : g
    ));

    try {
      await api.games.updateGame(gameId, { pointStock: newStock, status: newStatus });
      addToast('Point stock updated successfully');
    } catch (err) {
      // Rollback: refetch
      setRefreshKey(k => k + 1);
      addToast(err.message || 'Failed to update points', 'error');
      throw err;
    }
  }, [addToast]);

  // ── Delete handler ────────────────────────────────────────────
  const handleDeleted = useCallback((gameId) => {
    setGames(prev => prev.filter(g => g.id !== gameId));
    setDeleteTarget(null);
    addToast('Game deleted successfully');
  }, [addToast]);

  return (
    <div style={{ minHeight: '100vh', background: 'none', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Toast container */}
      <Toast toasts={toasts} />

      {/* Page header */}
      <div style={{
        padding: '28px 32px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Manage game details and keep an eye on point stock levels.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <span style={{ fontSize: 18 }}>+</span> New Game
        </button>
      </div>

      {/* Controls */}
      <div style={{
        padding: '20px 32px 0',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#9ca3af',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search games…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10,
              border: '1px solid #e5e7eb', background: '#fff', fontSize: 14,
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTER_TABS.map(tab => (
            <FilterTab
              key={tab.key}
              label={tab.label}
              active={filter === tab.key}
              onClick={() => setFilter(tab.key)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px 40px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            Loading games…
          </div>
        )}

        {error && !loading && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 12, padding: '16px 20px', color: '#b91c1c',
          }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            No games found.
          </div>
        )}

        {!loading && !error && games.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onUpdate={handleUpdate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Game Modal */}
      {showModal && (
        <NewGameModal
          onClose={() => setShowModal(false)}
          onCreated={newGame => {
            setGames(prev => [newGame, ...prev]);
            setShowModal(false);
            addToast(`"${newGame.name}" created successfully`);
          }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          game={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}