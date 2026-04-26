"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

const AnalyticsView = dynamic(() => import("../analytics/page"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const SemesterReportView = dynamic(() => import("../semester-report/page"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const MemberReportView = dynamic(() => import("@/features/insights/MemberReportView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

type SubTab = "dashboard" | "report" | "members";

function InsightsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active: SubTab = (searchParams.get("view") as SubTab) ?? "dashboard";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`/admin/insights?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BarChart3}
        title="학회 인사이트"
        description="실시간 지표와 학기 단위 AI 보고서를 한 화면에서 확인합니다."
      />

      <Tabs value={active} onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="dashboard">실시간 대시보드</TabsTrigger>
          <TabsTrigger value="report">학기 보고서</TabsTrigger>
          <TabsTrigger value="members">회원 보고서</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <AnalyticsView />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <SemesterReportView />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MemberReportView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InsightsInner />
    </Suspense>
  );
}
