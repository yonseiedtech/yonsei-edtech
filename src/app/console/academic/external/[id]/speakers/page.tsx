"use client";

/**
 * 운영 콘솔 — 대외 학술대회 발표자 운영 (Phase 1).
 *
 * 자원봉사자 콘솔(volunteers) 패턴 미러 + 발표 유형별 차별화:
 *  1. 발표 신청자 ↔ 배정 통합 (participantType==="speaker", rejected 제외)
 *  2. 표준 체크리스트(SPEAKER_STANDARD_TASKS) 자동 시드 + 일괄 배분
 *  3. 유형별 카드 그룹 + 인라인 편집 (prepTasks·세부정보·삭제)
 *  4. 유형 탭 필터 + 통계 4종 + 진행률
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteField } from "firebase/firestore";
import {
  Mic,
  Users,
  UserPlus,
  ListChecks,
  CheckCircle2,
  Presentation,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  activitiesApi,
  speakerAssignmentsApi,
  activityApplicantsApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { logAudit } from "@/lib/audit";
import {
  SPEAKER_SUBMISSION_TYPE_LABELS,
  SPEAKER_SUBMISSION_TYPE_COLORS,
  SPEAKER_STANDARD_TASKS,
  type SpeakerAssignment,
  type SpeakerPrepTask,
  type SpeakerSubmissionType,
  type Activity,
  type ApplicantEntry,
} from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/ui/back-button";
import {
  SUBMISSION_TYPE_ORDER,
  applicantKey,
  findAssignmentForApplicant,
  buildAssignmentId,
  taskId,
} from "./speaker-utils";
import AssignmentDialog, { type AssignmentDraft } from "./AssignmentDialog";
import BulkTaskDialog from "./BulkTaskDialog";
import SpeakerCard from "./SpeakerCard";

type TypeFilter = "all" | SpeakerSubmissionType;

export default function ExternalActivitySpeakersConsole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: activityId } = use(params);
  const queryClient = useQueryClient();
  const viewer = useAuthStore((s) => s.user);

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => activitiesApi.get(activityId) as Promise<Activity>,
    retry: false,
  });

  const { data: sRes, isLoading } = useQuery({
    queryKey: ["console", "speakers", activityId],
    queryFn: () => speakerAssignmentsApi.listByActivity(activityId),
    retry: false,
  });
  const speakers = useMemo(
    () => (sRes?.data ?? []) as SpeakerAssignment[],
    [sRes],
  );

  const { data: applicants = [] } = useQuery({
    queryKey: ["console", "speaker-applicants", activityId],
    queryFn: () => activityApplicantsApi.get(activityId),
    retry: false,
  });
  // participantType="speaker" && status!="rejected" 만 — 자원봉사자 콘솔 동일 규칙
  const speakerApplicants = useMemo(
    () =>
      applicants.filter(
        (a) => a.participantType === "speaker" && a.status !== "rejected",
      ),
    [applicants],
  );

  // ── 다이얼로그 상태 ──
  const [assignTarget, setAssignTarget] = useState<{
    applicant?: ApplicantEntry;
    existing?: SpeakerAssignment;
  } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // ── mutation: 배정 생성/수정 ──
  const upsertMutation = useMutation({
    mutationFn: (input: { id: string; data: Record<string, unknown> }) =>
      speakerAssignmentsApi.upsert(input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "speakers", activityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => speakerAssignmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "speakers", activityId] });
    },
  });

  // ── prepTasks 원자적 변경 (lost-update 방지 트랜잭션) ──
  const tasksMutation = useMutation({
    mutationFn: (input: {
      id: string;
      mutator: (current: SpeakerPrepTask[]) => SpeakerPrepTask[];
    }) => speakerAssignmentsApi.mutateTasks(input.id, input.mutator),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "speakers", activityId] });
    },
    onError: (e) =>
      toast.error(`체크리스트 저장 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  function handleMutateTasks(
    s: SpeakerAssignment,
    mutator: (current: SpeakerPrepTask[]) => SpeakerPrepTask[],
  ) {
    tasksMutation.mutate({ id: s.id, mutator });
  }

  // ── 신청자 → 배정 생성 / 기존 배정 편집 ──
  function handleAssignmentSubmit(draft: AssignmentDraft) {
    if (!assignTarget) return;
    const { applicant, existing } = assignTarget;

    if (existing) {
      // 편집 — 선택되지 않은 유형의 세부정보는 deleteField() 로 명시적으로 삭제
      // (undefined 는 stripUndefinedDeep 가 키 자체를 제거 → merge:true 에서 기존 값이 보존되어 stale 데이터 잔존)
      const data: Record<string, unknown> = {
        submissionType: draft.submissionType,
        paperTitle: draft.paperTitle,
        prepTasks: draft.prepTasks,
        emergencyContact: draft.emergencyContact,
        notes: draft.notes,
        paperDetails:
          draft.submissionType === "paper"
            ? (draft.paperDetails ?? deleteField())
            : deleteField(),
        posterDetails:
          draft.submissionType === "poster"
            ? (draft.posterDetails ?? deleteField())
            : deleteField(),
        mediaDetails:
          draft.submissionType === "media"
            ? (draft.mediaDetails ?? deleteField())
            : deleteField(),
      };
      upsertMutation.mutate(
        { id: existing.id, data },
        {
          onSuccess: () => {
            toast.success("발표자 정보를 수정했습니다.");
            setAssignTarget(null);
          },
          onError: (e) =>
            toast.error(`수정 실패: ${e instanceof Error ? e.message : "오류"}`),
        },
      );
      return;
    }

    if (!applicant) return;
    // 신규 배정 — 신청자 PII + 매칭 키 비정규화 복사
    const newId = buildAssignmentId(applicant, activityId, draft.submissionType);
    const data: Record<string, unknown> = {
      id: newId,
      activityId,
      userId: applicant.userId,
      userName: applicant.name,
      userStudentId: applicant.studentId,
      guestKey: applicant.guestKey,
      userEmail: applicant.email,
      userPhone: applicant.phone,
      submissionType: draft.submissionType,
      paperTitle: draft.paperTitle,
      prepTasks: draft.prepTasks,
      paperDetails: draft.submissionType === "paper" ? draft.paperDetails : undefined,
      posterDetails: draft.submissionType === "poster" ? draft.posterDetails : undefined,
      mediaDetails: draft.submissionType === "media" ? draft.mediaDetails : undefined,
      emergencyContact: draft.emergencyContact,
      notes: draft.notes,
      createdBy: viewer?.id ?? "system",
    };
    upsertMutation.mutate(
      { id: newId, data },
      {
        onSuccess: () => {
          toast.success(`${applicant.name} 님을 발표자로 배정했습니다.`);
          setAssignTarget(null);
        },
        onError: (e) =>
          toast.error(`배정 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  // ── 배정 삭제 ──
  function handleDelete(s: SpeakerAssignment) {
    if (!window.confirm(`${s.userName ?? "이 발표자"} 님의 배정을 삭제할까요?`)) return;
    deleteMutation.mutate(s.id, {
      onSuccess: () => {
        toast.success("발표자 배정을 삭제했습니다.");
        logAudit({
          action: "연사 배정 삭제",
          category: "system",
          detail: `${s.userName ?? "발표자"} 배정 삭제`,
          targetId: s.id,
          targetName: s.userName,
          userId: viewer?.id ?? "",
          userName: viewer?.name ?? "",
        });
      },
      onError: (e) =>
        toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
    });
  }

  // ── 유형별 임무 일괄 배분 (Promise.allSettled + N명 성공/M명 실패) ──
  const bulkMutation = useMutation({
    mutationFn: async (input: {
      type: SpeakerSubmissionType;
      taskText: string;
    }) => {
      const targets = speakers.filter((s) => s.submissionType === input.type);
      const results = await Promise.allSettled(
        targets.map((s) =>
          speakerAssignmentsApi.mutateTasks(s.id, (current) => [
            ...current,
            { id: taskId(), text: input.taskText, checked: false },
          ]),
        ),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["console", "speakers", activityId] });
      if (failed === 0) {
        toast.success(`${succeeded}명에게 항목을 추가했습니다.`);
      } else if (succeeded === 0) {
        toast.error(`일괄 배분 실패: ${failed}명 모두 추가하지 못했습니다.`);
      } else {
        toast.warning(
          `${succeeded}명 성공 / ${failed}명 실패 — 실패한 인원에 다시 시도하세요.`,
        );
      }
      setBulkOpen(false);
    },
    onError: (e) =>
      toast.error(`일괄 배분 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  // ── 파생 데이터 ──
  const grouped = useMemo(() => {
    const m = new Map<SpeakerSubmissionType, SpeakerAssignment[]>();
    for (const k of SUBMISSION_TYPE_ORDER) m.set(k, []);
    for (const s of speakers) {
      const k = (m.has(s.submissionType) ? s.submissionType : "paper") as SpeakerSubmissionType;
      m.get(k)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""));
    }
    return m;
  }, [speakers]);

  const typeCounts = useMemo(() => {
    const out = {} as Record<SpeakerSubmissionType, number>;
    for (const k of SUBMISSION_TYPE_ORDER) out[k] = grouped.get(k)?.length ?? 0;
    return out;
  }, [grouped]);

  const stats = useMemo(() => {
    const taskDone = speakers.reduce(
      (acc, s) => {
        const total = s.prepTasks?.length ?? 0;
        const done = s.prepTasks?.filter((t) => t.checked).length ?? 0;
        return { total: acc.total + total, done: acc.done + done };
      },
      { total: 0, done: 0 },
    );
    const completionRate =
      taskDone.total > 0 ? Math.round((taskDone.done / taskDone.total) * 100) : null;
    return { total: speakers.length, taskDone, completionRate };
  }, [speakers]);

  // 신청자 분류 (배정 완료 / 미배정)
  const applicantStatus = useMemo(
    () =>
      speakerApplicants.map((a) => ({
        applicant: a,
        assignment: findAssignmentForApplicant(a, speakers),
      })),
    [speakerApplicants, speakers],
  );
  const unassignedCount = applicantStatus.filter((x) => !x.assignment).length;

  const busy =
    upsertMutation.isPending ||
    deleteMutation.isPending ||
    tasksMutation.isPending ||
    bulkMutation.isPending;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Presentation}
        title={`발표자 운영 — ${activity?.title ?? "대외 학술대회"}`}
        description="발표 유형(논문/포스터/미디어전)별 준비 흐름을 한 페이지에서 관리합니다."
        actions={
          speakers.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBulkOpen(true)}
            >
              <ListChecks size={14} /> 유형별 임무 일괄 배분
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center justify-between">
        <BackButton
          href={`/console/academic/external/${activityId}`}
          label="활동 상세로"
          variant="default"
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          🖨 명단 인쇄 (본부석용)
        </button>
      </div>

      {/* 통계 카드 4종 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="총 발표자"
          value={String(stats.total)}
          color="text-primary bg-primary/10"
        />
        <StatCard
          icon={Mic}
          label="논문 / 포스터 / 미디어"
          value={`${typeCounts.paper} / ${typeCounts.poster} / ${typeCounts.media}`}
          color="text-violet-600 bg-violet-50 dark:bg-violet-950/30"
        />
        <StatCard
          icon={UserPlus}
          label="미배정 신청자"
          value={String(unassignedCount)}
          color={
            unassignedCount > 0
              ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30"
              : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
          }
        />
        <StatCard
          icon={ClipboardList}
          label={`체크리스트 진행률 (${stats.taskDone.done}/${stats.taskDone.total})`}
          value={stats.completionRate != null ? `${stats.completionRate}%` : "—"}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
        />
      </div>

      {/* 1. 발표 신청자 ↔ 배정 통합 */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">발표 신청자</h2>
          <span className="text-[11px] text-muted-foreground">
            총 {speakerApplicants.length}명 · 미배정 {unassignedCount}명
          </span>
        </div>
        {speakerApplicants.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="발표 신청자가 없습니다"
            description="활동 신청폼에서 참석유형 '발표자'로 신청한 인원이 여기 표시됩니다."
            compact
          />
        ) : (
          <ul className="space-y-2">
            {applicantStatus.map(({ applicant, assignment }, idx) => (
              <li
                key={applicantKey(applicant, idx)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {applicant.name || "익명"}
                    {applicant.speakerSubmissionType && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SPEAKER_SUBMISSION_TYPE_COLORS[applicant.speakerSubmissionType]}`}
                      >
                        {SPEAKER_SUBMISSION_TYPE_LABELS[applicant.speakerSubmissionType]}
                      </span>
                    )}
                    {!applicant.userId && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        비회원
                      </span>
                    )}
                  </p>
                  {applicant.speakerPaperTitle && (
                    <p className="mt-0.5 text-[11px] font-medium text-foreground">
                      {applicant.speakerPaperTitle}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {applicant.studentId && <span>{applicant.studentId} · </span>}
                    {applicant.phone || applicant.email || "연락처 없음"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {assignment ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <CheckCircle2 size={11} />
                      배정됨 · {SPEAKER_SUBMISSION_TYPE_LABELS[assignment.submissionType]}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => setAssignTarget({ applicant })}
                      disabled={busy}
                    >
                      <UserPlus size={12} /> 발표자 배정
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 유형 탭 필터 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TypeTab
          active={typeFilter === "all"}
          label="전체"
          count={speakers.length}
          onClick={() => setTypeFilter("all")}
        />
        {SUBMISSION_TYPE_ORDER.map((k) => (
          <TypeTab
            key={k}
            active={typeFilter === k}
            label={SPEAKER_SUBMISSION_TYPE_LABELS[k]}
            count={typeCounts[k]}
            onClick={() => setTypeFilter(k)}
            colorClass={SPEAKER_SUBMISSION_TYPE_COLORS[k]}
          />
        ))}
      </div>

      {/* 유형별 카드 목록 */}
      {isLoading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-xs text-muted-foreground">
          불러오는 중…
        </div>
      ) : speakers.length === 0 ? (
        <div className="rounded-2xl border bg-card p-5">
          <EmptyState
            icon={Mic}
            title="아직 배정된 발표자가 없습니다"
            description="위 신청자 목록에서 '발표자 배정'을 눌러 배정하세요."
          />
        </div>
      ) : (
        SUBMISSION_TYPE_ORDER.filter(
          (k) => typeFilter === "all" || typeFilter === k,
        ).map((typeKey) => {
          const list = grouped.get(typeKey) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={typeKey} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${SPEAKER_SUBMISSION_TYPE_COLORS[typeKey]}`}
                >
                  {SPEAKER_SUBMISSION_TYPE_LABELS[typeKey]}
                </span>
                <span className="text-xs text-muted-foreground">{list.length}명</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  표준 항목 {SPEAKER_STANDARD_TASKS[typeKey].length}개
                </span>
              </div>
              <ul className="space-y-3">
                {list.map((s) => (
                  <SpeakerCard
                    key={s.id}
                    assignment={s}
                    busy={busy}
                    onMutateTasks={(mutator) => handleMutateTasks(s, mutator)}
                    onEdit={() => setAssignTarget({ existing: s })}
                    onDelete={() => handleDelete(s)}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}

      {/* 다이얼로그 */}
      {assignTarget && (
        <AssignmentDialog
          open
          onOpenChange={(o) => !o && setAssignTarget(null)}
          targetName={
            assignTarget.existing?.userName ??
            assignTarget.applicant?.name ??
            "발표자"
          }
          existing={assignTarget.existing}
          initialSubmissionType={assignTarget.applicant?.speakerSubmissionType}
          initialPaperTitle={assignTarget.applicant?.speakerPaperTitle}
          saving={upsertMutation.isPending}
          onSubmit={handleAssignmentSubmit}
        />
      )}
      <BulkTaskDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        typeCounts={typeCounts}
        saving={bulkMutation.isPending}
        onSubmit={(type, taskText) => bulkMutation.mutate({ type, taskText })}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TypeTab({
  active,
  label,
  count,
  onClick,
  colorClass,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
        active
          ? colorClass
            ? `border-current ${colorClass}`
            : "border-primary bg-primary/10 text-foreground"
          : "border-input bg-card text-muted-foreground hover:bg-muted"
      }`}
    >
      {label} ({count})
    </button>
  );
}
