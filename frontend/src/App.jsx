import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api";
import { AddPlayerProvider, AddPlayerContext } from "./Context/addPlayer.jsx";
import { PlayerDashboardPlayerNameProvider } from "./Context/playerDashboardPlayerNamecontext.jsx";
import { ShiftStatusProvider } from "./Context/membershiftStatus.jsx";
import { CurrentUserProvider, CurrentUserContext } from "./Context/currentUser.jsx";
import { ThemeProvider, useTheme } from "./Context/Themecontext.jsx";
import { App2Context, App2Provider } from "./Context/store2Switch.jsx";
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon, UserGroup03Icon, TimeQuarter02Icon, GameboyIcon,
  Notebook02Icon, SettingError04Icon, Invoice02Icon, BalanceScaleIcon,
  Invoice03Icon, AddMoneyCircleIcon, GiftIcon, AnalysisTextLinkIcon,
  BitcoinWalletIcon, ManagerIcon, Logout01Icon, TaskEdit01Icon,
  CheckListIcon, Moon02Icon, Sun03Icon, FolderOpenIcon, DollarCircleIcon,
  ArrowDataTransferDiagonalIcon,
} from '@hugeicons/core-free-icons';

// ── Page imports ──────────────────────────────────────────────────────────
import AnalyticsDashboard from "./Pages/dashboard";
import Players from "./Pages/Players";
import Attendance from "./Pages/Attendance";
import Games from "./Pages/Games";
import Issues from "./Pages/Issues";
import Transactions from "./Pages/Transactions";
import { ExpensesPage } from './Pages/Expenses.jsx';
import { ShiftsPage } from './Pages/Shifts.jsx';
import ShiftStartGate from './Components/ShiftStartGate.jsx';
import AddTransactionsPage from './Pages/AddTransaction.jsx';
import AddBonusPage from "./Pages/AddBonus.jsx";
import { BalancesPage } from './Pages/BalancesPage';
import PlayerDashboard from "./Pages/PlayerDashboard.jsx";
import ManageWalletsPage from "./Pages/manageWallets.jsx";
import AdminTaskPage from "./Pages/Admintaskpage.jsx";
import TeamDashboard from "./Pages/Teamdashboard.jsx";
import AdminReportPage from "./Pages/Adminreportpage.jsx";
import MissingPlayersPage from "./Pages/Missingplayerspage.jsx";
import Playtimepage from "./Pages/Playtimepage.jsx";
import PendingTransactionsBanner from "./Components/Pendingtransactionsbanner.jsx";
import ProfitTakeoutsPage from "./Pages/ProfitTakeoutsPage.jsx";
import AddNewPlayer from "./Pages/AddNewPlayer.jsx";
import { setStoreId } from './api';

// ─────────────────────────────────────────────────────────────────────────
const SIDEBAR_W = 62;
const TEAM_ROLES = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'];

// ══════════════════════════════════════════════════════════════
// CSS (unchanged from your original — paste your full CSS here)
// ══════════════════════════════════════════════════════════════
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

  .ob-sidebar-logo { display: flex; align-items: center; justify-content: center; width: 100%; padding: 6px 0 14px; flex-shrink: 0; }
  .ob-avatar-sm { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#0ea5e9,#6366f1); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; letter-spacing: -.5px; }
  .ob-drawer-logo { display: flex; align-items: center; gap: 10px; padding: 0 16px 18px; flex-shrink: 0; }
  .ob-drawer-logo .ob-drawer-title { font-weight: 800; font-size: 15px; color: #f8fafc; letter-spacing: -.3px; }

  .ob-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    width: 100%;
    padding: 0 8px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }
  .ob-nav::-webkit-scrollbar { display: none; }

  .ob-nav-item { position: relative; width: 100%; }

  .ob-navlink {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 8px; border-radius: 8px;
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

  .ob-navlink.store-switch {
    color: #0ea5e9;
    background: rgba(14,165,233,.08);
    border: 1px solid rgba(14,165,233,.2);
    border-radius: 8px;
    position: relative;
  }
  .ob-navlink.store-switch:hover {
    background: rgba(14,165,233,.2);
    color: #38bdf8;
    border-color: rgba(14,165,233,.4);
  }
  .ob-store-badge {
    position: absolute;
    top: 2px; right: 2px;
    width: 13px; height: 13px;
    background: #0ea5e9;
    color: #fff;
    border-radius: 50%;
    font-size: 8px;
    font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    line-height: 1;
    pointer-events: none;
  }

  .ob-navlink-drawer.store-switch {
    color: #0ea5e9;
    background: rgba(14,165,233,.08);
    border: 1px solid rgba(14,165,233,.2);
    margin: 0 0 2px;
  }
  .ob-navlink-drawer.store-switch:hover {
    background: rgba(14,165,233,.2);
    color: #38bdf8;
  }

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

  .ob-sidebar-footer { margin-top: auto; padding: 12px 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; flex-shrink: 0; border-top: 1px solid #1e293b; }
  .ob-drawer-footer { margin-top: auto; padding: 12px 16px 4px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
  .ob-user-avatar { width: 30px; height: 30px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .ob-nav-divider { height: 1px; background: #1e293b; margin: 4px 0; width: 100%; flex-shrink: 0; }

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

// ══════════════════════════════════════════════════════════════
// NAV ITEMS (unchanged)
// ══════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home01Icon },
  { id: "memberDashboard", label: "Member Dashboard", icon: CheckListIcon },
  { id: "players", label: "Players", icon: UserGroup03Icon },
  { id: "dailyCheckups", label: "Daily Checkups", icon: FolderOpenIcon },
  { id: "playTime", label: "Play Time", icon: TimeQuarter02Icon },
  { id: "games", label: "Games", icon: GameboyIcon },
  { id: "attendance", label: "Attendance", icon: Notebook02Icon },
  { id: "issues", label: "Issues", icon: SettingError04Icon },
  { id: "transactions", label: "All Transactions", icon: Invoice02Icon },
  { id: "balances", label: "Live Balances", icon: BalanceScaleIcon, dividerAfter: true },
  { id: "expenses", label: "Expenses", icon: Invoice03Icon, adminsOnly: true },
  { id: "profitTakeouts", label: "Profit Takeouts", icon: DollarCircleIcon, adminsOnly: true },
  { id: "addTasks", label: "Add Tasks", icon: TaskEdit01Icon, adminsOnly: true },
  { id: "addTransactions", label: "Add Transaction", icon: AddMoneyCircleIcon },
  { id: "addBonus", label: "Add Bonus", icon: GiftIcon },
  { id: "manageWallets", label: "Manage Wallets", icon: BitcoinWalletIcon, adminsOnly: true },
  { id: "shifts", label: "Shifts", icon: ManagerIcon, dividerAfter: true },
  { id: "adminReports", label: "Admin Reports", icon: AnalysisTextLinkIcon, adminsOnly: true },
];

const ADMIN_USERNAMES = ["admin", "superadmin"];

// ══════════════════════════════════════════════════════════════
// STORE SWITCHER — popover showing all accessible stores
// ══════════════════════════════════════════════════════════════

function StoreSwitcher({ user, onSwitch }) {
  const { currentStoreId } = useContext(App2Context);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);

  const rawAccess = user?.storeAccess;
  const accessibleStores = isAdmin
    ? [1, 2, 3]
    : Array.isArray(rawAccess)
      ? rawAccess
      : typeof rawAccess === 'number'
        ? [rawAccess]
        : typeof rawAccess === 'string'
          ? rawAccess.split(',').map(Number).filter(Boolean)
          : [1];

  // ── Close on outside click ───────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Don't render if only 1 store
  if (accessibleStores.length <= 1) return null;

  const otherStores = accessibleStores.filter(id => id !== currentStoreId);

  // const handleSwitch = async (targetStoreId) => {
  //   setError('');
  //   setSwitching(true);
  //   setOpen(false);
  //   try {
  //     // Auto-end active shift on current store for team members
  //     if (TEAM_ROLES.includes(user?.role)) {
  //       const token = localStorage.getItem('authToken');
  //       const activeRes = await fetch(
  //         `${import.meta.env.VITE_API_URL}/shifts/active/${user.role}`,
  //         {
  //           credentials: 'include',
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //             'X-Store-Id': String(currentStoreId),
  //           },
  //         }
  //       );
  //       const activeData = await activeRes.json();
  //       if (activeData?.data?.id) {
  //         await fetch(
  //           `${import.meta.env.VITE_API_URL}/shifts/${activeData.data.id}/end`,
  //           {
  //             method: 'PATCH',
  //             credentials: 'include',
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //               'X-Store-Id': String(currentStoreId),
  //             },
  //           }
  //         );
  //       }
  //     }
  //     onSwitch(targetStoreId);
  //   } catch (err) {
  //     setError('Store switch failed — try again.');
  //   } finally {
  //     setSwitching(false);
  //   }
  // };

  const handleSwitch = async (targetStoreId) => {
    setError('');
    setSwitching(true);
    setOpen(false);
    try {
      onSwitch(targetStoreId);  // just switch — don't end shifts
    } catch (err) {
      setError('Store switch failed — try again.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* ── Trigger button ── */}
      <div
        className="ob-nav-item"
        title={`Store ${currentStoreId} — click to switch`}
      >
        <button
          className="ob-navlink store-switch"
          onClick={() => setOpen(o => !o)}
          disabled={switching}
          aria-label="Switch store"
          style={{ position: 'relative' }}
        >
          {switching
            ? <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>…</span>
            : <HugeiconsIcon icon={ArrowDataTransferDiagonalIcon} size={18} />
          }
          <span className="ob-store-badge">{currentStoreId}</span>
        </button>
      </div>

      {/* ── Popover ── */}
      {open && (
        <div style={{
          position: 'fixed',
          left: SIDEBAR_W + 8,
          bottom: 80,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: 8,
          minWidth: 170,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 10000,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '.6px',
            padding: '4px 8px 8px',
          }}>
            Switch Store
          </p>

          {/* Current store — not clickable */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 7,
            background: 'rgba(14,165,233,0.12)',
            border: '1px solid rgba(14,165,233,0.25)',
            marginBottom: 4,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: '#0ea5e9', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>{currentStoreId}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>
                Store {currentStoreId}
              </div>
              <div style={{ fontSize: 10, color: '#38bdf8', opacity: 0.7 }}>
                Currently active
              </div>
            </div>
            <span style={{
              marginLeft: 'auto', width: 7, height: 7,
              borderRadius: '50%', background: '#22c55e', flexShrink: 0,
            }} />
          </div>

          {/* Other stores */}
          {otherStores.map(storeId => (
            <button
              key={storeId}
              onClick={() => handleSwitch(storeId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px', borderRadius: 7,
                border: 'none', background: 'transparent',
                cursor: 'pointer', transition: 'background .15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: '#334155', color: '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>{storeId}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
                  Store {storeId}
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Click to switch
                </div>
              </div>
            </button>
          ))}

          {error && (
            <div style={{
              marginTop: 6, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', color: '#f87171',
              fontSize: 11, border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR — now uses StoreSwitcher
// ══════════════════════════════════════════════════════════════
export function Sidebar({ user, activePage, onNavigate, onLogout }) {
  const { currentStoreId, setCurrentStoreId } = useContext(App2Context);
  const isAdmin = ADMIN_USERNAMES.includes(user?.username);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [tooltip, setTooltip] = useState({ visible: false, label: '', y: 0 });

  const handleMouseEnter = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, label, y: rect.top + rect.height / 2 });
  };
  const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));
  const handleNav = (id) => { onNavigate(id); setDrawerOpen(false); };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="ob-sidebar">
        {/* Tooltip */}
        <div style={{
          position: 'fixed', left: SIDEBAR_W + 10, top: tooltip.y,
          transform: 'translateY(-50%)',
          background: '#1e293b', color: '#f1f5f9', padding: '5px 10px',
          borderRadius: 7, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 4px 14px rgba(0,0,0,.35)',
          opacity: tooltip.visible ? 1 : 0, transition: 'opacity .12s ease',
        }}>
          <span style={{
            position: 'absolute', right: '100%', top: '50%',
            transform: 'translateY(-50%)', borderWidth: 5, borderStyle: 'solid',
            borderColor: 'transparent #1e293b transparent transparent',
          }} />
          {tooltip.label}
        </div>

        <div className="ob-sidebar-logo">
          <div className="ob-avatar-sm">OB</div>
        </div>

        <nav className="ob-nav">
          {NAV_ITEMS.map(item => {
            const disabled = item.adminsOnly && !isAdmin;
            return (
              <div key={item.id}>
                <div
                  className="ob-nav-item"
                  onMouseEnter={e => handleMouseEnter(e, item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={`ob-navlink${activePage === item.id ? ' active' : ''}`}
                    onClick={() => !disabled && handleNav(item.id)}
                    disabled={disabled}
                    aria-label={item.label}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} />
                  </button>
                </div>
                {item.dividerAfter && <div className="ob-nav-divider" />}
              </div>
            );
          })}
        </nav>

        <div className="ob-sidebar-footer">
          {/* ── Multi-store switcher ── */}
          <StoreSwitcher user={user} onSwitch={setCurrentStoreId} />

          {/* ── Theme toggle ── */}
          <div
            className="ob-nav-item"
            onMouseEnter={e => handleMouseEnter(e, theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
            onMouseLeave={handleMouseLeave}
          >
            <button className="ob-navlink theme-toggle" onClick={toggleTheme}>
              <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={20} />
            </button>
          </div>

          {/* ── Logout ── */}
          <div
            className="ob-nav-item"
            onMouseEnter={e => handleMouseEnter(e, 'Logout')}
            onMouseLeave={handleMouseLeave}
          >
            <button className="ob-navlink" onClick={onLogout}
              style={{ color: '#ef4444' }}>
              <HugeiconsIcon icon={Logout01Icon} size={20} />
            </button>
          </div>

          <div className="ob-user-avatar">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      </aside>

      {/* ── Mobile hamburger + drawer (same as before, abbreviated) ── */}
      {/* … paste your existing mobile nav here unchanged … */}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — reads store from context
// ══════════════════════════════════════════════════════════════
function AdminDashboard({ user }) {
  const { currentStoreId } = useContext(App2Context);
  const { setAddPlayer } = useContext(AddPlayerContext);
  const { setUsr } = useContext(CurrentUserContext);
  setUsr(user);

  const location = useLocation();
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('page') || 'dashboard';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlPage = params.get('page') || 'dashboard';
    setPage(urlPage);
    if (urlPage !== 'players') setAddPlayer(false);
  }, [location.search]);

  const handleLogout = async () => {
    await api.auth.logout();
    window.location.reload();
  };

  const handleNavigate = (pageId) => {
    if (pageId !== 'players') setAddPlayer(false);
    setPage(pageId);
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <AnalyticsDashboard />;
      case "memberDashboard": return <TeamDashboard user={user} />;
      case "players": return <Players />;
      case "dailyCheckups": return <MissingPlayersPage currentUser={user} />;
      case "playTime": return <Playtimepage />;
      case "attendance": return <Attendance />;
      case "games": return <Games user={user} />;
      case "issues": return <Issues />;
      case "transactions": return <Transactions />;
      case "expenses": return <ExpensesPage />;
      case "profitTakeouts": return <ProfitTakeoutsPage />;
      case "balances": return <BalancesPage />;
      case "manageWallets": return <ManageWalletsPage />;
      case "shifts": return <ShiftsPage />;
      case "addTransactions": return <AddTransactionsPage />;
      case "addBonus": return <AddBonusPage />;
      case "addTasks": return <AdminTaskPage />;
      case "adminReports": return <AdminReportPage />;
      default: return <div className="ob-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Coming Soon</div>;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
      <Sidebar user={user} activePage={page} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="ob-main">
        <div className="ob-container">
          <PendingTransactionsBanner currentPage={page} onNavigate={handleNavigate} />
          <div className="ob-header">
            <h1>
              {page.charAt(0).toUpperCase() + page.slice(1).replace(/([A-Z])/g, ' $1')}
              {' '}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                borderRadius: 6, background: 'rgba(14,165,233,0.12)',
                color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)',
                verticalAlign: 'middle',
              }}>
                Store {currentStoreId}
              </span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => handleNavigate('addTransactions')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: '1px solid #86efac', fontFamily: 'inherit',
                background: page === 'addTransactions' ? '#16a34a' : '#f0fdf4',
                color: page === 'addTransactions' ? '#fff' : '#16a34a',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Transaction
              </button>
              <button onClick={() => handleNavigate('addBonus')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: '1px solid #e9d5ff', fontFamily: 'inherit',
                background: page === 'addBonus' ? '#7c3aed' : '#faf5ff',
                color: page === 'addBonus' ? '#fff' : '#7c3aed',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
                Add Bonus
              </button>
            </div>
          </div>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PLAYER DASHBOARD (route /PlayerDashboard/:id)
// ══════════════════════════════════════════════════════════════
function PlayerDashboardWithSidebar({ user }) {
  const { setUsr } = useContext(CurrentUserContext);
  const { setCurrentStoreId } = useContext(App2Context);
  setUsr(user);
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
      <Sidebar
        user={user}
        activePage="players"
        onNavigate={id => navigate(`/?page=${id}`)}
        onLogout={async () => { await api.auth.logout(); window.location.reload(); }}
      />
      <main className="ob-main">
        <div className="ob-container"><PlayerDashboard /></div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADD NEW PLAYER (route /addNewPlayer)
// ══════════════════════════════════════════════════════════════
function AddNewPlayerWithSidebar({ user }) {
  const { setUsr } = useContext(CurrentUserContext);
  setUsr(user);
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", width: "100vw" }}>
      <Sidebar user={user} activePage="players"
        onNavigate={id => navigate(`/?page=${id}`)}
        onLogout={async () => { await api.auth.logout(); window.location.reload(); }}
      />
      <main className="ob-main">
        <div className="ob-container"><AddNewPlayer /></div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SHIFTS WITH SIDEBAR
// ══════════════════════════════════════════════════════════════════════════
function ShiftsWithSidebar({ user }) {
  const { setUsr } = useContext(CurrentUserContext);
  setUsr(user);
  const navigate = useNavigate();
  const { setIsStore2 } = useContext(App2Context);
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
        onStoreSwitch={() => setIsStore2(false)}
        storeSwitchLabel="Switch to Store 1"
        storeSwitchNum="1"
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

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════
function LoginPage() {
  const { currentStoreId } = useContext(App2Context);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.auth.login(username, password);
      window.location.reload();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="ob-login-wrap">
      <button onClick={toggleTheme} style={{
        position: 'fixed', top: 16, right: 16,
        background: 'var(--color-cards)', border: '1px solid var(--color-border)',
        borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
        color: 'var(--color-text-muted)', display: 'flex',
        alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      }}>
        <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={16} />
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div className="ob-login-card">
        <div className="ob-login-logo">
          <div className="ob-avatar-lg">OB</div>
          <div>
            <div className="ob-title">OceanBets</div>
            <div className="ob-sub">
              Management Portal
              {currentStoreId > 1 && (
                <span style={{
                  marginLeft: 6, padding: '1px 7px', borderRadius: 5,
                  background: 'rgba(14,165,233,0.1)', color: '#0ea5e9',
                  border: '1px solid rgba(14,165,233,0.2)', fontSize: 11, fontWeight: 700,
                }}>
                  Store {currentStoreId}
                </span>
              )}
            </div>
          </div>
        </div>
        {error && <div className="ob-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label className="ob-label">Username</label>
          <input type="text" className="ob-input" value={username}
            onChange={e => setUsername(e.target.value)} placeholder="Enter username" disabled={loading} />
          <label className="ob-label">Password</label>
          <input type="password" className="ob-input" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Enter password" disabled={loading} />
          <button type="submit" className="ob-btn ob-btn-primary ob-btn-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StoreSelectionModal({ user, onConfirm }) {
  const accessibleStores = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role)
    ? [1, 2, 3]
    : Array.isArray(user?.storeAccess) ? user.storeAccess : [1];

  const [selected, setSelected] = useState(accessibleStores);

  // Only show if user has access to more than 1 store
  if (accessibleStores.length <= 1) {
    // Auto-confirm immediately
    useEffect(() => { onConfirm(accessibleStores, accessibleStores[0]); }, []);
    return null;
  }

  const toggle = (id) =>
    setSelected(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev // keep at least 1
        : [...prev, id]
    );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--color-cards)', border: '1px solid var(--color-border)',
        borderRadius: 18, padding: '36px 40px', width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 14px',
          }}>OB</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
            Welcome, {user?.name?.split(' ')[0]}!
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
            You have access to multiple stores. Select which store(s) to work on this session.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {accessibleStores.map(storeId => {
            const isSelected = selected.includes(storeId);
            return (
              <button key={storeId} onClick={() => toggle(storeId)} style={{
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${isSelected ? '#0ea5e9' : 'var(--color-border)'}`,
                background: isSelected ? 'rgba(14,165,233,0.1)' : 'var(--color-bg)',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'all .15s', fontFamily: 'inherit',
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: isSelected ? '#0ea5e9' : 'var(--color-border)',
                  color: isSelected ? '#fff' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 15, flexShrink: 0,
                }}>{storeId}</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>
                    Store {storeId}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {isSelected ? '✓ Selected for this session' : 'Click to include'}
                  </div>
                </div>
                <span style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `2px solid ${isSelected ? '#0ea5e9' : 'var(--color-border)'}`,
                  background: isSelected ? '#0ea5e9' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: '#fff', fontSize: 12,
                }}>
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {selected.length > 1 && (
          <div style={{
            padding: '10px 14px', background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8,
            fontSize: 12, color: '#0ea5e9', marginBottom: 20,
          }}>
            💡 Working on <b>both stores simultaneously</b> — you can start/end shifts on each store independently. Use the store switcher in the sidebar to toggle views.
          </div>
        )}

        <button
          onClick={() => onConfirm(selected, selected[0])}
          disabled={selected.length === 0}
          style={{
            width: '100%', padding: '13px', borderRadius: 10,
            background: '#0ea5e9', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            fontFamily: 'inherit', opacity: selected.length === 0 ? 0.5 : 1,
          }}
        >
          Start Session on Store{selected.length > 1 ? 's' : ''} {selected.join(' & ')} →
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP — single file, store-agnostic
// ══════════════════════════════════════════════════════════════
export default function App() {
  const { setCurrentStoreId, setActiveStoreIds, storeSelectionDone, setStoreSelectionDone } = useContext(App2Context);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStoreSelect, setShowStoreSelect] = useState(false);

  useEffect(() => {
    api.auth.getUser()
      .then(u => {
        setUser(u);
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(u?.role);
        const stores = isAdmin ? [1, 2, 3] : (Array.isArray(u?.storeAccess) ? u.storeAccess : [1]);
        if (stores.length > 1) {
          setShowStoreSelect(true); // show popup
        } else {
          const s = stores[0] || 1;
          setCurrentStoreId(s);
          setActiveStoreIds([s]);
          setStoreId(s);
          setStoreSelectionDone(true);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleStoreConfirm = (selectedIds, primaryId) => {
    setCurrentStoreId(primaryId);
    setActiveStoreIds(selectedIds);
    setStoreId(primaryId);
    setStoreSelectionDone(true);
    setShowStoreSelect(false);
  };

  if (loading) {
    return (
      <ThemeProvider>
        <style>{CSS}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="ob-spinner" />
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

              {/* Store selection modal — shown before main app when multi-store */}
              {user && showStoreSelect && !storeSelectionDone && (
                <StoreSelectionModal user={user} onConfirm={handleStoreConfirm} />
              )}
              <Router>

                <Routes>
                  <Route path="/" element={
                    user
                      ? <ShiftStartGate><AdminDashboard user={user} /></ShiftStartGate>
                      : <LoginPage />
                  } />
                  <Route path="/PlayerDashboard/:playerId" element={
                    user ? <PlayerDashboardWithSidebar user={user} /> : <LoginPage />
                  } />
                  <Route path="/shifts"
                    element={user ? <ShiftsWithSidebar user={user} /> : <LoginPage />}
                  />
                  <Route path="/addNewPlayer" element={
                    user ? <AddNewPlayerWithSidebar user={user} /> : <LoginPage />
                  } />
                </Routes>
              </Router>
            </PlayerDashboardPlayerNameProvider>
          </AddPlayerProvider>
        </ShiftStatusProvider>
      </CurrentUserProvider>
    </ThemeProvider>
  );
}
