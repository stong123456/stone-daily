"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CalmRecord, UIMode } from "@/types/market";

interface AppStateValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  watchlistIds: string[];
  toggleWatchlist: (id: string) => void;
  records: CalmRecord[];
  addRecord: (record: Omit<CalmRecord, "id" | "createdAt">) => void;
  removeRecord: (id: string) => void;
  clearRecords: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const STORAGE = {
  mode: "stone-daily:ui-mode:v1",
  watchlist: "stone-daily:watchlist:v1",
  records: "stone-daily:calm-records:v1",
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UIMode>("brief");
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [records, setRecords] = useState<CalmRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedMode = safeRead<UIMode>(STORAGE.mode, "brief");
    setMode(["brief", "lens", "calm"].includes(savedMode) ? savedMode : "brief");
    setWatchlistIds(safeRead<string[]>(STORAGE.watchlist, []));
    setRecords(safeRead<CalmRecord[]>(STORAGE.records, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    if (hydrated) window.localStorage.setItem(STORAGE.mode, JSON.stringify(mode));
  }, [hydrated, mode]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.watchlist, JSON.stringify(watchlistIds));
  }, [hydrated, watchlistIds]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.records, JSON.stringify(records));
  }, [hydrated, records]);

  const toggleWatchlist = useCallback((id: string) => {
    setWatchlistIds((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }, []);

  const addRecord = useCallback((record: Omit<CalmRecord, "id" | "createdAt">) => {
    setRecords((items) => [
      { ...record, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ...items,
    ]);
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((items) => items.filter((record) => record.id !== id));
  }, []);

  const clearRecords = useCallback(() => setRecords([]), []);

  const value = useMemo(
    () => ({ mode, setMode, watchlistIds, toggleWatchlist, records, addRecord, removeRecord, clearRecords }),
    [addRecord, clearRecords, mode, records, removeRecord, toggleWatchlist, watchlistIds],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
