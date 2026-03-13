import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://yonsei-edtech.vercel.app";
const SITE_NAME = "연세교육공학회";
const SITE_DESCRIPTION =
  "연세대학교 교육공학 전공 학술 커뮤니티 연세교육공학회. 에듀테크, 교수설계, 학습과학 분야의 세미나, 프로젝트, 스터디를 통해 교육의 미래를 함께 설계합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "연세교육공학회 - 연세대학교 교육공학 전공 학술 커뮤니티",
    template: "%s | 연세교육공학회",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "연세교육공학회",
    "연세대학교 교육공학",
    "연세대학교 교육공학 전공",
    "교육공학 전공",
    "에듀테크",
    "교육공학",
    "연세대학교",
    "EdTech",
    "교육기술",
    "학습과학",
    "교수설계",
    "연세대 교육공학",
    "Yonsei University",
    "Educational Technology",
    "Yonsei EdTech",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "연세교육공학회 - 연세대학교 교육공학 전공 학술 커뮤니티",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "연세교육공학회 - 교육의 미래를 함께 설계합니다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "연세교육공학회 - 연세대학교 교육공학 전공 학술 커뮤니티",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // Google Search Console 등록 후 여기에 추가
    // google: "your-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body
        className={`${pretendard.variable} ${inter.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
