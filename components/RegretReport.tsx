import { CheckCircle, FirstAid, ShieldWarning, StopCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import type { RegretAnalysis } from "@/types/market";

export function RegretReport({ report }: { report: RegretAnalysis }) {
  return (
    <section className="result-report regret-report">
      <div className="result-report__title"><FirstAid size={26} weight="duotone" /><div><span>AI 冷静复盘</span><h2>{report.title}</h2></div></div>
      <div className="result-grid">
        <article><Warning size={22} /><div><h3>你现在为什么会心动</h3><p>{report.trigger}</p></div></article>
        <article><ShieldWarning size={22} /><div><h3>如果这是坑</h3><ul>{report.riskScenarios.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
        <article className="is-danger"><StopCircle size={22} /><div><h3>最危险的一步</h3><p>{report.riskiestStep}</p></div></article>
        <article><StopCircle size={22} /><div><h3>现在先别做什么</h3><ul>{report.stopNow.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
        <article><CheckCircle size={22} /><div><h3>怎么安全验证</h3><ul>{report.verifySafely.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
      </div>
      <blockquote>{report.conclusion}</blockquote>
    </section>
  );
}
