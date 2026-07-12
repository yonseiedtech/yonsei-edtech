// ── 학습효과 증명 루프 (R4 / G2) — 순수 계산 ──
//
// 진단(diagnostic_results) 다회차 × 암기카드(flashcards) 복습 데이터를 교차 분석해
// "복습한 약점 개념이 다음 진단에서 개선됐는가"를 개인 인사이트로 산출한다.
//
// 핵심 정의:
//  - 약점 개념: 어떤 회차 t 의 weakConceptIds (그 회차에서 틀린 문항의 conceptId).
//  - 복습(구간 내): 해당 conceptId 카드의 reviewCount>0 이고 lastReviewedAt 이
//    (t.createdAt, t+1.createdAt] 구간 안에 있을 때만 "복습함"으로 본다.
//    lastReviewedAt 이 구간 밖이면 reviewCount>0 이어도 보수적으로 "복습 불명" →
//    복습군에서 제외한다(과대주장 금지).
//  - 개선: 다음 회차 t+1 의 weakConceptIds 에 그 개념이 재등장하지 않으면 개선으로 본다.
//
// ⚠️ 인과 주장 금지 — 여기서는 "복습과 함께 개선됐는가(상관/경향)"만 판정한다.
//
// 데이터 부족(진단 1회 이하 · 약점 개념 0)이면 status="insufficient" 를 반환한다.

import type { DiagnosticResult } from "@/types/diagnostic";
import type { Flashcard } from "@/types/flashcard";

/** 개념 1건의 개선 판정 (여러 회차 쌍 중 가장 최근 관측을 대표로 사용). */
export interface ConceptEffectEntry {
  conceptId: string;
  conceptName: string;
  /** 해당 conceptId 카드의 누적 복습 횟수(표시용). reviewed=false 여도 0 이 아닐 수 있음. */
  reviewCount: number;
  /** 직전→다음 진단 구간 안에서 복습이 확인됐는가(lastReviewedAt 구간 내). */
  reviewed: boolean;
  /** 다음 진단에서 약점으로 재등장하지 않음 = 개선. */
  improved: boolean;
  /** 관측에 쓰인 직전 진단(t) createdAt. */
  fromDate?: string;
  /** 관측에 쓰인 다음 진단(t+1) createdAt. */
  toDate?: string;
}

/** 복습군 / 비복습군 개선율 집계 (개념 단위, 중복 제거). */
export interface LearningEffectAggregate {
  /** 복습이 확인된 약점 개념 중 개선된 수. */
  reviewedImproved: number;
  /** 복습이 확인된 약점 개념 수(표본). */
  reviewedTotal: number;
  /** 복습이 확인되지 않은 약점 개념 중 개선된 수. */
  notReviewedImproved: number;
  /** 복습이 확인되지 않은 약점 개념 수(표본). */
  notReviewedTotal: number;
}

export type LearningEffectStatus = "ok" | "insufficient";

export interface LearningEffectResult {
  status: LearningEffectStatus;
  /** insufficient 사유 (UI 안내용). */
  reason?: "need_two_diagnostics" | "no_weak_concepts";
  /** 개념별 판정 — 개선 먼저, 이어서 복습 여부·복습 횟수 순 정렬. */
  concepts: ConceptEffectEntry[];
  aggregate: LearningEffectAggregate;
}

/** createdAt 문자열 → epoch ms. 파싱 불가 시 NaN. */
function parseTime(iso: string | undefined): number {
  if (!iso) return NaN;
  return Date.parse(iso);
}

/**
 * 학습효과 계산 — 진단 다회차와 암기카드 복습을 교차 분석.
 * @param results 본인 진단 결과들 (정렬 무관 — 내부에서 createdAt 오름차순 정렬).
 * @param cards   본인 암기카드들.
 */
export function computeLearningEffect(
  results: DiagnosticResult[],
  cards: Flashcard[],
): LearningEffectResult {
  const emptyAggregate: LearningEffectAggregate = {
    reviewedImproved: 0,
    reviewedTotal: 0,
    notReviewedImproved: 0,
    notReviewedTotal: 0,
  };

  // 진단 2회 미만이면 연속 쌍(t, t+1)을 만들 수 없다.
  if (!Array.isArray(results) || results.length < 2) {
    return { status: "insufficient", reason: "need_two_diagnostics", concepts: [], aggregate: emptyAggregate };
  }

  // createdAt 오름차순 정렬 (과거 → 최신). createdAt 없는 결과는 뒤로.
  const sorted = [...results].sort((a, b) => {
    const ta = parseTime(a.createdAt);
    const tb = parseTime(b.createdAt);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });

  // conceptId → 카드 (reviewCount>0 인 것 우선). 여러 카드가 같은 개념이면 복습 많은 것 채택.
  const cardByConcept = new Map<string, Flashcard>();
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c.conceptId) continue;
    const prev = cardByConcept.get(c.conceptId);
    if (!prev || (c.reviewCount ?? 0) > (prev.reviewCount ?? 0)) {
      cardByConcept.set(c.conceptId, c);
    }
  }

  // 개념별 최신 관측 (뒤쪽 쌍이 덮어써 최신 관측을 대표로 사용).
  const byConcept = new Map<string, ConceptEffectEntry>();

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const t = sorted[i];
    const next = sorted[i + 1];
    const tTime = parseTime(t.createdAt);
    const nextTime = parseTime(next.createdAt);

    const weakIds = Array.isArray(t.weakConceptIds) ? t.weakConceptIds : [];
    const weakNames = Array.isArray(t.weakConceptNames) ? t.weakConceptNames : [];
    const nextWeak = new Set(Array.isArray(next.weakConceptIds) ? next.weakConceptIds : []);

    weakIds.forEach((conceptId, idx) => {
      if (!conceptId) return;
      const card = cardByConcept.get(conceptId);
      const reviewCount = card?.reviewCount ?? 0;

      // 구간 내 복습 판정 — lastReviewedAt 이 (tTime, nextTime] 안에 있어야 "복습함".
      // 시각 파싱 불가(구간 경계 미상)면 보수적으로 복습 불명 → 비복습군.
      const lr = parseTime(card?.lastReviewedAt ?? undefined);
      const reviewed =
        reviewCount > 0 &&
        !Number.isNaN(lr) &&
        !Number.isNaN(tTime) &&
        !Number.isNaN(nextTime) &&
        lr > tTime &&
        lr <= nextTime;

      const improved = !nextWeak.has(conceptId);

      byConcept.set(conceptId, {
        conceptId,
        conceptName: weakNames[idx] || conceptId,
        reviewCount,
        reviewed,
        improved,
        fromDate: t.createdAt,
        toDate: next.createdAt,
      });
    });
  }

  if (byConcept.size === 0) {
    return { status: "insufficient", reason: "no_weak_concepts", concepts: [], aggregate: emptyAggregate };
  }

  // 정렬: 개선 먼저 → 복습 확인된 것 먼저 → 복습 횟수 많은 것 먼저 → 이름.
  const concepts = [...byConcept.values()].sort((a, b) => {
    if (a.improved !== b.improved) return a.improved ? -1 : 1;
    if (a.reviewed !== b.reviewed) return a.reviewed ? -1 : 1;
    if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
    return a.conceptName.localeCompare(b.conceptName);
  });

  const aggregate: LearningEffectAggregate = { ...emptyAggregate };
  for (const c of concepts) {
    if (c.reviewed) {
      aggregate.reviewedTotal += 1;
      if (c.improved) aggregate.reviewedImproved += 1;
    } else {
      aggregate.notReviewedTotal += 1;
      if (c.improved) aggregate.notReviewedImproved += 1;
    }
  }

  return { status: "ok", concepts, aggregate };
}

/** 개선율(%) — total 0 이면 null(표시 보류). */
export function improvementRate(improved: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((improved / total) * 100);
}

// ── 개념별 재진단 향상 추세 (R4 심화 / G2) — 정답률 % 시계열 ──
//
// computeLearningEffect 는 "약점 재등장 여부"의 이진 판정이었다. 여기서는 같은 개념을
// 여러 번 진단했을 때의 "정답률 % 추세"(첫 진단 → 최근)와 복습 교차(상관)를 산출한다.
//
// 회차별 개념 판정(정확·honest — 분모를 지어내지 않는다):
//  - tested   : 그 회차 정답 문항 중 이 개념 문항이 있거나(correctQuestionIds→concept),
//               약점 개념(weakConceptIds)에 포함 → "이 개념이 출제된 회차".
//  - mastered : tested 이면서 그 회차 약점에 없음(= 틀린 문항 없음) → "완전 정답".
//  정답률(%)  : mastered 회차 수 / tested 회차 수 × 100. tested 회차를 시간순으로 앞/뒤
//               절반으로 나눠 firstRate → recentRate, 변화량(deltaPp)을 낸다.
//
// 복습 교차(상관): 이 개념 카드의 누적 복습 횟수와, 첫~최근 tested 구간 내 복습 여부.
// ⚠️ 인과 금지 — "복습 후 향상됐어요"(상관)까지만. "복습 덕분에" 금지.

/** questionId → 이 문항이 다루는 아카이브 개념(weakConceptIds 와 같은 id 체계). 미매핑은 undefined. */
export type QuestionConceptResolver = (
  questionId: string,
) => { id: string; name: string } | undefined;

/** 개념 1건의 정답률 % 추세 + 복습 교차. */
export interface ConceptImprovementEntry {
  conceptId: string;
  conceptName: string;
  /** 이 개념이 출제된 회차 수(재진단 포함). */
  testedCount: number;
  /** 앞 절반 회차의 정답률(%). */
  firstRate: number;
  /** 뒤 절반 회차의 정답률(%). */
  recentRate: number;
  /** recentRate − firstRate (%p). 양수=향상, 음수=하락, 0=유지. */
  deltaPp: number;
  /** 이 개념 카드의 누적 복습 횟수(여러 카드 합산, 표시용). */
  reviewCount: number;
  /** 첫~최근 tested 구간(첫 회차 이후, 최근 회차 이하)에 복습 기록이 있었는가. */
  reviewedInWindow: boolean;
  /** 앞 절반 대표 회차(가장 이른 tested) createdAt. */
  firstDate?: string;
  /** 뒤 절반 대표 회차(가장 최근 tested) createdAt. */
  recentDate?: string;
}

export interface ConceptImprovementResult {
  status: "ok" | "insufficient";
  /** insufficient 사유 (UI 안내용). */
  reason?: "need_two_diagnostics" | "no_repeated_concepts";
  /** 개념별 추세 — 향상 큰 순 → 복습 있는 것 → 회차 많은 것 → 이름. */
  concepts: ConceptImprovementEntry[];
  /** deltaPp>0 (향상)된 개념 수. */
  improvedCount: number;
  /** 향상되고 구간 내 복습 기록도 있는 개념 수(상관 강조용). */
  improvedWithReviewCount: number;
}

interface ConceptRoundStatus {
  time: number;
  date?: string;
  mastered: boolean;
}

/**
 * 개념별 재진단 향상 추세 계산 — 진단 다회차 × 암기카드 복습 교차.
 * @param results 본인 진단 결과들 (정렬 무관 — 내부에서 createdAt 오름차순 정렬).
 * @param cards   본인 암기카드들.
 * @param resolveQuestionConcept correctQuestionIds 의 문항 id → 개념 해석기 (풀+개념으로 구성).
 */
export function computeConceptImprovement(
  results: DiagnosticResult[],
  cards: Flashcard[],
  resolveQuestionConcept: QuestionConceptResolver,
): ConceptImprovementResult {
  const empty: ConceptImprovementResult = {
    status: "insufficient",
    reason: "need_two_diagnostics",
    concepts: [],
    improvedCount: 0,
    improvedWithReviewCount: 0,
  };

  // 진단 2회 미만이면 같은 개념의 재진단(추세)이 있을 수 없다.
  if (!Array.isArray(results) || results.length < 2) return empty;

  const sorted = [...results].sort((a, b) => {
    const ta = parseTime(a.createdAt);
    const tb = parseTime(b.createdAt);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });

  const nameById = new Map<string, string>();
  const roundsByConcept = new Map<string, ConceptRoundStatus[]>();

  for (const r of sorted) {
    const time = parseTime(r.createdAt);
    const weakIds = Array.isArray(r.weakConceptIds) ? r.weakConceptIds : [];
    const weakNames = Array.isArray(r.weakConceptNames) ? r.weakConceptNames : [];
    weakIds.forEach((cid, i) => {
      if (cid && weakNames[i] && !nameById.has(cid)) nameById.set(cid, weakNames[i]);
    });
    const weakSet = new Set(weakIds.filter(Boolean));

    // 이 회차에 출제된(tested) 개념 = 정답 문항→개념 ∪ 약점 개념.
    const testedIds = new Set<string>(weakSet);
    for (const qid of Array.isArray(r.correctQuestionIds) ? r.correctQuestionIds : []) {
      const c = resolveQuestionConcept(qid);
      if (c?.id) {
        testedIds.add(c.id);
        if (!nameById.has(c.id)) nameById.set(c.id, c.name);
      }
    }

    for (const cid of testedIds) {
      const mastered = !weakSet.has(cid); // tested & 약점 아님 = 그 회차 완전 정답
      const arr = roundsByConcept.get(cid) ?? [];
      arr.push({ time, date: r.createdAt, mastered });
      roundsByConcept.set(cid, arr);
    }
  }

  // 개념별 누적 복습 횟수 + 마지막 복습 시각(여러 카드 합산/최댓값).
  const reviewByConcept = new Map<string, { reviewCount: number; lastReviewedAt: number }>();
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c.conceptId) continue;
    const prev = reviewByConcept.get(c.conceptId) ?? { reviewCount: 0, lastReviewedAt: NaN };
    const lr = parseTime(c.lastReviewedAt ?? undefined);
    reviewByConcept.set(c.conceptId, {
      reviewCount: prev.reviewCount + (c.reviewCount ?? 0),
      lastReviewedAt: Number.isNaN(prev.lastReviewedAt)
        ? lr
        : Number.isNaN(lr)
          ? prev.lastReviewedAt
          : Math.max(prev.lastReviewedAt, lr),
    });
  }

  const rate = (rs: ConceptRoundStatus[]): number =>
    rs.length === 0 ? 0 : Math.round((rs.filter((x) => x.mastered).length / rs.length) * 100);

  const entries: ConceptImprovementEntry[] = [];
  for (const [cid, roundsRaw] of roundsByConcept) {
    const rounds = [...roundsRaw].sort((a, b) => a.time - b.time);
    if (rounds.length < 2) continue; // 재진단 없으면 추세 불가 — 제외.
    const n = rounds.length;
    const mid = Math.floor(n / 2);
    const firstRate = rate(rounds.slice(0, mid));
    const recentRate = rate(rounds.slice(mid));
    const agg = reviewByConcept.get(cid);
    const firstTime = rounds[0].time;
    const lastTime = rounds[n - 1].time;
    const reviewedInWindow =
      !!agg &&
      !Number.isNaN(agg.lastReviewedAt) &&
      !Number.isNaN(firstTime) &&
      !Number.isNaN(lastTime) &&
      agg.lastReviewedAt > firstTime &&
      agg.lastReviewedAt <= lastTime;

    entries.push({
      conceptId: cid,
      conceptName: nameById.get(cid) ?? cid,
      testedCount: n,
      firstRate,
      recentRate,
      deltaPp: recentRate - firstRate,
      reviewCount: agg?.reviewCount ?? 0,
      reviewedInWindow,
      firstDate: rounds[0].date,
      recentDate: rounds[n - 1].date,
    });
  }

  if (entries.length === 0) {
    return { ...empty, reason: "no_repeated_concepts" };
  }

  entries.sort((a, b) => {
    if (b.deltaPp !== a.deltaPp) return b.deltaPp - a.deltaPp;
    if (a.reviewedInWindow !== b.reviewedInWindow) return a.reviewedInWindow ? -1 : 1;
    if (b.testedCount !== a.testedCount) return b.testedCount - a.testedCount;
    return a.conceptName.localeCompare(b.conceptName);
  });

  const improvedCount = entries.filter((e) => e.deltaPp > 0).length;
  const improvedWithReviewCount = entries.filter(
    (e) => e.deltaPp > 0 && e.reviewedInWindow,
  ).length;

  return { status: "ok", concepts: entries, improvedCount, improvedWithReviewCount };
}
