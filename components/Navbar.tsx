"use client";

import {
  Bomb,
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
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems = [
  { href: "/markets", label: "实时行情", Icon: ChartLineUp },
  { href: "/hotspots", label: "每日热点", Icon: Newspaper },
  { href: "/calendar", label: "财经日历", Icon: CalendarCheck },
  { href: "/today", label: "历史上的今天", Icon: CalendarDots },
  { href: "/weather", label: "市场天气", Icon: CloudSun },
  { href: "/detox", label: "热点拆弹器", Icon: Bomb },
  { href: "/regret", label: "后悔药按钮", Icon: FirstAid },
  { href: "/history", label: "我的记录", Icon: Timer },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="top-utility-shell">
        <div className="top-utility-bar">
          <LiveClock />
          <a aria-label="在 X 上访问石头 @Stone141319" className="creator-link creator-link--header" href="https://x.com/Stone141319" rel="noreferrer" target="_blank">
            <XLogo aria-hidden size={14} weight="fill" />
            <span>X：石头</span>
            <small>@Stone141319</small>
          </a>
        </div>
      </div>
      <header className="navbar">
        <Link aria-label="Stone Daily 首页" className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand__mark"><Image alt="" aria-hidden height={48} priority src="/assets/stone-daily-mark.png" width={48} /></span>
          <span className="brand__wordmark"><span>Stone</span> <span>Daily</span></span>
        </Link>
        <nav aria-label="主导航" className="navbar__links">
          {navItems.map(({ href, label }) => (
            <Link className="nav-link" data-active={pathname === href} href={href} key={href}>{label}</Link>
          ))}
        </nav>
        <div className="navbar__actions">
          <ThemeSwitcher compact />
          <button
            aria-expanded={open}
            aria-label={open ? "关闭菜单" : "打开菜单"}
            className="icon-button mobile-menu-button"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </header>

      <aside className="sidebar-nav" aria-label="侧边导航">
        <Link aria-label="Stone Daily 首页" className="brand" href="/">
          <span className="brand__mark"><Image alt="" aria-hidden height={48} src="/assets/stone-daily-mark.png" width={48} /></span>
          <span className="brand__wordmark"><span>Stone</span> <span>Daily</span></span>
        </Link>
        <nav className="sidebar-nav__links">
          {navItems.map(({ href, label, Icon }) => (
            <Link className="sidebar-link" data-active={pathname === href} href={href} key={href}>
              <Icon aria-hidden size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-nav__bottom">
          <ThemeSwitcher />
          <div className="sidebar-note">
            <FirstAid aria-hidden size={22} weight="duotone" />
            <strong>理性，是最好的护身符</strong>
            <span>市场有涨跌，先照顾好自己的情绪。</span>
          </div>
        </div>
      </aside>

      <div className="mobile-drawer" data-open={open}>
        <nav aria-label="移动端导航">
          {navItems.map(({ href, label, Icon }) => (
            <Link className="sidebar-link" data-active={pathname === href} href={href} key={href} onClick={() => setOpen(false)}>
              <Icon aria-hidden size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <ThemeSwitcher />
      </div>
    </>
  );
}
