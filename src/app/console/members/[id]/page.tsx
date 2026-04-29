"use client";

import { use, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { profilesApi, seminarsApi, activitiesApi, certificatesApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import ProfileEditor from "@/features/auth/ProfileEditor";
import { useUpdateProfile, useApproveMember } from "@/features/member/useMembers";
import { notifyMemberApproved, notifyMemberRejected } from "@/features/notifications/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";
import type { User, UserRole, Seminar, Activity, Certificate } from "@/types";
import { toast } from "sonner";
import {
  ArrowLeft, User as UserIcon, KeyRound, CheckCircle, XCircle, Shield,
  BookOpen, Users, FolderKanban, Globe, UserCog, Loader2, FileCheck,
} from "lucide-react";
import { signInWithCustomToken } from "firebase/auth";
import MyPageView from "@/components/mypage/MyPageView";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CONSENT_LABELS, CURRENT_TERMS, type ConsentKey } from "@/lib/legal";
import { logAudit } from "@/lib/audit";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president", "admin", "sysadmin"];

const ROLE_COLORS: Record<string, string> = {
  sysadmin: "bg-rose-100 text-rose-700",
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
  const [impersonating, setImpersonating] = useState(false);
  const { user: currentUser } = useAuthStore();
  const canImpersonate = isPresidentOrAbove(currentUser);

  async function handleImpersonate() {
    if (!canImpersonate) return;
    if (!confirm("이 계정으로 전환하시겠습니까? 관리자 배너에서 언제든 복귀할 수 있습니다.")) return;
    setImpersonating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("no token");
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUserId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "전환 실패");
      }
      const data = await res.json();
      try { sessionStorage.setItem("impersonatorUid", data.impersonatorUid); } catch { /* ignore */ }
      await signInWithCustomToken(auth, data.customToken);
      logAudit({
        action: "계정 임퍼소네이트",
        category: "member",
        detail: `대상: ${id}`,
        targetId: id,
        userId: currentUser?.id ?? "",
        userName: currentUser?.name ?? "",
      });
      toast.success("계정 전환이 완료되었습니다.");
      router.push("/mypage");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "전환에 실패했습니다.");
    } finally {
      setImpersonating(false);
    }
  }

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
    // president 이상 권한자만 admin/sysadmin 권한 부여 가능
    const isElevatedRole = newRole === "admin" || newRole === "sysadmin";
    if (isElevatedRole && !isPresidentOrAbove(currentUser)) {
      toast.error("admin/sysadmin 역할 부여는 학회장 이상만 가능합니다.");
      return;
    }
    try {
      const prevRole = member.role;
      await updateProfile({ id: member.id, data: { role: newRole } });
      logAudit({
        action: "역할 변경",
        category: "role",
        detail: `${member.name}: ${prevRole} → ${newRole}`,
        targetId: member.id,
        targetName: member.name,
        userId: currentUser?.id ?? "",
        userName: currentUser?.name ?? "",
      });
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
      logAudit({
        action: "회원 승인",
        category: "role",
        detail: `${member.name}(@${member.username})`,
        targetId: member.id,
        targetName: member.name,
        userId: currentUser?.id ?? "",
        userName: currentUser?.name ?? "",
      });
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
      logAudit({
        action: "회원 거절",
        category: "role",
        detail: `${member.name}(@${member.username})`,
        targetId: member.id,
        targetName: member.name,
        userId: currentUser?.id ?? "",
        userName: currentUser?.name ?? "",
      });
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
        logAudit({
          action: "비밀번호 초기화",
          category: "member",
          detail: `${member.name}(${member.email}) 재설정 이메일 발송`,
          targetId: member.id,
          targetName: member.name,
          userId: currentUser?.id ?? "",
          userName: currentUser?.name ?? "",
        });
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
      <div className="mx-auto max-w-4xl px-4 py-10" aria-busy="true" aria-label="회원 정보 불러오는 중">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">회원을 찾을 수 없습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/console/members")}>
          <ArrowLeft size={16} className="mr-1" /> 회원 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/console/members")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> 회원 목록으로
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <div className="flex items-center gap-2">
          {canImpersonate && (
            <Button size="sm" variant="outline" onClick={handleImpersonate} disabled={impersonating}>
              {impersonating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <UserCog size={14} className="mr-1" />}
              이 계정으로 전환
            </Button>
          )}
          <Badge className="text-xs">관리자 모드</Badge>
        </div>
      </div>

      <Tabs defaultValue="admin" className="mt-6">
        <TabsList>
          <TabsTrigger value="admin">관리</TabsTrigger>
          <TabsTrigger value="mypage-preview">마이페이지 미리보기</TabsTrigger>
        </TabsList>

        <TabsContent value="mypage-preview" className="mt-4">
          <MyPageView userId={id} readOnly />
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
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
                  {member.enrollmentStatus && (
                    <Badge variant="outline">{ENROLLMENT_STATUS_LABELS[member.enrollmentStatus]}</Badge>
                  )}
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

          <div className="mt-4 rounded-2xl border bg-white p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Shield size={16} /> 관리자 액션
            </h3>

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

          <ConsentStatusSection member={member} />
          <MemberActivityHistory memberId={id} />

          <div className="mt-4 rounded-2xl border bg-white p-6">
            <h3 className="text-lg font-bold">프로필 정보 수정</h3>
            <ProfileEditor user={member} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConsentStatusSection({ member }: { member: User }) {
  const consents = member.consents;
  const keys: ConsentKey[] = ["terms", "privacy", "collection", "marketing"];
  function fmt(iso?: string) {
    if (!iso) return "-";
    try { return new Date(iso).toLocaleString("ko-KR"); } catch { return iso; }
  }
  return (
    <div className="mt-4 rounded-2xl border bg-white p-6 space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <FileCheck size={18} /> 동의 현황
      </h3>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="border-b px-3 py-2 text-left">항목</th>
              <th className="border-b px-3 py-2 text-left">동의 여부</th>
              <th className="border-b px-3 py-2 text-left">버전</th>
              <th className="border-b px-3 py-2 text-left">동의 일시</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const rec = consents?.[k];
              const isRequired = k !== "marketing";
              const current = k === "marketing" ? CURRENT_TERMS.collection : CURRENT_TERMS[k];
              const outdated = rec?.agreed && rec.version !== current;
              return (
                <tr key={k}>
                  <td className="border-b px-3 py-2 align-top">
                    [{isRequired ? "필수" : "선택"}] {CONSENT_LABELS[k]}
                  </td>
                  <td className="border-b px-3 py-2 align-top">
                    {rec?.agreed ? (
                      <Badge className="bg-green-100 text-green-700">동의</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">미동의</Badge>
                    )}
                  </td>
                  <td className="border-b px-3 py-2 align-top">
                    {rec?.version ?? "-"}
                    {outdated && (
                      <span className="ml-1 text-[10px] text-amber-600">(구버전)</span>
                    )}
                  </td>
                  <td className="border-b px-3 py-2 align-top text-muted-foreground">{fmt(rec?.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {member.privacyAgreedAt && (
        <p className="text-[10px] text-muted-foreground">
          레거시 privacyAgreedAt: {fmt(member.privacyAgreedAt)}
        </p>
      )}
    </div>
  );
}

function MemberActivityHistory({ memberId }: { memberId: string }) {
  const { data: seminars = [] } = useQuery({
    queryKey: ["member-seminars", memberId],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      const all = res.data as unknown as Seminar[];
      return all.filter((s) => s.attendeeIds.includes(memberId));
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["member-activities", memberId],
    queryFn: async () => {
      const res = await activitiesApi.list();
      const all = res.data as Activity[];
      return all.filter((a) => ((a.participants as string[]) ?? []).includes(memberId));
    },
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

export default function ConsoleMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminMemberDetail id={id} />;
}
