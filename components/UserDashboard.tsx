"use client";

import {
  ArrowRight,
  Bell,
  BellRinging,
  Brain,
  CheckCircle,
  ClockCounterClockwise,
  CloudCheck,
  Eye,
  FirstAid,
  LockKey,
  ShieldCheck,
  Star,
  TrendUp,
  UserCircle,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssetLogo } from "@/components/AssetLogo";
import { CloudSyncAccount } from "@/components/CloudSyncAccount";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { useAppState } from "@/components/AppStateProvider";
import { formatPercent, formatPrice, formatRecordTime } from "@/services/format";
import { canonicalAssetId, canonicalAssetSymbol, isWatchedAsset } from "@/services/marketWeather";
import { fetchMarketFeed } from "@/services/marketProviders";
import type { MarketAsset } from "@/types/market";

function shortAddress(address: string) { return `${address.slice(0, 7)}…${address.slice(-5)}`; }

export function UserDashboard() {
  const app = useAppState();
  const { account, status } = useAccountSync();
  const en = app.language === "en";
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")])
      .then(([crypto, stocks]) => { if (active) setAssets([...crypto.assets, ...stocks.assets]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const watched = useMemo(() => {
    const bySymbol = new Map<string, MarketAsset>();
    for (const asset of assets) {
      if (!isWatchedAsset(app.watchlistIds, asset)) continue;
      const symbol = canonicalAssetSymbol(asset);
      const current = bySymbol.get(symbol);
      if (!current || asset.volume > current.volume) bySymbol.set(symbol, asset);
    }
    return [...bySymbol.values()].sort((left, right) => Math.abs(right.change24h) - Math.abs(left.change24h));
  }, [app.watchlistIds, assets]);
  const unreadEvents = app.alertEvents.filter((event) => !event.read);
  const enabledAlerts = app.alerts.filter((alert) => alert.enabled);
  const leadAsset = watched[0];
  const leadEvent = unreadEvents[0];
  const latestRecord = app.records[0];

  const priorities = [
    leadEvent ? {
      title: en ? `${leadEvent.symbol}: an alert needs review` : `${leadEvent.symbol}：有一条提醒需要查看`,
      note: leadEvent.message,
      meta: en ? "Unread alert" : "未读提醒",
      href: "/watchlist",
      tone: "warning",
    } : {
      title: en ? "Your alert inbox is clear" : "提醒收件箱目前是空的",
      note: en ? "No condition needs immediate attention. You do not need to watch every candle." : "没有需要立刻处理的条件，不必盯住每一根 K 线。",
      meta: en ? "Quiet" : "平静",
      href: "/watchlist",
      tone: "calm",
    },
    leadAsset ? {
      title: en ? `${canonicalAssetSymbol(leadAsset)} has the largest move in your list` : `${canonicalAssetSymbol(leadAsset)} 是自选中波动最大的一项`,
      note: en ? `${formatPercent(leadAsset.change24h)} in 24h. Read the venue and product structure before interpreting it.` : `24 小时 ${formatPercent(leadAsset.change24h)}。先核对交易所和产品结构，再理解涨跌。`,
      meta: en ? "Watchlist" : "自选变化",
      href: `/asset/${canonicalAssetSymbol(leadAsset)}`,
      tone: Math.abs(leadAsset.change24h) >= 5 ? "warning" : "normal",
    } : {
      title: en ? "Build a small market shortlist" : "先建立一份精简的自选清单",
      note: en ? "Add only assets you genuinely need to follow." : "只添加真正需要持续观察的资产，信息会更清楚。",
      meta: en ? "Start here" : "从这里开始",
      href: "/markets",
      tone: "normal",
    },
    latestRecord ? {
      title: en ? "Revisit your latest pause" : "回看最近一次冷静记录",
      note: latestRecord.summary,
      meta: formatRecordTime(latestRecord.createdAt, en ? "en-US" : "zh-CN"),
      href: "/history",
      tone: "calm",
    } : {
      title: en ? "Write down a rule before the next impulse" : "下一次冲动前，先写下一条规则",
      note: en ? "A short pause is more useful than another prediction." : "多停一分钟，往往比多看一个预测更有用。",
      meta: en ? "Pause plan" : "冷静计划",
      href: "/regret",
      tone: "calm",
    },
  ];

  return <div className="user-dashboard">
    <header className="user-hero">
      <div><span><UserCircle size={18} weight="duotone" />{en ? "My Stone Daily" : "我的 Stone Daily"}</span><h1>{account ? (en ? "Welcome back. Focus on what matters." : "欢迎回来，把注意力留给重要的事。") : (en ? "Your calm market home" : "你的理性行情主页")}</h1><p>{account ? (en ? `Wallet ${shortAddress(account.walletAddress)} is connected. Your watchlist, alerts and pause records can sync across devices.` : `钱包 ${shortAddress(account.walletAddress)} 已连接，自选、提醒和冷静记录可以跨设备同步。`) : (en ? "You are using guest mode. All personal data stays on this device; wallet sign-in is optional." : "你正在使用游客模式。个人数据只保存在本机，钱包登录完全可选。")}</p></div>
      <div className="user-hero__status" data-status={status}><span>{account ? <CloudCheck size={23} /> : <LockKey size={23} />}</span><small>{en ? "Data status" : "数据状态"}</small><strong>{account ? (status === "synced" ? (en ? "Synced" : "已同步") : (en ? "Syncing locally" : "正在处理同步")) : (en ? "Local only" : "仅保存在本机")}</strong><em>{en ? "No balances or positions read" : "不读取余额与持仓"}</em></div>
    </header>

    <section className="user-priorities" aria-labelledby="user-priority-title"><div className="user-section-heading"><div><span>{en ? "Today" : "今天"}</span><h2 id="user-priority-title">{en ? "Three things to look at first" : "先看这三件事"}</h2></div><Link href="/watchlist">{en ? "Manage focus" : "管理关注"}<ArrowRight size={15} /></Link></div><div className="user-priority-list">{priorities.map((item, index) => <Link data-tone={item.tone} href={item.href} key={item.title}><b>{index + 1}</b><span><strong>{item.title}</strong><small>{item.note}</small></span><em>{item.meta}</em><ArrowRight size={17} /></Link>)}</div></section>

    <section className="user-summary" aria-label={en ? "Personal summary" : "个人概览"}>
      <article><Star size={22} weight="duotone" /><span><small>{en ? "Watched assets" : "自选资产"}</small><strong>{app.watchlistIds.length}</strong><em>{en ? "Focused shortlist" : "精简关注清单"}</em></span></article>
      <article><Bell size={22} weight="duotone" /><span><small>{en ? "Enabled alerts" : "已启用提醒"}</small><strong>{enabledAlerts.length}</strong><em>{app.alerts.length - enabledAlerts.length} {en ? "paused" : "条暂停"}</em></span></article>
      <article><BellRinging size={22} weight="duotone" /><span><small>{en ? "Unread triggers" : "未读触发"}</small><strong>{unreadEvents.length}</strong><em>{en ? "Needs review" : "需要查看"}</em></span></article>
      <article><FirstAid size={22} weight="duotone" /><span><small>{en ? "Pause records" : "冷静记录"}</small><strong>{app.records.length}</strong><em>{en ? "Your decision trail" : "你的决策痕迹"}</em></span></article>
    </section>

    <section className="user-main-grid">
      <article className="user-panel user-watch-panel"><header className="user-section-heading"><div><span>{en ? "Live shortlist" : "实时自选"}</span><h2>{en ? "Assets you chose to follow" : "你主动选择关注的资产"}</h2></div><Link href="/watchlist">{en ? "Full watchlist" : "完整自选"}<ArrowRight size={15} /></Link></header>{watched.length ? <div className="user-watch-table"><div className="user-watch-table__head"><span>{en ? "Asset" : "资产"}</span><span>{en ? "Price" : "价格"}</span><span>24h</span><span>{en ? "Plain-language signal" : "人话信号"}</span><span /></div>{watched.slice(0, 8).map((asset) => <Link href={`/asset/${canonicalAssetSymbol(asset)}`} key={canonicalAssetId(asset)}><span className="user-watch-table__asset"><AssetLogo asset={asset} size={34} /><span><strong>{canonicalAssetSymbol(asset)}</strong><small>{asset.venue ?? asset.name}</small></span></span><strong>{formatPrice(asset.price)}</strong><em className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{formatPercent(asset.change24h)}</em><small>{Math.abs(asset.change24h) >= 5 ? (en ? "Fast move · verify source and liquidity" : "快速波动 · 先核对来源与流动性") : (en ? "Inside normal 24h range" : "处于常规 24 小时波动区间")}</small><ArrowRight size={15} /></Link>)}</div> : <div className="user-empty"><Star size={28} /><strong>{loading ? (en ? "Loading your assets…" : "正在读取你的资产…") : (en ? "No assets in your shortlist yet" : "你的自选清单还是空的")}</strong><p>{en ? "Start with a few assets you truly understand and need to follow." : "先从少量真正理解、确实需要跟踪的资产开始。"}</p><Link className="button button--primary" href="/markets">{en ? "Browse markets" : "浏览实时行情"}</Link></div>}</article>

      <aside className="user-panel user-inbox"><header className="user-section-heading"><div><span>{en ? "Inbox" : "收件箱"}</span><h2>{en ? "Recent alert activity" : "最近提醒动态"}</h2></div><Link href="/watchlist">{en ? "View all" : "查看全部"}<ArrowRight size={15} /></Link></header>{app.alertEvents.length ? <ol>{app.alertEvents.slice(0, 6).map((event) => <li data-read={event.read} key={event.id}><i /><span><strong>{event.symbol}</strong><small>{event.message}</small></span><time>{formatRecordTime(event.createdAt, en ? "en-US" : "zh-CN")}</time></li>)}</ol> : <div className="user-empty user-empty--compact"><CheckCircle size={25} /><strong>{en ? "No recent triggers" : "最近没有提醒触发"}</strong><p>{en ? "Quiet is useful information too." : "没有新触发，本身也是有用的信息。"}</p></div>}</aside>
    </section>

    <section className="user-secondary-grid">
      <article className="user-panel user-records"><header className="user-section-heading"><div><span>{en ? "Decision trail" : "决策痕迹"}</span><h2>{en ? "Recent AI & pause records" : "最近 AI 与冷静记录"}</h2></div><Link href="/history">{en ? "Open log" : "查看记录"}<ArrowRight size={15} /></Link></header>{app.records.length ? <ol>{app.records.slice(0, 4).map((record) => <li key={record.id}><span>{record.type === "ai" ? <Brain size={18} /> : record.type === "regret" ? <FirstAid size={18} /> : <TrendUp size={18} />}</span><div><strong>{record.input}</strong><p>{record.summary}</p><time>{formatRecordTime(record.createdAt, en ? "en-US" : "zh-CN")}</time></div></li>)}</ol> : <div className="user-empty user-empty--compact"><ClockCounterClockwise size={25} /><strong>{en ? "No AI or pause record yet" : "还没有 AI 或冷静记录"}</strong><p>{en ? "AI briefs, detox results and pause reports can be saved here." : "AI 解读、拆弹与冷静分析会保存在这里。"}</p><Link href="/markets">{en ? "Open live markets" : "查看实时行情"}<ArrowRight size={14} /></Link></div>}</article>
      <aside className="user-panel user-privacy"><header><ShieldCheck size={24} weight="duotone" /><div><span>{en ? "Sync & privacy" : "同步与隐私"}</span><h2>{en ? "You control where personal data lives" : "个人数据放在哪里，由你决定"}</h2></div></header><ul><li><Eye size={17} /><span><strong>{en ? "Local first" : "默认本机保存"}</strong><small>{en ? "Guest data never needs an account." : "游客数据不需要注册账号。"}</small></span></li><li><Wallet size={17} /><span><strong>{en ? "Wallet is identity only" : "钱包只用于身份验证"}</strong><small>{en ? "No transactions, approvals, balances or positions." : "不发交易、不做授权、不读取余额与持仓。"}</small></span></li><li><LockKey size={17} /><span><strong>{en ? "Conflict-safe sync" : "带冲突保护的同步"}</strong><small>{en ? "You can choose local, cloud, or merge both." : "发生冲突时可选择本机、云端或合并。"}</small></span></li></ul></aside>
    </section>

    <section className="user-sync"><CloudSyncAccount /></section>
  </div>;
}
