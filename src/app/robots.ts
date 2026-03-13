import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/mypage", "/board/write"],
      },
    ],
    sitemap: "https://yonsei-edtech.vercel.app/sitemap.xml",
  };
}
