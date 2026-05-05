"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareQuote, Plus, Edit3, Trash2, Play, ChevronDown, ChevronRight,
  GripVertical, ListChecks, Sparkles, Mic, Target, ArrowRight,
} from "lucide-react";
import { defensePracticesApi, defenseQuestionTemplatesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DEFENSE_CATEGORY_LABELS,
  DEFENSE_QUESTION_TYPE_LABELS,
  type DefensePracticeSet,
  type DefensePracticeCategory,
  type DefenseQuestion,
  type DefenseQuestionType,
  type DefenseQuestionTemplate,
} from "@/types";

const QUESTION_TYPES: DefenseQuestionType[] = [
  "briefing", "identity", "theory", "method", "etc",
];
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
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["defense_practice_sets", userId],
    queryFn: () => defensePracticesApi.listByUser(userId),
    enabled: !!userId,
  });

  const { data: templateData } = useQuery({
    queryKey: ["defense_question_templates", "active"],
    queryFn: () => defenseQuestionTemplatesApi.listActive(),
  });
  const templates = templateData?.data ?? [];

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
        initialTemplateId={editing === "new" ? pendingTemplateId : null}
        onClose={() => {
          setEditing(null);
          setPendingTemplateId(null);
        }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["defense_practice_sets"] });
          setEditing(null);
          setPendingTemplateId(null);
        }}
      />
    );
  }

  const startWithTemplate = (templateId: string) => {
    setPendingTemplateId(templateId);
    setEditing("new");
  };

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
        <OnboardingEmptyState
          templates={templates}
          onStartFromScratch={() => setEditing("new")}
          onStartFromTemplate={startWithTemplate}
        />
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
                    <div className="mb-1">
                      <Badge variant="secondary">{DEFENSE_CATEGORY_LABELS[s.category]}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{s.title}</h3>
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
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="font-medium">Q{i + 1}.</span>
                              {q.type && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {DEFENSE_QUESTION_TYPE_LABELS[q.type]}
                                </Badge>
                              )}
                              <span className="font-medium">{q.question}</span>
                            </div>
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
  initialTemplateId,
  onClose,
  onSaved,
}: {
  practiceSet: DefensePracticeSet | null;
  userId: string;
  initialTemplateId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(practiceSet?.title ?? "");
  const [description, setDescription] = useState(practiceSet?.description ?? "");
  // topic 필드 UI는 제거되었으나 기존 데이터 보존용으로 원본 값을 유지하여 저장 시 그대로 전달
  const preservedTopic = practiceSet?.topic ?? null;
  const [category, setCategory] = useState<DefensePracticeCategory>(
    practiceSet?.category ?? "proposal",
  );
  const [questions, setQuestions] = useState<DefenseQuestion[]>(
    practiceSet?.questions ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [autoImported, setAutoImported] = useState(false);

  const { data: templateData } = useQuery({
    queryKey: ["defense_question_templates", "active"],
    queryFn: () => defenseQuestionTemplatesApi.listActive(),
  });
  const templates = templateData?.data ?? [];

  const importTemplate = (templateId: string, mode: "append" | "replace") => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const cloned = tpl.questions.map((q) => ({
      id: uid(),
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      note: q.note,
      type: q.type ?? "etc",
    }));
    setQuestions((qs) => (mode === "replace" ? cloned : [...qs, ...cloned]));
    if (!title.trim() && mode === "replace") setTitle(tpl.name);
    setCategory(tpl.category);
    setTemplatePickerOpen(false);
    toast.success(`"${tpl.name}" 템플릿 ${cloned.length}개 질문 ${mode === "replace" ? "교체됨" : "추가됨"}`);
  };

  // 온보딩에서 선택한 템플릿 자동 import (신규 작성 + initialTemplateId 제공된 경우 한 번만)
  useEffect(() => {
    if (autoImported) return;
    if (!initialTemplateId) return;
    if (practiceSet) return; // 편집 모드에서는 무시
    if (templates.length === 0) return;
    importTemplate(initialTemplateId, "replace");
    setAutoImported(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId, practiceSet, templates.length, autoImported]);

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { id: uid(), question: "", expectedAnswer: "", type: "etc" },
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
        topic: preservedTopic,
        category,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question.trim(),
          expectedAnswer: q.expectedAnswer.trim(),
          note: q.note?.trim() || null,
          type: q.type ?? "etc",
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
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">논문 제목 *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 메타버스 기반 협력학습의 효과 분석"
          />
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
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTemplatePickerOpen(true)}
              disabled={templates.length === 0}
              title={templates.length === 0 ? "관리자가 등록한 템플릿이 아직 없습니다." : ""}
            >
              <ListChecks size={13} className="mr-1" /> 템플릿
            </Button>
            <Button size="sm" onClick={addQuestion}>
              <Plus size={13} className="mr-1" /> 질문 추가
            </Button>
          </div>
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
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">질문 유형</label>
                    <select
                      value={q.type ?? "etc"}
                      onChange={(e) => updateQuestion(i, { type: e.target.value as DefenseQuestionType })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t} value={t}>{DEFENSE_QUESTION_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
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
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      모범 답변
                      <span className="ml-1 font-normal text-muted-foreground/70">
                        — 줄 시작에 [도입] [본론] [결론] 처럼 적으면 답변 흐름이 자동 표시됩니다.
                      </span>
                    </label>
                    <Textarea
                      value={q.expectedAnswer}
                      onChange={(e) => updateQuestion(i, { expectedAnswer: e.target.value })}
                      placeholder={`예시 (빈 줄로 문단 구분):\n[도입] 본 연구는 ...\n\n[본론] 첫째, ...\n\n[결론] 따라서 ...`}
                      rows={6}
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

      {templatePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setTemplatePickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-3">
              <h3 className="text-base font-semibold">질문 템플릿 선택</h3>
              <Button size="sm" variant="ghost" onClick={() => setTemplatePickerOpen(false)}>
                닫기
              </Button>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs text-muted-foreground">
                관리자가 등록한 표준 질문 세트입니다. 가져온 후 자유롭게 편집·삭제할 수 있습니다.
              </p>
              {templates.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  등록된 템플릿이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id} className="rounded-lg border bg-background p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{DEFENSE_CATEGORY_LABELS[t.category]}</Badge>
                        <Badge variant="outline">
                          <ListChecks size={11} className="mr-1" /> {t.questions.length}문항
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => importTemplate(t.id, "append")}
                        >
                          <Plus size={12} className="mr-1" /> 현재 질문에 추가
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (
                              questions.length > 0 &&
                              !confirm("기존 질문을 모두 교체합니다. 진행할까요?")
                            ) {
                              return;
                            }
                            importTemplate(t.id, "replace");
                          }}
                        >
                          전체 교체
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Onboarding (첫 사용자 전용 빈 화면) ─────────

function OnboardingEmptyState({
  templates,
  onStartFromScratch,
  onStartFromTemplate,
}: {
  templates: DefenseQuestionTemplate[];
  onStartFromScratch: () => void;
  onStartFromTemplate: (templateId: string) => void;
}) {
  // 분류별로 1개씩 우선 노출하여 다양성 확보 (그 후 남은 슬롯 채움) — 최대 6개
  const ordered: DefenseQuestionTemplate[] = (() => {
    const seen = new Set<string>();
    const picked: DefenseQuestionTemplate[] = [];
    for (const t of templates) {
      if (!seen.has(t.category)) {
        picked.push(t);
        seen.add(t.category);
      }
    }
    for (const t of templates) {
      if (picked.length >= 6) break;
      if (!picked.includes(t)) picked.push(t);
    }
    return picked;
  })();

  return (
    <div className="space-y-6">
      {/* 1단계: 안내 */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-violet-50 p-6 dark:from-indigo-950/40 dark:to-violet-950/40">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-card p-2.5 shadow-sm dark:bg-zinc-900">
            <Sparkles size={20} className="text-indigo-600 dark:text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">
              논문 심사 연습을 처음 시작하시나요?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              예상 질문에 마이크로 답변하면, 모범 답변과 비교해 점수와 키워드 일치도를 알려드립니다.
              아래 추천 템플릿을 선택하면 1초 만에 첫 세트를 만들 수 있어요.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-3 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <ListChecks size={14} className="text-indigo-600" />
                  <p className="text-xs font-semibold">1. 질문 준비</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  템플릿을 가져오거나 직접 질문·모범 답변을 작성합니다.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Mic size={14} className="text-rose-600" />
                  <p className="text-xs font-semibold">2. 마이크로 답변</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  녹음 또는 타이핑으로 답하면 자동 전사·채점됩니다.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-emerald-600" />
                  <p className="text-xs font-semibold">3. 비교·복기</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  모범 답변과 1:1 비교, 통과한 문장을 형광펜으로 표시합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2단계: 추천 템플릿 그리드 */}
      {ordered.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-base font-semibold">추천 템플릿으로 시작하기</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                관리자가 등록한 표준 질문 세트입니다. 가져온 후 자유롭게 편집·삭제할 수 있어요.
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ordered.map((t) => (
              <li
                key={t.id}
                className="group flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {DEFENSE_CATEGORY_LABELS[t.category]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <ListChecks size={10} className="mr-1" /> {t.questions.length}문항
                  </Badge>
                </div>
                <p className="text-sm font-semibold leading-snug">{t.name}</p>
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={() => onStartFromTemplate(t.id)}
                    className="group-hover:translate-x-0.5 transition-transform"
                  >
                    이 템플릿으로 시작 <ArrowRight size={12} className="ml-1" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            관리자가 등록한 템플릿이 아직 없습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            아래 "처음부터 만들기" 버튼으로 직접 질문을 작성해보세요.
          </p>
        </div>
      )}

      {/* 3단계: 처음부터 만들기 */}
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-8 text-center">
        <p className="text-sm text-muted-foreground">
          또는 본인의 논문 주제에 맞춰 직접 작성할 수도 있습니다.
        </p>
        <Button variant="outline" onClick={onStartFromScratch}>
          <Plus size={14} className="mr-1" /> 처음부터 만들기
        </Button>
      </div>
    </div>
  );
}
