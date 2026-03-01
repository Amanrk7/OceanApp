import { useState, useEffect, useCallback, useContext } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import { AddPlayerProvider } from "./Context/addPlayer.jsx";
import { PlayerDashboardPlayerNameProvider } from "./Context/playerDashboardPlayerNamecontext.jsx";
import { ShiftStatusProvider } from "./Context/membershiftStatus.jsx";
import { CurrentUserProvider } from "./Context/currentUser.jsx";
import AnalyticsDashboard from "./Pages/dashboard";
import Players from "./Pages/Players";
import Attendance from "./Pages/Attendance";
import Games from "./Pages/Games";
import Issues from "./Pages/Issues";
import Transactions from "./Pages/Transactions";
import { ExpensesPage } from './Pages/Expenses.jsx';
import { ShiftsPage } from './Pages/Shifts.jsx';
import AddTransactionsPage from './Pages/AddTransaction.jsx';
import AddBonusPage from "./Pages/AddBonus.jsx";
import { BalancesPage } from './Pages/BalancesPage';
import { HugeiconsIcon } from '@hugeicons/react';
import { Home01Icon } from '@hugeicons/core-free-icons';
import { UserGroup03Icon } from '@hugeicons/core-free-icons';
import { TimeQuarter02Icon } from '@hugeicons/core-free-icons';
import { GameboyIcon } from '@hugeicons/core-free-icons';
import { Notebook02Icon } from '@hugeicons/core-free-icons';
import { SettingError04Icon } from '@hugeicons/core-free-icons';
import { Invoice02Icon } from '@hugeicons/core-free-icons';
import { BalanceScaleIcon } from '@hugeicons/core-free-icons';
import { Invoice03Icon } from '@hugeicons/core-free-icons';
import { AddMoneyCircleIcon } from '@hugeicons/core-free-icons';
import { GiftIcon } from '@hugeicons/core-free-icons';
import { AnalysisTextLinkIcon } from '@hugeicons/core-free-icons';
import { BitcoinWalletIcon } from '@hugeicons/core-free-icons';
import { ManagerIcon } from '@hugeicons/core-free-icons';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { TaskEdit01Icon } from '@hugeicons/core-free-icons';
import { CheckListIcon } from '@hugeicons/core-free-icons';
import PlayerDashboard from "./Pages/PlayerDashboard.jsx";
import { AddPlayerContext } from "./Context/addPlayer.jsx";
import { CurrentUserContext } from "./Context/currentUser.jsx";
import ManageWalletsPage from "./Pages/manageWallets.jsx";
import AdminTaskPage from "./Pages/Admintaskpage .jsx";
import TeamDashboard from "./Pages/Teamdashboard .jsx";
import AdminReportPage from "./Pages/Adminreportpage .jsx";

// ── Sidebar width constant — single source of truth ───────────────────────────
const SIDEBAR_W = 62;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  :root {
    --ink:#0f172a; --muted:#64748b; --bg:#f6f7fb; --card:#fff;
    --ring:#e2e8f0; --brand:#0ea5e9; --brand-dark:#0b6ea8;
    --success:#10b981; --danger:#ef4444; --amber:#f59e0b;
    --sidebar-w: ${SIDEBAR_W}px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    color: var(--ink); background: var(--bg); min-height: 100vh;
  }

  /* ── LOGIN ─────────────────────────────────────────────────────────── */
  .ob-login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#e0f2fe 0%,#f6f7fb 50%,#ecfdf5 100%); padding:16px; }
  .ob-login-card { background:#fff; border:1px solid var(--ring); border-radius:18px; box-shadow:0 12px 40px rgba(15,23,42,.08); padding:40px 36px; width:100%; max-width:400px; }
  .ob-login-logo { display:flex; align-items:center; gap:12px; margin-bottom:32px; justify-content:center; }
  .ob-avatar-lg { width:44px; height:44px; border-radius:50%; background:var(--ink); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; }
  .ob-login-logo .ob-title { font-weight:700; font-size:22px; }
  .ob-login-logo .ob-sub { font-size:13px; color:var(--muted); }
  .ob-label { font-size:13px; font-weight:600; color:var(--muted); margin-bottom:6px; display:block; text-transform:uppercase; letter-spacing:.5px; }
  .ob-input { width:100%; padding:11px 14px; border:1px solid var(--ring); border-radius:10px; background:#fff; font-size:15px; font-family:inherit; transition:all .2s; margin-bottom:18px; }
  .ob-input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(14,165,233,.18); }

  /* ── BUTTONS ───────────────────────────────────────────────────────── */
  .ob-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:11px 18px; border-radius:10px; border:1px solid var(--ring); background:#fff; cursor:pointer; font-weight:600; font-size:14px; font-family:inherit; transition:all .2s; color:var(--ink); }
  .ob-btn:hover:not(:disabled) { background:#f8fafc; transform:translateY(-1px); box-shadow:0 2px 8px rgba(15,23,42,.08); }
  .ob-btn-primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .ob-btn-primary:hover:not(:disabled) { background:var(--brand-dark); }
  .ob-btn-danger { color: var(--color-text); }
  .ob-btn-danger:hover:not(:disabled) { background:#dc2626; }
  .ob-btn-full { width:100%; }
  .ob-btn-sm { padding:7px 12px; font-size:13px; }
  .ob-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
  .ob-error { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; border-radius:10px; padding:10px 14px; font-size:14px; margin-bottom:14px; }
  .ob-success { background:#dcfce7; color:#166534; border:1px solid #86efac; border-radius:10px; padding:10px 14px; font-size:14px; margin-bottom:14px; }

  /* ── SIDEBAR (desktop: fixed icon strip) ───────────────────────────── */
  .ob-sidebar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: var(--sidebar-w);
    min-width: var(--sidebar-w);
    max-width: var(--sidebar-w);
    background: var(--color-sidebar, #0f172a);
    border-right: 1px solid #1e293b;
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 100;
    // overflow: hidden;        /* never let it grow */
    transition: none;
  }

  /* ── SIDEBAR — mobile drawer (slides in over content) ──────────────── */
  .ob-sidebar-drawer {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 220px;
    background: var(--color-sidebar, #0f172a);
    border-right: 1px solid #1e293b;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.4,0,.2,1);
    overflow-y: auto;
    overflow-x: hidden;
  }
  .ob-sidebar-drawer.open { transform: translateX(0); }

  /* Drawer overlay */
  .ob-drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 199;
    backdrop-filter: blur(2px);
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Hamburger button (mobile only) */
  .ob-hamburger {
    display: none;
    position: fixed;
    top: 12px; left: 12px;
    z-index: 300;
    width: 38px; height: 38px;
    background: var(--color-sidebar, #0f172a);
    border: 1px solid #334155;
    border-radius: 9px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    transition: all .15s;
  }
  .ob-hamburger:hover { background: #1e293b; color: #fff; }

  @media (max-width: 768px) {
    .ob-sidebar { display: none !important; }
    .ob-hamburger { display: flex !important; }
    .ob-main { margin-left: 0 !important; padding-top: 60px !important; }
  }

  /* Sidebar logo */
  .ob-sidebar-logo {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 6px 0 18px;
    flex-shrink: 0;
  }
  .ob-avatar-sm {
    width: 34px; height: 34px; border-radius: 9px;
    background: linear-gradient(135deg,#0ea5e9,#6366f1);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; flex-shrink: 0; letter-spacing: -.5px;
  }

  /* Drawer logo */
  .ob-drawer-logo {
    display: flex; align-items: center; gap: 10px;
    padding: 0 16px 18px; flex-shrink: 0;
  }
  .ob-drawer-logo .ob-drawer-title {
    font-weight: 800; font-size: 15px; color: #f8fafc; letter-spacing: -.3px;
  }

  /* Nav container */
  .ob-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; width: 100%; padding: 0 8px; }

  /* Nav item wrapper (for tooltip positioning) */
  .ob-nav-item { position: relative; width: 100%; }

  /* Shared navlink base */
  .ob-navlink {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 10px;
    border-radius: 8px; font-weight: 500; font-size: 14px;
    color: #64748b; cursor: pointer; transition: all .15s;
    border: none; background: none; font-family: inherit;
    white-space: nowrap; flex-shrink: 0;
    line-height: 1;
  }
  .ob-navlink:hover { background: rgba(14,165,233,.1); color: #0ea5e9; }
  .ob-navlink.active { background: var(--color-hover-tab, rgba(14,165,233,.15)); color: #fff; font-weight: 600; }
  .ob-navlink:disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
  .ob-navlink svg { width: 20px; height: 20px; flex-shrink: 0; }

  /* Drawer navlink (wider, with label) */
  .ob-navlink-drawer {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 10px 14px;
    border-radius: 8px; font-weight: 500; font-size: 13px;
    color: #94a3b8; cursor: pointer; transition: all .15s;
    border: none; background: none; font-family: inherit;
    text-align: left; white-space: nowrap;
  }
  .ob-navlink-drawer:hover { background: rgba(14,165,233,.1); color: #0ea5e9; }
  .ob-navlink-drawer.active { background: var(--color-hover-tab, rgba(14,165,233,.15)); color: #fff; font-weight: 600; }
  .ob-navlink-drawer:disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
  .ob-navlink-drawer svg { width: 18px; height: 18px; flex-shrink: 0; }

  /* Custom sidebar tooltip */
  .ob-nav-tooltip {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    background: #1e293b;
    color: #f1f5f9;
    padding: 5px 10px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    opacity: 0;
    transition: opacity .12s ease;
    letter-spacing: .1px;
  }
  .ob-nav-tooltip::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: #1e293b;
  }
  .ob-nav-item:hover .ob-nav-tooltip { opacity: 1; }

  /* Sidebar footer */
  .ob-sidebar-footer {
    margin-top: auto; padding: 12px 8px 4px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    width: 100%; flex-shrink: 0;
  }
  .ob-drawer-footer {
    margin-top: auto; padding: 12px 16px 4px;
    display: flex; flex-direction: column; gap: 8px;
    flex-shrink: 0;
  }
  .ob-user-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: #334155; display: flex; align-items: center; justify-content: center;
    color: #94a3b8; font-weight: 700; font-size: 13px; flex-shrink: 0;
  }

  /* Divider in nav */
  .ob-nav-divider { height: 1px; background: #1e293b; margin: 6px 0; width: 100%; }

  /* ── MAIN CONTENT ──────────────────────────────────────────────────── */
  .ob-main {
    margin-left: var(--sidebar-w);
    min-height: 100vh;
    background: black;
    filter: drop-shadow(0 4px 12px rgba(15,23,42,.05)) grayscale(1);
    width: calc(100% - var(--sidebar-w));
  }
  .ob-container { max-width: 1400px; margin: 0 auto; padding: 20px 20px; }
  .ob-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
  .ob-header h1 { font-size:14px; font-weight:700; color: var(--color-text); }

  .ob-card { background-color:var(--color-cards); border:1px solid var(--ring); border-radius:14px; padding:20px; box-shadow:0 4px 12px rgba(15,23,42,.05); }
  .ob-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:9999px; font-size:12px; font-weight:600; white-space:nowrap; }
  .ob-table-wrap { overflow-x:auto; border-radius:12px; border:1px solid var(--ring); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  thead { background:#f8fafc; position:sticky; top:0; }
  th { text-align:left; padding:11px 14px; font-weight:600; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.4px; border-bottom:1px solid var(--ring); white-space:nowrap; }
  td { padding:12px 14px; border-bottom:1px solid var(--ring); }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#fafbff; }
  .ob-loading { text-align:center; padding:40px; }
  .ob-spinner { display:inline-block; width:40px; height:40px; border:4px solid var(--ring); border-top-color:var(--brand); border-radius:50%; animation:spin 1s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  button:focus { outline: 2px solid rgba(255,255,255,0.2); outline-offset: 2px; }
`;

// ── Nav items definition ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home01Icon, adminsOnly: false },
  { id: "memberDashboard", label: "Member Dashboard", icon: CheckListIcon, adminsOnly: false },
  { id: "players", label: "Players", icon: UserGroup03Icon },
  { id: "playTime", label: "Play Time", icon: TimeQuarter02Icon },
  { id: "games", label: "Games", icon: GameboyIcon },
  { id: "attendance", label: "Attendance", icon: Notebook02Icon },
  { id: "issues", label: "Issues", icon: SettingError04Icon },
  { id: "transactions", label: "All Transactions", icon: Invoice02Icon },
  { id: "balances", label: "Live Balances", icon: BalanceScaleIcon, dividerAfter: true },
  { id: "expenses", label: "Expenses", icon: Invoice03Icon, adminsOnly: true },
  { id: "addTasks", label: "Add Tasks", icon: TaskEdit01Icon, adminsOnly: true },
  { id: "addTransactions", label: "Add Transaction", icon: AddMoneyCircleIcon, adminsOnly: false },
  { id: "addBonus", label: "Add Bonus", icon: GiftIcon, adminsOnly: false },
  // { id: "reports", label: "Reports", icon: AnalysisTextLinkIcon, adminsOnly: true },
  { id: "manageWallets", label: "Manage Wallets", icon: BitcoinWalletIcon, adminsOnly: true },
  { id: "shifts", label: "Shifts", icon: ManagerIcon, adminsOnly: false, dividerAfter: true },
  { id: "adminReports", label: "Admin Reports", icon: AnalysisTextLinkIcon, adminsOnly: true },

];

const ALLOWED_ADMINS = ["admin", "SUPER_ADMIN"];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED SIDEBAR COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function Sidebar({ user, activePage, onNavigate, onLogout }) {
  const isAdmin = ALLOWED_ADMINS.includes(user?.username);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (id) => {
    onNavigate(id);
    setDrawerOpen(false);
  };

  // ── Desktop icon sidebar ──────────────────────────────────────────────────
  const DesktopSidebar = (
    <aside className="ob-sidebar">
      {/* Logo */}
      <div className="ob-sidebar-logo">
        <div className="ob-avatar-sm">OB</div>
      </div>

      {/* Nav items */}
      <nav className="ob-nav">
        {NAV_ITEMS.map(item => {
          const disabled = item.adminsOnly && !isAdmin;
          return (
            <div key={item.id}>
              <div className="ob-nav-item">
                <button
                  className={`ob-navlink${activePage === item.id ? ' active' : ''}`}
                  onClick={() => !disabled && handleNav(item.id)}
                  disabled={disabled}
                  aria-label={item.label}
                >
                  <HugeiconsIcon icon={item.icon} size={20} />
                </button>
                {/* Custom tooltip — only visible on desktop via CSS */}
                <span className="ob-nav-tooltip">{item.label}</span>
              </div>
              {item.dividerAfter && <div className="ob-nav-divider" />}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="ob-sidebar-footer">
        <div className="ob-nav-item">
          <button
            className="ob-navlink"
            onClick={onLogout}
            aria-label="Logout"
            style={{ color: '#ef4444' }}
          >
            <HugeiconsIcon icon={Logout01Icon} size={20} />
          </button>
          <span className="ob-nav-tooltip">Logout</span>
        </div>
        <div className="ob-user-avatar">
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
      </div>
    </aside>
  );

  // ── Mobile hamburger + drawer ─────────────────────────────────────────────
  const MobileNav = (
    <>
      {/* Hamburger button */}
      <button className="ob-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      {drawerOpen && (
        <div className="ob-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Drawer */}
      <div className={`ob-sidebar-drawer${drawerOpen ? ' open' : ''}`}>
        {/* Drawer logo */}
        <div className="ob-drawer-logo">
          <div className="ob-avatar-sm">OB</div>
          <span className="ob-drawer-title">OceanBets</span>
        </div>

        {/* Drawer nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, padding: '0 10px' }}>
          {NAV_ITEMS.map(item => {
            const disabled = item.adminsOnly && !isAdmin;
            return (
              <div key={item.id}>
                <button
                  className={`ob-navlink-drawer${activePage === item.id ? ' active' : ''}`}
                  onClick={() => !disabled && handleNav(item.id)}
                  disabled={disabled}
                >
                  <HugeiconsIcon icon={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
                {item.dividerAfter && <div className="ob-nav-divider" style={{ margin: '6px 4px' }} />}
              </div>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="ob-drawer-footer">
          <div style={{ height: '1px', background: '#1e293b', marginBottom: '4px' }} />
          <button
            className="ob-navlink-drawer"
            onClick={() => { setDrawerOpen(false); onLogout(); }}
            style={{ color: '#ef4444' }}
          >
            <HugeiconsIcon icon={Logout01Icon} size={18} />
            <span>Logout</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px' }}>
            <div className="ob-user-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#f1f5f9' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>@{user?.username}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileNav}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD (main SPA shell)
// ══════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user }) {
  const { addPlayer, setAddPlayer } = useContext(AddPlayerContext);
  const { usr, setUsr } = useContext(CurrentUserContext);
  setUsr(user);

  const [page, setPage] = useState("dashboard");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await api.auth.logout();
      window.location.reload();
    } catch { setErrorMsg("Logout failed"); }
    finally { setLoading(false); }
  };

  const handleNavigate = (pageId) => {
    if (pageId !== 'players') setAddPlayer(false);
    setPage(pageId);
  };

  const navLabels = {
    dashboard: 'Dashboard', memberDashboard: 'Member Dashboard', players: 'Players', playTime: 'Play Time', games: 'Games', attendance: 'Attendance', issues: 'Issues', transactions: 'All Transactions',
    balances: 'Live Balances', expenses: 'Expenses', addTransactions: 'Add Transaction',
    addBonus: 'Add Bonus', reports: 'Reports', manageWallets: 'Manage Wallets', shifts: 'Shifts', addTasks: 'Add Tasks', adminReports: 'Admin Reports'
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AnalyticsDashboard />;
      case "memberDashboard": return <TeamDashboard />;
      case "players": return <Players />;
      case "attendance": return <Attendance />;
      case "games": return <Games />;
      case "issues": return <Issues />;
      case "transactions": return <Transactions />;
      case "expenses": return <ExpensesPage />;
      case "balances": return <BalancesPage />;
      case "manageWallets": return <ManageWalletsPage />;
      case "shifts": return <ShiftsPage />;
      case "addTransactions": return <AddTransactionsPage />;
      case "addBonus": return <AddBonusPage />;
      case "addTasks": return <AdminTaskPage />;
      case "adminReports": return <AdminReportPage />;

      default: return (
        <div className="ob-card">
          <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Coming Soon</p>
        </div>
      );
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "black", width: "100vw" }}>
      <Sidebar user={user} activePage={page} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="ob-main">
        <div className="ob-container">
          <div className="ob-header" style={{ alignItems: "center", justifyContent: "flex-start", gap: "4px" }}>
            <h1>{navLabels[page] || 'Dashboard'}</h1>
            {addPlayer && (
              <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)" }}>
                &gt; Add New Player
              </span>
            )}
          </div>
          {errorMsg && <div className="ob-error">{errorMsg}</div>}
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAYER DASHBOARD WRAPPER — adds sidebar around the PlayerDashboard page
// ══════════════════════════════════════════════════════════════════════════════
function PlayerDashboardWithSidebar({ user }) {
  const { setUsr } = useContext(CurrentUserContext);
  setUsr(user);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await api.auth.logout();
      window.location.reload();
    } catch { }
    finally { setLoading(false); }
  };

  const handleNavigate = (pageId) => {
    navigate(`/?page=${pageId}`);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "black", width: "100vw" }}>
      <Sidebar user={user} activePage="players" onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="ob-main">
        <div className="ob-container">
          <PlayerDashboard />
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await api.auth.login(username, password);
      window.user = result.user;
      window.location.reload();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ob-login-wrap">
      <div className="ob-login-card">
        <div className="ob-login-logo">
          <div className="ob-avatar-lg">OB</div>
          <div><div className="ob-title">OceanBets</div><div className="ob-sub">Management Portal</div></div>
        </div>
        {error && <div className="ob-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label className="ob-label">Username</label>
          <input type="text" className="ob-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" disabled={loading} />
          <label className="ob-label">Password</label>
          <input type="password" className="ob-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" disabled={loading} />
          <button type="submit" className="ob-btn ob-btn-primary ob-btn-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "16px", textAlign: "center" }}>Demo: admin / admin123</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try { setUser(await api.auth.getUser()); }
      catch { setUser(null); }
      finally { setLoading(false); }
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <style>{CSS}</style>
        <div className="ob-loading"><div className="ob-spinner" /></div>
      </div>
    );
  }

  return (
    <CurrentUserProvider>
      <ShiftStatusProvider>
        <AddPlayerProvider>
          <PlayerDashboardPlayerNameProvider>
            <style>{CSS}</style>
            <Router>
              <Routes>
                <Route path="/"
                  element={user ? <AdminDashboard user={user} /> : <LoginPage />}
                />
                <Route path="/PlayerDashboard/:playerId"
                  element={user ? <PlayerDashboardWithSidebar user={user} /> : <LoginPage />}
                />
              </Routes>
            </Router>
          </PlayerDashboardPlayerNameProvider>
        </AddPlayerProvider>
      </ShiftStatusProvider>
    </CurrentUserProvider>
  );
}
