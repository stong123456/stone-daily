"use client";

import { XLogo } from "@phosphor-icons/react";
import Link from "next/link";
import { useAppState } from "@/components/AppStateProvider";
import { Disclaimer } from "@/components/Disclaimer";

export function Footer() {
  const { language } = useAppState();
  const isEnglish = language === "en";
  return (
    <footer className="footer">
      <Disclaimer compact />
      <div className="footer__meta">
        <span>© 2026 Stone Daily</span>
        <div className="footer__credit">
          <span>{isEnglish ? "Refer to each page for source and delay status · AI market literacy companion" : "行情来源与延迟状态以页面标识为准 · AI market literacy companion"}</span>
          <Link className="footer__docs-link" href="/docs">{isEnglish ? "Product guide" : "产品文档"}</Link>
          <Link className="footer__docs-link" href="/trust">{isEnglish ? "Data trust" : "数据可信度"}</Link>
          <a aria-label={isEnglish ? "Visit Stone @Stone141319 on X" : "在 X 上访问石头 @Stone141319"} className="creator-link" href="https://x.com/Stone141319" rel="noreferrer" target="_blank">
            <XLogo aria-hidden size={13} weight="fill" />
            <span>{isEnglish ? "Stone" : "石头"}</span>
            <small>@Stone141319</small>
          </a>
        </div>
      </div>
    </footer>
  );
}
