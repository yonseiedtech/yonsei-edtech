"use client";

/**
 * WorkLogEditor — 업무수행 문서 작성/수정 공용 에디터
 * new/edit 페이지 양쪽에서 사용.
 */

import { useRef, useState } from "react";
import {
  Heading2, Bold, List, CheckSquare, Eye, Edit3, Columns2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandoverMarkdown } from "@/lib/markdown-handover";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";

const PRIORITY_LABELS: Record<HandoverDocument["priority"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export interface WorkLogFormValues {
  roles: string[];
  title: string;
  content: string;
  category: HandoverDocument["category"];
  priority: HandoverDocument["priority"];
}

interface Props {
  initialValues: WorkLogFormValues;
  roleOptions: string[];
  onSave: (values: WorkLogFormValues) => void;
  isSaving: boolean;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function WorkLogEditor({
  initialValues,
  roleOptions,
  onSave,
  isSaving,
  onCancel,
  isEditing = false,
}: Props) {
  const [form, setForm] = useState<WorkLogFormValues>(initialValues);
  const [previewMode, setPreviewMode] = useState<"edit" | "split" | "preview">("edit");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  function applyMarkdown(action: "heading" | "bold" | "list" | "checkbox") {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    let next = value;
    let cursorStart = start;
    let cursorEnd = end;

    if (action === "bold") {
      const text = selected || "굵게";
      next = `${before}**${text}**${after}`;
      cursorStart = start + 2;
      cursorEnd = cursorStart + text.length;
    } else {
      const lineStart = before.lastIndexOf("\n") + 1;
      const prefix =
        action === "heading" ? "## " : action === "list" ? "- " : "- [ ] ";
      const beforeLine = value.slice(0, lineStart);
      const lineContent = value.slice(lineStart);
      next = `${beforeLine}${prefix}${lineContent}`;
      cursorStart = start + prefix.length;
      cursorEnd = end + prefix.length;
    }

    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function toggleRole(r: string) {
    setForm((f) => {
      const has = f.roles.includes(r);
      return {
        ...f,
        roles: has ? f.roles.filter((x) => x !== r) : [...f.roles, r],
      };
    });
  }

  return (
    <div className="space-y-5">
      {/* 참고 대상 직책 — 복수 선택 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          참고 대상 직책 <span className="text-muted-foreground font-normal">(복수 선택 가능)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {roleOptions.map((r) => {
            const active = form.roles.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
        {form.roles.length === 0 && (
          <p className="mt-1 text-[11px] text-destructive">직책을 1개 이상 선택하세요.</p>
        )}
      </div>

      {/* 분류 / 우선순위 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">분류</label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as HandoverDocument["category"],
              }))
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {Object.entries(HANDOVER_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">우선순위</label>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                priority: e.target.value as HandoverDocument["priority"],
              }))
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {(Object.entries(PRIORITY_LABELS) as [HandoverDocument["priority"], string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className="mb-1 block text-sm font-medium">제목</label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="업무 제목"
        />
      </div>

      {/* 내용 — 마크다운 에디터 + 미리보기 */}
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-medium">내용</label>
          <div className="flex items-center gap-2">
            {/* 모드 토글 */}
            <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode("edit")}
                title="편집"
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
                  previewMode === "edit"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Edit3 size={11} /> 편집
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("split")}
                title="분할 (편집 + 미리보기)"
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
                  previewMode === "split"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns2 size={11} /> 분할
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                title="미리보기"
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
                  previewMode === "preview"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Eye size={11} /> 미리보기
              </button>
            </div>
            {previewMode !== "preview" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyMarkdown("heading")}
                  title="소제목 (## )"
                  className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Heading2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("bold")}
                  title="굵게 (**)"
                  className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Bold size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("list")}
                  title="목록 (- )"
                  className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <List size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("checkbox")}
                  title="체크박스 (- [ ] )"
                  className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <CheckSquare size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            previewMode === "split" ? "grid grid-cols-2 gap-3" : "block",
          )}
        >
          {previewMode !== "preview" && (
            <textarea
              ref={contentRef}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder={`## 정기 업무\n- 매주 월요일 회의 운영\n- 회비 입금 확인 (#재무 슬랙)\n\n## 주의사항\n**중요**: 학기 초 신입 환영 행사 일정 조율`}
              rows={18}
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm resize-y"
            />
          )}
          {previewMode !== "edit" && (
            <div className="min-h-[350px] overflow-auto rounded-lg border bg-muted/10 px-3 py-2">
              {form.content.trim() ? (
                <HandoverMarkdown
                  content={form.content}
                  className="text-sm leading-relaxed"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  미리보기할 내용이 없습니다.
                </p>
              )}
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ## 소제목 · **굵게** · - 목록 · - [ ] 체크박스 (저장 후 본문/기수 리포트에서 서식이 적용됩니다)
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={isSaving}>
          {isSaving && <Loader2 size={14} className="mr-1 animate-spin" />}
          {isEditing ? "수정 완료" : "작성 완료"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
