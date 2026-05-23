// ── 사용자 피드백 ──

export type FeedbackCategory =
  | "bug"
  | "ui"
  | "feature-request"
  | "performance"
  | "other";

export type FeedbackArea =
  | "dashboard"
  | "checklist"
  | "archive"
  | "activities"
  | "seminars"
  | "courses"
  | "notifications"
  | "settings"
  | "general";

export interface UserFeedback {
  id: string;
  userId?: string; // 익명 가능
  userName?: string;
  category: FeedbackCategory;
  area: FeedbackArea;
  title: string;
  body: string;
  email?: string; // 회신용 이메일 (선택)
  status?: "new" | "reviewed" | "in-progress" | "resolved";
  createdAt: string;
}
