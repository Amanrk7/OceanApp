/**
 * OceanBets Dashboard - Complete API Integration
 * Synced with backend for efficient real-time dashboard
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
    cache.set('user', data.user, 30 * 60 * 1000);
    return data;
  },

  logout: async () => {
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
// DASHBOARD API - REAL-TIME DATA
// ═══════════════════════════════════════════════════════════════

export const dashboardAPI = {
  // Main statistics
  getStats: async (forceRefresh = false) => {
    const cacheKey = 'dashboardStats';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const data = await fetchAPI('/dashboard/stats');
    cache.set(cacheKey, data, 30 * 1000); // 30 second cache for live updates
    return data;
  },

  // // Profit statistics for last 30 days (NEW!)
  getProfitStats: async (forceRefresh = false) => {
    const cacheKey = 'profitStats';

    // Check cache first
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    // Fetch from backend
    const data = await fetchAPI('/profit/stats');

    // Cache for 2 minutes
    cache.set(cacheKey, data, 2 * 60 * 1000);

    return data;
  },

  // Daily profit chart data
  getDailyProfit: async (forceRefresh = false) => {
    const cacheKey = 'dailyProfitChart';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const data = await fetchAPI('/chart/daily-profit');
    cache.set(cacheKey, data, 60 * 1000); // 1 minute cache
    return data;
  },

  // Player activity chart data-- shows weekly deposits
  getPlayerActivity: async (forceRefresh = false) => {
    const cacheKey = 'playerActivityChart';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const data = await fetchAPI('/chart/player-activity');
    cache.set(cacheKey, data, 60 * 1000); // 1 minute cache
    return data;
  },
  // Game performance data (NEW!)
  getDepoVsCashoutsActivity: async (forceRefresh = false) => {
    const cacheKey = 'depoVsCashoutsActivity';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }
    try {
      const data = await fetchAPI('/chart/player-deposit-withdrawal');
      cache.set(cacheKey, data, 60 * 1000); // 1 minute cache
      return data;
    } catch (error) {
      console.log('Using default deposit vs cashout data');
      return {
        period_7days: [],
        period_30days: []
      };
    }
  },

  // Top depositors (from seed analytics data)
  getTopDepositors: async (forceRefresh = false) => {
    const cacheKey = 'topDepositors';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await fetchAPI('/analytics/top-depositors');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) {
      console.log('Using transaction-based depositors');
      return {
        period_1day: [],
        period_7days: [],
        period_30days: []
      };
    }
  },

  // Top cashouts (from seed analytics data)
  getTopCashouts: async (forceRefresh = false) => {
    const cacheKey = 'topCashouts';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await fetchAPI('/analytics/top-cashouts');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) {
      console.log('Using transaction-based cashouts');
      return {
        period_1day: [],
        period_7days: [],
        period_30days: []
      };
    }
  },

  // Top games by deposits (from seed analytics data)
  getTopGamesByDeposits: async (forceRefresh = false) => {
    const cacheKey = 'topGamesByDeposits';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await fetchAPI('/analytics/top-games-deposits');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) {
      console.log('Using default game deposits');
      return {
        period_1day: [],
        period_7days: [],
        period_30days: []
      };
    }
  },

  // Top games by cashouts (from seed analytics data)
  getTopGamesByCashouts: async (forceRefresh = false) => {
    const cacheKey = 'topGamesByCashouts';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await fetchAPI('/analytics/top-games-cashouts');
      cache.set(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) {
      console.log('Using default game cashouts');
      return {
        period_1day: [],
        period_7days: [],
        period_30days: []
      };
    }
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
    // const data = await fetchAPI(`/players`);
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  getPlayer: async (id) => {
    const cacheKey = `player_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchAPI(`/players/${id}`);
    cache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  createPlayer: async (playerData) => {
    const {
      name, username, password, email, phone, tier,
      facebook, telegram, instagram, x, snapchat,
      referrals, friends, sources,
    } = playerData;

    // Client-side guard (mirrors the backend check)
    if (!name || !username || !password || !email) {
      throw new Error('Name, username, password, and email are required');
    }

    // fetchAPI() sends credentials: 'include' automatically — this is what
    // was missing before. The cookie-based JWT will now be forwarded.
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
        // Arrays sent for future backend use (referrals, friends, sources).
        // The current backend endpoint ignores these — see NOTE below.
        referrals: referrals || [],
        friends: friends || [],
        sources: sources || [],
      }),
    });

    // Bust player list cache so the new row appears immediately on the Players page
    cache.clearAll();
    return data;
  },
  updatePlayer: async (playerId, playerData) => {
    const data = await fetchAPI(`/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify(playerData),
    });
    cache.clearAll(); // refresh list + player detail
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

// export const transactionsAPI = {
//   getTransactions: async (page = 1, limit = 10, type = '', status = '') => {
//     const queryString = buildQueryString({ page, limit, type, status });
//     const cacheKey = `transactions_${page}_${limit}_${type}_${status}`;
//     const cached = cache.get(cacheKey);
//     if (cached) return cached;

//     const data = await fetchAPI(`/transactions${queryString}`);
//     cache.set(cacheKey, data, 30 * 1000);
//     return data;
//   },

//   undoTransaction: async (transactionId) => {
//     const data = await fetchAPI(`/transactions/${transactionId}/undo`, {
//       method: 'POST'
//     });
//     cache.clear('transactions');
//     cache.clear('dashboardStats');
//     return data;
//   }
// };
export const transactionsAPI = {
  getTransactions: async (page = 1, limit = 10, type = '', status = '') => {
    const queryString = buildQueryString({ page, limit, type, status });
    const cacheKey = `transactions_${page}_${limit}_${type}_${status}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const data = await fetchAPI(`/transactions${queryString}`);
    cache.set(cacheKey, data, 30 * 1000);
    return data;
  },
  undoTransaction: async (transactionId) => {
    const data = await fetchAPI(`/transactions/${transactionId}/undo`, { method: 'POST' });
    cache.clearAll();
    return data;
  }
};


// ═══════════════════════════════════════════════════════════════
// GAMES API
// ═══════════════════════════════════════════════════════════════
export const gamesAPI = {
  getGames: async (forceRefresh = false, { status = '', search = '' } = {}) => {
    const cacheKey = `games_${status}_${search}`;  // unique key per filter combo

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const queryString = buildQueryString({ status, search }); // reuse existing helper
    const data = await fetchAPI(`/games${queryString}`);
    cache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },


  createGame: async (gameData) => {
    const data = await fetchAPI('/games', {
      method: 'POST',
      body: JSON.stringify(gameData)
    });
    cache.clearAll(); // bust cache so new game appears immediately
    return data;
  },

  updateGame: async (gameId, gameData) => {
    const data = await fetchAPI(`/games/${gameId}`, {
      method: 'PATCH',
      body: JSON.stringify(gameData)
    });
    cache.clearAll();
    return data;
  },

};

// ═══════════════════════════════════════════════════════════════
// EXPENSES API
// ═══════════════════════════════════════════════════════════════
export const expensesAPI = {
  getExpenses: async (forceRefresh = false, { category = '', search = '' } = {}) => {
    const cacheKey = `expenses_${category}_${search}`;
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }
    const queryString = buildQueryString({ category, search });
    const data = await fetchAPI(`/expenses${queryString}`);
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  createExpense: async (expenseData) => {
    const data = await fetchAPI('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
    cache.clearAll();
    return data;
  },

  // ✅ New
  updateExpense: async (id, expenseData) => {
    const data = await fetchAPI(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(expenseData)
    });
    cache.clearAll();
    return data;
  },

  // ✅ New
  createPayment: async (paymentData) => {
    const data = await fetchAPI('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
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
   * Backend atomically:
   *   - deducts pointStock from game
   *   - credits player balance
   *   - creates Bonus record (type: CUSTOM, description: required)
   *   - creates BONUS Transaction (paymentMethod: null, not 'BONUS' which isn't in enum)
   */
  grantBonus: async ({ playerId, amount, gameId, notes }) => {
    const data = await fetchAPI('/bonuses', {
      method: 'POST',
      body: JSON.stringify({ playerId, amount, gameId, notes }),
    });
    cache.clearAll(); // refresh games, transactions, dashboard stats
    return data;
  },

  /**
   * Fetch the bonus ledger — returns last 100 BONUS transactions
   * with playerName and gameName parsed from description field.
   * Never cached so the ledger is always fresh.
   */
  getLedger: async () => {
    const data = await fetchAPI('/bonuses');
    return data;
  },
};

// ═══════════════════════════════════════════════════════════════
// WALLETS API
// ═══════════════════════════════════════════════════════════════
export const walletsAPI = {
  // Get all wallets grouped by payment method
  getGroupedWallets: async (forceRefresh = false) => {
    const cacheKey = 'wallets_grouped';
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchAPI('/wallets');
    cache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  createWallet: async (walletData) => {
    const data = await fetchAPI('/wallets', {
      method: 'POST',
      body: JSON.stringify(walletData)
    });
    cache.clearAll();
    return data;
  },

  updateWallet: async (id, walletData) => {
    const data = await fetchAPI(`/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(walletData)
    });
    cache.clearAll();
    return data;
  },

  deleteWallet: async (id) => {
    const data = await fetchAPI(`/wallets/${id}`, { method: 'DELETE' });
    cache.clearAll();
    return data;
  }
};

// ===================================================================
// ATTENDANCE API
// ===================================================================
export const attendanceAPI = {
  /**
   * Get attendance data filtered by status
   * @param {string} status - 'Active', 'Critical', 'Highly-Critical', 'Inactive', or 'all'
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise} Attendance data with pagination and stats
   */
  getAttendance: async (status = 'Active', page = 1, limit = 10) => {
    // Build query string with status parameter
    const queryString = buildQueryString({
      status: status || 'all',
      page,
      limit
    });

    // Create unique cache key
    const cacheKey = `attendance_${status}_${page}_${limit}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('✓ Using cached attendance data:', status);
      return cached;
    }

    try {
      // Fetch from backend API
      console.log('→ Loading attendance data for status:', status);
      const data = await fetchAPI(`/attendance${queryString}`);

      console.log('✓ Attendance data loaded:', data);

      // Cache the result for 2 minutes
      cache.set(cacheKey, data, 2 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('✗ Failed to fetch attendance data:', error);
      throw error;
    }
  }
};
// ═══════════════════════════════════════════════════════════════
// ISSUES API
// ═══════════════════════════════════════════════════════════════
export const issuesAPI = {
  issues: {
    /**
     * Get all issues with optional filtering
     * @param {boolean} refresh - Force refresh from server
     * @param {string} status - Filter by status (UNRESOLVED | RESOLVED)
     * @param {string} priority - Filter by priority (LOW | MEDIUM | HIGH)
     * @returns {Promise<{data: Issue[]}>}
     */
    getIssues: async (refresh = false, status = null, priority = null) => {
      try {
        let url = '/api/issues';
        const params = new URLSearchParams();

        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);

        if (params.toString()) {
          url += '?' + params.toString();
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add auth token if needed
            // 'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch issues: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Create a new issue
     * @param {Object} issueData - { title, description, playerName, priority }
     * @returns {Promise<{data: Issue, message: string}>}
     */
    createIssue: async (issueData) => {
      try {
        const { title, description, playerName, priority = 'MEDIUM' } = issueData;

        // Validation
        if (!title || !description) {
          throw new Error('Title and description are required');
        }

        const response = await fetch('/api/issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({
            title,
            description,
            playerName,
            priority
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create issue');
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Get a specific issue by ID
     * @param {number} issueId - The issue ID
     * @returns {Promise<{data: Issue}>}
     */
    getIssueById: async (issueId) => {
      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch issue: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Update an issue
     * @param {number} issueId - The issue ID
     * @param {Object} updateData - Fields to update
     * @returns {Promise<{data: Issue, message: string}>}
     */
    updateIssue: async (issueId, updateData) => {
      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update issue');
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Mark an issue as resolved
     * @param {number} issueId - The issue ID
     * @returns {Promise<{data: Issue, message: string}>}
     */
    resolveIssue: async (issueId) => {
      try {
        const response = await fetch(`/api/issues/${issueId}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to resolve issue');
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Delete an issue
     * @param {number} issueId - The issue ID
     * @returns {Promise<{message: string}>}
     */
    deleteIssue: async (issueId) => {
      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete issue');
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    /**
     * Get issue statistics
     * @returns {Promise<{data: {total, resolved, unresolved, byPriority}}>}
     */
    getStats: async () => {
      try {
        const response = await fetch('/api/issues/stats/summary', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// SHIFT API
// ═══════════════════════════════════════════════════════════════
export const shiftApi = {

  // get shift record for respective teamsid
  getShifts: async (role) => {
    const response = await fetch(`/api/shifts/${role}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch shifts');
    return await response.json();
  },
  createShift: async (shiftData) => {
    try {
      const {
        teamRole,
        startTime,
        endTime,
        duration,
        isActive } = shiftData;

      // Validation
      if (!teamRole) {
        throw new Error('teamRole are required');
      }

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({

          teamRole,
          // team,
          startTime,
          endTime,
          duration,
          isActive,
          // createdAt
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record shift');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
}
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

  clearCache: () => cache.clearAll(),

  getCacheStatus: () => ({
    items: Object.keys(cache.data).length,
    keys: Object.keys(cache.data)
  })
};

export default api;