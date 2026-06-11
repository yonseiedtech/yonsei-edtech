/**
 * Dashboard Phase D-1/D-2 — 위젯 가시성 토글 + 순서 변경 데이터 모델 (Tier 1: localStorage).
 *
 * 사용자가 14개 대시보드 위젯의 노출 여부와 표시 순서를 제어.
 * 저장 위치: localStorage (Tier 1) — 추후 Firestore 동기화 시 schemaVersion 으로 마이그레이션.
 *
 * 참고: `src/features/dashboard/widget-visibility.ts` 의 `DashboardWidgetKey` 는
 *       역할 기반(STUDENT_ONLY) 5개 키로 별개 정책. 본 파일의 14개는 사용자 토글용 슈퍼셋이며,
 *       두 정책은 AND 게이트로 결합된다 (역할 가시성 통과 + 사용자 토글 ON).
 *
 * D-2 변경: DashboardWidgetConfig 에 `order` 필드 추가 + DEFAULT_DASHBOARD_LAYOUT 헬퍼.
 *   실제 dashboard/page.tsx 렌더 순서 반영은 D-2b 에서 수행 (옵션 B).
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
  /** 0-based 사용자 정의 순서 (D-2). 낮을수록 위에 표시. */
  order: number;
  /** 위젯별 토스트/알림 무음 여부 (D-3). true = 알림 끔. */
  mutedNotifications?: boolean;
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

/** 모든 위젯 키 (기본 렌더 순서대로) */
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

/**
 * 체감 스프린트 (2026-06-11): 기본 노출 위젯 다이어트 14 → 8.
 * "매일 봐야 할 것"(액션·일정·할 일·공지·세미나·활동) 중심으로 기본 ON,
 * 통계·회고·포럼·복습·피드·종합시험은 기본 OFF — 편집 모드에서 언제든 켤 수 있음.
 * 저장된 사용자 레이아웃에는 영향 없음 (기본값만 변경).
 */
export const DEFAULT_VISIBLE_WIDGETS: Set<DashboardWidgetKey> = new Set([
  "nextActionBanner",
  "dailyTimeline",
  "myTodos",
  "notices",
  "miniCalendar",
  "myAcademicActivities",
  "seminars",
  "staffAlerts", // 역할 게이트로 운영진에게만 표시됨
]);

/** 핵심 위젯만 visible=true, order=인덱스인 기본 레이아웃 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  schemaVersion: 1,
  updatedAt: "",
  widgets: DASHBOARD_WIDGET_KEYS.map((key, idx) => ({
    key,
    visible: DEFAULT_VISIBLE_WIDGETS.has(key),
    order: idx,
  })),
};

/**
 * D-3: 알림(토스트·폴링·배너)을 가진 위젯만 열거.
 * 이 목록에 있는 위젯만 설정 페이지에서 "알림 끄기" 토글이 노출됨.
 */
export const DASHBOARD_NOTIFIABLE_WIDGETS: DashboardWidgetKey[] = [
  "peerActivityFeed",   // 피드 새 글 알림
  "aiForumLive",        // 새 글 폴링·알림
  "seminars",           // 예정 알림
  "nextActionBanner",   // 액션 알림
  "staffAlerts",        // 운영 알림
];

/** D-3: 해당 위젯이 알림 설정 대상인지 확인 */
export function isNotifiableWidget(key: DashboardWidgetKey): boolean {
  return DASHBOARD_NOTIFIABLE_WIDGETS.includes(key);
}
