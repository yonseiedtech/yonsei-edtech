"use client";

/**
 * useGraduationSummary — 졸업요건 진행 계산 공용 훅 (H3)
 *
 * GraduationChecklistCard 의 5개 쿼리 + computeGraduationProgress 로직을 추출.
 * 카드·NextActionBanner·SemesterRoadmap 이 공유한다.
 *
 * 데이터 부족(요건 문서 없음·수강이력 0)이어도 크래시 없이 조용히 null 을 반환하므로
 * 소비자는 `summary`(또는 `remainingCount`) 유무로 노출 여부를 판단하면 된다.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  comprehensiveExamsApi,
  graduationRequirementsApi,
  graduationProgressApi,
} from "@/lib/bkend";
import {
  DEFAULT_GRADUATION_REQUIREMENT,
  type GraduationRequirement,
  type GraduationProgress,
  type CourseEnrollment,
  type CourseOffering,
  type ComprehensiveExamRecord,
} from "@/types";
import { computeGraduationProgress, type GraduationSummary } from "@/lib/graduation-progress";

/** 미충족 요건 1건 (넛지·위젯 표시용) */
export interface UnmetRequirement {
  key: string;
  label: string;
  kind: "total" | "credit" | "milestone";
  /** 학점 부족분 (total·credit 만) */
  shortfall?: number;
}

export interface GraduationSummaryResult {
  requirement: GraduationRequirement | null;
  summary: GraduationSummary | null;
  /** 개인 진행 문서 (관문 체크 저장에 필요) */
  progress: GraduationProgress | null;
  loadingEnrollments: boolean;
  /** 미충족 항목 (학점 부족 큰 순 → 관문) */
  unmetItems: UnmetRequirement[];
  /** 미충족 항목 수 */
  remainingCount: number;
  /** 최다 부족 대표 항목 */
  topUnmet: UnmetRequirement | null;
}

export function useGraduationSummary(userId: string | undefined): GraduationSummaryResult {
  const { data: requirement = null } = useQuery({
    queryKey: ["graduation-requirement"],
    queryFn: async (): Promise<GraduationRequirement> => {
      const doc = await graduationRequirementsApi.getDefault();
      return doc ?? { id: "default", ...DEFAULT_GRADUATION_REQUIREMENT };
    },
    staleTime: 5 * 60_000,
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["graduation-enrollments", userId],
    queryFn: async () =>
      (await courseEnrollmentsApi.listByUser(userId as string)).data as unknown as CourseEnrollment[],
    enabled: !!userId,
    staleTime: 60_000,
  });

  const courseIds = useMemo(
    () => Array.from(new Set(enrollments.map((e) => e.courseOfferingId).filter(Boolean))).sort(),
    [enrollments]
  );

  const { data: offeringsById = new Map<string, CourseOffering>() } = useQuery({
    queryKey: ["graduation-offerings", courseIds.join(",")],
    queryFn: async () => {
      const map = new Map<string, CourseOffering>();
      const results = await Promise.all(
        courseIds.map(async (id) => {
          try {
            return (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
          } catch {
            return null;
          }
        })
      );
      for (const o of results) if (o) map.set(o.id, o);
      return map;
    },
    enabled: courseIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const { data: examRecords = [] } = useQuery({
    queryKey: ["graduation-exams", userId],
    queryFn: async () =>
      (await comprehensiveExamsApi.listByUser(userId as string)).data as unknown as ComprehensiveExamRecord[],
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: progress = null } = useQuery({
    queryKey: ["graduation-progress", userId],
    queryFn: () => graduationProgressApi.get(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    if (!requirement) return null;
    return computeGraduationProgress(requirement, enrollments, offeringsById, examRecords, progress);
  }, [requirement, enrollments, offeringsById, examRecords, progress]);

  const unmetItems = useMemo<UnmetRequirement[]>(() => {
    if (!summary) return [];
    const items: UnmetRequirement[] = [];
    if (!summary.totalMet) {
      items.push({
        key: "__total",
        label: "총 이수학점",
        kind: "total",
        shortfall: Math.max(0, summary.totalMin - summary.totalEarned),
      });
    }
    for (const rule of summary.creditRules) {
      if (!rule.met) {
        items.push({
          key: rule.key,
          label: rule.label,
          kind: "credit",
          shortfall: Math.max(0, rule.min - rule.earned),
        });
      }
    }
    for (const m of summary.milestones) {
      if (!m.done) items.push({ key: m.key, label: m.label, kind: "milestone" });
    }
    // 학점 부족(부족분 큰 순) → 관문 순으로 정렬
    return items.sort((a, b) => (b.shortfall ?? -1) - (a.shortfall ?? -1));
  }, [summary]);

  return {
    requirement,
    summary,
    progress,
    loadingEnrollments,
    unmetItems,
    remainingCount: unmetItems.length,
    topUnmet: unmetItems[0] ?? null,
  };
}
