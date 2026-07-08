// 졸업요건 충족 계산 (순수 함수, UI 비의존)

import type { CourseCategory, CourseEnrollment, CourseOffering, ComprehensiveExamRecord } from "@/types";
import type { GraduationRequirement, GraduationProgress } from "@/types";

export interface CreditRuleProgress {
  key: string;
  label: string;
  earned: number;
  min: number;
  met: boolean;
  /** 합산에 잡힌 과목 (표시용) */
  courses: { name: string; credits: number; category: CourseCategory }[];
}

export interface MilestoneProgress {
  key: string;
  label: string;
  hint?: string;
  done: boolean;
  auto: boolean;
  note?: string;
}

export interface GraduationSummary {
  totalEarned: number;
  totalMin: number;
  totalMet: boolean;
  creditRules: CreditRuleProgress[];
  milestones: MilestoneProgress[];
  /** 전체 충족률 0~100 (학점규칙 + 관문을 균등가중 평균) */
  percent: number;
  allMet: boolean;
}

/**
 * 개인 졸업요건 진행 계산.
 * - 학점: 본인 수강(role=student/미지정, auditor 제외) → offering.credits 를 카테고리별 규칙에 합산.
 *   한 과목은 여러 규칙에 중복 합산될 수 있음(전공필수는 "전공" 규칙과 "전공필수" 규칙 양쪽).
 * - 관문: autoSource='comprehensive_exam' 이고 통과 레코드 있으면 자동 done, 아니면 수동 체크.
 */
export function computeGraduationProgress(
  req: GraduationRequirement,
  enrollments: CourseEnrollment[],
  offeringsById: Map<string, CourseOffering>,
  examRecords: ComprehensiveExamRecord[],
  progress: GraduationProgress | null,
): GraduationSummary {
  // 이수 과목(청강 제외) → offering 매핑, 중복 courseOfferingId 제거
  const takenOfferingIds = new Set<string>();
  for (const e of enrollments) {
    if (e.role === "auditor") continue;
    if (e.courseOfferingId) takenOfferingIds.add(e.courseOfferingId);
  }
  const taken: CourseOffering[] = [];
  for (const id of takenOfferingIds) {
    const o = offeringsById.get(id);
    if (o) taken.push(o);
  }

  const creditRules: CreditRuleProgress[] = req.creditRules.map((rule) => {
    const cats = new Set(rule.categories);
    const courses = taken
      .filter((o) => cats.has(o.category))
      .map((o) => ({ name: o.courseName, credits: o.credits ?? 0, category: o.category }));
    const earned = courses.reduce((s, c) => s + c.credits, 0);
    return { key: rule.key, label: rule.label, earned, min: rule.minCredits, met: earned >= rule.minCredits, courses };
  });

  const totalEarned = taken.reduce((s, o) => s + (o.credits ?? 0), 0);
  const totalMin = req.totalMinCredits;

  const hasPassedExam = examRecords.some((r) => r.status === "passed");
  const checks = progress?.milestoneChecks ?? {};
  const milestones: MilestoneProgress[] = req.milestones.map((m) => {
    if (m.autoSource === "comprehensive_exam") {
      const done = hasPassedExam || !!checks[m.key]?.done;
      return { key: m.key, label: m.label, hint: m.hint, done, auto: true, note: checks[m.key]?.note };
    }
    const c = checks[m.key];
    return { key: m.key, label: m.label, hint: m.hint, done: !!c?.done, auto: false, note: c?.note };
  });

  // 충족률: 총학점(1) + 각 학점규칙 + 각 관문을 항목으로 균등가중
  const items: boolean[] = [
    totalEarned >= totalMin,
    ...creditRules.map((r) => r.met),
    ...milestones.map((m) => m.done),
  ];
  const metCount = items.filter(Boolean).length;
  const percent = items.length > 0 ? Math.round((metCount / items.length) * 100) : 0;

  return {
    totalEarned,
    totalMin,
    totalMet: totalEarned >= totalMin,
    creditRules,
    milestones,
    percent,
    allMet: items.every(Boolean),
  };
}
