/**
 * 아카이브 양방향 매핑 read-time 병합 헬퍼.
 *
 * 배경: `archive_research_methods.statisticalMethodIds` 와
 * `archive_statistical_methods.relatedResearchMethodIds` 는 양방향 모델이지만,
 * 저장 시점에는 한쪽만 갱신된다(`ResearchMethodForm`·`StatisticalMethodForm` 모두 단방향 저장).
 *
 * 해법: 상세 페이지에서 표시할 때 "직접 매핑(forward)" + "역방향 매핑(reverse)" 을 합쳐서 노출한다.
 * - 직접: 본 문서가 `statisticalMethodIds`/`relatedResearchMethodIds` 로 가리키는 것
 * - 역방향: 상대 컬렉션에서 본 문서의 id 를 가리키는 것
 *
 * 모든 헬퍼는 호출자가 이미 published 여부를 필터링한 컬렉션을 전달한다고 가정한다.
 * (역방향 결과는 호출자가 다시 published 게이트를 적용하거나, 미리 published-only 목록을 전달하는 방식)
 */

import type { ResearchMethod } from "@/types/research-method";
import type { StatisticalMethod } from "@/types/statistical-method";

/**
 * 통계방법 목록 중 `relatedResearchMethodIds` 에 `researchMethodId` 가 포함된 것만 반환.
 * 연구방법 상세 페이지에서 "이 방법에서 자주 쓰는 통계기법" 의 역방향 매핑 소스로 사용.
 */
export function findStatMethodsLinkingToResearch(
  statMethods: StatisticalMethod[],
  researchMethodId: string,
): StatisticalMethod[] {
  return statMethods.filter((s) =>
    (s.relatedResearchMethodIds ?? []).includes(researchMethodId),
  );
}

/**
 * 연구방법 목록 중 `statisticalMethodIds` 에 `statisticalMethodId` 가 포함된 것만 반환.
 * 통계방법 상세 페이지에서 "이 통계기법을 사용한 연구방법" 의 역방향 매핑 소스로 사용.
 */
export function findResearchMethodsLinkingToStat(
  researchMethods: ResearchMethod[],
  statisticalMethodId: string,
): ResearchMethod[] {
  return researchMethods.filter((r) =>
    (r.statisticalMethodIds ?? []).includes(statisticalMethodId),
  );
}

/**
 * 두 배열을 id 기준으로 합쳐 중복 제거 (안정적 순서: 첫 배열 우선, 두번째에서 신규 항목만 append).
 * 양방향 read-time 병합에서 forward + reverse 결과를 합칠 때 사용.
 */
export function mergeById<T extends { id: string }>(forward: T[], reverse: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of forward) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  for (const item of reverse) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}
