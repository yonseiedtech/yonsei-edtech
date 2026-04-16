"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars, useToggleAttendance } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, attendeesApi, activitiesApi, profilesApi } from "@/lib/bkend";
import AttendanceCertificate from "@/features/seminar/AttendanceCertificate";
import type { Certificate, Activity, User, Post } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User as UserIcon, LogOut, Calendar, X, FileText, KeyRound, UserCog, Award, Home, ChevronRight, FolderKanban, BookOpen, Globe, QrCode, Eye, Mic } from "lucide-react";
import { useMyInterviewResponses } from "@/features/board/interview-store";
import MyInterviewAnswersDialog from "@/features/board/MyInterviewAnswersDialog";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import type { InterviewResponse } from "@/types";
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
  { key: "interviews", label: "인터뷰", icon: Mic },
] as const;

const ACTIVITY_META: Record<string, { label: string; icon: typeof FolderKanban; href: string }> = {
  project: { label: "프로젝트", icon: FolderKanban, href: "/activities/projects" },
  study: { label: "스터디", icon: BookOpen, href: "/activities/studies" },
  external: { label: "대외활동", icon: Globe, href: "/activities/external" },
};

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  userId: string;
  readOnly?: boolean;
}

export default function MyPageView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { toggleAttendance } = useToggleAttendance();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [activitiesSubTab, setActivitiesSubTab] = useState<"academic" | "research">("academic");

  useEffect(() => {
    const t = searchParams.get("tab");
    const sub = searchParams.get("sub");
    if (t && (TABS.some((x) => x.key === t))) setActiveTab(t as TabKey);
    if (sub === "research" || sub === "academic") setActivitiesSubTab(sub);
  }, [searchParams]);
  const [viewingAnswerOf, setViewingAnswerOf] = useState<{ post: Post; response: InterviewResponse } | null>(null);

  // 대상 사용자 조회: 로그인 사용자와 동일하면 authUser 재사용
  const isSelf = authUser?.id === userId;
  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  const myPosts = posts.filter((p) => p.authorId === userId);
  const myCreatedInterviews = posts.filter((p) => p.authorId === userId && p.type === "interview");
  const { responses: myInterviewResponses } = useMyInterviewResponses(userId);
  const respondedPostIds = new Set(myInterviewResponses.map((r) => r.postId));
  const respondedInterviews = posts.filter((p) => p.type === "interview" && respondedPostIds.has(p.id));
  const postById = new Map<string, Post>(posts.map((p) => [p.id, p]));
  const mySeminars = seminars.filter((s) => s.attendeeIds.includes(userId));

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
  const myPendingApplications = allActivities.filter((a) =>
    a.applicants?.some((ap) => ap.userId === userId && ap.status !== "approved"),
  );

  const { data: allCertificates = [] } = useQuery({
    queryKey: ["certificates", "my", userId],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return res.data as unknown as Certificate[];
    },
    enabled: !!user,
  });
  const myCertificates = allCertificates.filter((c) => {
    if (!user) return false;
    if (c.recipientUserId && c.recipientUserId === user.id) return true;
    if (c.recipientEmail && user.email && (c.recipientEmail as string).toLowerCase() === user.email.toLowerCase()) return true;
    if (!c.recipientUserId && !c.recipientEmail && c.recipientName === user.name) return true;
    return false;
  });

  const { data: myAttendeeRecords = [] } = useQuery({
    queryKey: ["my-attendees", userId],
    queryFn: async () => {
      const results = [];
      for (const s of mySeminars) {
        const res = await attendeesApi.check(s.id, userId);
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
    if (!user || readOnly) return;
    toggleAttendance(seminarId, user.id);
    toast.success("참석이 취소되었습니다.");
  }

  if (!user) return null;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">마이페이지{readOnly && <span className="ml-2 text-sm font-normal text-muted-foreground">(미리보기)</span>}</h1>
          {!readOnly && isSelf && (
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut size={16} className="mr-1" />
              로그아웃
            </Button>
          )}
          {readOnly && (
            <Badge variant="secondary"><Eye size={12} className="mr-1" />읽기 전용</Badge>
          )}
        </div>

        {/* 프로필 카드 */}
        <div className="mt-8 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={28} />
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
                  {myPendingApplications.length > 0 && (
                    <p className="mt-0.5 text-[10px] font-medium text-amber-600">신청 대기 {myPendingApplications.length}건</p>
                  )}
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

              {isSelf && !readOnly && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href="/mypage/card" className="rounded-2xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-primary" />
                      <p className="text-sm font-semibold">내 모바일 명함</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">QR·vCard·공유·교환 기록 관리</p>
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
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="rounded-2xl border bg-white p-6">
              {readOnly ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">이름:</span> {user.name}</p>
                  <p><span className="font-medium">이메일:</span> {user.email}</p>
                  <p><span className="font-medium">학번:</span> {user.studentId || "-"}</p>
                  <p className="text-xs text-muted-foreground pt-2">읽기 전용 모드에서는 프로필을 수정할 수 없습니다.</p>
                </div>
              ) : (
                <ProfileEditor user={user} />
              )}
            </div>
          )}

          {activeTab === "password" && (
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-lg font-bold">비밀번호 변경</h3>
              <div className="mt-4">
                {readOnly ? (
                  <p className="text-sm text-muted-foreground">읽기 전용 모드에서는 비밀번호를 변경할 수 없습니다.</p>
                ) : (
                  <PasswordChangeForm />
                )}
              </div>
            </div>
          )}

          {activeTab === "activities" && (
            <div className="space-y-5">
              {/* sub-tab switcher */}
              <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 text-sm">
                {([
                  { key: "academic", label: "학술활동 이력" },
                  { key: "research", label: "연구활동 이력" },
                ] as const).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActivitiesSubTab(s.key)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-1.5 font-medium transition",
                      activitiesSubTab === s.key
                        ? "bg-white text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {activitiesSubTab === "research" && user && (
                <ResearchPaperList user={user} readOnly={!isSelf || readOnly} />
              )}

              {activitiesSubTab === "academic" && (
                <div className="space-y-6">
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

              {myPendingApplications.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">신청 현황 ({myPendingApplications.length})</h3>
                  <ul className="space-y-2">
                    {myPendingApplications.map((a) => {
                      const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.project;
                      const mine = a.applicants?.find((ap) => ap.userId === userId);
                      const statusLabel = mine?.status === "rejected" ? "반려" : "승인 대기";
                      const statusColor = mine?.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
                      return (
                        <li key={a.id} className="rounded-xl border bg-white px-5 py-4 hover:border-primary/40">
                          <Link href={`${meta.href}/${a.id}`} className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                                <Badge className={cn("text-[10px]", statusColor)}>{statusLabel}</Badge>
                              </div>
                              <p className="mt-1 truncate font-medium">{a.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                신청일 {mine?.appliedAt ? new Date(mine.appliedAt).toLocaleDateString("ko-KR") : "-"}
                              </p>
                            </div>
                            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

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
                              {!readOnly && isSelf && (
                                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleCancelAttendance(s.id)}>
                                  <X size={14} className="mr-1" />취소
                                </Button>
                              )}
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {myCertificates.map((c) => (
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "posts" && (
            <MyPostList posts={myPosts} />
          )}

          {viewingAnswerOf && viewingAnswerOf.post.interview && (
            <MyInterviewAnswersDialog
              open={!!viewingAnswerOf}
              onOpenChange={(open) => { if (!open) setViewingAnswerOf(null); }}
              postTitle={viewingAnswerOf.post.title}
              meta={viewingAnswerOf.post.interview}
              response={viewingAnswerOf.response}
            />
          )}

          {activeTab === "interviews" && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-semibold">참여한 인터뷰 ({respondedInterviews.length})</h3>
                {respondedInterviews.length === 0 ? (
                  <EmptyState
                    icon={Mic}
                    title="아직 참여한 인터뷰가 없습니다"
                    description="인터뷰 게시판의 온라인 인터뷰에 참여해보세요."
                    actionLabel="자유게시판 가기"
                    actionHref="/board/free"
                  />
                ) : (
                  <ul className="space-y-2">
                    {myInterviewResponses
                      .filter((r) => postById.has(r.postId))
                      .map((r) => {
                        const p = postById.get(r.postId)!;
                        return (
                          <li key={r.id} className="rounded-xl border bg-white px-5 py-4 hover:border-primary/40">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Mic size={14} className="text-violet-600" />
                                <Badge variant="secondary" className="bg-violet-50 text-violet-700 text-[10px]">인터뷰</Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    r.status === "submitted" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
                                  )}
                                >
                                  {r.status === "submitted" ? "제출 완료" : "임시 저장"}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate font-medium">{p.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {r.submittedAt ? `제출 ${formatDate(r.submittedAt)}` : r.updatedAt ? `저장 ${formatDate(r.updatedAt)}` : ""}
                                {" · "}답변 {r.answers.length}개
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {p.interview && r.answers.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={() => setViewingAnswerOf({ post: p, response: r })}
                                    className="h-8"
                                  >
                                    <Eye size={13} className="mr-1" />
                                    내 답변 보기
                                  </Button>
                                )}
                                <Link href={`/board/${p.id}`}>
                                  <Button type="button" variant="outline" size="sm" className="h-8">
                                    게시글로 이동
                                    <ChevronRight size={13} className="ml-0.5" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>

              {myCreatedInterviews.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">내가 개설한 인터뷰 ({myCreatedInterviews.length})</h3>
                  <ul className="space-y-2">
                    {myCreatedInterviews.map((p) => (
                      <li key={p.id} className="rounded-xl border bg-white px-5 py-4 hover:border-primary/40">
                        <Link href={`/board/${p.id}`} className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Mic size={14} className="text-violet-600" />
                              <Badge variant="secondary" className="bg-violet-50 text-violet-700 text-[10px]">인터뷰</Badge>
                              {p.interview?.deadline && (
                                <Badge variant="outline" className="text-[10px]">
                                  마감 {new Date(p.interview.deadline).toLocaleDateString("ko-KR")}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 truncate font-medium">{p.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(p.createdAt)} · 질문 {p.interview?.questions.length ?? 0}개
                            </p>
                          </div>
                          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
