"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Save, CheckCircle2, ClipboardList, Link2, X,
  BookMarked,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, ResearchProposal, ResearchPaper } from "@/types";
import {
  useResearchProposal,
  useEnsureResearchProposal,
  useUpdateResearchProposal,
} from "./useResearchProposal";
import { useResearchPapers } from "./useResearchPapers";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import { formatApa7 } from "@/lib/apa7";

interface Props {
  user: User;
  readOnly?: boolean;
}

interface FormState {
  titleKo: string;
  titleEn: string;
  purpose: string;
  scope: string;
  method: string;
  content: string;
  referencePaperIds: string[];
}

const EMPTY: FormState = {
  titleKo: "",
  titleEn: "",
  purpose: "",
  scope: "",
  method: "",
  content: "",
  referencePaperIds: [],
};

function fromProposal(p: ResearchProposal | undefined): FormState {
  if (!p) return EMPTY;
  return {
    titleKo: p.titleKo ?? "",
    titleEn: p.titleEn ?? "",
    purpose: p.purpose ?? "",
    scope: p.scope ?? "",
    method: p.method ?? "",
    content: p.content ?? "",
    referencePaperIds: p.referencePaperIds ?? [],
  };
}

function totalChars(form: FormState): number {
  return (
    form.titleKo.length +
    form.titleEn.length +
    form.purpose.length +
    form.scope.length +
    form.method.length +
    form.content.length
  );
}

function PaperSelector({
  papers,
  selectedIds,
  onToggle,
  disabled,
}: {
  papers: ResearchPaper[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = papers.filter(
    (p) =>
      !p.isDraft &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.authors ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selectedIds.map((id) => {
          const p = papers.find((x) => x.id === id);
          const label = p ? p.title.slice(0, 30) + (p.title.length > 30 ? "…" : "") : id;
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
              {label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                >
                  <X size={10} />
                </button>
              )}
            </Badge>
          );
        })}
      </div>
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Link2 size={12} />
            논문 연결 (참고문헌 추가)
          </button>
          {open && (
            <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border bg-white p-2 shadow-lg">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="논문 제목·저자 검색..."
                className="mb-2 h-8 text-xs"
                autoFocus
              />
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">검색 결과 없음</p>
                ) : (
                  filtered.slice(0, 20).map((p) => {
                    const sel = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onToggle(p.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          sel ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                      >
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px]">
                          {sel ? "✓" : ""}
                        </span>
                        <span className="line-clamp-2">
                          {p.title} {p.year ? `(${p.year})` : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 w-full rounded-md bg-muted py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResearchProposalEditor({ user, readOnly = false }: Props) {
  const { proposal, isLoading } = useResearchProposal(user.id);
  const ensure = useEnsureResearchProposal();
  const update = useUpdateResearchProposal();
  const logActivity = useLogWritingActivity();
  const { papers } = useResearchPapers(user.id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ensureTriggeredRef = useRef(false);

  useEffect(() => {
    if (readOnly || isLoading || proposal || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [proposal, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (proposal && !hydrated) {
      setForm(fromProposal(proposal));
      setSavedAt(proposal.lastSavedAt ?? proposal.updatedAt ?? null);
      setHydrated(true);
    }
  }, [proposal, hydrated]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function toggleReference(paperId: string) {
    const ids = form.referencePaperIds.includes(paperId)
      ? form.referencePaperIds.filter((x) => x !== paperId)
      : [...form.referencePaperIds, paperId];
    setField("referencePaperIds", ids);
  }

  async function handleSave(showToast = true) {
    if (!proposal || readOnly) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await update.mutateAsync({
        id: proposal.id,
        data: { ...form, lastSavedAt: now },
      });
      setSavedAt(now);
      setDirty(false);
      logActivity.mutate({
        userId: user.id,
        paperId: proposal.id,
        charCount: totalChars(form),
        lastChapter: "proposal" as never,
        title: form.titleKo || "연구 계획서",
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

  const total = useMemo(() => totalChars(form), [form]);

  // 참고문헌(ResearchPaper) 데이터 → APA7 목록 (저자·연도 순 정렬)
  const referencedPapers = useMemo(
    () => papers.filter((p) => form.referencePaperIds.includes(p.id)),
    [papers, form.referencePaperIds],
  );
  const apa7Sorted = useMemo(
    () =>
      [...referencedPapers].sort((a, b) => {
        const an = (a.authors ?? "").localeCompare(b.authors ?? "", "ko");
        if (an !== 0) return an;
        return (a.year ?? 0) - (b.year ?? 0);
      }),
    [referencedPapers],
  );

  if (isLoading || (!proposal && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-white py-10 text-center text-sm text-muted-foreground">
        연구 계획서를 불러오는 중...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">연구 계획서</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                논문 작성을 위한 연구 계획을 체계적으로 정리합니다. · {total.toLocaleString()}자
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
      </section>

      {/* 논문 제목 */}
      <Section
        title="1. 논문 제목"
        sub="국문·영문 제목을 각각 입력하세요. 영문 제목은 저널 투고·초록 작성 시 활용됩니다."
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              논문 제목 (국문)
            </label>
            <Input
              value={form.titleKo}
              onChange={(e) => setField("titleKo", e.target.value)}
              placeholder="예: 생성형 AI 기반 쓰기 피드백이 중학생의 논설문 쓰기 능력에 미치는 영향"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              논문 제목 (영문)
            </label>
            <Input
              value={form.titleEn}
              onChange={(e) => setField("titleEn", e.target.value)}
              placeholder="e.g., The Effect of Generative AI-based Writing Feedback on Middle School Students' Argumentative Writing"
              disabled={readOnly}
            />
          </div>
        </div>
      </Section>

      {/* 연구 목적 */}
      <Section
        title="2. 연구 목적"
        sub="본 연구가 해결하고자 하는 문제와 달성하려는 목표를 명확히 기술합니다."
      >
        <Textarea
          value={form.purpose}
          onChange={(e) => setField("purpose", e.target.value)}
          placeholder="예: 본 연구는 생성형 AI 기반 쓰기 피드백이 학습자의 쓰기 능력 향상과 쓰기 동기에 미치는 효과를 규명하는 데 목적이 있다."
          rows={5}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 범위 */}
      <Section
        title="3. 연구 범위"
        sub="연구 대상, 기간, 지역, 주제적 범위 등을 구체적으로 제시합니다."
      >
        <Textarea
          value={form.scope}
          onChange={(e) => setField("scope", e.target.value)}
          placeholder="예: 서울 소재 중학교 2학년 3개 학급(총 78명)을 대상으로 2026년 3월~6월(12주) 논설문 쓰기 단원에 한정한다."
          rows={5}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 방법 */}
      <Section
        title="4. 연구 방법"
        sub="연구 설계, 표집, 자료 수집·분석 방법을 상세히 기술합니다."
      >
        <Textarea
          value={form.method}
          onChange={(e) => setField("method", e.target.value)}
          placeholder="예: 사전-사후 통제집단 실험설계를 적용한다. 실험집단은 AI 기반 피드백, 통제집단은 교사 피드백을 받는다. 쓰기 능력은 루브릭 기반 평가자 간 일치도(IRR)를 확보하여 측정하고, SPSS 27을 활용하여 공분산분석(ANCOVA)을 실시한다."
          rows={7}
          disabled={readOnly}
        />
      </Section>

      {/* 연구 내용 */}
      <Section
        title="5. 연구 내용"
        sub="연구의 주요 과제와 단계별 세부 내용을 정리합니다."
      >
        <Textarea
          value={form.content}
          onChange={(e) => setField("content", e.target.value)}
          placeholder={`예:
1) 이론적 배경 정리: 쓰기 피드백 이론, 생성형 AI 교육 활용 선행연구 고찰
2) 프롬프트 및 피드백 루브릭 개발 및 전문가 타당화
3) 실험 실시 (12주): 매주 1회 쓰기 과제 및 피드백 제공
4) 사전·사후 쓰기 능력 측정, 동기 설문, 학습자 인식 인터뷰
5) 양적·질적 자료 통합 분석`}
          rows={8}
          disabled={readOnly}
        />
      </Section>

      {/* 참고문헌 (APA7) */}
      <Section
        title="6. 참고문헌 (APA 7)"
        sub="‘논문 읽기’에 등록한 논문을 검색해 추가하면 APA 7판 형식으로 자동 변환됩니다."
      >
        <div className="space-y-4">
          <PaperSelector
            papers={papers}
            selectedIds={form.referencePaperIds}
            onToggle={toggleReference}
            disabled={readOnly}
          />

          {apa7Sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <BookMarked size={28} className="mx-auto text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">
                등록된 참고문헌이 없습니다. 위에서 ‘논문 연결’ 버튼으로 논문을 추가해 주세요.
              </p>
            </div>
          ) : (
            <ol className="space-y-2 rounded-xl border bg-white p-4 text-sm leading-relaxed">
              {apa7Sorted.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="flex-1 break-words">{formatApa7(p)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h4 className="text-sm font-semibold">{title}</h4>
      {sub && <p className="mt-0.5 mb-3 text-xs leading-relaxed text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}
