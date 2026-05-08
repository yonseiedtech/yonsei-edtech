/**
 * 학술대회 워크북 도메인 (Sprint 67-F)
 *
 * 운영진이 참여자에게 과제를 부여하고, 참여자는 체크리스트·후기 형태로 수행한다.
 * - ConferenceWorkbookTask: 운영진이 정의한 과제
 * - ConferenceWorkbookSubmission: 참여자별 과제 제출
 * - ConferenceWorkbookReview: 학술대회 전체에 대한 참여 후기 (선택)
 */

export type WorkbookTaskType =
  | "checkbox" // 단순 체크
  | "text" // 짧은 한 줄
  | "long_text" // 긴 텍스트 (분석/요약)
  | "rating" // 1-5 별점
  | "photo"; // 사진 업로드

export interface ConferenceWorkbookTask {
  id: string;
  activityId: string;
  programId?: string;
  title: string;
  description?: string;
  type: WorkbookTaskType;
  required: boolean;
  /** 마감 일시 (선택) */
  dueAt?: string;
  /** 표시 순서 */
  order: number;
  /** 참여자에게 활성/비활성 (운영진이 임시 숨김 가능) */
  active: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type WorkbookSubmissionStatus = "pending" | "in_progress" | "completed";

export interface ConferenceWorkbookSubmission {
  /** {userId}_{taskId} 권장 */
  id: string;
  userId: string;
  userName?: string;
  taskId: string;
  activityId: string;
  status: WorkbookSubmissionStatus;
  /** type=checkbox 일 때 — 완료 여부 */
  checked?: boolean;
  /** type=text/long_text 일 때 */
  text?: string;
  /** type=rating 일 때 (1-5) */
  rating?: number;
  /** type=photo 일 때 */
  photoUrl?: string;
  /** 운영진 피드백 */
  feedback?: string;
  feedbackBy?: string;
  feedbackByName?: string;
  feedbackAt?: string;
  submittedAt?: string;
  updatedAt: string;
}

export interface ConferenceWorkbookReview {
  /** {userId}_{activityId} 권장 */
  id: string;
  userId: string;
  userName?: string;
  activityId: string;
  /** 학술대회 전체 후기 (자유 기술) */
  overallReview: string;
  /** 가장 인상 깊었던 점 (bullet) */
  highlights?: string[];
  /** 운영진에게 제안 */
  suggestions?: string[];
  /** 1-5 별점 (학술대회 전반 만족도) */
  rating?: number;
  submittedAt: string;
  updatedAt?: string;
}

export const WORKBOOK_TASK_TYPE_LABELS: Record<WorkbookTaskType, string> = {
  checkbox: "체크리스트",
  text: "단답형",
  long_text: "장문형",
  rating: "별점 평가",
  photo: "사진 첨부",
};

export const WORKBOOK_STATUS_LABELS: Record<WorkbookSubmissionStatus, string> = {
  pending: "미시작",
  in_progress: "진행중",
  completed: "완료",
};

export const WORKBOOK_STATUS_COLORS: Record<WorkbookSubmissionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
};
