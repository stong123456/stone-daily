import Link from "next/link";
import { WifiSlash } from "@phosphor-icons/react/dist/ssr";

export default function OfflinePage() { return <section className="offline-page"><WifiSlash size={38} /><h1>当前网络不可用</h1><p>你仍可查看已经缓存的页面结构和本机自选；实时行情、新闻与提醒必须联网后才能更新。</p><Link className="button button--primary" href="/">返回首页</Link></section>; }
