"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, Users, User, UserPlus, Check, X,
  Pencil, Globe, Loader2, CheckCircle, Clock, XCircle,
} from "lucide-react";
import type { Activity, ActivityType } from "@/types";

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = { upcoming: "bg-blue-50 text-blue-700", ongoing: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };
const RECRUIT_LABELS: Record<string, string> = { recruiting: "모집중", closed: "모집마감", in_progress: "진행중", completed: "완료" };
const RECRUIT_COLORS: Record<string, string> = { recruiting: "bg-green-50 text-green-700", closed: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };

type Tab = "overview" | "participants" | "applicants" | "settings";

interface Props {
  activityId: string;
  type: ActivityType;
  backHref: string;
  backLabel: string;
}

export default function ActivityDetail({ activityId, type, backHref, backLabel }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyStudentId, setApplyStudentId] = useState("");

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const res = await activitiesApi.get(activityId);
      return res;
    },
  });

  const participants = (activity?.participants as string[] | undefined) ?? [];
  const applicants = (activity?.applicants as Activity["applicants"]) ?? [];
  const isJoined = user ? participants.includes(user.id) : false;
  const hasApplied = user ? applicants.some((a) => a.userId === user?.id) : false;
  const recruitmentStatus = activity?.recruitmentStatus ?? "recruiting";

  // 참여 신청 (대외활동: 신청서 기반, 기타: 즉시 참여)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!activity || !user) return;
      if (type === "external") {
        const newApplicant = { userId: user.id, name: applyName || user.name, studentId: applyStudentId, appliedAt: new Date().toISOString(), status: "pending" as const };
        await activitiesApi.update(activityId, { applicants: [...applicants, newApplicant] });
      } else {
        if (participants.includes(user.id)) return;
        await activitiesApi.update(activityId, { participants: [...participants, user.id] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success(type === "external" ? "참가 신청이 완료되었습니다." : "참여 신청이 완료되었습니다.");
      setApplyDialog(false);
    },
  });

  // 신청 승인/거절 (관리자)
  const updateApplicantMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "approved" | "rejected" }) => {
      if (!activity) return;
      const updated = applicants.map((a) => a.userId === userId ? { ...a, status } : a);
      const newParticipants = status === "approved" && !participants.includes(userId)
        ? [...participants, userId] : participants;
      await activitiesApi.update(activityId, { applicants: updated, participants: newParticipants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("처리되었습니다.");
    },
  });

  if (!activity) {
    return <div className="py-16 text-center text-muted-foreground">활동을 찾을 수 없습니다.</div>;
  }

  const TABS: { value: Tab; label: string; show: boolean }[] = [
    { value: "overview", label: "개요", show: true },
    { value: "participants", label: `참여자 (${participants.length})`, show: true },
    { value: "applicants", label: `신청현황 (${applicants.length})`, show: type === "external" || isStaff },
    { value: "settings", label: "관리", show: isStaff },
  ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href={backHref} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />{backLabel}
        </Link>

        {/* 헤더 */}
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[activity.status])}>{STATUS_LABELS[activity.status]}</Badge>
            {activity.recruitmentStatus && (
              <Badge variant="secondary" className={cn("text-xs", RECRUIT_COLORS[activity.recruitmentStatus])}>{RECRUIT_LABELS[activity.recruitmentStatus]}</Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{activity.title}</h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={14} />{activity.date}{activity.endDate ? ` ~ ${activity.endDate}` : ""}</span>
            {activity.leader && <span className="flex items-center gap-1"><User size={14} />{activity.leader}</span>}
            {activity.location && <span className="flex items-center gap-1"><MapPin size={14} />{activity.location}</span>}
            <span className="flex items-center gap-1"><Users size={14} />참여 {participants.length}{activity.maxParticipants ? `/${activity.maxParticipants}` : ""}명</span>
            {activity.conferenceUrl && <a href={activity.conferenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe size={14} />학회 홈페이지</a>}
          </div>

          {/* 참여 버튼 */}
          <div className="mt-4">
            {user && !isJoined && !hasApplied && recruitmentStatus === "recruiting" && (
              type === "external" ? (
                <Button size="sm" onClick={() => { setApplyName(user.name); setApplyStudentId(user.studentId || ""); setApplyDialog(true); }}>
                  <UserPlus size={14} className="mr-1" />참가 신청
                </Button>
              ) : (
                <Button size="sm" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                  <UserPlus size={14} className="mr-1" />참여 신청
                </Button>
              )
            )}
            {isJoined && <Badge className="bg-green-50 text-green-700"><Check size={12} className="mr-1" />참여 중</Badge>}
            {hasApplied && !isJoined && <Badge className="bg-amber-50 text-amber-700"><Clock size={12} className="mr-1" />신청 대기중</Badge>}
          </div>
        </div>

        {/* 탭 */}
        <div className="mt-6 flex overflow-x-auto border-b">
          {TABS.filter((t) => t.show).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-none border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                activeTab === tab.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{activity.description}</p>
                {activity.detailContent && (
                  <div className="mt-4 border-t pt-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{activity.detailContent}</p>
                  </div>
                )}
              </div>
              {activity.tags && activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activity.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}
            </div>
          )}

          {activeTab === "participants" && (
            <div className="rounded-xl border bg-white">
              {participants.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">참여자가 없습니다.</p>
              ) : (
                <div className="divide-y">
                  {participants.map((pid, i) => (
                    <div key={pid} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span>{i + 1}. {pid}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "applicants" && (
            <div className="rounded-xl border bg-white">
              {applicants.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">신청 내역이 없습니다.</p>
              ) : (
                <div className="divide-y">
                  {applicants.map((a) => (
                    <div key={a.userId} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium">{a.name}</span>
                        {a.studentId && <span className="ml-2 text-xs text-muted-foreground">{a.studentId}</span>}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(a.appliedAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === "pending" && isStaff && (
                          <>
                            <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => updateApplicantMutation.mutate({ userId: a.userId, status: "approved" })}>
                              <CheckCircle size={12} />승인
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={() => updateApplicantMutation.mutate({ userId: a.userId, status: "rejected" })}>
                              <XCircle size={12} />거절
                            </Button>
                          </>
                        )}
                        {a.status === "approved" && <Badge className="bg-green-50 text-green-700 text-[10px]">승인</Badge>}
                        {a.status === "rejected" && <Badge className="bg-red-50 text-red-700 text-[10px]">거절</Badge>}
                        {a.status === "pending" && !isStaff && <Badge className="bg-amber-50 text-amber-700 text-[10px]">대기</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && isStaff && (
            <div className="rounded-xl border bg-white p-6">
              <p className="text-sm text-muted-foreground">활동 목록 페이지에서 수정/삭제할 수 있습니다.</p>
              <Link href={backHref}>
                <Button variant="outline" size="sm" className="mt-3"><Pencil size={14} className="mr-1" />목록으로 이동</Button>
              </Link>
            </div>
          )}
        </div>

        {/* 대외활동 참가 신청 Dialog */}
        <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>참가 신청</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><label className="mb-1 block text-sm font-medium">이름</label>
                <Input value={applyName} onChange={(e) => setApplyName(e.target.value)} /></div>
              <div><label className="mb-1 block text-sm font-medium">학번</label>
                <Input value={applyStudentId} onChange={(e) => setApplyStudentId(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialog(false)}>취소</Button>
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || !applyName.trim()}>
                {applyMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}신청
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
