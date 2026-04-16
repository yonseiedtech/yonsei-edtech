"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import type { ResearchPaper, User, WritingPaper } from "@/types";
import { formatPeriodLabel, isPaperInPeriod } from "@/lib/research-period";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  papers: ResearchPaper[];
  writingPaper?: WritingPaper | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

function diffDays(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const s = Date.parse(a);
  const e = Date.parse(b);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.round((e - s) / 86400000);
}

export default function ResearchReportDialog({
  open,
  onOpenChange,
  user,
  papers,
  writingPaper,
  periodStart,
  periodEnd,
}: Props) {
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);

  // 기간 + 발행본만 (임시저장 제외)
  const filtered = useMemo(() => {
    return papers
      .filter((p) => !p.isDraft)
      .filter((p) => isPaperInPeriod(p, periodStart, periodEnd))
      .sort((a, b) => {
        const ay = a.year ?? 0;
        const by = b.year ?? 0;
        if (by !== ay) return by - ay;
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
  }, [papers, periodStart, periodEnd]);

  const academicCount = filtered.filter((p) => p.paperType === "academic").length;
  const thesisCount = filtered.filter((p) => p.paperType === "thesis").length;
  const completedCount = filtered.filter((p) => p.readStatus === "completed").length;
  const readingCount = filtered.filter((p) => p.readStatus === "reading").length;
  const toReadCount = filtered.filter((p) => p.readStatus === "to_read").length;

  // 평균 소요기간 (완독 기준)
  const durations = filtered
    .map((p) => diffDays(p.readStartedAt, p.readCompletedAt))
    .filter((d): d is number => d !== null);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;

  // 작성 중 논문 메타
  const writingMeta = writingPaper && writingPaper.chapters
    ? Object.entries(writingPaper.chapters)
        .filter(([, v]) => (v ?? "").trim().length > 0)
    : [];
  const writingCharCount = writingMeta.reduce((sum, [, v]) => sum + (v ?? "").length, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3 print:hidden">
          <DialogHeader className="flex-1">
            <DialogTitle>연구활동 리포트</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint}>
              <Printer size={14} className="mr-1" />
              인쇄 / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* 인쇄 영역 */}
        <article className="report-print mx-auto max-w-[800px] bg-white px-10 py-8 text-sm leading-relaxed text-foreground print:max-w-none print:px-0 print:py-0">
          {/* 헤더 — 연세대학교 / 연세교육공학회 */}
          <header className="border-b-2 border-primary pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              YONSEI UNIVERSITY · YONSEI EDUCATIONAL TECHNOLOGY SOCIETY
            </p>
            <h1 className="mt-1 text-2xl font-bold">연세대학교 · 연세교육공학회</h1>
            <p className="mt-1 text-base font-semibold text-muted-foreground">
              연구활동 리포트 (Research Activity Report)
            </p>
          </header>

          {/* 연구자 정보 */}
          <section className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <InfoRow label="연구자" value={user.name} />
            {user.studentId && <InfoRow label="학번" value={user.studentId} />}
            {user.email && <InfoRow label="이메일" value={user.email} />}
            {user.generation && <InfoRow label="기수" value={`${user.generation}기`} />}
            <InfoRow label="기간" value={periodLabel} />
            <InfoRow label="발행일" value={new Date().toISOString().slice(0, 10)} />
          </section>

          {/* 요약 통계 */}
          <section className="mt-6 rounded-lg border bg-muted/20 p-4 print:bg-white">
            <h2 className="mb-3 text-sm font-bold">요약</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label="총 논문" value={`${filtered.length}건`} />
              <StatBox label="학술논문" value={`${academicCount}건`} />
              <StatBox label="학위논문" value={`${thesisCount}건`} />
              <StatBox label="완독" value={`${completedCount}건`} />
              <StatBox label="읽는 중" value={`${readingCount}건`} />
              <StatBox label="읽을 예정" value={`${toReadCount}건`} />
              <StatBox label="평균 소요기간" value={avgDuration !== null ? `${avgDuration}일` : "—"} />
              <StatBox label="작성 중 분량" value={writingCharCount > 0 ? `${writingCharCount.toLocaleString()}자` : "—"} />
            </div>
          </section>

          {/* 작성 중 논문 */}
          {writingPaper && writingMeta.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-bold">작성 중인 논문</h2>
              <div className="rounded-lg border p-4">
                <p className="text-base font-semibold">
                  {writingPaper.title?.trim() || "(제목 미정)"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  진행 챕터 {writingMeta.length}/5 · 총 {writingCharCount.toLocaleString()}자
                  {writingPaper.lastSavedAt && ` · 마지막 저장 ${writingPaper.lastSavedAt.slice(0, 10)}`}
                </p>
                <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {writingMeta.map(([key, content]) => {
                    const label = key === "intro" ? "서론"
                      : key === "background" ? "이론적 배경"
                      : key === "method" ? "연구 방법"
                      : key === "results" ? "연구 결과"
                      : key === "conclusion" ? "결론" : key;
                    return (
                      <li key={key}>· {label}: {(content ?? "").length.toLocaleString()}자</li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* 발행본 리스트 */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold">발행본 ({filtered.length}건)</h2>
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                해당 기간에 발행된 논문이 없습니다.
              </p>
            ) : (
              <ol className="space-y-3">
                {filtered.map((p, i) => {
                  const dur = diffDays(p.readStartedAt, p.readCompletedAt);
                  return (
                    <li key={p.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}.</span>
                        <p className="flex-1 font-semibold leading-snug">{p.title}</p>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-muted-foreground">
                        {[p.authors, p.year, p.venue,
                          [p.volume && `${p.volume}권`, p.issue && `${p.issue}호`, p.pages && `pp. ${p.pages}`].filter(Boolean).join(" · ") || null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                        유형: {p.paperType === "thesis"
                          ? `학위논문${p.thesisLevel === "master" ? "(석사)" : p.thesisLevel === "doctoral" ? "(박사)" : ""}`
                          : "학술논문"}
                        {p.readStatus && ` · 상태: ${p.readStatus === "to_read" ? "읽을 예정" : p.readStatus === "reading" ? "읽는 중" : "완독"}`}
                        {p.rating && ` · 평점 ${"★".repeat(p.rating)}`}
                        {p.readStartedAt && ` · 시작 ${p.readStartedAt}`}
                        {p.readCompletedAt && ` · 완독 ${p.readCompletedAt}`}
                        {dur !== null && ` (${dur}일)`}
                      </p>
                      {p.tags && p.tags.length > 0 && (
                        <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                          태그: {p.tags.map((t) => `#${t}`).join(" ")}
                        </p>
                      )}
                      {p.findings && (
                        <p className="mt-1 pl-6 text-[11px] leading-relaxed text-foreground/80">
                          <span className="font-medium">주요 결과:</span> {p.findings}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* 푸터 */}
          <footer className="mt-8 border-t pt-3 text-[10px] text-muted-foreground">
            <p>본 리포트는 연세교육공학회 회원 시스템에서 자동 생성되었습니다 · {new Date().toLocaleString("ko-KR")}</p>
          </footer>
        </article>

        {/* 인쇄 전용 스타일 */}
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .report-print, .report-print * { visibility: visible; }
            .report-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: A4;
              margin: 18mm 14mm;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-muted/40 py-1">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
