// ── 약점 개념 → 학습 자산 딥링크 (H3: 진단↔학습↔증명 단일 루프) ──
//
// 진단 리포트의 약점 개념에서 오늘 만든 신규 학습 자산으로 가는 원클릭 동선을
// 계산하는 순수 헬퍼. 링크 계산만 하며 네트워크·쓰기 없음.
//
//  (1) 개념 설명   → 아카이브 개념 상세(id 있을 때) 또는 용어 사전(폴백)
//  (2) 이론 계보   → 학습이론 가계도(개념이 이론 노드로 존재할 때만 노출)
//  (3) 암기카드    → 내 암기카드 학습 페이지
//
// theory-family.ts 의 conceptNameCandidates 를 재사용해 "이론 계보에서 보기"를
// 이론 개념에만 노출한다(통계방법 등 비이론 개념엔 숨김).

import { THEORY_NODES, normalizeTheoryName } from "@/lib/theory-family";

/** 약점 개념 — 아카이브 링크용 (id 있으면 상세, 없으면 라벨만) */
export interface WeakConceptLinkTarget {
  id?: string;
  name: string;
}

/** 학습이론 가계도 노드 후보명(정규화) 집합 — 모듈 로드 시 1회 구성. */
const THEORY_NODE_NAME_SET: ReadonlySet<string> = new Set(
  THEORY_NODES.flatMap((n) =>
    n.conceptNameCandidates
      .map((c) => normalizeTheoryName(c))
      .filter((c) => c.length > 0),
  ),
);

/**
 * 개념 설명 링크 — 아카이브 개념 상세(id 우선) 또는 용어 표준 사전 폴백.
 * id 가 있으면 정의·관련 변인·측정도구를 담은 개념 상세로 직행한다.
 */
export function conceptDetailHref(concept: WeakConceptLinkTarget): string {
  return concept.id ? `/archive/concept/${concept.id}` : "/archive/terminology";
}

/**
 * 이 개념이 학습이론 가계도의 노드로 존재하는지 — 이름 정규화 매칭.
 * 존재할 때만 "이론 계보에서 보기" 동선을 노출한다.
 */
export function conceptMatchesTheory(name: string): boolean {
  return THEORY_NODE_NAME_SET.has(normalizeTheoryName(name));
}

/** 학습이론 가계도 링크 (개념별 라우트/앵커가 없어 일반 링크). */
export const THEORY_MAP_HREF = "/archive/theory-map";

/** 내 암기카드 학습 링크. */
export const FLASHCARDS_HREF = "/flashcards";
