/**
 * 러닝 가이드 읽기 경계 정규화 (2026-07-27)
 *
 * 배경: guidesApi(getById/getBySlug/list/listAll) 가 Firestore·API 응답을
 * `as unknown as LearningGuide` 로 사실상 무가공 반환한다. LearningGuide 타입은
 * tags: string[] 를 required 로 선언하지만, MVP 초기(2026-07-23)나 API 우회로
 * 생성된 레거시 문서엔 해당 필드가 없다. 이 경우 소비 경계의 무가드 접근
 *   - viewer  [slug]/page.tsx:  `guide.tags.length > 0`
 *   - 목록    learning-guides/page.tsx:  `g.tags.some(...)`
 *   - GuideCompletionCard:  `current.tags.map` / `g.tags.reduce`
 * 에서 `undefined.length/.some/.map` → TypeError → 렌더 throw 로 페이지가 붕괴한다.
 *
 * 읽기 경계에서 한 번 정규화해 어떤 문서라도 안전하게 다룬다(seminar-normalize 패턴).
 *
 * 대상 필드 (LearningGuide 인터페이스상 유일한 required array):
 *   - tags: string[]
 * 나머지 배열/객체 필드는 없거나 optional(?) — 정규화 불필요.
 */

import type { LearningGuide } from "@/types/learning-guide";

/**
 * 레거시 문서에서 LearningGuide 의 required array 필드 기본값을 보장한다.
 * 이미 정상인 필드는 그대로 통과(회귀 없음). 순수함수·부작용 없음.
 */
export function normalizeGuide(raw: LearningGuide): LearningGuide {
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}
