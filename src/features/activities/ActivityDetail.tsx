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

type Tab = "overview" | "participants" | "applicants" | "form-settings" | "report" | "settings";

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
  const [applyAnswers, setApplyAnswers] = useState<Record<string, string>>({});
  const [newQuestion, setNewQuestion] = useState("");

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
        const newApplicant = { userId: user.id, name: applyName || user.name, studentId: applyStudentId, answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined, appliedAt: new Date().toISOString(), status: "pending" as const };
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

  const applicationQuestions = (activity?.applicationQuestions as string[] | undefined) ?? [];

  // 신청 폼 질문 관리
  async function addQuestion() {
    if (!newQuestion.trim() || !activity) return;
    const updated = [...applicationQuestions, newQuestion.trim()];
    await activitiesApi.update(activityId, { applicationQuestions: updated });
    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
    setNewQuestion("");
    toast.success("질문이 추가되었습니다.");
  }

  async function removeQuestion(idx: number) {
    if (!activity) return;
    const updated = applicationQuestions.filter((_, i) => i !== idx);
    await activitiesApi.update(activityId, { applicationQuestions: updated });
    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
    toast.success("질문이 삭제되었습니다.");
  }

  // 리포트 통계
  const reportStats = {
    totalApplicants: applicants.length,
    approved: applicants.filter((a) => a.status === "approved").length,
    rejected: applicants.filter((a) => a.status === "rejected").length,
    pending: applicants.filter((a) => a.status === "pending").length,
    participants: participants.length,
    approvalRate: applicants.length > 0 ? Math.round((applicants.filter((a) => a.status === "approved").length / applicants.length) * 100) : 0,
  };

  const TABS: { value: Tab; label: string; show: boolean }[] = [
    { value: "overview", label: "개요", show: true },
    { value: "participants", label: `참여자 (${participants.length})`, show: true },
    { value: "applicants", label: `신청현황 (${applicants.length})`, show: type === "external" || isStaff },
    { value: "form-settings", label: "신청 폼 설정", show: isStaff },
    { value: "report", label: "리포트", show: isStaff },
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

          {activeTab === "form-settings" && isStaff && (
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="font-semibold">신청 폼 커스텀 질문</h3>
              <p className="text-xs text-muted-foreground">신청 시 추가로 받을 질문을 설정합니다.</p>
              <div className="space-y-2">
                {applicationQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                    <span className="flex-1 text-sm">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="새 질문 입력 (예: 지원 동기는?)" onKeyDown={(e) => e.key === "Enter" && addQuestion()} />
                <Button size="sm" variant="outline" onClick={addQuestion} disabled={!newQuestion.trim()}>추가</Button>
              </div>
            </div>
          )}

          {activeTab === "report" && isStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold">{reportStats.totalApplicants}</p>
                  <p className="text-xs text-muted-foreground">총 신청</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{reportStats.approved}</p>
                  <p className="text-xs text-muted-foreground">승인</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{reportStats.rejected}</p>
                  <p className="text-xs text-muted-foreground">거절</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{reportStats.pending}</p>
                  <p className="text-xs text-muted-foreground">대기</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{reportStats.participants}</p>
                  <p className="text-xs text-muted-foreground">참여자</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-center">
                  <p className="text-2xl font-bold">{reportStats.approvalRate}%</p>
                  <p className="text-xs text-muted-foreground">승인율</p>
                </div>
              </div>

              {/* 신청 답변 요약 */}
              {applicationQuestions.length > 0 && applicants.length > 0 && (
                <div className="rounded-xl border bg-white p-6">
                  <h3 className="font-semibold">신청 답변 요약</h3>
                  {applicationQuestions.map((q) => {
                    const answers = applicants.filter((a) => a.answers?.[q]).map((a) => ({ name: a.name, answer: a.answers![q] }));
                    return (
                      <div key={q} className="mt-4">
                        <p className="text-sm font-medium text-primary">{q}</p>
                        {answers.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">답변 없음</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {answers.map((a, i) => (
                              <div key={i} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                                <span className="font-medium">{a.name}:</span> {a.answer}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 참여자 목록 CSV 내보내기 */}
              <Button variant="outline" size="sm" onClick={() => {
                const bom = "\uFEFF";
                const header = "이름,학번,상태,신청일\n";
                const rows = applicants.map((a) => `"${a.name}","${a.studentId ?? ""}","${a.status}","${a.appliedAt}"`).join("\n");
                const blob = new Blob([bom + header + rows], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const el = document.createElement("a");
                el.href = url; el.download = `${activity?.title ?? "activity"}_리포트.csv`; el.click();
                URL.revokeObjectURL(url);
              }}>
                CSV 내보내기
              </Button>
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
              {applicationQuestions.map((q, i) => (
                <div key={i}><label className="mb-1 block text-sm font-medium">{q}</label>
                  <textarea value={applyAnswers[q] ?? ""} onChange={(e) => setApplyAnswers((prev) => ({ ...prev, [q]: e.target.value }))} rows={2} placeholder="답변을 입력해주세요." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></div>
              ))}
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
