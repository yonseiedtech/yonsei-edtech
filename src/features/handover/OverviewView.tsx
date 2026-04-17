"use client";

import Link from "next/link";
import { FileText, User as UserIcon, Printer } from "lucide-react";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function OverviewView() {
  const { positions, isLoading } = useOrgChart();

  const withHandover = positions.filter((p) => (p.handover ?? "").trim().length > 0);
  const sorted = [...withHandover].sort((a, b) => a.level - b.level || a.order - b.order);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            각 직책별 인수인계 메모를 한눈에 확인합니다. 수정은{" "}
            <Link href="/console/settings" className="text-primary underline underline-offset-2">
              조직도 설정
            </Link>
            에서 할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer size={14} className="mr-1" /> 인쇄/PDF
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">불러오는 중...</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="인수인계 메모가 없습니다"
          description="조직도 설정에서 각 직책에 인수인계 노하우를 기록해두면, 차기 임원이 바로 확인할 수 있습니다."
          actionLabel="조직도 설정 열기"
          actionHref="/console/settings"
          className="mt-8"
        />
      ) : (
        <ul className="mt-6 space-y-4">
          {sorted.map((p) => (
            <li key={p.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {p.userName?.[0] ?? <UserIcon size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.userName ?? "공석"}
                    {p.department && ` · ${p.department}`}
                    {p.team && ` · ${p.team}`}
                  </p>
                </div>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-sans text-sm text-foreground">
{p.handover}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
