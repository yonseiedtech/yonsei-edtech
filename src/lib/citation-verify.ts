/**
 * CrossRef DOI 검증 유틸 (Sprint 67-AR — Hallucination 안전장치 Phase 2 인프라)
 *
 * AI 가 자동 생성한 학술 인용의 DOI 실재 여부를 CrossRef API 로 확인.
 * 일치 시 verified=true 로 자동 마킹. 향후 cron 또는 운영진 일괄 검증에서 호출.
 *
 * CrossRef API: https://api.crossref.org/works/{doi}
 * - 비인증, 무료, 분당 50회 권장 (Polite Pool 사용 시 토큰 헤더로 우선 처리)
 */

export interface CrossRefMetadata {
  exists: boolean;
  title?: string;
  firstAuthorFamily?: string;
  year?: number;
  publisher?: string;
}

/**
 * 인용 객체와 CrossRef 응답을 비교해 의심도(0~3) 반환.
 * 0: 완전 일치 / 1: 연도 약간 차이 / 2: 저자 불일치 / 3: 존재 안 함 또는 제목 완전 다름
 */
export function scoreCitationMismatch(
  claimed: { authors: string[]; year: number; title: string },
  meta: CrossRefMetadata,
): number {
  if (!meta.exists) return 3;
  let score = 0;
  // 제목 첫 30자 비교 (소문자, 공백 제거)
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").slice(0, 30);
  if (meta.title && normalize(claimed.title) !== normalize(meta.title)) {
    score += 2; // 제목 불일치는 큰 문제
  }
  // 첫 저자 family name (영문 가정)
  if (meta.firstAuthorFamily && claimed.authors[0]) {
    const claimedFirst = claimed.authors[0].split(",")[0].trim().toLowerCase();
    if (claimedFirst !== meta.firstAuthorFamily.toLowerCase()) {
      score += 1;
    }
  }
  // 연도 ±1 허용 (online-first vs print issue 차이)
  if (meta.year != null && Math.abs(meta.year - claimed.year) > 1) {
    score += 1;
  }
  return Math.min(3, score);
}
