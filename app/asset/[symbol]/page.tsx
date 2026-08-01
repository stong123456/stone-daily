import type { Metadata } from "next";
import { AssetDetailPortal } from "@/components/AssetDetailPortal";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = decodeURIComponent(symbol).toUpperCase();
  return { title: `${normalized} 行情、跨所比较与证据链 AI · Stone Daily`, description: `查看 ${normalized} 的跨交易所报价、产品身份、衍生品指标、相关事件与证据链 AI 解读。` };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <AssetDetailPortal symbol={decodeURIComponent(symbol)} />;
}
