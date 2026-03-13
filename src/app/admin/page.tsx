"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import AdminMemberTab from "@/features/admin/AdminMemberTab";
import AdminPostTab from "@/features/admin/AdminPostTab";
import AdminSeminarTab from "@/features/admin/AdminSeminarTab";
import AdminInquiryTab from "@/features/admin/AdminInquiryTab";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";

function AdminContent() {
  const { user } = useAuthStore();
  const canManageMembers = isPresidentOrAbove(user);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">관리자</h1>
        </div>

        <Tabs defaultValue={canManageMembers ? "members" : "posts"} className="mt-8">
          <TabsList>
            {canManageMembers && <TabsTrigger value="members">회원</TabsTrigger>}
            <TabsTrigger value="posts">게시글</TabsTrigger>
            <TabsTrigger value="seminars">세미나</TabsTrigger>
            <TabsTrigger value="inquiries">문의</TabsTrigger>
          </TabsList>

          {canManageMembers && (
            <TabsContent value="members" className="mt-6">
              <AdminMemberTab />
            </TabsContent>
          )}

          <TabsContent value="posts" className="mt-6">
            <AdminPostTab />
          </TabsContent>

          <TabsContent value="seminars" className="mt-6">
            <AdminSeminarTab />
          </TabsContent>

          <TabsContent value="inquiries" className="mt-6">
            <AdminInquiryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <AdminContent />
    </AuthGuard>
  );
}
