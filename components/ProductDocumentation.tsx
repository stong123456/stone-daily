"use client";

import {
  ArrowRight,
  Bomb,
  Brain,
  Broadcast,
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  CheckCircle,
  CloudSun,
  Database,
  FirstAid,
  GlobeHemisphereEast,
  Info,
  LockKey,
  Newspaper,
  Pulse,
  ShieldCheck,
  Sparkle,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useAppState } from "@/components/AppStateProvider";

const toc = [
  ["overview", "01 · 产品定位"],
  ["workflow", "02 · 推荐使用方式"],
  ["features", "03 · 完整功能"],
  ["markets", "04 · 行情与产品分类"],
  ["sources", "05 · 数据源与更新机制"],
  ["ai", "06 · AI 解读与冷静工具"],
  ["modes", "07 · 三组 UI 模式"],
  ["status", "08 · 数据状态说明"],
  ["privacy", "09 · 隐私与数据保存"],
  ["faq", "10 · 常见问题"],
] as const;

const features = [
  {
    href: "/account",
    eyebrow: "Personal home",
    title: "我的 Stone Daily",
    description: "以普通用户视角集中查看今日优先事项、自选、提醒、冷静记录和同步状态，游客也能完整使用。",
    detail: "钱包登录完全可选；个人首页不展示收益、持仓或交易建议。",
    Icon: UserCircle,
  },
  {
    href: "/markets",
    eyebrow: "Market terminal",
    title: "一站式实时行情",
    description: "聚合主流交易所的币圈现货与币股产品，支持搜索、交易所按钮筛选、赛道筛选、涨幅排序和自选。",
    detail: "同一资产在不同交易所保留独立报价，不把不兼容的成交量伪装成全网总量。",
    Icon: ChartLineUp,
  },
  {
    href: "/hotspots",
    eyebrow: "Daily briefing",
    title: "每日热点",
    description: "按北京时间从当日候选信息中重建热点排名，并分别呈现事实、影响、风险和来源。",
    detail: "分享摘要会整合中英文币圈与币股来源，翻译成当前界面语言后跨语言去重；热度不是推荐。",
    Icon: Newspaper,
  },
  {
    href: "/live",
    eyebrow: "Live wire",
    title: "7×24 财经快讯",
    description: "独立分页承载全球、宏观、币股、币圈、科技与监管快讯，支持分类、来源、分页和刷新。",
    detail: "每个来源单独显示健康状态，并保留原始链接。",
    Icon: Broadcast,
  },
  {
    href: "/calendar",
    eyebrow: "Macro schedule",
    title: "财经日历",
    description: "以北京时间展示事件时间、地区、重要性、实际值、预测值和前值，默认查看全部事件。",
    detail: "可切换今天、明天、本周和下周，并区分实时源与目录源。",
    Icon: CalendarCheck,
  },
  {
    href: "/today",
    eyebrow: "Market memory",
    title: "历史上的今天",
    description: "按当天月日实时检索可追溯的历史资料，筛选与市场、制度、科技和金融有关的事件。",
    detail: "没有可信结果时显示不可用，不用硬编码故事填空。",
    Icon: CalendarDots,
  },
  {
    href: "/weather",
    eyebrow: "Market weather",
    title: "市场天气",
    description: "把币圈和币股的涨跌广度、波动、FOMO 与数据源状态转换成直观的市场天气。",
    detail: "至少每分钟依据当前行情重新计算，首页和独立页面使用同一结果。",
    Icon: CloudSun,
  },
  {
    href: "/detox",
    eyebrow: "Noise detox",
    title: "热点拆弹器",
    description: "把推文、群聊、新闻标题或项目宣传拆成事实、推测、情绪、缺失证据和下一步核对项。",
    detail: "目标是降低信息噪音，而不是替用户判断涨跌。",
    Icon: Bomb,
  },
  {
    href: "/regret",
    eyebrow: "Pause before action",
    title: "后悔药按钮",
    description: "在转账、授权、追涨或重大决定前，先完成一次未来视角的风险检查。",
    detail: "冷静记录只保存在当前设备，可在“我的记录”中回看或删除。",
    Icon: FirstAid,
  },
] as const;

const productRows = [
  ["币圈现货", "交易所现货报价", "crypto-spot", "交易所、流动性、项目与市场波动风险"],
  ["币股现货", "与股票或 ETF 挂钩的代币化产品", "tokenized-spot", "不自动获得登记股票、投票权或传统证券账户权益"],
  ["链上币股", "链上代币与支持资产结构", "tokenized-onchain", "需额外核对合约、托管、鉴证、赎回与链上流动性"],
  ["币股永续", "追踪币股标的的永续衍生品", "tokenized-perpetual", "存在资金费率、保证金、杠杆与强平风险，不是现货持仓"],
] as const;

const statusRows = [
  ["在线", "刚从官方公开接口取得有效行情或内容。", "live"],
  ["秒级流", "页面正在接收 Railway 共享流的短间隔报价覆盖。", "stream"],
  ["缓存", "当前接口暂不可用，展示最近一次成功快照并标注时间。", "cached"],
  ["目录", "能确认产品或事件存在，但没有把它冒充实时价格。", "catalog"],
  ["暂不可用", "该来源本次请求失败、受地区限制或没有有效结果。", "unavailable"],
  ["演示 / fallback", "仅用于保持页面结构可理解，不能当作当前市场事实。", "fallback"],
] as const;

const faqs = [
  ["Stone Daily 是券商或交易所吗？", "不是。Stone Daily 是公共行情与市场信息门户，不接收用户资金、不代客交易，也不执行买卖指令。"],
  ["这里的“美股”为什么叫币股？", "因为本站展示的是加密原生的代币化股票、链上股票代币和股票相关永续合约，不是纽约证券交易所或纳斯达克券商账户里的普通股票。"],
  ["为什么同一个资产会出现多行？", "每一行代表一个独立交易场所或产品结构。价格、成交量、交易时间和权利可能不同，因此本站不会把它们强行合成一条看似精确的全球价格。"],
  ["为什么 Kraken 有时显示现货，有时显示永续？", "Kraken xStocks 现货订单簿会受地区与资格影响。现货可用时展示现货；现货不可见时，本站会读取其公开 xStocks Futures 行情，并明确标注为永续。"],
  ["AI 解读是在预测价格吗？", "不是。它根据资产、交易所、产品类型、涨跌幅、成交活跃度和当前上下文生成可能原因、风险与核对路径，不把相关性写成确定因果，也不提供收益承诺。"],
  ["自选和冷静记录会上传吗？", "默认不会。它们先保存在浏览器 localStorage；只有用户主动使用钱包签名登录后，才会同步到 Stone Daily。登录签名、余额、持仓、私钥、交易所 API Key 不会保存。"],
  ["行情为什么可能与交易所 App 略有差异？", "网络延迟、快照刷新、计价币种、合约标记价格与最新成交价都可能造成差异。请以页面显示的来源、产品类型、状态与更新时间为准。"],
  ["可以把 Stone Daily 当投资建议吗？", "不可以。本站只帮助理解信息、识别风险和延迟冲动；任何交易与资金决定都需要用户自行核对并承担结果。"],
] as const;

const tocEn = [
  ["overview", "01 · Positioning"], ["workflow", "02 · Workflow"], ["features", "03 · Features"], ["markets", "04 · Product types"], ["sources", "05 · Data architecture"], ["ai", "06 · AI & calm tools"], ["modes", "07 · UI modes"], ["status", "08 · Data states"], ["privacy", "09 · Privacy"], ["faq", "10 · FAQ"],
] as const;

const featuresEn = [
  { href: "/account", eyebrow: "Personal home", title: "My Stone Daily", description: "A guest-first home for today's priorities, watchlists, alerts, pause records and sync status.", detail: "Wallet sign-in is optional; the dashboard never presents PnL, positions or personalized trade advice.", Icon: UserCircle },
  { href: "/markets", eyebrow: "Market terminal", title: "One-stop live markets", description: "Aggregate crypto spot and tokenized-stock products with search, venue buttons, sector filters, gain sorting and watchlists.", detail: "Quotes remain venue-specific; incompatible volume fields are never presented as a global total.", Icon: ChartLineUp },
  { href: "/hotspots", eyebrow: "Daily briefing", title: "Daily Pulse", description: "Rebuild same-day stories in Beijing time and separate facts, relevance, risk and original sources.", detail: "Share digests combine Chinese and English crypto and tokenized-stock sources, translate into the active UI language and deduplicate across languages.", Icon: Newspaper },
  { href: "/live", eyebrow: "Live wire", title: "7×24 market wire", description: "A standalone feed for global, macro, tokenized-stock, crypto, technology and regulatory stories.", detail: "Filter by category and source, paginate, refresh and inspect every provider's health.", Icon: Broadcast },
  { href: "/calendar", eyebrow: "Macro schedule", title: "Economic calendar", description: "Beijing-time events with region, importance, actual, forecast and previous values.", detail: "Defaults to all events and distinguishes live schedules from reviewed catalogues.", Icon: CalendarCheck },
  { href: "/today", eyebrow: "Market memory", title: "On This Day", description: "Retrieve traceable events for today's month and day, ranked for market, institutional and technology relevance.", detail: "If no reliable result exists, the page shows an unavailable state instead of a hard-coded story.", Icon: CalendarDots },
  { href: "/weather", eyebrow: "Market weather", title: "Market weather", description: "Turn breadth, volatility, FOMO and feed health into an intuitive whole-market reading.", detail: "Recomputed at least once per minute from the same market data used across the site.", Icon: CloudSun },
  { href: "/detox", eyebrow: "Noise detox", title: "Hype detox", description: "Separate a post, headline or pitch into facts, inference, emotion, missing evidence and checks.", detail: "Designed to reduce noise, not predict direction.", Icon: Bomb },
  { href: "/regret", eyebrow: "Pause before action", title: "Decision pause button", description: "Run a future-regret check before a transfer, approval, chase or major decision.", detail: "Pause records remain on the current device and can be reviewed or deleted.", Icon: FirstAid },
] as const;

const productRowsEn = [
  ["Crypto spot", "Exchange spot quote", "crypto-spot", "Venue, liquidity, project and market volatility risk"],
  ["Tokenized-stock spot", "Token linked to a stock or ETF", "tokenized-spot", "Does not automatically grant registered-share, voting or brokerage rights"],
  ["Onchain tokenized stock", "Onchain token and backing structure", "tokenized-onchain", "Verify contract, custody, attestation, redemption and onchain liquidity"],
  ["Tokenized-stock perpetual", "Perpetual derivative tracking a stock-linked product", "tokenized-perpetual", "Funding, margin, leverage and liquidation risk; not spot ownership"],
] as const;

const statusRowsEn = [
  ["Live", "A valid quote or story was just received from an official public endpoint.", "live"],
  ["Second-level stream", "The page is receiving short-interval overlays from the shared Railway stream.", "stream"],
  ["Cached", "The current endpoint is unavailable; the last successful snapshot and time are shown.", "cached"],
  ["Catalogue", "Product or event existence is confirmed without pretending there is a live price.", "catalog"],
  ["Unavailable", "The request failed, is region-limited or returned no valid result.", "unavailable"],
  ["Demo / fallback", "Used only to keep the interface understandable; not a current market fact.", "fallback"],
] as const;

const faqsEn = [
  ["Is Stone Daily a broker or exchange?", "No. Stone Daily is a public market-information portal. It does not custody funds, trade for users or execute orders."],
  ["What does “tokenized stocks” mean here?", "The site covers crypto-native tokenized-stock spot, onchain stock tokens and stock-linked perpetuals—not ordinary shares in a NYSE or Nasdaq brokerage account."],
  ["Why can one asset appear on several rows?", "Each row is a venue or product structure. Price, volume, hours and holder rights can differ, so they are not forced into one artificial global price."],
  ["Why does Kraken sometimes show spot and sometimes perpetuals?", "Kraken xStocks spot books depend on region and eligibility. When spot is not visible, public xStocks Futures data may remain available and is labelled as perpetual."],
  ["Does the AI predict price?", "No. It explains the observed move, possible context, missing evidence and product-specific risk without turning correlation into certain cause."],
  ["Are watchlists and pause records uploaded?", "Not by default. They remain in localStorage unless you explicitly sign in with a wallet. Login signatures, balances, positions, private keys and exchange API keys are never stored."],
  ["Why can prices differ from an exchange app?", "Network lag, snapshot timing, quote currency, mark price and last-trade price can differ. Read source, product type, status and update time together."],
  ["Can I treat Stone Daily as investment advice?", "No. It supports information literacy, risk recognition and slower decisions. You remain responsible for every financial action."],
] as const;

function EnglishProductDocumentation() {
  return (
    <article className="product-docs">
      <header className="product-docs__hero">
        <div className="product-docs__hero-copy"><span>Stone Daily product guide</span><h1>Complete Product Guide</h1><p>A guide for everyday users, creators and data readers: what Stone Daily does, where its information comes from, how tokenized-stock products differ and what the product will never do.</p><div className="product-docs__actions"><Link className="button button--primary" href="/markets">Open live markets <ArrowRight size={17} /></Link><a className="button button--secondary" href="#features">Browse every feature</a></div></div>
        <div className="product-docs__identity"><Image alt="Stone Daily brand mark" height={112} priority src="/assets/stone-daily-mark.png" width={112} /><div><small>Current guide</small><strong>Daily habit edition</strong><span>Updated 2026-08-03</span></div><dl><div><dt>Crypto sources</dt><dd>10</dd></div><div><dt>Tokenized-stock sources</dt><dd>5</dd></div><div><dt>Public feature pages</dt><dd>10+</dd></div></dl></div>
      </header>
      <div className="product-docs__layout">
        <aside className="product-docs__toc"><span>Contents</span><nav aria-label="Product guide contents">{tocEn.map(([href, label]) => <a href={`#${href}`} key={href}>{label}</a>)}</nav><div><ShieldCheck size={18} weight="duotone" /><p><strong>Core boundary</strong><span>No trade calls, execution or promised returns.</span></p></div></aside>
        <div className="product-docs__content">
          <section className="docs-section" id="overview"><div className="docs-section__heading"><span>01 · Overview</span><h2>Product positioning</h2></div><p className="docs-lead">Stone Daily is an AI-assisted crypto and tokenized-stock market portal for everyday users. It reorganizes information scattered across exchanges, financial wires, macro calendars and historical archives into one understandable, verifiable and calmer public entry point.</p><div className="docs-principle-grid"><article><GlobeHemisphereEast size={24} weight="duotone" /><h3>One place, clear boundaries</h3><p>Markets, news, calendars and risk tools live together while venues and product structures remain distinct.</p></article><article><Brain size={24} weight="duotone" /><h3>Translate markets, not destiny</h3><p>AI explains observed data and possible context while preserving uncertainty, sources and next checks.</p></article><article><ShieldCheck size={24} weight="duotone" /><h3>Protect understanding first</h3><p>The design supports information literacy, risk education and slower decisions—not higher trading frequency.</p></article></div><div className="docs-notice"><Info size={20} /><p><strong>Who it is for:</strong> people new to tokenized stocks, multi-venue market watchers, fast market readers and public creators who need daily source-backed themes.</p></div></section>
          <section className="docs-section" id="workflow"><div className="docs-section__heading"><span>02 · Workflow</span><h2>Recommended daily workflow</h2></div><div className="docs-flow"><article><span>01</span><div><strong>Check the focused market board</strong><p>Start with popular crypto, tokenized stocks, gainers, decliners, volume anomalies and market weather.</p></div></article><article><span>02</span><div><strong>Tap one short AI brief</strong><p>Read the surface move, the real next check, the common misread and one plain-language conclusion.</p></div></article><article><span>03</span><div><strong>Save or share the context</strong><p>Add the asset to a watchlist, keep the AI record or generate a branded share image for X.</p></div></article><article><span>04</span><div><strong>Pause before action</strong><p>Use Hype Detox or the Decision Pause Button before urgency becomes execution.</p></div></article></div></section>
          <section className="docs-section" id="features"><div className="docs-section__heading"><span>03 · Feature map</span><h2>Complete feature map</h2><p>Public market features work without an account; the personal home is guest-first and wallet sync remains optional.</p></div><div className="docs-feature-grid">{featuresEn.map(({ href, eyebrow, title, description, detail, Icon }) => <Link className="docs-feature-card" href={href} key={href}><span><Icon size={23} weight="duotone" /></span><small>{eyebrow}</small><h3>{title}</h3><p>{description}</p><em>{detail}</em><b>Open feature <ArrowRight size={14} /></b></Link>)}</div><div className="docs-feature-note"><Pulse size={20} /><p><strong>Two global moving tapes:</strong> every public page includes a deduplicated 24-hour Top 20 gainers tape and the latest 7×24 wire. Hover or reduced-motion preferences pause animation.</p></div></section>
          <section className="docs-section" id="markets"><div className="docs-section__heading"><span>04 · Product taxonomy</span><h2>Markets and product types</h2><p>Looking like the same stock does not create the same holder rights.</p></div><div className="docs-table-wrap"><table className="docs-table"><thead><tr><th>Category</th><th>What the row represents</th><th>Internal type</th><th>Key risk</th></tr></thead><tbody>{productRowsEn.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><div className="docs-split-cards"><article><h3>Crypto spot coverage</h3><p>Binance, OKX, Bitget, Bybit, HTX, Kraken, KuCoin, Gate, MEXC and Coinbase. Each venue keeps its own price and volume.</p></article><article><h3>Tokenized-stock coverage</h3><p>Bitget rToken, Bybit xStocks spot, Kraken xStocks spot/perpetuals, OKX stock perpetuals and Binance Web3 / Ondo onchain catalogues.</p></article></div><div className="docs-warning"><WarningCircle size={21} /><p><strong>Important:</strong> tokenized-stock products are not direct NYSE or Nasdaq shares. Similar symbols or prices do not automatically create traditional shareholder rights.</p></div></section>
          <section className="docs-section" id="sources"><div className="docs-section__heading"><span>05 · Data architecture</span><h2>Sources and update mechanics</h2></div><div className="docs-architecture"><article><Database size={24} weight="duotone" /><div><strong>Official public feeds first</strong><p>Each venue adapter has independent requests, timeouts and visible health.</p></div></article><article><Broadcast size={24} weight="duotone" /><div><strong>Shared second-level stream</strong><p>A long-running Railway gateway supplies short-interval SSE quotes; snapshots and optional Redis/KV provide fallback.</p></div></article><article><CheckCircle size={24} weight="duotone" /><div><strong>Deduplicate without false aggregation</strong><p>Rankings deduplicate canonical symbols while market tables retain venue rows and incompatible volumes remain separate.</p></div></article></div><div className="docs-provider-grid"><article><h3>News and 7×24</h3><p>Sina Finance, the Federal Reserve, ECB, BOJ, SEC, Cointelegraph, Decrypt and Kraken Blog.</p></article><article><h3>Economic calendar</h3><p>BLS live schedules; Fed, ECB and BEA catalogues; optional Trading Economics when a real server-side key is configured.</p></article><article><h3>Historical archives</h3><p>Chinese public archives and encyclopedias by Beijing month/day, with original links preserved.</p></article></div></section>
          <section className="docs-section" id="ai"><div className="docs-section__heading"><span>06 · AI and risk</span><h2>AI briefs and calm tools</h2></div><p className="docs-lead docs-lead--small">Asset explanations use symbol, venue, product type, move, activity and context. The default answer stays short, while the full evidence remains expandable.</p><div className="docs-ai-grid"><article><Sparkle size={22} /><h3>Four-part AI brief</h3><p>On the surface, what really matters, what not to misread and one plain-language conclusion. Results are cached for 30 minutes.</p></article><article><FirstAid size={22} /><h3>Help me pause</h3><p>Move attention from immediate action to liquidity, source, position size and worst-case outcomes.</p></article><article><Bomb size={22} /><h3>History and share cards</h3><p>AI, detox and pause records form a local calm journal; each result can generate a branded PNG.</p></article></div><div className="docs-boundaries"><h3>Usage structure and boundaries</h3><ul><li><CheckCircle size={16} />Guests receive 3 daily AI briefs; wallet users receive 10</li><li><CheckCircle size={16} />Pro is reserved but not currently sold</li><li><CheckCircle size={16} />No buy, sell or position-size instruction</li><li><CheckCircle size={16} />Always surface source, structure and regional limits</li></ul></div></section>
          <section className="docs-section" id="modes"><div className="docs-section__heading"><span>07 · Interface modes</span><h2>Three UI modes</h2><p>All modes share the same product, routes and data; only information framing changes.</p></div><div className="docs-mode-grid"><article data-mode="brief"><small>Brief</small><h3>Brief mode</h3><p>Fast reading with today's overview, market weather and priority information.</p></article><article data-mode="lens"><small>Lens</small><h3>Lens mode</h3><p>Higher density for changes, metrics, risk and cross-market context.</p></article><article data-mode="calm"><small>Calm</small><h3>Calm mode</h3><p>Softer visual stimulation and decision-friction prompts.</p></article></div><p className="docs-caption">The choice is stored in this browser and never changes route or data access.</p></section>
          <section className="docs-section" id="status"><div className="docs-section__heading"><span>08 · Data states</span><h2>Data-state definitions</h2></div><div className="docs-status-list">{statusRowsEn.map(([name, description, status]) => <article key={name}><span data-status={status}>{name}</span><p>{description}</p></article>)}</div><div className="docs-notice"><Info size={20} /><p>Read price, change, source, update time and product type together. One number is not enough to know whether it is current, tradable or available in your region.</p></div></section>
          <section className="docs-section" id="privacy"><div className="docs-section__heading"><span>09 · Privacy</span><h2>Privacy and local data</h2></div><div className="docs-privacy-card"><LockKey size={28} weight="duotone" /><div><h3>No wallet connection is required</h3><p>Product settings first use localStorage. Optional EVM sign-in uses a single-use EIP-4361 message and an HttpOnly session; the wallet address becomes the account identifier, while the signature is verified and discarded.</p></div></div><ul className="docs-check-list"><li><CheckCircle size={17} />No custody, transaction or token approval</li><li><CheckCircle size={17} />No signatures, balances, positions or API keys stored</li><li><CheckCircle size={17} />No analytics cookies, raw IP addresses or full user-agent strings stored</li><li><CheckCircle size={17} />Conflict-safe revisions preserve local data for user review</li><li><CheckCircle size={17} />External sites apply their own privacy policies</li></ul></section>
          <section className="docs-section" id="faq"><div className="docs-section__heading"><span>10 · FAQ</span><h2>Frequently asked questions</h2></div><div className="docs-faq">{faqsEn.map(([question, answer]) => <details key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div></section>
          <section className="docs-closing"><div><span>Markets. Insights. Every day.</span><h2>Understand markets—and protect your judgment.</h2><p>Stone Daily does not decide for you. It aims to add evidence and boundaries before impulse becomes action.</p></div><Link className="button button--primary" href="/markets">Enter Stone Daily <ArrowRight size={17} /></Link></section>
        </div>
      </div>
    </article>
  );
}

export function ProductDocumentation() {
  const { language } = useAppState();
  if (language === "en") return <EnglishProductDocumentation />;
  return (
    <article className="product-docs">
      <header className="product-docs__hero">
        <div className="product-docs__hero-copy">
          <span>Stone Daily product guide</span>
          <h1>完整产品文档</h1>
          <p>一份面向普通用户、内容创作者和数据使用者的说明书：Stone Daily 能做什么、数据从哪里来、不同币股产品有什么区别，以及哪些事情它明确不会做。</p>
          <div className="product-docs__actions">
            <Link className="button button--primary" href="/markets">打开实时行情 <ArrowRight size={17} /></Link>
            <a className="button button--secondary" href="#features">浏览全部功能</a>
          </div>
        </div>
        <div className="product-docs__identity">
          <Image alt="Stone Daily 品牌标志" height={112} priority src="/assets/stone-daily-mark.png" width={112} />
          <div><small>当前产品说明</small><strong>Daily habit edition</strong><span>更新于 2026-08-03</span></div>
          <dl>
            <div><dt>币圈行情源</dt><dd>10</dd></div>
            <div><dt>币股产品源</dt><dd>5</dd></div>
            <div><dt>公共功能页</dt><dd>9+</dd></div>
          </dl>
        </div>
      </header>

      <div className="product-docs__layout">
        <aside className="product-docs__toc">
          <span>文档目录</span>
          <nav aria-label="产品文档目录">
            {toc.map(([href, label]) => <a href={`#${href}`} key={href}>{label}</a>)}
          </nav>
          <div><ShieldCheck size={18} weight="duotone" /><p><strong>核心边界</strong><span>不喊单，不代客交易，不承诺收益。</span></p></div>
        </aside>

        <div className="product-docs__content">
          <section className="docs-section" id="overview">
            <div className="docs-section__heading"><span>01 · Overview</span><h2>产品定位</h2></div>
            <p className="docs-lead">Stone Daily 是一个面向普通人的 AI 币股与币圈行情门户。它把分散在交易所、财经快讯、宏观日历和历史资料里的信息，整理成更容易理解、更容易核对、也更不容易让人上头的公共入口。</p>
            <div className="docs-principle-grid">
              <article><GlobeHemisphereEast size={24} weight="duotone" /><h3>一站式，但不混为一谈</h3><p>行情、热点、日历和风险工具在同一个站点；不同交易所与不同产品结构仍保持清晰边界。</p></article>
              <article><Brain size={24} weight="duotone" /><h3>翻译市场，不预测命运</h3><p>AI 用人话解释数据和可能原因，同时保留不确定性、来源与下一步核对项。</p></article>
              <article><ShieldCheck size={24} weight="duotone" /><h3>先保护理解</h3><p>所有产品设计都围绕信息识别、风险教育和冲动延迟，而不是刺激交易频率。</p></article>
            </div>
            <div className="docs-notice"><Info size={20} /><p><strong>适合谁：</strong>第一次接触币股的人、需要快速了解市场的人、关注多个交易所的用户，以及需要每日热点素材的公共内容创作者。</p></div>
          </section>

          <section className="docs-section" id="workflow">
            <div className="docs-section__heading"><span>02 · Workflow</span><h2>推荐使用方式</h2></div>
            <div className="docs-flow">
              <article><span>01</span><div><strong>先看首页精选行情</strong><p>同时查看热门币、热门币股、涨跌榜、成交量异动榜和实时市场天气。</p></div></article>
              <article><span>02</span><div><strong>点一次短版 AI 解读</strong><p>依次看表面变化、真正要看、常见误读和一句话结论，需要时再展开证据。</p></div></article>
              <article><span>03</span><div><strong>留下自选、记录或分享图</strong><p>关注资产、保留当时的 AI 提醒，或生成带品牌署名的 PNG 分享到 X。</p></div></article>
              <article><span>04</span><div><strong>行动前停一下</strong><p>用热点拆弹器或后悔药按钮检查证据、风险和自己的情绪。</p></div></article>
            </div>
          </section>

          <section className="docs-section" id="features">
            <div className="docs-section__heading"><span>03 · Feature map</span><h2>完整功能目录</h2><p>公共行情功能无需账号；个人首页以游客模式优先，钱包同步仍然完全可选。</p></div>
            <div className="docs-feature-grid">
              {features.map(({ href, eyebrow, title, description, detail, Icon }) => (
                <Link className="docs-feature-card" href={href} key={href}>
                  <span><Icon size={23} weight="duotone" /></span>
                  <small>{eyebrow}</small>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <em>{detail}</em>
                  <b>打开功能 <ArrowRight size={14} /></b>
                </Link>
              ))}
            </div>
            <div className="docs-feature-note"><Pulse size={20} /><p><strong>全站顶部双滚动横幅：</strong>每个公共页面都带有去重后的 24 小时涨幅 Top 20，以及最新 7×24 快讯。鼠标悬停可暂停，系统开启“减少动态效果”时也会停止动画。</p></div>
          </section>

          <section className="docs-section" id="markets">
            <div className="docs-section__heading"><span>04 · Product taxonomy</span><h2>行情与产品分类</h2><p>“看起来像同一个股票”不代表拥有相同权利。</p></div>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead><tr><th>本站分类</th><th>页面代表什么</th><th>内部产品标识</th><th>必须注意</th></tr></thead>
                <tbody>{productRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="docs-split-cards">
              <article><h3>币圈现货覆盖</h3><p>Binance、OKX、Bitget、Bybit、HTX、Kraken、KuCoin、Gate、MEXC 与 Coinbase。默认按 24 小时涨幅排序，并保留每个交易所自己的价格与成交量。</p></article>
              <article><h3>币股产品覆盖</h3><p>Bitget rToken、Bybit xStocks 现货、Kraken xStocks 现货/永续、OKX 币股永续，以及 Binance Web3 / Ondo 链上币股目录。</p></article>
            </div>
            <div className="docs-warning"><WarningCircle size={21} /><p><strong>重要：</strong>Stone Daily 中的“美股”指加密原生币股产品，不是直接的 NYSE / Nasdaq 股票。代币名称、基础资产代码和价格接近，都不等于拥有传统股东权利。</p></div>
          </section>

          <section className="docs-section" id="sources">
            <div className="docs-section__heading"><span>05 · Data architecture</span><h2>数据源与更新机制</h2></div>
            <div className="docs-architecture">
              <article><Database size={24} weight="duotone" /><div><strong>官方公开行情优先</strong><p>每个交易所适配器独立请求、独立超时、独立显示状态；单一来源故障不会被隐藏成“全站正常”。</p></div></article>
              <article><Broadcast size={24} weight="duotone" /><div><strong>共享秒级行情流</strong><p>Railway 长运行网关向页面提供短间隔 SSE 报价覆盖；API 快照与可选 Redis/KV 负责降频兜底。</p></div></article>
              <article><CheckCircle size={24} weight="duotone" /><div><strong>去重但不造假合并</strong><p>顶部榜单按规范化资产代码去重；行情表仍保留交易所维度，不相加不同口径的成交量。</p></div></article>
            </div>
            <div className="docs-provider-grid">
              <article><h3>新闻与 7×24</h3><p>新浪财经 7×24、美联储、欧洲央行、日本央行、美国 SEC、Cointelegraph、Decrypt 与 Kraken Blog。</p></article>
              <article><h3>财经日历</h3><p>美国劳工统计局实时日程；美联储、欧洲央行和美国经济分析局目录；配置真实密钥后可接入 Trading Economics。</p></article>
              <article><h3>历史资料</h3><p>按北京时间的月日检索中文历史档案与百科资料，保留来源链接，并按财经与科技相关度筛选。</p></article>
            </div>
          </section>

          <section className="docs-section" id="ai">
            <div className="docs-section__heading"><span>06 · AI and risk</span><h2>AI 解读与冷静工具</h2></div>
            <p className="docs-lead docs-lead--small">每个资产的解读会结合代码、交易所、产品类型、涨跌幅、成交活跃度和当前上下文生成；默认先给短版人话结论，完整证据仍可展开。</p>
            <div className="docs-ai-grid">
              <article><Sparkle size={22} /><h3>四段式 AI 解读</h3><p>固定呈现“表面看、真正要看、普通人别误会、一句话”，同资产结果缓存 30 分钟。</p></article>
              <article><FirstAid size={22} /><h3>帮我冷静</h3><p>面对大涨大跌时，把注意力从“马上行动”移到流动性、来源、仓位和最坏情况。</p></article>
              <article><Bomb size={22} /><h3>历史与分享图</h3><p>AI、拆弹和冷静结果组成个人市场日记，每次结果都能生成带 Logo 与署名的分享图。</p></article>
            </div>
            <div className="docs-boundaries"><h3>额度结构与输出边界</h3><ul><li><CheckCircle size={16} />游客每天 3 次，钱包用户每天 10 次</li><li><CheckCircle size={16} />Pro 仅预留结构，当前暂不收费</li><li><CheckCircle size={16} />不输出买入、卖出或仓位指令</li><li><CheckCircle size={16} />始终提示数据源、产品结构与地区限制</li></ul></div>
          </section>

          <section className="docs-section" id="modes">
            <div className="docs-section__heading"><span>07 · Interface modes</span><h2>三组 UI 模式</h2><p>三套界面共享同一产品、路由和数据，只改变信息组织方式。</p></div>
            <div className="docs-mode-grid">
              <article data-mode="brief"><small>Brief</small><h3>早报模式</h3><p>适合快速浏览：强调今日概览、市场天气和最值得先看的信息。</p></article>
              <article data-mode="lens"><small>Lens</small><h3>信号模式</h3><p>适合数据阅读：密度更高，突出变化、指标、风险与跨市场线索。</p></article>
              <article data-mode="calm"><small>Calm</small><h3>冷静模式</h3><p>适合降低刺激：更柔和的视觉与情绪提示，帮助用户放慢决策速度。</p></article>
            </div>
            <p className="docs-caption">选择会保存在当前浏览器中；切换模式不会改变你能访问的功能或行情数据。</p>
          </section>

          <section className="docs-section" id="status">
            <div className="docs-section__heading"><span>08 · Data states</span><h2>数据状态说明</h2></div>
            <div className="docs-status-list">
              {statusRows.map(([name, description, status]) => <article key={name}><span data-status={status}>{name}</span><p>{description}</p></article>)}
            </div>
            <div className="docs-notice"><Info size={20} /><p>页面显示的价格、涨跌、来源、更新时间和产品类型应一起阅读。单独看到一个数字，不足以判断它是不是当前、可交易或与你所在地区可用。</p></div>
          </section>

          <section className="docs-section" id="privacy">
            <div className="docs-section__heading"><span>09 · Privacy</span><h2>隐私与数据保存</h2></div>
            <div className="docs-privacy-card"><LockKey size={28} weight="duotone" /><div><h3>不要求连接钱包</h3><p>产品设置优先保存在浏览器 localStorage。可选 EVM 登录使用一次性 EIP-4361 消息和 HttpOnly 会话；钱包地址作为账号标识，签名完成验证后立即丢弃。</p></div></div>
            <ul className="docs-check-list"><li><CheckCircle size={17} />不托管资金、不发交易、不做代币授权</li><li><CheckCircle size={17} />不保存签名、余额、持仓或 API 密钥</li><li><CheckCircle size={17} />不保存分析 Cookie、原始 IP 或完整 User-Agent</li><li><CheckCircle size={17} />版本冲突保留两边数据并交给用户选择</li><li><CheckCircle size={17} />外部来源链接会跳转到对应网站，其隐私规则由对方负责</li></ul>
          </section>

          <section className="docs-section" id="faq">
            <div className="docs-section__heading"><span>10 · FAQ</span><h2>常见问题</h2></div>
            <div className="docs-faq">
              {faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}
            </div>
          </section>

          <section className="docs-closing">
            <div><span>Markets. Insights. Every day.</span><h2>看懂市场，也照顾好自己的判断。</h2><p>Stone Daily 不替你做决定，但希望每一次决定，都比冲动多一点证据、多一点边界。</p></div>
            <Link className="button button--primary" href="/markets">进入 Stone Daily <ArrowRight size={17} /></Link>
          </section>
        </div>
      </div>
    </article>
  );
}
