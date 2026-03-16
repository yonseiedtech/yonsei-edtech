"use client";

import { useSearchParams } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import AdminMemberTab from "@/features/admin/AdminMemberTab";
import AdminPostTab from "@/features/admin/AdminPostTab";
import AdminSeminarTab from "@/features/admin/AdminSeminarTab";
import AdminInquiryTab from "@/features/admin/AdminInquiryTab";
import AdminNewsletterTab from "@/features/admin/AdminNewsletterTab";
import AdminGreetingTab from "@/features/admin/AdminGreetingTab";
import AdminAgentTab from "@/features/admin/AdminAgentTab";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, FileText, BookOpen, MessageSquare, Clock, HelpCircle, Newspaper, Settings, Bot } from "lucide-react";
import { usePosts } from "@/features/board/useBoard";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";

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
  const searchParams = useSearchParams();
  const canManageMembers = isPresidentOrAbove(user);
  const { inquiries } = useInquiries();
  const { posts } = usePosts("all");
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  const { data: membersData } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const res = await profilesApi.list({ limit: 0 });
      return res;
    },
    retry: false,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: async () => {
      const res = await profilesApi.list({ "filter[approved]": "false", limit: 0 });
      return res;
    },
    retry: false,
  });
  const allMemberCount = membersData?.total ?? 0;
  const pendingCount = pendingData?.total ?? 0;

  const tabParam = searchParams.get("tab");
  const validTabs = ["members", "posts", "seminars", "inquiries", "newsletter", "agents", "site-settings"];
  const defaultTab = tabParam && validTabs.includes(tabParam)
    ? tabParam
    : canManageMembers
      ? "members"
      : "posts";

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">관리자</h1>
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Users} label="전체 회원" value={allMemberCount} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="승인 대기" value={pendingCount} color="bg-amber-50 text-amber-600" />
          <StatCard icon={FileText} label="게시글" value={posts.length} color="bg-green-50 text-green-600" />
          <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-red-50 text-red-600" />
        </div>

        <Tabs defaultValue={defaultTab} className="mt-8">
          {/* 탭 영역 */}
            <TabsList variant="line" className="flex w-max min-w-full gap-0 overflow-x-auto border-b">
              {canManageMembers && (
                <TabsTrigger value="members" className="flex-none px-4 py-2.5 text-sm">
                  <Users size={16} className="mr-1.5" />
                  회원
                </TabsTrigger>
              )}
              <TabsTrigger value="posts" className="flex-none px-4 py-2.5 text-sm">
                <FileText size={16} className="mr-1.5" />
                게시글
              </TabsTrigger>
              <TabsTrigger value="seminars" className="flex-none px-4 py-2.5 text-sm">
                <BookOpen size={16} className="mr-1.5" />
                세미나
              </TabsTrigger>
              <TabsTrigger value="inquiries" className="flex-none px-4 py-2.5 text-sm">
                <MessageSquare size={16} className="mr-1.5" />
                문의
              </TabsTrigger>
              <TabsTrigger value="newsletter" className="flex-none px-4 py-2.5 text-sm">
                <Newspaper size={16} className="mr-1.5" />
                학회보
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex-none px-4 py-2.5 text-sm">
                <Bot size={16} className="mr-1.5" />
                에이전트
              </TabsTrigger>
              <TabsTrigger value="site-settings" className="flex-none px-4 py-2.5 text-sm">
                <Settings size={16} className="mr-1.5" />
                사이트 설정
              </TabsTrigger>
            </TabsList>

          {/* 본문 영역 */}
          {canManageMembers && (
            <TabsContent value="members" className="pt-6">
              <AdminMemberTab />
            </TabsContent>
          )}

          <TabsContent value="posts" className="pt-6">
            <AdminPostTab />
          </TabsContent>

          <TabsContent value="seminars" className="pt-6">
            <AdminSeminarTab />
          </TabsContent>

          <TabsContent value="inquiries" className="pt-6">
            <AdminInquiryTab />
          </TabsContent>

          <TabsContent value="newsletter" className="pt-6">
            <AdminNewsletterTab />
          </TabsContent>

          <TabsContent value="agents" className="pt-6">
            <AdminAgentTab />
          </TabsContent>

          <TabsContent value="site-settings" className="pt-6">
            <AdminGreetingTab />
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
