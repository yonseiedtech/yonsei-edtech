/**
 * Dashboard Phase D-1 — 위젯 가시성 토글 데이터 모델 (Tier 1: localStorage).
 *
 * 사용자가 14개 대시보드 위젯의 노출 여부를 개별 토글로 제어.
 * 저장 위치: localStorage (Tier 1) — 추후 Firestore 동기화 시 schemaVersion 으로 마이그레이션.
 *
 * 참고: `src/features/dashboard/widget-visibility.ts` 의 `DashboardWidgetKey` 는
 *       역할 기반(STUDENT_ONLY) 5개 키로 별개 정책. 본 파일의 14개는 사용자 토글용 슈퍼셋이며,
 *       두 정책은 AND 게이트로 결합된다 (역할 가시성 통과 + 사용자 토글 ON).
 */

export type DashboardWidgetKey =
  | "nextActionBanner"
  | "dailyTimeline"
  | "myTodos"
  | "statCards"
  | "notices"
  | "miniCalendar"
  | "myAcademicActivities"
  | "comprehensiveExam"
  | "dailyReflection"
  | "aiForumLive"
  | "spacedRepetition"
  | "peerActivityFeed"
  | "seminars"
  | "staffAlerts";

export interface DashboardWidgetConfig {
  key: DashboardWidgetKey;
  visible: boolean;
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
  schemaVersion: 1;
  updatedAt: string;
}

export const DASHBOARD_WIDGET_META: Record<
  DashboardWidgetKey,
  { label: string; description: string }
> = {
  nextActionBanner: {
    label: "다음 액션 안내",
    description: "다가오는 일정·할 일을 모아 보여줍니다.",
  },
  dailyTimeline: {
    label: "일일 수업 타임라인",
    description: "오늘의 수업·미팅 시간표.",
  },
  myTodos: {
    label: "나의 할 일",
    description: "수업·연구·활동 통합 할 일.",
  },
  statCards: {
    label: "통계 카드",
    description: "내 글 수·뉴스레터 등 활동 통계.",
  },
  notices: {
    label: "공지사항",
    description: "최근 공지사항.",
  },
  miniCalendar: {
    label: "미니 캘린더",
    description: "월 단위 학사 일정.",
  },
  myAcademicActivities: {
    label: "학술활동",
    description: "내 참여 중인 스터디·프로젝트.",
  },
  comprehensiveExam: {
    label: "종합시험",
    description: "종합시험 일정·결과.",
  },
  dailyReflection: {
    label: "학습 회고",
    description: "오늘 학습 회고 작성.",
  },
  aiForumLive: {
    label: "AI 포럼 라이브",
    description: "최근 AI 포럼 글.",
  },
  spacedRepetition: {
    label: "간격 반복 학습",
    description: "복습 카드 추천.",
  },
  peerActivityFeed: {
    label: "동료 활동 피드",
    description: "다른 회원의 최근 활동.",
  },
  seminars: {
    label: "예정 세미나",
    description: "다가오는 세미나.",
  },
  staffAlerts: {
    label: "운영 알림",
    description: "운영진 전용 알림.",
  },
};

/** 모든 위젯 키 (UI 렌더 순서대로) */
export const DASHBOARD_WIDGET_KEYS: DashboardWidgetKey[] = [
  "nextActionBanner",
  "dailyTimeline",
  "myTodos",
  "statCards",
  "notices",
  "miniCalendar",
  "myAcademicActivities",
  "comprehensiveExam",
  "dailyReflection",
  "aiForumLive",
  "spacedRepetition",
  "peerActivityFeed",
  "seminars",
  "staffAlerts",
];
