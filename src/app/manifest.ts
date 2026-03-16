import type { MetadataRoute } from "next";

// Dynamic으로 전환하여 Vercel 정적 캐시 방지
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "연세교육공학회",
    short_name: "연세EdTech",
    description:
      "교육의 미래를 함께 설계하는 연세대학교 교육공학 학술 커뮤니티",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003876",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
