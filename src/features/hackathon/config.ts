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
