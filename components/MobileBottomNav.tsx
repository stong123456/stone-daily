"use client";

import { Bomb, ChartLineUp, DotsThree, Newspaper, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/components/AppStateProvider";

const items = [
  { href: "/markets", zh: "行情", en: "Markets", Icon: ChartLineUp },
  { href: "/hotspots", zh: "资讯", en: "Pulse", Icon: Newspaper },
  { href: "/watchlist", zh: "自选", en: "Watch", Icon: Star },
  { href: "/detox", zh: "工具", en: "Tools", Icon: Bomb },
  { href: "/docs", zh: "更多", en: "More", Icon: DotsThree },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { language } = useAppState();
  return <nav aria-label={language === "en" ? "Mobile quick navigation" : "移动端快捷导航"} className="mobile-bottom-nav">{items.map(({ href, zh, en, Icon }) => <Link data-active={pathname === href || (href === "/docs" && ["/live", "/calendar", "/today", "/weather", "/history", "/trust"].includes(pathname))} href={href} key={href}><Icon size={20} weight={pathname === href ? "fill" : "regular"} /><span>{language === "en" ? en : zh}</span></Link>)}</nav>;
}
