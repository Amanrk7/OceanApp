import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Edit2, Trash2, X, AlertCircle, TrendingDown, User, Calendar, CreditCard, RefreshCw, Download } from 'lucide-react';
import { api } from '../api';

// ─── Style constants (match existing pages) ───────────────────────────────────
const CARD = {
    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(15,23,42,.07)',
};
const LABEL = {
    display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT_BASE = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a',
    outline: 'none', transition: 'border-color .15s, background .15s',
};
const TH = {
    textAlign: 'left', padding: '10px 16px', fontWeight: '600', color: '#64748b',
    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc',
};
const TD = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a', verticalAlign: 'middle' };

const METHODS = ['Cash', 'Bank Transfer', 'Crypto', 'PayPal', 'CashApp', 'Chime', 'Zelle', 'Other'];

const METHOD_COLORS = {
    Cash: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
    'Bank Transfer': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    Crypto: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    PayPal: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    CashApp: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
    Chime: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
    Zelle: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
    Other: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n) =>
    `$${(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago', month: 'short', day: 'numeric',
        year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
};

const fmtDateInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const todayInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FocusInput({ as: Tag = 'input', style, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <Tag
            {...props}
            style={{ ...INPUT_BASE, ...(focused ? { borderColor: '#94a3b8', background: '#fff' } : {}), ...style }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

function AlertBanner({ type = 'error', message, onDismiss }) {
    if (!message) return null;
    const s = type === 'success'
        ? { bg: '#dcfce7', border: '#86efac', text: '#166534' }
        : { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };
    return (
        <div style={{ padding: '11px 14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', color: s.text, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {message}
            </span>
            {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, fontSize: '16px', lineHeight: 1 }}>×</button>}
        </div>
    );
}

function StatCard({ label, value, subValue, icon: Icon, color, trend }) {
    const colors = {
        red: { bg: '#fff1f2', icon: '#dc2626', border: '#fecdd3', val: '#dc2626' },
        amber: { bg: '#fffbeb', icon: '#d97706', border: '#fde68a', val: '#d97706' },
        blue: { bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe', val: '#2563eb' },
        purple: { bg: '#faf5ff', icon: '#7c3aed', border: '#e9d5ff', val: '#7c3aed' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div style={{ ...CARD, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: '16px', height: '16px', color: c.icon }} />
                </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: c.val, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
            {subValue && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>{subValue}</div>}
        </div>
    );
}

function MethodBadge({ method }) {
    const c = METHOD_COLORS[method] || METHOD_COLORS.Other;
    return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
            {method}
        </span>
    );
}

function Modal({ isOpen, onClose, title, accent = '#dc2626', icon: Icon, children }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(15,23,42,.18)', width: '100%', maxWidth: '500px', margin: '0 16px', zIndex: 10, overflow: 'hidden' }}>
                <div style={{ height: '4px', background: accent }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 28px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    {Icon && (
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: '17px', height: '17px', color: accent }} />
                        </div>
                    )}
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', flex: 1 }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#94a3b8', borderRadius: '7px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <X style={{ width: '15px', height: '15px' }} />
                    </button>
                </div>
                <div style={{ padding: '22px 28px 28px' }}>{children}</div>
            </div>
        </div>
    );
}

function DeleteConfirmModal({ record, onConfirm, onCancel, loading }) {
    if (!record) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(15,23,42,.16)', width: '100%', maxWidth: '400px', margin: '0 16px', zIndex: 10, padding: '28px 28px 24px', textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Trash2 style={{ width: '22px', height: '22px', color: '#dc2626' }} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700' }}>Delete this record?</h3>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
                    {fmtMoney(record.amount)} taken by <strong>{record.takenBy}</strong> on {fmtDate(record.takenAt)} will be permanently removed.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onCancel} style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Form for Add / Edit ──────────────────────────────────────────────────────
function TakeoutForm({ initial, wallets, onSubmit, onCancel, loading, error }) {
    const [form, setForm] = useState({
        amount: initial?.amount ? String(parseFloat(initial.amount)) : '',
        takenBy: initial?.takenBy || '',
        method: initial?.method || 'Cash',
        walletId: initial?.walletId ? String(initial.walletId) : '',
        notes: initial?.notes || '',
        takenAt: initial?.takenAt ? fmtDateInput(initial.takenAt) : todayInput(),
    });

    const handleChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            amount: parseFloat(form.amount),
            takenBy: form.takenBy.trim(),
            method: form.method,
            walletId: form.walletId ? parseInt(form.walletId) : null,
            notes: form.notes.trim() || null,
            takenAt: form.takenAt ? new Date(form.takenAt).toISOString() : new Date().toISOString(),
        });
    };

    const flatWallets = wallets.flatMap(g =>
        g.subAccounts.filter(s => s.isLive !== false).map(s => ({
            id: s.id, label: `${g.method} — ${s.name} ($${Number(s.balance || 0).toFixed(2)})`,
        }))
    );

    // const loadWallets = useCallback(async () => {
    //     try {
    //         const r = await api.wallets.getGroupedWallets(true);
    //         const flat = (r?.data || []).flatMap(g =>
    //             g.subAccounts
    //                 .filter(s => s.isLive !== false)
    //                 .map(s => ({ ...s, label: `${g.method} — ${s.name}  (${fmt(s.balance)})`, methodName: g.method, methodId: g.id }))
    //         );
    //         setWallets(flat);
    //     } catch (e) { console.error(e); }
    // }, []);

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={LABEL}>Amount ($) *</label>
                    <FocusInput type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={handleChange('amount')} required />
                </div>
                <div>
                    <label style={LABEL}>Taken By *</label>
                    <FocusInput type="text" placeholder="Name of person" value={form.takenBy} onChange={handleChange('takenBy')} required />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={LABEL}>Method</label>
                    <FocusInput as="select" value={form.method} onChange={handleChange('method')}>
                        {METHODS.map(m => <option key={m}>{m}</option>)}
                    </FocusInput>
                </div>
                <div>
                    <label style={LABEL}>Deduct from Wallet</label>
                    <FocusInput as="select" value={form.walletId} onChange={handleChange('walletId')}>
                        <option value="">— None / Manual —</option>
                        {flatWallets.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </FocusInput>
                </div>
            </div>

            <div>
                <label style={LABEL}>Date & Time *</label>
                <FocusInput type="datetime-local" value={form.takenAt} onChange={handleChange('takenAt')} required />
            </div>

            <div>
                <label style={LABEL}>Notes (optional)</label>
                <FocusInput as="textarea" rows={2} placeholder="Reason, purpose, context…" value={form.notes} onChange={handleChange('notes')} style={{ resize: 'none', lineHeight: '1.6' }} />
            </div>

            {error && <AlertBanner type="error" message={error} />}

            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                <button type="button" onClick={onCancel}
                    style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: '#475569' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                    Cancel
                </button>
                <button type="submit" disabled={loading}
                    style={{ flex: 1, padding: '11px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Saving…' : initial ? 'Save Changes' : 'Record Takeout'}
                </button>
            </div>
        </form>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfitTakeoutsPage() {
    const [records, setRecords] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState({ type: '', msg: '' });

    const [showAdd, setShowAdd] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [deleteRecord, setDeleteRecord] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [formError, setFormError] = useState('');

    const [search, setSearch] = useState('');
    const [filterMethod, setFilterMethod] = useState('All');
    const [filterPerson, setFilterPerson] = useState('All');
    const [sortField, setSortField] = useState('takenAt');
    const [sortDir, setSortDir] = useState('desc');

    const showBanner = (type, msg) => {
        setBanner({ type, msg });
        setTimeout(() => setBanner({ type: '', msg: '' }), 4500);
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [res, wRes] = await Promise.all([
                api.profitTakeouts.getAll(),
                api.wallets.getGroupedWallets(true),
            ]);
            setRecords(res.data || []);
            setWallets(wRes.data || []);
        } catch (err) {
            showBanner('error', err.message || 'Failed to load records');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());

    const totalAll = records.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalMonth = records.filter(r => new Date(r.takenAt) >= startOfMonth).reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalWeek = records.filter(r => new Date(r.takenAt) >= startOfWeek).reduce((s, r) => s + parseFloat(r.amount), 0);
    const uniquePeople = [...new Set(records.map(r => r.takenBy))];

    // ── Filtering & sorting ───────────────────────────────────────────────────
    let filtered = records;
    if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(r =>
            r.takenBy?.toLowerCase().includes(s) ||
            r.method?.toLowerCase().includes(s) ||
            r.notes?.toLowerCase().includes(s)
        );
    }
    if (filterMethod !== 'All') filtered = filtered.filter(r => r.method === filterMethod);
    if (filterPerson !== 'All') filtered = filtered.filter(r => r.takenBy === filterPerson);

    filtered = [...filtered].sort((a, b) => {
        const aV = sortField === 'amount' ? parseFloat(a.amount) : new Date(a[sortField]).getTime();
        const bV = sortField === 'amount' ? parseFloat(b.amount) : new Date(b[sortField]).getTime();
        return sortDir === 'asc' ? aV - bV : bV - aV;
    });

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortBtn = ({ field, label }) => (
        <button onClick={() => toggleSort(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {label}
            <span style={{ color: sortField === field ? '#2563eb' : '#cbd5e1', fontSize: '10px' }}>
                {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
            </span>
        </button>
    );

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAdd = async (body) => {
        setSubmitting(true); setFormError('');
        try {
            await api.profitTakeouts.create(body);
            await load();
            setShowAdd(false);
            showBanner('success', `Takeout of ${fmtMoney(body.amount)} recorded for ${body.takenBy}.`);
        } catch (err) { setFormError(err.message || 'Failed to save'); }
        finally { setSubmitting(false); }
    };

    const handleEdit = async (body) => {
        setSubmitting(true); setFormError('');
        try {
            await api.profitTakeouts.update(editRecord.id, body);
            await load();
            setEditRecord(null);
            showBanner('success', 'Record updated.');
        } catch (err) { setFormError(err.message || 'Failed to update'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteRecord) return;
        setDeletingId(deleteRecord.id);
        try {
            await api.profitTakeouts.remove(deleteRecord.id);
            await load();
            setDeleteRecord(null);
            showBanner('success', 'Record deleted.');
        } catch (err) { showBanner('error', err.message || 'Delete failed'); }
        finally { setDeletingId(null); }
    };

    // ── Per-person summary ─────────────────────────────────────────────────────
    const personTotals = uniquePeople.map(name => ({
        name,
        total: records.filter(r => r.takenBy === name).reduce((s, r) => s + parseFloat(r.amount), 0),
        count: records.filter(r => r.takenBy === name).length,
        last: records.filter(r => r.takenBy === name).sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt))[0]?.takenAt,
    })).sort((a, b) => b.total - a.total);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Stats row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <StatCard label="Total Taken Out" value={fmtMoney(totalAll)} subValue={`${records.length} records`} icon={TrendingDown} color="red" />
                <StatCard label="This Month" value={fmtMoney(totalMonth)} subValue="Current calendar month" icon={Calendar} color="amber" />
                <StatCard label="This Week" value={fmtMoney(totalWeek)} subValue="Since Sunday" icon={DollarSign} color="blue" />
                <StatCard label="Recipients" value={uniquePeople.length} subValue="Unique people" icon={User} color="purple" />
            </div>

            {/* ── Global banner ── */}
            {banner.msg && <AlertBanner type={banner.type} message={banner.msg} onDismiss={() => setBanner({ type: '', msg: '' })} />}

            {/* ── Per-person breakdown ── */}
            {personTotals.length > 0 && (
                <div style={{ ...CARD, padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User style={{ width: '15px', height: '15px', color: '#7c3aed' }} />
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Breakdown by Recipient</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Person', 'Total Taken', 'Withdrawals', 'Last Takeout', 'Share'].map(h => (
                                        <th key={h} style={{ ...TH }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {personTotals.map((p, i) => {
                                    const pct = totalAll > 0 ? (p.total / totalAll) * 100 : 0;
                                    return (
                                        <tr key={p.name}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={TD}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${(i * 73) % 360}, 60%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: `hsl(${(i * 73) % 360}, 60%, 35%)`, flexShrink: 0 }}>
                                                        {p.name[0].toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: '600' }}>{p.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...TD, fontWeight: '800', fontSize: '14px', color: '#dc2626' }}>{fmtMoney(p.total)}</td>
                                            <td style={{ ...TD, color: '#64748b' }}>{p.count} time{p.count !== 1 ? 's' : ''}</td>
                                            <td style={{ ...TD, color: '#64748b', fontSize: '12px' }}>{p.last ? fmtDate(p.last) : '—'}</td>
                                            <td style={{ ...TD, minWidth: '160px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: '#dc2626', borderRadius: '99px', transition: 'width .3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', minWidth: '36px' }}>{pct.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Ledger table ── */}
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                {/* Table header row */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Profit Takeout Ledger</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} · All times in CT (Texas)</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            placeholder="Search name, method, notes…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ ...INPUT_BASE, width: '210px', padding: '8px 12px', fontSize: '13px' }}
                        />
                        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                        </button>
                        <button onClick={() => { setFormError(''); setShowAdd(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>
                            <Plus style={{ width: '14px', height: '14px' }} /> Record Takeout
                        </button>
                    </div>
                </div>

                {/* Filter chips */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: '4px' }}>Method:</span>
                    {['All', ...METHODS].map(m => (
                        <button key={m} onClick={() => setFilterMethod(m)} style={{ padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', border: filterMethod === m ? 'none' : '1px solid #e2e8f0', background: filterMethod === m ? '#dc2626' : 'transparent', color: filterMethod === m ? '#fff' : '#64748b', transition: 'all .12s' }}>
                            {m}
                        </button>
                    ))}
                    {uniquePeople.length > 0 && (
                        <>
                            <span style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 6px' }} />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: '4px' }}>Person:</span>
                            {['All', ...uniquePeople].map(p => (
                                <button key={p} onClick={() => setFilterPerson(p)} style={{ padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', border: filterPerson === p ? 'none' : '1px solid #e2e8f0', background: filterPerson === p ? '#7c3aed' : 'transparent', color: filterPerson === p ? '#fff' : '#64748b', transition: 'all .12s' }}>
                                    {p}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                                <th style={TH}><SortBtn field="takenAt" label="Date & Time" /></th>
                                <th style={TH}>Taken By</th>
                                <th style={{ ...TH, textAlign: 'right' }}><SortBtn field="amount" label="Amount" /></th>
                                <th style={TH}>Method</th>
                                <th style={TH}>Wallet Deducted</th>
                                <th style={TH}>Notes</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                                    Loading records…
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    <TrendingDown style={{ width: '28px', height: '28px', margin: '0 auto 10px', display: 'block', color: '#e2e8f0' }} />
                                    No records{search || filterMethod !== 'All' || filterPerson !== 'All' ? ' match the current filters' : ' yet'}
                                </td></tr>
                            ) : filtered.map((r, idx) => {
                                const flatWallets = wallets.flatMap(g => g.subAccounts);
                                const wallet = r.walletId ? flatWallets.find(w => w.id === r.walletId) : null;
                                const isLastRow = idx === filtered.length - 1;
                                return (
                                    <tr key={r.id}
                                        style={{ borderBottom: isLastRow ? 'none' : '1px solid #f1f5f9' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ ...TD, color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {fmtDate(r.takenAt)}
                                        </td>
                                        <td style={TD}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#dc2626', flexShrink: 0 }}>
                                                    {r.takenBy[0]?.toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: '600' }}>{r.takenBy}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...TD, fontWeight: '800', fontSize: '15px', color: '#dc2626' }}>
                                            {fmtMoney(r.amount)}
                                        </td>
                                        <td style={TD}><MethodBadge method={r.method} /></td>
                                        <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>
                                            {wallet
                                                ? <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', borderRadius: '5px', fontWeight: '500' }}>{wallet.method} — {wallet.name}</span>
                                                : <span style={{ color: '#cbd5e1' }}>Manual</span>
                                            }
                                        </td>
                                        <td style={{ ...TD, color: '#64748b', maxWidth: '200px' }}>
                                            {r.notes
                                                ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>{r.notes}</span>
                                                : <span style={{ color: '#e2e8f0' }}>—</span>
                                            }
                                        </td>
                                        <td style={{ ...TD, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setFormError(''); setEditRecord(r); }}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
                                                    <Edit2 style={{ width: '10px', height: '10px' }} /> Edit
                                                </button>
                                                <button onClick={() => setDeleteRecord(r)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#fff1f2', color: '#dc2626', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}>
                                                    <Trash2 style={{ width: '10px', height: '10px' }} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {/* Footer total */}
                        {filtered.length > 0 && !loading && (
                            <tfoot>
                                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                    <td style={{ ...TD, fontWeight: '700', fontSize: '12px', color: '#475569' }} colSpan={2}>
                                        Total ({filtered.length} records)
                                    </td>
                                    <td style={{ ...TD, textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#dc2626' }}>
                                        {fmtMoney(filtered.reduce((s, r) => s + parseFloat(r.amount), 0))}
                                    </td>
                                    <td colSpan={4} style={TD} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ══════════ ADD MODAL ══════════ */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Profit Takeout" accent="#dc2626" icon={TrendingDown}>
                <TakeoutForm
                    wallets={wallets}
                    onSubmit={handleAdd}
                    onCancel={() => setShowAdd(false)}
                    loading={submitting}
                    error={formError}
                />
            </Modal>

            {/* ══════════ EDIT MODAL ══════════ */}
            <Modal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Record" accent="#2563eb" icon={Edit2}>
                {editRecord && (
                    <TakeoutForm
                        initial={editRecord}
                        wallets={wallets}
                        onSubmit={handleEdit}
                        onCancel={() => setEditRecord(null)}
                        loading={submitting}
                        error={formError}
                    />
                )}
            </Modal>

            {/* ══════════ DELETE CONFIRM ══════════ */}
            <DeleteConfirmModal
                record={deleteRecord}
                onConfirm={handleDelete}
                onCancel={() => setDeleteRecord(null)}
                loading={!!deletingId}
            />

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
        </div>
    );
}
