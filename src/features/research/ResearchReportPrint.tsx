"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ResearchPaper, User, WritingPaper, WritingPaperHistory } from "@/types";
import { formatPeriodLabel, isPaperInPeriod } from "@/lib/research-period";
import {
  computeWritingDays,
  computeParticipationRate,
  computeLongestStreak,
  computeReadingStats,
  computeAvgReadDuration,
  computeTopKeywords,
  computeVariableBreakdown,
} from "@/lib/research-stats";

interface Props {
  user: User;
  papers: ResearchPaper[];
  writingPaper?: WritingPaper | null;
  history: WritingPaperHistory[];
  periodStart?: string | null;
  periodEnd?: string | null;
}

const VARIABLE_LABEL: Record<string, string> = {
  independent: "독립 변인",
  dependent: "종속 변인",
  mediator: "매개 변인",
  moderator: "조절 변인",
  control: "통제 변인",
};

function diffDays(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const s = Date.parse(a);
  const e = Date.parse(b);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.round((e - s) / 86400000);
}

export default function ResearchReportPrint({
  user,
  papers,
  writingPaper,
  history,
  periodStart,
  periodEnd,
}: Props) {
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const opts = { periodStart, periodEnd };

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

  const writingDays = useMemo(() => computeWritingDays(history, opts), [history, periodStart, periodEnd]);
  const participation = useMemo(() => computeParticipationRate(history, opts), [history, periodStart, periodEnd]);
  const streak = useMemo(() => computeLongestStreak(history, opts), [history, periodStart, periodEnd]);
  const readingStats = useMemo(() => computeReadingStats(papers, opts), [papers, periodStart, periodEnd]);
  const avgDuration = useMemo(() => computeAvgReadDuration(papers, opts), [papers, periodStart, periodEnd]);
  const topKeywords = useMemo(() => computeTopKeywords(papers, 10, opts), [papers, periodStart, periodEnd]);
  const variableBreakdown = useMemo(() => computeVariableBreakdown(papers, 5, opts), [papers, periodStart, periodEnd]);

  const writingMeta = writingPaper && writingPaper.chapters
    ? Object.entries(writingPaper.chapters).filter(([, v]) => (v ?? "").trim().length > 0)
    : [];
  const writingCharCount = writingMeta.reduce((sum, [, v]) => sum + (v ?? "").length, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="rounded-2xl border bg-white">
      {/* 헤더 — 인쇄 시 숨김 */}
      <div className="flex items-center justify-between border-b px-5 py-3 print:hidden">
        <div>
          <h2 className="text-sm font-semibold">연구활동 리포트</h2>
          <p className="text-[11px] text-muted-foreground">{periodLabel} · 인쇄 시 학회 브랜딩 포함</p>
        </div>
        <Button size="sm" onClick={handlePrint}>
          <Printer size={14} className="mr-1" />
          인쇄 / PDF
        </Button>
      </div>

      {/* 인쇄 영역 */}
      <article className="report-print mx-auto max-w-[820px] bg-white px-8 py-8 text-sm leading-relaxed text-foreground print:max-w-none print:px-0 print:py-0">
        {/* 학회 브랜드 헤더 */}
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
          {user.generation !== undefined && user.generation !== null && (
            <InfoRow label="기수" value={`${user.generation}기`} />
          )}
          <InfoRow label="기간" value={periodLabel} />
          <InfoRow label="발행일" value={new Date().toISOString().slice(0, 10)} />
        </section>

        {/* 메인 4지표 */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold">요약 지표</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BigStat label="작성활동일" value={`${writingDays}일`} hint="저장 기록 일자" />
            <BigStat label="작성 참여률" value={`${participation}%`} hint="활동일 / 기간일수" />
            <BigStat label="등록 논문" value={`${readingStats.total}건`} hint={`완독 ${readingStats.completed}건`} />
            <BigStat label="평균 완독일" value={avgDuration !== null ? `${avgDuration}일` : "—"} hint="시작~종료" />
          </div>
        </section>

        {/* 작성/읽기 요약 카드 */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">작성 활동 요약</h3>
            <ul className="space-y-1 text-xs">
              <Row label="최대 연속 작성일" value={`${streak}일`} />
              <Row label="총 저장 횟수" value={`${history.length}회`} />
              <Row label="작성 분량" value={writingCharCount > 0 ? `${writingCharCount.toLocaleString()}자` : "—"} />
              <Row label="진행 챕터" value={`${writingMeta.length}/5`} />
            </ul>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">읽기 활동 요약</h3>
            <ul className="space-y-1 text-xs">
              <Row label="총 등록" value={`${readingStats.total}건`} />
              <Row label="완독" value={`${readingStats.completed}건`} />
              <Row label="읽는 중" value={`${readingStats.reading}건`} />
              <Row label="읽을 예정" value={`${readingStats.toRead}건`} />
            </ul>
          </div>
        </section>

        {/* 주요 키워드 */}
        {topKeywords.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold">주요 키워드 (Top 10)</h2>
            <ul className="flex flex-wrap gap-1.5">
              {topKeywords.map(({ tag, count }) => (
                <li key={tag} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]">
                  <span className="font-medium">#{tag}</span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 변인별 정리 */}
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold">변인별 정리</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {(["independent", "dependent", "mediator", "moderator", "control"] as const).map((g) => (
                <tr key={g} className="border-b last:border-b-0">
                  <th className="w-24 py-1.5 text-left font-medium text-muted-foreground">{VARIABLE_LABEL[g]}</th>
                  <td className="py-1.5">
                    {variableBreakdown[g].length === 0
                      ? <span className="text-muted-foreground">—</span>
                      : variableBreakdown[g].map((v) => `${v.name}(${v.count})`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 작성 중 논문 */}
        {writingPaper && writingMeta.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold">작성 중인 논문</h2>
            <div className="rounded-lg border p-4">
              <p className="text-base font-semibold">{writingPaper.title?.trim() || "(제목 미정)"}</p>
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
    </div>
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

function BigStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
      {hint && <p className="text-[9px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-muted/30 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  );
}
