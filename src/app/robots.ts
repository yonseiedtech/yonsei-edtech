import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/console",
          "/staff-admin",
          "/academic-admin",
          "/mypage",
          "/dashboard",
          "/board/write",
          "/login",
          "/signup",
          "/forgot-password",
          "/change-password",
        ],
      },
    ],
    sitemap: "https://yonsei-edtech.vercel.app/sitemap.xml",
  };
}
