import React, { useState, useEffect } from 'react';
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
  if (pointStock < 100) return '#ef4444'; // red
  if (pointStock < 1000) return '#f59e0b'; // amber
  return '#16a34a';                         // green
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = getStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 20,
      backgroundColor: cfg.bg,
      color: cfg.text,
      fontSize: 12,
      fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Game Card ────────────────────────────────────────────────

function GameCard({ game }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'box-shadow 0.2s, transform 0.2s',
      cursor: 'default',
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
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {getInitials(game.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
            {game.name}
          </div>
          <div style={{ marginTop: 4 }}>
            <StatusBadge status={game.status} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #f1f3f8' }} />

      {/* Point stock */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Point Stock
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: 10, padding: '12px 16px', textAlign: 'center',
        }}>
          <span style={{
            fontSize: 26, fontWeight: 700,
            color: getStockColor(game.pointStock),
            fontFamily: "'DM Mono', 'Fira Code', monospace",
          }}>
            {Number(game.pointStock).toFixed(2)}
          </span>
        </div>
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
      fontWeight: 600, fontSize: 13,
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'LOW_STOCK', label: 'Low Stock' },
  { key: 'DEFICIT', label: 'Deficit' },
];

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.games.getGames(true, {
          status: filter || '',
          search: search || '',
        });
        setGames(res.data || []);
      } catch (err) {
        console.error('Failed to load games:', err);
        setError(err.message || 'Failed to load games');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter, search]);

  return (
    <div style={{ minHeight: '100vh', background: 'none', fontFamily: "'Inter', sans-serif" }}>

      {/* Page header */}
      <div style={{ padding: '28px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {/* <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e1f26' }}>Games</h1> */}
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
      <div style={{ padding: '20px 32px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
            🔍
          </span>
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

        {/* Filter tabs */}
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
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', color: '#b91c1c' }}>
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
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* New Game Modal */}
      {showModal && (
        <NewGameModal
          onClose={() => setShowModal(false)}
          onCreated={newGame => setGames(prev => [newGame, ...prev])}
        />
      )}
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
      onClose();
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#1e1f26' }}>New Game</div>

        {[
          { label: 'Game Name', name: 'name', type: 'text', placeholder: 'e.g. Cash Frenzy' },
          { label: 'Slug', name: 'slug', type: 'text', placeholder: 'e.g. cash-frenzy' },
          { label: 'Point Stock', name: 'pointStock', type: 'number', placeholder: '0' },
        ].map(field => (
          <div key={field.name}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
              {field.label}
            </label>
            <input name={field.name} type={field.type} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} style={inputStyle} />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Status</label>
          <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
            <option value="HEALTHY">Healthy</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="DEFICIT">Deficit</option>
          </select>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating…' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
}