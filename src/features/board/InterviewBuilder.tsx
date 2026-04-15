"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewMeta, InterviewQuestion, InterviewAnswerType } from "@/types";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

interface Props {
  value: InterviewMeta;
  onChange: (v: InterviewMeta) => void;
}

const ANSWER_TYPE_LABELS: Record<InterviewAnswerType, string> = {
  text: "텍스트",
  photo: "사진",
  text_and_photo: "텍스트 + 사진",
};

function makeId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">질문 ({value.questions.length})</span>
          <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
            <Plus size={14} className="mr-1" />
            질문 추가
          </Button>
        </div>

        {value.questions.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-violet-300 bg-white p-6 text-center text-sm text-muted-foreground">
            아직 질문이 없습니다. &quot;질문 추가&quot;로 시작하세요.
          </div>
        )}

        <div className="mt-3 space-y-3">
          {value.questions.map((q, i) => (
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
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={q.answerType}
                      onChange={(e) =>
                        updateQuestion(q.id, { answerType: e.target.value as InterviewAnswerType })
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
                    <label className="flex items-center gap-1">
                      최대 글자수
                      <input
                        type="number"
                        min={0}
                        value={q.maxChars ?? 0}
                        onChange={(e) =>
                          updateQuestion(q.id, { maxChars: Number(e.target.value) || undefined })
                        }
                        className="w-16 rounded-md border bg-white px-2 py-1"
                      />
                    </label>
                  </div>
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
          ))}
        </div>
      </div>
    </div>
  );
}
