import { CAT_BADGE_BG, CAT_BADGE_TEXT } from "@/lib/design-tokens";

// ─────────────────────────────────────────────────────────────
// user-note.ts — 사용자 개인 메모 도메인 타입
// ─────────────────────────────────────────────────────────────

export type UserNoteCategory =
  | "general"
  | "study"
  | "research"
  | "reflection"
  | "todo"
  | "idea";

export const USER_NOTE_CATEGORY_LABELS: Record<UserNoteCategory, string> = {
  general: "일반",
  study: "스터디",
  research: "연구",
  reflection: "회고",
  todo: "할 일",
  idea: "아이디어",
};

export const USER_NOTE_CATEGORY_COLORS: Record<
  UserNoteCategory,
  { bg: string; text: string }
> = {
  general:    { bg: CAT_BADGE_BG.slate,   text: CAT_BADGE_TEXT.slate },
  study:      { bg: CAT_BADGE_BG.emerald, text: CAT_BADGE_TEXT.emerald },
  research:   { bg: CAT_BADGE_BG.amber,   text: CAT_BADGE_TEXT.amber },
  reflection: { bg: CAT_BADGE_BG.blue,    text: CAT_BADGE_TEXT.blue },
  todo:       { bg: CAT_BADGE_BG.rose,    text: CAT_BADGE_TEXT.rose },
  idea:       { bg: CAT_BADGE_BG.violet,  text: CAT_BADGE_TEXT.violet },
};

export interface UserNote {
  id: string;
  userId: string;
  category: UserNoteCategory;
  title: string;
  body: string;
  pinned?: boolean;
  tags?: string[];
  relatedActivityId?: string; // 학술활동 연결 (선택)
  relatedSeminarId?: string; // 세미나 연결 (선택)
  createdAt: string;
  updatedAt: string;
}
