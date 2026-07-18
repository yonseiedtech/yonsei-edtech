// ── 읽기 컬렉션 기반 반복 탐색 추천 (벤치마크 M1, ResearchRabbit 원리) ──
//
// 회원이 "읽은 논문(paper_reading_logs)" + "읽기 리스트(user.thesisReadingList)" 를
// 하나의 "컬렉션"으로 보고, 그 컬렉션의 방법·변인·개념 빈도 프로필을 씨앗으로
// 아직 안 읽은 졸업생 학위논문을 추천한다. 컬렉션이 커질수록 빈도 가중이 누적되어
// 프로필이 진화(같은 방법·개념을 반복해서 모을수록 그 축의 추천 가중이 커짐).
//
// ⚠️ 순수 함수만 — 데이터 로드(react-query)는 호출부에서 하고, 여기서는 이미 로드된
// 목록만 집계/정렬한다. 신규 컬렉션·rules·네트워크 호출 없음.

import type { PaperReadingLog } from "@/types/paper-reading";
import type { AlumniThesis } from "@/types/alumni";

/** 프로필/추천 최소 컬렉션 크기 — 이 미만이면 콜드스타트(추천 미노출). */
export const MIN_COLLECTION_SIZE = 3;

/** 기본 추천 편수. */
export const DEFAULT_REC_LIMIT = 5;

/** 추천 1건 — 논문 + 유사도 점수 + 내 컬렉션과 겹치는 요소 라벨. */
export interface CollectionRecItem {
  thesis: AlumniThesis;
  score: number;
  /** 내 컬렉션 프로필과 겹치는 요소(개념·변인·방법)의 사람이 읽을 수 있는 라벨(상위 몇 개). */
  overlapLabels: string[];
}

/** 관련 아카이브 개념 1건 — id + 표시명 + 컬렉션 내 빈도 가중. */
export interface RelatedConcept {
  id: string;
  name: string;
  weight: number;
}

export interface CollectionRecommendation {
  /** cold = 컬렉션 < MIN, empty = 프로필/추천 없음, ok = 추천 있음. */
  status: "cold" | "empty" | "ok";
  /** 컬렉션 논문 편수(읽기 기록 + 읽기 리스트, 중복 제거). */
  collectionSize: number;
  /** 프로필 구성에 실제로 쓰인 씨앗 졸업논문 수(방법/개념 프로필 보유분). */
  seedCount: number;
  items: CollectionRecItem[];
  relatedConcepts: RelatedConcept[];
}

export interface CollectionRecInput {
  /** 본인 읽기 기록(paper_reading_logs). source==="alumni_thesis" 이면 refId 가 졸업논문 id. */
  readingLogs: PaperReadingLog[];
  /** 읽기 리스트(user.thesisReadingList) — 졸업논문 id 목록. */
  readingListIds: string[];
  /** 전체 졸업생 학위논문(분석 프로필 포함). */
  theses: AlumniThesis[];
  /** 아카이브 개념 id → 표시명(옵션). 없으면 개념 라벨은 생략된다. */
  conceptNameById?: Record<string, string>;
}

export interface CollectionRecOptions {
  limit?: number;
  minCollection?: number;
}

/** 토큰 종류별 가중 — 구조화 id(개념>변인·방법) 를 자유 텍스트보다 높게. */
const TOKEN_WEIGHT: Record<TokenKind, number> = {
  concept: 3,
  variable: 2,
  method: 2,
  textVar: 1.5,
  textMethod: 1.5,
  textSubject: 1,
};

type TokenKind =
  | "concept"
  | "variable"
  | "method"
  | "textVar"
  | "textMethod"
  | "textSubject";

interface Token {
  key: string; // 종류 프리픽스 포함 유니크 키
  kind: TokenKind;
  /** 사람이 읽을 라벨(있으면). concept 은 conceptNameById 로 해석. */
  label?: string;
  /** concept 토큰이면 개념 id. */
  conceptId?: string;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** 한 졸업논문에서 프로필/매칭 토큰을 추출. */
function tokensOf(t: AlumniThesis, conceptNameById?: Record<string, string>): Token[] {
  const out: Token[] = [];
  const push = (key: string, kind: TokenKind, label?: string, conceptId?: string) => {
    out.push({ key, kind, label, conceptId });
  };

  for (const id of t.conceptIds ?? []) {
    if (id) push(`c:${id}`, "concept", conceptNameById?.[id], id);
  }
  for (const id of t.variableIds ?? []) {
    if (id) push(`v:${id}`, "variable");
  }
  for (const id of [
    ...(t.researchMethodIds ?? []),
    ...(t.researchMethods ?? []),
    ...(t.statMethodIds ?? []),
    ...(t.statisticalMethods ?? []),
  ]) {
    if (id) push(`m:${id}`, "method");
  }
  // 자유 텍스트 분석 프로필(사람이 읽을 라벨을 그대로 씀)
  for (const v of [...(t.analysis?.independent ?? []), ...(t.analysis?.dependent ?? [])]) {
    const n = norm(v);
    if (n) push(`tv:${n}`, "textVar", v.trim());
  }
  for (const v of [...(t.analysis?.researchMethods ?? []), ...(t.analysis?.statMethods ?? [])]) {
    const n = norm(v);
    if (n) push(`tm:${n}`, "textMethod", v.trim());
  }
  for (const v of t.analysis?.subjects ?? []) {
    const n = norm(v);
    if (n) push(`ts:${n}`, "textSubject", v.trim());
  }
  return out;
}

/** 컬렉션 논문 편수(읽기 기록 + 읽기 리스트, 중복 제거)를 센다. */
function countCollection(readingLogs: PaperReadingLog[], readingListIds: string[]): number {
  const keys = new Set<string>();
  for (const l of readingLogs) {
    if (l.source === "alumni_thesis" && l.refId) keys.add(`t:${l.refId}`);
    else keys.add(`x:${norm(l.title ?? "") || l.id}`);
  }
  for (const id of readingListIds) if (id) keys.add(`t:${id}`);
  return keys.size;
}

/**
 * 읽기 컬렉션 기반 졸업논문 추천 (순수).
 * 컬렉션(읽은/저장한 졸업논문)의 방법·변인·개념 빈도 프로필로 아직 안 읽은
 * 졸업논문 중 프로필 유사도 상위 N편 + 관련 아카이브 개념 2~3개를 반환한다.
 */
export function recommendFromReadingCollection(
  input: CollectionRecInput,
  opts: CollectionRecOptions = {},
): CollectionRecommendation {
  const limit = Math.max(1, opts.limit ?? DEFAULT_REC_LIMIT);
  const minCollection = opts.minCollection ?? MIN_COLLECTION_SIZE;

  const readingLogs = Array.isArray(input.readingLogs) ? input.readingLogs : [];
  const readingListIds = Array.isArray(input.readingListIds) ? input.readingListIds : [];
  const theses = Array.isArray(input.theses) ? input.theses : [];
  const conceptNameById = input.conceptNameById;

  const collectionSize = countCollection(readingLogs, readingListIds);

  const empty = (
    status: CollectionRecommendation["status"],
    seedCount = 0,
  ): CollectionRecommendation => ({
    status,
    collectionSize,
    seedCount,
    items: [],
    relatedConcepts: [],
  });

  // 콜드스타트: 컬렉션이 얕으면 잔소리 대신 조용히 미노출.
  if (collectionSize < minCollection) return empty("cold");

  // ── 씨앗 졸업논문 id(읽은 것 중 alumni_thesis 연결분 ∪ 읽기 리스트) ──
  const seedIds = new Set<string>();
  for (const l of readingLogs) {
    if (l.source === "alumni_thesis" && l.refId) seedIds.add(l.refId);
  }
  for (const id of readingListIds) if (id) seedIds.add(id);
  if (seedIds.size === 0) return empty("empty");

  const byId = new Map(theses.map((t) => [t.id, t]));
  const seedTheses = [...seedIds].map((id) => byId.get(id)).filter((t): t is AlumniThesis => !!t);
  if (seedTheses.length === 0) return empty("empty");

  // ── 컬렉션 프로필: 토큰 빈도(가중은 매칭 단계에서) + 라벨 사전 ──
  const profileFreq = new Map<string, number>();
  const tokenMeta = new Map<string, { kind: TokenKind; label?: string; conceptId?: string }>();
  let profileTokenCount = 0;
  for (const t of seedTheses) {
    for (const tok of tokensOf(t, conceptNameById)) {
      profileFreq.set(tok.key, (profileFreq.get(tok.key) ?? 0) + 1);
      if (!tokenMeta.has(tok.key)) {
        tokenMeta.set(tok.key, { kind: tok.kind, label: tok.label, conceptId: tok.conceptId });
      }
      profileTokenCount += 1;
    }
  }
  if (profileTokenCount === 0) return empty("empty", seedTheses.length);

  // ── 후보(컬렉션 밖) 채점 — 공유 토큰의 (프로필 빈도 × 종류 가중) 합 ──
  type Scored = { thesis: AlumniThesis; score: number; overlapLabels: string[] };
  const scored: Scored[] = [];
  for (const t of theses) {
    if (seedIds.has(t.id)) continue;
    let score = 0;
    // 개념 라벨 > 변인/방법(구조화) > 텍스트 순으로 겹치는 요소 라벨 수집
    const labelBuckets: Record<"concept" | "structured" | "text", string[]> = {
      concept: [],
      structured: [],
      text: [],
    };
    const seenLabel = new Set<string>();
    for (const tok of tokensOf(t, conceptNameById)) {
      const freq = profileFreq.get(tok.key);
      if (!freq) continue;
      score += freq * TOKEN_WEIGHT[tok.kind];
      const meta = tokenMeta.get(tok.key);
      const label = tok.label ?? meta?.label;
      if (label && !seenLabel.has(label)) {
        seenLabel.add(label);
        if (tok.kind === "concept") labelBuckets.concept.push(label);
        else if (tok.kind === "variable" || tok.kind === "method") labelBuckets.structured.push(label);
        else labelBuckets.text.push(label);
      }
    }
    if (score <= 0) continue;
    const overlapLabels = [
      ...labelBuckets.concept,
      ...labelBuckets.structured,
      ...labelBuckets.text,
    ].slice(0, 3);
    scored.push({ thesis: t, score, overlapLabels });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.thesis.awardedYearMonth || "").localeCompare(a.thesis.awardedYearMonth || "");
  });
  const items = scored.slice(0, limit);
  if (items.length === 0) return empty("empty", seedTheses.length);

  // ── 관련 아카이브 개념 2~3개 — 추천 논문에 등장하는 내 프로필 개념을 빈도 가중 상위로 ──
  const recConceptWeight = new Map<string, number>();
  for (const it of items) {
    for (const id of it.thesis.conceptIds ?? []) {
      const key = `c:${id}`;
      const freq = profileFreq.get(key);
      if (!freq) continue; // 내 프로필에 있는 개념만
      recConceptWeight.set(id, (recConceptWeight.get(id) ?? 0) + freq);
    }
  }
  const relatedConcepts: RelatedConcept[] = [...recConceptWeight.entries()]
    .map(([id, weight]) => ({ id, weight, name: conceptNameById?.[id] ?? "" }))
    .filter((c) => c.name)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return {
    status: "ok",
    collectionSize,
    seedCount: seedTheses.length,
    items,
    relatedConcepts,
  };
}
