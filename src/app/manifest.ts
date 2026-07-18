import type { MetadataRoute } from "next";

// Dynamic으로 전환하여 Vercel 정적 캐시 방지
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "연세교육공학회 - 연세대학교 교육대학원 교육공학전공",
    short_name: "연세EdTech",
    description:
      "연세대학교 교육대학원 교육공학전공 학술 커뮤니티 — 교육의 미래를 함께 설계합니다",
    start_url: "/",
    display: "standalone",
    background_color: "#003378",
    theme_color: "#003378",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
