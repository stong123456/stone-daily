import type { Metadata } from "next";
import { WatchlistCenter } from "@/components/WatchlistCenter";

export const metadata: Metadata = { title: "自选与提醒中心 · Stone Daily", description: "在本地管理自选资产、价格与市场提醒，并通过同步文件跨设备延续。" };

export default function WatchlistPage() { return <WatchlistCenter />; }
