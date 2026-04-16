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
}

const EMPTY: FormState = {
  paperType: "academic",
  title: "",
  authors: "",
  year: "",
  venue: "",
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

  async function handleDraftSave() {
    if (!form.title.trim()) {
      toast.error("제목은 필수입니다.");
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
    if (!form.title.trim()) {
      toast.error("제목은 필수입니다.");
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

  const titleEmpty = !form.title.trim();
  const canNext = !titleEmpty;
  const canJump = !titleEmpty;

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

        {/* Step indicator */}
        <div className="mt-2">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, idx) => {
              const isCurrent = s.num === step;
              const isDone = s.num < step;
              return (
                <div key={s.num} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => goStep(s.num)}
                    disabled={s.num !== 1 && titleEmpty}
                    className={cn(
                      "flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                      isCurrent
                        ? "text-primary"
                        : isDone
                          ? "text-foreground hover:bg-muted/60"
                          : "text-muted-foreground hover:bg-muted/40"
                    )}
                    title={titleEmpty && s.num !== 1 ? "제목을 먼저 입력하세요" : undefined}
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
                      <option value="bachelor">학사</option>
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
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.authors}
                  onChange={(e) => update("authors", e.target.value)}
                  placeholder="저자 (예: 홍길동, 김철수)"
                />
                <Input
                  value={form.year}
                  onChange={(e) => update("year", e.target.value)}
                  type="number"
                  placeholder="연도"
                />
              </div>
              <Input
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                placeholder={form.paperType === "thesis" ? "수여 기관 (예: 연세대학교)" : "저널/학회 (예: 교육공학연구)"}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.doi}
                  onChange={(e) => update("doi", e.target.value)}
                  placeholder="DOI"
                />
                <Input
                  value={form.url}
                  onChange={(e) => update("url", e.target.value)}
                  placeholder="URL"
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">변인</h4>
                <VariablesInput
                  value={form.variables}
                  onChange={(v) => update("variables", v)}
                />
              </section>
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
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">분류</h4>
              <div>
                <label className="mb-1 block text-xs font-medium">태그</label>
                <TagInput
                  value={form.tags}
                  onChange={(v) => update("tags", v)}
                  placeholder="예: SRL, 메타인지"
                  suggestions={tagSuggestions}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">읽기 상태</label>
                  <select
                    value={form.readStatus}
                    onChange={(e) => update("readStatus", e.target.value as PaperReadStatus)}
                    className="w-full rounded-md border px-2.5 py-2 text-sm"
                  >
                    <option value="to_read">읽을 예정</option>
                    <option value="reading">읽는 중</option>
                    <option value="completed">완독</option>
                  </select>
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
                </div>
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
              >
                다음
                <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving || titleEmpty}>
                {saving ? "저장 중..." : "완료"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
