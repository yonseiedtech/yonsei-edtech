"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { useSeminarStore } from "@/features/seminar/seminar-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Calendar, X } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

function MypageContent() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();
  const { seminars, toggleAttendance } = useSeminarStore();

  const myPosts = posts.filter((p) => p.authorId === user?.id);
  const mySeminars = seminars.filter((s) => user && s.attendeeIds.includes(user.id));

  function handleCancelAttendance(seminarId: string) {
    if (!user) return;
    toggleAttendance(seminarId, user.id);
    toast.success("참석이 취소되었습니다.");
  }

  if (!user) return null;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">마이페이지</h1>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={16} className="mr-1" />
            로그아웃
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{user.generation}기</Badge>
                <Badge>{ROLE_LABELS[user.role]}</Badge>
              </div>
            </div>
          </div>

          <ProfileEditor user={user} />

          <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-bold">비밀번호 변경</h3>
            <div className="mt-4">
              <PasswordChangeForm />
            </div>
          </div>
        </div>

        {/* 신청한 세미나 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={20} />
            신청한 세미나
          </h2>
          <div className="mt-4 space-y-3">
            {mySeminars.length === 0 ? (
              <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                신청한 세미나가 없습니다.{" "}
                <Link href="/seminars" className="text-primary hover:underline">
                  세미나 보러가기
                </Link>
              </p>
            ) : (
              mySeminars.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border bg-white px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/seminars/${s.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {s.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatDate(s.date)} {s.time} · {s.location}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleCancelAttendance(s.id)}
                  >
                    <X size={14} className="mr-1" />
                    취소
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold">내가 작성한 글</h2>
          <div className="mt-4">
            <MyPostList posts={myPosts} />
          </div>
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
