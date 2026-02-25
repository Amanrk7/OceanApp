const API_URL = '/api';

export const api = {
    // ═══════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════

    login: async (username, password) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        return data;
    },

    logout: async () => {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    },

    getCurrentUser: async () => {
        const res = await fetch(`${API_URL}/user`, {
            credentials: 'include'
        });
        if (!res.ok) return null;
        return res.json();
    },

    // ═══════════════════════════════════════
    // DASHBOARD & ANALYTICS
    // ═══════════════════════════════════════

    getStats: async () => {
        const res = await fetch(`${API_URL}/admin/stats`, {
            credentials: 'include'
        });
        return res.json();
    },

    getTrends: async () => {
        const res = await fetch(`${API_URL}/admin/trends`, {
            credentials: 'include'
        });
        return res.json();
    },

    getTopPlayers: async (limit = 10) => {
        const res = await fetch(`${API_URL}/admin/top-players?limit=${limit}`, {
            credentials: 'include'
        });
        return res.json();
    },

    // ═══════════════════════════════════════
    // USER MANAGEMENT
    // ═══════════════════════════════════════

    getUsers: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/admin/users?${query}`, {
            credentials: 'include'
        });
        return res.json();
    },

    getUser: async (id) => {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            credentials: 'include'
        });
        return res.json();
    },

    updateUser: async (id, data) => {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return result;
    },

    suspendUser: async (id, suspend, reason) => {
        const res = await fetch(`${API_URL}/admin/users/${id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ suspend, reason })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    adjustBalance: async (id, amount, reason) => {
        const res = await fetch(`${API_URL}/admin/users/${id}/adjust-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ amount, reason })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // ═══════════════════════════════════════
    // TRANSACTION MANAGEMENT
    // ═══════════════════════════════════════

    getTransactions: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/admin/transactions?${query}`, {
            credentials: 'include'
        });
        return res.json();
    },

    reviewTransaction: async (id, approve, notes) => {
        const res = await fetch(`${API_URL}/admin/transactions/${id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ approve, notes })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // ═══════════════════════════════════════
    // BONUS MANAGEMENT
    // ═══════════════════════════════════════

    getBonuses: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/admin/bonuses?${query}`, {
            credentials: 'include'
        });
        return res.json();
    },

    createBonus: async (userIds, amount, reason, expiresAt) => {
        const res = await fetch(`${API_URL}/admin/bonuses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userIds, amount, reason, expiresAt })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    deleteBonus: async (id) => {
        const res = await fetch(`${API_URL}/admin/bonuses/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // ═══════════════════════════════════════
    // ACTIVITY LOGS
    // ═══════════════════════════════════════

    getLogs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/admin/logs?${query}`, {
            credentials: 'include'
        });
        return res.json();
    },

    // ═══════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════

    getSettings: async () => {
        const res = await fetch(`${API_URL}/admin/settings`, {
            credentials: 'include'
        });
        return res.json();
    },

    updateSettings: async (settings) => {
        const res = await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(settings)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // ═══════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════

    exportUsers: () => {
        window.open(`${API_URL}/admin/export/users`, '_blank');
    },

    exportTransactions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        window.open(`${API_URL}/admin/export/transactions?${query}`, '_blank');
    }
};