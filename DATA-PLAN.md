# Stone Daily production data plan

## Product scope

Stone Daily is a public, read-only market and information portal for ordinary users. It covers crypto assets and crypto-native tokenized-stock products (币股); it does not label direct NYSE/Nasdaq shares as the same product.

The public UI must keep these layers separate:

- Crypto spot: a price and volume from one named exchange and quote currency.
- Tokenized-stock spot: an exchange-traded token linked to an underlying stock or ETF.
- On-chain tokenized stock: a blockchain token with issuer, custody, attestation, chain and multiplier constraints.
- Tokenized-stock perpetual: a derivative with funding, leverage and liquidation risk.

Never merge those layers into one unnamed “stock price”. Venue, product type, quote currency, rights, trading hours, regional eligibility and feed state must remain visible.

## Connected provider stack

### Tokenized stocks

- [Bitget Spot API](https://www.bitget.com/api-doc/spot/market/Get-Tickers): Reality rToken / USDT spot pairs. Preserve the `r` prefix.
- [Bybit V5 instruments](https://bybit-exchange.github.io/docs/v5/market/instrument): discover spot rows with `symbolType=xstocks`; preserve `xstockMultiplier` and do not treat token price as unadjusted share price.
- [Kraken AssetPairs](https://docs.kraken.com/api-reference/market-data/get-tradable-asset-pairs): discover xStocks with `aclass_base=tokenized_asset`. Keep geographic restrictions and the absence of traditional shareholder rights visible.
- [OKX public instruments](https://www.okx.com/docs-v5/en/#public-data-rest-api-get-instruments): discover live stock-token perpetuals with `instCategory=3`; label them as derivatives.
- [Binance Web3 tokenized securities](https://www.binance.com/skills/detail/binance-web3/binance-tokenized-securities-info): Ondo catalogue, selected dynamic on-chain prices and share multipliers.

### Crypto spot

The aggregator concurrently reads official public market endpoints from:

- Binance
- OKX
- Bitget
- Bybit
- Kraken
- KuCoin
- Gate
- MEXC
- Coinbase (the adapter is ready; set `COINBASE_CDP_BEARER_TOKEN` if the current public-products endpoint requires it in the deployment region)

Each provider has an independent timeout and failure state. One failed exchange must not make the complete feed fail. Initial responses keep a bounded number of the most liquid rows per venue, while server-side search retains broad provider coverage.

Exchange volume fields do not always share the same unit or definition. Stone Daily may sort within a venue, but must not present a cross-venue sum as a standardized “global volume”.

## Refresh, cache and stream model

- Browser refresh: approximately every 5 seconds for crypto and 15 seconds for tokenized stocks.
- Server fetch cache: 5–30 seconds depending on ticker or instrument metadata.
- Failure isolation: `Promise.allSettled` across providers.
- Tokenized-stock last-success cache: `data/runtime/tokenized-stocks.json`, generated with `scripts/sync-tokenized-stocks.ps1`.
- Mixed feeds: live providers stay live; a failed provider may use its clearly labelled last-success cache.
- Snapshot store: Redis/KV through the Upstash REST protocol when configured, with process memory and local files as development fallbacks.
- Background ingestion: `/api/internal/markets/sync`, protected by `CRON_SECRET`; `vercel.json` schedules it every minute.
- Stream worker: `npm run market:stream` consumes Binance, Bybit and OKX public WebSockets and writes a 20-second quote snapshot to Redis.
- Request path: browser → Stone Daily API → fresh snapshot/stream overlay. Browser traffic no longer needs to fan out directly to every exchange.

## Professional market intelligence

- `/api/market-intelligence?symbol=BTC` aggregates hourly K-lines, mark prices, funding rates and open interest from Binance Futures, Bybit Linear and OKX Swap.
- The UI shows each venue independently because open-interest units and funding conventions are not safely additive.
- Spot spread calculations only compare the same symbol and quote currency, require multiple venues and exclude very low-volume rows.
- A displayed spread is informational, not an arbitrage promise; fees, depth, latency and deposit/withdrawal state are not included.

## Deployment variables

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: shared snapshot and stream storage.
- `CRON_SECRET`: protects the background sync endpoint.
- `COINBASE_CDP_BEARER_TOKEN`: optional Coinbase public-products access in regions where the current endpoint requires a bearer token.
- `STONE_ENABLE_FILE_CACHE=1`: optional only for production runtimes with a persistent writable filesystem.

## Information portal

### Daily hotspots

- Inputs: official exchange notices, token issuers, attestation reports, regulators, licensed financial news, price/volume anomalies and public social signals.
- Ranking: market impact, source quality, cross-source agreement, freshness and relevance to ordinary users.
- Output: facts, why it matters, what remains uncertain, related products and original source links.
- Sharing: public X share intent by default. Automated posting requires server-side OAuth and explicit authorization.

### History on this day

- Maintain an editorially reviewed event database.
- Prefer central banks, regulators, legislation archives, exchange notices, issuers and corporate filings.
- Connect historical events to an educational explanation, not a deterministic price prediction.

## Professionalization roadmap

1. Data reliability: add retries with jitter, alerting, an operator status page and historical provider-uptime records on top of the implemented background ingestion, Redis/KV and latency monitoring.
2. Market depth: extend the implemented WebSocket tickers, K-lines, funding rates, open interest and spread views with order-book depth and liquidation feeds.
3. Entity normalization: canonical asset IDs, underlying-to-product mappings, quote-currency normalization and corporate-action handling.
4. Editorial trust: source quality scores, fact/inference separation, correction history and timestamped snapshots.
5. Product safety: rights and regional eligibility pages, derivative risk badges and no popularity-as-recommendation language.
6. Distribution: daily hotspot cards, share images, RSS/Atom, email/web push and public APIs with rate limits.
7. Operations: observability, error budgets, abuse protection, legal review, privacy policy, terms, analytics consent and domain/email configuration.
