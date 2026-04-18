import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Serif_KR, Hahmlet, Gowun_Batang } from "next/font/google";
// Inter font removed — Pretendard only
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";
import ChatWidget from "@/components/chat/ChatWidget";
import AuthProvider from "@/features/auth/AuthProvider";
import ImpersonationBanner from "@/components/layout/ImpersonationBanner";
import ConsentGate from "@/components/auth/ConsentGate";
import UndergradInfoPrompt from "@/components/auth/UndergradInfoPrompt";
import StudyTimerBar from "@/features/research/study-timer/StudyTimerBar";
import StudyEndDialog from "@/features/research/study-timer/StudyEndDialog";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// 감사장/수료증 PDF용 한글 세리프 웹폰트 (self-host, CORS·unicode-range 이슈 회피)
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});
const hahmlet = Hahmlet({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-hahmlet",
  display: "swap",
  preload: false,
});
const gowunBatang = Gowun_Batang({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gowun-batang",
  display: "swap",
  preload: false,
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('theme');
                  if (t === 'dark') document.documentElement.classList.add('dark');
                } catch(e) {}
              })();
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${pretendard.variable} ${notoSerifKR.variable} ${hahmlet.variable} ${gowunBatang.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <ImpersonationBanner />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ChatWidget />
            <StudyTimerBar />
            <StudyEndDialog />
            <ConsentGate />
            <UndergradInfoPrompt />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
