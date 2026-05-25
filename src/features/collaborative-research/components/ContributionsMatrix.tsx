"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Calendar, Target, MessageSquare, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { profilesApi } from "@/lib/bkend";
import {
  useChapters,
  useMeetings,
  useMilestones,
} from "../api/useCollabPhase2";
import { useCollabMembers } from "../api/useCollabResearch";
import { useArticlesByResearch } from "@/features/journal/api/useJournal";
import {
  CREDIT_ROLE_LABELS,
  CREDIT_ROLES_ORDERED,
} from "../lib/credit-roles";
import type { CollabResearchMember, CreditRole, User } from "@/types";

interface Props {
  researchId: string;
}

interface ActivityCount {
  chapterEdits: number;
  meetings: number;
  milestones: number;
  publications: number;
  totalScore: number;
}

export default function ContributionsMatrix({ researchId }: Props) {
  const { data: members = [] } = useCollabMembers(researchId);
  const { data: chapters = [] } = useChapters(researchId);
  const { data: meetings = [] } = useMeetings(researchId);
  const { data: milestones = [] } = useMilestones(researchId);
  const { data: articles = [] } = useArticlesByResearch(researchId);

  const userIds = useMemo(() => members.map((m) => m.userId), [members]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["users", "by-ids", userIds.sort().join(",")],
    queryFn: () => profilesApi.listByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });
  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  /** userId 별 활동 카운트 */
  const activityByUser = useMemo(() => {
    const out = new Map<string, ActivityCount>();
    for (const m of members) {
      out.set(m.userId, {
        chapterEdits: 0,
        meetings: 0,
        milestones: 0,
        publications: 0,
        totalScore: 0,
      });
    }
    // 챕터: lastEditedBy 가산 (실제로는 streak_events 누계가 더 정확하지만 Phase 4 MVP 에서는 마지막 수정자 단순 가산)
    for (const c of chapters) {
      if (c.lastEditedBy && out.has(c.lastEditedBy)) {
        const cur = out.get(c.lastEditedBy)!;
        cur.chapterEdits += 1;
        cur.totalScore += 2;
      }
    }
    // 미팅: recordedBy
    for (const mt of meetings) {
      if (mt.recordedBy && out.has(mt.recordedBy)) {
        const cur = out.get(mt.recordedBy)!;
        cur.meetings += 1;
        cur.totalScore += 3;
      }
    }
    // 마일스톤: 완료된 것의 assigneeIds
    for (const ms of milestones) {
      if (ms.status === "done") {
        for (const uid of ms.assigneeIds) {
          if (out.has(uid)) {
            const cur = out.get(uid)!;
            cur.milestones += 1;
            cur.totalScore += 5;
          }
        }
      }
    }
    // 출판: published 의 저자들
    for (const a of articles) {
      if (a.reviewStatus === "published") {
        for (const au of a.authors) {
          if (out.has(au.userId)) {
            const cur = out.get(au.userId)!;
            cur.publications += 1;
            cur.totalScore += 10;
          }
        }
      }
    }
    return out;
  }, [members, chapters, meetings, milestones, articles]);

  // 정렬: 점수 내림차순
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aScore = activityByUser.get(a.userId)?.totalScore ?? 0;
      const bScore = activityByUser.get(b.userId)?.totalScore ?? 0;
      return bScore - aScore;
    });
  }, [members, activityByUser]);

  // CRediT 매트릭스: 역할별 채택자 수 + 채택자 명단
  const creditRoleStats = useMemo(() => {
    const m = new Map<CreditRole, CollabResearchMember[]>();
    for (const role of CREDIT_ROLES_ORDERED) m.set(role, []);
    for (const member of members) {
      for (const role of member.creditRoles ?? []) {
        m.get(role)?.push(member);
      }
    }
    return m;
  }, [members]);

  return (
    <div className="space-y-6">
      {/* 활동량 매트릭스 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={18} />
            활동량 매트릭스 ({members.length}명)
          </CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            챕터 편집 +2 / 회의 기록 +3 / 마일스톤 완료 +5 / 발간 +10 ·{" "}
            <strong>발간 후 변경되는 누적 표시</strong>입니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="py-2 pr-4">멤버</th>
                  <th className="py-2 pr-4 text-center">
                    <FileText size={12} className="inline" /> 챕터
                  </th>
                  <th className="py-2 pr-4 text-center">
                    <Calendar size={12} className="inline" /> 회의
                  </th>
                  <th className="py-2 pr-4 text-center">
                    <Target size={12} className="inline" /> 마일스톤
                  </th>
                  <th className="py-2 pr-4 text-center">
                    <BookOpen size={12} className="inline" /> 발간
                  </th>
                  <th className="py-2 pr-4 text-right font-semibold">총점</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => {
                  const a = activityByUser.get(m.userId) ?? {
                    chapterEdits: 0,
                    meetings: 0,
                    milestones: 0,
                    publications: 0,
                    totalScore: 0,
                  };
                  const profile = userMap.get(m.userId);
                  return (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{profile?.name ?? m.userId.slice(0, 8)}</span>
                        <span className="ml-2 text-xs text-zinc-500">{m.role}</span>
                      </td>
                      <td className="py-2 pr-4 text-center">{a.chapterEdits}</td>
                      <td className="py-2 pr-4 text-center">{a.meetings}</td>
                      <td className="py-2 pr-4 text-center">{a.milestones}</td>
                      <td className="py-2 pr-4 text-center">{a.publications}</td>
                      <td className="py-2 pr-4 text-right font-semibold">
                        {a.totalScore}
                      </td>
                    </tr>
                  );
                })}
                {sortedMembers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                      멤버가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CRediT 매트릭스 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CRediT 역할 분포</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            각 표준 역할별로 채택한 멤버 명단. 멤버 페이지에서 본인 역할을 조정하세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_ROLES_ORDERED.map((role) => {
              const claimed = creditRoleStats.get(role) ?? [];
              return (
                <div
                  key={role}
                  className={`rounded border p-2 ${
                    claimed.length === 0
                      ? "border-zinc-200 bg-zinc-50"
                      : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{CREDIT_ROLE_LABELS[role]}</p>
                    <span className="text-xs text-zinc-500">{claimed.length}명</span>
                  </div>
                  {claimed.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-700">
                      {claimed
                        .map((m) => userMap.get(m.userId)?.name ?? m.userId.slice(0, 6))
                        .join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 댓글 요약 (간단) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare size={18} /> 진행 현황 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center text-sm sm:grid-cols-4">
            <SummaryCell label="챕터" value={chapters.length} />
            <SummaryCell label="회의" value={meetings.length} />
            <SummaryCell
              label="마일스톤"
              value={`${milestones.filter((m) => m.status === "done").length}/${milestones.length}`}
            />
            <SummaryCell
              label="발간 논문"
              value={articles.filter((a) => a.reviewStatus === "published").length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
