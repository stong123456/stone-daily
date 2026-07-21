import { createServer } from "node:http";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const WebSocketClient = globalThis.WebSocket;

if (Boolean(redisUrl) !== Boolean(redisToken)) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.");
}
if (!WebSocketClient) {
  throw new Error("A runtime with the standard WebSocket API is required (Node.js 22+ recommended).");
}

function integerFromEnv(name, fallback, minimum, maximum) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

const STREAM_KEY = "stone-daily:v2:stream:quotes";
const PORT = integerFromEnv("PORT", 3000, 1, 65_535);
const BROADCAST_INTERVAL_MS = integerFromEnv("MARKET_STREAM_BROADCAST_MS", 1_000, 500, 10_000);
const REDIS_FLUSH_INTERVAL_MS = integerFromEnv("MARKET_STREAM_REDIS_FLUSH_MS", 10_000, 1_000, 60_000);
const REDIS_TTL_SECONDS = integerFromEnv(
  "MARKET_STREAM_REDIS_TTL_SECONDS",
  Math.max(30, Math.ceil(REDIS_FLUSH_INTERVAL_MS / 1_000) * 4),
  20,
  300,
);
const MAX_SSE_CLIENTS = integerFromEnv("MARKET_STREAM_MAX_CLIENTS", 500, 1, 5_000);
const TRACKED_SYMBOLS = (process.env.MARKET_STREAM_SYMBOLS ?? "BTC,ETH,SOL,XRP,DOGE,ADA,AVAX,LINK,LTC,BCH,BNB,SUI")
  .split(",")
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean)
  .slice(0, 100);
const ALLOWED_ORIGINS = new Set(
  (process.env.MARKET_STREAM_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
const blockedSuffixes = ["UP", "DOWN", "BULL", "BEAR"];
const quotes = new Map();
const feedStates = new Map();
const sseClients = new Set();
const shutdownHandlers = [];
const startedAt = new Date().toISOString();
let flushing = false;
let shuttingDown = false;
let lastRedisSuccessAt;
let lastRedisError;

if (!redisUrl) {
  console.warn("[market-stream] Redis is not configured; direct SSE remains enabled and Redis fallback is disabled.");
}

function numberOrZero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quoteKey(venue, symbol, quoteCurrency) {
  return `${venue}|${symbol}|${quoteCurrency}`.toUpperCase();
}

function updateQuote({ venue, symbol, quoteCurrency, price, change24h, volume, updatedAt }) {
  if (!price || !symbol || !quoteCurrency) return;
  quotes.set(quoteKey(venue, symbol, quoteCurrency), {
    venue,
    symbol,
    quoteCurrency,
    price,
    change24h,
    volume,
    updatedAt: new Date(updatedAt || Date.now()).toISOString(),
  });
}

function createSnapshot(symbols) {
  const cutoff = Date.now() - 15_000;
  const freshQuotes = Array.from(quotes.values())
    .filter((quote) => Date.parse(quote.updatedAt) >= cutoff && (!symbols?.size || symbols.has(quote.symbol)))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 500);
  return { version: 1, quotes: freshQuotes, updatedAt: new Date().toISOString() };
}

async function writeRedisSnapshot(snapshot) {
  if (!redisUrl || !redisToken) return;
  const response = await fetch(redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", STREAM_KEY, JSON.stringify(snapshot), "EX", REDIS_TTL_SECONDS]),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`Redis REST ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
}

async function flushQuotes() {
  if (flushing || !redisUrl) return;
  flushing = true;
  try {
    const snapshot = createSnapshot();
    if (!snapshot.quotes.length) return;
    await writeRedisSnapshot(snapshot);
    lastRedisSuccessAt = snapshot.updatedAt;
    lastRedisError = undefined;
  } catch (error) {
    lastRedisError = error instanceof Error ? error.message : String(error);
    console.error("[market-stream] Redis flush failed", lastRedisError);
  } finally {
    flushing = false;
  }
}

function connectFeed({ name, url, urls, subscribe, handleMessage, heartbeat }) {
  let socket;
  let heartbeatTimer;
  let reconnectTimer;
  let stopped = false;
  let attempts = 0;
  let endpointIndex = 0;
  const endpoints = urls?.length ? urls : [url];
  const state = { status: "connecting", reconnects: 0 };
  feedStates.set(name, state);

  const scheduleReconnect = (reason) => {
    if (stopped || reconnectTimer) return;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    attempts += 1;
    state.status = "reconnecting";
    state.reconnects += 1;
    endpointIndex = (endpointIndex + 1) % endpoints.length;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5));
    console.warn(`[market-stream] ${name} ${reason}; reconnecting via ${endpoints[endpointIndex]} in ${delay}ms`);
    try {
      if (socket?.readyState === 0 || socket?.readyState === 1) socket.close();
    } catch {
      // The reconnect timer below is authoritative even if close is unavailable.
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  };

  const connect = () => {
    if (stopped) return;
    state.status = "connecting";
    state.endpoint = endpoints[endpointIndex];
    try {
      socket = new WebSocketClient(state.endpoint);
    } catch {
      scheduleReconnect("connection failed");
      return;
    }
    socket.addEventListener("open", () => {
      attempts = 0;
      state.status = "connected";
      state.connectedAt = new Date().toISOString();
      console.log(`[market-stream] ${name} connected`);
      if (subscribe) socket.send(JSON.stringify(subscribe));
      if (heartbeat) heartbeatTimer = setInterval(() => heartbeat(socket), 20_000);
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = typeof event.data === "string" ? event.data : event.data.toString();
        handleMessage(payload);
        state.lastMessageAt = new Date().toISOString();
      } catch (error) {
        console.error(`[market-stream] ${name} message error`, error instanceof Error ? error.message : error);
      }
    });
    socket.addEventListener("error", () => {
      scheduleReconnect("connection error");
    });
    socket.addEventListener("close", () => {
      if (stopped) state.status = "stopped";
      else scheduleReconnect("disconnected");
    });
  };

  connect();
  const stop = () => {
    stopped = true;
    state.status = "stopped";
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket?.readyState === 1) socket.close();
  };
  shutdownHandlers.push(stop);
}

connectFeed({
  name: "Binance",
  urls: [
    "wss://data-stream.binance.vision/ws/!miniTicker@arr",
    "wss://stream.binance.com:443/ws/!miniTicker@arr",
    "wss://stream.binance.com:9443/ws/!miniTicker@arr",
  ],
  handleMessage(raw) {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row.s?.endsWith("USDT")) continue;
      const symbol = row.s.replace(/USDT$/, "");
      if (blockedSuffixes.some((suffix) => symbol.endsWith(suffix))) continue;
      const price = numberOrZero(row.c);
      const open = numberOrZero(row.o);
      updateQuote({
        venue: "Binance",
        symbol,
        quoteCurrency: "USDT",
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: numberOrZero(row.q),
        updatedAt: row.E,
      });
    }
  },
});

connectFeed({
  name: "Bybit",
  url: "wss://stream.bybit.com/v5/public/spot",
  subscribe: { op: "subscribe", args: TRACKED_SYMBOLS.map((symbol) => `tickers.${symbol}USDT`) },
  heartbeat(socket) {
    if (socket.readyState === 1) socket.send(JSON.stringify({ op: "ping" }));
  },
  handleMessage(raw) {
    const payload = JSON.parse(raw);
    if (!payload.topic?.startsWith("tickers.")) return;
    const rows = Array.isArray(payload.data) ? payload.data : [payload.data];
    for (const row of rows) {
      if (!row?.symbol?.endsWith("USDT")) continue;
      updateQuote({
        venue: "Bybit",
        symbol: row.symbol.replace(/USDT$/, ""),
        quoteCurrency: "USDT",
        price: numberOrZero(row.lastPrice),
        change24h: numberOrZero(row.price24hPcnt) * 100,
        volume: numberOrZero(row.turnover24h),
        updatedAt: payload.ts,
      });
    }
  },
});

connectFeed({
  name: "OKX",
  url: "wss://ws.okx.com:8443/ws/v5/public",
  subscribe: { op: "subscribe", args: TRACKED_SYMBOLS.map((symbol) => ({ channel: "tickers", instId: `${symbol}-USDT` })) },
  heartbeat(socket) {
    if (socket.readyState === 1) socket.send("ping");
  },
  handleMessage(raw) {
    if (raw === "pong") return;
    const payload = JSON.parse(raw);
    if (payload.arg?.channel !== "tickers" || !Array.isArray(payload.data)) return;
    for (const row of payload.data) {
      const [symbol, quoteCurrency] = row.instId?.split("-") ?? [];
      const price = numberOrZero(row.last);
      const open = numberOrZero(row.open24h);
      updateQuote({
        venue: "OKX",
        symbol,
        quoteCurrency,
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: numberOrZero(row.volCcy24h),
        updatedAt: numberOrZero(row.ts),
      });
    }
  },
});

function applyCors(request, response) {
  const origin = request.headers.origin?.replace(/\/$/, "");
  if (!origin || !ALLOWED_ORIGINS.size) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    return true;
  }
  if (!ALLOWED_ORIGINS.has(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  return true;
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function parseSymbols(url) {
  return new Set(
    (url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 100),
  );
}

function sendSse(client, snapshot = createSnapshot(client.symbols)) {
  if (client.response.writableEnded || client.response.writableNeedDrain) return;
  client.response.write(`id: ${Date.now()}\nevent: quotes\ndata: ${JSON.stringify(snapshot)}\n\n`);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "OPTIONS") {
    if (!applyCors(request, response)) return jsonResponse(response, 403, { error: "origin_not_allowed" });
    response.writeHead(204, {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    return response.end();
  }

  if (request.method !== "GET") return jsonResponse(response, 405, { error: "method_not_allowed" });

  if (url.pathname === "/health") {
    const feeds = Object.fromEntries(feedStates);
    const connectedFeeds = Array.from(feedStates.values()).filter((feed) => feed.status === "connected").length;
    return jsonResponse(response, 200, {
      status: connectedFeeds ? "healthy" : "starting",
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      connectedFeeds,
      quoteCount: createSnapshot().quotes.length,
      sseClients: sseClients.size,
      redis: redisUrl ? { enabled: true, lastSuccessAt: lastRedisSuccessAt, lastError: lastRedisError } : { enabled: false },
      feeds,
    });
  }

  if (url.pathname === "/snapshot") {
    if (!applyCors(request, response)) return jsonResponse(response, 403, { error: "origin_not_allowed" });
    return jsonResponse(response, 200, createSnapshot(parseSymbols(url)));
  }

  if (url.pathname === "/events") {
    if (!applyCors(request, response)) return jsonResponse(response, 403, { error: "origin_not_allowed" });
    if (sseClients.size >= MAX_SSE_CLIENTS) return jsonResponse(response, 503, { error: "stream_capacity_reached" });
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.write("retry: 3000\n\n");
    const client = { response, symbols: parseSymbols(url) };
    sseClients.add(client);
    sendSse(client);
    request.on("close", () => sseClients.delete(client));
    return;
  }

  return jsonResponse(response, 200, {
    service: "Stone Daily market stream",
    endpoints: ["/health", "/snapshot", "/events"],
  });
});

const broadcastTimer = setInterval(() => {
  if (!sseClients.size) return;
  for (const client of sseClients) sendSse(client);
}, BROADCAST_INTERVAL_MS);
const sseHeartbeatTimer = setInterval(() => {
  for (const client of sseClients) {
    if (!client.response.writableEnded) client.response.write(`: heartbeat ${Date.now()}\n\n`);
  }
}, 15_000);
const flushTimer = redisUrl ? setInterval(flushQuotes, REDIS_FLUSH_INTERVAL_MS) : undefined;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[market-stream] worker started on 0.0.0.0:${PORT}`);
  console.log(`[market-stream] SSE every ${BROADCAST_INTERVAL_MS}ms; Redis every ${redisUrl ? `${REDIS_FLUSH_INTERVAL_MS}ms` : "disabled"}`);
});

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(broadcastTimer);
  clearInterval(sseHeartbeatTimer);
  if (flushTimer) clearInterval(flushTimer);
  for (const stop of shutdownHandlers) stop();
  for (const client of sseClients) {
    client.response.write("event: close\ndata: {}\n\n");
    client.response.end();
  }
  server.close();
  Promise.race([
    flushQuotes(),
    new Promise((resolve) => setTimeout(resolve, 4_500)),
  ]).finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
