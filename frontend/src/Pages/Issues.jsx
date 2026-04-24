import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, RefreshCw, Plus, Search, X,
  Clock, Flag, User, Filter, Inbox,
} from 'lucide-react';
import { useToast } from '../Context/toastContext';
import { api } from '../api';
import { fmtTXDate, fmtTXTime } from '../utils/txTime';

// ─── Design tokens (mirrors PlaytimePage) ────────────────────────────────────
const CARD = {
  background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
  boxShadow: '0 2px 12px rgba(15,23,42,.07)',
};
const LABEL = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b',
  letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
  boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a', outline: 'none',
  transition: 'border-color .15s, background .15s',
};
const INPUT_FOCUS = { borderColor: '#0ea5e9', background: '#fff', boxShadow: '0 0 0 3px rgba(14,165,233,.12)' };

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY = {
  HIGH: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444', label: 'High' },
  MEDIUM: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b', label: 'Medium' },
  LOW: { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e', label: 'Low' },
};
const getPriority = (p) => PRIORITY[p?.toUpperCase()] || PRIORITY.MEDIUM;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (raw) => {
  if (!raw) return '—';
  return fmtTXDate(raw) + ' · ' + fmtTXTime(raw);
};

// ─── Stat card (matches PlaytimePage strip) ───────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg, border }) {
  return (
    <div style={{ ...CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: '17px', height: '17px', color }} />
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', fontWeight: '600' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const c = getPriority(priority);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

// ─── Focus-aware input ────────────────────────────────────────────────────────
function FocusInput({ as: Tag = 'input', style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Tag {...props}
      style={{ ...INPUT, ...(focused ? INPUT_FOCUS : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)} />
  );
}

// ─── Add / Edit Issue Modal ───────────────────────────────────────────────────
function AddIssueModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', playerName: '', priority: 'MEDIUM' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast(e.message || 'Issue title is required', "error");
      return;
    }
    if (!form.description.trim()) {
      toast('Description is required', "error");

      return;
    }
    try {
      setLoading(true);
      await api.issues.issues.createIssue({ title: form.title, description: form.description, playerName: form.playerName || null, priority: form.priority });
      toast('Issue submitted!', "success");

      setTimeout(() => onCreated?.(), 900);
    } catch (err) {
      toast(err.message || 'Failed to submit', "error");
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ ...CARD, position: 'relative', zIndex: 1, width: '100%', maxWidth: '520px', margin: '0 16px', overflow: 'hidden' }}>
        {/* Accent bar */}
        <div style={{ height: '4px', background: '#0ea5e9' }} />

        {/* Header */}
        <div style={{ padding: '18px 26px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle style={{ width: '17px', height: '17px', color: '#0ea5e9' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Submit New Issue</h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Report and track a player issue for resolution</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: '7px', padding: '5px', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 26px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={LABEL}>Issue Title <span style={{ color: '#ef4444' }}>*</span></label>
            <FocusInput type="text" value={form.title} onChange={set('title')} placeholder="Brief summary of the issue" required />
          </div>

          <div>
            <label style={LABEL}>Description <span style={{ color: '#ef4444' }}>*</span></label>
            <FocusInput as="textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Full details of what happened…" style={{ resize: 'vertical', minHeight: '88px', lineHeight: '1.6' }} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={LABEL}>Player Name</label>
              <FocusInput type="text" value={form.playerName} onChange={set('playerName')} placeholder="Affected player" />
            </div>
            <div>
              <label style={LABEL}>Priority</label>
              <FocusInput as="select" value={form.priority} onChange={set('priority')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </FocusInput>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: '#475569' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '11px', background: loading ? '#7dd3fc' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? '⏳ Submitting…' : <><CheckCircle style={{ width: '14px', height: '14px' }} /> Submit Issue</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Issue card ───────────────────────────────────────────────────────────────
function IssueCard({ issue, onResolve, resolving }) {
  const [hover, setHover] = useState(false);
  const p = getPriority(issue.priority);
  const isResolved = issue.status === 'RESOLVED' || issue.status === 'Resolved';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...CARD, padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'box-shadow .15s', boxShadow: hover ? '0 4px 20px rgba(15,23,42,.11)' : CARD.boxShadow, borderLeft: `3px solid ${p.dot}` }}>

      {/* Priority dot */}
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.dot, flexShrink: 0, marginTop: '5px', boxShadow: `0 0 6px ${p.dot}66` }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0, flex: 1, minWidth: 0 }}>{issue.title}</h3>
          <PriorityBadge priority={issue.priority} />
          {isResolved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              <CheckCircle style={{ width: '11px', height: '11px' }} /> Resolved
            </span>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px', lineHeight: '1.55' }}>{issue.description}</p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {issue.playerName && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              <User style={{ width: '12px', height: '12px' }} /> {issue.playerName}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#94a3b8' }}>
            <Clock style={{ width: '11px', height: '11px' }} /> {fmtDate(issue.createdAt || issue.date)}
          </span>
        </div>
      </div>

      {/* Action */}
      {!isResolved && (
        <button onClick={() => onResolve(issue.id)} disabled={resolving === issue.id}
          style={{ flexShrink: 0, padding: '7px 14px', background: resolving === issue.id ? '#f1f5f9' : '#f0fdf4', border: `1px solid ${resolving === issue.id ? '#e2e8f0' : '#86efac'}`, borderRadius: '8px', color: resolving === issue.id ? '#94a3b8' : '#16a34a', fontWeight: '700', fontSize: '12px', cursor: resolving === issue.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all .12s' }}
          onMouseEnter={e => { if (resolving !== issue.id) { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#4ade80'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}>
          {resolving === issue.id
            ? '⏳ Resolving…'
            : <><CheckCircle style={{ width: '12px', height: '12px' }} /> Mark Solved</>}
        </button>
      )}
    </div>
  );
}

// ─── Main Issues page ─────────────────────────────────────────────────────────
export default function Issues() {
  const { add: toast } = useToast();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('unresolved');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [resolving, setResolving] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.issues.issues.getIssues(true);
      setIssues(data.data || []);
    } catch (e) {
      toast(e.message || 'Failed to load issues', "error");

    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (id) => {
    try {
      setResolving(id);
      await api.issues.issues.resolveIssue(id);
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
      toast('Issue marked as resolved.', "success");
    } catch (e) {
      toast(e.message || 'Failed to resolve issue', "error");

    }
    finally { setResolving(null); }
  };

  const isResolved = (issue) => issue.status === 'RESOLVED' || issue.status === 'Resolved';

  // Stats
  const total = issues.length;
  const unresolved = issues.filter(i => !isResolved(i)).length;
  const resolved = issues.filter(i => isResolved(i)).length;
  const highPri = issues.filter(i => !isResolved(i) && i.priority?.toUpperCase() === 'HIGH').length;

  // Filtered list
  let filtered = issues.filter(i => filterTab === 'unresolved' ? !isResolved(i) : isResolved(i));
  if (filterPriority !== 'All') filtered = filtered.filter(i => i.priority?.toUpperCase() === filterPriority);
  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(i => i.title?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s) || i.playerName?.toLowerCase().includes(s));
  }

  const TABS = [
    { id: 'unresolved', label: 'Unresolved', count: unresolved },
    { id: 'resolved', label: 'Resolved', count: resolved },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── Stat strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <StatCard icon={Inbox} label="Total Issues" value={total} color="#0ea5e9" bg="#f0f9ff" border="#bae6fd" />
        <StatCard icon={AlertCircle} label="Unresolved" value={unresolved} color="#f59e0b" bg="#fffbeb" border="#fde68a" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolved} color="#10b981" bg="#f0fdf4" border="#86efac" />
        <StatCard icon={Flag} label="High Priority" value={highPri} color="#ef4444" bg="#fee2e2" border="#fca5a5" />
      </div>

      {/* ── Main card ── */}
      <div style={{ ...CARD, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Issue Tracker</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Report, track, and resolve player issues</div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Search style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search issues…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...INPUT, paddingLeft: '30px', paddingRight: search ? '28px' : '12px', width: '175px', padding: '8px 28px 8px 30px', fontSize: '12px', background: '#fff' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Filter style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              style={{ ...INPUT, paddingLeft: '28px', width: '130px', padding: '8px 28px 8px 28px', fontSize: '12px', appearance: 'none', background: '#fff', cursor: 'pointer' }}>
              <option value="All">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
            <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>

          <button onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 3px rgba(14,165,233,.35)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0284c7'}
            onMouseLeave={e => e.currentTarget.style.background = '#0ea5e9'}>
            <Plus style={{ width: '14px', height: '14px' }} /> Submit Issue
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 18px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setFilterTab(t.id)}
              style={{
                padding: '10px 14px', background: 'none', border: 'none', fontWeight: '700', fontSize: '12px', color: filterTab === t.id ? '#0ea5e9' : '#94a3b8', borderBottom: `2px solid ${filterTab === t.id ? '#0ea5e9' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .12s', letterSpacing: '0.4px', textTransform: 'none'
              }}>
              {t.label}
              <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', background: filterTab === t.id ? (t.id === 'unresolved' ? '#fef3c7' : '#dcfce7') : '#f1f5f9', color: filterTab === t.id ? (t.id === 'unresolved' ? '#92400e' : '#166634') : '#94a3b8' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Issue list */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '65vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f8fafc' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Loading issues…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid #e2e8f0' }}>
                <Inbox style={{ width: '20px', height: '20px', color: '#cbd5e1' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
                {search ? `No results for "${search}"` : `No ${filterTab} issues`}
              </p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {!search && filterTab === 'unresolved' ? 'All caught up! No open issues right now.' : ''}
              </p>
            </div>
          ) : (
            filtered.map(issue => (
              <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} resolving={resolving} />
            ))
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{filtered.length} issue{filtered.length !== 1 ? 's' : ''} shown</span>
            {filterTab === 'unresolved' && filtered.filter(i => i.priority?.toUpperCase() === 'HIGH').length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flag style={{ width: '11px', height: '11px' }} />
                {filtered.filter(i => i.priority?.toUpperCase() === 'HIGH').length} high priority
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Add issue modal ── */}
      {showAdd && (
        <AddIssueModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false); load();
            toast('Issue submitted successfully!', "success");
          }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #f8fafc; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }`}</style>
    </div>
  );
}
