"use client";

import { ArrowRight, Bell, BellRinging, CheckCircle, DownloadSimple, Export, Star, Trash, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssetLogo } from "@/components/AssetLogo";
import { CloudSyncAccount } from "@/components/CloudSyncAccount";
import { useAppState } from "@/components/AppStateProvider";
import { formatPercent, formatPrice } from "@/services/format";
import { canonicalAssetId, canonicalAssetSymbol, isWatchedAsset } from "@/services/marketWeather";
import { fetchMarketFeed } from "@/services/marketProviders";
import type { MarketAlertKind, MarketAsset } from "@/types/market";

const ALERT_LABELS: Record<MarketAlertKind, [string, string]> = {
  "price-above": ["价格高于", "Price above"],
  "price-below": ["价格低于", "Price below"],
  "move-up": ["24h 涨幅超过", "24h gain above"],
  "move-down": ["24h 跌幅超过", "24h loss above"],
  news: ["重要相关消息", "Important related news"],
  funding: ["资金费率绝对值超过", "Funding magnitude above"],
};

export function WatchlistCenter() {
  const { language, watchlistIds, toggleWatchlist, alerts, alertEvents, removeAlert, toggleAlert, markAlertsRead, exportAppData, importAppData } = useAppState();
  const en = language === "en";
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")]).then(([crypto, stocks]) => { if (active) setAssets([...crypto.assets, ...stocks.assets]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const watched = useMemo(() => {
    const exact = assets.filter((asset) => isWatchedAsset(watchlistIds, asset)).sort((left, right) => right.volume - left.volume);
    const alertSymbols = new Set(alerts.map((alert) => alert.symbol));
    const exactIds = new Set(exact.map(canonicalAssetId));
    const extra = assets.filter((asset) => alertSymbols.has(canonicalAssetSymbol(asset)) && !exactIds.has(canonicalAssetId(asset))).sort((left, right) => right.volume - left.volume);
    return Array.from(new Map([...exact, ...extra].map((asset) => [canonicalAssetId(asset), asset])).values()).sort((left, right) => Math.abs(right.change24h) - Math.abs(left.change24h));
  }, [alerts, assets, watchlistIds]);
  const unread = alertEvents.filter((event) => !event.read).length;

  const exportData = () => {
    const blob = new Blob([exportAppData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stone-daily-sync-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(en ? "Sync file exported" : "同步文件已导出");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const result = importAppData(JSON.parse(await file.text()) as unknown);
      setMessage(en ? (result.ok ? "Watchlist and alerts imported" : "Invalid Stone Daily sync file") : result.message);
    } catch { setMessage(en ? "The file could not be read" : "无法读取这个同步文件"); }
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return setMessage(en ? "This browser does not support system notifications" : "当前浏览器不支持系统通知");
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? (en ? "System notifications enabled" : "系统通知已开启") : (en ? "System notification permission was not granted" : "未获得系统通知权限"));
  };

  return <div className="watch-center">
    <header className="page-header page-header--inline watch-center__header"><div><span>Smart watchlist</span><h1>{en ? "Watchlist & Alerts" : "自选与提醒中心"}</h1><p>{en ? "Follow only what matters, define your conditions in advance and avoid staring at every candle." : "只跟踪真正重要的资产，提前写下触发条件，不必盯着每一根 K 线。"}</p></div><div className="watch-center__header-actions"><button className="button button--secondary" onClick={requestNotifications} type="button"><BellRinging size={17} />{en ? "System notifications" : "系统通知"}</button><button className="button button--secondary" onClick={exportData} type="button"><DownloadSimple size={17} />{en ? "Export sync file" : "导出同步文件"}</button><button className="button button--secondary" onClick={() => inputRef.current?.click()} type="button"><UploadSimple size={17} />{en ? "Import" : "导入"}</button><input accept="application/json" hidden onChange={(event) => void importData(event.target.files?.[0])} ref={inputRef} type="file" /></div></header>
    {message ? <div className="watch-center__message"><CheckCircle size={17} />{message}</div> : null}
    <CloudSyncAccount />
    <section className="watch-summary"><article><Star size={21} weight="duotone" /><span><small>{en ? "Watched assets" : "自选资产"}</small><strong>{watchlistIds.length}</strong></span></article><article><Bell size={21} weight="duotone" /><span><small>{en ? "Enabled alerts" : "已启用提醒"}</small><strong>{alerts.filter((alert) => alert.enabled).length}</strong></span></article><article><BellRinging size={21} weight="duotone" /><span><small>{en ? "Unread triggers" : "未读触发"}</small><strong>{unread}</strong></span></article></section>

    <section className="watch-center__grid"><div><div className="watch-section-heading"><div><span>{en ? "Live watchlist" : "实时自选"}</span><h2>{en ? "Your market shortlist" : "你的市场短名单"}</h2></div><Link href="/markets">{en ? "Add assets" : "添加资产"}<ArrowRight size={15} /></Link></div><div className="smart-watchlist">{watched.length ? watched.map((asset) => <article key={canonicalAssetId(asset)}><Link href={`/asset/${canonicalAssetSymbol(asset)}`}><AssetLogo asset={asset} size={35} /><span><strong>{canonicalAssetSymbol(asset)}</strong><small>{asset.venue ?? asset.name}</small></span></Link><div><strong>{formatPrice(asset.price)}</strong><small className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{formatPercent(asset.change24h)}</small></div><span className="smart-watchlist__signal" data-tone={Math.abs(asset.change24h) >= 5 ? "hot" : "normal"}>{Math.abs(asset.change24h) >= 5 ? (en ? "Fast move · verify first" : "快速波动 · 先核实") : (en ? "Within normal range" : "常规波动区间")}</span><button aria-label={en ? "Remove from watchlist" : "移出自选"} onClick={() => toggleWatchlist(canonicalAssetId(asset), asset.id)} type="button"><Star size={18} weight="fill" /></button></article>) : <div className="watch-empty"><Star size={28} /><strong>{loading ? (en ? "Loading your watchlist…" : "正在读取自选…") : (en ? "No watched assets yet" : "还没有自选资产")}</strong><p>{en ? "Open the market page and select the star beside assets you genuinely track." : "到实时行情页，给真正需要持续观察的资产点亮星标。"}</p><Link className="button button--primary" href="/markets">{en ? "Open markets" : "进入实时行情"}</Link></div>}</div></div>
      <aside className="alert-center"><div className="watch-section-heading"><div><span>{en ? "Rules" : "规则"}</span><h2>{en ? "Alert conditions" : "提醒条件"}</h2></div></div>{alerts.length ? <div className="alert-list">{alerts.map((alert) => <article data-enabled={alert.enabled} key={alert.id}><button aria-label={en ? "Toggle alert" : "开关提醒"} className="alert-list__toggle" data-enabled={alert.enabled} onClick={() => toggleAlert(alert.id)} type="button"><i /></button><div><strong>{alert.symbol}</strong><span>{ALERT_LABELS[alert.kind][en ? 1 : 0]}{alert.threshold ? ` ${alert.threshold}${["move-up", "move-down", "funding"].includes(alert.kind) ? "%" : ""}` : ""}</span><small>{alert.lastTriggeredAt ? `${en ? "Last triggered" : "最近触发"} ${new Date(alert.lastTriggeredAt).toLocaleString(en ? "en-US" : "zh-CN")}` : (en ? "Not triggered yet" : "尚未触发")}</small></div><button aria-label={en ? "Delete alert" : "删除提醒"} className="alert-list__delete" onClick={() => removeAlert(alert.id)} type="button"><Trash size={16} /></button></article>)}</div> : <div className="alert-empty"><Bell size={25} /><p>{en ? "Create price, move, news or funding alerts from any asset detail page." : "可在任意资产详情页创建价格、涨跌、消息或资金费率提醒。"}</p></div>}<div className="alert-method"><WarningCircle size={17} /><p>{en ? "Browser alerts are a convenience, not guaranteed delivery. Keep exchange risk controls independent." : "浏览器提醒只是辅助，不保证送达；交易所风控必须独立设置。"}</p></div></aside>
    </section>

    <section className="alert-events"><div className="watch-section-heading"><div><span>{en ? "Inbox" : "提醒收件箱"}</span><h2>{en ? "Recent triggers" : "最近触发"}</h2></div>{unread ? <button onClick={markAlertsRead} type="button">{en ? "Mark all read" : "全部已读"}</button> : null}</div>{alertEvents.length ? <ol>{alertEvents.slice(0, 20).map((event) => <li data-read={event.read} key={event.id}><i /><div><strong>{event.symbol}</strong><p>{event.message}</p></div><time>{new Date(event.createdAt).toLocaleString(en ? "en-US" : "zh-CN")}</time></li>)}</ol> : <div className="alert-events__empty">{en ? "No alert has fired on this device." : "这台设备上还没有提醒被触发。"}</div>}</section>
    <section className="sync-note"><Export size={20} /><div><strong>{en ? "Portable even without signing in" : "不登录也能带走自己的数据"}</strong><p>{en ? "JSON export and import remain available as a transparent backup. Wallet sign-in is optional; signatures, balances, positions, API keys and exchange credentials are never stored." : "JSON 导入、导出继续作为透明备份方式；钱包登录完全可选，签名、余额、持仓、API Key 与交易所凭证永不保存。"}</p></div></section>
  </div>;
}
