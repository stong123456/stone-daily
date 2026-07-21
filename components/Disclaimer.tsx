import { Info } from "@phosphor-icons/react/dist/ssr";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`disclaimer ${compact ? "disclaimer--compact" : ""}`} role="note">
      <Info aria-hidden size={17} />
      <p>
        Stone Daily 不提供投资建议，不构成交易建议，也不承诺任何收益。所有内容仅用于信息理解、风险识别和情绪冷静；市场有风险，决策需自行承担。
      </p>
    </div>
  );
}
