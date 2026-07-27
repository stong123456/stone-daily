"use client";

import { Translate } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useAppState();
  const isEnglish = language === "en";

  return (
    <div className="language-switcher" data-compact={compact} role="group" aria-label={isEnglish ? "Language" : "语言"}>
      <Translate aria-hidden size={compact ? 14 : 16} />
      <button aria-pressed={!isEnglish} onClick={() => setLanguage("zh")} type="button">中</button>
      <span aria-hidden>/</span>
      <button aria-pressed={isEnglish} onClick={() => setLanguage("en")} type="button">EN</button>
    </div>
  );
}
