// 디자인 스튜디오 브랜드 템플릿 — 네이비·골드 에디토리얼.
// prefill: 연계 대상(세미나·스터디·대외활동·학술대회)의 필드를 받아 텍스트를 채운다.

import type { DesignDocType, DesignPage } from "./studio-types";
import { DESIGN_CANVAS_SIZES } from "./studio-types";
import { makePage, makeShape, makeText, makeIcon, makeImage } from "./studio-utils";
import { BRAND_PALETTE, BRAND_LOGOS } from "./brand-kit";

export interface TemplatePrefill {
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  speaker?: string;
  description?: string;
}

// 브랜드 킷 단일 소스 — 색·로고를 여기서 파생 (중복 상수 제거)
const NAVY = BRAND_PALETTE.navy;
const GOLD = BRAND_PALETTE.gold;
const PAPER = BRAND_PALETTE.paper;
const INK = BRAND_PALETTE.ink;
// UX(2026-07-04 사용자 피드백): 학회 로고를 템플릿에 정식 반영
const EMBLEM = BRAND_LOGOS.emblem; // 원형 엠블럼 — 네이비 배경용(흰 테두리)

/** 밝은 페이지 공통 푸터 — 엠블럼 + 학회명 (2·3페이지가 따로 놀던 문제의 공통 언어) */
function lightFooter(docType: DesignDocType) {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES[docType];
  const cx = Math.round(W * 0.09);
  const s = Math.round(W * 0.032);
  return [
    makeImage(EMBLEM, {
      x: cx, y: H - Math.round(W * 0.055), w: s, h: s, fit: "contain", locked: true,
    }),
    makeText({
      x: cx + s + Math.round(W * 0.012), y: H - Math.round(W * 0.052), w: Math.round(W * 0.6), h: Math.round(W * 0.03),
      text: "연세교육공학회 · Yonsei EdTech",
      fontSize: Math.round(W * 0.016), fontWeight: 600, fontFamily: "sans",
      color: "rgba(27,31,39,0.55)", locked: true,
    }),
  ];
}

/** 커버 페이지 — 네이비 배경 + 골드 라인 + 세리프 타이틀 */
function coverPage(docType: DesignDocType, p: TemplatePrefill): DesignPage {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES[docType];
  const cx = Math.round(W * 0.09);
  // QA-v3 M: 16:9(ppt)에서 W 비례 엠블럼이 H*0.18 골드라인과 겹침 — H 비례 상한 적용
  const emblemSize = Math.round(Math.min(W * 0.085, H * 0.09));
  return makePage(NAVY, [
    makeImage(EMBLEM, {
      x: cx, y: Math.round(H * 0.07), w: emblemSize, h: emblemSize, fit: "contain", locked: true,
    }),
    makeShape("line", { x: cx, y: Math.round(H * 0.18), w: Math.round(W * 0.14), h: 8, fill: GOLD, locked: true }),
    makeText({
      x: cx, y: Math.round(H * 0.24), w: Math.round(W * 0.82), h: Math.round(H * 0.3),
      text: p.title ?? "제목을 입력하세요",
      fontSize: Math.round(W * 0.072), fontWeight: 900, fontFamily: "display",
      color: "#ffffff", lineHeight: 1.25,
    }),
    makeText({
      x: cx, y: Math.round(H * 0.58), w: Math.round(W * 0.8), h: Math.round(H * 0.1),
      text: p.subtitle ?? "부제 또는 한 줄 소개",
      fontSize: Math.round(W * 0.03), fontWeight: 600, fontFamily: "sans",
      color: "rgba(255,255,255,0.85)",
    }),
    makeText({
      x: cx, y: Math.round(H * 0.78), w: Math.round(W * 0.8), h: Math.round(H * 0.12),
      text: [p.date, p.location].filter(Boolean).join("  ·  ") || "일시 · 장소",
      fontSize: Math.round(W * 0.026), fontWeight: 600, fontFamily: "sans", color: GOLD,
    }),
    makeText({
      x: cx, y: H - Math.round(W * 0.07), w: Math.round(W * 0.8), h: Math.round(W * 0.045),
      text: "연세교육공학회 · Yonsei Educational Technology Association",
      fontSize: Math.round(W * 0.018), fontWeight: 600, fontFamily: "sans",
      color: "rgba(255,255,255,0.6)",
    }),
  ]);
}

/** 본문 페이지 — 밝은 배경 + 섹션 제목 + 본문 */
function bodyPage(docType: DesignDocType, heading: string, body: string): DesignPage {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES[docType];
  const cx = Math.round(W * 0.09);
  return makePage(PAPER, [
    makeShape("rect", { x: 0, y: 0, w: W, h: Math.round(H * 0.035), fill: NAVY, radius: 0, locked: true }),
    makeText({
      x: cx, y: Math.round(H * 0.09), w: Math.round(W * 0.82), h: Math.round(H * 0.12),
      text: heading, fontSize: Math.round(W * 0.045), fontWeight: 900, fontFamily: "display", color: NAVY,
    }),
    makeShape("line", { x: cx, y: Math.round(H * 0.2), w: Math.round(W * 0.1), h: 6, fill: GOLD, locked: true }),
    makeText({
      x: cx, y: Math.round(H * 0.26), w: Math.round(W * 0.82), h: Math.round(H * 0.55),
      text: body, fontSize: Math.round(W * 0.028), fontWeight: 400, fontFamily: "sans",
      color: INK, lineHeight: 1.6,
    }),
    ...lightFooter(docType),
  ]);
}

/** 연사/일정 강조 페이지 */
function highlightPage(docType: DesignDocType, p: TemplatePrefill): DesignPage {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES[docType];
  const cx = Math.round(W * 0.09);
  // UX(2026-07-04): 본문(2p)과 시각 언어 통일 — 같은 배경·상단 스트립·헤딩·골드 라인·푸터
  return makePage(PAPER, [
    makeShape("rect", { x: 0, y: 0, w: W, h: Math.round(H * 0.035), fill: NAVY, radius: 0, locked: true }),
    makeText({
      x: cx, y: Math.round(H * 0.09), w: Math.round(W * 0.82), h: Math.round(H * 0.12),
      text: "행사 안내", fontSize: Math.round(W * 0.045), fontWeight: 900, fontFamily: "display", color: NAVY,
    }),
    makeShape("line", { x: cx, y: Math.round(H * 0.2), w: Math.round(W * 0.1), h: 6, fill: GOLD, locked: true }),
    makeIcon("Calendar", { x: cx, y: Math.round(H * 0.27), w: Math.round(W * 0.06), h: Math.round(W * 0.06), color: NAVY }),
    makeText({
      x: cx + Math.round(W * 0.08), y: Math.round(H * 0.275), w: Math.round(W * 0.7), h: Math.round(H * 0.08),
      text: p.date ?? "일시", fontSize: Math.round(W * 0.03), fontWeight: 700, fontFamily: "sans", color: INK,
    }),
    makeIcon("MapPin", { x: cx, y: Math.round(H * 0.38), w: Math.round(W * 0.06), h: Math.round(W * 0.06), color: NAVY }),
    makeText({
      x: cx + Math.round(W * 0.08), y: Math.round(H * 0.385), w: Math.round(W * 0.7), h: Math.round(H * 0.08),
      text: p.location ?? "장소", fontSize: Math.round(W * 0.03), fontWeight: 700, fontFamily: "sans", color: INK,
    }),
    ...(p.speaker
      ? [
          makeIcon("Mic", { x: cx, y: Math.round(H * 0.49), w: Math.round(W * 0.06), h: Math.round(W * 0.06), color: NAVY }),
          makeText({
            x: cx + Math.round(W * 0.08), y: Math.round(H * 0.495), w: Math.round(W * 0.7), h: Math.round(H * 0.1),
            text: p.speaker, fontSize: Math.round(W * 0.03), fontWeight: 700, fontFamily: "sans", color: INK,
          }),
        ]
      : []),
    makeShape("rect", {
      x: cx, y: Math.round(H * 0.62), w: Math.round(W * 0.82), h: Math.round(H * 0.22),
      fill: "#ffffff", radius: 24, locked: true,
    }),
    makeText({
      x: cx + Math.round(W * 0.04), y: Math.round(H * 0.66), w: Math.round(W * 0.74), h: Math.round(H * 0.15),
      text: p.description?.slice(0, 110) ?? "소개 문구를 입력하세요.",
      fontSize: Math.round(W * 0.024), fontWeight: 400, fontFamily: "sans", color: INK, lineHeight: 1.6,
    }),
    ...lightFooter(docType),
  ]);
}

/** PPT 표지 + 목차 + 본문 구성 */
function pptPages(p: TemplatePrefill): DesignPage[] {
  return [
    coverPage("ppt", p),
    bodyPage("ppt", "목차", "1. 배경\n2. 핵심 내용\n3. 논의\n4. 마무리"),
    bodyPage("ppt", "핵심 내용", p.description ?? "본문 내용을 입력하세요."),
    makePage(NAVY, [
      makeImage(EMBLEM, { x: 590, y: 120, w: 100, h: 100, fit: "contain", locked: true }),
      makeShape("line", { x: 560, y: 250, w: 160, h: 6, fill: GOLD, locked: true }),
      makeText({
        x: 100, y: 280, w: 1080, h: 160, text: "감사합니다",
        fontSize: 88, fontWeight: 900, fontFamily: "display", color: "#ffffff", align: "center",
      }),
      makeText({
        x: 100, y: 470, w: 1080, h: 60, text: "연세교육공학회 · Yonsei Educational Technology Association",
        fontSize: 22, fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.6)", align: "center",
      }),
    ]),
  ];
}

/** 문서 타입별 기본 템플릿 페이지 생성 */
export function buildTemplatePages(docType: DesignDocType, p: TemplatePrefill = {}): DesignPage[] {
  if (docType === "ppt") return pptPages(p);
  if (docType === "poster") return [coverPage("poster", p)];
  // 카드뉴스: 커버 + 소개 + 일정 강조 + CTA
  return [
    coverPage("cardnews", p),
    bodyPage("cardnews", "소개", p.description ?? "무엇을 하는 활동인지 소개를 입력하세요."),
    highlightPage("cardnews", p),
    makePage(NAVY, [
      makeIcon("PartyPopper", { x: 460, y: 240, w: 160, h: 160, color: GOLD }),
      makeText({
        x: 90, y: 460, w: 900, h: 140, text: "지금 신청하세요",
        fontSize: 64, fontWeight: 900, fontFamily: "display", color: "#ffffff", align: "center",
      }),
      makeText({
        x: 90, y: 620, w: 900, h: 80, text: "자세한 내용은 학회 홈페이지에서",
        fontSize: 30, fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.8)", align: "center",
      }),
      makeImage(EMBLEM, { x: 495, y: 760, w: 90, h: 90, fit: "contain", locked: true }),
      makeText({
        x: 90, y: 870, w: 900, h: 50, text: "연세교육공학회 · Yonsei EdTech",
        fontSize: 22, fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.6)", align: "center",
      }),
    ]),
  ];
}

// ── 브랜드 템플릿 갤러리 (2026-07-18, 벤치마크 H5) ──
// "빈 캔버스" 대신 브랜드 킷이 적용된 프리셋으로 시작. 비디자이너 운영진도 온브랜드 산출.
// 모두 카드뉴스 규격(1080²)을 기준으로 하며, 필요한 필드는 prefill 로 채운다.

/** 세미나 홍보 — 커버(네이비) + 행사 안내(밝은 배경) */
function seminarPromoPages(p: TemplatePrefill): DesignPage[] {
  return [coverPage("cardnews", p), highlightPage("cardnews", p)];
}

/** 카드뉴스 표지 — 임팩트 있는 단일 커버 */
function cardnewsCoverPages(p: TemplatePrefill): DesignPage[] {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES.cardnews;
  const cx = Math.round(W * 0.09);
  return [
    makePage(NAVY, [
      makeShape("rect", { x: 0, y: 0, w: W, h: Math.round(H * 0.02), fill: GOLD, radius: 0, locked: true }),
      makeImage(EMBLEM, { x: cx, y: Math.round(H * 0.1), w: Math.round(W * 0.1), h: Math.round(W * 0.1), fit: "contain", locked: true }),
      makeText({
        x: cx, y: Math.round(H * 0.34), w: Math.round(W * 0.82), h: Math.round(H * 0.34),
        text: p.title ?? "카드뉴스 제목",
        fontSize: Math.round(W * 0.086), fontWeight: 900, fontFamily: "display", color: "#ffffff", lineHeight: 1.2,
      }),
      makeShape("line", { x: cx, y: Math.round(H * 0.7), w: Math.round(W * 0.16), h: 8, fill: GOLD, locked: true }),
      makeText({
        x: cx, y: Math.round(H * 0.74), w: Math.round(W * 0.8), h: Math.round(H * 0.1),
        text: p.subtitle ?? "한 줄 소개 또는 부제",
        fontSize: Math.round(W * 0.03), fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.85)",
      }),
      makeText({
        x: cx, y: H - Math.round(W * 0.07), w: Math.round(W * 0.8), h: Math.round(W * 0.045),
        text: "연세교육공학회 · Yonsei EdTech",
        fontSize: Math.round(W * 0.018), fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.6)", locked: true,
      }),
    ]),
  ];
}

/** 연사 소개 — 사진 자리(원형) + 이름 + 소개 */
function speakerIntroPages(p: TemplatePrefill): DesignPage[] {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES.cardnews;
  const cx = Math.round(W * 0.09);
  const photo = Math.round(W * 0.34);
  return [
    makePage(PAPER, [
      makeShape("rect", { x: 0, y: 0, w: W, h: Math.round(H * 0.035), fill: NAVY, radius: 0, locked: true }),
      makeText({
        x: cx, y: Math.round(H * 0.09), w: Math.round(W * 0.82), h: Math.round(H * 0.08),
        text: "연사 소개", fontSize: Math.round(W * 0.04), fontWeight: 900, fontFamily: "display", color: NAVY,
      }),
      makeShape("line", { x: cx, y: Math.round(H * 0.18), w: Math.round(W * 0.1), h: 6, fill: GOLD, locked: true }),
      // 사진 자리 (원형) — 사용자가 이미지로 교체
      makeShape("circle", { x: Math.round(W / 2 - photo / 2), y: Math.round(H * 0.24), w: photo, h: photo, fill: "#dfe5ef", locked: false }),
      makeIcon("Mic", { x: Math.round(W / 2 - W * 0.05), y: Math.round(H * 0.33), w: Math.round(W * 0.1), h: Math.round(W * 0.1), color: NAVY }),
      makeText({
        x: cx, y: Math.round(H * 0.6), w: Math.round(W * 0.82), h: Math.round(H * 0.08),
        text: p.speaker ?? "연사 이름", fontSize: Math.round(W * 0.05), fontWeight: 900, fontFamily: "display", color: INK, align: "center",
      }),
      makeText({
        x: cx, y: Math.round(H * 0.69), w: Math.round(W * 0.82), h: Math.round(H * 0.06),
        text: p.subtitle ?? "소속 · 직함", fontSize: Math.round(W * 0.026), fontWeight: 700, fontFamily: "sans", color: GOLD, align: "center",
      }),
      makeText({
        x: cx, y: Math.round(H * 0.76), w: Math.round(W * 0.82), h: Math.round(H * 0.14),
        text: p.description?.slice(0, 120) ?? "연사 소개 문구를 입력하세요.",
        fontSize: Math.round(W * 0.024), fontWeight: 400, fontFamily: "sans", color: INK, align: "center", lineHeight: 1.6,
      }),
    ]),
  ];
}

/** 수료 축하 — 골드 악센트 축하 카드 */
function completionPages(p: TemplatePrefill): DesignPage[] {
  const { width: W, height: H } = DESIGN_CANVAS_SIZES.cardnews;
  const cx = Math.round(W * 0.09);
  return [
    makePage(NAVY, [
      makeShape("rect", {
        x: cx, y: Math.round(H * 0.1), w: Math.round(W * 0.82), h: Math.round(H * 0.8),
        fill: "rgba(255,255,255,0.04)", radius: 28, strokeColor: GOLD, strokeWidth: 3, locked: true,
      }),
      makeIcon("Trophy", { x: Math.round(W / 2 - W * 0.08), y: Math.round(H * 0.18), w: Math.round(W * 0.16), h: Math.round(W * 0.16), color: GOLD }),
      makeText({
        x: cx, y: Math.round(H * 0.4), w: Math.round(W * 0.82), h: Math.round(H * 0.08),
        text: "수료를 축하합니다", fontSize: Math.round(W * 0.03), fontWeight: 600, fontFamily: "sans", color: GOLD, align: "center",
      }),
      makeText({
        x: cx, y: Math.round(H * 0.48), w: Math.round(W * 0.82), h: Math.round(H * 0.16),
        text: p.title ?? p.speaker ?? "수료자 이름",
        fontSize: Math.round(W * 0.072), fontWeight: 900, fontFamily: "display", color: "#ffffff", align: "center", lineHeight: 1.2,
      }),
      makeText({
        x: cx, y: Math.round(H * 0.66), w: Math.round(W * 0.82), h: Math.round(H * 0.1),
        text: p.description ?? p.subtitle ?? "과정명 · 수료 일자",
        fontSize: Math.round(W * 0.026), fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.85)", align: "center", lineHeight: 1.5,
      }),
      makeImage(EMBLEM, { x: Math.round(W / 2 - W * 0.045), y: Math.round(H * 0.78), w: Math.round(W * 0.09), h: Math.round(W * 0.09), fit: "contain", locked: true }),
      makeText({
        x: cx, y: Math.round(H * 0.885), w: Math.round(W * 0.82), h: Math.round(W * 0.04),
        text: "연세교육공학회 · Yonsei EdTech",
        fontSize: Math.round(W * 0.018), fontWeight: 600, fontFamily: "sans", color: "rgba(255,255,255,0.6)", align: "center", locked: true,
      }),
    ]),
  ];
}

export interface BrandTemplate {
  key: string;
  label: string;
  description: string;
  /** 캔버스 규격을 결정 */
  docType: DesignDocType;
  build: (p: TemplatePrefill) => DesignPage[];
}

/** 브랜드 템플릿 프리셋 — "이 템플릿으로 시작" */
export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    key: "seminar-promo",
    label: "세미나 홍보",
    description: "커버 + 행사 안내 2장 — 세미나·특강 모집",
    docType: "cardnews",
    build: seminarPromoPages,
  },
  {
    key: "cardnews-cover",
    label: "카드뉴스 표지",
    description: "임팩트 있는 단일 표지 — 소식·공지 시작 장",
    docType: "cardnews",
    build: cardnewsCoverPages,
  },
  {
    key: "speaker-intro",
    label: "연사 소개",
    description: "사진 + 이름 + 소개 — 연사·발표자 카드",
    docType: "cardnews",
    build: speakerIntroPages,
  },
  {
    key: "completion",
    label: "수료 축하",
    description: "골드 악센트 축하 카드 — 과정 수료·시상",
    docType: "cardnews",
    build: completionPages,
  },
];

/** 빈 문서 (흰 페이지 1장) */
export function buildBlankPages(docType: DesignDocType): DesignPage[] {
  void docType;
  return [makePage("#ffffff")];
}

export { makeImage };
