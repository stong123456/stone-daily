import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Stone Daily", short_name: "Stone Daily", description: "普通人也能看懂的 AI 币圈与币股行情站", start_url: "/", display: "standalone", background_color: "#f5f3ee", theme_color: "#315c7b", icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }, { src: "/apple-icon.png", sizes: "180x180", type: "image/png" }] };
}
