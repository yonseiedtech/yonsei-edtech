"use client";

/**
 * GradActivityDashboard — 활동 종합 대시보드 (사이클 121 / 고도화 사이클 123)
 *
 * LearningStreak 의 activityByDay 를 받아 이번 달 활동을 영역
 * (연구활동·학술활동·대학원생활) 매트릭스 대시보드로 표시한다.
 *  - 상단: 영역 핵심 지표 카드(영역색 좌측 보더) + 영역별 누적 현황 chip
 *  - 하단: HabitTracker 매트릭스 표 + 차트 + 미니 캘린더
 *
 * 사이클 123 추가:
 *  - `areas` prop 으로 특정 영역만 표시(연구활동 전용 대시보드 등).
 *  - `enableCustomize` 로 활동(습관) 선택/추가/삭제 — localStorage 영속.
 */

import { useMemo, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2, Check, RotateCcw } from "lucide-react";
import HabitTracker from "./HabitTracker";
import {
  buildGradActivity,
  buildCumulativeSummary,
  getDefaultHabitKeysByArea,
  ACTIVITY_CATALOG,
  AREAS,
  type AreaSummary,
  type AreaKey,
  type CumulativeByArea,
  type CumulativeMetric,
} from "./grad-activity";
import {
  courseEnrollmentsApi,
  comprehensiveExamsApi,
  gradLifePositionsApi,
  externalActivitiesApi,
  attendeesApi,
  writingPaperHistoryApi,
  paperReadingLogsApi,
} from "@/lib/bkend";
import type {
  CourseEnrollment,
  ComprehensiveExamRecord,
  GradLifePosition,
  ExternalActivity,
  SeminarAttendee,
  WritingPaperHistory,
} from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";
import { cn } from "@/lib/utils";

/** 영역 대표색 → 정적 tailwind 클래스 (JIT purge 안전: 문자열 전부 명시) */
const AREA_COLOR_CLASS: Record<string, { border: string; accent: string; chip: string }> = {
  indigo: {
    border: "border-l-indigo-500 dark:border-l-indigo-400",
    accent: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  teal: {
    border: "border-l-teal-500 dark:border-l-teal-400",
    accent: "text-teal-600 dark:text-teal-400",
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  amber: {
    border: "border-l-amber-500 dark:border-l-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO datetime → 로컬 YYYY-MM-DD (distinct-day 집계용) */
function isoToYmd(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function AreaCard({
  summary,
  cumulative,
  loading,
}: {
  summary: AreaSummary;
  cumulative: CumulativeMetric[];
  loading: boolean;
}) {
  const colors = AREA_COLOR_CLASS[summary.color] ?? AREA_COLOR_CLASS.indigo;
  return (
    <div
      className={cn(
        "flex-1 min-w-[160px] rounded-xl border border-l-4 bg-card px-4 py-3",
        colors.border,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-lg leading-none" aria-hidden="true">
          {summary.emoji}
        </span>
        <span className="text-sm font-bold text-foreground">{summary.label}</span>
      </div>
      <div className="mt-2 flex items-end gap-4">
        <div className="flex flex-col">
          <span className={cn("text-2xl font-extrabold leading-none tabular-nums", colors.accent)}>
            {summary.activeDays}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">활동 일수</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold leading-none tabular-nums text-foreground/80">
            {summary.totalCount}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">총 활동 수</span>
        </div>
      </div>

      {cumulative.length > 0 && (
        <div className="mt-2.5 border-t border-border/60 pt-2">
          <p className="mb-1 text-[10px] font-semibold text-muted-foreground/80">누적 현황</p>
          {loading ? (
            <div className="flex gap-1">
              <span className="h-4 w-16 animate-pulse rounded-full bg-muted/60" aria-hidden />
              <span className="h-4 w-14 animate-pulse rounded-full bg-muted/60" aria-hidden />
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {cumulative.map((m) => (
                <span
                  key={m.label}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                    colors.chip,
                  )}
                  title={`${m.label} ${m.value}`}
                >
                  <span aria-hidden="true">{m.emoji}</span>
                  <span>{m.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 활동 커스터마이징 ───────────────────────── */

function readStoredKeys(storageKey: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
      return arr as string[];
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredKeys(storageKey: string, keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * localStorage 기반 활동 key 영속 훅 (useSyncExternalStore — set-state-in-effect 회피).
 *  - 서버/하이드레이션: defaultKeys (SSR 안전).
 *  - 클라이언트: 저장값 있으면 그 값, 없으면 defaultKeys.
 *  - set/reset 은 write-through + 즉시 구독자 알림.
 */
function usePersistentHabitKeys(
  storageKey: string,
  defaultKeys: string[],
  enabled: boolean,
): {
  habitKeys: string[];
  setHabitKeys: (updater: (prev: string[]) => string[]) => void;
  resetHabitKeys: () => void;
} {
  // 구독자 알림용 버전 카운터 (외부 store)
  const versionRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());
  // 메모 캐시(동일 입력 시 동일 참조 — useSyncExternalStore 무한루프 방지)
  const cacheRef = useRef<{ version: number; key: string; value: string[] } | null>(null);

  const subscribe = useCallback((cb: () => void) => {
    const set = listenersRef.current;
    set.add(cb);
    return () => set.delete(cb);
  }, []);

  const notify = useCallback(() => {
    versionRef.current += 1;
    listenersRef.current.forEach((cb) => cb());
  }, []);

  const getSnapshot = useCallback((): string[] => {
    if (!enabled) return defaultKeys;
    const cached = cacheRef.current;
    if (cached && cached.version === versionRef.current && cached.key === storageKey) {
      return cached.value;
    }
    const stored = readStoredKeys(storageKey);
    const value = stored ?? defaultKeys;
    cacheRef.current = { version: versionRef.current, key: storageKey, value };
    return value;
  }, [enabled, storageKey, defaultKeys]);

  const getServerSnapshot = useCallback(() => defaultKeys, [defaultKeys]);

  const habitKeys = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setHabitKeys = useCallback(
    (updater: (prev: string[]) => string[]) => {
      const prev = readStoredKeys(storageKey) ?? defaultKeys;
      const next = updater(prev);
      writeStoredKeys(storageKey, next);
      notify();
    },
    [storageKey, defaultKeys, notify],
  );

  const resetHabitKeys = useCallback(() => {
    writeStoredKeys(storageKey, defaultKeys);
    notify();
  }, [storageKey, defaultKeys, notify]);

  return { habitKeys, setHabitKeys, resetHabitKeys };
}

function CustomizePanel({
  catalogAreas,
  selected,
  onToggle,
  onReset,
  onClose,
}: {
  catalogAreas: AreaKey[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const areaSet = new Set(catalogAreas);
  const grouped = AREAS.filter((a) => areaSet.has(a.key)).map((a) => ({
    area: a,
    items: ACTIVITY_CATALOG.filter((c) => c.area === a.key),
  }));

  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">표시할 활동 선택</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw size={11} />
            기본값
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Check size={11} />
            완료
          </button>
        </div>
      </div>
      <div className="space-y-2.5">
        {grouped.map(({ area, items }) => (
          <div key={area.key}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {area.emoji} {area.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => {
                const on = selected.has(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(item.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <span aria-hidden="true">{item.emoji}</span>
                    {item.label}
                    {on && <Check size={10} className="ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        선택은 이 브라우저에 저장됩니다. 최소 한 개 이상 선택하세요.
      </p>
    </div>
  );
}

/* ───────────────────────────── main ───────────────────────────── */

export interface GradActivityDashboardProps {
  activityByDay: Map<string, Map<string, number>>;
  userId: string;
  /** 표시할 영역(들). 미지정 = 3영역 전부 */
  areas?: AreaKey[];
  /** 활동 커스터마이징 UI 노출 여부 (기본 false — 기존 화면 호환) */
  enableCustomize?: boolean;
  /** localStorage 키(커스터마이징 영속). enableCustomize 일 때 필요 */
  storageKey?: string;
  /** 섹션 헤더 — 미지정 시 기본 문구 */
  title?: string;
  description?: string;
  /** 상단 헤더 우측에 끼워 넣을 추가 노드(연구 타이머 compact 등) */
  headerExtra?: React.ReactNode;
  /** 누적 현황 chip 표시 여부 (기본 true) */
  showCumulative?: boolean;
}

export default function GradActivityDashboard({
  activityByDay,
  userId,
  areas,
  enableCustomize = false,
  storageKey,
  title,
  description,
  headerExtra,
  showCumulative = true,
}: GradActivityDashboardProps) {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const activeAreas: AreaKey[] = useMemo(
    () => areas ?? ["research", "academic", "grad"],
    [areas],
  );

  // ── 활동 커스터마이징 상태 ──
  const defaultKeys = useMemo(
    () => getDefaultHabitKeysByArea(...activeAreas),
    [activeAreas],
  );
  const effectiveStorageKey = storageKey ?? `mypage.habitKeys.${activeAreas.join("-")}`;

  const [customizeOpen, setCustomizeOpen] = useState(false);

  const { habitKeys, setHabitKeys, resetHabitKeys } = usePersistentHabitKeys(
    effectiveStorageKey,
    defaultKeys,
    enableCustomize,
  );

  const toggleKey = useCallback(
    (key: string) => {
      setHabitKeys((prev) => {
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        // 최소 1개 보장
        return next.length === 0 ? prev : next;
      });
    },
    [setHabitKeys],
  );

  const resetKeys = useCallback(() => {
    resetHabitKeys();
  }, [resetHabitKeys]);

  const selectedSet = useMemo(() => new Set(habitKeys), [habitKeys]);

  const { habits, achievedByDay, areaSummary } = useMemo(
    () =>
      buildGradActivity(activityByDay, year, month, {
        areas: activeAreas,
        habitKeys: enableCustomize ? habitKeys : undefined,
      }),
    [activityByDay, year, month, activeAreas, enableCustomize, habitKeys],
  );

  // ── 영역별 누적 현황 — 본인 데이터만 fetch ──
  const qOpts = { enabled: !!userId && showCumulative, staleTime: 5 * 60_000 } as const;

  const { data: coursesRes, isLoading: lCourses } = useQuery({
    queryKey: ["grad-cumulative", "courses", userId],
    queryFn: () => courseEnrollmentsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: examsRes, isLoading: lExams } = useQuery({
    queryKey: ["grad-cumulative", "exams", userId],
    queryFn: () => comprehensiveExamsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: positionsRes, isLoading: lPositions } = useQuery({
    queryKey: ["grad-cumulative", "grad-positions", userId],
    queryFn: () => gradLifePositionsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: externalRes, isLoading: lExternal } = useQuery({
    queryKey: ["grad-cumulative", "external", userId],
    queryFn: () => externalActivitiesApi.listByUser(userId),
    ...qOpts,
  });
  const { data: attendeesRes, isLoading: lAttendees } = useQuery({
    queryKey: ["grad-cumulative", "attendees", userId],
    queryFn: () => attendeesApi.listByUser(userId),
    ...qOpts,
  });
  const { data: writingRes, isLoading: lWriting } = useQuery({
    queryKey: ["grad-cumulative", "writing-history", userId],
    queryFn: () => writingPaperHistoryApi.listByUser(userId),
    ...qOpts,
  });
  const { data: readingRes, isLoading: lReading } = useQuery({
    queryKey: ["grad-cumulative", "paper-reading", userId],
    queryFn: () => paperReadingLogsApi.listByUser(userId),
    ...qOpts,
  });

  const cumulativeLoading =
    lCourses || lExams || lPositions || lExternal || lAttendees || lWriting || lReading;

  const cumulative: CumulativeByArea = useMemo(() => {
    const courses = (coursesRes?.data ?? []) as CourseEnrollment[];
    const exams = (examsRes?.data ?? []) as ComprehensiveExamRecord[];
    const positions = (positionsRes?.data ?? []) as GradLifePosition[];
    const external = (externalRes?.data ?? []) as ExternalActivity[];
    const attendees = (attendeesRes?.data ?? []) as SeminarAttendee[];
    const writing = (writingRes?.data ?? []) as WritingPaperHistory[];
    const reading = (readingRes?.data ?? []) as PaperReadingLog[];

    const seminarCount = attendees.filter((a) => a.checkedIn).length;
    const paperReadingCount = reading.filter(
      (r) => r.status === "done" || !!r.readAt,
    ).length;
    const writingDays = new Set<string>();
    for (const h of writing) {
      const ymd = isoToYmd(h.createdAt) ?? isoToYmd(h.savedAt);
      if (ymd) writingDays.add(ymd);
    }

    return buildCumulativeSummary({
      courseCount: courses.length,
      examPassedCount: exams.filter((e) => e.status === "passed").length,
      examTotalCount: exams.length,
      gradPositionCount: positions.length,
      seminarCount,
      externalCount: external.length,
      paperReadingCount,
      writingActiveDays: writingDays.size,
    });
  }, [coursesRes, examsRes, positionsRes, externalRes, attendeesRes, writingRes, readingRes]);

  const emptyByArea: CumulativeByArea = { research: [], academic: [], grad: [] };
  const cumulativeView = userId && showCumulative ? cumulative : emptyByArea;

  const isSingleArea = activeAreas.length === 1;
  const headTitle =
    title ??
    (isSingleArea
      ? `${AREAS.find((a) => a.key === activeAreas[0])?.label ?? "활동"} 대시보드`
      : "이번 달 활동 대시보드");
  const headDesc =
    description ??
    (isSingleArea
      ? `${AREAS.find((a) => a.key === activeAreas[0])?.label ?? "활동"}의 ${month}월 활동을 한눈에 살펴보세요.`
      : `연구활동·학술활동·대학원생활 세 영역의 ${month}월 활동을 한눈에 살펴보세요.`);

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">{headTitle}</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{headDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {enableCustomize && (
            <button
              type="button"
              onClick={() => setCustomizeOpen((v) => !v)}
              aria-expanded={customizeOpen}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                customizeOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <Settings2 size={12} />
              활동 편집
            </button>
          )}
        </div>
      </div>

      {enableCustomize && customizeOpen && (
        <CustomizePanel
          catalogAreas={activeAreas}
          selected={selectedSet}
          onToggle={toggleKey}
          onReset={resetKeys}
          onClose={() => setCustomizeOpen(false)}
        />
      )}

      {/* 영역 핵심 지표 카드 */}
      <div className="mt-3 flex flex-wrap gap-3">
        {areaSummary.map((s) => (
          <AreaCard
            key={s.areaKey}
            summary={s}
            cumulative={cumulativeView[s.areaKey as AreaKey]}
            loading={cumulativeLoading}
          />
        ))}
      </div>

      {/* 매트릭스 대시보드 */}
      <div className="mt-4">
        <HabitTracker
          year={year}
          month={month}
          habits={habits}
          achievedByDay={achievedByDay}
        />
      </div>
    </section>
  );
}
