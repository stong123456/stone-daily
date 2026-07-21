import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { AppStateProvider } from "@/components/AppStateProvider";

export const metadata: Metadata = {
  title: "Stone Daily · 普通人也能看懂的 AI 行情站",
  description: "看币股、看币圈、看热点，也看自己有没有上头。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
