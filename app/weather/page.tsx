import { MarketWeatherCard } from "@/components/MarketWeatherCard";

export default function WeatherPage() {
  return (
    <>
      <header className="page-header"><span>Daily market weather</span><h1>今日市场天气</h1><p>用天气预报的方式，看懂今天的币股和币圈状态。</p></header>
      <MarketWeatherCard />
    </>
  );
}
