import { MarketWeatherCard } from "@/components/MarketWeatherCard";

export default function WeatherPage() {
  return (
    <>
      <header className="page-header"><span>Daily market weather</span><h1>今日市场天气</h1><p>每分钟根据币圈、币股和交易所源状态重新计算，用天气预报的方式理解涨跌广度、波动与情绪。</p></header>
      <MarketWeatherCard />
    </>
  );
}
