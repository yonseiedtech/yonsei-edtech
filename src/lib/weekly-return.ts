/**
 * weekly-return — 주간 재방문 리듬 위험 판정 (순수 함수, 성장 백로그 v19 §C1).
 *
 * "이번 주 재방문 리듬"이 끊기기 직전인지 잔디 집계에서 파생 판정한다.
 * 기존 두 위젯과 각도가 다르다(중복 아님):
 *  - InactivityCoachingCard(M4): 최근 14일 완전 비활성(멈춘 습관)을 코칭.
 *  - LearningStreak 복구 넛지(justBroke): 지난주가 통째로 비어 스트릭이 "이미 끊긴" 뒤의 복구.
 *  - 본 판정(C1): 직전 주까지 연속이 살아 있으나(≥2주) 이번 주 들어 아직 활동이 0인
 *    "끊기기 직전" 예방 구간. 지난주는 활동이 있었다는 점에서 justBroke 와 상호 배타적이다.
 *
 * 원칙(v19 §4 "상태 도달"):
 *  - 신규 컬렉션·저장 없음. 잔디 집계(useGradActivityData 의 scoresByDay)만 읽어 파생.
 *  - 존재/카운트 수준만 사용(정밀 이벤트 로깅 없음).
 *  - 순수·프레임워크 비의존 — Date 는 기본 인자로만 받아 호출부(렌더) 순수성을 보호한다.
 */

import { currentWeekKey, weekDays, addWeeks, localYmd } from "./weekly-goal";
import { weekStartYmd } from "./streak-freeze";

/**
 * 압박 방지: 주 초반(월·화)에는 위험 판정을 보류하고 이 요일 인덱스부터 넛지한다.
 * weekDays 는 월요일 시작이므로 0=월, 1=화, 2=수.
 */
const MID_WEEK_DAY_INDEX = 2; // 수요일부터

/** 연속 주 역행 탐색 안전 상한(1년). */
const MAX_LOOKBACK_WEEKS = 53;

export interface WeeklyReturnRisk {
  /** 이번 주 재방문 리듬이 끊길 위험(비압박 넛지 노출 대상) */
  atRisk: boolean;
  /** 직전 주까지 연속으로 활동이 있던 주 수(문구용) */
  priorStreakWeeks: number;
  /** 이번 주(월~오늘) 활동한 일수 */
  thisWeekActiveDays: number;
}

/** 한 주(weekKey, 월요일 시작)에 활동(score>0)이 하루라도 있었는지 */
function weekHasActivity(
  scoresByDay: Map<string, number>,
  weekKey: string,
): boolean {
  return weekDays(weekKey).some((d) => (scoresByDay.get(d) ?? 0) > 0);
}

/**
 * 이번 주 재방문 리듬 위험을 판정한다.
 *
 * atRisk 조건(전부 충족):
 *  1) 이번 주가 "연구 쉼표"로 얼려지지 않음(의도적 휴식이면 넛지하지 않음).
 *  2) 주 중반(수요일) 이후 — 월·화의 이른 넛지로 압박하지 않음.
 *  3) 이번 주(월~오늘) 활동 일수 = 0.
 *  4) 직전 주까지 연속 활동 주 수 ≥ 2 (살아 있던 리듬이 끊길 위험일 때만).
 */
export function assessWeeklyReturnRisk(
  scoresByDay: Map<string, number>,
  frozenWeeks: Set<string> = new Set(),
  now: Date = new Date(),
): WeeklyReturnRisk {
  const idle: WeeklyReturnRisk = {
    atRisk: false,
    priorStreakWeeks: 0,
    thisWeekActiveDays: 0,
  };

  // (1) 사용자가 이번 주를 얼렸으면 의도적 휴식 — 넛지하지 않음.
  //     freeze 는 일요일 시작 주 키(streak-freeze) 를 쓰므로 그 규약으로 판정.
  if (frozenWeeks.has(weekStartYmd(now))) return idle;

  const thisWeek = currentWeekKey(now);
  const todayYmd = localYmd(now);
  const days = weekDays(thisWeek);

  // 이번 주(월~오늘) 활동 일수 — 미래 일자 제외.
  let thisWeekActiveDays = 0;
  let dayIndexInWeek = -1;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d === todayYmd) dayIndexInWeek = i;
    if (d > todayYmd) break;
    if ((scoresByDay.get(d) ?? 0) > 0) thisWeekActiveDays += 1;
  }

  // 직전 주부터 과거로 연속 활동 주 수.
  let priorStreakWeeks = 0;
  let wk = addWeeks(thisWeek, -1);
  while (weekHasActivity(scoresByDay, wk)) {
    priorStreakWeeks += 1;
    if (priorStreakWeeks >= MAX_LOOKBACK_WEEKS) break; // 안전 가드
    wk = addWeeks(wk, -1);
  }

  const midWeekReached = dayIndexInWeek >= MID_WEEK_DAY_INDEX;
  const atRisk =
    midWeekReached && thisWeekActiveDays === 0 && priorStreakWeeks >= 2;

  return { atRisk, priorStreakWeeks, thisWeekActiveDays };
}
