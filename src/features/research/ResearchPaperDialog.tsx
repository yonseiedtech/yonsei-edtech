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
import { Star } from "lucide-react";
import type {
  ResearchPaper,
  PaperType,
  ThesisLevel,
  PaperReadStatus,
  PaperVariables,
} from "@/types";
import VariablesInput from "./VariablesInput";
import TagInput from "./TagInput";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ResearchPaper | null;
  tagSuggestions: string[];
  onSubmit: (data: Partial<ResearchPaper>) => Promise<void> | void;
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
  insights: "",
  myConnection: "",
  tags: [],
  readStatus: "to_read",
  rating: 0,
};

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
          insights: initial.insights ?? "",
          myConnection: initial.myConnection ?? "",
          tags: initial.tags ?? [],
          readStatus: initial.readStatus ?? "to_read",
          rating: (initial.rating ?? 0) as FormState["rating"],
        });
      } else {
        setForm(EMPTY);
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
      if (!confirm("변경사항이 저장되지 않았습니다. 닫을까요?")) return;
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      alert("제목은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
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
        insights: form.insights.trim() || undefined,
        myConnection: form.myConnection.trim() || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        readStatus: form.readStatus,
        rating: form.rating > 0 ? (form.rating as 1 | 2 | 3 | 4 | 5) : undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={tryClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "논문 편집" : "논문 추가"}</DialogTitle>
          <DialogDescription>
            제목만 입력해도 저장할 수 있습니다. 분석 노트는 점진적으로 채워나가세요.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* 기본 메타 */}
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

          {/* 변인 */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">변인</h4>
            <VariablesInput
              value={form.variables}
              onChange={(v) => update("variables", v)}
            />
          </section>

          {/* 분석 */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">분석 노트</h4>
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
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">인사이트</label>
              <Textarea
                value={form.insights}
                onChange={(e) => update("insights", e.target.value)}
                placeholder="예: 학습몰입을 매개로 살펴본 점이 흥미로움"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">내 연구와의 접점</label>
              <Textarea
                value={form.myConnection}
                onChange={(e) => update("myConnection", e.target.value)}
                placeholder="예: 내 연구의 종속변수와 동일 → 측정도구 참고 가능"
                rows={3}
              />
            </div>
          </section>

          {/* 분류 */}
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
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => tryClose(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
