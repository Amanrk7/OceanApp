import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getStoreId = () => localStorage.getItem('__obStoreId') || '1';

async function apiFetch(path) {
  const token = localStorage.getItem('authToken');
  const res = await window.fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Store-Id': getStoreId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function computeCrossStoreAdjustments(reconData, crossStoreData) {
  const myStoreId = getStoreId();
  let totalCrossGamePts    = 0;
  let totalCrossWalletAmt  = 0;
  const crossGameInfo   = {};
  const crossWalletInfo = {};

  if (crossStoreData) {
    // ── Existing transaction-based cross-store logic ─────────────────
    (crossStoreData.games || []).forEach(g => {
      const myPts   = g.usageByStore?.[String(myStoreId)]?.netPtsDeducted ?? 0;
      const otherPts = g.totalDeducted - myPts;
      totalCrossGamePts += otherPts;
      crossGameInfo[g.gameId] = { ...g, myPts, otherPts };
    });

    (crossStoreData.wallets || []).forEach(w => {
      const myChange    = w.usageByStore?.[String(myStoreId)]?.netWalletChange ?? 0;
      const otherChange = w.totalNetChange - myChange;
      totalCrossWalletAmt += otherChange;
      crossWalletInfo[w.walletId] = { ...w, myChange, otherChange };
    });

    // ── NEW: Also account for cross-store expenses, takeouts, reloads ─
    const summary = crossStoreData.crossStoreSummary ?? {};
    const crossExpenseWallet  = summary.totalCrossWalletExpenses  ?? 0;
    const crossTakeoutWallet  = summary.totalCrossWalletTakeouts  ?? 0;
    const crossPtsReloaded    = summary.totalCrossPointsReloaded  ?? 0;

    // These reduce shared wallet balances and game stock — include in adjustment
    totalCrossWalletAmt -= (crossExpenseWallet + crossTakeoutWallet);
    totalCrossGamePts   -= crossPtsReloaded;  // reloads by others INCREASE stock (reduce deduction)
    // ── NEW: mark wallets/games touched by cross-store expenses & takeouts
    // so they are NOT misidentified as admin-edited ──────────────────────
    (summary.affectedWalletIds ?? []).forEach(wId => {
      const key = String(wId);
      if (!crossWalletInfo[key]) {
        crossWalletInfo[key] = { walletId: wId, myChange: 0, otherChange: 0 };
      }
    });

    (summary.affectedGameIds ?? []).forEach(gId => {
      const key = String(gId);
      if (!crossGameInfo[key]) {
        crossGameInfo[key] = { gameId: gId, myPts: 0, otherPts: 0 };
      }
    });
  }

  const walletDisc = reconData.walletDiscrepancy ?? 0;
  const gameDisc   = reconData.gameDiscrepancy   ?? 0;

  const crossAdjWalletDisc = parseFloat((walletDisc - totalCrossWalletAmt).toFixed(2));
  const crossAdjGameDisc   = Math.round(gameDisc + totalCrossGamePts);

  const crossAdjWalletBal = Math.abs(crossAdjWalletDisc) < 0.02;
  const crossAdjGameBal   = Math.abs(crossAdjGameDisc)   < 2;
  const crossAdjBalanced  = reconData.hasStartSnapshot
    ? (crossAdjWalletBal && crossAdjGameBal)
    : null;

  const hasCrossStore =
    Math.abs(totalCrossGamePts) > 0 || Math.abs(totalCrossWalletAmt) > 0.01;

  return {
    hasCrossStore,
    totalCrossGamePts,
    totalCrossWalletAmt,
    crossGameInfo,
    crossWalletInfo,
    crossAdjWalletDisc,
    crossAdjGameDisc,
    crossAdjWalletBal,
    crossAdjGameBal,
    crossAdjBalanced,
  };
}

export function useLiveReconciliation(shiftId, shiftStartTime) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const lastFetchRef          = useRef(0);
  const debounceRef           = useRef(null);

  const fetchAll = useCallback(async (force = false) => {
    if (!shiftId) return;

    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchAll(true), 2000);
      return;
    }
    lastFetchRef.current = now;
    setLoading(true);
    setError(null);

    try {
      // ── 1. Core reconciliation ──────────────────────────────────
      const reconJson = await apiFetch(`/shifts/${shiftId}/live-reconciliation`);
      const reconData = reconJson.data;

      // ── 2. Cross-store usage (uses shiftStartTime if provided) ──
      const startISO = shiftStartTime
        ? encodeURIComponent(new Date(shiftStartTime).toISOString())
        : encodeURIComponent(
            reconData.capturedAt
              ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          );
      const toISO = encodeURIComponent(new Date().toISOString());

      const crossJson = await apiFetch(
        `/shifts/shared-resource-usage?fromDate=${startISO}&toDate=${toISO}`
      ).catch(() => ({ data: null }));

      const crossStoreData = crossJson?.data ?? null;

      // ── 3. Merge cross-store adjustments into data ──────────────
      const crossAdj = computeCrossStoreAdjustments(reconData, crossStoreData);

      setData({
        ...reconData,
        crossStoreData,
        ...crossAdj,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shiftId, shiftStartTime]);

  // Initial fetch
  useEffect(() => {
    if (shiftId) fetchAll(true);
  }, [shiftId, fetchAll]);

  // SSE re-fetch on any balance change
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
  'wallet_updated',
  'game_updated',
  'transaction_approved',   // cashout partial/full approval
  'expense_updated',        // expense payment recorded
  'takeout_updated',        // profit takeout added/edited
];
        if (triggers.includes(msg.type)) fetchAll();
      } catch (_) {}
    };
    return () => {
      sse.close();
      clearTimeout(debounceRef.current);
    };
  }, [shiftId, fetchAll]);

  return { data, loading, error, refetch: () => fetchAll(true) };
}
