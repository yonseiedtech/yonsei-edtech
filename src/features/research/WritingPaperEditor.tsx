"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Save, FileText, CheckCircle2, ChevronLeft, ChevronRight,
  BookOpen, FlaskConical, Microscope, BarChart3, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, WritingPaper, WritingPaperChapterKey } from "@/types";
import {
  useWritingPaper,
  useEnsureWritingPaper,
  useUpdateWritingPaper,
} from "./useWritingPaper";
import { useLogWritingActivity } from "./useWritingPaperHistory";

interface Props {
  user: User;
  readOnly?: boolean;
}

const STEPS = [
  { key: "intro" as const, label: "서론", icon: BookOpen },
  { key: "background" as const, label: "이론적 배경", icon: FlaskConical },
  { key: "method" as const, label: "연구 방법", icon: Microscope },
  { key: "results" as const, label: "연구 결과", icon: BarChart3 },
  { key: "conclusion" as const, label: "결론", icon: Flag },
];

type StepKey = (typeof STEPS)[number]["key"];

const CHAPTER_PLACEHOLDER: Record<WritingPaperChapterKey, string> = {
  intro: "연구 배경 · 문제 제기 · 연구 목적 · 연구 문제",
  background: "핵심 이론 · 선행 연구 · 개념 정의",
  method: "연구 설계 · 참여자 · 도구 · 절차 · 분석 방법",
  results: "주요 결과 · 표/그림 설명 · 통계 결과",
  conclusion: "결론 요약 · 시사점 · 한계 및 후속연구",
};

interface FormState {
  title: string;
  chapters: Record<WritingPaperChapterKey, string>;
}

const EMPTY: FormState = {
  title: "",
  chapters: {
    intro: "",
    background: "",
    method: "",
    results: "",
    conclusion: "",
  },
};

function fromPaper(p: WritingPaper | undefined): FormState {
  if (!p) return EMPTY;
  return {
    title: p.title ?? "",
    chapters: {
      intro: p.chapters?.intro ?? "",
      background: p.chapters?.background ?? "",
      method: p.chapters?.method ?? "",
      results: p.chapters?.results ?? "",
      conclusion: p.chapters?.conclusion ?? "",
    },
  };
}

function totalChars(form: FormState): number {
  return Object.values(form.chapters).reduce((sum, v) => sum + v.length, 0);
}

export default function WritingPaperEditor({ user, readOnly = false }: Props) {
  const { paper, isLoading } = useWritingPaper(user.id);
  const ensure = useEnsureWritingPaper();
  const update = useUpdateWritingPaper();
  const logActivity = useLogWritingActivity();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<StepKey>("intro");
  const ensureTriggeredRef = useRef(false);

  useEffect(() => {
    if (readOnly || isLoading || paper || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [paper, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (paper && !hydrated) {
      setForm(fromPaper(paper));
      setSavedAt(paper.lastSavedAt ?? paper.updatedAt ?? null);
      setHydrated(true);
    }
  }, [paper, hydrated]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function setChapter(key: WritingPaperChapterKey, value: string) {
    setForm((prev) => ({ ...prev, chapters: { ...prev.chapters, [key]: value } }));
    setDirty(true);
  }

  async function handleSave(showToast = true) {
    if (!paper || readOnly) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await update.mutateAsync({
        id: paper.id,
        data: {
          title: form.title,
          chapters: form.chapters,
          lastSavedAt: now,
        },
      });
      setSavedAt(now);
      setDirty(false);
      logActivity.mutate({
        userId: user.id,
        paperId: paper.id,
        charCount: totalChars(form),
        lastChapter: step,
        title: form.title?.trim() || undefined,
      });
      if (showToast) toast.success("저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDraftSave() {
    await handleSave(false);
    toast.success("임시 저장되었습니다.");
  }

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canPrev = stepIdx > 0;
  const canNext = stepIdx < STEPS.length - 1;
  const total = useMemo(() => totalChars(form), [form]);

  if (isLoading || (!paper && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-white py-10 text-center text-sm text-muted-foreground">
        논문을 불러오는 중...
      </p>
    );
  }

  if (!paper && readOnly) {
    return (
      <p className="rounded-2xl border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
        아직 작성된 논문이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">논문</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                5장 구조로 집필하세요. · {total.toLocaleString()}자
              </p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-2">
              {savedAt && !saving && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  {(() => {
                    const diff = Date.now() - new Date(savedAt).getTime();
                    if (diff < 60_000) return "방금 저장됨";
                    const t = new Date(savedAt);
                    return `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")} 저장됨`;
                  })()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleDraftSave} disabled={saving || !dirty}>
                {saving && <Save size={12} className="mr-1 animate-pulse" />}
                임시저장
              </Button>
              <Button size="sm" onClick={() => handleSave()} disabled={saving}>
                <Save size={12} className="mr-1" />
                저장
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">제목</label>
          <Input
            className="mt-1"
            value={form.title}
            placeholder="예: AI 기반 자기조절학습이 학업성취에 미치는 영향"
            onChange={(e) => setField("title", e.target.value)}
            disabled={readOnly || !paper}
          />
        </div>
      </section>

      {/* 스텝 탭 */}
      <div className="flex items-center gap-1 rounded-xl border bg-white p-1.5">
        {STEPS.map((s, i) => {
          const active = step === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon size={14} />
              <span className="hidden sm:inline">{i + 1}. {s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 스텝 내용 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {stepIdx + 1}. {STEPS[stepIdx].label}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            {(form.chapters[step] ?? "").length.toLocaleString()}자
          </span>
        </div>
        <Textarea
          className="mt-3 font-sans text-sm leading-relaxed"
          rows={14}
          value={form.chapters[step] ?? ""}
          placeholder={CHAPTER_PLACEHOLDER[step]}
          onChange={(e) => setChapter(step, e.target.value)}
          disabled={readOnly || !paper}
        />
      </section>

      {/* 이전 / 다음 네비게이션 */}
      <div className="flex items-center justify-between rounded-xl border bg-white p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx - 1].key)}
          disabled={!canPrev}
        >
          <ChevronLeft size={14} className="mr-1" />
          이전
        </Button>
        <span className="text-xs text-muted-foreground">
          {stepIdx + 1} / {STEPS.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx + 1].key)}
          disabled={!canNext}
        >
          다음
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
