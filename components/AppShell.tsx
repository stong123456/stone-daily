"use client";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAppState } from "@/components/AppStateProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useAppState();
  return (
    <div className="app-shell" data-mode={mode}>
      <Navbar />
      <div className="app-shell__content">
        <main className="page-canvas">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
