"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import ProfileEditor from "@/features/auth/ProfileEditor";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/types";

function MypageContent() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();

  const myPosts = posts.filter((p) => p.authorId === user?.id);

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
