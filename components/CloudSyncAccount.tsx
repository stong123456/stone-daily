"use client";

import { ArrowsClockwise, CheckCircle, CloudArrowDown, CloudArrowUp, CloudCheck, CrownSimple, SignOut, Wallet, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { useAppState } from "@/components/AppStateProvider";

const ERROR_COPY: Record<string, [string, string]> = {
  wallet_missing: ["未检测到浏览器钱包，请先安装或打开 MetaMask、OKX Wallet 等 EVM 钱包", "No browser wallet detected. Install or open an EVM wallet such as MetaMask or OKX Wallet."],
  signature_rejected: ["你取消了签名，本机数据没有变化", "You cancelled the signature; local data is unchanged."],
  invalid_wallet_signature: ["签名校验失败，请重新连接钱包", "Signature verification failed. Please reconnect your wallet."],
  rate_limited: ["尝试次数过多，请稍后再试", "Too many attempts. Please try again later."],
  account_service_error: ["钱包登录服务暂时不可用", "Wallet sign-in is temporarily unavailable."],
  sync_failed: ["同步失败，本机数据仍已保留", "Sync failed; your local data is still safe."],
};

function shortAddress(address: string) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }

export function CloudSyncAccount() {
  const { language } = useAppState();
  const { available, status, account, error, connectWallet, logout, pushLocal, pullCloud, mergeCloud } = useAccountSync();
  const en = language === "en";

  if (status === "loading") return <section className="cloud-account cloud-account--loading"><ArrowsClockwise className="spin" size={22} /><div><strong>{en ? "Checking optional wallet sync…" : "正在检查可选钱包同步…"}</strong><p>{en ? "Guest data remains available during this check." : "检查期间，游客的本机数据照常可用。"}</p></div></section>;
  if (!available || status === "unavailable") return <section className="cloud-account cloud-account--muted"><CloudCheck size={23} /><div><strong>{en ? "Local-first mode" : "本机优先模式"}</strong><p>{en ? "Cloud accounts are not configured on this deployment. Export and import remain available." : "当前部署尚未配置钱包同步；导入、导出同步文件仍可正常使用。"}</p></div></section>;

  if (account) {
    const syncCopy = status === "syncing" ? (en ? "Syncing…" : "正在同步…") : status === "conflict" ? (en ? "A newer cloud version was found" : "发现更新的云端版本") : status === "error" ? (en ? "Sync needs attention" : "同步需要处理") : (en ? "Synced" : "已同步");
    return <section className="cloud-account" data-status={status}>
      <div className="cloud-account__identity"><span><Wallet size={25} weight="duotone" /></span><div><small>{account.isAdmin ? (en ? "Administrator wallet" : "管理员钱包") : (en ? "Wallet sync account" : "钱包同步账号")}</small><strong title={account.walletAddress}>{shortAddress(account.walletAddress)}</strong><p>{syncCopy} · {en ? "revision" : "版本"} {account.revision} · {new Date(account.updatedAt).toLocaleString(en ? "en-US" : "zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div></div>
      {status === "conflict" ? <div className="cloud-account__conflict"><WarningCircle size={19} /><p>{en ? "This device and the cloud changed independently. Merge keeps unique watchlists, alerts and records; choosing one side replaces the other." : "本机与云端曾分别修改。合并会保留两边不重复的自选、提醒和记录；选择单边则会替换另一边。"}</p></div> : null}
      {status === "error" ? <div className="cloud-account__error"><WarningCircle size={17} />{ERROR_COPY[error]?.[en ? 1 : 0] ?? (en ? "Cloud sync could not complete. Local data is unchanged." : "云同步未完成，本机数据没有丢失。")}</div> : null}
      <div className="cloud-account__actions">
        {account.isAdmin ? <Link className="button button--primary" href="/admin"><CrownSimple size={17} />{en ? "Admin" : "管理后台"}</Link> : null}
        <button className="button button--secondary" disabled={status === "syncing"} onClick={() => void pushLocal()} type="button"><CloudArrowUp size={17} />{en ? "Use this device" : "以本机为准"}</button>
        <button className="button button--secondary" onClick={pullCloud} type="button"><CloudArrowDown size={17} />{en ? "Use cloud copy" : "使用云端版本"}</button>
        {status === "conflict" ? <button className="button button--primary" onClick={() => void mergeCloud()} type="button"><ArrowsClockwise size={17} />{en ? "Merge both" : "合并两边"}</button> : null}
        <button className="cloud-account__logout" onClick={() => void logout()} type="button"><SignOut size={16} />{en ? "Sign out" : "退出登录"}</button>
      </div>
    </section>;
  }

  return <section className="cloud-account cloud-account--guest cloud-account--wallet">
    <div className="cloud-account__intro"><span><Wallet size={26} weight="duotone" /></span><div><small>{en ? "Optional wallet sign-in" : "可选钱包登录"}</small><strong>{en ? "Sign once to sync across devices" : "签名一次，跨设备同步自选与提醒"}</strong><p>{en ? "This is identity verification only: no transaction, token approval, balance reading or asset access. Guests can continue without signing in." : "只验证身份：不发交易、不做代币授权、不读取余额、不接触资产。游客不登录也能继续完整使用。"}</p></div></div>
    <div className="cloud-account__wallet-action"><button className="button button--primary" disabled={status === "syncing"} onClick={() => void connectWallet()} type="button"><Wallet size={18} />{status === "syncing" ? (en ? "Waiting for signature…" : "等待钱包签名…") : (en ? "Connect wallet & sign" : "连接钱包并签名")}</button><span><CheckCircle size={15} />{en ? "SIWE · one-time nonce · 10 min expiry" : "SIWE · 一次性随机码 · 10 分钟失效"}</span></div>
    {status === "error" && error ? <div className="cloud-account__error"><WarningCircle size={17} />{ERROR_COPY[error]?.[en ? 1 : 0] ?? (en ? "Could not complete wallet sign-in." : "暂时无法完成钱包登录。")}</div> : null}
  </section>;
}
