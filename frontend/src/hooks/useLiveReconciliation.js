import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useLiveReconciliation(shiftId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const debounceRef = useRef(null);

  const fetch = useCallback(async (force = false) => {
    if (!shiftId) return;

    // Debounce: don't fetch more than once per 2 seconds
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      // Schedule a deferred fetch
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetch(true), 2000);
      return;
    }

    lastFetchRef.current = now;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const storeId = localStorage.getItem('__obStoreId') || '1';
      const res = await window.fetch(
        `${API_BASE}/shifts/${shiftId}/live-reconciliation`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Id': storeId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  // Initial fetch
  useEffect(() => {
    if (shiftId) fetch(true);
  }, [shiftId, fetch]);

  // SSE listener — re-fetch on any balance change
  useEffect(() => {
    if (!shiftId) return;
    const token = localStorage.getItem('authToken');
    const sse = new EventSource(
      `${API_BASE}/tasks/events?token=${encodeURIComponent(token || '')}`,
      { withCredentials: true }
    );

    sse.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const triggers = [
          'reconciliation_changed',
          'shared_game_updated',
          'shared_wallet_updated',
        ];
        if (triggers.includes(msg.type)) {
          fetch(); // debounced re-fetch
        }
      } catch (_) {}
    };

    return () => {
      sse.close();
      clearTimeout(debounceRef.current);
    };
  }, [shiftId, fetch]);

  return { data, loading, error, refetch: () => fetch(true) };
}
