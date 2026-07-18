"use client";

/**
 * 아카이브 개념 색인 hook (사이클 104, 사용자 요청)
 *
 * "아카이브 개념 간에 해당되는 키워드마다 wiki 처럼 보여지도록" —
 * 본문 텍스트에서 등록된 개념명을 찾아 새 탭 링크로 만든다.
 *
 * 경계 판정·분절 로직은 @/lib/concept-matching 로 일반화됨(벤치마크-H4).
 */

import { useQuery } from "@tanstack/react-query";
import { archiveConceptsApi } from "@/lib/bkend";
import type { ConceptNameEntry, LinkPart } from "@/lib/concept-matching";

export type ConceptIndexEntry = ConceptNameEntry;
export type { LinkPart };
export { splitTextByConcepts } from "@/lib/concept-matching";

/** 등록된 모든 개념의 (id, name) 색인. altNames 도 별칭으로 포함. */
export function useConceptIndex() {
  return useQuery({
    queryKey: ["archive-concept-index"],
    queryFn: async (): Promise<ConceptIndexEntry[]> => {
      const res = await archiveConceptsApi.list();
      const entries: ConceptIndexEntry[] = [];
      for (const c of res.data) {
        const nm = c.name?.trim();
        if (nm && nm.length >= 2) entries.push({ id: c.id, name: nm });
        for (const alt of c.altNames ?? []) {
          const a = alt?.trim();
          if (a && a.length >= 2) entries.push({ id: c.id, name: a });
        }
      }
      // 긴 이름 우선 — greedy 매칭으로 부분 겹침(예: '인지부하' vs '인지') 방지
      entries.sort((a, b) => b.name.length - a.name.length);
      return entries;
    },
    staleTime: 5 * 60 * 1000,
  });
}
