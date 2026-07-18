/**
 * 아카이브 양방향 크로스링크 write-time 동기화.
 *
 * 배경: `archive_research_methods.statisticalMethodIds` 와
 * `archive_statistical_methods.relatedResearchMethodIds` 는 양방향 모델이지만,
 * 각 편집 Form 은 자기 문서(forward)만 저장한다. 상대 문서의 역참조 필드가
 * 갱신되지 않아, 리스트/랜딩의 연결 개수 역집계가 read-time 병합을 거치지 않으면
 * 과소 표시된다.
 *
 * 해법(H3): 저장 시점에 상대 문서의 역참조 필드도 함께 갱신한다.
 * - 추가된 링크 → 상대 문서 reverse 필드에 `arrayUnion(selfId)`
 * - 제거된 링크 → 상대 문서 reverse 필드에서 `arrayRemove(selfId)`
 * - 모든 상대 문서 갱신을 하나의 `writeBatch` 로 커밋해 원자성 보장(부분 실패 없음).
 *
 * self 문서 자체 저장은 호출부(Form)가 이미 API 로 수행하므로 여기서는 상대측만 갱신한다.
 * read-time 병합(`archive-reverse-link.ts`)은 백필 전 미동기화 데이터 호환을 위해 유지한다.
 *
 * 클라이언트 전용 유틸 — 운영진(staff) 콘솔 편집 Form 에서만 호출된다.
 * firestore.rules 상 archive_research_methods / archive_statistical_methods 는
 * staff 이상 write 허용이므로 batch update 가 통과한다.
 */

import {
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/** 양방향 크로스링크 한 쌍의 컬렉션·필드 정의 */
export interface CrosslinkPair {
  /** 편집 중인 self 문서의 컬렉션 */
  selfCollection: string;
  /** self 문서의 forward 링크 필드 */
  selfField: string;
  /** 역참조를 반영할 상대 컬렉션 */
  targetCollection: string;
  /** 상대 문서에서 self id 를 담는 reverse 필드 */
  reverseField: string;
}

/** 연구방법 ↔ 통계방법 양방향 쌍 정의 (v5-H3 우선 대상) */
export const RESEARCH_TO_STAT: CrosslinkPair = {
  selfCollection: "archive_research_methods",
  selfField: "statisticalMethodIds",
  targetCollection: "archive_statistical_methods",
  reverseField: "relatedResearchMethodIds",
};

export const STAT_TO_RESEARCH: CrosslinkPair = {
  selfCollection: "archive_statistical_methods",
  selfField: "relatedResearchMethodIds",
  targetCollection: "archive_research_methods",
  reverseField: "statisticalMethodIds",
};

/** 이전/이후 id 배열을 비교해 추가·제거분을 계산 */
export function diffIds(
  prevIds: readonly string[],
  nextIds: readonly string[],
): { added: string[]; removed: string[] } {
  const prev = new Set(prevIds);
  const next = new Set(nextIds);
  const added = [...next].filter((id) => id && !prev.has(id));
  const removed = [...prev].filter((id) => id && !next.has(id));
  return { added, removed };
}

/**
 * self 문서의 forward 링크 변화(prev→next)를 상대 컬렉션의 reverse 필드에 반영한다.
 * 변경분이 없으면 아무 작업도 하지 않는다.
 *
 * @throws batch.commit 실패 시 전파 — 호출부에서 처리(부분 커밋은 없음).
 */
export async function syncReverseLinks(params: {
  targetCollection: string;
  reverseField: string;
  selfId: string;
  prevIds: readonly string[];
  nextIds: readonly string[];
}): Promise<{ added: number; removed: number }> {
  const { targetCollection, reverseField, selfId, prevIds, nextIds } = params;
  if (!selfId) return { added: 0, removed: 0 };

  const { added, removed } = diffIds(prevIds, nextIds);
  if (added.length === 0 && removed.length === 0) {
    return { added: 0, removed: 0 };
  }

  const batch = writeBatch(db);
  for (const id of added) {
    batch.update(doc(db, targetCollection, id), {
      [reverseField]: arrayUnion(selfId),
      updatedAt: serverTimestamp(),
    });
  }
  for (const id of removed) {
    batch.update(doc(db, targetCollection, id), {
      [reverseField]: arrayRemove(selfId),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { added: added.length, removed: removed.length };
}
