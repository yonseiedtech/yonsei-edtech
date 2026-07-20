"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { writingTipsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  WRITING_TIP_CATEGORY_LABELS,
  type WritingTip,
  type WritingTipCategory,
  type WritingTipExample,
  type WritingTipReference,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  initial: WritingTip | null;
  userId: string;
  /**
   * v13-H2: 해커톤 "아카이브 산출물로 등록" 딥링크에서 ?title=...&url=... 로 착지할 때
   * initial === null 인 신규 폼에 한해 제목과 참고자료 URL을 미리 채운다.
   */
  prefill?: { title?: string; url?: string };
}

const CATEGORY_OPTIONS: WritingTipCategory[] = [
  "translationese",
  "subject-predicate",
  "tense-voice",
  "spelling-spacing",
  "academic-convention",
];

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function WritingTipForm({ initial, userId, prefill }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const { user: authUser } = useAuthStore();

  // prefill 은 신규 폼(initial === null)에서만 적용
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? "");
  const [category, setCategory] = useState<WritingTipCategory>(
    initial?.category ?? "translationese",
  );
  const [wrongExample, setWrongExample] = useState(initial?.wrongExample ?? "");
  const [correctExample, setCorrectExample] = useState(initial?.correctExample ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [accessibleSummary, setAccessibleSummary] = useState(
    initial?.accessibleSummary ?? "",
  );
  const [tagsCsv, setTagsCsv] = useState((initial?.tags ?? []).join(", "));
  const [additionalExamples, setAdditionalExamples] = useState<WritingTipExample[]>(
    initial?.additionalExamples ?? [],
  );
  const [references, setReferences] = useState<WritingTipReference[]>(
    // prefill.url 이 있으면 참고자료에 산출물 링크를 미리 채워 넣는다
    initial?.references ??
      (prefill?.url
        ? [{ id: newId(), title: "산출물 링크", url: prefill.url }]
        : []),
  );
  const [published, setPublished] = useState<boolean>(initial?.published ?? false);
  const [saving, setSaving] = useState(false);

  // ── additionalExamples ──
  function addExample() {
    setAdditionalExamples((prev) => [...prev, { id: newId(), text: "" }]);
  }
  function updateExample(id: string, text: string) {
    setAdditionalExamples((prev) =>
      prev.map((e) => (e.id === id ? { ...e, text } : e)),
    );
  }
  function removeExample(id: string) {
    setAdditionalExamples((prev) => prev.filter((e) => e.id !== id));
  }

  // ── references ──
  function addReference() {
    setReferences((prev) => [...prev, { id: newId(), title: "" }]);
  }
  function updateReference(id: string, patch: Partial<WritingTipReference>) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeReference(id: string) {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("제목(title) 은 필수입니다");
      return;
    }
    if (!wrongExample.trim()) {
      toast.error("잘못된 예(wrongExample) 는 필수입니다");
      return;
    }
    if (!correctExample.trim()) {
      toast.error("권장 예(correctExample) 는 필수입니다");
      return;
    }
    if (!explanation.trim()) {
      toast.error("설명(explanation) 은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const cleanExamples = additionalExamples
        .filter((e) => e.text.trim())
        .map((e) => ({ id: e.id, text: e.text.trim() }));
      const cleanReferences = references
        .filter((r) => r.title.trim())
        .map((r) => ({
          id: r.id,
          title: r.title.trim(),
          author: r.author?.trim() || undefined,
          year: r.year || undefined,
          url: r.url?.trim() || undefined,
        }));
      const cleanTags = tagsCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Phase 3.5 — 운영 메타 자동 주입.
      const becamePublished = published && !initial?.published;
      const reviewMeta = becamePublished
        ? {
            reviewedBy: authUser?.name ?? undefined,
            reviewedByUid: authUser?.id ?? userId ?? undefined,
            reviewedAt: new Date().toISOString(),
          }
        : {};

      const payload = {
        title: title.trim(),
        category,
        wrongExample: wrongExample.trim(),
        correctExample: correctExample.trim(),
        explanation: explanation.trim(),
        accessibleSummary: accessibleSummary.trim() || undefined,
        tags: cleanTags.length > 0 ? cleanTags : undefined,
        additionalExamples: cleanExamples.length > 0 ? cleanExamples : undefined,
        references: cleanReferences.length > 0 ? cleanReferences : undefined,
        published,
        curatedBy: userId,
        updatedBy: authUser?.name ?? undefined,
        updatedByUid: authUser?.id ?? userId ?? undefined,
        ...reviewMeta,
      };

      if (isEdit && initial) {
        await writingTipsApi.update(initial.id, payload);
      } else {
        await writingTipsApi.create({
          ...payload,
          createdBy: userId,
        });
      }
      toast.success("저장 완료");
      router.push("/console/archive/writing-tips");
    } catch (err) {
      console.error("[WritingTipForm] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/console/archive/writing-tips">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            학술 글쓰기 목록
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      <h1 className="text-2xl font-bold">
        {isEdit ? "학술 글쓰기 항목 편집" : "새 학술 글쓰기 항목"}
      </h1>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Field label="제목 *">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이중 피동 표현 피하기"
            />
          </Field>
          <Field label="카테고리 *">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {WRITING_TIP_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="❌ 잘못된 예 *">
            <Textarea
              rows={2}
              value={wrongExample}
              onChange={(e) => setWrongExample(e.target.value)}
              placeholder="예: 본 연구에서는 ~ 도구가 사용되어진다."
            />
          </Field>
          <Field label="✅ 권장 예 *">
            <Textarea
              rows={2}
              value={correctExample}
              onChange={(e) => setCorrectExample(e.target.value)}
              placeholder="예: 본 연구에서는 ~ 도구를 사용한다."
            />
          </Field>
          <Field label="설명 (왜 그런지) *">
            <Textarea
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="짧고 명확하게. hedge 표현 권장 ('일반적으로', '흔히', '권장된다')"
            />
          </Field>
          <Field label="💡 쉽게 이해하기 (한 줄 비유·요점)">
            <Textarea
              rows={2}
              value={accessibleSummary}
              onChange={(e) => setAccessibleSummary(e.target.value)}
              placeholder="학부생도 직관적으로 이해할 수 있는 한 줄 비유"
            />
          </Field>
          <Field label="태그 (쉼표 구분)">
            <Input
              value={tagsCsv}
              onChange={(e) => setTagsCsv(e.target.value)}
              placeholder="예: 피동, 이중피동, 기본"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 추가 예시 (repeatable) */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">추가 예시</h2>
            <Button type="button" variant="outline" size="sm" onClick={addExample}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              예시 추가
            </Button>
          </div>
          {additionalExamples.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              아직 예시가 없습니다. &quot;예시 추가&quot; 를 눌러 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {additionalExamples.map((ex) => (
                <div key={ex.id} className="flex items-start gap-2 rounded-lg border p-2">
                  <Textarea
                    rows={2}
                    value={ex.text}
                    onChange={(e) => updateExample(ex.id, e.target.value)}
                    placeholder="❌ ~ → ✅ ~ 처럼 짧게 적기"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExample(ex.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 참고 자료 */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">참고 자료</h2>
            <Button type="button" variant="outline" size="sm" onClick={addReference}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              참고 추가
            </Button>
          </div>
          {references.length === 0 ? (
            <p className="text-xs text-muted-foreground">참고 자료가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {references.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReference(r.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="제목">
                      <Input
                        value={r.title}
                        onChange={(e) =>
                          updateReference(r.id, { title: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="저자">
                      <Input
                        value={r.author ?? ""}
                        onChange={(e) =>
                          updateReference(r.id, { author: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="연도">
                      <Input
                        type="number"
                        value={r.year ?? ""}
                        onChange={(e) =>
                          updateReference(r.id, {
                            year: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </Field>
                    <Field label="URL">
                      <Input
                        value={r.url ?? ""}
                        onChange={(e) => updateReference(r.id, { url: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 공개 토글 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">공개 (published)</p>
            <p className="text-xs text-muted-foreground">
              비공개(draft) 상태에서는 회원에게 노출되지 않습니다.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">{published ? "공개" : "비공개 (draft)"}</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          저장
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
