import type { AlumniThesis } from "@/types/alumni";

/**
 * 졸업논문 analysis 프로필 → 진단·설계 되먹임 역집계 유틸 (v5-H4, 2026-07-18)
 *
 * AlumniThesis에 축적된 연구방법·통계방법·분석 프로필을 회원 여정(진단 약점·연구 설계)에서
 * "같은 방법을 쓴 선배 논문 N편" 근거로 되먹이기 위한 순수 함수 모음.
 * 데이터 로드는 호출부(react-query 캐시)에서 하고, 여기서는 이미 로드된 목록만 필터/정렬한다.
 */

function byAwardedDesc(a: AlumniThesis, b: AlumniThesis): number {
  return (b.awardedYearMonth || "").localeCompare(a.awardedYearMonth || "");
}

/**
 * 특정 연구방법(archive_research_methods id)을 쓴 졸업논문 — 학위수여년월 내림차순.
 * 자동추출(researchMethodIds) ∪ 운영자 큐레이트(researchMethods) 를 합쳐 매칭
 * (아카이브 method-finder·research-finder 와 동일 규칙).
 */
export function thesesForResearchMethod(
  theses: AlumniThesis[],
  methodId: string | undefined | null,
): AlumniThesis[] {
  if (!methodId) return [];
  return theses
    .filter((t) =>
      [...(t.researchMethodIds ?? []), ...(t.researchMethods ?? [])].includes(methodId),
    )
    .sort(byAwardedDesc);
}

/**
 * 특정 통계방법(archive_statistical_methods id)을 쓴 졸업논문 — 학위수여년월 내림차순.
 * 자동추출(statMethodIds) ∪ 운영자 큐레이트(statisticalMethods).
 */
function thesesForStatMethod(
  theses: AlumniThesis[],
  methodId: string | undefined | null,
): AlumniThesis[] {
  if (!methodId) return [];
  return theses
    .filter((t) =>
      [...(t.statMethodIds ?? []), ...(t.statisticalMethods ?? [])].includes(methodId),
    )
    .sort(byAwardedDesc);
}

/**
 * 졸업논문 분석 프로필의 방법 태그(연구방법 + 통계) — 위젯 한 줄 보강용.
 * 중복 제거 후 상위 limit개. analysis 프로필이 비어 있으면 빈 배열.
 */
export function thesisMethodTags(t: AlumniThesis, limit = 2): string[] {
  const tags = [
    ...(t.analysis?.researchMethods ?? []),
    ...(t.analysis?.statMethods ?? []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(tags)).slice(0, limit);
}
