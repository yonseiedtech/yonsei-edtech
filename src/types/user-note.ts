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
  general: { bg: "bg-slate-100", text: "text-slate-700" },
  study: { bg: "bg-emerald-100", text: "text-emerald-700" },
  research: { bg: "bg-amber-100", text: "text-amber-700" },
  reflection: { bg: "bg-blue-100", text: "text-blue-700" },
  todo: { bg: "bg-rose-100", text: "text-rose-700" },
  idea: { bg: "bg-violet-100", text: "text-violet-700" },
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
