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
 *
 * 사이클 123: 활동(습관) 커스터마이징의 카탈로그 역할도 겸한다.
 *  - 사용자는 이 목록에서 표시할 활동을 선택/추가/삭제할 수 있다(키 기준).
 */
const ACTIVITIES: readonly ActivityDef[] = [
  // 연구활동 (research)
  { label: "논문 작성", key: "paper-writing", emoji: "✍️", area: "research" },
  { label: "논문 읽기 기록", key: "paper-reading-log", emoji: "📖", area: "research" },
  { label: "논문·아카이브 열람", key: "archive-view", emoji: "🗂️", area: "research" },
  { label: "진단평가", key: "diagnosis", emoji: "🧭", area: "research" },
  { label: "암기카드 학습", key: "flashcard-study", emoji: "🃏", area: "research" },
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

/** key → ActivityDef 조회 맵 */
const KEY_TO_ACTIVITY = new Map<string, ActivityDef>(
  ACTIVITIES.map((a) => [a.key, a]),
);

/* ─────────────────────────── 활동 커스터마이징 카탈로그 ────────────────── */

/** 커스터마이징 UI 에서 쓰는 카탈로그 항목 한 개(읽기 전용 메타) */
export interface ActivityCatalogItem {
  key: string;
  label: string;
  emoji: string;
  area: AreaKey;
}

/** 전체 활동 카탈로그(영역 순서 유지) — 선택/추가 picker 의 소스 */
export const ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = ACTIVITIES.map(
  (a) => ({ key: a.key, label: a.label, emoji: a.emoji, area: a.area }),
);

/** 기본 활동 key 목록(현재 10종+1 전체) — 미설정 사용자의 기본값 */
function getDefaultHabitKeys(): string[] {
  return ACTIVITIES.map((a) => a.key);
}

/** 특정 영역(들)의 기본 활동 key 목록 */
export function getDefaultHabitKeysByArea(...areas: AreaKey[]): string[] {
  const set = new Set(areas);
  return ACTIVITIES.filter((a) => set.has(a.area)).map((a) => a.key);
}

/** key 목록 → HabitDef[] (카탈로그 순서 유지, 미존재 key 는 무시) */
function buildHabitsFromKeys(keys: string[]): HabitDef[] {
  const wanted = new Set(keys);
  return ACTIVITIES.filter((a) => wanted.has(a.key)).map((a) => ({
    key: a.key,
    label: a.label,
    emoji: a.emoji,
  }));
}

/** key → 소속 영역 (없으면 undefined) */
function areaOfHabitKey(key: string): AreaKey | undefined {
  return KEY_TO_ACTIVITY.get(key)?.area;
}

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

/* ──────────────────── 영역별 누적 현황 (이번 달이 아닌 전체 누적) ──────────── */

/** 한 영역에 표시할 누적 지표 chip 한 개 */
export interface CumulativeMetric {
  emoji: string;
  /** 짧은 라벨 — 예: "논문", "수강" */
  label: string;
  /** 값 — 예: "5편", "9과목". 미정/로딩이면 호출부에서 처리 */
  value: string;
}

export type CumulativeByArea = Record<AreaKey, CumulativeMetric[]>;

/** buildCumulativeSummary 입력 — 각 소스의 원시 건수/일수(본인 데이터만 사전 필터 가정) */
export interface CumulativeInput {
  /** 대학원생활 */
  courseCount: number;
  examPassedCount: number;
  examTotalCount: number;
  gradPositionCount: number;
  /** 학술 */
  seminarCount: number;
  externalCount: number;
  /** 연구 */
  paperReadingCount: number;
  writingActiveDays: number;
}

/**
 * 영역별 누적 현황 chip 목록을 만든다(표시는 호출부에서).
 * 0건이어도 chip 은 유지(0 표기) — "아직 없음"도 정보가 된다.
 */
export function buildCumulativeSummary(input: CumulativeInput): CumulativeByArea {
  return {
    grad: [
      { emoji: "📚", label: "수강", value: `${input.courseCount}과목` },
      {
        emoji: "📋",
        label: "종합시험",
        value:
          input.examPassedCount > 0
            ? `${input.examPassedCount}/${input.examTotalCount}`
            : `${input.examTotalCount}`,
      },
      { emoji: "🎓", label: "전공활동", value: `${input.gradPositionCount}` },
    ],
    academic: [
      { emoji: "🎤", label: "세미나", value: `${input.seminarCount}` },
      { emoji: "🌐", label: "대외", value: `${input.externalCount}` },
    ],
    research: [
      { emoji: "📖", label: "논문", value: `${input.paperReadingCount}편` },
      { emoji: "✍️", label: "작성", value: `${input.writingActiveDays}일` },
    ],
  };
}

/* ─────────────────────────────── 변환 ─────────────────────────────── */

/** buildGradActivity 옵션 (사이클 123) */
export interface BuildGradActivityOptions {
  /** 표시할 활동 key 화이트리스트. 미지정 = 전체(기본 10종+) */
  habitKeys?: string[];
  /** 표시·집계할 영역 화이트리스트. 미지정 = 3영역 전부 */
  areas?: AreaKey[];
}

/**
 * activityByDay 를 HabitTracker props + 영역 요약으로 변환한다.
 *
 * @param activityByDay Map<ymd, Map<label, score>> — LearningStreak useMemo 결과
 * @param year 표시 연도
 * @param month 표시 월(1-12)
 * @param options 활동/영역 필터(커스터마이징·영역 전용 대시보드용)
 */
export function buildGradActivity(
  activityByDay: Map<string, Map<string, number>>,
  year: number,
  month: number,
  options: BuildGradActivityOptions = {},
): GradActivityResult {
  const areaWhitelist = options.areas ? new Set(options.areas) : null;

  // 표시할 habit key 화이트리스트 결정
  //  - habitKeys 지정 시 그 순서/구성 따름(카탈로그 순서로 정렬)
  //  - 미지정 시 영역 화이트리스트에 속한 전체
  const wantedKeys = options.habitKeys
    ? new Set(options.habitKeys)
    : null;

  const visibleActivities = ACTIVITIES.filter((a) => {
    if (areaWhitelist && !areaWhitelist.has(a.area)) return false;
    if (wantedKeys && !wantedKeys.has(a.key)) return false;
    return true;
  });

  // habits: 필터된 마스터 테이블(데이터 유무 무관 행 유지)
  const habits: HabitDef[] = visibleActivities.map((a) => ({
    key: a.key,
    label: a.label,
    emoji: a.emoji,
  }));
  const visibleKeySet = new Set(visibleActivities.map((a) => a.key));

  // achievedByDay: 해당 월 ymd 의 label → habit key Set (보이는 활동만)
  const achievedByDay = new Map<string, Set<string>>();

  // 집계 대상 영역(영역 화이트리스트 적용)
  const targetAreas = areaWhitelist
    ? AREAS.filter((a) => areaWhitelist.has(a.key))
    : AREAS;

  // 영역별 누적기 (distinct 일수 / 총 건수)
  const areaActiveDays = new Map<AreaKey, Set<string>>();
  const areaTotalCount = new Map<AreaKey, number>();
  for (const a of targetAreas) {
    areaActiveDays.set(a.key, new Set<string>());
    areaTotalCount.set(a.key, 0);
  }

  for (const [ymd, labels] of activityByDay) {
    if (!isInMonth(ymd, year, month)) continue;

    const keySet = new Set<string>();
    for (const label of labels.keys()) {
      const act = LABEL_TO_ACTIVITY.get(label);
      if (!act) continue; // 매핑 없는 라벨은 무시(미래 라벨 안전장치)
      if (!visibleKeySet.has(act.key)) continue; // 화이트리스트 밖은 제외
      keySet.add(act.key);
      areaActiveDays.get(act.area)?.add(ymd);
      areaTotalCount.set(act.area, (areaTotalCount.get(act.area) ?? 0) + 1);
    }
    if (keySet.size > 0) achievedByDay.set(ymd, keySet);
  }

  const areaSummary: AreaSummary[] = targetAreas.map((a) => ({
    areaKey: a.key,
    label: a.label,
    emoji: a.emoji,
    color: a.color,
    activeDays: areaActiveDays.get(a.key)?.size ?? 0,
    totalCount: areaTotalCount.get(a.key) ?? 0,
  }));

  return { habits, achievedByDay, areaSummary };
}
