import { useState, useEffect } from "react";
import { api } from "./api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ═══════════════════════════════════════════════════════════════
// CSS STYLES
// ═══════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  :root {
    --primary: #3b82f6;
    --primary-dark: #2563eb;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --bg: #f9fafb;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #111827;
    --text-light: #6b7280;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body { 
    font-family: 'Inter', -apple-system, sans-serif; 
    background: var(--bg); 
    color: var(--text);
  }

  /* Layout */
  .admin-layout { display: flex; min-height: 100vh; }
  
  .admin-sidebar {
    width: 260px; background: #1f2937; color: white;
    position: fixed; left: 0; top: 0; bottom: 0;
    display: flex; flex-direction: column;
  }

  .admin-logo {
    padding: 24px 20px; border-bottom: 1px solid #374151;
    font-size: 20px; font-weight: 700;
  }

  .admin-nav { flex: 1; padding: 12px; }
  
  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; margin-bottom: 4px;
    border-radius: 8px; cursor: pointer;
    transition: all 0.2s; font-size: 14px; font-weight: 500;
    background: none; border: none; color: #d1d5db; width: 100%;
    text-align: left;
  }
  
  .nav-item:hover { background: #374151; color: white; }
  .nav-item.active { background: var(--primary); color: white; }
  .nav-icon { font-size: 18px; }

  .admin-user {
    padding: 16px 20px; border-top: 1px solid #374151;
    display: flex; align-items: center; gap: 12px;
  }

  .admin-user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--primary); display: flex; align-items: center;
    justify-content: center; font-weight: 600;
  }

  .admin-user-name { font-size: 14px; font-weight: 600; }
  .admin-user-role { font-size: 12px; color: #9ca3af; }

  .admin-main { margin-left: 260px; flex: 1; }
  
  .admin-header {
    background: white; border-bottom: 1px solid var(--border);
    padding: 20px 32px; display: flex; justify-content: space-between;
    align-items: center; position: sticky; top: 0; z-index: 10;
  }

  .admin-header h1 { font-size: 24px; font-weight: 700; }

  .admin-content { padding: 32px; }

  /* Login */
  .login-container {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .login-card {
    background: white; border-radius: 16px; padding: 48px 40px;
    width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .login-title {
    font-size: 28px; font-weight: 700; margin-bottom: 8px; text-align: center;
  }

  .login-subtitle {
    color: var(--text-light); text-align: center; margin-bottom: 32px;
  }

  /* Forms */
  .form-group { margin-bottom: 20px; }
  
  .form-label {
    display: block; margin-bottom: 8px; font-weight: 600;
    font-size: 14px; color: var(--text);
  }

  .form-input {
    width: 100%; padding: 12px 16px; border: 1px solid var(--border);
    border-radius: 8px; font-size: 15px; transition: all 0.2s;
  }

  .form-input:focus {
    outline: none; border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-select {
    width: 100%; padding: 10px 14px; border: 1px solid var(--border);
    border-radius: 8px; font-size: 14px; background: white;
  }

  .form-textarea {
    width: 100%; padding: 12px 16px; border: 1px solid var(--border);
    border-radius: 8px; font-size: 14px; min-height: 100px; resize: vertical;
  }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 10px 20px; border-radius: 8px;
    font-weight: 600; font-size: 14px; cursor: pointer;
    transition: all 0.2s; border: none; font-family: inherit;
  }

  .btn-primary {
    background: var(--primary); color: white;
  }
  .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }

  .btn-success { background: var(--success); color: white; }
  .btn-success:hover { background: #059669; }

  .btn-danger { background: var(--danger); color: white; }
  .btn-danger:hover { background: #dc2626; }

  .btn-secondary {
    background: white; color: var(--text); border: 1px solid var(--border);
  }
  .btn-secondary:hover { background: var(--bg); }

  .btn-sm { padding: 6px 12px; font-size: 13px; }
  .btn-full { width: 100%; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Cards */
  .card {
    background: white; border: 1px solid var(--border);
    border-radius: 12px; padding: 24px;
  }

  .card-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px;
  }

  .card-title { font-size: 18px; font-weight: 700; }

  /* Stats Grid */
  .stats-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px; margin-bottom: 32px;
  }

  .stat-card {
    background: white; border: 1px solid var(--border);
    border-radius: 12px; padding: 20px;
  }

  .stat-label {
    font-size: 13px; color: var(--text-light);
    font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 8px;
  }

  .stat-value {
    font-size: 32px; font-weight: 700; margin-bottom: 4px;
  }

  .stat-change {
    font-size: 13px; display: flex; align-items: center; gap: 4px;
  }

  .stat-change.positive { color: var(--success); }
  .stat-change.negative { color: var(--danger); }

  /* Table */
  .table-container {
    overflow-x: auto; border: 1px solid var(--border);
    border-radius: 12px; background: white;
  }

  table {
    width: 100%; border-collapse: collapse;
  }

  thead {
    background: #f9fafb;
  }

  th {
    text-align: left; padding: 12px 16px; font-weight: 600;
    font-size: 12px; color: var(--text-light); text-transform: uppercase;
    letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
  }

  td {
    padding: 16px; border-bottom: 1px solid var(--border);
  }

  tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: #f9fafb; }

  /* Badge */
  .badge {
    display: inline-flex; align-items: center; padding: 4px 10px;
    border-radius: 9999px; font-size: 12px; font-weight: 600;
  }

  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-info { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white; border-radius: 16px; padding: 32px;
    width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;
  }

  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px;
  }

  .modal-title { font-size: 20px; font-weight: 700; }

  .modal-close {
    background: none; border: none; font-size: 24px;
    cursor: pointer; color: var(--text-light);
  }

  .modal-footer {
    display: flex; gap: 12px; justify-content: flex-end;
    margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);
  }

  /* Alert */
  .alert {
    padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }

  .alert-success {
    background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;
  }

  .alert-error {
    background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;
  }

  /* Loading */
  .loading {
    display: flex; align-items: center; justify-content: center;
    padding: 60px; color: var(--text-light);
  }

  .spinner {
    width: 40px; height: 40px; border: 4px solid var(--border);
    border-top-color: var(--primary); border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Pagination */
  .pagination {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-top: 24px;
  }

  .page-btn {
    padding: 8px 12px; border: 1px solid var(--border);
    background: white; border-radius: 6px; cursor: pointer;
    font-size: 14px; transition: all 0.2s;
  }

  .page-btn:hover { background: var(--bg); }
  .page-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
  .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Filters */
  .filters {
    display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
  }

  .filter-item { flex: 1; min-width: 200px; }

  /* Empty State */
  .empty-state {
    text-align: center; padding: 60px 20px; color: var(--text-light);
  }

  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
  .empty-text { font-size: 16px; }
`;

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function App() {
  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("admin-css")) {
      const s = document.createElement("style");
      s.id = "admin-css";
      s.textContent = CSS;
      document.head.prepend(s);
    }
  }, []);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  // Login state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await api.getCurrentUser();
      if (userData && (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN')) {
        setUser(userData);
      }
    } catch (err) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoginError("");
      const data = await api.login(loginUser, loginPass);

      if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN') {
        setLoginError("Admin access required");
        await api.logout();
        return;
      }

      setUser(data.user);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setLoginUser("");
    setLoginPass("");
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-title">🌊 OceanBets Admin</div>
          <div className="login-subtitle">Sign in to manage the platform</div>

          {loginError && (
            <div className="alert alert-error">
              ⚠️ {loginError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="admin"
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button className="btn btn-primary btn-full" onClick={handleLogin}>
            Sign In
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
            Demo: <code>admin</code> / <code>admin123</code>
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'bonuses', label: 'Bonuses', icon: '🎁' },
    { id: 'logs', label: 'Activity Logs', icon: '📝' },
    ...(user.role === 'SUPER_ADMIN' ? [{ id: 'settings', label: 'Settings', icon: '⚙️' }] : [])
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          🌊 OceanBets Admin
        </div>

        <nav className="admin-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-user">
          <div className="admin-user-avatar">{user.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div className="admin-user-name">{user.name}</div>
            <div className="admin-user-role">{user.role.replace('_', ' ')}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>{navItems.find(n => n.id === page)?.label}</h1>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <div className="admin-content">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'users' && <UsersPage />}
          {page === 'transactions' && <TransactionsPage />}
          {page === 'bonuses' && <BonusesPage />}
          {page === 'logs' && <LogsPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, trendsData, playersData] = await Promise.all([
        api.getStats(),
        api.getTrends(),
        api.getTopPlayers(5)
      ]);
      setStats(statsData);
      setTrends(trendsData);
      setTopPlayers(playersData);
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.users.total}</div>
          <div className="stat-change positive">
            {stats.users.active} active
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{stats.transactions.total}</div>
          <div className="stat-change" style={{ color: stats.transactions.pending > 0 ? 'var(--warning)' : 'var(--text-light)' }}>
            {stats.transactions.pending} pending
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Top-ups</div>
          <div className="stat-value">${stats.revenue.totalTopups.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Cashouts</div>
          <div className="stat-value">${stats.revenue.totalCashouts.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Net Revenue</div>
          <div className="stat-value" style={{ color: stats.revenue.netRevenue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${stats.revenue.netRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Transaction Trends (Last 7 Days)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="topups" stroke="#10b981" name="Top-ups" />
              <Line type="monotone" dataKey="cashouts" stroke="#ef4444" name="Cashouts" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Top Players by Balance</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.username}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ${p.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// USERS PAGE
// ═══════════════════════════════════════════════════════════════

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [search, statusFilter]);

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      const data = await api.getUsers({ page, search, status: statusFilter });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewUser = async (userId) => {
    try {
      const userData = await api.getUser(userId);
      setSelectedUser(userData);
      setShowUserModal(true);
    } catch (err) {
      alert('Failed to load user details');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      {/* Filters */}
      <div className="filters">
        <div className="filter-item">
          <input
            className="form-input"
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-item">
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => api.exportUsers()}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td>{u.name}</td>
                <td style={{ color: 'var(--text-light)', fontSize: 13 }}>{u.email}</td>
                <td style={{ fontWeight: 700 }}>${u.balance.toLocaleString()}</td>
                <td>
                  <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' :
                      u.status === 'SUSPENDED' ? 'badge-warning' : 'badge-danger'
                    }`}>
                    {u.status}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewUser(u.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() => loadUsers(pagination.page - 1)}
          >
            Previous
          </button>
          {[...Array(pagination.totalPages)].map((_, i) => (
            <button
              key={i}
              className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`}
              onClick={() => loadUsers(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => loadUsers(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}
    </>
  );
}

// User Detail Modal Component
function UserDetailModal({ user, onClose }) {
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const handleAdjust = async () => {
    try {
      await api.adjustBalance(user.id, Number(adjustAmount), adjustReason);
      alert('Balance adjusted successfully');
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspend = async (suspend) => {
    try {
      await api.suspendUser(user.id, suspend, suspendReason);
      alert(suspend ? 'User suspended' : 'User activated');
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <div className="modal-title">{user.username}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* User Info */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Name</div>
              <div style={{ fontWeight: 600 }}>{user.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Email</div>
              <div style={{ fontWeight: 600 }}>{user.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Balance</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--success)' }}>${user.balance.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Status</div>
              <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Adjust Balance */}
        <div style={{ marginBottom: 24, padding: 20, background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Adjust Balance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12 }}>
            <input
              className="form-input"
              type="number"
              placeholder="Amount"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Reason"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleAdjust} disabled={!adjustAmount}>
              Adjust
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8 }}>
            Use positive number to add, negative to subtract
          </div>
        </div>

        {/* Suspend/Activate */}
        <div style={{ marginBottom: 24, padding: 20, background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Account Status</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Reason (optional)"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              style={{ flex: 1 }}
            />
            {user.status === 'ACTIVE' ? (
              <button className="btn btn-danger" onClick={() => handleSuspend(true)}>
                Suspend User
              </button>
            ) : (
              <button className="btn btn-success" onClick={() => handleSuspend(false)}>
                Activate User
              </button>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Recent Transactions</div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {user.transactions && user.transactions.length > 0 ? (
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 0' }}>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {user.transactions.slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td style={{ padding: '8px 0' }}>
                        <span className={`badge ${t.type === 'TOPUP' ? 'badge-success' :
                            t.type === 'CASHOUT' ? 'badge-danger' : 'badge-info'
                          }`}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${t.amount.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-light)' }}>{new Date(t.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">No transactions yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS PAGE
// ═══════════════════════════════════════════════════════════════

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, statusFilter]);

  const loadTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const data = await api.getTransactions({
        page,
        type: typeFilter,
        status: statusFilter
      });
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Load transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, approve) => {
    if (!confirm(`Are you sure you want to ${approve ? 'approve' : 'reject'} this transaction?`)) {
      return;
    }

    try {
      await api.reviewTransaction(id, approve, '');
      loadTransactions();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      {/* Filters */}
      <div className="filters">
        <div className="filter-item">
          <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="TOPUP">Top-up</option>
            <option value="CASHOUT">Cashout</option>
            <option value="BONUS">Bonus</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
        <div className="filter-item">
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => api.exportTransactions({ type: typeFilter, status: statusFilter })}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Bonus</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{t.id}</td>
                <td style={{ fontWeight: 600 }}>{t.user.username}</td>
                <td>
                  <span className={`badge ${t.type === 'TOPUP' ? 'badge-success' :
                      t.type === 'CASHOUT' ? 'badge-danger' :
                        t.type === 'BONUS' ? 'badge-info' : 'badge-gray'
                    }`}>
                    {t.type}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>${t.amount.toLocaleString()}</td>
                <td style={{ color: 'var(--success)' }}>
                  {t.bonus > 0 ? `+$${t.bonus.toLocaleString()}` : '—'}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{t.wallet || '—'}</td>
                <td>
                  <span className={`badge ${t.status === 'COMPLETED' ? 'badge-success' :
                      t.status === 'PENDING' ? 'badge-warning' :
                        t.status === 'REJECTED' ? 'badge-danger' : 'badge-gray'
                    }`}>
                    {t.status}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {new Date(t.createdAt).toLocaleString()}
                </td>
                <td>
                  {t.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={() => handleReview(t.id, true)}>
                        Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReview(t.id, false)}>
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() => loadTransactions(pagination.page - 1)}
          >
            Previous
          </button>
          {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => (
            <button
              key={i}
              className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`}
              onClick={() => loadTransactions(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => loadTransactions(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// BONUSES PAGE
// ═══════════════════════════════════════════════════════════════

function BonusesPage() {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadBonuses();
  }, []);

  const loadBonuses = async () => {
    try {
      setLoading(true);
      const data = await api.getBonuses();
      setBonuses(data);
    } catch (err) {
      console.error('Load bonuses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bonus?')) {
      return;
    }

    try {
      await api.deleteBonus(id);
      loadBonuses();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Bonus
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bonuses.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 600 }}>{b.user.username}</td>
                <td style={{ fontWeight: 700, color: 'var(--success)' }}>${b.amount.toLocaleString()}</td>
                <td>{b.reason}</td>
                <td>
                  <span className={`badge ${b.claimed ? 'badge-success' : 'badge-warning'}`}>
                    {b.claimed ? 'Claimed' : 'Unclaimed'}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-light)' }}>
                  {new Date(b.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {!b.claimed && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateBonusModal
          onClose={() => {
            setShowCreateModal(false);
            loadBonuses();
          }}
        />
      )}
    </>
  );
}

function CreateBonusModal({ onClose }) {
  const [userIds, setUserIds] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleCreate = async () => {
    try {
      const ids = userIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (ids.length === 0) {
        alert('Please enter valid user IDs');
        return;
      }

      await api.createBonus(ids, Number(amount), reason);
      alert('Bonus created successfully');
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Create Bonus</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label className="form-label">User IDs (comma-separated)</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 1,2,3"
            value={userIds}
            onChange={e => setUserIds(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Amount ($)</label>
          <input
            className="form-input"
            type="number"
            placeholder="100"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Reason</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Welcome bonus"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>Create Bonus</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGS PAGE
// ═══════════════════════════════════════════════════════════════

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (page = 1) => {
    try {
      setLoading(true);
      const data = await api.getLogs({ page, limit: 50 });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Load logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Activity</th>
            <th>Description</th>
            <th>IP Address</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td style={{ fontWeight: 600 }}>{log.user.username}</td>
              <td>
                <span className="badge badge-info">{log.activityType}</span>
              </td>
              <td style={{ fontSize: 13 }}>{log.description}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.ipAddress || '—'}</td>
              <td style={{ fontSize: 13, color: 'var(--text-light)' }}>
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════

function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      {success && (
        <div className="alert alert-success">
          ✓ Settings updated successfully
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Bonus Percentage (%)</label>
        <input
          className="form-input"
          type="number"
          value={settings.bonus_percentage || ''}
          onChange={e => setSettings({ ...settings, bonus_percentage: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Min Top-up Amount ($)</label>
        <input
          className="form-input"
          type="number"
          value={settings.min_topup_amount || ''}
          onChange={e => setSettings({ ...settings, min_topup_amount: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Max Top-up Amount ($)</label>
        <input
          className="form-input"
          type="number"
          value={settings.max_topup_amount || ''}
          onChange={e => setSettings({ ...settings, max_topup_amount: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Min Cashout Amount ($)</label>
        <input
          className="form-input"
          type="number"
          value={settings.min_cashout_amount || ''}
          onChange={e => setSettings({ ...settings, min_cashout_amount: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Max Cashout Amount ($)</label>
        <input
          className="form-input"
          type="number"
          value={settings.max_cashout_amount || ''}
          onChange={e => setSettings({ ...settings, max_cashout_amount: e.target.value })}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
}