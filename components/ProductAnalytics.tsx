"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackProductEvent } from "@/services/analytics";

export function ProductAnalytics() {
  const pathname = usePathname();
  useEffect(() => { trackProductEvent("page_view"); }, [pathname]);
  return null;
}
