"use client";

import { Footer } from "@/components/Footer";
import { GlobalTickerHeader } from "@/components/GlobalTickerHeader";
import { Navbar } from "@/components/Navbar";
import { useAppState } from "@/components/AppStateProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useAppState();
  return (
    <div className="app-shell" data-mode={mode}>
      <div className="home-top-tickers-slot"><GlobalTickerHeader /></div>
      <Navbar />
      <div className="app-shell__content">
        <main className="page-canvas">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
