"use client";

import type { EditorialFeedItem } from "@/types/market";

export function NewsTickerTape({ items }: { items: EditorialFeedItem[] }) {
  const latest = items.slice(0, 12);
  if (!latest.length) {
    return (
      <section aria-label="最新7×24快讯加载状态" className="ticker-tape ticker-tape--news">
        <strong className="ticker-tape__label">最新 7×24</strong>
        <div className="ticker-tape__viewport"><div className="ticker-tape__track ticker-tape__track--news"><span className="ticker-tape__news-item"><i /><span>正在获取今日实时快讯…</span></span></div></div>
      </section>
    );
  }
  return (
    <section aria-label="最新7×24快讯流动播报" className="ticker-tape ticker-tape--news">
      <strong className="ticker-tape__label">最新 7×24</strong>
      <div className="ticker-tape__viewport">
        <div className="ticker-tape__track ticker-tape__track--news">
          {[latest, latest].flatMap((group, loopIndex) => group.map((item, index) => (
            <a aria-hidden={loopIndex === 1} className="ticker-tape__news-item" href={item.url} key={`${loopIndex}-${item.id}-${index}`} rel="noreferrer" tabIndex={loopIndex === 1 ? -1 : 0} target="_blank"><i /> <b>{item.source}</b><span>{item.title}</span></a>
          )))}
        </div>
      </div>
    </section>
  );
}
