"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AlertEvent, CalmRecord, MarketAlert, UIMode } from "@/types/market";
import { trackProductEvent } from "@/services/analytics";

export type AppLanguage = "zh" | "en";

interface AppStateValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  watchlistIds: string[];
  toggleWatchlist: (id: string, legacyId?: string) => void;
  hydrated: boolean;
  alerts: MarketAlert[];
  alertEvents: AlertEvent[];
  addAlert: (alert: Omit<MarketAlert, "id" | "createdAt">) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  recordAlertEvent: (event: Omit<AlertEvent, "id" | "createdAt" | "read">) => void;
  markAlertsRead: () => void;
  importAppData: (value: unknown) => { ok: boolean; message: string };
  exportAppData: () => string;
  records: CalmRecord[];
  addRecord: (record: Omit<CalmRecord, "id" | "createdAt">) => void;
  removeRecord: (id: string) => void;
  clearRecords: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const STORAGE = {
  mode: "stone-daily:ui-mode:v1",
  language: "stone-daily:language:v1",
  watchlist: "stone-daily:watchlist:v1",
  records: "stone-daily:calm-records:v1",
  alerts: "stone-daily:alerts:v1",
  alertEvents: "stone-daily:alert-events:v1",
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
  const [language, setLanguage] = useState<AppLanguage>("zh");
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [records, setRecords] = useState<CalmRecord[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedMode = safeRead<UIMode>(STORAGE.mode, "brief");
    const savedLanguage = safeRead<AppLanguage>(STORAGE.language, "zh");
    setMode(["brief", "lens", "calm"].includes(savedMode) ? savedMode : "brief");
    setLanguage(savedLanguage === "en" ? "en" : "zh");
    setWatchlistIds(safeRead<string[]>(STORAGE.watchlist, []));
    setRecords(safeRead<CalmRecord[]>(STORAGE.records, []));
    setAlerts(safeRead<MarketAlert[]>(STORAGE.alerts, []));
    setAlertEvents(safeRead<AlertEvent[]>(STORAGE.alertEvents, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    if (hydrated) window.localStorage.setItem(STORAGE.mode, JSON.stringify(mode));
  }, [hydrated, mode]);

  useEffect(() => {
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    if (hydrated) window.localStorage.setItem(STORAGE.language, JSON.stringify(language));
  }, [hydrated, language]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.watchlist, JSON.stringify(watchlistIds));
  }, [hydrated, watchlistIds]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.records, JSON.stringify(records));
  }, [hydrated, records]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.alerts, JSON.stringify(alerts));
  }, [alerts, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE.alertEvents, JSON.stringify(alertEvents.slice(0, 80)));
  }, [alertEvents, hydrated]);

  const toggleWatchlist = useCallback((id: string, legacyId?: string) => {
    setWatchlistIds((items) => {
      const keys = new Set([id, legacyId].filter((item): item is string => Boolean(item)));
      return items.some((item) => keys.has(item)) ? items.filter((item) => !keys.has(item)) : [...items, id];
    });
    trackProductEvent("watchlist_change");
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

  const addAlert = useCallback((alert: Omit<MarketAlert, "id" | "createdAt">) => {
    setAlerts((items) => [{ ...alert, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...items]);
    trackProductEvent("alert_create", { kind: alert.kind });
  }, []);

  const removeAlert = useCallback((id: string) => setAlerts((items) => items.filter((item) => item.id !== id)), []);
  const toggleAlert = useCallback((id: string) => setAlerts((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item)), []);
  const recordAlertEvent = useCallback((event: Omit<AlertEvent, "id" | "createdAt" | "read">) => {
    setAlertEvents((items) => [{ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false }, ...items].slice(0, 80));
    setAlerts((items) => items.map((item) => item.id === event.alertId ? { ...item, lastTriggeredAt: new Date().toISOString() } : item));
  }, []);
  const markAlertsRead = useCallback(() => setAlertEvents((items) => items.map((item) => ({ ...item, read: true }))), []);

  const exportAppData = useCallback(() => JSON.stringify({
    product: "Stone Daily",
    version: 1,
    exportedAt: new Date().toISOString(),
    mode,
    language,
    watchlistIds,
    records,
    alerts,
  }, null, 2), [alerts, language, mode, records, watchlistIds]);

  const importAppData = useCallback((value: unknown) => {
    if (!value || typeof value !== "object") return { ok: false, message: "同步文件格式无效" };
    const payload = value as { version?: number; mode?: UIMode; language?: AppLanguage; watchlistIds?: unknown; records?: unknown; alerts?: unknown };
    if (payload.version !== 1 || !Array.isArray(payload.watchlistIds) || !Array.isArray(payload.alerts)) return { ok: false, message: "不是可识别的 Stone Daily v1 同步文件" };
    setWatchlistIds(payload.watchlistIds.filter((item): item is string => typeof item === "string"));
    setAlerts((payload.alerts as MarketAlert[]).filter((item) => item && typeof item.id === "string" && typeof item.symbol === "string"));
    if (Array.isArray(payload.records)) setRecords(payload.records as CalmRecord[]);
    if (payload.mode && ["brief", "lens", "calm"].includes(payload.mode)) setMode(payload.mode);
    if (payload.language === "zh" || payload.language === "en") setLanguage(payload.language);
    return { ok: true, message: "自选、提醒和本地记录已导入" };
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, language, setLanguage, watchlistIds, toggleWatchlist, hydrated, alerts, alertEvents, addAlert, removeAlert, toggleAlert, recordAlertEvent, markAlertsRead, importAppData, exportAppData, records, addRecord, removeRecord, clearRecords }),
    [addAlert, addRecord, alertEvents, alerts, clearRecords, exportAppData, hydrated, importAppData, language, markAlertsRead, mode, recordAlertEvent, records, removeAlert, removeRecord, toggleAlert, toggleWatchlist, watchlistIds],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
