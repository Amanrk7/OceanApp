import { createContext, useState, useEffect, useCallback, useRef } from "react";

const ShiftStatusContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const getStoreId = () => parseInt(localStorage.getItem("__obStoreId") || "1", 10);

const SHIFT_EVENT_TYPES = [
  "shift_checkin",
  "shift_ended",
  "shift_checkout",
  "shift_started",
  "shift_rated",
];

const ShiftStatusProvider = ({ children }) => {
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(true); // true until first fetch resolves
  const [activeShiftData, setActiveShiftData] = useState(null);

  const sseRef = useRef(null);
  const retryTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const refreshShiftStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        if (isMountedRef.current) {
          setShiftActive(false);
          setActiveShiftData(null);
        }
        return false;
      }

      const storeId = getStoreId();
      const res = await fetch(`${API_BASE}/shifts/my-status`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Store-Id": String(storeId),
        },
      });

      if (!res.ok) {
        if (isMountedRef.current) {
          setShiftActive(false);
          setActiveShiftData(null);
        }
        return false;
      }

      const json = await res.json();
      if (!isMountedRef.current) return false;

      // json.data = { [storeId]: shift | null }
      const storeShift = json.data?.[storeId];

      if (storeShift && storeShift.isActive) {
        setShiftActive(true);
        setActiveShiftData(storeShift);
        return true;
      }

      // Fallback: check every store key (covers storeId type mismatches)
      const allShifts = Object.values(json.data || {});
      const anyActive = allShifts.find((s) => s && s.isActive);
      setShiftActive(!!anyActive);
      setActiveShiftData(anyActive || null);
      return !!anyActive;
    } catch (err) {
      console.error("ShiftStatusContext: fetch error", err);
      if (isMountedRef.current) {
        setShiftActive(false);
        setActiveShiftData(null);
      }
      return false;
    } finally {
      // Always clear the loading flag after the first attempt
      if (isMountedRef.current) {
        setShiftLoading(false);
      }
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token || !isMountedRef.current) return;

    // Clean up any stale connection first
    if (sseRef.current) {
      try { sseRef.current.close(); } catch (_) {}
      sseRef.current = null;
    }

    try {
      // EventSource doesn't support custom headers — pass token as query param.
      // The backend already reads req.query.token in the /api/tasks/events handler.
      const url = `${API_BASE}/tasks/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url, { withCredentials: true });
      sseRef.current = es;

      // The backend broadcasts all non-named messages as plain `data:` payloads
      // (without an `event:` prefix), so we listen on `onmessage`.
      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (SHIFT_EVENT_TYPES.includes(msg.type)) {
            refreshShiftStatus();
          }
        } catch (_) {
          // Non-JSON ping frames (" : ping") — ignore safely
        }
      };

      es.onerror = () => {
        try { es.close(); } catch (_) {}
        sseRef.current = null;
        if (!isMountedRef.current) return;
        // Back-off reconnect: retry after 5 s
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(connectSSE, 5_000);
      };
    } catch (err) {
      console.error("ShiftStatusContext: SSE setup error", err);
      // Schedule a retry so we don't go silent
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(connectSSE, 5_000);
    }
  }, [refreshShiftStatus]);

  // ── Boot + cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Immediate fetch so pages never wait for SSE
    refreshShiftStatus();

    // 2. SSE for instant real-time updates (shift start / end across tabs)
    connectSSE();

    // 3. Polling as a safety net (covers SSE gaps, tab visibility, network blips)
    pollTimerRef.current = setInterval(refreshShiftStatus, 30_000);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollTimerRef.current);
      clearTimeout(retryTimerRef.current);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (_) {}
        sseRef.current = null;
      }
    };
  }, [refreshShiftStatus, connectSSE]);

  return (
    <ShiftStatusContext.Provider
      value={{
        shiftActive,
        setShiftActive,
        shiftLoading,      // true only during the very first fetch — use to avoid flashing "locked"
        activeShiftData,   // the full shift object if active, null otherwise
        refreshShiftStatus, // call after login/logout to re-sync immediately
      }}
    >
      {children}
    </ShiftStatusContext.Provider>
  );
};

export { ShiftStatusContext, ShiftStatusProvider };
