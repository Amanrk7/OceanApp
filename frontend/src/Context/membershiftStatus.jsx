// Context/membershiftStatus.jsx - replace your existing context

import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export const ShiftStatusContext = createContext();

export function ShiftStatusProvider({ children }) {
  const [shiftActive, setShiftActive] = useState(() => {
    // Optimistic load from localStorage — avoids flash on reload
    const cached = localStorage.getItem('shiftActive');
    return cached === 'true';
  });
  const [shiftLoading, setShiftLoading] = useState(true);

  const checkShift = useCallback(async () => {
    try {
      // Get current user's role first
      const userRes = await api.auth.getUser();
      const role = userRes?.data?.role || userRes?.role;
      if (!role) {
        setShiftActive(false);
        localStorage.setItem('shiftActive', 'false');
        return;
      }

      const res = await api.shifts.getActiveShift(role);
      const isActive = !!res?.data;
      setShiftActive(isActive);
      localStorage.setItem('shiftActive', String(isActive));
    } catch {
      // On error, trust the cached value rather than locking out
      const cached = localStorage.getItem('shiftActive');
      setShiftActive(cached === 'true');
    } finally {
      setShiftLoading(false);
    }
  }, []);

  useEffect(() => {
    checkShift();
  }, [checkShift]);

  const updateShiftActive = (val) => {
    setShiftActive(val);
    localStorage.setItem('shiftActive', String(val));
  };

  return (
    <ShiftStatusContext.Provider value={{
      shiftActive,
      shiftLoading,
      setShiftActive: updateShiftActive,
      recheckShift: checkShift,
    }}>
      {children}
    </ShiftStatusContext.Provider>
  );
}
