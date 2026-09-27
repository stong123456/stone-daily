"use client";

import { MarketWeatherCard } from "@/components/MarketWeatherCard";
import { useAppState } from "@/components/AppStateProvider";

export default function WeatherPage() {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <>
      <header className="page-header"><span>Daily market weather</span><h1>{en ? "Today's Market Weather" : "今日市场天气"}</h1><p>{en ? "Switch between the cross-venue market and a dedicated Binance view built from official Spot and Web3 Ondo public feeds, with separate crypto and tokenized-stock gainers and decliners." : "可在跨所全市场与 Binance 单所天气之间手动切换；Binance 视图直接读取官方 Spot 与 Web3 Ondo 公开源，并分别展示加密货币和币股涨跌榜。"}</p></header>
      <MarketWeatherCard />
    </>
  );
}
