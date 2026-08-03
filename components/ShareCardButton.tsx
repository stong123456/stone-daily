"use client";

import { Check, DownloadSimple, ImageSquare, ShareNetwork, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { renderShareCard, type ShareCardContent } from "@/services/shareCard";
import { trackProductEvent } from "@/services/analytics";

export function ShareCardButton({ content, className = "button button--secondary", compact = false }: { content: Omit<ShareCardContent, "language">; className?: string; compact?: boolean }) {
  const { language } = useAppState();
  const en = language === "en";
  const [url, setUrl] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const generate = async () => {
    setBusy(true);
    try {
      const nextBlob = await renderShareCard({ ...content, language });
      if (url) URL.revokeObjectURL(url);
      setBlob(nextBlob);
      setUrl(URL.createObjectURL(nextBlob));
      trackProductEvent("share_card", { kind: content.kind });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stone-daily-${content.asset?.toLowerCase() || content.kind}-${new Date().toISOString().slice(0, 10)}.png`;
    anchor.click();
  };

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], "stone-daily.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: content.title, text: content.summary, files: [file] });
    } else {
      await navigator.clipboard?.writeText(`${content.title}\n${content.summary}\nhttps://stonedaily.xyz`);
      download();
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };

  return <>
    <button className={className} disabled={busy} onClick={() => void generate()} type="button"><ImageSquare size={compact ? 16 : 18} />{busy ? (en ? "Generating…" : "生成中…") : (en ? "Generate share card" : "生成分享图")}</button>
    {url ? <div className="share-card-backdrop" onMouseDown={() => setUrl("")} role="presentation"><section aria-label={en ? "Share card preview" : "分享图预览"} aria-modal="true" className="share-card-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><header><div><span>Stone Daily</span><h2>{en ? "Your share card is ready" : "分享图已经生成"}</h2></div><button aria-label={en ? "Close" : "关闭"} className="icon-button" onClick={() => setUrl("")} type="button"><X size={20} /></button></header><img alt={en ? "Generated Stone Daily share card" : "生成的 Stone Daily 分享图"} src={url} /><footer><button className="button button--secondary" onClick={download} type="button"><DownloadSimple size={18} />{en ? "Download PNG" : "下载 PNG"}</button><button className="button button--primary" onClick={() => void share()} type="button">{shared ? <Check size={18} /> : <ShareNetwork size={18} />}{shared ? (en ? "Ready" : "已准备") : (en ? "Share" : "分享")}</button></footer></section></div> : null}
  </>;
}
