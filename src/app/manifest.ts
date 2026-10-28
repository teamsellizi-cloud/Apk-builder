import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "devs APK Builder",
    short_name: "APK Builder",
    description:
      "Turn websites, ZIP projects and PWAs into real, signed Android APKs from your phone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1128",
    theme_color: "#2563eb",
    categories: ["developer tools", "productivity", "utilities"],
    icons: [
      { src: "/images/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
