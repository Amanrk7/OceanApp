import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { api } from '../api';
import AddNewPlayer from './AddNewPlayer';
import EditPlayer from './Editplayer';
import { AddPlayerContext } from "../Context/addPlayer";
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';
import { Search, Plus, RefreshCw, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Users, TrendingUp, AlertTriangle, UserX } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaSnapchatGhost, FaTelegramPlane } from "react-icons/fa";
import { SiGmail, SiX } from "react-icons/si";

const C = {
    sky: '#0ea5e9', skyDk: '#0284c7', skyLt: '#f0f9ff',
    red: '#dc2626', redLt: '#fff1f2', redBdr: '#fecdd3',
    green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
    amber: '#d97706', amberLt: '#fffbeb',
    violet: '#7c3aed', violetLt: '#f5f3ff',
    border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
    slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
};

const TIER = {
    BRONZE: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', dot: '#f97316', label: 'Bronze' },
    SILVER: { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe', dot: '#6366f1', label: 'Silver' },
    GOLD: { bg: '#fefce8', text: '#854d0e', border: '#fde68a', dot: '#eab308', label: 'Gold' },
};
const STATUS = {
    ACTIVE: { bg: '#f0fdf4', text: '#15803d', border: '#86efac', dot: '#22c55e', label: 'Active' },
    CRITICAL: { bg: '#fefce8', text: '#854d0e', border: '#fde68a', dot: '#eab308', label: 'Critical' },
    HIGHLY_CRITICAL: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', dot: '#f97316', label: 'High Crit.' },
    INACTIVE: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444', label: 'Inactive' },
    SUSPENDED: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444', label: 'Suspended' },
    BANNED: { bg: '#faf5ff', text: '#6b21a8', border: '#ddd6fe', dot: '#8b5cf6', label: 'Banned' },
};

const SOCIALS = [
    { key: 'email', icon: SiGmail, bg: '#4285f4', label: 'Email' },
    { key: 'facebook', icon: FaFacebookF, bg: '#1877f2', label: 'Facebook' },
    { key: 'telegram', icon: FaTelegramPlane, bg: '#26a5e4', label: 'Telegram' },
    { key: 'instagram', icon: FaInstagram, bg: '#e1306c', label: 'Instagram' },
    { key: 'x', icon: SiX, bg: '#000000', label: 'X' },
    { key: 'snapchat', icon: FaSnapchatGhost, bg: '#f7d300', label: 'Snapchat' },
];

const getTier = t => TIER[t] || TIER.BRONZE;
const getStatus = s => STATUS[s] || STATUS.ACTIVE;

function Avatar({ name, size = 36 }) {
    const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = [
        ['#6366f1', '#eef2ff'], ['#0ea5e9', '#f0f9ff'], ['#10b981', '#f0fdf4'],
        ['#f59e0b', '#fffbeb'], ['#8b5cf6', '#f5f3ff'], ['#ec4899', '#fdf2f8'],
    ];
    const [fg, bg] = colors[(name || '').charCodeAt(0) % colors.length];
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', background: bg,
            color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: size * 0.35, flexShrink: 0,
            border: `1.5px solid ${fg}30`,
        }}>{initials}</div>
    );
}

function SocialsBadges({ socials }) {
    return (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {SOCIALS.map(s => {
                const has = Boolean(socials?.[s.key]);
                const Icon = s.icon;
                return (
                    <span key={s.key} title={has ? `${s.label}: ${socials[s.key]}` : `${s.label}: not set`}
                        style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: has ? s.bg : 'transparent',
                            border: has ? 'none' : `1.5px dashed ${C.border}`,
                            color: has ? (s.bg === '#f7d300' ? '#000' : '#fff') : C.grayLt,
                            fontSize: '11px', cursor: 'default', flexShrink: 0,
                            opacity: has ? 1 : 0.5,
                        }}>
                        <Icon />
                    </span>
                );
            })}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bg, border, sub }) {
    return (
        <div style={{
            background: bg, border: `1px solid ${border}`, borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
        }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${border}`, flexShrink: 0,
            }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color, lineHeight: 1 }}>{value}</div>
                {sub && <div style={{ fontSize: '11px', color, opacity: 0.7, marginTop: '2px' }}>{sub}</div>}
            </div>
        </div>
    );
}

function DeleteModal({ player, onClose, onDeleted }) {
    const [pwd, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleDelete = async () => {
        if (!pwd.trim()) { setError('Password required.'); return; }
        try {
            setLoading(true);
            await api.players.deletePlayer(player.id, pwd);
            onDeleted(); onClose();
        } catch (err) { setError(err.message || 'Incorrect password.'); }
        finally { setLoading(false); }
    };
    return (
        <div onClick={e => e.target === e.currentTarget && onClose()}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: C.white, borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(15,23,42,.2)' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.redBdr}`, background: C.redLt }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#7f1d1d', marginBottom: '2px' }}>Delete player</div>
                    <div style={{ fontSize: '12px', color: C.red }}>This is permanent and cannot be undone.</div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ padding: '12px 14px', background: C.bg, borderRadius: '8px', marginBottom: '16px', border: `1px solid ${C.border}` }}>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{player.name}</div>
                        <div style={{ fontSize: '11px', color: C.gray, marginTop: '2px' }}>@{player.username} · {player.email}</div>
                    </div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Admin password</label>
                    <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleDelete()}
                        placeholder="Enter to confirm deletion"
                        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${error ? C.red : C.border}`, borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                    {error && <div style={{ fontSize: '12px', color: C.red, marginTop: '6px' }}>{error}</div>}
                </div>
                <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.bg, display: 'flex', gap: '10px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={handleDelete} disabled={loading}
                        style={{ flex: 2, padding: '10px', background: loading ? C.border : C.red, color: loading ? C.grayLt : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {loading ? 'Deleting…' : 'Confirm delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TH = { padding: '10px 16px', fontWeight: '700', fontSize: '11px', color: C.grayLt, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', background: C.bg };

export default function Players() {
    const location = useLocation();
    const navigate = useNavigate();
    const { addPlayer, setAddPlayer } = useContext(AddPlayerContext);
    const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editPlayer, setEditPlayer] = useState(null);
    const [deletePlayer, setDeletePlayer] = useState(null);
    const itemsPerPage = 10;

    const loadPlayers = useCallback(async () => {
        try {
            setLoading(true);
            const result = await api.players.getPlayers(currentPage, itemsPerPage, searchTerm, filterTab === 'all' ? '' : filterTab);
            setData(result);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [currentPage, searchTerm, filterTab]);

    useEffect(() => { loadPlayers(); }, [loadPlayers]);

    // 1. Refetch whenever the page is revisited (location changes)
    // useEffect(() => {
    //     loadPlayers();
    // }, [location.key]); // location.key is unique per navigation event

    // // 2. Refetch when filters/search/page change (but NOT on initial mount, 
    // //    since effect #1 already handles that)
    // useEffect(() => {
    //     loadPlayers();
    // }, [currentPage, searchTerm, filterTab]);

    if (addPlayer) navigate(`/addNewPlayer`);

    const players = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

    const handleView = (p) => { setSelectedPlayer(p); navigate(`/playerDashboard/${p.id}`); };
    const handleSearch = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };

    const TABS = [
        { id: 'all', label: 'All' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'CRITICAL', label: 'Critical' },
        { id: 'HIGHLY_CRITICAL', label: 'High Critical' },
        { id: 'INACTIVE', label: 'Inactive' },
    ];

    const statusCounts = TABS.slice(1).reduce((acc, t) => {
        acc[t.id] = players.filter(p => p.status === t.id).length;
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Top stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <StatCard icon={Users} label="Total players" value={pagination.total || 0} color="#0284c7" bg="#f0f9ff" border="#bae6fd" />
                <StatCard icon={TrendingUp} label="Active" value={statusCounts.ACTIVE ?? 0} color="#15803d" bg="#f0fdf4" border="#86efac" />
                <StatCard icon={AlertTriangle} label="Critical" value={(statusCounts.CRITICAL ?? 0) + (statusCounts.HIGHLY_CRITICAL ?? 0)} color="#b45309" bg="#fffbeb" border="#fde68a" />
                <StatCard icon={UserX} label="Inactive" value={statusCounts.INACTIVE ?? 0} color="#991b1b" bg="#fef2f2" border="#fecaca" />
            </div>

            {/* ── Controls bar ── */}
            <div style={{ background: C.white, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0' }}>
                    {TABS.map(tab => {
                        const active = filterTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setFilterTab(tab.id); setCurrentPage(1); }}
                                style={{
                                    padding: '14px 16px', background: 'none', border: 'none',
                                    fontWeight: active ? '700' : '600', fontSize: '13px',
                                    color: active ? C.sky : C.gray,
                                    borderBottom: `2px solid ${active ? C.sky : 'transparent'}`,
                                    marginBottom: '-1px', cursor: 'pointer', transition: 'all .15s',
                                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                                }}>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.grayLt, pointerEvents: 'none' }} />
                        <input type="text" placeholder="Search players…" value={searchTerm} onChange={handleSearch}
                            style={{ padding: '8px 12px 8px 32px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '200px', background: C.bg, color: C.slate }} />
                    </div>
                    <button onClick={loadPlayers}
                        style={{ padding: '8px 14px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: C.gray, fontWeight: '600', fontFamily: 'inherit' }}>
                        <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                    <button onClick={() => setAddPlayer(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: C.sky, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Plus style={{ width: '14px', height: '14px' }} /> Add player
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(15,23,42,.05)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={TH}>Player</th>
                                <th style={TH}>Contact</th>
                                <th style={TH}>Tier</th>
                                <th style={TH}>Balance</th>
                                <th style={TH}>Cashout limit</th>
                                <th style={TH}>Socials</th>
                                <th style={TH}>Status</th>
                                <th style={{ ...TH, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: C.grayLt }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                                            Loading players…
                                        </div>
                                    </td>
                                </tr>
                            ) : players.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: C.grayLt, fontSize: '14px' }}>
                                        No players found
                                    </td>
                                </tr>
                            ) : players.map((player, idx) => {
                                const tier = getTier(player.tier);
                                const status = getStatus(player.status);
                                const cashout = player.cashoutLimit ? `$${parseFloat(player.cashoutLimit).toFixed(0)}` : '$250';
                                const isEven = idx % 2 === 0;
                                return (
                                    <tr key={player.id}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                        onMouseLeave={e => e.currentTarget.style.background = isEven ? C.white : '#fcfcfc'}
                                        style={{ background: isEven ? C.white : '#fcfcfc', cursor: 'default', transition: 'background .12s' }}>

                                        {/* Player */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Avatar name={player.name} />
                                                <div>
                                                    <div onClick={() => handleView(player)}
                                                        style={{ fontWeight: '700', color: C.slate, cursor: 'pointer', fontSize: '13px', transition: 'color .12s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = C.sky}
                                                        onMouseLeave={e => e.currentTarget.style.color = C.slate}>
                                                        {player.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '1px' }}>@{player.username}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}`, color: C.gray, fontSize: '12px', maxWidth: '160px' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.email || '—'}</div>
                                            {player.phone && <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '2px' }}>{player.phone}</div>}
                                        </td>

                                        {/* Tier */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}` }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tier.dot, flexShrink: 0 }} />
                                                {tier.label}
                                            </span>
                                        </td>

                                        {/* Balance */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}`, fontWeight: '800', fontSize: '14px', color: '#10b981' }}>
                                            ${parseFloat(player.balance).toFixed(2)}
                                        </td>

                                        {/* Cashout limit */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}` }}>
                                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
                                                {cashout}
                                            </span>
                                        </td>

                                        {/* Socials */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}` }}>
                                            <SocialsBadges socials={player.socials} />
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}` }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
                                                {status.label}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${C.bg}`, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                {[
                                                    { Icon: Eye, color: C.sky, bg: C.skyLt, title: 'View', fn: () => handleView(player) },
                                                    { Icon: Pencil, color: C.amber, bg: '#fffbeb', title: 'Edit', fn: () => setEditPlayer(player) },
                                                    { Icon: Trash2, color: C.red, bg: C.redLt, title: 'Delete', fn: () => setDeletePlayer(player) },
                                                ].map(({ Icon, color, bg, title, fn }) => (
                                                    <button key={title} title={title} onClick={fn}
                                                        onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.color = color; }}
                                                        style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${color}30`, background: bg, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                                                        <Icon size={13} />
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination footer ── */}
                {pagination.total > 0 && (
                    <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: C.bg }}>
                        <span style={{ fontSize: '12px', color: C.grayLt }}>
                            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of <strong style={{ color: C.slate }}>{pagination.total}</strong> players
                        </span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.white, color: currentPage === 1 ? C.border : C.sky, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => (
                                <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                                    style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${currentPage === i + 1 ? C.sky : C.border}`, background: currentPage === i + 1 ? C.sky : C.white, color: currentPage === i + 1 ? '#fff' : C.gray, fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0, fontFamily: 'inherit' }}>
                                    {i + 1}
                                </button>
                            ))}
                            {pagination.pages > 8 && <span style={{ color: C.border, padding: '0 4px' }}>…</span>}
                            <button onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}
                                style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.white, color: currentPage === pagination.pages ? C.border : C.sky, cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {editPlayer && <EditPlayer player={editPlayer} onClose={() => setEditPlayer(null)} onSaved={() => { setEditPlayer(null); loadPlayers(); }} />}
            {deletePlayer && <DeleteModal player={deletePlayer} onClose={() => setDeletePlayer(null)} onDeleted={() => { setDeletePlayer(null); loadPlayers(); }} />}
            {/* <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style> */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}
