import { XLogo } from "@phosphor-icons/react/dist/ssr";
import { Disclaimer } from "@/components/Disclaimer";

export function Footer() {
  return (
    <footer className="footer">
      <Disclaimer compact />
      <div className="footer__meta">
        <span>© 2026 Stone Daily</span>
        <div className="footer__credit">
          <span>行情来源与延迟状态以页面标识为准 · AI market literacy companion</span>
          <a aria-label="在 X 上访问石头 @Stone141319" className="creator-link" href="https://x.com/Stone141319" rel="noreferrer" target="_blank">
            <XLogo aria-hidden size={13} weight="fill" />
            <span>石头</span>
            <small>@Stone141319</small>
          </a>
        </div>
      </div>
    </footer>
  );
}
