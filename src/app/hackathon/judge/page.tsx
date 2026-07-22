"use client";

/**
 * 심사위원 전용 채점 페이지 (X1, 2026-07-22)
 *
 * 접근 조건: 로그인 + site_settings/hackathon_judges 의 judgeIds 에 포함.
 * 콘솔 AuthGuard(staff 전용) 와 별개로 동작하므로 이 페이지 자체에서 judgeIds 를 검사한다.
 * 외부인원·졸업생은 계정 가입 후 운영진이 콘솔 심사 탭의 심사위원 관리에서 지정한다.
 *
 * 채점 후 저장은 HackathonJudgingScoreForm(공용 컴포넌트)을 통해 hackathon_judgings 에 upsert.
 * rules 개정(보고서 docs/plans/hackathon-judges-votes-x1-2026-07-22.md 참조) 이 적용되어야
 * 비staff 심사위원의 create/update 가 활성화된다.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Loader2, AlertCircle, Users } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  hackathonJudgesApi,
  hackathonSubmissionsApi,
  hackathonJudgingsApi,
} from "@/lib/bkend";
import {
  summarizeHackathonScores,
  type HackathonSubmission,
} from "@/types";
import { HACKATHON_CONTEXT_ID } from "@/features/hackathon/config";
import HackathonJudgingScoreForm from "@/features/hackathon/HackathonJudgingScoreForm";
import { SubmissionLinks } from "@/features/hackathon/HackathonSubmissions";

export default function HackathonJudgePage() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  // 1. 심사위원 명단
  const { data: judgeIds = [], isLoading: judgesLoading } = useQuery({
    queryKey: ["hackathon-judges"],
    queryFn: () => hackathonJudgesApi.get(),
    enabled: !!user,
  });

  const isJudge = !!user && judgeIds.includes(user.id);

  // 2. 산출물 목록 (로그인 회원 열람 가능 — rules: isAuthenticated)
  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["hackathon-judge-submissions", HACKATHON_CONTEXT_ID],
    enabled: isJudge,
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  // 3. 내 심사 점수 (rules 개정 후 동작 — 권한 없으면 빈 배열로 graceful fallback)
  const {
    data: myJudgings = [],
    refetch: refetchJudgings,
  } = useQuery({
    queryKey: ["hackathon-judge-my-judgings", HACKATHON_CONTEXT_ID, user?.id],
    enabled: isJudge && !!user,
    queryFn: async () => {
      if (!user) return [];
      return hackathonJudgingsApi.listMineByContext(HACKATHON_CONTEXT_ID, user.id);
    },
  });

  const sorted = useMemo(
    () =>
      [...submissions].sort((a, b) =>
        (a.teamName ?? "").localeCompare(b.teamName ?? ""),
      ),
    [submissions],
  );

  // ── 로딩 ──
  if (!initialized || judgesLoading) {
    return (
      <PageContainer width="default">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  // ── 비로그인 ──
  if (!user) {
    return (
      <PageContainer width="default">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <AlertCircle size={40} className="text-muted-foreground" />
          <p className="text-lg font-semibold">로그인이 필요합니다</p>
          <p className="text-sm text-muted-foreground">
            심사위원 전용 채점 페이지입니다.
          </p>
          <Button onClick={() => { window.location.href = "/login"; }}>
            로그인
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── 심사위원 아님 ──
  if (!isJudge) {
    return (
      <PageContainer width="default">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <AlertCircle size={40} className="text-muted-foreground" />
          <p className="text-lg font-semibold">심사위원 권한이 없습니다</p>
          <p className="text-sm text-muted-foreground">
            심사위원으로 지정된 회원만 이 페이지에 접근할 수 있습니다.
            <br />
            운영진에게 문의하거나 콘솔 관리자에게 지정을 요청하세요.
          </p>
          <Button variant="outline" onClick={() => { window.location.href = "/hackathon"; }}>
            해커톤으로 돌아가기
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (subsLoading) {
    return (
      <PageContainer width="default">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default">
      <div className="space-y-6 py-8 sm:py-10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy size={22} className="text-primary" />
            심사위원 채점
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            제출된 산출물을 검토하고 루브릭 기준에 따라 채점하세요. 채점은 산출물별로 독립적으로
            저장되며 언제든지 수정할 수 있습니다.
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
            <Trophy size={28} />
            <p className="text-sm">아직 제출된 산출물이 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-6">
            {sorted.map((s) => {
              const existingJudging = myJudgings.find((j) => j.submissionId === s.id);
              const submissionJudgings = myJudgings.filter((j) => j.submissionId === s.id);
              const summary = summarizeHackathonScores(submissionJudgings);
              return (
                <li key={s.id} className="rounded-2xl border bg-card p-5">
                  {/* 헤더 */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <Users size={11} className="mr-1 inline" />
                        {s.teamName}
                        {s.members.length > 0 && ` · ${s.members.join(", ")}`}
                      </p>
                    </div>
                    {existingJudging && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">내 채점 합계</p>
                        <p className="text-lg font-bold tabular-nums text-primary">
                          {summary.total}
                          <span className="text-xs font-normal text-muted-foreground"> / 20</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                  <SubmissionLinks submission={s} />

                  {/* 채점 폼 */}
                  <div className="mt-4">
                    <HackathonJudgingScoreForm
                      key={existingJudging?.id ?? `new-${s.id}`}
                      submissionId={s.id}
                      contextId={s.contextId}
                      judgeId={user.id}
                      judgeName={user.name}
                      existingJudging={existingJudging}
                      onSaved={() => refetchJudgings()}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
