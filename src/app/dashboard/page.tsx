"use client";

import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useNewsletterStore } from "@/features/newsletter/newsletter-store";
import { isAtLeast } from "@/lib/permissions";
import { ROLE_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Clock,
  Newspaper,
  PenSquare,
  BookOpen,
  User,
  Shield,
  Megaphone,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuthStore();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { issues } = useNewsletterStore();

  if (!user) return null;

  const isStaff = isAtLeast(user, "staff");

  const myPosts = posts.filter((p) => p.authorId === user.id);
  const mySeminars = seminars.filter((s) => s.attendeeIds.includes(user.id));
  const upcomingSeminars = seminars.filter((s) => s.status === "upcoming");
  const notices = posts
    .filter((p) => p.category === "notice")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const upcomingDisplay = upcomingSeminars.slice(0, 2);
  const latestNewsletter = issues
    .filter((i) => i.status === "published")
    .sort((a, b) => b.issueNumber - a.issueNumber)[0];
  const pendingCount = 2; // mock

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* 환영 섹션 */}
        <div className="flex items-center gap-3">
          <LayoutDashboard size={28} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              안녕하세요, {user.name}님
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge>{ROLE_LABELS[user.role]}</Badge>
              <Badge variant="secondary">{user.generation}기</Badge>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={FileText}
            label="내 글"
            value={myPosts.length}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Calendar}
            label="신청 세미나"
            value={mySeminars.length}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            icon={Clock}
            label="예정 세미나"
            value={upcomingSeminars.length}
            color="bg-purple-50 text-purple-600"
          />
          {isStaff ? (
            <StatCard
              icon={Shield}
              label="승인 대기"
              value={pendingCount}
              color="bg-amber-50 text-amber-600"
            />
          ) : (
            <StatCard
              icon={Newspaper}
              label="최신 학회보"
              value={latestNewsletter ? `제${latestNewsletter.issueNumber}호` : "-"}
              color="bg-rose-50 text-rose-600"
            />
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/board/write">
            <Button variant="outline" size="sm">
              <PenSquare size={14} className="mr-1.5" />
              게시글 작성
            </Button>
          </Link>
          <Link href="/seminars">
            <Button variant="outline" size="sm">
              <BookOpen size={14} className="mr-1.5" />
              세미나
            </Button>
          </Link>
          <Link href="/mypage">
            <Button variant="outline" size="sm">
              <User size={14} className="mr-1.5" />
              마이페이지
            </Button>
          </Link>
          {isStaff && (
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Shield size={14} className="mr-1.5" />
                관리자
              </Button>
            </Link>
          )}
        </div>

        {/* 2열 그리드: 최근 공지 + 예정 세미나 */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 최근 공지 */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-primary" />
              <h2 className="font-bold">최근 공지</h2>
            </div>
            {notices.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                공지사항이 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {notices.map((n) => (
                  <Link
                    key={n.id}
                    href={`/board/${n.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 예정 세미나 */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h2 className="font-bold">예정 세미나</h2>
            </div>
            {upcomingDisplay.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                예정된 세미나가 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingDisplay.map((s) => (
                  <Link
                    key={s.id}
                    href={`/seminars/${s.id}`}
                    className="block rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(s.date)} {s.time} · {s.location}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 내 신청 세미나 */}
        {mySeminars.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h2 className="font-bold">내 신청 세미나</h2>
            </div>
            <div className="mt-4 space-y-2">
              {mySeminars.map((s) => (
                <Link
                  key={s.id}
                  href={`/seminars/${s.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{s.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={s.status === "upcoming" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {s.status === "upcoming" ? "예정" : s.status === "completed" ? "완료" : "취소"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
