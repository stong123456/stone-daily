import type { AIExplanation, HotspotAnalysis, MarketAsset, RegretAnalysis } from "@/types/market";

const simulateLatency = (ms = 680) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateAssetExplanation(asset: MarketAsset): Promise<AIExplanation> {
  await simulateLatency();
  const direction = asset.change24h >= 0 ? "上行" : "回落";
  return {
    title: `为什么今天 ${asset.symbol} 动了？`,
    whatHappened: `${asset.symbol} 今日${direction} ${Math.abs(asset.change24h).toFixed(2)}%，成交活跃度${asset.volumeChange >= 0 ? "比平时更高" : "有所回落"}。`,
    possibleReasons: [
      `${asset.narrative} 相关叙事正在被市场重新定价。`,
      asset.volumeChange >= 20 ? "成交量同步放大，说明关注度明显上升。" : "量能变化不大，价格动作的确认度仍有限。",
      asset.market === "crypto" ? "主流币方向与链上资金轮动可能带来联动。" : "指数与同板块公司的表现可能带来共振。",
    ],
    commonMistake: "不要把单日波动理解成确定趋势，也不要把热门叙事等同于安全。今天被关注，不代表未来一定延续。",
    watchNext: [
      "成交量能否在接下来几个交易时段持续。",
      asset.market === "crypto" ? "BTC 与同类资产是否确认同一方向。" : "QQQ 与同板块公司是否同步。",
      "是否有财报、宏观事件或项目更新改变原有预期。",
    ],
    plainSummary: `${asset.symbol} 今天的动作更像市场在继续讨论“${asset.narrative}”这个故事。价格变化说明今天有人愿意相信它，但还不足以证明长期答案。`,
  };
}

export async function generateRegretReport(input: string): Promise<RegretAnalysis> {
  await simulateLatency(820);
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
