/**
 * 대내 학술대회(미니 학술대회) 레지스트리 (2026-07-21)
 *
 * 학회가 주최하는 대내 학술대회를 다중 행사로 일반화하기 위한 코드 레지스트리다.
 * 기존 "에듀테크 해커톤 2026-08-22" 를 첫 행사로 매핑하되, 무손실의 관건인
 * contextId 를 그대로 재사용한다(hackathon/config 의 HACKATHON_CONTEXT_ID).
 * 따라서 comm_boards·hackathon_submissions·hackathon_judgings·kudos·cron 등
 * 기존 인프라가 데이터 이동 없이 그대로 동작한다.
 *
 * 첫 행사의 표시 값은 hackathon/config 상수를 "참조"하여 단일 출처를 유지한다(값 중복 없음).
 * 운영진이 새 행사를 문서 기반으로 생성하는 단계는 docs/plans/internal-conference-2026-07-21.md
 * 3.2/3.3 참조.
 */

import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_EVENT,
  HACKATHON_AWARDS_ANNOUNCE_DATE,
  PROPOSAL_EVENT,
  type EventMode,
} from "@/features/hackathon/config";

/** 대내 학술대회 유형. */
export type InternalConferenceKind = "hackathon" | "symposium";

/**
 * 해커톤 유형 행사 전용 설정 (옵셔널 — 없으면 hackathon/config 상수 폴백).
 * 각 필드를 채우면 공개 허브·콘솔의 해당 표시부가 즉시 반영된다.
 */
export interface HackathonSettings {
  /**
   * 행사 모드 — "hackathon": 팀 기반 해커톤 / "proposal": 개인 연구 계획 발표회.
   * 없으면 config.HACKATHON_DEFAULT_EVENT_MODE 폴백.
   * 운영진이 콘솔 행사 설정 탭에서 저장하면 Firestore 레코드에 확정된다.
   */
  eventMode?: EventMode;
  /** 행사 소개 문구 (히어로 섹션 intro 텍스트) */
  intro?: string;
  /** 세부 안내 불릿 — 비어 있으면 config 상수 사용 */
  highlights?: string[];
  /** 당일 타임라인 항목 목록 */
  timeline?: { time: string; label: string }[];
  /** 산출물 제출 마감 "YYYY-MM-DDTHH:mm" */
  submissionDeadline?: string;
  /** 수상 발표일 "YYYY-MM-DD" */
  awardsAnnounceDate?: string;
  /** 단계별 시작일 — 없는 항목은 HACKATHON_PHASE_TIMELINE 상수 폴백 */
  phaseStartDates?: {
    registration?: string;
    submission?: string;
    judging?: string;
    awards?: string;
  };
}

/** 행사별 활성 기능 토글. */
export interface InternalConferenceFeatures {
  /** 참가 신청·아이디어 보드 */
  ideaBoard: boolean;
  /** 팀 현황 */
  teams: boolean;
  /** 산출물 제출 */
  submissions: boolean;
  /** 루브릭 심사 */
  judging: boolean;
  /** 수상작 공개 갤러리 */
  awards: boolean;
}

export type InternalConferenceStatus = "upcoming" | "ongoing" | "completed";

export interface InternalConference {
  /** URL·목록 식별자 (예: "hackathon-2026-08-22") */
  slug: string;
  /**
   * 기존 인프라(comm_boards·hackathon_submissions·hackathon_judgings·kudos·cron)
   * 공유 키. 무손실 매핑의 핵심 — 레거시 행사는 반드시 기존 값을 유지한다.
   */
  contextId: string;
  kind: InternalConferenceKind;
  title: string;
  tagline: string;
  description: string;
  /** 행사 날짜 YYYY-MM-DD — D-day·정렬 기준 */
  date: string;
  dayLabel?: string;
  timeLabel?: string;
  place?: string;
  /** 수상 발표 예정일 YYYY-MM-DD */
  awardsAnnounceDate?: string;
  /** 활성 기능 토글 */
  features: InternalConferenceFeatures;
  /** 이 행사의 허브 페이지 경로 (레거시 8/22 = "/hackathon"). 빈 문자열이면 전용 허브 없음. */
  hubHref: string;
  /** 전용 허브 페이지가 없는 신규 행사용 외부 링크 — hubHref 가 비어 있을 때 카드 CTA 로 사용. */
  externalLink?: string;
  /** 진행 상태 — 미지정 시 date 로 자동 계산(getConferenceStatus) */
  status?: InternalConferenceStatus;
  /** 해커톤 유형 행사 전용 설정 (옵셔널). 없으면 hackathon/config 상수 폴백. */
  hackathonSettings?: HackathonSettings;
}

/**
 * 등록된 대내 학술대회 목록.
 * 첫 행사(에듀테크 해커톤 8/22)는 기존 contextId 를 그대로 재사용하여 무손실을 보장한다.
 */
export const INTERNAL_CONFERENCES: readonly InternalConference[] = [
  {
    slug: "hackathon-2026-08-22",
    contextId: HACKATHON_CONTEXT_ID,
    kind: "hackathon",
    // proposal 모드 기본값 — site_settings 문서가 이미 존재하면 코드 시드는 무시됨.
    // 운영진이 콘솔 행사 설정에서 제목·소개 등을 저장해야 Firestore 값이 갱신됨.
    title: PROPOSAL_EVENT.title,
    tagline: PROPOSAL_EVENT.tagline,
    description: PROPOSAL_EVENT.intro,
    date: HACKATHON_EVENT.date,
    dayLabel: HACKATHON_EVENT.dayLabel,
    timeLabel: HACKATHON_EVENT.timeLabel,
    place: HACKATHON_EVENT.place,
    awardsAnnounceDate: HACKATHON_AWARDS_ANNOUNCE_DATE,
    features: {
      ideaBoard: true,
      teams: true,
      submissions: true,
      judging: true,
      awards: true,
    },
    hubHref: "/hackathon",
    hackathonSettings: {
      eventMode: "proposal",
      intro: PROPOSAL_EVENT.intro,
      highlights: [...PROPOSAL_EVENT.highlights],
      timeline: [...PROPOSAL_EVENT.timeline],
    },
  },
];

/** YYYY-MM-DD (로컬 기준). */
function ymd(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** slug 로 행사 조회. */
function getConferenceBySlug(slug: string): InternalConference | undefined {
  return INTERNAL_CONFERENCES.find((c) => c.slug === slug);
}

/** contextId 로 행사 조회. */
export function getConferenceByContextId(
  contextId: string,
): InternalConference | undefined {
  return INTERNAL_CONFERENCES.find((c) => c.contextId === contextId);
}

/**
 * 행사 진행 상태 — status 가 지정돼 있으면 그대로, 없으면 date 로 자동 계산.
 * 행사일 이후는 completed, 당일은 ongoing, 이전은 upcoming.
 */
export function getConferenceStatus(
  conference: InternalConference,
  now: Date = new Date(),
): InternalConferenceStatus {
  if (conference.status) return conference.status;
  const today = ymd(now);
  if (conference.date > today) return "upcoming";
  if (conference.date === today) return "ongoing";
  return "completed";
}

/**
 * 현재(가장 가까운 예정) 행사. 예정 행사가 없으면 가장 최근 행사를 반환한다.
 * 목록·리다이렉트·콘솔 기본 선택에 사용. 행사가 없으면 undefined.
 */
export function getCurrentConference(
  now: Date = new Date(),
): InternalConference | undefined {
  if (INTERNAL_CONFERENCES.length === 0) return undefined;
  const today = ymd(now);
  const upcoming = INTERNAL_CONFERENCES.filter((c) => c.date >= today).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (upcoming.length > 0) return upcoming[0];
  return [...INTERNAL_CONFERENCES].sort((a, b) => b.date.localeCompare(a.date))[0];
}
