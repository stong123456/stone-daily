"use client";

import { MarketWeatherCard } from "@/components/MarketWeatherCard";
import { useAppState } from "@/components/AppStateProvider";

export default function WeatherPage() {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <>
      <header className="page-header"><span>Daily market weather</span><h1>{en ? "Today's Market Weather" : "今日市场天气"}</h1><p>{en ? "Recomputed every minute from crypto, tokenized-stock and venue health data—using a weather report to explain breadth, volatility and sentiment." : "每分钟根据币圈、币股和交易所源状态重新计算，用天气预报的方式理解涨跌广度、波动与情绪。"}</p></header>
      <MarketWeatherCard />
    </>
  );
}
