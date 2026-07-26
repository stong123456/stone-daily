import type { Metadata } from "next";
import { ProductDocumentation } from "@/components/ProductDocumentation";

export const metadata: Metadata = {
  title: "产品文档 · Stone Daily",
  description: "Stone Daily 完整产品说明：功能、数据源、产品分类、状态标识、AI 解读边界、隐私与常见问题。",
};

export default function ProductDocsPage() {
  return <ProductDocumentation />;
}
