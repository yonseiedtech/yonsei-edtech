"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Save, FileText, CheckCircle2, ChevronLeft, ChevronRight,
  BookOpen, FlaskConical, Microscope, BarChart3, Flag,
  Play, Timer, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, WritingPaper, WritingPaperChapterKey } from "@/types";
import { useStudyTimerStore } from "./study-timer/study-timer-store";
import { useCreateSession, useStudySessionsByWritingPaper } from "./study-timer/useStudySessions";
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

/**
 * 챕터별 심사 방어 가이드 (2026-06-11) — 연구방법론 강의 커리큘럼
 * (타당도·인과·설계 위계·통계 선택·작성 원칙)을 챕터 맥락으로 일반화.
 * "지금 쓰는 장에서 심사위원이 무엇을 보는가" 관점의 체크 포인트.
 */
const CHAPTER_GUIDES: Record<WritingPaperChapterKey, string[]> = {
  intro: [
    "연구 필요성에 해당 분야 메타분석 결과를 인용하면 근거가 한층 강해집니다.",
    "연구 문제는 '개념'이 아니라 '변인' 수준으로 — 무엇을 어떻게 측정할지 보이게 진술하세요.",
    "'본 연구의 목적은 ~'으로 시작했으면 '~하는 데 있다'로 받아야 주술 호응이 맞습니다.",
    "핵심 용어는 처음 명명한 표현으로 논문 끝까지 통일합니다 (일관성 원칙).",
  ],
  background: [
    "핵심 구인마다 '개념 정의 → 측정 방법 → 선행연구 결과' 순으로 조직하면 읽기 쉽습니다.",
    "이론·정의는 현재시제(~이다), 특정 연구의 결과는 과거시제(~하였다)로 구분합니다.",
    "변인 간 관계의 선행연구 근거가 연구모형·가설로 자연스럽게 이어지는지 점검하세요.",
  ],
  method: [
    "설계 선택을 정당화하세요 — 현장 연구라면 '이질(비동등) 통제집단 사전-사후 설계'가 교육 연구에서 가장 강력하다는 위계로 설명할 수 있습니다.",
    "표본은 모집단 → 표집 방법 → 최종 표본 순으로, 탈락·결측은 실제 수치로 보고합니다.",
    "측정도구는 신뢰도(Cronbach's α)와 타당도(전문가 내용타당도·요인구조)를 함께 보고합니다.",
    "분석 방법 선택 이유를 명시하세요: 사전 점수 차이 통제=ANCOVA, 범주형 배경변수 동질성=카이제곱(χ²).",
  ],
  results: [
    "결과 기술은 과거시제로, p값과 함께 효과크기(Cohen's d, η²)를 보고합니다.",
    "가정 검정(정규성·등분산)을 먼저 보고하세요 — 정규성이 기각돼도 n≥30이면 중심극한정리로 방어할 수 있습니다.",
    "결과 장에서는 '차이가 있었다'(비교)로 기술하고, '효과를 미쳤다'(인과)는 설계 근거와 함께 논의에서 다룹니다.",
    "'매우·크게' 같은 모호한 정도 표현 대신 구체적 수치를 사용합니다 (정확성 원칙).",
  ],
  conclusion: [
    "결과 ≠ 결론 — 결과 요약을 넘어 해석과 시사점으로 나아가야 합니다.",
    "한계 절은 '내적/외적 타당도 위협' 프레임으로 구조화하세요: 성숙·호손효과·통계적 회귀 같은 요인을 명시적으로 호명하고 어떻게 통제·논의했는지 적습니다.",
    "인과 주장을 한다면 3요건(시간 선행·관련성·경쟁가설 배제) 충족을 구조적으로 논증하세요.",
    "후속연구 제언에서 매개 기제 검증은 구조방정식(SEM) 기반으로 제안하면 설득력이 높습니다.",
  ],
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

  const { active: timerActive, start: startTimer } = useStudyTimerStore();
  const { mutateAsync: createSession } = useCreateSession();
  const writingSessions = useStudySessionsByWritingPaper(paper?.id);
  const writingTotalMin = writingSessions.reduce((s, x) => s + (x.durationMinutes || 0), 0);
  const isTimerActive = timerActive?.writingPaperId === paper?.id;

  async function handleStartWritingTimer() {
    if (timerActive) { toast.error("이미 진행 중인 세션이 있습니다"); return; }
    if (!paper) return;
    try {
      const session = await createSession({
        type: "writing",
        writingPaperId: paper.id,
        targetTitle: form.title || "(제목 미정)",
      });
      startTimer({
        id: session.id,
        type: "writing",
        writingPaperId: paper.id,
        targetTitle: form.title || "(제목 미정)",
        startTime: Date.now(),
      });
    } catch { toast.error("타이머 시작에 실패했습니다"); }
  }

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<StepKey>("intro");
  // 챕터별 심사 방어 가이드 접힘 토글 (작성 공간 과밀 방지 — 기본 접힘)
  const [guideOpen, setGuideOpen] = useState(false);
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
      <p className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
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
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">논문</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                5장 구조로 집필하세요. · {total.toLocaleString()}자
                {writingTotalMin > 0 && (
                  <span className="ml-1">
                    · <Timer size={10} className="mr-0.5 inline" />
                    {writingTotalMin >= 60 ? `${Math.floor(writingTotalMin / 60)}시간 ${Math.round(writingTotalMin % 60)}분` : `${Math.round(writingTotalMin)}분`}
                  </span>
                )}
              </p>
            </div>
            {!readOnly && !isTimerActive && (
              <button
                type="button"
                onClick={handleStartWritingTimer}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <Play size={12} />
                작성 시작
              </button>
            )}
            {isTimerActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary animate-pulse">
                <Timer size={12} />
                측정 중
              </span>
            )}
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
      <div className="flex items-center gap-1 rounded-2xl border bg-card p-1.5">
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
      <section className="rounded-2xl border bg-card p-5">
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

        {/* 챕터별 심사 방어 가이드 — 연구방법론 강의 일반화 (기본 접힘) */}
        <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/10">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <Lightbulb size={13} />
              심사위원의 눈 — {STEPS[stepIdx].label} 체크 {CHAPTER_GUIDES[step].length}가지
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "shrink-0 text-amber-700/70 transition-transform dark:text-amber-300/70",
                guideOpen && "rotate-90",
              )}
            />
          </button>
          {guideOpen && (
            <ul className="space-y-1.5 border-t border-amber-200/60 px-3.5 py-3 dark:border-amber-800/40">
              {CHAPTER_GUIDES[step].map((tip, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                  <span className="mt-0.5 shrink-0">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 이전 / 다음 네비게이션 */}
      <div className="flex items-center justify-between rounded-2xl border bg-card p-3">
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
