"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import Link from "next/link";
import { ChevronLeft, Loader2, Check, Star, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useResearchPaper,
  useUpdateResearchPaper,
} from "./useResearchPapers";
import PageContainer from "@/components/ui/page-container";
import VariablesInput from "./VariablesInput";
import TagInput from "./TagInput";
import type {
  ResearchPaper,
  PaperType,
  ThesisLevel,
  PaperReadStatus,
  PaperVariables,
} from "@/types";

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

function paperToForm(p: ResearchPaper): FormState {
  return {
    paperType: p.paperType ?? "academic",
    thesisLevel: p.thesisLevel,
    title: p.title ?? "",
    authors: p.authors ?? "",
    year: p.year != null ? String(p.year) : "",
    venue: p.venue ?? "",
    volume: p.volume ?? "",
    issue: p.issue ?? "",
    pages: p.pages ?? "",
    doi: p.doi ?? "",
    url: p.url ?? "",
    variables: p.variables ?? {},
    methodology: p.methodology ?? "",
    findings: p.findings ?? "",
    references: p.references ?? "",
    insights: p.insights ?? "",
    myConnection: p.myConnection ?? "",
    tags: p.tags ?? [],
    readStatus: p.readStatus ?? "to_read",
    rating: ((p.rating as 0 | 1 | 2 | 3 | 4 | 5) ?? 0),
    readStartedAt: p.readStartedAt ?? "",
    readCompletedAt: p.readCompletedAt ?? "",
  };
}

function formToPayload(form: FormState): Record<string, unknown> {
  const { rating, ...rest } = form;
  return {
    ...rest,
    year: form.year ? Number(form.year) : null,
    // rating 은 ResearchPaper 타입상 1~5 (0 = 미평가). 0 이면 필드 제외.
    ...(rating > 0 ? { rating } : { rating: null }),
  };
}

const READ_STATUS_OPTIONS: { value: PaperReadStatus; label: string }[] = [
  { value: "to_read", label: "읽을 예정" },
  { value: "reading", label: "읽는 중" },
  { value: "completed", label: "완독" },
];

const PAPER_TYPE_OPTIONS: { value: PaperType; label: string }[] = [
  { value: "academic", label: "학술 논문" },
  { value: "thesis", label: "학위논문" },
];

interface PaperEditPageProps {
  paperId: string;
}

export default function PaperEditPage({ paperId }: PaperEditPageProps) {
  const { paper, isLoading, error } = useResearchPaper(paperId);
  const updateMut = useUpdateResearchPaper();
  const { user: viewer } = useAuthStore();
  // QA-v3 M: staff 는 룰상 타인 논문 read 가 허용되어 편집 폼이 열리고
  // 자동저장이 update 거부로 반복 실패하던 문제 — 소유자만 편집
  const notOwner = !!paper && !!viewer && paper.userId !== viewer.id;

  const [form, setForm] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // paper 로드 시 폼 초기화
  useEffect(() => {
    if (paper && !form && !notOwner) {
      setForm(paperToForm(paper));
      setLastSavedAt(new Date());
    }
  }, [paper, form, notOwner]);

  // 자동 저장 (debounce 1.5s)
  // 레이스 방지: 저장한 스냅샷을 기억해, 저장 도중 추가 입력이 있었으면 dirty 를 유지한다
  const savedSnapshotRef = useRef<FormState | null>(null);
  const formRef = useRef<FormState | null>(null);
  formRef.current = form;
  useEffect(() => {
    if (!dirty || !form) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      const snapshot = form;
      savedSnapshotRef.current = snapshot;
      try {
        await updateMut.mutateAsync({
          id: paperId,
          data: formToPayload(snapshot),
        });
        setLastSavedAt(new Date());
        // 저장 중 새 입력이 없었을 때만 dirty 해제 — 최신 입력 유실·이탈경고 누락 방지
        if (formRef.current === snapshot) setDirty(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "저장에 실패했습니다.",
        );
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dirty, form, paperId, updateMut]);

  // 페이지 이탈 보호
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirty || saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  }

  // 에러·미존재를 로딩보다 먼저 판정 — 타인/삭제 논문 접근 시 무한 스피너 방지
  if (!isLoading && (error || !paper)) {
    return (
      <PageContainer width="narrow" className="text-center">
        <AlertCircle size={20} className="mx-auto text-destructive" />
        <p className="mt-2 text-sm text-destructive">
          논문을 찾을 수 없거나 접근 권한이 없습니다.
        </p>
        <Link
          href="/mypage/research"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft size={14} /> 분석 노트로
        </Link>
      </PageContainer>
    );
  }

  if (notOwner) {
    return (
      <PageContainer width="narrow" className="text-center">
        <AlertCircle size={20} className="mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          본인이 등록한 논문만 편집할 수 있습니다. 열람은 운영 콘솔의 연구활동 보기를 이용하세요.
        </p>
        <Link
          href="/mypage/research?tab=reading"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft size={14} /> 분석 노트로
        </Link>
      </PageContainer>
    );
  }

  if (isLoading || !form) {
    return (
      <PageContainer width="narrow" className="text-center">
        <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">논문 정보를 불러오는 중…</p>
      </PageContainer>
    );
  }

  if (error || !paper) {
    return (
      <PageContainer width="narrow" className="text-center">
        <AlertCircle size={20} className="mx-auto text-destructive" />
        <p className="mt-2 text-sm text-destructive">
          논문을 찾을 수 없습니다.
        </p>
        <Link
          href="/mypage/research"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft size={14} /> 분석 노트로
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      {/* 상단 — 뒤로가기 + 저장 상태 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/mypage/research"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> 분석 노트로
        </Link>
        <div className="flex items-center gap-2 text-xs">
          {saving && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> 저장 중…
            </span>
          )}
          {!saving && dirty && (
            <span className="text-warning">저장 대기 중…</span>
          )}
          {!saving && !dirty && lastSavedAt && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Check size={12} className="text-success" />
              저장됨
            </span>
          )}
        </div>
      </div>

      {/* 헤더 */}
      <header className="mb-6 rounded-2xl border bg-card p-5">
        <Input
          value={form.title}
          onChange={(e) => patch("title", e.target.value)}
          placeholder="논문 제목"
          className="border-0 bg-transparent px-0 text-xl font-bold focus-visible:ring-0"
        />
        <Input
          value={form.authors}
          onChange={(e) => patch("authors", e.target.value)}
          placeholder="저자 (예: 홍길동, Smith J.)"
          className="mt-1 border-0 bg-transparent px-0 text-sm text-muted-foreground focus-visible:ring-0"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Input
            type="number"
            value={form.year}
            onChange={(e) => patch("year", e.target.value)}
            placeholder="연도"
            className="w-20 text-xs"
          />
          <Input
            value={form.venue}
            onChange={(e) => patch("venue", e.target.value)}
            placeholder="게재지·학술지명"
            className="flex-1 min-w-[200px] text-xs"
          />
        </div>
      </header>

      {/* 섹션 1 — 기본 정보 */}
      <Section title="기본 정보">
        <Field label="논문 유형">
          <select
            value={form.paperType}
            onChange={(e) => patch("paperType", e.target.value as PaperType)}
            className="rounded-lg border bg-card px-3 py-2 text-sm"
          >
            {PAPER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="권"><Input value={form.volume} onChange={(e) => patch("volume", e.target.value)} /></Field>
          <Field label="호"><Input value={form.issue} onChange={(e) => patch("issue", e.target.value)} /></Field>
          <Field label="페이지"><Input value={form.pages} onChange={(e) => patch("pages", e.target.value)} placeholder="예: 12-34" /></Field>
        </div>
        <Field label="DOI"><Input value={form.doi} onChange={(e) => patch("doi", e.target.value)} placeholder="10.xxxx/xxxxx" /></Field>
        <Field label="URL"><Input value={form.url} onChange={(e) => patch("url", e.target.value)} type="url" placeholder="https://" /></Field>
      </Section>

      {/* 섹션 2 — 변인 · 연구방법 */}
      <Section title="변인 · 연구방법">
        <Field label="변인">
          <VariablesInput value={form.variables} onChange={(v) => patch("variables", v)} />
        </Field>
        <Field label="연구방법">
          <Textarea
            value={form.methodology}
            onChange={(e) => patch("methodology", e.target.value)}
            placeholder="연구 설계 · 표본 · 측정 도구 · 분석 방법 등을 자유롭게 작성"
            rows={6}
          />
        </Field>
      </Section>

      {/* 섹션 3 — 참고문헌 */}
      <Section title="참고문헌">
        <Textarea
          value={form.references}
          onChange={(e) => patch("references", e.target.value)}
          placeholder="이 논문의 핵심 참고문헌"
          rows={5}
        />
      </Section>

      {/* 섹션 4 — 인사이트 */}
      <Section title="인사이트">
        <Field label="주요 발견">
          <Textarea
            value={form.findings}
            onChange={(e) => patch("findings", e.target.value)}
            placeholder="이 논문이 발견한 핵심 결과"
            rows={5}
          />
        </Field>
        <Field label="나의 인사이트">
          <Textarea
            value={form.insights}
            onChange={(e) => patch("insights", e.target.value)}
            placeholder="이 논문에서 얻은 통찰 · 비판 · 활용 가능성"
            rows={5}
          />
        </Field>
        <Field label="내 연구와의 연결">
          <Textarea
            value={form.myConnection}
            onChange={(e) => patch("myConnection", e.target.value)}
            placeholder="내 연구 주제·방법론과의 연결고리"
            rows={4}
          />
        </Field>
      </Section>

      {/* 섹션 5 — 분류 */}
      <Section title="분류">
        <Field label="태그">
          <TagInput value={form.tags} onChange={(v) => patch("tags", v)} suggestions={[]} />
        </Field>
        <Field label="읽기 상태">
          <div className="flex gap-2">
            {READ_STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => patch("readStatus", o.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  form.readStatus === o.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-card hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="평점">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => patch("rating", (form.rating === n ? 0 : n) as 0 | 1 | 2 | 3 | 4 | 5)}
                className="rounded p-1 hover:bg-muted"
                aria-label={`${n}점`}
              >
                <Star
                  size={20}
                  className={cn(
                    n <= form.rating ? "fill-warning text-warning" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* 푸터 — 수동 저장 (자동 저장 보완) */}
      <div className="mt-6 flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDirty(true)}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : null}
          지금 저장
        </Button>
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border bg-card p-5">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
