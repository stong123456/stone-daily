"use client";

import { CrownSimple, Wallet } from "@phosphor-icons/react";
import Link from "next/link";
import { useAccountSync } from "@/components/AccountSyncProvider";
import { useAppState } from "@/components/AppStateProvider";

function shortAddress(address: string) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }

export function TopWalletButton() {
  const { language } = useAppState();
  const { available, status, account, error, connectWallet } = useAccountSync();
  const en = language === "en";

  if (account) {
    const destination = account.isAdmin ? "/admin" : "/watchlist";
    return <Link className="top-wallet-button" data-status="connected" href={destination} title={account.walletAddress}>
      {account.isAdmin ? <CrownSimple aria-hidden size={14} weight="fill" /> : <Wallet aria-hidden size={14} weight="fill" />}
      <span>{shortAddress(account.walletAddress)}</span>
    </Link>;
  }

  const loading = status === "loading";
  const syncing = status === "syncing";
  const disabled = loading || syncing || !available;
  const copy = !available
    ? (en ? "Wallet unavailable" : "钱包未启用")
    : syncing
      ? (en ? "Signing…" : "等待签名…")
      : loading
        ? (en ? "Checking…" : "检查中…")
        : (en ? "Connect wallet" : "连接钱包");

  return <button
    className="top-wallet-button"
    data-status={status}
    disabled={disabled}
    onClick={() => void connectWallet()}
    title={error ? (en ? "Wallet sign-in was not completed. Try again." : "钱包登录未完成，可点击重试。") : copy}
    type="button"
  ><Wallet aria-hidden size={14} weight="fill" /><span>{copy}</span></button>;
}
