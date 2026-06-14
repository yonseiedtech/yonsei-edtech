"use client";

/**
 * 아카이브 개념 색인 + 본문 wiki 링크 분절기 (사이클 104, 사용자 요청)
 *
 * "아카이브 개념 간에 해당되는 키워드마다 wiki 처럼 보여지도록" —
 * 본문 텍스트에서 등록된 개념명을 찾아 새 탭 링크로 만든다.
 *
 * 한국어 특성상 부분 매칭(예: '학습'이 '학습자' 안에 잡힘)을 막기 위해
 * 좌/우 경계 검사 + 허용 조사 화이트리스트를 사용한다.
 */

import { useQuery } from "@tanstack/react-query";
import { archiveConceptsApi } from "@/lib/bkend";

export interface ConceptIndexEntry {
  id: string;
  name: string;
}

export interface LinkPart {
  text: string;
  conceptId?: string;
}

/** 한글 음절/자모·영문·숫자 등 '단어 문자' 여부 — 경계 판정용 */
function isWordChar(ch: string): boolean {
  return /[가-힣ㄱ-ㆎa-zA-Z0-9]/.test(ch);
}

// 개념명 바로 뒤에 와도 매칭을 허용하는 한국어 조사 (복합어와 구분).
// 긴 것 우선 검사하도록 길이 내림차순 정렬.
const PARTICLES = [
  "으로서", "으로써", "이라는", "이라고", "라는", "라고", "이라", "으로",
  "에서", "에게", "께서", "이나", "라도", "처럼", "만큼", "까지", "부터",
  "조차", "마저", "한테", "보다", "이며", "이고", "이란", "란",
  "와", "과", "을", "를", "이", "가", "은", "는", "의", "에",
  "로", "도", "만", "나", "며", "고", "임", "들",
].sort((a, b) => b.length - a.length);

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

/**
 * 본문을 개념명 기준으로 분절. 각 개념은 '첫 등장'만 링크(wiki 스타일, 가독성).
 * - 좌측 경계: 직전 문자가 단어문자면 매칭 안 함 (복합어 접미 방지)
 * - 우측 경계: 매칭 직후가 비단어문자이거나, 허용 조사 뒤 비단어문자일 때만 허용
 */
export function splitTextByConcepts(
  text: string,
  index: ConceptIndexEntry[],
  excludeConceptId?: string,
): LinkPart[] {
  if (!text) return [];
  if (!index || index.length === 0) return [{ text }];

  const linked = new Set<string>();
  if (excludeConceptId) linked.add(excludeConceptId);

  const result: LinkPart[] = [];
  let buffer = "";
  let i = 0;
  const n = text.length;

  while (i < n) {
    let matched: ConceptIndexEntry | undefined;
    for (const e of index) {
      if (linked.has(e.id)) continue;
      if (!text.startsWith(e.name, i)) continue;
      // 좌측 경계 — 개념명이 단어 시작 위치여야 함
      if (i > 0 && isWordChar(text[i - 1])) continue;
      const j = i + e.name.length;
      // 우측 경계 — 즉시 비단어문자(공백·구두점·문장끝)
      if (j >= n || !isWordChar(text[j])) {
        matched = e;
        break;
      }
      // 또는 허용 조사 뒤 비단어문자
      let ok = false;
      for (const p of PARTICLES) {
        if (!text.startsWith(p, j)) continue;
        const k = j + p.length;
        if (k >= n || !isWordChar(text[k])) {
          ok = true;
          break;
        }
      }
      if (ok) {
        matched = e;
        break;
      }
    }

    if (matched) {
      if (buffer) {
        result.push({ text: buffer });
        buffer = "";
      }
      result.push({ text: matched.name, conceptId: matched.id });
      linked.add(matched.id);
      i += matched.name.length;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  if (buffer) result.push({ text: buffer });
  return result;
}
