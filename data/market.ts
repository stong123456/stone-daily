import type { MarketAsset, MarketSnapshot } from "@/types/market";

export const cryptoData: MarketAsset[] = [
  { id: "btc", name: "比特币", symbol: "BTC", price: 118420, change24h: 1.22, volume: 48300000000, marketCap: 2350000000000, narrative: "市场锚", aiTag: "资金回流", aiHint: "链上活跃回升，但单日波动不是趋势确认。", volumeChange: 18, market: "crypto" },
  { id: "eth", name: "以太坊", symbol: "ETH", price: 3720.15, change24h: 0.85, volume: 21400000000, marketCap: 449000000000, narrative: "智能合约", aiTag: "生态改善", aiHint: "生态活跃度回升，仍需观察量能是否持续。", volumeChange: 11, market: "crypto" },
  { id: "sol", name: "Solana", symbol: "SOL", price: 163.78, change24h: -0.48, volume: 5900000000, marketCap: 80400000000, narrative: "高性能公链", aiTag: "高波动", aiHint: "交易活跃度仍高，短线分歧也在放大。", volumeChange: 27, market: "crypto" },
  { id: "bnb", name: "BNB", symbol: "BNB", price: 691.2, change24h: 0.32, volume: 1900000000, marketCap: 100800000000, narrative: "交易平台", aiTag: "需要观察", aiHint: "价格偏稳，缺少一致方向，先看成交量。", volumeChange: -3, market: "crypto" },
  { id: "okb", name: "OKB", symbol: "OKB", price: 52.64, change24h: -0.21, volume: 12800000, marketCap: 3158000000, narrative: "平台生态", aiTag: "暂无信号", aiHint: "波动不大，暂时没有足够信息支持强结论。", volumeChange: -8, market: "crypto" },
  { id: "xrp", name: "XRP", symbol: "XRP", price: 3.12, change24h: 2.04, volume: 8200000000, marketCap: 185000000000, narrative: "支付网络", aiTag: "情绪偏热", aiHint: "叙事升温较快，需要观察量价能否延续。", volumeChange: 42, market: "crypto" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", price: 0.234, change24h: 3.72, volume: 3100000000, marketCap: 34900000000, narrative: "Meme", aiTag: "小心追高", aiHint: "情绪推动明显，不要把热度理解成安全性。", volumeChange: 64, market: "crypto" },
  { id: "link", name: "Chainlink", symbol: "LINK", price: 19.84, change24h: 0.71, volume: 612000000, marketCap: 13400000000, narrative: "预言机", aiTag: "弱反弹", aiHint: "反弹力度有限，仍要看相关板块是否共振。", volumeChange: 6, market: "crypto" },
  { id: "arb", name: "Arbitrum", symbol: "ARB", price: 0.91, change24h: -1.12, volume: 408000000, marketCap: 4700000000, narrative: "Layer 2", aiTag: "需要观察", aiHint: "价格承压，先观察资金是否回到同类资产。", volumeChange: -17, market: "crypto" },
  { id: "pepe", name: "Pepe", symbol: "PEPE", price: 0.0000132, change24h: 6.43, volume: 1700000000, marketCap: 5560000000, narrative: "Meme", aiTag: "情绪过热", aiHint: "涨幅和热度都偏高，更容易触发追涨冲动。", volumeChange: 88, market: "crypto" },
];

const stockUnderlyingFallback: MarketAsset[] = [
  { id: "spy", name: "标普 500 ETF", symbol: "SPY", price: 631.05, change24h: 0.48, volume: 61700000, marketCap: 590000000000, narrative: "Index ETF", aiTag: "温和上行", aiHint: "大盘保持韧性，但需要留意宏观预期变化。", volumeChange: 4, market: "stock" },
  { id: "qqq", name: "纳斯达克 100 ETF", symbol: "QQQ", price: 548.73, change24h: 0.81, volume: 47100000, marketCap: 342000000000, narrative: "Index ETF", aiTag: "科技偏强", aiHint: "科技板块仍强，短期拥挤度也在上升。", volumeChange: 12, market: "stock" },
  { id: "nvda", name: "英伟达", symbol: "NVDA", price: 173.48, change24h: 2.48, volume: 221000000, marketCap: 4230000000000, narrative: "AI", aiTag: "需求驱动", aiHint: "AI 需求叙事继续升温，估值消化仍需时间。", volumeChange: 31, market: "stock" },
  { id: "tsla", name: "特斯拉", symbol: "TSLA", price: 328.64, change24h: -0.73, volume: 126000000, marketCap: 1057000000000, narrative: "EV", aiTag: "分歧放大", aiHint: "短线分歧明显，不要用单日波动替代长期判断。", volumeChange: 22, market: "stock" },
  { id: "aapl", name: "苹果", symbol: "AAPL", price: 212.39, change24h: -0.35, volume: 48800000, marketCap: 3170000000000, narrative: "Mega Cap", aiTag: "需要观察", aiHint: "基本面仍稳，短线缺少统一催化。", volumeChange: -5, market: "stock" },
  { id: "msft", name: "微软", symbol: "MSFT", price: 504.68, change24h: 0.2, volume: 24600000, marketCap: 3750000000000, narrative: "AI", aiTag: "稳中偏强", aiHint: "云与 AI 叙事支撑仍在，关注后续兑现。", volumeChange: 8, market: "stock" },
  { id: "meta", name: "Meta", symbol: "META", price: 702.14, change24h: 0.64, volume: 17100000, marketCap: 1760000000000, narrative: "Mega Cap", aiTag: "趋势跟随", aiHint: "广告与 AI 效率叙事共振，注意预期已经不低。", volumeChange: 9, market: "stock" },
  { id: "googl", name: "Alphabet", symbol: "GOOGL", price: 196.82, change24h: 0.39, volume: 28400000, marketCap: 2390000000000, narrative: "AI", aiTag: "温和修复", aiHint: "市场在重新评估 AI 投入与搜索业务韧性。", volumeChange: 5, market: "stock" },
  { id: "amzn", name: "亚马逊", symbol: "AMZN", price: 231.06, change24h: 0.57, volume: 40900000, marketCap: 2460000000000, narrative: "Mega Cap", aiTag: "云业务支撑", aiHint: "云业务预期偏稳，仍需关注利润率兑现。", volumeChange: 10, market: "stock" },
  { id: "coin", name: "Coinbase", symbol: "COIN", price: 418.2, change24h: 3.14, volume: 20400000, marketCap: 105000000000, narrative: "Crypto Equity", aiTag: "情绪偏热", aiHint: "与币圈情绪高度联动，波动可能被同步放大。", volumeChange: 48, market: "stock" },
  { id: "mstr", name: "Strategy", symbol: "MSTR", price: 455.31, change24h: 2.72, volume: 18900000, marketCap: 128000000000, narrative: "Crypto Equity", aiTag: "高波动", aiHint: "对 BTC 敏感，资产与股票两层波动会叠加。", volumeChange: 39, market: "stock" },
  { id: "hood", name: "Robinhood", symbol: "HOOD", price: 104.62, change24h: 1.03, volume: 32200000, marketCap: 92600000000, narrative: "Fintech", aiTag: "交易活跃", aiHint: "活跃用户叙事改善，仍需观察是否具有持续性。", volumeChange: 19, market: "stock" },
  { id: "pltr", name: "Palantir", symbol: "PLTR", price: 149.72, change24h: 1.86, volume: 53700000, marketCap: 359000000000, narrative: "AI", aiTag: "估值偏高", aiHint: "叙事强度很高，增长兑现速度需要持续验证。", volumeChange: 26, market: "stock" },
];

export const stockData: MarketAsset[] = stockUnderlyingFallback.map((asset) => ({
  ...asset,
  id: `bitget-demo-${asset.id}`,
  name: `${asset.name} 币股`,
  symbol: `r${asset.symbol.replace(".", "")}`,
  marketCap: 0,
  narrative: "Bitget rToken 演示",
  aiTag: "币股演示",
  aiHint: "仅在交易所接口不可用时作为界面演示，不代表当前可交易价格。",
  venue: "Bitget Demo",
  sector: "币股现货",
}));

export const marketSnapshot: MarketSnapshot = {
  stockTemperature: 62,
  cryptoTemperature: 58,
  fomoIndex: 34,
  weather: "多云偏暖",
  headline: "市场整体平静，资金在轮动；保持耐心，少一次冲动，就是多一份选择权。",
  riskNote: "今天更容易让人冲动的不是 BTC，而是涨幅榜里的小市值资产。",
  updatedAt: "2026-07-21 08:00",
};

export const allAssets = [...cryptoData, ...stockData];
