import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "管理员后台 · Stone Daily",
  description: "Stone Daily 管理员专用运行状态与产品统计后台。",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() { return <AdminDashboard />; }
