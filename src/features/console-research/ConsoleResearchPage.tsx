"use client";

import { useMemo, useState } from "react";
import {
  FlaskConical,
  Search,
  BookOpen,
  Clock,
  FileText,
  ClipboardList,
  PenLine,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  profilesApi,
  researchReportsApi,
  researchPapersApi,
  studySessionsApi,
  researchProposalsApi,
  researchDesignsApi,
  writingPapersApi,
} from "@/lib/bkend";
import type {
  User,
  ResearchReport,
  ResearchPaper,
  StudySession,
  ResearchProposal,
  ResearchDesign,
  WritingPaper,
} from "@/types";
import { computeDesignProgress } from "@/types/research-design";
import { cn } from "@/lib/utils";
import type { UserResearchSummary } from "./types";
import { ResearchRow } from "./ResearchRow";

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

  const { data: designsData, isLoading: loadingDesigns } = useQuery({
    queryKey: ["console-research", "designs"],
    queryFn: () => researchDesignsApi.listAll(500),
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

  const baseUsers = useMemo(() => (profilesData?.data ?? []) as User[], [profilesData]);
  const reports = useMemo(() => (reportsData?.data ?? []) as ResearchReport[], [reportsData]);
  const proposals = useMemo(() => (proposalsData?.data ?? []) as ResearchProposal[], [proposalsData]);
  const designs = useMemo(() => (designsData?.data ?? []) as ResearchDesign[], [designsData]);
  const writings = useMemo(() => (writingsData?.data ?? []) as WritingPaper[], [writingsData]);

  // 연구 데이터가 있지만 approved 회원 목록에 없는 userId(예: 관리자, 미승인)를 별도 조회.
  const baseUserIds = useMemo(() => new Set(baseUsers.map((u) => u.id)), [baseUsers]);
  const dataOnlyUserIds = useMemo(() => {
    const ids = new Set<string>();
    reports.forEach((r) => r.userId && !baseUserIds.has(r.userId) && ids.add(r.userId));
    proposals.forEach((p) => p.userId && !baseUserIds.has(p.userId) && ids.add(p.userId));
    designs.forEach((d) => d.userId && !baseUserIds.has(d.userId) && ids.add(d.userId));
    writings.forEach((w) => w.userId && !baseUserIds.has(w.userId) && ids.add(w.userId));
    if (papersBundles) {
      for (const uid of papersBundles.keys()) if (!baseUserIds.has(uid)) ids.add(uid);
    }
    if (sessionBundles) {
      for (const uid of sessionBundles.keys()) if (!baseUserIds.has(uid)) ids.add(uid);
    }
    return Array.from(ids);
  }, [reports, proposals, designs, writings, papersBundles, sessionBundles, baseUserIds]);

  const { data: extraUsers = [] } = useQuery({
    queryKey: ["console-research", "extra-users", dataOnlyUserIds.slice().sort().join(",")],
    queryFn: async () => {
      if (dataOnlyUserIds.length === 0) return [] as User[];
      const results = await Promise.allSettled(
        dataOnlyUserIds.map((id) => profilesApi.get(id)),
      );
      return results
        // QA-v3 M: profilesApi.get 은 User 를 직접 반환 — .data 참조는 항상 undefined 였음
        .map((r) => (r.status === "fulfilled" ? (r.value as unknown as User | undefined) : undefined))
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
    const designMap = new Map<string, ResearchDesign>();
    for (const d of designs) {
      const existing = designMap.get(d.userId);
      if (!existing || (d.updatedAt ?? "").localeCompare(existing.updatedAt ?? "") > 0) {
        designMap.set(d.userId, d);
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
        const design = designMap.get(u.id);
        const writing = writingMap.get(u.id);
        const papers = papersBundles?.get(u.id) ?? [];
        const sessions = sessionBundles?.get(u.id) ?? [];
        const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
        const reportProgress = calcReportProgress(report);
        const proposalProgress = calcProposalProgress(proposal);
        const designProgress = computeDesignProgress(design);
        const writingCharCount = calcWritingCharCount(writing);
        const lastActivityAt = [
          report?.updatedAt,
          proposal?.updatedAt ?? proposal?.lastSavedAt,
          design?.updatedAt ?? design?.lastSavedAt,
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
          design,
          writing,
          papers,
          sessions,
          totalMinutes,
          reportProgress,
          proposalProgress,
          designProgress,
          writingCharCount,
          lastActivityAt,
        };
      })
      .filter(
        (s) =>
          s.report ||
          s.proposal ||
          s.design ||
          s.writing ||
          s.papers.length > 0 ||
          s.sessions.length > 0,
      );
  }, [users, reports, proposals, designs, writings, papersBundles, sessionBundles]);

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
    loadingDesigns ||
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
          <EmptyState compact icon={FlaskConical} title="아직 연구활동을 시작한 회원이 없습니다." />
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
