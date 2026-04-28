"use client";

import { useRef, useState } from "react";
import { Download, Images, Loader2 } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";

type CardKind = "cover" | "intro" | "feature" | "cta";
interface CardSpec {
  id: string;
  kind: CardKind;
  title?: string;
  subtitle?: string;
  english?: string;
  body?: string;
  bullets?: string[];
  badge?: string;
  screenshot?: string;
  page?: string;
}

const CARDS: CardSpec[] = [
  {
    id: "01-cover",
    kind: "cover",
    title: "공식 웹사이트\n오픈을 알립니다.",
    badge: "2026년 4월",
    body: "yonsei-edtech.vercel.app",
    english: "Yonsei Educational Technology",
  },
  {
    id: "02-intro",
    kind: "intro",
    title: "학술 커뮤니티의\n새로운 시작",
    badge: "About",
    body:
      "연세대학교 교육대학원 교육공학전공 구성원이 함께 만드는\n학회 운영·연구·교류 통합 플랫폼이 정식 오픈했습니다.",
    bullets: ["에듀테크", "교수설계", "학습과학", "현장 연구"],
  },
  {
    id: "03-home",
    kind: "feature",
    title: "한 화면에서 만나는\n학회 활동",
    subtitle: "Dashboard",
    badge: "01. 대시보드",
    page: "/",
    screenshot: "home",
    bullets: [
      "이번 학기 학사일정 진행률을 한눈에",
      "오늘·이번주 수업 타임라인 위젯",
      "내 할 일·D-day 통합 관리",
    ],
  },
  {
    id: "04-seminars",
    kind: "feature",
    title: "학회 세미나, 발표자,\n출석까지",
    subtitle: "Seminar Operations",
    badge: "02. 세미나",
    page: "/seminars",
    screenshot: "seminars",
    bullets: [
      "다중 연사 프로필과 발표 자료",
      "QR 출석 + 자동 수료증 발급",
      "D-day 알림 · 후기 요청 cron",
    ],
  },
  {
    id: "05-activities",
    kind: "feature",
    title: "스터디·프로젝트·\n대외 학술활동",
    subtitle: "Academic Activities",
    badge: "03. 학술활동",
    page: "/activities",
    screenshot: "activities",
    bullets: [
      "공개 신청 · 참여자 관리",
      "타임라인 · 리뷰 · 포스터 통합",
      "활동 종료 시 참석확인서 자동 발급",
    ],
  },
  {
    id: "06-courses",
    kind: "feature",
    title: "선배들의 수강 후기와\n인터뷰",
    subtitle: "Course Catalog",
    badge: "04. 수강과목",
    page: "/courses",
    screenshot: "courses",
    bullets: [
      "학기별 강의·시간표 자동 정리",
      "후기·인터뷰 답변 통합 검색",
      "종합시험 기출과 합격수기",
    ],
  },
  {
    id: "07-alumni",
    kind: "feature",
    title: "선배 논문 계보도와\n추천 시스템",
    subtitle: "Alumni Theses",
    badge: "05. 졸업생 논문",
    page: "/alumni",
    screenshot: "alumni",
    bullets: [
      "5년 단위 계보도와 지도교수 매핑",
      "관심 분야 기반 논문 추천",
      "내 논문 읽기 리스트·분석 노트",
    ],
  },
  {
    id: "08-research",
    kind: "feature",
    title: "키워드·제목·계보\n통합 분석",
    subtitle: "Research Analytics",
    badge: "06. 연구 분석",
    page: "/research",
    screenshot: "research",
    bullets: [
      "연도별 키워드 클라우드·슬라이더",
      "제목 N-gram·연구 유형·대상 위젯",
      "양적/질적/혼합 분류와 venue 분석",
    ],
  },
  {
    id: "09-thesis-defense",
    kind: "feature",
    title: "논문 심사,\n연습부터 다르게",
    subtitle: "Thesis Defense Practice",
    badge: "07. 인지디딤판",
    page: "/steppingstone/thesis-defense",
    screenshot: "thesis-defense",
    bullets: [
      "Web Speech STT 기반 따라읽기",
      "문장 단위 양방향 형광펜 비교",
      "자동 채점과 연습 이력 보관",
    ],
  },
  {
    id: "10-newsletter",
    kind: "feature",
    title: "학회보,\n매거진처럼 다시 펴다",
    subtitle: "Newsletter & Magazine",
    badge: "08. 학회보",
    page: "/newsletter",
    screenshot: "newsletter",
    bullets: [
      "PDF 다운로드·페이지 북마크",
      "TOC dots leader·모바일 sticky 챕터",
      "콘솔 빌더·실시간 미리보기",
    ],
  },
  {
    id: "11-cta",
    kind: "cta",
    title: "지금\n함께하세요.",
    badge: "Join us",
    body: "yonsei-edtech.vercel.app",
    english: "회원가입 한 번으로 학회의 모든 활동에 참여할 수 있습니다.",
  },
];

const NAVY_DEEP = "#002060";
const NAVY_MID = "#002369";
const BLUE_BRIGHT = "#0038A8";
const TEXT_DARK = "#1a1f36";
const TEXT_MUTED = "#6b7488";
const RULE_LIGHT = "#cfd6e4";
const WHITE = "#ffffff";
const NAVY_GRADIENT = `linear-gradient(90deg, ${NAVY_DEEP} 0%, ${BLUE_BRIGHT} 100%)`;

interface CardArtProps {
  spec: CardSpec;
  refCb?: (el: HTMLDivElement | null) => void;
}

function CardArt({ spec, refCb }: CardArtProps) {
  return (
    <div
      ref={refCb}
      data-card-art
      style={{
        width: 1080,
        height: 1080,
        position: "relative",
        background: WHITE,
        color: TEXT_DARK,
        fontFamily:
          "var(--font-pretendard), system-ui, -apple-system, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <BrandHeader />
      <ShieldWatermark />
      {spec.kind === "cover" && <CoverCard spec={spec} />}
      {spec.kind === "intro" && <IntroCard spec={spec} />}
      {spec.kind === "feature" && <FeatureCard spec={spec} />}
      {spec.kind === "cta" && <CtaCard spec={spec} />}
    </div>
  );
}

function BrandHeader() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 60px",
        zIndex: 5,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/card-news/brand/logo-society.png"
        alt="연세교육공학회"
        style={{ height: 44, width: "auto", display: "block" }}
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/card-news/brand/tagline.png"
        alt="교육공학의 변화와 혁신의 시작 연세교육공학"
        style={{ height: 28, width: "auto", display: "block" }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

/** 우하단 큰 쉴드 워터마크 (템플릿 동일 위치) */
function ShieldWatermark({ size = 760, opacity = 0.14 }: { size?: number; opacity?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/card-news/brand/shield.png"
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        right: -size * 0.18,
        bottom: -size * 0.12,
        width: size,
        height: size,
        opacity,
        zIndex: 1,
        userSelect: "none",
        pointerEvents: "none",
      }}
      crossOrigin="anonymous"
    />
  );
}

/** ━━ badge ━━ : 양옆 가로선 + 작은 라벨 (템플릿 핵심 패턴) */
function FlankedBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        color: NAVY_MID,
      }}
    >
      <div style={{ height: 1.5, width: 110, background: NAVY_MID }} />
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ height: 1.5, width: 110, background: NAVY_MID }} />
    </div>
  );
}

function GradientHeading({
  text,
  size = 96,
  weight = 800,
}: {
  text: string;
  size?: number;
  weight?: number;
}) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.18,
        letterSpacing: -2,
        background: NAVY_GRADIENT,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: NAVY_DEEP,
        whiteSpace: "pre-line",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function FooterStrip({ url, page }: { url: string; page?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 5,
        fontSize: 18,
        color: TEXT_MUTED,
        letterSpacing: 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {url}
        {page ?? ""}
      </span>
      <span
        style={{
          color: NAVY_MID,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontSize: 16,
        }}
      >
        Yonsei EdTech · 2026
      </span>
    </div>
  );
}

function CoverCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 56, alignItems: "center" }}>
        <FlankedBadge label={spec.badge ?? ""} />
        <GradientHeading text={spec.title ?? ""} size={108} />
        <div
          style={{
            fontSize: 24,
            color: TEXT_MUTED,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {spec.english}
        </div>
        <div
          style={{
            marginTop: 32,
            padding: "16px 36px",
            background: NAVY_DEEP,
            color: WHITE,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
            borderRadius: 999,
          }}
        >
          {spec.body}
        </div>
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}

function IntroCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 200,
        paddingLeft: 80,
        paddingRight: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 50,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={88} />
      <div
        style={{
          fontSize: 28,
          color: TEXT_DARK,
          lineHeight: 1.65,
          textAlign: "center",
          whiteSpace: "pre-line",
          maxWidth: 880,
        }}
      >
        {spec.body}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          marginTop: 16,
        }}
      >
        {(spec.bullets ?? []).map((b) => (
          <span
            key={b}
            style={{
              padding: "12px 26px",
              fontSize: 22,
              fontWeight: 700,
              color: NAVY_DEEP,
              border: `1.5px solid ${NAVY_DEEP}`,
              borderRadius: 999,
              letterSpacing: 1,
              background: WHITE,
            }}
          >
            {b}
          </span>
        ))}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}

function FeatureCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 150,
        paddingLeft: 70,
        paddingRight: 70,
        paddingBottom: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 30,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={62} />
      {spec.screenshot && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 880,
            height: 410,
            borderRadius: 12,
            overflow: "hidden",
            background: "#f6f8fc",
            border: `1px solid ${RULE_LIGHT}`,
            boxShadow: `0 18px 40px ${NAVY_DEEP}1f`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/card-news/screenshots/${spec.screenshot}.png`}
            alt={spec.title ?? ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
            crossOrigin="anonymous"
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 880,
          marginTop: 8,
        }}
      >
        {(spec.bullets ?? []).map((b, i) => (
          <div
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 23,
              color: TEXT_DARK,
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: NAVY_GRADIENT,
                color: WHITE,
                fontSize: 14,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span>{b}</span>
          </div>
        ))}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" page={spec.page} />
    </div>
  );
}

function CtaCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 56,
        zIndex: 3,
      }}
    >
      <FlankedBadge label={spec.badge ?? ""} />
      <GradientHeading text={spec.title ?? ""} size={130} />
      <div
        style={{
          fontSize: 26,
          color: TEXT_DARK,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 820,
        }}
      >
        {spec.english}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: "20px 44px",
          background: NAVY_DEEP,
          color: WHITE,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 1,
          borderRadius: 999,
        }}
      >
        {spec.body}
      </div>
      <FooterStrip url="yonsei-edtech.vercel.app" />
    </div>
  );
}

export default function CardNewsPage() {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function downloadOne(id: string) {
    const el = refs.current[id];
    if (!el) return;
    setBusy(id);
    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `yonsei-edtech-${id}.png`;
      a.click();
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    setBulkBusy(true);
    try {
      for (const c of CARDS) {
        await downloadOne(c.id);
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <ConsolePageHeader
        icon={Images}
        title="카드뉴스 (사이트 런칭 · 주요 기능)"
        description="1080×1080 정사각 카드 11장 — 학회 공식 템플릿 디자인. 인스타그램·카카오톡 채널·블로그 공유용."
        actions={
          <Button onClick={downloadAll} disabled={bulkBusy}>
            {bulkBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            전체 PNG 다운로드 (11장)
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((spec) => (
          <div
            key={spec.id}
            className="rounded-xl border border-border bg-background p-3 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {spec.id}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadOne(spec.id)}
                disabled={busy === spec.id || bulkBusy}
              >
                {busy === spec.id ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3 w-3" />
                )}
                PNG
              </Button>
            </div>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 1080,
                  height: 1080,
                  transform: "scale(0.333333)",
                  transformOrigin: "top left",
                }}
              >
                <CardArt
                  spec={spec}
                  refCb={(el) => {
                    refs.current[spec.id] = el;
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">
              {spec.title?.replace(/\n/g, " ")}
            </div>
            {spec.subtitle && (
              <div className="text-xs text-muted-foreground">{spec.subtitle}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
