"use client";

import { ArrowClockwise, Bell, CheckCircle, CloudCheck, CrownSimple, Database, LockKey, Pulse, ShieldCheck, Star, UserCircle, Wallet, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { useAppState } from "@/components/AppStateProvider";
import type { AdminOverview } from "@/types/admin";
import type { DataProviderStatus, DataTrustSnapshot } from "@/types/market";

function shortAddress(address: string) { return `${address.slice(0, 8)}…${address.slice(-6)}`; }

export function AdminDashboard() {
  const { language } = useAppState();
  const { available, status, account, error: accountError, connectWallet } = useAccountSync();
  const en = language === "en";
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trust, setTrust] = useState<DataTrustSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!account?.isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const [adminResponse, trustResponse] = await Promise.all([fetch("/api/admin/overview", { cache: "no-store" }), fetch("/api/status", { cache: "no-store" })]);
      if (!adminResponse.ok || !trustResponse.ok) throw new Error("admin_load_failed");
      const [adminValue, trustValue] = await Promise.all([adminResponse.json() as Promise<AdminOverview>, trustResponse.json() as Promise<DataTrustSnapshot>]);
      setOverview(adminValue);
      setTrust(trustValue);
    } catch { setError("admin_load_failed"); } finally { setLoading(false); }
  }, [account?.isAdmin]);

  useEffect(() => { if (account?.isAdmin) void load(); }, [account?.isAdmin, load]);
  const providers = useMemo(() => [...(trust?.providers ?? [])].sort((left, right) => Number(left.status === "live") - Number(right.status === "live") || left.name.localeCompare(right.name)).slice(0, 18), [trust]);

  if (status === "loading") return <div className="admin-gate"><Pulse className="spin" size={30} /><h1>{en ? "Checking administrator session…" : "正在检查管理员会话…"}</h1></div>;
  if (!available || status === "unavailable") return <div className="admin-gate"><WarningCircle size={32} /><h1>{en ? "Admin service is not configured" : "管理员服务尚未配置"}</h1><p>{en ? "Configure PostgreSQL, the session secret and an administrator wallet allowlist in Railway." : "请先在 Railway 配置 PostgreSQL、会话密钥和管理员钱包白名单。"}</p></div>;
  if (!account) return <div className="admin-gate"><LockKey size={34} /><span>Stone Daily Admin</span><h1>{en ? "Administrator wallet required" : "需要管理员钱包签名"}</h1><p>{en ? "Access is checked server-side against the administrator allowlist. The signature does not authorize transactions or token approvals." : "权限由服务端管理员白名单校验；签名不授权交易，也不授权代币。"}</p><button className="button button--primary" disabled={status === "syncing"} onClick={() => void connectWallet()} type="button"><Wallet size={18} />{status === "syncing" ? (en ? "Waiting for wallet…" : "等待钱包…") : (en ? "Connect administrator wallet" : "连接管理员钱包")}</button>{accountError ? <small>{en ? "Wallet sign-in was not completed." : "钱包登录未完成，请确认钱包已解锁。"}</small> : null}</div>;
  if (!account.isAdmin) return <div className="admin-gate"><ShieldCheck size={34} /><span>{shortAddress(account.walletAddress)}</span><h1>{en ? "This wallet is not an administrator" : "当前钱包没有管理员权限"}</h1><p>{en ? "Knowing the admin URL does not grant access. Add this address to STONE_ADMIN_WALLETS only if it should control operations." : "知道后台网址不会获得权限。只有确需管理时，才把该地址加入 STONE_ADMIN_WALLETS。"}</p></div>;

  const stats = overview ? [
    { label: en ? "Wallet accounts" : "钱包账号", value: overview.accounts.total, note: `${overview.accounts.active7d} ${en ? "active in 7d" : "个近 7 日活跃"}`, Icon: UserCircle },
    { label: en ? "Watchlist items" : "自选条目", value: overview.productData.watchlistItems, note: en ? "Cloud copies only" : "仅统计云端副本", Icon: Star },
    { label: en ? "Alert rules" : "提醒规则", value: overview.productData.alerts, note: en ? "Enabled and paused" : "包含启用与暂停", Icon: Bell },
    { label: en ? "Pause records" : "冷静记录", value: overview.productData.pauseRecords, note: en ? "User-owned records" : "用户自有记录", Icon: CloudCheck },
    { label: en ? "Auth challenges / 24h" : "24h 登录挑战", value: overview.walletAuth.challenges24h, note: `${overview.walletAuth.completed24h} ${en ? "completed" : "次完成"}`, Icon: Wallet },
    { label: en ? "Sync revisions" : "同步版本累计", value: overview.accounts.syncRevisions, note: en ? "Conflict-safe writes" : "带冲突保护的写入", Icon: Database },
  ] : [];

  return <div className="admin-dashboard">
    <header className="admin-hero"><div><span><CrownSimple size={17} />Stone Daily Admin</span><h1>{en ? "Operations overview" : "运营与系统总览"}</h1><p>{en ? "A private, read-only view of account adoption, sync usage and provider health. No wallet balances or user positions are collected." : "管理员专用只读视图：查看账号采用、同步使用和数据源健康度；不采集钱包余额或用户持仓。"}</p><div><code>{shortAddress(account.walletAddress)}</code><em>{en ? "Server-authorized" : "服务端已授权"}</em></div></div><button className="button button--secondary" disabled={loading} onClick={() => void load()} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={17} />{en ? "Refresh" : "刷新数据"}</button></header>
    {error ? <div className="admin-error"><WarningCircle size={18} />{en ? "The latest admin snapshot could not be loaded." : "暂时无法读取最新后台快照。"}</div> : null}
    <section className="admin-stats">{stats.length ? stats.map(({ label, value, note, Icon }) => <article key={label}><Icon size={22} weight="duotone" /><span><small>{label}</small><strong>{value.toLocaleString()}</strong><em>{note}</em></span></article>) : Array.from({ length: 6 }, (_, index) => <article className="admin-stat-skeleton" key={index} />)}</section>
    <section className="admin-grid"><article className="admin-panel"><header><div><span>{en ? "Data trust" : "数据可信度"}</span><h2>{en ? "Provider health" : "数据源健康"}</h2></div><strong data-status={trust?.overall ?? "loading"}>{trust ? `${trust.checks.live}/${trust.checks.total} live` : (en ? "Checking" : "检查中")}</strong></header><div className="admin-provider-list">{providers.map((provider: DataProviderStatus) => <div key={`${provider.surface}-${provider.name}`}><i data-status={provider.status} /><span><strong>{provider.name}</strong><small>{provider.surface} · {provider.itemCount} {en ? "records" : "条"}</small></span><em>{provider.status}</em>{provider.latencyMs ? <time>{provider.latencyMs}ms</time> : <time>—</time>}</div>)}</div></article>
      <aside className="admin-panel admin-security"><header><div><span>{en ? "Access boundary" : "权限边界"}</span><h2>{en ? "Administrator security" : "管理员安全"}</h2></div><LockKey size={22} /></header><ul><li><CheckCircle size={17} />{en ? "Wallet allowlist is evaluated on every admin API request." : "每次管理员 API 请求都会校验钱包白名单。"}</li><li><CheckCircle size={17} />{en ? "SIWE nonce is single-use and expires after ten minutes." : "SIWE 随机码只能使用一次，十分钟后失效。"}</li><li><CheckCircle size={17} />{en ? "This release exposes read-only operations—no user deletion or content override." : "当前版本仅提供只读运维，不开放用户删除或内容强改。"}</li><li><CheckCircle size={17} />{en ? "Wallet signatures are verified then discarded." : "钱包签名完成校验后不会保存。"}</li></ul><footer>{overview ? `${en ? "Snapshot" : "快照时间"} ${new Date(overview.generatedAt).toLocaleString(en ? "en-US" : "zh-CN")}` : "—"}</footer></aside></section>
  </div>;
}
