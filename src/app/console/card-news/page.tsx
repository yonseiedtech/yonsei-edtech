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
    title: "연세교육공학회",
    english: "Yonsei University Graduate School of Education\nEducational Technology",
    badge: "공식 웹사이트 OPEN",
    body: "yonsei-edtech.vercel.app",
  },
  {
    id: "02-intro",
    kind: "intro",
    title: "학술 커뮤니티의 새로운 시작",
    body:
      "연세대학교 교육대학원 교육공학전공 구성원이 함께 만드는\n학회 운영 · 연구 · 교류 통합 플랫폼이 정식 오픈했습니다.",
    bullets: ["에듀테크", "교수설계", "학습과학", "현장 연구"],
  },
  {
    id: "03-home",
    kind: "feature",
    title: "한 화면에서 만나는 학회 활동",
    subtitle: "Dashboard",
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
    title: "학회 세미나, 발표자, 출석까지",
    subtitle: "Seminar Operations",
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
    title: "스터디 · 프로젝트 · 대외활동",
    subtitle: "Academic Activities",
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
    title: "선배들의 수강 후기와 인터뷰",
    subtitle: "Course Catalog",
    page: "/courses",
    screenshot: "courses",
    bullets: [
      "학기별 강의 · 강의 시간표 자동 정리",
      "후기 · 인터뷰 답변 통합 검색",
      "종합시험 기출과 합격수기",
    ],
  },
  {
    id: "07-alumni",
    kind: "feature",
    title: "선배 논문 계보도와 추천 시스템",
    subtitle: "Alumni Theses",
    page: "/alumni",
    screenshot: "alumni",
    bullets: [
      "5년 단위 계보도와 지도교수 매핑",
      "관심 분야 기반 논문 추천",
      "내 논문 읽기 리스트 · 분석 노트",
    ],
  },
  {
    id: "08-research",
    kind: "feature",
    title: "키워드 · 제목 · 계보 통합 분석",
    subtitle: "Research Analytics",
    page: "/research",
    screenshot: "research",
    bullets: [
      "연도별 키워드 클라우드 · 슬라이더",
      "제목 N-gram · 연구 유형 · 대상 위젯",
      "양적/질적/혼합 분류와 venue 분석",
    ],
  },
  {
    id: "09-thesis-defense",
    kind: "feature",
    title: "논문 심사, 연습부터 다르게",
    subtitle: "인지디딤판 — Thesis Defense Practice",
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
    title: "학회보, 매거진처럼 다시 펴다",
    subtitle: "Newsletter & Magazine",
    page: "/newsletter",
    screenshot: "newsletter",
    bullets: [
      "PDF 다운로드 · 페이지 북마크",
      "TOC dots leader · 모바일 sticky 챕터",
      "콘솔 빌더 · 실시간 미리보기",
    ],
  },
  {
    id: "11-cta",
    kind: "cta",
    title: "지금 함께하세요",
    body: "yonsei-edtech.vercel.app",
    english: "회원가입 한 번으로 학회의 모든 활동에 참여할 수 있습니다.",
    badge: "Yonsei EdTech · 2026",
  },
];

// 연세대학교 공식 컬러 시스템
const YONSEI_BLUE = "#003876"; // PMS 281 — Yonsei primary
const YONSEI_BLUE_DEEP = "#002857"; // 그라데이션 깊은 쪽
const YONSEI_GOLD = "#C5A572"; // 보조 골드 (학교 휘장 톤)
const YONSEI_GOLD_LIGHT = "#dcc89a";
const WHITE = "#ffffff";
const BG_LIGHT = "#f7f9fc";
const TEXT_MUTED = "#5b6878";

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
        background:
          spec.kind === "cover" || spec.kind === "cta"
            ? `linear-gradient(135deg, ${YONSEI_BLUE} 0%, ${YONSEI_BLUE_DEEP} 100%)`
            : WHITE,
        color:
          spec.kind === "feature" || spec.kind === "intro" ? YONSEI_BLUE : WHITE,
        fontFamily:
          "var(--font-pretendard), system-ui, -apple-system, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      {spec.kind === "cover" && <CoverCard spec={spec} />}
      {spec.kind === "intro" && <IntroCard spec={spec} />}
      {spec.kind === "feature" && <FeatureCard spec={spec} />}
      {spec.kind === "cta" && <CtaCard spec={spec} />}
    </div>
  );
}

function GoldRule({ width = 80, color = YONSEI_GOLD }: { width?: number; color?: string }) {
  return (
    <div
      style={{
        height: 3,
        width,
        background: color,
        borderRadius: 1.5,
      }}
    />
  );
}

/**
 * 연세대 방패 엠블럼 모티프 — 공식 로고가 아닌 추상화된 방패 실루엣 + Y 워드마크.
 * 학교 정식 휘장 사용은 저작권 이슈가 있어 형태만 차용.
 */
function YonseiShield({ size = 320, mode = "dark" }: { size?: number; mode?: "dark" | "light" }) {
  const stroke = mode === "dark" ? YONSEI_GOLD : YONSEI_BLUE;
  const fill = mode === "dark" ? "transparent" : WHITE;
  const textColor = mode === "dark" ? WHITE : YONSEI_BLUE;
  const accent = YONSEI_GOLD;
  return (
    <div style={{ width: size, height: size * 1.18, position: "relative" }}>
      <svg
        viewBox="0 0 200 235"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <path
          d="M100 8 L190 38 L190 130 C190 178 156 210 100 228 C44 210 10 178 10 130 L10 38 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="3"
        />
        <path
          d="M100 22 L178 48 L178 130 C178 170 150 198 100 214 C50 198 22 170 22 130 L22 48 Z"
          fill="none"
          stroke={accent}
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        {/* 가로 골드 띠 */}
        <line x1="22" y1="92" x2="178" y2="92" stroke={accent} strokeWidth="1.5" opacity="0.6" />
      </svg>
      {/* 중앙 Y */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: size * 0.12,
        }}
      >
        <div
          style={{
            fontSize: size * 0.55,
            fontWeight: 800,
            fontStyle: "italic",
            color: textColor,
            fontFamily: "var(--font-noto-serif-kr), serif",
            lineHeight: 1,
          }}
        >
          Y
        </div>
        <div
          style={{
            marginTop: size * 0.02,
            fontSize: size * 0.05,
            letterSpacing: size * 0.012,
            color: textColor,
            opacity: 0.85,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Yonsei
        </div>
      </div>
    </div>
  );
}

function CoverCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <GoldRule width={120} />
        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: YONSEI_GOLD_LIGHT,
            fontWeight: 600,
          }}
        >
          Yonsei University · Graduate School of Education
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "8px 18px",
              background: YONSEI_GOLD,
              color: YONSEI_BLUE_DEEP,
              borderRadius: 4,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            {spec.badge}
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: WHITE,
            }}
          >
            {spec.title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: `${WHITE}cc`,
              lineHeight: 1.45,
              maxWidth: 540,
              fontFamily: "var(--font-noto-serif-kr), serif",
              whiteSpace: "pre-line",
              fontStyle: "italic",
            }}
          >
            {spec.english}
          </div>
        </div>
        <YonseiShield size={300} mode="dark" />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          borderTop: `1px solid ${YONSEI_GOLD}66`,
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: YONSEI_GOLD_LIGHT,
            fontWeight: 600,
            letterSpacing: 1,
            fontFamily: "var(--font-noto-serif-kr), serif",
          }}
        >
          {spec.body}
        </div>
        <div
          style={{
            fontSize: 18,
            color: `${WHITE}88`,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          교육공학전공
        </div>
      </div>
    </div>
  );
}

function FeatureHeaderStrip({ subtitle, idx }: { subtitle?: string; idx: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 70,
        background: YONSEI_BLUE,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 64px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 26,
            height: 26,
            background: YONSEI_GOLD,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 800,
            fontStyle: "italic",
            color: YONSEI_BLUE,
            fontFamily: "var(--font-noto-serif-kr), serif",
          }}
        >
          Y
        </div>
        <div
          style={{
            fontSize: 18,
            color: WHITE,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          연세교육공학회
        </div>
        <span style={{ color: `${WHITE}55`, fontSize: 18 }}>|</span>
        <div
          style={{
            fontSize: 16,
            color: YONSEI_GOLD_LIGHT,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          fontSize: 16,
          color: YONSEI_GOLD_LIGHT,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        {String(idx).padStart(2, "0")} / 11
      </div>
    </div>
  );
}

function IntroCard({ spec }: { spec: CardSpec }) {
  return (
    <>
      <FeatureHeaderStrip subtitle="ABOUT" idx={2} />
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "70px 80px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG_LIGHT,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <GoldRule width={90} color={YONSEI_BLUE} />
            <div
              style={{
                fontSize: 70,
                fontWeight: 800,
                lineHeight: 1.15,
                color: YONSEI_BLUE,
                letterSpacing: -1,
              }}
            >
              {spec.title}
            </div>
          </div>
          <div
            style={{
              fontSize: 30,
              color: TEXT_MUTED,
              lineHeight: 1.55,
              whiteSpace: "pre-line",
            }}
          >
            {spec.body}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {(spec.bullets ?? []).map((b) => (
              <span
                key={b}
                style={{
                  padding: "12px 24px",
                  fontSize: 22,
                  fontWeight: 700,
                  color: YONSEI_BLUE,
                  background: WHITE,
                  border: `2px solid ${YONSEI_BLUE}`,
                  borderRadius: 4,
                  letterSpacing: 1,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: `1px solid ${YONSEI_BLUE}22`,
            color: TEXT_MUTED,
            fontSize: 16,
            letterSpacing: 2,
          }}
        >
          <span style={{ fontFamily: "var(--font-noto-serif-kr), serif" }}>
            yonsei-edtech.vercel.app
          </span>
          <span style={{ color: YONSEI_GOLD, fontWeight: 700 }}>
            EDUCATIONAL TECHNOLOGY
          </span>
        </div>
      </div>
    </>
  );
}

function FeatureCard({ spec }: { spec: CardSpec }) {
  const idx = parseInt(spec.id.split("-")[0], 10);
  return (
    <>
      <FeatureHeaderStrip subtitle={spec.subtitle} idx={idx} />
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "48px 64px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          background: WHITE,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GoldRule width={60} color={YONSEI_GOLD} />
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: YONSEI_BLUE,
              letterSpacing: -1,
              lineHeight: 1.18,
            }}
          >
            {spec.title}
          </div>
        </div>

        {spec.screenshot && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 530,
              borderRadius: 8,
              overflow: "hidden",
              background: BG_LIGHT,
              border: `2px solid ${YONSEI_BLUE}22`,
              boxShadow: `0 12px 32px ${YONSEI_BLUE}1a`,
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
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {(spec.bullets ?? []).map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                fontSize: 22,
                color: YONSEI_BLUE,
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  marginTop: 12,
                  width: 8,
                  height: 8,
                  background: YONSEI_GOLD,
                  flexShrink: 0,
                }}
              />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: 16,
            borderTop: `1px solid ${YONSEI_BLUE}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: TEXT_MUTED,
            fontSize: 16,
            letterSpacing: 2,
          }}
        >
          <span style={{ fontFamily: "var(--font-noto-serif-kr), serif" }}>
            yonsei-edtech.vercel.app{spec.page}
          </span>
          <span style={{ color: YONSEI_GOLD, fontWeight: 700 }}>YONSEI EDTECH</span>
        </div>
      </div>
    </>
  );
}

function CtaCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: WHITE,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <GoldRule width={120} />
          <div
            style={{
              fontSize: 20,
              letterSpacing: 5,
              color: YONSEI_GOLD_LIGHT,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Join us
          </div>
        </div>
        <YonseiShield size={180} mode="dark" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {spec.title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: `${WHITE}cc`,
            lineHeight: 1.5,
            maxWidth: 760,
          }}
        >
          {spec.english}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "20px 36px",
            background: YONSEI_GOLD,
            color: YONSEI_BLUE_DEEP,
            fontSize: 36,
            fontWeight: 800,
            borderRadius: 4,
            fontFamily: "var(--font-noto-serif-kr), serif",
            letterSpacing: 1,
          }}
        >
          {spec.body}
        </div>
      </div>

      <div
        style={{
          paddingTop: 20,
          borderTop: `1px solid ${YONSEI_GOLD}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 18,
          color: `${WHITE}99`,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        <span>{spec.badge}</span>
        <span style={{ color: YONSEI_GOLD_LIGHT, fontWeight: 700 }}>11 / 11</span>
      </div>
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
        description="1080×1080 정사각 카드 11장 — 인스타그램·카카오톡 채널·블로그 공유용. 연세대 컬러 시스템(Yonsei Blue + Gold) 적용."
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
              {spec.title}
            </div>
            {spec.subtitle && (
              <div className="text-xs text-muted-foreground">{spec.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">📌 사용 팁</p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>다운로드된 PNG는 1080×1080 (인스타그램 정사각 / 카카오톡 채널 추천)</li>
          <li>스크린샷이 오래되었을 경우 <code className="rounded bg-background px-1">node scripts/capture-card-news-screenshots.mjs</code> 재실행</li>
          <li>카피 수정은 <code className="rounded bg-background px-1">src/app/console/card-news/page.tsx</code>의 <code className="rounded bg-background px-1">CARDS</code> 배열</li>
          <li>컬러: Yonsei Blue <code className="rounded bg-background px-1">#003876</code> · Gold <code className="rounded bg-background px-1">#C5A572</code> (학교 정식 휘장은 저작권으로 미사용, 형태만 차용)</li>
        </ul>
      </div>
    </div>
  );
}
