"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useOrgChart, type OrgRole } from "@/features/admin/settings/useOrgChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import {
  Printer,
  FileText,
  Users,
  BarChart2,
  Monitor,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";
import { HandoverMarkdown } from "@/lib/markdown-handover";
import { HandoverWorkflow, HandoverTodos } from "@/features/handover/HandoverExtras";

// ── M4: 직책별 온보딩 안내 자동 채움 슬롯 (신규 컬렉션 없음·기존 역할 정의 재사용) ──

/** 직책 역할별 담당 콘솔 화면 목록 */
const ROLE_CONSOLE_SCREENS: Partial<Record<OrgRole, { label: string; href: string }[]>> = {
  president: [
    { label: "운영 콘솔 홈", href: "/console" },
    { label: "회원 관리", href: "/console/members" },
    { label: "게시글 관리", href: "/console/posts" },
    { label: "콘텐츠 초안", href: "/console/content-drafts" },
    { label: "운영진 설정(조직도)", href: "/console/org" },
    { label: "업무노트", href: "/console/handover" },
  ],
  vice_president: [
    { label: "운영 콘솔 홈", href: "/console" },
    { label: "학술활동 관리", href: "/console/academic/manage" },
    { label: "업무노트", href: "/console/handover" },
    { label: "운영진 설정(조직도)", href: "/console/org" },
  ],
  direct_aide: [
    { label: "학술활동 관리", href: "/console/academic/manage" },
    { label: "업무노트", href: "/console/handover" },
  ],
  team_member: [
    { label: "업무노트", href: "/console/handover" },
  ],
};

/** 직책 역할별 자동 실행 cron 목록 — 신임자가 손대지 않아도 도는 것 */
const ROLE_CRON_DEPS: Partial<Record<OrgRole, string[]>> = {
  president: [
    "신입 활성화 시퀀스 자동 발송 (newcomer-activation-sequence)",
    "주간 다이제스트 자동 발행 (weekly-digest)",
    "학기 이월 조직도 자동 복사 (semester-advance R3)",
    "cron 연속실패 자동 감시 (cron-watchdog)",
  ],
  vice_president: [
    "멘토링 넛지 자동 발송 (mentoring-nudge)",
    "세미나·스터디 리마인더 자동 발송",
    "학기 이월 조직도 자동 복사 (semester-advance R3)",
  ],
  direct_aide: [
    "세미나·과제 리마인더 자동 발송",
    "스터디 리마인더 자동 발송",
  ],
  team_member: [
    "세미나·스터디 리마인더 자동 발송",
  ],
};

/** 카테고리 표시 순서 (주의사항 최우선) */
const CATEGORY_DISPLAY: { key: HandoverDocument["category"]; label: string }[] = [
  { key: "caution", label: "주의사항" },
  { key: "routine", label: "정기업무" },
  { key: "project", label: "진행프로젝트" },
  { key: "reference", label: "참고자료" },
];

// ── 기존 헬퍼 ──

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
  high: "bg-destructive/5 text-destructive border-destructive/20",
  medium: "bg-warning/5 text-warning border-warning/20",
  low: "bg-success/5 text-success border-success/20",
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

  // ── M4-A: 임기 활동 요약 (기존 termDocs 재사용 — 신규 컬렉션 없음) ──
  const assignedPositions = positions.filter((p) => (p.userName ?? "").trim().length > 0);

  const categoryCount: Record<HandoverDocument["category"], number> = {
    routine: 0, project: 0, reference: 0, caution: 0,
  };
  for (const d of termDocs) categoryCount[d.category]++;

  const positionsWithDocs = assignedPositions.filter(
    (p) => (docsByRole.get(p.title) ?? []).length > 0,
  );

  // 공백 직책: 인수 메모도 이 학기 업무노트도 없는 배정 직책
  const gapTitleSet = new Set(
    assignedPositions
      .filter((p) => {
        const hasMemo = (p.handover ?? "").trim().length > 0;
        const hasNotes = (docsByRole.get(p.title) ?? []).length > 0;
        return !hasMemo && !hasNotes;
      })
      .map((p) => p.title),
  );

  // ── M4-B: 직책 온보딩 안내 (duty·콘솔 화면·cron 의존 보유 배정 직책) ──
  const positionsForOnboarding = useMemo(
    () =>
      positions
        .filter((p) => (p.userName ?? "").trim().length > 0)
        .filter((p) => {
          const screens = p.role ? (ROLE_CONSOLE_SCREENS[p.role] ?? []) : [];
          const crons = p.role ? (ROLE_CRON_DEPS[p.role] ?? []) : [];
          return (p.duty ?? "").trim().length > 0 || screens.length > 0 || crons.length > 0;
        })
        .sort((a, b) => a.level - b.level || a.order - b.order),
    [positions],
  );

  const showActivitySummary = !orgLoading && !docsLoading && assignedPositions.length > 0;
  const showOnboarding = !orgLoading && positionsForOnboarding.length > 0;

  return (
    <div className="space-y-6 print:py-0">
      {/* 화면 전용 컨트롤 (인쇄 시 숨김) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BackButton href="/console/handover" label="업무노트로" variant="default" />
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

      {/* M4-A: 임기 활동 요약 (자동 채움 — 기존 handover_docs 집계) */}
      {showActivitySummary && (
        <section className="space-y-2 print:break-inside-avoid">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart2 size={18} className="text-primary" />
            임기 활동 요약
            <span className="text-xs font-normal text-muted-foreground">(자동 채움)</span>
          </h2>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <span className="text-2xl font-bold">{termDocs.length}</span>
                <span className="ml-1 text-sm text-muted-foreground">건</span>
                <p className="mt-0.5 text-xs text-muted-foreground">이 학기 업무 문서 합계</p>
              </div>
              {termDocs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_DISPLAY.map(({ key, label }) =>
                    categoryCount[key] > 0 ? (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {label} {categoryCount[key]}
                      </Badge>
                    ) : null,
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              직책 커버리지: 배정 {assignedPositions.length}직책 중{" "}
              <span
                className={cn(
                  "font-medium",
                  positionsWithDocs.length === assignedPositions.length
                    ? "text-success"
                    : "text-warning",
                )}
              >
                {positionsWithDocs.length}직책
              </span>{" "}
              업무 문서 있음
              {gapTitleSet.size > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-destructive">
                    {gapTitleSet.size}직책 공백
                  </span>
                  (인수 메모·업무노트 없음 — 아래 온보딩 안내 참조)
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/* M4-B: 직책 온보딩 안내 (자동 채움 — duty·콘솔 화면·cron 의존 자동 병합) */}
      {showOnboarding && (
        <section className="space-y-3 print:break-inside-avoid">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Monitor size={18} className="text-primary" />
            직책 온보딩 안내
            <span className="text-xs font-normal text-muted-foreground">
              (자동 채움 — 첫 주 참고)
            </span>
          </h2>
          <ul className="space-y-3">
            {positionsForOnboarding.map((p) => {
              const screens = p.role ? (ROLE_CONSOLE_SCREENS[p.role] ?? []) : [];
              const crons = p.role ? (ROLE_CRON_DEPS[p.role] ?? []) : [];
              const duty = (p.duty ?? "").trim();
              const termDocCount = (docsByRole.get(p.title) ?? []).length;
              const isGap = gapTitleSet.has(p.title);

              return (
                <li
                  key={p.id}
                  className={cn(
                    "rounded-lg border bg-card p-4 print:break-inside-avoid",
                    isGap && "border-destructive/20",
                  )}
                >
                  {/* 직책 헤더 */}
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold">{p.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.userName ?? "공석"}
                      {p.department && ` · ${p.department}`}
                    </span>
                    {isGap && (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle size={11} />
                        업무노트 없음
                      </span>
                    )}
                    {termDocCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        이 학기 업무노트 {termDocCount}건
                      </span>
                    )}
                  </div>

                  {/* 자동 채움 슬롯 */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {/* 담당 업무 (조직도 duty 필드) */}
                    {duty && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          담당 업무
                        </p>
                        <p className="rounded-md bg-muted/20 px-3 py-2 text-xs leading-relaxed">
                          {duty}
                        </p>
                      </div>
                    )}

                    {/* 담당 콘솔 화면 목록 */}
                    {screens.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          담당 콘솔 화면
                        </p>
                        <ul className="space-y-0.5">
                          {screens.map((s) => (
                            <li key={s.href}>
                              <Link
                                href={s.href}
                                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-primary hover:bg-muted print:text-foreground"
                              >
                                <Monitor size={10} className="shrink-0" />
                                {s.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 반복 cron 의존 (자동으로 도는 것) */}
                    {crons.length > 0 && (
                      <div
                        className={cn(
                          duty && screens.length > 0 ? "sm:col-span-2" : "",
                        )}
                      >
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <RefreshCw size={10} />
                          자동으로 도는 것 (손댈 필요 없음)
                        </p>
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {crons.map((c) => (
                            <li key={c} className="flex items-start gap-1.5">
                              <span className="mt-0.5 shrink-0">·</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
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
                  <HandoverWorkflow steps={doc.workflow} className="mt-3" />
                  <HandoverTodos todos={doc.todos} className="mt-3" />
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
