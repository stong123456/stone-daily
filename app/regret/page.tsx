import { Suspense } from "react";
import { RegretWorkspace } from "@/components/RegretWorkspace";

export default function RegretPage() {
  return <Suspense fallback={<div className="page-loading">正在准备冷静空间…</div>}><RegretWorkspace /></Suspense>;
}
