import { ArrowSquareOut, CalendarDots, ClockCounterClockwise, Lightbulb, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { historyToday } from "@/data/editorial";

export function HistoryToday() {
  return (
    <>
      <header className="page-header page-header--inline editorial-header">
        <div><span>Market memory</span><h1>历史上的今天</h1><p>价格每天都在变，但市场反复面对的，常常还是制度、利率、流动性和人性。</p></div>
        <div className="today-date-card"><CalendarDots size={25} weight="duotone" /><div><strong>7 月 21 日</strong><span>3 个值得记住的金融节点</span></div></div>
      </header>

      <section className="history-lesson-hero">
        <ClockCounterClockwise size={28} weight="duotone" />
        <div><span>今日共同线索</span><h2>规则变化，往往比一天的涨跌影响更久</h2><p>从汇率制度、危机后监管到央行退出负利率，市场真正的转折常常来自“游戏规则”改变。</p></div>
      </section>

      <section className="market-history-timeline">
        {historyToday.map((event) => (
          <article className="market-history-event" key={event.id}>
            <div className="market-history-event__year"><strong>{event.year}</strong><span>{event.category}</span></div>
            <div className="market-history-event__content">
              <h2>{event.title}</h2>
              <p>{event.summary}</p>
              <div className="history-event-grid"><div><strong>为什么重要</strong><span>{event.whyItMatters}</span></div><div><Lightbulb size={18} /><strong>给今天的提醒</strong><span>{event.lesson}</span></div></div>
              <a href={event.sourceUrl} rel="noreferrer" target="_blank">查看原始来源 · {event.sourceName}<ArrowSquareOut size={14} /></a>
            </div>
          </article>
        ))}
      </section>

      <section className="history-method"><ShieldCheck size={23} weight="duotone" /><div><strong>内容标准</strong><p>优先引用央行、监管机构和可追溯档案；历史事件只解释背景与影响，不把过去机械套用到今天。</p></div></section>
    </>
  );
}

