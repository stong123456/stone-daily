import { canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";

export type ShareCardKind = "ai" | "calm" | "detox" | "daily";

export interface ShareCardDatum {
  label: string;
  value: string;
  detail?: string;
  progress?: number;
}

export interface ShareCardLeader {
  rank: number;
  symbol: string;
  venue: string;
  change: string;
}

export interface ShareCardSection {
  title: string;
  items: string[];
}

export interface ShareCardContent {
  kind: ShareCardKind;
  title: string;
  summary: string;
  detail?: string;
  asset?: string;
  metrics?: ShareCardDatum[];
  signals?: ShareCardDatum[];
  score?: number;
  leaders?: ShareCardLeader[];
  sections?: ShareCardSection[];
  riskNote?: string;
  updatedAt?: string;
  language?: "zh" | "en";
}

const palettes: Record<ShareCardKind, { accent: string; soft: string; labelZh: string; labelEn: string }> = {
  ai: { accent: "#2d6fba", soft: "#eaf3fb", labelZh: "AI 人话解读", labelEn: "AI plain-language brief" },
  calm: { accent: "#2f8b66", soft: "#e9f5ee", labelZh: "冷静一下", labelEn: "Decision pause" },
  detox: { accent: "#bd7b18", soft: "#fff3dc", labelZh: "热点拆弹", labelEn: "Hype detox" },
  daily: { accent: "#315c7b", soft: "#edf4f8", labelZh: "今日市场", labelEn: "Today’s market" },
};

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const cjkCount = normalized.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const units = cjkCount < 2 && normalized.includes(" ")
    ? normalized.split(" ").map((word, index, words) => index < words.length - 1 ? `${word} ` : word)
    : [...normalized];
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  for (const unit of units) {
    const candidate = `${line}${unit}`;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else if (lines.length < maxLines - 1) {
      lines.push(line.trim());
      line = unit;
    } else {
      truncated = true;
      break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  if (truncated && lines.length) {
    let lastLine = lines[lines.length - 1].replace(/[，。；、,.!?！？」]$/, "");
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) lastLine = lastLine.slice(0, -1);
    lines[lines.length - 1] = `${lastLine}…`;
  }
  return lines;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function loadLogo() {
  return loadImage("/assets/stone-daily-mark.png");
}

function shareMove(asset: LiveMarketWeather["topMovers"][number] | undefined, language: "zh" | "en") {
  if (!asset) return language === "en" ? "Waiting" : "待更新";
  const sign = asset.change24h >= 0 ? "+" : "";
  return `${canonicalAssetSymbol(asset)} ${sign}${asset.change24h.toFixed(2)}%`;
}

export function buildMarketShareContent(weather: LiveMarketWeather, language: "zh" | "en"): Omit<ShareCardContent, "language"> {
  const en = language === "en";
  const updatedAt = new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(weather.updatedAt));
  const leaning = weather.breadth >= 58
    ? (en ? "Advancers are the majority, but leader concentration still matters. Better breadth does not make every asset safe." : "上涨资产占多数，但领涨集中度仍值得观察；广度改善不等于每个标的都安全。")
    : weather.breadth <= 42
      ? (en ? "Decliners are the majority. Look for cross-venue repair before treating a bounce as a reversal." : "下跌资产占多数，先观察是否出现跨平台同步修复，不急着把反弹当反转。")
      : (en ? "Advancers and decliners are near balance. This looks more like rotation than one market-wide direction." : "涨跌分布接近平衡，市场更像结构性轮动，不适合用一个方向概括全部资产。");
  return {
    kind: "daily",
    title: weather.weather,
    summary: weather.headline,
    metrics: [
      { label: en ? "CRYPTO TEMPERATURE" : "币圈温度", value: String(weather.cryptoTemperature), detail: `${en ? "Breadth" : "上涨广度"} ${weather.cryptoBreadth}% · ${weather.cryptoCount} ${en ? "deduplicated assets" : "个去重资产"}`, progress: weather.cryptoTemperature },
      { label: en ? "TOKENIZED-STOCK TEMPERATURE" : "币股温度", value: String(weather.stockTemperature), detail: `${en ? "Breadth" : "上涨广度"} ${weather.stockBreadth}% · ${weather.stockCount} ${en ? "deduplicated underlyings" : "个去重标的"}`, progress: weather.stockTemperature },
      { label: en ? "FOMO INDEX" : "FOMO 指数", value: String(weather.fomoIndex), detail: `${weather.highVolatilityShare}% ${en ? "moved more than 5%" : "的资产振幅超过 5%"}`, progress: weather.fomoIndex },
      { label: en ? "WHOLE-MARKET BREADTH" : "全市场广度", value: `${weather.breadth}%`, detail: `${en ? "Median representative move" : "代表资产中位振幅"} ${weather.volatility.toFixed(2)}%`, progress: weather.breadth },
    ],
    signals: [
      { label: en ? "LEADER" : "领涨代表", value: shareMove(weather.topMovers[0], language) },
      { label: en ? "LAGGARD" : "领跌代表", value: shareMove(weather.laggards[0], language) },
      { label: en ? "HIGH VOL" : "高波动占比", value: `${weather.highVolatilityShare}%` },
    ],
    score: weather.score,
    leaders: weather.topMovers.slice(0, 6).map((asset, index) => ({
      rank: index + 1,
      symbol: canonicalAssetSymbol(asset),
      venue: asset.venue || (en ? "Market feed" : "行情源"),
      change: `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%`,
    })),
    sections: [
      { title: en ? "Three things that matter today" : "今天最重要的三件事", items: weather.highlights.slice(0, 3) },
      { title: en ? "Where the market is leaning" : "市场正在偏向哪里", items: [leaning] },
      { title: en ? "Do not ignore this today" : "今天先别忽略什么", items: weather.watchouts.slice(0, 3) },
    ],
    riskNote: weather.riskNote,
    updatedAt,
    detail: weather.totalProviders
      ? (en ? `${weather.liveProviders}/${weather.totalProviders} feeds live · Beijing ${updatedAt}` : `${weather.liveProviders}/${weather.totalProviders} 个行情源在线｜北京时间 ${updatedAt}`)
      : (en ? `Market snapshot · Beijing ${updatedAt}` : `市场快照｜北京时间 ${updatedAt}`),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("share_card_failed")), "image/png", 0.96));
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxLines: number, lineHeight: number) {
  for (const line of wrapLines(context, text, maxWidth, maxLines)) {
    context.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

async function renderMarketWeatherCard(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  content: ShareCardContent,
  palette: { accent: string; soft: string },
  en: boolean,
) {
  const [logo, illustration] = await Promise.all([
    loadLogo().catch(() => null),
    loadImage("/assets/market-weather.png").catch(() => null),
  ]);

  if (logo) context.drawImage(logo, 54, 36, 46, 46);
  context.fillStyle = "#14283a";
  context.font = "700 27px Georgia, 'Noto Serif SC', serif";
  context.fillText("Stone Daily", 114, 61);
  context.fillStyle = "#6b7b87";
  context.font = "500 14px system-ui, sans-serif";
  context.fillText("by @Stone141319", 114, 82);

  context.textAlign = "right";
  context.fillStyle = "#075dad";
  context.font = "800 14px system-ui, sans-serif";
  context.fillText(en ? "DAILY MARKET WEATHER" : "DAILY MARKET WEATHER · 今日市场天气", 1146, 55);
  context.fillStyle = "#71828e";
  context.font = "500 13px system-ui, sans-serif";
  context.fillText(content.detail || "stonedaily.xyz", 1146, 79);
  context.textAlign = "left";

  roundedRect(context, 54, 106, 1092, 198, 22);
  context.fillStyle = "rgba(243,247,232,.96)";
  context.fill();
  context.strokeStyle = "rgba(49,92,123,.14)";
  context.lineWidth = 1.5;
  context.stroke();

  if (illustration) {
    context.save();
    context.beginPath();
    context.arc(146, 205, 70, 0, Math.PI * 2);
    context.clip();
    context.drawImage(illustration, 76, 135, 140, 140);
    context.restore();
  }

  context.fillStyle = "#4f6573";
  context.font = "700 15px system-ui, 'Noto Sans SC', sans-serif";
  context.fillText(en ? "Live market weather" : "实时市场天气", 242, 150);
  context.fillStyle = "#075dad";
  context.font = "700 45px Georgia, 'Noto Serif SC', serif";
  context.fillText(content.title, 242, 201);
  context.fillStyle = "#324d60";
  context.font = "500 17px system-ui, 'Noto Sans SC', sans-serif";
  drawWrappedText(context, content.summary, 242, 232, 700, 2, 24);
  context.fillStyle = "#6e818e";
  context.font = "500 13px system-ui, 'Noto Sans SC', sans-serif";
  context.fillText(en ? "Recomputed from live crypto and tokenized-stock feeds" : "根据币圈、币股与交易所实时状态重新计算", 242, 286);

  roundedRect(context, 998, 148, 112, 112, 17);
  context.fillStyle = "rgba(255,255,255,.62)";
  context.fill();
  context.strokeStyle = "rgba(7,93,173,.32)";
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#075dad";
  context.font = "800 39px system-ui, sans-serif";
  context.fillText(String(content.score ?? 0), 1046, 202);
  context.textAlign = "left";
  context.fillStyle = "#075dad";
  context.font = "500 12px system-ui, sans-serif";
  context.fillText("/100", 1077, 202);
  context.textAlign = "center";
  context.fillStyle = "#4d6473";
  context.font = "500 12px system-ui, 'Noto Sans SC', sans-serif";
  context.fillText(en ? "Live composite" : "实时综合温度", 1054, 236);
  context.textAlign = "left";

  const metrics = content.metrics?.slice(0, 4) ?? [];
  const metricGap = 12;
  const metricWidth = (1092 - metricGap * 3) / 4;
  metrics.forEach((metric, index) => {
    const x = 54 + index * (metricWidth + metricGap);
    roundedRect(context, x, 320, metricWidth, 126, 14);
    context.fillStyle = "rgba(255,255,255,.9)";
    context.fill();
    context.strokeStyle = "rgba(49,92,123,.15)";
    context.stroke();
    context.fillStyle = "#687b88";
    context.font = "700 12px system-ui, 'Noto Sans SC', sans-serif";
    context.fillText(metric.label, x + 18, 345);
    context.fillStyle = "#0f2940";
    context.font = "750 34px Georgia, 'Noto Serif SC', serif";
    context.fillText(metric.value, x + 18, 385);
    context.fillStyle = "#6c7f8c";
    context.font = "500 11.5px system-ui, 'Noto Sans SC', sans-serif";
    drawWrappedText(context, metric.detail || "", x + 18, 407, metricWidth - 36, 2, 15);
    context.fillStyle = "#eef2f5";
    context.fillRect(x + 18, 428, metricWidth - 36, 4);
    const progress = Math.max(0, Math.min(100, metric.progress ?? 0));
    const meter = context.createLinearGradient(x + 18, 0, x + metricWidth - 18, 0);
    meter.addColorStop(0, "#1268b5");
    meter.addColorStop(1, "#3b8a55");
    context.fillStyle = meter;
    context.fillRect(x + 18, 428, (metricWidth - 36) * progress / 100, 4);
  });

  context.fillStyle = "#075dad";
  context.font = "800 14px system-ui, 'Noto Sans SC', sans-serif";
  context.fillText(en ? "LIVE LEADERS" : "实时领涨", 54, 483);
  context.fillStyle = "#6c7f8c";
  context.font = "500 12px system-ui, 'Noto Sans SC', sans-serif";
  drawWrappedText(context, en ? "Deduplicated by symbol; higher-volume venue quotes take priority" : "按代码去重，优先采用成交量更高的交易所报价", 54, 507, 176, 3, 17);

  const leaders = content.leaders?.slice(0, 6) ?? [];
  const leaderGap = 10;
  const leaderWidth = (894 - leaderGap * 2) / 3;
  leaders.forEach((leader, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 252 + column * (leaderWidth + leaderGap);
    const y = 466 + row * 58;
    roundedRect(context, x, y, leaderWidth, 50, 11);
    context.fillStyle = "rgba(255,255,255,.94)";
    context.fill();
    context.strokeStyle = "rgba(49,92,123,.16)";
    context.stroke();
    context.fillStyle = "#8a99a3";
    context.font = "600 12px system-ui, sans-serif";
    context.fillText(String(leader.rank), x + 12, y + 29);
    context.fillStyle = "#17344a";
    context.font = "800 15px system-ui, sans-serif";
    context.fillText(leader.symbol, x + 36, y + 22);
    context.fillStyle = "#7b8b96";
    context.font = "500 10px system-ui, sans-serif";
    context.fillText(leader.venue, x + 36, y + 38);
    context.textAlign = "right";
    context.fillStyle = leader.change.startsWith("-") ? "#b44949" : "#34834a";
    context.font = "800 13px system-ui, sans-serif";
    context.fillText(leader.change, x + leaderWidth - 14, y + 29);
    context.textAlign = "left";
  });

  context.strokeStyle = "rgba(49,92,123,.16)";
  context.beginPath();
  context.moveTo(54, 600);
  context.lineTo(1146, 600);
  context.stroke();

  const sections = content.sections?.slice(0, 3) ?? [];
  const sectionGap = 24;
  const sectionWidth = (1092 - sectionGap * 2) / 3;
  sections.forEach((section, index) => {
    const x = 54 + index * (sectionWidth + sectionGap);
    if (index > 0) {
      context.strokeStyle = "rgba(49,92,123,.13)";
      context.beginPath();
      context.moveTo(x - 12, 622);
      context.lineTo(x - 12, 757);
      context.stroke();
    }
    context.fillStyle = "#075dad";
    context.font = "800 16px system-ui, 'Noto Sans SC', sans-serif";
    context.fillText(section.title, x, 636);
    context.fillStyle = "#526b7a";
    context.font = "500 13px system-ui, 'Noto Sans SC', sans-serif";
    const body = section.items.map((item) => `• ${item}`).join("  ");
    drawWrappedText(context, body, x, 666, sectionWidth - 6, 6, 18);
  });

  roundedRect(context, 54, 778, 1092, 54, 12);
  context.fillStyle = "rgba(237,244,248,.92)";
  context.fill();
  context.fillStyle = "#17344a";
  context.font = "700 14px system-ui, 'Noto Sans SC', sans-serif";
  drawWrappedText(context, content.riskNote || (en ? "Market context is not investment advice." : "市场信息不构成投资建议。"), 76, 801, 1045, 2, 18);

  context.fillStyle = palette.accent;
  context.fillRect(54, 862, 58, 4);
  context.fillStyle = "#647885";
  context.font = "500 13px system-ui, 'Noto Sans SC', sans-serif";
  context.fillText(en ? "Live market snapshot · Information, not investment advice" : "实时市场快照｜信息仅供参考，不构成投资建议", 54, 887);
  context.textAlign = "right";
  context.fillStyle = "#315c7b";
  context.font = "800 16px system-ui, sans-serif";
  context.fillText("stonedaily.xyz  ·  @Stone141319", 1146, 887);
  context.textAlign = "left";

  return canvasToBlob(canvas);
}

export async function renderShareCard(content: ShareCardContent) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const isMarketWeather = content.kind === "daily" && Boolean(content.metrics?.length);
  canvas.height = isMarketWeather ? 900 : 675;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  const palette = palettes[content.kind];
  const en = content.language === "en";

  context.fillStyle = "#f8f7f3";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, 1200, canvas.height);
  gradient.addColorStop(0, palette.soft);
  gradient.addColorStop(0.52, "rgba(255,255,255,.94)");
  gradient.addColorStop(1, "#f8f7f3");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(49,92,123,.06)";
  context.beginPath();
  context.arc(1080, 90, 220, 0, Math.PI * 2);
  context.fill();

  if (isMarketWeather) return renderMarketWeatherCard(canvas, context, content, palette, en);

  try {
    const logo = await loadLogo();
    context.drawImage(logo, 70, 54, 58, 58);
  } catch {
    // The text lockup still identifies the card if the logo asset cannot load.
  }
  context.fillStyle = "#14283a";
  context.font = "700 32px Georgia, 'Noto Serif SC', serif";
  context.fillText("Stone Daily", 145, 91);
  context.fillStyle = "#6b7b87";
  context.font = "500 19px system-ui, sans-serif";
  context.fillText("by @Stone141319", 145, 118);

  context.fillStyle = palette.accent;
  context.font = "700 21px system-ui, sans-serif";
  context.fillText(en ? palette.labelEn : palette.labelZh, 72, 190);
  if (content.asset) {
    context.textAlign = "right";
    context.fillText(content.asset.toUpperCase(), 1128, 190);
    context.textAlign = "left";
  }

  context.fillStyle = "#14283a";
  context.font = "700 52px Georgia, 'Noto Serif SC', serif";
  let y = 267;
  for (const line of wrapLines(context, content.title, 1050, 2)) {
    context.fillText(line, 72, y);
    y += 66;
  }

  roundedRect(context, 72, 365, 1056, 180, 24);
  context.fillStyle = "rgba(255,255,255,.82)";
  context.fill();
  context.strokeStyle = "rgba(49,92,123,.18)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#243b4d";
  context.font = "500 29px system-ui, 'Noto Sans SC', sans-serif";
  let summaryY = 420;
  for (const line of wrapLines(context, content.summary, 952, 3)) {
    context.fillText(line, 122, summaryY);
    summaryY += 45;
  }

  context.fillStyle = palette.accent;
  context.fillRect(72, 590, 72, 5);
  context.fillStyle = "#5e7180";
  context.font = "500 19px system-ui, sans-serif";
  const footer = content.detail || (en ? "Information, not investment advice." : "先看懂，再决定｜不构成投资建议");
  context.fillText(footer, 72, 630);
  context.textAlign = "right";
  context.fillStyle = "#315c7b";
  context.font = "700 22px system-ui, sans-serif";
  context.fillText("stonedaily.xyz", 1128, 630);
  context.textAlign = "left";

  return canvasToBlob(canvas);
}
