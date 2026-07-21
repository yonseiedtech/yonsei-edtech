"use client";

/**
 * LivePollControl — 발표자/운영진 라이브 설문 제어 패널.
 *
 * - 세미나 연동 설문 목록 (seminarPollsApi.listBySeminar)
 * - 빠른 설문 만들기 인라인 폼 (제목 + 1문항 + 선택지 동적 추가/삭제)
 * - 지금 띄우기 / 내리기 (seminarPollsApi.setLive + onPushPoll 콜백)
 * - 현재 활성 설문의 실시간 응답 수 + 집계 결과 (useLivePollResults)
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Radio, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { pollsApi, seminarPollsApi } from "@/lib/bkend";
import type { Poll, PollOption, PollQuestion } from "@/types/academic";
import { useLivePollResults, aggregateResults } from "./useLivePollResults";
import type { QuestionAggregation } from "./useLivePollResults";

// ── 유틸 ──

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type QuestionType = "single" | "multiple" | "text" | "rating";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "단일 선택",
  multiple: "다중 선택",
  text: "텍스트",
  rating: "별점 (1-5)",
};

// ── 미니 집계 결과 바 ──

function MiniResultBar({
  label,
  count,
  max,
  total,
}: {
  label: string;
  count: number;
  max: number;
  total: number;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const ratio = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="truncate">{label}</span>
        <span className="ml-1 tabular-nums text-muted-foreground">
          {count} ({ratio}%)
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-cat-1 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniAggView({ agg }: { agg: QuestionAggregation }) {
  if (agg.type === "single" || agg.type === "multiple") {
    const max = Math.max(1, ...agg.tally.map((t) => t.count));
    const total = agg.tally.reduce((s, t) => s + t.count, 0);
    return (
      <div className="space-y-1.5">
        {agg.tally.map((t) => (
          <MiniResultBar
            key={t.optionId}
            label={t.optionText}
            count={t.count}
            max={max}
            total={total}
          />
        ))}
      </div>
    );
  }
  if (agg.type === "rating") {
    const total = Object.values(agg.distribution).reduce((s, c) => s + c, 0);
    return (
      <p className="text-[10px] text-muted-foreground">
        평균{" "}
        <span className="font-semibold text-cat-1">
          {agg.average.toFixed(1)}
        </span>
        점 / 5 · {total}명
      </p>
    );
  }
  if (agg.type === "text") {
    return (
      <p className="text-[10px] text-muted-foreground">
        텍스트 응답 {agg.answers.length}개
      </p>
    );
  }
  return null;
}

// ── 설문 행 컴포넌트 ──

interface PollRowProps {
  poll: Poll;
  isActive: boolean;
  onSetLive: (poll: Poll) => Promise<void>;
  settingLive: boolean;
  liveCount?: number;
  liveAggs?: Record<string, QuestionAggregation>;
}

function PollRow({ poll, isActive, onSetLive, settingLive, liveCount, liveAggs }: PollRowProps) {
  const [expanded, setExpanded] = useState(isActive);

  // isActive 상태가 바뀌면 자동 펼치기
  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        isActive
          ? "border-cat-1/30 bg-cat-1/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-cat-1 animate-pulse" />
            )}
            <p className="truncate text-xs font-semibold">{poll.title}</p>
          </div>
          {isActive && liveCount !== undefined && (
            <p className="mt-0.5 text-[10px] text-cat-1">
              실시간 응답 {liveCount}명
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 gap-1.5">
          {/* 집계 토글 */}
          {isActive && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg border border-border p-1 text-muted-foreground hover:bg-muted"
              aria-label={expanded ? "결과 접기" : "결과 펼치기"}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          <Button
            size="sm"
            variant={isActive ? "outline" : "default"}
            className={cn(
              "h-7 px-2.5 text-[11px]",
              isActive &&
                "border-indigo-400 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-950/30",
            )}
            onClick={() => void onSetLive(poll)}
            disabled={settingLive}
          >
            {isActive ? "내리기" : "지금 띄우기"}
          </Button>
        </div>
      </div>

      {/* 활성 설문 집계 결과 */}
      {isActive && expanded && liveAggs && (
        <div className="mt-3 space-y-3 border-t border-indigo-200 pt-3 dark:border-indigo-900">
          {poll.questions.map((q) => {
            const agg = liveAggs[q.id];
            if (!agg) return null;
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-[10px] font-medium text-foreground">{q.text}</p>
                <MiniAggView agg={agg} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──

interface Props {
  seminarId: string;
  activePollId?: string;
  onPushPoll: (pollId: string | null) => void | Promise<void>;
}

export default function LivePollControl({ seminarId, activePollId, onPushPoll }: Props) {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [settingLiveId, setSettingLiveId] = useState<string | null>(null);

  // 빠른 설문 만들기 폼 상태
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<QuestionType>("single");
  const [options, setOptions] = useState<string[]>(["", ""]);

  // 활성 설문 실시간 구독
  const { responses: liveResponses, count: liveCount } = useLivePollResults(activePollId);
  const activePoll = polls.find((p) => p.id === activePollId) ?? null;
  const liveAggs = activePoll
    ? aggregateResults(activePoll, liveResponses)
    : undefined;

  // ── 설문 목록 로드 ──
  const fetchPolls = useCallback(async () => {
    if (!seminarId) return;
    setLoadingPolls(true);
    try {
      const res = await seminarPollsApi.listBySeminar(seminarId);
      setPolls(res.data ?? []);
    } catch {
      toast.error("설문 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingPolls(false);
    }
  }, [seminarId]);

  useEffect(() => {
    void fetchPolls();
  }, [fetchPolls]);

  // ── 지금 띄우기 / 내리기 ──
  async function handleSetLive(poll: Poll) {
    const isActive = poll.id === activePollId;
    setSettingLiveId(poll.id);
    try {
      if (isActive) {
        await seminarPollsApi.setLive(poll.id, false);
        const result = onPushPoll(null);
        if (result instanceof Promise) await result;
      } else {
        await seminarPollsApi.setLive(poll.id, true);
        const result = onPushPoll(poll.id);
        if (result instanceof Promise) await result;
      }
      toast.success(isActive ? "설문을 내렸습니다." : "설문을 띄웠습니다.");
    } catch {
      toast.error("설문 상태 변경에 실패했습니다.");
    } finally {
      setSettingLiveId(null);
    }
  }

  // ── 옵션 조작 ──
  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function setOptionText(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  function resetForm() {
    setFormTitle("");
    setQText("");
    setQType("single");
    setOptions(["", ""]);
  }

  // ── 설문 생성 ──
  async function handleCreate() {
    if (!user) return;
    const title = formTitle.trim();
    const questionText = qText.trim();

    if (!title) {
      toast.error("설문 제목을 입력해주세요.");
      return;
    }
    if (!questionText) {
      toast.error("질문 내용을 입력해주세요.");
      return;
    }

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if ((qType === "single" || qType === "multiple") && filteredOptions.length < 2) {
      toast.error("선택형 질문에는 최소 2개의 선택지가 필요합니다.");
      return;
    }

    setCreating(true);
    try {
      const qOptions: PollOption[] =
        qType === "single" || qType === "multiple"
          ? filteredOptions.map((text) => ({ id: genId(), text, votes: 0 }))
          : [];

      const question: PollQuestion = {
        id: genId(),
        text: questionText,
        type: qType,
        options: qOptions.length > 0 ? qOptions : undefined,
        required: true,
      };

      const pollData: Record<string, unknown> = {
        title,
        description: "",
        type: "survey",
        status: "active",
        questions: [question],
        allowAnonymous: true,
        showResults: true,
        createdBy: user.id,
        createdByName: user.name,
        voterIds: [],
        seminarId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pollsApi.create(pollData);
      toast.success("설문이 생성되었습니다.");
      resetForm();
      setFormOpen(false);
      await fetchPolls();
    } catch {
      toast.error("설문 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  // ── 로그인 필요 ──
  if (!user) {
    return (
      <div className="rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground">
        설문 제어는 로그인한 발표자·운영진만 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Radio size={14} className="text-indigo-600 dark:text-indigo-400" />
          라이브 설문
        </h3>
        {!formOpen && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2.5 text-[11px]"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={12} />
            빠른 설문 만들기
          </Button>
        )}
      </div>

      {/* 빠른 설문 만들기 폼 */}
      {formOpen && (
        <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3 space-y-3 dark:border-indigo-800 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">빠른 설문 만들기</p>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          <Input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="설문 제목"
            className="h-8 text-xs"
          />

          <Input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="질문 내용"
            className="h-8 text-xs"
          />

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground">유형</label>
            <select
              value={qType}
              onChange={(e) => {
                setQType(e.target.value as QuestionType);
                if (e.target.value === "text" || e.target.value === "rating") {
                  setOptions(["", ""]);
                }
              }}
              className="h-7 rounded-lg border border-border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
                ([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* 선택지 입력 (single / multiple) */}
          {(qType === "single" || qType === "multiple") && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">선택지 (최소 2개)</p>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Input
                    value={opt}
                    onChange={(e) => setOptionText(idx, e.target.value)}
                    placeholder={`선택지 ${idx + 1}`}
                    className="h-7 flex-1 text-xs"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="선택지 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
              >
                <Plus size={11} />
                선택지 추가
              </button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="w-full h-7 text-[11px]"
          >
            {creating ? "생성 중…" : "설문 만들기"}
          </Button>
        </div>
      )}

      {/* 설문 목록 */}
      {loadingPolls ? (
        <p className="text-[11px] text-muted-foreground">목록 불러오는 중…</p>
      ) : polls.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          이 세미나에 연결된 설문이 없습니다. 위에서 설문을 만들어보세요.
        </p>
      ) : (
        <div className="space-y-2">
          {polls.map((poll) => (
            <PollRow
              key={poll.id}
              poll={poll}
              isActive={poll.id === activePollId}
              onSetLive={handleSetLive}
              settingLive={settingLiveId === poll.id}
              liveCount={poll.id === activePollId ? liveCount : undefined}
              liveAggs={poll.id === activePollId ? liveAggs : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
