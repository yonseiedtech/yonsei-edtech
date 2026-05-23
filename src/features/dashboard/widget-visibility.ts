/**
 * 대시보드 위젯 페르소나별 노출 가시성 (dashboard-persona-redesign Sprint 2 / F1)
 *
 * 핵심 원칙:
 *  - 재학생 (member·staff·president·admin·sysadmin) 은 모든 학사 위젯 노출
 *  - 졸업생 (alumni) 은 학사 위젯 비노출 (수업·종합시험·할일은 졸업 후 무의미)
 *  - 자문위원 (advisor) 은 학사 위젯 비노출, 운영·세미나·뉴스레터 중심
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §3 ★K, dashboard-persona-redesign.plan.md §2 F1
 */

import type { User, UserRole } from "@/types";

export type DashboardWidgetKey =
  /** 학사일정 진행바 (학기 진행도) */
  | "academicCalendar"
  /** 오늘의 수업 — 일일 타임라인 */
  | "dailyClassTimeline"
  /** 나의 할 일 — 수업·연구·학술·운영 통합 */
  | "myTodos"
  /** 종합시험 D-day */
  | "comprehensiveExam"
  /** 참여 중인 학술활동 (Track 2 포트폴리오) */
  | "myAcademicActivities";

/**
 * 학사 컨텍스트 위젯 — 재학생 전용.
 * advisor·alumni 는 노출 제외 (졸업·외부 신분이므로 학사 진행 위젯이 의미 없음).
 */
const STUDENT_ONLY_WIDGETS: Set<DashboardWidgetKey> = new Set([
  "academicCalendar",
  "dailyClassTimeline",
  "myTodos",
  "comprehensiveExam",
  "myAcademicActivities",
]);

const NON_STUDENT_ROLES: UserRole[] = ["alumni", "advisor"];

export function canShowWidget(role: UserRole, key: DashboardWidgetKey): boolean {
  if (STUDENT_ONLY_WIDGETS.has(key) && NON_STUDENT_ROLES.includes(role)) {
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Persona helpers (Phase C — 퍼소나별 분기)
// 기존 isStaff / STUDENT_ONLY_WIDGETS / NON_STUDENT_ROLES 는 그대로 유지하고,
// 4종 퍼소나(undergrad / grad / alumni / staff / guest) 분류 헬퍼만 신규 추가.
// 현재 yonsei-edtech 회원은 모두 대학원생이므로 학부생(undergrad)은 게스트 라우트 한정.
// ─────────────────────────────────────────────────────────────

export type UserPersona = "undergrad" | "grad" | "alumni" | "staff" | "guest";

/** staff 이상 역할 (운영진/회장/admin/sysadmin) */
const STAFF_ROLES: ReadonlySet<UserRole> = new Set([
  "staff",
  "president",
  "admin",
  "sysadmin",
]);

/**
 * 사용자 퍼소나 판별.
 *
 * 우선순위:
 *  1. user 없음 → "guest"
 *  2. staff 이상 → "staff" (학생/졸업생이어도 운영진 권한이 우선)
 *  3. role === "alumni" OR enrollmentStatus === "graduated" → "alumni"
 *  4. advisor / 기타 → "grad" (대학원생 기본값)
 *
 * NOTE: 현재 학회는 교육대학원 회원만 대상. 학부생 케이스가 생기면 별도 필드로 분기.
 */
export function getUserPersona(user: User | null | undefined): UserPersona {
  if (!user) return "guest";
  if (STAFF_ROLES.has(user.role)) return "staff";
  if (user.role === "alumni") return "alumni";
  if (user.enrollmentStatus === "graduated") return "alumni";
  return "grad";
}

/**
 * 졸업생 여부 — Alumni 전용 콘텐츠 가드용 헬퍼.
 * staff 이상은 alumni 신분이어도 운영진 위젯이 우선이므로 false 반환.
 */
export function isAlumni(user: User | null | undefined): boolean {
  return getUserPersona(user) === "alumni";
}
