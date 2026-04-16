"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  InterviewMeta,
  InterviewQuestion,
  InterviewAnswerType,
  InterviewChoice,
} from "@/types";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, X, Lock, Globe } from "lucide-react";

interface Props {
  value: InterviewMeta;
  onChange: (v: InterviewMeta) => void;
}

const ANSWER_TYPE_LABELS: Record<InterviewAnswerType, string> = {
  text: "텍스트",
  photo: "사진",
  text_and_photo: "텍스트 + 사진",
  single_choice: "선지형 (단일 선택)",
  multi_choice: "선지형 (복수 선택)",
  ox: "O / X",
  multi_text: "복수 답변(키워드 등)",
  fill_blank: "빈칸 채우기",
};

const FILL_BLANK_PATTERN = /\(\s+\)|_{3,}/;

function fillBlankPreview(prompt: string): ReactNode {
  if (!FILL_BLANK_PATTERN.test(prompt)) return null;
  const parts = prompt.split(FILL_BLANK_PATTERN);
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-[60px] border-b-2 border-violet-500 px-2 text-center text-violet-700">
              ___
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function makeId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeChoiceId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function InterviewBuilder({ value, onChange }: Props) {
  function update<K extends keyof InterviewMeta>(key: K, v: InterviewMeta[K]) {
    onChange({ ...value, [key]: v });
  }

  function updateQuestion(qid: string, patch: Partial<InterviewQuestion>) {
    onChange({
      ...value,
      questions: value.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    });
  }

  function changeAnswerType(qid: string, next: InterviewAnswerType) {
    const q = value.questions.find((x) => x.id === qid);
    if (!q) return;
    const patch: Partial<InterviewQuestion> = { answerType: next };
    if (next === "single_choice") {
      if (!q.options || q.options.length === 0) {
        patch.options = [
          { id: makeChoiceId(), label: "" },
          { id: makeChoiceId(), label: "" },
        ];
      }
    } else if (next === "multi_choice") {
      if (!q.options || q.options.length === 0) {
        patch.options = [
          { id: makeChoiceId(), label: "" },
          { id: makeChoiceId(), label: "" },
        ];
      }
      if (q.minCount == null) patch.minCount = 1;
      if (q.maxCount == null) patch.maxCount = Math.max(2, (q.options ?? []).length || 2);
    } else if (next === "ox") {
      patch.options = undefined;
      patch.allowCustomOption = undefined;
    } else if (next === "multi_text") {
      patch.options = undefined;
      patch.allowCustomOption = undefined;
      if (q.minCount == null) patch.minCount = 1;
      if (q.maxCount == null) patch.maxCount = 5;
    } else {
      patch.options = undefined;
      patch.allowCustomOption = undefined;
    }
    updateQuestion(qid, patch);
  }

  function updateChoice(qid: string, cid: string, label: string) {
    const q = value.questions.find((x) => x.id === qid);
    if (!q) return;
    const opts = (q.options ?? []).map((c) => (c.id === cid ? { ...c, label } : c));
    updateQuestion(qid, { options: opts });
  }

  function addChoice(qid: string) {
    const q = value.questions.find((x) => x.id === qid);
    if (!q) return;
    const opts: InterviewChoice[] = [...(q.options ?? []), { id: makeChoiceId(), label: "" }];
    updateQuestion(qid, { options: opts });
  }

  function removeChoice(qid: string, cid: string) {
    const q = value.questions.find((x) => x.id === qid);
    if (!q) return;
    const opts = (q.options ?? []).filter((c) => c.id !== cid);
    updateQuestion(qid, { options: opts });
  }

  function addQuestion() {
    const newQ: InterviewQuestion = {
      id: makeId(),
      order: value.questions.length + 1,
      prompt: "",
      answerType: "text_and_photo",
      required: true,
      maxChars: 400,
    };
    onChange({ ...value, questions: [...value.questions, newQ] });
  }

  function removeQuestion(qid: string) {
    if (!confirm("이 질문을 삭제할까요?")) return;
    const next = value.questions
      .filter((q) => q.id !== qid)
      .map((q, i) => ({ ...q, order: i + 1 }));
    onChange({ ...value, questions: next });
  }

  function moveQuestion(qid: string, dir: -1 | 1) {
    const idx = value.questions.findIndex((q) => q.id === qid);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= value.questions.length) return;
    const arr = [...value.questions];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange({ ...value, questions: arr.map((q, i) => ({ ...q, order: i + 1 })) });
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-violet-600" />
        <h3 className="font-bold text-violet-900">온라인 인터뷰 설계</h3>
      </div>
      <p className="mt-1 text-xs text-violet-700/80">
        질문을 순서대로 등록하면, 응답자는 대화형 UI로 한 질문씩 답변합니다.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">인터뷰 소개</label>
          <Textarea
            value={value.intro}
            onChange={(e) => update("intro", e.target.value)}
            placeholder="응답자에게 보여줄 인사말/안내문 (예: 안녕하세요! 학회 활동 소감을 듣고 싶어요.)"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">마감일 (선택)</label>
          <Input
            type="date"
            value={value.deadline ? value.deadline.slice(0, 10) : ""}
            onChange={(e) =>
              update("deadline", e.target.value ? new Date(e.target.value).toISOString() : undefined)
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">응답 열람 모드</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                (value.responseVisibility ?? "public") === "staff_only"
                  ? "border-violet-500 bg-violet-100/60 ring-2 ring-violet-300"
                  : "border-input bg-white hover:bg-violet-50/40"
              }`}
            >
              <input
                type="radio"
                name="responseVisibility"
                value="staff_only"
                checked={(value.responseVisibility ?? "public") === "staff_only"}
                onChange={() => update("responseVisibility", "staff_only")}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Lock size={14} className="text-violet-700" />
                  인터뷰 모드
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  관리자/학회장/운영진과 본인만 응답을 열람할 수 있습니다.
                </p>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                (value.responseVisibility ?? "public") === "public"
                  ? "border-violet-500 bg-violet-100/60 ring-2 ring-violet-300"
                  : "border-input bg-white hover:bg-violet-50/40"
              }`}
            >
              <input
                type="radio"
                name="responseVisibility"
                value="public"
                checked={(value.responseVisibility ?? "public") === "public"}
                onChange={() => update("responseVisibility", "public")}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Globe size={14} className="text-violet-700" />
                  공유 모드
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  로그인한 모든 회원이 다른 사람의 응답을 보고 반응·댓글을 남길 수 있습니다.
                </p>
              </div>
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            모드는 게시 후에도 변경 가능하며, 변경 시 즉시 적용됩니다.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">질문 ({value.questions.length})</span>
          {value.questions.length <= 2 && (
            <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
              <Plus size={14} className="mr-1" />
              질문 추가
            </Button>
          )}
        </div>

        {value.questions.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-violet-300 bg-white p-6 text-center text-sm text-muted-foreground">
            아직 질문이 없습니다. &quot;질문 추가&quot;로 시작하세요.
          </div>
        )}

        <div className="mt-3 space-y-3">
          {value.questions.map((q, i) => {
            const needsCharCount =
              q.answerType === "text" || q.answerType === "text_and_photo";
            return (
              <div key={q.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    Q{i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={q.prompt}
                      onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                      placeholder="질문을 입력하세요"
                      rows={2}
                    />
                    <Textarea
                      value={q.description ?? ""}
                      onChange={(e) =>
                        updateQuestion(q.id, { description: e.target.value || undefined })
                      }
                      placeholder="설명 (선택) — 응답자에게 보여줄 보조 안내문"
                      rows={2}
                      className="bg-muted/30 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={q.answerType}
                        onChange={(e) =>
                          changeAnswerType(q.id, e.target.value as InterviewAnswerType)
                        }
                        className="rounded-md border bg-white px-2 py-1"
                      >
                        {(Object.keys(ANSWER_TYPE_LABELS) as InterviewAnswerType[]).map((t) => (
                          <option key={t} value={t}>
                            {ANSWER_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                        />
                        필수
                      </label>
                      {needsCharCount && (
                        <>
                          <label className="flex items-center gap-1">
                            최대 글자수
                            <input
                              type="number"
                              min={0}
                              value={q.maxChars ?? 0}
                              disabled={q.maxChars == null}
                              onChange={(e) =>
                                updateQuestion(q.id, { maxChars: Number(e.target.value) || undefined })
                              }
                              className="w-16 rounded-md border bg-white px-2 py-1 disabled:bg-muted disabled:opacity-50"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={q.maxChars == null}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  maxChars: e.target.checked ? undefined : 400,
                                })
                              }
                            />
                            제한 없음
                          </label>
                        </>
                      )}
                      {(q.answerType === "multi_text" || q.answerType === "multi_choice") && (
                        <>
                          <label className="flex items-center gap-1">
                            {q.answerType === "multi_choice" ? "최소 선택" : "최소"}
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={q.minCount ?? 1}
                              onChange={(e) =>
                                updateQuestion(q.id, { minCount: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-14 rounded-md border bg-white px-2 py-1"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            {q.answerType === "multi_choice" ? "최대 선택" : "최대"}
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={q.maxCount ?? 5}
                              onChange={(e) =>
                                updateQuestion(q.id, { maxCount: Math.max(1, Number(e.target.value) || 1) })
                              }
                              className="w-14 rounded-md border bg-white px-2 py-1"
                            />
                          </label>
                        </>
                      )}
                    </div>

                    {(q.answerType === "single_choice" || q.answerType === "multi_choice") && (
                      <div className="rounded-md border bg-violet-50/50 p-3">
                        <p className="mb-2 text-xs font-semibold text-violet-700">
                          선택지 {q.answerType === "multi_choice" ? "(복수 선택 가능)" : "(단일 선택)"}
                        </p>
                        <div className="space-y-2">
                          {(q.options ?? []).map((c, ci) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{ci + 1}.</span>
                              <Input
                                value={c.label}
                                onChange={(e) => updateChoice(q.id, c.id, e.target.value)}
                                placeholder={`선택지 ${ci + 1}`}
                                className="flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => removeChoice(q.id, c.id)}
                                disabled={(q.options ?? []).length <= 2}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                                title="선택지 삭제"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addChoice(q.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900"
                        >
                          <Plus size={12} />
                          선택지 추가
                        </button>
                        <label className="mt-3 flex items-center gap-2 text-xs text-violet-800">
                          <input
                            type="checkbox"
                            checked={!!q.allowCustomOption}
                            onChange={(e) =>
                              updateQuestion(q.id, { allowCustomOption: e.target.checked })
                            }
                          />
                          응답자가 선지를 직접 추가할 수 있게 허용
                        </label>
                      </div>
                    )}

                    {q.answerType === "ox" && (
                      <p className="rounded-md bg-blue-50 p-2 text-xs text-blue-800">
                        응답자에게 ⭕ O / ❌ X 두 개의 버튼이 표시됩니다.
                      </p>
                    )}

                    {q.answerType === "multi_text" && (
                      <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                        응답자에게 짧은 텍스트 입력란을 {q.minCount ?? 1}~{q.maxCount ?? 5}개 표시합니다.
                        (예: &quot;키워드 3가지&quot; → 최소 3, 최대 3)
                      </p>
                    )}

                    {q.answerType === "fill_blank" && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                        <p className="font-semibold">빈칸 채우기</p>
                        <p className="mt-1">
                          질문에 <code className="rounded bg-white px-1">(   )</code> 또는 <code className="rounded bg-white px-1">___</code>을 넣으면 그 자리에 응답자의 입력창이 표시됩니다.
                        </p>
                        {fillBlankPreview(q.prompt) ? (
                          <div className="mt-2 rounded bg-white p-2 text-sm text-foreground">
                            <span className="text-xs font-semibold text-emerald-700">미리보기: </span>
                            {fillBlankPreview(q.prompt)}
                          </div>
                        ) : (
                          <p className="mt-2 text-amber-700">
                            ⚠️ 마커가 없습니다. 일반 텍스트 입력으로 표시됩니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => moveQuestion(q.id, -1)} className="rounded p-1 hover:bg-muted" title="위로">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveQuestion(q.id, 1)} className="rounded p-1 hover:bg-muted" title="아래로">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="삭제">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {value.questions.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="border-violet-300 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-900"
            >
              <Plus size={16} className="mr-1" />
              질문 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
