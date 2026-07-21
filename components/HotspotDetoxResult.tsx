import { CheckCircle, Detective, MagnifyingGlass, Megaphone, Question, Warning } from "@phosphor-icons/react/dist/ssr";
import type { HotspotAnalysis } from "@/types/market";

export function HotspotDetoxResult({ result }: { result: HotspotAnalysis }) {
  const items = [
    { Icon: CheckCircle, title: "哪些是事实", values: result.facts },
    { Icon: MagnifyingGlass, title: "哪些是推测", values: result.speculation },
    { Icon: Megaphone, title: "哪些是情绪放大", values: result.emotionalAmplifiers },
    { Icon: Question, title: "还缺哪些关键信息", values: result.missingInformation },
  ];
  return (
    <section className="result-report detox-result">
      <div className="result-report__title"><Detective size={26} weight="duotone" /><div><span>拆弹结果</span><h2>这段话到底在说什么</h2></div></div>
      <p className="detox-result__summary">{result.summary}</p>
      <div className="result-grid">
        {items.map(({ Icon, title, values }) => <article key={title}><Icon size={22} /><div><h3>{title}</h3><ul>{values.map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}
        <article className="is-danger"><Warning size={22} /><div><h3>最容易带偏普通人的话</h3><p>{result.misleadingLine}</p></div></article>
      </div>
      <div className="detox-verdict" data-level={result.verdict === "高风险上头信号" ? "high" : "medium"}><span>冷静结论</span><strong>{result.verdict}</strong></div>
    </section>
  );
}
