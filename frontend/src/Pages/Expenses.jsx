import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Plus, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../api';

// ─── Style constants (matching BonusPage) ────────────────────────────────────
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
    boxSizing: 'border-box', background: '#fff', color: '#0f172a', outline: 'none',
};
const TH = {
    textAlign: 'left', padding: '10px 16px', fontWeight: '600',
    color: '#64748b', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
};
const TD = { padding: '11px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' };

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(15,23,42,.18)', width: '100%', maxWidth: '480px', margin: '0 16px', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', display: 'flex', alignItems: 'center', borderRadius: '6px' }}>
                        <X style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>
                <div style={{ padding: '24px 28px' }}>{children}</div>
            </div>
        </div>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
    const colors = {
        blue: { bg: '#eff6ff', text: '#2563eb' },
        green: { bg: '#f0fdf4', text: '#16a34a' },
        red: { bg: '#fff1f2', text: '#dc2626' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div style={{ ...CARD, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
    const styles = {
        error: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
        success: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    };
    const s = styles[type] || styles.error;
    return (
        <div style={{ padding: '11px 14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', color: s.text, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {message}
        </div>
    );
}

// ─── Shared form field helpers ─────────────────────────────────────────────────
function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <label style={LABEL}>{label}</label>
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ExpensesPage = () => {
    const [games, setGames] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [editError, setEditError] = useState(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [addFormData, setAddFormData] = useState({ category: 'Point Reload', amount: '', game: '', pointsAdded: '', notes: '' });
    const [paymentFormData, setPaymentFormData] = useState({ amount: '', walletId: '', category: 'Point Reload', date: new Date().toISOString().split('T')[0], notes: '' });
    const [editFormData, setEditFormData] = useState({ category: '', notes: '', amount: '', pointsAdded: '', paymentMade: '', walletId: '', isPayment: false });

    useEffect(() => {
        const loadGames = async () => {
            try {
                const res = await api.games.getGames(true, { status: filter || '', search: search || '' });
                setGames(res.data || []);
            } catch (err) { console.error('Failed to load games:', err); }
        };
        loadGames();
    }, [filter, search]);

    useEffect(() => {
        const loadWallets = async () => {
            try {
                const res = await api.wallets.getGroupedWallets(true);
                const flat = (res.data || []).flatMap(group =>
                    group.subAccounts.map(sub => ({ ...sub, methodLabel: `${group.method} — ${sub.name} ($${sub.balance.toFixed(2)})` }))
                );
                setWallets(flat);
            } catch (err) { console.error('Failed to load wallets:', err); }
        };
        loadWallets();
    }, []);

    useEffect(() => {
        const loadExpenses = async () => {
            try {
                setLoading(true); setError(null);
                const res = await api.expenses.getExpenses(true);
                setExpenses(res.data || []);
            } catch (err) { setError(err.message || 'Failed to load expenses'); }
            finally { setLoading(false); }
        };
        loadExpenses();
    }, []);

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalPaid = expenses.reduce((sum, exp) => sum + (exp.paymentMade || 0), 0);
    const outstanding = totalExpenses - totalPaid;

    const gameSummary = expenses.filter(exp => exp.game).reduce((acc, exp) => {
        const name = exp.game.name;
        if (!acc[name]) acc[name] = { totalAmount: 0, totalPoints: 0 };
        acc[name].totalAmount += exp.amount || 0;
        acc[name].totalPoints += exp.pointsAdded || 0;
        return acc;
    }, {});

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!addFormData.amount || !addFormData.game || !addFormData.pointsAdded) return;
        const selectedGame = games.find(g => g.name === addFormData.game);
        if (!selectedGame) return;
        const pointsAdded = parseInt(addFormData.pointsAdded, 10);
        try {
            await api.expenses.createExpense({ gameId: selectedGame.id, details: `Point Reload (${addFormData.game})`, category: addFormData.category, amount: parseFloat(addFormData.amount), pointsAdded, notes: addFormData.notes || null });
            await api.games.updateGame(selectedGame.id, { pointStock: selectedGame.pointStock - pointsAdded });
            const [freshExpenses, freshGames] = await Promise.all([api.expenses.getExpenses(true), api.games.getGames(true)]);
            setExpenses(freshExpenses.data || []); setGames(freshGames.data || []);
            setAddFormData({ category: 'Point Reload', amount: '', game: '', pointsAdded: '', notes: '' });
            setShowAddModal(false);
        } catch (err) { setError(err.message || 'Failed to record expense'); }
    };

    const handleEditExpense = async (e) => {
        e.preventDefault(); setEditError(null);
        try {
            if (editFormData.isPayment) {
                await api.expenses.updateExpense(editingId, { paymentMade: parseFloat(editFormData.paymentMade), walletId: editFormData.walletId, category: editFormData.category, notes: editFormData.notes });
            } else {
                await api.expenses.updateExpense(editingId, { amount: parseFloat(editFormData.amount), category: editFormData.category, notes: editFormData.notes, pointsAdded: editFormData.pointsAdded ? parseInt(editFormData.pointsAdded, 10) : undefined });
            }
            const [freshExpenses, freshWallets] = await Promise.all([api.expenses.getExpenses(true), api.wallets.getGroupedWallets(true)]);
            setExpenses(freshExpenses.data || []);
            const flat = (freshWallets.data || []).flatMap(group => group.subAccounts.map(sub => ({ ...sub, methodLabel: `${group.method} — ${sub.name} ($${sub.balance.toFixed(2)})` })));
            setWallets(flat); setEditingId(null);
        } catch (err) { setEditError(err.message || 'Failed to save changes'); }
    };

    const startEdit = (expense) => {
        const isPayment = !!expense.paymentMade && !expense.amount;
        setEditingId(expense.id); setEditError(null);
        setEditFormData({ isPayment, category: expense.category || 'POINT_RELOAD', notes: expense.notes || '', amount: expense.amount?.toString() || '', pointsAdded: expense.pointsAdded?.toString() || '', paymentMade: expense.paymentMade?.toString() || '', walletId: '' });
    };

    const handleMakePayment = async (e) => {
        e.preventDefault(); setPaymentError(null);
        if (!paymentFormData.amount || !paymentFormData.walletId) { setPaymentError('Please enter an amount and select a payment method.'); return; }
        try {
            await api.expenses.createPayment({ amount: parseFloat(paymentFormData.amount), walletId: paymentFormData.walletId, category: paymentFormData.category, notes: paymentFormData.notes || null });
            const [freshExpenses, freshWallets] = await Promise.all([api.expenses.getExpenses(true), api.wallets.getGroupedWallets(true)]);
            setExpenses(freshExpenses.data || []);
            const flat = (freshWallets.data || []).flatMap(group => group.subAccounts.map(sub => ({ ...sub, methodLabel: `${group.method} — ${sub.name} ($${sub.balance.toFixed(2)})` })));
            setWallets(flat);
            setPaymentFormData({ amount: '', walletId: '', category: 'Point Reload', date: new Date().toISOString().split('T')[0], notes: '' });
            setShowPaymentModal(false);
        } catch (err) { setPaymentError(err.message || 'Failed to record payment'); }
    };

    const filteredExpenses = expenses.filter(exp => {
        const isPaymentRow = !!exp.paymentMade && !exp.amount;
        if (categoryFilter === 'Payments') return isPaymentRow;
        if (categoryFilter !== 'All') { if (isPaymentRow) return false; return exp.category === categoryFilter.toUpperCase().replace(' ', '_'); }
        return !search || exp.details?.toLowerCase().includes(search.toLowerCase());
    }).filter(exp => !search || exp.details?.toLowerCase().includes(search.toLowerCase()));

    const TABS = ['All', 'Point Reload', 'Service Fee', 'Other', 'Payments'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 'inherit' }}>

            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <StatCard label="Total Expense Amount" value={`$${totalExpenses.toFixed(2)}`} icon={DollarSign} color="blue" />
                <StatCard label="Total Amount Paid" value={`$${totalPaid.toFixed(2)}`} icon={CheckCircle} color="green" />
                <StatCard label="Total Outstanding" value={`$${outstanding.toFixed(2)}`} icon={AlertCircle} color="red" />
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    <CheckCircle style={{ width: '15px', height: '15px' }} /> Make Payment
                </button>
                <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
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
                                <tr key={name} onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={TD}><span style={{ fontWeight: '600' }}>{name}</span></td>
                                    <td style={{ ...TD, textAlign: 'center' }}>${data.totalAmount.toFixed(2)}</td>
                                    <td style={{ ...TD, textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>+{data.totalPoints.toLocaleString()} pts</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Expense & Payment Ledger ── */}
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Expense & Payment Ledger</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{filteredExpenses.length} records found</p>
                    </div>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <input
                            placeholder="Search ledger…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ ...INPUT_BASE, width: '220px', paddingLeft: '14px' }}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ padding: '14px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TABS.map(tab => {
                        const active = categoryFilter === tab;
                        const isPayTab = tab === 'Payments';
                        return (
                            <button key={tab} onClick={() => setCategoryFilter(tab)} style={{
                                padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all .15s',
                                background: active ? (isPayTab ? '#16a34a' : '#2563eb') : '#f1f5f9',
                                color: active ? '#fff' : '#475569',
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
                                <th style={TH}>Date</th>
                                <th style={TH}>Details</th>
                                <th style={TH}>Notes</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading…</td></tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No records found</td></tr>
                            ) : filteredExpenses.map((expense) => {
                                const isPayment = !!expense.paymentMade && !expense.amount;
                                return (
                                    <tr key={expense.id} style={{ background: isPayment ? '#f0fdf4' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => e.currentTarget.style.background = isPayment ? '#dcfce7' : '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = isPayment ? '#f0fdf4' : 'transparent'}
                                    >
                                        <td style={{ ...TD, color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {new Date(expense.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </td>
                                        <td style={TD}>
                                            <div style={{ fontWeight: '600', color: isPayment ? '#16a34a' : '#dc2626', marginBottom: expense.pointsAdded > 0 ? '2px' : 0 }}>{expense.details}</div>
                                            {expense.pointsAdded > 0 && <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>+{expense.pointsAdded.toLocaleString()} pts</div>}
                                        </td>
                                        <td style={{ ...TD, color: '#94a3b8' }}>{expense.notes || '—'}</td>
                                        <td style={{ ...TD, textAlign: 'right', fontWeight: '700', color: isPayment ? '#16a34a' : '#dc2626' }}>
                                            {isPayment ? `$${expense.paymentMade.toFixed(2)}` : expense.amount ? `$${expense.amount.toFixed(2)}` : '—'}
                                        </td>
                                        <td style={{ ...TD, textAlign: 'right' }}>
                                            <button onClick={() => startEdit(expense)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
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
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record New Expense">
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Field label="Category">
                        <select value={addFormData.category} onChange={e => setAddFormData({ ...addFormData, category: e.target.value })} style={INPUT_BASE}>
                            {['Point Reload', 'Service Fee', 'Other'].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </Field>
                    <Field label="Amount ($) *">
                        <input type="number" step="0.01" placeholder="0.00" value={addFormData.amount} onChange={e => setAddFormData({ ...addFormData, amount: e.target.value })} style={INPUT_BASE} required />
                    </Field>
                    <Field label="Game *">
                        <select value={addFormData.game} onChange={e => setAddFormData({ ...addFormData, game: e.target.value })} style={INPUT_BASE} required>
                            <option value="">— Select a game —</option>
                            {games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Points to Deduct *">
                        <input type="number" step="1" min="1" placeholder="e.g. 10000" value={addFormData.pointsAdded} onChange={e => setAddFormData({ ...addFormData, pointsAdded: e.target.value })} style={INPUT_BASE} required />
                    </Field>
                    {addFormData.game && addFormData.pointsAdded && (() => {
                        const sg = games.find(g => g.name === addFormData.game);
                        if (!sg) return null;
                        const newStock = sg.pointStock - parseInt(addFormData.pointsAdded || 0, 10);
                        return (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', background: newStock < 0 ? '#fee2e2' : '#f0fdf4', border: `1px solid ${newStock < 0 ? '#fca5a5' : '#86efac'}`, color: newStock < 0 ? '#991b1b' : '#166534' }}>
                                {sg.name} stock: {sg.pointStock.toLocaleString()} pts → <strong>{newStock.toLocaleString()} pts</strong>{newStock < 0 && ' ⚠️ Insufficient stock!'}
                            </div>
                        );
                    })()}
                    <Field label="Notes (optional)">
                        <textarea rows={3} value={addFormData.notes} onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })} style={{ ...INPUT_BASE, resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={error} />
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                        <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button type="submit" style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Record Expense</button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════ EDIT MODAL ══════════════ */}
            <Modal isOpen={editingId !== null} onClose={() => setEditingId(null)} title={editFormData.isPayment ? 'Edit Payment' : 'Edit Expense'}>
                <form onSubmit={handleEditExpense} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Field label="Category">
                        <select value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value })} style={INPUT_BASE}>
                            {['POINT_RELOAD', 'SERVICE_FEE', 'OTHER'].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </Field>
                    {editFormData.isPayment ? (
                        <>
                            <Field label="Payment Amount ($) *">
                                <input type="number" step="0.01" value={editFormData.paymentMade} onChange={e => setEditFormData({ ...editFormData, paymentMade: e.target.value })} style={INPUT_BASE} required />
                            </Field>
                            <Field label="Wallet to Adjust *">
                                <select value={editFormData.walletId} onChange={e => setEditFormData({ ...editFormData, walletId: e.target.value })} style={INPUT_BASE} required>
                                    <option value="">Select the wallet used for this payment…</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.methodLabel}</option>)}
                                </select>
                                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#94a3b8' }}>Select the same wallet used originally. The balance will be adjusted by the difference.</p>
                            </Field>
                        </>
                    ) : (
                        <>
                            <Field label="Amount ($) *">
                                <input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} style={INPUT_BASE} required />
                            </Field>
                            <Field label="Points">
                                <input type="number" step="1" min="0" placeholder="e.g. 10000" value={editFormData.pointsAdded} onChange={e => setEditFormData({ ...editFormData, pointsAdded: e.target.value })} style={INPUT_BASE} />
                            </Field>
                        </>
                    )}
                    <Field label="Notes">
                        <textarea rows={3} value={editFormData.notes} onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })} style={{ ...INPUT_BASE, resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={editError} />
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                        <button type="button" onClick={() => setEditingId(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button type="submit" style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Save Changes</button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════ PAYMENT MODAL ══════════════ */}
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Make a Bulk Payment">
                <form onSubmit={handleMakePayment} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Field label="Total Amount ($) *">
                        <input type="number" step="0.01" placeholder="0.00" value={paymentFormData.amount} onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })} style={INPUT_BASE} required />
                    </Field>
                    <Field label="Payment Method *">
                        <select value={paymentFormData.walletId} onChange={e => setPaymentFormData({ ...paymentFormData, walletId: e.target.value })} style={INPUT_BASE} required>
                            <option value="">Select wallet…</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.methodLabel}</option>)}
                        </select>
                        {paymentFormData.walletId && (
                            <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>
                                Available: ${wallets.find(w => w.id === parseInt(paymentFormData.walletId))?.balance?.toFixed(2) ?? '—'}
                            </p>
                        )}
                    </Field>
                    <Field label="Category">
                        <select value={paymentFormData.category} onChange={e => setPaymentFormData({ ...paymentFormData, category: e.target.value })} style={INPUT_BASE}>
                            {['Point Reload', 'Service Fee', 'Other'].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </Field>
                    <Field label="Date">
                        <input type="date" value={paymentFormData.date} onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })} style={INPUT_BASE} />
                    </Field>
                    <Field label="Notes (optional)">
                        <textarea rows={3} value={paymentFormData.notes} onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })} style={{ ...INPUT_BASE, resize: 'none', lineHeight: '1.6' }} />
                    </Field>
                    <AlertBanner type="error" message={paymentError} />
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                        <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
                        <button type="submit" style={{ flex: 1, padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Record Payment</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};