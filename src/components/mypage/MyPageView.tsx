"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, activitiesApi, profilesApi, reviewsApi } from "@/lib/bkend";
import { enrichCertificates } from "@/lib/denorm-sync";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useMyInterviewResponses } from "@/features/board/interview-store";
import type { Certificate, Activity, User, SeminarReview } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  User as UserIcon,
  LogOut,
  KeyRound,
  UserCog,
  Award,
  Home,
  ChevronRight,
  BookOpen,
  QrCode,
  Eye,
  ClipboardList,
  FileText,
  Mic,
  ArrowRight,
  Calendar,
  Clock,
  FolderKanban,
  AlertCircle,
  PenSquare,
  Sparkles,
} from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";

const TABS = [
  { key: "home", label: "홈", icon: Home },
  { key: "profile", label: "프로필", icon: UserCog },
  { key: "password", label: "비밀번호", icon: KeyRound },
] as const;

const LEGACY_TABS = ["activities", "certificates", "posts", "interviews"] as const;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  // Legacy URL 자동 리다이렉트
  useEffect(() => {
    if (readOnly) return;
    const t = searchParams.get("tab");
    const sub = searchParams.get("sub");
    // 구 /mypage?tab=activities&sub=research → /mypage/research
    if (t === "activities" && sub === "research") {
      router.replace("/mypage/research");
      return;
    }
    if (t && (LEGACY_TABS as readonly string[]).includes(t)) {
      const qs = new URLSearchParams();
      qs.set("tab", t);
      if (sub) qs.set("sub", sub);
      router.replace(`/mypage/activities?${qs.toString()}`);
      return;
    }
    if (t && TABS.some((x) => x.key === t)) setActiveTab(t as TabKey);
  }, [searchParams, router, readOnly]);

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
  const mySeminars = seminars.filter((s) => s.attendeeIds.includes(userId));
  const { responses: myInterviewResponses } = useMyInterviewResponses(userId);

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
    queryKey: ["certificates", "my", userId],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return enrichCertificates(res.data as unknown as Certificate[]);
    },
    enabled: !!user,
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const res = await reviewsApi.listByAuthor(userId);
      return res.data as unknown as SeminarReview[];
    },
    enabled: !!user && isSelf,
  });
  const myCertificates = allCertificates.filter((c) => {
    if (!user) return false;
    if (c.recipientUserId && c.recipientUserId === user.id) return true;
    if (c.recipientEmail && user.email && (c.recipientEmail as string).toLowerCase() === user.email.toLowerCase()) return true;
    if (!c.recipientUserId && !c.recipientEmail && c.recipientName === user.name) return true;
    return false;
  });

  // 연구활동 카드용 카운트 (임시저장 제외)
  const { papers: myPapers } = useResearchPapers(user?.id);
  const publishedPaperCount = myPapers.filter((p) => !p.isDraft).length;

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
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
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
                onClick={() => {
                  setActiveTab(tab.key);
                  if (!readOnly) {
                    const qs = new URLSearchParams(searchParams.toString());
                    if (tab.key === "home") qs.delete("tab");
                    else qs.set("tab", tab.key);
                    const next = qs.toString();
                    router.replace(next ? `/mypage?${next}` : "/mypage", { scroll: false });
                  }
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

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "home" && (
            <div className="space-y-4">
              {/* 내 학회활동 통합 안내 카드 */}
              <Link
                href="/mypage/activities"
                className="block rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <ClipboardList size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">내 학회활동</h3>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      학술활동·수료증·내 글·인터뷰를 한 화면에서 관리해보세요.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-muted-foreground">
                        <BookOpen size={11} /> 학술 {myActivities.length + mySeminars.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-muted-foreground">
                        <Award size={11} /> 수료증 {myCertificates.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-muted-foreground">
                        <FileText size={11} /> 내 글 {myPosts.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-muted-foreground">
                        <Mic size={11} /> 인터뷰
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 self-center text-primary" />
                </div>
              </Link>

              {/* 내 연구활동 카드 (학회활동과 동일 격) */}
              <Link
                href="/mypage/research"
                className="block rounded-2xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/60 p-5 transition hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200/40 text-amber-700">
                    <BookOpen size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">내 연구활동</h3>
                      <Badge variant="secondary" className="bg-amber-200/60 text-amber-800 text-[10px]">신규</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      관심 연구분야 · 논문 분석 노트를 단계별로 정리해보세요.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-muted-foreground">
                        <BookOpen size={11} /> 논문 {publishedPaperCount}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 self-center text-amber-700" />
                </div>
              </Link>

              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const upcomingActivities = myActivities
                  .filter((a) => (a.date || "") >= today)
                  .map((a) => ({ id: a.id, title: a.title, date: a.date, meta: "학술활동", href: `/activities` }));
                const upcomingSeminars = mySeminars
                  .filter((s) => (s.date || "") >= today)
                  .map((s) => ({ id: s.id, title: s.title, date: s.date, meta: `세미나 · ${s.location}`, href: `/seminars/${s.id}` }));
                const upcoming = [...upcomingActivities, ...upcomingSeminars]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 3);

                return (
                  <div className="rounded-2xl border bg-card p-5">
                    <h3 className="text-sm font-semibold">다음 학술활동</h3>
                    {upcoming.length === 0 ? (
                      <EmptyState
                        icon={BookOpen}
                        title="예정된 학술활동이 없습니다"
                        description="프로젝트·스터디·세미나에 참여해보세요."
                        actionLabel="학술활동 둘러보기"
                        actionHref="/activities"
                        className="mt-3 border-0 bg-transparent py-6"
                      />
                    ) : (
                      <ul className="mt-3 divide-y">
                        {upcoming.map((item) => (
                          <li key={item.id} className="flex items-center justify-between py-2.5">
                            <div className="min-w-0">
                              <Link href={item.href} className="truncate text-sm font-medium hover:text-primary">{item.title}</Link>
                              <p className="text-xs text-muted-foreground">{formatDate(item.date)} · {item.meta}</p>
                            </div>
                            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}

              {isSelf && !readOnly && (() => {
                const today = new Date().toISOString().slice(0, 10);

                const pendingApps = allActivities
                  .map((a) => ({ a, mine: a.applicants?.find((ap) => ap.userId === userId && ap.status !== "approved") }))
                  .filter((x): x is { a: Activity; mine: NonNullable<Activity["applicants"]>[number] } => !!x.mine);

                const reviewedSeminarIds = new Set(
                  myReviews.filter((r) => r.type === "attendee").map((r) => r.seminarId)
                );
                const pendingReviews = mySeminars
                  .filter((s) => s.date && s.date < today)
                  .filter((s) => !reviewedSeminarIds.has(s.id))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3);

                if (pendingApps.length === 0 && pendingReviews.length === 0) return null;

                return (
                  <div className="space-y-2">
                    {pendingApps.length > 0 && (
                      <Link
                        href="/mypage/activities"
                        className="block rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/60 text-amber-700">
                            <AlertCircle size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                              신청 결과 대기 {pendingApps.length}건
                            </p>
                            <p className="mt-0.5 truncate text-xs text-amber-800/80">
                              {pendingApps.slice(0, 2).map((x) => x.a.title).join(" · ")}
                              {pendingApps.length > 2 ? ` 외 ${pendingApps.length - 2}건` : ""}
                            </p>
                          </div>
                          <ChevronRight size={16} className="shrink-0 self-center text-amber-700" />
                        </div>
                      </Link>
                    )}

                    {pendingReviews.map((s) => (
                      <Link
                        key={`prv-${s.id}`}
                        href={`/seminars/${s.id}/review`}
                        className="block rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-200/60 text-blue-700">
                            <PenSquare size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-blue-900">
                              세미나 리뷰를 작성해보세요
                            </p>
                            <p className="mt-0.5 truncate text-xs text-blue-800/80">
                              {s.title} · {formatDate(s.date)}
                            </p>
                          </div>
                          <ChevronRight size={16} className="shrink-0 self-center text-blue-700" />
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}

              {isSelf && !readOnly && (() => {
                const today = new Date().toISOString().slice(0, 10);
                const ACTIVITY_LABELS: Record<string, string> = {
                  study: "스터디",
                  project: "프로젝트",
                  external: "대외활동",
                };

                // 사용자 취향 프로파일: 참여한 활동의 type/tag 빈도
                const typeWeights: Record<string, number> = {};
                const tagWeights: Record<string, number> = {};
                for (const a of myActivities) {
                  typeWeights[a.type] = (typeWeights[a.type] || 0) + 1;
                  for (const tag of a.tags || []) {
                    tagWeights[tag] = (tagWeights[tag] || 0) + 1;
                  }
                }

                const myActivityIds = new Set(myActivities.map((a) => a.id));

                // 후보: upcoming + 미참여 + 미신청
                const candidates = allActivities
                  .filter((a) => (a.date || "") >= today && a.status !== "completed")
                  .filter((a) => !myActivityIds.has(a.id))
                  .filter((a) => !a.applicants?.some((ap) => ap.userId === userId))
                  .map((a) => {
                    const typeScore = (typeWeights[a.type] || 0) * 3;
                    const tagScore = (a.tags || []).reduce(
                      (s, t) => s + (tagWeights[t] || 0) * 2,
                      0,
                    );
                    return { a, score: typeScore + tagScore };
                  })
                  .sort((x, y) => {
                    if (y.score !== x.score) return y.score - x.score;
                    return (x.a.date || "").localeCompare(y.a.date || "");
                  })
                  .slice(0, 3);

                if (candidates.length === 0) return null;

                const hasHistory = myActivities.length > 0;
                const heading = hasHistory ? "당신을 위한 추천" : "곧 시작하는 활동";

                return (
                  <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-600" />
                      <h3 className="text-sm font-semibold text-violet-900">{heading}</h3>
                    </div>
                    <ul className="mt-3 divide-y divide-violet-100">
                      {candidates.map(({ a }) => {
                        const typeLabel = ACTIVITY_LABELS[a.type] || a.type;
                        const tagPreview = (a.tags || []).slice(0, 2).join(" · ");
                        return (
                          <li key={`rec-${a.id}`} className="py-2.5">
                            <Link
                              href={`/activities/${a.type}/${a.id}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-violet-900 hover:text-violet-700">
                                  {a.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-violet-800/80">
                                  {typeLabel} · {formatDate(a.date)}
                                  {tagPreview && ` · ${tagPreview}`}
                                </p>
                              </div>
                              <ChevronRight size={14} className="shrink-0 text-violet-700" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              {(() => {
                type TLEvent = {
                  id: string;
                  ts: string;
                  iso: string;
                  title: string;
                  meta: string;
                  href: string;
                  type: "activity" | "seminar" | "certificate" | "post" | "interview";
                };
                const events: TLEvent[] = [];
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);

                for (const a of myActivities) {
                  if (!a.date) continue;
                  const meta =
                    a.type === "project" ? "프로젝트"
                    : a.type === "study" ? "스터디"
                    : a.type === "external" ? "대외활동"
                    : "학술활동";
                  const href =
                    a.type === "project" ? `/activities/projects/${a.id}`
                    : a.type === "study" ? `/activities/studies/${a.id}`
                    : a.type === "external" ? `/activities/external/${a.id}`
                    : `/activities`;
                  events.push({ id: `act-${a.id}`, ts: a.date, iso: a.date, title: a.title, meta, href, type: "activity" });
                }
                for (const s of mySeminars) {
                  if (!s.date) continue;
                  events.push({ id: `sem-${s.id}`, ts: s.date, iso: s.date, title: s.title, meta: "세미나", href: `/seminars/${s.id}`, type: "seminar" });
                }
                for (const c of myCertificates) {
                  const label = c.type === "completion" ? "수료증" : c.type === "appointment" ? "임명장" : c.type === "participation" ? "참석확인서" : "감사장";
                  const title = c.activityTitle || c.seminarTitle || "수료증";
                  events.push({ id: `cert-${c.id}`, ts: c.issuedAt, iso: c.issuedAt, title, meta: label, href: `/mypage/activities?tab=certificates`, type: "certificate" });
                }
                for (const p of myPosts) {
                  if (!p.createdAt) continue;
                  events.push({ id: `post-${p.id}`, ts: p.createdAt, iso: p.createdAt, title: p.title, meta: "내 글 작성", href: `/board/${p.id}`, type: "post" });
                }
                for (const r of myInterviewResponses) {
                  const submitted = r.submittedAt || r.updatedAt;
                  if (!submitted || r.status !== "submitted") continue;
                  const post = posts.find((p) => p.id === r.postId);
                  if (!post) continue;
                  events.push({ id: `intv-${r.id}`, ts: submitted, iso: submitted, title: post.title, meta: "인터뷰 응답", href: `/board/${post.id}`, type: "interview" });
                }

                const recent = events
                  .filter((e) => new Date(e.iso) >= cutoff)
                  .sort((a, b) => b.iso.localeCompare(a.iso))
                  .slice(0, 8);

                if (recent.length === 0) return null;

                const ICON_MAP: Record<TLEvent["type"], { icon: typeof Calendar; bg: string; fg: string }> = {
                  activity: { icon: FolderKanban, bg: "bg-emerald-100", fg: "text-emerald-700" },
                  seminar: { icon: Calendar, bg: "bg-primary/15", fg: "text-primary" },
                  certificate: { icon: Award, bg: "bg-amber-100", fg: "text-amber-700" },
                  post: { icon: FileText, bg: "bg-slate-100", fg: "text-slate-700" },
                  interview: { icon: Mic, bg: "bg-blue-100", fg: "text-blue-700" },
                };

                return (
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Clock size={14} className="text-muted-foreground" />
                        최근 활동
                      </h3>
                      <span className="text-[11px] text-muted-foreground">최근 90일</span>
                    </div>
                    <ol className="mt-4 space-y-3">
                      {recent.map((ev) => {
                        const cfg = ICON_MAP[ev.type];
                        const Icon = cfg.icon;
                        return (
                          <li key={ev.id} className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
                              <Icon size={14} className={cfg.fg} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link href={ev.href} className="block truncate text-sm font-medium hover:text-primary">
                                {ev.title}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                <span className={cn("mr-1.5 rounded-full px-1.5 py-0.5", cfg.bg, cfg.fg)}>{ev.meta}</span>
                                {formatDate(ev.iso)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })()}

              {isSelf && !readOnly && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href="/mypage/card" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-primary" />
                      <p className="text-sm font-semibold">내 모바일 명함</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">QR·vCard·공유·교환 기록 관리</p>
                  </Link>
                  <Link href="/activities" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">학술활동 둘러보기</p>
                    <p className="mt-1 text-xs text-muted-foreground">프로젝트·스터디·대외활동</p>
                  </Link>
                  <Link href="/board" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">게시판</p>
                    <p className="mt-1 text-xs text-muted-foreground">공지·자유·홍보·자료실</p>
                  </Link>
                  <Link href="/mypage/portfolio" className="rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                    <p className="text-sm font-semibold">학술 포트폴리오</p>
                    <p className="mt-1 text-xs text-muted-foreground">수상·대외활동·콘텐츠 등록</p>
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="rounded-2xl border bg-card p-6">
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
            <>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="text-lg font-bold">비밀번호 변경</h3>
                <div className="mt-4">
                  {readOnly ? (
                    <p className="text-sm text-muted-foreground">읽기 전용 모드에서는 비밀번호를 변경할 수 없습니다.</p>
                  ) : (
                    <PasswordChangeForm />
                  )}
                </div>
              </div>
              {!readOnly && <SelfDeleteSection user={user} onDeleted={() => { logout(); router.push("/"); }} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SelfDeleteSection({ user, onDeleted }: { user: User; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (confirmText !== user.name) {
      const { toast } = await import("sonner");
      toast.error("이름이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      await profilesApi.delete(user.id);
      const { toast } = await import("sonner");
      toast.success("탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
      onDeleted();
    } catch {
      const { toast } = await import("sonner");
      toast.error("탈퇴 처리에 실패했습니다. 운영진에게 문의해주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-destructive">
          <AlertCircle size={18} /> 회원 탈퇴
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          탈퇴 시 계정 정보가 영구 삭제됩니다. 작성한 글·신청 기록은 저자 정보가 비표시 처리됩니다.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          탈퇴 진행
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/[0.04] p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-destructive">
        <AlertCircle size={18} /> 회원 탈퇴 확인
      </h3>
      <p className="mt-2 text-sm text-foreground">
        정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </p>
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-medium">
          확인을 위해 본인의 이름 <strong>{user.name}</strong>을(를) 입력하세요.
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={user.name}
          className="w-full rounded-md border bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(""); }}>취소</Button>
        <Button
          className="bg-destructive text-white hover:bg-destructive/90"
          onClick={handleDelete}
          disabled={busy || confirmText !== user.name}
        >
          {busy ? "처리 중…" : "탈퇴 확정"}
        </Button>
      </div>
    </div>
  );
}
