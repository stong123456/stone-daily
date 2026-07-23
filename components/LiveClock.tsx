"use client";

import { Clock } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time className="live-clock" dateTime={now?.toISOString()}>
      <Clock aria-hidden size={14} weight="duotone" />
      <span>{now ? dateFormatter.format(now) : "北京时间"}</span>
      <strong>{now ? timeFormatter.format(now) : "--:--:--"}</strong>
    </time>
  );
}
