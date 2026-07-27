"use client";

import {
  Bomb,
  BookOpenText,
  Broadcast,
  ChartLineUp,
  CloudSun,
  FirstAid,
  CalendarCheck,
  CalendarDots,
  List,
  Newspaper,
  Timer,
  X,
  XLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LiveClock } from "@/components/LiveClock";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAppState } from "@/components/AppStateProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems = [
  { href: "/markets", zh: "实时行情", en: "Markets", Icon: ChartLineUp },
  { href: "/hotspots", zh: "每日热点", en: "Daily Pulse", Icon: Newspaper },
  { href: "/live", zh: "7×24", en: "7×24", Icon: Broadcast },
  { href: "/calendar", zh: "财经日历", en: "Calendar", Icon: CalendarCheck },
  { href: "/today", zh: "历史上的今天", en: "On This Day", Icon: CalendarDots },
  { href: "/weather", zh: "市场天气", en: "Market Weather", Icon: CloudSun },
  { href: "/detox", zh: "热点拆弹器", en: "Hype Detox", Icon: Bomb },
  { href: "/regret", zh: "后悔药按钮", en: "Pause Button", Icon: FirstAid },
  { href: "/history", zh: "我的记录", en: "My Records", Icon: Timer },
  { href: "/docs", zh: "产品文档", en: "Product Guide", Icon: BookOpenText },
];

export function Navbar() {
  const pathname = usePathname();
  const { language } = useAppState();
  const isEnglish = language === "en";
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="top-utility-shell">
        <div className="top-utility-bar">
          <LiveClock />
          <a aria-label={isEnglish ? "Visit Stone @Stone141319 on X" : "在 X 上访问石头 @Stone141319"} className="creator-link creator-link--header" href="https://x.com/Stone141319" rel="noreferrer" target="_blank">
            <XLogo aria-hidden size={14} weight="fill" />
            <span>{isEnglish ? "X: Stone" : "X：石头"}</span>
            <small>@Stone141319</small>
          </a>
        </div>
      </div>
      <header className="navbar">
        <Link aria-label={isEnglish ? "Stone Daily home" : "Stone Daily 首页"} className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand__mark"><Image alt="" aria-hidden height={48} priority src="/assets/stone-daily-mark.png" width={48} /></span>
          <span className="brand__wordmark"><span>Stone</span> <span>Daily</span></span>
        </Link>
        <nav aria-label={isEnglish ? "Main navigation" : "主导航"} className="navbar__links">
          {navItems.map(({ href, zh, en }) => (
            <Link className="nav-link" data-active={pathname === href} href={href} key={href}>{isEnglish ? en : zh}</Link>
          ))}
        </nav>
        <div className="navbar__actions">
          <LanguageSwitcher compact />
          <ThemeSwitcher compact />
          <button
            aria-expanded={open}
            aria-label={open ? (isEnglish ? "Close menu" : "关闭菜单") : (isEnglish ? "Open menu" : "打开菜单")}
            className="icon-button mobile-menu-button"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </header>

      <aside className="sidebar-nav" aria-label={isEnglish ? "Side navigation" : "侧边导航"}>
        <Link aria-label={isEnglish ? "Stone Daily home" : "Stone Daily 首页"} className="brand" href="/">
          <span className="brand__mark"><Image alt="" aria-hidden height={48} src="/assets/stone-daily-mark.png" width={48} /></span>
          <span className="brand__wordmark"><span>Stone</span> <span>Daily</span></span>
        </Link>
        <nav className="sidebar-nav__links">
          {navItems.map(({ href, zh, en, Icon }) => (
            <Link className="sidebar-link" data-active={pathname === href} href={href} key={href}>
              <Icon aria-hidden size={20} />
              <span>{isEnglish ? en : zh}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-nav__bottom">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <div className="sidebar-note">
            <FirstAid aria-hidden size={22} weight="duotone" />
            <strong>{isEnglish ? "Clarity is your best protection" : "理性，是最好的护身符"}</strong>
            <span>{isEnglish ? "Markets move. Take care of your state of mind first." : "市场有涨跌，先照顾好自己的情绪。"}</span>
          </div>
        </div>
      </aside>

      <div className="mobile-drawer" data-open={open}>
        <nav aria-label={isEnglish ? "Mobile navigation" : "移动端导航"}>
          {navItems.map(({ href, zh, en, Icon }) => (
            <Link className="sidebar-link" data-active={pathname === href} href={href} key={href} onClick={() => setOpen(false)}>
              <Icon aria-hidden size={20} />
              <span>{isEnglish ? en : zh}</span>
            </Link>
          ))}
        </nav>
        <div className="mobile-drawer__settings"><LanguageSwitcher /><ThemeSwitcher /></div>
      </div>
    </>
  );
}
