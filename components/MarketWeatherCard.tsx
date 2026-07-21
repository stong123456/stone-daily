import { Binoculars, CloudSun, ShieldCheck, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { marketSnapshot } from "@/data/market";

export function MarketWeatherCard() {
  return (
    <section className="weather-report">
      <div className="weather-report__hero">
        <img alt="多云偏暖的市场天气插画" src="/assets/market-weather.png" />
        <div><span>今日天气</span><h2>{marketSnapshot.weather}</h2><p>{marketSnapshot.headline}</p></div>
        <div className="weather-score"><strong>58</strong><span>/100</span><small>中性偏乐观</small></div>
      </div>
      <div className="weather-report__grid">
        <article><Sparkle size={23} /><div><h3>今天最重要的三件事</h3><ol><li>AI 科技股情绪仍然较热。</li><li>BTC 波动不大，山寨币开始活跃。</li><li>市场仍对利率预期保持敏感。</li></ol></div></article>
        <article><Binoculars size={23} /><div><h3>最容易上头的热点</h3><p>AI 概念股和小市值山寨币的快速拉升。热度是真实的，但持续性还需要观察。</p></div></article>
        <article><ShieldCheck size={23} /><div><h3>今天先别碰什么</h3><p>说不清收益来源的高年化产品、群里催你马上行动的项目、看不懂合约的链接。</p></div></article>
      </div>
      <div className="weather-report__summary"><CloudSun size={22} /><p>今天不是不能看市场，但不适合因为别人晒收益就追进去。</p></div>
    </section>
  );
}
