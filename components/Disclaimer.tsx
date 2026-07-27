"use client";

import { Info } from "@phosphor-icons/react";
import { useAppState } from "@/components/AppStateProvider";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { language } = useAppState();
  return (
    <div className={`disclaimer ${compact ? "disclaimer--compact" : ""}`} role="note">
      <Info aria-hidden size={17} />
      <p>
        {language === "en"
          ? "Stone Daily does not provide investment or trading advice and promises no returns. Content is for understanding information, identifying risk and slowing impulsive decisions. You remain responsible for every decision."
          : "Stone Daily 不提供投资建议，不构成交易建议，也不承诺任何收益。所有内容仅用于信息理解、风险识别和情绪冷静；市场有风险，决策需自行承担。"}
      </p>
    </div>
  );
}
