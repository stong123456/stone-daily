"use client";

import { CheckCircle, Detective, MagnifyingGlass, Megaphone, Question, Warning } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";
import { ShareCardButton } from "@/components/ShareCardButton";
import type { HotspotAnalysis } from "@/types/market";

export function HotspotDetoxResult({ result }: { result: HotspotAnalysis }) {
  const { language } = useAppState();
  const en = language === "en";
  const items = [
    { Icon: CheckCircle, title: en ? "What is factual" : "哪些是事实", values: result.facts },
    { Icon: MagnifyingGlass, title: en ? "What is inferred" : "哪些是推测", values: result.speculation },
    { Icon: Megaphone, title: en ? "What amplifies emotion" : "哪些是情绪放大", values: result.emotionalAmplifiers },
    { Icon: Question, title: en ? "What information is missing" : "还缺哪些关键信息", values: result.missingInformation },
  ];
  return (
    <section className="result-report detox-result">
      <div className="result-report__title"><Detective size={26} weight="duotone" /><div><span>{en ? "Detox result" : "拆弹结果"}</span><h2>{en ? "What is this claim actually saying?" : "这段话到底在说什么"}</h2></div></div>
      <p className="detox-result__summary">{result.summary}</p>
      <div className="result-grid">
        {items.map(({ Icon, title, values }) => <article key={title}><Icon size={22} /><div><h3>{title}</h3><ul>{values.map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}
        <article className="is-danger"><Warning size={22} /><div><h3>{en ? "The most misleading line" : "最容易带偏普通人的话"}</h3><p>{result.misleadingLine}</p></div></article>
      </div>
      <div className="detox-verdict" data-level={result.verdict === "高风险上头信号" ? "high" : "medium"}><span>{en ? "Calm conclusion" : "冷静结论"}</span><strong>{en ? (result.verdict === "高风险上头信号" ? "High-risk impulse signal" : result.verdict === "可以继续研究" ? "Worth further research" : "Pause first") : result.verdict}</strong></div>
      <div className="result-report__actions"><ShareCardButton content={{ kind: "detox", title: en ? "What is this claim actually saying?" : "这段话到底在说什么？", summary: result.misleadingLine, detail: en ? "Separate facts, inference and emotional pressure" : "拆开事实、推测与情绪压力" }} /></div>
    </section>
  );
}
