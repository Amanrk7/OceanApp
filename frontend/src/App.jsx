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
const CSS = `/* … your existing CSS string … */`;

// ══════════════════════════════════════════════════════════════
// NAV ITEMS (unchanged)
// ══════════════════════════════════════════════════════════════
const NAV_ITEMS = [
    { id: "dashboard",        label: "Dashboard",       icon: Home01Icon },
    { id: "memberDashboard",  label: "Member Dashboard",icon: CheckListIcon },
    { id: "players",          label: "Players",         icon: UserGroup03Icon },
    { id: "dailyCheckups",    label: "Daily Checkups",  icon: FolderOpenIcon },
    { id: "playTime",         label: "Play Time",       icon: TimeQuarter02Icon },
    { id: "games",            label: "Games",           icon: GameboyIcon },
    { id: "attendance",       label: "Attendance",      icon: Notebook02Icon },
    { id: "issues",           label: "Issues",          icon: SettingError04Icon },
    { id: "transactions",     label: "All Transactions",icon: Invoice02Icon },
    { id: "balances",         label: "Live Balances",   icon: BalanceScaleIcon, dividerAfter: true },
    { id: "expenses",         label: "Expenses",        icon: Invoice03Icon,    adminsOnly: true },
    { id: "profitTakeouts",   label: "Profit Takeouts", icon: DollarCircleIcon, adminsOnly: true },
    { id: "addTasks",         label: "Add Tasks",       icon: TaskEdit01Icon,   adminsOnly: true },
    { id: "addTransactions",  label: "Add Transaction", icon: AddMoneyCircleIcon },
    { id: "addBonus",         label: "Add Bonus",       icon: GiftIcon },
    { id: "manageWallets",    label: "Manage Wallets",  icon: BitcoinWalletIcon, adminsOnly: true },
    { id: "shifts",           label: "Shifts",          icon: ManagerIcon, dividerAfter: true },
    { id: "adminReports",     label: "Admin Reports",   icon: AnalysisTextLinkIcon, adminsOnly: true },
];

const ADMIN_USERNAMES = ["admin", "superadmin"];

// ══════════════════════════════════════════════════════════════
// STORE SWITCHER — popover showing all accessible stores
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";

function StoreSwitcher({ user, onSwitch }) {
    const { currentStoreId } = useContext(App2Context);
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [error, setError] = useState('');
    const ref = useRef(null);

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
    const accessibleStores = isAdmin ? [1, 2, 3] : (user?.storeAccess || [1]);

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

    const handleSwitch = async (targetStoreId) => {
        setError('');
        setSwitching(true);
        setOpen(false);
        try {
            // Auto-end active shift on current store for team members
            if (TEAM_ROLES.includes(user?.role)) {
                const token = localStorage.getItem('authToken');
                const activeRes = await fetch(
                    `${import.meta.env.VITE_API_URL}/shifts/active/${user.role}`,
                    {
                        credentials: 'include',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'X-Store-Id': String(currentStoreId),
                        },
                    }
                );
                const activeData = await activeRes.json();
                if (activeData?.data?.id) {
                    await fetch(
                        `${import.meta.env.VITE_API_URL}/shifts/${activeData.data.id}/end`,
                        {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'X-Store-Id': String(currentStoreId),
                            },
                        }
                    );
                }
            }
            onSwitch(targetStoreId);
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
                </nav>
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
            case "dashboard":       return <AnalyticsDashboard />;
            case "memberDashboard": return <TeamDashboard user={user} />;
            case "players":         return <Players />;
            case "dailyCheckups":   return <MissingPlayersPage currentUser={user} />;
            case "playTime":        return <Playtimepage />;
            case "attendance":      return <Attendance />;
            case "games":           return <Games user={user} />;
            case "issues":          return <Issues />;
            case "transactions":    return <Transactions />;
            case "expenses":        return <ExpensesPage />;
            case "profitTakeouts":  return <ProfitTakeoutsPage />;
            case "balances":        return <BalancesPage />;
            case "manageWallets":   return <ManageWalletsPage />;
            case "shifts":          return <ShiftsPage />;
            case "addTransactions": return <AddTransactionsPage />;
            case "addBonus":        return <AddBonusPage />;
            case "addTasks":        return <AdminTaskPage />;
            case "adminReports":    return <AdminReportPage />;
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
                                    <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                                    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
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

// ══════════════════════════════════════════════════════════════
// ROOT APP — single file, store-agnostic
// ══════════════════════════════════════════════════════════════
export default function App() {
    const { setCurrentStoreId } = useContext(App2Context);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // useEffect(() => {
    //     api.auth.getUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
    // }, []);

    useEffect(() => {
        api.auth.getUser()
            .then(u => {
                setUser(u);

                // ── Auto-set store based on user's primary storeAccess ──
                // Team members: storeAccess[0] is their store (e.g. [2] → Store 2)
                // Admins: storeAccess is irrelevant, they can switch freely
                const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(u?.role);
                if (!isAdmin && u?.storeAccess?.length > 0) {
                    const primaryStore = u.storeAccess[0];
                    setCurrentStoreId(primaryStore);
                    setStoreId(primaryStore);
                }
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);   // eslint-disable-line react-hooks/exhaustive-deps

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
