import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  TrendingDown, TrendingUp, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, DollarSign, Zap,
  Activity, Target, AlertCircle, CheckCircle2,
  ChevronRight, Flame, Trophy, Star
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, AreaChart
} from 'recharts';
import { api } from '../api';
import DashboardClock from './DashboardClock.jsx';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════

const C = {
  blue:    '#3b82f6',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  purple:  '#8b5cf6',
  cyan:    '#06b6d4',
  slate50: '#f8fafc',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate400:'#94a3b8',
  slate500:'#64748b',
  slate700:'#334155',
  slate900:'#0f172a',
};

// ═══════════════════════════════════════════════════════════════
// REUSABLE PRIMITIVES
// ═══════════════════════════════════════════════════════════════

const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--color-cards-background, #fff)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)',
    border: '1px solid rgba(226,232,240,.7)',
    ...style,
  }}>
    {children}
  </div>
);

const Label = ({ children, style = {} }) => (
  <p style={{
    fontSize: 11, fontWeight: 700, letterSpacing: '.7px',
    textTransform: 'uppercase', color: C.slate400, margin: '0 0 8px 0', ...style,
  }}>
    {children}
  </p>
);

const TabSelector = React.memo(({ options, active, onChange }) => (
  <div style={{
    display: 'flex', gap: 4, background: C.slate100,
    borderRadius: 8, padding: 3, marginBottom: 14, width: 'fit-content',
  }}>
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          padding: '5px 12px', fontSize: 11, fontWeight: 600,
          borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all .15s',
          background: active === opt ? '#fff' : 'transparent',
          color: active === opt ? C.slate900 : C.slate400,
          boxShadow: active === opt ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
        }}
      >
        {opt}
      </button>
    ))}
  </div>
));
TabSelector.displayName = 'TabSelector';

// ═══════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.slate900, border: 'none', borderRadius: 10,
      padding: '8px 12px', fontSize: 12, color: '#fff',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    }}>
      <p style={{ margin: '0 0 4px 0', color: C.slate400, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color, fontWeight: 600 }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

const StatCard = React.memo(({ title, value, color, trend, icon: Icon, prefix = '$' }) => (
  <Card style={{ position: 'relative', overflow: 'hidden' }}>
    {/* Decorative accent */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: color, borderRadius: '16px 16px 0 0',
    }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <Label>{title}</Label>
      {Icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: C.slate900, letterSpacing: '-.5px', marginBottom: 6 }}>
      {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    {trend !== undefined && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: trend > 0 ? C.green : C.red, fontWeight: 600,
      }}>
        {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(trend)}% vs last month
      </div>
    )}
  </Card>
));
StatCard.displayName = 'StatCard';

// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════

const ProgressBar = React.memo(({ percentage, goal, current }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.slate500, fontWeight: 500 }}>Progress to Goal</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.slate900 }}>{Math.round(percentage)}%</span>
    </div>
    <div style={{ width: '100%', height: 7, background: C.slate100, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99,
        background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
        width: `${Math.min(percentage, 100)}%`, transition: 'width .5s ease',
      }} />
    </div>
    <div style={{ fontSize: 11, color: C.slate400, marginTop: 5 }}>
      ${current.toLocaleString()} / ${goal.toLocaleString()}
    </div>
  </div>
));
ProgressBar.displayName = 'ProgressBar';

// ═══════════════════════════════════════════════════════════════
// LEADERBOARD ROW (used by depositors / cashouts / games)
// ═══════════════════════════════════════════════════════════════

const LeaderboardRow = ({ rank, label, value, isLast }) => {
  const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];
  const bg = rank <= 3 ? `${medalColors[rank - 1]}12` : 'transparent';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 8, background: bg,
      borderBottom: !isLast ? `1px solid ${C.slate100}` : 'none',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: rank <= 3 ? medalColors[rank - 1] : C.slate100,
        color: rank <= 3 ? '#fff' : C.slate500,
        flexShrink: 0,
      }}>
        {rank}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: C.slate700, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.slate900 }}>${value?.toFixed(2)}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOP DEPOSITORS
// ═══════════════════════════════════════════════════════════════

const TopDepositorsCard = React.memo(({ data: allData }) => {
  const [period, setPeriod] = useState('30days');
  const displayData = allData?.[`period_${period}`] || [];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.green}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={14} color={C.green} />
          </div>
          <Label style={{ margin: 0 }}>Top Depositors</Label>
        </div>
      </div>
      <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayData.slice(0, 5).map((item, idx) => (
          <LeaderboardRow
            key={idx} rank={idx + 1}
            label={item.name || `User ${item.id}`}
            value={item.totalDeposited ?? 0}
            isLast={idx === Math.min(4, displayData.length - 1)}
          />
        ))}
        {!displayData.length && (
          <p style={{ textAlign: 'center', color: C.slate400, fontSize: 13, padding: '16px 0' }}>No data</p>
        )}
      </div>
    </Card>
  );
});
TopDepositorsCard.displayName = 'TopDepositorsCard';

// ═══════════════════════════════════════════════════════════════
// TOP CASHOUTS
// ═══════════════════════════════════════════════════════════════

const TopCashoutsCard = React.memo(({ data: allData }) => {
  const [period, setPeriod] = useState('30days');
  const displayData = allData?.[`period_${period}`] || [];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.red}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={14} color={C.red} />
          </div>
          <Label style={{ margin: 0 }}>Top Cashouts</Label>
        </div>
      </div>
      <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayData.slice(0, 5).map((item, idx) => (
          <LeaderboardRow
            key={idx} rank={idx + 1}
            label={item.name || `User ${item.id}`}
            value={item.totalCashouts ?? 0}
            isLast={idx === Math.min(4, displayData.length - 1)}
          />
        ))}
        {!displayData.length && (
          <p style={{ textAlign: 'center', color: C.slate400, fontSize: 13, padding: '16px 0' }}>No data</p>
        )}
      </div>
    </Card>
  );
});
TopCashoutsCard.displayName = 'TopCashoutsCard';

// ═══════════════════════════════════════════════════════════════
// TOP GAMES BY DEPOSITS
// ═══════════════════════════════════════════════════════════════

const TopGamesByDepositsCard = React.memo(({ data: allData }) => {
  const [period, setPeriod] = useState('30days');
  const displayData = allData?.[`period_${period}`] || [];
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.blue}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={14} color={C.blue} />
        </div>
        <Label style={{ margin: 0 }}>Top Games · Deposits</Label>
      </div>
      <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayData.slice(0, 5).map((item, idx) => (
          <LeaderboardRow
            key={idx} rank={idx + 1}
            label={item.gameName || item.name || '—'}
            value={item.totalDeposits ?? item.totalDeposited ?? 0}
            isLast={idx === Math.min(4, displayData.length - 1)}
          />
        ))}
        {!displayData.length && (
          <p style={{ textAlign: 'center', color: C.slate400, fontSize: 13, padding: '16px 0' }}>No data</p>
        )}
      </div>
    </Card>
  );
});
TopGamesByDepositsCard.displayName = 'TopGamesByDepositsCard';

// ═══════════════════════════════════════════════════════════════
// TOP GAMES BY CASHOUTS  ← BUG FIX: was totalCashouts, backend sends totalCashedOut
// ═══════════════════════════════════════════════════════════════

const TopGamesByCashoutsCard = React.memo(({ data: allData }) => {
  const [period, setPeriod] = useState('30days');
  const displayData = allData?.[`period_${period}`] || [];
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.amber}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star size={14} color={C.amber} />
        </div>
        <Label style={{ margin: 0 }}>Top Games · Cashouts</Label>
      </div>
      <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayData.slice(0, 5).map((item, idx) => (
          <LeaderboardRow
            key={idx} rank={idx + 1}
            label={item.gameName || item.name || '—'}
            // ✅ FIX: backend returns totalCashedOut, not totalCashouts
            value={item.totalCashedOut ?? item.totalCashouts ?? 0}
            isLast={idx === Math.min(4, displayData.length - 1)}
          />
        ))}
        {!displayData.length && (
          <p style={{ textAlign: 'center', color: C.slate400, fontSize: 13, padding: '16px 0' }}>No data</p>
        )}
      </div>
    </Card>
  );
});
TopGamesByCashoutsCard.displayName = 'TopGamesByCashoutsCard';

// ═══════════════════════════════════════════════════════════════
// DAILY PROFIT CHART
// ═══════════════════════════════════════════════════════════════

const DailyProfitChart = React.memo(({ data }) => (
  <Card>
    <Label>Daily Profit — Last 7 Days</Label>
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data || []} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} vertical={false} />
        <XAxis dataKey="day" stroke={C.slate400} tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis stroke={C.slate400} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="profit" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {(data || []).map((entry, i) => (
            <Cell key={i} fill={entry.profit >= 0 ? C.blue : C.red} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </Card>
));
DailyProfitChart.displayName = 'DailyProfitChart';

// ═══════════════════════════════════════════════════════════════
// PLAYER ACTIVITY CHART
// ═══════════════════════════════════════════════════════════════

const PlayerActivityChart = React.memo(({ data }) => {
  const [period, setPeriod] = useState('7days');
  const chartData = period === '7days' ? data?.period_7days || [] : data?.period_30days || [];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Label style={{ margin: 0 }}>Deposits vs Withdrawals</Label>
        <TabSelector options={['7days', '30days']} active={period} onChange={setPeriod} />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gDeposits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.green} stopOpacity={0.15} />
              <stop offset="95%" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gWithdrawals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.red} stopOpacity={0.15} />
              <stop offset="95%" stopColor={C.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} vertical={false} />
          <XAxis dataKey="date" stroke={C.slate400} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke={C.slate400} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="deposits" stroke={C.green} strokeWidth={2} fill="url(#gDeposits)" dot={{ fill: C.green, r: 3, strokeWidth: 0 }} name="Deposits" isAnimationActive={false} />
          <Area type="monotone" dataKey="withdrawals" stroke={C.red} strokeWidth={2} fill="url(#gWithdrawals)" dot={{ fill: C.red, r: 3, strokeWidth: 0 }} name="Withdrawals" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
});
PlayerActivityChart.displayName = 'PlayerActivityChart';

// ═══════════════════════════════════════════════════════════════
// PLAYER ATTENDANCE
// ═══════════════════════════════════════════════════════════════

const PlayerAttendanceCard = React.memo(({ stats }) => (
  <Card>
    <Label>Player Attendance</Label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stats.map((stat, idx) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', borderRadius: 10,
          background: `${stat.color}0d`,
          border: `1px solid ${stat.color}25`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: stat.color, letterSpacing: '.3px' }}>{stat.label}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </div>
  </Card>
));
PlayerAttendanceCard.displayName = 'PlayerAttendanceCard';

// ═══════════════════════════════════════════════════════════════
// ISSUE STATUS
// ═══════════════════════════════════════════════════════════════

const IssueStatusCard = ({ dashboardStats }) => {
  const unresolved = dashboardStats?.issues?.unresolved ?? 0;
  const resolved = dashboardStats?.issues?.resolved ?? 0;
  const total = dashboardStats?.issues?.total ?? 0;
  const highPriority = dashboardStats?.issues?.highPriority ?? 0;
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <Card>
      <Label>Issue Status</Label>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          fontSize: 52, fontWeight: 900,
          color: unresolved > 0 ? C.red : C.green,
          letterSpacing: '-2px', lineHeight: 1,
        }}>
          {unresolved}
        </div>
        <p style={{ fontSize: 12, color: C.slate400, fontWeight: 600, margin: '4px 0 0 0' }}>Unresolved</p>
        {highPriority > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 8, padding: '3px 10px', background: '#fee2e2',
            borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#dc2626',
          }}>
            <AlertCircle size={10} /> {highPriority} HIGH
          </div>
        )}
      </div>
      <div style={{ height: 6, background: '#fee2e2', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, #10b981, #06b6d4)',
          borderRadius: 99, transition: 'width .4s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {[
          { dot: C.red, label: 'Unresolved', val: unresolved },
          { dot: C.green, label: 'Resolved', val: resolved },
        ].map(({ dot, label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
            <span style={{ fontSize: 11, color: C.slate500 }}>{label} <strong style={{ color: C.slate900 }}>{val}</strong></span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: C.slate400, textAlign: 'center', marginTop: 8 }}>
        {pct}% resolution · {total} total
      </p>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════
// TODAY'S PROFIT CARD
// ═══════════════════════════════════════════════════════════════

const ProfitGoalCard = ({ profitGoal, deposits, cashouts, progressPercentage, goalTarget }) => (
  <Card style={{
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    border: 'none', color: '#fff', marginBottom: 20,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <Label style={{ color: 'rgba(255,255,255,.5)' }}>Today's Profit Goal</Label>
        <div style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 14 }}>
          ${profitGoal.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
              ${deposits.toLocaleString()} Deposits
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
              ${cashouts.toLocaleString()} Cashouts
            </span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{Math.round(progressPercentage)}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            width: `${Math.min(progressPercentage, 100)}%`, transition: 'width .5s ease',
          }} />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 5 }}>
          ${profitGoal.toLocaleString()} / ${goalTarget.toLocaleString()}
        </p>
      </div>
    </div>
  </Card>
);

// ═══════════════════════════════════════════════════════════════
// 30-DAY PROFIT CARD
// ═══════════════════════════════════════════════════════════════

const TotalProfitCard = ({ last30DaysProfit, depositsDetail, cashoutsDetail, avgTx }) => (
  <Card style={{
    background: 'linear-gradient(135deg, #0284c7 0%, #0891b2 100%)',
    border: 'none', color: '#fff',
  }}>
    <Label style={{ color: 'rgba(255,255,255,.6)' }}>Total Profit — Last 30 Days</Label>
    <div style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 16 }}>
      ${last30DaysProfit?.toLocaleString?.() ?? last30DaysProfit}
    </div>
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
      paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.15)',
    }}>
      {[
        { label: 'Deposits', value: depositsDetail },
        { label: 'Cashouts', value: cashoutsDetail },
        { label: 'Avg Tx', value: avgTx?.toFixed?.(2) ?? 0 },
      ].map(({ label, value }) => (
        <div key={label}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', margin: '0 0 2px 0', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>${value?.toLocaleString?.() ?? value}</p>
        </div>
      ))}
    </div>
  </Card>
);

// ═══════════════════════════════════════════════════════════════
// WEEKLY ACTIVITY MINI CHART
// ═══════════════════════════════════════════════════════════════

const WeeklyActivityCard = ({ playerActivity, totalDepositsWeek }) => (
  <Card>
    <Label>Player Activity — 7 Day</Label>
    <div style={{ textAlign: 'center', marginBottom: 10 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.slate900, letterSpacing: '-.5px' }}>
        ${totalDepositsWeek?.toLocaleString()}
      </div>
      <p style={{ fontSize: 11, color: C.slate400, margin: '2px 0 0 0', fontWeight: 500 }}>Total Deposits This Week</p>
    </div>
    <ResponsiveContainer width="100%" height={130}>
      {playerActivity?.data ? (
        <AreaChart data={playerActivity.data}>
          <defs>
            <linearGradient id="gWeekly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
              <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate400 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="deposits" stroke={C.blue} strokeWidth={2} fill="url(#gWeekly)" dot={false} name="Deposits" />
        </AreaChart>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p style={{ color: C.slate400, fontSize: 12 }}>Loading…</p>
        </div>
      )}
    </ResponsiveContainer>
  </Card>
);

// ═══════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════

const pulse = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`;

const Skeleton = ({ h = 20, w = '100%', br = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: br, background: C.slate100, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [playerActivity, setPlayerActivity] = useState(null);
  const [depoVsCashoutActivity, setDepoVsCashoutActivity] = useState(null);
  const [topDepositors, setTopDepositors] = useState(null);
  const [topCashouts, setTopCashouts] = useState(null);
  const [topGamesByDeposits, setTopGamesByDeposits] = useState(null);
  const [topGamesByCashouts, setTopGamesByCashouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [last30DaysProfit, setLast30DaysProfit] = useState(0);
  const [dailyProfit, setDailyProfit] = useState(null);
  const [totalDepositsWeek, setTotalDepositsWeek] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, critical: 0, highlyCritical: 0, inactive: 0 });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const profitResponse = await api.dashboard.getProfitStats();
        if (profitResponse?.summary) {
          setLast30DaysProfit(profitResponse.summary.total);
          setDailyProfit(profitResponse);
        }

        const [statsData, dailyProfitData, activity, chart_depoVsCashout, depositors, cashouts, gameDeposits, gameCashouts] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getDailyProfit(),
          api.dashboard.getPlayerActivity(),
          api.dashboard.getDepoVsCashoutsActivity(),
          api.dashboard.getTopDepositors?.() || Promise.resolve(null),
          api.dashboard.getTopCashouts?.()   || Promise.resolve(null),
          api.dashboard.getTopGamesByDeposits?.() || Promise.resolve(null),
          api.dashboard.getTopGamesByCashouts?.() || Promise.resolve(null),
        ]);

        const result = await api.attendance.getAttendance('Active');
        if (result?.stats) setStats(result.stats);

        setDashboardStats(statsData);
        setDailyProfit(dailyProfitData);
        setPlayerActivity(activity);
        setDepoVsCashoutActivity(chart_depoVsCashout);
        setTopDepositors(depositors);
        setTopCashouts(cashouts);
        setTopGamesByDeposits(gameDeposits);
        setTopGamesByCashouts(gameCashouts);

        const total = activity?.data?.reduce((sum, d) => sum + (d.deposits || 0), 0) ?? 0;
        setTotalDepositsWeek(total);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <style>{pulse}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton h={140} br={16} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={100} br={16} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Skeleton h={180} br={16} />
              <Skeleton h={180} br={16} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton h={120} br={16} />
            <Skeleton h={180} br={16} />
            <Skeleton h={200} br={16} />
          </div>
        </div>
      </div>
    );
  }

  // Derived values
  const deposits        = dashboardStats?.daily?.deposits || 0;
  const cashouts        = dashboardStats?.daily?.cashouts || 0;
  const todaysProfit    = deposits - cashouts;
  const profitGoal      = todaysProfit + 500;
  const goalTarget      = todaysProfit;
  const progressPct     = (profitGoal / goalTarget) * 100;

  const depositsDetail  = dashboardStats?.revenue?.deposits || 0;
  const cashoutsDetail  = dashboardStats?.revenue?.withdrawals || 0;
  const avgTx           = depositsDetail / (dashboardStats?.transactions?.total || 1);

  const statCards = [
    { title: "Today's Profit",  value: Math.round(todaysProfit),          color: C.blue,   icon: DollarSign,   trend: 2.5  },
    { title: 'Total Deposits',   value: Math.round(depositsDetail),        color: C.green,  icon: TrendingUp,   trend: 3.2  },
    { title: 'Total Cashouts',  value: Math.round(cashoutsDetail),        color: C.red,    icon: TrendingDown, trend: -1.1 },
    { title: 'Bonuses Earned',  value: Math.round(depositsDetail * 0.5),  color: C.amber,  icon: Zap,          trend: 5.8  },
  ];

  const attendanceStats = [
    { label: 'ACTIVE (24H)',          value: stats?.active || 0,         color: C.green  },
    { label: 'CRITICAL (1–3D)',       value: stats?.critical || 0,       color: C.amber  },
    { label: 'HIGHLY CRITICAL (>3D)', value: stats?.highlyCritical || 0, color: C.red    },
    { label: 'INACTIVE (>1W)',        value: stats?.inactive || 0,       color: C.slate400 },
  ];

  return (
    <>
      <style>{pulse}</style>
      <div style={{
        minHeight: '100vh', padding: 16,
        display: 'grid', gap: 20, gridTemplateColumns: '3fr 1fr',
      }}>

        {/* ── LEFT COLUMN ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Today's profit goal */}
          <ProfitGoalCard
            profitGoal={profitGoal}
            deposits={deposits}
            cashouts={cashouts}
            progressPercentage={progressPct}
            goalTarget={goalTarget}
          />

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 }}>
            {statCards.map((s, i) => (
              <StatCard key={i} title={s.title} value={s.value} color={s.color} icon={s.icon} trend={s.trend} />
            ))}
          </div>

          {/* 30-day profit + weekly activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TotalProfitCard
              last30DaysProfit={last30DaysProfit}
              depositsDetail={depositsDetail}
              cashoutsDetail={cashoutsDetail}
              avgTx={avgTx}
            />
            <WeeklyActivityCard playerActivity={playerActivity} totalDepositsWeek={totalDepositsWeek} />
          </div>

          {/* Top depositors + cashouts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TopDepositorsCard data={topDepositors} />
            <TopCashoutsCard data={topCashouts} />
          </div>

          {/* Top games */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TopGamesByDepositsCard data={topGamesByDeposits} />
            <TopGamesByCashoutsCard data={topGamesByCashouts} />
          </div>

          {/* Daily profit bar chart */}
          <DailyProfitChart data={dailyProfit?.data} />

          {/* Deposits vs Withdrawals area chart */}
          <PlayerActivityChart data={depoVsCashoutActivity} />
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Clock */}
          <Card style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'var(--color-cards-background)' }}>
            <DashboardClock />
          </Card>

          {/* Issue status */}
          <IssueStatusCard dashboardStats={dashboardStats} />

          {/* Attendance */}
          <PlayerAttendanceCard stats={attendanceStats} />
        </div>

      </div>
    </>
  );
}
