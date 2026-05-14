"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Printer,
  FileText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";
import { HandoverMarkdown } from "@/lib/markdown-handover";

function buildTermOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 1 : 2;
  const list: string[] = [];
  for (let i = 0; i < 5; i++) {
    let y = year;
    let h = half - i;
    while (h <= 0) { h += 2; y -= 1; }
    list.push(`${y}-${h}`);
  }
  return list;
}

function formatTerm(t: string) {
  const [y, h] = t.split("-");
  return `${y}년 ${h === "1" ? "1학기" : "2학기"}`;
}

const PRIORITY_LABELS: Record<HandoverDocument["priority"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};
const PRIORITY_COLORS: Record<HandoverDocument["priority"], string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-green-50 text-green-700 border-green-200",
};

const PRIORITY_ORDER: Record<HandoverDocument["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function ReportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const termOptions = useMemo(() => buildTermOptions(), []);
  const initialTerm = searchParams.get("term") ?? termOptions[0];
  const [term, setTerm] = useState<string>(initialTerm);

  function setTermAndUrl(next: string) {
    setTerm(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("term", next);
    router.replace(`/console/handover/report?${params.toString()}`);
  }

  const { positions, isLoading: orgLoading } = useOrgChart();
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["handover_docs", "all"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc,priority:asc",
        limit: 1000,
      });
      return res.data;
    },
  });

  const orgWithHandover = positions
    .filter((p) => (p.handover ?? "").trim().length > 0)
    .sort((a, b) => a.level - b.level || a.order - b.order);

  const termDocs = docs.filter((d) => d.term === term);
  const docsByRole = new Map<string, HandoverDocument[]>();
  for (const d of termDocs) {
    if (!docsByRole.has(d.role)) docsByRole.set(d.role, []);
    docsByRole.get(d.role)!.push(d);
  }
  for (const arr of docsByRole.values()) {
    arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }
  const roleList = Array.from(docsByRole.keys());

  const isEmpty = !orgLoading && !docsLoading && orgWithHandover.length === 0 && termDocs.length === 0;

  return (
    <div className="space-y-6 print:py-0">
      {/* 화면 전용 컨트롤 (인쇄 시 숨김) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/console/handover">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1" />
              업무노트로
            </Button>
          </Link>
          <select
            value={term}
            onChange={(e) => setTermAndUrl(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {termOptions.map((t) => (
              <option key={t} value={t}>{formatTerm(t)}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={14} className="mr-1" />
          인쇄 / PDF 저장
        </Button>
      </div>

      {/* 인쇄 헤더 */}
      <header className="border-b pb-4">
        <p className="text-xs text-muted-foreground">연세교육공학회 운영진 인수인계 리포트</p>
        <h1 className="mt-1 text-2xl font-bold">{formatTerm(term)} 인수인계 종합</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          출력일: {new Date().toLocaleDateString("ko-KR")} · 직책 {orgWithHandover.length}건 · 업무수행 문서 {termDocs.length}건
        </p>
      </header>

      {(orgLoading || docsLoading) && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}

      {isEmpty && (
        <div className="rounded-lg border bg-card py-12 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            {formatTerm(term)}에 등록된 인수인계 자료가 없습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            업무노트에서 문서를 작성하거나 조직도 설정에서 직책별 메모를 기록해주세요.
          </p>
        </div>
      )}

      {/* 1. 직책별 인수인계 메모 (조직도) */}
      {orgWithHandover.length > 0 && (
        <section className="space-y-3 print:break-inside-avoid">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users size={18} className="text-primary" />
            직책별 인수인계 메모
          </h2>
          <ul className="space-y-3">
            {orgWithHandover.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border bg-card p-4 print:break-inside-avoid"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold">{p.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.userName ?? "공석"}
                    {p.department && ` · ${p.department}`}
                    {p.team && ` · ${p.team}`}
                  </span>
                </div>
                <HandoverMarkdown
                  content={p.handover ?? ""}
                  className="mt-2 rounded-md border bg-muted/20 p-3 text-sm leading-relaxed text-foreground"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. 업무수행 문서 (HandoverDocument) */}
      {roleList.length > 0 && (
        <section className="space-y-4 print:break-before-page">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText size={18} className="text-primary" />
            직책별 업무수행 문서
          </h2>
          {roleList.map((role) => (
            <div key={role} className="space-y-2 print:break-inside-avoid">
              <h3 className="border-b pb-1 text-base font-semibold text-primary">{role}</h3>
              {docsByRole.get(role)!.map((doc) => (
                <article
                  key={doc.id}
                  className="rounded-lg border bg-card p-4 print:break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", PRIORITY_COLORS[doc.priority])}
                    >
                      {PRIORITY_LABELS[doc.priority]}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {HANDOVER_CATEGORY_LABELS[doc.category]}
                    </Badge>
                    <span className="text-sm font-semibold">{doc.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {doc.authorName ?? "-"}
                  </p>
                  <HandoverMarkdown
                    content={doc.content}
                    className="mt-2 rounded-md border bg-muted/20 p-3 text-sm leading-relaxed text-foreground"
                  />
                </article>
              ))}
            </div>
          ))}
        </section>
      )}

      <footer className="mt-8 border-t pt-3 text-center text-xs text-muted-foreground print:fixed print:bottom-4 print:left-0 print:right-0">
        연세교육공학회 · 본 자료는 차기 임원 인수인계용 내부 문서입니다.
      </footer>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

export default function HandoverReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportInner />
    </Suspense>
  );
}
