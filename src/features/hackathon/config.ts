/**
 * 에듀테크 해커톤 2026 허브 콘텐츠 상수 (v6-H6, 2026-07-18)
 *
 * 운영진이 문구·일정·FAQ 를 코드 리뷰 없이 이 파일만 고쳐 다듬을 수 있도록
 * 모든 표시 텍스트를 상수로 분리한다. 데이터 저장은 기존 comm_boards 인프라를
 * 재사용하므로(신규 컬렉션 없음) 이 파일은 순수 정적 콘텐츠만 담는다.
 *
 * 아이디어 보드·참가 신청은 comm_boards(contextType="hackathon") 단일 전역 보드로
 * 프로비저닝된다 (ensure-hackathon-board.ts).
 */

/** 해커톤 보드 컨텍스트 식별자 (단일 전역 보드) */
export const HACKATHON_CONTEXT_ID = "hackathon-2026-08-22";

/** 행사 개요 — 운영진이 다듬는 핵심 메타 */
export const HACKATHON_EVENT = {
  title: "교육 현장의 문제 해결을 위한 에듀테크 해커톤",
  /** 짧은 태그라인 (히어로 배지) */
  tagline: "연세교육공학회 미니 학술대회",
  /** 행사 날짜 (YYYY-MM-DD) — D-day 계산 기준 */
  date: "2026-08-22",
  /** 요일·시간 표시 문구 */
  dayLabel: "토요일",
  timeLabel: "오전 10시 – 오후 10시",
  /** 장소 (미정 시 운영진이 갱신) */
  place: "연세대학교 (장소 추후 공지)",
  /** 취지·분위기 — 부담 없는 참여 톤 */
  intro:
    "교육 현장의 진짜 문제를 함께 정의하고, 에듀테크로 해법을 프로토타이핑하는 하루입니다. " +
    "완성된 결과물보다 '문제를 잘 들여다보는 경험'에 무게를 둡니다. 개발이 처음이어도, " +
    "아이디어만 있어도 괜찮아요. 동료들과 부담 없이 참여하는 자체 미니 학술대회입니다.",
  /** 세부 안내 불릿 */
  highlights: [
    "혼자 와도 현장에서 팀을 만들 수 있어요 — 아이디어 보드에서 미리 팀원을 찾아도 좋습니다.",
    "교육공학 전공생·졸업생 누구나 환영 — 기획·연구·디자인·개발 어떤 강점이든 좋습니다.",
    "결과물은 학회 아카이브로 남겨 이후 연구·프로젝트의 씨앗이 됩니다.",
  ],
} as const;

/** 관심 문제 영역 태그 — 참가 신청 시 선택 (아이디어 보드 필터로도 사용) */
export const HACKATHON_INTEREST_AREAS: readonly string[] = [
  "K-12 학교 현장",
  "고등·대학 교육",
  "평생·성인 학습",
  "특수·통합 교육",
  "기업 교육·HRD",
  "학습 데이터·분석",
  "AI·생성형 도구",
  "접근성·교육 격차",
];

/** 팀 참여 희망 여부 — comm_question.presenter 슬롯에 저장 */
export const HACKATHON_TEAM_PREFS = {
  wantTeam: "팀원 찾는 중",
  hasTeam: "팀 있음·구성 예정",
  undecided: "개인·미정",
} as const;

export type HackathonTeamPref =
  (typeof HACKATHON_TEAM_PREFS)[keyof typeof HACKATHON_TEAM_PREFS];

export const HACKATHON_TEAM_PREF_LIST: readonly HackathonTeamPref[] = [
  HACKATHON_TEAM_PREFS.wantTeam,
  HACKATHON_TEAM_PREFS.hasTeam,
  HACKATHON_TEAM_PREFS.undecided,
];

/** 당일 타임라인 — 운영진이 확정 시 갱신 (잠정) */
export const HACKATHON_TIMELINE: readonly { time: string; label: string }[] = [
  { time: "10:00", label: "등록·오리엔테이션" },
  { time: "10:30", label: "문제 정의 워크숍 · 팀 빌딩" },
  { time: "12:00", label: "점심 · 네트워킹" },
  { time: "13:00", label: "프로토타이핑 스프린트" },
  { time: "17:00", label: "중간 공유 · 멘토 피드백" },
  { time: "19:00", label: "저녁 · 마무리 작업" },
  { time: "20:30", label: "발표 · 데모" },
  { time: "21:30", label: "리뷰 · 마무리" },
];

/**
 * 산출물 제출 마감 (로컬 KST 기준 ISO, 초 생략).
 * 운영진이 이 상수만 고쳐 마감 시각을 조정한다. 이 시각을 지나면 제출 폼이 잠기고
 * "제출 마감" 배지가 표시된다. (당일 발표 종료 무렵으로 잠정 설정)
 */
export const HACKATHON_SUBMISSION_DEADLINE = "2026-08-22T21:30";

/**
 * 제출이 마감되었는지 판정 — 마감 시각 이후면 true.
 * (미래 마감 시각 파싱 실패 시 안전하게 열림 상태 유지)
 */
export function isHackathonSubmissionClosed(now: Date = new Date()): boolean {
  const deadline = new Date(HACKATHON_SUBMISSION_DEADLINE);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() > deadline.getTime();
}

/**
 * 수상작 포트폴리오 연계 안내 (v13-H2 갱신 — 실제 버튼 존재에 맞춰 업데이트).
 * 수상작 카드 하단에 표시된다.
 */
export const HACKATHON_PORTFOLIO_HINT =
  "수상 이력은 수상작 카드의 '포트폴리오에 수상 이력 추가' 버튼으로 바로 추가할 수 있어요. " +
  "팀원으로 등록된 경우에도 마이페이지 › 포트폴리오의 '내 활동 자동 불러오기'에서 해커톤 참가 이력을 연결할 수 있습니다.";

// ─────────────────────────────────────────────────────────────
// 단계별 진행 타임라인 (v8-H6, 2026-07-20)
// 운영진이 날짜 확정 시 startDate 만 갱신하면 전체 UI 에 반영된다.
// ─────────────────────────────────────────────────────────────

export type HackathonPhaseKey =
  | "registration"
  | "submission"
  | "judging"
  | "awards";

export interface HackathonPhaseInfo {
  key: HackathonPhaseKey;
  label: string;
  description: string;
  /** 이 단계가 시작되는 날짜 (YYYY-MM-DD, KST 기준 — 이 날짜 이후 단계로 전환). */
  startDate: string;
}

/**
 * 참가 접수 → 산출물 제출 → 심사 → 수상 발표 타임라인.
 * getHackathonPhase() 가 오늘 날짜와 비교해 현재 단계를 판정한다.
 */
export const HACKATHON_PHASE_TIMELINE: readonly HackathonPhaseInfo[] = [
  {
    key: "registration",
    label: "참가 접수",
    description:
      "아이디어 보드에 풀고 싶은 교육 현장의 문제를 등록하고 팀원을 찾으세요.",
    startDate: "2026-07-20",
  },
  {
    key: "submission",
    label: "산출물 제출",
    description: "행사 당일 발표·데모·저장소 링크를 제출합니다.",
    startDate: "2026-08-22",
  },
  {
    key: "judging",
    label: "심사",
    description: "심사위원단이 산출물을 평가합니다.",
    startDate: "2026-08-23",
  },
  {
    key: "awards",
    label: "수상 발표",
    description: "수상작이 발표되고 학회 아카이브로 남습니다.",
    startDate: "2026-08-29",
  },
] as const;

/**
 * 오늘 날짜 기준 현재 진행 단계 판정.
 * HACKATHON_PHASE_TIMELINE 의 startDate 와 순서에만 의존한다.
 */
export function getHackathonPhase(now: Date = new Date()): HackathonPhaseKey {
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let current: HackathonPhaseKey = "registration";
  for (const phase of HACKATHON_PHASE_TIMELINE) {
    if (ymd >= phase.startDate) current = phase.key;
  }
  return current;
}

/**
 * 수상 발표 예정 날짜 — 행사 전 갤러리 플레이스홀더 표기용 (운영진 확정 시 갱신).
 * 비어 있으면 "추후 공지"로 표시된다.
 */
export const HACKATHON_AWARDS_ANNOUNCE_DATE = "2026-08-29";

// ─────────────────────────────────────────────────────────────
// 당일 운영 수동 오버라이드 (H3-v10, 2026-07-20)
// 운영진이 콘솔에서 단계 전환을 수동으로 덮어쓸 수 있게 한다.
// 저장은 site_settings(key = HACKATHON_OPS_SETTINGS_KEY) 재사용 — 신규 컬렉션 없음.
// 수동 값이 있으면 우선, 없으면(null) 하드코딩 날짜 기준 자동 폴백(수동 우선·자동 폴백).
// ─────────────────────────────────────────────────────────────

/** 당일 운영 오버라이드 site_settings 저장 키 */
export const HACKATHON_OPS_SETTINGS_KEY = "hackathon_ops";

/** 운영진 수동 오버라이드 — 각 필드 null 이면 자동(날짜) 폴백 */
export interface HackathonOpsOverride {
  /** 진행 단계 수동 지정 (null = getHackathonPhase 자동) */
  phase: HackathonPhaseKey | null;
  /** 제출 마감 수동 지정 (null = isHackathonSubmissionClosed 자동) */
  submissionClosed: boolean | null;
}

export const HACKATHON_OPS_DEFAULT: HackathonOpsOverride = {
  phase: null,
  submissionClosed: null,
};

/** 수동 우선·자동 폴백으로 현재 진행 단계 판정. */
export function resolveHackathonPhase(
  override: HackathonOpsOverride | null | undefined,
  now: Date = new Date(),
): HackathonPhaseKey {
  return override?.phase ?? getHackathonPhase(now);
}

/** 수동 우선·자동 폴백으로 제출 마감 여부 판정. */
export function resolveHackathonSubmissionClosed(
  override: HackathonOpsOverride | null | undefined,
  now: Date = new Date(),
): boolean {
  return override?.submissionClosed ?? isHackathonSubmissionClosed(now);
}

/**
 * 수상 발표 단계 자동 전환 가드 (R4, 2026-07-21).
 *
 * 자동(날짜) 폴백으로 "수상 발표(awards)" 단계에 진입했더라도 공개된 수상작이 하나도 없으면
 * 빈 발표 화면을 막기 위해 "심사(judging)" 단계로 유지한다.
 * 단, 운영진이 콘솔에서 수동으로 awards 를 지정한 경우(override.phase === "awards")는
 * 명시적 운영 의사이므로 존중하고 가드를 적용하지 않는다.
 *
 * @param publishedCount 공개(published)된 수상작 수. 미상(로딩·비로그인 등)일 때 호출부는
 *   downgrade 를 원치 않으면 1 이상을 넘겨 가드를 비활성화한다.
 */
export function resolveHackathonPhaseGuarded(
  override: HackathonOpsOverride | null | undefined,
  publishedCount: number,
  now: Date = new Date(),
): HackathonPhaseKey {
  const phase = resolveHackathonPhase(override, now);
  const manualAwards = (override?.phase ?? null) === "awards";
  if (phase === "awards" && !manualAwards && publishedCount < 1) {
    return "judging";
  }
  return phase;
}

/** 자주 묻는 질문 */
export const HACKATHON_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "개발을 못 해도 참여할 수 있나요?",
    a: "네. 문제를 정의하고 사용자를 이해하는 일, 기획·연구·디자인 모두 해커톤의 핵심입니다. 코드는 팀에서 함께 나눠 맡습니다.",
  },
  {
    q: "팀이 없어도 괜찮나요?",
    a: "괜찮습니다. 아이디어 보드에 관심 주제를 남겨두면 비슷한 문제에 관심 있는 동료와 자연스럽게 팀이 됩니다. 현장 팀 빌딩 시간도 있습니다.",
  },
  {
    q: "무엇을 준비해 가면 되나요?",
    a: "노트북과 평소 궁금했던 '교육 현장의 문제' 하나면 충분합니다. 나머지는 현장에서 함께 채워갑니다.",
  },
  {
    q: "결과물은 어떻게 되나요?",
    a: "발표한 아이디어와 산출물은 원하는 팀에 한해 학회 아카이브로 정리되어, 이후 연구·프로젝트의 출발점으로 이어집니다.",
  },
];
