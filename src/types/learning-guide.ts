// 러닝 가이드 (Learning Guide) — MVP 2026-07-23

export interface LearningGuide {
  id: string;
  title: string;
  /** URL-safe unique slug */
  slug: string;
  subtitle?: string;
  coverEmoji?: string;
  category: string;
  description?: string;
  tags: string[];
  visibility: "public" | "member" | "staff";
  status: "draft" | "published";
  authorId: string;
  authorName: string;
  /** 챕터 수 집계 캐시 (선택) */
  chapterCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuideChapter {
  id: string;
  guideId: string;
  title: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuidePage {
  id: string;
  guideId: string;
  chapterId: string;
  title: string;
  order: number;
  /** URL anchor slug for deep-linking */
  anchor: string;
  pageType: "native" | "embed";
  /** Native page: 마크다운 본문 */
  body?: string;
  /** Embed page: 임베드 URL */
  embedUrl?: string;
  embedKind?: "pdf" | "link" | "youtube";
  createdAt?: string;
  updatedAt?: string;
}

/** docId: `${userId}_${guideId}` */
export interface LearningGuideProgress {
  userId: string;
  guideId: string;
  lastPageId?: string;
  readPageIds: string[];
  updatedAt: string;
}
