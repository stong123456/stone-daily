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
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

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
    detail: "热度不是推荐，旧公告不会冒充今日热点。",
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
  ["自选和冷静记录会上传吗？", "当前版本没有账户系统。UI 模式、自选列表和冷静记录保存在浏览器 localStorage 中；清理浏览器数据或更换设备后不会自动同步。"],
  ["行情为什么可能与交易所 App 略有差异？", "网络延迟、快照刷新、计价币种、合约标记价格与最新成交价都可能造成差异。请以页面显示的来源、产品类型、状态与更新时间为准。"],
  ["可以把 Stone Daily 当投资建议吗？", "不可以。本站只帮助理解信息、识别风险和延迟冲动；任何交易与资金决定都需要用户自行核对并承担结果。"],
] as const;

export function ProductDocumentation() {
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
          <div><small>当前产品说明</small><strong>Final portal edition</strong><span>更新于 2026-07-26</span></div>
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
              <article><span>01</span><div><strong>先看市场天气</strong><p>用广度、波动与 FOMO 判断今天是平静、偏热还是风险升高。</p></div></article>
              <article><span>02</span><div><strong>再看实时行情</strong><p>按交易所和产品类型找到真实报价，确认它究竟是现货、链上代币还是永续。</p></div></article>
              <article><span>03</span><div><strong>补齐当天上下文</strong><p>结合每日热点、7×24 快讯、财经日历与历史事件理解可能影响。</p></div></article>
              <article><span>04</span><div><strong>行动前停一下</strong><p>用 AI 解读、热点拆弹器或后悔药按钮检查证据、风险和自己的情绪。</p></div></article>
            </div>
          </section>

          <section className="docs-section" id="features">
            <div className="docs-section__heading"><span>03 · Feature map</span><h2>完整功能目录</h2><p>所有功能均为公共入口，无需个人账号。</p></div>
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
            <p className="docs-lead docs-lead--small">每个资产的解读会结合代码、名称、交易所、产品类型、涨跌幅、成交活跃度和当前上下文生成，不再给所有代币套同一段模板。</p>
            <div className="docs-ai-grid">
              <article><Sparkle size={22} /><h3>AI 解读</h3><p>说明发生了什么、哪些因素可能相关、还缺什么证据，以及该产品特有的风险。</p></article>
              <article><FirstAid size={22} /><h3>帮我冷静</h3><p>面对大涨大跌时，把注意力从“马上行动”移到流动性、来源、仓位和最坏情况。</p></article>
              <article><Bomb size={22} /><h3>信息拆弹</h3><p>把营销语言和情绪词拆开，明确事实、推断、未验证主张与核对清单。</p></article>
            </div>
            <div className="docs-boundaries"><h3>AI 输出的四条边界</h3><ul><li><CheckCircle size={16} />不把相关性写成确定因果</li><li><CheckCircle size={16} />不输出买入、卖出或仓位指令</li><li><CheckCircle size={16} />不承诺收益或准确率</li><li><CheckCircle size={16} />始终提示数据源、产品结构与地区限制</li></ul></div>
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
            <div className="docs-privacy-card"><LockKey size={28} weight="duotone" /><div><h3>当前版本不要求注册账号</h3><p>UI 模式、自选列表与冷静记录使用浏览器 localStorage 保存在当前设备。它们不会自动跨设备同步；用户可以在站内删除记录，也可以通过浏览器清理本地数据。</p></div></div>
            <ul className="docs-check-list"><li><CheckCircle size={17} />不托管用户资金</li><li><CheckCircle size={17} />不保存交易所 API 密钥</li><li><CheckCircle size={17} />不代替用户执行交易</li><li><CheckCircle size={17} />外部来源链接会跳转到对应网站，其隐私规则由对方负责</li></ul>
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
