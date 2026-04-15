"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { BarChart3, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

const SUBTABS = [
  { key: "dashboard", label: "실시간 대시보드", icon: BarChart3 },
  { key: "report", label: "학기 보고서", icon: FileText },
] as const;

type SubTab = (typeof SUBTABS)[number]["key"];

function InsightsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = (searchParams.get("view") as SubTab) ?? "dashboard";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 size={24} /> 학회 인사이트
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          실시간 지표와 학기 단위 AI 보고서를 한 화면에서 확인합니다.
        </p>
      </div>

      <nav className="flex gap-0 border-b">
        {SUBTABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/insights?view=${t.key}`}
              onClick={(e) => {
                e.preventDefault();
                const url = new URL(window.location.href);
                url.searchParams.set("view", t.key);
                router.replace(url.pathname + url.search);
              }}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={14} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div>{active === "report" ? <SemesterReportView /> : <AnalyticsView />}</div>
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
