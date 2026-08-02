const EVENTS = new Set(["page_view", "asset_open", "watchlist_change", "alert_create", "digest_copy", "calm_open", "wallet_connect", "sync_action"]);

export function trackProductEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || !EVENTS.has(name)) return;
  const payload = JSON.stringify({ name, path: window.location.pathname, properties, referrer: document.referrer, timestamp: new Date().toISOString() });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
  else void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
}
