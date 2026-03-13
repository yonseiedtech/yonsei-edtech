"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import AdminUserList from "@/features/admin/AdminUserList";
import { Shield } from "lucide-react";
import type { User } from "@/types";

// Demo pending users
const PENDING_USERS: User[] = [
  { id: "10", username: "honggildong", name: "홍길동", generation: 4, field: "AI 교육", role: "member", approved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "11", username: "kimcs", name: "김철수", generation: 4, field: "VR 교육", role: "member", approved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function AdminContent() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">관리자</h1>
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-bold">승인 대기 회원</h2>
          <div className="mt-4">
            <AdminUserList users={PENDING_USERS} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold">게시글 관리</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            게시판에서 직접 게시글을 관리할 수 있습니다. 각 게시글의 삭제 버튼을
            사용하세요.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}
