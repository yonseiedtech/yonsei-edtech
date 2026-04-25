"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Plus, Trash2, ListChecks, Timer, UserCog,
  ChevronDown, ChevronUp,
} from "lucide-react";
import InlineMeetingTimer from "./InlineMeetingTimer";
import type { Activity, ActivityType, ActivityProgress, ActivityProgressMode, FormField, EnrollmentStatus, ExternalParticipantType } from "@/types";
import { ENROLLMENT_STATUS_LABELS, ACTIVITY_PROGRESS_MODE_LABELS, EXTERNAL_PARTICIPANT_TYPE_LABELS, EXTERNAL_PARTICIPANT_TYPE_COLORS } from "@/types";
import { activityProgressApi, progressMeetingsApi } from "@/lib/bkend";
import type { UploadedFile } from "@/lib/storage";
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

type Tab = "overview" | "progress" | "staff" | "participants" | "applicants" | "form-settings" | "report" | "settings";

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyStudentId, setApplyStudentId] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyAnswers, setApplyAnswers] = useState<Record<string, string | string[] | UploadedFile[]>>({});
  const [applyParticipantType, setApplyParticipantType] = useState<ExternalParticipantType>("attendee");
  const [signupCtaOpen, setSignupCtaOpen] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressDate, setProgressDate] = useState("");
  const [progressStartTime, setProgressStartTime] = useState("");
  const [progressEndTime, setProgressEndTime] = useState("");
  const [progressMode, setProgressMode] = useState<ActivityProgressMode>("in_person");
  const [roleDialog, setRoleDialog] = useState<{ pid: string; name: string } | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ pid: string; name: string } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [expandedTimers, setExpandedTimers] = useState<Set<string>>(new Set());

  const toggleTimer = (pid: string) => {
    setExpandedTimers((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

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
      const list = res.data as ActivityProgress[];
      // 진행된 날짜(date) 오름차순 정렬, 날짜 동일 시 시작시간/week 보조 정렬
      return [...list].sort((a, b) => {
        const aDate = a.date ?? "";
        const bDate = b.date ?? "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        const aStart = a.startTime ?? "";
        const bStart = b.startTime ?? "";
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        return (a.week ?? 0) - (b.week ?? 0);
      });
    },
  });

  const rawParticipants = (activity?.participants as string[] | undefined) ?? [];
  const leaderId = (activity?.leaderId as string | undefined) ?? undefined;
  const participants = leaderId && !rawParticipants.includes(leaderId) ? [leaderId, ...rawParticipants] : rawParticipants;
  const applicants = (activity?.applicants as Activity["applicants"]) ?? [];
  const participantRoles = (activity?.participantRoles as Record<string, string> | undefined) ?? {};
  const participantNotes = (activity?.participantNotes as Record<string, string> | undefined) ?? {};
  const registrationMethod = (activity?.registrationMethod as "open" | "manual" | undefined) ?? "manual";
  const isLeader = !!user && !!leaderId && user.id === leaderId;
  const canManageParticipants = isLeader || isStaff;
  const { members: allMembers } = useAllMembers();
  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const isJoined = user ? participants.includes(user.id) : false;
  const hasApplied = user ? applicants.some((a) => a.userId === user?.id || (a.isGuest && a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase())) : false;
  const recruitmentStatus = activity?.recruitmentStatus ?? "recruiting";

  // 신청 다이얼로그가 열릴 때 비활성화된 참석 유형이 선택돼 있으면 첫 번째 활성 유형으로 보정
  useEffect(() => {
    if (!applyDialog || type !== "external") return;
    const configured = activity?.enabledParticipantTypes;
    if (!configured || configured.length === 0) return;
    if (!configured.includes(applyParticipantType)) {
      setApplyParticipantType(configured[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyDialog, activity?.enabledParticipantTypes]);

  // 참여 신청 (대외활동: 신청서 기반, 기타: 즉시 참여)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!activity) return;
      if (type === "external") {
        if (user) {
          const newApplicant = { userId: user.id, name: applyName || user.name, studentId: applyStudentId, email: applyEmail || user.email, phone: applyPhone, answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined, appliedAt: new Date().toISOString(), status: "pending" as const, participantType: applyParticipantType };
          await activitiesApi.update(activityId, { applicants: [...applicants, newApplicant] });
        } else {
          if (!applyName.trim() || !applyEmail.trim() || !applyStudentId.trim()) {
            throw new Error("비회원 신청은 이름·학번·이메일이 모두 필요합니다.");
          }
          const guestKey = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const newApplicant = { guestKey, isGuest: true, name: applyName.trim(), studentId: applyStudentId, email: applyEmail.trim().toLowerCase(), phone: applyPhone, answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined, appliedAt: new Date().toISOString(), status: "pending" as const, participantType: applyParticipantType };
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

  // 참여자 역할 저장
  const updateRoleMutation = useMutation({
    mutationFn: async ({ pid, role }: { pid: string; role: string }) => {
      const updated = { ...participantRoles };
      if (role.trim()) updated[pid] = role.trim();
      else delete updated[pid];
      await activitiesApi.update(activityId, { participantRoles: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("역할이 저장되었습니다.");
      setRoleDialog(null);
    },
  });

  // 참여자 메모 저장
  const updateNoteMutation = useMutation({
    mutationFn: async ({ pid, note }: { pid: string; note: string }) => {
      const updated = { ...participantNotes };
      if (note.trim()) updated[pid] = note.trim();
      else delete updated[pid];
      await activitiesApi.update(activityId, { participantNotes: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("메모가 저장되었습니다.");
      setNoteDialog(null);
    },
  });

  // 참여자 신청 상태 변경 (해당 사용자의 applicant row 가 있을 때만 의미가 있음)
  // 대외 학술대회의 경우 거절 시 applicant까지 제거(=신청 취소)
  const updateParticipantStatusMutation = useMutation({
    mutationFn: async ({ pid, status }: { pid: string; status: "approved" | "rejected" | "pending" }) => {
      const isExternalReject = type === "external" && status === "rejected";
      const updated = isExternalReject
        ? applicants.filter((a) => a.userId !== pid)
        : applicants.map((a) => (a.userId === pid ? { ...a, status } : a));
      const newParticipants = status === "rejected"
        ? participants.filter((p) => p !== pid)
        : participants;
      await activitiesApi.update(activityId, {
        applicants: updated,
        participants: newParticipants,
      });
      return { isExternalReject };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success(result?.isExternalReject ? "신청이 취소되었습니다." : "상태가 변경되었습니다.");
    },
  });

  // 거절 이력 삭제 (관리자) — applicants에서 완전 제거
  const deleteApplicantMutation = useMutation({
    mutationFn: async ({ key }: { key: string }) => {
      if (!activity) return;
      const target = applicants.find((a) => (a.userId ?? a.guestKey) === key);
      const updated = applicants.filter((a) => (a.userId ?? a.guestKey) !== key);
      const newParticipants = target?.userId
        ? participants.filter((p) => p !== target.userId)
        : participants;
      await activitiesApi.update(activityId, { applicants: updated, participants: newParticipants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("이력이 삭제되었습니다.");
    },
  });

  // 신청 승인/거절 (관리자)
  // 대외 학술대회의 경우 거절 시 신청현황에서 제거(=신청 취소)
  const updateApplicantMutation = useMutation({
    mutationFn: async ({ key, status }: { key: string; status: "approved" | "rejected" }) => {
      if (!activity) return;
      const target = applicants.find((a) => (a.userId ?? a.guestKey) === key);
      const isExternalReject = type === "external" && status === "rejected";
      const updated = isExternalReject
        ? applicants.filter((a) => (a.userId ?? a.guestKey) !== key)
        : applicants.map((a) => ((a.userId ?? a.guestKey) === key ? { ...a, status } : a));
      let newParticipants = participants;
      if (status === "approved" && target?.userId && !participants.includes(target.userId)) {
        newParticipants = [...participants, target.userId];
      } else if (isExternalReject && target?.userId && participants.includes(target.userId)) {
        newParticipants = participants.filter((p) => p !== target.userId);
      }
      await activitiesApi.update(activityId, { applicants: updated, participants: newParticipants });
      return { isExternalReject };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success(result?.isExternalReject ? "신청이 취소되었습니다." : "처리되었습니다.");
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

  const staffPids = participants.filter((pid) => leaderId === pid || !!participantRoles[pid]);
  const regularPids = participants.filter((pid) => !staffPids.includes(pid));

  const TABS: { value: Tab; label: string; show: boolean }[] = [
    { value: "overview", label: "개요", show: true },
    { value: "progress", label: `진행 현황${progressList.length > 0 ? ` (${progressPct}%)` : ""}`, show: !!user && type !== "external" },
    { value: "staff", label: `운영진 (${staffPids.length})`, show: !!user },
    { value: "participants", label: `참여자 (${regularPids.length})`, show: !!user },
    { value: "applicants", label: `신청현황 (${applicants.length})`, show: !!user && registrationMethod === "open" && (type === "external" || isStaff) },
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
            {activity.recruitmentStatus && !(type === "study" && (activity.recruitmentStatus === "in_progress" || activity.recruitmentStatus === "completed")) && (
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
              {!user ? (
                activity.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activity.imageUrl} alt={`${activity.title} 포스터`} className="block w-full" />
                  </div>
                ) : (
                  <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                    포스터가 등록되지 않았습니다. 자세한 정보는 로그인 후 확인할 수 있습니다.
                  </div>
                )
              ) : (
                <>
                  {activity.imageUrl && (
                    <div className="overflow-hidden rounded-xl border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activity.imageUrl} alt={`${activity.title} 포스터`} className="block w-full" />
                    </div>
                  )}
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
                </>
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

              {/* 주차 추가 (운영진 또는 스터디/프로젝트 모임장) — 리스트 위로 이동 */}
              {(isStaff || isLeader) && (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1"><ListChecks size={14} />주차 추가</h3>
                  <Input value={progressTitle} onChange={(e) => setProgressTitle(e.target.value)} placeholder="활동 내용 (예: 논문 리뷰 #1)" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">날짜</label>
                      <Input type="date" value={progressDate} onChange={(e) => setProgressDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">시작 시간</label>
                      <Input type="time" value={progressStartTime} onChange={(e) => setProgressStartTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">종료 시간</label>
                      <Input type="time" value={progressEndTime} onChange={(e) => setProgressEndTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">방법</label>
                      <select
                        value={progressMode}
                        onChange={(e) => setProgressMode(e.target.value as ActivityProgressMode)}
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="in_person">대면</option>
                        <option value="zoom">ZOOM</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!progressTitle.trim()} onClick={async () => {
                      try {
                        const nextWeek = progressList.reduce((max, p) => Math.max(max, p.week ?? 0), 0) + 1;
                        await activityProgressApi.create({
                          activityId,
                          week: nextWeek,
                          date: progressDate || new Date().toISOString().split("T")[0],
                          startTime: progressStartTime || undefined,
                          endTime: progressEndTime || undefined,
                          mode: progressMode,
                          title: progressTitle.trim(),
                          status: "planned",
                        });
                        await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                        await queryClient.refetchQueries({ queryKey: ["activity-progress", activityId] });
                        setProgressTitle("");
                        setProgressDate("");
                        setProgressStartTime("");
                        setProgressEndTime("");
                        setProgressMode("in_person");
                        toast.success("추가되었습니다.");
                      } catch (e) {
                        console.error("[activity-progress/create]", e);
                        toast.error(e instanceof Error ? `추가 실패: ${e.message}` : "추가에 실패했습니다.");
                      }
                    }}><Plus size={14} className="mr-1" />추가</Button>
                  </div>
                </div>
              )}

              {/* 주차별 기록 */}
              <div className="rounded-xl border bg-white divide-y">
                {progressList.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">등록된 진행 기록이 없습니다.</p>
                ) : (
                  progressList.map((p, idx) => {
                    const isExpanded = expandedTimers.has(p.id);
                    const displayWeek = idx + 1;
                    return (
                      <div key={p.id}>
                        <div className="flex items-start gap-3 px-4 py-3">
                          <button
                            onClick={async () => {
                              if (!isStaff && !isLeader) return;
                              const next = p.status === "completed" ? "planned" : p.status === "planned" ? "in_progress" : "completed";
                              try {
                                await activityProgressApi.update(p.id, { status: next });
                                queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                              } catch (e) {
                                console.error("[activity-progress/update]", e);
                                toast.error(e instanceof Error ? `상태 변경 실패: ${e.message}` : "상태 변경에 실패했습니다.");
                              }
                            }}
                            className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", p.status === "completed" ? "border-green-500 bg-green-500 text-white" : p.status === "in_progress" ? "border-amber-400 bg-amber-50" : "border-muted-foreground/30")}
                            disabled={!isStaff && !isLeader}
                          >
                            {p.status === "completed" && <Check size={12} />}
                            {p.status === "in_progress" && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">Week {displayWeek}</Badge>
                              {p.mode && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    p.mode === "in_person"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-700",
                                  )}
                                >
                                  {ACTIVITY_PROGRESS_MODE_LABELS[p.mode]}
                                </Badge>
                              )}
                              <span className="text-sm font-medium">{p.title}</span>
                            </div>
                            {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{p.date}</span>
                              {(p.startTime || p.endTime) && (
                                <span>
                                  {p.startTime}
                                  {p.startTime && p.endTime && " ~ "}
                                  {p.endTime}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="sm"
                              variant={isExpanded ? "default" : "outline"}
                              onClick={() => toggleTimer(p.id)}
                              className="h-7 gap-1 px-2 text-[11px]"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "미팅 타이머 접기" : "미팅 타이머 펼치기"}
                            >
                              <Timer size={12} />
                              <span className="hidden sm:inline">타이머</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </Button>
                            {(isStaff || isLeader) && (
                              <button onClick={async () => {
                                try {
                                  await activityProgressApi.delete(p.id);
                                  queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                                  toast.success("삭제되었습니다.");
                                } catch (e) {
                                  console.error("[activity-progress/delete]", e);
                                  toast.error(e instanceof Error ? `삭제 실패: ${e.message}` : "삭제에 실패했습니다.");
                                }
                              }} className="rounded p-1 text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-muted/20 px-4 py-3">
                            <InlineMeetingTimer
                              activityId={activityId}
                              activityProgressId={p.id}
                              weekLabel={`Week ${displayWeek} · ${p.title}`}
                              canControl={isStaff || isLeader}
                              canStart={isStaff || isLeader}
                              createdBy={user?.id}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {(activeTab === "staff" || activeTab === "participants") && (() => {
            const renderRow = (pid: string) => {
              const m = memberMap.get(pid);
              const role = participantRoles[pid];
              const note = participantNotes[pid];
              const applicant = applicants.find((a) => a.userId === pid);
              const status = applicant?.status;
              const enrollment = (m?.enrollmentStatus as EnrollmentStatus | undefined);
              const isLeaderRow = leaderId === pid;
              return (
                <tr key={pid} className="hover:bg-muted/20">
                  <td className="px-3 py-2 align-top">
                    {enrollment ? (
                      <Badge variant="secondary" className={cn(
                        "text-[10px]",
                        enrollment === "enrolled" && "bg-green-50 text-green-700",
                        enrollment === "on_leave" && "bg-amber-50 text-amber-700",
                        enrollment === "graduated" && "bg-slate-100 text-slate-700",
                      )}>
                        {ENROLLMENT_STATUS_LABELS[enrollment]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{m?.name ?? "(이름 미확인)"}</span>
                      {m?.generation && <Badge variant="secondary" className="text-[10px]">{m.generation}기</Badge>}
                      {isLeaderRow && (
                        <Badge className="bg-amber-50 text-amber-700 text-[10px]">
                          {type === "study" ? "모임장" : "담당자"}
                        </Badge>
                      )}
                    </div>
                    {note && (
                      <p className="mt-1 text-[11px] text-muted-foreground italic">메모: {note}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {m?.studentId ?? "-"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {role ? (
                      <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {m?.phone ?? "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground truncate max-w-[200px]">
                    {m?.email ?? "-"}
                  </td>
                  {canManageParticipants && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {applicant && (
                          <select
                            value={status ?? "pending"}
                            onChange={(e) => updateParticipantStatusMutation.mutate({
                              pid,
                              status: e.target.value as "approved" | "rejected" | "pending",
                            })}
                            className="rounded border bg-background px-1.5 py-1 text-[11px]"
                            title="신청 상태 변경"
                          >
                            <option value="pending">대기</option>
                            <option value="approved">승인</option>
                            <option value="rejected">거절</option>
                          </select>
                        )}
                        <button
                          onClick={() => {
                            setNoteInput(note ?? "");
                            setNoteDialog({ pid, name: m?.name ?? "(이름 미확인)" });
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-primary"
                          title="메모"
                        >
                          <Pencil size={13} />
                        </button>
                        {!isLeaderRow && (
                          <button
                            onClick={() => {
                              if (confirm("참여에서 제외하시겠습니까?")) removeParticipantMutation.mutate(pid);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-red-500"
                            title="제외"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            };

            const tableHead = (
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">신분유형</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">학번</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">핸드폰 번호</th>
                  <th className="px-3 py-2 font-medium">이메일</th>
                  {canManageParticipants && <th className="px-3 py-2 font-medium text-right">관리</th>}
                </tr>
              </thead>
            );

            if (activeTab === "staff") {
              return (
                <div className="space-y-3">
                  {/* 운영진 추가: 회원 검색 후 추가하면 일반 참가자로 들어가며,
                      역할을 부여하면 자동으로 운영진으로 분류됨 */}
                  {canManageParticipants && (
                    <div className="rounded-xl border bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold flex items-center gap-1">
                        <Pencil size={14} />역할 등록
                      </h3>
                      <p className="mb-2 text-xs text-muted-foreground">
                        참여자에게 담당자·발표자·기록자 등 역할을 부여합니다. 역할이 부여되면 자동으로 <strong>운영진</strong>으로 분류됩니다.
                      </p>
                      {participants.length === 0 ? (
                        <p className="text-xs text-muted-foreground">먼저 참여자 탭에서 회원을 추가해주세요.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {participants.map((pid) => {
                            const m = memberMap.get(pid);
                            const role = participantRoles[pid];
                            return (
                              <button
                                key={`role-${pid}`}
                                onClick={() => {
                                  setRoleInput(role ?? "");
                                  setRoleDialog({ pid, name: m?.name ?? "(이름 미확인)" });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs hover:bg-muted/50"
                              >
                                <span className="font-medium">{m?.name ?? "(이름 미확인)"}</span>
                                {role
                                  ? <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>
                                  : <span className="text-muted-foreground">+ 역할</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 운영진 테이블 */}
                  <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="flex items-center gap-2 border-b bg-amber-50/60 px-4 py-2.5">
                      <UserCog size={14} className="text-amber-700" />
                      <h3 className="text-sm font-semibold text-amber-900">운영진 ({staffPids.length})</h3>
                      <span className="text-[11px] text-muted-foreground">담당자 · 역할 보유자</span>
                    </div>
                    {staffPids.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">등록된 운영진이 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          {tableHead}
                          <tbody className="divide-y">{staffPids.map(renderRow)}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // activeTab === "participants" — 일반 참가자만
            return (
              <div className="space-y-3">
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
                      {type === "study" && isLeader ? "모임장 권한으로 참여자를 추가할 수 있습니다." : "운영진 권한으로 참여자를 추가/제거할 수 있습니다. 역할을 부여하면 운영진 탭으로 이동합니다."}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border bg-white overflow-hidden">
                  <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2.5">
                    <Users size={14} className="text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-700">일반 참가자 ({regularPids.length})</h3>
                  </div>
                  {regularPids.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">일반 참가자가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        {tableHead}
                        <tbody className="divide-y">{regularPids.map(renderRow)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                        {type === "external" && (
                          <Badge variant="secondary" className={cn("ml-2 text-[10px]", EXTERNAL_PARTICIPANT_TYPE_COLORS[(a.participantType ?? "attendee") as ExternalParticipantType])}>
                            {EXTERNAL_PARTICIPANT_TYPE_LABELS[(a.participantType ?? "attendee") as ExternalParticipantType]}
                          </Badge>
                        )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs text-destructive"
                              onClick={() => {
                                if (type === "external") {
                                  if (!confirm(`${a.name}님의 신청을 취소하시겠습니까?\n신청현황에서 제거됩니다.`)) return;
                                }
                                updateApplicantMutation.mutate({ key, status: "rejected" });
                              }}
                            >
                              <XCircle size={12} />{type === "external" ? "신청 취소" : "거절"}
                            </Button>
                          </>
                        )}
                        {a.status === "approved" && <Badge className="bg-green-50 text-green-700 text-[10px]">승인</Badge>}
                        {a.status === "rejected" && (
                          <>
                            <Badge className="bg-red-50 text-red-700 text-[10px]">거절</Badge>
                            {isStaff && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (!confirm(`${a.name}님의 거절 이력을 삭제하시겠습니까?\n신청현황에서 완전히 제거됩니다.`)) return;
                                  deleteApplicantMutation.mutate({ key });
                                }}
                              >
                                <Trash2 size={12} />이력 삭제
                              </Button>
                            )}
                          </>
                        )}
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

              {type === "external" && applicants.length > 0 && (
                <div className="rounded-xl border bg-white p-4">
                  <p className="mb-2 text-sm font-semibold">참석 유형별 신청</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["speaker", "volunteer", "attendee"] as const).map((t) => {
                      const count = applicants.filter((a) => (a.participantType ?? "attendee") === t).length;
                      return (
                        <div key={t} className={cn("rounded-lg p-3 text-center", EXTERNAL_PARTICIPANT_TYPE_COLORS[t])}>
                          <p className="text-xs">{EXTERNAL_PARTICIPANT_TYPE_LABELS[t]}</p>
                          <p className="text-xl font-bold">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                const header = type === "external" ? "이름,학번,참석유형,상태,신청일\n" : "이름,학번,상태,신청일\n";
                const rows = applicants.map((a) => type === "external"
                  ? `"${a.name}","${a.studentId ?? ""}","${EXTERNAL_PARTICIPANT_TYPE_LABELS[(a.participantType ?? "attendee") as ExternalParticipantType]}","${a.status}","${a.appliedAt}"`
                  : `"${a.name}","${a.studentId ?? ""}","${a.status}","${a.appliedAt}"`).join("\n");
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
              <div className="rounded-xl border bg-white p-6 space-y-3">
                <h3 className="font-semibold">완료 시 자동 발급</h3>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={activity.autoIssueCertificates !== false}
                    onChange={async (e) => {
                      try {
                        await activitiesApi.update(activityId, { autoIssueCertificates: e.target.checked });
                        queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                        toast.success(e.target.checked ? "자동 발급이 켜졌습니다." : "자동 발급이 꺼졌습니다.");
                      } catch (err) {
                        console.error("[activity/auto-cert]", err);
                        toast.error(err instanceof Error ? `변경 실패: ${err.message}` : "변경에 실패했습니다.");
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium">
                      활동 종료 시 {type === "external" ? "참석확인서" : "수료증"} 자동 발급
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {type === "external"
                        ? "활동이 종료되면 승인된 신청자에게 참석확인서를 자동 발급합니다 (주관기관·일정 포함)."
                        : "활동이 종료되면 참여자에게 수료증을 자동 발급합니다 (활동 기간·역할 포함)."}
                      {" "}해제하면 운영자가 수동 발급해야 합니다.
                    </p>
                  </div>
                </label>
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
                비회원으로도 신청할 수 있습니다. 추후 <strong>동일한 학번(또는 이메일)</strong>으로 회원가입하시면 이번 신청 기록이 자동으로 회원 활동에 연동됩니다.
              </p>
            )}
            <div className="grid gap-3">
              {(() => {
                const allTypes = ["speaker", "volunteer", "attendee"] as const;
                const configured = activity?.enabledParticipantTypes;
                const enabledTypes = (configured && configured.length > 0)
                  ? allTypes.filter((t) => configured.includes(t))
                  : allTypes;
                const cols = enabledTypes.length === 1 ? "grid-cols-1" : enabledTypes.length === 2 ? "grid-cols-2" : "grid-cols-3";
                return (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">참석 유형 <span className="text-red-500">*</span></label>
                    <div className={cn("grid gap-2", cols)}>
                      {enabledTypes.map((t) => {
                        const active = applyParticipantType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setApplyParticipantType(t)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all",
                              active
                                ? `${EXTERNAL_PARTICIPANT_TYPE_COLORS[t]} border-current shadow-sm scale-[1.02]`
                                : "border-input bg-white text-slate-600 hover:border-primary/40 hover:bg-muted/50 dark:bg-card",
                            )}
                            aria-pressed={active}
                          >
                            <span className="text-base font-bold">
                              {EXTERNAL_PARTICIPANT_TYPE_LABELS[t]}
                            </span>
                            {active && <span className="text-[10px]">선택됨</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div><label className="mb-1 block text-sm font-medium">이름 *</label>
                <Input value={applyName} onChange={(e) => setApplyName(e.target.value)} /></div>
              <div><label className="mb-1 block text-sm font-medium">학번 {!user && "*"}</label>
                <Input value={applyStudentId} onChange={(e) => setApplyStudentId(e.target.value)} placeholder={!user ? "예: 2023432001 (회원가입 시 기록 연동)" : undefined} /></div>
              <div><label className="mb-1 block text-sm font-medium">이메일 {!user && "*"}</label>
                <Input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} placeholder="name@example.com" /></div>
              <div><label className="mb-1 block text-sm font-medium">연락처</label>
                <Input value={applyPhone} onChange={(e) => setApplyPhone(e.target.value)} placeholder="010-0000-0000" /></div>
              {applicationForm.length > 0 && (
                <FormRenderer
                  fields={applicationForm}
                  value={applyAnswers}
                  onChange={(id, v) => setApplyAnswers((prev) => ({ ...prev, [id]: v }))}
                  scheduleDefaults={{
                    startDate: activity?.date,
                    endDate: activity?.endDate || activity?.date,
                  }}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialog(false)}>취소</Button>
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || !applyName.trim() || (!user && (!applyEmail.trim() || !applyStudentId.trim()))}>
                {applyMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}신청
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 역할 등록 Dialog */}
        <Dialog open={!!roleDialog} onOpenChange={(open) => { if (!open) setRoleDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="space-y-3 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCog size={18} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-base">역할 등록</DialogTitle>
                  <p className="text-xs text-muted-foreground">{roleDialog?.name}님의 활동 내 역할을 지정합니다.</p>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">자주 쓰는 역할</label>
                <div className="flex flex-wrap gap-1.5">
                  {["발표자", "진행자", "기록자", "총무", "자료조사", "디자인", "영상", "자원봉사"].map((r) => {
                    const active = roleInput === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleInput(r)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5",
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">직접 입력</label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="예: 발표자, 기록자, 총무"
                  className="h-10"
                  autoFocus
                />
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <X size={11} /> 비워두고 저장하면 역할이 제거됩니다.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRoleDialog(null)} className="flex-1 sm:flex-none">취소</Button>
              <Button
                onClick={() => roleDialog && updateRoleMutation.mutate({ pid: roleDialog.pid, role: roleInput })}
                disabled={updateRoleMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                {updateRoleMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 메모 Dialog */}
        <Dialog open={!!noteDialog} onOpenChange={(open) => { if (!open) setNoteDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>메모 — {noteDialog?.name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="참여자에 대한 메모를 입력하세요"
                className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">비워두고 저장하면 메모가 삭제됩니다.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialog(null)}>취소</Button>
              <Button
                onClick={() => noteDialog && updateNoteMutation.mutate({ pid: noteDialog.pid, note: noteInput })}
                disabled={updateNoteMutation.isPending}
              >
                저장
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
