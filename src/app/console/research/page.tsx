"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Search,
  BookOpen,
  Clock,
  FileText,
  ChevronRight,
  ClipboardList,
  PenLine,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  profilesApi,
  researchReportsApi,
  researchPapersApi,
  studySessionsApi,
  researchProposalsApi,
  writingPapersApi,
} from "@/lib/bkend";
import type {
  User,
  ResearchReport,
  ResearchPaper,
  StudySession,
  ResearchProposal,
  WritingPaper,
} from "@/types";
import { cn } from "@/lib/utils";

interface UserResearchSummary {
  user: User;
  report?: ResearchReport;
  proposal?: ResearchProposal;
  writing?: WritingPaper;
  papers: ResearchPaper[];
  sessions: StudySession[];
  totalMinutes: number;
  reportProgress: number; // 0~100
  proposalProgress: number; // 0~100
  writingCharCount: number;
  lastActivityAt?: string;
}

const WRITING_CHAPTER_LABELS: Record<string, string> = {
  intro: "서론",
  background: "이론적 배경",
  method: "연구 방법",
  results: "연구 결과",
  conclusion: "결론",
};
const WRITING_CHAPTER_KEYS = ["intro", "background", "method", "results", "conclusion"] as const;

function calcProposalProgress(p?: ResearchProposal): number {
  if (!p) return 0;
  const checks = [
    !!p.titleKo?.trim(),
    !!p.titleEn?.trim(),
    !!p.purpose?.trim(),
    !!p.scope?.trim(),
    !!p.method?.trim(),
    !!p.content?.trim(),
    (p.referencePaperIds?.length ?? 0) > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function calcReportProgress(r?: ResearchReport): number {
  if (!r) return 0;
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
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function calcWritingCharCount(w?: WritingPaper): number {
  if (!w?.chapters) return 0;
  return Object.values(w.chapters).reduce(
    (acc, t) => acc + (typeof t === "string" ? t.length : 0),
    0,
  );
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

  const { data: proposalsData, isLoading: loadingProposals } = useQuery({
    queryKey: ["console-research", "proposals"],
    queryFn: () => researchProposalsApi.listAll(500),
  });

  const { data: writingsData, isLoading: loadingWritings } = useQuery({
    queryKey: ["console-research", "writings"],
    queryFn: () => writingPapersApi.listAll(1000),
  });

  // 모든 회원의 논문·세션을 listAll 로 한 번에 로드 후 userId 로 그룹 (네트워크 절약)
  const { data: papersBundles, isLoading: loadingPapers } = useQuery({
    queryKey: ["console-research", "papers-all"],
    queryFn: async () => {
      const res = await researchPapersApi.listAll();
      const map = new Map<string, ResearchPaper[]>();
      for (const p of res.data ?? []) {
        if (!p.userId) continue;
        const arr = map.get(p.userId) ?? [];
        arr.push(p);
        map.set(p.userId, arr);
      }
      for (const [, arr] of map) {
        arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      }
      return map;
    },
  });

  const { data: sessionBundles, isLoading: loadingSessions } = useQuery({
    queryKey: ["console-research", "sessions-all"],
    queryFn: async () => {
      const res = await studySessionsApi.listAll();
      const map = new Map<string, StudySession[]>();
      for (const s of res.data ?? []) {
        if (!s.userId) continue;
        const arr = map.get(s.userId) ?? [];
        arr.push(s);
        map.set(s.userId, arr);
      }
      return map;
    },
  });

  const baseUsers = profilesData?.data ?? [];
  const reports = reportsData?.data ?? [];
  const proposals = proposalsData?.data ?? [];
  const writings = writingsData?.data ?? [];

  // 연구 데이터가 있지만 approved 회원 목록에 없는 userId(예: 관리자, 미승인)를 별도 조회.
  const baseUserIds = useMemo(() => new Set(baseUsers.map((u) => u.id)), [baseUsers]);
  const dataOnlyUserIds = useMemo(() => {
    const ids = new Set<string>();
    reports.forEach((r) => r.userId && !baseUserIds.has(r.userId) && ids.add(r.userId));
    proposals.forEach((p) => p.userId && !baseUserIds.has(p.userId) && ids.add(p.userId));
    writings.forEach((w) => w.userId && !baseUserIds.has(w.userId) && ids.add(w.userId));
    if (papersBundles) {
      for (const uid of papersBundles.keys()) if (!baseUserIds.has(uid)) ids.add(uid);
    }
    if (sessionBundles) {
      for (const uid of sessionBundles.keys()) if (!baseUserIds.has(uid)) ids.add(uid);
    }
    return Array.from(ids);
  }, [reports, proposals, writings, papersBundles, sessionBundles, baseUserIds]);

  const { data: extraUsers = [] } = useQuery({
    queryKey: ["console-research", "extra-users", dataOnlyUserIds.slice().sort().join(",")],
    queryFn: async () => {
      if (dataOnlyUserIds.length === 0) return [] as User[];
      const results = await Promise.allSettled(
        dataOnlyUserIds.map((id) => profilesApi.get(id)),
      );
      return results
        .map((r) => (r.status === "fulfilled" ? (r.value.data as User | undefined) : undefined))
        .filter((u): u is User => !!u);
    },
    enabled: dataOnlyUserIds.length > 0,
  });

  const users = useMemo(() => [...baseUsers, ...extraUsers], [baseUsers, extraUsers]);

  const summaries: UserResearchSummary[] = useMemo(() => {
    const reportMap = new Map(reports.map((r) => [r.userId, r]));
    const proposalMap = new Map<string, ResearchProposal>();
    for (const p of proposals) {
      const existing = proposalMap.get(p.userId);
      if (!existing || (p.updatedAt ?? "").localeCompare(existing.updatedAt ?? "") > 0) {
        proposalMap.set(p.userId, p);
      }
    }
    const writingMap = new Map<string, WritingPaper>();
    for (const w of writings) {
      const existing = writingMap.get(w.userId);
      if (!existing || (w.updatedAt ?? "").localeCompare(existing.updatedAt ?? "") > 0) {
        writingMap.set(w.userId, w);
      }
    }
    return users
      .map((u) => {
        const report = reportMap.get(u.id);
        const proposal = proposalMap.get(u.id);
        const writing = writingMap.get(u.id);
        const papers = papersBundles?.get(u.id) ?? [];
        const sessions = sessionBundles?.get(u.id) ?? [];
        const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
        const reportProgress = calcReportProgress(report);
        const proposalProgress = calcProposalProgress(proposal);
        const writingCharCount = calcWritingCharCount(writing);
        const lastActivityAt = [
          report?.updatedAt,
          proposal?.updatedAt ?? proposal?.lastSavedAt,
          writing?.updatedAt ?? writing?.lastSavedAt,
          sessions
            .map((s) => s.endTime ?? s.startTime)
            .filter(Boolean)
            .sort()
            .pop(),
        ]
          .filter((x): x is string => !!x)
          .sort()
          .pop();
        return {
          user: u,
          report,
          proposal,
          writing,
          papers,
          sessions,
          totalMinutes,
          reportProgress,
          proposalProgress,
          writingCharCount,
          lastActivityAt,
        };
      })
      .filter(
        (s) =>
          s.report ||
          s.proposal ||
          s.writing ||
          s.papers.length > 0 ||
          s.sessions.length > 0,
      );
  }, [users, reports, proposals, writings, papersBundles, sessionBundles]);

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
    const writingCount = summaries.filter((s) => !!s.writing).length;
    const proposalCount = summaries.filter((s) => !!s.proposal).length;
    const reportCount = summaries.filter((s) => !!s.report).length;
    const paperCount = summaries.reduce((acc, s) => acc + s.papers.length, 0);
    const totalMinutes = summaries.reduce((acc, s) => acc + s.totalMinutes, 0);
    return { writingCount, proposalCount, reportCount, paperCount, totalMinutes };
  }, [summaries]);

  const loading =
    loadingProfiles ||
    loadingReports ||
    loadingProposals ||
    loadingWritings ||
    loadingPapers ||
    loadingSessions;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={FlaskConical}
        title="회원 연구활동"
        description="회원별로 논문 작성·논문 읽기·연구 리포트 데이터를 탭으로 확인합니다."
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="작성중인 논문" value={`${stats.writingCount}`} unit="명" icon={PenLine} />
        <StatCard label="읽은 논문 노트" value={`${stats.paperCount}`} unit="편" icon={BookOpen} />
        <StatCard label="작성중인 계획서" value={`${stats.proposalCount}`} unit="건" icon={ClipboardList} />
        <StatCard label="작성중인 보고서" value={`${stats.reportCount}`} unit="건" icon={FileText} />
        <StatCard label="누적 타이머" value={`${Math.floor(stats.totalMinutes / 60)}`} unit="시간" icon={Clock} />
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
  const {
    user,
    report,
    proposal,
    writing,
    papers,
    sessions,
    totalMinutes,
    reportProgress,
    proposalProgress,
    writingCharCount,
    lastActivityAt,
  } = summary;

  const writingSessions = sessions.filter((s) => s.type === "writing");
  const readingSessions = sessions.filter((s) => s.type === "reading");
  const writingMinutes = writingSessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
  const readingMinutes = readingSessions.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);

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
              <PenLine size={11} /> 논문 {writingCharCount.toLocaleString()}자
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={11} /> 읽기 {papers.length}편
            </span>
            <span className="inline-flex items-center gap-1">
              <ClipboardList size={11} /> 계획서 {proposalProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText size={11} /> 보고서 {reportProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {formatHours(totalMinutes)}
            </span>
            <span>최근: {formatDate(lastActivityAt)}</span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-4 text-sm">
          <Tabs defaultValue="writing" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
              <TabsTrigger value="writing" className="flex items-center gap-1.5 text-xs">
                <PenLine size={12} />
                논문 작성
              </TabsTrigger>
              <TabsTrigger value="reading" className="flex items-center gap-1.5 text-xs">
                <BookOpen size={12} />
                논문 읽기
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-1.5 text-xs">
                <FileText size={12} />
                연구 리포트
              </TabsTrigger>
            </TabsList>

            <TabsContent value="writing" className="mt-3 space-y-3">
              <WritingTab
                writing={writing}
                charCount={writingCharCount}
                writingMinutes={writingMinutes}
                writingSessionCount={writingSessions.length}
                userId={user.id}
              />
            </TabsContent>

            <TabsContent value="reading" className="mt-3 space-y-3">
              <ReadingTab
                papers={papers}
                readingMinutes={readingMinutes}
                readingSessionCount={readingSessions.length}
                userId={user.id}
              />
            </TabsContent>

            <TabsContent value="report" className="mt-3 space-y-3">
              <ReportTab
                report={report}
                proposal={proposal}
                reportProgress={reportProgress}
                proposalProgress={proposalProgress}
                userId={user.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </li>
  );
}

function WritingTab({
  writing,
  charCount,
  writingMinutes,
  writingSessionCount,
  userId,
}: {
  writing?: WritingPaper;
  charCount: number;
  writingMinutes: number;
  writingSessionCount: number;
  userId: string;
}) {
  if (!writing) {
    return (
      <DetailBlock title="논문 작성">
        <p className="text-xs text-muted-foreground">아직 논문 작성을 시작하지 않았습니다.</p>
      </DetailBlock>
    );
  }
  const chapters = writing.chapters ?? {};
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailBlock title="논문 정보">
        <div className="space-y-2 text-xs">
          <KV label="제목" value={writing.title || "(제목 없음)"} />
          <KV label="총 글자수" value={`${charCount.toLocaleString()}자`} />
          <KV label="작성 타이머" value={`${writingSessionCount}회 · ${formatHours(writingMinutes)}`} />
          <div className="pt-1 text-[11px] text-muted-foreground">
            마지막 저장: {formatDate(writing.updatedAt ?? writing.lastSavedAt)}
          </div>
          <div className="pt-2">
            <Link
              href={`/profile/${userId}`}
              className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-3 text-[11px] font-medium hover:bg-accent"
            >
              프로필 보기
            </Link>
          </div>
        </div>
      </DetailBlock>
      <DetailBlock title="장별 진행">
        <div className="space-y-1.5 text-xs">
          {WRITING_CHAPTER_KEYS.map((key) => {
            const text = chapters[key] ?? "";
            const len = text.length;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">
                  {WRITING_CHAPTER_LABELS[key] ?? key}
                </span>
                <div className="flex-1">
                  <ProgressBar value={Math.min(100, (len / 1500) * 100)} />
                </div>
                <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                  {len.toLocaleString()}자
                </span>
              </div>
            );
          })}
          <p className="pt-1 text-[10px] text-muted-foreground">
            ※ 1,500자를 100%로 환산한 시각화입니다.
          </p>
        </div>
      </DetailBlock>
    </div>
  );
}

function ReadingTab({
  papers,
  readingMinutes,
  readingSessionCount,
  userId,
}: {
  papers: ResearchPaper[];
  readingMinutes: number;
  readingSessionCount: number;
  userId: string;
}) {
  if (papers.length === 0 && readingSessionCount === 0) {
    return (
      <DetailBlock title="논문 읽기">
        <p className="text-xs text-muted-foreground">아직 정리한 논문이 없습니다.</p>
      </DetailBlock>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailBlock title="요약">
        <div className="space-y-2 text-xs">
          <KV label="정리한 논문" value={`${papers.length}편`} />
          <KV label="읽기 타이머" value={`${readingSessionCount}회 · ${formatHours(readingMinutes)}`} />
          <div className="pt-2">
            <Link
              href={`/profile/${userId}`}
              className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-3 text-[11px] font-medium hover:bg-accent"
            >
              프로필 보기
            </Link>
          </div>
        </div>
      </DetailBlock>
      <DetailBlock title={`최근 정리 논문 (${papers.length > 5 ? "최근 5편" : `${papers.length}편`})`}>
        {papers.length === 0 ? (
          <p className="text-xs text-muted-foreground">정리된 논문이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {papers.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-start gap-1.5">
                <BookOpen size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title || "(제목 없음)"}</p>
                  {(p.authors || p.year) && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {[p.authors, p.year].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailBlock>
    </div>
  );
}

function ReportTab({
  report,
  proposal,
  reportProgress,
  proposalProgress,
  userId,
}: {
  report?: ResearchReport;
  proposal?: ResearchProposal;
  reportProgress: number;
  proposalProgress: number;
  userId: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailBlock title="연구 계획서">
        {proposal ? (
          <div className="space-y-2 text-xs">
            <KV label="국문 제목" value={proposal.titleKo} />
            <KV label="영문 제목" value={proposal.titleEn} />
            <KV label="연구 목적" value={proposal.purpose?.slice(0, 80)} />
            <KV label="연구 방법" value={proposal.method?.slice(0, 80)} />
            <KV
              label="참고문헌"
              value={`${proposal.referencePaperIds?.length ?? 0}편`}
            />
            <div className="pt-1 text-[11px] text-muted-foreground">
              마지막 수정: {formatDate(proposal.updatedAt ?? proposal.lastSavedAt)}
            </div>
            <div className="pt-1">
              <ProgressBar value={proposalProgress} />
              <div className="mt-1 text-[10px] text-muted-foreground">진행률 {proposalProgress}%</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">아직 작성된 계획서가 없습니다.</p>
        )}
      </DetailBlock>

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
            <div className="pt-1">
              <ProgressBar value={reportProgress} />
              <div className="mt-1 text-[10px] text-muted-foreground">진행률 {reportProgress}%</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href={`/console/research/${userId}`}
                className="flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                자세히 보기
              </Link>
              <Link
                href={`/profile/${userId}`}
                className="flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                프로필
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">아직 작성된 보고서가 없습니다.</p>
        )}
      </DetailBlock>
    </div>
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
