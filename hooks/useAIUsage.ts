"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { aiDailyLimit, beijingDateKey, normalizeAIUsage, type AIUsageState } from "@/services/aiUsage";

const storageKey = "stone-daily:ai-usage:v1";
const eventName = "stone-daily:ai-usage";

function readUsage(): AIUsageState {
  if (typeof window === "undefined") return { date: beijingDateKey(), count: 0 };
  try {
    return normalizeAIUsage(JSON.parse(window.localStorage.getItem(storageKey) || "null"));
  } catch {
    return normalizeAIUsage(null);
  }
}

export function useAIUsage() {
  const { account } = useAccountSync();
  const [usage, setUsage] = useState<AIUsageState>(() => ({ date: beijingDateKey(), count: 0 }));

  useEffect(() => {
    const sync = () => setUsage(readUsage());
    sync();
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const limit = aiDailyLimit(Boolean(account));
  const remaining = Math.max(0, limit - usage.count);
  const consume = useCallback(() => {
    const current = readUsage();
    const currentLimit = aiDailyLimit(Boolean(account));
    if (current.count >= currentLimit) return false;
    const next = { ...current, count: current.count + 1 };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setUsage(next);
    window.dispatchEvent(new Event(eventName));
    return true;
  }, [account]);

  return useMemo(() => ({
    count: usage.count,
    limit,
    remaining,
    signedIn: Boolean(account),
    canUse: remaining > 0,
    consume,
  }), [account, consume, limit, remaining, usage.count]);
}
