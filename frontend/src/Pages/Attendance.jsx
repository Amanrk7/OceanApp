import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../api';
import { PlayerDashboardPlayerNamecontext } from '../Context/playerDashboardPlayerNamecontext';
import { Activity, AlertTriangle, Flame, UserX, ChevronLeft, ChevronRight, ArrowRight, Eye, RefreshCw } from 'lucide-react';

const C = {
  sky: '#0ea5e9', skyLt: '#f0f9ff',
  green: '#16a34a', greenLt: '#f0fdf4', greenBdr: '#86efac',
  red: '#dc2626', redLt: '#fef2f2', redBdr: '#fecaca',
  amber: '#d97706', amberLt: '#fffbeb', amberBdr: '#fde68a',
  orange: '#ea580c', orangeLt: '#fff7ed', orangeBdr: '#fed7aa',
  border: '#e2e8f0', bg: '#f8fafc', white: '#fff',
  slate: '#0f172a', gray: '#64748b', grayLt: '#94a3b8',
};

// const STATUS_CFG = {
//     Active:          { color: C.green,  bg: C.greenLt,  border: C.greenBdr,  dot: '#22c55e', icon: Activity,      label: 'Active',          desc: 'Deposited today' },
//     Critical:        { color: C.amber,  bg: C.amberLt,  border: C.amberBdr,  dot: '#f59e0b', icon: AlertTriangle, label: 'Critical',        desc: '1–2 days ago' },
//     'Highly-Critical':{ color: C.orange, bg: C.orangeLt, border: C.orangeBdr, dot: '#f97316', icon: Flame,         label: 'High critical',   desc: '3–7 days ago' },
//     Inactive:        { color: C.red,    bg: C.redLt,    border: C.redBdr,    dot: '#ef4444', icon: UserX,         label: 'Inactive',        desc: '7+ days or never' },
// };
const STATUS_CFG = {
  Active: { color: C.green, bg: C.greenLt, border: C.greenBdr, dot: '#22c55e', icon: Activity, label: 'Active', desc: 'Deposited today' },
  Critical: { color: C.amber, bg: C.amberLt, border: C.amberBdr, dot: '#f59e0b', icon: AlertTriangle, label: 'Critical', desc: '1–2 days ago' },
  'Highly-Critical': { color: C.orange, bg: C.orangeLt, border: C.orangeBdr, dot: '#f97316', icon: Flame, label: 'High critical', desc: '3–7 days ago' },
  Inactive: { color: C.red, bg: C.redLt, border: C.redBdr, dot: '#ef4444', icon: UserX, label: 'Inactive', desc: '7+ days or never' },
  // ↓ ADD
  Unreachable: { color: '#86198f', bg: '#fdf4ff', border: '#e879f9', dot: '#a21caf', icon: UserX, label: 'Unreachable', desc: 'Cannot be contacted' },
};

// Also add to ALL_STATUSES:
const ALL_STATUSES = ['Active', 'Critical', 'Highly-Critical', 'Inactive', 'Unreachable'];

// const ALL_STATUSES = ['Active', 'Critical', 'Highly-Critical', 'Inactive'];

function Avatar({ name, status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Inactive;
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: cfg.bg, border: `2px solid ${cfg.border}`,
        color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '700', fontSize: '13px',
      }}>{initials}</div>
      <span style={{
        position: 'absolute', bottom: '0', right: '0',
        width: '10px', height: '10px', borderRadius: '50%',
        background: cfg.dot, border: '2px solid #fff',
      }} />
    </div>
  );
}

function StatCard({ status, value, active, onClick }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <button onClick={onClick}
      style={{
        padding: '18px 20px', borderRadius: '14px', cursor: 'pointer',
        border: `2px solid ${active ? cfg.color : C.border}`,
        background: active ? cfg.bg : C.white,
        transition: 'all .18s', textAlign: 'left', fontFamily: 'inherit',
        transform: active ? 'translateY(-1px)' : 'none',
        boxShadow: active ? `0 4px 16px ${cfg.color}20` : 'none',
        flex: '1 1 160px',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: active ? C.white : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${cfg.border}` }}>
          <Icon size={16} color={cfg.color} />
        </div>
        {active && <span style={{ fontSize: '10px', fontWeight: '700', color: cfg.color, background: C.white, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${cfg.border}` }}>SELECTED</span>}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color: cfg.color, lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: cfg.color }}>{cfg.label}</div>
      <div style={{ fontSize: '11px', color: cfg.color, opacity: 0.7, marginTop: '2px' }}>{cfg.desc}</div>
    </button>
  );
}

export default function Attendance() {
  const navigate = useNavigate();
  const { setSelectedPlayer } = useContext(PlayerDashboardPlayerNamecontext);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, critical: 0, highlyCritical: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await api.attendance.getAttendance(filterStatus, currentPage, itemsPerPage);
        setData(result);
        if (result.stats) setStats(result.stats);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [filterStatus, currentPage]);

  const handleView = (player) => { setSelectedPlayer(player); navigate(`/playerDashboard/${player.id}`); };
  const handleFilter = (s) => { setFilterStatus(s); setCurrentPage(1); };

  const allData = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };
  const activeCfg = STATUS_CFG[filterStatus] || STATUS_CFG.Inactive;

  // const STAT_MAP = {
  //     Active:           stats.active,
  //     Critical:         stats.critical,
  //     'Highly-Critical': stats.highlyCritical,
  //     Inactive:         stats.inactive,
  // };

  const STAT_MAP = {
    Active: stats.active,
    Critical: stats.critical,
    'Highly-Critical': stats.highlyCritical,
    Inactive: stats.inactive,
    Unreachable: stats.unreachable ?? 0,   // ← ADD (server needs to return this)
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(s => (
          <StatCard key={s} status={s} value={STAT_MAP[s] ?? 0} active={filterStatus === s} onClick={() => handleFilter(s)} />
        ))}
      </div>

      {/* ── Table card ── */}
      <div style={{ background: C.white, borderRadius: '14px', border: `2px solid ${activeCfg.border}`, boxShadow: `0 2px 16px ${activeCfg.color}10`, overflow: 'hidden' }}>

        {/* Table header strip */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${activeCfg.border}`, background: activeCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeCfg.dot, flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: '800', color: activeCfg.color }}>{activeCfg.label} players</span>
            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: C.white, color: activeCfg.color, border: `1px solid ${activeCfg.border}` }}>
              {pagination.total}
            </span>
            <span style={{ fontSize: '12px', color: activeCfg.color, opacity: 0.7 }}>· {activeCfg.desc}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {ALL_STATUSES.map(s => {
              const cfg = STATUS_CFG[s];
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => handleFilter(s)}
                  style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${active ? cfg.color : C.border}`, background: active ? cfg.color : C.white, color: active ? C.white : C.gray, transition: 'all .15s', fontFamily: 'inherit' }}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Player', 'Email', 'ID', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: C.grayLt, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: C.grayLt }}>
                    {/* <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', border: `2px solid ${C.border}`, borderTopColor: activeCfg.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div> */}
                    <div style={{ padding: "40px 0", display: 'inline-flex', alignItems: 'center', gap: '8px', color: "var(--color-text-tertiary)", fontSize: 13 }}>
                      <RefreshCw style={{ width: 14, height: 14, margin: "0 auto 8px", display: "block", animation: "smartSpin .8s linear infinite" }} />
                      Loading players…
                    </div>
                  </td>
                </tr>
              ) : allData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: activeCfg.bg, border: `2px solid ${activeCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      {React.createElement(activeCfg.icon, { size: 20, color: activeCfg.color })}
                    </div>
                    <div style={{ fontWeight: '700', color: activeCfg.color, marginBottom: '4px' }}>No {activeCfg.label.toLowerCase()} players</div>
                    <div style={{ fontSize: '12px', color: C.grayLt }}>{activeCfg.desc}</div>
                  </td>
                </tr>
              ) : allData.map((player, idx) => {
                const cfg = STATUS_CFG[player.attendanceStatus] || STATUS_CFG.Inactive;
                const isEven = idx % 2 === 0;
                return (
                  <tr key={player.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                    onMouseLeave={e => e.currentTarget.style.background = isEven ? C.white : '#fafafa'}
                    style={{ background: isEven ? C.white : '#fafafa', transition: 'background .12s' }}>

                    {/* Player */}
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${C.bg}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar name={player.name || player.username} status={player.attendanceStatus} />
                        <div>
                          <div onClick={() => handleView(player)}
                            style={{ fontWeight: '700', color: C.slate, cursor: 'pointer', fontSize: '13px' }}
                            onMouseEnter={e => e.currentTarget.style.color = C.sky}
                            onMouseLeave={e => e.currentTarget.style.color = C.slate}>
                            {player.name || player.username}
                          </div>
                          {player.username && player.name && (
                            <div style={{ fontSize: '11px', color: C.grayLt, marginTop: '1px' }}>@{player.username}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${C.bg}`, color: C.gray, fontSize: '12px' }}>
                      {player.email || <span style={{ color: C.border }}>—</span>}
                    </td>

                    {/* ID */}
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${C.bg}`, color: C.grayLt, fontFamily: 'monospace', fontSize: '12px' }}>
                      #{player.id}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${C.bg}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0, animation: player.attendanceStatus === 'Active' ? 'pulse 2s infinite' : 'none' }} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${C.bg}` }}>
                      <button onClick={() => handleView(player)}
                        onMouseEnter={e => { e.currentTarget.style.background = C.sky; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.sky; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.skyLt; e.currentTarget.style.color = C.sky; e.currentTarget.style.borderColor = '#bae6fd'; }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', background: C.skyLt, color: C.sky, border: '1px solid #bae6fd', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}>
                        <Eye size={13} />
                        View
                        <ArrowRight size={12} />
                      </button>
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
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, pagination.total)} of <strong style={{ color: C.slate }}>{pagination.total}</strong>
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.white, color: currentPage === 1 ? C.border : activeCfg.color, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => (
                <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                  style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${currentPage === i + 1 ? activeCfg.color : C.border}`, background: currentPage === i + 1 ? activeCfg.color : C.white, color: currentPage === i + 1 ? '#fff' : C.gray, fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', fontFamily: 'inherit' }}>
                  {i + 1}
                </button>
              ))}
              {pagination.pages > 8 && <span style={{ color: C.border, padding: '0 4px' }}>…</span>}
              <button onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: `1px solid ${C.border}`, background: C.white, color: currentPage === pagination.pages ? C.border : activeCfg.color, cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
                @keyframes smartSpin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
    </div>
  );
}
