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

import type { UserRole } from "@/types";

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
