import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../api';
import AddNewPlayer from './AddNewPlayer';
import EditPlayer from './Editplayer';
import { AddPlayerContext } from "../Context/addPlayer";
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';
import { Search, Plus, RefreshCw, Eye, Pencil, Trash2, X, } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaSnapchatGhost, FaTelegramPlane } from "react-icons/fa";
import { SiGmail, SiX } from "react-icons/si"; // Gmail icon

// ─── Style constants ──────────────────────────────────────────
const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    amber: '#d97706',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
};
const TH = {
    textAlign: 'left', padding: '10px 14px', fontWeight: '600',
    color: '#64748b', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
    background: '#f8fafc',
};
const TD = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' };

const TIER_COLORS = {
    BRONZE: { bg: '#fed7aa', text: '#92400e', label: 'Bronze', cashout: 250 },
    SILVER: { bg: '#e0e7ff', text: '#3730a3', label: 'Silver', cashout: 500 },
    GOLD: { bg: '#fef3c7', text: '#92400e', label: 'Gold', cashout: 750 },
};
const STATUS_COLORS = {
    ACTIVE: { bg: '#dcfce7', text: '#166534', label: 'Active' },
    CRITICAL: { bg: '#fef9c3', text: '#854d0e', label: 'Critical' },
    HIGHLY_CRITICAL: { bg: '#ffedd5', text: '#9a3412', label: 'High Crit.' },
    INACTIVE: { bg: '#fee2e2', text: '#991b1b', label: 'Inactive' },
    SUSPENDED: { bg: '#fee2e2', text: '#991b1b', label: 'Suspended' },
    BANNED: { bg: '#f3e8ff', text: '#6b21a8', label: 'Banned' },
};

const SOCIALS = [
    { key: "email", icon: SiGmail, bg: "#d2e6ff", color: "#fff" },
    { key: "facebook", icon: FaFacebookF, bg: "#1877f2", color: "#fff" },
    { key: "telegram", icon: FaTelegramPlane, bg: "#26a5e4", color: "#fff" },
    { key: "instagram", icon: FaInstagram, bg: "#e1306c", color: "#fff" },
    { key: "x", icon: SiX, bg: "#000", color: "#fff" },
    { key: "snapchat", icon: FaSnapchatGhost, bg: "#f7d300", color: "#000" },
];

const getTier = t => TIER_COLORS[t] || TIER_COLORS.BRONZE;
const getStatus = s => STATUS_COLORS[s] || STATUS_COLORS.ACTIVE;

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <div style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '11px', flexShrink: 0,
        }}>{initials}</div>
    );
}

// ─── Social badges cell ───────────────────────────────────────
function SocialsBadges({ player }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {SOCIALS.map(s => {
                const value = player.socials[s.key];
                const hasSocial = Boolean(value);
                const Icon = s.icon;

                return (
                    <span
                        key={s.key}
                        className="social-badge"
                        title={
                            hasSocial
                                ? `${s.key}: @${value}`
                                : `${s.key}: not provided`
                        }
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            background: s.bg,
                            color: s.color,
                            fontSize: '14px',
                            cursor: 'default',
                            opacity: hasSocial ? 1 : 0.4,
                            border: hasSocial ? 'none' : '1px dashed #666',
                        }}
                    >
                        <Icon />
                        {!hasSocial && "?"}
                    </span>
                );
            })}
        </div>
    );
}

// ─── Delete confirmation modal ────────────────────────────────
function DeleteModal({ player, onClose, onDeleted }) {
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!pwd.trim()) return setError('Admin password is required.');
        setError('');
        try {
            setLoading(true);
            await api.players.deletePlayer(player.id, pwd);
            onDeleted();
            onClose();
        } catch (err) {
            setError(err.message || 'Incorrect password or server error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
                zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            }}
        >
            <div style={{
                background: C.white, borderRadius: '14px', boxShadow: '0 24px 60px rgba(15,23,42,.25)',
                width: '100%', maxWidth: '420px', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 20px', background: C.redLt,
                    borderBottom: `1px solid ${C.redBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#7f1d1d' }}>
                            🗑 Delete Player
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.red }}>
                            This action is permanent and cannot be undone.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.grayLt, fontSize: '18px' }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    <div style={{
                        padding: '12px 14px', background: '#fff8f1', border: `1px solid #fed7aa`,
                        borderRadius: '8px', marginBottom: '16px',
                    }}>
                        <p style={{ margin: 0, fontWeight: '700', color: C.slate, fontSize: '13px' }}>{player.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.gray }}>
                            @{player.username} · {player.email}
                        </p>
                    </div>

                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Admin Password *
                    </label>
                    <input
                        type="password"
                        value={pwd}
                        onChange={e => setPwd(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleDelete()}
                        placeholder="Enter your admin password to confirm"
                        style={{
                            width: '100%', padding: '10px 12px', border: `1px solid ${error ? C.red : C.border}`,
                            borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
                        }}
                    />
                    {error && <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.red }}>{error}</p>}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 20px', borderTop: `1px solid ${C.border}`,
                    display: 'flex', gap: '10px', background: C.bg,
                }}>
                    <button onClick={onClose} disabled={loading} style={{
                        flex: 1, padding: '10px', background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', color: C.slate,
                    }}>Cancel</button>
                    <button onClick={handleDelete} disabled={loading} style={{
                        flex: 2, padding: '10px', background: loading ? '#e2e8f0' : C.red,
                        color: loading ? C.grayLt : '#fff', border: 'none', borderRadius: '8px',
                        fontWeight: '700', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                        {loading ? '⏳ Deleting…' : '🗑 Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// MAIN PLAYERS PAGE
// ══════════════════════════════════════════════════════════════
export default function Players() {
    const navigate = useNavigate();
    const { addPlayer, setAddPlayer } = useContext(AddPlayerContext);
    const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modals
    const [editPlayer, setEditPlayer] = useState(null);   // player object | null
    const [deletePlayer, setDeletePlayer] = useState(null);   // player object | null

    const loadPlayers = useCallback(async () => {
        try {
            setLoading(true);
            const result = await api.players.getPlayers(
                currentPage, itemsPerPage, searchTerm,
                filterTab === 'all' ? '' : filterTab,
            );
            console.log("data: ", result);
            setData(result);
        } catch (err) {
            console.error('Failed to load players:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, filterTab]);

    useEffect(() => { loadPlayers(); }, [loadPlayers]);

    if (addPlayer) return <AddNewPlayer onIssueCreated={loadPlayers} />;

    const players = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };
    const pageCount = Math.min(pagination.pages, 10);

    const handleView = (player) => {
        setSelectedPlayer(player);
        navigate(`/playerDashboard/${player.id}`);
    };

    const handleSearch = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };

    const TABS = [
        { id: 'all', label: 'All Players' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'CRITICAL', label: 'Critical' },
        { id: 'HIGHLY_CRITICAL', label: 'Highly Critical' },
        { id: 'INACTIVE', label: 'Inactive' },
    ];

    // Shared icon-button style
    const iconBtn = (bg, color, hoverBg) => ({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '30px', borderRadius: '7px', border: 'none',
        background: bg, color, cursor: 'pointer', transition: 'background .15s',
        flexShrink: 0,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 'inherit' }}>

            {/* ── Top Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f1f5f9' }}>
                    {TABS.map(tab => {
                        const active = filterTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setFilterTab(tab.id); setCurrentPage(1); }}
                                style={{
                                    padding: '10px 16px', background: 'none', border: 'none', fontWeight: '600',
                                    fontSize: '13px', color: active ? C.sky : '#64748b',
                                    borderBottom: active ? `2px solid ${C.sky}` : '2px solid transparent',
                                    marginBottom: '-2px', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                                }}>{tab.label}</button>
                        );
                    })}
                </div>

                {/* Right controls */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Search name or email…" value={searchTerm} onChange={handleSearch}
                            style={{ padding: '9px 12px 9px 32px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', outline: 'none', width: '220px', background: '#fff' }} />
                    </div>
                    <button onClick={() => loadPlayers()}
                        style={{ padding: '9px 12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: C.gray, fontWeight: '600' }}>
                        <RefreshCw style={{ width: '13px', height: '13px' }} /> Refresh
                    </button>
                    <button onClick={() => setAddPlayer(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', background: C.sky, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Player
                    </button>
                </div>
            </div>

            {/* ── Table Card ── */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,.07)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={TH}>Player</th>
                                <th style={TH}>Email</th>
                                <th style={TH}>Tier</th>
                                <th style={TH}>Balance</th>
                                <th style={TH}>Cashout Limit</th>
                                <th style={TH}>Socials</th>
                                <th style={TH}>Status</th>
                                <th style={TH}>Last Login</th>
                                <th style={{ ...TH, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Loading players…
                                        </div>
                                    </td>
                                </tr>
                            ) : players.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        No players found
                                    </td>
                                </tr>
                            ) : players.map(player => {
                                const tier = getTier(player.tier);
                                const status = getStatus(player.status);
                                const lastLogin = player.lastLoginAt
                                    ? new Date(player.lastLoginAt).toLocaleDateString()
                                    : 'Never';
                                // Cashout limit: prefer stored value, fall back to tier default
                                const cashoutDisplay = player.cashoutLimit
                                    ? `$${parseFloat(player.cashoutLimit).toFixed(0)}`
                                    : `$${TIER_COLORS[player.tier]?.cashout ?? 250}`;

                                return (
                                    <tr key={player.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        style={{ cursor: 'default' }}
                                    >
                                        {/* Player */}
                                        <td style={TD}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Avatar name={player.name} />
                                                <div>
                                                    <div
                                                        style={{ fontWeight: '600', color: '#0f172a', cursor: 'pointer', fontSize: '13px' }}
                                                        onClick={() => handleView(player)}
                                                        onMouseEnter={e => e.currentTarget.style.color = C.sky}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}
                                                    >{player.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>@{player.username}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td style={{ ...TD, color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {player.email}
                                        </td>

                                        {/* Tier */}
                                        <td style={TD}>
                                            <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: tier.bg, color: tier.text }}>
                                                {tier.label}
                                            </span>
                                        </td>

                                        {/* Balance */}
                                        <td style={{ ...TD, fontWeight: '700', color: '#10b981', fontSize: '14px' }}>
                                            ${parseFloat(player.balance).toFixed(2)}
                                        </td>

                                        {/* Cashout Limit */}
                                        <td style={TD}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 9px', borderRadius: '6px',
                                                fontSize: '12px', fontWeight: '700',
                                                background: '#f0fdf4', color: '#166534', border: '1px solid #86efac',
                                            }}>
                                                {cashoutDisplay}
                                            </span>
                                        </td>

                                        {/* Socials */}
                                        <td style={TD}>
                                            <SocialsBadges player={player} />
                                        </td>

                                        {/* Status */}
                                        <td style={TD}>
                                            <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: status.bg, color: status.text }}>
                                                {status.label}
                                            </span>
                                        </td>

                                        {/* Last Login */}
                                        <td style={{ ...TD, color: '#64748b' }}>{lastLogin}</td>

                                        {/* Actions */}
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                {/* View */}
                                                <button
                                                    title="View Dashboard"
                                                    onClick={() => handleView(player)}
                                                    onMouseEnter={e => e.currentTarget.style.background = C.skyLt}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#f0f9ff'}
                                                    style={{ ...iconBtn('#f0f9ff', C.sky) }}
                                                >
                                                    <Eye style={{ width: '13px', height: '13px' }} />
                                                </button>

                                                {/* Edit */}
                                                <button
                                                    title="Edit Player"
                                                    onClick={() => setEditPlayer(player)}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fefce8'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}
                                                    style={{ ...iconBtn('#fffbeb', C.amber) }}
                                                >
                                                    <Pencil style={{ width: '13px', height: '13px' }} />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    title="Delete Player"
                                                    onClick={() => setDeletePlayer(player)}
                                                    onMouseEnter={e => e.currentTarget.style.background = C.redLt}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}
                                                    style={{ ...iconBtn('#fff1f2', C.red) }}
                                                >
                                                    <Trash2 style={{ width: '13px', height: '13px' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Pagination ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    Page {pagination.page} / {pagination.pages}
                    {pagination.total > 0 && ` · ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} players`}
                </p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        style={{ padding: '6px 13px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '7px', color: currentPage === 1 ? '#cbd5e1' : C.sky, fontWeight: '600', fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                        ← Prev
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => (
                        <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                            style={{ padding: '6px 10px', background: currentPage === i + 1 ? C.sky : '#fff', color: currentPage === i + 1 ? '#fff' : '#64748b', border: `1px solid ${currentPage === i + 1 ? C.sky : '#e2e8f0'}`, borderRadius: '7px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', minWidth: '32px' }}>
                            {i + 1}
                        </button>
                    ))}
                    {pagination.pages > 10 && <span style={{ color: '#cbd5e1', fontSize: '13px' }}>…</span>}
                    <button onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}
                        style={{ padding: '6px 13px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '7px', color: currentPage === pagination.pages ? '#cbd5e1' : C.sky, fontWeight: '600', fontSize: '12px', cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer' }}>
                        Next →
                    </button>
                </div>
            </div>

            {/* ── Edit Modal ── */}
            {editPlayer && (
                <EditPlayer
                    player={editPlayer}
                    onClose={() => setEditPlayer(null)}
                    onSaved={() => { setEditPlayer(null); loadPlayers(); }}
                />
            )}

            {/* ── Delete Modal ── */}
            {deletePlayer && (
                <DeleteModal
                    player={deletePlayer}
                    onClose={() => setDeletePlayer(null)}
                    onDeleted={() => { setDeletePlayer(null); loadPlayers(); }}
                />
            )}
        </div>
    );
}