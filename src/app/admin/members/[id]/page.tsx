"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { profilesApi, seminarsApi, attendeesApi, activitiesApi, reviewsApi, certificatesApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import AuthGuard from "@/features/auth/AuthGuard";
import ProfileEditor from "@/features/auth/ProfileEditor";
import { useUpdateProfile, useApproveMember } from "@/features/member/useMembers";
import { notifyMemberApproved, notifyMemberRejected } from "@/features/notifications/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABELS } from "@/types";
import type { User, UserRole, Seminar, SeminarAttendee, Activity, Certificate } from "@/types";
import { toast } from "sonner";
import {
  ArrowLeft, User as UserIcon, KeyRound, CheckCircle, XCircle, Shield,
  BookOpen, Users, FolderKanban, Globe, Award, Star,
} from "lucide-react";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president"];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  president: "bg-blue-100 text-blue-700",
  staff: "bg-sky-100 text-sky-700",
  advisor: "bg-teal-100 text-teal-700",
  alumni: "bg-slate-100 text-slate-600",
  member: "bg-gray-100 text-gray-600",
};

function AdminMemberDetail({ id }: { id: string }) {
  const router = useRouter();
  const { updateProfile } = useUpdateProfile();
  const { approveMember } = useApproveMember();
  const [resettingPassword, setResettingPassword] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ["members", "detail", id],
    queryFn: async () => {
      const res = await profilesApi.get(id);
      return res as unknown as User;
    },
    retry: false,
  });

  async function handleRoleChange(newRole: UserRole) {
    if (!member) return;
    try {
      await updateProfile({ id: member.id, data: { role: newRole } });
      toast.success(`역할이 ${ROLE_LABELS[newRole]}(으)로 변경되었습니다.`);
    } catch {
      toast.error("역할 변경에 실패했습니다.");
    }
  }

  async function handleApprove() {
    if (!member) return;
    try {
      await approveMember(member.id);
      notifyMemberApproved(member.id, member.name);
      toast.success(`${member.name} 승인 완료`);
    } catch {
      toast.error("승인에 실패했습니다.");
    }
  }

  async function handleReject() {
    if (!member) return;
    try {
      await profilesApi.update(member.id, { approved: false, rejected: true });
      notifyMemberRejected(member.id, member.name);
      toast.success(`${member.name} 거절 완료`);
    } catch {
      toast.error("거절에 실패했습니다.");
    }
  }

  async function handleResetPassword() {
    if (!member?.email) { toast.error("이메일이 없는 회원입니다."); return; }
    setResettingPassword(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("인증 필요");
      const res = await fetch("/api/email/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: member.email, name: member.name }),
      });
      if (res.ok) {
        toast.success(`${member.email}로 비밀번호 재설정 이메일을 발송했습니다.`);
      } else {
        const data = await res.json();
        toast.error(data.error || "비밀번호 초기화에 실패했습니다.");
      }
    } catch { toast.error("비밀번호 초기화에 실패했습니다."); }
    finally { setResettingPassword(false); }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">회원을 찾을 수 없습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/members")}>
          <ArrowLeft size={16} className="mr-1" /> 회원 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <button
          onClick={() => router.push("/admin/members")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> 회원 목록으로
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <Badge className="text-xs">관리자 모드</Badge>
        </div>

        {/* 프로필 카드 */}
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{member.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{member.studentId || "학번 미지정"}</Badge>
                <Badge className={ROLE_COLORS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                {member.approved ? (
                  <Badge className="bg-green-100 text-green-700 text-[10px]">승인됨</Badge>
                ) : member.rejected ? (
                  <Badge className="bg-red-100 text-red-700 text-[10px]">거절됨</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">승인 대기</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                @{member.username} · {member.email}
              </p>
            </div>
          </div>
        </div>

        {/* 관리자 액션 */}
        <div className="mt-4 rounded-2xl border bg-white p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Shield size={16} /> 관리자 액션
          </h3>

          {/* 승인/거절 */}
          {!member.approved && (
            <div className="flex items-center justify-between rounded-lg border bg-amber-50 p-3">
              <p className="text-sm text-amber-800">이 회원은 아직 승인되지 않았습니다.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleApprove}>
                  <CheckCircle size={14} className="mr-1" /> 승인
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={handleReject}>
                  <XCircle size={14} className="mr-1" /> 거절
                </Button>
              </div>
            </div>
          )}

          {/* 역할 변경 */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">역할 변경</p>
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <Separator />

          {/* 비밀번호 초기화 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">비밀번호 초기화</p>
              <p className="text-xs text-muted-foreground">{member.email}로 재설정 이메일 발송</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={resettingPassword}>
              <KeyRound size={14} className="mr-1" />
              {resettingPassword ? "발송 중..." : "초기화"}
            </Button>
          </div>
        </div>

        {/* 학술활동 이력 */}
        <MemberActivityHistory memberId={id} />

        {/* 프로필 편집 (마이페이지와 동일) */}
        <div className="mt-4 rounded-2xl border bg-white p-6">
          <h3 className="text-lg font-bold">프로필 정보 수정</h3>
          <ProfileEditor user={member} />
        </div>
      </div>
    </div>
  );
}

function MemberActivityHistory({ memberId }: { memberId: string }) {
  // 세미나 참석 이력
  const { data: seminars = [] } = useQuery({
    queryKey: ["member-seminars", memberId],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      const all = res.data as unknown as Seminar[];
      return all.filter((s) => s.attendeeIds.includes(memberId));
    },
  });

  // 활동 참여 이력
  const { data: activities = [] } = useQuery({
    queryKey: ["member-activities", memberId],
    queryFn: async () => {
      const res = await activitiesApi.list();
      const all = res.data as Activity[];
      return all.filter((a) => ((a.participants as string[]) ?? []).includes(memberId));
    },
  });

  // 수료증
  const { data: certificates = [] } = useQuery({
    queryKey: ["member-certificates", memberId],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return (res.data as Certificate[]).filter((c) => {
        // 수료증은 recipientName 기반이므로 완벽한 매칭은 어렵지만 최선의 노력
        return true; // 일단 전체 로드 후 UI에서 필터
      });
    },
    enabled: false, // 필요 시 활성화
  });

  const projects = activities.filter((a) => a.type === "project");
  const studies = activities.filter((a) => a.type === "study");
  const externals = activities.filter((a) => a.type === "external");

  const totalActivities = seminars.length + activities.length;

  return (
    <div className="mt-4 rounded-2xl border bg-white p-6 space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <BookOpen size={18} /> 학술활동 이력
      </h3>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xl font-bold text-primary">{seminars.length}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><BookOpen size={10} />세미나 참석</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xl font-bold text-green-600">{studies.length}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Users size={10} />스터디</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{projects.length}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><FolderKanban size={10} />프로젝트</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{externals.length}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Globe size={10} />대외활동</p>
        </div>
      </div>

      {totalActivities === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">학술활동 이력이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {/* 세미나 이력 */}
          {seminars.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">세미나 참석 이력</h4>
              <div className="space-y-1">
                {seminars.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <BookOpen size={14} className="shrink-0 text-primary" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.date}</span>
                    <Badge variant="secondary" className="text-[10px]">{s.speaker}</Badge>
                  </div>
                ))}
                {seminars.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">외 {seminars.length - 10}건</p>
                )}
              </div>
            </div>
          )}

          {/* 활동 이력 */}
          {activities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">학술활동 참여 이력</h4>
              <div className="space-y-1">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    {a.type === "study" ? <Users size={14} className="shrink-0 text-green-600" /> :
                     a.type === "project" ? <FolderKanban size={14} className="shrink-0 text-purple-600" /> :
                     <Globe size={14} className="shrink-0 text-amber-600" />}
                    <span className="flex-1 truncate">{a.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.date}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {a.type === "study" ? "스터디" : a.type === "project" ? "프로젝트" : "대외활동"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <AdminMemberDetail id={id} />
    </AuthGuard>
  );
}
