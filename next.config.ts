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

  // Sprint 69 보안: 기본 보안 헤더
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
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

      // /admin/* → /console/* (307 temporary so future changes are easy)
      { source: "/admin", destination: "/console", permanent: false },
      { source: "/admin/members", destination: "/console/members", permanent: false },
      { source: "/admin/inquiries", destination: "/console/inquiries", permanent: false },
      { source: "/admin/posts", destination: "/console/posts", permanent: false },
      { source: "/admin/newsletter", destination: "/console/newsletter", permanent: false },
      { source: "/admin/certificates", destination: "/console/certificates", permanent: false },
      { source: "/admin/fees", destination: "/console/fees", permanent: false },
      { source: "/admin/insights", destination: "/console/insights", permanent: false },
      { source: "/admin/audit-log", destination: "/console/audit-log", permanent: false },
      { source: "/admin/chatbot", destination: "/console/ai", permanent: false },
      { source: "/admin/agents", destination: "/console/ai", permanent: false },
      { source: "/admin/settings", destination: "/console/settings", permanent: false },
      { source: "/admin/semester-report", destination: "/console/insights/semester", permanent: false },
      { source: "/admin/transition", destination: "/console/transition", permanent: false },
      { source: "/admin/todos", destination: "/console/todos", permanent: false },
      { source: "/admin/activity-dashboard", destination: "/console/academic", permanent: false },
      { source: "/admin/seminars", destination: "/console/academic/manage", permanent: false },
      { source: "/admin/analytics", destination: "/console/insights", permanent: false },

      // /mypage/card → /mypage?tab=card (탭 통합)
      { source: "/mypage/card", destination: "/mypage?tab=card", permanent: false },
      { source: "/mypage/card/exchanges", destination: "/mypage?tab=card", permanent: false },

      // /staff-admin/* → /console/*
      { source: "/staff-admin", destination: "/console", permanent: false },
      { source: "/staff-admin/todos", destination: "/console/todos", permanent: false },
      { source: "/staff-admin/activity-dashboard", destination: "/console/academic", permanent: false },
      { source: "/staff-admin/handover-overview", destination: "/console/handover/overview", permanent: false },
      { source: "/staff-admin/transition", destination: "/console/transition", permanent: false },
    ];
  },
};

export default nextConfig;
