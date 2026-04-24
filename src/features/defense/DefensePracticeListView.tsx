"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareQuote, Plus, Edit3, Trash2, Play, ChevronDown, ChevronRight,
  GripVertical, ListChecks,
} from "lucide-react";
import { defensePracticesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DEFENSE_CATEGORY_LABELS,
  type DefensePracticeSet,
  type DefensePracticeCategory,
  type DefenseQuestion,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES: DefensePracticeCategory[] = [
  "proposal", "midterm", "final", "qualifying", "general",
];

function uid() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function DefensePracticeListView({
  runnerHrefPrefix = "/console/grad-life/thesis-defense",
  variant = "console",
}: {
  /** 연습 시작 버튼이 향하는 prefix (예: /console/grad-life/thesis-defense 또는 /steppingstone/thesis-defense) */
  runnerHrefPrefix?: string;
  /** "console"은 ConsolePageHeader, "public"은 자체 헤더 외부에 둠 (래퍼가 hero 제공) */
  variant?: "console" | "public";
} = {}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id ?? "";

  const [editing, setEditing] = useState<DefensePracticeSet | "new" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["defense_practice_sets", userId],
    queryFn: () => defensePracticesApi.listByUser(userId),
    enabled: !!userId,
  });

  const sets = (data?.data ?? []).slice().sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => defensePracticesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
      toast.success("삭제되었습니다.");
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  if (editing) {
    return (
      <PracticeSetEditor
        practiceSet={editing === "new" ? null : editing}
        userId={userId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {variant === "console" ? (
        <ConsolePageHeader
          icon={MessageSquareQuote}
          title="논문 심사 연습"
          description="사전에 예상 질문과 모범 답변을 작성한 뒤, 마이크로 답변을 녹음·전사하여 모범 답변과 비교 채점합니다."
          actions={
            <Button onClick={() => setEditing("new")}>
              <Plus size={14} className="mr-1" /> 새 연습 세트
            </Button>
          }
        />
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" /> 새 연습 세트
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : sets.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <MessageSquareQuote size={32} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">아직 등록된 연습 세트가 없습니다.</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" /> 첫 세트 만들기
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sets.map((s) => {
            const open = expanded[s.id];
            const last = s.lastAttempt;
            return (
              <li
                key={s.id}
                className="rounded-xl border bg-card"
              >
                <div className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}
                    className="mt-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={open ? "접기" : "펼치기"}
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{s.title}</h3>
                      <Badge variant="secondary">{DEFENSE_CATEGORY_LABELS[s.category]}</Badge>
                      <Badge variant="outline">
                        <ListChecks size={11} className="mr-1" /> {s.questions.length}문항
                      </Badge>
                      {typeof s.attemptCount === "number" && s.attemptCount > 0 && (
                        <Badge variant="outline">시도 {s.attemptCount}회</Badge>
                      )}
                      {last && (
                        <Badge
                          className={cn(
                            "text-white",
                            last.averageScore >= 80
                              ? "bg-emerald-600"
                              : last.averageScore >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500",
                          )}
                        >
                          최근 {Math.round(last.averageScore)}점
                        </Badge>
                      )}
                    </div>
                    {s.topic && (
                      <p className="mt-1 text-xs text-muted-foreground">주제: {s.topic}</p>
                    )}
                    {s.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link href={`${runnerHrefPrefix}/${s.id}/practice`}>
                      <Button size="sm" disabled={s.questions.length === 0}>
                        <Play size={13} className="mr-1" /> 연습 시작
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(s)}
                    >
                      <Edit3 size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`'${s.title}' 세트를 삭제할까요?`)) {
                          deleteMutation.mutate(s.id);
                        }
                      }}
                    >
                      <Trash2 size={13} className="text-rose-600" />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    {s.questions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">등록된 질문이 없습니다.</p>
                    ) : (
                      <ol className="space-y-2 text-sm">
                        {s.questions.map((q, i) => (
                          <li key={q.id} className="rounded-lg border bg-background p-3">
                            <p className="font-medium">Q{i + 1}. {q.question}</p>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">모범답변:</span>{" "}
                              {q.expectedAnswer || <span className="italic">미작성</span>}
                            </p>
                            {q.note && (
                              <p className="mt-1 text-xs text-muted-foreground">메모: {q.note}</p>
                            )}
                            {last && (() => {
                              const r = last.results.find((x) => x.questionId === q.id);
                              if (!r) return null;
                              return (
                                <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
                                  <div className="mb-1 flex items-center gap-1">
                                    <span className="font-semibold">최근 답변</span>
                                    <Badge
                                      className={cn(
                                        "text-white",
                                        r.score >= 80
                                          ? "bg-emerald-600"
                                          : r.score >= 60
                                          ? "bg-amber-500"
                                          : "bg-rose-500",
                                      )}
                                    >
                                      {Math.round(r.score)}점
                                    </Badge>
                                  </div>
                                  <p className="whitespace-pre-wrap text-muted-foreground">
                                    {r.transcript || <span className="italic">전사 없음</span>}
                                  </p>
                                </div>
                              );
                            })()}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ───────── Editor ─────────

function PracticeSetEditor({
  practiceSet,
  userId,
  onClose,
  onSaved,
}: {
  practiceSet: DefensePracticeSet | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(practiceSet?.title ?? "");
  const [description, setDescription] = useState(practiceSet?.description ?? "");
  const [topic, setTopic] = useState(practiceSet?.topic ?? "");
  const [category, setCategory] = useState<DefensePracticeCategory>(
    practiceSet?.category ?? "proposal",
  );
  const [questions, setQuestions] = useState<DefenseQuestion[]>(
    practiceSet?.questions ?? [],
  );
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { id: uid(), question: "", expectedAnswer: "" },
    ]);
  };
  const updateQuestion = (i: number, patch: Partial<DefenseQuestion>) => {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const removeQuestion = (i: number) => {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  };
  const moveQuestion = (i: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (questions.length === 0) {
      toast.error("질문을 1개 이상 추가해주세요.");
      return;
    }
    if (!userId) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        userId,
        title: title.trim(),
        description: description.trim() || null,
        topic: topic.trim() || null,
        category,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question.trim(),
          expectedAnswer: q.expectedAnswer.trim(),
          note: q.note?.trim() || null,
        })),
        updatedAt: now,
      };
      if (practiceSet) {
        await defensePracticesApi.update(practiceSet.id, payload);
      } else {
        await defensePracticesApi.create({
          ...payload,
          createdAt: now,
          attemptCount: 0,
        });
      }
      toast.success("저장되었습니다.");
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={MessageSquareQuote}
        title={practiceSet ? "연습 세트 수정" : "새 연습 세트"}
        description="질문을 미리 작성해두면 연습 모드에서 한 문제씩 마이크로 답변할 수 있습니다."
        actions={
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      />

      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">제목 *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 석사 논문 계획서 발표 예상질문"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">분류</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DefensePracticeCategory)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{DEFENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">발표 주제 / 논문 제목</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 메타버스 기반 협력학습의 효과"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">설명 (선택)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 세트에 대한 메모"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">질문 ({questions.length})</h2>
          <Button size="sm" onClick={addQuestion}>
            <Plus size={13} className="mr-1" /> 질문 추가
          </Button>
        </div>
        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            아래 버튼으로 첫 질문을 추가해주세요.
          </div>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <GripVertical size={14} className="text-muted-foreground" />
                  <span className="text-sm font-semibold">Q{i + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveQuestion(i, -1)}
                      disabled={i === 0}
                    >↑</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveQuestion(i, 1)}
                      disabled={i === questions.length - 1}
                    >↓</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeQuestion(i)}
                    >
                      <Trash2 size={13} className="text-rose-600" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">질문</label>
                    <Textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(i, { question: e.target.value })}
                      placeholder="예: 본 연구의 이론적 배경은 무엇입니까?"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">모범 답변</label>
                    <Textarea
                      value={q.expectedAnswer}
                      onChange={(e) => updateQuestion(i, { expectedAnswer: e.target.value })}
                      placeholder="STT 전사 결과와 비교 채점할 기준 답변"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">메모 / 힌트 (선택)</label>
                    <Input
                      value={q.note ?? ""}
                      onChange={(e) => updateQuestion(i, { note: e.target.value })}
                      placeholder="핵심 키워드, 주의사항 등"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
