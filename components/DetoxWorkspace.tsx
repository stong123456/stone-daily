"use client";

import { Bomb, Check, FloppyDisk, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { HotspotDetoxResult } from "@/components/HotspotDetoxResult";
import { LoadingButton } from "@/components/LoadingButton";
import { analyzeHotspot } from "@/services/aiAnalysis";
import type { HotspotAnalysis } from "@/types/market";

const sample = "最后机会！这个项目马上起飞，群里已经有人赚到了。现在不参与，以后就只能看别人分享收益。";

export function DetoxWorkspace() {
  const { addRecord } = useAppState();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HotspotAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setSaved(false);
    setResult(await analyzeHotspot(input));
    setLoading(false);
  };

  const save = () => {
    if (!result) return;
    addRecord({ input, type: "detox", summary: `${result.verdict}：${result.summary}` });
    setSaved(true);
  };

  return (
    <>
      <header className="page-header"><span>Noise detox</span><h1>热点拆弹器</h1><p>把推文、群聊、项目宣传或新闻标题粘进来，让 AI 帮你拆出事实、推测和情绪。</p></header>
      <section className="tool-workspace detox-workspace">
        <div className="tool-workspace__intro"><span><Bomb size={30} weight="duotone" /></span><div><h2>把让你心跳加速的话贴进来</h2><p>越像“最后机会”的内容，越值得慢下来检查信息来源和缺失条件。</p></div></div>
        <label className="textarea-field"><span>市场热点原文</span><textarea maxLength={1200} onChange={(event) => setInput(event.target.value)} placeholder="粘贴你看到的市场热点、推文、群聊、项目介绍或新闻标题…" value={input} /><small>{input.length}/1200</small></label>
        <div className="tool-actions"><button className="text-button" onClick={() => setInput(sample)} type="button">填入示例</button><LoadingButton disabled={!input.trim()} icon={<Sparkle size={19} />} loading={loading} onClick={run}>开始拆弹</LoadingButton></div>
      </section>
      {result ? <div className="result-wrap"><HotspotDetoxResult result={result} /><LoadingButton icon={saved ? <Check size={18} /> : <FloppyDisk size={18} />} onClick={save} variant="secondary">{saved ? "已保存到冷静记录" : "保存到我的冷静记录"}</LoadingButton></div> : null}
    </>
  );
}
