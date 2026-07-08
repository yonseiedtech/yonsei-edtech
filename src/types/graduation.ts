// ── 졸업요건 체크표 (2026-07-07) ──
// 운영진이 설정하는 요구사항(단일 문서) + 개인 충족 추적. 학점은 수강이력 자동 카운트,
// 관문(종합시험·논문 등)은 자동 판정 가능하면 자동, 아니면 본인/운영진 수동 체크.

import type { CourseCategory } from "./courses";

/** 학점 규칙 1건 — 특정 카테고리 묶음의 최소 이수학점 */
export interface CreditRule {
  key: string;
  label: string;
  /** 이 규칙에 합산할 과목 카테고리 (예: 전공필수+전공선택) */
  categories: CourseCategory[];
  minCredits: number;
}

/** 관문(비학점) 요구 1건 */
export interface GraduationMilestone {
  key: string;
  label: string;
  hint?: string;
  /** 자동 판정 소스 — 'comprehensive_exam'(통과 레코드 존재 시 자동 done). 없으면 수동 체크 */
  autoSource?: "comprehensive_exam";
}

/** 졸업요건 설정 — graduation_requirements/{id}, 기본 문서 id="default". staff 편집. */
export interface GraduationRequirement {
  id: string;
  programLabel: string;
  creditRules: CreditRule[];
  /** 총 최소 이수학점 (카테고리 무관 합) */
  totalMinCredits: number;
  milestones: GraduationMilestone[];
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** 개인 관문 체크 — graduation_progress/{userId}. 본인/staff write. */
export interface GraduationProgress {
  userId: string;
  /** milestoneKey → 수동 체크 상태 */
  milestoneChecks: Record<string, { done: boolean; note?: string; updatedAt?: string }>;
  updatedAt?: string;
}

// ── 합리적 기본값 (운영진이 콘솔에서 수정) ──
export const DEFAULT_GRADUATION_REQUIREMENT: Omit<GraduationRequirement, "id"> = {
  programLabel: "교육공학전공 석사",
  totalMinCredits: 30,
  creditRules: [
    { key: "major", label: "전공(필수+선택)", categories: ["major_required", "major_elective"], minCredits: 21 },
    { key: "major_required", label: "전공필수", categories: ["major_required"], minCredits: 9 },
    { key: "research", label: "연구·논문지도", categories: ["research"], minCredits: 3 },
  ],
  milestones: [
    { key: "comprehensive_exam", label: "종합시험 통과", autoSource: "comprehensive_exam", hint: "응시 기록이 '통과'면 자동 반영" },
    { key: "thesis_proposal", label: "연구계획서 심사(예심) 통과" },
    { key: "thesis_defense", label: "논문 심사(본심) 통과" },
    { key: "language", label: "외국어 요건 충족", hint: "해당 시 체크" },
  ],
  note: "정확한 요건은 소속 대학원 학사규정·지도교수 안내를 우선합니다. 이 표는 참고용 자기점검 도구입니다.",
};
