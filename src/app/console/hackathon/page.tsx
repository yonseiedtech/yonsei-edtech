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
  Send,
} from "lucide-react";
import { toast } from "sonner";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HackathonDdayConsole from "@/features/hackathon/HackathonDdayConsole";
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
import { HACKATHON_CONTEXT_ID } from "@/features/hackathon/config";
import {
  INTERNAL_CONFERENCES,
  getConferenceByContextId,
  getCurrentConference,
} from "@/features/internal-conference/conferences";

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

  // 행사 선택 — 대내 학술대회가 여러 개면 드롭다운, 1개면 자동 선택.
  const [contextId, setContextId] = useState(
    () => getCurrentConference()?.contextId ?? HACKATHON_CONTEXT_ID,
  );
  const selectedConference = getConferenceByContextId(contextId);
  const showEventPicker = INTERNAL_CONFERENCES.length > 1;

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["console-hackathon-submissions", contextId],
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(contextId);
      return res.data as HackathonSubmission[];
    },
  });

  const { data: judgings = [] } = useQuery({
    queryKey: ["console-hackathon-judgings", contextId],
    queryFn: async () => {
      const res = await hackathonJudgingsApi.listByContext(contextId);
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

  // R4 (#18): 수상 지정분(award 있음) 중 아직 미공개인 산출물을 일괄 공개 —
  // 개별 토글 누락으로 일부 수상작만 노출되는 사고 방지.
  const pendingPublish = useMemo(
    () => submissions.filter((s) => s.award && !s.published),
    [submissions],
  );
  const bulkPublish = useMutation({
    mutationFn: async () => {
      let ok = 0;
      for (const s of pendingPublish) {
        await hackathonSubmissionsApi.update(s.id, { published: true });
        ok += 1;
      }
      return ok;
    },
    onSuccess: (ok) => {
      toast.success(`수상작 ${ok}건을 일괄 공개했습니다.`);
      refresh();
    },
    onError: (e) =>
      toast.error(`일괄 공개 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  return (
    <div className="space-y-5">
      <ConsolePageHeader
        icon={Trophy}
        title="대내 학술대회 운영"
        description={`${selectedConference?.title ?? "행사"} — 당일 단계 전환·현황과 루브릭 심사`}
      />

      {showEventPicker && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="conference-picker" className="text-sm font-medium text-muted-foreground">
            행사 선택
          </label>
          <select
            id="conference-picker"
            value={contextId}
            onChange={(e) => setContextId(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {INTERNAL_CONFERENCES.map((c) => (
              <option key={c.contextId} value={c.contextId}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <Tabs defaultValue="dday">
        <TabsList>
          <TabsTrigger value="dday">당일 운영</TabsTrigger>
          <TabsTrigger value="judging">심사</TabsTrigger>
        </TabsList>

        <TabsContent value="dday" className="mt-5">
          <HackathonDdayConsole />
        </TabsContent>

        <TabsContent value="judging" className="mt-5">
          {/* M3: 수상 발표 절차 가이드 (접기 패널) */}
          <details className="mb-4 rounded-2xl border bg-card">
            <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm font-semibold marker:content-none">
              <Trophy size={14} className="shrink-0 text-primary" />
              수상 발표 절차 안내
              <span className="ml-auto text-xs font-normal text-muted-foreground">클릭해서 펼치기</span>
            </summary>
            <ol className="space-y-1.5 px-4 pb-4 pt-1 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</span>
                <span><strong className="text-foreground">심사 완료 확인</strong> — 모든 산출물에 루브릭 점수가 입력됐는지 아래 목록에서 확인. 점수 없는 항목은 배지로 표시됨.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</span>
                <span><strong className="text-foreground">수상 등급 지정</strong> — 각 산출물 카드의 &quot;수상 등급&quot; 드롭다운에서 대상/최우수상/우수상/장려상 지정.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</span>
                <span><strong className="text-foreground">수상작 일괄 공개</strong> — 아래 &quot;미공개 일괄 공개&quot; 버튼 클릭 → /hackathon 수상작 섹션 즉시 노출.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">4</span>
                <span><strong className="text-foreground">포트폴리오 자동적재 공지</strong> — 수상팀에게 &quot;마이페이지 → 포트폴리오에서 수상 실적이 자동 적재됐습니다&quot; 공지 게시.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">5</span>
                <span><strong className="text-foreground">아카이브 등록 안내</strong> — 팀장에게 /archive 딥링크(아이디어 → 아카이브 등록) 안내 메시지 전송.</span>
              </li>
            </ol>
          </details>

          {subsLoading ? (
            <div className="p-6">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
              <Inbox size={28} />
              <p className="text-sm">아직 제출된 산출물이 없습니다.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {pendingPublish.length > 0 && (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    수상 지정됐지만 미공개인 산출물{" "}
                    <span className="font-semibold text-primary">{pendingPublish.length}건</span>{" "}
                    — 한 번에 공개할 수 있습니다.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => bulkPublish.mutate()}
                    disabled={bulkPublish.isPending}
                  >
                    {bulkPublish.isPending ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <Send size={14} className="mr-1" />
                    )}
                    수상 지정분 일괄 공개
                  </Button>
                </li>
              )}
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
        </TabsContent>
      </Tabs>
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
