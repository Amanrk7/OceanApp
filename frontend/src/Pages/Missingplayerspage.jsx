import { useState, useEffect } from 'react';
import {
    AlertTriangle, Search, RefreshCw, Filter, User,
    Phone, Mail, Camera, Instagram, Send, Users, ExternalLink
} from 'lucide-react';

// ============================================================
// MissingPlayersPage — Shows players with missing/critical info
// Add this as a route: /admin/missing-info or /admin/critical
//
// Flags players missing: email, phone, snapchat, instagram,
// telegram, assigned member.
// "Critical" = 2+ fields missing.
// ============================================================

const FIELD_META = {
    email: { icon: Mail, label: 'Email', color: '#3b82f6' },
    phone: { icon: Phone, label: 'Phone', color: '#8b5cf6' },
    snapchat: { icon: Camera, label: 'Snapchat', color: '#eab308' },
    instagram: { icon: Instagram, label: 'Instagram', color: '#ec4899' },
    telegram: { icon: Send, label: 'Telegram', color: '#0ea5e9' },
    assigned_member: { icon: User, label: 'Assigned Member', color: '#ef4444' },
};

export default function MissingPlayersPage() {
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'critical' | field name
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await fetch('/api/players/missing-info', { credentials: 'include' });
                const data = await res.json();
                setPlayers(data.data || []);
                setStats(data.stats || {});
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [refreshKey]);

    const filtered = players.filter(p => {
        const matchSearch =
            !search ||
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.username?.toLowerCase().includes(search.toLowerCase());

        const matchFilter =
            filter === 'all' ||
            (filter === 'critical' && p.isCritical) ||
            (FIELD_META[filter] && p.missingFields.includes(filter));

        return matchSearch && matchFilter;
    });

    return (
        <div style={S.page}>
            {/* Page header */}
            <div style={S.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={S.pageIcon}>
                        <AlertTriangle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                    </div>
                    <div>
                        <h1 style={S.pageTitle}>Missing Player Info</h1>
                        <p style={S.pageSub}>Players with incomplete or missing contact details</p>
                    </div>
                </div>
                <button onClick={() => setRefreshKey(k => k + 1)} style={S.refreshBtn}>
                    <RefreshCw style={{ width: '14px', height: '14px' }} />
                    Refresh
                </button>
            </div>

            {/* Stats row */}
            <div style={S.statsGrid}>
                <StatCard
                    label="Total Players"
                    value={stats.total || 0}
                    color="#64748b"
                    bg="#f8fafc"
                    icon={Users}
                />
                <StatCard
                    label="Critical (2+ missing)"
                    value={stats.critical || 0}
                    color="#dc2626"
                    bg="#fff1f2"
                    icon={AlertTriangle}
                />
                <StatCard
                    label="Missing Snapchat"
                    value={stats.missingSnapchat || 0}
                    color="#eab308"
                    bg="#fefce8"
                    icon={Camera}
                />
                <StatCard
                    label="Missing Phone"
                    value={stats.missingPhone || 0}
                    color="#8b5cf6"
                    bg="#f5f3ff"
                    icon={Phone}
                />
                <StatCard
                    label="Missing Email"
                    value={stats.missingEmail || 0}
                    color="#3b82f6"
                    bg="#eff6ff"
                    icon={Mail}
                />
                <StatCard
                    label="Unassigned"
                    value={stats.unassigned || 0}
                    color="#ef4444"
                    bg="#fff1f2"
                    icon={User}
                />
            </div>

            {/* Filter + Search */}
            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <Search style={S.searchIcon} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={S.searchInput}
                        placeholder="Search by name or username..."
                    />
                </div>
                <div style={S.filterRow}>
                    {['all', 'critical', 'snapchat', 'phone', 'email', 'instagram', 'telegram', 'assigned_member'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                ...S.filterBtn,
                                background: filter === f ? '#0f172a' : '#f8fafc',
                                color: filter === f ? '#fff' : '#64748b',
                                border: `1px solid ${filter === f ? '#0f172a' : '#e2e8f0'}`,
                            }}
                        >
                            {f === 'all' ? 'All' : f === 'critical' ? '🔴 Critical' : FIELD_META[f]?.label || f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div style={S.resultsCount}>
                Showing {filtered.length} of {players.length} players
                {filter !== 'all' && <span style={{ color: '#ef4444', marginLeft: '6px' }}>• filtered</span>}
            </div>

            {/* Player list */}
            {loading ? (
                <div style={S.empty}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={S.empty}>
                    {search || filter !== 'all'
                        ? 'No players match your filters.'
                        : '✅ All players have complete information!'}
                </div>
            ) : (
                <div style={S.playerGrid}>
                    {filtered.map(player => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PlayerCard({ player }) {
    const tierColors = { VIP: '#f59e0b', HIGH: '#8b5cf6', MEDIUM: '#3b82f6', LOW: '#64748b' };
    const tierBg = { VIP: '#fef3c7', HIGH: '#f5f3ff', MEDIUM: '#eff6ff', LOW: '#f8fafc' };

    return (
        <div style={{
            ...S.playerCard,
            border: player.isCritical ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
            background: player.isCritical ? '#fffbfb' : '#fff',
        }}>
            {/* Critical badge */}
            {player.isCritical && (
                <div style={S.criticalBadge}>
                    <AlertTriangle style={{ width: '10px', height: '10px' }} />
                    CRITICAL
                </div>
            )}

            {/* Player info */}
            <div style={S.playerHeader}>
                <div style={S.avatar}>{(player.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.playerName}>{player.name || 'Unnamed'}</div>
                    <div style={S.playerUsername}>@{player.username || '—'}</div>
                </div>
                <div style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                    background: tierBg[player.tier] || '#f8fafc',
                    color: tierColors[player.tier] || '#64748b',
                }}>
                    {player.tier || 'N/A'}
                </div>
            </div>

            {/* Assigned member */}
            <div style={S.assignedRow}>
                <User style={{ width: '11px', height: '11px', color: player.assignedTo ? '#22c55e' : '#ef4444' }} />
                <span style={{ fontSize: '11px', color: player.assignedTo ? '#374151' : '#ef4444' }}>
                    {player.assignedTo ? `Assigned to ${player.assignedTo.name}` : 'No assigned member'}
                </span>
            </div>

            {/* Missing fields */}
            <div style={S.missingSection}>
                <div style={S.missingSectionTitle}>
                    Missing Fields ({player.missingFields.length})
                </div>
                <div style={S.fieldTags}>
                    {player.missingFields.map(field => {
                        const meta = FIELD_META[field];
                        const Icon = meta?.icon || AlertTriangle;
                        return (
                            <div key={field} style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
                                background: `${meta?.color || '#ef4444'}15`,
                                color: meta?.color || '#ef4444',
                                border: `1px solid ${meta?.color || '#ef4444'}30`,
                            }}>
                                <Icon style={{ width: '10px', height: '10px' }} />
                                {meta?.label || field}
                            </div>
                        );
                    })}
                    {player.missingFields.length === 0 && (
                        <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ All fields present</span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={S.playerFooter}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Added {new Date(player.createdAt).toLocaleDateString()}
                </span>
                <a
                    href={`/admin/players/${player.id}`}
                    style={{
                        fontSize: '11px', color: '#3b82f6', fontWeight: '600',
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                >
                    Edit <ExternalLink style={{ width: '10px', height: '10px' }} />
                </a>
            </div>
        </div>
    );
}

function StatCard({ label, value, color, bg, icon: Icon }) {
    return (
        <div style={{ ...S.statCard, background: bg, border: `1px solid ${color}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</div>
                <Icon style={{ width: '16px', height: '16px', color, opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>
                {label}
            </div>
        </div>
    );
}

const S = {
    page: {
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        maxWidth: '1400px', margin: '0 auto',
    },
    pageHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '24px',
    },
    pageIcon: {
        width: '44px', height: '44px', borderRadius: '12px',
        background: '#fff1f2', border: '1px solid #fecaca',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    pageTitle: { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 },
    pageSub: { fontSize: '13px', color: '#64748b', margin: '2px 0 0' },
    refreshBtn: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', border: '1px solid #e2e8f0',
        borderRadius: '10px', background: '#fff',
        fontSize: '12px', fontWeight: '600', color: '#374151',
        cursor: 'pointer', fontFamily: 'inherit',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '24px',
    },
    statCard: {
        padding: '14px 16px', borderRadius: '12px',
    },
    toolbar: {
        display: 'flex', flexDirection: 'column', gap: '10px',
        marginBottom: '12px',
    },
    searchWrap: { position: 'relative' },
    searchIcon: {
        position: 'absolute', left: '12px', top: '50%',
        transform: 'translateY(-50%)',
        width: '14px', height: '14px', color: '#94a3b8',
    },
    searchInput: {
        width: '100%', padding: '10px 12px 10px 36px',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontSize: '13px', fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box',
    },
    filterRow: {
        display: 'flex', gap: '6px', flexWrap: 'wrap',
    },
    filterBtn: {
        padding: '5px 12px', borderRadius: '8px',
        fontSize: '11px', fontWeight: '600', cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s',
    },
    resultsCount: {
        fontSize: '12px', color: '#64748b',
        marginBottom: '12px',
    },
    playerGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
    },
    playerCard: {
        borderRadius: '14px', padding: '14px',
        position: 'relative', overflow: 'hidden',
    },
    criticalBadge: {
        position: 'absolute', top: '10px', right: '10px',
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '2px 7px', borderRadius: '6px',
        background: '#fee2e2', color: '#dc2626',
        fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px',
    },
    playerHeader: {
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '8px',
    },
    avatar: {
        width: '38px', height: '38px', borderRadius: '12px',
        background: '#f1f5f9', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '16px', fontWeight: '700',
        color: '#475569', flexShrink: 0,
    },
    playerName: { fontSize: '14px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    playerUsername: { fontSize: '11px', color: '#94a3b8', marginTop: '1px' },
    assignedRow: {
        display: 'flex', alignItems: 'center', gap: '5px',
        marginBottom: '10px',
    },
    missingSection: { marginBottom: '10px' },
    missingSectionTitle: {
        fontSize: '10px', fontWeight: '700', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '6px',
    },
    fieldTags: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    playerFooter: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '8px', borderTop: '1px solid #f1f5f9',
    },
    empty: {
        textAlign: 'center', padding: '60px 20px',
        color: '#94a3b8', fontSize: '14px',
    },
};
