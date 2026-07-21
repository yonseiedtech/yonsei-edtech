// ── 학회 브랜드 킷 (2026-07-18, 벤치마크 H5 — Canva 브랜드 킷 원리) ──
//
// 연세교육공학회의 로고·컬러·타이포를 단일 소스로 고정한다. 운영진 세대가 바뀌어도
// 브랜드 일관성이 사람이 아닌 이 모듈에 의존하도록 하는 것이 목적.
// 공식 기준: 연세 씨앗엠블럼(yonsei-emblem.svg) · 네이비 #003378 · 골드 #D4AF37 보조.
//
// 참고: 여기 hex 값들은 "캔버스 데이터"(디자인 요소의 색)이지 UI 크롬 색이 아니다.
//       studio-utils / templates 가 이 모듈을 단일 출처로 재사용한다(중복 상수 제거).

/** 브랜드 컬러 — 이름 있는 팔레트 (템플릿·문서 요소가 참조) */
export const BRAND_PALETTE = {
  navy: "#003378", // 브랜드 표준 네이비 (연세 공식 엠블럼 / --primary 토큰과 일치)
  navyLight: "#0a4da3", // 밝은 네이비 (선택 강조·보조 헤딩)
  gold: "#d4af37", // 골드 (에디토리얼 악센트)
  ink: "#1b1f27", // 본문 잉크
  gray: "#5b6472", // 보조 텍스트 그레이
  white: "#ffffff",
  paper: "#f4f6fa", // 밝은 배경 페이퍼
  green: "#2f7d5c", // 딥 그린 (보조 강조)
} as const;

/** 스튜디오 스와치 순서 — 색 스프롤 방지를 위해 이 세트만 노출 */
export const BRAND_SWATCHES: readonly string[] = [
  BRAND_PALETTE.navy,
  BRAND_PALETTE.navyLight,
  BRAND_PALETTE.gold,
  BRAND_PALETTE.ink,
  BRAND_PALETTE.gray,
  BRAND_PALETTE.white,
  BRAND_PALETTE.paper,
  BRAND_PALETTE.green,
] as const;

/** 브랜드 로고·이미지 자산 (public/) */
export const BRAND_LOGOS = {
  /** 원형 엠블럼 SVG — 벡터, 네이비/흰 배경 모두 사용 */
  emblem: "/yonsei-emblem.svg",
  /** 엠블럼 PNG (내보내기 캡처 호환용 래스터) */
  emblemPng: "/icons/icon-512.png",
  /** 가로형 텍스트 로고 */
  textLogo: "/logo-text.png",
  /** 캠퍼스 배경 사진 */
  campus: "/yonsei-campus.jpg",
} as const;

/** 스튜디오 이미지 메뉴에 노출할 브랜드 자산 (label + src) */
export const BRAND_ASSET_LIST: { label: string; src: string; fit: "cover" | "contain" }[] = [
  { label: "학회 엠블럼", src: BRAND_LOGOS.emblem, fit: "contain" },
  { label: "텍스트 로고", src: BRAND_LOGOS.textLogo, fit: "contain" },
  { label: "연세 캠퍼스", src: BRAND_LOGOS.campus, fit: "cover" },
];

/** 서체 — 캔버스 텍스트 요소의 fontFamily 값과 일치 */
export const BRAND_FONTS = {
  /** 본문·UI 고딕 (Pretendard) */
  sans: "sans",
  /** 디스플레이 세리프 (Hahmlet) */
  display: "display",
} as const;

/**
 * 타이포 스케일 — 캔버스 폭(px) 대비 비율. 문서 크기가 달라도 비례 유지.
 * templates.ts 가 W*ratio 로 fontSize 를 산출하던 관례를 명명 상수화.
 */
export const BRAND_TYPE_SCALE = {
  display: 0.072, // 커버 대제목 (세리프 블랙)
  h1: 0.045, // 섹션 헤딩
  h2: 0.032, // 소제목
  subtitle: 0.03, // 부제
  body: 0.028, // 본문
  caption: 0.018, // 캡션·푸터
} as const;

const BRAND_KIT = {
  palette: BRAND_PALETTE,
  swatches: BRAND_SWATCHES,
  logos: BRAND_LOGOS,
  fonts: BRAND_FONTS,
  typeScale: BRAND_TYPE_SCALE,
} as const;
