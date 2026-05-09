"use client";

/**
 * 운영 콘솔 — 신청자 학번 기반 회원 연동 마이그레이션
 *
 * 비회원(isGuest=true)으로 등록된 신청자 중 학번이 입력된 항목을
 * 같은 학번을 가진 승인 회원(approved)과 자동 연동 (userId 채우기 + isGuest=false).
 *
 * 학번은 고유값 — 안전한 매칭 키.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, GraduationCap, Check, AlertTriangle } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { activitiesApi, profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import type { Activity, User } from "@/types";

interface ProposedLink {
  activityId: string;
  activityTitle: string;
  applicantIndex: number;
  applicantName: string;
  studentId: string;
  matchedUserId: string;
  matchedUserName: string;
}

function MigrationPageContent() {
  const qc = useQueryClient();
  const { data: actsRes, isLoading: isLoadingActs } = useQuery({
    queryKey: ["console-link-actsx"],
    queryFn: () => activitiesApi.list(),
    staleTime: 60_000,
  });
  const { data: usersRes, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["console-link-users"],
    queryFn: () => profilesApi.list({ limit: 1000 }),
    staleTime: 60_000,
  });

  const activities = (actsRes?.data ?? []) as Activity[];
  const users = (usersRes?.data ?? []) as User[];

  // 학번 → 승인 회원 매핑 (학번이 없거나 미승인은 제외)
  const memberByStudentId = new Map<string, User>();
  for (const u of users) {
    if (!u.approved || u.rejected) continue;
    const sid = (u.studentId ?? "").trim();
    if (!sid) continue;
    memberByStudentId.set(sid, u);
  }

  // 후보 추출 — 모든 활동의 applicants 중 isGuest && studentId && 매칭 회원 존재
  const proposed: ProposedLink[] = [];
  for (const act of activities) {
    const applicants = act.applicants ?? [];
    for (let i = 0; i < applicants.length; i++) {
      const a = applicants[i];
      if (!a.isGuest) continue;
      const sid = (a.studentId ?? "").trim();
      if (!sid) continue;
      const matched = memberByStudentId.get(sid);
      if (!matched) continue;
      // 이미 동일 회원으로 다른 신청 항목 존재 시 — 현 신청에 userId 채우기 (중복은 별도 정리)
      proposed.push({
        activityId: act.id,
        activityTitle: act.title,
        applicantIndex: i,
        applicantName: a.name,
        studentId: sid,
        matchedUserId: matched.id,
        matchedUserName: matched.name,
      });
    }
  }

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function runMigration() {
    if (proposed.length === 0) return;
    if (!confirm(`${proposed.length}건의 신청자를 회원으로 연동합니다. 계속하시겠습니까?`)) return;

    setRunning(true);
    setErrors([]);

    // activityId 별로 묶어서 한 번에 update (applicants 배열 전체 갱신)
    const byActivity = new Map<string, ProposedLink[]>();
    for (const p of proposed) {
      const arr = byActivity.get(p.activityId) ?? [];
      arr.push(p);
      byActivity.set(p.activityId, arr);
    }

    let okCount = 0;
    const errs: string[] = [];
    for (const [activityId, links] of byActivity) {
      try {
        const act = activities.find((a) => a.id === activityId);
        if (!act) continue;
        const applicants = [...(act.applicants ?? [])];
        const existingParticipants: string[] = [...((act.participants as string[] | undefined) ?? [])];
        const newParticipants = [...existingParticipants];
        for (const link of links) {
          const a = applicants[link.applicantIndex];
          if (!a) continue;
          applicants[link.applicantIndex] = {
            ...a,
            userId: link.matchedUserId,
            isGuest: false,
          };
          // 연동된 회원을 participants 배열에도 추가 (미포함 시에만)
          if (!newParticipants.includes(link.matchedUserId)) {
            newParticipants.push(link.matchedUserId);
          }
        }
        await activitiesApi.update(activityId, { applicants, participants: newParticipants });
        okCount += links.length;
      } catch (e) {
        errs.push(`${activityId}: ${(e as Error).message}`);
      }
    }

    setRunning(false);
    setDone(true);
    setErrors(errs);
    await qc.invalidateQueries({ queryKey: ["console-link-actsx"] });
    if (errs.length === 0) {
      toast.success(`${okCount}건 연동 완료`);
    } else {
      toast.error(`${okCount}건 성공 / ${errs.length}건 실패`);
    }
  }

  // Sprint 67-V: 기존 연동 정합성 보강 — applicants 의 연동된 회원이 participants 배열에 빠진 경우 push
  // (도구 fix 이전에 수행된 연동 케이스 — 박진아님 등 — 일괄 복구)
  async function reconcileParticipants() {
    if (!confirm(
      "모든 학술대회를 순회하며, 연동된 신청자(applicants[].isGuest=false, userId 보유) 중 " +
      "참여자 배열에 빠진 회원을 일괄 추가합니다. 데이터를 변경합니다. 계속할까요?"
    )) return;
    setRunning(true);
    let updatedActs = 0;
    let addedCount = 0;
    const errs: string[] = [];
    for (const act of activities) {
      try {
        const apps = (act.applicants ?? []) as Array<{ userId?: string; isGuest?: boolean }>;
        const linkedIds = apps
          .map((a) => (a && a.isGuest === false && a.userId ? a.userId : undefined))
          .filter((v): v is string => !!v);
        if (linkedIds.length === 0) continue;
        const existing: string[] = [...((act.participants as string[] | undefined) ?? [])];
        const missing = linkedIds.filter((id) => !existing.includes(id));
        if (missing.length === 0) continue;
        const next = [...existing, ...missing];
        await activitiesApi.update(act.id, { participants: next });
        updatedActs += 1;
        addedCount += missing.length;
      } catch (e) {
        errs.push(`${act.id}: ${(e as Error).message}`);
      }
    }
    setRunning(false);
    setErrors(errs);
    await qc.invalidateQueries({ queryKey: ["console-link-actsx"] });
    if (errs.length === 0) {
      toast.success(`${updatedActs}개 학술대회 / ${addedCount}명 보강 완료`);
    } else {
      toast.error(`보강 부분 성공: ${addedCount}명 / 실패 ${errs.length}건`);
    }
  }

  if (isLoadingActs || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 데이터 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ConsolePageHeader
        icon={GraduationCap}
        title="신청자 학번 기반 회원 연동"
        description="비회원으로 등록된 신청자 중 학번 매칭이 가능한 항목을 자동으로 회원과 연동합니다. 학번은 고유값."
      />

      <div className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">사전 확인 사항</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              <li>대상: applicants[].isGuest=true 이면서 studentId 입력된 항목</li>
              <li>매칭: 같은 studentId 를 가진 승인 회원(approved=true)</li>
              <li>실행 시 applicants[].userId 채우고 isGuest=false 로 갱신 (이름·답변 등은 보존)</li>
              <li>실패 항목은 하단 에러 목록에 표시</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sprint 67-V: 기존 연동 정합성 보강 — applicants 연동됐지만 participants 누락된 케이스 일괄 복구 */}
      <div className="rounded-md border bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          기존 연동 정합성 보강
        </p>
        <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
          이전에 연동된 신청자(applicants[].isGuest=false) 가 학술대회 참여자 배열에 누락된 경우
          일괄 추가합니다. (박진아님 등 도구 fix 이전 케이스 복구용)
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={reconcileParticipants}
          disabled={running}
        >
          {running ? (
            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> 보강 중…</>
          ) : (
            "참여자 누락 일괄 보강"
          )}
        </Button>
      </div>

      {proposed.length === 0 ? (
        <EmptyState
          icon={Check}
          title="연동할 신청자가 없습니다"
          description="모든 비회원 신청 중 학번 일치 회원이 발견되지 않았거나, 이미 모두 연동된 상태입니다."
        />
      ) : (
        <>
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm">
              총 <b>{proposed.length}건</b> 의 자동 연동 후보가 발견되었습니다.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={runMigration}
              disabled={running || done}
            >
              {running ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> 연동 중…</>
              ) : done ? "완료됨" : `${proposed.length}건 일괄 연동 실행`}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">활동</th>
                  <th className="px-3 py-2 text-left">신청자명</th>
                  <th className="px-3 py-2 text-left">학번</th>
                  <th className="px-3 py-2 text-left">매칭 회원</th>
                </tr>
              </thead>
              <tbody>
                {proposed.map((p, i) => (
                  <tr key={`${p.activityId}-${p.applicantIndex}-${i}`} className="border-t">
                    <td className="px-3 py-2">{p.activityTitle}</td>
                    <td className="px-3 py-2">{p.applicantName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.studentId}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{p.matchedUserName}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{p.matchedUserId.slice(0, 8)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm dark:border-rose-800 dark:bg-rose-950/30">
          <p className="font-semibold text-rose-900 dark:text-rose-100">실패 항목</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-rose-800 dark:text-rose-200">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ApplicantLinkPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <MigrationPageContent />
    </AuthGuard>
  );
}
