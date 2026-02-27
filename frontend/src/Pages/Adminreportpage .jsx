// pages/AdminReportPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart2, Download, RefreshCw, Calendar, Users, TrendingUp,
    TrendingDown, Gift, CheckCircle, Clock, Zap, AlertCircle,
    DollarSign, CreditCard, Wallet, ChevronDown, ChevronUp,
    FileText, Activity, Star, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api } from '../api';

// ── Design tokens ─────────────────────────────────────────────────
const C = {
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
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
    fontSize: '13px', color: C.text, verticalAlign: 'top',
};

const ROLE_LABEL = { TEAM1: 'Team 1', TEAM2: 'Team 2', TEAM3: 'Team 3', TEAM4: 'Team 4' };
const ROLE_COLORS = {
    TEAM1: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    TEAM2: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
    TEAM3: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    TEAM4: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};

const fmtMoney = (n) =>
    `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const toDateInput = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, prefix = '' }) {
    return (
        <div style={{ ...CARD, padding: '20px 22px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
                width: '42px', height: '42px', borderRadius: '10px', background: color.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <Icon style={{ width: '18px', height: '18px', color: color.icon }} />
            </div>
            <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: C.text, lineHeight: 1 }}>
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px', fontWeight: '500' }}>{label}</div>
                {sub != null && (
                    <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

// ── Team Section ──────────────────────────────────────────────────
function TeamSection({ team }) {
    const [expanded, setExpanded] = useState(true);
    const rc = ROLE_COLORS[team.role] || ROLE_COLORS.TEAM1;
    const totalStats = team.shifts.reduce((acc, s) => {
        if (!s.stats) return acc;
        acc.tasksCompleted += s.stats.tasksCompleted;
        acc.totalDeposits += s.stats.totalDeposits;
        acc.totalCashouts += s.stats.totalCashouts;
        acc.totalBonuses += s.stats.totalBonuses;
        acc.netProfit += s.stats.netProfit;
        acc.transactionCount += s.stats.transactionCount;
        return acc;
    }, { tasksCompleted: 0, totalDeposits: 0, totalCashouts: 0, totalBonuses: 0, netProfit: 0, transactionCount: 0 });

    const totalDuration = team.shifts.reduce((s, sh) => s + (sh.duration || 0), 0);

    return (
        <div style={{ ...CARD, overflow: 'hidden' }}>
            {/* Team header */}
            <div
                onClick={() => setExpanded(v => !v)}
                style={{
                    padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px',
                    cursor: 'pointer', borderBottom: expanded ? `1px solid ${C.border}` : 'none',
                    background: '#fafbfc',
                }}
            >
                <div style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                    background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`
                }}>
                    {ROLE_LABEL[team.role] || team.role}
                </div>
                <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: C.text }}>
                        {team.member?.name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                        {team.shifts.length} shift{team.shifts.length !== 1 ? 's' : ''} · {totalDuration} min total
                    </div>
                </div>

                {/* Mini aggregate pills */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Pill label="Tasks" value={totalStats.tasksCompleted} bg={C.slateBg} text={C.slate} />
                    <Pill label="Deposits" value={fmtMoney(totalStats.totalDeposits)} bg={C.greenBg} text={C.green} />
                    <Pill label="Cashouts" value={fmtMoney(totalStats.totalCashouts)} bg={C.redBg} text={C.red} />
                    <Pill label="Bonuses" value={fmtMoney(totalStats.totalBonuses)} bg={C.amberBg} text={C.amber} />
                    <Pill
                        label="Net Profit"
                        value={fmtMoney(totalStats.netProfit)}
                        bg={totalStats.netProfit >= 0 ? C.greenBg : C.redBg}
                        text={totalStats.netProfit >= 0 ? C.green : C.red}
                        bold
                    />
                    {expanded
                        ? <ChevronUp style={{ width: '16px', height: '16px', color: C.faint, marginLeft: '4px' }} />
                        : <ChevronDown style={{ width: '16px', height: '16px', color: C.faint, marginLeft: '4px' }} />}
                </div>
            </div>

            {/* Shifts detail */}
            {expanded && (
                <div style={{ padding: '0' }}>
                    {team.shifts.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: C.faint, fontSize: '13px' }}>
                            No shifts for this team today
                        </div>
                    ) : (
                        team.shifts.map((shift, si) => (
                            <ShiftDetail key={shift.id} shift={shift} index={si} total={team.shifts.length} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function Pill({ label, value, bg, text, bold }) {
    return (
        <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
            background: bg, color: text, fontWeight: bold ? '700' : '600',
            display: 'inline-flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap'
        }}>
            <span style={{ opacity: 0.7 }}>{label}</span> {value}
        </span>
    );
}

function ShiftDetail({ shift, index, total }) {
    const [showTxns, setShowTxns] = useState(false);
    const [showTasks, setShowTasks] = useState(false);
    const s = shift.stats || {};
    const isLast = index === total - 1;

    return (
        <div style={{ borderBottom: isLast ? 'none' : `1px solid #f1f5f9` }}>
            {/* Shift summary row */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: shift.isActive ? '#22c55e' : C.faint,
                        boxShadow: shift.isActive ? '0 0 0 3px rgba(34,197,94,.25)' : 'none',
                    }} />
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>
                            {fmtTime(shift.startTime)} → {shift.isActive ? <span style={{ color: '#22c55e' }}>Active</span> : fmtTime(shift.endTime)}
                        </div>
                        <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                            {shift.duration != null ? `${shift.duration} min` : 'Ongoing'}
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                    <MiniKpi icon={CheckCircle} label="Tasks" value={s.tasksCompleted ?? 0} color={C.slate} />
                    <MiniKpi icon={Activity} label="Txns" value={s.transactionCount ?? 0} color={C.blue} />
                    <MiniKpi icon={ArrowUpRight} label="Deposits" value={fmtMoney(s.totalDeposits)} color={C.green} />
                    <MiniKpi icon={ArrowDownRight} label="Cashouts" value={fmtMoney(s.totalCashouts)} color={C.red} />
                    <MiniKpi icon={Gift} label="Bonuses" value={fmtMoney(s.totalBonuses)} color={C.amber} />
                    <MiniKpi icon={TrendingUp} label="Net Profit" value={fmtMoney(s.netProfit)}
                        color={s.netProfit >= 0 ? C.green : C.red}
                        highlight={s.netProfit >= 0 ? C.greenBg : C.redBg} />
                </div>

                {/* Expand buttons */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {(shift.transactions?.length > 0) && (
                        <button
                            onClick={() => setShowTxns(v => !v)}
                            style={{
                                padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: '6px',
                                background: showTxns ? C.blueBg : '#fff', color: showTxns ? C.blue : C.muted,
                                fontSize: '11px', fontWeight: '600', cursor: 'pointer'
                            }}>
                            {showTxns ? 'Hide' : 'Txns'} ({shift.transactions.length})
                        </button>
                    )}
                    {(shift.tasks?.length > 0) && (
                        <button
                            onClick={() => setShowTasks(v => !v)}
                            style={{
                                padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: '6px',
                                background: showTasks ? C.slateBg : '#fff', color: showTasks ? C.slate : C.muted,
                                fontSize: '11px', fontWeight: '600', cursor: 'pointer'
                            }}>
                            {showTasks ? 'Hide' : 'Tasks'} ({shift.tasks.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Transactions sub-table */}
            {showTxns && shift.transactions?.length > 0 && (
                <div style={{ margin: '0 24px 16px', borderRadius: '10px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Transactions during this shift
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Time', 'Player', 'Type', 'Method', 'Amount'].map(h => (
                                        <th key={h} style={{ ...TH, padding: '8px 12px', fontSize: '10px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shift.transactions.slice(0, 30).map(t => (
                                    <tr key={t.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', color: C.muted }}>{fmtTime(t.createdAt)}</td>
                                        <td style={{ ...TD, padding: '9px 12px', fontSize: '12px' }}>{t.user?.name || `#${t.userId}`}</td>
                                        <td style={{ ...TD, padding: '9px 12px' }}>
                                            <TypeBadge type={t.type} />
                                        </td>
                                        <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', color: C.muted }}>{t.paymentMethod || '—'}</td>
                                        <td style={{
                                            ...TD, padding: '9px 12px', fontWeight: '700', fontSize: '13px',
                                            color: t.type === 'DEPOSIT' ? C.green : t.type === 'WITHDRAWAL' ? C.red : C.amber
                                        }}>
                                            {fmtMoney(t.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tasks sub-table */}
            {showTasks && shift.tasks?.length > 0 && (
                <div style={{ margin: '0 24px 16px', borderRadius: '10px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Tasks completed during this shift
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Time', 'Task', 'Completed By', 'Priority'].map(h => (
                                        <th key={h} style={{ ...TH, padding: '8px 12px', fontSize: '10px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shift.tasks.map(t => (
                                    <tr key={t.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', color: C.muted }}>{fmtTime(t.completedAt)}</td>
                                        <td style={{ ...TD, padding: '9px 12px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{t.title}</div>
                                            {t.description && <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{t.description}</div>}
                                        </td>
                                        <td style={{ ...TD, padding: '9px 12px', fontSize: '12px' }}>{t.assignedTo?.name || '—'}</td>
                                        <td style={{ ...TD, padding: '9px 12px' }}>
                                            <PriorityBadge priority={t.priority} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniKpi({ icon: Icon, label, value, color, highlight }) {
    return (
        <div style={{
            padding: '8px 12px', borderRadius: '8px', background: highlight || C.slateBg,
            display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '90px'
        }}>
            <div style={{ fontSize: '10px', color: C.faint, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Icon style={{ width: '9px', height: '9px' }} /> {label}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color }}>{value}</div>
        </div>
    );
}

function TypeBadge({ type }) {
    const map = {
        DEPOSIT: { bg: C.greenBg, text: C.green },
        WITHDRAWAL: { bg: C.redBg, text: C.red },
        BONUS: { bg: C.amberBg, text: C.amber },
        REFERRAL: { bg: '#fdf4ff', text: '#7e22ce' },
        FREEPLAY_DAILY: { bg: C.blueBg, text: C.blue },
        FREEPLAY_WEEKLY: { bg: C.blueBg, text: C.blue },
        ATTENDANCE: { bg: C.slateBg, text: C.slate },
        ADJUSTMENT: { bg: C.slateBg, text: C.slate },
    };
    const s = map[type] || { bg: C.slateBg, text: C.slate };
    return (
        <span style={{
            padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
            background: s.bg, color: s.text
        }}>
            {type?.replace('_', ' ')}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const map = {
        HIGH: { bg: C.redBg, text: C.red },
        MEDIUM: { bg: C.amberBg, text: C.amber },
        LOW: { bg: C.greenBg, text: C.green },
    };
    const s = map[priority] || map.MEDIUM;
    return (
        <span style={{
            padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
            background: s.bg, color: s.text
        }}>
            {priority}
        </span>
    );
}

// ── PDF generation (print-dialog based, no external libs) ─────────
function printReport(reportData, date) {
    const win = window.open('', '_blank');
    const { summary, teams, wallets, dayTasks } = reportData;

    const teamRows = teams.flatMap(team =>
        team.shifts.map(shift => {
            const s = shift.stats || {};
            return `
        <tr>
          <td>${ROLE_LABEL[team.role] || team.role}</td>
          <td>${team.member?.name || '—'}</td>
          <td>${fmtTime(shift.startTime)}</td>
          <td>${shift.isActive ? 'Active' : fmtTime(shift.endTime)}</td>
          <td>${shift.duration != null ? shift.duration + ' min' : '—'}</td>
          <td>${s.totalDeposits != null ? fmtMoney(s.totalDeposits) : '—'}</td>
          <td>${s.totalCashouts != null ? fmtMoney(s.totalCashouts) : '—'}</td>
          <td>${s.totalBonuses != null ? fmtMoney(s.totalBonuses) : '—'}</td>
          <td style="font-weight:700;color:${(s.netProfit || 0) >= 0 ? '#16a34a' : '#dc2626'}">${s.netProfit != null ? fmtMoney(s.netProfit) : '—'}</td>
          <td>${s.tasksCompleted ?? 0}</td>
          <td>${s.transactionCount ?? 0}</td>
        </tr>`;
        })
    ).join('');

    const taskRows = dayTasks.map(t => `
    <tr>
      <td>${fmtTime(t.completedAt)}</td>
      <td>${t.title}</td>
      <td>${t.assignedTo?.name || '—'}</td>
      <td>${ROLE_LABEL[t.assignedTo?.role] || t.assignedTo?.role || '—'}</td>
      <td>${t.priority || '—'}</td>
    </tr>`).join('');

    const walletRows = wallets.map(w =>
        `<tr><td>${w.name}</td><td>${w.method}</td><td style="font-weight:600">$${w.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    ).join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Daily Report — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #0f172a; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 700; margin: 24px 0 10px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
    .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
    .stat-box .val { font-size: 20px; font-weight: 800; }
    .stat-box .lbl { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; } .amber { color: #d97706; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f8fafc; text-align: left; padding: 8px 10px; font-weight: 600; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    @media print {
      body { padding: 16px; }
      button { display: none; }
      .no-break { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
    <div>
      <h1>📊 Daily Operations Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString()} &nbsp;|&nbsp; Report Date: ${fmtDate(date + 'T12:00:00')}</p>
    </div>
    <button onclick="window.print()" style="padding:10px 20px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
      🖨 Print / Save PDF
    </button>
  </div>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="stat-box"><div class="val green">${fmtMoney(summary.totalDeposits)}</div><div class="lbl">Total Deposits</div></div>
    <div class="stat-box"><div class="val red">${fmtMoney(summary.totalCashouts)}</div><div class="lbl">Total Cashouts</div></div>
    <div class="stat-box"><div class="val amber">${fmtMoney(summary.totalBonuses)}</div><div class="lbl">Total Bonuses</div></div>
    <div class="stat-box"><div class="val ${summary.netProfit >= 0 ? 'green' : 'red'}">${fmtMoney(summary.netProfit)}</div><div class="lbl">Net Profit</div></div>
    <div class="stat-box"><div class="val">${summary.totalShifts}</div><div class="lbl">Shifts Logged</div></div>
    <div class="stat-box"><div class="val blue">${summary.activeShifts}</div><div class="lbl">Active Shifts</div></div>
    <div class="stat-box"><div class="val">${summary.tasksCompleted}</div><div class="lbl">Tasks Completed</div></div>
    <div class="stat-box"><div class="val">${summary.transactionCount}</div><div class="lbl">Transactions</div></div>
  </div>

  <h2>Shift Report by Team</h2>
  <table>
    <thead><tr>
      <th>Team</th><th>Member</th><th>Start</th><th>End</th><th>Duration</th>
      <th>Deposits</th><th>Cashouts</th><th>Bonuses</th><th>Net Profit</th><th>Tasks</th><th>Txns</th>
    </tr></thead>
    <tbody>${teamRows || '<tr><td colspan="11" style="text-align:center;color:#94a3b8;padding:20px">No shifts today</td></tr>'}</tbody>
  </table>

  ${dayTasks.length > 0 ? `
  <h2>Tasks Completed Today (${dayTasks.length})</h2>
  <table>
    <thead><tr><th>Time</th><th>Task</th><th>Completed By</th><th>Team</th><th>Priority</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>` : ''}

  ${wallets.length > 0 ? `
  <h2>Wallet Balances (Current Snapshot)</h2>
  <table>
    <thead><tr><th>Name</th><th>Method</th><th>Balance</th></tr></thead>
    <tbody>${walletRows}</tbody>
  </table>` : ''}

  <p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center">
    Confidential · Generated by Dashboard · ${new Date().toISOString()}
  </p>
</body>
</html>`);
    win.document.close();
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminReportPage() {
    const todayStr = toDateInput(new Date());
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [teamFilter, setTeamFilter] = useState('ALL');

    const fetchReport = useCallback(async (date, role) => {
        setLoading(true);
        setError('');
        try {
            const opts = { date };
            if (role && role !== 'ALL') opts.teamRole = role;
            const data = await api.reports.getDailyReport(opts);
            setReport(data);
        } catch (e) {
            setError(e.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport(selectedDate, teamFilter);
    }, [selectedDate, teamFilter, fetchReport]);

    const s = report?.summary;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '46px', height: '46px', background: '#0f172a', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <FileText style={{ width: '22px', height: '22px', color: '#fff' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f6f7fb' }}>Daily Reports</h2>
                        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>
                            {report ? fmtDate(report.date + 'T12:00:00') : 'Loading…'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Date picker */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
                        border: `1px solid ${C.border}`, borderRadius: '9px', background: '#fff'
                    }}>
                        <Calendar style={{ width: '14px', height: '14px', color: C.muted }} />
                        <input
                            type="date" value={selectedDate} max={todayStr}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '13px', color: C.text, fontFamily: 'inherit', background: 'transparent' }}
                        />
                    </div>

                    {/* Team filter */}
                    <select
                        value={teamFilter}
                        onChange={e => setTeamFilter(e.target.value)}
                        style={{
                            padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: '9px',
                            background: '#fff', fontSize: '13px', color: C.text, fontFamily: 'inherit', cursor: 'pointer'
                        }}>
                        <option value="ALL">All Teams</option>
                        <option value="TEAM1">Team 1</option>
                        <option value="TEAM2">Team 2</option>
                        <option value="TEAM3">Team 3</option>
                        <option value="TEAM4">Team 4</option>
                    </select>

                    {/* Refresh */}
                    <button onClick={() => fetchReport(selectedDate, teamFilter)} disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            border: `1px solid ${C.border}`, borderRadius: '9px', background: '#fff',
                            color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}>
                        <RefreshCw style={{
                            width: '14px', height: '14px',
                            animation: loading ? 'spin 1s linear infinite' : 'none'
                        }} />
                        Refresh
                    </button>

                    {/* Download PDF */}
                    <button
                        onClick={() => report && printReport(report, report.date)}
                        disabled={!report || loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
                            border: 'none', borderRadius: '9px', background: '#0f172a',
                            color: '#fff', fontSize: '13px', fontWeight: '700', cursor: report ? 'pointer' : 'not-allowed',
                            opacity: report ? 1 : 0.5
                        }}>
                        <Download style={{ width: '14px', height: '14px' }} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div style={{
                    padding: '12px 16px', background: C.redBg, border: `1px solid ${C.redBorder}`,
                    borderRadius: '10px', color: C.red, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                    <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* ── Loading skeleton ── */}
            {loading && !report && (
                <div style={{ padding: '80px', textAlign: 'center', color: C.faint, fontSize: '14px' }}>
                    <RefreshCw style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    Generating report…
                </div>
            )}

            {report && (
                <>
                    {/* ── Summary Stats ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: '12px' }}>
                        <StatCard label="Total Deposits" value={fmtMoney(s.totalDeposits)} icon={ArrowUpRight} color={{ bg: C.greenBg, icon: C.green }} />
                        <StatCard label="Total Cashouts" value={fmtMoney(s.totalCashouts)} icon={ArrowDownRight} color={{ bg: C.redBg, icon: C.red }} />
                        <StatCard label="Total Bonuses" value={fmtMoney(s.totalBonuses)} icon={Gift} color={{ bg: C.amberBg, icon: C.amber }} />
                        <StatCard label="Net Profit" value={fmtMoney(s.netProfit)} icon={s.netProfit >= 0 ? TrendingUp : TrendingDown}
                            color={{ bg: s.netProfit >= 0 ? C.greenBg : C.redBg, icon: s.netProfit >= 0 ? C.green : C.red }} />
                        <StatCard label="Shifts Logged" value={s.totalShifts} icon={Clock} color={{ bg: C.slateBg, icon: C.slate }} />
                        <StatCard label="Tasks Completed" value={s.tasksCompleted} icon={CheckCircle} color={{ bg: C.greenBg, icon: C.green }} />
                        <StatCard label="Transactions" value={s.transactionCount} icon={Activity} color={{ bg: C.blueBg, icon: C.blue }} />
                        <StatCard label="Active Shifts" value={s.activeShifts} icon={Zap} color={{ bg: s.activeShifts > 0 ? C.greenBg : C.slateBg, icon: s.activeShifts > 0 ? C.green : C.faint }} />
                    </div>

                    {/* ── Team Sections ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users style={{ width: '16px', height: '16px', color: C.muted }} />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f6f7fb' }}>
                                Team Shift Reports
                            </h3>
                        </div>
                        {report.teams.map(team => (
                            <TeamSection key={team.role} team={team} />
                        ))}
                    </div>

                    {/* ── Wallet Balances ── */}
                    {report.wallets?.length > 0 && (
                        <div style={{ ...CARD, overflow: 'hidden' }}>
                            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Wallet style={{ width: '16px', height: '16px', color: C.muted }} />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>
                                    Wallet Balances — Current Snapshot
                                </h3>
                            </div>
                            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '12px' }}>
                                {report.wallets.map(w => (
                                    <div key={w.id} style={{ padding: '14px 16px', border: `1px solid ${C.border}`, borderRadius: '10px', background: '#fafbfc' }}>
                                        <div style={{ fontSize: '11px', color: C.faint, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>
                                            {w.method}
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: C.text }}>{fmtMoney(w.balance)}</div>
                                        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{w.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── All tasks today ── */}
                    {report.dayTasks?.length > 0 && (
                        <div style={{ ...CARD, overflow: 'hidden' }}>
                            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle style={{ width: '16px', height: '16px', color: C.muted }} />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>
                                    All Completed Tasks Today ({report.dayTasks.length})
                                </h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Time', 'Task', 'Team', 'Completed By', 'Priority'].map(h => (
                                                <th key={h} style={TH}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.dayTasks.map(t => (
                                            <tr key={t.id}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ ...TD, color: C.muted, fontSize: '12px' }}>{fmtTime(t.completedAt)}</td>
                                                <td style={TD}>
                                                    <div style={{ fontWeight: '600' }}>{t.title}</div>
                                                    {t.description && <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{t.description}</div>}
                                                </td>
                                                <td style={TD}>
                                                    {t.assignedTo?.role && (
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                                                            background: ROLE_COLORS[t.assignedTo.role]?.bg || C.slateBg,
                                                            color: ROLE_COLORS[t.assignedTo.role]?.text || C.slate
                                                        }}>
                                                            {ROLE_LABEL[t.assignedTo.role] || t.assignedTo.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...TD, fontSize: '12px' }}>{t.assignedTo?.name || '—'}</td>
                                                <td style={TD}><PriorityBadge priority={t.priority} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        input[type=date]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:0.6; }
      `}</style>
        </div>
    );
}