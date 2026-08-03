"use client";

import { Binoculars, Brain, CheckCircle, Lightbulb, LockKey, X } from "@phosphor-icons/react";
import Link from "next/link";
import { ShareCardButton } from "@/components/ShareCardButton";
import { useAppState } from "@/components/AppStateProvider";
import { compactExplanation } from "@/services/dailyMarket";
import type { AIExplanation, MarketAsset } from "@/types/market";

type Usage = { remaining: number; limit: number; signedIn: boolean };

export function AIExplanationModal({ asset, explanation, open, onClose, blocked = false, usage }: { asset: MarketAsset | null; explanation: AIExplanation | null; open: boolean; onClose: () => void; blocked?: boolean; usage?: Usage }) {
  const { language } = useAppState();
  const en = language === "en";
  if (!open) return null;
  const compact = explanation ? compactExplanation(explanation) : null;
  const usageLabel = usage ? (en ? `${usage.remaining}/${usage.limit} AI briefs left today` : `今日剩余 ${usage.remaining}/${usage.limit} 次 AI 解读`) : "";

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section aria-label={en ? "AI move explanation" : "AI 涨跌解释"} aria-modal="true" className="analysis-modal analysis-modal--daily" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="analysis-modal__header">
          <div>
            <span className="analysis-modal__eyebrow">{asset?.symbol} · {en ? "AI brief" : "AI 人话解读"}</span>
            <h2>{explanation?.title ?? (blocked ? (en ? "Today’s free AI allowance is used" : "今天的免费 AI 次数已用完") : (en ? "Understanding this move…" : "正在理解这次波动…"))}</h2>
            {asset ? <div className="analysis-modal__context"><span>{asset.venue ?? (en ? "Aggregated feed" : "综合行情")}</span><span>{asset.productType === "tokenized-perpetual" ? (en ? "Tokenized-stock perpetual" : "币股永续") : asset.productType === "tokenized-onchain" ? (en ? "Onchain tokenized stock" : "链上币股") : asset.productType === "tokenized-spot" ? (en ? "Tokenized-stock spot" : "币股现货") : (en ? "Crypto spot" : "币圈现货")}</span>{asset.quoteCurrency ? <span>{en ? `Quoted in ${asset.quoteCurrency}` : `${asset.quoteCurrency} 计价`}</span> : null}{usageLabel ? <span>{usageLabel}</span> : null}</div> : null}
          </div>
          <button aria-label={en ? "Close" : "关闭"} className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        {blocked ? <div className="analysis-quota"><LockKey size={30} weight="duotone" /><strong>{en ? "Pause here instead of refreshing for another answer" : "先停一下，不用反复刷新追答案"}</strong><p>{usage?.signedIn ? (en ? "Wallet users receive 10 daily briefs. Pro is reserved for future unlimited use, weekly reviews and longer history." : "钱包用户每天可用 10 次；Pro 已预留无限解读、周报和更长历史结构。") : (en ? "Guests receive 3 daily briefs. Connect a wallet for 10 daily briefs and cross-device history." : "游客每天 3 次；连接钱包后每天 10 次，并可同步历史记录。")}</p><Link className="button button--primary" href="/account">{usage?.signedIn ? (en ? "Open my account" : "查看个人中心") : (en ? "Connect wallet" : "连接钱包")}</Link></div> : compact && explanation ? (
          <>
            <div className="analysis-plain-grid">
              <article><span><Brain size={20} /></span><div><h3>{en ? "On the surface" : "表面看"}</h3><p>{compact.surface}</p></div></article>
              <article><span><Binoculars size={20} /></span><div><h3>{en ? "What really matters" : "真正要看"}</h3><p>{compact.watch}</p></div></article>
              <article><span><CheckCircle size={20} /></span><div><h3>{en ? "Do not misread it" : "普通人别误会"}</h3><p>{compact.misread}</p></div></article>
            </div>
            <blockquote className="analysis-plain-summary"><span>{en ? "In one line" : "一句话"}</span>{compact.summary}</blockquote>
            <div className="analysis-modal__actions"><ShareCardButton compact content={{ kind: "ai", asset: asset?.symbol, title: explanation.title, summary: compact.summary, detail: en ? "Information, not investment advice." : "行情是信息，不是行动指令" }} /><Link className="button button--secondary" href={asset ? `/asset/${encodeURIComponent(asset.underlying || asset.symbol)}` : "/markets"}>{en ? "Open evidence" : "查看证据链"}</Link></div>
            <details className="analysis-details"><summary>{en ? "Read the supporting context" : "展开完整依据"}</summary><div className="analysis-sections"><article><span><Lightbulb size={21} /></span><div><h3>{en ? "Possible context" : "可能相关的背景"}</h3><ul>{explanation.possibleReasons.map((item) => <li key={item}>{item}</li>)}</ul></div></article><article><span><Binoculars size={21} /></span><div><h3>{en ? "What to watch next" : "接下来关注什么"}</h3><ul>{explanation.watchNext.map((item) => <li key={item}>{item}</li>)}</ul></div></article></div></details>
          </>
        ) : <div className="modal-loading"><span className="loading-orb" /><p>{en ? "AI is translating the move into plain language…" : "AI 正在把行情翻译成人话…"}</p></div>}
      </section>
    </div>
  );
}
