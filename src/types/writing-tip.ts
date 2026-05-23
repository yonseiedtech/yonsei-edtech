// ── 교육공학 아카이브 — 학술 글쓰기 가이드 (Phase 1) ──
// 번역투·주술호응·시제/태·맞춤법·학술관례 등 학술 한국어 글쓰기에서
// 자주 발생하는 문제 패턴과 권장 표현을 정리한 가이드.
// 운영진 검수(published) 게이트 적용 — firestore.rules 의 archive_writing_tips 와 양쪽 게이트.

export type WritingTipCategory =
  | "translationese"
  | "subject-predicate"
  | "tense-voice"
  | "spelling-spacing"
  | "academic-convention";

export const WRITING_TIP_CATEGORY_LABELS: Record<WritingTipCategory, string> = {
  translationese: "번역투",
  "subject-predicate": "주술호응",
  "tense-voice": "시제·태",
  "spelling-spacing": "맞춤법·표기",
  "academic-convention": "학술 관례",
};

export const WRITING_TIP_CATEGORY_COLORS: Record<WritingTipCategory, string> = {
  translationese: "bg-rose-50 text-rose-800 border border-rose-200",
  "subject-predicate": "bg-violet-50 text-violet-800 border border-violet-200",
  "tense-voice": "bg-blue-50 text-blue-800 border border-blue-200",
  "spelling-spacing": "bg-amber-50 text-amber-800 border border-amber-200",
  "academic-convention": "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

export interface WritingTipExample {
  id: string;
  text: string;
}

export interface WritingTipReference {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

export interface WritingTip {
  id: string;
  title: string;
  category: WritingTipCategory;
  /** ❌ 잘못된 예 */
  wrongExample: string;
  /** ✅ 권장 예 */
  correctExample: string;
  /** 왜 그런지 짧은 설명 */
  explanation: string;
  /** 한 줄 비유·요점 */
  accessibleSummary?: string;
  /** 검색용 ("피동", "남용", "관용구" 등) */
  tags?: string[];
  additionalExamples?: WritingTipExample[];
  references?: WritingTipReference[];
  published: boolean;
  curatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
