"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText, Plus, Pencil, Trash2, ChevronDown,
  ChevronUp, Loader2, Heading2, Bold, List, CheckSquare, Printer,
  Eye, Edit3, Columns2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";
import { HandoverMarkdown } from "@/lib/markdown-handover";

const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];
const CURRENT_TERM = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;

const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-green-50 text-green-700",
};
const PRIORITY_LABELS = { high: "높음", medium: "보통", low: "낮음" };

export default function HandoverSection() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HandoverDocument | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({
    role: STAFF_ROLES[0],
    title: "",
    content: "",
    category: "routine" as HandoverDocument["category"],
    priority: "medium" as HandoverDocument["priority"],
  });
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "split" | "preview">("edit");

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
      const prefix = action === "heading" ? "## "
        : action === "list" ? "- "
        : "- [ ] ";
      const beforeLine = value.slice(0, lineStart);
      const lineContent = value.slice(lineStart);
      next = `${beforeLine}${prefix}${lineContent}`;
      cursorStart = start + prefix.length;
      cursorEnd = end + prefix.length;
    }

    setDocForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc,priority:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  const filteredDocs = selectedRole === "all"
    ? handoverDocs
    : handoverDocs.filter((d) => d.role === selectedRole);

  const docMutation = useMutation({
    mutationFn: async (data: typeof docForm & { id?: string }) => {
      const payload = {
        ...data,
        term: CURRENT_TERM,
        authorId: user?.id ?? "",
        authorName: user?.name ?? "",
      };
      if (data.id) {
        await dataApi.update("handover_docs", data.id, payload);
      } else {
        await dataApi.create("handover_docs", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      setShowDocDialog(false);
      setEditingDoc(null);
      toast.success(editingDoc ? "문서가 수정되었습니다." : "문서가 등록되었습니다.");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete("handover_docs", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      toast.success("문서가 삭제되었습니다.");
    },
  });

  function openDocDialog(doc?: HandoverDocument) {
    if (doc) {
      setEditingDoc(doc);
      setDocForm({ role: doc.role, title: doc.title, content: doc.content, category: doc.category, priority: doc.priority });
    } else {
      setEditingDoc(null);
      setDocForm({ role: STAFF_ROLES[0], title: "", content: "", category: "routine", priority: "medium" });
    }
    setShowDocDialog(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedRole("all")}
            className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", selectedRole === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
          >
            전체
          </button>
          {STAFF_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", selectedRole === r ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href={`/console/handover/report?term=${CURRENT_TERM}`}>
            <Button variant="outline" size="sm">
              <Printer size={14} className="mr-1" />
              기수 리포트
            </Button>
          </Link>
          <Button size="sm" onClick={() => openDocDialog()}>
            <Plus size={14} className="mr-1" />
            문서 작성
          </Button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-lg border bg-card py-12 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">등록된 업무수행 문서가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border bg-card">
              <button
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{doc.role}</Badge>
                    <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[doc.priority])}>{PRIORITY_LABELS[doc.priority]}</Badge>
                    <Badge variant="outline" className="text-xs">{HANDOVER_CATEGORY_LABELS[doc.category]}</Badge>
                  </div>
                  <p className="mt-1 font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.authorName} · {doc.term}</p>
                </div>
                {expandedDoc === doc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedDoc === doc.id && (
                <div className="border-t px-4 py-4">
                  <HandoverMarkdown content={doc.content} className="text-sm leading-relaxed" />
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDocDialog(doc)}>
                      <Pencil size={12} className="mr-1" />수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => { if (confirm("삭제하시겠습니까?")) deleteDocMutation.mutate(doc.id); }}
                    >
                      <Trash2 size={12} className="mr-1" />삭제
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className={cn(previewMode === "split" ? "max-w-4xl" : "max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "문서 수정" : "업무수행 문서 작성"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">직책</label>
                <select value={docForm.role} onChange={(e) => setDocForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">분류</label>
                <select value={docForm.category} onChange={(e) => setDocForm((f) => ({ ...f, category: e.target.value as HandoverDocument["category"] }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {Object.entries(HANDOVER_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">우선순위</label>
                <select value={docForm.priority} onChange={(e) => setDocForm((f) => ({ ...f, priority: e.target.value as HandoverDocument["priority"] }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">제목</label>
              <Input value={docForm.title} onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))} placeholder="업무 제목" />
            </div>
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
                        previewMode === "edit" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
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
                        previewMode === "split" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
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
                        previewMode === "preview" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
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
                    value={docForm.content}
                    onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder={`## 정기 업무
- 매주 월요일 회의 운영
- 회비 입금 확인 (#재무 슬랙)

## 주의사항
**중요**: 학기 초 신입 환영 행사 일정 조율`}
                    rows={12}
                    className="w-full rounded-lg border px-3 py-2 font-mono text-sm resize-y"
                  />
                )}
                {previewMode !== "edit" && (
                  <div className="min-h-[280px] overflow-auto rounded-lg border bg-muted/10 px-3 py-2">
                    {docForm.content.trim() ? (
                      <HandoverMarkdown content={docForm.content} className="text-sm leading-relaxed" />
                    ) : (
                      <p className="text-xs text-muted-foreground">미리보기할 내용이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ## 소제목 · **굵게** · - 목록 · - [ ] 체크박스 (저장 후 본문/기수 리포트에서 서식이 적용됩니다)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>취소</Button>
            <Button
              onClick={() => {
                if (!docForm.title) { toast.error("제목을 입력하세요."); return; }
                if (!docForm.content) { toast.error("내용을 입력하세요."); return; }
                docMutation.mutate(editingDoc ? { ...docForm, id: editingDoc.id } : docForm);
              }}
              disabled={docMutation.isPending}
            >
              {docMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              {editingDoc ? "수정" : "작성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
