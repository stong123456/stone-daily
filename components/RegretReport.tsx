"use client";

import { CheckCircle, FirstAid, ShieldWarning, StopCircle, Warning } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";
import type { RegretAnalysis } from "@/types/market";

export function RegretReport({ report }: { report: RegretAnalysis }) {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <section className="result-report regret-report">
      <div className="result-report__title"><FirstAid size={26} weight="duotone" /><div><span>{en ? "AI decision review" : "AI 冷静复盘"}</span><h2>{report.title}</h2></div></div>
      <div className="result-grid">
        <article><Warning size={22} /><div><h3>{en ? "Why this feels compelling" : "你现在为什么会心动"}</h3><p>{report.trigger}</p></div></article>
        <article><ShieldWarning size={22} /><div><h3>{en ? "If this goes wrong" : "如果这是坑"}</h3><ul>{report.riskScenarios.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
        <article className="is-danger"><StopCircle size={22} /><div><h3>{en ? "The riskiest next step" : "最危险的一步"}</h3><p>{report.riskiestStep}</p></div></article>
        <article><StopCircle size={22} /><div><h3>{en ? "What not to do yet" : "现在先别做什么"}</h3><ul>{report.stopNow.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
        <article><CheckCircle size={22} /><div><h3>{en ? "How to verify safely" : "怎么安全验证"}</h3><ul>{report.verifySafely.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
      </div>
      <blockquote>{report.conclusion}</blockquote>
    </section>
  );
}
