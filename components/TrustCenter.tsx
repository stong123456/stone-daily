"use client";

import { ArrowClockwise, ArrowSquareOut, CheckCircle, Clock, Database, Eye, LockKey, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import type { DataProviderStatus, DataTrustSnapshot } from "@/types/market";

const SURFACE_LABELS: Record<DataProviderStatus["surface"], [string, string]> = { crypto: ["币圈行情", "Crypto markets"], stocks: ["币股行情", "Tokenized stocks"], editorial: ["新闻与热点", "News & pulse"], calendar: ["财经日历", "Economic calendar"] };

function ageLabel(seconds: number, en: boolean) {
  if (seconds < 60) return en ? `${seconds}s ago` : `${seconds} 秒前`;
  if (seconds < 3600) return en ? `${Math.round(seconds / 60)}m ago` : `${Math.round(seconds / 60)} 分钟前`;
  return en ? `${Math.round(seconds / 3600)}h ago` : `${Math.round(seconds / 3600)} 小时前`;
}

export function TrustCenter() {
  const { language } = useAppState();
  const en = language === "en";
  const [snapshot, setSnapshot] = useState<DataTrustSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = () => { setLoading(true); fetch("/api/status", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("status unavailable"); return response.json() as Promise<DataTrustSnapshot>; }).then((value) => { setSnapshot(value); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false)); };
  useEffect(() => { load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer); }, []);
  const grouped = useMemo(() => (["crypto", "stocks", "editorial", "calendar"] as const).map((surface) => ({ surface, items: snapshot?.providers.filter((item) => item.surface === surface) ?? [] })), [snapshot]);
  const statusLabel = snapshot?.overall === "healthy" ? (en ? "Systems healthy" : "系统整体健康") : snapshot?.overall === "partial" ? (en ? "Some sources degraded" : "部分来源降级") : (en ? "Live sources degraded" : "实时来源降级");
  return <div className="trust-center">
    <header className="trust-hero" data-status={snapshot?.overall ?? "loading"}><div><span><ShieldCheck size={19} weight="duotone" /> Data trust center</span><h1>{en ? "What is live, what is delayed" : "哪些是实时，哪些有延迟"}</h1><p>{en ? "Stone Daily exposes provider health, freshness, fallback behavior and editorial boundaries instead of hiding uncertainty behind one green dot." : "Stone Daily 公开数据源健康、时效、回退方式与编辑边界，不用一个绿点掩盖不确定性。"}</p><button className="button button--secondary" disabled={loading} onClick={load} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={17} />{en ? "Refresh checks" : "重新检测"}</button></div><aside>{error ? <WarningCircle size={34} /> : <CheckCircle size={34} weight="duotone" />}<strong>{error ? (en ? "Status API unavailable" : "状态接口暂不可用") : statusLabel}</strong><span>{snapshot ? `${snapshot.checks.live}/${snapshot.checks.total} ${en ? "sources live" : "个来源在线"}` : (en ? "Running checks…" : "正在检测…")}</span><small>{snapshot ? `${en ? "Oldest current record" : "当前最旧记录"} · ${ageLabel(snapshot.checks.oldestAgeSeconds, en)}` : "—"}</small></aside></header>

    <section className="trust-definitions"><article><Clock size={20} /><div><strong>{en ? "Live" : "实时"}</strong><p>{en ? "Fetched successfully from the provider in the current collection cycle." : "当前采集周期已从官方或原始来源成功读取。"}</p></div></article><article><Database size={20} /><div><strong>{en ? "Cached" : "缓存"}</strong><p>{en ? "The latest successful snapshot is retained with its original timestamp." : "保留最近一次成功快照，并明确显示原始时间。"}</p></div></article><article><WarningCircle size={20} /><div><strong>{en ? "Fallback / catalog" : "回退 / 目录"}</strong><p>{en ? "Useful for interface continuity, but not presented as a current tradable quote." : "仅保证信息结构连续，不冒充当前可交易报价。"}</p></div></article></section>

    <section className="provider-health"><div className="asset-section-heading"><span>{en ? "Provider health" : "数据源健康"}</span><h2>{en ? "Current collection status" : "当前采集状态"}</h2><p>{en ? "Each provider keeps its own methodology. One provider failing does not silently erase the others." : "每个来源保留自己的口径；单源故障不会悄悄抹掉其他来源。"}</p></div>{grouped.map((group) => <details key={group.surface} open><summary><span>{SURFACE_LABELS[group.surface][en ? 1 : 0]}</span><strong>{group.items.filter((item) => item.status === "live").length}/{group.items.length} live</strong></summary><div className="provider-health__table">{group.items.map((item, index) => <article key={`${item.name}-${index}`}><i data-status={item.status} /><span><strong>{item.name}</strong><small>{item.itemCount} {en ? "records" : "条记录"}{item.latencyMs ? ` · ${item.latencyMs}ms` : ""}</small></span><em data-status={item.status}>{item.status}</em><time>{item.updatedAt ? new Date(item.updatedAt).toLocaleString(en ? "en-US" : "zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—"}</time>{item.url ? <a aria-label={en ? "Open source documentation" : "打开来源文档"} href={item.url} rel="noreferrer" target="_blank"><ArrowSquareOut size={15} /></a> : <span />}</article>)}</div></details>)}</section>

    <section className="trust-method-grid"><article><Eye size={23} /><h2>{en ? "Editorial discipline" : "新闻编辑纪律"}</h2><ul><li>{en ? "Daily Pulse promotes only market-relevant, event-level stories." : "每日热点只提升与币圈、币股直接相关的事件级新闻。"}</li><li>{en ? "Confirmed facts, inference and unverified impact stay separated." : "已确认事实、推断与未确认影响分开呈现。"}</li><li>{en ? "Generic roundups, clipped headlines and failed translations remain outside the share digest." : "泛化汇总、截断标题和未通过校验的翻译不会进入分享摘要。"}</li><li>{en ? "The full 7×24 page retains the wider raw flow with source links." : "完整 7×24 页面保留更广的信息流与原始链接。"}</li></ul></article><article><LockKey size={23} /><h2>{en ? "Privacy-friendly product analytics" : "隐私友好的产品分析"}</h2><ul><li>{en ? "No analytics cookie, advertising ID, wallet address or account identifier." : "不设置分析 Cookie，不采集广告 ID、钱包地址或账户标识。"}</li><li>{en ? "Only allow-listed event names, route paths and coarse feature properties are logged." : "只记录白名单事件名、页面路径和粗粒度功能属性。"}</li><li>{en ? "Browser Do Not Track is respected." : "尊重浏览器 Do Not Track 设置。"}</li><li>{en ? "Watchlists, alerts and pause records stay local unless you export them or explicitly opt into a sync account." : "自选、提醒与冷静记录默认只在本机，除非你主动导出或明确启用同步账号。"}</li></ul></article></section>
    <section className="correction-log"><CheckCircle size={21} /><div><strong>{en ? "Public correction status" : "公开更正状态"}</strong><p>{en ? "No unresolved correction is currently listed. When a published digest is corrected, this section will record the date, original wording, corrected wording and reason." : "当前没有待处理的公开更正。若已发布摘要需要修订，这里会记录日期、原表述、修订表述和原因。"}</p></div></section>
  </div>;
}
