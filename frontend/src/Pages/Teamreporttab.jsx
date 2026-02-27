// components/TeamReportTab.jsx
// Drop this as a tab inside TeamDashboard.jsx (or as a standalone page).
// Usage:  <TeamReportTab currentUser={currentUser} />
import { useState, useEffect, useCallback } from 'react';
import {
    BarChart2, Clock, CheckCircle, TrendingUp, TrendingDown,
    Gift, Activity, Download, RefreshCw, AlertCircle,
    ChevronDown, ChevronUp, Zap, ArrowUpRight, ArrowDownRight,
    Calendar, FileText,
} from 'lucide-react';
import { api } from '../api';

// ── Tokens (same as rest of app) ──────────────────────────────────
const C = {
    surface: '#ffffff', border: '#e2e8f0', text: '#0f172a',
    muted: '#64748b', faint: '#94a3b8',
    green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#86efac',
    red: '#dc2626', redBg: '#fee2e2', redBorder: '#fca5a5',
    blue: '#2563eb', blueBg: '#eff6ff', blueBorder: '#bfdbfe',
    amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
    slate: '#475569', slateBg: '#f1f5f9',
};
const CARD = {
    background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`,
    boxShadow: '0 2px 12px rgba(15,23,42,.06)',
};
const TH = {
    textAlign: 'left', padding: '10px 16px', fontWeight: '600',
    color: C.muted, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}`,
    background: '#f8fafc', whiteSpace: 'nowrap',
};
const TD = {
    padding: '12px 16px', borderBottom: `1px solid #f1f5f9`,
    fontSize: '13px', color: C.text,
};

const fmtMoney = (n) =>
    `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',  // ← add this
        hour: '2-digit', minute: '2-digit', hour12: true
    }) : '—';

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',  // ← add this
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    }) : '—';

// ── Sub-components ────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }) {
    return (
        <div style={{
            ...CARD, padding: '18px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '18px 9px',
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
        }}>
            <div style={{
                width: '38px', height: '38px', borderRadius: '9px', background: color.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <Icon style={{ width: '16px', height: '16px', color: color.icon }} />
            </div>
            <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: C.text, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px', fontWeight: '500' }}>{label}</div>
            </div>
        </div>
    );
}

function TypeBadge({ type }) {
    const map = {
        DEPOSIT: { bg: '#f0fdf4', text: '#16a34a' },
        WITHDRAWAL: { bg: '#fee2e2', text: '#dc2626' },
        BONUS: { bg: '#fffbeb', text: '#d97706' },
        REFERRAL: { bg: '#fdf4ff', text: '#7e22ce' },
        FREEPLAY_DAILY: { bg: '#eff6ff', text: '#2563eb' },
        FREEPLAY_WEEKLY: { bg: '#eff6ff', text: '#2563eb' },
        ATTENDANCE: { bg: '#f1f5f9', text: '#475569' },
    };
    const s = map[type] || { bg: '#f1f5f9', text: '#475569' };
    return (
        <span style={{
            padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
            background: s.bg, color: s.text
        }}>
            {type?.replace(/_/g, ' ')}
        </span>
    );
}

// ── Single shift card ─────────────────────────────────────────────
function ShiftCard({ shift }) {
    const [showTxns, setShowTxns] = useState(false);
    const [showTasks, setShowTasks] = useState(false);
    const s = shift.stats || {};

    const profitPositive = (s.netProfit ?? 0) >= 0;

    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
                padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center',
                flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, background: '#fafbfc'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
                        background: shift.isActive ? '#22c55e' : C.faint,
                        boxShadow: shift.isActive ? '0 0 0 3px rgba(34,197,94,.25)' : 'none',
                    }} />
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: C.text }}>
                            {fmtDate(shift.startTime)}
                        </div>
                        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                            {fmtTime(shift.startTime)} → {shift.isActive ? <span style={{ color: '#22c55e', fontWeight: '700' }}>Active</span> : fmtTime(shift.endTime)}
                            {shift.duration != null && <> &nbsp;·&nbsp; {shift.duration} min</>}
                        </div>
                    </div>
                </div>

                {/* KPI pills */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatPill icon={Activity} label="Txns" value={s.transactionCount ?? 0} bg={C.slateBg} text={C.slate} />
                    <StatPill icon={ArrowUpRight} label="Deposits" value={fmtMoney(s.totalDeposits)} bg={C.greenBg} text={C.green} />
                    <StatPill icon={ArrowDownRight} label="Cashouts" value={fmtMoney(s.totalCashouts)} bg={C.redBg} text={C.red} />
                    <StatPill icon={Gift} label="Bonuses" value={fmtMoney(s.totalBonuses)} bg={C.amberBg} text={C.amber} />
                    <StatPill
                        icon={profitPositive ? TrendingUp : TrendingDown}
                        label="Net Profit" value={fmtMoney(s.netProfit)}
                        bg={profitPositive ? C.greenBg : C.redBg}
                        text={profitPositive ? C.green : C.red}
                        bold
                    />
                    <StatPill icon={CheckCircle} label="Tasks" value={s.tasksCompleted ?? 0} bg={C.slateBg} text={C.slate} />
                </div>
            </div>

            {/* Expand controls */}
            {(shift.transactions?.length > 0 || shift.tasks?.length > 0) && (
                <div style={{ padding: '10px 20px', display: 'flex', gap: '8px', borderBottom: showTxns || showTasks ? `1px solid ${C.border}` : 'none' }}>
                    {shift.transactions?.length > 0 && (
                        <button onClick={() => setShowTxns(v => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: '7px',
                            background: showTxns ? C.blueBg : '#fff',
                            color: showTxns ? C.blue : C.muted,
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        }}>
                            <Activity style={{ width: '12px', height: '12px' }} />
                            Transactions ({shift.transactions.length})
                            {showTxns ? <ChevronUp style={{ width: '12px', height: '12px' }} /> : <ChevronDown style={{ width: '12px', height: '12px' }} />}
                        </button>
                    )}
                    {shift.tasks?.length > 0 && (
                        <button onClick={() => setShowTasks(v => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: '7px',
                            background: showTasks ? C.slateBg : '#fff',
                            color: showTasks ? C.slate : C.muted,
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        }}>
                            <CheckCircle style={{ width: '12px', height: '12px' }} />
                            Tasks ({shift.tasks.length})
                            {showTasks ? <ChevronUp style={{ width: '12px', height: '12px' }} /> : <ChevronDown style={{ width: '12px', height: '12px' }} />}
                        </button>
                    )}
                </div>
            )}

            {/* Transactions table */}
            {showTxns && shift.transactions?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Time', 'Player', 'Type', 'Method', 'Amount'].map(h => (
                                    <th key={h} style={TH}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shift.transactions.map(t => (
                                <tr key={t.id}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ ...TD, color: C.muted, fontSize: '12px' }}>{fmtTime(t.createdAt)}</td>
                                    <td style={{ ...TD, fontSize: '13px', fontWeight: '500' }}>{t.user?.name || `#${t.userId}`}</td>
                                    <td style={TD}><TypeBadge type={t.type} /></td>
                                    <td style={{ ...TD, color: C.muted, fontSize: '12px' }}>{t.paymentMethod || '—'}</td>
                                    <td style={{
                                        ...TD, fontWeight: '700',
                                        color: t.type === 'DEPOSIT' ? C.green : t.type === 'WITHDRAWAL' ? C.red : C.amber
                                    }}>
                                        {fmtMoney(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tasks table */}
            {showTasks && shift.tasks?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Completed At', 'Task', 'Priority'].map(h => (
                                    <th key={h} style={TH}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shift.tasks.map(t => (
                                <tr key={t.id}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ ...TD, color: C.muted, fontSize: '12px' }}>{fmtTime(t.completedAt)}</td>
                                    <td style={TD}>
                                        <div style={{ fontWeight: '600' }}>{t.title}</div>
                                        {t.description && <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{t.description}</div>}
                                    </td>
                                    <td style={TD}>
                                        <span style={{
                                            padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                                            background: t.priority === 'HIGH' ? C.redBg : t.priority === 'MEDIUM' ? C.amberBg : C.greenBg,
                                            color: t.priority === 'HIGH' ? C.red : t.priority === 'MEDIUM' ? C.amber : C.green,
                                        }}>{t.priority}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function StatPill({ icon: Icon, label, value, bg, text, bold }) {
    return (
        <span style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
            background: bg, color: text, fontWeight: bold ? '700' : '600',
            display: 'inline-flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap'
        }}>
            <Icon style={{ width: '10px', height: '10px' }} />
            <span style={{ opacity: 0.7 }}>{label}</span> {value}
        </span>
    );
}

// ── PDF for member ────────────────────────────────────────────────
function printMyReport(shifts, currentUser) {
    const win = window.open('', '_blank');

    const totals = shifts.reduce((acc, sh) => {
        const s = sh.stats || {};
        acc.deposits += s.totalDeposits || 0;
        acc.cashouts += s.totalCashouts || 0;
        acc.bonuses += s.totalBonuses || 0;
        acc.profit += s.netProfit || 0;
        acc.txns += s.transactionCount || 0;
        acc.tasks += s.tasksCompleted || 0;
        acc.duration += sh.duration || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, txns: 0, tasks: 0, duration: 0 });

    const rows = shifts.map(sh => {
        const s = sh.stats || {};
        return `<tr>
      <td>${fmtDate(sh.startTime)}</td>
      <td>${fmtTime(sh.startTime)}</td>
      <td>${sh.isActive ? 'Active' : fmtTime(sh.endTime)}</td>
      <td>${sh.duration != null ? sh.duration + ' min' : '—'}</td>
      <td>$${(s.totalDeposits || 0).toFixed(2)}</td>
      <td>$${(s.totalCashouts || 0).toFixed(2)}</td>
      <td>$${(s.totalBonuses || 0).toFixed(2)}</td>
      <td style="font-weight:700;color:${(s.netProfit || 0) >= 0 ? '#16a34a' : '#dc2626'}">$${(s.netProfit || 0).toFixed(2)}</td>
      <td>${s.tasksCompleted ?? 0}</td>
      <td>${s.transactionCount ?? 0}</td>
    </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>My Shift Report — ${currentUser?.name}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#0f172a; padding:32px; }
  h1 { font-size:20px; font-weight:800; margin-bottom:4px; }
  .meta { font-size:12px; color:#64748b; margin-bottom:24px; }
  .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
  .box { border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; }
  .box .val { font-size:18px; font-weight:800; }
  .box .lbl { font-size:10px; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.4px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f8fafc; text-align:left; padding:8px 10px; font-weight:600; color:#64748b; font-size:10px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; }
  td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
  button { padding:10px 18px; background:#0f172a; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer; }
  @media print { button { display:none; } }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <div>
      <h1>My Shift Report</h1>
      <p class="meta">${currentUser?.name} · ${currentUser?.role} · Generated ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}</p>
    </div>
    <button onclick="window.print()">🖨 Print / Save PDF</button>
  </div>
  <div class="summary">
    <div class="box"><div class="val" style="color:#16a34a">$${totals.deposits.toFixed(2)}</div><div class="lbl">Total Deposits</div></div>
    <div class="box"><div class="val" style="color:#dc2626">$${totals.cashouts.toFixed(2)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="box"><div class="val" style="color:#d97706">$${totals.bonuses.toFixed(2)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="box"><div class="val" style="color:${totals.profit >= 0 ? '#16a34a' : '#dc2626'}">$${totals.profit.toFixed(2)}</div><div class="lbl">Net Profit</div></div>
    <div class="box"><div class="val">${shifts.length}</div><div class="lbl">Shifts Worked</div></div>
    <div class="box"><div class="val">${totals.duration} min</div><div class="lbl">Total Time</div></div>
    <div class="box"><div class="val">${totals.tasks}</div><div class="lbl">Tasks Completed</div></div>
    <div class="box"><div class="val">${totals.txns}</div><div class="lbl">Transactions</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Start</th><th>End</th><th>Duration</th>
      <th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th><th>Tasks</th><th>Txns</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:20px">No shifts found</td></tr>'}</tbody>
  </table>
  <p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center">
    Confidential · ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
  </p>
</body></html>`);
    win.document.close();
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TeamReportTab({ currentUser }) {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!currentUser?.role) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.reports.getMyShifts({ role: currentUser.role, limit: 30 });
            setShifts(res?.data || []);
        } catch (e) {
            setError(e.message || 'Failed to load your shift reports');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.role]);

    useEffect(() => { load(); }, [load]);

    // ── Aggregates over all shifts ────────────────────────────────
    const totals = shifts.reduce((acc, sh) => {
        const s = sh.stats || {};
        acc.deposits += s.totalDeposits || 0;
        acc.cashouts += s.totalCashouts || 0;
        acc.bonuses += s.totalBonuses || 0;
        acc.profit += s.netProfit || 0;
        acc.txns += s.transactionCount || 0;
        acc.tasks += s.tasksCompleted || 0;
        acc.duration += sh.duration || 0;
        return acc;
    }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, txns: 0, tasks: 0, duration: 0 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart2 style={{ width: '18px', height: '18px', color: C.muted }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                        My Shift Reports
                    </h3>
                    <span style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                        background: C.slateBg, color: C.slate
                    }}>
                        {shifts.length} shifts
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={load} disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 12px', border: `1px solid ${C.border}`, borderRadius: '8px',
                            background: '#fff', color: C.muted, fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                        }}>
                        <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                    <button
                        onClick={() => shifts.length && printMyReport(shifts, currentUser)}
                        disabled={!shifts.length || loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 12px', border: 'none', borderRadius: '8px',
                            background: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: '700',
                            cursor: shifts.length ? 'pointer' : 'not-allowed', opacity: shifts.length ? 1 : 0.5
                        }}>
                        <Download style={{ width: '13px', height: '13px' }} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={{
                    padding: '12px 16px', background: C.redBg, border: `1px solid ${C.redBorder}`,
                    borderRadius: '10px', color: C.red, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                    <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && shifts.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', color: C.faint, fontSize: '13px' }}>
                    <RefreshCw style={{
                        width: '22px', height: '22px', animation: 'spin 1s linear infinite',
                        display: 'block', margin: '0 auto 12px'
                    }} />
                    Loading your shift history…
                </div>
            )}

            {!loading && shifts.length === 0 && !error && (
                <div style={{
                    padding: '60px', textAlign: 'center', background: C.surface,
                    borderRadius: '14px', border: `1px solid ${C.border}`
                }}>
                    <FileText style={{ width: '40px', height: '40px', color: '#e2e8f0', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: C.muted, fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>
                        No shift history yet
                    </p>
                    <p style={{ color: C.faint, fontSize: '12px', margin: 0 }}>
                        Start and end a shift on the Shifts page — your reports will appear here
                    </p>
                </div>
            )}

            {shifts.length > 0 && (
                <>
                    {/* ── Lifetime summary KPIs ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '10px' }}>
                        <KpiCard label="Total Deposits" value={`$${totals.deposits.toFixed(2)}`} icon={ArrowUpRight} color={{ bg: C.greenBg, icon: C.green }} />
                        <KpiCard label="Total Cashouts" value={`$${totals.cashouts.toFixed(2)}`} icon={ArrowDownRight} color={{ bg: C.redBg, icon: C.red }} />
                        <KpiCard label="Total Bonuses" value={`$${totals.bonuses.toFixed(2)}`} icon={Gift} color={{ bg: C.amberBg, icon: C.amber }} />
                        <KpiCard label="Net Profit" value={`$${totals.profit.toFixed(2)}`} icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
                            color={{ bg: totals.profit >= 0 ? C.greenBg : C.redBg, icon: totals.profit >= 0 ? C.green : C.red }} />
                        <KpiCard label="Shifts Worked" value={shifts.length} icon={Clock} color={{ bg: C.slateBg, icon: C.slate }} />
                        <KpiCard label="Total Time" value={`${totals.duration} min`} icon={Calendar} color={{ bg: C.slateBg, icon: C.slate }} />
                        <KpiCard label="Tasks Done" value={totals.tasks} icon={CheckCircle} color={{ bg: C.greenBg, icon: C.green }} />
                        <KpiCard label="Transactions" value={totals.txns} icon={Activity} color={{ bg: C.blueBg, icon: C.blue }} />
                    </div>

                    {/* ── Individual shift cards ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {shifts.map(shift => (
                            <ShiftCard key={shift.id} shift={shift} />
                        ))}
                    </div>
                </>
            )}

            <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
        </div>
    );
}