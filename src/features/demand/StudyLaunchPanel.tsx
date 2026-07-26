"use client";

/**
 * 스터디 개설 파이프라인 패널 (2026-07-25)
 * 수요 항목 → 모임장 선정 → 스터디 설계 → 개설(활동 자동 생성) → (모집·운영은 생성된 활동이 담당).
 *
 * governance:
 *  - 모임장 자원/설계: 로그인 회원(모임장) 또는 staff
 *  - 최종 "개설"(activities 생성): firestore.rules 상 staff 전용
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  UserCheck,
  PencilRuler,
  Rocket,
  Check,
  Loader2,
  ArrowRight,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { commQuestionsApi, activitiesApi, commLikesApi } from "@/lib/bkend";
import type { CommQuestion } from "@/types";

type Stage = "reviewing" | "leader" | "designing" | "opened";

const STEPS: { key: Stage; label: string; icon: React.ElementType }[] = [
  { key: "reviewing", label: "검토", icon: Check },
  { key: "leader", label: "모임장", icon: UserCheck },
  { key: "designing", label: "설계", icon: PencilRuler },
  { key: "opened", label: "개설", icon: Rocket },
];

const STAGE_INDEX: Record<string, number> = {
  collecting: 0,
  reviewing: 0,
  leader: 1,
  designing: 2,
  opened: 3,
  declined: 0,
};

interface Props {
  question: CommQuestion;
  joinCount: number;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function StudyLaunchPanel({ question, joinCount, open, onClose, onUpdated }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const pref = question.demandPref ?? {};
  const status = (pref.status ?? "collecting") as string;
  const stageIdx = STAGE_INDEX[status] ?? 0;
  const isLeader = !!user && pref.leaderId === user.id;
  const canManage = isStaff || isLeader;

  // 참여 의사 회원 명단 (모임장·운영진이 초대 대상으로 확인) — 자동 등록 아님
  const { data: responders = [] } = useQuery({
    queryKey: ["demand-responders", question.id],
    queryFn: () => commLikesApi.respondersOf("demand-join", question.id),
    enabled: open && canManage,
  });

  // 설계 폼 상태
  const [startDate, setStartDate] = useState(pref.design?.startDate ?? "");
  const [cadence, setCadence] = useState(pref.design?.cadence ?? "");
  const [level, setLevel] = useState(pref.design?.level ?? "");
  const [maxParticipants, setMaxParticipants] = useState(
    pref.design?.maxParticipants ? String(pref.design.maxParticipants) : "",
  );
  const [plan, setPlan] = useState(pref.design?.plan ?? "");

  function patchPref(patch: Record<string, unknown>) {
    return commQuestionsApi.update(question.id, {
      demandPref: { ...pref, ...patch },
    });
  }

  // 단계 전환 (모임장 모집 시작 등)
  const advanceMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => patchPref(patch),
    onSuccess: () => {
      toast.success("진행 상태를 업데이트했습니다.");
      onUpdated();
    },
    onError: (e) => toast.error(`오류: ${e instanceof Error ? e.message : "실패"}`),
  });

  // 모임장 자원
  const volunteerMutation = useMutation({
    mutationFn: () =>
      patchPref({ leaderId: user!.id, leaderName: user!.name ?? "", status: "leader" }),
    onSuccess: () => {
      toast.success("모임장으로 자원했습니다.");
      onUpdated();
    },
    onError: (e) => toast.error(`오류: ${e instanceof Error ? e.message : "실패"}`),
  });

  // 설계 저장
  const saveDesignMutation = useMutation({
    mutationFn: () =>
      patchPref({
        status: "designing",
        design: {
          startDate: startDate || undefined,
          cadence: cadence.trim() || undefined,
          level: level.trim() || undefined,
          maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
          plan: plan.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("스터디 설계를 저장했습니다.");
      onUpdated();
    },
    onError: (e) => toast.error(`저장 오류: ${e instanceof Error ? e.message : "실패"}`),
  });

  // 개설 = 활동 자동 생성 + 수요 연결 (staff 전용)
  const openMutation = useMutation({
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const detail = [
        plan.trim(),
        cadence.trim() ? `운영 주기: ${cadence.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const created = await activitiesApi.create({
        type: "study",
        title: question.body.slice(0, 60),
        description: `수요조사에서 개설된 스터디${level.trim() ? ` · 대상 ${level.trim()}` : ""}`,
        detailContent: detail,
        date: startDate ? `${startDate}T00:00:00.000Z` : nowIso,
        status: "upcoming",
        recruitmentStatus: "recruiting",
        ...(maxParticipants ? { maxParticipants: Number(maxParticipants) } : {}),
        leader: pref.leaderName ?? "",
        leaderId: pref.leaderId ?? "",
        members: pref.leaderId ? [pref.leaderId] : [],
        participants: [],
        createdBy: user?.id ?? "",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await commQuestionsApi.update(question.id, {
        demandPref: {
          ...pref,
          status: "opened",
          linkedActivityId: (created as { id: string }).id,
          statusNote: "수요조사에서 스터디로 개설되었습니다. 참가자 모집이 시작됩니다.",
        },
      });
    },
    onSuccess: () => {
      toast.success("스터디를 개설했습니다! 참가자 모집이 시작됩니다.");
      onUpdated();
      onClose();
    },
    onError: (e) => toast.error(`개설 오류: ${e instanceof Error ? e.message : "실패"}`),
  });

  const busy =
    advanceMutation.isPending ||
    volunteerMutation.isPending ||
    saveDesignMutation.isPending ||
    openMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">스터디 개설 진행</DialogTitle>
          <DialogDescription className="line-clamp-2">{question.body}</DialogDescription>
        </DialogHeader>

        {/* 스테퍼 */}
        <ol className="flex items-center justify-between gap-1 py-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < stageIdx;
            const active = i === stageIdx;
            return (
              <li key={step.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                    done && "border-success bg-success/10 text-success",
                    active && "border-primary bg-primary/10 text-primary",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  <Icon size={13} />
                </div>
                <span className={cn("text-[10px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-3">
          {/* 참여 현황 */}
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            참여 의사 <span className="font-semibold text-success">{joinCount}명</span>
            {pref.leaderName && (
              <> · 모임장 <span className="font-semibold text-foreground">{pref.leaderName}</span></>
            )}
          </div>

          {/* 참여 의사 회원 명단 (모임장·운영진 전용 — 초대 대상, 자동 등록 아님) */}
          {canManage && responders.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground">
                <Users size={12} /> 참여 희망 명단 <span className="text-muted-foreground">({responders.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {responders.map((r) => (
                  <span
                    key={r.userId}
                    className="rounded-full border bg-card px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {r.userName || "회원"}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                개설 후 이 회원들에게 참여를 안내하세요. 자동 등록되지 않습니다.
              </p>
            </div>
          )}

          {/* 단계별 액션 */}
          {status === "opened" ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center text-sm">
              <Rocket className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="font-medium text-success">스터디가 개설되었습니다.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                스터디 목록에서 참가자 모집·운영을 이어가세요.
              </p>
            </div>
          ) : (
            <>
              {/* 1) 검토 → 모임장 모집 */}
              {stageIdx <= 0 && (
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-medium text-foreground">1. 모임장 모집 시작</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    이 주제로 스터디를 이끌 모임장을 모집합니다.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user && (
                      <Button size="sm" variant="outline" onClick={() => volunteerMutation.mutate()} disabled={busy}>
                        <UserCheck size={13} className="mr-1" /> 내가 모임장 할게요
                      </Button>
                    )}
                    {isStaff && (
                      <Button size="sm" variant="ghost" onClick={() => advanceMutation.mutate({ status: "leader" })} disabled={busy}>
                        모임장 모집 단계로 <ArrowRight size={13} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 2) 모임장 선정 */}
              {stageIdx === 1 && (
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-medium text-foreground">2. 모임장 선정</p>
                  {pref.leaderName ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      모임장: <span className="font-medium text-foreground">{pref.leaderName}</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">아직 모임장이 없습니다.</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user && !isLeader && (
                      <Button size="sm" variant="outline" onClick={() => volunteerMutation.mutate()} disabled={busy}>
                        <UserCheck size={13} className="mr-1" /> 내가 모임장 할게요
                      </Button>
                    )}
                    {canManage && pref.leaderId && (
                      <Button size="sm" onClick={() => advanceMutation.mutate({ status: "designing" })} disabled={busy}>
                        설계 단계로 <ArrowRight size={13} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 3) 스터디 설계 */}
              {stageIdx === 2 && (
                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-medium text-foreground">3. 스터디 설계</p>
                  {canManage ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">시작 예정일</Label>
                          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">정원</Label>
                          <Input type="number" min={2} max={50} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="예: 8" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">운영 주기</Label>
                        <Input value={cadence} onChange={(e) => setCadence(e.target.value)} placeholder="예: 격주 목요일 19시" maxLength={40} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">대상 수준</Label>
                        <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="예: 논문 초급자" maxLength={40} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">커리큘럼·운영 계획</Label>
                        <Textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={4} placeholder="주차별 주제·교재·진행 방식 등" className="text-xs" />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => saveDesignMutation.mutate()} disabled={busy}>
                          {saveDesignMutation.isPending ? <Loader2 size={13} className="mr-1 animate-spin" /> : <PencilRuler size={13} className="mr-1" />}
                          설계 저장
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">모임장·운영진만 설계를 편집할 수 있습니다.</p>
                  )}
                </div>
              )}

              {/* 4) 개설 (staff 전용) */}
              {stageIdx >= 2 && (
                <div className="rounded-xl border border-primary/20 p-3">
                  <p className="text-sm font-medium text-foreground">4. 스터디 개설</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    설계 내용으로 스터디 활동을 자동 생성하고 참가자 모집을 시작합니다.
                  </p>
                  {isStaff ? (
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={() => openMutation.mutate()} disabled={busy || !pref.leaderId}>
                        {openMutation.isPending ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Rocket size={13} className="mr-1" />}
                        스터디 개설
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">최종 개설은 운영진이 확정합니다.</p>
                  )}
                  {!pref.leaderId && (
                    <p className="mt-1 text-[11px] text-warning">모임장 선정 후 개설할 수 있습니다.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
