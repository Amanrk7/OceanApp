import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TrendingDown, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api';
import DashboardClock from './DashboardClock.jsx';

// ═══════════════════════════════════════════════════════════════
// MEMOIZED COMPONENTS
// ═══════════════════════════════════════════════════════════════

const TabSelector = React.memo(({ options, active, onChange }) => (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        {options.map(opt => (
            <button
                key={opt}
                onClick={() => onChange(opt)}
                style={{
                    padding: '8px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: active === opt ? '#0ea5e9' : '#64748b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderBottom: active === opt ? '2px solid #0ea5e9' : 'none',
                    transition: 'all .2s'
                }}
            >
                {opt}
            </button>
        ))}
    </div>
));

TabSelector.displayName = 'TabSelector';

// Daily Profit Chart
const DailyProfitChart = React.memo(({ data }) => (
    <div className="ob-card" style={{ minHeight: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Daily Profit (Last 7 Days)</h3>
            </div>
            <button style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                ⋯
            </button>
        </div>
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="profit" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    </div>
));

DailyProfitChart.displayName = 'DailyProfitChart';

// Stat Card Component
const StatCard = React.memo(({ title, value, color, trend }) => (
    <div className="ob-card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="ob-card-title">{title}</div>
        <div className="ob-card-value" style={{ color, marginBottom: '8px' }}>${value.toLocaleString()}</div>
        {trend && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {trend > 0 ? <TrendingUp style={{ width: '14px', height: '14px', color: '#10b981' }} /> : <TrendingDown style={{ width: '14px', height: '14px', color: '#ef4444' }} />}
                {Math.abs(trend)}% {trend > 0 ? 'up' : 'down'} from last month
            </div>
        )}
    </div>
));

StatCard.displayName = 'StatCard';

// Progress Bar Component
const ProgressBar = React.memo(({ percentage, goal, current }) => (
    <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Progress to Goal</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{Math.round(percentage)}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
                style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #14b8a6 0%, #06b6d4 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                    width: `${Math.min(percentage, 100)}%`
                }}
            />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            ${current.toLocaleString()} / ${goal.toLocaleString()}
        </div>
    </div>
));

ProgressBar.displayName = 'ProgressBar';

// Player Attendance Card
const PlayerAttendanceCard = React.memo(({ stats }) => (
    <div className="ob-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Player Attendance</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {stats.map((stat, idx) => (
                <div key={idx} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 8px 0' }}>{stat.label}</p>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
            ))}
        </div>
    </div>
));

PlayerAttendanceCard.displayName = 'PlayerAttendanceCard';

// Top Depositors Card
const TopDepositorsCard = React.memo(({ data: allData }) => {
    const [period, setPeriod] = useState('30days');

    const data = {
        '30days': allData?.period_30days || [],
        '7days': allData?.period_7days || [],
        '1day': allData?.period_1day || []
    };

    const displayData = data[period] || [];

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Depositors</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* {displayData.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < Math.min(5, displayData.length - 1) ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>User #{item.userId}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.totalDeposits.toFixed(2)}</span>
                    </div>
                ))} */}
                {displayData.slice(0, 5).map((item, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '12px',
                            borderBottom:
                                idx < Math.min(5, displayData.length - 1)
                                    ? '1px solid #e2e8f0'
                                    : 'none'
                        }}
                    >
                        <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>
                            User {item.id}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            ${item.totalDeposited.toFixed(2)}
                        </span>
                    </div>
                ))}

            </div>
        </div>
    );
});

TopDepositorsCard.displayName = 'TopDepositorsCard';

// Top Cashouts Card
const TopCashoutsCard = React.memo(({ data: allData }) => {
    const [period, setPeriod] = useState('30days');

    const data = {
        '30days': allData?.period_30days || [],
        '7days': allData?.period_7days || [],
        '1day': allData?.period_1day || []
    };

    const displayData = data[period] || [];

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Cashouts</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayData.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < Math.min(5, displayData.length - 1) ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>User {item.id}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.totalCashouts.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopCashoutsCard.displayName = 'TopCashoutsCard';

// Top Games by Deposits Card
const TopGamesByDepositsCard = React.memo(({ data: allData }) => {
    const [period, setPeriod] = useState('30days');

    const data = {
        '30days': allData?.period_30days || [],
        '7days': allData?.period_7days || [],
        '1day': allData?.period_1day || []
    };

    const displayData = data[period] || [];

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Games by Deposits</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayData.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < Math.min(5, displayData.length - 1) ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{item.gameName}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.totalDeposits.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopGamesByDepositsCard.displayName = 'TopGamesByDepositsCard';

// Top Games by Cashouts Card
const TopGamesByCashoutsCard = React.memo(({ data: allData }) => {
    const [period, setPeriod] = useState('30days');

    const data = {
        '30days': allData?.period_30days || [],
        '7days': allData?.period_7days || [],
        '1day': allData?.period_1day || []
    };

    const displayData = data[period] || [];

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Games by Cashouts</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['30days', '7days', '1day']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayData.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < Math.min(5, displayData.length - 1) ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{item.gameName}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.totalCashouts.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopGamesByCashoutsCard.displayName = 'TopGamesByCashoutsCard';

// Player Activity Chart
const PlayerActivityChart = React.memo(({ data }) => {

    const [period, setPeriod] = useState('7days');

    const chartData = period === '7days' ? data?.period_7days || [] : data?.period_30days || [];
    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Player Activity</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7days', '30days']} active={period} onChange={setPeriod} />
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="deposits"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="Deposits"
                        isAnimationActive={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="withdrawals"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 4 }}
                        name="Withdrawals"
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>

        </div>
    );
});

PlayerActivityChart.displayName = 'PlayerActivityChart';

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Dashboard() {
    // State
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

    const [data, setData] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        critical: 0,
        highlyCritical: 0,
        inactive: 0
    });
    const [filterStatus, setFilterStatus] = useState('Active');



    // Load all dashboard data
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                const profitResponse = await api.dashboard.getProfitStats();
                if (profitResponse && profitResponse.summary) {
                    setLast30DaysProfit(profitResponse.summary.total);
                    setDailyProfit(profitResponse);
                    console.log('✅ Profit stats loaded:', profitResponse.summary);
                }
                // Parallel fetch all data
                const [stats, dailyProfit, activity, chart_depoVsCashout, depositors, cashouts, gameDeposits, gameCashouts] = await Promise.all([
                    api.dashboard.getStats(),
                    api.dashboard.getDailyProfit(),
                    // api.dashboard.getProfitStats(),
                    api.dashboard.getPlayerActivity(),
                    api.dashboard.getDepoVsCashoutsActivity(),
                    api.dashboard.getTopDepositors?.() || Promise.resolve(null),
                    api.dashboard.getTopCashouts?.() || Promise.resolve(null),
                    api.dashboard.getTopGamesByDeposits?.() || Promise.resolve(null),
                    api.dashboard.getTopGamesByCashouts?.() || Promise.resolve(null)
                ]);


                const result = await api.attendance.getAttendance(filterStatus);
                // Set the data
                setData(result);
                // Set stats from backend (real counts from database)
                if (result.stats) {
                    setStats({
                        total: result.stats.total,
                        active: result.stats.active,
                        critical: result.stats.critical,
                        highlyCritical: result.stats.highlyCritical,
                        inactive: result.stats.inactive
                    });
                    console.log('✓ Stats updated:', result.stats);
                }


                setDashboardStats(stats);
                setDailyProfit(dailyProfit);
                // setLast30DaysProfit(profitStats);
                setPlayerActivity(activity);
                setDepoVsCashoutActivity(chart_depoVsCashout);
                setTopDepositors(depositors);
                setTopCashouts(cashouts);
                setTopGamesByDeposits(gameDeposits);
                setTopGamesByCashouts(gameCashouts);
                // setPlayerActivity(activity);

                const total = activity?.data.reduce((sum, d) => sum + d.deposits, 0);
                setTotalDepositsWeek(total);

            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                setLast30DaysProfit(0);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadDashboardData, 30 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Calculate derived values

    const deposits = dashboardStats?.daily?.deposits || 0;
    const cashouts = dashboardStats?.daily?.cashouts || 0;
    const todaysProfit = deposits - cashouts;
    const profitGoal = todaysProfit + 500;
    const goalTarget = profitGoal;

    const depositsDetail = dashboardStats?.revenue?.deposits || 0;
    const cashoutsDetail = dashboardStats?.revenue?.withdrawals || 0;
    // const last30DaysProfit = depositsDetail - cashoutsDetail;
    const avgTx = depositsDetail / (dashboardStats?.transactions?.total || 1);
    const issuesUnresolved = dashboardStats?.issues?.unresolved || 0;

    const totalPlayers = dashboardStats?.players?.total || 0;
    const newPlayersWeek = dashboardStats?.players?.newThisWeek || 0;

    // Calculate week total from daily data
    // const totalDepositsWeek = playerActivity?.period_7days?.reduce((sum, day) => sum + (day.deposits || 0), 0) || 0;

    // Stat cards
    const statCards = [
        { title: 'Today\'s Profit', value: Math.round(todaysProfit), color: 'var(--color-cards)', trend: 2.5 },
        { title: 'Total Top-Ups', value: Math.round(depositsDetail), color: '#10b981', trend: 3.2 },
        { title: 'Total Cashouts', value: Math.round(cashoutsDetail), color: '#ef4444', trend: -1.1 },
        { title: 'Bonuses Earned', value: Math.round(depositsDetail * 0.5), color: '#f59e0b', trend: 5.8 }
    ];

    // Attendance stats
    const attendanceStats = [
        { label: 'ACTIVE (24H)', value: stats?.active || 0, color: '#10b981' },
        { label: 'CRITICAL (1-3D)', value: stats?.critical || 0, color: '#f59e0b' },
        { label: 'HIGHLY CRITICAL (>3D)', value: stats?.highlyCritical || 0, color: '#ef4444' },
        { label: 'INACTIVE (>1week)', value: stats?.inactive || 0, color: '#64748b' }
    ];

    // Progress calculation
    const progressPercentage = (profitGoal / goalTarget) * 100;

    return (

        <div style={{
            minHeight: '100vh', padding: '8px',
            display: "grid",
            gap: "24px",
            gridTemplateColumns: "3fr 1fr"
        }}
        >
            {/* Header */}

            <div >


                {/* Today's Profit Goal Card */}
                <div className="ob-card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px' }}>
                        Today's Profit Goal
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>${profitGoal.toFixed(2)}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingDown style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>${deposits.toLocaleString()} Deposits</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                                    <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>${cashouts.toLocaleString()} Cashouts</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <ProgressBar
                                percentage={progressPercentage}
                                goal={goalTarget}
                                current={profitGoal}
                            />
                        </div>
                    </div>
                </div>

                {/* Stat Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {statCards.map((stat, idx) => (
                        <div style={{
                            background: "var(--color-cards-background)", borderRadius: "14px",
                            padding: "20px 5px 5px 5px",
                            boxShadow: "0 2px 8px rgba(15,23,42,.08)"
                        }}>
                            {stat.title}
                            <StatCard
                                key={idx}
                                // title={stat.title}
                                value={stat.value}
                                // color={stat.color}
                                trend={stat.trend}
                                style={{ marginTop: '8px', padding: '0 12px', background: "var(--ring)" }}
                            />
                        </div>

                    ))}
                </div>

                {/* Total Profit & Issue Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    {/* Total Profit Card */}
                    <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0891b2 100%)', borderRadius: '16px', boxShadow: '0 8px 20px rgba(2, 132, 199, .15)', padding: '24px', color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255, 255, 255, .7)', margin: 0, marginBottom: '4px' }}>Total Profit (Last 30 Days)</p>
                                <h3 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: '700', margin: 0 }}>${last30DaysProfit}</h3>
                            </div>
                            {/* <button style={{ background: 'rgba(255, 255, 255, .15)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', transition: 'background .2s' }}>
                            ⋯
                        </button> */}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, .15)' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, .7)', margin: 0, marginBottom: '4px' }}>Deposits</p>
                                <p style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>${depositsDetail.toLocaleString()}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, .7)', margin: 0, marginBottom: '4px' }}>Cashouts</p>
                                <p style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>${cashoutsDetail.toLocaleString()}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, .7)', margin: 0, marginBottom: '4px' }}>Avg Tx</p>
                                <p style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>${avgTx.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>



                    {/* Player Activity Summary Card */}
                    <div className="ob-card bg-white rounded-lg shadow p-6">
                        {/* Header */}
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Player Activity (7D)
                        </h3>

                        {/* Summary */}
                        <div className="text-center mb-6">
                            <p className="text-3xl font-bold text-slate-900">
                                ${totalDepositsWeek.toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Total Deposits This Week
                            </p>
                        </div>

                        {/* Chart */}
                        <div className="h-72">
                            {playerActivity?.data ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={playerActivity.data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                                        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="deposits"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-sm text-slate-400">Loading chart...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Section - Attendance, Depositors, Cashouts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <TopDepositorsCard data={topDepositors} />
                    <TopCashoutsCard data={topCashouts} />
                </div>

                {/* Games Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <TopGamesByDepositsCard data={topGamesByDeposits} />
                    <TopGamesByCashoutsCard data={topGamesByCashouts} />
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <DailyProfitChart data={dailyProfit?.data} />
                </div>

                {/* Player Activity Chart - Full Width */}
                <div style={{ marginBottom: '24px' }}>
                    <PlayerActivityChart data={
                        depoVsCashoutActivity
                    } />
                </div>



            </div>
            <div style={{
                display: 'flex',
                //  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                flexDirection: "column",
                gap: '16px',
            }}>
                {/* {statCards.map((stat, idx) => ( */}
                <div style={{
                    background: "none", borderRadius: "14px",
                    // padding: "20px 5px 5px 5px",
                    boxShadow: "0 2px 8px rgba(15,23,42,.08)"
                }}>
                    <div className={`rounded-xl border-2 p-6  `}
                        style={{
                            background: `var(--color-cards-background)`
                        }}
                    >
                        <div style={{
                            background: "var(--color-cards-background)",
                            borderRadius: "14px",
                            overflow: "hidden",   // ← so the dark clock card clips to the card's border radius
                            boxShadow: "0 2px 8px rgba(15,23,42,.08)"
                        }}>
                            <DashboardClock />
                        </div>
                        {/* <p className="text-2xl font-bold">{}</p> */}
                    </div>



                </div>

                {/* Issue Status Card */}
                <div className="ob-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>
                            Issue Status
                        </h3>
                    </div>

                    {/* Big unresolved count */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <p style={{ fontSize: '48px', fontWeight: '800', color: issuesUnresolved > 0 ? '#ef4444' : '#10b981', margin: '0 0 2px 0', lineHeight: 1 }}>
                            {dashboardStats?.issues?.unresolved ?? 0}
                        </p>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Unresolved Issues</p>

                        {/* High priority warning */}
                        {(dashboardStats?.issues?.highPriority ?? 0) > 0 && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                marginTop: '8px', padding: '4px 10px',
                                background: '#fee2e2', borderRadius: '20px',
                                fontSize: '11px', fontWeight: '700', color: '#dc2626'
                            }}>
                                ⚠ {dashboardStats.issues.highPriority} HIGH priority
                            </div>
                        )}
                    </div>

                    {/* Resolved vs Unresolved bar */}
                    {(() => {
                        const total = dashboardStats?.issues?.total ?? 0;
                        const resolved = dashboardStats?.issues?.resolved ?? 0;
                        const unresolved = dashboardStats?.issues?.unresolved ?? 0;
                        const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;

                        return (
                            <div>
                                {/* Progress bar */}
                                <div style={{ width: '100%', height: '8px', background: '#fee2e2', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${pct}%`,
                                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                                        borderRadius: '4px',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>

                                {/* Counts row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            Unresolved <strong style={{ color: '#0f172a' }}>{unresolved}</strong>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            Resolved <strong style={{ color: '#0f172a' }}>{resolved}</strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Resolution rate */}
                                <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                    {pct}% resolution rate · {total} total
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <PlayerAttendanceCard stats={attendanceStats} />
                {/* ))} */}
            </div>
        </div>

    );
}