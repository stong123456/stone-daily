"use client";

import { Bomb, Check, FloppyDisk, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { HotspotDetoxResult } from "@/components/HotspotDetoxResult";
import { LoadingButton } from "@/components/LoadingButton";
import { analyzeHotspot } from "@/services/aiAnalysis";
import type { HotspotAnalysis } from "@/types/market";

const sample = "最后机会！这个项目马上起飞，群里已经有人赚到了。现在不参与，以后就只能看别人分享收益。";
const sampleEn = "Last chance! This project is about to take off and people in the group already made money. Join now or watch everyone else win.";

export function DetoxWorkspace() {
  const { addRecord, language } = useAppState();
  const en = language === "en";
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HotspotAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setSaved(false);
    setResult(await analyzeHotspot(input, language));
    setLoading(false);
  };

  const save = () => {
    if (!result) return;
    addRecord({ input, type: "detox", summary: `${result.verdict}：${result.summary}` });
    setSaved(true);
  };

  return (
    <>
      <header className="page-header"><span>Noise detox</span><h1>{en ? "Hype Detox" : "热点拆弹器"}</h1><p>{en ? "Paste a post, group chat, project promotion or headline. AI separates facts, inference and emotional pressure." : "把推文、群聊、项目宣传或新闻标题粘进来，让 AI 帮你拆出事实、推测和情绪。"}</p></header>
      <section className="tool-workspace detox-workspace">
        <div className="tool-workspace__intro"><span><Bomb size={30} weight="duotone" /></span><div><h2>{en ? "Paste the line that raised your heart rate" : "把让你心跳加速的话贴进来"}</h2><p>{en ? "The more it sounds like a “last chance,” the more important it is to slow down and inspect the source and missing conditions." : "越像“最后机会”的内容，越值得慢下来检查信息来源和缺失条件。"}</p></div></div>
        <label className="textarea-field"><span>{en ? "Original market claim" : "市场热点原文"}</span><textarea maxLength={1200} onChange={(event) => setInput(event.target.value)} placeholder={en ? "Paste a market post, tweet, group chat, project pitch or headline…" : "粘贴你看到的市场热点、推文、群聊、项目介绍或新闻标题…"} value={input} /><small>{input.length}/1200</small></label>
        <div className="tool-actions"><button className="text-button" onClick={() => setInput(en ? sampleEn : sample)} type="button">{en ? "Use an example" : "填入示例"}</button><LoadingButton disabled={!input.trim()} icon={<Sparkle size={19} />} loading={loading} onClick={run}>{en ? "Analyze the claim" : "开始拆弹"}</LoadingButton></div>
      </section>
      {result ? <div className="result-wrap"><HotspotDetoxResult result={result} /><LoadingButton icon={saved ? <Check size={18} /> : <FloppyDisk size={18} />} onClick={save} variant="secondary">{saved ? (en ? "Saved to pause log" : "已保存到冷静记录") : (en ? "Save to my pause log" : "保存到我的冷静记录")}</LoadingButton></div> : null}
    </>
  );
}
