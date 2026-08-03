import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import type { NextRequest } from "next/server";
import { getAddress, isAddress, verifyMessage, type Address, type Hex } from "viem";
import { createSiweMessage } from "viem/siwe";
import { isAllowedRequestOrigin } from "@/services/accountSecurity";
import type { AccountSyncSnapshot, StoneSyncPayload } from "@/types/account";
import type { CalmRecord, MarketAlert, MarketAlertKind, UIMode } from "@/types/market";

export const SESSION_COOKIE = "stone_daily_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const CHALLENGE_TTL_MS = 10 * 60_000;
const MAX_SYNC_BYTES = 320_000;
const modes = new Set<UIMode>(["brief", "lens", "calm"]);
const alertKinds = new Set<MarketAlertKind>(["price-above", "price-below", "move-up", "move-down", "news", "funding"]);

type AccountRow = {
  id: string;
  wallet_address: string | null;
  sync_payload: StoneSyncPayload;
  sync_revision: number | string;
  sync_updated_at: Date | string;
};

type ChallengeRow = { wallet_address: string; message: string; chain_id: number | string; expires_at: Date | string };
type SessionPayload = { accountId: string; expiresAt: number };
type GlobalAccountState = typeof globalThis & { __stoneAccountPool?: Pool; __stoneAccountSchema?: Promise<void> };
const rateLimitState = globalThis as typeof globalThis & { __stoneAccountRateLimits?: Map<string, { count: number; resetsAt: number }> };
const rateLimits = rateLimitState.__stoneAccountRateLimits ?? new Map<string, { count: number; resetsAt: number }>();
rateLimitState.__stoneAccountRateLimits = rateLimits;

function databaseUrl() { return process.env.DATABASE_URL?.trim() || ""; }
function sessionSecret() {
  const configured = process.env.STONE_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  return process.env.NODE_ENV === "production" ? "" : "stone-daily-local-development-session-secret";
}

export function accountSyncAvailable() { return Boolean(databaseUrl() && sessionSecret()); }

export function logAccountServiceError(area: string, error: unknown) {
  const details = error && typeof error === "object" ? error as { code?: unknown; name?: unknown; message?: unknown } : {};
  const rawMessage = typeof details.message === "string" ? details.message : "Unknown account service failure";
  const message = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url-redacted]")
    .replace(/password=[^\s]+/gi, "password=[redacted]")
    .slice(0, 240);
  console.error("stone_account_service_error", {
    area,
    code: typeof details.code === "string" ? details.code : "unknown",
    name: typeof details.name === "string" ? details.name : "Error",
    message,
  });
}

function pool() {
  if (!accountSyncAvailable()) throw new Error("account_sync_unavailable");
  const globalState = globalThis as GlobalAccountState;
  if (!globalState.__stoneAccountPool) {
    globalState.__stoneAccountPool = new Pool({ connectionString: databaseUrl(), max: 6, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined });
  }
  return globalState.__stoneAccountPool;
}

async function ensureSchema() {
  const globalState = globalThis as GlobalAccountState;
  if (!globalState.__stoneAccountSchema) {
    globalState.__stoneAccountSchema = pool().query(`
      CREATE TABLE IF NOT EXISTS stone_accounts (
        id UUID PRIMARY KEY,
        email_normalized TEXT UNIQUE,
        password_salt TEXT,
        password_hash TEXT,
        wallet_address TEXT,
        sync_payload JSONB NOT NULL,
        sync_revision INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sync_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE stone_accounts ADD COLUMN IF NOT EXISTS wallet_address TEXT;
      ALTER TABLE stone_accounts ALTER COLUMN email_normalized DROP NOT NULL;
      ALTER TABLE stone_accounts ALTER COLUMN password_salt DROP NOT NULL;
      ALTER TABLE stone_accounts ALTER COLUMN password_hash DROP NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS stone_accounts_wallet_address_unique ON stone_accounts (LOWER(wallet_address)) WHERE wallet_address IS NOT NULL;
      CREATE TABLE IF NOT EXISTS stone_wallet_nonces (
        nonce_hash TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        chain_id INTEGER NOT NULL,
        domain TEXT NOT NULL,
        message TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS stone_wallet_nonces_expiry ON stone_wallet_nonces (expires_at);
    `).then(() => undefined).catch((error) => { globalState.__stoneAccountSchema = undefined; throw error; });
  }
  return globalState.__stoneAccountSchema;
}

export function normalizeWalletAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

export function allowAccountAttempt(request: NextRequest, identity: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = createHmac("sha256", sessionSecret() || "stone-rate-limit").update(`${forwarded}:${identity.toLowerCase()}`).digest("hex");
  const now = Date.now();
  if (rateLimits.size > 5_000) for (const [entryKey, entry] of rateLimits) if (entry.resetsAt <= now) rateLimits.delete(entryKey);
  const current = rateLimits.get(key);
  if (!current || current.resetsAt <= now) { rateLimits.set(key, { count: 1, resetsAt: now + 15 * 60_000 }); return true; }
  if (current.count >= 16) return false;
  current.count += 1;
  return true;
}

function stringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 140))].slice(0, limit);
}

function records(value: unknown): CalmRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CalmRecord => Boolean(item) && typeof item === "object" && typeof item.id === "string" && typeof item.input === "string" && typeof item.summary === "string" && typeof item.createdAt === "string" && (item.type === "ai" || item.type === "regret" || item.type === "detox")).slice(0, 300).map((item) => ({ ...item, input: item.input.slice(0, 4_000), summary: item.summary.slice(0, 1_200) }));
}

function alerts(value: unknown): MarketAlert[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MarketAlert => Boolean(item) && typeof item === "object" && typeof item.id === "string" && typeof item.assetId === "string" && typeof item.symbol === "string" && typeof item.name === "string" && (item.market === "crypto" || item.market === "stock") && alertKinds.has(item.kind) && typeof item.enabled === "boolean" && typeof item.createdAt === "string").slice(0, 300).map((item) => ({ ...item, assetId: item.assetId.slice(0, 140), symbol: item.symbol.slice(0, 32), name: item.name.slice(0, 160), threshold: Number.isFinite(item.threshold) ? item.threshold : undefined }));
}

export function sanitizeSyncPayload(value: unknown): StoneSyncPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<StoneSyncPayload>;
  if (input.version !== 1) return null;
  const payload: StoneSyncPayload = { product: "Stone Daily", version: 1, updatedAt: new Date().toISOString(), mode: input.mode && modes.has(input.mode) ? input.mode : "brief", language: input.language === "en" ? "en" : "zh", watchlistIds: stringList(input.watchlistIds, 500), records: records(input.records), alerts: alerts(input.alerts) };
  return Buffer.byteLength(JSON.stringify(payload), "utf8") <= MAX_SYNC_BYTES ? payload : null;
}

export function isAdminWallet(address?: string | null) {
  if (!address) return false;
  const admins = (process.env.STONE_ADMIN_WALLETS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return admins.includes(address.toLowerCase());
}

function snapshot(row: AccountRow): AccountSyncSnapshot {
  const walletAddress = getAddress(row.wallet_address!);
  return { walletAddress, isAdmin: isAdminWallet(walletAddress), payload: row.sync_payload, revision: Number(row.sync_revision), updatedAt: new Date(row.sync_updated_at).toISOString() };
}

function configuredOrigin(request: NextRequest) {
  const configured = process.env.STONE_PUBLIC_ORIGIN?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { /* use request origin */ }
  }
  return request.nextUrl.origin;
}

function nonceHash(nonce: string) { return createHash("sha256").update(nonce).digest("hex"); }

export async function createWalletChallenge(request: NextRequest, address: Address, chainId: number) {
  await ensureSchema();
  const origin = configuredOrigin(request);
  const url = new URL(origin);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const message = createSiweMessage({ address, chainId, domain: url.host, nonce, uri: origin, version: "1", scheme: url.protocol.replace(":", ""), issuedAt, expirationTime: expiresAt, statement: "Sign in to Stone Daily. This does not authorize transactions, token approvals, or asset access." });
  await pool().query("DELETE FROM stone_wallet_nonces WHERE expires_at < NOW() - INTERVAL '1 day' OR used_at < NOW() - INTERVAL '1 day'");
  await pool().query("INSERT INTO stone_wallet_nonces (nonce_hash, wallet_address, chain_id, domain, message, expires_at) VALUES ($1, $2, $3, $4, $5, $6)", [nonceHash(nonce), address.toLowerCase(), chainId, url.host, message, expiresAt]);
  return { nonce, message, expiresAt: expiresAt.toISOString() };
}

export async function consumeWalletChallenge(input: { address: Address; chainId: number; nonce: string; message: string; signature: Hex }) {
  await ensureSchema();
  const consumed = await pool().query<ChallengeRow>(`
    UPDATE stone_wallet_nonces SET used_at = NOW()
    WHERE nonce_hash = $1 AND wallet_address = $2 AND chain_id = $3 AND message = $4 AND used_at IS NULL AND expires_at > NOW()
    RETURNING wallet_address, message, chain_id, expires_at
  `, [nonceHash(input.nonce), input.address.toLowerCase(), input.chainId, input.message]);
  if (!consumed.rows[0]) return false;
  try { return await verifyMessage({ address: input.address, message: input.message, signature: input.signature }); } catch { return false; }
}

export async function authenticateWallet(address: Address, payload: StoneSyncPayload) {
  await ensureSchema();
  const inserted = await pool().query<AccountRow>(`
    INSERT INTO stone_accounts (id, wallet_address, sync_payload, sync_revision)
    VALUES ($1, $2, $3::jsonb, 1)
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [randomUUID(), address.toLowerCase(), JSON.stringify(payload)]);
  if (inserted.rows[0]) return { accountId: inserted.rows[0].id, account: snapshot(inserted.rows[0]), created: true };
  const existing = await pool().query<AccountRow>("SELECT * FROM stone_accounts WHERE LOWER(wallet_address) = $1 LIMIT 1", [address.toLowerCase()]);
  return existing.rows[0] ? { accountId: existing.rows[0].id, account: snapshot(existing.rows[0]), created: false } : null;
}

export async function readAccount(accountId: string) {
  await ensureSchema();
  const result = await pool().query<AccountRow>("SELECT * FROM stone_accounts WHERE id = $1 AND wallet_address IS NOT NULL LIMIT 1", [accountId]);
  return result.rows[0] ? snapshot(result.rows[0]) : null;
}

export async function updateAccountSync(accountId: string, payload: StoneSyncPayload, baseRevision: number) {
  await ensureSchema();
  const updated = await pool().query<AccountRow>(`UPDATE stone_accounts SET sync_payload = $1::jsonb, sync_revision = sync_revision + 1, sync_updated_at = NOW(), updated_at = NOW() WHERE id = $2 AND sync_revision = $3 AND wallet_address IS NOT NULL RETURNING *`, [JSON.stringify(payload), accountId, baseRevision]);
  if (updated.rows[0]) return { conflict: false as const, snapshot: snapshot(updated.rows[0]) };
  const current = await readAccount(accountId);
  return current ? { conflict: true as const, snapshot: current } : null;
}

export async function readAdminOverview() {
  await ensureSchema();
  const [accountsResult, challengesResult] = await Promise.all([
    pool().query<{ total: string; active_7d: string; watchlists: string; alerts: string; records: string; revisions: string }>(`
      SELECT COUNT(*) FILTER (WHERE wallet_address IS NOT NULL)::text AS total,
        COUNT(*) FILTER (WHERE wallet_address IS NOT NULL AND updated_at >= NOW() - INTERVAL '7 days')::text AS active_7d,
        COALESCE(SUM(jsonb_array_length(COALESCE(sync_payload->'watchlistIds','[]'::jsonb))) FILTER (WHERE wallet_address IS NOT NULL),0)::text AS watchlists,
        COALESCE(SUM(jsonb_array_length(COALESCE(sync_payload->'alerts','[]'::jsonb))) FILTER (WHERE wallet_address IS NOT NULL),0)::text AS alerts,
        COALESCE(SUM(jsonb_array_length(COALESCE(sync_payload->'records','[]'::jsonb))) FILTER (WHERE wallet_address IS NOT NULL),0)::text AS records,
        COALESCE(SUM(sync_revision) FILTER (WHERE wallet_address IS NOT NULL),0)::text AS revisions
      FROM stone_accounts
    `),
    pool().query<{ issued_24h: string; used_24h: string }>("SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::text AS issued_24h, COUNT(*) FILTER (WHERE used_at >= NOW() - INTERVAL '24 hours')::text AS used_24h FROM stone_wallet_nonces"),
  ]);
  const accounts = accountsResult.rows[0];
  const challenges = challengesResult.rows[0];
  return { generatedAt: new Date().toISOString(), accounts: { total: Number(accounts.total), active7d: Number(accounts.active_7d), syncRevisions: Number(accounts.revisions) }, productData: { watchlistItems: Number(accounts.watchlists), alerts: Number(accounts.alerts), pauseRecords: Number(accounts.records) }, walletAuth: { challenges24h: Number(challenges.issued_24h), completed24h: Number(challenges.used_24h) } };
}

function encode(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
export function createSessionToken(accountId: string) {
  const body = encode(JSON.stringify({ accountId, expiresAt: Date.now() + SESSION_MAX_AGE * 1_000 } satisfies SessionPayload));
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function sessionAccountId(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = sessionSecret();
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return payload.expiresAt > Date.now() && /^[0-9a-f-]{36}$/i.test(payload.accountId) ? payload.accountId : null;
  } catch { return null; }
}

export function isSameOrigin(request: NextRequest) {
  return isAllowedRequestOrigin({
    configuredOrigin: process.env.STONE_PUBLIC_ORIGIN,
    forwardedHost: request.headers.get("x-forwarded-host"),
    origin: request.headers.get("origin"),
    requestHost: request.headers.get("host"),
    urlHost: request.nextUrl.host,
  });
}
