import React, { useState, useMemo, useCallback } from 'react';
import { TrendingDown, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Memoized Tab Component
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

// Player Attendance Card
const PlayerAttendanceCard = React.memo(() => {
    const stats = [
        { label: 'ACTIVE (24H)', value: 94, color: '#10b981' },
        { label: 'CRITICAL (1-3D)', value: 28, color: '#f59e0b' },
        { label: 'HIGHLY CRITICAL (>3D)', value: 88, color: '#ef4444' },
        { label: 'INACTIVE', value: 11, color: '#64748b' }
    ];

    return (
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
    );
});

PlayerAttendanceCard.displayName = 'PlayerAttendanceCard';

// Top Depositors Card
const TopDepositorsCard = React.memo(() => {
    const [period, setPeriod] = useState('7D');

    const data = {
        '7D': [
            { name: 'Cindy lou', amount: 496.50 },
            { name: 'Yvonne Blue', amount: 417.59 },
            { name: 'Linden Carter', amount: 372.19 },
            { name: 'michael R Razzaq', amount: 356.97 },
            { name: 'John Nichols', amount: 346.00 }
        ],
        '1D': [
            { name: 'Cindy lou', amount: 150.50 },
            { name: 'Yvonne Blue', amount: 140.00 },
            { name: 'Sarah Conner', amount: 120.00 }
        ],
        '30D': [
            { name: 'Cindy lou', amount: 1250.50 },
            { name: 'Yvonne Blue', amount: 1100.00 },
            { name: 'Linden Carter', amount: 950.00 },
            { name: 'michael R Razzaq', amount: 850.00 },
            { name: 'John Nichols', amount: 800.00 }
        ]
    };

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Depositors</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7D', '1D', '30D']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data[period].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < data[period].length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>{item.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopDepositorsCard.displayName = 'TopDepositorsCard';

// Top Cashouts Card
const TopCashoutsCard = React.memo(() => {
    const [period, setPeriod] = useState('7D');

    const data = {
        '7D': [
            { name: 'Sarah Conner', amount: 651.00 },
            { name: 'Yvonne Blue', amount: 450.00 },
            { name: 'adam Miller', amount: 270.00 },
            { name: 'Crystal Seher', amount: 250.00 },
            { name: 'Cindy lou', amount: 250.00 }
        ],
        '1D': [
            { name: 'Sarah Conner', amount: 200.00 },
            { name: 'Yvonne Blue', amount: 150.00 },
            { name: 'Crystal Seher', amount: 100.00 }
        ],
        '30D': [
            { name: 'Sarah Conner', amount: 1500.00 },
            { name: 'Yvonne Blue', amount: 1200.00 },
            { name: 'adam Miller', amount: 950.00 },
            { name: 'Crystal Seher', amount: 850.00 },
            { name: 'Cindy lou', amount: 800.00 }
        ]
    };

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Cashouts</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7D', '1D', '30D']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data[period].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < data[period].length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>{item.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopCashoutsCard.displayName = 'TopCashoutsCard';

// Top Games by Deposits Card
const TopGamesByDepositsCard = React.memo(() => {
    const [period, setPeriod] = useState('7D');

    const data = {
        '7D': [
            { name: 'Game Vault', amount: 3709.99 },
            { name: 'Juwa', amount: 2291.52 },
            { name: 'Vblink', amount: 803.89 },
            { name: 'Yolo', amount: 743.15 },
            { name: 'Ultrapanda', amount: 618.11 }
        ],
        '1D': [
            { name: 'Game Vault', amount: 1200.00 },
            { name: 'Juwa', amount: 800.00 },
            { name: 'Vblink', amount: 400.00 }
        ],
        '30D': [
            { name: 'Game Vault', amount: 15000.00 },
            { name: 'Juwa', amount: 12000.00 },
            { name: 'Vblink', amount: 6500.00 },
            { name: 'Yolo', amount: 5000.00 },
            { name: 'Ultrapanda', amount: 4200.00 }
        ]
    };

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Games by Deposits</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7D', '1D', '30D']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data[period].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < data[period].length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{item.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopGamesByDepositsCard.displayName = 'TopGamesByDepositsCard';

// Top Games by Cashouts Card
const TopGamesByCashoutsCard = React.memo(() => {
    const [period, setPeriod] = useState('7D');

    const data = {
        '7D': [
            { name: 'Game Vault', amount: 1506.00 },
            { name: 'Juwa', amount: 1365.00 },
            { name: 'Cash frenzy', amount: 996.00 },
            { name: 'Yolo', amount: 585.00 },
            { name: 'Vblink', amount: 490.00 }
        ],
        '1D': [
            { name: 'Game Vault', amount: 500.00 },
            { name: 'Juwa', amount: 400.00 },
            { name: 'Cash frenzy', amount: 300.00 }
        ],
        '30D': [
            { name: 'Game Vault', amount: 8000.00 },
            { name: 'Juwa', amount: 7200.00 },
            { name: 'Cash frenzy', amount: 5500.00 },
            { name: 'Yolo', amount: 4000.00 },
            { name: 'Vblink', amount: 3000.00 }
        ]
    };

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Top Games by Cashouts</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7D', '1D', '30D']} active={period} onChange={setPeriod} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data[period].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < data[period].length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{item.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>${item.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TopGamesByCashoutsCard.displayName = 'TopGamesByCashoutsCard';

// Player Activity Chart with Toggle
const PlayerActivityChart = React.memo(() => {
    const [period, setPeriod] = useState('7D');

    const data7D = [
        { name: 'Mon', deposits: 1200, cashouts: 800 },
        { name: 'Tue', deposits: 1900, cashouts: 1200 },
        { name: 'Wed', deposits: 2200, cashouts: 1500 },
        { name: 'Thu', deposits: 1800, cashouts: 1100 },
        { name: 'Fri', deposits: 2100, cashouts: 1400 },
        { name: 'Sat', deposits: 2400, cashouts: 1600 },
        { name: 'Sun', deposits: 2800, cashouts: 1900 }
    ];

    const data30D = [
        { name: 'Week 1', deposits: 12400, cashouts: 8000 },
        { name: 'Week 2', deposits: 14200, cashouts: 9100 },
        { name: 'Week 3', deposits: 15600, cashouts: 10200 },
        { name: 'Week 4', deposits: 13800, cashouts: 9300 }
    ];

    const chartData = period === '7D' ? data7D : data30D;

    return (
        <div className="ob-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>Player Activity</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>⋯</button>
            </div>
            <TabSelector options={['7D', '30D']} active={period} onChange={setPeriod} />
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
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
                        dataKey="cashouts"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 4 }}
                        name="Cashouts"
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

PlayerActivityChart.displayName = 'PlayerActivityChart';

// Main Dashboard Component
export default function AdminDashboard() {
    return (
        <div style={{ minHeight: '100vh', padding: '8px' }}>
            {/* Header */}
            {/* <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Admin Dashboard</h1>
        <p style={{ fontSize: 'clamp(13px, 2vw, 15px)', color: '#64748b' }}>Complete Analytics Overview</p>
      </div> */}

            {/* Top Section - Attendance, Depositors, Cashouts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <PlayerAttendanceCard />
                <TopDepositorsCard />
                <TopCashoutsCard />
            </div>

            {/* Games Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <TopGamesByDepositsCard />
                <TopGamesByCashoutsCard />
            </div>

            {/* Player Activity Chart - Full Width */}
            <div style={{ marginBottom: '24px' }}>
                <PlayerActivityChart />
            </div>
        </div>
    );
}