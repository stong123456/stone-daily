"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { trackProductEvent } from "@/services/analytics";
import type { AccountSyncSnapshot, StoneSyncPayload } from "@/types/account";
import type { CalmRecord, MarketAlert } from "@/types/market";

export type AccountSyncStatus = "loading" | "unavailable" | "guest" | "syncing" | "synced" | "conflict" | "error";

type EthereumProvider = {
  request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (accounts: string[]) => void) => void;
  removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
};

interface AccountSyncValue {
  available: boolean;
  status: AccountSyncStatus;
  account: AccountSyncSnapshot | null;
  error: string;
  connectWallet: () => Promise<boolean>;
  logout: () => Promise<void>;
  pushLocal: () => Promise<void>;
  pullCloud: () => void;
  mergeCloud: () => Promise<void>;
}

const AccountSyncContext = createContext<AccountSyncValue | null>(null);

function ethereumProvider() { return (window as typeof window & { ethereum?: EthereumProvider }).ethereum; }
function laterRecord<T extends { id: string; createdAt: string }>(left: T, right: T) { return Date.parse(right.createdAt) > Date.parse(left.createdAt) ? right : left; }
function mergeById<T extends { id: string; createdAt: string }>(left: T[], right: T[]) {
  const merged = new Map<string, T>();
  [...left, ...right].forEach((item) => merged.set(item.id, merged.has(item.id) ? laterRecord(merged.get(item.id)!, item) : item));
  return [...merged.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
function mergeAlerts(left: MarketAlert[], right: MarketAlert[]) {
  const merged = new Map<string, MarketAlert>();
  [...left, ...right].forEach((item) => {
    const current = merged.get(item.id);
    if (!current || Date.parse(item.lastTriggeredAt || item.createdAt) >= Date.parse(current.lastTriggeredAt || current.createdAt)) merged.set(item.id, item);
  });
  return [...merged.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
function mergePayload(local: StoneSyncPayload, remote: StoneSyncPayload): StoneSyncPayload {
  return { ...local, updatedAt: new Date().toISOString(), watchlistIds: [...new Set([...local.watchlistIds, ...remote.watchlistIds])], records: mergeById<CalmRecord>(local.records, remote.records), alerts: mergeAlerts(local.alerts, remote.alerts) };
}
function payloadSignature(payload: StoneSyncPayload) { return JSON.stringify({ mode: payload.mode, language: payload.language, watchlistIds: payload.watchlistIds, records: payload.records, alerts: payload.alerts }); }
function hasPersonalData(payload: StoneSyncPayload) { return payload.watchlistIds.length > 0 || payload.records.length > 0 || payload.alerts.length > 0; }
function walletError(reason: unknown) {
  if (reason && typeof reason === "object" && "code" in reason && Number((reason as { code?: unknown }).code) === 4001) return "signature_rejected";
  return reason instanceof Error ? reason.message : "wallet_login_failed";
}

export function AccountSyncProvider({ children }: { children: React.ReactNode }) {
  const app = useAppState();
  const [available, setAvailable] = useState(true);
  const [status, setStatus] = useState<AccountSyncStatus>("loading");
  const [account, setAccount] = useState<AccountSyncSnapshot | null>(null);
  const [error, setError] = useState("");
  const revisionRef = useRef(0);
  const lastSyncedSignature = useRef("");
  const sessionLoaded = useRef(false);

  const currentPayload = useCallback((): StoneSyncPayload => {
    const exported = JSON.parse(app.exportAppData()) as Omit<StoneSyncPayload, "updatedAt">;
    return { ...exported, product: "Stone Daily", version: 1, updatedAt: new Date().toISOString() };
  }, [app]);
  const acceptSnapshot = useCallback((snapshot: AccountSyncSnapshot, payload = snapshot.payload) => {
    revisionRef.current = snapshot.revision;
    lastSyncedSignature.current = payloadSignature(payload);
    setAccount({ ...snapshot, payload });
  }, []);
  const syncPayload = useCallback(async (payload: StoneSyncPayload) => {
    setStatus("syncing");
    setError("");
    try {
      const response = await fetch("/api/account/sync", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload, baseRevision: revisionRef.current }) });
      const result = await response.json() as { account?: AccountSyncSnapshot; conflict?: boolean; error?: string };
      if (response.status === 409 && result.account) { revisionRef.current = result.account.revision; setAccount(result.account); setStatus("conflict"); return; }
      if (!response.ok || !result.account) throw new Error(result.error || "sync_failed");
      acceptSnapshot(result.account, payload);
      setStatus("synced");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "sync_failed"); setStatus("error"); }
  }, [acceptSnapshot]);
  const applySignedInSnapshot = useCallback(async (snapshot: AccountSyncSnapshot) => {
    const local = currentPayload();
    const merged = hasPersonalData(local) ? mergePayload(local, snapshot.payload) : snapshot.payload;
    acceptSnapshot(snapshot, merged);
    app.importAppData(merged);
    if (payloadSignature(merged) !== payloadSignature(snapshot.payload)) await syncPayload(merged); else setStatus("synced");
  }, [acceptSnapshot, app, currentPayload, syncPayload]);

  useEffect(() => {
    if (!app.hydrated || sessionLoaded.current) return;
    sessionLoaded.current = true;
    void fetch("/api/account", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { available?: boolean; authenticated?: boolean; account?: AccountSyncSnapshot };
      setAvailable(result.available !== false);
      if (result.available === false) return setStatus("unavailable");
      if (result.authenticated && result.account) await applySignedInSnapshot(result.account); else setStatus("guest");
    }).catch(() => { setAvailable(false); setStatus("unavailable"); });
  }, [app.hydrated, applySignedInSnapshot]);
  useEffect(() => {
    if (!account || !app.hydrated || status !== "synced") return;
    const payload = currentPayload();
    if (payloadSignature(payload) === lastSyncedSignature.current) return;
    const timer = window.setTimeout(() => void syncPayload(payload), 1_800);
    return () => window.clearTimeout(timer);
  }, [account, app.hydrated, currentPayload, status, syncPayload]);

  const connectWallet = useCallback(async () => {
    const provider = ethereumProvider();
    if (!provider) { setError("wallet_missing"); setStatus("error"); return false; }
    setStatus("syncing");
    setError("");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0];
      const chainHex = await provider.request({ method: "eth_chainId" }) as string;
      const chainId = Number.parseInt(chainHex, 16);
      if (!address || !Number.isSafeInteger(chainId)) throw new Error("invalid_wallet");
      const nonceResponse = await fetch("/api/account/wallet/nonce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, chainId }) });
      const challenge = await nonceResponse.json() as { nonce?: string; message?: string; error?: string };
      if (!nonceResponse.ok || !challenge.nonce || !challenge.message) throw new Error(challenge.error || "wallet_challenge_failed");
      const signature = await provider.request({ method: "personal_sign", params: [challenge.message, address] }) as string;
      const verifyResponse = await fetch("/api/account/wallet/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, chainId, nonce: challenge.nonce, message: challenge.message, signature, payload: currentPayload() }) });
      const result = await verifyResponse.json() as { account?: AccountSyncSnapshot; error?: string };
      if (!verifyResponse.ok || !result.account) throw new Error(result.error || "wallet_login_failed");
      await applySignedInSnapshot(result.account);
      trackProductEvent("wallet_connect", { chainId, admin: result.account.isAdmin });
      return true;
    } catch (reason) { setError(walletError(reason)); setStatus("error"); return false; }
  }, [applySignedInSnapshot, currentPayload]);

  const logout = useCallback(async () => {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
    setAccount(null);
    revisionRef.current = 0;
    lastSyncedSignature.current = "";
    setError("");
    setStatus("guest");
  }, []);
  useEffect(() => {
    const provider = typeof window === "undefined" ? undefined : ethereumProvider();
    if (!account || !provider?.on) return;
    const changed = (accounts: string[]) => { if (!accounts[0] || accounts[0].toLowerCase() !== account.walletAddress.toLowerCase()) void logout(); };
    provider.on("accountsChanged", changed);
    return () => provider.removeListener?.("accountsChanged", changed);
  }, [account, logout]);

  const pushLocal = useCallback(() => { trackProductEvent("sync_action", { action: "push" }); return syncPayload(currentPayload()); }, [currentPayload, syncPayload]);
  const pullCloud = useCallback(() => { if (!account) return; trackProductEvent("sync_action", { action: "pull" }); lastSyncedSignature.current = payloadSignature(account.payload); app.importAppData(account.payload); setStatus("synced"); }, [account, app]);
  const mergeCloud = useCallback(async () => { if (!account) return; trackProductEvent("sync_action", { action: "merge" }); const merged = mergePayload(currentPayload(), account.payload); app.importAppData(merged); await syncPayload(merged); }, [account, app, currentPayload, syncPayload]);

  const value = useMemo(() => ({ available, status, account, error, connectWallet, logout, pushLocal, pullCloud, mergeCloud }), [account, available, connectWallet, error, logout, mergeCloud, pullCloud, pushLocal, status]);
  return <AccountSyncContext.Provider value={value}>{children}</AccountSyncContext.Provider>;
}

export function useAccountSync() {
  const value = useContext(AccountSyncContext);
  if (!value) throw new Error("useAccountSync must be used inside AccountSyncProvider");
  return value;
}
