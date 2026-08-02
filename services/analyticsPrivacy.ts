import { createHmac } from "node:crypto";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "asset_open",
  "watchlist_change",
  "alert_create",
  "digest_copy",
  "calm_open",
  "wallet_connect",
  "sync_action",
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];

const EVENT_SET = new Set<string>(ANALYTICS_EVENT_NAMES);

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && EVENT_SET.has(value);
}

export function sanitizeAnalyticsPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  const clean = value.split(/[?#]/, 1)[0].replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160);
  return clean || "/";
}

export function coarseDevice(userAgent: string) {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function coarseBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/chrome\//i.test(userAgent)) return "Chrome";
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return "Safari";
  return "Other";
}

export function publicReferrerHost(value: unknown, ownHost: string) {
  if (typeof value !== "string" || value.length > 500) return "direct";
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === ownHost.toLowerCase().replace(/^www\./, "")) return "direct";
    return host.slice(0, 120);
  } catch {
    return "direct";
  }
}

export function anonymizedVisitorKey(input: { secret: string; ip: string; userAgent: string; at?: Date }) {
  const at = input.at ?? new Date();
  const month = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  const visitor = createHmac("sha256", input.secret).update(`${month}|${input.ip}|${input.userAgent}`).digest("hex");
  const halfHour = Math.floor(at.getTime() / 1_800_000);
  const session = createHmac("sha256", input.secret).update(`${halfHour}|${input.ip}|${input.userAgent}`).digest("hex");
  return { visitor: visitor.slice(0, 40), session: session.slice(0, 40) };
}

export function sanitizeAnalyticsProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean: Record<string, string | number | boolean> = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, 12)) {
    const key = rawKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (!key) continue;
    if (typeof rawValue === "boolean") clean[key] = rawValue;
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) clean[key] = rawValue;
    else if (typeof rawValue === "string") clean[key] = rawValue.slice(0, 120);
  }
  return clean;
}
