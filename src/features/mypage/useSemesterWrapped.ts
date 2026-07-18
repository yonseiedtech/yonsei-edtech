"use client";

/**
 * useSemesterWrapped — 회원 본인의 "이번 학기 학회 발자취"(Wrapped) 집계 훅 (v6-H2).
 *
 * 축적된 활동 데이터를 회원 본인에게 "이번 학기 나의 성장" 서사로 되돌려주는
 * 리포트(/mypage/wrapped)용 집계. 비교·등수 없이 개인 성장만 다룬다.
 *
 * 읽기 비용 최소화 원칙:
 *  - 일자 단위 지표(총 학습일·최장 스트릭·활동 점수)는 useGradActivityData 를 재사용.
 *  - 세부 지표(읽은 논문·집필 글자수·진단 준비도·세미나 참석)는 useGradActivityData 가
 *    이미 로드한 것과 "동일한 react-query 키"로 재조회 → 캐시 히트(신규 fetch 없음).
 *  - 암기카드 정답률만 신규 1쿼리(누적 지표라 일자 소스에 없음).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendeesApi,
  writingPaperHistoryApi,
  paperReadingLogsApi,
  diagnosticResultsApi,
  flashcardsApi,
} from "@/lib/bkend";
import { currentSemesterKey } from "@/lib/semester";
import { useGradActivityData } from "./useGradActivityData";
import type {
  SeminarAttendee,
  WritingPaperHistory,
} from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";
import type { DiagnosticResult } from "@/types/diagnostic";
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

// ── 집계 지표 ──────────────────────────────────────────────

export interface WrappedMetrics {
  semesterLabel: string;
  startYmd: string;
  endYmd: string;

  /** 학기 중 활동이 기록된 고유 일수 */
  totalStudyDays: number;
  /** 학기 중 최장 연속 활동 일수 */
  longestStreak: number;
  /** 학기 중 누적 활동 점수(잔디 점수 합) */
  activityScore: number;
  /** 활동 라벨별 일수 상위 3종 (구성 요약) */
  topLabels: { label: string; days: number }[];

  /** 학기 중 완독한 논문 편수 */
  papersRead: number;
  /** 학기 중 가장 오래 읽은 논문(타이머 기록 기준) */
  longestReadPaper: { title: string; durationMin: number } | null;

  /** 학기 중 집필 최고 글자수(도달치) */
  writingPeakChars: number;
  /** 학기 시작 대비 집필 글자수 증감 */
  writingDelta: number;

  /** 학기 중 진단 응시 횟수 */
  diagnosticCount: number;
  /** 학기 내 최초→최신 논문 작성 준비도 변화 (응시 2회 미만이면 null) */
  paperReadinessDelta: number | null;
  /** 학기 내 최초→최신 연구 분석 준비도 변화 (응시 2회 미만이면 null) */
  analysisReadinessDelta: number | null;
  /** 최신 논문 작성 준비도(0~100) */
  latestPaperReadiness: number | null;
  /** 최신 연구 분석 준비도(0~100) */
  latestAnalysisReadiness: number | null;

  /** 누적 암기카드 수 */
  flashcardTotal: number;
  /** 누적 암기카드 정답률(0~100). 복습 이력 없으면 null */
  flashcardCorrectRate: number | null;

  /** 학기 중 출석 체크한 세미나 수 */
  seminarsAttended: number;

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

export function useSemesterWrapped(userId: string | undefined): WrappedMetrics {
  const bounds = useMemo(() => getSemesterBounds(), []);
  const { activityByDay, scoresByDay, isLoading: dayLoading } =
    useGradActivityData(userId);

  const qOpts = { enabled: !!userId, staleTime: 5 * 60_000 } as const;

  // useGradActivityData 와 동일 키 → 캐시 히트(신규 fetch 없음). 세부 raw 배열만 재사용.
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
  const { data: writingRes } = useQuery({
    queryKey: ["grad-activity", "writing-paper-history", userId],
    queryFn: () => writingPaperHistoryApi.listByUser(userId!),
    ...qOpts,
  });
  const { data: diagnosticRes } = useQuery({
    queryKey: ["grad-activity", "diagnostic-results", userId],
    queryFn: () => diagnosticResultsApi.listByUser(userId!),
    ...qOpts,
  });
  // 누적 지표 — 일자 소스에 없어 신규 1쿼리.
  const { data: flashcardsRes, isLoading: fcLoading } = useQuery({
    queryKey: ["grad-activity", "flashcards", userId],
    queryFn: () => flashcardsApi.listByUser(userId!),
    ...qOpts,
  });

  return useMemo<WrappedMetrics>(() => {
    const { startYmd, endYmd } = bounds;
    const inRange = (ymd: string | null): boolean =>
      !!ymd && ymd >= startYmd && ymd <= endYmd;

    // ── 일자 단위 (잔디) ──
    const rangeDays: string[] = [];
    const labelDays = new Map<string, number>();
    for (const [ymd, labelMap] of activityByDay) {
      if (!inRange(ymd)) continue;
      rangeDays.push(ymd);
      for (const label of labelMap.keys()) {
        labelDays.set(label, (labelDays.get(label) ?? 0) + 1);
      }
    }
    let activityScore = 0;
    for (const [ymd, score] of scoresByDay) {
      if (inRange(ymd)) activityScore += score;
    }
    const topLabels = [...labelDays.entries()]
      .map(([label, days]) => ({ label, days }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 3);

    // ── 논문 읽기 ──
    let papersRead = 0;
    let longestReadPaper: { title: string; durationMin: number } | null = null;
    for (const r of (readingRes?.data ?? []) as PaperReadingLog[]) {
      if (r.status !== "done") continue;
      if (!inRange(r.readAt)) continue;
      papersRead += 1;
      const dur = r.durationMin ?? 0;
      if (dur > 0 && (!longestReadPaper || dur > longestReadPaper.durationMin)) {
        longestReadPaper = { title: r.title, durationMin: dur };
      }
    }

    // ── 집필 글자수 ──
    const writingInRange = ((writingRes?.data ?? []) as WritingPaperHistory[])
      .filter((h) => inRange(isoToYmd(h.savedAt) ?? isoToYmd(h.createdAt)))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    let writingPeakChars = 0;
    for (const h of writingInRange) {
      if ((h.charCount ?? 0) > writingPeakChars) writingPeakChars = h.charCount ?? 0;
    }
    const writingDelta =
      writingInRange.length >= 2
        ? (writingInRange[writingInRange.length - 1].charCount ?? 0) -
          (writingInRange[0].charCount ?? 0)
        : writingInRange.length === 1
          ? (writingInRange[0].charCount ?? 0)
          : 0;

    // ── 진단 준비도 변화 ──
    const allDiag = ((diagnosticRes?.data ?? []) as DiagnosticResult[]).filter(
      (d) => d.createdAt,
    );
    const diagInRange = allDiag
      .filter((d) => inRange(isoToYmd(d.createdAt)))
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    const diagnosticCount = diagInRange.length;
    let paperReadinessDelta: number | null = null;
    let analysisReadinessDelta: number | null = null;
    if (diagInRange.length >= 2) {
      const first = diagInRange[0];
      const last = diagInRange[diagInRange.length - 1];
      paperReadinessDelta = last.paperReadiness - first.paperReadiness;
      analysisReadinessDelta = last.analysisReadiness - first.analysisReadiness;
    }
    // 최신값은 전체 이력(desc 정렬로 첫 항목) 기준
    const latest = allDiag[0] ?? null;
    const latestPaperReadiness = latest?.paperReadiness ?? null;
    const latestAnalysisReadiness = latest?.analysisReadiness ?? null;

    // ── 암기카드 (누적) ──
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

    // ── 세미나 출석 ──
    let seminarsAttended = 0;
    for (const a of (attendeesRes?.data ?? []) as SeminarAttendee[]) {
      if (!a.checkedIn) continue;
      const ymd = isoToYmd(a.checkedInAt) ?? isoToYmd(a.createdAt);
      if (inRange(ymd)) seminarsAttended += 1;
    }

    const totalStudyDays = rangeDays.length;
    const longestStreak = longestConsecutive(rangeDays);

    const hasData =
      totalStudyDays > 0 ||
      papersRead > 0 ||
      diagnosticCount > 0 ||
      flashcardTotal > 0 ||
      seminarsAttended > 0 ||
      writingPeakChars > 0;

    return {
      semesterLabel: bounds.label,
      startYmd,
      endYmd,
      totalStudyDays,
      longestStreak,
      activityScore,
      topLabels,
      papersRead,
      longestReadPaper,
      writingPeakChars,
      writingDelta,
      diagnosticCount,
      paperReadinessDelta,
      analysisReadinessDelta,
      latestPaperReadiness,
      latestAnalysisReadiness,
      flashcardTotal,
      flashcardCorrectRate,
      seminarsAttended,
      isLoading: dayLoading || fcLoading,
      hasData,
    };
  }, [
    bounds,
    activityByDay,
    scoresByDay,
    attendeesRes,
    readingRes,
    writingRes,
    diagnosticRes,
    flashcardsRes,
    dayLoading,
    fcLoading,
  ]);
}
