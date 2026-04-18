"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, FileText, HelpCircle, LayoutDashboard } from "lucide-react";
import AdminTodoTab from "@/features/admin/AdminTodoTab";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border bg-white p-5">
      {href ? (
        <Link href={href} className="block hover:opacity-80 transition-opacity">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

export default function ConsoleDashboardPage() {
  const { user } = useAuthStore();
  const { inquiries } = useInquiries();
  const { posts } = usePosts("all");
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;

  const { data: membersData } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => profilesApi.list({ limit: 0 }),
    retry: false,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={LayoutDashboard}
        title="운영 콘솔"
        description={`${user?.name}님, 안녕하세요.`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="전체 회원" value={membersData?.total ?? 0} color="bg-blue-50 text-blue-600" href="/console/members" />
        <StatCard icon={Clock} label="승인 대기" value={pendingData?.total ?? 0} color="bg-amber-50 text-amber-600" href="/console/members" />
        <StatCard icon={FileText} label="게시글" value={posts.length} color="bg-green-50 text-green-600" href="/console/posts" />
        <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-red-50 text-red-600" href="/console/inquiries" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">오늘 할 일</h2>
        <AdminTodoTab />
      </div>
    </div>
  );
}
