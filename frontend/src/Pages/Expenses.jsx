import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Plus, CheckCircle, AlertCircle, X, CreditCard, Receipt } from 'lucide-react';
import { api } from '../api';

// ─── Texas (Central) timezone helper ─────────────────────────────────────────
// All timestamps are stored as UTC; we always display in America/Chicago (CT).
const TX = { timeZone: 'America/Chicago' };

/** Full datetime string in Texas Central Time */
function formatTX(date, opts = {}) {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        ...TX,
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
        ...opts,
    });
}

/** Date-only in Texas CT */
function formatTXDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
        ...TX, month: 'short', day: 'numeric', year: 'numeric',
    });
}

// ─── Style constants ──────────────────────────────────────────────────────────
const CARD = {
    background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(15,23,42,.07)', padding: '28px 32px',
};
const LABEL = {
    display: 'block', fontSize: '11px', fontWeight: '700',
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const INPUT_BASE = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a', outline: 'none',
    transition: 'border-color .15s, background .15s',
};
const INPUT_FOCUS_STYLE = { border: '1px solid #94a3b8', background: '#fff' };
const TH = {
    textAlign: 'left', padding: '10px 16px', fontWeight: '600',
    color: '#64748b', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
};
const TD = { padding: '11px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' };

// ─── Category helpers ─────────────────────────────────────────────────────────
const DB_TO_LABEL = { POINT_RELOAD: 'Point Reload', SERVICE_FEE: 'Service Fee', OTHER: 'Other' };
const LABEL_TO_DB = { 'Point Reload': 'POINT_RELOAD', 'Service Fee': 'SERVICE_FEE', 'Other': 'OTHER' };
const CATEGORIES   = ['Point Reload', 'Service Fee', 'Other'];

// ─── Focusable Input ──────────────────────────────────────────────────────────
function FocusInput({ as: Tag = 'input', style, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <Tag
            {...props}
            style={{ ...INPUT_BASE, ...(focused ? INPUT_FOCUS_STYLE : {}), ...style }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, accent = '#2563eb', icon: Icon, children }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(15,23,42,.18)', width: '100%', maxWidth: '480px', margin: '0 16px', zIndex: 10, overflow: 'hidden' }}>
                <div style={{ height: '4px', background: accent }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 28px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    {Icon && (
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: '18px', height: '18px', color: accent }} />
                        </div>
                    )}
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', flex: 1 }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#94a3b8', display: 'flex', alignItems: 'center', borderRadius: '8px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <X style={{ width: '16px', height: '16px' }} />
                    </button>
                </div>
                <div style={{ padding: '22px 28px 28px' }}>{children}</div>
            </div>
        </div>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
    const colors = {
        blue:  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
        green: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
        red:   { bg: '#fff1f2', text: '#dc2626', border: '#fecaca' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div style={{ ...CARD, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '20px', height: '20px', color: c.text }} />
            </div>
            <div>
                <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{value}</p>
            </div>
        </div>
    );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
function AlertBanner({ type = 'error', message }) {
    if (!message) return null;
    const s = type === 'success'
        ? { bg: '#dcfce7', border: '#86efac', text: '#166534' }
        : { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };
    return (
        <div style={{ padding: '11px 14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', color: s.text, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {message}
        </div>
    );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={LABEL}>{label}</label>
            {children}
            {hint && <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>{hint}</p>}
        </div>
    );
}

// ─── Modal action row ─────────────────────────────────────────────────────────
function ModalActions({ onCancel, submitLabel, accent = '#2563eb', loading }) {
    return (
        <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
            <button type="button" onClick={onCancel}
                style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: '#475569' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                Cancel
            </button>
            <button type="submit" disabled={loading}
                style={{ flex: 1, padding: '11px', background: accent, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Saving…' : submitLabel}
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ExpensesPage = () => {
    const [games,    setGames]    = useState([]);
    const [wallets,  setWallets]  = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error,        setError]        = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [editError,    setEditError]    = useState(null);

    const [search,         setSearch]         = useState('');
    const [filter,         setFilter]         = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    const [showAddModal,     setShowAddModal]     = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingExpense,   setEditingExpense]   = useState(null); // full expense object

    const [addFormData, setAddFormData] = useState({
        category: 'Point Reload', amount: '', game: '', pointsAdded: '', notes: '',
    });
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '', walletId: '', category: 'Point Reload',
        date: new Date().toISOString().split('T')[0], notes: '',
    });
    const [editFormData, setEditFormData] = useState({
        isPayment: false, category: 'Point Reload', notes: '',
        amount: '', pointsAdded: '', paymentMade: '', walletId: '',
    });

    // ── Loaders ───────────────────────────────────────────────────────────────
    /**
     * Reload games list and return the fresh array.
     * Returning the data lets callers use it immediately without waiting for state.
     */
    const refreshGames = async () => {
        try {
            const res = await api.games.getGames(true, { status: filter || '', search: search || '' });
            const data = res.data || [];
            setGames(data);
            return data;
        } catch (err) {
            console.error('Failed to load games:', err);
            return [];
        }
    };

    const refreshWallets = async () => {
        try {
            const res = await api.wallets.getGroupedWallets(true);
            const flat = (res.data || []).flatMap(group =>
                group.subAccounts.map(sub => ({
                    ...sub,
                    methodLabel: `${group.method} — ${sub.name} ($${Number(sub.balance).toFixed(2)})`,
                }))
            );
            setWallets(flat);
        } catch (err) { console.error('Failed to load wallets:', err); }
    };

    const refreshExpenses = async () => {
        try {
            setLoading(true); setError(null);
            const res = await api.expenses.getExpenses(true);
            setExpenses(res.data || []);
        } catch (err) { setError(err.message || 'Failed to load expenses'); }
        finally { setLoading(false); }
    };

    useEffect(() => { refreshGames(); }, [filter, search]);   // eslint-disable-line
    useEffect(() => { refreshWallets(); }, []);
    useEffect(() => { refreshExpenses(); }, []);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount     || 0), 0);
    const totalPaid     = expenses.reduce((s, e) => s + (e.paymentMade || 0), 0);
    const outstanding   = totalExpenses - totalPaid;

    const gameSummary = expenses.filter(exp => exp.game).reduce((acc, exp) => {
        const name = exp.game.name;
        if (!acc[name]) acc[name] = { totalAmount: 0, totalPoints: 0 };
        acc[name].totalAmount += exp.amount      || 0;
        acc[name].totalPoints += exp.pointsAdded || 0;
        return acc;
    }, {});

    /** A row is a payment when paymentMade > 0 AND amount == 0 */
    const isPaymentRow = (exp) =>
        parseFloat(exp.paymentMade || 0) > 0 && parseFloat(exp.amount || 0) === 0;

    // ── Add expense ───────────────────────────────────────────────────────────
    const handleAddExpense = async (e) => {
        e.preventDefault(); setSubmitting(true); setError(null);
        const selectedGame = games.find(g => g.name === addFormData.game);
        if (!selectedGame) { setError('Please select a valid game.'); setSubmitting(false); return; }
        const pointsAdded = parseInt(addFormData.pointsAdded, 10);
        try {
            await api.expenses.createExpense({
                gameId:      selectedGame.id,
                details:     `Point Reload (${addFormData.game})`,
                category:    LABEL_TO_DB[addFormData.category] || 'POINT_RELOAD',
                amount:      parseFloat(addFormData.amount),
                pointsAdded,
                notes:       addFormData.notes || null,
            });
            // Add points to game stock
            await api.games.updateGame(selectedGame.id, { pointStock: selectedGame.pointStock + pointsAdded });
            await Promise.all([refreshExpenses(), refreshGames()]);
            setAddFormData({ category: 'Point Reload', amount: '', game: '', pointsAdded: '', notes: '' });
            setShowAddModal(false);
        } catch (err) { setError(err.message || 'Failed to record expense'); }
        finally { setSubmitting(false); }
    };

    // ── Edit: open ────────────────────────────────────────────────────────────
    const startEdit = (expense) => {
        const isPay = isPaymentRow(expense);
        setEditingExpense(expense);
        setEditError(null);
        setEditFormData({
            isPayment:   isPay,
            category:    DB_TO_LABEL[expense.category] || 'Point Reload',
            notes:       expense.notes || '',
            amount:      expense.amount      ? String(expense.amount)      : '',
            pointsAdded: expense.pointsAdded ? String(expense.pointsAdded) : '',
            paymentMade: expense.paymentMade ? String(expense.paymentMade) : '',
            walletId:    '',
        });
    };

    // ── Edit: save ────────────────────────────────────────────────────────────
    // KEY FIX: when pointsAdded changes, adjust the linked game's pointStock
    // by the difference (newPoints − oldPoints) so both stay in sync.
    const handleEditExpense = async (e) => {
        e.preventDefault();
        setEditError(null);
        setSubmitting(true);

        try {
            const id         = editingExpense.id;
            const categoryDB = LABEL_TO_DB[editFormData.category] || editFormData.category;

            if (editFormData.isPayment) {
                // ── Payment edit ─────────────────────────────────────────────
                if (!editFormData.walletId) {
                    setEditError('Please select the wallet used for this payment.');
                    setSubmitting(false); return;
                }
                await api.expenses.updateExpense(id, {
                    paymentMade: parseFloat(editFormData.paymentMade),
                    walletId:    editFormData.walletId,
                    category:    categoryDB,
                    notes:       editFormData.notes,
                });
            } else {
                // ── Expense edit ─────────────────────────────────────────────
                const newPoints = editFormData.pointsAdded ? parseInt(editFormData.pointsAdded, 10) : 0;
                const oldPoints = editingExpense.pointsAdded ? parseInt(editingExpense.pointsAdded, 10) : 0;
                const pointsDiff = newPoints - oldPoints;  // +ve = added more, -ve = removed some

                // 1. Persist expense changes
                await api.expenses.updateExpense(id, {
                    amount:      parseFloat(editFormData.amount),
                    category:    categoryDB,
                    notes:       editFormData.notes,
                    pointsAdded: newPoints || undefined,
                });

                // 2. Sync game stock when pointsAdded changed ─────────────────
                if (pointsDiff !== 0 && editingExpense.game?.id) {
                    // Fetch the freshest stock value before adjusting
                    const freshGames = await refreshGames();
                    const linkedGame  = freshGames.find(g => g.id === editingExpense.game.id);
                    if (linkedGame) {
                        const newStock = linkedGame.pointStock + pointsDiff;
                        await api.games.updateGame(linkedGame.id, { pointStock: newStock });
                        // One more refresh so the Games page also shows updated stock
                        await refreshGames();
                    }
                }
            }

            await Promise.all([refreshExpenses(), refreshWallets()]);
            setEditingExpense(null);
        } catch (err) {
            setEditError(err.message || 'Failed to save changes');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Make payment ──────────────────────────────────────────────────────────
    const handleMakePayment = async (e) => {
        e.preventDefault();
        setPaymentError(null); setSubmitting(true);
        if (!paymentFormData.amount || !paymentFormData.walletId) {
            setPaymentError('Please enter an amount and select a payment method.');
            setSubmitting(false); return;
        }
        try {
            await api.expenses.createPayment({
                amount:   parseFloat(paymentFormData.amount),
                walletId: paymentFormData.walletId,
                category: LABEL_TO_DB[paymentFormData.category] || 'POINT_RELOAD',
                notes:    paymentFormData.notes || null,
            });
            await Promise.all([refreshExpenses(), refreshWallets()]);
            setPaymentFormData({ amount: '', walletId: '', category: 'Point Reload', date: new Date().toISOString().split('T')[0], notes: '' });
            setShowPaymentModal(false);
        } catch (err) { setPaymentError(err.message || 'Failed to record payment'); }
        finally { setSubmitting(false); }
    };

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filteredExpenses = expenses
        .filter(exp => {
            if (categoryFilter === 'Payments') return isPaymentRow(exp);
            if (categoryFilter !== 'All') {
                if (isPaymentRow(exp)) return false;
                return exp.category === (LABEL_TO_DB[categoryFilter] || categoryFilter.toUpperCase().replace(' ', '_'));
            }
            return true;
        })
        .filter(exp => !search || exp.details?.toLowerCase().includes(search.toLowerCase()));

    const TABS = ['All', 'Point Reload', 'Service Fee', 'Other', 'Payments'];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 'inherit' }}>

            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <StatCard label="Total Expense Amount" value={`$${totalExpenses.toFixed(2)}`} icon={DollarSign} color="blue" />
                <StatCard label="Total Amount Paid"    value={`$${totalPaid.toFixed(2)}`}     icon={CheckCircle} color="green" />
                <StatCard label="Total Outstanding"    value={`$${outstanding.toFixed(2)}`}   icon={AlertCircle} color="red" />
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => { setPaymentError(null); setShowPaymentModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(22,163,74,.3)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <CheckCircle style={{ width: '15px', height: '15px' }} /> Make Payment
                </button>
                <button onClick={() => { setError(null); setShowAddModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,.3)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <Plus style={{ width: '15px', height: '15px' }} /> Add Expense
                </button>
            </div>

            {/* ── Game Reload Summary ── */}
            {Object.keys(gameSummary).length > 0 && (
                <div style={CARD}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Game Reload Summary</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#94a3b8' }}>All Time</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={TH}>Game</th>
                                <th style={{ ...TH, textAlign: 'center' }}>Total Reloaded</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Points Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(gameSummary).map(([name, data]) => (
                                <tr key={name}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={TD}><span style={{ fontWeight: '600' }}>{name}</span></td>
                                    <td style={{ ...TD, textAlign: 'center' }}>${data.totalAmount.toFixed(2)}</td>
                                    <td style={{ ...TD, textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>
                                        +{data.totalPoints.toLocaleString()} pts
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Expense & Payment Ledger ── */}
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Expense & Payment Ledger</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                            {filteredExpenses.length} records · All times in CT (Texas)
                        </p>
                    </div>
                    <input
                        placeholder="Search ledger…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...INPUT_BASE, width: '220px' }}
                    />
                </div>

                {/* Tabs */}
                <div style={{ padding: '14px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TABS.map(tab => {
                        const active    = categoryFilter === tab;
                        const isPayTab  = tab === 'Payments';
                        return (
                            <button key={tab} onClick={() => setCategoryFilter(tab)} style={{
                                padding: '5px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all .15s',
                                background: active ? (isPayTab ? '#16a34a' : '#2563eb') : 'transparent',
                                color:      active ? '#fff' : '#64748b',
                                border:     active ? 'none' : '1px solid #e2e8f0',
                            }}>
                                {tab}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', overflowY: 'scroll', height: '340px', scrollbarWidth: 'thin' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={TH}>Date (CT)</th>
                                <th style={TH}>Details</th>
                                <th style={TH}>Notes</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                            ) : filteredExpenses.map((expense) => {
                                const isPay = isPaymentRow(expense);
                                return (
                                    <tr key={expense.id}
                                        style={{ background: isPay ? '#f0fdf4' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => e.currentTarget.style.background = isPay ? '#dcfce7' : '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = isPay ? '#f0fdf4' : 'transparent'}>

                                        {/* ── Date in Texas CT ───────────────────────── */}
                                        <td style={{ ...TD, color: '#64748b', whiteSpace: 'nowrap', fontSize: '12px' }}>
                                            {formatTX(expense.createdAt)}
                                        </td>

                                        <td style={TD}>
                                            <div style={{ fontWeight: '600', color: isPay ? '#16a34a' : '#dc2626', marginBottom: expense.pointsAdded > 0 ? '2px' : 0 }}>
                                                {expense.details}
                                            </div>
                                            {expense.pointsAdded > 0 && (
                                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                                                    +{expense.pointsAdded.toLocaleString()} pts
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...TD, color: '#94a3b8' }}>{expense.notes || '—'}</td>
                                        <td style={{ ...TD, textAlign: 'right', fontWeight: '700', color: isPay ? '#16a34a' : '#dc2626' }}>
                                            {isPay
                                                ? `$${parseFloat(expense.paymentMade).toFixed(2)}`
                                                : expense.amount ? `$${parseFloat(expense.amount).toFixed(2)}` : '—'
                                            }
                                        </td>
                                        <td style={{ ...TD, textAlign: 'right' }}>
                                            <button onClick={() => startEdit(expense)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
                                                <Edit2 style={{ width: '11px', height: '11px' }} /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════ ADD EXPENSE MODAL ══════════════ */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record New Expense" accent="#2563eb" icon={Receipt}>
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Field label="Category">
                        <FocusInput as="select" value={addFormData.category} onChange={e => setAddFormData({ ...addFormData, category: e.target.value })}>
                            {CATEGORIES.map(o => <option key={o}>{o}</option>)}
                        </FocusInput>
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <Field label="Amount ($) *">
                            <FocusInput type="number" step="0.01" placeholder="0.00" value={addFormData.amount} onChange={e => setAddFormData({ ...addFormData, amount: e.target.value })} required />
                        </Field>
                        <Field label="Points *">
                            <FocusInput type="number" step="1" min="1" placeholder="e.g. 10000" value={addFormData.pointsAdded} onChange={e => setAddFormData({ ...addFormData, pointsAdded: e.target.value })} required />
                        </Field>
                    </div>
                    <Field label="Game *">
                        <FocusInput as="select" value={addFormData.game} onChange={e => setAddFormData({ ...addFormData, game: e.target.value })} required>
                            <option value="">— Select a game —</option>
                            {games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                        </FocusInput>
                    </Field>
                    {addFormData.game && addFormData.pointsAdded && (() => {
                        const sg = games.find(g => g.name === addFormData.game);
                        if (!sg) return null;
                        const newStock = sg.pointStock + parseInt(addFormData.pointsAdded || 0, 10);
                        return (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', background: newStock < 0 ? '#fee2e2' : '#f0fdf4', border: `1px solid ${newStock < 0 ? '#fca5a5' : '#86efac'}`, color: newStock < 0 ? '#991b1b' : '#166534' }}>
                                {sg.name}: {sg.pointStock.toLocaleString()} → <strong>{newStock.toLocaleString()} pts</strong>
                                {newStock < 0 && ' ⚠️ Insufficient!'}
                            </div>
                        );
                    })()}
                    <Field label="Notes (optional)">
                        <FocusInput as="textarea" rows={2} value={addFormData.notes} onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })} style={{ resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={error} />
                    <ModalActions onCancel={() => setShowAddModal(false)} submitLabel="Record Expense" accent="#2563eb" loading={submitting} />
                </form>
            </Modal>

            {/* ══════════════ EDIT MODAL ══════════════ */}
            <Modal
                isOpen={editingExpense !== null}
                onClose={() => setEditingExpense(null)}
                title={editFormData.isPayment ? 'Edit Payment' : 'Edit Expense'}
                accent={editFormData.isPayment ? '#16a34a' : '#2563eb'}
                icon={editFormData.isPayment ? CheckCircle : Edit2}
            >
                <form onSubmit={handleEditExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Field label="Category">
                        <FocusInput as="select" value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}>
                            {CATEGORIES.map(o => <option key={o}>{o}</option>)}
                        </FocusInput>
                    </Field>

                    {editFormData.isPayment ? (
                        <>
                            <Field label="Payment Amount ($) *">
                                <FocusInput type="number" step="0.01" value={editFormData.paymentMade} onChange={e => setEditFormData({ ...editFormData, paymentMade: e.target.value })} required />
                            </Field>
                            <Field label="Wallet Used *" hint="Select the original wallet. Balance will be adjusted by the difference.">
                                <FocusInput as="select" value={editFormData.walletId} onChange={e => setEditFormData({ ...editFormData, walletId: e.target.value })} required>
                                    <option value="">— Select wallet —</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.methodLabel}</option>)}
                                </FocusInput>
                            </Field>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <Field label="Amount ($) *">
                                    <FocusInput type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} required />
                                </Field>
                                <Field label="Points">
                                    <FocusInput type="number" step="1" min="0" placeholder="e.g. 10000" value={editFormData.pointsAdded} onChange={e => setEditFormData({ ...editFormData, pointsAdded: e.target.value })} />
                                </Field>
                            </div>

                            {/* Live preview of how game stock will change */}
                            {editingExpense?.game && editFormData.pointsAdded !== '' && (() => {
                                const newPts = parseInt(editFormData.pointsAdded || 0, 10);
                                const oldPts = parseInt(editingExpense.pointsAdded || 0, 10);
                                const diff   = newPts - oldPts;
                                if (diff === 0) return null;
                                const linkedGame = games.find(g => g.id === editingExpense.game?.id);
                                if (!linkedGame) return null;
                                const projected = linkedGame.pointStock + diff;
                                return (
                                    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', background: projected < 0 ? '#fee2e2' : '#f0fdf4', border: `1px solid ${projected < 0 ? '#fca5a5' : '#86efac'}`, color: projected < 0 ? '#991b1b' : '#166534' }}>
                                        {linkedGame.name}: {linkedGame.pointStock.toLocaleString()} → <strong>{projected.toLocaleString()} pts</strong>
                                        {' '}({diff > 0 ? '+' : ''}{diff})
                                        {projected < 0 && ' ⚠️ Will go into deficit!'}
                                    </div>
                                );
                            })()}
                        </>
                    )}

                    <Field label="Notes">
                        <FocusInput as="textarea" rows={2} value={editFormData.notes} onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })} style={{ resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={editError} />
                    <ModalActions
                        onCancel={() => setEditingExpense(null)}
                        submitLabel="Save Changes"
                        accent={editFormData.isPayment ? '#16a34a' : '#2563eb'}
                        loading={submitting}
                    />
                </form>
            </Modal>

            {/* ══════════════ MAKE PAYMENT MODAL ══════════════ */}
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Make a Bulk Payment" accent="#16a34a" icon={CreditCard}>
                <form onSubmit={handleMakePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Field label="Total Amount ($) *">
                        <FocusInput type="number" step="0.01" placeholder="0.00" value={paymentFormData.amount} onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })} required />
                    </Field>
                    <Field label="Payment Method *">
                        <FocusInput as="select" value={paymentFormData.walletId} onChange={e => setPaymentFormData({ ...paymentFormData, walletId: e.target.value })} required>
                            <option value="">— Select wallet —</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.methodLabel}</option>)}
                        </FocusInput>
                        {paymentFormData.walletId && (() => {
                            const found = wallets.find(w => String(w.id) === String(paymentFormData.walletId));
                            return found ? (
                                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>
                                    Available: <strong>${Number(found.balance).toFixed(2)}</strong>
                                </p>
                            ) : null;
                        })()}
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <Field label="Category">
                            <FocusInput as="select" value={paymentFormData.category} onChange={e => setPaymentFormData({ ...paymentFormData, category: e.target.value })}>
                                {CATEGORIES.map(o => <option key={o}>{o}</option>)}
                            </FocusInput>
                        </Field>
                        <Field label="Date">
                            <FocusInput type="date" value={paymentFormData.date} onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Notes (optional)">
                        <FocusInput as="textarea" rows={2} value={paymentFormData.notes} onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })} style={{ resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={paymentError} />
                    <ModalActions onCancel={() => setShowPaymentModal(false)} submitLabel="Record Payment" accent="#16a34a" loading={submitting} />
                </form>
            </Modal>
        </div>
    );
};