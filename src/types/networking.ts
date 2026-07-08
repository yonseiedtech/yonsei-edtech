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
  /** 행사 시작 일시 (ISO). 일정 투표(poll) 미확정 시 빈 문자열 */
  startAt: string;
  /** 종료 일시 (ISO, 선택) */
  endAt?: string;
  /** 일정 결정 방식 — fixed: 일시 고정 / poll: 가능일 투표 후 확정 (기본 fixed, 하위호환) */
  schedulingMode?: "fixed" | "poll";
  /** poll 모드 후보 기간 (YYYY-MM-DD) */
  pollPeriodStart?: string;
  pollPeriodEnd?: string;
  /** poll 모드 시간대 옵션 (예: ["18:00","19:00"]). 비우면 날짜만 */
  pollTimeSlots?: string[];
  /** poll 응답 마감 (ISO) */
  pollDeadline?: string;
  /** poll 결정 — manual: 운영진 지정 / auto: 최다 가능일 */
  pollDecisionMode?: "manual" | "auto";
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
  /**
   * 공개 범위 — 미지정=public(기존 데이터 호환).
   * private: 공개 목록(모임/캘린더/갤러리)에서 숨기고 공유 링크(토큰)로만 접근.
   * firestore.rules read 는 공개(if true) 유지 — 노출 제어는 클라이언트 필터 + 토큰 URL.
   */
  visibility?: "public" | "private";
  /**
   * @deprecated (High-1 보안 핫픽스 2026-07-08) 레거시 호환용 — 신규 저장 금지.
   * networking_events 는 공개 read 라 이 필드에 토큰을 두면 SDK 쿼리로 열거된다.
   * 토큰은 `networking_event_tokens/{token}` 컬렉션(NetworkingEventToken)에만 기록한다.
   * 남아 있는 레거시 값은 수정 시 매핑 문서로 이관 후 deleteField 로 제거된다.
   */
  shareToken?: string;
  /**
   * 비공개 모임 초대 알림 발송 대상 회원 id 목록 (H2, 2026-07-08).
   * 이미 초대 알림을 보낸 회원을 기록해 재발송을 막는다.
   */
  invitedUserIds?: string[];
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
  /**
   * 참석자 명단 공개 동의 (Phase 2-D, 옵트인 — 기본 false).
   * true 인 회원만 행사 참석자끼리 보이는 명단(프로필·쪽지 팔로업)에 노출.
   */
  showInAttendeeList?: boolean;
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

// ── 일정 조율(poll) · 세부 프로그램 (사이클 124) ──

/** 일정 투표 응답 — 회원이 가능한 날짜/시간을 체크 */
export interface NetworkingAvailability {
  id: string;
  eventId: string;
  /** 회원 응답이면 회원 uid, 게스트(비회원) 응답이면 빈 문자열 */
  userId: string;
  userName: string;
  /** 게스트(비회원) 응답자의 학번 — 잠재회원 집계 키. 회원 응답은 미설정 */
  studentId?: string;
  /** true = 비로그인 게스트 투표(availability-guest 라우트로 저장) */
  isGuest?: boolean;
  /** 가능 슬롯 — 날짜만 "YYYY-MM-DD" 또는 시간대 "YYYY-MM-DD|HH:MM" */
  availableSlots: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** 일정 투표 슬롯 집계 (실시간 히트맵·최다 가능일 추천) */
export interface SlotTally {
  /** "YYYY-MM-DD" 또는 "YYYY-MM-DD|HH:MM" */
  slot: string;
  date: string;
  time?: string;
  count: number;
  names: string[];
}

/** 행사 세부 프로그램 — 행사 등록 후 시간표를 구성 */
export interface NetworkingEventProgram {
  id: string;
  eventId: string;
  /** 정렬 순서 */
  order: number;
  /** "HH:MM" (선택) */
  startTime?: string;
  endTime?: string;
  title: string;
  presenter?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const NETWORKING_DECISION_LABELS: Record<"manual" | "auto", string> = {
  manual: "운영진이 직접 지정",
  auto: "응답 종합 후 최다 가능일",
};

/**
 * 모임·행사 후기 (Phase 2-D) — Firestore `networking_reviews`.
 * attending RSVP 회원이 지난 행사에 별점+한줄 후기를 남긴다 (행사당 1인 1건).
 * 세미나 후기와 달리 가벼운 분위기 피드백 — 다음 행사 기획의 환류 데이터.
 */
export interface NetworkingReview {
  id: string;
  eventId: string;
  userId: string;
  /** 표시용 denorm 회원명 */
  displayName: string;
  /** 별점 1~5 */
  rating: number;
  /** 한줄 후기 (선택) */
  content?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 비공개 모임 공유 토큰 매핑 (High-1 보안 핫픽스 2026-07-08) — Firestore `networking_event_tokens`.
 * 문서 id 가 곧 토큰(추측 불가 uuid). networking_events 의 공개 read 로 인한
 * shareToken 열거를 차단하기 위해 토큰↔eventId 매핑을 별도 컬렉션에 분리한다.
 * get 은 토큰을 아는 사람만(문서 id 지정), list(열거)는 staff 만 허용.
 */
export interface NetworkingEventToken {
  /** 문서 id === 공유 토큰 */
  id: string;
  eventId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
