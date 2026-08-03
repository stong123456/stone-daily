"use client";

import {
  ArrowClockwise,
  ArrowRight,
  Bell,
  Browsers,
  ChartLineUp,
  CheckCircle,
  CloudCheck,
  CrownSimple,
  Database,
  Desktop,
  DownloadSimple,
  Eye,
  Funnel,
  Globe,
  LockKey,
  Pulse,
  ShieldCheck,
  Star,
  UserCircle,
  UsersThree,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { useAppState } from "@/components/AppStateProvider";
import type { AdminAnalyticsBreakdown, AdminOverview } from "@/types/admin";
import type { DataProviderStatus, DataTrustSnapshot } from "@/types/market";

const ranges = [7, 14, 30, 90] as const;
const featureCopy: Record<string, [string, string]> = {
  asset_open: ["打开资产详情", "Asset detail opens"],
  watchlist_change: ["增减自选", "Watchlist changes"],
  alert_create: ["创建提醒", "Alerts created"],
  digest_copy: ["复制每日热点", "Digests copied"],
  share_card: ["生成分享图", "Share cards generated"],
  calm_open: ["使用冷静工具", "Calm tool opens"],
  wallet_connect: ["连接钱包", "Wallet connections"],
  sync_action: ["执行同步操作", "Sync actions"],
};

function shortAddress(address: string) { return `${address.slice(0, 8)}…${address.slice(-6)}`; }
function percentageChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
function formatMetric(value: number) { return new Intl.NumberFormat("zh-CN", { notation: value >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value); }

function BreakdownList({ rows, empty, directLabel }: { rows: AdminAnalyticsBreakdown[]; empty: string; directLabel: string }) {
  if (!rows.length) return <div className="admin-empty admin-empty--compact"><span>{empty}</span></div>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div className="admin-breakdown-list">{rows.map((row) => <div key={row.label}><div><strong>{row.label === "direct" ? directLabel : row.label}</strong><span>{formatMetric(row.value)} · {row.share}%</span></div><i><b style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} /></i></div>)}</div>;
}

export function AdminDashboard() {
  const { language } = useAppState();
  const { available, status, account, error: accountError, connectWallet } = useAccountSync();
  const en = language === "en";
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trust, setTrust] = useState<DataTrustSnapshot | null>(null);
  const [rangeDays, setRangeDays] = useState<(typeof ranges)[number]>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!account?.isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const [adminResponse, trustResponse] = await Promise.all([
        fetch(`/api/admin/overview?days=${rangeDays}`, { cache: "no-store" }),
        fetch("/api/status", { cache: "no-store" }),
      ]);
      if (!adminResponse.ok || !trustResponse.ok) throw new Error("admin_load_failed");
      const [adminValue, trustValue] = await Promise.all([
        adminResponse.json() as Promise<AdminOverview>,
        trustResponse.json() as Promise<DataTrustSnapshot>,
      ]);
      setOverview(adminValue);
      setTrust(trustValue);
    } catch {
      setError("admin_load_failed");
    } finally {
      setLoading(false);
    }
  }, [account?.isAdmin, rangeDays]);

  useEffect(() => { if (account?.isAdmin) void load(); }, [account?.isAdmin, load]);
  const providers = useMemo(() => [...(trust?.providers ?? [])].sort((left, right) => Number(left.status === "live") - Number(right.status === "live") || left.name.localeCompare(right.name)), [trust]);

  if (status === "loading") return <div className="admin-gate"><Pulse className="spin" size={30} /><h1>{en ? "Checking administrator session…" : "正在检查管理员会话…"}</h1></div>;
  if (!available || status === "unavailable") return <div className="admin-gate"><WarningCircle size={32} /><h1>{en ? "Admin service is not configured" : "管理员服务尚未配置"}</h1><p>{en ? "Configure PostgreSQL, the session secret and an administrator wallet allowlist in Railway." : "请先在 Railway 配置 PostgreSQL、会话密钥和管理员钱包白名单。"}</p></div>;
  if (!account) return <div className="admin-gate"><LockKey size={34} /><span>Stone Daily Admin</span><h1>{en ? "Administrator wallet required" : "需要管理员钱包签名"}</h1><p>{en ? "Access is checked server-side against the administrator allowlist. The signature does not authorize transactions or token approvals." : "权限由服务端管理员白名单校验；签名不授权交易，也不授权代币。"}</p><button className="button button--primary" disabled={status === "syncing"} onClick={() => void connectWallet()} type="button"><Wallet size={18} />{status === "syncing" ? (en ? "Waiting for wallet…" : "等待钱包…") : (en ? "Connect administrator wallet" : "连接管理员钱包")}</button>{accountError ? <small>{en ? "Wallet sign-in was not completed." : "钱包登录未完成，请确认钱包已解锁。"}</small> : null}</div>;
  if (!account.isAdmin) return <div className="admin-gate"><ShieldCheck size={34} /><span>{shortAddress(account.walletAddress)}</span><h1>{en ? "This wallet is not an administrator" : "当前钱包没有管理员权限"}</h1><p>{en ? "Knowing the admin URL does not grant access. Add this address to STONE_ADMIN_WALLETS only if it should control operations." : "知道后台网址不会获得权限。只有确需管理时，才把该地址加入 STONE_ADMIN_WALLETS。"}</p></div>;

  const analytics = overview?.analytics;
  const maxTrend = Math.max(...(analytics?.trend.flatMap((point) => [point.visitors, point.pageViews]) ?? [1]), 1);
  const maxFeature = Math.max(...(analytics?.features.map((item) => item.count) ?? [1]), 1);
  const pageViewChange = analytics ? percentageChange(analytics.period.pageViews, analytics.previousPeriod.pageViews) : 0;
  const visitorChange = analytics ? percentageChange(analytics.period.visitors, analytics.previousPeriod.visitors) : 0;
  const viewsPerVisitor = analytics?.period.visitors ? analytics.period.pageViews / analytics.period.visitors : 0;
  const authCompletion = overview?.walletAuth.challenges24h ? (overview.walletAuth.completed24h / overview.walletAuth.challenges24h) * 100 : 0;
  const stats = overview && analytics ? [
    { label: en ? "Visitors today" : "今日访客", value: analytics.today.visitors, note: `${analytics.today.pageViews} ${en ? "page views" : "次浏览"}`, change: null, Icon: UsersThree },
    { label: en ? `Visitors / ${rangeDays}d` : `${rangeDays} 日访客`, value: analytics.period.visitors, note: en ? "Privacy-safe estimate" : "隐私友好估算", change: visitorChange, Icon: Eye },
    { label: en ? `Page views / ${rangeDays}d` : `${rangeDays} 日浏览量`, value: analytics.period.pageViews, note: `${viewsPerVisitor.toFixed(1)} ${en ? "views / visitor" : "页 / 访客"}`, change: pageViewChange, Icon: ChartLineUp },
    { label: en ? "Wallet accounts" : "钱包账号", value: overview.accounts.total, note: `${overview.accounts.active7d} ${en ? "active in 7d" : "个近 7 日活跃"}`, change: null, Icon: UserCircle },
    { label: en ? "Auth completion / 24h" : "24h 登录完成率", value: Number(authCompletion.toFixed(1)), suffix: "%", note: `${overview.walletAuth.completed24h}/${overview.walletAuth.challenges24h}`, change: null, Icon: Wallet },
    { label: en ? "Product records" : "用户数据条目", value: overview.productData.watchlistItems + overview.productData.alerts + overview.productData.pauseRecords, note: en ? "Watchlist + alerts + pauses" : "自选 + 提醒 + 冷静记录", change: null, Icon: Database },
  ] : [];

  return <div className="admin-dashboard admin-dashboard--pro">
    <header className="admin-hero admin-hero--pro"><div><span><CrownSimple size={17} />Stone Daily Admin</span><h1>{en ? "Operations & audience" : "运营与访客分析"}</h1><p>{en ? "A private command center for audience trends, product adoption, provider health and privacy boundaries. Visitor identities, raw IP addresses, balances and positions are never shown or stored." : "管理员专用控制台：查看访客趋势、产品采用、数据源健康和隐私边界；不展示或保存访客身份、原始 IP、余额与持仓。"}</p><div><code>{shortAddress(account.walletAddress)}</code><em>{en ? "Server-authorized" : "服务端已授权"}</em><small>{overview ? `${en ? "Updated" : "更新于"} ${new Date(overview.generatedAt).toLocaleString(en ? "en-US" : "zh-CN")}` : "—"}</small></div></div><button className="button button--secondary" disabled={loading} onClick={() => void load()} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={17} />{en ? "Refresh" : "刷新数据"}</button></header>
    {error ? <div className="admin-error"><WarningCircle size={18} />{en ? "The latest admin snapshot could not be loaded. The previous snapshot is still shown." : "暂时无法读取最新后台快照，页面保留上一次成功结果。"}</div> : null}

    <div className="admin-workbench">
      <nav className="admin-rail" aria-label={en ? "Admin sections" : "后台板块"}><strong>{en ? "Workspace" : "工作台"}</strong><a href="#traffic"><ChartLineUp size={18} />{en ? "Traffic" : "访问分析"}</a><a href="#content"><Eye size={18} />{en ? "Content" : "页面表现"}</a><a href="#features"><Funnel size={18} />{en ? "Features" : "功能使用"}</a><a href="#accounts"><UserCircle size={18} />{en ? "Accounts" : "用户账号"}</a><a href="#providers"><Pulse size={18} />{en ? "Providers" : "数据源"}</a><a href="#security"><ShieldCheck size={18} />{en ? "Privacy" : "隐私安全"}</a><div><LockKey size={20} /><span>{en ? "Read-only operations" : "只读运营模式"}</span><small>{en ? "No user deletion or content override" : "不开放用户删除或内容强改"}</small></div></nav>

      <div className="admin-content">
        <section className="admin-toolbar" id="traffic"><div><span>{en ? "Audience window" : "访客时间范围"}</span><strong>{en ? `Last ${rangeDays} days` : `最近 ${rangeDays} 天`}</strong></div><div className="admin-range" role="group" aria-label={en ? "Analytics range" : "分析时间范围"}>{ranges.map((days) => <button aria-pressed={rangeDays === days} data-active={rangeDays === days} disabled={loading} key={days} onClick={() => setRangeDays(days)} type="button">{days}{en ? "d" : "天"}</button>)}</div><a className="button button--secondary" href={`/api/admin/analytics/export?days=${rangeDays}`}><DownloadSimple size={17} />{en ? "Export CSV" : "导出 CSV"}</a></section>

        <section className="admin-stats admin-stats--pro">{stats.length ? stats.map(({ label, value, suffix, note, change, Icon }) => <article key={label}><Icon size={22} weight="duotone" /><span><small>{label}</small><strong>{formatMetric(value)}{suffix}</strong><em>{change === null ? note : <><b data-tone={change >= 0 ? "up" : "down"}>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</b> {en ? "vs prior period" : "较上一周期"}</>}</em></span></article>) : Array.from({ length: 6 }, (_, index) => <article className="admin-stat-skeleton" key={index} />)}</section>

        <section className="admin-analytics-grid">
          <article className="admin-panel admin-traffic-chart"><header><div><span>{en ? "Traffic trend" : "流量趋势"}</span><h2>{en ? `Visitors and page views · ${rangeDays}d` : `访客与浏览量 · ${rangeDays} 天`}</h2></div><div className="admin-chart-legend"><span><i />{en ? "Visitors" : "访客"}</span><span><i />{en ? "Page views" : "浏览量"}</span></div></header>{analytics?.trend.some((point) => point.pageViews || point.visitors) ? <div className="admin-bars" style={{ gridTemplateColumns: `repeat(${analytics.trend.length}, minmax(${rangeDays > 30 ? 5 : 14}px, 1fr))` }}>{analytics.trend.map((point, index) => <div className="admin-bars__day" key={point.date} title={`${point.date} · ${point.visitors} UV · ${point.pageViews} PV`}><div><i style={{ height: `${Math.max(point.visitors ? 3 : 0, (point.visitors / maxTrend) * 100)}%` }} /><b style={{ height: `${Math.max(point.pageViews ? 3 : 0, (point.pageViews / maxTrend) * 100)}%` }} /></div>{rangeDays <= 14 || index % Math.ceil(rangeDays / 10) === 0 || index === analytics.trend.length - 1 ? <time>{point.date.slice(5)}</time> : <time />}</div>)}</div> : <div className="admin-empty"><ChartLineUp size={28} /><strong>{en ? "Visitor history starts after this release" : "访客历史会从本次上线后开始积累"}</strong><p>{en ? "No synthetic traffic is inserted. Real page views will appear here as visitors use the site." : "这里不会补入模拟流量；真实访客访问页面后，趋势会自动出现。"}</p></div>}</article>

          <article className="admin-panel admin-live-panel"><header><div><span>{en ? "Last 24 hours" : "最近 24 小时"}</span><h2>{en ? "Activity rhythm" : "访问活跃时段"}</h2></div><Pulse size={21} /></header>{analytics?.hourly.length ? <div className="admin-hour-list">{analytics.hourly.slice(-12).map((item) => <div key={item.hour}><time>{item.hour}</time><i><b style={{ width: `${Math.max(3, (item.pageViews / Math.max(...analytics.hourly.map((row) => row.pageViews), 1)) * 100)}%` }} /></i><strong>{item.visitors} / {item.pageViews}</strong></div>)}</div> : <div className="admin-empty admin-empty--compact"><span>{en ? "No activity recorded in the last 24 hours" : "最近 24 小时还没有访问记录"}</span></div>}<footer><span>UV / PV</span><em>{en ? "Beijing time" : "北京时间"}</em></footer></article>
        </section>

        <section className="admin-content-grid" id="content">
          <article className="admin-panel admin-pages"><header><div><span>{en ? "Content performance" : "内容表现"}</span><h2>{en ? "Most visited pages" : "热门页面"}</h2></div><strong>{rangeDays}{en ? " days" : " 天"}</strong></header>{analytics?.topPages.length ? <div className="admin-table"><div className="admin-table__head"><span>{en ? "Path" : "页面"}</span><span>PV</span><span>UV</span><span>{en ? "Views / visitor" : "人均浏览"}</span></div>{analytics.topPages.map((page) => <div key={page.path}><code>{page.path}</code><strong>{formatMetric(page.views)}</strong><span>{formatMetric(page.visitors)}</span><span>{page.visitors ? (page.views / page.visitors).toFixed(1) : "0"}</span></div>)}</div> : <div className="admin-empty admin-empty--compact"><span>{en ? "No page ranking yet" : "还没有页面排行数据"}</span></div>}</article>

          <aside className="admin-stack"><article className="admin-panel"><header><div><span>{en ? "Acquisition" : "访问来源"}</span><h2>{en ? "Traffic sources" : "流量来源"}</h2></div><Globe size={21} /></header><BreakdownList directLabel={en ? "Direct / in-app" : "直接访问 / 应用内"} empty={en ? "No source data yet" : "还没有来源数据"} rows={analytics?.sources ?? []} /></article><article className="admin-panel"><header><div><span>{en ? "Experience" : "访问设备"}</span><h2>{en ? "Device split" : "设备分布"}</h2></div><Desktop size={21} /></header><BreakdownList directLabel="" empty={en ? "No device data yet" : "还没有设备数据"} rows={analytics?.devices ?? []} /></article></aside>
        </section>

        <section className="admin-feature-grid" id="features">
          <article className="admin-panel admin-feature-panel"><header><div><span>{en ? "Product adoption" : "产品使用"}</span><h2>{en ? "Feature activity" : "核心功能使用次数"}</h2></div><Funnel size={21} /></header>{analytics?.features.length ? <div className="admin-feature-list">{analytics.features.map((item, index) => <div key={item.name}><b>{index + 1}</b><span><strong>{featureCopy[item.name]?.[en ? 1 : 0] ?? item.name}</strong><i><em style={{ width: `${Math.max(4, (item.count / maxFeature) * 100)}%` }} /></i></span><time>{formatMetric(item.count)}</time></div>)}</div> : <div className="admin-empty admin-empty--compact"><span>{en ? "Feature events will appear after real use" : "真实用户使用功能后，这里会形成统计"}</span></div>}</article>
          <article className="admin-panel admin-browser-panel"><header><div><span>{en ? "Compatibility" : "浏览环境"}</span><h2>{en ? "Browser families" : "浏览器分布"}</h2></div><Browsers size={21} /></header><BreakdownList directLabel="" empty={en ? "No browser data yet" : "还没有浏览器数据"} rows={analytics?.browsers ?? []} /></article>
          <article className="admin-panel admin-account-panel" id="accounts"><header><div><span>{en ? "Account adoption" : "账号采用"}</span><h2>{en ? "Wallet sync usage" : "钱包同步使用"}</h2></div><Wallet size={21} /></header><dl><div><dt>{en ? "Accounts" : "钱包账号"}</dt><dd>{overview ? formatMetric(overview.accounts.total) : "—"}</dd></div><div><dt>{en ? "Active in 7d" : "近 7 日活跃"}</dt><dd>{overview ? formatMetric(overview.accounts.active7d) : "—"}</dd></div><div><dt>{en ? "Sync revisions" : "同步版本累计"}</dt><dd>{overview ? formatMetric(overview.accounts.syncRevisions) : "—"}</dd></div><div><dt>{en ? "Auth challenges / 24h" : "24h 登录挑战"}</dt><dd>{overview ? `${overview.walletAuth.completed24h}/${overview.walletAuth.challenges24h}` : "—"}</dd></div></dl><footer><CloudCheck size={17} />{en ? "Only user-owned watchlists, alerts and pause records are synced." : "只同步用户自己的自选、提醒与冷静记录。"}</footer></article>
        </section>

        <section className="admin-bottom-grid" id="providers"><article className="admin-panel"><header><div><span>{en ? "Data trust" : "数据可信度"}</span><h2>{en ? "Provider health" : "数据源健康"}</h2></div><strong data-status={trust?.overall ?? "loading"}>{trust ? `${trust.checks.live}/${trust.checks.total} live` : (en ? "Checking" : "检查中")}</strong></header><div className="admin-provider-list">{providers.slice(0, 22).map((provider: DataProviderStatus) => <div key={`${provider.surface}-${provider.name}`}><i data-status={provider.status} /><span><strong>{provider.name}</strong><small>{provider.surface} · {provider.itemCount} {en ? "records" : "条"}</small></span><em>{provider.status}</em>{provider.latencyMs ? <time>{provider.latencyMs}ms</time> : <time>—</time>}</div>)}</div></article>
          <aside className="admin-panel admin-security" id="security"><header><div><span>{en ? "Access boundary" : "权限边界"}</span><h2>{en ? "Privacy & security" : "隐私与管理员安全"}</h2></div><LockKey size={22} /></header><ul><li><CheckCircle size={17} />{en ? "Every admin API request checks the server-side wallet allowlist." : "每次管理员 API 请求都会校验服务端钱包白名单。"}</li><li><CheckCircle size={17} />{en ? "Visitor keys are rotating salted hashes; raw IP and full user-agent strings are not stored." : "访客标识是定期轮换的加盐哈希，不保存原始 IP 与完整 User-Agent。"}</li><li><CheckCircle size={17} />{en ? `Aggregated analytics is retained for ${analytics?.retentionDays ?? 180} days and uses no analytics cookie.` : `汇总分析保留 ${analytics?.retentionDays ?? 180} 天，不设置分析 Cookie。`}</li><li><CheckCircle size={17} />{en ? "This dashboard is read-only: no user deletion, content override or wallet asset access." : "后台保持只读：不开放用户删除、内容强改或钱包资产访问。"}</li><li><CheckCircle size={17} />{en ? "Wallet signatures are verified and then discarded." : "钱包签名完成校验后不会保存。"}</li></ul><footer><ShieldCheck size={16} />{en ? "Privacy-friendly by design" : "隐私友好设计"}</footer></aside></section>
      </div>
    </div>
  </div>;
}
