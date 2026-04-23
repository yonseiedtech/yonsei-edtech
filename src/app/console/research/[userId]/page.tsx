"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowLeft,
  FlaskConical,
  BookOpen,
  Clock,
  FileText,
  ExternalLink,
  Calendar,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import ResearchReportEditor from "@/features/research/ResearchReportEditor";
import { Badge } from "@/components/ui/badge";
import {
  profilesApi,
  researchPapersApi,
  studySessionsApi,
  researchReportsApi,
} from "@/lib/bkend";
import type { User, ResearchPaper, StudySession, ResearchReport } from "@/types";
import { cn } from "@/lib/utils";

function formatDate(iso?: string | null): string {
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

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

export default function ConsoleResearchUserDetailPage() {
  const params = useParams();
  const userId = String(params.userId ?? "");

  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ["console-research-detail", "user", userId],
    enabled: !!userId,
    queryFn: () => profilesApi.get(userId),
  });

  const user = userData as User | undefined;

  const { data: reportData } = useQuery({
    queryKey: ["console-research-detail", "report", userId],
    enabled: !!userId,
    queryFn: async () => {
      const r = await researchReportsApi.listByUser(userId);
      return (r.data ?? [])[0] as ResearchReport | undefined;
    },
  });

  const { data: papersData } = useQuery({
    queryKey: ["console-research-detail", "papers", userId],
    enabled: !!userId,
    queryFn: () => researchPapersApi.list(userId),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["console-research-detail", "sessions", userId],
    enabled: !!userId,
    queryFn: () => studySessionsApi.listByUser(userId),
  });

  const papers: ResearchPaper[] = papersData?.data ?? [];
  const sessions: StudySession[] = sessionsData?.data ?? [];

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) =>
        (b.startTime ?? "").localeCompare(a.startTime ?? ""),
      ),
    [sessions],
  );

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);

  const sessionsByType = useMemo(() => {
    const m = new Map<string, { count: number; minutes: number }>();
    sessions.forEach((s) => {
      const prev = m.get(s.type) ?? { count: 0, minutes: 0 };
      m.set(s.type, {
        count: prev.count + 1,
        minutes: prev.minutes + (s.durationMinutes ?? 0),
      });
    });
    return Array.from(m.entries());
  }, [sessions]);

  if (loadingUser) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="p-8 text-center text-sm text-muted-foreground">회원 정보 불러오는 중…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          회원을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <ConsolePageHeader
        icon={FlaskConical}
        title={`${user.name} 회원의 연구활동`}
        description={`${user.username} · ${user.field ?? "관심분야 미입력"}${
          user.generation ? ` · ${user.generation}기` : ""
        }`}
        actions={
          <Link
            href={`/profile/${user.id}`}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            프로필 <ExternalLink size={12} />
          </Link>
        }
      />

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={FileText}
          label="보고서 상태"
          value={reportData ? "작성 중" : "미작성"}
          hint={reportData ? `수정: ${formatDate(reportData.updatedAt)}` : "—"}
        />
        <StatCard icon={BookOpen} label="정리한 논문" value={`${papers.length}편`} />
        <StatCard icon={Clock} label="타이머 세션" value={`${sessions.length}회`} />
        <StatCard icon={Clock} label="누적 시간" value={formatHours(totalMinutes)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* 연구 보고서 (읽기 전용) */}
        <section className="min-w-0 rounded-lg border bg-card p-1">
          <div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            연구 보고서 (읽기 전용)
          </div>
          <div className="p-3">
            <ResearchReportEditor user={user} readOnly />
          </div>
        </section>

        {/* 사이드: 논문 + 세션 */}
        <aside className="space-y-4">
          <Panel title="정리한 논문" count={papers.length} icon={BookOpen}>
            {papers.length === 0 ? (
              <EmptyHint text="아직 정리한 논문이 없습니다." />
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {papers.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border border-border/60 bg-background px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium">{p.title || "(제목 없음)"}</p>
                    {p.authors && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {p.authors}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {p.venue && <span className="truncate">{p.venue}</span>}
                      {p.year && <span>· {p.year}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="타이머 세션 유형별" count={sessionsByType.length} icon={Clock}>
            {sessionsByType.length === 0 ? (
              <EmptyHint text="세션 기록이 없습니다." />
            ) : (
              <ul className="space-y-1.5 text-xs">
                {sessionsByType.map(([type, info]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between rounded border border-border/60 bg-background px-2 py-1.5"
                  >
                    <Badge variant="secondary" className="text-[10px]">
                      {type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {info.count}회 · {formatHours(info.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="최근 세션" count={Math.min(10, sessions.length)} icon={Calendar}>
            {sortedSessions.length === 0 ? (
              <EmptyHint text="세션 기록이 없습니다." />
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1 text-xs">
                {sortedSessions.slice(0, 10).map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-border/60 bg-background px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {s.targetTitle || s.type}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatHours(s.durationMinutes ?? 0)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{formatDateTime(s.startTime)}</span>
                      <span
                        className={cn(
                          "rounded px-1",
                          s.source === "timer"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {s.source}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/console/research"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={12} /> 연구활동 목록으로
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon size={12} /> {title}
        </div>
        <span className="text-[11px] text-muted-foreground">{count}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-muted-foreground">{text}</p>;
}
