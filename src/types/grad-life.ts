// ──────────── 대학원 생활 활동 이력 (Sprint 33) ────────────
// 전공대표 / 조교 / 학회장 / 학회 운영진 등 학기 단위(전기/후기) 활동 이력

export type GradLifeRole =
  | "major_rep"              // 전공대표
  | "ta"                     // 조교
  | "society_president"      // 학회장
  | "society_vice_president" // 학회 부회장
  | "society_staff"          // 학회 운영진
  | "student_advisor";       // 재학생 자문위원

export const GRAD_LIFE_ROLE_LABELS: Record<GradLifeRole, string> = {
  major_rep: "전공대표",
  ta: "조교",
  society_president: "학회장",
  society_vice_president: "학회 부회장",
  society_staff: "학회 운영진",
  student_advisor: "재학생 자문위원",
};

export const GRAD_LIFE_ROLE_COLORS: Record<GradLifeRole, string> = {
  major_rep: "bg-violet-50 text-violet-700 border-violet-200",
  ta: "bg-sky-50 text-sky-700 border-sky-200",
  society_president: "bg-amber-50 text-amber-700 border-amber-200",
  society_vice_president: "bg-amber-50 text-amber-700 border-amber-200",
  society_staff: "bg-emerald-50 text-emerald-700 border-emerald-200",
  student_advisor: "bg-rose-50 text-rose-700 border-rose-200",
};

/** "first" = 전기(3~8월), "second" = 후기(9월~익년 2월) — lib/semester.ts Semester와 동일 */
export type GradLifeSemester = "first" | "second";

export const GRAD_LIFE_SEMESTER_LABELS: Record<GradLifeSemester, string> = {
  first: "전기",
  second: "후기",
};

export interface GradLifePosition {
  id: string;
  /** 회원 ID */
  userId: string;
  /** 회원 이름 (denorm — 표시 안정성용) */
  userName?: string;
  role: GradLifeRole;
  /** 직책 상세(예: "교육공학회 학술팀장", "ㅇㅇ 교수님 조교", "교육공학전공 대표") */
  detail?: string;
  /** 시작 학기 */
  startYear: number;
  startSemester: GradLifeSemester;
  /** 종료 학기 — 미입력 시 진행중 */
  endYear?: number;
  endSemester?: GradLifeSemester;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
