"use client";

/**
 * 교수설계 마법사 소비 — 마지막 회차 회고에서 회차별 학습목표 달성도 점검.
 *
 * 각 회차의 objective(학습목표)를 나열하고 달성/부분/미달을 선택해 저장한다.
 * 신규 컬렉션 없이 스터디 문서(activity)의 curriculumGoalCheck 필드에
 * { [progressId]: "met" | "partial" | "unmet" } 형태로 저장한다.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { activitiesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { SEMANTIC } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ActivityProgress } from "@/types";

type GoalStatus = "met" | "partial" | "unmet";

const STATUS_OPTIONS: { value: GoalStatus; label: string; activeCls: string }[] = [
  { value: "met", label: "달성", activeCls: SEMANTIC.success.chip },
  { value: "partial", label: "부분", activeCls: SEMANTIC.warning.chip },
  { value: "unmet", label: "미달", activeCls: SEMANTIC.danger.chip },
];

interface Props {
  activityId: string;
  /** 정렬된 회차 목록 (objective 포함) */
  sessions: ActivityProgress[];
  /** 스터디 문서에 저장된 기존 점검 값 */
  initial?: Record<string, GoalStatus>;
  canEdit: boolean;
}

export default function StudyCurriculumGoalCheck({
  activityId,
  sessions,
  initial,
  canEdit,
}: Props) {
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState<Record<string, GoalStatus>>(initial ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChecks(initial ?? {});
  }, [initial]);

  const withObjective = sessions.filter((s) => (s.objective ?? "").trim());
  if (withObjective.length === 0) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await activitiesApi.update(activityId, { curriculumGoalCheck: checks });
      await queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("목표 달성 점검이 저장되었습니다.");
    } catch (e) {
      console.error("[curriculum-goal-check/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Target size={14} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">회차별 목표 달성 점검</h2>
      </div>
      <p className="text-[11px] text-muted-foreground">
        스터디 전체를 마무리하며 각 회차 학습목표의 달성 여부를 점검하세요.
      </p>
      <ul className="space-y-2">
        {withObjective.map((s, i) => {
          const current = checks[s.id];
          return (
            <li key={s.id} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    <span className="text-muted-foreground">Week {i + 1} · </span>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.objective}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setChecks((prev) => ({ ...prev, [s.id]: opt.value }))}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px] transition",
                        current === opt.value ? opt.activeCls : "border-border text-muted-foreground",
                        canEdit ? "hover:border-primary/40" : "cursor-default opacity-80",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={12} className="mr-1 animate-spin" /> : <CheckCircle2 size={12} className="mr-1" />}
            점검 저장
          </Button>
        </div>
      )}
    </div>
  );
}
