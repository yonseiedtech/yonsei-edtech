"use client";

/**
 * useSemesterWrapped — 회원 본인의 "이번 학기 학회 발자취"(Wrapped) 집계 훅.
 *
 * 축적된 활동 데이터를 회원 본인에게 "이번 학기 나의 성장" 서사로 되돌려주는
 * 리포트(/mypage/wrapped)용 집계. 비교·등수 없이 개인 성장만 다룬다.
 *
 * v-rework(2026-07-27): "집필 글자수·진단 준비도" 지표를 걷어내고
 *  ① 학술활동 ② 연구활동 ③ 대학원 생활 ④ 운영진 활동 4개 카테고리 중심으로 재구성.
 *  - 카테고리 3종(학술/연구/대학원)은 useGradActivityData 의 activityByDay(라벨별 일자
 *    집계)를 그대로 순회해 산출 → 신규 fetch 없음(캐시 재사용).
 *  - 운영진 활동만 신규 집계(staff_tasks 완료 업무 + handover_docs 업무수행철).
 *    비운영진이면 쿼리·카테고리 자체를 건너뛴다(role 게이트).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendeesApi,
  paperReadingLogsApi,
  flashcardsApi,
  dataApi,
} from "@/lib/bkend";
import { currentSemesterKey } from "@/lib/semester";
import { useGradActivityData } from "./useGradActivityData";
import type { SeminarAttendee } from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";
import type { Flashcard } from "@/types/flashcard";

// ── 학기 경계 ──────────────────────────────────────────────

export interface SemesterBounds {
  /** "YYYY-1"(전기) | "YYYY-2"(후기) */
  key: string;
  /** "2026년 전기" 표시용 */
  label: string;
  /** 학기 시작일 YYYY-MM-DD (전기 03-01 / 후기 09-01) */
  startYmd: string;
  /** 학기 종료일 YYYY-MM-DD (전기 08-31 / 후기 이듬해 02-29 상한) */
  endYmd: string;
  /** 종료일 Date (시즌 판정용) */
  endDate: Date;
}

/** 현재 KST 학기의 일자(YYYY-MM-DD) 경계. semester.ts(월 단위)를 일 단위로 확장. */
export function getSemesterBounds(now: Date = new Date()): SemesterBounds {
  const key = currentSemesterKey(now);
  const [yStr, half] = key.split("-");
  const y = Number(yStr);
  if (half === "1") {
    return {
      key,
      label: `${y}년 전기`,
      startYmd: `${y}-03-01`,
      endYmd: `${y}-08-31`,
      endDate: new Date(y, 7, 31),
    };
  }
  return {
    key,
    label: `${y}년 후기`,
    startYmd: `${y}-09-01`,
    endYmd: `${y + 1}-02-29`,
    endDate: new Date(y + 1, 1, 28),
  };
}

/**
 * "학기 말"(Wrapped 노출 시즌) 여부 — 종료일까지 45일 이내(약 6주).
 * 마이페이지 진입 카드의 과밀 방지 게이트로 사용(fetch 없이 날짜만 계산).
 */
export function isWrappedSeason(now: Date = new Date()): boolean {
  const { endDate } = getSemesterBounds(now);
  const daysLeft = (endDate.getTime() - now.getTime()) / 86_400_000;
  return daysLeft <= 45 && daysLeft >= -14;
}

// ── 카테고리 매핑 ──────────────────────────────────────────

export type CategoryKey = "academic" | "research" | "grad" | "staff";

/** activityByDay 라벨 → 4카테고리. 없는 라벨은 "대학원 생활"(grad)로 폴백. */
const CATEGORY_OF: Record<string, CategoryKey> = {
  // 학술활동
  "세미나 출석": "academic",
  "학습 타이머": "academic",
  "과제 완료": "academic",
  "회고 작성": "academic",
  "모임·행사 참석": "academic",
  "강의 후기": "academic",
  // 연구활동
  "논문 작성": "research",
  "논문 읽기 기록": "research",
  "논문·아카이브 열람": "research",
  "공동 연구 참여": "research",
  "공동 집필": "research",
  "연구 회의": "research",
  "마일스톤 달성": "research",
  "연구지 출판": "research",
  "문헌 매트릭스 정리": "research",
  "연구 모형 작성": "research",
  "스튜디오 제작": "research",
  // 대학원 생활
  "게시글 작성": "grad",
  "댓글": "grad",
  "온보딩 체크리스트": "grad",
  "온보딩 배지": "grad",
  "방학 주간 목표 달성": "grad",
  "암기카드 학습": "grad",
};

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; icon: string; eyebrow: string }
> = {
  academic: { label: "학술활동", icon: "Users", eyebrow: "배움" },
  research: { label: "연구활동", icon: "FlaskConical", eyebrow: "탐구" },
  grad: { label: "대학원 생활", icon: "GraduationCap", eyebrow: "일상" },
  staff: { label: "운영진 활동", icon: "Shield", eyebrow: "헌신" },
};

/** 운영진으로 간주하는 role — 이 집합일 때만 운영진 활동을 집계. */
const STAFF_ROLES = new Set(["staff", "president", "admin", "sysadmin"]);

// ── 집계 지표 ──────────────────────────────────────────────

export interface WrappedCategory {
  key: CategoryKey;
  label: string;
  /** CATEGORY_META 의 lucide 아이콘 이름(뷰에서 컴포넌트로 매핑) */
  icon: string;
  eyebrow: string;
  /** 이 카테고리로 활동이 기록된 고유 일수 */
  days: number;
  /** 이 카테고리 누적 점수(잔디 점수 합) */
  score: number;
  /** 대표 활동 라벨 상위 2~3종 */
  topLabels: string[];
  /** 활동 인스턴스(라벨×일자 셀) 건수 */
  count: number;
}

export interface WrappedMetrics {
  semesterLabel: string;
  /** 학기키 "YYYY-1"|"YYYY-2" — 공유 링크 소스 태깅용(비 PII). */
  semesterKey: string;
  startYmd: string;
  endYmd: string;

  /** 학기 중 활동이 기록된 고유 일수 */
  totalStudyDays: number;
  /** 학기 중 최장 연속 활동 일수 */
  longestStreak: number;
  /** 학기 중 누적 활동 점수(잔디 점수 합) */
  activityScore: number;

  /** 4카테고리 요약(데이터 있는 것만, 운영진은 role 게이트). 점수 내림차순. */
  categories: WrappedCategory[];

  /** 학기 중 완독한 논문 편수(연구활동 요약) */
  papersRead: number;
  /** 학기 중 출석 체크한 세미나 수(학술활동 요약) */
  seminarsAttended: number;

  /** 누적 암기카드 수(대학원 생활 보조 지표) */
  flashcardTotal: number;
  /** 누적 암기카드 정답률(0~100). 복습 이력 없으면 null */
  flashcardCorrectRate: number | null;

  /** 운영진 여부(role 게이트 통과) */
  isStaff: boolean;
  /** 학기 중 완료한 운영 업무(staff_tasks status==="done") 수 */
  staffTasksDone: number;
  /** 학기 중 작성한 업무수행철(handover_docs) 수 */
  handoverAuthored: number;

  isLoading: boolean;
  /** 리포트로 보여줄 만한 최소 데이터 존재 여부 */
  hasData: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToYmd(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return ymdLocal(d);
}

/** 정렬된 YYYY-MM-DD 목록에서 최장 연속 일수 */
function longestConsecutive(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const cur = new Date(`${sorted[i]}T00:00:00`);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) run += 1;
    else if (diff > 1) run = 1;
    // diff === 0 (중복) → 유지
    if (run > best) best = run;
  }
  return best;
}

export function useSemesterWrapped(
  userId: string | undefined,
  role: string | undefined,
): WrappedMetrics {
  const bounds = useMemo(() => getSemesterBounds(), []);
  const { activityByDay, scoresByDay, isLoading: dayLoading } =
    useGradActivityData(userId);

  const isStaff = !!role && STAFF_ROLES.has(role);
  const qOpts = { enabled: !!userId, staleTime: 5 * 60_000 } as const;

  // useGradActivityData 와 동일 키 → 캐시 히트(신규 fetch 없음). 세부 요약 지표만 재사용.
  const { data: attendeesRes } = useQuery({
    queryKey: ["grad-activity", "attendees", userId],
    queryFn: () => attendeesApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: readingRes } = useQuery({
    queryKey: ["grad-activity", "paper-reading-logs", userId],
    queryFn: () => paperReadingLogsApi.listByUser(userId!),
    ...qOpts,
  });
  // 누적 지표 — 일자 소스에 없어 신규 1쿼리.
  const { data: flashcardsRes, isLoading: fcLoading } = useQuery({
    queryKey: ["grad-activity", "flashcards", userId],
    queryFn: () => flashcardsApi.listByUser(userId!),
    ...qOpts,
  });

  // ── 운영진 활동 (role 게이트) — 비운영진이면 enabled:false 로 쿼리 자체 건너뜀 ──
  const staffOpts = {
    enabled: !!userId && isStaff,
    staleTime: 5 * 60_000,
  } as const;
  const { data: staffTasksRes, isLoading: stLoading } = useQuery({
    queryKey: ["wrapped", "staff-tasks", userId],
    queryFn: () =>
      dataApi.list<{ status?: string; updatedAt?: string; assigneeId?: string }>(
        "staff_tasks",
        { "filter[assigneeId]": userId!, limit: 500 },
      ),
    ...staffOpts,
  });
  const { data: handoverRes, isLoading: hoLoading } = useQuery({
    queryKey: ["wrapped", "handover-docs", userId],
    queryFn: () =>
      dataApi.list<{ createdAt?: string; authorId?: string }>("handover_docs", {
        "filter[authorId]": userId!,
        limit: 200,
      }),
    ...staffOpts,
  });

  return useMemo<WrappedMetrics>(() => {
    const { startYmd, endYmd } = bounds;
    const inRange = (ymd: string | null): boolean =>
      !!ymd && ymd >= startYmd && ymd <= endYmd;

    // ── 일자 단위 (잔디) — 카테고리 집계 ──
    interface CatAgg {
      dayset: Set<string>;
      score: number;
      count: number;
      labelScore: Map<string, number>;
    }
    const aggs = new Map<CategoryKey, CatAgg>();
    const ensure = (k: CategoryKey): CatAgg => {
      let a = aggs.get(k);
      if (!a) {
        a = { dayset: new Set(), score: 0, count: 0, labelScore: new Map() };
        aggs.set(k, a);
      }
      return a;
    };

    const rangeDays: string[] = [];
    for (const [ymd, labelMap] of activityByDay) {
      if (!inRange(ymd)) continue;
      rangeDays.push(ymd);
      for (const [label, score] of labelMap) {
        const key = CATEGORY_OF[label] ?? "grad";
        const a = ensure(key);
        a.dayset.add(ymd);
        a.score += score;
        a.count += 1;
        a.labelScore.set(label, (a.labelScore.get(label) ?? 0) + score);
      }
    }

    let activityScore = 0;
    for (const [ymd, score] of scoresByDay) {
      if (inRange(ymd)) activityScore += score;
    }

    // ── 논문 읽기(연구활동 요약) ──
    let papersRead = 0;
    for (const r of (readingRes?.data ?? []) as PaperReadingLog[]) {
      if (r.status !== "done") continue;
      if (!inRange(r.readAt)) continue;
      papersRead += 1;
    }

    // ── 세미나 출석(학술활동 요약) ──
    let seminarsAttended = 0;
    for (const a of (attendeesRes?.data ?? []) as SeminarAttendee[]) {
      if (!a.checkedIn) continue;
      const ymd = isoToYmd(a.checkedInAt) ?? isoToYmd(a.createdAt);
      if (inRange(ymd)) seminarsAttended += 1;
    }

    // ── 암기카드 (누적, 대학원 생활 보조) ──
    const cards = (flashcardsRes?.data ?? []) as Flashcard[];
    const flashcardTotal = cards.length;
    let reviewSum = 0;
    let correctSum = 0;
    for (const c of cards) {
      reviewSum += c.reviewCount ?? 0;
      correctSum += c.correctCount ?? 0;
    }
    const flashcardCorrectRate =
      reviewSum > 0 ? Math.round((correctSum / reviewSum) * 100) : null;

    // ── 운영진 활동 (role 게이트) ──
    let staffTasksDone = 0;
    let handoverAuthored = 0;
    const staffDays = new Set<string>();
    if (isStaff) {
      for (const t of staffTasksRes?.data ?? []) {
        if (t.status !== "done") continue;
        const ymd = isoToYmd(t.updatedAt);
        if (!inRange(ymd)) continue;
        staffTasksDone += 1;
        if (ymd) staffDays.add(ymd);
      }
      for (const h of handoverRes?.data ?? []) {
        const ymd = isoToYmd(h.createdAt);
        if (!inRange(ymd)) continue;
        handoverAuthored += 1;
        if (ymd) staffDays.add(ymd);
      }
    }

    // ── 카테고리 배열(점수 내림차순, 데이터 있는 것만) ──
    const categories: WrappedCategory[] = [];
    for (const key of ["academic", "research", "grad"] as CategoryKey[]) {
      const a = aggs.get(key);
      if (!a || a.count === 0) continue;
      const meta = CATEGORY_META[key];
      const topLabels = [...a.labelScore.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([label]) => label);
      categories.push({
        key,
        label: meta.label,
        icon: meta.icon,
        eyebrow: meta.eyebrow,
        days: a.dayset.size,
        score: a.score,
        topLabels,
        count: a.count,
      });
    }
    if (isStaff && (staffTasksDone > 0 || handoverAuthored > 0)) {
      const meta = CATEGORY_META.staff;
      const topLabels: string[] = [];
      if (staffTasksDone > 0) topLabels.push("완료 업무");
      if (handoverAuthored > 0) topLabels.push("업무수행철");
      categories.push({
        key: "staff",
        label: meta.label,
        icon: meta.icon,
        eyebrow: meta.eyebrow,
        days: staffDays.size,
        score: staffTasksDone + handoverAuthored,
        topLabels,
        count: staffTasksDone + handoverAuthored,
      });
    }
    categories.sort((a, b) => b.score - a.score);

    const totalStudyDays = rangeDays.length;
    const longestStreak = longestConsecutive(rangeDays);

    const hasData =
      totalStudyDays > 0 ||
      categories.length > 0 ||
      papersRead > 0 ||
      seminarsAttended > 0 ||
      flashcardTotal > 0 ||
      staffTasksDone > 0 ||
      handoverAuthored > 0;

    return {
      semesterLabel: bounds.label,
      semesterKey: bounds.key,
      startYmd,
      endYmd,
      totalStudyDays,
      longestStreak,
      activityScore,
      categories,
      papersRead,
      seminarsAttended,
      flashcardTotal,
      flashcardCorrectRate,
      isStaff,
      staffTasksDone,
      handoverAuthored,
      isLoading: dayLoading || fcLoading || stLoading || hoLoading,
      hasData,
    };
  }, [
    bounds,
    activityByDay,
    scoresByDay,
    attendeesRes,
    readingRes,
    flashcardsRes,
    isStaff,
    staffTasksRes,
    handoverRes,
    dayLoading,
    fcLoading,
    stLoading,
    hoLoading,
  ]);
}
