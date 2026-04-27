"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronLeft, ChevronRight, Save, Check } from "lucide-react";
import { toast } from "sonner";
import type {
  ResearchPaper,
  PaperType,
  ThesisLevel,
  PaperReadStatus,
  PaperVariables,
} from "@/types";
import VariablesInput from "./VariablesInput";
import TagInput from "./TagInput";
import { todayYmdLocal } from "@/lib/dday";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5 as const;
type StepNum = 1 | 2 | 3 | 4 | 5;

const STEPS: { num: StepNum; label: string }[] = [
  { num: 1, label: "기본 정보" },
  { num: 2, label: "변인·연구방법" },
  { num: 3, label: "참고문헌" },
  { num: 4, label: "인사이트" },
  { num: 5, label: "분류" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ResearchPaper | null;
  tagSuggestions: string[];
  /**
   * onSubmit은 위저드의 "완료" 또는 "임시 저장" 버튼이 호출한다.
   * 반환값(저장된 ResearchPaper)이 있으면 해당 id로 editing 승격에 사용된다 (신규 → update 전환).
   */
  onSubmit: (
    data: Partial<ResearchPaper>,
    opts: { isDraft: boolean }
  ) => Promise<ResearchPaper | void> | ResearchPaper | void;
}

interface FormState {
  paperType: PaperType;
  thesisLevel?: ThesisLevel;
  title: string;
  authors: string;
  year: string;
  venue: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  variables: PaperVariables;
  methodology: string;
  findings: string;
  references: string;
  insights: string;
  myConnection: string;
  tags: string[];
  readStatus: PaperReadStatus;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  readStartedAt: string;
  readCompletedAt: string;
}

const EMPTY: FormState = {
  paperType: "academic",
  title: "",
  authors: "",
  year: "",
  venue: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
  variables: {},
  methodology: "",
  findings: "",
  references: "",
  insights: "",
  myConnection: "",
  tags: [],
  readStatus: "to_read",
  rating: 0,
  readStartedAt: "",
  readCompletedAt: "",
};

function clampStep(n: number): StepNum {
  if (n < 1) return 1;
  if (n > TOTAL_STEPS) return TOTAL_STEPS as StepNum;
  return n as StepNum;
}

export default function ResearchPaperDialog({
  open,
  onOpenChange,
  initial,
  tagSuggestions,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<StepNum>(1);
  // 신규 작성 중 임시저장으로 승격된 경우의 id (또는 initial.id)
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          paperType: initial.paperType,
          thesisLevel: initial.thesisLevel,
          title: initial.title ?? "",
          authors: initial.authors ?? "",
          year: initial.year ? String(initial.year) : "",
          venue: initial.venue ?? "",
          volume: initial.volume ?? "",
          issue: initial.issue ?? "",
          pages: initial.pages ?? "",
          doi: initial.doi ?? "",
          url: initial.url ?? "",
          variables: initial.variables ?? {},
          methodology: initial.methodology ?? "",
          findings: initial.findings ?? "",
          references: initial.references ?? "",
          insights: initial.insights ?? "",
          myConnection: initial.myConnection ?? "",
          tags: initial.tags ?? [],
          readStatus: initial.readStatus ?? "to_read",
          rating: (initial.rating ?? 0) as FormState["rating"],
          readStartedAt: initial.readStartedAt ?? "",
          readCompletedAt: initial.readCompletedAt ?? "",
        });
        setStep(clampStep(initial.lastEditStep ?? 1));
        setDraftId(initial.id);
      } else {
        setForm(EMPTY);
        setStep(1);
        setDraftId(null);
      }
      setDirty(false);
    }
  }, [open, initial]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function tryClose(next: boolean) {
    if (!next && dirty) {
      if (!confirm("변경사항이 저장되지 않았습니다. 닫을까요? (임시 저장 버튼으로 보존할 수 있어요.)")) return;
    }
    onOpenChange(next);
  }

  function buildPayload(opts: { isDraft: boolean; stepForDraft: StepNum }): Partial<ResearchPaper> {
    const base: Partial<ResearchPaper> = {
      paperType: form.paperType,
      thesisLevel: form.paperType === "thesis" ? form.thesisLevel : undefined,
      title: form.title.trim(),
      authors: form.authors.trim() || undefined,
      year: form.year ? Number(form.year) : undefined,
      venue: form.venue.trim() || undefined,
      volume: form.paperType === "academic" && form.volume.trim() ? form.volume.trim() : undefined,
      issue: form.paperType === "academic" && form.issue.trim() ? form.issue.trim() : undefined,
      pages: form.paperType === "academic" && form.pages.trim() ? form.pages.trim() : undefined,
      doi: form.doi.trim() || undefined,
      url: form.url.trim() || undefined,
      variables:
        Object.values(form.variables).some((v) => v && v.length > 0)
          ? form.variables
          : undefined,
      methodology: form.methodology.trim() || undefined,
      findings: form.findings.trim() || undefined,
      references: form.references.trim() || undefined,
      insights: form.insights.trim() || undefined,
      myConnection: form.myConnection.trim() || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
      readStatus: form.readStatus,
      rating: form.rating > 0 ? (form.rating as 1 | 2 | 3 | 4 | 5) : undefined,
      readStartedAt: form.readStartedAt || undefined,
      readCompletedAt: form.readCompletedAt || undefined,
    };
    if (opts.isDraft) {
      base.isDraft = true;
      base.lastEditStep = opts.stepForDraft;
    } else {
      base.isDraft = false;
      base.lastEditStep = undefined;
    }
    return base;
  }

  // 필수 입력 검증 상태 (기본정보 단계 필수: 제목 / 저자 / 연도)
  const titleEmpty = !form.title.trim();
  const authorsEmpty = !form.authors.trim();
  const yearEmpty = !form.year.trim();
  const basicsInvalid = titleEmpty || authorsEmpty || yearEmpty;

  function describeMissingBasics(): string {
    const missing: string[] = [];
    if (titleEmpty) missing.push("제목");
    if (authorsEmpty) missing.push("저자");
    if (yearEmpty) missing.push("연도");
    return missing.join(" · ");
  }

  async function handleDraftSave() {
    if (titleEmpty) {
      toast.error("제목은 필수입니다. (임시 저장이라도 제목은 있어야 해요)");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload({ isDraft: true, stepForDraft: step });
      const res = await onSubmit(payload, { isDraft: true });
      // 신규로 저장된 경우 응답 id를 보관해 다음 임시저장이 update가 되도록 한다.
      if (res && typeof res === "object" && "id" in res && res.id) {
        setDraftId(res.id);
      }
      setDirty(false);
      toast.success("임시 저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (basicsInvalid) {
      toast.error(`기본 정보 필수 항목이 비어있습니다: ${describeMissingBasics()}`);
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload({ isDraft: false, stepForDraft: step });
      await onSubmit(payload, { isDraft: false });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  // 다음 단계 진행은 기본정보 3종 모두 충족해야 함 (1단계 → 2단계 진입 조건)
  const canNext = step === 1 ? !basicsInvalid : true;
  // step bar에서 1 외 다른 단계로 점프할 수 있는 조건
  const canJump = !basicsInvalid;

  function goStep(target: StepNum) {
    if (target === 1) {
      setStep(1);
      return;
    }
    if (!canJump) return;
    setStep(target);
  }

  return (
    <Dialog open={open} onOpenChange={tryClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "논문 편집" : draftId ? "논문 추가 (임시저장 중)" : "논문 추가"}
          </DialogTitle>
          <DialogDescription>
            단계별로 작성할 수 있어요. 언제든 <span className="font-medium text-amber-700">임시 저장</span>해두고 나중에 이어쓸 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator — 모바일은 동그라미만, 데스크톱은 라벨까지 */}
        <div className="mt-2">
          {/* 모바일: 현재 단계명 + 진행 표시 */}
          <div className="sm:hidden">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">
                Step {step}/{TOTAL_STEPS} · {STEPS[step - 1].label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {step < TOTAL_STEPS ? `다음: ${STEPS[step].label}` : "마지막 단계"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {STEPS.map((s) => {
                const isCurrent = s.num === step;
                const isDone = s.num < step;
                const disabled = s.num !== 1 && !canJump;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => goStep(s.num)}
                    disabled={disabled}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded-full border text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isDone
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground"
                    )}
                    aria-label={`${s.num}단계: ${s.label}`}
                  >
                    {isDone ? <Check size={12} /> : s.num}
                  </button>
                );
              })}
            </div>
          </div>
          {/* 데스크톱: 라벨까지 표시 */}
          <div className="hidden items-center justify-between gap-1 sm:flex">
            {STEPS.map((s, idx) => {
              const isCurrent = s.num === step;
              const isDone = s.num < step;
              const disabled = s.num !== 1 && !canJump;
              return (
                <div key={s.num} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => goStep(s.num)}
                    disabled={disabled}
                    className={cn(
                      "flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                      isCurrent
                        ? "text-primary"
                        : isDone
                          ? "text-foreground hover:bg-muted/60"
                          : "text-muted-foreground hover:bg-muted/40"
                    )}
                    title={disabled ? "기본 정보(제목·저자·연도)를 먼저 모두 입력하세요" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isDone
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/40 text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check size={11} /> : s.num}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <span className="mx-0.5 hidden h-px w-2 bg-border sm:inline-block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step body */}
        <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {step === 1 && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">기본 정보</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">논문 유형</label>
                  <select
                    value={form.paperType}
                    onChange={(e) => update("paperType", e.target.value as PaperType)}
                    className="w-full rounded-md border px-2.5 py-2 text-sm"
                  >
                    <option value="academic">학술논문</option>
                    <option value="thesis">학위논문</option>
                  </select>
                </div>
                {form.paperType === "thesis" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium">학위 수준</label>
                    <select
                      value={form.thesisLevel ?? ""}
                      onChange={(e) =>
                        update("thesisLevel", (e.target.value || undefined) as ThesisLevel | undefined)
                      }
                      className="w-full rounded-md border px-2.5 py-2 text-sm"
                    >
                      <option value="">선택</option>
                      <option value="master">석사</option>
                      <option value="doctoral">박사</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  제목 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="논문 제목"
                  aria-invalid={titleEmpty}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    저자 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.authors}
                    onChange={(e) => update("authors", e.target.value)}
                    placeholder="예: 홍길동, 김철수"
                    aria-invalid={authorsEmpty}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    연도 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    type="number"
                    placeholder="예: 2024"
                    aria-invalid={yearEmpty}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  {form.paperType === "thesis" ? "수여 기관" : "저널/학회"}
                </label>
                <Input
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder={form.paperType === "thesis" ? "예: 연세대학교" : "예: 교육공학연구"}
                />
              </div>
              {form.paperType === "academic" && (
                <div>
                  <label className="mb-1 block text-xs font-medium">권 · 호 · 페이지</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={form.volume}
                      onChange={(e) => update("volume", e.target.value)}
                      placeholder="권 (예: 40)"
                    />
                    <Input
                      value={form.issue}
                      onChange={(e) => update("issue", e.target.value)}
                      placeholder="호 (예: 2)"
                    />
                    <Input
                      value={form.pages}
                      onChange={(e) => update("pages", e.target.value)}
                      placeholder="페이지 (123-150)"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">DOI</label>
                  <Input
                    value={form.doi}
                    onChange={(e) => update("doi", e.target.value)}
                    placeholder="10.xxxx/yyyy"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => update("url", e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="border-t pt-3">
                <label className="mb-1 block text-xs font-medium">읽기 상태</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["to_read", "reading", "completed"] as PaperReadStatus[]).map((s) => {
                    const label = s === "to_read" ? "읽을 예정" : s === "reading" ? "읽는 중" : "완독";
                    const isActive = form.readStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const today = todayYmdLocal();
                          setForm((prev) => {
                            const next = { ...prev, readStatus: s };
                            if (s === "reading" && !prev.readStartedAt) next.readStartedAt = today;
                            if (s === "completed") {
                              if (!prev.readStartedAt) next.readStartedAt = today;
                              if (!prev.readCompletedAt) next.readCompletedAt = today;
                            }
                            return next;
                          });
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition",
                          isActive
                            ? s === "to_read"
                              ? "border-amber-500 bg-amber-50 text-amber-800"
                              : s === "reading"
                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                : "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-muted text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">읽기 시작일</label>
                    <Input
                      type="date"
                      value={form.readStartedAt}
                      onChange={(e) => update("readStartedAt", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">완독일</label>
                    <Input
                      type="date"
                      value={form.readCompletedAt}
                      onChange={(e) => update("readCompletedAt", e.target.value)}
                    />
                  </div>
                </div>
                {form.readStartedAt && form.readCompletedAt && (() => {
                  const s = Date.parse(form.readStartedAt);
                  const e = Date.parse(form.readCompletedAt);
                  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
                  if (e < s) {
                    return <p className="mt-1 text-[11px] text-destructive">완독일이 시작일보다 빠릅니다.</p>;
                  }
                  const days = Math.round((e - s) / 86400000);
                  return <p className="mt-1 text-[11px] text-emerald-700">소요 기간: {days}일</p>;
                })()}
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">연구방법 · 결과</h4>
                <div>
                  <label className="mb-1 block text-xs font-medium">연구방법</label>
                  <Input
                    value={form.methodology}
                    onChange={(e) => update("methodology", e.target.value)}
                    placeholder="예: 양적 (사전-사후 실험설계, n=120)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">연구결과</label>
                  <Textarea
                    value={form.findings}
                    onChange={(e) => update("findings", e.target.value)}
                    placeholder="예: 자기조절학습이 학업성취도에 정적 영향(β=.32)"
                    rows={4}
                  />
                </div>
              </section>
              <section className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">변인</h4>
                <VariablesInput
                  value={form.variables}
                  onChange={(v) => update("variables", v)}
                />
              </section>
            </>
          )}

          {step === 3 && (
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">참고문헌</h4>
              <p className="text-xs text-muted-foreground">
                원문 그대로 복사·붙여넣기 하세요. <span className="font-medium text-foreground">분량 제한 없음</span> · 한 줄당 1건 권장.
                향후 인용 네트워크 시각화·데이터 분석의 기반이 됩니다.
              </p>
              <Textarea
                value={form.references}
                onChange={(e) => update("references", e.target.value)}
                placeholder={`예) Zimmerman, B. J. (2002). Becoming a self-regulated learner. Theory Into Practice, 41(2), 64-70.\n홍길동, 김철수. (2024). 자기조절학습이 학업성취에 미치는 영향. 교육공학연구, 40(2), 123-150.`}
                rows={14}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed"
                style={{ resize: "vertical" }}
              />
              {form.references.trim().length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  현재 {form.references.length.toLocaleString()}자 ·{" "}
                  {form.references.split("\n").filter((l) => l.trim().length > 0).length}줄
                </p>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">인사이트 · 내 연구와의 접점</h4>
              <div>
                <label className="mb-1 block text-xs font-medium">인사이트</label>
                <Textarea
                  value={form.insights}
                  onChange={(e) => update("insights", e.target.value)}
                  placeholder="예: 학습몰입을 매개로 살펴본 점이 흥미로움"
                  rows={4}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">내 연구와의 접점</label>
                <Textarea
                  value={form.myConnection}
                  onChange={(e) => update("myConnection", e.target.value)}
                  placeholder="예: 내 연구의 종속변수와 동일 → 측정도구 참고 가능"
                  rows={4}
                />
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">분류 · 평점</h4>
              <div>
                <label className="mb-1 block text-xs font-medium">태그</label>
                <TagInput
                  value={form.tags}
                  onChange={(v) => update("tags", v)}
                  placeholder="예: SRL, 메타인지"
                  suggestions={tagSuggestions}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">평점</label>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => update("rating", (form.rating === n ? 0 : n) as FormState["rating"])}
                      className="p-1 text-amber-500 hover:scale-110"
                    >
                      <Star
                        size={20}
                        fill={n <= form.rating ? "currentColor" : "none"}
                        strokeWidth={n <= form.rating ? 0 : 1.5}
                      />
                    </button>
                  ))}
                  {form.rating > 0 && (
                    <button
                      type="button"
                      onClick={() => update("rating", 0)}
                      className="ml-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      지우기
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  읽기 상태는 <span className="font-medium">1단계 기본 정보</span>에서 설정하거나, 카드의 상태 배지를 직접 클릭해 토글할 수 있어요.
                </p>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="mt-6 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => tryClose(false)} disabled={saving}>
              취소
            </Button>
            <Button
              variant="ghost"
              onClick={handleDraftSave}
              disabled={saving || titleEmpty}
              className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              title={titleEmpty ? "제목을 먼저 입력하세요" : "현재까지 입력한 내용을 임시로 저장합니다"}
            >
              <Save size={14} className="mr-1" />
              임시 저장
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => clampStep(s - 1))}
              disabled={saving || step === 1}
            >
              <ChevronLeft size={14} className="mr-1" />
              이전
            </Button>
            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep((s) => clampStep(s + 1))}
                disabled={saving || !canNext}
                title={!canNext ? `필수: ${describeMissingBasics()}` : undefined}
              >
                다음
                <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={saving || basicsInvalid}
                title={basicsInvalid ? `필수: ${describeMissingBasics()}` : undefined}
              >
                {saving ? "저장 중..." : "완료"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
