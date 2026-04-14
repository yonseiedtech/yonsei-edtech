"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars, useToggleAttendance } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, attendeesApi, activitiesApi } from "@/lib/bkend";
import AttendanceCertificate from "@/features/seminar/AttendanceCertificate";
import type { Certificate, Activity } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, LogOut, Calendar, X, FileText, KeyRound, UserCog, Award, Home, ChevronRight, FolderKanban, BookOpen, Globe, QrCode } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate, formatGeneration } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { key: "home", label: "홈", icon: Home },
  { key: "profile", label: "프로필", icon: UserCog },
  { key: "password", label: "비밀번호", icon: KeyRound },
  { key: "activities", label: "학술활동", icon: BookOpen },
  { key: "certificates", label: "수료증", icon: Award },
  { key: "posts", label: "내 글", icon: FileText },
] as const;

const ACTIVITY_META: Record<string, { label: string; icon: typeof FolderKanban; href: string }> = {
  project: { label: "프로젝트", icon: FolderKanban, href: "/activities/projects" },
  study: { label: "스터디", icon: BookOpen, href: "/activities/studies" },
  external: { label: "대외활동", icon: Globe, href: "/activities/external" },
};

type TabKey = (typeof TABS)[number]["key"];

function MypageContent() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { toggleAttendance } = useToggleAttendance();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const myPosts = posts.filter((p) => p.authorId === user?.id);
  const mySeminars = seminars.filter((s) => user && s.attendeeIds.includes(user.id));

  const { data: allActivities = [] } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as unknown as Activity[];
    },
    enabled: !!user,
  });
  const myActivities = allActivities.filter((a) => {
    if (!user) return false;
    const inMembers = a.members?.includes(user.id) || a.members?.includes(user.name);
    const inParticipants = a.participants?.includes(user.id) || a.participants?.includes(user.name);
    const isLeader = a.leader === user.id || a.leader === user.name;
    const isApplicant = a.applicants?.some((ap) => ap.userId === user.id && ap.status === "approved");
    return inMembers || inParticipants || isLeader || isApplicant;
  });

  const { data: allCertificates = [] } = useQuery({
    queryKey: ["certificates", "my"],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return res.data as unknown as Certificate[];
    },
    enabled: !!user,
  });
  const myCertificates = allCertificates.filter((c) => c.recipientName === user?.name);

  // 내 출석 기록 (참석 확인서용)
  const { data: myAttendeeRecords = [] } = useQuery({
    queryKey: ["my-attendees", user?.id],
    queryFn: async () => {
      const results = [];
      for (const s of mySeminars) {
        const res = await attendeesApi.check(s.id, user!.id);
        const attendee = (res.data as unknown as { checkedIn: boolean; checkedInAt: string | null }[])?.[0];
        if (attendee?.checkedIn) {
          results.push({ seminarId: s.id, checkedInAt: attendee.checkedInAt });
        }
      }
      return results;
    },
    enabled: !!user && mySeminars.length > 0,
  });
  const checkedInMap = new Map(myAttendeeRecords.map((r) => [r.seminarId, r.checkedInAt]));

  function handleCancelAttendance(seminarId: string) {
    if (!user) return;
    toggleAttendance(seminarId, user.id);
    toast.success("참석이 취소되었습니다.");
  }

  if (!user) return null;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">마이페이지</h1>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={16} className="mr-1" />
            로그아웃
          </Button>
        </div>

        {/* 프로필 카드 */}
        <div className="mt-8 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{formatGeneration(user.generation, user.enrollmentYear, user.enrollmentHalf)}</Badge>
                <Badge>{ROLE_LABELS[user.role]}</Badge>
                {user.enrollmentStatus && (
                  <Badge variant="outline">{ENROLLMENT_STATUS_LABELS[user.enrollmentStatus]}</Badge>
                )}
                {user.studentId && (
                  <span className="text-xs text-muted-foreground">{user.studentId}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "home" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setActiveTab("activities")} className="rounded-2xl border bg-white p-4 text-left hover:border-primary/40 hover:shadow-sm">
                  <BookOpen size={18} className="text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">참여 학술활동</p>
                  <p className="mt-0.5 text-xl font-bold">{myActivities.length + mySeminars.length}</p>
                </button>
                <button onClick={() => setActiveTab("certificates")} className="rounded-2xl border bg-white p-4 text-left hover:border-primary/40 hover:shadow-sm">
                  <Award size={18} className="text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">보유 수료증</p>
                  <p className="mt-0.5 text-xl font-bold">{myCertificates.length}</p>
                </button>
                <button onClick={() => setActiveTab("posts")} className="rounded-2xl border bg-white p-4 text-left hover:border-primary/40 hover:shadow-sm">
                  <FileText size={18} className="text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">작성한 글</p>
                  <p className="mt-0.5 text-xl font-bold">{myPosts.length}</p>
                </button>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="text-sm font-semibold">다음 학술활동</h3>
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const upcomingActivities = myActivities
                    .filter((a) => (a.date || "") >= today)
                    .map((a) => ({
                      kind: "activity" as const,
                      id: a.id,
                      title: a.title,
                      date: a.date,
                      meta: ACTIVITY_META[a.type]?.label ?? "학술활동",
                      href: `${ACTIVITY_META[a.type]?.href ?? "/activities"}/${a.id}`,
                    }));
                  const upcomingSeminars = mySeminars
                    .filter((s) => (s.date || "") >= today)
                    .map((s) => ({
                      kind: "seminar" as const,
                      id: s.id,
                      title: s.title,
                      date: s.date,
                      meta: `세미나 · ${s.location}`,
                      href: `/seminars/${s.id}`,
                    }));
                  const upcoming = [...upcomingActivities, ...upcomingSeminars]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 3);

                  if (upcoming.length === 0) {
                    return (
                      <EmptyState
                        icon={BookOpen}
                        title="예정된 학술활동이 없습니다"
                        description="프로젝트·스터디·세미나에 참여해보세요."
                        actionLabel="학술활동 둘러보기"
                        actionHref="/activities"
                        className="mt-3 border-0 bg-transparent py-6"
                      />
                    );
                  }
                  return (
                    <ul className="mt-3 divide-y">
                      {upcoming.map((item) => (
                        <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0">
                            <Link href={item.href} className="truncate text-sm font-medium hover:text-primary">{item.title}</Link>
                            <p className="text-xs text-muted-foreground">{formatDate(item.date)} · {item.meta}</p>
                          </div>
                          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/mypage/card" className="rounded-2xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-primary" />
                    <p className="text-sm font-semibold">내 모바일 명함</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">QR·vCard·공유로 명함 주고받기</p>
                </Link>
                <Link href="/mypage/card/exchanges" className="rounded-2xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm">
                  <p className="text-sm font-semibold">명함 교환 기록</p>
                  <p className="mt-1 text-xs text-muted-foreground">받은·나눈 명함 내역</p>
                </Link>
                <Link href="/activities" className="rounded-2xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm">
                  <p className="text-sm font-semibold">학술활동 둘러보기</p>
                  <p className="mt-1 text-xs text-muted-foreground">프로젝트·스터디·대외활동</p>
                </Link>
                <Link href="/board" className="rounded-2xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm">
                  <p className="text-sm font-semibold">게시판</p>
                  <p className="mt-1 text-xs text-muted-foreground">공지·자유·홍보·자료실</p>
                </Link>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="rounded-2xl border bg-white p-6">
              <ProfileEditor user={user} />
            </div>
          )}

          {activeTab === "password" && (
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-lg font-bold">비밀번호 변경</h3>
              <div className="mt-4">
                <PasswordChangeForm />
              </div>
            </div>
          )}

          {activeTab === "activities" && (
            <div className="space-y-6">
              {/* 학술활동 (프로젝트·스터디·대외활동) */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">학술활동 ({myActivities.length})</h3>
                {myActivities.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="참여 중인 학술활동이 없습니다"
                    description="프로젝트·스터디·대외활동에 참여해보세요."
                    actionLabel="학술활동 둘러보기"
                    actionHref="/activities"
                  />
                ) : (
                  <ul className="space-y-2">
                    {myActivities.map((a) => {
                      const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.project;
                      const Icon = meta.icon;
                      return (
                        <li key={a.id} className="rounded-xl border bg-white px-5 py-4 hover:border-primary/40">
                          <Link href={`${meta.href}/${a.id}`} className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="text-primary" />
                                <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                                {a.status && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {a.status === "upcoming" ? "예정" : a.status === "ongoing" ? "진행중" : "완료"}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 truncate font-medium">{a.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {a.date ? formatDate(a.date) : ""}{a.location ? ` · ${a.location}` : ""}
                              </p>
                            </div>
                            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* 세미나 */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">참여 세미나 ({mySeminars.length})</h3>
                {mySeminars.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="신청한 세미나가 없습니다"
                    description="관심 있는 세미나에 참여 신청해보세요."
                    actionLabel="세미나 보러가기"
                    actionHref="/seminars"
                  />
                ) : (
                  <div className="space-y-3">
                    {mySeminars.map((s) => (
                  <div key={s.id} className="rounded-xl border bg-white px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/seminars/${s.id}`} className="font-medium hover:text-primary hover:underline">
                          {s.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatDate(s.date)} {s.time} · {s.location}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleCancelAttendance(s.id)}>
                        <X size={14} className="mr-1" />취소
                      </Button>
                    </div>
                    {checkedInMap.has(s.id) && (
                      <div className="mt-2 flex items-center gap-2 border-t pt-2">
                        <Badge variant="secondary" className="bg-green-50 text-green-700">출석 완료</Badge>
                        <AttendanceCertificate
                          seminarTitle={s.title}
                          seminarDate={s.date}
                          seminarLocation={s.location}
                          attendeeName={user?.name ?? ""}
                          generation={user?.generation}
                          checkedInAt={checkedInMap.get(s.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "certificates" && (
            <div className="space-y-3">
              {myCertificates.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="발급된 수료증이 없습니다"
                  description="세미나 출석을 완료하면 수료증이 발급됩니다."
                  actionLabel="세미나 보러가기"
                  actionHref="/seminars"
                />
              ) : (
                myCertificates.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-white px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={c.type === "completion" ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700"}>
                            {c.type === "completion" ? "수료증" : "감사장"}
                          </Badge>
                          {c.certificateNo && (
                            <span className="text-xs text-muted-foreground">No. {c.certificateNo}</span>
                          )}
                        </div>
                        <p className="mt-1 font-medium">{c.seminarTitle}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          발급일: {new Date(c.issuedAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Award size={24} className="shrink-0 text-primary/30" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "posts" && (
            <MyPostList posts={myPosts} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MypagePage() {
  return (
    <AuthGuard>
      <MypageContent />
    </AuthGuard>
  );
}
