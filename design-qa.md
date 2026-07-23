# Stone Daily design QA

## Baseline three-mode QA (preserved)

### Visual truth

- Brief reference: `C:/Users/Administrator/.codex/generated_images/019f7982-e28f-7c83-96d1-c114d721083d/exec-a4ba5f3f-98c4-4e49-9277-e46a3c0cdabe.png`
- Lens reference: `C:/Users/Administrator/.codex/generated_images/019f7982-e28f-7c83-96d1-c114d721083d/exec-e7a6d398-9717-4955-b64d-60aa22c2b6e9.png`
- Calm reference: `C:/Users/Administrator/.codex/generated_images/019f7982-e28f-7c83-96d1-c114d721083d/exec-6e09002c-df93-47d9-b77f-cda1496ddedb.png`

### Implementation evidence

- Browser: Codex in-app browser.
- Desktop viewport: 1440 × 1024.
- Mobile viewport: 390 × 844.
- Implementation screenshots: `qa/brief-home.png`, `qa/lens-home.png`, `qa/calm-home.png`, `qa/mobile-home.png`.
- Full-view comparisons: `qa/brief-comparison.png`, `qa/lens-comparison.png`, `qa/calm-comparison.png`.
- Focused hero and primary-content comparison: `qa/focused-comparison.png`.

### Comparison findings

1. Layout and hierarchy: all three modes preserve their selected visual direction: editorial brief with right rail, analytical signal lens, and calm sidebar/check-in layout.
2. Typography: serif display hierarchy and compact sans-serif utility copy match the references closely; Chinese wrapping remains readable at desktop and mobile widths.
3. Color and surfaces: warm paper, blue analytical, and soft coastal palettes map consistently to their respective modes; status colors remain semantic and restrained.
4. Imagery: generated market-weather and calm-coast assets are used as real raster assets with intentional crops; no placeholder or CSS-drawn hero art remains.
5. Icons: one consistent Phosphor icon family is used for navigation, actions, risk states, and utilities.
6. Interactions: theme switching, navigation, mobile menu, market tabs, watchlist persistence, AI explanation modal, regret report, detox report, save history, and local record display were exercised in-browser.
7. Responsiveness and accessibility: 390 px viewport showed no horizontal overflow; semantic buttons, links, tabs, dialog labels, image alt text, and visible focus styles are present.
8. Copy: the source concepts were adapted into standalone Chinese product copy. The intentional visual-truth copy deviation was the mock-data date, updated from July 19 to July 20, 2026.

### Baseline severity history and result

- P0: none.
- P1: none.
- P2: stale July 19 mock date found during mobile QA; corrected to July 20, 2026 in the homepage and market snapshot.
- P2: production build and active dev server briefly shared `.next` output, causing a development overlay; the project-local cache was safely removed and the dev server restarted.
- Validation: `npm run typecheck`, `npm run build`, browser functional QA, and design comparison passed.

## 2026-07-23 exchange, brand, and asset-intelligence QA

Final result: PASSED for the implemented UI and interactions. External-provider reachability remains a deployment verification item for Kraken and HTX because both public endpoints timed out from the local network.

## Source and implementation evidence

- Logo source: `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-0a48c78c-c7b7-4410-bfda-4e7173d8791f.png`
- Exchange-strip source: `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-e5f27d17-ebdb-4e56-a596-b14955df9745.png`
- Desktop implementation: `C:\Users\ADMINI~1\AppData\Local\Temp\stone-daily-desktop.png`
- Mobile implementation: `C:\Users\ADMINI~1\AppData\Local\Temp\stone-daily-mobile.png`
- Logo comparison: `C:\Users\Administrator\AppData\Local\Temp\stone-daily-logo-comparison.png`
- Exchange comparison: `C:\Users\Administrator\AppData\Local\Temp\stone-daily-exchange-comparison.png`

## Viewports and state

- Desktop: 1265 × 712 CSS pixels, default density, `/markets`, brief theme, provider snapshot loaded.
- Mobile: 375 × 844 CSS pixels, default density, `/markets`, brief theme, single-column provider cards.
- Focused states: Binance selected and cleared; BTC and ETH explanation drawers; BTC prefilled calm workflow and generated report.

## Visual comparison

- Full page: navigation, page header, temperature cards, toolbar, provider controls, table, and footer retain the existing Stone Daily design system.
- Logo: the implemented asset preserves the reference stone, sunrise, sage rays, horizon streaks, and white market wave. The HTML wordmark remains crisp at desktop and mobile sizes.
- Provider controls: card density, border radius, status dot, typography, and wrapping match the supplied screen while adding visible selected, disabled, hover, and focus states.
- Mobile: no horizontal overflow (`scrollWidth` equals `clientWidth`); logo remains 40 px high; provider cards collapse to one 343 px column.
- No visible P1 or P2 mismatch remained after the focused comparisons.

## Interaction and content QA

- Binance provider card resolves to one unique control, sets `aria-pressed=true`, and limits all sampled table rows to Binance. Clicking the selected card restores `全部交易所`.
- BTC and ETH explanation drawers produced different titles, drivers, mistakes, watch items, and summaries based on their symbol profiles and live venue data.
- BTC “帮我冷静” transferred structured symbol, venue, product, change, volume, theme, and hint context into `/regret` and produced a BTC-specific risk checklist.
- X attribution is present site-wide at `https://x.com/Stone141319` with the accessible label `在 X 上访问石头 @Stone141319`.
- Desktop and mobile console checks returned no errors or warnings.

## Build gates

- `npm run typecheck`: passed.
- `npm run build`: passed on Next.js 15.5.20.
- `git diff --check`: passed; only line-ending notices were emitted.

## Deployment result

- Railway served the new `stone-daily-mark.png` asset with HTTP 200 and the expected 346,479-byte payload.
- HTX public spot aggregation is live in production: 605 markets, 203 ms in the verification snapshot.
- Kraken xStocks returned zero public order-book markets from the current Railway region even though the endpoint responded in 277 ms. This is consistent with Kraken's geographic/API availability restrictions, not a missing API key. The UI now labels this state `地区/API 受限` instead of implying an unknown outage.

## 2026-07-23 live header, editorial feed, and calendar QA

- The global utility bar now renders a client-side Asia/Shanghai clock and refreshes its date and `HH:mm:ss` value every second.
- The creator attribution is promoted above the main navigation as a high-contrast X button and remains compact but visible on mobile.
- `/api/editorial` aggregates Sina Finance 7x24, central-bank, regulator, crypto-news, and exchange sources independently so one failed source does not blank the feed.
- `/api/economic-calendar` supports live providers when available and a reviewed official-event fallback, with timezone-normalized range, region, and importance filters in `/calendar`.
- `npm run typecheck` passed. The production rebuild was blocked by the current execution quota after the previously successful Next.js 15.5.20 build; no type or whitespace errors remain.
- Browser inspection of localhost, Railway, and the production domain was denied by the active browser security policy, so this iteration does not claim a fresh screenshot comparison.
