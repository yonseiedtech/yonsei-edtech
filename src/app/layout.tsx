import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Noto_Serif_KR, Hahmlet } from "next/font/google";
// Inter font removed — Pretendard only
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import QueryProvider from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";
import ChatWidget from "@/components/chat/ChatWidget";
import FloatingReadingTimer from "@/features/research/study-timer/FloatingReadingTimer";
import AuthProvider from "@/features/auth/AuthProvider";
import ImpersonationBanner from "@/components/layout/ImpersonationBanner";
import ConsentGate from "@/components/auth/ConsentGate";
import UndergradInfoPrompt from "@/components/auth/UndergradInfoPrompt";
import AcademicStatusCampaignGate from "@/components/academic-status/AcademicStatusCampaignGate";
import SitePopupGate from "@/components/popup/SitePopupGate";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import ScrollToTopOnNav from "@/components/layout/ScrollToTopOnNav";
import VisitTracker from "@/components/layout/VisitTracker";
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


const SITE_URL = "https://yonsei-edtech.vercel.app";
const SITE_NAME = "연세교육공학회";
const SITE_DESCRIPTION =
  "연세대학교 교육대학원 교육공학전공 학술 커뮤니티 연세교육공학회. 입학부터 학위논문까지 학기별 연구 여정을 함께하는 대학원생 연구 성장 플랫폼 — 세미나, 프로젝트, 스터디, 논문 작성 지원을 제공합니다.";
const SITE_TITLE_DEFAULT =
  "연세교육공학회 - 연세대학교 교육대학원 교육공학전공 학술 커뮤니티";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: "%s | 연세교육공학회",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "연세교육공학회",
    "연세대학교 교육대학원 교육공학전공",
    "연세대학교 교육대학원",
    "연세대 교육대학원",
    "교육대학원 교육공학전공",
    "연세대학교 교육공학전공",
    "연세대학교 교육공학 전공",
    "연세대학교 교육공학",
    "연세대 교육공학",
    "교육공학 전공",
    "교육공학",
    "에듀테크",
    "교육기술",
    "학습과학",
    "교수설계",
    "연세대학교",
    "Yonsei University Graduate School of Education",
    "Yonsei Educational Technology",
    "Yonsei University",
    "Educational Technology",
    "Yonsei EdTech",
    "EdTech",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
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
    // 네이버 서치어드바이저(searchadvisor.naver.com) 사이트 소유 확인 (2026-07-19):
    // 발급받은 코드를 Vercel env NEXT_PUBLIC_NAVER_SITE_VERIFICATION 에 넣으면 자동 반영.
    ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { other: { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION } }
      : {}),
  },
};

export const viewport: Viewport = {
  // PWA 상태바/주소창 색상 — 브랜드 네이비
  themeColor: "#003378",
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
            `,
          }}
        />
      </head>
      <body
        className={`${pretendard.variable} ${notoSerifKR.variable} ${hahmlet.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <ScrollToTopOnNav />
            <VisitTracker />
            <div className="flex min-h-screen flex-col pb-[calc(56px+env(safe-area-inset-bottom))] sm:pb-0">
              <ImpersonationBanner />
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
            <BottomNav />
            <ChatWidget />
            <FloatingReadingTimer />
            <ConsentGate />
            <UndergradInfoPrompt />
            <AcademicStatusCampaignGate />
            <SitePopupGate />
            <InstallPromptBanner />
            <ServiceWorkerRegister />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
