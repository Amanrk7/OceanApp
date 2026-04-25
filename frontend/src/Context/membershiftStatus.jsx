import { createContext, useState, useEffect, useCallback } from "react";

const ShiftStatusContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const getStoreId = () => parseInt(localStorage.getItem("__obStoreId") || "1", 10);

const ShiftStatusProvider = ({ children }) => {
    const [shiftActive, setShiftActive] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(true); // true until first check completes

    // Call this any time you want to re-sync shift status (e.g. after login)
    const refreshShiftStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setShiftActive(false);
                return;
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
                setShiftActive(false);
                return;
            }

            const data = await res.json();

            // data.data is { [storeId]: shift | null }
            const storeShift = data.data?.[storeId];

            if (storeShift && storeShift.isActive) {
                setShiftActive(true);
            } else {
                // Check all store keys in case storeId key mismatch
                const anyActive = Object.values(data.data || {}).some(
                    (s) => s && s.isActive
                );
                setShiftActive(anyActive);
            }
        } catch (err) {
            console.error("ShiftStatusContext: failed to fetch shift status", err);
            setShiftActive(false);
        } finally {
            setShiftLoading(false);
        }
    }, []);

    // Fetch on mount — runs once when the app loads, regardless of which page opens first
    useEffect(() => {
        refreshShiftStatus();
    }, [refreshShiftStatus]);

    return (
        <ShiftStatusContext.Provider
            value={{
                shiftActive,
                setShiftActive,
                shiftLoading,      // use this to avoid showing "locked" while status is still loading
                refreshShiftStatus, // call after login/logout to re-sync
            }}
        >
            {children}
        </ShiftStatusContext.Provider>
    );
};

export { ShiftStatusContext, ShiftStatusProvider };
