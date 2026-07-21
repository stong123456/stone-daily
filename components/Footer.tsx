import { Disclaimer } from "@/components/Disclaimer";

export function Footer() {
  return (
    <footer className="footer">
      <Disclaimer compact />
      <div className="footer__meta">
        <span>© 2026 Stone Daily</span>
        <span>行情来源与延迟状态以页面标识为准 · AI market literacy companion</span>
      </div>
    </footer>
  );
}
