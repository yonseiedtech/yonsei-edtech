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
  Plus, Trash2, FileUp, Download, ListChecks,
} from "lucide-react";
import type { Activity, ActivityType, ActivityProgress, ActivityMaterial, FormField } from "@/types";
import { activityProgressApi, activityMaterialsApi } from "@/lib/bkend";
import { uploadToStorage, type UploadedFile } from "@/lib/storage";
import { formatSemester } from "@/lib/semester";
import FormBuilder from "./FormBuilder";
import FormRenderer from "./FormRenderer";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import { useAllMembers } from "@/features/member/useMembers";

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = { upcoming: "bg-blue-50 text-blue-700", ongoing: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };
const RECRUIT_LABELS: Record<string, string> = { recruiting: "모집중", closed: "모집마감", in_progress: "진행중", completed: "완료" };
const RECRUIT_LABELS_STUDY: Record<string, string> = { recruiting: "모집중", closed: "모집완료" };
const RECRUIT_COLORS: Record<string, string> = { recruiting: "bg-green-50 text-green-700", closed: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };

type Tab = "overview" | "progress" | "materials" | "participants" | "applicants" | "form-settings" | "report" | "settings";

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
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyAnswers, setApplyAnswers] = useState<Record<string, string | string[] | UploadedFile[]>>({});
  const [signupCtaOpen, setSignupCtaOpen] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressDate, setProgressDate] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const res = await activitiesApi.get(activityId);
      return res;
    },
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ["activity-progress", activityId],
    queryFn: async () => {
      const res = await activityProgressApi.list(activityId);
      return res.data as ActivityProgress[];
    },
  });

  const { data: materialsList = [] } = useQuery({
    queryKey: ["activity-materials", activityId],
    queryFn: async () => {
      const res = await activityMaterialsApi.list(activityId);
      return res.data as ActivityMaterial[];
    },
  });

  const rawParticipants = (activity?.participants as string[] | undefined) ?? [];
  const leaderId = (activity?.leaderId as string | undefined) ?? undefined;
  const participants = leaderId && !rawParticipants.includes(leaderId) ? [leaderId, ...rawParticipants] : rawParticipants;
  const applicants = (activity?.applicants as Activity["applicants"]) ?? [];
  const participantRoles = (activity?.participantRoles as Record<string, string> | undefined) ?? {};
  const registrationMethod = (activity?.registrationMethod as "open" | "manual" | undefined) ?? "manual";
  const isLeader = !!user && !!leaderId && user.id === leaderId;
  const canManageParticipants = isLeader || isStaff;
  const { members: allMembers } = useAllMembers();
  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const isJoined = user ? participants.includes(user.id) : false;
  const hasApplied = user ? applicants.some((a) => a.userId === user?.id || (a.isGuest && a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase())) : false;
  const recruitmentStatus = activity?.recruitmentStatus ?? "recruiting";

  // 참여 신청 (대외활동: 신청서 기반, 기타: 즉시 참여)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!activity) return;
      if (type === "external") {
        if (user) {
          const newApplicant = { userId: user.id, name: applyName || user.name, studentId: applyStudentId, email: applyEmail || user.email, phone: applyPhone, answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined, appliedAt: new Date().toISOString(), status: "pending" as const };
          await activitiesApi.update(activityId, { applicants: [...applicants, newApplicant] });
        } else {
          if (!applyName.trim() || !applyEmail.trim()) throw new Error("이름과 이메일은 필수입니다.");
          const guestKey = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const newApplicant = { guestKey, isGuest: true, name: applyName.trim(), studentId: applyStudentId, email: applyEmail.trim().toLowerCase(), phone: applyPhone, answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined, appliedAt: new Date().toISOString(), status: "pending" as const };
          await activitiesApi.update(activityId, { applicants: [...applicants, newApplicant] });
        }
      } else {
        if (!user) return;
        if (participants.includes(user.id)) return;
        await activitiesApi.update(activityId, { participants: [...participants, user.id] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success(type === "external" ? "참가 신청이 완료되었습니다." : "참여 신청이 완료되었습니다.");
      setApplyDialog(false);
      if (!user && type === "external") setSignupCtaOpen(true);
    },
    onError: (e: Error) => { toast.error(e.message || "신청에 실패했습니다."); },
  });

  // PR7: 참여자 추가/제거 (운영진 또는 스터디 모임장)
  const addParticipantMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activity) return;
      if (participants.includes(memberId)) return;
      await activitiesApi.update(activityId, { participants: [...participants, memberId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("참여자가 추가되었습니다.");
    },
    onError: () => toast.error("추가에 실패했습니다."),
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activity) return;
      await activitiesApi.update(activityId, { participants: participants.filter((p) => p !== memberId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("참여자가 제외되었습니다.");
    },
  });

  // 신청 승인/거절 (관리자)
  const updateApplicantMutation = useMutation({
    mutationFn: async ({ key, status }: { key: string; status: "approved" | "rejected" }) => {
      if (!activity) return;
      const updated = applicants.map((a) => ((a.userId ?? a.guestKey) === key ? { ...a, status } : a));
      const target = applicants.find((a) => (a.userId ?? a.guestKey) === key);
      const newParticipants = status === "approved" && target?.userId && !participants.includes(target.userId)
        ? [...participants, target.userId] : participants;
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
  const applicationForm: FormField[] = (activity?.applicationForm as FormField[] | undefined)
    ?? applicationQuestions.map((q, i) => ({ id: `legacy_${i}`, type: "long_text" as const, label: q }));

  // 리포트 통계
  const reportStats = {
    totalApplicants: applicants.length,
    approved: applicants.filter((a) => a.status === "approved").length,
    rejected: applicants.filter((a) => a.status === "rejected").length,
    pending: applicants.filter((a) => a.status === "pending").length,
    participants: participants.length,
    approvalRate: applicants.length > 0 ? Math.round((applicants.filter((a) => a.status === "approved").length / applicants.length) * 100) : 0,
  };

  const progressDone = progressList.filter((p) => p.status === "completed").length;
  const progressPct = progressList.length > 0 ? Math.round((progressDone / progressList.length) * 100) : 0;

  const TABS: { value: Tab; label: string; show: boolean }[] = [
    { value: "overview", label: "개요", show: true },
    { value: "progress", label: `진행 현황${progressList.length > 0 ? ` (${progressPct}%)` : ""}`, show: type !== "external" },
    { value: "materials", label: `산출물 (${materialsList.length})`, show: true },
    { value: "participants", label: `참여자 (${participants.length})`, show: true },
    { value: "applicants", label: `신청현황 (${applicants.length})`, show: registrationMethod === "open" && (type === "external" || isStaff) },
    { value: "form-settings", label: "신청 폼 설정", show: registrationMethod === "open" && isStaff },
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
              <Badge variant="secondary" className={cn("text-xs", RECRUIT_COLORS[activity.recruitmentStatus])}>{type === "study" ? (RECRUIT_LABELS_STUDY[activity.recruitmentStatus] ?? RECRUIT_LABELS[activity.recruitmentStatus]) : RECRUIT_LABELS[activity.recruitmentStatus]}</Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{activity.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={14} />{activity.date}{activity.endDate ? ` ~ ${activity.endDate}` : ""}</span>
            {(activity.year || activity.semester) && (
              <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                {formatSemester(activity.year, activity.semester)}
              </Badge>
            )}
            {activity.leader && <span className="flex items-center gap-1"><User size={14} />{activity.leader}</span>}
            {activity.location && <span className="flex items-center gap-1"><MapPin size={14} />{activity.location}</span>}
            <span className="flex items-center gap-1"><Users size={14} />참여 {participants.length}{activity.maxParticipants ? `/${activity.maxParticipants}` : ""}명</span>
            {activity.conferenceUrl && <a href={activity.conferenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe size={14} />학회 홈페이지</a>}
          </div>

          {/* 참여 버튼 */}
          <div className="mt-4">
            {!isJoined && !hasApplied && recruitmentStatus === "recruiting" && registrationMethod === "open" && (
              type === "external" ? (
                <Button size="sm" onClick={() => {
                  setApplyName(user?.name ?? "");
                  setApplyStudentId(user?.studentId ?? "");
                  setApplyEmail(user?.email ?? "");
                  setApplyPhone("");
                  setApplyDialog(true);
                }}>
                  <UserPlus size={14} className="mr-1" />참가 신청{!user && " (비회원 가능)"}
                </Button>
              ) : user ? (
                <Button size="sm" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                  <UserPlus size={14} className="mr-1" />참여 신청
                </Button>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90">
                  <UserPlus size={14} className="mr-1" />로그인 후 참여 신청
                </Link>
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

          {activeTab === "progress" && (
            <div className="space-y-4">
              {/* 진행률 바 */}
              {progressList.length > 0 && (
                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">전체 진행률</span>
                    <span className="text-muted-foreground">{progressDone}/{progressList.length} 완료 ({progressPct}%)</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all", progressPct === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}

              {/* 주차별 기록 */}
              <div className="rounded-xl border bg-white divide-y">
                {progressList.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">등록된 진행 기록이 없습니다.</p>
                ) : (
                  progressList.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                      <button
                        onClick={async () => {
                          if (!isStaff) return;
                          const next = p.status === "completed" ? "planned" : p.status === "planned" ? "in_progress" : "completed";
                          await activityProgressApi.update(p.id, { status: next });
                          queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                        }}
                        className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", p.status === "completed" ? "border-green-500 bg-green-500 text-white" : p.status === "in_progress" ? "border-amber-400 bg-amber-50" : "border-muted-foreground/30")}
                        disabled={!isStaff}
                      >
                        {p.status === "completed" && <Check size={12} />}
                        {p.status === "in_progress" && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">Week {p.week}</Badge>
                          <span className="text-sm font-medium">{p.title}</span>
                        </div>
                        {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                        <span className="text-[10px] text-muted-foreground">{p.date}</span>
                      </div>
                      {isStaff && (
                        <button onClick={async () => {
                          await activityProgressApi.delete(p.id);
                          queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                          toast.success("삭제되었습니다.");
                        }} className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* 주차 추가 (운영진) */}
              {isStaff && (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1"><ListChecks size={14} />주차 추가</h3>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={progressTitle} onChange={(e) => setProgressTitle(e.target.value)} placeholder="활동 내용 (예: 논문 리뷰 #1)" className="flex-1" />
                    <Input type="date" value={progressDate} onChange={(e) => setProgressDate(e.target.value)} className="w-40" />
                    <Button size="sm" disabled={!progressTitle.trim()} onClick={async () => {
                      await activityProgressApi.create({
                        activityId,
                        week: progressList.length + 1,
                        date: progressDate || new Date().toISOString().split("T")[0],
                        title: progressTitle.trim(),
                        status: "planned",
                      });
                      queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                      setProgressTitle("");
                      setProgressDate("");
                      toast.success("추가되었습니다.");
                    }}><Plus size={14} className="mr-1" />추가</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-4">
              {/* 업로드 (운영진 또는 참여자) */}
              {(isStaff || (user && participants.includes(user.id))) && (
                <div className="rounded-xl border bg-white p-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                    파일 업로드
                    <input type="file" className="hidden" disabled={uploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      setUploading(true);
                      try {
                        const uploaded = await uploadToStorage(file, `activity-materials/${activityId}`);
                        await activityMaterialsApi.create({
                          activityId,
                          title: file.name,
                          fileName: file.name,
                          fileUrl: uploaded.url,
                          fileSize: file.size,
                          uploadedBy: user.id,
                          uploadedByName: user.name,
                        });
                        queryClient.invalidateQueries({ queryKey: ["activity-materials", activityId] });
                        toast.success("파일이 업로드되었습니다.");
                      } catch (err) { toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다."); }
                      finally { setUploading(false); e.target.value = ""; }
                    }} />
                  </label>
                </div>
              )}

              {/* 파일 목록 */}
              <div className="rounded-xl border bg-white divide-y">
                {materialsList.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">등록된 산출물이 없습니다.</p>
                ) : (
                  materialsList.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{m.title}</span>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{m.uploadedByName}</span>
                          <span>{(m.fileSize / 1024).toFixed(0)}KB</span>
                          <span>{new Date(m.createdAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                      </div>
                      <a href={m.fileUrl} download={m.fileName} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Download size={12} />다운로드</Button>
                      </a>
                      {(isStaff || user?.id === m.uploadedBy) && (
                        <button onClick={async () => {
                          if (!confirm("삭제하시겠습니까?")) return;
                          await activityMaterialsApi.delete(m.id);
                          queryClient.invalidateQueries({ queryKey: ["activity-materials", activityId] });
                          toast.success("삭제되었습니다.");
                        }} className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-3">
              {/* PR7: 모임장/운영진 직접 추가 */}
              {canManageParticipants && (
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold flex items-center gap-1">
                    <UserPlus size={14} />회원 추가
                  </h3>
                  <MemberAutocomplete
                    value=""
                    onSelect={(m) => addParticipantMutation.mutate(m.id)}
                    excludeIds={participants}
                    placeholder="회원 이름 또는 학번으로 검색"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {type === "study" && isLeader ? "모임장 권한으로 참여자를 추가할 수 있습니다." : "운영진 권한으로 참여자를 추가/제거할 수 있습니다."}
                  </p>
                </div>
              )}
              <div className="rounded-xl border bg-white">
                {participants.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">참여자가 없습니다.</p>
                ) : (
                  <div className="divide-y">
                    {participants.map((pid, i) => {
                      const m = memberMap.get(pid);
                      const role = participantRoles[pid];
                      return (
                        <div key={pid} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">{i + 1}.</span>
                            <span className="font-medium">{m?.name ?? "(이름 미확인)"}</span>
                            {m?.studentId && <span className="text-xs text-muted-foreground">{m.studentId}</span>}
                            {m?.generation && <Badge variant="secondary" className="text-[10px]">{m.generation}기</Badge>}
                            {leaderId === pid && <Badge className="bg-amber-50 text-amber-700 text-[10px]">{type === "study" ? "모임장" : "담당자"}</Badge>}
                            {role && <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            {canManageParticipants && (
                              <>
                                <button
                                  onClick={() => {
                                    const newRole = prompt("역할을 입력하세요 (예: 발표자, 기록자, 총무)", role || "");
                                    if (newRole === null) return;
                                    const updated = { ...participantRoles };
                                    if (newRole.trim()) updated[pid] = newRole.trim();
                                    else delete updated[pid];
                                    activitiesApi.update(activityId, { participantRoles: updated });
                                    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                                  }}
                                  className="rounded p-1 text-muted-foreground hover:text-primary"
                                  aria-label="역할 설정"
                                  title="역할 설정"
                                >
                                  <Pencil size={13} />
                                </button>
                                {leaderId !== pid && (
                                  <button
                                    onClick={() => {
                                      if (confirm("참여에서 제외하시겠습니까?")) removeParticipantMutation.mutate(pid);
                                    }}
                                    className="rounded p-1 text-muted-foreground hover:text-red-500"
                                    aria-label="제외"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "applicants" && (
            <div className="rounded-xl border bg-white">
              {applicants.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">신청 내역이 없습니다.</p>
              ) : (
                <div className="divide-y">
                  {applicants.map((a) => {
                    const key = a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`;
                    return (
                    <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium">{a.name}</span>
                        {a.isGuest && <Badge variant="secondary" className="ml-2 bg-slate-100 text-[10px] text-slate-600">비회원</Badge>}
                        {a.studentId && <span className="ml-2 text-xs text-muted-foreground">{a.studentId}</span>}
                        {a.email && isStaff && <span className="ml-2 text-xs text-muted-foreground">{a.email}</span>}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(a.appliedAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === "pending" && isStaff && (
                          <>
                            <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => updateApplicantMutation.mutate({ key, status: "approved" })}>
                              <CheckCircle size={12} />승인
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={() => updateApplicantMutation.mutate({ key, status: "rejected" })}>
                              <XCircle size={12} />거절
                            </Button>
                          </>
                        )}
                        {a.status === "approved" && <Badge className="bg-green-50 text-green-700 text-[10px]">승인</Badge>}
                        {a.status === "rejected" && <Badge className="bg-red-50 text-red-700 text-[10px]">거절</Badge>}
                        {a.status === "pending" && !isStaff && <Badge className="bg-amber-50 text-amber-700 text-[10px]">대기</Badge>}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}

          {activeTab === "form-settings" && isStaff && (
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <div>
                <h3 className="font-semibold">신청 폼 빌더</h3>
                <p className="mt-1 text-xs text-muted-foreground">구글 폼처럼 단답·장문·객관식·체크박스·드롭다운·날짜·파일 업로드 등 다양한 질문을 구성할 수 있습니다.</p>
              </div>
              <FormBuilder
                value={applicationForm}
                onChange={async (fields) => {
                  queryClient.setQueryData(["activity", activityId], (prev: unknown) => {
                    if (!prev || typeof prev !== "object") return prev;
                    return { ...(prev as Record<string, unknown>), applicationForm: fields };
                  });
                  try {
                    await activitiesApi.update(activityId, { applicationForm: fields });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "폼 저장 실패");
                    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                  }
                }}
              />
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
              {applicationForm.length > 0 && applicants.length > 0 && (
                <div className="rounded-xl border bg-white p-6">
                  <h3 className="font-semibold">신청 답변 요약</h3>
                  {applicationForm.map((field) => {
                    const answers = applicants
                      .map((a) => ({ name: a.name, v: a.answers?.[field.id] ?? a.answers?.[field.label] }))
                      .filter((x) => x.v !== undefined && x.v !== "");
                    return (
                      <div key={field.id} className="mt-4">
                        <p className="text-sm font-medium text-primary">{field.label}</p>
                        {answers.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">답변 없음</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {answers.map((a, i) => {
                              let display: string;
                              if (Array.isArray(a.v)) {
                                display = typeof (a.v as unknown[])[0] === "string"
                                  ? (a.v as string[]).join(", ")
                                  : `${(a.v as { name: string }[]).length}개 파일 첨부`;
                              } else if (field.type === "schedule" && typeof a.v === "string") {
                                // PR8: 스케줄 답변은 JSON 문자열
                                try {
                                  const slots = JSON.parse(a.v) as { date: string; start: string; end: string }[];
                                  display = slots.length === 0
                                    ? "(선택 없음)"
                                    : slots.map((s) => `${s.date} ${s.start}-${s.end}`).join(", ");
                                } catch {
                                  display = String(a.v);
                                }
                              } else {
                                display = String(a.v);
                              }
                              return (
                                <div key={i} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                                  <span className="font-medium">{a.name}:</span> {display}
                                </div>
                              );
                            })}
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
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-6 space-y-4">
                <h3 className="font-semibold">참여자 등록 방식</h3>
                <select
                  value={registrationMethod}
                  onChange={async (e) => {
                    await activitiesApi.update(activityId, { registrationMethod: e.target.value as "open" | "manual" });
                    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                    toast.success("등록 방식이 변경되었습니다.");
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="manual">수기 등록 (관리자/모임장이 직접 추가)</option>
                  <option value="open">공개 신청 (참가 신청을 받음)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {registrationMethod === "open"
                    ? "공개 신청 모드: 참가 신청 버튼이 표시되며, 신청현황 탭에서 승인/거절할 수 있습니다."
                    : "수기 등록 모드: 참여자 탭에서 관리자 또는 모임장이 직접 회원을 추가합니다."}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-muted-foreground">활동 정보 수정/삭제는 목록 페이지에서 가능합니다.</p>
                <Link href={backHref}>
                  <Button variant="outline" size="sm" className="mt-3"><Pencil size={14} className="mr-1" />목록으로 이동</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 대외활동 참가 신청 Dialog */}
        <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>참가 신청{!user && " (비회원)"}</DialogTitle></DialogHeader>
            {!user && (
              <p className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                비회원으로도 신청할 수 있습니다. 신청 후 동일한 이메일로 회원가입하시면 활동 기록이 자동 연결됩니다.
              </p>
            )}
            <div className="grid gap-3">
              <div><label className="mb-1 block text-sm font-medium">이름 *</label>
                <Input value={applyName} onChange={(e) => setApplyName(e.target.value)} /></div>
              <div><label className="mb-1 block text-sm font-medium">학번</label>
                <Input value={applyStudentId} onChange={(e) => setApplyStudentId(e.target.value)} /></div>
              <div><label className="mb-1 block text-sm font-medium">이메일 {!user && "*"}</label>
                <Input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} placeholder="name@example.com" /></div>
              <div><label className="mb-1 block text-sm font-medium">연락처</label>
                <Input value={applyPhone} onChange={(e) => setApplyPhone(e.target.value)} placeholder="010-0000-0000" /></div>
              {applicationForm.length > 0 && (
                <FormRenderer
                  fields={applicationForm}
                  value={applyAnswers}
                  onChange={(id, v) => setApplyAnswers((prev) => ({ ...prev, [id]: v }))}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialog(false)}>취소</Button>
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || !applyName.trim() || (!user && !applyEmail.trim())}>
                {applyMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}신청
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 비회원 신청 후 회원가입 유도 */}
        <Dialog open={signupCtaOpen} onOpenChange={setSignupCtaOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>신청이 완료되었습니다 🎉</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm text-slate-700">
              <p>운영진 승인 후 참가 확정 메일을 <strong>{applyEmail}</strong>로 보내드립니다.</p>
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="font-medium text-primary">회원가입하면 이런 점이 좋아요</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>신청 내역과 승인 상태를 마이페이지에서 실시간 확인</li>
                  <li>후속 세미나·스터디 일정 자동 알림</li>
                  <li>같은 이메일로 가입하면 이번 신청이 <strong>자동 연결</strong>됩니다</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignupCtaOpen(false)}>나중에</Button>
              <Link
                href={`/signup?email=${encodeURIComponent(applyEmail)}&name=${encodeURIComponent(applyName)}`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                회원가입하고 기록 연결하기
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
