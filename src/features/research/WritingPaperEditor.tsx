"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
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

interface ChapterMeta {
  key: WritingPaperChapterKey;
  label: string;
  placeholder: string;
}

const CHAPTERS: ChapterMeta[] = [
  {
    key: "intro",
    label: "1. 서론",
    placeholder: "연구 배경 · 문제 제기 · 연구 목적 · 연구 문제",
  },
  {
    key: "background",
    label: "2. 이론적 배경",
    placeholder: "핵심 이론 · 선행 연구 · 개념 정의",
  },
  {
    key: "method",
    label: "3. 연구 방법",
    placeholder: "연구 설계 · 참여자 · 도구 · 절차 · 분석 방법",
  },
  {
    key: "results",
    label: "4. 연구 결과",
    placeholder: "주요 결과 · 표/그림 설명 · 통계 결과",
  },
  {
    key: "conclusion",
    label: "5. 결론",
    placeholder: "결론 요약 · 시사점 · 한계 및 후속연구",
  },
];

const AUTO_SAVE_DELAY_MS = 800;

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

function formatSavedTime(iso: string | undefined | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  const diff = Date.now() - t.getTime();
  if (diff < 60_000) return "방금 저장됨";
  return `${t.getHours().toString().padStart(2, "0")}:${t
    .getMinutes()
    .toString()
    .padStart(2, "0")} 저장됨`;
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ensureTriggeredRef = useRef(false);
  const lastEditedChapterRef = useRef<WritingPaperChapterKey | null>(null);

  // 문서 자동 생성 (없을 때 1회)
  useEffect(() => {
    if (readOnly) return;
    if (isLoading) return;
    if (paper) return;
    if (ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper, isLoading, readOnly, user.id]);

  // 서버 데이터 → 로컬 폼 prefill
  useEffect(() => {
    if (paper && !hydrated) {
      setForm(fromPaper(paper));
      setSavedAt(paper.lastSavedAt ?? paper.updatedAt ?? null);
      setHydrated(true);
    }
  }, [paper, hydrated]);

  // 자동 저장 디바운스
  function scheduleSave(next: FormState) {
    if (readOnly) return;
    if (!paper) return; // 아직 ensure 전이면 스킵
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const now = new Date().toISOString();
      setSaving(true);
      try {
        await update.mutateAsync({
          id: paper.id,
          data: {
            title: next.title,
            chapters: next.chapters,
            lastSavedAt: now,
          },
        });
        setSavedAt(now);
        // 활동 이력 적재 (5분 쓰로틀은 훅 내부에서 처리)
        const charCount = totalChars(next);
        logActivity.mutate({
          userId: user.id,
          paperId: paper.id,
          charCount,
          lastChapter: lastEditedChapterRef.current ?? undefined,
          title: next.title?.trim() || undefined,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "자동 저장 실패");
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }

  function setChapter(key: WritingPaperChapterKey, value: string) {
    lastEditedChapterRef.current = key;
    setForm((prev) => {
      const next = { ...prev, chapters: { ...prev.chapters, [key]: value } };
      scheduleSave(next);
      return next;
    });
  }

  // 언마운트 시 디바운스 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const total = useMemo(() => totalChars(form), [form]);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">내 논문 (단일 문서 MVP)</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                5장 구조로 자유롭게 집필하세요. 입력 후 약 1초 뒤 자동 저장됩니다.
              </p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              {saving ? (
                <>
                  <Save size={12} className="animate-pulse text-primary" />
                  저장 중...
                </>
              ) : savedAt ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  {formatSavedTime(savedAt)}
                </>
              ) : null}
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
          <p className="mt-1 text-[11px] text-muted-foreground">
            전체 본문 글자수: {total.toLocaleString()}자
          </p>
        </div>
      </section>

      {/* 본문 챕터 */}
      {isLoading || (!paper && !readOnly) ? (
        <p className="rounded-2xl border bg-white py-10 text-center text-sm text-muted-foreground">
          문서를 불러오는 중...
        </p>
      ) : !paper && readOnly ? (
        <p className="rounded-2xl border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
          아직 작성된 논문이 없습니다.
        </p>
      ) : (
        CHAPTERS.map((ch) => {
          const value = form.chapters[ch.key] ?? "";
          return (
            <section key={ch.key} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{ch.label}</h4>
                <span className="text-[11px] text-muted-foreground">
                  {value.length.toLocaleString()}자
                </span>
              </div>
              <Textarea
                className="mt-2 font-sans text-sm leading-relaxed"
                rows={10}
                value={value}
                placeholder={ch.placeholder}
                onChange={(e) => setChapter(ch.key, e.target.value)}
                disabled={readOnly || !paper}
              />
            </section>
          );
        })
      )}
    </div>
  );
}
