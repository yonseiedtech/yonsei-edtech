"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import AdminMemberTab from "@/features/admin/AdminMemberTab";
import AdminPostTab from "@/features/admin/AdminPostTab";
import AdminSeminarTab from "@/features/admin/AdminSeminarTab";
import AdminInquiryTab from "@/features/admin/AdminInquiryTab";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, FileText, BookOpen, MessageSquare, Clock, HelpCircle } from "lucide-react";
import { MOCK_POSTS } from "@/features/board/board-data";
import { useInquiryStore } from "@/features/inquiry/inquiry-store";

const PENDING_COUNT = 2; // mock 승인대기 수
const ALL_MEMBER_COUNT = 5; // mock 전체회원 수

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
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

function AdminContent() {
  const { user } = useAuthStore();
  const canManageMembers = isPresidentOrAbove(user);
  const inquiries = useInquiryStore((s) => s.inquiries);
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">관리자</h1>
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Users} label="전체 회원" value={ALL_MEMBER_COUNT} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="승인 대기" value={PENDING_COUNT} color="bg-amber-50 text-amber-600" />
          <StatCard icon={FileText} label="게시글" value={MOCK_POSTS.length} color="bg-green-50 text-green-600" />
          <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-red-50 text-red-600" />
        </div>

        <Tabs defaultValue={canManageMembers ? "members" : "posts"} className="mt-8">
          <TabsList className="w-full">
            {canManageMembers && (
              <TabsTrigger value="members" className="px-4 py-2 text-base">
                <Users size={16} className="mr-1.5" />
                회원
              </TabsTrigger>
            )}
            <TabsTrigger value="posts" className="px-4 py-2 text-base">
              <FileText size={16} className="mr-1.5" />
              게시글
            </TabsTrigger>
            <TabsTrigger value="seminars" className="px-4 py-2 text-base">
              <BookOpen size={16} className="mr-1.5" />
              세미나
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="px-4 py-2 text-base">
              <MessageSquare size={16} className="mr-1.5" />
              문의
            </TabsTrigger>
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
