"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Search, BookOpen, Clock, FileText, ChevronRight } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { profilesApi, researchReportsApi, researchPapersApi, studySessionsApi } from "@/lib/bkend";
import type { User, ResearchReport, ResearchPaper, StudySession } from "@/types";
import { cn } from "@/lib/utils";

interface UserResearchSummary {
  user: User;
  report?: ResearchReport;
  papers: ResearchPaper[];
  sessions: StudySession[];
  totalMinutes: number;
  reportProgress: number; // 0~100
  lastActivityAt?: string;
}

function calcReportProgress(r?: ResearchReport): number {
  if (!r) return 0;
  let filled = 0;
  let total = 0;
  const checks: Array<boolean> = [
    !!r.fieldAudience?.trim(),
    !!r.fieldFormat,
    !!r.fieldSubject?.trim(),
    (r.problemPhenomena?.filter((p) => p.trim()).length ?? 0) > 0,
    (r.problemEvidences?.length ?? 0) > 0,
    (r.problemCauses?.length ?? 0) > 0,
    !!r.problemImpact?.trim(),
    !!r.problemImportance?.trim(),
    (r.theoryCards?.length ?? 0) > 0,
    !!r.theoryRelationProblem?.trim(),
    !!r.priorResearchAnalysis?.trim() || (r.priorResearchGroups?.length ?? 0) > 0,
  ];
  total = checks.length;
  filled = checks.filter(Boolean).length;
  return Math.round((filled / total) * 100);
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day}`;
}

function formatHours(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export default function ConsoleResearchPage() {
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "progress" | "time" | "papers">("recent");

  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: ["console-research", "profiles"],
    queryFn: () => profilesApi.list({ "filter[approved]": "true", limit: 1000 }),
  });

  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ["console-research", "reports"],
    queryFn: () => researchReportsApi.listAll(500),
  });

  const users = profilesData?.data ?? [];
  const reports = reportsData?.data ?? [];

  // 보고서가 있는 사용자만 papers/sessions 로드 (네트워크 절약)
  const userIdsWithReport = useMemo(() => new Set(reports.map((r) => r.userId)), [reports]);

  const { data: papersBundles } = useQuery({
    queryKey: ["console-research", "papers", Array.from(userIdsWithReport).sort()],
    enabled: userIdsWithReport.size > 0,
    queryFn: async () => {
      const ids = Array.from(userIdsWithReport);
      const results: Array<[string, ResearchPaper[]]> = await Promise.all(
        ids.map(async (uid): Promise<[string, ResearchPaper[]]> => {
          try {
            const list = await researchPapersApi.list(uid);
            return [uid, list.data ?? []];
          } catch {
            return [uid, []];
          }
        }),
      );
      return new Map(results);
    },
  });

  const { data: sessionBundles } = useQuery({
    queryKey: ["console-research", "sessions", Array.from(userIdsWithReport).sort()],
    enabled: userIdsWithReport.size > 0,
    queryFn: async () => {
      const ids = Array.from(userIdsWithReport);
      const results: Array<[string, StudySession[]]> = await Promise.all(
        ids.map(async (uid): Promise<[string, StudySession[]]> => {
          try {
            const r = await studySessionsApi.listByUser(uid);
            return [uid, r.data ?? []];
          } catch {
            return [uid, []];
          }
        }),
      );
      return new Map(results);
    },
  });

  const summaries: UserResearchSummary[] = useMemo(() => {
    const reportMap = new Map(reports.map((r) => [r.userId, r]));
    return users
      .map((u) => {
        const report = reportMap.get(u.id);
        const papers = papersBundles?.get(u.id) ?? [];
        const sessions = sessionBundles?.get(u.id) ?? [];
        const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
        const reportProgress = calcReportProgress(report);
        const lastFromReport = report?.updatedAt;
        const lastFromSession = sessions
          .map((s) => s.endTime ?? s.startTime)
          .filter(Boolean)
          .sort()
          .pop();
        const lastActivityAt = [lastFromReport, lastFromSession]
          .filter((x): x is string => !!x)
          .sort()
          .pop();
        return {
          user: u,
          report,
          papers,
          sessions,
          totalMinutes,
          reportProgress,
          lastActivityAt,
        };
      })
      .filter((s) => s.report || s.papers.length > 0 || s.sessions.length > 0);
  }, [users, reports, papersBundles, sessionBundles]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const arr = kw
      ? summaries.filter(
          (s) =>
            s.user.name.toLowerCase().includes(kw) ||
            s.user.username.toLowerCase().includes(kw) ||
            (s.user.field ?? "").toLowerCase().includes(kw),
        )
      : summaries;
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sortBy === "recent") {
        return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
      }
      if (sortBy === "progress") return b.reportProgress - a.reportProgress;
      if (sortBy === "time") return b.totalMinutes - a.totalMinutes;
      if (sortBy === "papers") return b.papers.length - a.papers.length;
      return 0;
    });
    return sorted;
  }, [summaries, keyword, sortBy]);

  const stats = useMemo(() => {
    const reportCount = summaries.filter((s) => !!s.report).length;
    const paperCount = summaries.reduce((acc, s) => acc + s.papers.length, 0);
    const sessionCount = summaries.reduce((acc, s) => acc + s.sessions.length, 0);
    const totalMinutes = summaries.reduce((acc, s) => acc + s.totalMinutes, 0);
    return { reportCount, paperCount, sessionCount, totalMinutes };
  }, [summaries]);

  const loading = loadingProfiles || loadingReports;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={FlaskConical}
        title="회원 연구활동"
        description="회원별 연구보고서 진행률·논문 정리·연구 타이머 세션을 한 화면에서 확인합니다."
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="작성 중인 보고서" value={`${stats.reportCount}`} unit="건" icon={FileText} />
        <StatCard label="등록된 논문" value={`${stats.paperCount}`} unit="편" icon={BookOpen} />
        <StatCard label="누적 세션" value={`${stats.sessionCount}`} unit="회" icon={Clock} />
        <StatCard label="누적 시간" value={`${Math.floor(stats.totalMinutes / 60)}`} unit="시간" icon={Clock} />
      </div>

      {/* 검색·정렬 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름·아이디·관심분야 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["recent", "progress", "time", "papers"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition",
                sortBy === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {key === "recent" && "최근 활동순"}
              {key === "progress" && "진행률순"}
              {key === "time" && "누적 시간순"}
              {key === "papers" && "논문 수순"}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            아직 연구활동을 시작한 회원이 없습니다.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((s) => (
              <ResearchRow key={s.user.id} summary={s} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function ResearchRow({ summary }: { summary: UserResearchSummary }) {
  const [open, setOpen] = useState(false);
  const { user, report, papers, sessions, totalMinutes, reportProgress, lastActivityAt } = summary;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{user.username}</span>
            {user.field && (
              <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                {user.field}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText size={11} /> 보고서 {reportProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={11} /> 논문 {papers.length}편
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {sessions.length}회 · {formatHours(totalMinutes)}
            </span>
            <span>최근: {formatDate(lastActivityAt)}</span>
          </div>
        </div>
        <div className="hidden w-32 shrink-0 sm:block">
          <ProgressBar value={reportProgress} />
        </div>
        <ChevronRight
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailBlock title="연구 보고서">
              {report ? (
                <div className="space-y-2 text-xs">
                  <KV label="대상 학습자" value={report.fieldAudience} />
                  <KV label="교육 형태" value={report.fieldFormat} />
                  <KV label="교과/주제" value={report.fieldSubject} />
                  <KV
                    label="현상"
                    value={(report.problemPhenomena ?? [])
                      .filter((p) => p.trim())
                      .slice(0, 2)
                      .join(" / ")}
                  />
                  <KV label="이론 카드" value={`${report.theoryCards?.length ?? 0}개`} />
                  <KV
                    label="선행 연구 그룹"
                    value={`${report.priorResearchGroups?.length ?? 0}개 / 논문 ${report.priorResearchPaperIds?.length ?? 0}편 인용`}
                  />
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    마지막 수정: {formatDate(report.updatedAt)}
                  </div>
                  <Link
                    href={`/profile/${user.id}`}
                    className="mt-2 flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    회원 프로필 보기
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">아직 작성된 보고서가 없습니다.</p>
              )}
            </DetailBlock>

            <DetailBlock title="최근 정리 논문 / 세션">
              {papers.length === 0 && sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">최근 활동이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {papers.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        논문 ({papers.length}편 중 최근 3편)
                      </p>
                      <ul className="space-y-1 text-xs">
                        {papers.slice(0, 3).map((p) => (
                          <li key={p.id} className="flex items-center gap-1">
                            <BookOpen size={11} className="shrink-0 text-muted-foreground" />
                            <span className="truncate">{p.title || "(제목 없음)"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sessions.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        타이머 세션 (최근 3회)
                      </p>
                      <ul className="space-y-1 text-xs">
                        {sessions
                          .slice()
                          .sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""))
                          .slice(0, 3)
                          .map((s) => (
                            <li key={s.id} className="flex items-center gap-1">
                              <Clock size={11} className="shrink-0 text-muted-foreground" />
                              <span className="truncate">{s.targetTitle || s.type}</span>
                              <span className="ml-auto shrink-0 text-muted-foreground">
                                {formatHours(s.durationMinutes ?? 0)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </DetailBlock>
          </div>
        </div>
      )}
    </li>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1">{value ? String(value) : "—"}</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
