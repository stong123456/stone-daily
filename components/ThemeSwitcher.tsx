"use client";

import { Check } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";
import type { UIMode } from "@/types/market";

const modes: { value: UIMode; zh: string; en: string; zhDescription: string; enDescription: string }[] = [
  { value: "brief", zh: "简报", en: "Brief", zhDescription: "晨间市场简报", enDescription: "Morning market brief" },
  { value: "lens", zh: "透镜", en: "Lens", zhDescription: "信号分析视图", enDescription: "Signal analysis view" },
  { value: "calm", zh: "冷静", en: "Calm", zhDescription: "情绪打卡视图", enDescription: "Calm decision view" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, mode, setMode } = useAppState();
  const isEnglish = language === "en";

  return (
    <div className={`theme-switcher ${compact ? "theme-switcher--compact" : ""}`} aria-label={isEnglish ? "Interface mode" : "界面模式"}>
      {modes.map((item) => (
        <button
          className="theme-switcher__button"
          data-active={mode === item.value}
          key={item.value}
          onClick={() => setMode(item.value)}
          title={isEnglish ? item.enDescription : item.zhDescription}
          type="button"
        >
          {mode === item.value ? <Check aria-hidden size={13} weight="bold" /> : null}
          <span>{isEnglish ? item.en : item.zh}</span>
        </button>
      ))}
    </div>
  );
}
