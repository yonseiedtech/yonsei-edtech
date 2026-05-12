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

// ── 학기별 로드맵 (Sprint 67-AR — 운영진 콘텐츠 관리) ──

/** 색상 프리셋 — free-form 색상 문자열 위험 차단 */
export type RoadmapColorPreset =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "purple"
  | "slate";

export const ROADMAP_COLOR_PRESETS: Record<
  RoadmapColorPreset,
  { textColor: string; bgColor: string; label: string }
> = {
  blue: {
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
    label: "파랑",
  },
  emerald: {
    textColor: "text-emerald-700 dark:text-emerald-300",
    bgColor:
      "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    label: "초록",
  },
  amber: {
    textColor: "text-amber-700 dark:text-amber-300",
    bgColor:
      "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    label: "노랑",
  },
  rose: {
    textColor: "text-rose-700 dark:text-rose-300",
    bgColor: "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
    label: "빨강",
  },
  purple: {
    textColor: "text-purple-700 dark:text-purple-300",
    bgColor:
      "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20",
    label: "보라",
  },
  slate: {
    textColor: "text-slate-700 dark:text-slate-300",
    bgColor:
      "border-slate-200 bg-slate-50/50 dark:border-slate-900 dark:bg-slate-950/20",
    label: "회색",
  },
};

/** 학기별 로드맵의 한 단계 카드 — 운영진이 콘솔에서 수정 */
export interface RoadmapStage {
  id: string;
  /** 표시 순서 (1=첫 카드) */
  order: number;
  /** 본인 학기 매칭에 사용할 누적 학기 번호 (matchSemester==N 면 N학기차 사용자 카드 강조) */
  matchSemester: number;
  /** 카드 헤더 라벨 (예: "1학기차 — 적응과 시작") */
  title: string;
  /** 짧은 태그 (예: "정착") */
  shortTag: string;
  /** 체크리스트 항목 */
  items: string[];
  /** 색상 프리셋 */
  colorPreset: RoadmapColorPreset;
  /** 졸업 후 단계 — alumni 사용자 자동 매칭 */
  isAlumni: boolean;
  /** 게시 여부 — false 면 회원에게 숨김 */
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
