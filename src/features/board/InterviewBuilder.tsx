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
  InterviewTargetCriteria,
  InterviewTargetRole,
} from "@/types";
import { INTERVIEW_TARGET_ROLE_LABELS } from "@/types";
import { SEMESTER_COUNT_OPTIONS } from "@/lib/interview-target";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, X, Lock, Globe, Users, Target, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { profilesApi } from "@/lib/bkend";
import type { User } from "@/types";

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
            <span className="mx-1 inline-block min-w-[60px] border-b-2 border-blue-500 px-2 text-center text-blue-700">
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
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-blue-600" />
        <h3 className="font-bold text-blue-900">온라인 인터뷰 설계</h3>
      </div>
      <p className="mt-1 text-xs text-blue-700/80">
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
          <label className="mb-1 block text-sm font-medium">공개 범위</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                (value.responseVisibility ?? "public") === "staff_only"
                  ? "border-blue-500 bg-blue-100/60 ring-2 ring-blue-300 dark:bg-blue-950/40"
                  : "border-input bg-card hover:bg-blue-50/40 dark:bg-card dark:hover:bg-blue-950/20"
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
                  <Lock size={14} className="text-blue-700 dark:text-blue-300" />
                  비공개 (1:1 인터뷰)
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  관리자/학회장/운영진과 본인만 응답을 열람할 수 있습니다.
                </p>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                (value.responseVisibility ?? "public") === "public"
                  ? "border-blue-500 bg-blue-100/60 ring-2 ring-blue-300 dark:bg-blue-950/40"
                  : "border-input bg-card hover:bg-blue-50/40 dark:bg-card dark:hover:bg-blue-950/20"
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
                  <Globe size={14} className="text-blue-700 dark:text-blue-300" />
                  공개 (실시간 공유)
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  로그인한 모든 회원이 응답을 실시간으로 보고 반응·댓글을 남길 수 있습니다.
                </p>
              </div>
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            게시 후에도 언제든 변경 가능하며, 변경 즉시 적용됩니다.
          </p>
        </div>

        {/* Sprint 67-AE: 인터뷰 대상자 필터 */}
        <TargetCriteriaSection value={value} onChange={onChange} />
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
          <div className="mt-3 rounded-lg border border-dashed border-blue-300 bg-card p-6 text-center text-sm text-muted-foreground">
            아직 질문이 없습니다. &quot;질문 추가&quot;로 시작하세요.
          </div>
        )}

        <div className="mt-3 space-y-3">
          {value.questions.map((q, i) => {
            const needsCharCount =
              q.answerType === "text" || q.answerType === "text_and_photo";
            return (
              <div key={q.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
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
                        className="rounded-md border bg-card px-2 py-1"
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
                              className="w-16 rounded-md border bg-card px-2 py-1 disabled:bg-muted disabled:opacity-50"
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
                              className="w-14 rounded-md border bg-card px-2 py-1"
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
                              className="w-14 rounded-md border bg-card px-2 py-1"
                            />
                          </label>
                        </>
                      )}
                    </div>

                    {(q.answerType === "single_choice" || q.answerType === "multi_choice") && (
                      <div className="rounded-md border bg-blue-50/50 p-3">
                        <p className="mb-2 text-xs font-semibold text-blue-700">
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
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                        >
                          <Plus size={12} />
                          선택지 추가
                        </button>
                        <label className="mt-3 flex items-center gap-2 text-xs text-blue-800">
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
                          질문에 <code className="rounded bg-card px-1">(   )</code> 또는 <code className="rounded bg-card px-1">___</code>을 넣으면 그 자리에 응답자의 입력창이 표시됩니다.
                        </p>
                        {fillBlankPreview(q.prompt) ? (
                          <div className="mt-2 rounded bg-card p-2 text-sm text-foreground">
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
              className="border-blue-300 bg-card text-blue-700 hover:bg-blue-50 hover:text-blue-900"
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

/**
 * Sprint 67-AE: 인터뷰 대상자 필터 UI
 * 4가지 카테고리 중 한 가지라도 매칭되면 응답 가능 (OR 조건)
 */
function TargetCriteriaSection({
  value,
  onChange,
}: {
  value: InterviewMeta;
  onChange: (v: InterviewMeta) => void;
}) {
  const criteria: InterviewTargetCriteria = value.targetCriteria ?? {};
  const [memberQuery, setMemberQuery] = useState("");

  // 회원 검색용 — 모든 회원 list 한 번 fetch (보통 학과 규모이므로 부담 없음)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["interview-target-users"],
    queryFn: async () => {
      const res = await profilesApi.list();
      return (res?.data ?? []) as User[];
    },
    staleTime: 60_000,
  });

  // 검색 결과 (이름·학번·이메일 부분 일치)
  const searchResults = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return [];
    const selected = new Set(criteria.userIds ?? []);
    return allUsers
      .filter((u) => {
        if (selected.has(u.id)) return false;
        if (u.studentId && selected.has(String(u.studentId))) return false;
        const hay = [u.name, u.studentId, u.email, u.affiliation, u.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [memberQuery, allUsers, criteria.userIds]);

  // 선택된 userIds → user info 매핑 (display 용)
  const selectedUsers = useMemo(() => {
    const ids = criteria.userIds ?? [];
    return ids.map((id) => {
      const u = allUsers.find((x) => x.id === id || String(x.studentId) === id);
      return { id, user: u };
    });
  }, [criteria.userIds, allUsers]);

  const update = (next: InterviewTargetCriteria) => {
    const hasAny =
      !!(next.userIds && next.userIds.length > 0) ||
      !!(next.entryYears && next.entryYears.length > 0) ||
      !!(next.entrySemesters && next.entrySemesters.length > 0) ||
      !!(next.semesterCounts && next.semesterCounts.length > 0) ||
      !!(next.roles && next.roles.length > 0);
    onChange({ ...value, targetCriteria: hasAny ? next : undefined });
  };

  function toggleEntryYear(y: number) {
    const cur = criteria.entryYears ?? [];
    update({
      ...criteria,
      entryYears: cur.includes(y) ? cur.filter((v) => v !== y) : [...cur, y],
    });
  }

  function toggleEntrySemester(s: "first" | "second") {
    const cur = criteria.entrySemesters ?? [];
    update({
      ...criteria,
      entrySemesters: cur.includes(s) ? cur.filter((v) => v !== s) : [...cur, s],
    });
  }

  function toggleSemesterCount(c: number) {
    const cur = criteria.semesterCounts ?? [];
    update({
      ...criteria,
      semesterCounts: cur.includes(c) ? cur.filter((v) => v !== c) : [...cur, c],
    });
  }

  function toggleRole(r: InterviewTargetRole) {
    const cur = criteria.roles ?? [];
    update({
      ...criteria,
      roles: cur.includes(r) ? cur.filter((v) => v !== r) : [...cur, r],
    });
  }

  function addUser(u: User) {
    const cur = criteria.userIds ?? [];
    if (cur.includes(u.id)) return;
    update({ ...criteria, userIds: [...cur, u.id] });
    setMemberQuery("");
  }

  function removeUser(id: string) {
    const cur = criteria.userIds ?? [];
    update({ ...criteria, userIds: cur.filter((x) => x !== id) });
  }

  // 입학연도 옵션: 최근 8년 (현재 연도 ~ -7)
  const currentYear = new Date().getFullYear();
  const entryYearOptions = Array.from({ length: 8 }, (_, i) => currentYear - i);

  const roles: InterviewTargetRole[] = ["general", "staff", "chair", "vice_chair", "major_rep", "ta", "alumni_rep"];

  return (
    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="mb-3 flex items-center gap-2">
        <Target size={14} className="text-blue-700 dark:text-blue-300" />
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          인터뷰 대상자 (선택)
        </h3>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-blue-800/80 dark:text-blue-200/80">
        대상을 비워두면 모든 회원이 응답 가능합니다. 여러 카테고리 동시 사용 시 한 가지라도 일치하면 응답 가능 (OR 조건).
      </p>

      <div className="space-y-3">
        {/* 입학시점: 연도 + 학기 (전기/후기) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900 dark:text-blue-100">
            입학시점 별 (연도 · 학기)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {entryYearOptions.map((y) => {
              const checked = criteria.entryYears?.includes(y) ?? false;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => toggleEntryYear(y)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-muted"
                  }`}
                >
                  {y}학년도
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["first", "second"] as const).map((s) => {
              const checked = criteria.entrySemesters?.includes(s) ?? false;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleEntrySemester(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-muted"
                  }`}
                >
                  {s === "first" ? "전기 입학 (3월)" : "후기 입학 (9월)"}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-blue-800/70 dark:text-blue-200/70">
            연도와 학기 함께 선택 시 둘 다 일치하는 회원만 매칭 (AND).
          </p>
        </div>

        {/* 누적 학기차 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900 dark:text-blue-100">
            누적 학기차
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SEMESTER_COUNT_OPTIONS.map((opt) => {
              const checked = criteria.semesterCounts?.includes(opt.value) ?? false;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSemesterCount(opt.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 계층/역할 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900 dark:text-blue-100">
            계층 / 역할
          </label>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => {
              const checked = criteria.roles?.includes(r) ?? false;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-muted"
                  }`}
                >
                  {INTERVIEW_TARGET_ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 특정 회원: 검색 → 결과 → 선택 chip */}
        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900 dark:text-blue-100">
            특정 회원 (이름·학번·이메일로 검색 후 선택)
          </label>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="회원 검색…"
              className="pl-7"
            />
          </div>
          {memberQuery.trim() && searchResults.length > 0 && (
            <ul className="mt-2 max-h-52 overflow-y-auto rounded-md border bg-card">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 border-b px-2 py-1.5 text-xs last:border-b-0 hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {u.name}{" "}
                      {u.studentId && (
                        <span className="text-muted-foreground">· {u.studentId}</span>
                      )}
                    </p>
                    {(u.affiliation || u.email) && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {[u.affiliation, u.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addUser(u)}
                    className="h-6 px-2 text-[11px]"
                  >
                    <Plus size={10} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {memberQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}
          {selectedUsers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedUsers.map(({ id, user: u }) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  <Users size={10} />
                  {u?.name ?? id}
                  {u?.studentId ? ` (${u.studentId})` : ""}
                  <button
                    type="button"
                    onClick={() => removeUser(id)}
                    className="ml-0.5 hover:text-destructive"
                    aria-label="제거"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
