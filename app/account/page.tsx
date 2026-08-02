import type { Metadata } from "next";
import { UserDashboard } from "@/components/UserDashboard";

export const metadata: Metadata = {
  title: "我的 Stone Daily · 个人中心",
  description: "集中查看自选、提醒、冷静记录与可选钱包同步状态。",
};

export default function AccountPage() { return <UserDashboard />; }
