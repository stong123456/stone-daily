import "server-only";

import { Pool } from "pg";
import type { NextRequest } from "next/server";
import type { AdminAnalyticsBreakdown, AdminAnalyticsOverview } from "@/types/admin";
import {
  anonymizedVisitorKey,
  coarseBrowser,
  coarseDevice,
  publicReferrerHost,
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
} from "@/services/analyticsPrivacy";

const RETENTION_DAYS = 180;
type AnalyticsGlobal = typeof globalThis & {
  __stoneAnalyticsPool?: Pool;
  __stoneAnalyticsSchema?: Promise<void>;
  __stoneAnalyticsCleanupAt?: number;
  __stoneAnalyticsLimits?: Map<string, { count: number; resetsAt: number }>;
};

const analyticsGlobal = globalThis as AnalyticsGlobal;
const analyticsLimits = analyticsGlobal.__stoneAnalyticsLimits ?? new Map<string, { count: number; resetsAt: number }>();
analyticsGlobal.__stoneAnalyticsLimits = analyticsLimits;

function databaseUrl() { return process.env.DATABASE_URL?.trim() || ""; }
function analyticsSecret() { return process.env.STONE_ANALYTICS_SALT?.trim() || process.env.STONE_SESSION_SECRET?.trim() || ""; }
export function analyticsAvailable() { return Boolean(databaseUrl() && analyticsSecret().length >= 32); }

function analyticsPool() {
  if (!analyticsAvailable()) throw new Error("analytics_unavailable");
  if (!analyticsGlobal.__stoneAnalyticsPool) {
    analyticsGlobal.__stoneAnalyticsPool = new Pool({
      connectionString: databaseUrl(),
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return analyticsGlobal.__stoneAnalyticsPool;
}

async function ensureAnalyticsSchema() {
  if (!analyticsGlobal.__stoneAnalyticsSchema) {
    analyticsGlobal.__stoneAnalyticsSchema = analyticsPool().query(`
      CREATE TABLE IF NOT EXISTS stone_analytics_events (
        id BIGSERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        path TEXT NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        visitor_hash TEXT NOT NULL,
        session_hash TEXT NOT NULL,
        referrer_host TEXT NOT NULL DEFAULT 'direct',
        device_type TEXT NOT NULL,
        browser_family TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'unknown',
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS stone_analytics_received_at_idx ON stone_analytics_events (received_at DESC);
      CREATE INDEX IF NOT EXISTS stone_analytics_event_time_idx ON stone_analytics_events (event_name, received_at DESC);
      CREATE INDEX IF NOT EXISTS stone_analytics_path_time_idx ON stone_analytics_events (path, received_at DESC) WHERE event_name = 'page_view';
      CREATE INDEX IF NOT EXISTS stone_analytics_visitor_time_idx ON stone_analytics_events (visitor_hash, received_at DESC);
    `).then(() => undefined).catch((error) => {
      analyticsGlobal.__stoneAnalyticsSchema = undefined;
      throw error;
    });
  }
  return analyticsGlobal.__stoneAnalyticsSchema;
}

function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

function allowAnalyticsEvent(visitor: string) {
  const now = Date.now();
  if (analyticsLimits.size > 10_000) {
    for (const [key, value] of analyticsLimits) if (value.resetsAt <= now) analyticsLimits.delete(key);
  }
  const current = analyticsLimits.get(visitor);
  if (!current || current.resetsAt <= now) {
    analyticsLimits.set(visitor, { count: 1, resetsAt: now + 60_000 });
    return true;
  }
  if (current.count >= 120) return false;
  current.count += 1;
  return true;
}

export async function recordAnalyticsEvent(request: NextRequest, input: {
  name: AnalyticsEventName;
  path: string;
  properties?: unknown;
  referrer?: unknown;
}) {
  if (!analyticsAvailable()) return false;
  await ensureAnalyticsSchema();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "unknown";
  const identity = anonymizedVisitorKey({ secret: analyticsSecret(), ip: requestIp(request), userAgent });
  if (!allowAnalyticsEvent(identity.session)) return false;
  const language = (request.headers.get("accept-language")?.split(",")[0] || "unknown").slice(0, 24);
  const referrer = publicReferrerHost(input.referrer ?? request.headers.get("referer"), request.nextUrl.hostname);
  await analyticsPool().query(`
    INSERT INTO stone_analytics_events
      (event_name, path, properties, visitor_hash, session_hash, referrer_host, device_type, browser_family, language)
    VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
  `, [
    input.name,
    input.path,
    JSON.stringify(sanitizeAnalyticsProperties(input.properties)),
    identity.visitor,
    identity.session,
    referrer,
    coarseDevice(userAgent),
    coarseBrowser(userAgent),
    language,
  ]);

  const now = Date.now();
  if (!analyticsGlobal.__stoneAnalyticsCleanupAt || now - analyticsGlobal.__stoneAnalyticsCleanupAt > 24 * 60 * 60_000) {
    analyticsGlobal.__stoneAnalyticsCleanupAt = now;
    void analyticsPool().query("DELETE FROM stone_analytics_events WHERE received_at < NOW() - ($1::int * INTERVAL '1 day')", [RETENTION_DAYS]).catch(() => undefined);
  }
  return true;
}

function emptyAnalytics(rangeDays: number): AdminAnalyticsOverview {
  return {
    available: analyticsAvailable(),
    rangeDays,
    today: { visitors: 0, pageViews: 0, events: 0 },
    period: { visitors: 0, pageViews: 0, events: 0 },
    previousPeriod: { visitors: 0, pageViews: 0, events: 0 },
    trend: [],
    topPages: [],
    sources: [],
    devices: [],
    browsers: [],
    features: [],
    hourly: [],
    retentionDays: RETENTION_DAYS,
  };
}

function breakdown(rows: Array<{ label: string; value: string }>): AdminAnalyticsBreakdown[] {
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0);
  return rows.map((row) => ({ label: row.label, value: Number(row.value), share: total ? Number(((Number(row.value) / total) * 100).toFixed(1)) : 0 }));
}

export async function readAdminAnalytics(rangeDays: number): Promise<AdminAnalyticsOverview> {
  const days = [7, 14, 30, 90].includes(rangeDays) ? rangeDays : 14;
  if (!analyticsAvailable()) return emptyAnalytics(days);
  await ensureAnalyticsSchema();
  const db = analyticsPool();
  const [todayResult, periodResult, previousResult, trendResult, pagesResult, sourcesResult, devicesResult, browsersResult, featuresResult, hourlyResult] = await Promise.all([
    db.query<{ visitors: string; page_views: string; events: string }>(`
      SELECT COUNT(DISTINCT visitor_hash)::text AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views,
        COUNT(*)::text AS events
      FROM stone_analytics_events
      WHERE (received_at AT TIME ZONE 'Asia/Shanghai')::date = (NOW() AT TIME ZONE 'Asia/Shanghai')::date
    `),
    db.query<{ visitors: string; page_views: string; events: string }>(`
      SELECT COUNT(DISTINCT visitor_hash)::text AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views,
        COUNT(*)::text AS events
      FROM stone_analytics_events WHERE received_at >= NOW() - ($1::int * INTERVAL '1 day')
    `, [days]),
    db.query<{ visitors: string; page_views: string; events: string }>(`
      SELECT COUNT(DISTINCT visitor_hash)::text AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views,
        COUNT(*)::text AS events
      FROM stone_analytics_events
      WHERE received_at >= NOW() - ($1::int * 2 * INTERVAL '1 day')
        AND received_at < NOW() - ($1::int * INTERVAL '1 day')
    `, [days]),
    db.query<{ date: string; visitors: string; page_views: string }>(`
      WITH days AS (
        SELECT generate_series(
          (NOW() AT TIME ZONE 'Asia/Shanghai')::date - ($1::int - 1),
          (NOW() AT TIME ZONE 'Asia/Shanghai')::date,
          INTERVAL '1 day'
        )::date AS day
      ), stats AS (
        SELECT (received_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
          COUNT(DISTINCT visitor_hash) AS visitors,
          COUNT(*) FILTER (WHERE event_name = 'page_view') AS page_views
        FROM stone_analytics_events
        WHERE received_at >= NOW() - ($1::int * INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(stats.visitors, 0)::text AS visitors,
        COALESCE(stats.page_views, 0)::text AS page_views
      FROM days LEFT JOIN stats USING (day) ORDER BY days.day
    `, [days]),
    db.query<{ path: string; views: string; visitors: string }>(`
      SELECT path, COUNT(*)::text AS views, COUNT(DISTINCT visitor_hash)::text AS visitors
      FROM stone_analytics_events
      WHERE event_name = 'page_view' AND received_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY path ORDER BY COUNT(*) DESC, path LIMIT 12
    `, [days]),
    db.query<{ label: string; value: string }>(`
      SELECT referrer_host AS label, COUNT(DISTINCT visitor_hash)::text AS value
      FROM stone_analytics_events
      WHERE event_name = 'page_view' AND received_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY referrer_host ORDER BY COUNT(DISTINCT visitor_hash) DESC LIMIT 8
    `, [days]),
    db.query<{ label: string; value: string }>(`
      SELECT device_type AS label, COUNT(DISTINCT visitor_hash)::text AS value
      FROM stone_analytics_events
      WHERE event_name = 'page_view' AND received_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY device_type ORDER BY COUNT(DISTINCT visitor_hash) DESC
    `, [days]),
    db.query<{ label: string; value: string }>(`
      SELECT browser_family AS label, COUNT(DISTINCT visitor_hash)::text AS value
      FROM stone_analytics_events
      WHERE event_name = 'page_view' AND received_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY browser_family ORDER BY COUNT(DISTINCT visitor_hash) DESC LIMIT 6
    `, [days]),
    db.query<{ name: string; count: string }>(`
      SELECT event_name AS name, COUNT(*)::text AS count
      FROM stone_analytics_events
      WHERE event_name <> 'page_view' AND received_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY event_name ORDER BY COUNT(*) DESC
    `, [days]),
    db.query<{ hour: string; visitors: string; page_views: string }>(`
      SELECT TO_CHAR(date_trunc('hour', received_at AT TIME ZONE 'Asia/Shanghai'), 'MM-DD HH24:00') AS hour,
        COUNT(DISTINCT visitor_hash)::text AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views
      FROM stone_analytics_events
      WHERE received_at >= NOW() - INTERVAL '24 hours'
      GROUP BY 1 ORDER BY MIN(received_at)
    `),
  ]);

  const numericSummary = (row?: { visitors: string; page_views: string; events: string }) => ({
    visitors: Number(row?.visitors ?? 0),
    pageViews: Number(row?.page_views ?? 0),
    events: Number(row?.events ?? 0),
  });

  return {
    available: true,
    rangeDays: days,
    today: numericSummary(todayResult.rows[0]),
    period: numericSummary(periodResult.rows[0]),
    previousPeriod: numericSummary(previousResult.rows[0]),
    trend: trendResult.rows.map((row) => ({ date: row.date, visitors: Number(row.visitors), pageViews: Number(row.page_views) })),
    topPages: pagesResult.rows.map((row) => ({ path: row.path, views: Number(row.views), visitors: Number(row.visitors) })),
    sources: breakdown(sourcesResult.rows),
    devices: breakdown(devicesResult.rows),
    browsers: breakdown(browsersResult.rows),
    features: featuresResult.rows.map((row) => ({ name: row.name, count: Number(row.count) })),
    hourly: hourlyResult.rows.map((row) => ({ hour: row.hour, visitors: Number(row.visitors), pageViews: Number(row.page_views) })),
    retentionDays: RETENTION_DAYS,
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportAdminAnalyticsCsv(rangeDays: number) {
  const overview = await readAdminAnalytics(rangeDays);
  const rows: Array<Array<string | number>> = [["section", "label", "visitors", "page_views", "value", "share"]];
  for (const point of overview.trend) rows.push(["daily", point.date, point.visitors, point.pageViews, "", ""]);
  for (const page of overview.topPages) rows.push(["page", page.path, page.visitors, page.views, "", ""]);
  for (const source of overview.sources) rows.push(["source", source.label, "", "", source.value, source.share]);
  for (const device of overview.devices) rows.push(["device", device.label, "", "", device.value, device.share]);
  for (const feature of overview.features) rows.push(["feature", feature.name, "", "", feature.count, ""]);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
