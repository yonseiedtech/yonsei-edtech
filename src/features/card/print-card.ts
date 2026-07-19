// ── 인쇄소 제출용 명함 규격 · 디자인 데이터 (2026-07-19, 사용자 요청) ──
//
// 화면용 모바일 명함(BusinessCard.tsx, 세로 카드)과 별개로, 인쇄소에 그대로 넘길 수 있는
// "명함다운" 가로 명함(90×50mm)의 규격·색값·표시필드를 단일 소스로 고정한다.
// 여기 hex 값은 "인쇄물 데이터"(캔버스/PDF 요소 색)이지 UI 크롬 토큰이 아니다
// (brand-kit.ts 와 동일 취급 — ESLint raw 팔레트 규칙 무관).
//
// 규격(photomon 등 인쇄소 표준):
//  - 재단(trim)   90 × 50 mm  ← 최종 명함 크기
//  - 작업(bleed)  94 × 50→54 mm ← 사방 2mm 재단여백. 배경/이미지는 여기 가장자리까지 채움
//  - 안전(safe)   86 × 46 mm  ← 텍스트·로고는 이 안쪽
// PDF 페이지 = 작업 사이즈(94×54mm). 재단선 표시는 넣지 않음(인쇄소 표준 — 여백만 준수).

import type { User } from "@/types";
import { SCHOOL_LEVEL_LABELS } from "@/types";
import { BRAND_PALETTE } from "@/features/studio/brand-kit";

/** 1mm → PDF 포인트(pt). @react-pdf Page size 는 pt 단위. */
export const MM_TO_PT = 2.834645669;
export const mm = (v: number) => v * MM_TO_PT;

/** 인쇄 규격 (mm) */
export const PRINT_SPEC = {
  bleedW: 94, // 작업 폭 (재단 90 + 사방 2mm)
  bleedH: 54, // 작업 높이 (재단 50 + 사방 2mm)
  trimW: 90,
  trimH: 50,
  /** 작업 가장자리로부터 안전영역까지 여백 = bleed 2mm + safety 2mm = 4mm */
  safeInset: 4,
} as const;

/** 화면 미리보기 비율 (재단 기준 — 실제 명함 비율) */
export const CARD_ASPECT = `${PRINT_SPEC.trimW} / ${PRINT_SPEC.trimH}`;

export type PrintCardVariant = "light" | "navy";

export interface PrintCardColors {
  /** 배경(작업 사이즈 가장자리까지 채움) */
  bg: string;
  /** 이름 등 주요 텍스트 */
  name: string;
  /** 직책·소속·연락처 등 보조 텍스트 */
  sub: string;
  /** 골드 포인트(구분선·강조) */
  accent: string;
  /** 학회명 텍스트 */
  society: string;
  /** 엠블럼 배지 배경(네이비 변형에서 흰 배지) */
  emblemBadge: string;
  /** QR 박스 배경 */
  qrBox: string;
  /** QR 전경(모듈) 색 — 인쇄 대비 위해 항상 진한 색 */
  qrFg: string;
  /** 재단선(crop marks) 색 — 배경 대비 확보(라이트=흑, 네이비=백) */
  cropMark: string;
}

/** 두 디자인 변형 — ① 라이트(백색) ② 네이비 */
export const PRINT_CARD_COLORS: Record<PrintCardVariant, PrintCardColors> = {
  light: {
    bg: BRAND_PALETTE.white,
    name: BRAND_PALETTE.navy,
    sub: BRAND_PALETTE.gray,
    accent: BRAND_PALETTE.gold,
    society: BRAND_PALETTE.navy,
    emblemBadge: BRAND_PALETTE.white,
    qrBox: BRAND_PALETTE.white,
    qrFg: BRAND_PALETTE.navy,
    cropMark: "#000000", // 백색 바탕 → 흑색 재단선
  },
  navy: {
    bg: BRAND_PALETTE.navy,
    name: BRAND_PALETTE.white,
    sub: "#c8d4e8", // 네이비 위 밝은 보조 텍스트 (paper 보다 대비 확보)
    accent: BRAND_PALETTE.gold,
    society: BRAND_PALETTE.white,
    emblemBadge: BRAND_PALETTE.white,
    qrBox: BRAND_PALETTE.white,
    qrFg: BRAND_PALETTE.navy,
    cropMark: "#ffffff", // 네이비 바탕 → 백색 재단선
  },
};

/** 연락처 프리픽스 (명함 관행: M.=휴대전화, E.=이메일) — 미리보기·PDF 공용 */
export const CONTACT_PREFIX = { phone: "M.", email: "E." } as const;

/** 연락처 입력값 localStorage 키 (재방문 시 복원) */
export const PRINT_CARD_CONTACT_STORAGE_KEY = "yonsei:print-card-contact";

export const PRINT_CARD_VARIANT_LABELS: Record<PrintCardVariant, string> = {
  light: "라이트 (백색 바탕)",
  navy: "네이비 (네이비 바탕)",
};

/** 학회명 (국·영문) */
export const SOCIETY_NAME_KR = "연세교육공학회";
export const SOCIETY_NAME_EN = "Yonsei Educational Technology Association";
export const SOCIETY_TAGLINE = "교육공학의 혁신, 연세교육공학";

/** 전화번호 하이픈 포맷 (BusinessCard 와 동일 규칙) */
export function formatPhone(raw: string | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

export interface PrintCardLines {
  /** 소속 한 줄 (occupation 인지 — BusinessCard 로직과 동일) */
  affiliationLine: string;
  /** 직책 */
  position: string;
  /** 연락 이메일 (contactEmail ?? email) */
  email: string;
  /** 전화 (포맷) */
  phone: string;
  /** 기수 표기 (제 N기) — generation>0 일 때 */
  generationLabel: string;
}

/** User → 명함 표시용 텍스트. BusinessCard 의 affiliationLine 산출을 재사용해 일관성 유지. */
export function buildPrintCardLines(user: User): PrintCardLines {
  const parts: string[] = [];
  if (user.occupation === "teacher") {
    if (user.affiliationOffice) parts.push(user.affiliationOffice);
    const schoolBlock: string[] = [];
    if (user.schoolLevel) schoolBlock.push(SCHOOL_LEVEL_LABELS[user.schoolLevel]);
    if (user.affiliation) schoolBlock.push(user.affiliation);
    if (schoolBlock.length > 0) parts.push(schoolBlock.join(" "));
  } else {
    if (user.affiliation) parts.push(user.affiliation);
    if (user.department && user.department !== user.affiliation) {
      parts.push(user.department);
    }
  }
  return {
    affiliationLine: parts.join(" · "),
    position: user.position ?? "",
    email: user.contactEmail ?? user.email ?? "",
    phone: formatPhone(user.phone),
    generationLabel: user.generation > 0 ? `제 ${user.generation}기` : "",
  };
}

/** 다운로드 파일명 */
export function printCardFilename(name: string): string {
  const safe = (name || "회원").replace(/[\\/:*?"<>|]/g, "").trim() || "회원";
  return `${SOCIETY_NAME_KR}_명함_${safe}_인쇄용.pdf`;
}
