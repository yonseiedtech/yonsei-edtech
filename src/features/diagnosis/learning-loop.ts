// ── 학습효과 증명루프 (진단↔복습 상관) — R4 (읽기·교차분석 전용) ──
//
// 사용자 의도: "노력이 결과로 이어졌는가"를 데이터로 증명한다.
//  (1) 약점 개념별 시계열 추세 — 여러 회차에서 같은 개념이 계속 약점으로 잡혔는가,
//      아니면 후속 회차에서 약점 목록에서 빠졌는가(=개선됨).
//  (2) 개인 학습효과 인사이트 — 약점 개념과 연결된 암기카드를 N회 복습했고,
//      재진단에서 그 개념이 약점 목록에서 빠졌다면 "복습 → 개선"의 증거로 제시한다.
//
// ⚠️ 채점·문항·복습 메타 계산 로직은 불변. 여기서는 저장된 DiagnosticResult(다회차)와
//    Flashcard(읽기) 를 순수 함수로 교차 집계할 뿐이다. 네트워크·쓰기 없음.
//
// DiagnosticResult 는 개념별 정오답 시계열을 직접 저장하지 않는다. 약점 신호는
//  weakConceptIds/weakConceptNames(그 회차에서 약점으로 잡힌 개념) 뿐이므로,
//  "개선" = 이전 회차 약점 → 이후 회차 약점 목록에서 사라짐 으로 정의한다(보수적).

import type { DiagnosticResult } from "@/types";
import type { Flashcard } from "@/types/flashcard";

/** 회차를 오래된→최신 순으로 정렬(시계열 분석용). createdAt 없으면 끝으로. */
export function sortResultsAsc(results: DiagnosticResult[]): DiagnosticResult[] {
  return [...results].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    return ta - tb;
  });
}

/** 한 회차에서 약점으로 잡힌 (id, name) 쌍 목록. id 우선, 없으면 name 으로 키. */
function weakEntries(r: DiagnosticResult): { key: string; name: string }[] {
  const ids = r.weakConceptIds ?? [];
  const names = r.weakConceptNames ?? [];
  const out: { key: string; name: string }[] = [];
  const seen = new Set<string>();
  // id 기준 (이름은 동일 index 에서 가져오되, 길이 불일치 가드)
  ids.forEach((id, i) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ key: id, name: names[i] ?? id });
  });
  // id 가 없는 회차(레거시)는 name 자체를 키로 사용
  if (ids.length === 0) {
    names.forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      out.push({ key: name, name });
    });
  }
  return out;
}

/** 개념별 약점 등장 추세 한 점 — 회차 라벨 + 그 회차에 약점이었는지. */
export interface ConceptTrendPoint {
  /** 회차 표시 라벨(날짜 또는 N회차) */
  label: string;
  /** 그 회차에서 이 개념이 약점으로 잡혔으면 true */
  weak: boolean;
  /** 그 회차에 이 개념을 평가했는지(약점이든 아니든) — 현재 데이터로는 약점 여부만 알 수 있어 항상 true 취급 보류용 */
  createdAt?: string;
}

/** 개념 단위 시계열 추세 — 약점 개념이 시간에 따라 개선됐는지. */
export interface ConceptTrend {
  conceptKey: string;
  conceptName: string;
  /** archive_concepts id (있을 때만 — name-only 레거시는 undefined). 아카이브 링크용. */
  conceptId?: string;
  /** 오래된→최신 순 등장 점들. */
  points: ConceptTrendPoint[];
  /** 처음 약점으로 잡힌 회차 index(0-base, asc 기준) */
  firstWeakIndex: number;
  /** 마지막으로 약점으로 잡힌 회차 index */
  lastWeakIndex: number;
  /** 약점으로 잡힌 총 횟수 */
  weakCount: number;
  /**
   * 개선 상태:
   *  - "resolved"   : 한 번 약점이었으나 이후 더 최신 회차에서 약점 목록에서 빠짐.
   *  - "persisting" : 가장 최신 회차에서도 여전히 약점.
   *  - "single"     : 약점 회차가 1건뿐(추세 판단 불가).
   */
  status: "resolved" | "persisting" | "single";
}

/**
 * 약점 개념별 시계열 추세 분석.
 * @param resultsAsc 오래된→최신 순으로 정렬된 회차들
 * @returns 약점으로 한 번이라도 잡힌 개념별 추세. 최근 약점 → 오래된 약점 순.
 */
export function analyzeConceptTrends(resultsAsc: DiagnosticResult[]): ConceptTrend[] {
  if (resultsAsc.length === 0) return [];

  // 회차별 라벨
  const labels = resultsAsc.map((r, i) => roundLabel(r, i));
  // 회차별 약점 키 집합
  const weakKeysPerRound = resultsAsc.map((r) => {
    const set = new Set<string>();
    for (const e of weakEntries(r)) set.add(e.key);
    return set;
  });

  // 개념 키 → 표시 이름 / id (최신 회차의 표기를 우선)
  const nameByKey = new Map<string, string>();
  const idByKey = new Map<string, string | undefined>();
  resultsAsc.forEach((r) => {
    const ids = r.weakConceptIds ?? [];
    for (const e of weakEntries(r)) {
      nameByKey.set(e.key, e.name);
      // key 가 id 였다면(=ids 에 포함) conceptId 로 사용
      idByKey.set(e.key, ids.includes(e.key) ? e.key : idByKey.get(e.key));
    }
  });

  const allKeys = [...nameByKey.keys()];
  const trends: ConceptTrend[] = allKeys.map((key) => {
    const points: ConceptTrendPoint[] = resultsAsc.map((r, i) => ({
      label: labels[i],
      weak: weakKeysPerRound[i].has(key),
      createdAt: r.createdAt,
    }));
    const weakIndices = points.map((p, i) => (p.weak ? i : -1)).filter((i) => i >= 0);
    const firstWeakIndex = weakIndices[0] ?? -1;
    const lastWeakIndex = weakIndices[weakIndices.length - 1] ?? -1;
    const weakCount = weakIndices.length;
    let status: ConceptTrend["status"];
    if (weakCount <= 1 && resultsAsc.length <= 1) {
      status = "single";
    } else if (lastWeakIndex < resultsAsc.length - 1) {
      // 마지막 회차에서는 약점이 아님 → 개선
      status = "resolved";
    } else {
      status = "persisting";
    }
    return {
      conceptKey: key,
      conceptName: nameByKey.get(key) ?? key,
      conceptId: idByKey.get(key),
      points,
      firstWeakIndex,
      lastWeakIndex,
      weakCount,
      status,
    };
  });

  // 정렬: 개선됨(resolved) 먼저(성취 부각) → persisting → 약점 빈도 높은 순
  const statusRank = { resolved: 0, persisting: 1, single: 2 } as const;
  return trends.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    return b.weakCount - a.weakCount;
  });
}

/** 회차 표시 라벨 — "5/14" 또는 "N회차". */
function roundLabel(r: DiagnosticResult, index: number): string {
  if (!r.createdAt) return `${index + 1}회차`;
  const d = new Date(r.createdAt);
  if (Number.isNaN(d.getTime())) return `${index + 1}회차`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── 복습 ↔ 재진단 상관 (개인 학습효과 인사이트) ──

/** 개념 단위 복습→개선 인사이트 한 건. */
export interface ReviewImpactInsight {
  conceptKey: string;
  conceptName: string;
  conceptId?: string;
  /** 이 개념과 연결된 암기카드의 누적 복습 횟수 합 */
  reviewCount: number;
  /** 이 개념과 연결된 암기카드의 누적 정답 횟수 합 */
  correctCount: number;
  /** 연결된 암기카드 장수 */
  cardCount: number;
  /**
   * 결과:
   *  - "improved"  : 복습 후 재진단에서 약점 목록에서 빠짐(개선 증거).
   *  - "reviewing" : 복습 중이나 가장 최신 회차에서도 아직 약점(계속 노력 중).
   */
  outcome: "improved" | "reviewing";
}

/** 복습 인사이트 요약(전체). */
export interface LearningLoopInsight {
  /** 개선된(복습→약점 해소) 개념 인사이트 목록 — improved 먼저, 복습량 많은 순 */
  insights: ReviewImpactInsight[];
  /** 개선으로 분류된 개념 수 */
  improvedCount: number;
  /** 복습 중(아직 약점) 개념 수 */
  reviewingCount: number;
  /** 전체 암기카드 누적 복습 횟수 합(복습 0 graceful 판정용) */
  totalReviews: number;
}

/**
 * 진단 다회차 × flashcard 복습 데이터 교차 분석 → 개인 학습효과 인사이트.
 *
 * 매칭 기준: flashcard.conceptId 가 약점 개념 추세의 conceptId(또는 key)와 같을 때.
 *  - reviewCount/correctCount 는 그 개념에 연결된 카드들의 합.
 *  - 개념이 추세상 "resolved"(이후 회차에서 약점 해소)면 outcome="improved",
 *    "persisting"이면 "reviewing".
 *
 * @param trends analyzeConceptTrends 결과
 * @param flashcards 본인 암기카드(읽기 전용)
 */
export function analyzeReviewImpact(
  trends: ConceptTrend[],
  flashcards: Flashcard[],
): LearningLoopInsight {
  // conceptId → 합산 복습 메타
  const byConcept = new Map<
    string,
    { reviewCount: number; correctCount: number; cardCount: number }
  >();
  let totalReviews = 0;
  for (const c of flashcards) {
    const review = c.reviewCount ?? 0;
    totalReviews += review;
    if (!c.conceptId) continue;
    const prev = byConcept.get(c.conceptId) ?? {
      reviewCount: 0,
      correctCount: 0,
      cardCount: 0,
    };
    prev.reviewCount += review;
    prev.correctCount += c.correctCount ?? 0;
    prev.cardCount += 1;
    byConcept.set(c.conceptId, prev);
  }

  const insights: ReviewImpactInsight[] = [];
  for (const t of trends) {
    // 개념 매칭: conceptId 우선, 없으면 key(=id-less 레거시는 매칭 불가)
    const matchId = t.conceptId ?? t.conceptKey;
    const meta = byConcept.get(matchId);
    if (!meta || meta.reviewCount <= 0) continue; // 복습 이력이 있어야 인사이트
    insights.push({
      conceptKey: t.conceptKey,
      conceptName: t.conceptName,
      conceptId: t.conceptId,
      reviewCount: meta.reviewCount,
      correctCount: meta.correctCount,
      cardCount: meta.cardCount,
      outcome: t.status === "resolved" ? "improved" : "reviewing",
    });
  }

  // improved 먼저 → 복습량 많은 순
  insights.sort((a, b) => {
    if (a.outcome !== b.outcome) return a.outcome === "improved" ? -1 : 1;
    return b.reviewCount - a.reviewCount;
  });

  return {
    insights,
    improvedCount: insights.filter((i) => i.outcome === "improved").length,
    reviewingCount: insights.filter((i) => i.outcome === "reviewing").length,
    totalReviews,
  };
}
