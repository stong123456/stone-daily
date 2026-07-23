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
- “美股” in this product means crypto-native tokenized-stock products (币股), not direct NYSE/Nasdaq shares. Aggregate Binance Web3/Ondo, Bitget rToken, OKX stock-token derivatives, and other exchange sources while keeping venue, product type, rights, trading hours, and feed delay explicit.
- Keep all approved product layers: crypto spot, tokenized-stock spot, on-chain tokenized stocks, and tokenized-stock perpetuals. Bybit xStocks and Kraken xStocks are first-class sources alongside Bitget, OKX, and Binance Web3.
- The public market portal should aggregate mainstream exchanges with independent timeouts and visible provider health; never hide a partial outage or sum incompatible volume fields into a fake global metric.
- Exchange health cards are interactive venue filters: clicking a provider shows only that venue's assets, clicking the selected provider clears the filter, and unavailable zero-count providers remain visibly disabled.
- HTX public spot tickers are part of the crypto venue set and require no API key. Kraken xStocks must support the official ticker-suffix convention as well as any tokenized-asset class metadata, while keeping API and geographic restrictions explicit.
- Production market data uses background snapshots with optional Redis/KV, a short-lived WebSocket quote overlay, and explicit stale states. Funding rate and open-interest fields remain venue-specific and must never be added across exchanges without unit normalization.
- Railway is the selected long-running runtime for the shared market stream. Prefer direct one-second SSE from a single Railway gateway; keep Redis/KV optional and lower-frequency as a server/API fallback rather than writing every browser-visible tick.
- The purchased public portal domain is `stonedaily.xyz` with that exact spelling. Deploy the Next.js portal as a separate Railway web service while keeping the existing market-stream service isolated.
- The approved Stone Daily brand mark is the layered slate stone, sunrise, sage rays, white horizon, and market-wave motif stored at `public/assets/stone-daily-mark.png`. Use the same mark for navigation, app icon, Apple icon, and favicon; keep the wordmark as crisp HTML text.
- Asset “AI 解读” and “帮我冷静” outputs must be data-driven per symbol, venue, product structure, move size, and liquidity context. Never reuse one generic explanation template across every token, and keep all causal language explicitly probabilistic.
