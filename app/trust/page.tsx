import type { Metadata } from "next";
import { TrustCenter } from "@/components/TrustCenter";

export const metadata: Metadata = { title: "数据可信度中心 · Stone Daily", description: "公开 Stone Daily 行情、币股、新闻和财经日历的数据源健康、时效及回退状态。" };
export default function TrustPage() { return <TrustCenter />; }
