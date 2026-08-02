"use client";

import { Bell, Bomb, BookOpenText, Broadcast, CalendarCheck, CalendarDots, CaretDown, ChartLineUp, CloudSun, FirstAid, List, Newspaper, ShieldCheck, Timer, X, XLogo } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppLanguage, useAppState } from "@/components/AppStateProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LiveClock } from "@/components/LiveClock";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TopWalletButton } from "@/components/TopWalletButton";

const primaryItems = [
  { href: "/markets", zh: "行情", en: "Markets", Icon: ChartLineUp },
  { href: "/watchlist", zh: "自选", en: "Watchlist", Icon: Bell },
  { href: "/hotspots", zh: "每日热点", en: "Daily pulse", Icon: Newspaper },
  { href: "/live", zh: "7×24", en: "7×24", Icon: Broadcast },
  { href: "/calendar", zh: "财经日历", en: "Calendar", Icon: CalendarCheck },
  { href: "/weather", zh: "市场天气", en: "Weather", Icon: CloudSun },
  { href: "/today", zh: "历史上的今天", en: "On this day", Icon: CalendarDots },
  { href: "/detox", zh: "热点拆弹", en: "Headline detox", Icon: Bomb },
  { href: "/regret", zh: "帮我冷静", en: "Pause", Icon: FirstAid },
];

const moreGroups = [
  { zh: "个人空间", en: "Personal", items: [
    { href: "/history", zh: "我的记录", en: "My records", Icon: Timer },
  ] },
  { zh: "关于产品", en: "About", items: [
    { href: "/trust", zh: "数据可信度", en: "Data trust", Icon: ShieldCheck },
    { href: "/docs", zh: "产品文档", en: "Product guide", Icon: BookOpenText },
  ] },
];

function label(language: AppLanguage, zh: string, en: string) { return language === "en" ? en : zh; }

export function Navbar() {
  const pathname = usePathname();
  const { language } = useAppState();
  const isEnglish = language === "en";
  const [open, setOpen] = useState(false);
  const moreActive = moreGroups.some((group) => group.items.some((item) => item.href === pathname));

  const brand = <><span className="brand__mark"><Image alt="" aria-hidden height={48} priority src="/assets/stone-daily-mark.png" width={48} /></span><span className="brand__wordmark"><span>Stone</span> <span>Daily</span></span></>;

  return <>
    <div className="top-utility-shell"><div className="top-utility-bar"><LiveClock /><div className="top-utility-actions"><a aria-label={isEnglish ? "Visit Stone @Stone141319 on X" : "在 X 上访问石头 @Stone141319"} className="creator-link creator-link--header" href="https://x.com/Stone141319" rel="noreferrer" target="_blank"><XLogo aria-hidden size={14} weight="fill" /><span>{isEnglish ? "X: Stone" : "X：石头"}</span><small>@Stone141319</small></a><TopWalletButton /></div></div></div>
    <header className="navbar"><Link aria-label={isEnglish ? "Stone Daily home" : "Stone Daily 首页"} className="brand" href="/" onClick={() => setOpen(false)}>{brand}</Link><nav aria-label={isEnglish ? "Main navigation" : "主导航"} className="navbar__links">{primaryItems.map(({ href, zh, en }) => <Link className="nav-link" data-active={pathname === href} href={href} key={href}>{label(language, zh, en)}</Link>)}<details className="nav-more"><summary className="nav-link" data-active={moreActive}>{isEnglish ? "More" : "更多"}<CaretDown size={14} /></summary><div className="nav-more__menu">{moreGroups.map((group) => <section key={group.zh}><strong>{label(language, group.zh, group.en)}</strong>{group.items.map(({ href, zh, en, Icon }) => <Link data-active={pathname === href} href={href} key={href}><Icon size={17} /><span>{label(language, zh, en)}</span></Link>)}</section>)}</div></details></nav><div className="navbar__actions"><LanguageSwitcher compact /><ThemeSwitcher compact /><button aria-expanded={open} aria-label={open ? (isEnglish ? "Close menu" : "关闭菜单") : (isEnglish ? "Open menu" : "打开菜单")} className="icon-button mobile-menu-button" onClick={() => setOpen((value) => !value)} type="button">{open ? <X size={20} /> : <List size={20} />}</button></div></header>

    <aside className="sidebar-nav" aria-label={isEnglish ? "Side navigation" : "侧边导航"}><Link aria-label={isEnglish ? "Stone Daily home" : "Stone Daily 首页"} className="brand" href="/">{brand}</Link><nav className="sidebar-nav__links">{primaryItems.map(({ href, zh, en, Icon }) => <Link className="sidebar-link" data-active={pathname === href} href={href} key={href}><Icon aria-hidden size={20} /><span>{label(language, zh, en)}</span></Link>)}<span className="sidebar-nav__divider">{isEnglish ? "More" : "更多"}</span>{moreGroups.flatMap((group) => group.items).map(({ href, zh, en, Icon }) => <Link className="sidebar-link" data-active={pathname === href} href={href} key={href}><Icon aria-hidden size={20} /><span>{label(language, zh, en)}</span></Link>)}</nav><div className="sidebar-nav__bottom"><LanguageSwitcher /><ThemeSwitcher /><div className="sidebar-note"><FirstAid aria-hidden size={22} weight="duotone" /><strong>{isEnglish ? "Clarity is your best protection" : "理性，是最好的护身符"}</strong><span>{isEnglish ? "Markets move. Take care of your state of mind first." : "市场有涨跌，先照顾好自己的情绪。"}</span></div></div></aside>

    <div className="mobile-drawer" data-open={open}><nav aria-label={isEnglish ? "Mobile navigation" : "移动端导航"}>{primaryItems.map(({ href, zh, en, Icon }) => <Link className="sidebar-link" data-active={pathname === href} href={href} key={href} onClick={() => setOpen(false)}><Icon aria-hidden size={20} /><span>{label(language, zh, en)}</span></Link>)}{moreGroups.map((group) => <section className="mobile-drawer__group" key={group.zh}><strong>{label(language, group.zh, group.en)}</strong>{group.items.map(({ href, zh, en, Icon }) => <Link className="sidebar-link" data-active={pathname === href} href={href} key={href} onClick={() => setOpen(false)}><Icon aria-hidden size={20} /><span>{label(language, zh, en)}</span></Link>)}</section>)}</nav><div className="mobile-drawer__settings"><LanguageSwitcher /><ThemeSwitcher /></div></div>
  </>;
}
