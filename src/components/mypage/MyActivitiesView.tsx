"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars, useToggleAttendance } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, attendeesApi, activitiesApi, profilesApi } from "@/lib/bkend";
import AttendanceCertificate from "@/features/seminar/AttendanceCertificate";
import type { Certificate, Activity, User, Post, InterviewResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, X, FileText, Award, ChevronRight, FolderKanban, BookOpen, Globe, Eye, ClipboardList, Mic } from "lucide-react";
import { useMyInterviewResponses } from "@/features/board/interview-store";
import MyInterviewAnswersDialog from "@/features/board/MyInterviewAnswersDialog";
import MyConferenceSessions from "@/features/conference/MyConferenceSessions";
import EmptyState from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { formatSemester } from "@/lib/semester";
import { toast } from "sonner";

const TABS = [
  { key: "activities", label: "학술활동", icon: BookOpen },
  { key: "conferences", label: "학회 참여", icon: Globe },
  { key: "certificates", label: "수료증", icon: Award },
  { key: "posts", label: "내 글", icon: FileText },
  { key: "interviews", label: "인터뷰", icon: Mic },
] as const;


const ACTIVITY_META: Record<string, { label: string; icon: typeof FolderKanban; href: string }> = {
  seminar: { label: "세미나", icon: Calendar, href: "/seminars" },
  project: { label: "프로젝트", icon: FolderKanban, href: "/activities/projects" },
  study: { label: "스터디", icon: BookOpen, href: "/activities/studies" },
  external: { label: "대외활동", icon: Globe, href: "/activities/external" },
};

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  userId: string;
  readOnly?: boolean;
}

export default function MyActivitiesView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { toggleAttendance } = useToggleAttendance();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("activities");
  const [viewingAnswerOf, setViewingAnswerOf] = useState<{ post: Post; response: InterviewResponse } | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.key === t)) setActiveTab(t as TabKey);
  }, [searchParams]);

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
    // 대외학술대회는 운영진 승인 절차 없이 신청만으로 참여로 간주(pending 포함, rejected만 제외)
    const isApplicant = a.applicants?.some((ap) =>
      ap.userId === user.id &&
      (a.type === "external" ? ap.status !== "rejected" : ap.status === "approved"),
    );
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
    // 학번 매칭: 게스트로 발급된 수료증(recipientUserId 비어있음)이 본인 학번과 일치
    const myStudentId = (user.studentId || user.username || "").trim();
    const certStudentId = (c.recipientStudentId || "").toString().trim();
    if (myStudentId && certStudentId && myStudentId === certStudentId) return true;
    if (c.recipientEmail && user.email && (c.recipientEmail as string).toLowerCase() === user.email.toLowerCase()) return true;
    if (!c.recipientUserId && !c.recipientEmail && !certStudentId && c.recipientName === user.name) return true;
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
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">내 학회활동</h1>
          </div>
          <Link
            href="/mypage"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          학술활동·수료증·내 글·인터뷰를 한 곳에서 모아보세요.
        </p>

        <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  const qs = new URLSearchParams(searchParams.toString());
                  qs.set("tab", tab.key);
                  router.replace(`/mypage/activities?${qs.toString()}`, { scroll: false });
                }}
                aria-current={isActive ? "page" : undefined}
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

        <div className="mt-6">
          {activeTab === "activities" && (() => {
            const totalCount = mySeminars.length + myActivities.length;
            const grouped: { type: string; items: React.ReactNode[] }[] = [];

            if (mySeminars.length > 0) {
              grouped.push({
                type: "seminar",
                items: mySeminars.map((s) => (
                  <li key={`sem-${s.id}`} className="rounded-2xl border bg-card px-5 py-4 hover:border-primary/40">
                    <div className="flex items-center justify-between">
                      <Link href={`/seminars/${s.id}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Calendar size={14} className="text-primary" />
                          <Badge variant="secondary" className="text-[10px]">세미나</Badge>
                          {checkedInMap.has(s.id) && <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">출석</Badge>}
                        </div>
                        <p className="mt-1 truncate font-medium">{s.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(s.date)} {s.time} · {s.location}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2">
                        {checkedInMap.has(s.id) && (
                          <AttendanceCertificate
                            seminarTitle={s.title}
                            seminarDate={s.date}
                            seminarLocation={s.location}
                            attendeeName={user?.name ?? ""}
                            generation={user?.generation}
                            checkedInAt={checkedInMap.get(s.id)}
                          />
                        )}
                        {!readOnly && isSelf && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleCancelAttendance(s.id)}>
                            <X size={12} className="mr-1" />취소
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                )),
              });
            }

            const types = ["project", "study", "external"] as const;
            for (const t of types) {
              const items = myActivities.filter((a) => a.type === t);
              if (items.length > 0) {
                grouped.push({
                  type: t,
                  items: items.map((a) => {
                    const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.project;
                    const Icon = meta.icon;
                    const role = user && a.participantRoles ? (a.participantRoles as Record<string, string>)[user.id] : undefined;
                    return (
                      <li key={a.id} className="rounded-2xl border bg-card px-5 py-4 hover:border-primary/40">
                        <Link href={`${meta.href}/${a.id}`} className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Icon size={14} className="text-primary" />
                              <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                              {a.status && (
                                <Badge variant="outline" className="text-[10px]">
                                  {a.status === "upcoming" ? "예정" : a.status === "ongoing" ? "진행중" : "완료"}
                                </Badge>
                              )}
                              {(a.year || a.semester) && (
                                <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                                  {formatSemester(a.year, a.semester)}
                                </Badge>
                              )}
                              {role && <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>}
                              {a.leaderId === user?.id && <Badge className="bg-amber-50 text-amber-700 text-[10px]">{a.type === "study" ? "모임장" : "담당자"}</Badge>}
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
                  }),
                });
              }
            }

            return (
              <div className="space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-semibold">학술활동 ({totalCount})</h3>
                  {totalCount === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="참여 중인 학술활동이 없습니다"
                      description="세미나·프로젝트·스터디·대외활동에 참여해보세요."
                      actionLabel="학술활동 둘러보기"
                      actionHref="/activities"
                    />
                  ) : (
                    <div className="space-y-4">
                      {grouped.map((g) => {
                        const meta = ACTIVITY_META[g.type];
                        return (
                          <div key={g.type}>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <meta.icon size={13} />{meta.label} ({g.items.length})
                            </p>
                            <ul className="space-y-2">{g.items}</ul>
                          </div>
                        );
                      })}
                    </div>
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
                          <li key={a.id} className="rounded-2xl border bg-card px-5 py-4 hover:border-primary/40">
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
              </div>
            );
          })()}

          {activeTab === "certificates" && (
            <div className="space-y-3">
              {myCertificates.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="발급된 수료증이 없습니다"
                  description="세미나·프로젝트·스터디·대외학술대회 참여를 완료하면 수료증/감사장이 발급됩니다."
                  actionLabel="세미나 보러가기"
                  actionHref="/seminars"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myCertificates.map((c) => (
                    <div key={c.id} className="rounded-2xl border bg-card px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={c.type === "completion" ? "bg-primary/10 text-primary" : c.type === "appointment" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}>
                              {c.type === "completion" ? "수료증" : c.type === "appointment" ? "임명장" : "감사장"}
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

          {activeTab === "posts" && <MyPostList posts={myPosts} />}

          {activeTab === "conferences" && <MyConferenceSessions userId={userId} />}

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
                          <li key={r.id} className="rounded-2xl border bg-card px-5 py-4 hover:border-primary/40">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Mic size={14} className="text-blue-600" />
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">인터뷰</Badge>
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
                      <li key={p.id} className="rounded-2xl border bg-card px-5 py-4 hover:border-primary/40">
                        <Link href={`/board/${p.id}`} className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Mic size={14} className="text-blue-600" />
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">인터뷰</Badge>
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
