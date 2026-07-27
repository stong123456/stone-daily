"use client";

import { Gauge, ThermometerSimple } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";

function getLabel(value: number, isEnglish: boolean) {
  if (value < 30) return isEnglish ? "Calm" : "冷静";
  if (value < 55) return isEnglish ? "Normal" : "正常";
  if (value < 75) return isEnglish ? "Warm" : "偏热";
  return isEnglish ? "Overheated" : "过热";
}

export function MarketTemperatureCard({ label, value, detail, kind = "temperature" }: { label: string; value: number; detail: string; kind?: "temperature" | "fomo" }) {
  const { language } = useAppState();
  const Icon = kind === "fomo" ? Gauge : ThermometerSimple;
  return (
    <section className="temperature-card">
      <div className="temperature-card__top">
        <span className="temperature-card__icon"><Icon aria-hidden size={21} weight="duotone" /></span>
        <div>
          <p>{label}</p>
          <strong>{getLabel(value, language === "en")}</strong>
        </div>
        <span className="temperature-card__value">{value}<small>/100</small></span>
      </div>
      <div className="meter" aria-label={`${label} ${value}/100`}>
        <span style={{ width: `${value}%` }} />
      </div>
      <p className="temperature-card__detail">{detail}</p>
    </section>
  );
}
