"use client";

/**
 * 교수설계 마법사 — 조건 입력 → 규칙 기반 회차 커리큘럼 초안 생성 → 편집 → 스터디 회차로 스캐폴딩.
 *
 * - 1단계: 조건 입력(간단 선택형) — src/lib/study-curriculum-designer 규칙 엔진 입력
 * - 2단계: 생성된 회차별 초안 편집(주제·목표·활동·과제, 추가/삭제/순서) + 적용 설계 모형 배지·개념 딥링크
 * - 저장: activityProgress 회차 일괄 생성(objective/activityPlan/assignment 포함) + 스터디 문서에 설계 메타 저장
 *
 * 규칙 기반 초안 + 수동 편집이 정본. LLM 호출·자동 문서 생성 없음.
 */

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { activitiesApi, activityParticipationsApi, activityProgressApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { useConceptIndex } from "@/features/archive/useConceptIndex";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildDesignMeta,
  clampSessionCount,
  generateCurriculum,
  GOAL_TYPE_LABELS,
  GROUP_SIZE_LABELS,
  LEVEL_LABELS,
  SESSION_PHASE_LABELS,
  STUDY_KIND_LABELS,
  WEEKLY_HOURS_LABELS,
  type CurriculumConditions,
  type GoalType,
  type GroupSize,
  type LearnerLevel,
  type SessionDraft,
  type StudyKind,
  type WeeklyHours,
} from "@/lib/study-curriculum-designer";

interface Props {
  activityId: string;
  /** 이미 존재하는 회차 수 — 마법사 회차는 그 뒤에 이어붙인다(week 번호 오프셋). */
  existingWeekCount: number;
  /** 시작 날짜 초안 (스터디 시작일). 미지정이면 오늘. */
  defaultStartDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 저장 완료 후 콜백 (목록 새로고침 등) */
  onComplete?: () => void;
}

type Step = "conditions" | "review";

const emptyConditions: CurriculumConditions = {
  studyKind: "paper_reading",
  sessionCount: 8,
  weeklyHours: "2h",
  groupSize: "small",
  level: "mixed",
  goalType: "knowledge",
};

function selectClass() {
  return "w-full rounded-lg border bg-background px-3 py-2 text-sm";
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 시작일 기준 i번째(0-base) 회차 날짜 — 7일 간격 */
function weekDate(startYmd: string, i: number): string {
  const base = new Date(`${startYmd}T00:00:00`);
  if (Number.isNaN(base.getTime())) return "";
  const d = new Date(base);
  d.setDate(base.getDate() + i * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StudyCurriculumWizard({
  activityId,
  existingWeekCount,
  defaultStartDate,
  open,
  onOpenChange,
  onComplete,
}: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>("conditions");
  const [conditions, setConditions] = useState<CurriculumConditions>(emptyConditions);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [startDate, setStartDate] = useState(defaultStartDate || todayYmd());
  const [saving, setSaving] = useState(false);

  // 마지막 생성에 쓰인 조건(배지·메타용) — review 단계에서 고정
  const [appliedConditions, setAppliedConditions] = useState<CurriculumConditions>(emptyConditions);

  const draft = useMemo(
    () => generateCurriculum(appliedConditions),
    [appliedConditions],
  );

  // 아카이브 개념명 → id 색인 (실재하는 개념만 딥링크)
  const { data: conceptIndex = [] } = useConceptIndex();
  const conceptIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of conceptIndex) {
      if (!map.has(c.name)) map.set(c.name, c.id);
    }
    return map;
  }, [conceptIndex]);

  function resetAndClose() {
    setStep("conditions");
    setConditions(emptyConditions);
    setSessions([]);
    setSaving(false);
    onOpenChange(false);
  }

  function handleGenerate() {
    const normalized: CurriculumConditions = {
      ...conditions,
      sessionCount: clampSessionCount(conditions.sessionCount),
    };
    setAppliedConditions(normalized);
    const generated = generateCurriculum(normalized);
    setSessions(generated.sessions.map((s) => ({ ...s, activities: [...s.activities] })));
    setStep("review");
  }

  function updateSession(index: number, patch: Partial<SessionDraft>) {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function moveSession(index: number, dir: -1 | 1) {
    setSessions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeSession(index: number) {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  }

  function addSession() {
    setSessions((prev) => [
      ...prev,
      {
        week: prev.length + 1,
        phase: "development",
        topic: "새 회차",
        objective: "",
        activities: [],
        assignment: "",
      },
    ]);
  }

  async function handleSave() {
    if (sessions.length === 0) {
      toast.error("회차가 없습니다.");
      return;
    }
    setSaving(true);
    try {
      // 회차 순서대로 activityProgress 생성 (기존 회차 뒤에 이어붙임)
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const week = existingWeekCount + i + 1;
        await activityProgressApi.create({
          activityId,
          week,
          date: weekDate(startDate, existingWeekCount + i) || todayYmd(),
          title: s.topic.trim() || `Week ${week}`,
          status: "planned",
          mode: "in_person",
          objective: s.objective.trim() || undefined,
          activityPlan: s.activities.filter(Boolean).join("\n") || undefined,
          assignment: s.assignment.trim() || undefined,
          designPhase: s.phase,
        });
      }
      // 스터디 문서에 설계 메타 저장 (배지·목표 점검 소비용)
      const meta = buildDesignMeta(appliedConditions, { ...draft, sessions });
      await activitiesApi.update(activityId, { curriculumDesign: meta });

      // v13-M2: 작성자 기록 — activity_participations에 role:"designer" upsert (멱등)
      if (user?.id) {
        await activityParticipationsApi.recordDesign({ userId: user.id, activityId });
      }

      await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
      await queryClient.refetchQueries({ queryKey: ["activity-progress", activityId] });
      await queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success(`${sessions.length}개 회차가 설계되어 생성되었습니다.`);
      onComplete?.();
      resetAndClose();
    } catch (e) {
      console.error("[curriculum-wizard/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            교수설계 마법사
            <span className="text-xs font-normal text-muted-foreground">
              {step === "conditions" ? "1 · 조건 입력" : "2 · 초안 편집·저장"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === "conditions" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              조건을 선택하면 교수설계 규칙에 따라 회차별 커리큘럼 초안(주제·목표·활동·과제)이 생성됩니다.
              생성 후 자유롭게 편집할 수 있으며, 마법사를 쓰지 않고 직접 회차를 추가해도 됩니다.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">스터디 유형</label>
                <select
                  value={conditions.studyKind}
                  onChange={(e) => {
                    const k = e.target.value as StudyKind;
                    setConditions({
                      ...conditions,
                      studyKind: k,
                      ...(k === "thesis_writing" ? { goalType: "research" as GoalType } : {}),
                    });
                  }}
                  className={selectClass()}
                >
                  {(Object.keys(STUDY_KIND_LABELS) as StudyKind[]).map((k) => (
                    <option key={k} value={k}>{STUDY_KIND_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">최종 목표 유형</label>
                <select
                  value={conditions.goalType}
                  onChange={(e) => setConditions({ ...conditions, goalType: e.target.value as GoalType })}
                  className={selectClass()}
                >
                  {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((k) => (
                    <option key={k} value={k}>{GOAL_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">총 회차 수 (2~16)</label>
                <Input
                  type="number"
                  min={2}
                  max={16}
                  value={conditions.sessionCount}
                  onChange={(e) =>
                    setConditions({ ...conditions, sessionCount: Number(e.target.value) || 2 })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">주당 시간</label>
                <select
                  value={conditions.weeklyHours}
                  onChange={(e) => setConditions({ ...conditions, weeklyHours: e.target.value as WeeklyHours })}
                  className={selectClass()}
                >
                  {(Object.keys(WEEKLY_HOURS_LABELS) as WeeklyHours[]).map((k) => (
                    <option key={k} value={k}>{WEEKLY_HOURS_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">인원 규모</label>
                <select
                  value={conditions.groupSize}
                  onChange={(e) => setConditions({ ...conditions, groupSize: e.target.value as GroupSize })}
                  className={selectClass()}
                >
                  {(Object.keys(GROUP_SIZE_LABELS) as GroupSize[]).map((k) => (
                    <option key={k} value={k}>{GROUP_SIZE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">학습자 수준</label>
                <select
                  value={conditions.level}
                  onChange={(e) => setConditions({ ...conditions, level: e.target.value as LearnerLevel })}
                  className={selectClass()}
                >
                  {(Object.keys(LEVEL_LABELS) as LearnerLevel[]).map((k) => (
                    <option key={k} value={k}>{LEVEL_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">회차 시작 날짜</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <p className="mt-1 text-[11px] text-muted-foreground">시작일부터 7일 간격으로 날짜가 배정됩니다.</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>취소</Button>
              <Button onClick={handleGenerate}>
                <Sparkles size={14} className="mr-1" /> 커리큘럼 초안 생성
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 적용된 설계 모형 배지 + 개념 딥링크 */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.models.map((m) => (
                  <Badge
                    key={m.id}
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                    title={m.theory}
                  >
                    {m.name}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{draft.scaffoldingNote}</p>
              <p className="text-[11px] text-muted-foreground">{draft.interactionNote}</p>
              {/* 아카이브 개념 딥링크 — 실재하는 개념만 노출 */}
              {(() => {
                const names = Array.from(
                  new Set(draft.models.flatMap((m) => m.conceptNames)),
                ).filter((n) => conceptIdByName.has(n));
                if (names.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">아카이브 개념:</span>
                    {names.map((n) => (
                      <Link
                        key={n}
                        href={`/archive/concept/${conceptIdByName.get(n)}`}
                        target="_blank"
                        className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                      >
                        {n}
                        <ExternalLink size={9} />
                      </Link>
                    ))}
                  </div>
                );
              })()}
              {/* 아카이브 가이드 딥링크 — 논문 작성 등 고정 경로가 있는 모형 전용 */}
              {(() => {
                const links = draft.models.flatMap((m) => m.guideLinks ?? []);
                if (links.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">글쓰기 가이드:</span>
                    {links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                      >
                        {l.label}
                        <ExternalLink size={9} />
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 회차 초안 편집 */}
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">Week {i + 1}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {SESSION_PHASE_LABELS[s.phase]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSession(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        title="위로"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSession(i, 1)}
                        disabled={i === sessions.length - 1}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        title="아래로"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSession(i)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[11px] text-muted-foreground">주제</label>
                    <Input
                      value={s.topic}
                      onChange={(e) => updateSession(i, { topic: e.target.value })}
                      placeholder="회차 주제"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[11px] text-muted-foreground">학습목표</label>
                    <Input
                      value={s.objective}
                      onChange={(e) => updateSession(i, { objective: e.target.value })}
                      placeholder="예: 핵심 개념을 설명할 수 있다."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-0.5 block text-[11px] text-muted-foreground">활동 구성 (줄바꿈 구분)</label>
                      <Textarea
                        rows={3}
                        value={s.activities.join("\n")}
                        onChange={(e) =>
                          updateSession(i, { activities: e.target.value.split("\n") })
                        }
                        placeholder={"발제\n토론\n정리 퀴즈"}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] text-muted-foreground">과제 제안</label>
                      <Textarea
                        rows={3}
                        value={s.assignment}
                        onChange={(e) => updateSession(i, { assignment: e.target.value })}
                        placeholder="다음 회차까지 할 과제"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSession} className="w-full">
                <Plus size={14} className="mr-1" /> 회차 추가
              </Button>
            </div>

            <div className={cn("rounded-lg border border-dashed p-2 text-[11px] text-muted-foreground")}>
              저장하면 {sessions.length}개 회차가 스터디 회차(주차)로 생성되며, 각 회차의 학습목표·활동·과제가
              주차 페이지에 표시됩니다. (기존 회차 {existingWeekCount}개 뒤에 이어붙습니다.)
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep("conditions")} disabled={saving}>
                <ArrowLeft size={14} className="mr-1" /> 조건 다시 입력
              </Button>
              <Button onClick={handleSave} disabled={saving || sessions.length === 0}>
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
                {sessions.length}개 회차로 저장
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
