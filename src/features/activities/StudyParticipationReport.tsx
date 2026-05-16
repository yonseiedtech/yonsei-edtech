"use client";

/**
 * 스터디 참여도 리포트 (Sprint 5 — Study Enhancement)
 * - 회원별 출석/회고/과제 통계 + 종합 점수 (출석 50% + 회고 25% + 과제 25%)
 * - 회차×참여자 매트릭스 (히트맵)
 * - 인쇄 친화 레이아웃 (window.print)
 * - 운영진/리더 전용 — ActivityDetail 가드에서 처리
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquareQuote,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  studySessionReflectionsApi,
  studyAssignmentsApi,
  studyAssignmentSubmissionsApi,
  profilesApi,
} from "@/lib/bkend";
import type {
  ActivityProgress,
  StudySessionReflection,
  StudyAssignment,
  StudyAssignmentSubmission,
  User,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  activityId: string;
  activityTitle: string;
  progressList: ActivityProgress[];
  participantIds: string[];
  guestParticipants: { id: string; name: string }[];
  participantRoles: Record<string, string>;
  leaderId?: string;
}

interface MemberStat {
  id: string;
  name: string;
  isLeader: boolean;
  role?: string;
  attendedCount: number;
  attendedTotal: number;
  reflectionCount: number;
  assignmentCompleted: number;
  assignmentTotal: number;
  /** 0~100 */
  score: number;
}

const SCORE_WEIGHTS = {
  attendance: 0.5,
  reflection: 0.25,
  assignment: 0.25,
} as const;

export default function StudyParticipationReport({
  activityId,
  activityTitle,
  progressList,
  participantIds,
  guestParticipants,
  participantRoles,
  leaderId,
}: Props) {
  const { data: reflectionsRes, isLoading: rLoad } = useQuery({
    queryKey: ["study-report", "reflections", activityId],
    queryFn: () => studySessionReflectionsApi.listByActivity(activityId),
  });
  const { data: assignmentsRes, isLoading: aLoad } = useQuery({
    queryKey: ["study-report", "assignments", activityId],
    queryFn: () => studyAssignmentsApi.listByActivity(activityId),
  });
  const { data: submissionsRes, isLoading: sLoad } = useQuery({
    queryKey: ["study-report", "submissions", activityId],
    queryFn: () => studyAssignmentSubmissionsApi.listByActivity(activityId),
  });

  // 회원 프로필 (게스트 제외)
  const realMemberIds = useMemo(
    () => participantIds.filter((id) => !id.startsWith("guest_")),
    [participantIds],
  );
  const { data: memberUsers = [] } = useQuery({
    queryKey: ["study-report", "members", realMemberIds.join(",")],
    enabled: realMemberIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        realMemberIds.map(async (uid) => {
          try {
            return (await profilesApi.get(uid)) as User;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((u): u is User => !!u);
    },
  });

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    (memberUsers as User[]).forEach((u) => m.set(u.id, u.name));
    guestParticipants.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [memberUsers, guestParticipants]);

  const reflections = (reflectionsRes?.data as StudySessionReflection[]) ?? [];
  const assignments = (assignmentsRes?.data as StudyAssignment[]) ?? [];
  const submissions = (submissionsRes?.data as StudyAssignmentSubmission[]) ?? [];

  const sortedProgress = useMemo(
    () =>
      progressList
        .slice()
        .sort((a, b) => (a.week ?? 0) - (b.week ?? 0)),
    [progressList],
  );

  const stats: MemberStat[] = useMemo(() => {
    const totalWeeks = sortedProgress.length;
    const totalAssignments = assignments.length;

    return participantIds.map((pid) => {
      const attendedCount = sortedProgress.filter((p) =>
        ((p.attendedUserIds as string[] | undefined) ?? []).includes(pid),
      ).length;

      const reflectionCount = reflections.filter((r) => r.userId === pid).length;

      const assignmentCompleted = submissions.filter(
        (s) => s.userId === pid && s.status === "completed",
      ).length;

      const attendanceScore = totalWeeks > 0 ? attendedCount / totalWeeks : 0;
      const reflectionScore = totalWeeks > 0 ? Math.min(1, reflectionCount / totalWeeks) : 0;
      const assignmentScore =
        totalAssignments > 0 ? Math.min(1, assignmentCompleted / totalAssignments) : 0;

      const score = Math.round(
        (attendanceScore * SCORE_WEIGHTS.attendance +
          reflectionScore * SCORE_WEIGHTS.reflection +
          assignmentScore * SCORE_WEIGHTS.assignment) *
          100,
      );

      return {
        id: pid,
        name: nameMap.get(pid) ?? "(이름 미확인)",
        isLeader: pid === leaderId,
        role: participantRoles[pid],
        attendedCount,
        attendedTotal: totalWeeks,
        reflectionCount,
        assignmentCompleted,
        assignmentTotal: totalAssignments,
        score,
      };
    });
  }, [
    participantIds,
    sortedProgress,
    reflections,
    submissions,
    assignments,
    nameMap,
    leaderId,
    participantRoles,
  ]);

  const sortedStats = useMemo(
    () => [...stats].sort((a, b) => b.score - a.score),
    [stats],
  );

  const aggregate = useMemo(() => {
    const n = participantIds.length;
    const totalWeeks = sortedProgress.length;
    const totalAssignments = assignments.length;
    if (n === 0) {
      return {
        avgScore: 0,
        avgAttendance: 0,
        totalReflections: reflections.length,
        avgReflections: 0,
        totalSubmissions: submissions.filter((s) => s.status === "completed").length,
      };
    }
    const sum = stats.reduce(
      (acc, s) => {
        acc.score += s.score;
        acc.att += s.attendedCount;
        acc.ref += s.reflectionCount;
        acc.sub += s.assignmentCompleted;
        return acc;
      },
      { score: 0, att: 0, ref: 0, sub: 0 },
    );
    return {
      avgScore: Math.round(sum.score / n),
      avgAttendance: totalWeeks > 0 ? Math.round((sum.att / (n * totalWeeks)) * 100) : 0,
      totalReflections: sum.ref,
      avgReflections: Number((sum.ref / n).toFixed(1)),
      totalSubmissions: sum.sub,
      avgSubmissions:
        totalAssignments > 0 ? Math.round((sum.sub / (n * totalAssignments)) * 100) : 0,
    };
  }, [stats, participantIds.length, sortedProgress.length, assignments.length, reflections.length, submissions]);

  if (rLoad || aLoad || sLoad) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 통계 계산 중…
      </div>
    );
  }

  // 회차×참여자 매트릭스 cell
  function cellState(pid: string, p: ActivityProgress) {
    const attended = ((p.attendedUserIds as string[] | undefined) ?? []).includes(pid);
    const hasReflection = reflections.some(
      (r) => r.userId === pid && r.activityProgressId === p.id,
    );
    const weekAssignments = assignments.filter((a) => a.activityProgressId === p.id);
    const weekCompleted = weekAssignments.filter((a) =>
      submissions.some(
        (s) => s.userId === pid && s.assignmentId === a.id && s.status === "completed",
      ),
    ).length;
    return {
      attended,
      hasReflection,
      assignmentRatio:
        weekAssignments.length > 0 ? weekCompleted / weekAssignments.length : null,
    };
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp size={14} /> 참여도 리포트
          <Badge variant="outline" className="text-[10px]">
            가중치 출석 50% · 회고 25% · 과제 25%
          </Badge>
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => window.print()}
        >
          <Printer size={11} /> 인쇄 / PDF 저장
        </Button>
      </div>

      {/* 인쇄용 제목 — 화면에서는 안 보임 */}
      <div className="hidden print:block">
        <h1 className="text-lg font-bold">{activityTitle} — 참여도 리포트</h1>
        <p className="text-xs text-muted-foreground">
          생성: {new Date().toLocaleString("ko-KR")}
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Users size={14} />}
          label="참여자"
          value={`${participantIds.length}명`}
        />
        <SummaryCard
          icon={<Calendar size={14} />}
          label="평균 출석률"
          value={`${aggregate.avgAttendance}%`}
        />
        <SummaryCard
          icon={<MessageSquareQuote size={14} />}
          label="누적 회고"
          value={`${aggregate.totalReflections}건 (평균 ${aggregate.avgReflections})`}
        />
        <SummaryCard
          icon={<ClipboardList size={14} />}
          label="과제 완료율"
          value={`${aggregate.avgSubmissions ?? 0}%`}
          highlight
        />
      </div>

      {/* 회차×참여자 매트릭스 */}
      <div className="overflow-x-auto rounded-2xl border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold">
          <Calendar size={12} /> 회차×참여자 매트릭스
          <span className="text-[10px] font-normal text-muted-foreground">
            ⬛ 출석 · ⚪ 미출석 · 🔵 회고 작성 · 🟢 과제 완료(%)
          </span>
        </h3>
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 pr-2">참여자</th>
              {sortedProgress.map((p, idx) => (
                <th key={p.id} className="px-1 py-1 text-center">
                  <div className="text-[10px]">W{idx + 1}</div>
                  <div className="text-[9px] text-muted-foreground/70">{p.date?.slice(5)}</div>
                </th>
              ))}
              <th className="py-1 pl-2 text-center">점수</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0">
                <td className="py-1.5 pr-2 font-medium">
                  {s.name}
                  {s.isLeader && (
                    <span className="ml-1 text-[9px] text-amber-600">(리더)</span>
                  )}
                  {!s.isLeader && s.role && (
                    <span className="ml-1 text-[9px] text-muted-foreground">({s.role})</span>
                  )}
                </td>
                {sortedProgress.map((p) => {
                  const c = cellState(s.id, p);
                  return (
                    <td key={p.id} className="px-1 py-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            "inline-flex h-3 w-3 items-center justify-center rounded-sm",
                            c.attended
                              ? "bg-emerald-500"
                              : "border border-muted-foreground/30 bg-background",
                          )}
                          title={c.attended ? "출석" : "미출석"}
                        />
                        <span className="flex items-center gap-0.5 text-[9px]">
                          {c.hasReflection && (
                            <span className="text-blue-600" title="회고">●</span>
                          )}
                          {c.assignmentRatio !== null && (
                            <span
                              className={cn(
                                c.assignmentRatio === 1
                                  ? "text-emerald-600"
                                  : c.assignmentRatio > 0
                                    ? "text-amber-600"
                                    : "text-muted-foreground/50",
                              )}
                              title={`과제 ${Math.round(c.assignmentRatio * 100)}%`}
                            >
                              {Math.round(c.assignmentRatio * 100)}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-2 text-center font-semibold">
                  <Badge
                    className={cn(
                      "text-[10px]",
                      s.score >= 80
                        ? "bg-emerald-100 text-emerald-800"
                        : s.score >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.score}
                  </Badge>
                </td>
              </tr>
            ))}
            {sortedStats.length === 0 && (
              <tr>
                <td colSpan={sortedProgress.length + 2} className="py-6 text-center text-muted-foreground">
                  참여자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 회원별 상세 카드 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sortedStats.map((s, rank) => (
          <div
            key={s.id}
            className={cn(
              "rounded-xl border bg-card p-3",
              rank === 0 && s.score >= 80 && "border-emerald-300 bg-emerald-50/40",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {rank < 3 && s.score >= 80 && (
                  <Award size={14} className="text-amber-500" />
                )}
                <span className="text-sm font-semibold">{s.name}</span>
                {s.isLeader && (
                  <Badge variant="outline" className="text-[9px]">
                    리더
                  </Badge>
                )}
                {!s.isLeader && s.role && (
                  <Badge variant="outline" className="text-[9px]">
                    {s.role}
                  </Badge>
                )}
              </div>
              <Badge
                className={cn(
                  "text-[10px]",
                  s.score >= 80
                    ? "bg-emerald-100 text-emerald-800"
                    : s.score >= 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {s.score}점
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
              <StatChip
                icon={<CheckCircle2 size={10} />}
                label="출석"
                value={`${s.attendedCount}/${s.attendedTotal}`}
              />
              <StatChip
                icon={<MessageSquareQuote size={10} />}
                label="회고"
                value={`${s.reflectionCount}건`}
              />
              <StatChip
                icon={<ClipboardList size={10} />}
                label="과제"
                value={
                  s.assignmentTotal > 0
                    ? `${s.assignmentCompleted}/${s.assignmentTotal}`
                    : "—"
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background px-1.5 py-1 text-center">
      <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-[11px] font-semibold text-foreground">{value}</div>
    </div>
  );
}
