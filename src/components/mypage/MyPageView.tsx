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
import { certificatesApi, activitiesApi, profilesApi } from "@/lib/bkend";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import type { Certificate, Activity, User } from "@/types";
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
} from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate, formatGeneration } from "@/lib/utils";

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
          )}
        </div>
      </div>
    </div>
  );
}
