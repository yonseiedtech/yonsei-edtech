"use client";

/**
 * 졸업요건 체크표 (2026-07-08) — 마이페이지 '내 연구' 탭, 본인 전용.
 * 학점: 수강이력(청강 제외) 자동 합산 / 관문: 종합시험은 자동 판정, 나머지는 본인 수동 체크.
 * 요건 문서(graduation_requirements/default)가 없으면 코드 기본값(DEFAULT_GRADUATION_REQUIREMENT)으로 폴백.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Check, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { computeGraduationProgress } from "@/lib/graduation-progress";

interface Props {
  userId: string;
}

export default function GraduationChecklistCard({ userId }: Props) {
  const qc = useQueryClient();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: requirement } = useQuery({
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
      (await courseEnrollmentsApi.listByUser(userId)).data as unknown as CourseEnrollment[],
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
      (await comprehensiveExamsApi.listByUser(userId)).data as unknown as ComprehensiveExamRecord[],
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: progress = null } = useQuery({
    queryKey: ["graduation-progress", userId],
    queryFn: () => graduationProgressApi.get(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    if (!requirement) return null;
    return computeGraduationProgress(requirement, enrollments, offeringsById, examRecords, progress);
  }, [requirement, enrollments, offeringsById, examRecords, progress]);

  async function toggleMilestone(key: string, next: boolean) {
    if (savingKey) return;
    setSavingKey(key);
    try {
      const now = new Date().toISOString();
      const checks: GraduationProgress["milestoneChecks"] = {
        ...(progress?.milestoneChecks ?? {}),
        [key]: { ...(progress?.milestoneChecks?.[key] ?? {}), done: next, updatedAt: now },
      };
      await graduationProgressApi.upsert(userId, { milestoneChecks: checks, updatedAt: now });
      await qc.invalidateQueries({ queryKey: ["graduation-progress", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!requirement || !summary) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-5 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-emerald-900/10">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-200/40 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">졸업요건 체크표</h3>
            <span className="text-[11px] text-muted-foreground">{requirement.programLabel}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-200/50 dark:bg-emerald-900/40">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                style={{ width: `${summary.percent}%` }}
              />
            </div>
            <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {summary.percent}%
            </span>
          </div>
          {summary.allMet && (
            <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              모든 요건이 충족되었습니다 🎓
            </p>
          )}
        </div>
      </div>

      {/* 학점 요건 */}
      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">이수 학점</p>
        <div className="rounded-xl border bg-card px-3 py-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">총 이수학점</span>
            <span className={cn("font-bold tabular-nums", summary.totalMet ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
              {summary.totalEarned} / {summary.totalMin}학점
              {summary.totalMet && <Check size={14} className="ml-1 inline" />}
            </span>
          </div>
        </div>
        {summary.creditRules.map((rule) => (
          <div key={rule.key} className="rounded-xl border bg-card px-3 py-2.5">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left text-sm"
              onClick={() => setExpandedRule((k) => (k === rule.key ? null : rule.key))}
              aria-expanded={expandedRule === rule.key}
            >
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 text-muted-foreground transition-transform", expandedRule === rule.key && "rotate-180")}
                />
                <span className="truncate">{rule.label}</span>
              </span>
              <span className={cn("shrink-0 font-bold tabular-nums", rule.met ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                {rule.earned} / {rule.min}학점
                {rule.met && <Check size={14} className="ml-1 inline" />}
              </span>
            </button>
            {expandedRule === rule.key && (
              <div className="mt-2 border-t pt-2">
                {rule.courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">합산된 과목이 없습니다. 수강이력을 등록하면 자동 반영됩니다.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {rule.courses.map((c, i) => (
                      <li key={`${c.name}-${i}`} className="flex justify-between gap-2">
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 tabular-nums">{c.credits}학점</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        {loadingEnrollments && (
          <p className="text-[11px] text-muted-foreground">수강이력을 불러오는 중…</p>
        )}
      </div>

      {/* 관문 요건 */}
      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">관문 요건</p>
        {summary.milestones.map((m) => (
          <div key={m.key} className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5">
            {m.auto ? (
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  m.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
                title="자동 판정 항목"
              >
                {m.done ? <Check size={13} /> : <Lock size={11} />}
              </span>
            ) : (
              <button
                type="button"
                disabled={savingKey === m.key}
                onClick={() => toggleMilestone(m.key, !m.done)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                  m.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/40 bg-card hover:border-emerald-400",
                  savingKey === m.key && "opacity-50"
                )}
                aria-label={`${m.label} ${m.done ? "체크 해제" : "체크"}`}
              >
                {m.done && <Check size={13} />}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", m.done && "text-muted-foreground line-through decoration-emerald-500/50")}>
                {m.label}
                {m.auto && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 no-underline dark:bg-emerald-900/40 dark:text-emerald-300">자동</span>}
              </p>
              {m.hint && <p className="text-[11px] text-muted-foreground">{m.hint}</p>}
            </div>
          </div>
        ))}
      </div>

      {requirement.note && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{requirement.note}</p>
      )}
    </div>
  );
}
