import type { MetadataRoute } from "next";

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
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
