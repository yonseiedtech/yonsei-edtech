/**
 * thesis-retention — 논문 완주 임박자 이탈 방지 판정 (순수 함수, 성장 백로그 v19 §C2).
 *
 * 논문 단계(4학기+·디펜스 임박) 회원이 불안·정체로 이탈하면 커뮤니티의 "완주 스토리"
 * (추천 자산)를 잃는다. 이 유틸은 기존 데이터(잔디 활동 집계 + 졸업요건 충족)에서
 * "정체(연구 무진전)"·"완주(졸업요건 충족)" 신호만 파생 판정한다. 신규 컬렉션·저장 없음.
 *
 * 기존 위젯과 역할 구분(중복 아님):
 *  - ThesisProgressWidget(v2 M1): 논문 X% 상시 진행도 "표시"(정상 진행 중 상주). 본 넛지는
 *    표시가 아니라 "정체 격려/완주 축하"라는 이유가 있을 때만 노출(정상 진행 중엔 숨김).
 *  - InactivityCoachingCard(M4): 최근 14일 완전 비활성 "일반" 습관 코칭.
 *  - WeeklyReturnNudgeCard(C1): 이번 주 재방문 리듬(직전 주까지 연속 후 이번 주 0)의 "일반" 예방.
 *  - 본 판정(C2): 논문 단계 회원 한정으로, 연구/논문 활동이 3주+ 무진전인 "완주 경로 특화"
 *    정체를 격려하고(디펜스 연습 리마인드), 졸업요건 충족 시 완주를 축하한다.
 *    C1(이번 주 단위)·M4(14일 일반)와 창·대상·목적이 모두 달라 자연히 상호 배타적이다.
 *    (C1 은 "직전 주까지 연속 활동"을 전제로 하므로 3주+ 무진전과 동시 성립 불가.)
 *
 * 원칙(v19 §4 "상태 도달"):
 *  - 존재/카운트/최근성 수준만 사용(정밀 이벤트 로깅 없음).
 *  - 순수·프레임워크 비의존 — Date 는 기본 인자로만 받아 호출부(렌더) 순수성을 보호한다.
 */

import { localYmd } from "./weekly-goal";

/** 논문 단계 최소 학기차 — 로드맵 matchSemester 4/5(논문·디펜스)와 정렬. */
export const THESIS_STAGE_MIN_SEMESTER = 4;

/** 연구/논문 활동 무진전으로 볼 최소 주 수(정체 신호). */
export const THESIS_STALL_WEEKS = 3;

/**
 * useGradActivityData.activityByDay 에서 "연구/논문" 활동으로 보는 라벨.
 * (세미나·댓글 등 일반 활동은 제외 — 논문 완주 경로에 특화된 정체만 감지)
 */
export const THESIS_RESEARCH_LABELS: ReadonlySet<string> = new Set([
  "논문 작성",
  "논문 읽기 기록",
  "논문·아카이브 열람",
]);

export type ThesisRetentionPhase = "hidden" | "stall" | "completion";

export interface ThesisRetentionState {
  phase: ThesisRetentionPhase;
  /** 마지막 연구 활동 이후 경과 주(정체 문구용). 활동 이력 없으면 null. */
  weeksSinceResearch: number | null;
}

/** 논문 단계(4학기+) 여부 — 페르소나 게이트 1차 조건. */
export function isThesisStageSemester(
  effectiveSemesterCount: number | null,
): boolean {
  return (
    effectiveSemesterCount != null &&
    effectiveSemesterCount >= THESIS_STAGE_MIN_SEMESTER
  );
}

/** "YYYY-MM-DD" 두 날짜의 일수 차(to - from). 파싱 불가 시 null. */
function ymdDiffDays(fromYmd: string, toYmd: string): number | null {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  if ([fy, fm, fd, ty, tm, td].some((n) => !Number.isFinite(n))) return null;
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

/**
 * 논문 완주 넛지 단계 판정.
 * 우선순위: 완주(졸업요건 충족) > 정체(연구 3주+ 무진전) > 숨김.
 *
 *  - completion: 졸업요건을 모두 채운 완주 임박/완료 상태 → 축하 + Wrapped 공유 유도.
 *  - stall     : 연구/논문 활동 이력은 있으나 마지막 활동이 3주+ 지난 정체 → 지지적 격려.
 *  - hidden    : 정상 진행 중(ThesisProgressWidget 이 표시 담당) 또는 활동 이력 자체가 없음
 *                (시작 유도는 ThesisProgressWidget 의 "논문 작성 시작" CTA 담당).
 */
export function assessThesisRetention(
  researchDays: ReadonlySet<string>,
  graduationMet: boolean,
  now: Date = new Date(),
): ThesisRetentionState {
  if (graduationMet) {
    return { phase: "completion", weeksSinceResearch: null };
  }

  // 최근 연구 활동일 탐색.
  let latest: string | null = null;
  for (const d of researchDays) {
    if (latest === null || d > latest) latest = d;
  }
  // 연구 활동 이력 자체가 없으면 시작 유도(ThesisProgressWidget)에 양보 → 숨김.
  if (latest === null) {
    return { phase: "hidden", weeksSinceResearch: null };
  }

  const diffDays = ymdDiffDays(latest, localYmd(now));
  if (diffDays === null) {
    return { phase: "hidden", weeksSinceResearch: null };
  }
  const weeks = Math.floor(diffDays / 7);
  if (weeks >= THESIS_STALL_WEEKS) {
    return { phase: "stall", weeksSinceResearch: weeks };
  }
  return { phase: "hidden", weeksSinceResearch: weeks };
}
