"use client";

import { Binoculars, Brain, CheckCircle, Lightbulb, X } from "@phosphor-icons/react";
import type { AIExplanation, MarketAsset } from "@/types/market";

export function AIExplanationModal({ asset, explanation, open, onClose }: { asset: MarketAsset | null; explanation: AIExplanation | null; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section aria-label="AI 涨跌解释" aria-modal="true" className="analysis-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="analysis-modal__header">
          <div>
            <span className="analysis-modal__eyebrow">{asset?.symbol} · AI 解读</span>
            <h2>{explanation?.title ?? "正在理解这次波动…"}</h2>
            {asset ? <div className="analysis-modal__context"><span>{asset.venue ?? "综合行情"}</span><span>{asset.productType === "tokenized-perpetual" ? "币股永续" : asset.productType === "tokenized-onchain" ? "链上币股" : asset.productType === "tokenized-spot" ? "币股现货" : "币圈现货"}</span>{asset.quoteCurrency ? <span>{asset.quoteCurrency} 计价</span> : null}</div> : null}
          </div>
          <button aria-label="关闭" className="icon-button" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        {explanation ? (
          <div className="analysis-sections">
            <article><span><Brain size={21} /></span><div><h3>今天发生了什么</h3><p>{explanation.whatHappened}</p></div></article>
            <article><span><Lightbulb size={21} /></span><div><h3>表面原因可能是什么</h3><ul>{explanation.possibleReasons.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
            <article><span><CheckCircle size={21} /></span><div><h3>普通人容易误会什么</h3><p>{explanation.commonMistake}</p></div></article>
            <article><span><Binoculars size={21} /></span><div><h3>接下来关注什么</h3><ul>{explanation.watchNext.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
            <blockquote>{explanation.plainSummary}</blockquote>
          </div>
        ) : <div className="modal-loading"><span className="loading-orb" /><p>AI 正在把行情翻译成人话…</p></div>}
      </section>
    </div>
  );
}
