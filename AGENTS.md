# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable Stone Daily decisions

- Preserve all three approved visual directions as switchable UI modes across the same product and data model: `brief` (morning market brief), `lens` (signal lens), and `calm` (calm check-in).
- The UI mode switch is a product feature, not a temporary demo control. Persist the selected mode in `localStorage`.
- All modes must expose the same routes and core interactions; only information framing, navigation layout, density, and visual tokens may differ.
- Stone Daily is a public portal for ordinary users, not a personalized publishing dashboard. Daily hotspots, sharing tools, and market discovery must be useful without a personal account.
- Public editorial modules must separate facts, inference, and risk; retain visible source links; and never turn popularity into a trading recommendation.
- The header carries a second-by-second Beijing date/time strip and a prominent `X：石头 @Stone141319` button; do not replace it with a build-time or hard-coded date.
- Daily hotspots combine a reviewed editorial layer with a separate 7×24 feed. Aggregate Sina Finance, central banks, regulators, crypto media and exchange sources independently, expose per-source health, and keep raw source links.
- The economic calendar uses Beijing time and preserves time, region, event, importance, actual, forecast and previous fields. Prefer official BLS/Fed/ECB/BEA schedules, label catalogue fallback clearly, and use Trading Economics only when a real server-side key is configured.
- “美股” in this product means crypto-native tokenized-stock products (币股), not direct NYSE/Nasdaq shares. Aggregate Binance Web3/Ondo, Bitget rToken, OKX stock-token derivatives, and other exchange sources while keeping venue, product type, rights, trading hours, and feed delay explicit.
- Keep all approved product layers: crypto spot, tokenized-stock spot, on-chain tokenized stocks, and tokenized-stock perpetuals. Bybit xStocks and Kraken xStocks are first-class sources alongside Bitget, OKX, and Binance Web3.
- The public market portal should aggregate mainstream exchanges with independent timeouts and visible provider health; never hide a partial outage or sum incompatible volume fields into a fake global metric.
- Exchange health cards are interactive venue filters: clicking a provider shows only that venue's assets, clicking the selected provider clears the filter, and unavailable zero-count providers remain visibly disabled.
- HTX public spot tickers are part of the crypto venue set and require no API key. Kraken xStocks must support the official ticker-suffix convention as well as any tokenized-asset class metadata, while keeping API and geographic restrictions explicit.
- Production market data uses background snapshots with optional Redis/KV, a short-lived WebSocket quote overlay, and explicit stale states. Funding rate and open-interest fields remain venue-specific and must never be added across exchanges without unit normalization.
- Railway is the selected long-running runtime for the shared market stream. Prefer direct one-second SSE from a single Railway gateway; keep Redis/KV optional and lower-frequency as a server/API fallback rather than writing every browser-visible tick.
- The purchased public portal domain is `stonedaily.xyz` with that exact spelling. Deploy the Next.js portal as a separate Railway web service while keeping the existing market-stream service isolated.
- The approved Stone Daily brand mark is the layered slate stone, sunrise, sage rays, white horizon, and market-wave motif stored at `public/assets/stone-daily-mark.png`. Use the same mark for navigation, app icon, Apple icon, and favicon; keep the wordmark as crisp HTML text.
- Daily hotspots must be rebuilt from same-day live editorial candidates on Beijing time; never present a bundled fallback list or an old announcement as today's ranking. Keep the raw 7x24 stream on its own `/live` route with category/source filters, pagination, refresh controls, and provider health.
- `HistoryToday` must resolve the current Beijing month/day at request time, merge traceable public history sources, and show a transparent unavailable state instead of a hard-coded date or event list.
- Market weather must be derived from the current crypto and tokenized-stock feeds, recomputed at least once per minute, and shared by the homepage, market portal, and `/weather`; never show a hard-coded score or date as today's weather.
- Market rows use real asset marks when a traceable symbol image is available, tokenized-stock marks resolve from the underlying ticker, and exchange health cards carry recognizable venue logos with a visible fallback.
- The crypto market defaults to 24-hour gain sorting. Its moving Top 20 tape deduplicates by canonical symbol, prefers the higher-volume venue observation, and excludes leveraged-token wrappers from the ranking and weather calculation without removing them from the full table.
- Every public route owns the same global moving-tape header: deduplicated gainers Top 20 followed by the latest 7×24 wire. It sits at the absolute top above the Beijing-time/creator utility strip and navigation, persists across client-side navigation, and must render only once per page.
- The homepage first main block after navigation is the live-market command center. Keep real-time prices, venue/source, plain-language AI signals, and market breadth/temperature more visually prominent than the secondary brand hero in all three UI modes.
- The economic calendar defaults to `全部`; users may narrow it to today, tomorrow, this week, or next week explicitly.
- On `/markets`, token rows must follow the feed status without a large interruption. Keep the professional cross-venue/derivatives radar after the token list, collapsed to a compact summary by default, and fetch its heavier detail only when a user expands it.
- Asset “AI 解读” and “帮我冷静” outputs must be data-driven per symbol, venue, product structure, move size, and liquidity context. Never reuse one generic explanation template across every token, and keep all causal language explicitly probabilistic.
