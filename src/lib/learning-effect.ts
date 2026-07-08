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
