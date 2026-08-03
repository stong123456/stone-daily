export type ShareCardKind = "ai" | "calm" | "detox" | "daily";

export interface ShareCardContent {
  kind: ShareCardKind;
  title: string;
  summary: string;
  detail?: string;
  asset?: string;
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
