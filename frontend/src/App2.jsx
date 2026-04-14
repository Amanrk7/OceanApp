import { useState, useEffect, useCallback, useContext } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, useParams } from "react-router-dom";
import { api } from "./api";
import { AddPlayerProvider } from "./Context/addPlayer.jsx";
import { PlayerDashboardPlayerNameProvider } from "./Context/playerDashboardPlayerNamecontext.jsx";
import { ShiftStatusProvider } from "./Context/membershiftStatus.jsx";
import { CurrentUserProvider } from "./Context/currentUser.jsx";
import { ThemeProvider, useTheme } from "./Context/Themecontext.jsx";
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";
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
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { FolderOpenIcon } from '@hugeicons/core-free-icons';
import { DollarCircleIcon } from '@hugeicons/core-free-icons';
import { ArrowDataTransferDiagonalIcon } from '@hugeicons/core-free-icons';
import PlayerDashboard from "./Pages/PlayerDashboard.jsx";
import { AddPlayerContext } from "./Context/addPlayer.jsx";
import { CurrentUserContext } from "./Context/currentUser.jsx";
import ManageWalletsPage from "./Pages/manageWallets.jsx";
import AdminTaskPage from "./Pages/Admintaskpage.jsx";
import TeamDashboard from "./Pages/Teamdashboard.jsx";
import AdminReportPage from "./Pages/Adminreportpage.jsx";
import MissingPlayersPage from "./Pages/Missingplayerspage.jsx";
import Playtimepage from "./Pages/Playtimepage.jsx";
import PendingTransactionsBanner from "./Components/Pendingtransactionsbanner.jsx";
import ProfitTakeoutsPage from "./Pages/ProfitTakeoutsPage.jsx";

const SIDEBAR_W = 62;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  :root, [data-theme="light"] {
    --ink: #0f172a;
    --muted: #64748b;
    --bg: #f6f7fb;
    --card: #ffffff;
    --ring: #e2e8f0;
    --brand: #0ea5e9;
    --brand-dark: #0b6ea8;
    --success: #10b981;
    --danger: #ef4444;
    --amber: #f59e0b;
    --sidebar-w: ${SIDEBAR_W}px;

    --color-bg: #f6f7fb;
    --color-cards: #ffffff;
    --color-text: #0f172a;
    --color-text-muted: #64748b;
    --color-border: #e2e8f0;
    --color-sidebar: #0f172a;
    --color-sidebar-text: #94a3b8;
    --color-sidebar-active-text: #ffffff;
    --color-hover-tab: rgba(14,165,233,.15);
    --color-input-bg: #ffffff;
    --color-table-head: #f8fafc;
    --color-table-row-hover: #fafbff;
    --color-shadow: rgba(15,23,42,.07);

    /* ── MemberDashboard tokens ── */
--color-background-primary: #ffffff;
--color-background-secondary: #f8fafc;
--color-background-success: #f0fdf4;
--color-background-warning: #fffbeb;
--color-background-info: #eff6ff;

--color-border-secondary: #e2e8f0;
--color-border-tertiary: #f1f5f9;
--color-border-success: #bbf7d0;
--color-border-warning: #fde68a;
--color-border-info: #bfdbfe;

--color-text-primary: #0f172a;
--color-text-secondary: #64748b;
--color-text-tertiary: #94a3b8;
--color-text-info: #1d4ed8;
--color-text-warning: #92400e;

--border-radius-md: 8px;
--border-radius-lg: 12px;
  }

  [data-theme="dark"] {
    --ink: #f1f5f9;
    --muted: #94a3b8;
    --bg: #0b0f1a;
    --card: #131929;
    --ring: #1e293b;
    --brand: #38bdf8;
    --brand-dark: #0ea5e9;
    --success: #34d399;
    --danger: #f87171;
    --amber: #fbbf24;

    --color-bg: #0b0f1a;
    --color-cards: #131929;
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
    --color-border: #1e293b;
    --color-sidebar: #090d16;
    --color-sidebar-text: #64748b;
    --color-sidebar-active-text: #f1f5f9;
    --color-input-bg: #1e293b;
    --color-table-head: #111827;
    --color-table-row-hover: #1a2236;
    --color-shadow: rgba(0,0,0,.35);

    /* ── MemberDashboard tokens ── */
--color-background-primary: #131929;
--color-background-secondary: #1a2236;
--color-background-success: #052e16;
--color-background-warning: #1c1200;
--color-background-info: #0c1a3a;

--color-border-secondary: #1e293b;
--color-border-tertiary: #1e293b;
--color-border-success: #166534;
--color-border-warning: #78350f;
--color-border-info: #1e3a5f;

--color-text-primary: #f1f5f9;
--color-text-secondary: #94a3b8;
--color-text-tertiary: #64748b;
--color-text-info: #38bdf8;
--color-text-warning: #fbbf24;

--border-radius-md: 8px;
--border-radius-lg: 12px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    color: var(--color-text);
    background: var(--color-bg);
    min-height: 100vh;
    transition: background .25s ease, color .25s ease;
  }

  .ob-login-wrap {
    min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
    padding: 16px;
    transition: background .25s;
  }
  .ob-login-card {
    background: var(--color-cards);
    border: 1px solid var(--color-border);
    border-radius: 18px;
    box-shadow: 0 12px 40px var(--color-shadow);
    padding: 40px 36px;
    width: 100%; max-width: 400px;
    transition: background .25s, border-color .25s;
  }
  .ob-login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; justify-content: center; }
  .ob-avatar-lg { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg,#0ea5e9,#6366f1); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
  .ob-login-logo .ob-title { font-weight: 700; font-size: 22px; color: var(--color-text); }
  .ob-login-logo .ob-sub { font-size: 13px; color: var(--color-text-muted); }
  .ob-label { font-size: 13px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
  .ob-input {
    width: 100%; padding: 11px 14px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-input-bg);
    color: var(--color-text);
    font-size: 15px; font-family: inherit;
    transition: all .2s; margin-bottom: 18px;
  }
  .ob-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(14,165,233,.18); }
  .ob-input::placeholder { color: var(--color-text-muted); }

  .ob-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 11px 18px; border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-cards);
    cursor: pointer; font-weight: 600; font-size: 14px;
    font-family: inherit; transition: all .2s; color: var(--color-text);
  }
  .ob-btn:hover:not(:disabled) { background: var(--color-bg); transform: translateY(-1px); box-shadow: 0 2px 8px var(--color-shadow); }
  .ob-btn-primary { background: var(--brand); border-color: var(--brand); color: #fff; }
  .ob-btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
  .ob-btn-danger:hover:not(:disabled) { background: #dc2626; color: #fff; }
  .ob-btn-full { width: 100%; }
  .ob-btn-sm { padding: 7px 12px; font-size: 13px; }
  .ob-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
  .ob-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 10px; padding: 10px 14px; font-size: 14px; margin-bottom: 14px; }
  .ob-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 10px; padding: 10px 14px; font-size: 14px; margin-bottom: 14px; }

  .ob-sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: var(--sidebar-w); min-width: var(--sidebar-w); max-width: var(--sidebar-w);
    background: var(--color-sidebar);
    border-right: 1px solid #1e293b;
    padding: 10px 0;
    display: flex; flex-direction: column; align-items: center;
    z-index: 100;
    transition: background .25s;
  }

  .ob-sidebar-drawer {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: 220px;
    background: var(--color-sidebar);
    border-right: 1px solid #1e293b;
    padding: 16px 0;
    display: flex; flex-direction: column;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.4,0,.2,1), background .25s;
    overflow-y: auto; overflow-x: hidden;
  }
  .ob-sidebar-drawer.open { transform: translateX(0); }

  .ob-drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 199;
    backdrop-filter: blur(2px);
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .ob-hamburger {
    display: none;
    position: fixed; top: 12px; left: 12px; z-index: 300;
    width: 38px; height: 38px;
    background: var(--color-sidebar);
    border: 1px solid #334155; border-radius: 9px;
    cursor: pointer; align-items: center; justify-content: center;
    color: #94a3b8; transition: all .15s;
  }
  .ob-hamburger:hover { background: #1e293b; color: #fff; }

  @media (max-width: 768px) {
    .ob-sidebar { display: none !important; }
    .ob-hamburger { display: flex !important; }
    .ob-main { margin-left: 0 !important; padding-top: 60px !important; }
  }

  .ob-sidebar-logo { display: flex; align-items: center; justify-content: center; width: 100%; padding: 6px 0 18px; flex-shrink: 0; }
  .ob-avatar-sm { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#0ea5e9,#6366f1); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; letter-spacing: -.5px; }
  .ob-drawer-logo { display: flex; align-items: center; gap: 10px; padding: 0 16px 18px; flex-shrink: 0; }
  .ob-drawer-logo .ob-drawer-title { font-weight: 800; font-size: 15px; color: #f8fafc; letter-spacing: -.3px; }

  .ob-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; width: 100%; padding: 0 8px; }
  .ob-nav-item { position: relative; width: 100%; }

  .ob-navlink {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 10px; border-radius: 8px;
    font-weight: 500; font-size: 14px; color: #64748b;
    cursor: pointer; transition: all .15s;
    border: none; background: none; font-family: inherit;
    white-space: nowrap; flex-shrink: 0; line-height: 1;
  }
  .ob-navlink:hover { background: rgba(14,165,233,.1); color: #0ea5e9; }
  .ob-navlink.active { background: var(--color-hover-tab); color: #fff; font-weight: 600; }
  .ob-navlink:disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
  .ob-navlink svg { width: 20px; height: 20px; flex-shrink: 0; }

  .ob-navlink.theme-toggle { color: #94a3b8; }
  .ob-navlink.theme-toggle:hover { color: #fbbf24; background: rgba(251,191,36,.1); }
  [data-theme="light"] .ob-navlink.theme-toggle { color: #94a3b8; }
  [data-theme="light"] .ob-navlink.theme-toggle:hover { color: #6366f1; background: rgba(99,102,241,.1); }

  .ob-navlink-drawer {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 10px 14px; border-radius: 8px;
    font-weight: 500; font-size: 13px; color: #94a3b8;
    cursor: pointer; transition: all .15s;
    border: none; background: none; font-family: inherit;
    text-align: left; white-space: nowrap;
  }
  .ob-navlink-drawer:hover { background: rgba(14,165,233,.1); color: #0ea5e9; }
  .ob-navlink-drawer.active { background: var(--color-hover-tab); color: #fff; font-weight: 600; }
  .ob-navlink-drawer:disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
  .ob-navlink-drawer svg { width: 18px; height: 18px; flex-shrink: 0; }

  .ob-nav-tooltip {
    position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
    background: #1e293b; color: #f1f5f9;
    padding: 5px 10px; border-radius: 7px;
    font-size: 12px; font-weight: 600; white-space: nowrap;
    pointer-events: none; z-index: 9999;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    opacity: 0; transition: opacity .12s ease; letter-spacing: .1px;
  }
  .ob-nav-tooltip::before {
    content: ''; position: absolute; right: 100%; top: 50%; transform: translateY(-50%);
    border: 5px solid transparent; border-right-color: #1e293b;
  }
  .ob-nav-item:hover .ob-nav-tooltip { opacity: 1; }

  .ob-sidebar-footer { margin-top: auto; padding: 12px 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; flex-shrink: 0; }
  .ob-drawer-footer { margin-top: auto; padding: 12px 16px 4px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
  .ob-user-avatar { width: 30px; height: 30px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .ob-nav-divider { height: 1px; background: #1e293b; margin: 6px 0; width: 100%; }

  .ob-main {
    margin-left: var(--sidebar-w);
    min-height: 100vh;
    background: var(--color-bg);
    width: calc(100% - var(--sidebar-w));
    transition: background .25s;
  }
  .ob-container { max-width: 1650px; margin: 0 auto; padding: 20px; }
  .ob-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
  .ob-header h1 { font-size: 14px; font-weight: 700; color: var(--color-text); }

  .ob-card {
    border: 1px solid var(--color-border);
    border-radius: 14px; padding: 20px;
    box-shadow: 0 4px 12px var(--color-shadow);
    transition: background .25s, border-color .25s;
  }
  .ob-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 9999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .ob-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--color-border); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead { background: var(--color-table-head); position: sticky; top: 0; }
  th { text-align: left; padding: 11px 14px; font-weight: 600; color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  td { padding: 12px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  tr:last-child td { border-bottom: none; }

  input, select, textarea {
    background: var(--color-input-bg);
    color: var(--color-text);
    border-color: var(--color-border);
    transition: background .2s, border-color .2s, color .2s;
  }
  input::placeholder, textarea::placeholder { color: var(--color-text-muted); }

  .ob-loading { text-align: center; padding: 40px; }
  .ob-spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid var(--color-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  button:focus { outline: 2px solid rgba(255,255,255,0.2); outline-offset: 2px; }

[data-theme="dark"] body::after {
  content: '';
  position: fixed;
  inset: 0;
  backdrop-filter: grayscale(1);
  pointer-events: none;
  z-index: 9998;
}
`;

const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard [Store 2]", icon: Home01Icon, adminsOnly: false },
    { id: "store1", label: "Store 1", icon: ArrowDataTransferDiagonalIcon },
    { id: "memberDashboard", label: "Member Dashboard", icon: CheckListIcon, adminsOnly: false },
    { id: "players", label: "Players", icon: UserGroup03Icon },
    { id: "dailyCheckups", label: "Daily Checkups", icon: FolderOpenIcon },
    { id: "playTime", label: "Play Time", icon: TimeQuarter02Icon },
    { id: "games", label: "Games", icon: GameboyIcon },
    { id: "attendance", label: "Attendance", icon: Notebook02Icon },
    { id: "issues", label: "Issues", icon: SettingError04Icon },
    { id: "transactions", label: "All Transactions", icon: Invoice02Icon },
    { id: "balances", label: "Live Balances", icon: BalanceScaleIcon, dividerAfter: true },
    { id: "expenses", label: "Expenses", icon: Invoice03Icon, adminsOnly: true },
    { id: 'profitTakeouts', label: 'Profit Takeouts', icon: DollarCircleIcon, adminsOnly: true },
    { id: "addTasks", label: "Add Tasks", icon: TaskEdit01Icon, adminsOnly: true },
    { id: "addTransactions", label: "Add Transaction", icon: AddMoneyCircleIcon, adminsOnly: false },
    { id: "addBonus", label: "Add Bonus", icon: GiftIcon, adminsOnly: false },
    { id: "manageWallets", label: "Manage Wallets", icon: BitcoinWalletIcon, adminsOnly: true },
    { id: "shifts", label: "Shifts", icon: ManagerIcon, adminsOnly: false, dividerAfter: true },
    { id: "adminReports", label: "Admin Reports", icon: AnalysisTextLinkIcon, adminsOnly: true },
];

const ALLOWED_ADMINS = ["admin", "SUPER_ADMIN"];
// ══════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════
export function Sidebar({ user, activePage, onNavigate, onLogout }) {

    const { isStore2, setIsStore2 } = useContext(App2Context);
    const isAdmin = ALLOWED_ADMINS.includes(user?.username);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleNav = (id) => { onNavigate(id); setDrawerOpen(false); };

    const DesktopSidebar = (
        <aside className="ob-sidebar">
            <div className="ob-sidebar-logo">
                <div className="ob-avatar-sm">OB</div>
            </div>

            <nav className="ob-nav">
                {NAV_ITEMS.map(item => {
                    const disabled = item.adminsOnly && !isAdmin;
                    return (
                        <div key={item.id}>
                            <div className="ob-nav-item">
                                <button
                                    className={`ob-navlink${activePage === item.id ? ' active' : ''}`}
                                    onClick={() => {
                                        if (item.id === 'store1') {
                                            setIsStore2(prev => !prev);
                                            // return;
                                        }
                                        !disabled && handleNav(item.id)
                                    }}
                                    disabled={disabled}
                                    aria-label={item.label}
                                >
                                    <HugeiconsIcon icon={item.icon} size={20} />
                                </button>
                                <span className="ob-nav-tooltip">{item.label}</span>
                            </div>
                            {item.dividerAfter && <div className="ob-nav-divider" />}
                        </div>
                    );
                })}
            </nav>

            <div className="ob-sidebar-footer">
                <div className="ob-nav-item">
                    <button
                        className="ob-navlink theme-toggle"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={20} />
                    </button>
                    <span className="ob-nav-tooltip">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </div>

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

    const MobileNav = (
        <>
            <button className="ob-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            {drawerOpen && <div className="ob-drawer-overlay" onClick={() => setDrawerOpen(false)} />}

            <div className={`ob-sidebar-drawer${drawerOpen ? ' open' : ''}`}>
                <div className="ob-drawer-logo">
                    <div className="ob-avatar-sm">OB</div>
                    <span className="ob-drawer-title">OceanBets</span>
                </div>

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

                <div className="ob-drawer-footer">
                    <div style={{ height: '1px', background: '#1e293b', marginBottom: '4px' }} />

                    <button
                        className="ob-navlink-drawer"
                        onClick={toggleTheme}
                        style={{ color: theme === 'dark' ? '#fbbf24' : '#6366f1' }}
                    >
                        <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={18} />
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

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

    return <>{DesktopSidebar}{MobileNav}</>;
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user }) {
    const { addPlayer, setAddPlayer } = useContext(AddPlayerContext);
    const { usr, setUsr } = useContext(CurrentUserContext);
    setUsr(user);

    // ── FIX: Read ?page= query param from URL on every navigation ──────────
    // This makes breadcrumbs work: navigate('/?page=players') → sets page to 'players'
    const location = useLocation();

    const getPageFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('page') || 'dashboard';
    };

    const [page, setPage] = useState(getPageFromUrl);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Sync page state whenever the URL search params change
    // (handles back-navigation from PlayerDashboard via breadcrumbs)
    useEffect(() => {
        const urlPage = getPageFromUrl();
        if (urlPage !== page) {
            setPage(urlPage);
            // Clear addPlayer flag when navigating away from players section
            if (urlPage !== 'players') setAddPlayer(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    const handleLogout = async () => {
        try { setLoading(true); await api.auth.logout(); window.location.reload(); }
        catch { setErrorMsg("Logout failed"); }
        finally { setLoading(false); }
    };

    const handleNavigate = (pageId, extra = {}) => {
        if (pageId !== 'players') setAddPlayer(false);
        setPage(pageId);
        // If the banner sends tab:'pending', store it so Transactions can read it
        if (extra.tab) {
            sessionStorage.setItem('transactions_initialTab', extra.tab);
        }
    };


    const navLabels = {
        dashboard: 'Dashboard [Store 2]', store1: 'Store 1', memberDashboard: 'Member Dashboard', players: 'Players',
        dailyCheckups: 'Daily Checkups',
        playTime: 'Play Time', games: 'Games', attendance: 'Attendance', issues: 'Issues',
        transactions: 'All Transactions', balances: 'Live Balances', expenses: 'Expenses', profitTakeouts: 'Profit Takeouts',
        addTransactions: 'Add Transaction', addBonus: 'Add Bonus', reports: 'Reports',
        manageWallets: 'Manage Wallets', shifts: 'Shifts', addTasks: 'Add Tasks',
        adminReports: 'Admin Reports',
    };

    const renderPage = () => {
        switch (page) {
            case "dashboard": return <AnalyticsDashboard />;
            case "store1": return <Store1 />;
            case "memberDashboard": return <TeamDashboard user={user} />;
            case "players": return <Players />;
            case "dailyCheckups": return <MissingPlayersPage currentUser={user} />;
            case "playTime": return <Playtimepage />;
            case "attendance": return <Attendance />;
            case "games": return <Games user={user} />;
            case "issues": return <Issues />;
            case "transactions": return <Transactions />;
            case "expenses": return <ExpensesPage />;
            case 'profitTakeouts': return <ProfitTakeoutsPage />;
            case "balances": return <BalancesPage />;
            case "manageWallets": return <ManageWalletsPage />;
            case "shifts": return <ShiftsPage />;
            case "addTransactions": return <AddTransactionsPage />;
            case "addBonus": return <AddBonusPage />;
            case "addTasks": return <AdminTaskPage />;
            case "adminReports": return <AdminReportPage />;
            default: return (
                <div className="ob-card">
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>Coming Soon</p>
                </div>
            );
        }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
            <Sidebar user={user} activePage={page} onNavigate={handleNavigate} onLogout={handleLogout} />
            <main className="ob-main">
                <div className="ob-container">
                    <PendingTransactionsBanner
                        currentPage={page}
                        onNavigate={handleNavigate}
                    />
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

// ══════════════════════════════════════════════════════════════════════════
// PLAYER DASHBOARD WITH SIDEBAR
// ══════════════════════════════════════════════════════════════════════════
function PlayerDashboardWithSidebar({ user }) {
    const { setUsr } = useContext(CurrentUserContext);
    setUsr(user);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // console.log("user is the: ", user);
    const handleLogout = async () => {
        try { setLoading(true); await api.auth.logout(); window.location.reload(); }
        catch { } finally { setLoading(false); }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
            <Sidebar
                user={user}
                activePage="players"
                onNavigate={(id) => navigate(`/?page=${id}`)}
                onLogout={handleLogout}
            />
            <main className="ob-main">
                <div className="ob-container">
                    <PlayerDashboard />
                </div>
            </main>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════
function ShiftsWithSidebar({ user }) {
    const { setUsr } = useContext(CurrentUserContext);
    setUsr(user);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try { setLoading(true); await api.auth.logout(); window.location.reload(); }
        catch { } finally { setLoading(false); }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
            <Sidebar
                user={user}
                activePage="shifts"
                onNavigate={(id) => navigate(`/?page=${id}`)}
                onLogout={handleLogout}
            />
            <main className="ob-main">
                <div className="ob-container">
                    <div className="ob-header">
                        <h1>Shifts</h1>
                    </div>
                    <ShiftsPage />
                </div>
            </main>
        </div>
    );
}
// ══════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════
function LoginPage() {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(""); setLoading(true);
        try {
            const result = await api.auth.login(username, password);
            window.user = result.user;
            window.location.reload();
        } catch (err) {
            setError(err.message || "Login failed");
        } finally { setLoading(false); }
    };

    return (
        <div className="ob-login-wrap">
            <button
                onClick={toggleTheme}
                style={{ position: 'fixed', top: 16, right: 16, background: 'var(--color-cards)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
            >
                <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={16} />
                {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            <div className="ob-login-card">
                <div className="ob-login-logo">
                    <div className="ob-avatar-lg">OB</div>
                    <div>
                        <div className="ob-title">OceanBets</div>
                        <div className="ob-sub">Management Portal</div>
                    </div>
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
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "16px", textAlign: "center" }}>
                    Demo: admin / admin123
                </p>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════
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
            <ThemeProvider>
                <style>{CSS}</style>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <div className="ob-loading" style={{ justifyContent: 'center', width: '100vw' }} ><div className="ob-spinner" /></div>
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
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

                                    <Route path="/shifts"
                                        element={user ? <ShiftsWithSidebar user={user} /> : <LoginPage />}
                                    />


                                </Routes>
                            </Router>
                        </PlayerDashboardPlayerNameProvider>
                    </AddPlayerProvider>
                </ShiftStatusProvider>
            </CurrentUserProvider>
        </ThemeProvider>
    );
}
