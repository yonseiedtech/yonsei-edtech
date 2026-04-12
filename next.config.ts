import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },

  // 서버 외부 패키지 (번들에서 제외)
  serverExternalPackages: ["firebase-admin"],

  // 실험적 최적화
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },

  // 구 seminar-admin 경로 → 학술활동 관리 허브로 이관
  async redirects() {
    return [
      {
        source: "/seminar-admin",
        destination: "/academic-admin/seminars",
        permanent: true,
      },
      {
        source: "/seminar-admin/:path*",
        destination: "/academic-admin/seminars/:path*",
        permanent: true,
      },
      // board-community-v2: press → promotion 통합
      { source: "/board/press", destination: "/board/promotion", permanent: true },
      { source: "/board/press/:path*", destination: "/board/promotion/:path*", permanent: true },
      // board-community-v2: /polls 제거 (게시물 첨부 투표로 전환)
      { source: "/polls", destination: "/board", permanent: true },
      { source: "/polls/:path*", destination: "/board", permanent: true },
    ];
  },
};

export default nextConfig;
