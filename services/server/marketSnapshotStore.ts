import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type CacheLayer = "redis" | "memory" | "file";
type MemoryEntry = { value: unknown; expiresAt: number; writtenAt: number };

export type CachedValue<T> = {
  value: T;
  layer: CacheLayer;
};

const globalCache = globalThis as typeof globalThis & { __stoneDailyCache?: Map<string, MemoryEntry> };
const memoryCache = globalCache.__stoneDailyCache ?? new Map<string, MemoryEntry>();
globalCache.__stoneDailyCache = memoryCache;

export const SNAPSHOT_KEYS = {
  crypto: "stone-daily:v2:market:crypto",
  stocks: "stone-daily:v2:market:stocks",
  streamQuotes: "stone-daily:v2:stream:quotes",
} as const;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function fileCacheEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.STONE_ENABLE_FILE_CACHE === "1";
}

function filePathForKey(key: string) {
  const safeName = key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return path.join(process.cwd(), "data", "runtime", `${safeName}.json`);
}

async function redisCommand<T>(command: Array<string | number>) {
  const config = redisConfig();
  if (!config) return null;
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error(`Redis REST ${response.status}`);
  const payload = await response.json() as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

async function readRedisJson<T>(key: string) {
  const raw = await redisCommand<string>(["GET", key]);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

async function writeRedisJson(key: string, value: unknown, ttlSeconds: number) {
  return redisCommand<string>(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
}

async function readFileJson<T>(key: string) {
  if (!fileCacheEnabled()) return null;
  try {
    return JSON.parse(await readFile(filePathForKey(key), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeFileJson(key: string, value: unknown) {
  if (!fileCacheEnabled()) return;
  const target = filePathForKey(key);
  const directory = path.dirname(target);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, JSON.stringify(value), "utf8");
  await rename(temporary, target);
}

export async function readCachedJson<T>(key: string, options?: { preferRemote?: boolean }): Promise<CachedValue<T> | null> {
  const memory = memoryCache.get(key);
  const now = Date.now();
  if (memory && memory.expiresAt > now && (!options?.preferRemote || now - memory.writtenAt < 2_000)) {
    return { value: memory.value as T, layer: "memory" };
  }

  if (redisConfig()) {
    try {
      const value = await readRedisJson<T>(key);
      if (value) {
        memoryCache.set(key, { value, expiresAt: now + 5_000, writtenAt: now });
        return { value, layer: "redis" };
      }
    } catch {
      // Continue to the local fallback without exposing infrastructure errors publicly.
    }
  }

  if (memory && memory.expiresAt > now) return { value: memory.value as T, layer: "memory" };
  const fileValue = await readFileJson<T>(key);
  if (!fileValue) return null;
  memoryCache.set(key, { value: fileValue, expiresAt: now + 5_000, writtenAt: now });
  return { value: fileValue, layer: "file" };
}

export async function writeCachedJson(key: string, value: unknown, ttlSeconds: number) {
  const now = Date.now();
  memoryCache.set(key, { value, expiresAt: now + ttlSeconds * 1_000, writtenAt: now });
  const writes: Promise<unknown>[] = [writeFileJson(key, value)];
  if (redisConfig()) writes.push(writeRedisJson(key, value, ttlSeconds));
  await Promise.allSettled(writes);
}

export function hasRedisSnapshotStore() {
  return Boolean(redisConfig());
}
