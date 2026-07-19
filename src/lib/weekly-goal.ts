/**
 * weekly-goal — 주간 학습 목표 프리셋 · 주차 키 · 달성 판정 (순수 함수, v5-M1)
 *
 * 비활성 코칭(inactivity-coaching.ts)이 "멈춘 습관 1건"만 제안하던 것을
 * "이번 주 목표 설정 → 잔디 자동 달성 판정 → 주말 회고" 루프로 확장한다.
 *
 * 원칙:
 *  - 추가 fetch 없음 — 클라이언트는 이미 상주하는 잔디 집계(useGradActivityData 의
 *    activityByDay)만으로 달성 일수를 센다.
 *  - 잔디는 "일(day) 단위" 집계이므로 목표도 "주 N일" 로 정의한다(편/회 아님).
 *  - 순수·의존성 없음 — 클라이언트 카드와 서버 weekly-digest cron 이 동일 소스를 공유.
 *
 * 참고: activityByDay 의 활동 라벨 문자열은 useGradActivityData 의 SCORES 라벨과
 *       정확히 일치해야 한다(아래 labels).
 */

import type { WeeklyGoalChannel } from "@/types/weekly-goal";

export interface WeeklyGoalPreset {
  channel: WeeklyGoalChannel;
  /** 짧은 영역명 — 제목·회고용 */
  area: string;
  /** 목표 활동 일수 기본값 */
  target: number;
  /** 잔디 활동 라벨(useGradActivityData 와 정확히 일치) */
  labels: readonly string[];
  /** 프리셋 버튼 문구 */
  label: string;
  /** 진행 화면 딥링크 */
  href: string;
  /** CTA 버튼 문구 */
  cta: string;
}

export const WEEKLY_GOAL_CHANNELS = ["reading", "flashcard", "writing"] as const;

export const WEEKLY_GOAL_PRESETS: Record<WeeklyGoalChannel, WeeklyGoalPreset> = {
  reading: {
    channel: "reading",
    area: "논문 읽기",
    target: 3,
    // "논문 읽기 기록"(paper_reading_logs)만 — weekly-digest 서버 판정과 정확히 일치시키기 위해
    // 아카이브 열람(user_activity_logs) 은 제외한다(대시보드↔이메일 달성 판정 불일치 방지).
    labels: ["논문 읽기 기록"],
    label: "논문 읽기 3일",
    href: "/mypage/research?tab=reading",
    cta: "읽기 시작",
  },
  flashcard: {
    channel: "flashcard",
    area: "암기카드 복습",
    target: 3,
    labels: ["암기카드 학습"],
    label: "암기카드 3일",
    href: "/flashcards",
    cta: "복습하기",
  },
  writing: {
    channel: "writing",
    area: "논문 집필",
    target: 2,
    labels: ["논문 작성"],
    label: "집필 2일",
    href: "/mypage/research?tab=writing",
    cta: "이어쓰기",
  },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC 앵커 Date → YYYY-MM-DD (주차 계산은 UTC 고정으로 DST/월경계 드리프트 방지) */
function ymdOfUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** 로컬(KST) 오늘 YYYY-MM-DD — activityByDay 키와 동일 로컬 기준 */
export function localYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 주어진 YYYY-MM-DD 가 속한 주의 월요일 YYYY-MM-DD (주차 키) */
export function weekKeyOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diff = (dt.getUTCDay() + 6) % 7; // 월요일까지 되돌릴 일수 (0=Sun..6=Sat)
  dt.setUTCDate(dt.getUTCDate() - diff);
  return ymdOfUtc(dt);
}

/** 로컬 오늘 기준 이번 주 키(월요일) */
export function currentWeekKey(now: Date = new Date()): string {
  return weekKeyOf(localYmd(now));
}

/** 주차 키를 n주 이동 (음수 = 과거) */
export function addWeeks(weekKey: string, weeks: number): string {
  const [y, m, d] = weekKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  return ymdOfUtc(dt);
}

/** 주차 키(월요일)로부터 7일 YYYY-MM-DD 배열 (월~일) */
export function weekDays(weekKey: string): string[] {
  const [y, m, d] = weekKey.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + i);
    out.push(ymdOfUtc(dt));
  }
  return out;
}

/**
 * 해당 주(weekKey)에 채널 활동이 있던 "일수" 를 잔디 집계에서 센다.
 * activityByDay 는 하루당 라벨별 점수 Map 이므로, 라벨 존재 여부만으로 일수를 판정한다.
 */
export function countGoalDaysInWeek(
  activityByDay: Map<string, Map<string, number>>,
  channel: WeeklyGoalChannel,
  weekKey: string,
): number {
  const labels = WEEKLY_GOAL_PRESETS[channel].labels;
  let count = 0;
  for (const day of weekDays(weekKey)) {
    const m = activityByDay.get(day);
    if (m && labels.some((l) => m.has(l))) count += 1;
  }
  return count;
}

export interface WeeklyGoalJudgement {
  achieved: boolean;
  /** 달성 일수 (target 초과 가능) */
  progress: number;
  target: number;
  /** 진행률 0~1 (진행 바용) */
  ratio: number;
}

/** 목표 일수(target) 대비 달성 일수(count) 판정 */
export function judgeWeeklyGoal(target: number, count: number): WeeklyGoalJudgement {
  const t = Math.max(1, target);
  return {
    achieved: count >= t,
    progress: count,
    target: t,
    ratio: Math.min(1, count / t),
  };
}

// ─── v6-H3: 연속·추세 (weekly_goal_records 축적 위 순수 계산) ───

/** met(달성) 여부만 아는 주차 기록 최소 형태 */
export interface WeekMetLite {
  weekKey: string;
  met: boolean;
}

/**
 * 가장 최근 완료 주(lastCompletedWeekKey)부터 과거로 연속 달성(met=true)한 주 수.
 * 미달·기록 없음(목표 미설정)에서 끊긴다. 주는 7일 간격으로 역행하며 확인한다.
 */
export function computeGoalStreak(
  records: readonly WeekMetLite[],
  lastCompletedWeekKey: string,
): number {
  const metByWeek = new Map(records.map((r) => [r.weekKey, r.met]));
  let streak = 0;
  let wk = lastCompletedWeekKey;
  while (metByWeek.get(wk) === true) {
    streak += 1;
    wk = addWeeks(wk, -1);
  }
  return streak;
}

/** 미니 바 셀 — met: 달성 / false: 미달 / null: 목표 미설정(기록 없음) */
export interface WeekBarCell {
  weekKey: string;
  met: boolean | null;
}

/**
 * lastCompletedWeekKey 에서 과거로 count 주(기본 6)의 추세 셀 배열(오래된 주 → 최근 주).
 * 기록이 없는 주는 met=null(목표 미설정)로 채운다.
 */
export function recentWeekBars(
  records: readonly WeekMetLite[],
  lastCompletedWeekKey: string,
  count = 6,
): WeekBarCell[] {
  const metByWeek = new Map(records.map((r) => [r.weekKey, r.met]));
  const cells: WeekBarCell[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const wk = addWeeks(lastCompletedWeekKey, -i);
    const m = metByWeek.get(wk);
    cells.push({ weekKey: wk, met: m === undefined ? null : m });
  }
  return cells;
}
