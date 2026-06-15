/**
 * Dashboard Phase D-4 — 프리셋 5종 정의.
 *
 * buildPresetLayout(preset) 으로 DashboardLayout 을 생성한 뒤
 * saveLayout 에 전달하면 즉시 적용된다.
 */

import type { DashboardLayout, DashboardWidgetKey } from "@/types/dashboard-layout";
import { DASHBOARD_WIDGET_KEYS } from "@/types/dashboard-layout";

export type DashboardPresetId =
  | "default"
  | "student"
  | "staff"
  | "research"
  | "minimal";

export interface DashboardPresetMeta {
  id: DashboardPresetId;
  label: string;
  description: string;
  icon: string; // emoji
}

export const DASHBOARD_PRESETS_META: Record<DashboardPresetId, DashboardPresetMeta> = {
  default: {
    id: "default",
    label: "기본",
    description: "모든 위젯 표시 + 기본 순서",
    icon: "🏠",
  },
  student: {
    id: "student",
    label: "학생 집중",
    description: "수업/할 일/학술활동 위주",
    icon: "🎓",
  },
  staff: {
    id: "staff",
    label: "운영진 집중",
    description: "운영 알림/통계 우선",
    icon: "🛠️",
  },
  research: {
    id: "research",
    label: "연구 집중",
    description: "학술활동/회고/복습 위주",
    icon: "🔬",
  },
  minimal: {
    id: "minimal",
    label: "미니멀",
    description: "핵심 3개만 (액션/할 일/타임라인)",
    icon: "✨",
  },
};

/**
 * 명시 order 배열에 누락된 위젯 키를 끝에 보충한다.
 * 신규 위젯 키 추가 시 모든 프리셋 배열을 일일이 수정하지 않아도
 * 편집 모드에서 제어 가능하도록 보장(누락 키는 끝에 hidden 으로 배치).
 */
function withMissingKeys(order: DashboardWidgetKey[]): DashboardWidgetKey[] {
  const present = new Set(order);
  return [...order, ...DASHBOARD_WIDGET_KEYS.filter((k) => !present.has(k))];
}

/** 프리셋별 위젯 visible + order 매트릭스 */
export function buildPresetLayout(preset: DashboardPresetId): DashboardLayout {
  const all = DASHBOARD_WIDGET_KEYS;
  const updatedAt = new Date().toISOString();

  switch (preset) {
    case "default":
      return {
        schemaVersion: 1,
        updatedAt,
        widgets: all.map((key, idx) => ({ key, visible: true, order: idx })),
      };

    case "student": {
      const studentOrder: DashboardWidgetKey[] = [
        "nextActionBanner",
        "dailyTimeline",
        "myTodos",
        "myAcademicActivities",
        "comprehensiveExam",
        "statCards",
        "notices",
        "miniCalendar",
        "dailyReflection",
        "spacedRepetition",
        "seminars",
        "aiForumLive",
        "peerActivityFeed",
        "staffAlerts",
      ];
      const studentVisible = new Set(studentOrder);
      return {
        schemaVersion: 1,
        updatedAt,
        widgets: withMissingKeys(studentOrder).map((key, idx) => ({
          key,
          visible: studentVisible.has(key) && key !== "staffAlerts",
          order: idx,
        })),
      };
    }

    case "staff": {
      const staffOrder: DashboardWidgetKey[] = [
        "staffAlerts",
        "nextActionBanner",
        "statCards",
        "notices",
        "myTodos",
        "dailyTimeline",
        "miniCalendar",
        "seminars",
        "aiForumLive",
        "peerActivityFeed",
        "myAcademicActivities",
        "comprehensiveExam",
        "dailyReflection",
        "spacedRepetition",
      ];
      const staffVisible = new Set(staffOrder);
      return {
        schemaVersion: 1,
        updatedAt,
        widgets: withMissingKeys(staffOrder).map((key, idx) => ({
          key,
          visible: staffVisible.has(key),
          order: idx,
        })),
      };
    }

    case "research": {
      const researchOrder: DashboardWidgetKey[] = [
        "nextActionBanner",
        "diagnosisReadiness",
        "myAcademicActivities",
        "spacedRepetition",
        "dailyReflection",
        "myTodos",
        "dailyTimeline",
        "comprehensiveExam",
        "statCards",
        "aiForumLive",
        "notices",
        "miniCalendar",
        "seminars",
        "peerActivityFeed",
        "staffAlerts",
      ];
      const researchVisible = new Set(researchOrder);
      const hidden = new Set<DashboardWidgetKey>(["staffAlerts", "peerActivityFeed"]);
      return {
        schemaVersion: 1,
        updatedAt,
        widgets: withMissingKeys(researchOrder).map((key, idx) => ({
          key,
          visible: researchVisible.has(key) && !hidden.has(key),
          order: idx,
        })),
      };
    }

    case "minimal": {
      const minimalVisible = new Set<DashboardWidgetKey>([
        "nextActionBanner",
        "myTodos",
        "dailyTimeline",
      ]);
      const minimalOrder: DashboardWidgetKey[] = [
        "nextActionBanner",
        "myTodos",
        "dailyTimeline",
        ...all.filter((k) => !minimalVisible.has(k)),
      ];
      return {
        schemaVersion: 1,
        updatedAt,
        widgets: minimalOrder.map((key, idx) => ({
          key,
          visible: minimalVisible.has(key),
          order: idx,
        })),
      };
    }
  }
}
