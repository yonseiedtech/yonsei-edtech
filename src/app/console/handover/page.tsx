"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WorkLogView from "@/features/handover/WorkLogView";
import OverviewView from "@/features/handover/OverviewView";
import TransitionView from "@/features/handover/TransitionView";

type TabKey = "worklog" | "overview" | "transition";

function HandoverTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = raw === "overview" || raw === "transition" ? raw : "worklog";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/console/handover?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">인수인계</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          업무수행철 · 인수인계 종합 · 운영진 교체를 한 곳에서 관리합니다.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => handleChange(v as string)}>
        <TabsList>
          <TabsTrigger value="worklog">업무수행철</TabsTrigger>
          <TabsTrigger value="overview">인수인계 종합</TabsTrigger>
          <TabsTrigger value="transition">운영진 교체</TabsTrigger>
        </TabsList>

        <TabsContent value="worklog" className="mt-4">
          <WorkLogView />
        </TabsContent>
        <TabsContent value="overview" className="mt-4">
          <OverviewView />
        </TabsContent>
        <TabsContent value="transition" className="mt-4">
          <TransitionView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ConsoleHandoverPage() {
  return (
    <Suspense fallback={null}>
      <HandoverTabs />
    </Suspense>
  );
}
