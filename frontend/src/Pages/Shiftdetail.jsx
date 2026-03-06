// ============================================================
// ShiftDetail — Tabbed shift report component
// REPLACE your existing ShiftDetail in AdminReportPage.jsx
// ============================================================
// This component shows a full 6-tab report for each shift:
//   Overview · Transactions · Tasks · Players · Bonuses · Issues
// Plus it surfaces the shift start/end form data submitted
// by members (balance confirmation, effort rating, etc.)
// ============================================================

import { useState } from 'react';
import {
    ArrowUpRight, ArrowDownRight, TrendingUp, Users, CheckCircle,
    Activity, Gift, AlertCircle, Star, Shield, Clock, ChevronDown,
    ChevronUp, MessageSquare
} from 'lucide-react';

const C = {
    text: '#0f172a', muted: '#64748b', faint: '#94a3b8', border: '#f1f5f9',
    green: '#16a34a', greenBg: '#dcfce7',
    red: '#dc2626', redBg: '#fee2e2',
    blue: '#2563eb', blueBg: '#dbeafe',
    amber: '#d97706', amberBg: '#fef3c7',
    purple: '#7c3aed', purpleBg: '#ede9fe',
};

function fmtMoney(v) {
    const n = parseFloat(v || 0);
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TH = { textAlign: 'left', fontWeight: '700', fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.border}`, background: '#fafbfc' };
const TD = { borderBottom: `1px solid #f8fafc`, color: C.text };

function TypeBadge({ type, description }) {
    const map = {
        DEPOSIT: { bg: '#dcfce7', color: '#15803d', label: 'Deposit' },
        WITHDRAWAL: { bg: '#fee2e2', color: '#dc2626', label: 'Cashout' },
        BONUS: { bg: '#fef3c7', color: '#b45309', label: 'Bonus' },
        MATCH_BONUS: { bg: '#ede9fe', color: '#7c3aed', label: 'Match Bonus' },
        SPECIAL: { bg: '#dbeafe', color: '#1d4ed8', label: 'Special' },
        ADJUSTMENT: { bg: '#f1f5f9', color: '#475569', label: 'Adjustment' },
    };
    const m = map[type] || { bg: '#f1f5f9', color: '#475569', label: type };
    return (
        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: m.bg, color: m.color }}>
            {m.label}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const map = {
        URGENT: { bg: '#fee2e2', color: '#dc2626' },
        HIGH: { bg: '#fff7ed', color: '#c2410c' },
        MEDIUM: { bg: '#fef3c7', color: '#92400e' },
        LOW: { bg: '#dcfce7', color: '#166534' },
    };
    const m = map[priority] || map.MEDIUM;
    return (
        <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: m.bg, color: m.color }}>
            {priority}
        </span>
    );
}

function MiniKpi({ icon: Icon, label, value, color, highlight }) {
    return (
        <div style={{ padding: '12px', borderRadius: '10px', background: highlight, border: `1px solid ${color}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Icon style={{ width: '14px', height: '14px', color, opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color }}>{value}</div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, marginTop: '2px' }}>{label}</div>
        </div>
    );
}

function RatingStars({ rating }) {
    return (
        <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} style={{ width: '14px', height: '14px', color: n <= rating ? '#f59e0b' : '#e2e8f0' }} fill={n <= rating ? '#f59e0b' : 'none'} />
            ))}
        </div>
    );
}

export function ShiftDetail({ shift, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const [activeTab, setActiveTab] = useState('overview');

    const s = shift.stats || {};
    const checkin = shift.checkin;

    const tabs = [
        { id: 'overview', label: 'Overview', count: null },
        { id: 'transactions', label: 'Transactions', count: shift.transactions?.length || 0 },
        { id: 'tasks', label: 'Tasks', count: shift.tasks?.length || 0 },
        { id: 'players', label: 'Players Added', count: shift.playersAdded?.length || 0 },
        { id: 'bonuses', label: 'Bonuses', count: shift.bonusesGranted?.length || 0 },
        { id: 'issues', label: 'Issues', count: shift.issueActivity?.length || 0 },
        { id: 'member_report', label: 'Member Report', count: null },
    ];

    const duration = shift.endTime
        ? Math.round((new Date(shift.endTime) - new Date(shift.startTime)) / 60000)
        : null;

    return (
        <div style={{ borderBottom: `1px solid ${C.border}` }}>
            {/* Shift header row */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', background: open ? '#fafbfc' : '#fff',
                    transition: 'background 0.15s',
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: C.text }}>
                            {fmtTime(shift.startTime)} – {shift.endTime ? fmtTime(shift.endTime) : 'Active'}
                        </span>
                        {duration && (
                            <span style={{ fontSize: '11px', color: C.faint }}>
                                <Clock style={{ width: '10px', height: '10px', display: 'inline', marginRight: '3px' }} />
                                {Math.floor(duration / 60)}h {duration % 60}m
                            </span>
                        )}
                        {!shift.endTime && (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#dcfce7', color: '#15803d', animation: 'pulse 2s infinite' }}>
                                LIVE
                            </span>
                        )}
                    </div>
                    {/* Quick stats in header */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: C.green, fontWeight: '700' }}>↑ {fmtMoney(s.totalDeposits)}</span>
                        <span style={{ fontSize: '11px', color: C.red, fontWeight: '700' }}>↓ {fmtMoney(s.totalCashouts)}</span>
                        <span style={{ fontSize: '11px', color: s.netProfit >= 0 ? C.green : C.red, fontWeight: '700' }}>
                            Net: {fmtMoney(s.netProfit)}
                        </span>
                        {s.playersAdded > 0 && <span style={{ fontSize: '11px', color: C.purple }}>+{s.playersAdded} players</span>}
                        {s.effortRating && (
                            <span style={{ fontSize: '11px', color: C.amber }}>
                                {'★'.repeat(s.effortRating)}{'☆'.repeat(5 - s.effortRating)} effort
                            </span>
                        )}
                    </div>
                </div>
                {open ? <ChevronUp style={{ width: '16px', height: '16px', color: C.faint }} /> : <ChevronDown style={{ width: '16px', height: '16px', color: C.faint }} />}
            </div>

            {/* Expanded content */}
            {open && (
                <div>
                    {/* Tab navigation */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto', background: '#fafbfc' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '9px 14px', border: 'none', fontFamily: 'inherit',
                                    fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                                    background: activeTab === tab.id ? '#fff' : 'transparent',
                                    color: activeTab === tab.id ? C.text : C.faint,
                                    borderBottom: activeTab === tab.id ? `2px solid ${C.text}` : '2px solid transparent',
                                    marginBottom: '-1px',
                                }}
                            >
                                {tab.label}
                                {tab.count !== null && tab.count > 0 && (
                                    <span style={{
                                        marginLeft: '5px', padding: '1px 6px', borderRadius: '10px',
                                        background: activeTab === tab.id ? C.text : '#e2e8f0',
                                        color: activeTab === tab.id ? '#fff' : C.muted,
                                        fontSize: '10px',
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── OVERVIEW ── */}
                    {activeTab === 'overview' && (
                        <div style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                                <MiniKpi icon={ArrowUpRight} label="Deposits" value={fmtMoney(s.totalDeposits)} color={C.green} highlight={C.greenBg} />
                                <MiniKpi icon={ArrowDownRight} label="Cashouts" value={fmtMoney(s.totalCashouts)} color={C.red} highlight={C.redBg} />
                                <MiniKpi icon={Gift} label="Bonuses" value={fmtMoney(s.totalBonuses)} color={C.amber} highlight={C.amberBg} />
                                <MiniKpi icon={TrendingUp} label="Net Profit" value={fmtMoney(s.netProfit)} color={parseFloat(s.netProfit || 0) >= 0 ? C.green : C.red} highlight={parseFloat(s.netProfit || 0) >= 0 ? C.greenBg : C.redBg} />
                                <MiniKpi icon={Users} label="Players Added" value={s.playersAdded || 0} color={C.purple} highlight={C.purpleBg} />
                                <MiniKpi icon={CheckCircle} label="Tasks Done" value={s.tasksCompleted || 0} color={C.green} highlight={C.greenBg} />
                                <MiniKpi icon={Gift} label="Bonuses Given" value={s.bonusesGranted || 0} color={C.amber} highlight={C.amberBg} />
                                <MiniKpi icon={Activity} label="Transactions" value={s.transactionCount || 0} color={C.blue} highlight={C.blueBg} />
                                {s.issuesCreated > 0 && <MiniKpi icon={AlertCircle} label="Issues Created" value={s.issuesCreated} color={C.red} highlight={C.redBg} />}
                                {s.issuesResolved > 0 && <MiniKpi icon={CheckCircle} label="Issues Resolved" value={s.issuesResolved} color={C.green} highlight={C.greenBg} />}
                            </div>

                            {/* Top depositors */}
                            {shift.playerDepositBreakdown?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                        Top Depositors This Shift
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {shift.playerDepositBreakdown.slice(0, 8).map((p, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', background: i === 0 ? '#fefce8' : '#fafbfc' }}>
                                                <span style={{ width: '18px', fontSize: '11px', color: C.faint, fontWeight: '700', flexShrink: 0 }}>#{i + 1}</span>
                                                <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: C.text }}>{p.name}</span>
                                                <span style={{ fontSize: '11px', color: C.faint }}>{p.count} txns</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: C.green }}>{fmtMoney(p.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TRANSACTIONS ── */}
                    {activeTab === 'transactions' && (
                        <div style={{ overflowX: 'auto' }}>
                            {!shift.transactions?.length ? (
                                <EmptyTab msg="No transactions this shift" />
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Time', 'Player', 'Type', 'Game', 'Amount', 'Balance After'].map(h => (
                                                <th key={h} style={{ ...TH, padding: '8px 12px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shift.transactions.map(t => {
                                            const balAfter = t.notes?.match(/balanceAfter:([\d.]+)/)?.[1];
                                            return (
                                                <tr key={t.id}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ ...TD, padding: '9px 12px', fontSize: '11px', color: C.muted }}>{fmtTime(t.createdAt)}</td>
                                                    <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', fontWeight: '600' }}>{t.user?.name || `#${t.userId}`}</td>
                                                    <td style={{ ...TD, padding: '9px 12px' }}><TypeBadge type={t.type} /></td>
                                                    <td style={{ ...TD, padding: '9px 12px', fontSize: '11px', color: C.muted }}>{t.game?.name || '—'}</td>
                                                    <td style={{ ...TD, padding: '9px 12px', fontWeight: '700', fontSize: '13px', color: t.type === 'DEPOSIT' ? C.green : t.type === 'WITHDRAWAL' ? C.red : C.amber }}>
                                                        {fmtMoney(t.amount)}
                                                    </td>
                                                    <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', color: C.muted }}>
                                                        {balAfter ? fmtMoney(parseFloat(balAfter)) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ── TASKS ── */}
                    {activeTab === 'tasks' && (
                        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {!shift.tasks?.length ? (
                                <EmptyTab msg="No tasks completed this shift" />
                            ) : (
                                shift.tasks.map(t => (
                                    <div key={t.id} style={{ padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <CheckCircle style={{ width: '14px', height: '14px', color: C.green, flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{t.title}</div>
                                            {t.description && <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{t.description}</div>}
                                            {t.progressLogs?.length > 0 && (
                                                <div style={{ marginTop: '6px', fontSize: '11px', color: C.muted, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {t.progressLogs.map((log, i) => (
                                                        <span key={i}>
                                                            <b style={{ color: C.text }}>{log.user?.name}</b> — {log.action?.replace(/_/g, ' ').toLowerCase()} +{log.value}
                                                            {log.metadata?.playerName ? ` (${log.metadata.playerName})` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '11px', color: C.faint }}>{fmtTime(t.completedAt)}</span>
                                            <PriorityBadge priority={t.priority} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── PLAYERS ADDED ── */}
                    {activeTab === 'players' && (
                        <div style={{ padding: '14px 20px' }}>
                            {!shift.playersAdded?.length ? (
                                <EmptyTab msg="No players added this shift" />
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                    {shift.playersAdded.map(p => (
                                        <div key={p.id} style={{ padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', background: '#fafbfc' }}>
                                            <div style={{ fontWeight: '700', fontSize: '13px' }}>{p.name}</div>
                                            <div style={{ fontSize: '11px', color: C.faint, marginTop: '1px' }}>@{p.username}</div>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                                                <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: C.amberBg, color: C.amber }}>{p.tier}</span>
                                                <span style={{ fontSize: '10px', color: C.faint }}>{fmtTime(p.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── BONUSES ── */}
                    {activeTab === 'bonuses' && (
                        <div style={{ overflowX: 'auto' }}>
                            {!shift.bonusesGranted?.length ? (
                                <EmptyTab msg="No bonuses granted this shift" />
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Time', 'Player', 'Type', 'Game', 'Amount'].map(h => (
                                                <th key={h} style={{ ...TH, padding: '8px 12px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shift.bonusesGranted.map(b => (
                                            <tr key={b.id}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ ...TD, padding: '9px 12px', fontSize: '11px', color: C.muted }}>{fmtTime(b.createdAt)}</td>
                                                <td style={{ ...TD, padding: '9px 12px', fontSize: '12px', fontWeight: '600' }}>{b.user?.name}</td>
                                                <td style={{ ...TD, padding: '9px 12px' }}><TypeBadge type={b.type || 'BONUS'} /></td>
                                                <td style={{ ...TD, padding: '9px 12px', fontSize: '11px', color: C.muted }}>{b.game?.name || '—'}</td>
                                                <td style={{ ...TD, padding: '9px 12px', fontWeight: '700', color: C.amber }}>{fmtMoney(b.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ── ISSUES ── */}
                    {activeTab === 'issues' && (
                        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {!shift.issueActivity?.length ? (
                                <EmptyTab msg="No issue activity this shift" />
                            ) : (
                                shift.issueActivity.map(issue => (
                                    <div key={issue.id} style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: issue.status === 'RESOLVED' ? C.green : C.red }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{issue.title}</div>
                                            {issue.playerName && <div style={{ fontSize: '11px', color: C.faint }}>{issue.playerName}</div>}
                                        </div>
                                        <PriorityBadge priority={issue.priority} />
                                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: issue.status === 'RESOLVED' ? C.greenBg : C.redBg, color: issue.status === 'RESOLVED' ? C.green : C.red }}>
                                            {issue.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── MEMBER REPORT ── */}
                    {activeTab === 'member_report' && (
                        <div style={{ padding: '16px 20px' }}>
                            {!checkin ? (
                                <EmptyTab msg="No shift report submitted by member" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Balance confirmation */}
                                    {checkin.confirmedBalance !== null && checkin.confirmedBalance !== undefined && (
                                        <div style={{ padding: '14px', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                <Shield style={{ width: '13px', height: '13px', color: C.blue }} />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>Pre-shift Balance Confirmation</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Member Confirmed</div>
                                                    <div style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>{fmtMoney(checkin.confirmedBalance)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Confirmed At</div>
                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: C.muted }}>{fmtDateTime(checkin.balanceConfirmedAt)}</div>
                                                </div>
                                            </div>
                                            {checkin.balanceNote && (
                                                <div style={{ marginTop: '8px', padding: '8px 10px', background: '#fffbeb', borderRadius: '8px', fontSize: '12px', color: C.amber }}>
                                                    Note: {checkin.balanceNote}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Effort rating */}
                                    {checkin.effortRating && (
                                        <div style={{ padding: '14px', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                <Star style={{ width: '13px', height: '13px', color: C.amber }} />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>Effort Rating</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <RatingStars rating={checkin.effortRating} />
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{checkin.effortRating}/5</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Work summary */}
                                    {checkin.workSummary && (
                                        <ReportField icon={MessageSquare} title="Work Summary" content={checkin.workSummary} />
                                    )}

                                    {/* Issues */}
                                    {checkin.issuesEncountered && (
                                        <ReportField icon={AlertCircle} title="Issues Encountered" content={checkin.issuesEncountered} color={C.red} />
                                    )}

                                    {/* Shoutouts */}
                                    {checkin.shoutouts && (
                                        <ReportField icon={CheckCircle} title="Shoutouts / Wins" content={checkin.shoutouts} color={C.green} />
                                    )}

                                    {/* Additional notes */}
                                    {checkin.additionalNotes && (
                                        <ReportField icon={MessageSquare} title="Additional Notes" content={checkin.additionalNotes} />
                                    )}

                                    <div style={{ fontSize: '11px', color: C.faint, textAlign: 'right' }}>
                                        Submitted at {fmtDateTime(checkin.endFormSubmittedAt)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ReportField({ icon: Icon, title, content, color }) {
    return (
        <div style={{ padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Icon style={{ width: '13px', height: '13px', color: color || C.blue }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text }}>{title}</span>
            </div>
            <p style={{ fontSize: '13px', color: C.muted, margin: 0, lineHeight: '1.5' }}>{content}</p>
        </div>
    );
}

function RatingStars({ rating }) {
    return (
        <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} style={{ width: '16px', height: '16px', color: n <= rating ? '#f59e0b' : '#e2e8f0' }} fill={n <= rating ? '#f59e0b' : 'none'} />
            ))}
        </div>
    );
}

function EmptyTab({ msg }) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>{msg}</div>;
}
