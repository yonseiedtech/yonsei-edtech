/**
 * 연세교육공학회 브랜드 컬러 단일 기준값 (Single Source of Truth).
 *
 * globals.css 의 HSL 토큰(--primary / --secondary / --navy-footer)과 동일한 색을
 * 가리키지만, CSS 변수를 해석할 수 없는 컨텍스트(예: next/og 의 ImageResponse,
 * 정적 메타데이터)에서 하드코딩 hex 를 대체하기 위한 상수다.
 *
 * 값을 바꿀 때는 반드시 globals.css 의 대응 토큰도 함께 갱신한다.
 */
export const BRAND = {
  /** 연세 네이비 — 공식 엠블럼(yonsei-emblem.svg) / --primary 토큰과 일치 */
  navy: "#003378",
  /** 연세 골드 — 보조색 / --secondary 토큰과 일치 */
  gold: "#d4af37",
  /** 푸터 베이스 딥 네이비 — --navy-footer 토큰 (HSL 214 80% 12%) */
  navyFooter: "hsl(214 80% 12%)",
} as const;
