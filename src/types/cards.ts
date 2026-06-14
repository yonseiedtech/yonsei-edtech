// ── 받은 명함 (Received Business Cards) ──

export interface ReceivedBusinessCard {
  id: string;
  ownerId: string;          // 받은 사람 (현재 로그인 사용자)
  // 받은 명함의 정보 (등록자가 직접 입력)
  name: string;
  affiliation?: string;     // 소속 (예: 서울대학교 교육학과)
  position?: string;        // 직위 (예: 박사과정)
  phone?: string;           // 010-0000-0000
  email?: string;
  notes?: string;           // 만남 메모 (예: "2026 춘계 학술대회 D-1 트랙에서 만남")
  metAt?: string;           // 만난 날짜 YYYY-MM-DD
  metLocation?: string;     // 만난 장소 (예: 이화여대 학관 412호)
  tags?: string[];          // 태그 (예: ["AI교육", "협업가능"])
  photoUrl?: string;        // 명함 이미지 또는 본인 사진
  createdAt: string;
  updatedAt?: string;
}

// ── 명함 디자인 테마 (사이클 112, 사용자 요청) ──
// User.cardTheme 에 저장. 색상 클래스 매핑은 features/card/card-themes.ts.

export type CardThemeKey = "default" | "navy" | "emerald" | "rose" | "slate" | "amber";

export const CARD_THEME_KEYS: CardThemeKey[] = [
  "default",
  "navy",
  "emerald",
  "rose",
  "slate",
  "amber",
];

export const CARD_THEME_LABELS: Record<CardThemeKey, string> = {
  default: "연세 블루",
  navy: "네이비",
  emerald: "에메랄드",
  rose: "로즈",
  slate: "차콜",
  amber: "앰버",
};
