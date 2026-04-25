"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareQuote, Plus, Edit3, Trash2, ListChecks, ChevronDown, ChevronRight,
} from "lucide-react";
import { defenseQuestionTemplatesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DEFENSE_CATEGORY_LABELS,
  type DefenseQuestionTemplate,
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

export default function DefenseTemplateAdminView() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = isAdminOrSysadmin(user);

  const [editing, setEditing] = useState<DefenseQuestionTemplate | "new" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["defense_question_templates", "all"],
    queryFn: () => defenseQuestionTemplatesApi.listAll(),
    enabled: isAdmin,
  });
  const templates = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => defenseQuestionTemplatesApi.delete(id),
    onSuccess: () => {
      toast.success("템플릿을 삭제했습니다.");
      qc.invalidateQueries({ queryKey: ["defense_question_templates"] });
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          템플릿 관리는 관리자(admin) 권한이 필요합니다.
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <TemplateEditor
        template={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["defense_question_templates"] });
          setEditing(null);
        }}
        currentUserId={user?.id ?? ""}
      />
    );
  }

  return (
    <div>
      <ConsolePageHeader
        icon={MessageSquareQuote}
        title="논문 심사 연습 — 템플릿 관리"
        description="회원이 연습 세트를 만들 때 import할 수 있는 표준 질문 템플릿을 사전 등록·관리합니다."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" /> 새 템플릿
          </Button>
        }
      />

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            등록된 템플릿이 없습니다. 새 템플릿을 만들어보세요.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => {
            const open = expanded[t.id] ?? false;
            return (
              <li key={t.id} className="rounded-xl border bg-card">
                <div className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}
                    className="mt-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={open ? "접기" : "펼치기"}
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{DEFENSE_CATEGORY_LABELS[t.category]}</Badge>
                      {!t.active && <Badge variant="outline">비활성</Badge>}
                    </div>
                    <h3 className="text-base font-semibold">{t.name}</h3>
                    {t.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      <ListChecks size={11} className="mr-1 inline" />
                      {t.questions.length}문항
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                      <Edit3 size={13} className="mr-1" /> 편집
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`"${t.name}" 템플릿을 삭제하시겠습니까?`)) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                {open && (
                  <ol className="space-y-2 border-t bg-muted/20 p-4 text-sm">
                    {t.questions.map((q, i) => (
                      <li key={q.id} className="rounded-md bg-background p-3">
                        <p className="text-xs font-semibold text-muted-foreground">Q{i + 1}</p>
                        <p className="mt-0.5 whitespace-pre-wrap">{q.question}</p>
                        {q.expectedAnswer && (
                          <div className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                            <p className="mb-0.5 font-semibold">모범 답변</p>
                            <p className="whitespace-pre-wrap">{q.expectedAnswer}</p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onCancel,
  onSaved,
  currentUserId,
}: {
  template: DefenseQuestionTemplate | null;
  onCancel: () => void;
  onSaved: () => void;
  currentUserId: string;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState<DefensePracticeCategory>(
    template?.category ?? "proposal",
  );
  const [active, setActive] = useState(template?.active ?? true);
  const [questions, setQuestions] = useState<DefenseQuestion[]>(
    template?.questions ?? [],
  );
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions((qs) => [...qs, { id: uid(), question: "", expectedAnswer: "" }]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("템플릿 이름을 입력해주세요.");
      return;
    }
    if (questions.length === 0) {
      toast.error("질문을 1개 이상 추가해주세요.");
      return;
    }
    if (questions.some((q) => !q.question.trim())) {
      toast.error("비어있는 질문이 있습니다.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        active,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question.trim(),
          expectedAnswer: q.expectedAnswer.trim(),
          note: q.note?.trim() || null,
        })),
        updatedAt: now,
      };
      if (template) {
        await defenseQuestionTemplatesApi.update(template.id, payload);
        toast.success("템플릿을 수정했습니다.");
      } else {
        await defenseQuestionTemplatesApi.create({
          ...payload,
          createdBy: currentUserId,
          createdAt: now,
        });
        toast.success("템플릿을 만들었습니다.");
      }
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ConsolePageHeader
        icon={MessageSquareQuote}
        title={template ? "템플릿 편집" : "새 템플릿"}
        description="회원이 연습 세트 생성 시 이 템플릿을 그대로 import 합니다."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={onCancel}>취소</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
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
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">템플릿 이름 *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 석사 예비심사 표준 질문 20선"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">설명 (선택)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 템플릿이 어떤 상황에 적합한지 설명"
            rows={2}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>활성화 (체크 해제 시 회원 화면에서 숨김)</span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">질문 ({questions.length})</h2>
          <Button size="sm" onClick={addQuestion}>
            <Plus size={13} className="mr-1" /> 질문 추가
          </Button>
        </div>
        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            질문을 추가해주세요.
          </div>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.id} className="space-y-2 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Q{i + 1}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <Textarea
                  value={q.question}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, question: v } : x)));
                  }}
                  placeholder="질문"
                  rows={2}
                />
                <Textarea
                  value={q.expectedAnswer}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, expectedAnswer: v } : x)));
                  }}
                  placeholder="모범 답변 (회원이 import 후 자유롭게 수정 가능)"
                  rows={4}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
