/**
 * grad-activity — 대학원생활 종합 대시보드 데이터 변환
 *
 * LearningStreak 의 `activityByDay: Map<ymd, Map<label, score>>` 를
 * HabitTracker 가 소비하는 형태(habits / achievedByDay) + 3영역 요약으로 가공한다.
 *
 * 3영역(연구활동·학술활동·대학원생활) 정의와 활동 라벨 → 영역 매핑은 여기서만 관리한다.
 * (LearningStreak 의 add(...) 라벨 문자열과 정확히 일치해야 한다.)
 */

import type { HabitDef } from "./HabitTracker";

/* ─────────────────────────────── 영역 정의 ─────────────────────────── */

export type AreaKey = "research" | "academic" | "grad";

export interface AreaDef {
  key: AreaKey;
  label: string;
  emoji: string;
  /** 영역 대표색 — 좌측 보더 등에 쓰는 tailwind 클래스 */
  color: string;
}

export const AREAS: readonly AreaDef[] = [
  { key: "research", label: "연구활동", emoji: "🔬", color: "indigo" },
  { key: "academic", label: "학술활동", emoji: "📚", color: "teal" },
  { key: "grad", label: "대학원생활", emoji: "🎓", color: "amber" },
] as const;

/* ─────────────────────────────── 활동 라벨 정의 ─────────────────────── */

/** 활동 정의: LearningStreak 라벨 → habit key(영문 slug)·emoji·소속 영역 */
interface ActivityDef {
  label: string; // LearningStreak add() 라벨과 정확히 일치
  key: string; // habit key (영문 slug)
  emoji: string;
  area: AreaKey;
}

/**
 * 활동 마스터 테이블 (표 행 순서 = 영역 순서: 연구 → 학술 → 대학원생활).
 * 데이터에 한 번도 없는 활동도 매트릭스 행 유지를 위해 모두 포함한다.
 */
const ACTIVITIES: readonly ActivityDef[] = [
  // 연구활동 (research)
  { label: "논문 작성", key: "paper-writing", emoji: "✍️", area: "research" },
  { label: "논문 읽기 기록", key: "paper-reading-log", emoji: "📖", area: "research" },
  { label: "논문·아카이브 열람", key: "archive-view", emoji: "🗂️", area: "research" },
  { label: "학습 타이머", key: "study-timer", emoji: "⏱️", area: "research" },
  // 학술활동 (academic)
  { label: "세미나 출석", key: "seminar-attend", emoji: "🎤", area: "academic" },
  { label: "게시글 작성", key: "post-write", emoji: "📝", area: "academic" },
  { label: "강의 후기", key: "course-review", emoji: "💬", area: "academic" },
  { label: "댓글", key: "comment", emoji: "💭", area: "academic" },
  // 대학원생활 (grad)
  { label: "회고 작성", key: "reflection", emoji: "🪞", area: "grad" },
  { label: "과제 완료", key: "assignment-done", emoji: "✅", area: "grad" },
] as const;

/** label → ActivityDef 조회 맵 */
const LABEL_TO_ACTIVITY = new Map<string, ActivityDef>(
  ACTIVITIES.map((a) => [a.label, a]),
);

/* ─────────────────────────────── 헬퍼 ─────────────────────────────── */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ymd("YYYY-MM-DD") 가 해당 year/month 에 속하는지 */
function isInMonth(ymd: string, year: number, month: number): boolean {
  return ymd.startsWith(`${year}-${pad2(month)}-`);
}

/* ─────────────────────────────── 결과 타입 ─────────────────────────── */

export interface AreaSummary {
  areaKey: AreaKey;
  label: string;
  emoji: string;
  color: string;
  /** 그달 활동이 1개 이상 있던 distinct 일수 */
  activeDays: number;
  /** 그달 활동 총 건수(라벨 등장 횟수 합) */
  totalCount: number;
}

export interface GradActivityResult {
  habits: HabitDef[];
  achievedByDay: Map<string, Set<string>>;
  areaSummary: AreaSummary[];
}

/* ─────────────────────────────── 변환 ─────────────────────────────── */

/**
 * activityByDay 를 HabitTracker props + 영역 요약으로 변환한다.
 *
 * @param activityByDay Map<ymd, Map<label, score>> — LearningStreak useMemo 결과
 * @param year 표시 연도
 * @param month 표시 월(1-12)
 */
export function buildGradActivity(
  activityByDay: Map<string, Map<string, number>>,
  year: number,
  month: number,
): GradActivityResult {
  // habits: 마스터 테이블 전체(데이터 유무 무관 행 유지)
  const habits: HabitDef[] = ACTIVITIES.map((a) => ({
    key: a.key,
    label: a.label,
    emoji: a.emoji,
  }));

  // achievedByDay: 해당 월 ymd 의 label → habit key Set
  const achievedByDay = new Map<string, Set<string>>();

  // 영역별 누적기 (distinct 일수 / 총 건수)
  const areaActiveDays = new Map<AreaKey, Set<string>>();
  const areaTotalCount = new Map<AreaKey, number>();
  for (const a of AREAS) {
    areaActiveDays.set(a.key, new Set<string>());
    areaTotalCount.set(a.key, 0);
  }

  for (const [ymd, labels] of activityByDay) {
    if (!isInMonth(ymd, year, month)) continue;

    const keySet = new Set<string>();
    for (const label of labels.keys()) {
      const act = LABEL_TO_ACTIVITY.get(label);
      if (!act) continue; // 매핑 없는 라벨은 무시(미래 라벨 안전장치)
      keySet.add(act.key);
      areaActiveDays.get(act.area)!.add(ymd);
      areaTotalCount.set(act.area, (areaTotalCount.get(act.area) ?? 0) + 1);
    }
    if (keySet.size > 0) achievedByDay.set(ymd, keySet);
  }

  const areaSummary: AreaSummary[] = AREAS.map((a) => ({
    areaKey: a.key,
    label: a.label,
    emoji: a.emoji,
    color: a.color,
    activeDays: areaActiveDays.get(a.key)!.size,
    totalCount: areaTotalCount.get(a.key)!,
  }));

  return { habits, achievedByDay, areaSummary };
}
