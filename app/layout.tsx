import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { AppStateProvider } from "@/components/AppStateProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { AccountSyncProvider } from "@/components/AccountSyncProvider";

export const metadata: Metadata = {
  title: "Stone Daily · 普通人也能看懂的 AI 行情站",
  description: "看币股、看币圈、看热点，也看自己有没有上头。",
  applicationName: "Stone Daily",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Stone Daily",
    description: "普通人也能看懂的 AI 美股与币圈行情站",
    siteName: "Stone Daily",
  },
};

export const viewport: Viewport = { themeColor: "#315c7b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppStateProvider>
          <AccountSyncProvider>
            <AppShell>{children}</AppShell>
            <ServiceWorkerRegistration />
          </AccountSyncProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
