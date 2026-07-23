import type { AIExplanation, HotspotAnalysis, MarketAsset, RegretAnalysis } from "@/types/market";

const simulateLatency = (ms = 680) => new Promise((resolve) => setTimeout(resolve, ms));

type AssetLens = {
  focus: string;
  drivers: string[];
  watch: string[];
  mistake: string;
  calm: string;
};

const symbolLenses: Record<string, AssetLens> = {
  BTC: { focus: "全球流动性与市场风险偏好", drivers: ["现货资金流、美元流动性与风险资产情绪", "BTC 市占率变化与大额持仓者的供给节奏", "宏观数据对利率路径的重新定价"], watch: ["BTC 市占率与现货成交额是否同向", "主要交易所价差是否快速扩大", "宏观数据公布后能否守住原有方向"], mistake: "不要把 BTC 当成永远单边上行的“数字避险资产”。", calm: "BTC 流动性较深，也仍可能在高杠杆清算时快速扫过多个价位。" },
  ETH: { focus: "链上需求、质押与扩容生态", drivers: ["主网手续费、稳定币结算与 DeFi 活跃度", "质押供给变化和机构配置预期", "Layer 2 活动对 ETH 价值捕获的再评估"], watch: ["Gas、稳定币转账与 DeFi 锁仓是否同步改善", "ETH/BTC 是否确认相对强弱", "升级、质押或监管信息是否改变供给预期"], mistake: "生态使用增加不一定等于代币价格立刻兑现。", calm: "ETH 的故事很多，先分清是链上使用增长，还是市场只在交易升级预期。" },
  SOL: { focus: "链上活跃、应用收入与网络稳定性", drivers: ["DEX、支付和 Meme 交易带来的链上活跃", "验证者与网络稳定性预期", "高性能公链之间的资金轮动"], watch: ["真实用户与交易手续费能否延续", "网络拥堵或失败率是否恶化", "SOL/BTC 与同类公链是否同步"], mistake: "高 TPS 和热门应用不代表每一次价格加速都可持续。", calm: "SOL 的波动通常比 BTC 更大，热度退潮时流动性也可能收缩得更快。" },
  XRP: { focus: "支付采用、监管进展与大额供给", drivers: ["跨境支付合作与采用预期", "监管事件及诉讼进展", "托管释放和大额持仓者供给"], watch: ["消息是否来自监管或项目官方", "成交量能否在消息热度后维持", "大额转账与交易所净流入是否异常"], mistake: "法律或合作消息不等于收入和使用量已经兑现。", calm: "XRP 容易被单一消息快速推动，先等原始文件和成交持续性。" },
  BNB: { focus: "交易平台活动与生态使用", drivers: ["平台交易活跃和 Launchpool 等产品需求", "BNB Chain 链上活动与手续费", "平台监管与代币销毁预期"], watch: ["平台现货与衍生品活跃度", "链上手续费与活跃地址", "监管或平台公告是否改变使用场景"], mistake: "平台业务强不代表平台币没有公司与监管集中风险。", calm: "BNB 同时受市场和单一平台事件影响，仓位不应忽略集中度。" },
  DOGE: { focus: "社交热度、流动性与大户行为", drivers: ["社交平台讨论和名人效应", "Meme 板块整体轮动", "大额地址和做市流动性变化"], watch: ["热度能否转化为持续成交", "大额地址是否向交易所转入", "Meme 板块是否出现普遍退潮"], mistake: "社区热度不是现金流，熟悉的名字也不等于低风险。", calm: "DOGE 的叙事传播快于基本面验证，追涨前先接受它可能快速回吐。" },
  PEPE: { focus: "Meme 热度、持仓集中与退出流动性", drivers: ["社交热词和 Meme 资金轮动", "头部地址的买卖节奏", "交易所深度与短线做市变化"], watch: ["前十地址集中度与大额转账", "上涨时成交深度是否同步增加", "同类 Meme 是否集体转弱"], mistake: "涨得快只说明边际买盘急，不代表价值被证明。", calm: "PEPE 更接近情绪与流动性的交易，先想清楚退出条件再看涨幅。" },
  LINK: { focus: "预言机采用与跨链基础设施需求", drivers: ["预言机调用、跨链消息和机构合作预期", "DeFi 活跃对数据服务的需求", "基础设施代币板块轮动"], watch: ["协议使用量而不只是合作公告数量", "LINK/BTC 与 DeFi 板块相对强弱", "代币供给与激励安排变化"], mistake: "合作伙伴数量不等于所有合作都产生持续收入。", calm: "LINK 的长期叙事与短线价格可能错位，别用一条合作消息替代估值。" },
  ADA: { focus: "开发进度、治理与生态使用", drivers: ["协议升级和治理进展", "DeFi、稳定币与开发者活跃", "老牌公链之间的资金轮动"], watch: ["链上活跃是否跟上升级叙事", "开发活动能否转成真实应用", "ADA/BTC 是否结束相对弱势"], mistake: "路线图完成不等于用户和流动性会自动迁入。", calm: "ADA 的预期周期往往很长，不要因为一次升级标题仓促改变仓位。" },
  AVAX: { focus: "子网采用、机构合作与公链竞争", drivers: ["子网与定制链的真实采用", "DeFi 流动性和稳定币供给", "机构链与游戏叙事轮动"], watch: ["子网是否产生持续交易和费用", "稳定币净流入与 TVL", "同类高性能公链的相对表现"], mistake: "宣布新子网不等于它已经有可持续用户。", calm: "AVAX 对板块轮动敏感，先确认链上数据再追消息。" },
  SUI: { focus: "Move 生态增长与代币供给", drivers: ["DEX、游戏和消费应用活跃", "稳定币与桥接资金净流入", "解锁节奏和生态激励"], watch: ["TVL 与真实成交是否同步", "代币解锁前后的供给压力", "Move 系公链之间的资金流向"], mistake: "高增长百分比可能来自较小基数。", calm: "SUI 仍在高增长与高供给变化并存阶段，别只看用户曲线。" },
  NVDA: { focus: "AI 资本开支、订单与毛利率", drivers: ["云厂商 AI 资本开支预期", "数据中心订单、交付节奏与产品切换", "高估值下的业绩预期差"], watch: ["主要云厂商资本开支指引", "数据中心收入与毛利率", "基础股票交易时段与币股价格偏离"], mistake: "AI 需求强不代表任何估值都安全。", calm: "NVDA 币股叠加了基础股预期和代币化产品风险，不能只看一个价格。" },
  TSLA: { focus: "交付、利润率与自动驾驶预期", drivers: ["汽车交付与价格策略", "毛利率、储能业务和自由现金流", "自动驾驶与机器人叙事的时间表"], watch: ["交付和库存数据", "汽车毛利率与降价幅度", "基础股开盘后币股价差是否收敛"], mistake: "把长期技术愿景直接折算成今天的确定利润。", calm: "TSLA 预期跨度很大，币股报价还会叠加非美股时段的流动性折价。" },
  AAPL: { focus: "硬件周期、服务收入与资本回报", drivers: ["iPhone 换机周期与区域需求", "服务业务增速和毛利率", "回购、供应链与 AI 产品预期"], watch: ["产品销量与服务收入", "供应链指引和区域需求", "币股与美股现货的交易时段差"], mistake: "品牌稳定不等于短期盈利预期不会下修。", calm: "AAPL 波动通常较温和，但币股仍有平台、托管与时段差风险。" },
  MSFT: { focus: "云增长、AI 商业化与资本开支", drivers: ["Azure 增速和 AI 贡献", "企业软件续费与利润率", "数据中心资本开支的回报周期"], watch: ["Azure 增长与积压订单", "AI 收入和资本开支匹配度", "基础股时段与币股深度"], mistake: "AI 产品被采用不等于利润会同步增长。", calm: "MSFT 基本面较分散，仍要区分公司价值和币股载体风险。" },
  COIN: { focus: "加密交易量、费率与监管", drivers: ["加密现货与衍生品交易活跃", "稳定币、托管和订阅收入", "美国监管与市场结构变化"], watch: ["加密市场交易量与零售占比", "费率压力和非交易收入", "BTC 方向与 COIN 的弹性"], mistake: "币价上涨不保证交易平台利润同比例增长。", calm: "COIN 已是高波动股票，币股载体会再叠加一层流动性和平台风险。" },
  MSTR: { focus: "BTC 敞口、融资结构与溢价", drivers: ["BTC 价格和隐含杠杆", "可转债、增发与融资成本", "相对所持 BTC 净值的溢价变化"], watch: ["每股 BTC 敞口和新增融资", "相对净资产价值的溢价", "BTC 回撤时股票弹性"], mistake: "把 MSTR 当成没有公司和融资结构风险的 BTC 现货。", calm: "MSTR 本身已经放大 BTC 波动，币股或永续会让风险再叠加。" },
};

const genericLenses: AssetLens[] = [
  { focus: "价格、成交深度与项目基本面", drivers: ["项目进展与真实使用数据", "市场整体风险偏好", "单一交易所的资金流变化"], watch: ["成交是否在多个时段持续", "主要交易所报价是否一致", "项目官方是否有可验证更新"], mistake: "不要因为代码陌生或涨幅显眼就假设市场知道更多。", calm: "先确认自己能否解释代币用途、供给和退出流动性。" },
  { focus: "叙事热度、供给变化与跨所流动性", drivers: ["所属赛道的资金轮动", "代币解锁、激励或大额转账", "做市深度和跨平台价差"], watch: ["解锁与大额地址动向", "上涨时买卖盘深度", "同赛道资产是否同步"], mistake: "叙事相同的代币，价值捕获和供给结构可能完全不同。", calm: "波动越快，越应该先写下退出条件，而不是临时决定。" },
  { focus: "真实采用、估值预期与风险事件", drivers: ["用户、费用或收入的边际变化", "宏观风险偏好和主流币方向", "治理、安全或监管事件"], watch: ["真实用户与费用数据", "安全公告和合约变更", "相对 BTC 或基础股票的强弱"], mistake: "把一次上涨理解成长期采用已经得到证明。", calm: "如果理由只能复述价格正在上涨，就还不是完整的研究结论。" },
];

function stableIndex(value: string, size: number) {
  const hash = [...value].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 7), 0);
  return Math.abs(hash) % size;
}

function underlyingSymbol(asset: MarketAsset) {
  return (asset.underlying || asset.symbol)
    .replace(/^r(?=[A-Z0-9])/i, "")
    .replace(/x$/i, "")
    .replace(/[^a-z0-9.]/gi, "")
    .toUpperCase();
}

function productLabel(asset: MarketAsset) {
  if (asset.productType === "tokenized-perpetual") return "币股永续合约";
  if (asset.productType === "tokenized-onchain") return "链上币股代币";
  if (asset.productType === "tokenized-spot") return "币股现货代币";
  return "币圈现货";
}

function productRisk(asset: MarketAsset) {
  if (asset.productType === "tokenized-perpetual") return "还要单独检查资金费率、杠杆和强平风险，它不是基础股票现货。";
  if (asset.productType === "tokenized-onchain") return "还要核对托管、鉴证、合约和链上流动性，它不等于登记股票。";
  if (asset.productType === "tokenized-spot") return "还要核对支持资产、兑付、地区限制和交易时段，它不等于直接持股。";
  return "这是单一交易所现货报价，仍需对照其他平台的价格与深度。";
}

function lensFor(asset: MarketAsset, symbol = underlyingSymbol(asset)) {
  if (symbolLenses[symbol]) return symbolLenses[symbol];
  const topic = `${asset.narrative} ${asset.sector ?? ""} ${asset.aiTag}`.toLowerCase();
  if (/meme|迷因/.test(topic)) return symbolLenses.PEPE;
  if (/defi|dex|借贷|预言机/.test(topic)) return symbolLenses.LINK;
  if (/layer 2|公链|跨链|move/.test(topic)) return symbolLenses.SUI;
  if (/ai|算力/.test(topic)) return symbolLenses.NVDA;
  return genericLenses[stableIndex(symbol, genericLenses.length)];
}

function movementDescription(change24h: number) {
  const absolute = Math.abs(change24h);
  const direction = change24h > 0 ? "上涨" : change24h < 0 ? "下跌" : "横盘";
  const intensity = absolute >= 10 ? "剧烈" : absolute >= 5 ? "明显" : absolute >= 2 ? "偏强" : absolute >= 0.5 ? "温和" : "轻微";
  return { direction, intensity, absolute };
}

function volumeDescription(asset: MarketAsset) {
  if (asset.volumeChange >= 25) return `成交活跃度较平时明显放大（${asset.volumeChange.toFixed(0)}%），价格动作得到更多短线参与者确认，但拥挤度也在上升。`;
  if (asset.volumeChange <= -20) return `成交活跃度较平时下降 ${Math.abs(asset.volumeChange).toFixed(0)}%，这次价格动作缺少量能配合。`;
  if (asset.volume >= 1_000_000_000) return "当前单平台成交额处于高位，但仍不能把一个交易所的量当作全网总量。";
  if (asset.volume >= 50_000_000) return "当前单平台仍有一定成交基础，下一步要看深度和跨所一致性。";
  return "当前平台成交额偏薄，滑点和单笔大单对价格的影响可能更明显。";
}

export function buildAssetCalmPrompt(asset: MarketAsset) {
  const symbol = underlyingSymbol(asset);
  const movement = movementDescription(asset.change24h);
  const impulse = asset.change24h >= 0 ? "担心错过，想马上追涨" : "担心继续下跌，又想立刻抄底";
  const activity = asset.volumeChange
    ? `较平时${asset.volumeChange >= 0 ? "增加" : "减少"}${Math.abs(asset.volumeChange).toFixed(0)}%`
    : asset.volume >= 1_000_000_000 ? "单平台成交额较大" : asset.volume >= 50_000_000 ? "单平台成交中等" : "单平台成交偏薄";
  return `资产：${symbol}（${asset.name}）；交易所：${asset.venue ?? "综合行情"}；产品：${productLabel(asset)}；24h：${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%；量能：${activity}；主题：${lensFor(asset, symbol).focus}；页面提示：${asset.aiHint}；当前冲动：${impulse}。请按这个资产的具体波动和产品结构帮我冷静。`;
}

export async function generateAssetExplanation(asset: MarketAsset): Promise<AIExplanation> {
  await simulateLatency();
  const symbol = underlyingSymbol(asset);
  const lens = lensFor(asset, symbol);
  const movement = movementDescription(asset.change24h);
  const seed = stableIndex(`${symbol}-${asset.venue ?? "all"}`, lens.drivers.length);
  const rotatedDrivers = [...lens.drivers.slice(seed), ...lens.drivers.slice(0, seed)];
  const rotatedWatch = [...lens.watch.slice(seed % lens.watch.length), ...lens.watch.slice(0, seed % lens.watch.length)];
  const venue = asset.venue ?? "综合行情";
  const quote = asset.quoteCurrency ? `，以 ${asset.quoteCurrency} 计价` : "";
  return {
    title: `${symbol} ${movement.intensity}${movement.direction}：先看${lens.focus}`,
    whatHappened: `${venue} 的 ${asset.symbol} 在 24 小时内${movement.direction} ${movement.absolute.toFixed(2)}%，属于${movement.intensity}波动；当前查看的是${productLabel(asset)}${quote}。${volumeDescription(asset)}`,
    possibleReasons: [
      `${rotatedDrivers[0]}可能正在被市场重新定价，但这只是待验证的解释，不是已确认因果。`,
      `${asset.narrative}是这条行情当前最直接的产品线索；页面自身提示为“${asset.aiHint}”`,
      productRisk(asset),
    ],
    commonMistake: `${lens.mistake}${movement.absolute >= 5 ? " 这次波动已经偏大，更不要用涨跌幅替代估值和风险检查。" : " 单日幅度不大，也不能据此假设风险已经消失。"}`,
    watchNext: [
      rotatedWatch[0],
      rotatedWatch[1] ?? "成交量与价格方向能否继续相互确认。",
      `${venue} 与其他主要平台的报价、深度和交易时段差异是否扩大。`,
    ],
    plainSummary: `${symbol} 这次${movement.direction}说明交易者正在围绕“${lens.focus}”调整预期。${asset.aiTag}是当前状态，不是买卖结论；先验证${rotatedWatch[0]}，再决定是否需要行动。`,
  };
}

type AssetCalmContext = {
  symbol: string;
  venue: string;
  product: string;
  change24h: number;
  volume: string;
  focus: string;
  hint: string;
  impulse: string;
};

function calmField(input: string, label: string) {
  return input.match(new RegExp(`${label}：([^；。]+)`))?.[1]?.trim() ?? "";
}

function parseAssetCalmContext(input: string): AssetCalmContext | null {
  const symbol = calmField(input, "资产").match(/[A-Z0-9.]+/i)?.[0]?.toUpperCase();
  const change24h = Number(calmField(input, "24h").replace("%", ""));
  if (!symbol || !Number.isFinite(change24h)) return null;
  return {
    symbol,
    venue: calmField(input, "交易所") || "当前交易所",
    product: calmField(input, "产品") || "行情产品",
    change24h,
    volume: calmField(input, "量能") || "待核对",
    focus: calmField(input, "主题") || "价格与流动性",
    hint: calmField(input, "页面提示") || "需要继续验证",
    impulse: calmField(input, "当前冲动") || "想立刻行动",
  };
}

function calmProductRisk(context: AssetCalmContext) {
  if (context.product.includes("永续")) return `${context.product}还包含资金费率、杠杆和强平风险；判断基础资产方向正确，也可能因为仓位结构而亏损。`;
  if (context.product.includes("链上")) return `${context.product}还包含合约、托管、跨链与链上退出流动性风险，不能当成登记股票。`;
  if (context.product.includes("币股")) return `${context.product}还包含支持资产、兑付、地区和交易时段风险，基础股票价格不是唯一变量。`;
  return `${context.venue} 的现货价格只是单平台报价，深度、滑点和跨所价差都可能影响实际成交。`;
}

function generateAssetRegretReport(context: AssetCalmContext): RegretAnalysis {
  const movement = movementDescription(context.change24h);
  const knownLens = symbolLenses[context.symbol];
  const calmLens = knownLens?.calm ?? genericLenses[stableIndex(context.symbol, genericLenses.length)].calm;
  const action = context.change24h >= 0 ? "追涨" : "抄底";
  const conclusionVariants = [
    `${context.symbol} 不会因为你多等一个验证周期就失去全部研究价值。`,
    `真正适合你的 ${context.symbol} 决定，应该经得起一次跨所核价和一次隔夜复盘。`,
    `如果 ${context.symbol} 的理由成立，明天你仍能用更完整的信息重新评估。`,
  ];
  const conclusion = conclusionVariants[stableIndex(`${context.symbol}-${context.venue}`, conclusionVariants.length)];
  return {
    title: `${context.symbol} 专属冷静检查单`,
    trigger: `${context.symbol} 在 ${context.venue} 24 小时内${movement.direction} ${movement.absolute.toFixed(2)}%，你现在的冲动是“${context.impulse}”。这更像价格速度带来的紧迫感，还不是对“${context.focus}”完成验证后的决定。`,
    riskScenarios: [
      calmProductRisk(context),
      `当前量能状态是“${context.volume}”。如果深度没有同步改善，${action}后的实际成交价和退出价可能比屏幕报价更差。`,
      `${calmLens} 页面提示“${context.hint}”，说明这条行情本身仍有需要复核的条件。`,
    ],
    riskiestStep: movement.absolute >= 8
      ? `最危险的是把 ${context.symbol} 的${movement.intensity}${movement.direction}当成必须立刻行动的倒计时，并在没有退出条件时放大仓位。`
      : `最危险的是仅凭 ${context.symbol} 一天的${movement.direction}就改变原有计划，而没有先核对产品结构与价格来源。`,
    stopNow: [
      `先不要在 ${context.venue} 直接追市价单，给自己至少一个完整观察时段。`,
      context.product.includes("永续") ? "在写清楚最大亏损、杠杆和强平距离前，不开永续仓位。" : "不使用影响生活的资金，也不因为涨跌幅临时提高仓位。",
      `如果你说不清 ${context.symbol} 的失效条件，就先不执行这笔${action}。`,
    ],
    verifySafely: [
      `对照至少两个主要交易所的 ${context.symbol} 报价、点差和深度。`,
      `核对“${context.focus}”对应的官方数据或原始公告，而不是只看二手转述。`,
      `等下一时段确认成交是否持续，再检查 ${context.symbol} 是否仍满足你的价格与风险条件。`,
    ],
    conclusion: `${conclusion} 先把产品、流动性和失效条件写下来；你要保护的不是一次猜对机会，而是长期继续判断的能力。`,
  };
}

export async function generateRegretReport(input: string): Promise<RegretAnalysis> {
  await simulateLatency(820);
  const assetContext = parseAssetCalmContext(input);
  if (assetContext) return generateAssetRegretReport(assetContext);
  const looksLikeLink = /链接|空投|授权|钱包|合约/i.test(input);
  const looksLikeChasing = /追|涨|暴涨|梭哈|重仓/i.test(input);
  return {
    title: "未来后悔报告",
    trigger: looksLikeChasing
      ? "你现在的心动，可能更多来自怕错过、别人晒收益和短时间内的群体情绪，而不是已经验证过的信息。"
      : "你可能正在被紧迫感、熟人背书或看起来很确定的叙事推动，还没有给自己留出复核信息的时间。",
    riskScenarios: looksLikeLink
      ? ["链接可能不是官方来源。", "授权范围可能超出当前操作需要。", "主钱包里的其他资产可能被一并暴露。"]
      : ["在信息不足时承担了超出预期的波动。", "叙事降温后，自己只能用情绪扛住不确定性。", "生活资金和长期计划被短期决定打乱。"],
    riskiestStep: looksLikeLink ? "最危险的是直接连接主钱包或给予无限授权。" : "最危险的是在还说不清楚理由时，立刻把决定做得过重。",
    stopNow: ["不要因为倒计时或别人一句话立刻决定。", "不要使用影响日常生活的资金。", looksLikeLink ? "不要连接主钱包。" : "不要在情绪最热的时候扩大风险暴露。"],
    verifySafely: ["先确认官方来源与完整风险披露。", "把理由写下来，至少等二十四小时再看一次。", "找第二个人复核，或只做不涉及资金的验证。"],
    conclusion: "这件事不一定不能继续研究，但你现在需要的不是更快，而是多一次验证。先停一下，未来的你大概率会感谢这个停顿。",
  };
}

export async function analyzeHotspot(input: string): Promise<HotspotAnalysis> {
  await simulateLatency(760);
  const urgent = /马上|最后|错过|暴涨|翻倍|唯一|稳|保证|必/i.test(input);
  return {
    summary: "这段内容把一个市场热点包装成了时间紧迫、方向明确的机会，但可验证的信息仍然不够。",
    facts: ["它提到了一个具体资产或市场事件。", "内容里存在可进一步核对的时间、主体或产品名称。"],
    speculation: ["把短期热度推导成持续趋势。", "暗示参与者会因为现在行动而获得确定结果。"],
    emotionalAmplifiers: ["使用紧迫感，让人来不及复核。", "通过别人已经获利的画面放大错过感。"],
    misleadingLine: urgent ? "最容易带偏人的，是把“现在不行动”描述成不可逆的损失。" : "最容易带偏人的，是把一个可能性说成唯一答案。",
    missingInformation: ["信息来源与发布时间。", "完整风险披露与反方证据。", "成交量、流动性以及可退出性。"],
    verdict: urgent ? "高风险上头信号" : "可以继续研究",
  };
}
