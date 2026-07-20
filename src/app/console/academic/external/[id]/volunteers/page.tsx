"use client";

/**
 * 운영 콘솔 — 대외 학술대회 자원봉사자 운영 (Sprint 70 → 운영 도구 고도화).
 *
 * 모니터링 전용 페이지였던 것을 운영 도구로 확장:
 *  1. 자원봉사 신청자 ↔ 배정 통합 (미배정 신청자에 역할 배정)
 *  2. 시간대별 가능 인원 시간표 (schedule 답변 집계)
 *  3. 인원별 체크리스트(임무) 배분 (개별·역할별 일괄)
 *  4. 배정 인라인 편집 (역할·시프트·비상연락처·메모·삭제)
 *
 * 기존 통계·역할별 분포·인쇄 기능은 유지.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HeartHandshake,
  ClipboardList,
  Users,
  UserPlus,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  activitiesApi,
  volunteerAssignmentsApi,
  activityApplicantsApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { logAudit } from "@/lib/audit";
import {
  VOLUNTEER_ROLE_LABELS,
  type VolunteerAssignment,
  type VolunteerDuty,
  type VolunteerRoleKey,
  type Activity,
  type ApplicantEntry,
} from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/ui/back-button";
import {
  ROLE_ORDER,
  ROLE_COLORS,
  applicantKey,
  findAssignmentForApplicant,
  buildAssignmentId,
  dutyId,
} from "./volunteer-utils";
import AssignmentDialog, { type AssignmentDraft } from "./AssignmentDialog";
import BulkDutyDialog from "./BulkDutyDialog";
import AvailabilityTimeGrid from "./AvailabilityTimeGrid";
import VolunteerCard from "./VolunteerCard";

export default function ExternalActivityVolunteersConsole({
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

  const { data: vRes, isLoading } = useQuery({
    queryKey: ["console", "volunteers", activityId],
    queryFn: () => volunteerAssignmentsApi.listByActivity(activityId),
    retry: false,
  });
  const volunteers = useMemo(
    () => (vRes?.data ?? []) as VolunteerAssignment[],
    [vRes],
  );

  const { data: applicants = [] } = useQuery({
    queryKey: ["console", "volunteer-applicants", activityId],
    queryFn: () => activityApplicantsApi.get(activityId),
    retry: false,
  });
  // 반려(rejected) 신청자는 배정 대상에서 제외 — pending·approved 만 노출.
  const volunteerApplicants = useMemo(
    () =>
      applicants.filter(
        (a) => a.participantType === "volunteer" && a.status !== "rejected",
      ),
    [applicants],
  );

  // ── 다이얼로그 상태 ──
  const [assignTarget, setAssignTarget] = useState<{
    applicant?: ApplicantEntry;
    existing?: VolunteerAssignment;
  } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── mutation: 배정 생성/수정 ──
  const upsertMutation = useMutation({
    mutationFn: (input: { id: string; data: Record<string, unknown> }) =>
      volunteerAssignmentsApi.upsert(input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "volunteers", activityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => volunteerAssignmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "volunteers", activityId] });
    },
  });

  // ── 신청자 → 배정 생성 / 기존 배정 편집 ──
  function handleAssignmentSubmit(draft: AssignmentDraft) {
    if (!assignTarget) return;
    const { applicant, existing } = assignTarget;

    if (existing) {
      // 편집
      upsertMutation.mutate(
        {
          id: existing.id,
          data: {
            role: draft.role,
            customRoleName: draft.customRoleName,
            shifts: draft.shifts,
            emergencyContact: draft.emergencyContact,
            notes: draft.notes,
          },
        },
        {
          onSuccess: () => {
            toast.success("배정을 수정했습니다.");
            setAssignTarget(null);
          },
          onError: (e) =>
            toast.error(`수정 실패: ${e instanceof Error ? e.message : "오류"}`),
        },
      );
      return;
    }

    if (!applicant) return;
    // 신규 배정 — 신청자 PII + 매칭 키(studentId·guestKey)를 비정규화 복사.
    // userStudentId·guestKey 는 findAssignmentForApplicant 의 정확 매칭에 쓰인다.
    const newId = buildAssignmentId(applicant, activityId);
    upsertMutation.mutate(
      {
        id: newId,
        data: {
          id: newId,
          userId: applicant.userId ?? "",
          userName: applicant.name,
          userStudentId: applicant.studentId,
          guestKey: applicant.guestKey,
          userPhone: applicant.phone,
          activityId,
          activityTitle: activity?.title,
          activityDate: activity?.date,
          role: draft.role,
          customRoleName: draft.customRoleName,
          shifts: draft.shifts,
          duties: [] as VolunteerDuty[],
          emergencyContact: draft.emergencyContact,
          notes: draft.notes,
          createdBy: viewer?.id ?? "system",
        },
      },
      {
        onSuccess: () => {
          toast.success(`${applicant.name} 님을 배정했습니다.`);
          setAssignTarget(null);
        },
        onError: (e) =>
          toast.error(`배정 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  // ── duties 원자적 변경 (lost-update 방지 트랜잭션) ──
  const dutiesMutation = useMutation({
    mutationFn: (input: {
      id: string;
      mutator: (current: VolunteerDuty[]) => VolunteerDuty[];
    }) => volunteerAssignmentsApi.mutateDuties(input.id, input.mutator),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console", "volunteers", activityId] });
    },
    onError: (e) =>
      toast.error(`임무 저장 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  function handleMutateDuties(
    v: VolunteerAssignment,
    mutator: (current: VolunteerDuty[]) => VolunteerDuty[],
  ) {
    dutiesMutation.mutate({ id: v.id, mutator });
  }

  // ── 배정 삭제 ──
  function handleDelete(v: VolunteerAssignment) {
    if (!window.confirm(`${v.userName ?? "이 봉사자"} 님의 배정을 삭제할까요?`)) return;
    deleteMutation.mutate(v.id, {
      onSuccess: () => {
        toast.success("배정을 삭제했습니다.");
        logAudit({
          action: "봉사 배정 삭제",
          category: "system",
          detail: `${v.userName ?? "봉사자"} 배정 삭제`,
          targetId: v.id,
          targetName: v.userName,
          userId: viewer?.id ?? "",
          userName: viewer?.name ?? "",
        });
      },
      onError: (e) =>
        toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
    });
  }

  // ── 역할별 공통 임무 일괄 배분 ──
  // 대상 assignment 마다 mutateDuties 트랜잭션 1회 (lost-update 방지).
  // Promise.allSettled 로 부분 실패를 집계해 "N명 성공 / M명 실패" 안내.
  const bulkMutation = useMutation({
    mutationFn: async (input: { role: VolunteerRoleKey; dutyText: string }) => {
      const targets = volunteers.filter((v) => v.role === input.role);
      const results = await Promise.allSettled(
        targets.map((v) =>
          volunteerAssignmentsApi.mutateDuties(v.id, (current) => [
            ...current,
            { id: dutyId(), text: input.dutyText, checked: false },
          ]),
        ),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["console", "volunteers", activityId] });
      if (failed === 0) {
        toast.success(`${succeeded}명에게 임무를 추가했습니다.`);
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
    const m = new Map<VolunteerRoleKey, VolunteerAssignment[]>();
    for (const k of ROLE_ORDER) m.set(k, []);
    for (const v of volunteers) {
      const k = (m.has(v.role) ? v.role : "other") as VolunteerRoleKey;
      m.get(k)!.push(v);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const sa = a.shifts?.[0]?.startTime ?? "99:99";
        const sb = b.shifts?.[0]?.startTime ?? "99:99";
        return sa.localeCompare(sb);
      });
    }
    return m;
  }, [volunteers]);

  const roleCounts = useMemo(() => {
    const out = {} as Record<VolunteerRoleKey, number>;
    for (const k of ROLE_ORDER) out[k] = grouped.get(k)?.length ?? 0;
    return out;
  }, [grouped]);

  const stats = useMemo(() => {
    const roleDist = ROLE_ORDER.map((k) => ({
      key: k,
      label: VOLUNTEER_ROLE_LABELS[k],
      count: grouped.get(k)?.length ?? 0,
    }));
    const dutyDone = volunteers.reduce(
      (acc, v) => {
        const total = v.duties?.length ?? 0;
        const done = v.duties?.filter((d) => d.checked).length ?? 0;
        return { total: acc.total + total, done: acc.done + done };
      },
      { total: 0, done: 0 },
    );
    const completionRate =
      dutyDone.total > 0 ? Math.round((dutyDone.done / dutyDone.total) * 100) : null;
    return { total: volunteers.length, roleDist, dutyDone, completionRate };
  }, [volunteers, grouped]);

  // 신청자 분류 (배정 완료 / 미배정)
  const applicantStatus = useMemo(
    () =>
      volunteerApplicants.map((a) => ({
        applicant: a,
        assignment: findAssignmentForApplicant(a, volunteers),
      })),
    [volunteerApplicants, volunteers],
  );
  const unassignedCount = applicantStatus.filter((x) => !x.assignment).length;

  const busy =
    upsertMutation.isPending ||
    deleteMutation.isPending ||
    dutiesMutation.isPending;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={HeartHandshake}
        title={`자원봉사자 운영 — ${activity?.title ?? "대외 학술대회"}`}
        description="신청자 배정·시간대별 가능 인원·임무 체크리스트를 한곳에서 관리합니다."
        actions={
          volunteers.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBulkOpen(true)}
            >
              <ListChecks size={14} /> 역할별 임무 일괄 배분
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

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="총 봉사자" value={String(stats.total)} color="text-primary bg-primary/10" />
        <StatCard
          icon={UserPlus}
          label="미배정 신청자"
          value={String(unassignedCount)}
          color={
            unassignedCount > 0
              ? "text-destructive bg-destructive/5"
              : "text-success bg-success/5"
          }
        />
        <StatCard
          icon={ClipboardList}
          label="임무 체크 진행률"
          value={stats.completionRate != null ? `${stats.completionRate}%` : "—"}
          color="text-success bg-success/5"
        />
        <StatCard
          icon={ClipboardList}
          label="임무 (완료/전체)"
          value={`${stats.dutyDone.done} / ${stats.dutyDone.total}`}
          color="text-info bg-info/5"
        />
      </div>

      {/* 1. 자원봉사 신청자 ↔ 배정 통합 */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">자원봉사 신청자</h2>
          <span className="text-[11px] text-muted-foreground">
            총 {volunteerApplicants.length}명 · 미배정 {unassignedCount}명
          </span>
        </div>
        {volunteerApplicants.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="자원봉사 신청자가 없습니다"
            description="활동 신청폼에서 참석유형 '자원봉사자'로 신청한 인원이 여기 표시됩니다."
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
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {applicant.name || "익명"}
                    {!applicant.userId && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                        비회원
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {applicant.studentId && <span>{applicant.studentId} · </span>}
                    {applicant.phone || applicant.email || "연락처 없음"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {assignment ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/5 px-2 py-0.5 text-[11px] font-medium text-success">
                      <CheckCircle2 size={11} />
                      배정됨 · {VOLUNTEER_ROLE_LABELS[assignment.role]}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => setAssignTarget({ applicant })}
                      disabled={busy}
                    >
                      <UserPlus size={12} /> 역할 배정
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. 시간대별 가능 인원 시간표 */}
      <AvailabilityTimeGrid activity={activity} applicants={volunteerApplicants} />

      {/* 역할별 분포 (요약 막대) */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">역할별 분포</h2>
        <div className="space-y-1.5">
          {stats.roleDist.map((r) => (
            <div key={r.key} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 text-muted-foreground">{r.label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: stats.total > 0 ? `${(r.count / stats.total) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{r.count}명</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3·4. 역할별 봉사자 목록 — 임무 관리 + 인라인 편집 */}
      {isLoading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-xs text-muted-foreground">
          불러오는 중…
        </div>
      ) : volunteers.length === 0 ? (
        <div className="rounded-2xl border bg-card p-5">
          <EmptyState
            icon={HeartHandshake}
            title="아직 배정된 봉사자가 없습니다"
            description="위 신청자 목록에서 '역할 배정'을 눌러 봉사자를 배정하세요."
          />
        </div>
      ) : (
        ROLE_ORDER.map((roleKey) => {
          const list = grouped.get(roleKey) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={roleKey} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[roleKey]}`}
                >
                  {VOLUNTEER_ROLE_LABELS[roleKey]}
                </span>
                <span className="text-xs text-muted-foreground">{list.length}명</span>
              </div>
              <ul className="space-y-3">
                {list.map((v) => (
                  <VolunteerCard
                    key={v.id}
                    assignment={v}
                    busy={busy}
                    onMutateDuties={(mutator) => handleMutateDuties(v, mutator)}
                    onEdit={() => setAssignTarget({ existing: v })}
                    onDelete={() => handleDelete(v)}
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
            "봉사자"
          }
          existing={assignTarget.existing}
          saving={upsertMutation.isPending}
          onSubmit={handleAssignmentSubmit}
        />
      )}
      <BulkDutyDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        roleCounts={roleCounts}
        saving={bulkMutation.isPending}
        onSubmit={(role, dutyText) => bulkMutation.mutate({ role, dutyText })}
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
