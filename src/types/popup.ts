// ── Site Popups (사이트 팝업 공지) ──
export type PopupAudience = "all" | "member" | "guest";
export type PopupPosition = "center" | "bottom-right";
export type PopupDismissDuration = "session" | "1d" | "7d" | "once";

export const POPUP_AUDIENCE_LABELS: Record<PopupAudience, string> = {
  all: "전체 (회원/비회원)",
  member: "로그인 회원만",
  guest: "비회원만",
};

export const POPUP_POSITION_LABELS: Record<PopupPosition, string> = {
  center: "화면 중앙 (모달)",
  "bottom-right": "오른쪽 하단 (배너)",
};

export const POPUP_DISMISS_LABELS: Record<PopupDismissDuration, string> = {
  session: "세션 동안 (탭 닫기 전까지)",
  "1d": "오늘 하루 보지 않기",
  "7d": "7일간 보지 않기",
  once: "다시 보지 않기",
};

export interface SitePopup {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  startsAt: string;
  endsAt: string;
  audience: PopupAudience;
  position: PopupPosition;
  dismissDuration: PopupDismissDuration;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
