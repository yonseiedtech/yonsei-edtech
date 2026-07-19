/**
 * newcomer-sequence — 신입 첫 2주 시퀀스 단계·완료 판정 (순수 유틸, v8-H5).
 *
 * `api/cron/newcomer-activation-sequence`(v7-M2)가 D+1/3/7/10/14 넛지를 발송할 때
 * 단계별 "스킵 조건"(= 이미 완료)으로 쓰는 판정을, 클라이언트 진행 위젯이 재현할 수 있도록
 * 순수 함수로 추출한다. 서버·클라이언트 어디서 호출해도 동일 결과(프레임워크 비의존).
 *
 * 단계(트래킹 4종 = 서버 스킵 조건 d1/d3/d7/d10 과 1:1):
 *  - profile   (D+1):  bio && (researchInterests + interestKeywords) >= 1
 *  - onboarding(D+3):  guide_progress 의 completedItems 1건+ (온보딩 시작)
 *  - diagnostic(D+7):  진단 완료 (클라: 진단 결과 1건+ / 서버: user_activity_logs ui:diagnostic/complete — 의미 동일)
 *  - archive   (D+10): archive_favorites 1건+
 * D+14(2주 회고)는 스킵 조건이 없는 발송 단계이므로 완료 판정 대상이 아니며,
 * 위 4단계 완료 시 위젯이 "2주 회고" 마일스톤으로 안내한다.
 *
 * NOTE(cron 교체 제안): 현재 cron(applySkipCondition)은 판정을 자체 구현한다. 본 유틸의
 * isProfileComplete 등으로 교체하면 서버·클라 판정이 단일 소스가 된다(본 작업 범위 밖 — 제안).
 */

import { isoToKstYmd, todayYmdKst } from "./dday";

export type NewcomerStepKey = "profile" | "onboarding" | "diagnostic" | "archive";

export interface NewcomerStepMeta {
  key: NewcomerStepKey;
  /** 서버 시퀀스 D+N 과 정렬 */
  dayOffset: number;
  label: string;
  /** 다음 액션 딥링크 */
  href: string;
}

export const NEWCOMER_STEPS: readonly NewcomerStepMeta[] = [
  { key: "profile", dayOffset: 1, label: "프로필 완성", href: "/mypage/edit" },
  { key: "onboarding", dayOffset: 3, label: "온보딩 시작", href: "/steppingstone/onboarding" },
  { key: "diagnostic", dayOffset: 7, label: "연구 준비도 진단", href: "/diagnosis" },
  { key: "archive", dayOffset: 10, label: "아카이브 즐겨찾기", href: "/archive" },
] as const;

/** 신입 첫 2주는 가입 14일 이내로 본다. */
export const NEWCOMER_WINDOW_DAYS = 14;

export interface NewcomerStepFlags {
  profileComplete: boolean;
  onboardingStarted: boolean;
  diagnosticDone: boolean;
  archiveFavorited: boolean;
}

export interface NewcomerStepState extends NewcomerStepMeta {
  done: boolean;
}

/** M2 cron d1 스킵 조건과 동일 — 프로필(자기소개 + 관심 키워드) 완성 여부 */
export function isProfileComplete(user: {
  bio?: string | null;
  researchInterests?: unknown[] | null;
  interestKeywords?: unknown[] | null;
}): boolean {
  const hasBio = typeof user.bio === "string" && user.bio.trim().length > 0;
  const interests = Array.isArray(user.researchInterests) ? user.researchInterests : [];
  const kw = Array.isArray(user.interestKeywords) ? user.interestKeywords : [];
  return hasBio && interests.length + kw.length >= 1;
}

/** 단계별 완료 상태 배열 (NEWCOMER_STEPS 순서) */
export function judgeNewcomerSteps(flags: NewcomerStepFlags): NewcomerStepState[] {
  const doneByKey: Record<NewcomerStepKey, boolean> = {
    profile: flags.profileComplete,
    onboarding: flags.onboardingStarted,
    diagnostic: flags.diagnosticDone,
    archive: flags.archiveFavorited,
  };
  return NEWCOMER_STEPS.map((s) => ({ ...s, done: doneByKey[s.key] }));
}

/** 가입 후 경과 일수 (KST 기준, cron diffYmd 와 동일 기준). 파싱 불가 시 null. */
export function daysSinceJoinKst(
  createdAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!createdAt) return null;
  const joinedYmd = isoToKstYmd(createdAt);
  const todayYmd = todayYmdKst(now);
  const [jy, jm, jd] = joinedYmd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  if ([jy, jm, jd, ty, tm, td].some((n) => !Number.isFinite(n))) return null;
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(jy, jm - 1, jd)) / 86_400_000,
  );
}

/**
 * 신입 진행 위젯 노출 대상 여부:
 *  - 현재 학기 코호트(cohortKey === currentSemesterKey)이고
 *  - 가입 14일 이내
 * (전 단계 완료 시 미노출은 위젯이 별도 판정)
 */
export function isNewcomerWindow(
  cohortKey: string | null,
  currentSemKey: string,
  createdAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!cohortKey || cohortKey !== currentSemKey) return false;
  const days = daysSinceJoinKst(createdAt, now);
  return days != null && days >= 0 && days <= NEWCOMER_WINDOW_DAYS;
}
