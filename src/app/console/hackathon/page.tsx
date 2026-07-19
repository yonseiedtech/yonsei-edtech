"use client";

/**
 * 해커톤 심사 콘솔 (v7-M1) — staff+ 전용 (console/layout AuthGuard 로 보호)
 *
 *  - 제출 산출물 목록 + 심사위원(현재 로그인 운영진)별 루브릭 점수 입력·저장
 *    · 4기준 × 5점, doc id = `${submissionId}_${judgeId}` 로 심사위원별 분리·멱등 upsert
 *    · 심사위원 평균 집계(summarizeHackathonScores) 표시
 *  - 운영진: 수상 등급 지정 + 공개(published) 토글 → 공개 페이지 수상작 섹션 반영
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Users,
  Star,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi, hackathonJudgingsApi } from "@/lib/bkend";
import {
  HACKATHON_RUBRIC,
  HACKATHON_RUBRIC_MAX,
  HACKATHON_AWARD_LABELS,
  HACKATHON_AWARD_ORDER,
  summarizeHackathonScores,
  type HackathonSubmission,
  type HackathonJudging,
  type HackathonRubricKey,
  type HackathonAwardGrade,
} from "@/types";
import { HACKATHON_CONTEXT_ID, HACKATHON_EVENT } from "@/features/hackathon/config";

type ScoreDraft = Record<HackathonRubricKey, number>;

const EMPTY_SCORES: ScoreDraft = {
  problem: 0,
  edtech: 0,
  completeness: 0,
  presentation: 0,
};

export default function HackathonJudgingConsolePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["console-hackathon-submissions"],
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  const { data: judgings = [] } = useQuery({
    queryKey: ["console-hackathon-judgings"],
    queryFn: async () => {
      const res = await hackathonJudgingsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonJudging[];
    },
  });

  const sorted = useMemo(
    () =>
      [...submissions].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [submissions],
  );

  function refresh() {
    qc.invalidateQueries({ queryKey: ["console-hackathon-submissions"] });
    qc.invalidateQueries({ queryKey: ["console-hackathon-judgings"] });
  }

  if (subsLoading) {
    return (
      <div className="p-6">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ConsolePageHeader
        icon={Trophy}
        title="해커톤 심사"
        description={`${HACKATHON_EVENT.title} — 루브릭 점수 입력·집계 및 수상작 지정`}
      />

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
          <Inbox size={28} />
          <p className="text-sm">아직 제출된 산출물이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sorted.map((s) => (
            <JudgingCard
              key={s.id}
              submission={s}
              judgings={judgings.filter((j) => j.submissionId === s.id)}
              judgeId={user?.id ?? ""}
              judgeName={user?.name ?? "운영진"}
              onChanged={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function JudgingCard({
  submission,
  judgings,
  judgeId,
  judgeName,
  onChanged,
}: {
  submission: HackathonSubmission;
  judgings: HackathonJudging[];
  judgeId: string;
  judgeName: string;
  onChanged: () => void;
}) {
  const myJudging = useMemo(
    () => judgings.find((j) => j.judgeId === judgeId),
    [judgings, judgeId],
  );
  const summary = useMemo(() => summarizeHackathonScores(judgings), [judgings]);

  const [scores, setScores] = useState<ScoreDraft>(
    myJudging ? { ...EMPTY_SCORES, ...myJudging.scores } : EMPTY_SCORES,
  );
  const [comment, setComment] = useState(myJudging?.comment ?? "");

  const saveScore = useMutation({
    mutationFn: () =>
      hackathonJudgingsApi.upsert(submission.id, judgeId, {
        contextId: submission.contextId,
        submissionId: submission.id,
        judgeId,
        judgeName,
        scores,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast.success("심사 점수를 저장했습니다.");
      onChanged();
    },
    onError: (e) =>
      toast.error(`저장 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  const setAward = useMutation({
    mutationFn: (award: HackathonAwardGrade | null) =>
      hackathonSubmissionsApi.update(submission.id, { award: award ?? null }),
    onSuccess: () => {
      toast.success("수상 등급을 갱신했습니다.");
      onChanged();
    },
    onError: (e) =>
      toast.error(`갱신 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  const togglePublish = useMutation({
    mutationFn: () =>
      hackathonSubmissionsApi.update(submission.id, {
        published: !submission.published,
      }),
    onSuccess: () => {
      toast.success(submission.published ? "공개를 해제했습니다." : "수상작으로 공개했습니다.");
      onChanged();
    },
    onError: (e) =>
      toast.error(`갱신 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  return (
    <li className="rounded-2xl border bg-card p-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{submission.title}</p>
            {submission.award && (
              <Badge variant="default" className="gap-0.5 text-[10px]">
                <Trophy size={9} /> {HACKATHON_AWARD_LABELS[submission.award]}
              </Badge>
            )}
            {submission.published && (
              <Badge variant="secondary" className="gap-0.5 text-[10px]">
                <Eye size={9} /> 공개됨
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Users size={11} className="mr-1 inline" />
            {submission.teamName}
            {submission.members.length > 0 && ` · ${submission.members.join(", ")}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">평균 (심사위원 {summary.judgeCount}명)</p>
          <p className="text-lg font-bold tabular-nums text-primary">
            {summary.total}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}/ {HACKATHON_RUBRIC.length * HACKATHON_RUBRIC_MAX}
            </span>
          </p>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {submission.description}
      </p>

      {/* 기준별 평균 */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {HACKATHON_RUBRIC.map((r) => (
          <div key={r.key} className="rounded-lg border bg-muted/20 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground">{r.label}</p>
            <p className="text-sm font-semibold tabular-nums">
              {summary.byKey[r.key]}
              <span className="text-[10px] font-normal text-muted-foreground">
                {" "}/ {HACKATHON_RUBRIC_MAX}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* 내 심사 점수 입력 */}
      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Star size={13} /> 내 심사 점수
        </p>
        <div className="mt-2.5 space-y-2.5">
          {HACKATHON_RUBRIC.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">{r.label}</span>
                <span className="text-[11px] text-muted-foreground">{r.hint}</span>
              </div>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: HACKATHON_RUBRIC_MAX + 1 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [r.key]: n }))}
                    aria-pressed={scores[r.key] === n}
                    className={`h-8 w-8 rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                      scores[r.key] === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="심사 코멘트 (선택)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={() => saveScore.mutate()} disabled={saveScore.isPending}>
            {saveScore.isPending ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Save size={14} className="mr-1" />
            )}
            {myJudging ? "점수 수정" : "점수 저장"}
          </Button>
        </div>
      </div>

      {/* 수상 지정 + 공개 */}
      <div className="mt-4 border-t pt-3">
        <p className="mb-2 text-xs font-bold text-muted-foreground">수상 지정</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAward.mutate(null)}
            disabled={setAward.isPending}
            aria-pressed={!submission.award}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              !submission.award
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            미수상
          </button>
          {HACKATHON_AWARD_ORDER.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setAward.mutate(grade)}
              disabled={setAward.isPending}
              aria-pressed={submission.award === grade}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                submission.award === grade
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {HACKATHON_AWARD_LABELS[grade]}
            </button>
          ))}
          <Button
            size="sm"
            variant={submission.published ? "outline" : "default"}
            className="ml-auto"
            onClick={() => togglePublish.mutate()}
            disabled={togglePublish.isPending || !submission.award}
            title={!submission.award ? "수상 등급을 먼저 지정하세요" : ""}
          >
            {submission.published ? (
              <>
                <EyeOff size={13} className="mr-1" /> 공개 해제
              </>
            ) : (
              <>
                <Eye size={13} className="mr-1" /> 수상작 공개
              </>
            )}
          </Button>
        </div>
      </div>
    </li>
  );
}
