"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

const UserActivityLogView = dynamic(() => import("@/features/insights/UserActivityLogView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const DiagnosticInsightsView = dynamic(() => import("@/features/insights/DiagnosticInsightsView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const AdoptionSection = dynamic(
  () => import("@/features/insights/AdoptionSection"),
  { ssr: false },
);
const OperationalKpiSection = dynamic(
  () => import("@/features/insights/OperationalKpiSection"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const WeeklyOperationsSummary = dynamic(
  () => import("@/features/insights/WeeklyOperationsSummary"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const InsightsActionPanel = dynamic(
  () => import("@/features/insights/InsightsActionPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const SuggestedActionsSection = dynamic(
  () => import("@/features/insights/SuggestedActionsSection"),
  { ssr: false },
);

const SearchMissSection = dynamic(
  () => import("@/features/insights/SearchMissSection"),
  { ssr: false },
);

const DigestStatsSection = dynamic(
  () => import("@/features/insights/DigestStatsSection"),
  { ssr: false },
);

const FunnelSection = dynamic(
  () => import("@/features/insights/FunnelSection"),
  { ssr: false },
);

const MentoringPoolCard = dynamic(
  () => import("@/features/insights/MentoringPoolCard"),
  { ssr: false },
);

const WebVitalsSection = dynamic(
  () => import("@/features/insights/WebVitalsSection"),
  { ssr: false },
);

type SubTab =
  | "summary"
  | "actions"
  | "dashboard"
  | "report"
  | "members"
  | "activity"
  | "opkpi"
  | "diagnostic";

function InsightsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active: SubTab = (searchParams.get("view") as SubTab) ?? "summary";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    // 같은 컴포넌트가 /admin/insights·/console/insights 양쪽에 서빙되므로
    // 하드코딩 대신 현재 경로 유지 (탭 전환 시 콘솔 이탈 방지)
    router.replace(`${pathname}?${params.toString()}`);
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
          <TabsTrigger value="summary">운영 요약</TabsTrigger>
          <TabsTrigger value="actions">액션 센터</TabsTrigger>
          <TabsTrigger value="opkpi">운영 KPI</TabsTrigger>
          <TabsTrigger value="dashboard">실시간 대시보드</TabsTrigger>
          <TabsTrigger value="report">학기 보고서</TabsTrigger>
          <TabsTrigger value="members">회원 보고서</TabsTrigger>
          <TabsTrigger value="diagnostic">진단평가</TabsTrigger>
          <TabsTrigger value="activity">활동 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <WeeklyOperationsSummary />
        </TabsContent>
        <TabsContent value="actions" className="mt-4 space-y-6">
          {/* v7 H1(2026-07-20): 제안된 운영 액션 — 퍼널·검색실패·비활성 자동 진단 */}
          <SuggestedActionsSection />
          <div id="insights-nudge-panel" className="scroll-mt-20">
            <InsightsActionPanel />
          </div>
        </TabsContent>
        <TabsContent value="opkpi" className="mt-4 space-y-4">
          {/* PM GAP-H: 멘토 풀 카운트 — 멘토 토글 ON 회원·요청·수락 집계 */}
          <MentoringPoolCard />

          {/* C-5(2026-07-04): 기능 채택률 — 개강 채택 전환 사이클 KPI */}
          <AdoptionSection />

          <OperationalKpiSection />

          {/* M6(2026-07-19): 검색 실패 분석 — 아카이브 콘텐츠 갭 신호 */}
          <SearchMissSection />

          {/* M7(2026-07-20): 다이제스트 열람·CTA 클릭 추적 성과 */}
          <DigestStatsSection />

          {/* M2(2026-07-19): 온보딩·진단 퍼널 전환율 */}
          <FunnelSection />

          {/* H1(2026-07-20): web_vitals 성능 관측 — 라우트별 LCP/CLS/INP p75 */}
          <WebVitalsSection />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <AnalyticsView />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <SemesterReportView />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MemberReportView />
        </TabsContent>
        <TabsContent value="diagnostic" className="mt-4">
          <DiagnosticInsightsView />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <UserActivityLogView />
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
