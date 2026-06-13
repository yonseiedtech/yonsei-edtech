// ── 모임·네트워킹 (대학원 생활 행사) — 사이클 73 ──
// 개강/종강총회·정기/수시모임·MT 등 네트워킹 행사의 참석 신청(RSVP)과 회비 납부내역 관리.
// 결정(2026-06-13): 오프라인 납부+운영진 수동확인 · 전공회비 운영이라 학회 회계(transactions)와 분리
//                   · v1 MVP · 참석/불참/미정 3단계 + 게스트(비회원) 신청 허용.

export type NetworkingEventType = "opening" | "closing" | "regular" | "casual" | "mt" | "other";

export const NETWORKING_EVENT_TYPE_LABELS: Record<NetworkingEventType, string> = {
  opening: "개강총회",
  closing: "종강총회",
  regular: "정기모임",
  casual: "수시모임",
  mt: "MT",
  other: "기타",
};

/** 신청 가능(upcoming) → 마감(closed) → 종료(done) / 취소(cancelled) */
export type NetworkingEventStatus = "upcoming" | "closed" | "done" | "cancelled";

export const NETWORKING_EVENT_STATUS_LABELS: Record<NetworkingEventStatus, string> = {
  upcoming: "신청 가능",
  closed: "신청 마감",
  done: "종료",
  cancelled: "취소",
};

export interface NetworkingEvent {
  id: string;
  type: NetworkingEventType;
  title: string;
  description?: string;
  /** 행사 시작 일시 (ISO) */
  startAt: string;
  /** 종료 일시 (ISO, 선택) */
  endAt?: string;
  location?: string;
  /** 회비(원). 0 이면 무료 */
  feeAmount: number;
  /** 참석 신청 마감 (ISO, 선택) */
  rsvpDeadline?: string;
  /** 정원 (0/미설정 = 무제한) */
  capacity?: number;
  hostName?: string;
  /** 운영 학기 "2026-1" — 전공회비 운영 맥락 (학회 회계와 분리 집계) */
  semester?: string;
  status: NetworkingEventStatus;
  published: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RsvpStatus = "attending" | "not_attending" | "undecided";

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  attending: "참석",
  not_attending: "불참",
  undecided: "미정",
};

export interface NetworkingRsvp {
  id: string;
  eventId: string;
  /** 회원 신청이면 userId, 게스트면 미설정 */
  userId?: string;
  isGuest?: boolean;
  guestName?: string;
  guestContact?: string;
  /** 명단 표시용 denorm (회원명 또는 게스트명) */
  displayName: string;
  status: RsvpStatus;
  /** 동반인 수 (본인 제외) */
  companions?: number;
  memo?: string;
  respondedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DueStatus = "paid" | "unpaid" | "exempt";

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  paid: "납부",
  unpaid: "미납",
  exempt: "면제",
};

export interface NetworkingDue {
  id: string;
  eventId: string;
  userId?: string;
  isGuest?: boolean;
  /** 명단 표시용 denorm */
  displayName: string;
  amount: number;
  status: DueStatus;
  /** 납부 확인 일자 (ISO) */
  paidAt?: string;
  /** 확인한 운영진 uid */
  confirmedBy?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

/** 행사 정산 요약 (운영진 화면 파생값 — 저장 안 함) */
export interface NetworkingSettlement {
  attendingCount: number;
  guestCount: number;
  totalCompanions: number;
  expectedRevenue: number; // 참석 인원 × 회비
  paidAmount: number;
  unpaidAmount: number;
  exemptCount: number;
}
