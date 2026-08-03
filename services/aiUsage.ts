export type AIUsageState = { date: string; count: number };

export function beijingDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function normalizeAIUsage(value: unknown, dateKey = beijingDateKey()): AIUsageState {
  if (!value || typeof value !== "object") return { date: dateKey, count: 0 };
  const candidate = value as { date?: unknown; count?: unknown };
  if (candidate.date !== dateKey || !Number.isFinite(candidate.count) || Number(candidate.count) < 0) return { date: dateKey, count: 0 };
  return { date: dateKey, count: Math.floor(Number(candidate.count)) };
}

export function aiDailyLimit(signedIn: boolean, pro = false) {
  if (pro) return Number.POSITIVE_INFINITY;
  return signedIn ? 10 : 3;
}
