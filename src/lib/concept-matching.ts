/**
 * 아카이브 개념 본문 매칭 코어 (벤치마크-H4, Obsidian unlinked mentions 원리)
 *
 * ConceptLinkedText(사이클 104)의 경계 판정 로직을 순수 유틸로 일반화한다.
 * - 정방향: 본문을 개념명 기준으로 분절 (splitTextByConcepts, wiki 링크 렌더용)
 * - 역방향: 특정 개념의 이름·별칭이 본문에 등장하는지 탐지 (findConceptMention,
 *   "내 기록 속 이 개념" 역참조용)
 *
 * 한국어 특성상 부분 매칭(예: '학습'이 '학습자' 안에 잡힘)을 막기 위해
 * 좌/우 경계 검사 + 허용 조사 화이트리스트를 공유한다.
 */

/** 한글 음절/자모·영문·숫자 등 '단어 문자' 여부 — 경계 판정용 */
export function isWordChar(ch: string): boolean {
  return /[가-힣ㄱ-ㆎa-zA-Z0-9]/.test(ch);
}

// 개념명 바로 뒤에 와도 매칭을 허용하는 한국어 조사 (복합어와 구분).
// 긴 것 우선 검사하도록 길이 내림차순 정렬.
export const PARTICLES = [
  "으로서", "으로써", "이라는", "이라고", "라는", "라고", "이라", "으로",
  "에서", "에게", "께서", "이나", "라도", "처럼", "만큼", "까지", "부터",
  "조차", "마저", "한테", "보다", "이며", "이고", "이란", "란",
  "와", "과", "을", "를", "이", "가", "은", "는", "의", "에",
  "로", "도", "만", "나", "며", "고", "임", "들",
].sort((a, b) => b.length - a.length);

/**
 * `name` 이 `text` 의 위치 `i` 에서 단어 경계로 매칭되는지 판정.
 * - 좌측: 직전 문자가 단어문자면 매칭 안 함 (복합어 접미 방지)
 * - 우측: 매칭 직후가 비단어문자이거나, 허용 조사 뒤 비단어문자일 때만 허용
 */
export function matchesConceptNameAt(
  text: string,
  name: string,
  i: number,
): boolean {
  if (!text.startsWith(name, i)) return false;
  if (i > 0 && isWordChar(text[i - 1])) return false;
  const j = i + name.length;
  if (j >= text.length || !isWordChar(text[j])) return true;
  for (const p of PARTICLES) {
    if (!text.startsWith(p, j)) continue;
    const k = j + p.length;
    if (k >= text.length || !isWordChar(text[k])) return true;
  }
  return false;
}

export interface ConceptNameEntry {
  id: string;
  name: string;
}

export interface LinkPart {
  text: string;
  conceptId?: string;
}

/**
 * 본문을 개념명 기준으로 분절. 각 개념은 '첫 등장'만 링크(wiki 스타일, 가독성).
 * `index` 는 긴 이름 우선(greedy) 정렬돼 있다고 가정.
 */
export function splitTextByConcepts(
  text: string,
  index: ConceptNameEntry[],
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
    let matched: ConceptNameEntry | undefined;
    for (const e of index) {
      if (linked.has(e.id)) continue;
      if (matchesConceptNameAt(text, e.name, i)) {
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

/**
 * 역방향 탐지: 개념의 이름·별칭(`names`) 중 하나라도 `text` 에 단어 경계로
 * 등장하면 가장 앞선 위치를 반환. 없으면 null.
 * ("내 기록 속 이 개념" 역참조 — 발췌 생성은 호출부에서 index 로 수행)
 */
export function findConceptMention(
  text: string,
  names: string[],
): { name: string; index: number } | null {
  if (!text) return null;
  let best: { name: string; index: number } | null = null;
  for (const raw of names) {
    const name = raw?.trim();
    if (!name || name.length < 2) continue;
    let from = 0;
    while (from <= text.length) {
      const at = text.indexOf(name, from);
      if (at < 0) break;
      if (matchesConceptNameAt(text, name, at)) {
        if (!best || at < best.index) best = { name, index: at };
        break;
      }
      from = at + 1;
    }
  }
  return best;
}
