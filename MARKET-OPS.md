# Stone Daily market operations

## Runtime layout

1. The Next.js app serves the public portal and reads normalized market snapshots.
2. `/api/internal/markets/sync` collects REST snapshots and writes them to Redis/KV. The route requires `CRON_SECRET` in production.
3. `workers/market-stream.mjs` is a long-running Railway process. It consumes Binance, Bybit and OKX public WebSockets, exposes direct SSE/snapshot endpoints, and optionally writes a short-lived quote overlay to Redis.
4. The browser consumes the Railway SSE endpoint once per second. `/api/markets` remains the REST fallback, merges the optional Redis overlay, and calculates same-pair cross-exchange spreads.
5. `/api/market-intelligence` reads K-lines, funding and open-interest data from Binance Futures, Bybit Linear and OKX Swap.

## Required production configuration

```text
CRON_SECRET=long-random-secret
MARKET_STREAM_SYMBOLS=BTC,ETH,SOL,XRP,DOGE,ADA,AVAX,LINK,LTC,BCH,BNB,SUI
NEXT_PUBLIC_MARKET_STREAM_URL=https://your-market-stream.up.railway.app
```

Optional Redis fallback:

```text
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=server-side-standard-token
```

The Redis standard token and cron secret must never use a `NEXT_PUBLIC_` prefix. Redis is optional for the Railway stream service. Without Redis, direct browser SSE still works; `/api/markets` continues to use official REST sources as its fallback.

## Web deployment

`vercel.json` requests a market sync every minute. Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the environment variable is configured.

For another scheduler, make an authenticated request to:

```text
GET /api/internal/markets/sync
Authorization: Bearer <CRON_SECRET>
```

Set `NEXT_PUBLIC_MARKET_STREAM_URL` to the Railway public domain in the web deployment, then redeploy the website. This value is intentionally public; it contains no credential.

## Railway stream deployment

The WebSocket worker runs as one always-on Railway service. The checked-in `railway.json` selects `Dockerfile.stream`, configures `/health`, and restarts the service automatically.

1. Create a Railway service from the Stone Daily repository.
2. Keep the repository root as the service root so Railway can read `railway.json`.
3. Add the worker variables below.
4. Generate a Railway public domain. Direct SSE requires this public HTTPS address.
5. Put that address in `NEXT_PUBLIC_MARKET_STREAM_URL` on the web deployment and redeploy it.

Recommended Railway variables:

```text
MARKET_STREAM_SYMBOLS=BTC,ETH,SOL,XRP,DOGE,ADA,AVAX,LINK,LTC,BCH,BNB,SUI
MARKET_STREAM_BROADCAST_MS=1000
MARKET_STREAM_REDIS_FLUSH_MS=10000
MARKET_STREAM_REDIS_TTL_SECONDS=40
MARKET_STREAM_MAX_CLIENTS=500
MARKET_STREAM_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io   # optional
UPSTASH_REDIS_REST_TOKEN=server-side-standard-token       # optional
```

The local equivalent is:

```text
npm run market:stream
```

Health and stream endpoints:

```text
GET /health
GET /snapshot?symbols=BTC,ETH,SOL
GET /events?symbols=BTC,ETH,SOL
```

The SSE stream updates every second. The default Redis interval is ten seconds, reducing background writes from about 2.59 million to about 259,200 per 30-day month. Redis reads and other snapshot jobs still count separately.

## Degraded modes

- Redis missing: the Railway gateway still shares its in-memory stream over SSE; the web API uses process memory and official REST sources.
- One exchange unavailable: other providers continue and the provider strip shows the failed source.
- All live tokenized-stock sources unavailable: the last successful clearly labelled stock cache is retained.
- Railway stream unavailable: EventSource reconnects automatically, REST polling returns to five seconds, and the UI falls back to the latest API snapshot.

## Data interpretation rules

- Do not sum open interest across venues until contract units are normalized.
- Do not treat displayed spreads as executable arbitrage returns.
- Keep tokenized spot, on-chain tokens and perpetuals in separate product classes.
- Store corrections and provider incidents before publishing historical uptime claims.
