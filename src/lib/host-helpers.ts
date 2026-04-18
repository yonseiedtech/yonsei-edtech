/**
 * Track 7: 호스트 권한 / 라벨 헬퍼
 * 활동(seminar/study/project/external)별 호스트 호칭과 권한 검증
 */

import type {
  Seminar,
  User,
  HostActivityType,
} from "@/types";
import { isAtLeast } from "@/lib/permissions";

export type HostRole = "speaker" | "host" | "pm" | "coordinator";

export interface HostRoleConfig {
  label: string;            // "연사" / "모임장" / "PM" / "운영자"
  activityType: HostActivityType;
  pageTitle: string;        // "연사 대시보드"
}

export const HOST_ROLE_CONFIG: Record<HostRole, HostRoleConfig> = {
  speaker:     { label: "연사",   activityType: "seminar",  pageTitle: "연사 대시보드" },
  host:        { label: "모임장", activityType: "study",    pageTitle: "모임장 대시보드" },
  pm:          { label: "PM",     activityType: "project",  pageTitle: "PM 대시보드" },
  coordinator: { label: "운영자", activityType: "external", pageTitle: "운영자 대시보드" },
};

/** 활동 유형 → 기본 호스트 역할 매핑 */
export function roleForActivity(type: HostActivityType): HostRole {
  switch (type) {
    case "seminar":  return "speaker";
    case "study":    return "host";
    case "project":  return "pm";
    case "external": return "coordinator";
  }
}

/** 세미나에 사용자가 호스트로 지정되어 있는지 */
export function isSeminarHost(seminar: Seminar | undefined | null, userId: string | undefined): boolean {
  if (!seminar || !userId) return false;
  return Array.isArray(seminar.hostUserIds) && seminar.hostUserIds.includes(userId);
}

/**
 * 호스트 대시보드 접근 권한:
 * - 호스트 본인
 * - staff / president / admin
 */
export function canAccessSeminarHostDashboard(
  seminar: Seminar | undefined | null,
  user: User | null,
): boolean {
  if (!user) return false;
  if (isAtLeast(user, "staff")) return true;
  return isSeminarHost(seminar, user.id);
}
