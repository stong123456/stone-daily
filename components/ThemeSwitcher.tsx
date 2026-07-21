"use client";

import { Check } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";
import type { UIMode } from "@/types/market";

const modes: { value: UIMode; label: string; description: string }[] = [
  { value: "brief", label: "简报", description: "晨间市场简报" },
  { value: "lens", label: "透镜", description: "信号分析视图" },
  { value: "calm", label: "冷静", description: "情绪打卡视图" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useAppState();

  return (
    <div className={`theme-switcher ${compact ? "theme-switcher--compact" : ""}`} aria-label="界面模式">
      {modes.map((item) => (
        <button
          className="theme-switcher__button"
          data-active={mode === item.value}
          key={item.value}
          onClick={() => setMode(item.value)}
          title={item.description}
          type="button"
        >
          {mode === item.value ? <Check aria-hidden size={13} weight="bold" /> : null}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
