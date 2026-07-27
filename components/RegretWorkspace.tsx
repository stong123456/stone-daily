"use client";

import { Check, FirstAid, FloppyDisk, Sparkle } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { LoadingButton } from "@/components/LoadingButton";
import { RegretReport } from "@/components/RegretReport";
import { generateRegretReport } from "@/services/aiAnalysis";
import type { RegretAnalysis } from "@/types/market";

const examples = ["我看到 NVDA 连续走强，有点怕错过", "群里一直催我点一个空投链接", "我想把大部分可用资金压在一个热点上"];
const examplesEn = ["NVDA keeps moving higher and I am afraid of missing out", "A group keeps pressuring me to click an airdrop link", "I want to put most of my available cash into one hot theme"];

export function RegretWorkspace() {
  const searchParams = useSearchParams();
  const { addRecord, language } = useAppState();
  const en = language === "en";
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RegretAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const value = searchParams.get("text");
    if (value) setInput(value);
  }, [searchParams]);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setSaved(false);
    setReport(await generateRegretReport(input, language));
    setLoading(false);
  };

  const save = () => {
    if (!report) return;
    addRecord({ input, type: "regret", summary: report.conclusion });
    setSaved(true);
  };

  return (
    <>
      <header className="page-header"><span>Pause before action</span><h1>{en ? "Decision Pause Button" : "后悔药按钮"}</h1><p>{en ? "Before transferring funds, granting approval, chasing a theme or making a major decision, let your future self question the present impulse." : "在你转账、授权、追热点或做重大决定之前，先让未来的你回来提醒现在的你。"}</p></header>
      <section className="tool-workspace regret-workspace">
        <div className="tool-workspace__intro"><span><FirstAid size={30} weight="duotone" /></span><div><h2>{en ? "Write down what you are about to do" : "把你准备做的事写下来"}</h2><p>{en ? "No judgment and no decision made for you. We put risks hidden by emotion back on the table." : "不评判，也不替你决定。我们只把可能被情绪盖住的风险重新摆到桌面上。"}</p></div></div>
        <label className="textarea-field"><span>{en ? "What I want to do now" : "我现在想做的事"}</span><textarea maxLength={500} onChange={(event) => setInput(event.target.value)} placeholder={en ? "Example: an asset rallied today and I want to chase it. Help me slow down." : "例如：我看到某个资产今天快速上涨，有点想追，帮我冷静一下。"} value={input} /><small>{input.length}/500</small></label>
        <div className="example-list"><span>{en ? "Try an example" : "试试这些例子"}</span>{(en ? examplesEn : examples).map((example) => <button key={example} onClick={() => setInput(example)} type="button">{example}</button>)}</div>
        <LoadingButton disabled={!input.trim()} icon={<Sparkle size={19} />} loading={loading} onClick={generate}>{en ? "Pause and help me think" : "先别急，帮我冷静一下"}</LoadingButton>
      </section>
      {report ? <div className="result-wrap"><RegretReport report={report} /><LoadingButton icon={saved ? <Check size={18} /> : <FloppyDisk size={18} />} onClick={save} variant="secondary">{saved ? (en ? "Saved to pause log" : "已保存到冷静记录") : (en ? "Save to my pause log" : "保存到我的冷静记录")}</LoadingButton></div> : null}
    </>
  );
}
