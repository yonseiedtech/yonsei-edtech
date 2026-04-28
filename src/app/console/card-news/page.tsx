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
    english: "Yonsei University Graduate School of Education · Educational Technology",
    badge: "공식 웹사이트 OPEN",
    body: "yonsei-edtech.vercel.app",
  },
  {
    id: "02-intro",
    kind: "intro",
    title: "학술 커뮤니티의 새로운 시작",
    body:
      "연세대학교 교육대학원 교육공학전공 구성원이 함께 만드는\n학회 운영·연구·교류 통합 플랫폼이 정식 오픈했습니다.",
    bullets: ["에듀테크", "교수설계", "학습과학", "현장 연구"],
  },
  {
    id: "03-home",
    kind: "feature",
    title: "한 화면에서 만나는 학회 활동",
    subtitle: "메인 · 학사일정 · 오늘의 수업",
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

const NAVY = "#0a1f44";
const NAVY_DEEP = "#061635";
const GOLD = "#d4af37";
const GOLD_LIGHT = "#f4d77a";
const CREAM = "#f5f1e6";

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
          spec.kind === "cover"
            ? `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`
            : spec.kind === "cta"
              ? `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%)`
              : CREAM,
        color: spec.kind === "feature" || spec.kind === "intro" ? NAVY : CREAM,
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

function GoldRule({ width = 80 }: { width?: number }) {
  return (
    <div
      style={{
        height: 4,
        width,
        background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
        borderRadius: 2,
      }}
    />
  );
}

function YMonogram({ size = 360 }: { size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2px solid ${GOLD}55`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 30,
          borderRadius: "50%",
          border: `2px solid ${GOLD}33`,
        }}
      />
      <div
        style={{
          fontSize: size * 0.7,
          fontWeight: 900,
          fontStyle: "italic",
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "var(--font-noto-serif-kr), serif",
          lineHeight: 1,
        }}
      >
        Y
      </div>
    </div>
  );
}

function CoverCard({ spec }: { spec: CardSpec }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <GoldRule width={120} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: GOLD_LIGHT,
              fontWeight: 600,
            }}
          >
            Yonsei · Graduate School of Education
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 40,
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                background: `${GOLD}22`,
                border: `1px solid ${GOLD}`,
                borderRadius: 999,
                color: GOLD_LIGHT,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
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
                color: CREAM,
                fontFamily: "var(--font-pretendard), sans-serif",
              }}
            >
              {spec.title}
            </div>
            <div
              style={{
                fontSize: 22,
                fontStyle: "italic",
                color: `${CREAM}cc`,
                lineHeight: 1.45,
                maxWidth: 540,
                fontFamily: "var(--font-noto-serif-kr), serif",
              }}
            >
              {spec.english}
            </div>
          </div>
          <YMonogram size={320} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            borderTop: `1px solid ${GOLD}55`,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: GOLD_LIGHT,
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
              color: `${CREAM}88`,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            교육공학전공
          </div>
        </div>
      </div>
    </>
  );
}

function IntroCard({ spec }: { spec: CardSpec }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 80,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <GoldRule width={100} />
        <div style={{ fontSize: 20, letterSpacing: 5, color: NAVY, opacity: 0.55 }}>
          ABOUT
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div
          style={{
            fontSize: 70,
            fontWeight: 800,
            lineHeight: 1.15,
            color: NAVY,
            letterSpacing: -1,
          }}
        >
          {spec.title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: NAVY,
            opacity: 0.8,
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
                color: NAVY,
                background: `${GOLD}33`,
                border: `1px solid ${GOLD}`,
                borderRadius: 999,
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
          borderTop: `1px solid ${NAVY}33`,
          color: NAVY,
          opacity: 0.7,
          fontSize: 18,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        <span>연세교육공학회 · YONSEI EDTECH</span>
        <span style={{ color: GOLD, opacity: 1, fontWeight: 700 }}>02 / 11</span>
      </div>
    </div>
  );
}

function FeatureCard({ spec }: { spec: CardSpec }) {
  const idx = parseInt(spec.id.split("-")[0], 10);
  return (
    <div
      style={{
        position: "absolute",
        inset: 64,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <GoldRule width={60} />
          <div
            style={{
              fontSize: 18,
              color: NAVY,
              opacity: 0.55,
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {spec.subtitle}
          </div>
        </div>
        <div
          style={{
            fontSize: 18,
            color: GOLD,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          {String(idx).padStart(2, "0")} / 11
        </div>
      </div>

      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: NAVY,
          letterSpacing: -1,
          lineHeight: 1.18,
        }}
      >
        {spec.title}
      </div>

      {spec.screenshot && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 540,
            borderRadius: 18,
            overflow: "hidden",
            background: `${NAVY}11`,
            border: `2px solid ${NAVY}22`,
            boxShadow: `0 18px 40px ${NAVY}22`,
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
              color: NAVY,
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                marginTop: 12,
                width: 8,
                height: 8,
                borderRadius: 999,
                background: GOLD,
                flexShrink: 0,
              }}
            />
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          paddingTop: 18,
          borderTop: `1px solid ${NAVY}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: NAVY,
          opacity: 0.7,
          fontSize: 16,
          letterSpacing: 2,
        }}
      >
        <span style={{ fontFamily: "var(--font-noto-serif-kr), serif" }}>
          yonsei-edtech.vercel.app{spec.page}
        </span>
        <span style={{ color: GOLD, fontWeight: 700, opacity: 1 }}>YONSEI EDTECH</span>
      </div>
    </div>
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
        color: CREAM,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <GoldRule width={120} />
        <div
          style={{
            fontSize: 20,
            letterSpacing: 5,
            color: GOLD_LIGHT,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Join us
        </div>
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
            color: `${CREAM}cc`,
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
            background: GOLD,
            color: NAVY_DEEP,
            fontSize: 36,
            fontWeight: 800,
            borderRadius: 16,
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
          borderTop: `1px solid ${GOLD}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 18,
          color: `${CREAM}99`,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        <span>{spec.badge}</span>
        <span style={{ color: GOLD_LIGHT, fontWeight: 700 }}>11 / 11</span>
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
        description="1080×1080 정사각 카드 11장 — 인스타그램·카카오톡 채널·블로그 공유용. 우측 다운로드 버튼으로 개별 PNG 저장 또는 일괄 다운로드."
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
            {/* 미리보기 (1080x1080을 약 360px로 스케일) */}
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
        </ul>
      </div>

    </div>
  );
}
