import { cryptoData, stockData } from "@/data/market";
import type { MarketAsset } from "@/types/market";

export const extraCryptoData: MarketAsset[] = [
  { id: "ada", name: "Cardano", symbol: "ADA", price: 0.82, change24h: 1.14, volume: 790000000, marketCap: 29400000000, narrative: "智能合约", aiTag: "温和回升", aiHint: "生态活跃度改善，但量能仍需要持续确认。", volumeChange: 9, market: "crypto", venue: "Global", sector: "公链" },
  { id: "avax", name: "Avalanche", symbol: "AVAX", price: 27.46, change24h: -0.62, volume: 428000000, marketCap: 11600000000, narrative: "高性能公链", aiTag: "区间波动", aiHint: "价格仍在区间内，暂时没有一致方向。", volumeChange: -4, market: "crypto", venue: "Global", sector: "公链" },
  { id: "trx", name: "TRON", symbol: "TRX", price: 0.29, change24h: 0.41, volume: 811000000, marketCap: 27700000000, narrative: "支付网络", aiTag: "相对稳定", aiHint: "稳定币活动支撑需求，关注链上集中度。", volumeChange: 6, market: "crypto", venue: "Global", sector: "公链" },
  { id: "ton", name: "Toncoin", symbol: "TON", price: 3.37, change24h: 1.82, volume: 306000000, marketCap: 8250000000, narrative: "社交生态", aiTag: "叙事升温", aiHint: "应用叙事变热，价格确认仍依赖新增用户。", volumeChange: 23, market: "crypto", venue: "Global", sector: "公链" },
  { id: "sui", name: "Sui", symbol: "SUI", price: 3.61, change24h: 2.36, volume: 1320000000, marketCap: 12500000000, narrative: "Move 公链", aiTag: "资金活跃", aiHint: "资金流入明显，也意味着短线波动可能放大。", volumeChange: 38, market: "crypto", venue: "Global", sector: "公链" },
  { id: "dot", name: "Polkadot", symbol: "DOT", price: 4.28, change24h: -0.31, volume: 201000000, marketCap: 6900000000, narrative: "跨链", aiTag: "等待催化", aiHint: "基本面叙事仍在，市场关注度相对有限。", volumeChange: -7, market: "crypto", venue: "Global", sector: "跨链" },
  { id: "ltc", name: "Litecoin", symbol: "LTC", price: 112.8, change24h: 0.56, volume: 514000000, marketCap: 8600000000, narrative: "支付", aiTag: "低速轮动", aiHint: "跟随主流币波动，独立催化暂不明显。", volumeChange: 4, market: "crypto", venue: "Global", sector: "支付" },
  { id: "bch", name: "Bitcoin Cash", symbol: "BCH", price: 529.4, change24h: 1.09, volume: 382000000, marketCap: 10500000000, narrative: "支付", aiTag: "跟随反弹", aiHint: "走势与 BTC 相关，成交量决定反弹质量。", volumeChange: 13, market: "crypto", venue: "Global", sector: "支付" },
  { id: "uni", name: "Uniswap", symbol: "UNI", price: 10.74, change24h: -0.86, volume: 279000000, marketCap: 6800000000, narrative: "DEX", aiTag: "监管敏感", aiHint: "协议数据稳定，价格仍受监管叙事影响。", volumeChange: -12, market: "crypto", venue: "Global", sector: "DeFi" },
  { id: "aave", name: "Aave", symbol: "AAVE", price: 318.6, change24h: 1.47, volume: 335000000, marketCap: 4800000000, narrative: "借贷", aiTag: "基本面改善", aiHint: "借贷活动改善，仍需同时观察清算风险。", volumeChange: 17, market: "crypto", venue: "Global", sector: "DeFi" },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR", price: 3.12, change24h: -1.34, volume: 446000000, marketCap: 3900000000, narrative: "AI x Crypto", aiTag: "事件扰动", aiHint: "生态消息扰动增多，先确认基础设施状态。", volumeChange: 29, market: "crypto", venue: "Global", sector: "公链" },
  { id: "render", name: "Render", symbol: "RENDER", price: 5.08, change24h: 2.71, volume: 218000000, marketCap: 2700000000, narrative: "去中心化算力", aiTag: "AI 联动", aiHint: "与 AI 热度联动较强，容易出现叙事驱动波动。", volumeChange: 44, market: "crypto", venue: "Global", sector: "AI" },
];

const extraStockUnderlyingData: MarketAsset[] = [
  { id: "amd", name: "AMD", symbol: "AMD", price: 182.44, change24h: 1.16, volume: 65400000, marketCap: 295000000000, narrative: "AI 芯片", aiTag: "需求验证", aiHint: "AI 产品放量仍需通过收入与毛利率兑现。", volumeChange: 18, market: "stock", venue: "NASDAQ", sector: "半导体" },
  { id: "avgo", name: "博通", symbol: "AVGO", price: 302.18, change24h: 0.94, volume: 34700000, marketCap: 1420000000000, narrative: "AI 基础设施", aiTag: "订单支撑", aiHint: "定制芯片与网络业务提供支撑，估值也不低。", volumeChange: 14, market: "stock", venue: "NASDAQ", sector: "半导体" },
  { id: "tsm", name: "台积电 ADR", symbol: "TSM", price: 244.62, change24h: 1.73, volume: 28600000, marketCap: 1260000000000, narrative: "晶圆代工", aiTag: "产业核心", aiHint: "先进制程需求较强，也需关注资本开支周期。", volumeChange: 21, market: "stock", venue: "NYSE", sector: "半导体" },
  { id: "nflx", name: "Netflix", symbol: "NFLX", price: 1268.3, change24h: -0.42, volume: 5700000, marketCap: 541000000000, narrative: "流媒体", aiTag: "增长消化", aiHint: "用户与广告增长仍好，市场预期已经偏高。", volumeChange: -3, market: "stock", venue: "NASDAQ", sector: "传媒" },
  { id: "jpm", name: "摩根大通", symbol: "JPM", price: 291.4, change24h: 0.38, volume: 11800000, marketCap: 809000000000, narrative: "大型银行", aiTag: "利差稳定", aiHint: "资产质量与净息差仍是核心观察项。", volumeChange: 5, market: "stock", venue: "NYSE", sector: "金融" },
  { id: "bac", name: "美国银行", symbol: "BAC", price: 48.22, change24h: -0.18, volume: 39100000, marketCap: 366000000000, narrative: "大型银行", aiTag: "等待数据", aiHint: "利率路径变化会影响债券账面价值与利差。", volumeChange: -1, market: "stock", venue: "NYSE", sector: "金融" },
  { id: "brkb", name: "伯克希尔 B", symbol: "BRK.B", price: 486.91, change24h: 0.27, volume: 3800000, marketCap: 1050000000000, narrative: "综合控股", aiTag: "防御偏稳", aiHint: "多元业务降低单一叙事影响，仍会跟随大盘。", volumeChange: 2, market: "stock", venue: "NYSE", sector: "综合" },
  { id: "xom", name: "埃克森美孚", symbol: "XOM", price: 119.84, change24h: 2.08, volume: 26700000, marketCap: 514000000000, narrative: "能源", aiTag: "油价联动", aiHint: "能源价格提供支撑，地缘风险也会放大波动。", volumeChange: 36, market: "stock", venue: "NYSE", sector: "能源" },
  { id: "lly", name: "礼来", symbol: "LLY", price: 1042.6, change24h: 0.63, volume: 4100000, marketCap: 988000000000, narrative: "创新药", aiTag: "需求强", aiHint: "核心产品需求强，供应与估值是主要限制。", volumeChange: 8, market: "stock", venue: "NYSE", sector: "医疗" },
  { id: "wmt", name: "沃尔玛", symbol: "WMT", price: 101.72, change24h: 0.21, volume: 14900000, marketCap: 811000000000, narrative: "消费", aiTag: "防御属性", aiHint: "消费韧性仍在，需关注价格与利润率平衡。", volumeChange: 3, market: "stock", venue: "NYSE", sector: "消费" },
  { id: "iwm", name: "罗素 2000 ETF", symbol: "IWM", price: 226.35, change24h: -0.54, volume: 35200000, marketCap: 76000000000, narrative: "小盘 ETF", aiTag: "利率敏感", aiHint: "小盘股对融资条件更敏感，波动通常高于大盘。", volumeChange: 12, market: "stock", venue: "NYSE Arca", sector: "ETF" },
  { id: "gld", name: "黄金 ETF", symbol: "GLD", price: 313.28, change24h: 0.89, volume: 10400000, marketCap: 105000000000, narrative: "黄金 ETF", aiTag: "避险升温", aiHint: "避险需求上升，但真实利率仍是长期变量。", volumeChange: 19, market: "stock", venue: "NYSE Arca", sector: "ETF" },
];

export const expandedCryptoData = [...cryptoData, ...extraCryptoData];
export const extraStockData: MarketAsset[] = extraStockUnderlyingData.map((asset) => ({
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
export const expandedStockData = [...stockData, ...extraStockData];
export const marketUniverse = [...expandedCryptoData, ...expandedStockData];
