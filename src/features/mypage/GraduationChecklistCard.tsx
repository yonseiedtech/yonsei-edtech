"use client";

/**
 * 졸업요건 체크표 (2026-07-08) — 마이페이지 '내 연구' 탭, 본인 전용.
 * 학점: 수강이력(청강 제외) 자동 합산 / 관문: 종합시험은 자동 판정, 나머지는 본인 수동 체크.
 * 요건 문서(graduation_requirements/default)가 없으면 코드 기본값(DEFAULT_GRADUATION_REQUIREMENT)으로 폴백.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Check, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { graduationProgressApi } from "@/lib/bkend";
import { type GraduationProgress } from "@/types";
import { useGraduationSummary } from "./useGraduationSummary";

interface Props {
  userId: string;
}

export default function GraduationChecklistCard({ userId }: Props) {
  const qc = useQueryClient();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { requirement, summary, progress, loadingEnrollments } = useGraduationSummary(userId);

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
    <div id="graduation-checklist" className="scroll-mt-24 rounded-2xl border-2 border-success/20 bg-gradient-to-br from-success/5 to-success/10 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">졸업요건 체크표</h3>
            <span className="text-[11px] text-muted-foreground">{requirement.programLabel}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-success/10">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${summary.percent}%` }}
              />
            </div>
            <span className="text-sm font-bold tabular-nums text-success">
              {summary.percent}%
            </span>
          </div>
          {summary.allMet && (
            <p className="mt-1 text-[11px] font-medium text-success">
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
            <span className={cn("font-bold tabular-nums", summary.totalMet ? "text-success" : "text-foreground")}>
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
              <span className={cn("shrink-0 font-bold tabular-nums", rule.met ? "text-success" : "text-foreground")}>
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
                    ? "border-success bg-success text-white"
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
                    ? "border-success bg-success text-white"
                    : "border-muted-foreground/40 bg-card hover:border-success/60",
                  savingKey === m.key && "opacity-50"
                )}
                aria-label={`${m.label} ${m.done ? "체크 해제" : "체크"}`}
              >
                {m.done && <Check size={13} />}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", m.done && "text-muted-foreground line-through decoration-success/50")}>
                {m.label}
                {m.auto && <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success no-underline">자동</span>}
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
