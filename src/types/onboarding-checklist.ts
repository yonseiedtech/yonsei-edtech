// ────────────────────────────────────────────────────────────
// onboarding-checklist.ts — 시작하기 체크리스트 (운영진 콘솔 편집)
//
// 대시보드 NewMemberChecklistWidget 의 항목 5개가 코드 하드코딩이었던 것을
// Firestore onboarding_checklist 컬렉션으로 분리하여 운영진이 콘솔에서
// 추가/삭제/순서/라벨/링크/완료조건을 편집할 수 있게 한다.
// ────────────────────────────────────────────────────────────

/**
 * 항목의 "완료" 판정 방식. 위젯이 이 값을 보고 사용자별 데이터 fetch / 평가.
 *  - profile.bio                 → user.bio 비어있지 않음
 *  - profile.researchInterests   → user.researchInterests / interestKeywords 1개 이상
 *  - profile.image               → user.photoURL 비어있지 않음 (향후 재활용 여지)
 *  - visited.activities          → localStorage 방문 기록 OR activityParticipations 1건+
 *  - visited.archive             → localStorage 방문 기록
 *  - visited.research            → localStorage 방문 기록
 *  - attended.seminar            → seminar_attendees checkedIn=true 1건+
 *  - favorited.archive           → archive_favorites 1건+
 *  - participated.activity       → activity_participations 1건+
 *  - submitted.research          → research_reports 1건+
 *  - wrote.lectureReview         → course_reviews 1건+
 */
export type ChecklistCompletionType =
  | "profile.bio"
  | "profile.researchInterests"
  | "profile.image"
  | "visited.activities"
  | "visited.archive"
  | "visited.research"
  | "attended.seminar"
  | "favorited.archive"
  | "participated.activity"
  | "submitted.research"
  | "wrote.lectureReview"
  | "set.thesisJourneyStage"
  | "participated.commBoard";

export const CHECKLIST_COMPLETION_LABELS: Record<ChecklistCompletionType, string> = {
  "profile.bio": "프로필 자기소개 작성",
  "profile.researchInterests": "프로필 관심분야 선택",
  "profile.image": "프로필 사진 등록",
  "visited.activities": "학술활동 페이지 방문",
  "visited.archive": "아카이브 페이지 방문",
  "visited.research": "연구 페이지 방문",
  "attended.seminar": "세미나 1회 출석",
  "favorited.archive": "아카이브 즐겨찾기 1편",
  "participated.activity": "학술활동 참여 1건",
  "submitted.research": "연구보고서 작성 1건",
  "wrote.lectureReview": "강의 후기 작성 1건",
  "set.thesisJourneyStage": "논문 여정 단계 설정",
  "participated.commBoard": "소통 보드 질문/답변 1건",
};

/** 위젯에서 렌더 가능한 lucide 아이콘 화이트리스트. */
export type ChecklistIcon =
  | "PenSquare"
  | "Heart"
  | "Users"
  | "CalendarCheck"
  | "Star"
  | "Camera"
  | "BookOpen"
  | "FileText"
  | "GraduationCap"
  | "Sparkles";

export const CHECKLIST_ICONS: ChecklistIcon[] = [
  "PenSquare",
  "Heart",
  "Users",
  "CalendarCheck",
  "Star",
  "Camera",
  "BookOpen",
  "FileText",
  "GraduationCap",
  "Sparkles",
];

/** 항목 우선순위. 위젯에서 정렬·강조 표시에 사용. 기본값 medium. */
export type ChecklistPriority = "high" | "medium" | "low";

export const CHECKLIST_PRIORITIES: ChecklistPriority[] = ["high", "medium", "low"];

export const CHECKLIST_PRIORITY_LABELS: Record<ChecklistPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export interface OnboardingChecklistItem {
  id: string;
  /** 정렬용 (0 ~ N). 콘솔에서 ↑↓ 버튼으로 swap. */
  order: number;
  /** 위젯에 보일 한국어 라벨. */
  label: string;
  /** 미완료 항목 클릭 시 이동 경로. */
  href: string;
  /** 위젯에 보일 lucide 아이콘 이름 (whitelist). */
  icon: ChecklistIcon;
  /** 완료 판정 방식. */
  completionType: ChecklistCompletionType;
  /** false 면 위젯에 미노출. */
  enabled: boolean;
  /** 항목 우선순위. 미완료 항목 정렬·강조에 사용. 기본 medium. */
  priority?: ChecklistPriority;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}
