import { createContext, useContext, useState, useCallback } from 'react';
import {
  loadDays, saveDay as persistDay,
  loadWeights, saveWeight as persistWeight,
  createDefaultDay, INITIAL_WEIGHT
} from '../utils/data';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [days,    setDays]    = useState(() => loadDays());
  const [weights, setWeights] = useState(() => loadWeights());

  const getDay = useCallback((dateStr) => {
    return days[dateStr] || createDefaultDay();
  }, [days]);

  const updateDay = useCallback((dateStr, data) => {
    persistDay(dateStr, data);
    setDays(prev => ({ ...prev, [dateStr]: { ...data, saved: true } }));
  }, []);

  const getWeight = useCallback((weekIndex) => {
    return weights[weekIndex] ?? (weekIndex === 0 ? INITIAL_WEIGHT : '');
  }, [weights]);

  const updateWeight = useCallback((weekIndex, weight) => {
    persistWeight(weekIndex, weight);
    setWeights(prev => ({ ...prev, [weekIndex]: weight }));
  }, []);

  return (
    <AppContext.Provider value={{ days, weights, getDay, updateDay, getWeight, updateWeight }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
