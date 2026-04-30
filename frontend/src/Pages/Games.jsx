import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  Search, X, RefreshCw, AlertCircle, CheckCircle,
  ChevronDown, Gamepad2, TrendingDown, AlertTriangle,
  Package, Zap, Plus, Trash2,
} from 'lucide-react';
import { api } from '../api';
import { CurrentUserContext } from '../Context/currentUser';
import { useToast } from '../Context/toastContext';

// ─── Shared constants (mirrors PlaytimePage) ──────────────────────────────────
const CARD = {
  background: '#fff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 12px rgba(15,23,42,.07)',
};
const LABEL = {
  display: 'block', fontSize: '11px', fontWeight: '700',
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
  boxSizing: 'border-box', background: '#fff', color: '#0f172a', outline: 'none',
};
const SELECT = { ...INPUT, paddingRight: '32px', appearance: 'none', cursor: 'pointer' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStockColor(stock) {
  if (stock <= 0) return '#dc2626';
  if (stock <= 500) return '#d97706';
  return '#16a34a';
}
function getStockStatus(stock) {
  if (stock <= 0) return { label: 'Deficit', bg: '#fff1f2', border: '#fecdd3', text: '#dc2626', dot: '#dc2626' };
  if (stock <= 500) return { label: 'Low Stock', bg: '#fffbeb', border: '#fcd34d', text: '#d97706', dot: '#f59e0b' };
  return { label: 'Healthy', bg: '#f0fdf4', border: '#86efac', text: '#16a34a', dot: '#22c55e' };
}
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function computeStatus(stock) {
  if (stock <= 0) return 'DEFICIT';
  if (stock <= 500) return 'LOW_STOCK';
  return 'HEALTHY';
}
const fmt = (n) => Number(n || 0).toFixed(2);

// ─── Game Avatar ──────────────────────────────────────────────────────────────
function GameAvatar({ name, size = 38 }) {
  const colors = [
    ['#6366f1', '#eef2ff'], ['#0ea5e9', '#f0f9ff'], ['#10b981', '#f0fdf4'],
    ['#f59e0b', '#fffbeb'], ['#8b5cf6', '#f5f3ff'], ['#ec4899', '#fdf2f8'],
  ];
  const [fg, bg] = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '10px', background: bg,
      color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.32, flexShrink: 0,
      border: `1.5px solid ${fg}30`,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ stock }) {
  const s = getStockStatus(stock);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────
// function GameCard({ game, isAdmin, onUpdate, onDelete }) {
function GameCard({ game, isAdmin, onUpdate, onDelete, onToggleShare }) {

  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    if (!isAdmin) return;
    setInputValue(Number(game.pointStock).toFixed(2));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };
  const cancelEdit = () => { setEditing(false); setInputValue(''); };
  const saveEdit = async () => {
    const newStock = parseFloat(inputValue);
    if (isNaN(newStock)) { cancelEdit(); return; }
    if (newStock === parseFloat(game.pointStock)) { cancelEdit(); return; }
    setSaving(true);
    try { await onUpdate(game.id, newStock); setEditing(false); }
    catch { /* parent handles toast */ }
    finally { setSaving(false); }
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const previewStock = editing ? (parseFloat(inputValue) || 0) : game.pointStock;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...CARD,
        padding: '18px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        transition: 'box-shadow 0.18s, transform 0.18s',
        position: 'relative',
        ...(hover ? { boxShadow: '0 6px 22px rgba(15,23,42,.13)', transform: 'translateY(-2px)' } : {}),
      }}
    >
      {/* Delete button */}
      <button
        onClick={() => isAdmin && onDelete(game)}
        disabled={!isAdmin}
        title={isAdmin ? 'Delete game' : 'Admin only'}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '26px', height: '26px', borderRadius: '7px',
          border: '1px solid #fecdd3', background: '#fff1f2',
          color: isAdmin ? '#dc2626' : '#cbd5e1',
          cursor: isAdmin ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isAdmin ? 1 : 0.4, transition: 'all 0.15s',
          padding: 0,
        }}
        onMouseEnter={e => { if (!isAdmin) return; e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { if (!isAdmin) return; e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#dc2626'; }}
      >
        <Trash2 style={{ width: '12px', height: '12px' }} />
      </button>

      {isAdmin && (
        <button
          onClick={() => onToggleShare(game)}
          title={game.isShared ? 'Shared — click to make store-private' : 'Private — click to share across stores'}
          style={{
            position: 'absolute', top: '12px', right: '44px',
            width: '26px', height: '26px', borderRadius: '7px',
            border: `1px solid ${game.isShared ? '#bfdbfe' : '#e2e8f0'}`,
            background: game.isShared ? '#eff6ff' : '#f8fafc',
            color: game.isShared ? '#2563eb' : '#cbd5e1',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '12px', padding: 0,
          }}
        >
          🔗
        </button>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', paddingRight: '30px' }}>
        <GameAvatar name={game.name} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {game.name}
          </div>
          <div style={{ marginTop: '4px' }}>
            <StatusBadge stock={previewStock} />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9' }} />

      {/* Point stock */}
      <div>
        <div style={{ ...LABEL, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Point Stock</span>
          {!editing && (
            <button
              onClick={startEdit}
              disabled={!isAdmin}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
                padding: '2px 8px', fontSize: '10px', fontWeight: '600',
                color: isAdmin ? '#0ea5e9' : '#cbd5e1',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.5, transition: 'all 0.15s',
              }}
            >
              ✎ Edit
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              style={{
                ...INPUT,
                fontSize: '22px', fontWeight: '700',
                fontFamily: "'DM Mono','Fira Code',monospace",
                color: getStockColor(parseFloat(inputValue) || 0),
                border: '2px solid #0ea5e9',
                boxShadow: '0 0 0 3px rgba(14,165,233,0.15)',
                opacity: saving ? 0.6 : 1,
              }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', background: saving ? '#bae6fd' : '#0ea5e9', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '…' : '✓ Save'}
              </button>
              <button onClick={cancelEdit} disabled={saving}
                style={{ flex: 1, padding: '8px 0', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                Cancel
              </button>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>Enter ↵ to save · Esc to cancel</div>
          </div>
        ) : (
          <div
            onClick={startEdit}
            title={isAdmin ? 'Click to edit' : 'Admin only'}
            style={{
              background: '#f0fdf4', borderRadius: '10px', padding: '12px 14px',
              textAlign: 'center', border: '2px solid transparent',
              cursor: isAdmin ? 'pointer' : 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { if (!isAdmin) return; e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.background = '#f0f9ff'; }}
            onMouseLeave={e => { if (!isAdmin) return; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f0fdf4'; }}
          >
            <span style={{ fontSize: '26px', fontWeight: '700', fontFamily: "'DM Mono','Fira Code',monospace", color: getStockColor(game.pointStock) }}>
              {fmt(game.pointStock)}
            </span>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              {isAdmin ? 'click to edit' : 'view only'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Modal (matches FreezeModal style) ─────────────────────────────────
function DeleteModal({ game, onClose, onDeleted }) {
  const { add: toast } = useToast();           // ← was missing
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const handle = async () => {
    if (!adminPassword.trim()) {
      toast("Admin password is required.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.games.deleteGame(game.id, adminPassword);
      onDeleted(game.id);
    } catch (e) {
      toast("Failed to delete game.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ ...CARD, position: 'relative', zIndex: 1, padding: '28px 30px', width: '420px', maxWidth: '94vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Delete Game</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <GameAvatar name={game.name} size={40} />
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{game.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Point stock: <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>{fmt(game.pointStock)} pts</strong>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 13px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', marginBottom: '18px', display: 'flex', gap: '8px' }}>
          <AlertTriangle style={{ width: '14px', height: '14px', color: '#92400e', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
            Permanently removes <strong>{game.name}</strong> and all associated stock data.
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Admin password to confirm <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            ref={inputRef}
            type="password"
            value={adminPassword}
            onChange={e => { setAdminPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && handle()}
            placeholder="Enter admin password"
            disabled={loading}
            style={{ ...INPUT, borderColor: '#e2e8f0' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} disabled={loading}
            style={{ flex: 1, padding: '11px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading || !adminPassword.trim()}
            style={{
              flex: 2, padding: '11px', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px',
              background: loading || !adminPassword.trim() ? '#e2e8f0' : '#dc2626',
              color: loading || !adminPassword.trim() ? '#94a3b8' : '#fff',
              cursor: loading || !adminPassword.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}>
            {loading ? '⏳ Deleting…' : <><Trash2 style={{ width: '14px', height: '14px' }} /> Delete Game</>}
          </button>
          {/* ← the stray isAdmin block that was here has been removed */}
        </div>
      </div>
    </div>
  );
}

// ─── New Game Modal (matches RedeemModal style) ───────────────────────────────
function NewGameModal({ onClose, onCreated }) {
  // const [form, setForm] = useState({ name: '', slug: '', pointStock: 0, status: 'HEALTHY' });
  const [form, setForm] = useState({ name: '', slug: '', pointStock: 0, status: 'HEALTHY', isShared: false });
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'pointStock' ? parseFloat(value) || 0 : value,
      ...(name === 'name' ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') } : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { toast('Name and slug are required.', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.games.createGame(form);
      onCreated(res.data);
    } catch (e) {
      toast(e.message || 'Failed to create game.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Game Name', name: 'name', type: 'text', placeholder: 'e.g. Cash Frenzy' },
    { label: 'Slug', name: 'slug', type: 'text', placeholder: 'e.g. cash-frenzy' },
    { label: 'Point Stock', name: 'pointStock', type: 'number', placeholder: '0' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ ...CARD, position: 'relative', zIndex: 1, padding: '28px 30px', width: '440px', maxWidth: '94vw' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus style={{ width: '16px', height: '16px', color: '#0ea5e9' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>New Game</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Add a new game to the system</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {fields.map(f => (
          <div key={f.name} style={{ marginBottom: '16px' }}>
            <label style={LABEL}>{f.label} {f.name !== 'pointStock' && <span style={{ color: '#ef4444' }}>*</span>}</label>
            <input name={f.name} type={f.type} value={form[f.name]} onChange={handleChange}
              placeholder={f.placeholder} style={INPUT} />
          </div>
        ))}

        {/* isShared toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: form.isShared ? '#f0f9ff' : '#f8fafc',
          borderRadius: '8px', border: `1px solid ${form.isShared ? '#bae6fd' : '#e2e8f0'}`,
          transition: 'all .2s',
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              Share across all stores
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: form.isShared ? '#0284c7' : '#94a3b8' }}>
              {form.isShared
                ? 'All stores share the same point pool — changes reflect everywhere instantly'
                : 'This game belongs to this store only'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', border: 'none', borderRadius: '20px',
              cursor: 'pointer', fontSize: '11px', fontWeight: '700',
              background: form.isShared ? '#dcfce7' : '#f1f5f9',
              color: form.isShared ? '#15803d' : '#94a3b8',
            }}
          >
            <span style={{
              position: 'relative', width: '26px', height: '14px',
              borderRadius: '7px', background: form.isShared ? '#22c55e' : '#cbd5e1',
              flexShrink: 0, display: 'inline-block',
            }}>
              <span style={{
                position: 'absolute', top: '2px',
                left: form.isShared ? '14px' : '2px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#fff', transition: 'left .2s',
              }} />
            </span>
            {form.isShared ? 'Shared' : 'Private'}
          </button>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Status</label>
          <div style={{ position: 'relative' }}>
            <select name="status" value={form.status} onChange={handleChange} style={SELECT}>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="DEFICIT">Deficit</option>
            </select>
            <ChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} disabled={loading}
            style={{ flex: 1, padding: '11px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{
              flex: 2, padding: '11px', border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '13px',
              background: loading ? '#e2e8f0' : '#0ea5e9',
              color: loading ? '#94a3b8' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}>
            {loading ? '⏳ Creating…' : <><Plus style={{ width: '14px', height: '14px' }} /> Create Game</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: '', label: 'All Games' },
  { key: 'LOW_STOCK', label: '⚠ Low Stock' },
  { key: 'DEFICIT', label: '✕ Deficit' },
];

export default function Games() {
  const { usr } = useContext(CurrentUserContext);
  const { add: toast } = useToast();

  const isAdmin = usr?.role === 'ADMIN' || usr?.role === 'SUPER_ADMIN';

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Load games ────────────────────────────────────────────────────────────
  const loadGames = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (typeof api.clearCache === 'function') api.clearCache();
      const res = await api.games.getGames(true, { status: filter, search });
      setGames(res?.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      if (!silent) toast(e.message || 'Failed to load games.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { loadGames(); }, [loadGames, refreshKey]);

  useEffect(() => {
    const refresh = () => setRefreshKey(k => k + 1);
    window.addEventListener('transactionUndone', refresh);
    window.addEventListener('apiUndoTransaction', refresh);
    return () => {
      window.removeEventListener('transactionUndone', refresh);
      window.removeEventListener('apiUndoTransaction', refresh);
    };
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: games.length,
    healthy: games.filter(g => g.pointStock > 500).length,
    lowStock: games.filter(g => g.pointStock > 0 && g.pointStock <= 500).length,
    deficit: games.filter(g => g.pointStock <= 0).length,
    totalStock: games.reduce((a, g) => a + (g.pointStock || 0), 0),
  };


  useEffect(() => {
    // Listen for shared game updates from other stores
    const sse = api.tasks?.connectSSE?.();
    if (!sse) return;
    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'shared_game_updated') {
          setGames(prev => prev.map(g =>
            g.id === msg.data.gameId
              ? { ...g, pointStock: msg.data.pointStock, status: msg.data.status }
              : g
          ));
        }
      } catch { }
    };
    sse.addEventListener('message', handler);
    return () => { sse.removeEventListener('message', handler); sse.close(); };
  }, []);

  // ── Update handler (optimistic) ───────────────────────────────────────────
  const handleUpdate = useCallback(async (gameId, newStock) => {
    const newStatus = computeStatus(newStock);
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, pointStock: newStock, status: newStatus } : g));
    try {
      await api.games.updateGame(gameId, { pointStock: newStock, status: newStatus });
      toast('Stock update will reflect within a few seconds.', 'success');
    } catch (e) {
      setRefreshKey(k => k + 1);
      toast(e.message || 'Failed to update points.', 'error');
      throw e;
    }
  }, []);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDeleted = useCallback((gameId) => {
    setGames(prev => prev.filter(g => g.id !== gameId));
    setDeleteTarget(null);
    toast('Game deleted successfully.', 'success');
  }, []);

  const handleToggleShare = useCallback(async (game) => {
    try {
      await api.games.updateGame(game.id, {}); // placeholder — use share endpoint
      // Direct fetch to share endpoint
      const token = localStorage.getItem('authToken');
      await fetch(`${import.meta.env.VITE_API_URL}/games/${game.id}/share`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Store-Id': String(api.getStoreId?.() || 1),
        },
        credentials: 'include',
        body: JSON.stringify({ isShared: !game.isShared }),
      });
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, isShared: !g.isShared } : g));
      toast(`"${game.name}" is now ${!game.isShared ? 'shared across all stores' : 'store-private'}.`, 'success');
    } catch (e) {
      toast(e.message || 'Failed to update share status.', 'error');
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── Stat Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {[
          { icon: Gamepad2, label: 'Total Games', value: stats.total, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
          { icon: CheckCircle, label: 'Healthy', value: stats.healthy, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
          { icon: AlertTriangle, label: 'Low Stock', value: stats.lowStock, color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
          { icon: AlertCircle, label: 'Deficit', value: stats.deficit, color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
          { icon: Package, label: 'Total Stock', value: Math.round(stats.totalStock).toLocaleString(), color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map(({ icon: Icon, label, value, color, bg, border }) => (
          <div key={label} style={{ ...CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: '17px', height: '17px', color }} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', fontWeight: '600' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Card ── */}
      <div style={{ ...CARD, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Game Directory</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
              Manage point stock levels · Low stock ≤ 500 pts · Deficit = 0 or below
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search games…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...INPUT, paddingLeft: '30px', paddingRight: search ? '30px' : '12px', width: '175px', padding: '8px 12px 8px 30px', fontSize: '12px' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X style={{ width: '13px', height: '13px' }} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${filter === tab.key ? '#0ea5e9' : '#e2e8f0'}`,
                  background: filter === tab.key ? '#f0f9ff' : '#fff',
                  color: filter === tab.key ? '#0ea5e9' : '#64748b',
                  fontWeight: filter === tab.key ? '700' : '500',
                  fontSize: '12px', transition: 'all 0.12s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <button onClick={() => loadGames()} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
            <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>

          {isAdmin && (
            <button onClick={() => setShowNewModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: 'none', borderRadius: '8px', background: '#0ea5e9', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: '700', flexShrink: 0, boxShadow: '0 2px 8px rgba(14,165,233,0.35)' }}>
              <Plus style={{ width: '13px', height: '13px' }} /> New Game
            </button>
          )}

          <span style={{ fontSize: '10px', color: '#cbd5e1', flexShrink: 0 }}>{lastRefresh.toLocaleTimeString()}</span>
        </div>


        {/* Content */}
        <div style={{ padding: '18px' }}>
          {loading ? (
            // <div style={{ padding: '60px', textAlign: 'center' }}>
            //   <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            //   <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Loading games…</p>
            // </div>
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "smartSpin .8s linear infinite" }} />
              Loading games…
            </div>
          ) : games.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {search ? `No games found for "${search}"` : 'No games found'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
              {games.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  isAdmin={isAdmin}
                  onUpdate={handleUpdate}
                  onDelete={setDeleteTarget}
                  onToggleShare={handleToggleShare}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showNewModal && (
        <NewGameModal
          onClose={() => setShowNewModal(false)}
          onCreated={newGame => {
            setGames(prev => [newGame, ...prev]);
            setShowNewModal(false);
            toast(`"${newGame.name}" created successfully.`, 'success');
          }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          game={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      <style>{`
                @keyframes smartSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
    </div>
  );
}
