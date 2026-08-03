import { canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";

export type ShareCardKind = "ai" | "calm" | "detox" | "daily";

export interface ShareCardDatum {
  label: string;
  value: string;
}

export interface ShareCardContent {
  kind: ShareCardKind;
  title: string;
  summary: string;
  detail?: string;
  asset?: string;
  metrics?: ShareCardDatum[];
  signals?: ShareCardDatum[];
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
  const characters = [...text.replace(/\s+/g, " ").trim()];
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  for (const character of characters) {
    const candidate = `${line}${character}`;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else if (lines.length < maxLines - 1) {
      lines.push(line.trim());
      line = character;
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

function loadLogo() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = "/assets/stone-daily-mark.png";
  });
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
  return {
    kind: "daily",
    title: weather.weather,
    summary: weather.headline,
    metrics: [
      { label: en ? "MARKET BREADTH" : "全市场上涨广度", value: `${weather.breadth}%` },
      { label: en ? "CRYPTO TEMP" : "币圈温度", value: String(weather.cryptoTemperature) },
      { label: en ? "STOCK TEMP" : "币股温度", value: String(weather.stockTemperature) },
      { label: "FOMO", value: String(weather.fomoIndex) },
    ],
    signals: [
      { label: en ? "LEADER" : "领涨代表", value: shareMove(weather.topMovers[0], language) },
      { label: en ? "LAGGARD" : "领跌代表", value: shareMove(weather.laggards[0], language) },
      { label: en ? "HIGH VOL" : "高波动占比", value: `${weather.highVolatilityShare}%` },
    ],
    updatedAt,
    detail: weather.totalProviders
      ? (en ? `${weather.liveProviders}/${weather.totalProviders} feeds live · Beijing ${updatedAt}` : `${weather.liveProviders}/${weather.totalProviders} 个行情源在线｜北京时间 ${updatedAt}`)
      : (en ? `Market snapshot · Beijing ${updatedAt}` : `市场快照｜北京时间 ${updatedAt}`),
  };
}

export async function renderShareCard(content: ShareCardContent) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  const palette = palettes[content.kind];
  const en = content.language === "en";

  context.fillStyle = "#f8f7f3";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, palette.soft);
  gradient.addColorStop(0.52, "rgba(255,255,255,.94)");
  gradient.addColorStop(1, "#f8f7f3");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(49,92,123,.06)";
  context.beginPath();
  context.arc(1080, 90, 220, 0, Math.PI * 2);
  context.fill();

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

  if (content.kind === "daily" && content.metrics?.length) {
    context.fillStyle = "#405767";
    context.font = "500 24px system-ui, 'Noto Sans SC', sans-serif";
    let summaryY = 305;
    for (const line of wrapLines(context, content.summary, 1056, 2)) {
      context.fillText(line, 72, summaryY);
      summaryY += 34;
    }

    const metrics = content.metrics.slice(0, 4);
    const metricGap = 14;
    const metricWidth = (1056 - metricGap * (metrics.length - 1)) / metrics.length;
    metrics.forEach((metric, index) => {
      const x = 72 + index * (metricWidth + metricGap);
      roundedRect(context, x, 375, metricWidth, 102, 18);
      context.fillStyle = "rgba(255,255,255,.84)";
      context.fill();
      context.strokeStyle = "rgba(49,92,123,.16)";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#758692";
      context.font = "700 15px system-ui, sans-serif";
      context.fillText(metric.label, x + 20, 406);
      context.fillStyle = palette.accent;
      context.font = "750 35px system-ui, sans-serif";
      context.fillText(metric.value, x + 20, 452);
    });

    const signals = content.signals?.slice(0, 3) ?? [];
    const signalWidth = signals.length ? 1056 / signals.length : 1056;
    signals.forEach((signal, index) => {
      const x = 72 + index * signalWidth;
      context.fillStyle = "#73838e";
      context.font = "700 14px system-ui, sans-serif";
      context.fillText(signal.label, x, 516);
      context.fillStyle = "#243b4d";
      context.font = "700 21px system-ui, 'Noto Sans SC', sans-serif";
      context.fillText(signal.value, x, 547);
    });

    context.fillStyle = palette.accent;
    context.fillRect(72, 590, 72, 5);
    context.fillStyle = "#5e7180";
    context.font = "500 18px system-ui, sans-serif";
    context.fillText(content.detail || (en ? "Live market snapshot · Not investment advice" : "实时市场快照｜不构成投资建议"), 72, 630);
    context.textAlign = "right";
    context.fillStyle = "#315c7b";
    context.font = "700 22px system-ui, sans-serif";
    context.fillText("stonedaily.xyz", 1128, 630);
    context.textAlign = "left";

    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("share_card_failed")), "image/png", 0.96));
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

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("share_card_failed")), "image/png", 0.96));
}
