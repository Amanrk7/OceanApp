/**
 * OceanBets Dashboard - Complete API Integration
 * Synced with backend for efficient real-time dashboard
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ═══════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const cache = {
  data: {},
  timestamps: {},
  ttl: 5 * 60 * 1000,

  set(key, data, customTtl = null) {
    this.data[key] = data;
    this.timestamps[key] = Date.now();
    if (customTtl) this.ttl = customTtl;
  },

  get(key) {
    if (!this.data[key]) return null;
    const age = Date.now() - this.timestamps[key];
    if (age > this.ttl) {
      delete this.data[key];
      delete this.timestamps[key];
      return null;
    }
    return this.data[key];
  },

  clear(key) {
    delete this.data[key];
    delete this.timestamps[key];
  },

  clearAll() {
    this.data = {};
    this.timestamps = {};
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const defaultOptions = {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

function buildQueryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString() ? `?${query.toString()}` : '';
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION API
// ═══════════════════════════════════════════════════════════════

export const authAPI = {
  login: async (username, password) => {
    const data = await fetchAPI('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) localStorage.setItem('authToken', data.token);
    cache.set('user', data.user, 30 * 60 * 1000);
    return data;
  },

  logout: async () => {
    localStorage.removeItem('authToken');
    cache.clearAll();
    return fetchAPI('/logout', { method: 'POST' });
  },

  getUser: async () => {
    const cached = cache.get('user');
    if (cached) return cached;
    const user = await fetchAPI('/user');
    cache.set('user', user, 30 * 60 * 1000);
    return user;
  }
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD API
// ═══════════════════════════════════════════════════════════════

export const dashboardAPI = {
  getStats: async (forceRefresh = false) => {
    const cacheKey = 'dashboardStats';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI('/dashboard/stats');
    cache.set(cacheKey, data, 30 * 1000);
    return data;
  },

  getProfitStats: async (forceRefresh = false) => {
    const cacheKey = 'profitStats';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI('/profit/stats');
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  getDailyProfit: async (forceRefresh = false) => {
    const cacheKey = 'dailyProfitChart';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI('/chart/daily-profit');
    cache.set(cacheKey, data, 60 * 1000);
    return data;
  },

  getPlayerActivity: async (forceRefresh = false) => {
    const cacheKey = 'playerActivityChart';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI('/chart/player-activity');
    cache.set(cacheKey, data, 60 * 1000);
    return data;
  },

  getDepoVsCashoutsActivity: async (forceRefresh = false) => {
    const cacheKey = 'depoVsCashoutsActivity';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    try {
      const data = await fetchAPI('/chart/player-deposit-withdrawal');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) { return { period_7days: [], period_30days: [] }; }
  },

  getTopDepositors: async (forceRefresh = false) => {
    const cacheKey = 'topDepositors';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    try {
      const data = await fetchAPI('/analytics/top-depositors');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) { return { period_1day: [], period_7days: [], period_30days: [] }; }
  },

  getTopCashouts: async (forceRefresh = false) => {
    const cacheKey = 'topCashouts';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    try {
      const data = await fetchAPI('/analytics/top-cashouts');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) { return { period_1day: [], period_7days: [], period_30days: [] }; }
  },

  getTopGamesByDeposits: async (forceRefresh = false) => {
    const cacheKey = 'topGamesByDeposits';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    try {
      const data = await fetchAPI('/analytics/top-games-deposits');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) { return { period_1day: [], period_7days: [], period_30days: [] }; }
  },

  getTopGamesByCashouts: async (forceRefresh = false) => {
    const cacheKey = 'topGamesByCashouts';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    try {
      const data = await fetchAPI('/analytics/top-games-cashouts');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) { return { period_1day: [], period_7days: [], period_30days: [] }; }
  }
};

// ═══════════════════════════════════════════════════════════════
// PLAYERS API
// ═══════════════════════════════════════════════════════════════

export const playersAPI = {
  getPlayers: async (page = 1, limit = 10, search = '', status = '') => {
    const queryString = buildQueryString({ page, limit, search, status });
    const cacheKey = `players_${page}_${limit}_${search}_${status}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const data = await fetchAPI(`/players${queryString}`);
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  getPlayer: async (id) => {
    // ✅ Never cache individual player — always fresh for real-time dashboard
    const data = await fetchAPI(`/players/${id}`);
    return data;
  },

  createPlayer: async (playerData) => {
    const {
      name, username, password, email, phone, tier,
      facebook, telegram, instagram, x, snapchat,
      referrals, friends, sources,
    } = playerData;

    if (!name || !username || !password || !email) {
      throw new Error('Name, username, password, and email are required');
    }

    const data = await fetchAPI('/create-new-player', {
      method: 'POST',
      body: JSON.stringify({
        name, username, password, email,
        phone: phone || null,
        tier: tier || 'BRONZE',
        facebook: facebook || null,
        telegram: telegram || null,
        instagram: instagram || null,
        x: x || null,
        snapchat: snapchat || null,
        referrals: referrals || [],
        friends: friends || [],
        sources: sources || [],
      }),
    });

    cache.clearAll();
    return data;
  },

  updatePlayer: async (playerId, playerData) => {
    const data = await fetchAPI(`/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify(playerData),
    });
    cache.clearAll();
    return data;
  },

  deletePlayer: async (playerId, adminPassword) => {
    const data = await fetchAPI(`/players/${playerId}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminPassword }),
    });
    cache.clearAll();
    return data;
  },

  searchPlayers: async (query) => {
    if (!query || query.trim().length < 2) return { data: [] };
    const data = await fetchAPI(`/players/search?q=${encodeURIComponent(query.trim())}`);
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS API
// ═══════════════════════════════════════════════════════════════

export const transactionsAPI = {
  getTransactions: async (page = 1, limit = 10, type = '', status = '', forceRefresh = false) => {
    const queryString = buildQueryString({ page, limit, type, status });
    const cacheKey = `transactions_${page}_${limit}_${type}_${status}`;
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI(`/transactions${queryString}`);
    cache.set(cacheKey, data, 30 * 1000);
    return data;
  },

  undoTransaction: async (transactionId) => {
    const data = await fetchAPI(`/transactions/${transactionId}/undo`, { method: 'POST' });
    cache.clearAll();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apiUndoTransaction', {
        detail: { transactionId, data, timestamp: new Date().toISOString() }
      }));
    }
    return data;
  }
};

// ═══════════════════════════════════════════════════════════════
// GAMES API — Never cached (stock changes constantly)
// ═══════════════════════════════════════════════════════════════

export const gamesAPI = {
  getGames: async (forceRefresh = false, { status = '', search = '' } = {}) => {
    const queryString = buildQueryString({ status, search });
    const data = await fetchAPI(`/games${queryString}`);
    return data;
  },

  createGame: async (gameData) => {
    const data = await fetchAPI('/games', { method: 'POST', body: JSON.stringify(gameData) });
    return data;
  },

  updateGame: async (gameId, gameData) => {
    const data = await fetchAPI(`/games/${gameId}`, { method: 'PATCH', body: JSON.stringify(gameData) });
    return data;
  },

  deleteGame: async (gameId, adminPassword) => {
    const data = await fetchAPI(`/games/${gameId}`, { method: 'DELETE', body: JSON.stringify({ adminPassword }) });
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPENSES API
// ═══════════════════════════════════════════════════════════════

export const expensesAPI = {
  getExpenses: async (forceRefresh = false, { category = '', search = '' } = {}) => {
    const cacheKey = `expenses_${category}_${search}`;
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const queryString = buildQueryString({ category, search });
    const data = await fetchAPI(`/expenses${queryString}`);
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  createExpense: async (expenseData) => {
    const data = await fetchAPI('/expenses', { method: 'POST', body: JSON.stringify(expenseData) });
    cache.clearAll();
    return data;
  },

  updateExpense: async (id, expenseData) => {
    const data = await fetchAPI(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(expenseData) });
    cache.clearAll();
    return data;
  },

  createPayment: async (paymentData) => {
    const data = await fetchAPI('/payments', { method: 'POST', body: JSON.stringify(paymentData) });
    cache.clearAll();
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════
// BONUSES API
// ═══════════════════════════════════════════════════════════════

export const bonusesAPI = {
  /**
   * Grant a bonus to a player.
   * @param {object} grant
   * @param {number} grant.playerId
   * @param {number} grant.amount        - bonus amount (already calculated)
   * @param {string} grant.gameId
   * @param {string} grant.bonusType     - 'streak' | 'referral' | 'match' | 'special'
   * @param {string} [grant.notes]
   */
  grantBonus: async ({ playerId, amount, gameId, bonusType, notes }) => {
    const data = await fetchAPI('/bonuses', {
      method: 'POST',
      body: JSON.stringify({ playerId, amount, gameId, bonusType, notes }),
    });
    cache.clearAll();
    return data;
  },

  getLedger: async () => {
    const data = await fetchAPI('/bonuses');
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════
// WALLETS API
// ═══════════════════════════════════════════════════════════════

export const walletsAPI = {
  getGroupedWallets: async (forceRefresh = false) => {
    const cacheKey = 'wallets_grouped';
    if (!forceRefresh) { const cached = cache.get(cacheKey); if (cached) return cached; }
    const data = await fetchAPI('/wallets');
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  createWallet: async (walletData) => {
    const data = await fetchAPI('/wallets', { method: 'POST', body: JSON.stringify(walletData) });
    cache.clearAll();
    return data;
  },

  updateWallet: async (id, walletData) => {
    const data = await fetchAPI(`/wallets/${id}`, { method: 'PATCH', body: JSON.stringify(walletData) });
    cache.clearAll();
    return data;
  },

  deleteWallet: async (id) => {
    const data = await fetchAPI(`/wallets/${id}`, { method: 'DELETE' });
    cache.clearAll();
    return data;
  }
};

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════════════════════════

export const attendanceAPI = {
  getAttendance: async (status = 'Active', page = 1, limit = 10) => {
    const queryString = buildQueryString({ status: status || 'all', page, limit });
    const cacheKey = `attendance_${status}_${page}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const data = await fetchAPI(`/attendance${queryString}`);
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  }
};

// ═══════════════════════════════════════════════════════════════
// ISSUES API
// ═══════════════════════════════════════════════════════════════

export const issuesAPI = {
  issues: {
    getIssues: async (refresh = false, status = null, priority = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      const query = params.toString() ? `?${params.toString()}` : '';
      return fetchAPI(`/issues${query}`);
    },
    createIssue: async (issueData) => {
      const { title, description, playerName, priority = 'MEDIUM' } = issueData;
      if (!title || !description) throw new Error('Title and description are required');
      return fetchAPI('/issues', { method: 'POST', body: JSON.stringify({ title, description, playerName, priority }) });
    },
    getIssueById: async (issueId) => fetchAPI(`/issues/${issueId}`),
    updateIssue: async (issueId, updateData) => fetchAPI(`/issues/${issueId}`, { method: 'PATCH', body: JSON.stringify(updateData) }),
    resolveIssue: async (issueId) => fetchAPI(`/issues/${issueId}/resolve`, { method: 'POST' }),
    deleteIssue: async (issueId) => fetchAPI(`/issues/${issueId}`, { method: 'DELETE' }),
    getStats: async () => fetchAPI('/issues/stats/summary'),
  }
};

// ═══════════════════════════════════════════════════════════════
// SHIFT API
// ═══════════════════════════════════════════════════════════════

export const shiftApi = {
  getShifts: (role) => fetchAPI(`/shifts/${role}`),
  createShift: async (shiftData) => {
    try {
      const { teamRole, startTime, endTime, duration, isActive } = shiftData;
      if (!teamRole) throw new Error('teamRole is required');
      const response = await fetch('/api/shifts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamRole, startTime, endTime, duration, isActive })
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to record shift'); }
      return await response.json();
    } catch (error) { console.error('API Error:', error); throw error; }
  },
  getActiveShift: (teamRole) => fetchAPI(`/shifts/active/${teamRole}`),
  startShift: (body) => fetchAPI('/shifts/start', { method: 'POST', body: JSON.stringify(body) }),
  endShift: (shiftId) => fetchAPI(`/shifts/${shiftId}/end`, { method: 'PATCH' }),
};

// ═══════════════════════════════════════════════════════════════
// TASKS API
// ═══════════════════════════════════════════════════════════════

export const tasksAPI = {
  getTasks: async (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.assignedTo !== undefined && opts.assignedTo !== null) params.set("assignedTo", opts.assignedTo);
    if (opts.unassigned) params.set("unassigned", "true");
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString() ? `?${params}` : "";
    return fetchAPI(`/tasks${qs}`);
  },
  createTask: async (taskData) => fetchAPI("/tasks", { method: "POST", body: JSON.stringify(taskData) }),
  updateTask: async (taskId, updates) => fetchAPI(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteTask: async (taskId) => fetchAPI(`/tasks/${taskId}`, { method: "DELETE" }),
  getTeamMembers: async () => fetchAPI("/team-members"),
};

export const reportsAPI = {
  getDailyReport: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.teamRole) params.set('teamRole', opts.teamRole);
    const qs = params.toString() ? `?${params}` : '';
    return fetchAPI(`/reports/daily${qs}`);
  },
  getMyShifts: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.role) params.set('role', opts.role);
    if (opts.limit) params.set('limit', opts.limit);
    const qs = params.toString() ? `?${params}` : '';
    return fetchAPI(`/reports/my-shifts${qs}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSOLIDATED API EXPORT
// ═══════════════════════════════════════════════════════════════

export const api = {
  auth: authAPI,
  dashboard: dashboardAPI,
  players: playersAPI,
  transactions: transactionsAPI,
  wallets: walletsAPI,
  games: gamesAPI,
  attendance: attendanceAPI,
  issues: issuesAPI,
  shifts: shiftApi,
  expenses: expensesAPI,
  bonuses: bonusesAPI,
  tasks: tasksAPI,
  reports: reportsAPI,
  clearCache: () => cache.clearAll(),
  getCacheStatus: () => ({ items: Object.keys(cache.data).length, keys: Object.keys(cache.data) })
};

export default api;
