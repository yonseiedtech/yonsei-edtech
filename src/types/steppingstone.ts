// ── Track 6: 인지디딤판 (가이드 트랙) ──

export type GuideTrackKey =
  | "onboarding"           // 신입생 온보딩
  | "current_student"      // 재학생 학습
  | "comprehensive_exam"   // 학술대회 대비 (legacy key)
  | "graduation";          // 졸업

export const GUIDE_TRACK_LABELS: Record<GuideTrackKey, string> = {
  onboarding: "신입생 온보딩",
  current_student: "재학생 학습 가이드",
  comprehensive_exam: "학술대회 대비",
  graduation: "졸업 준비",
};

/** 가이드 트랙 (인지디딤판 단위) */
export interface GuideTrack {
  id: string;
  key: GuideTrackKey;
  title: string;
  description?: string;
  /** lucide 아이콘명 (예: "GraduationCap") */
  iconKey?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GuideItemActionType = "link" | "download" | "internal" | "info";

export const GUIDE_ITEM_ACTION_LABELS: Record<GuideItemActionType, string> = {
  link: "외부 링크",
  download: "파일 다운로드",
  internal: "사이트 내 이동",
  info: "안내만",
};

/** 가이드 항목 (트랙 내 카테고리·항목 — 마크다운 본문 + 액션) */
export interface GuideItem {
  id: string;
  trackId: string;
  /** 자유 카테고리 ("사전 준비", "OT", "수강신청" 등) */
  category: string;
  title: string;
  /** 마크다운 본문 */
  body?: string;
  actionType: GuideItemActionType;
  actionUrl?: string;          // 외부 URL 또는 내부 라우트
  attachmentPath?: string;     // GCS 등 첨부파일 경로
  /** 적용 기간 (기수/학기 한정 안내 — ISO date) */
  appliesFrom?: string;
  appliesUntil?: string;
  order: number;
  published: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 회원별 가이드 진행 상태 (체크리스트) */
export interface GuideProgress {
  id: string;
  userId: string;
  trackId: string;
  /** Item.id → 완료 시각 ISO */
  completedItems: Record<string, string>;
  startedAt: string;
  updatedAt: string;
}
