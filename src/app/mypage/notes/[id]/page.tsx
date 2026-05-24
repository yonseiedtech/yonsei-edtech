"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userNotesApi } from "@/lib/bkend";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  USER_NOTE_CATEGORY_LABELS,
  USER_NOTE_CATEGORY_COLORS,
  type UserNote,
  type UserNoteCategory,
} from "@/types";
import { NotebookPen, ArrowLeft, Tag, X } from "lucide-react";

const CATEGORIES = Object.entries(USER_NOTE_CATEGORY_LABELS) as Array<
  [UserNoteCategory, string]
>;

function EditNoteContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const noteId = params.id as string;

  const { data: note, isLoading } = useQuery({
    queryKey: ["user-note", noteId],
    queryFn: () => userNotesApi.get(noteId) as Promise<UserNote>,
    enabled: !!noteId,
  });

  const [category, setCategory] = useState<UserNoteCategory>("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // note 로드 후 폼 초기화 (한 번만)
  useEffect(() => {
    if (note && !initialized) {
      setCategory(note.category);
      setTitle(note.title);
      setBody(note.body);
      setPinned(note.pinned ?? false);
      setTags(note.tags ?? []);
      setInitialized(true);
    }
  }, [note, initialized]);

  // 본인 소유 검증
  useEffect(() => {
    if (note && user && note.userId !== user.id) {
      router.replace("/mypage/notes");
    }
  }, [note, user, router]);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSave() {
    if (!user || !note) return;
    if (!title.trim() && !body.trim()) {
      const { toast } = await import("sonner");
      toast.error("제목 또는 본문을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await userNotesApi.update(noteId, {
        category,
        title: title.trim(),
        body: body.trim(),
        pinned,
        tags,
      });
      await queryClient.invalidateQueries({ queryKey: ["user-notes", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["user-note", noteId] });
      const { toast } = await import("sonner");
      toast.success("메모가 수정되었습니다.");
      router.push("/mypage/notes");
    } catch {
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    const { toast } = await import("sonner");
    toast("정말 삭제하시겠습니까?", {
      action: {
        label: "삭제",
        onClick: async () => {
          try {
            await userNotesApi.delete(noteId);
            await queryClient.invalidateQueries({ queryKey: ["user-notes", user.id] });
            toast.success("메모가 삭제되었습니다.");
            router.push("/mypage/notes");
          } catch {
            toast.error("삭제에 실패했습니다.");
          }
        },
      },
    });
  }

  if (isLoading) {
    return (
      <PageContainer width="default">
        <PageHeader icon={NotebookPen} title="메모 편집" />
        <div className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </PageContainer>
    );
  }

  if (!note) {
    return (
      <PageContainer width="default">
        <PageHeader icon={NotebookPen} title="메모 편집" />
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          메모를 찾을 수 없습니다.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={NotebookPen}
        title="메모 편집"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={15} className="mr-1" />
            뒤로
          </Button>
        }
      />

      <div className="mt-6 space-y-5 rounded-2xl border bg-card p-6">
        {/* 카테고리 */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            카테고리
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(([key, label]) => {
              const colors = USER_NOTE_CATEGORY_COLORS[key];
              const isActive = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? cn(colors.bg, colors.text, "ring-2 ring-offset-1")
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label htmlFor="note-title" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            제목
          </label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="메모 제목"
          />
        </div>

        {/* 본문 */}
        <div>
          <label htmlFor="note-body" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            본문
          </label>
          <Textarea
            id="note-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="메모 내용을 자유롭게 작성하세요."
            rows={10}
            className="resize-y"
          />
        </div>

        {/* 태그 */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            태그
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                <Tag size={10} />
                {tag}
                <button
                  type="button"
                  aria-label={`태그 ${tag} 삭제`}
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={tags.length === 0 ? "태그 입력 후 Enter" : ""}
              className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Enter 또는 쉼표(,)로 태그를 추가합니다.
          </p>
        </div>

        {/* 핀 고정 */}
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">핀 고정</p>
            <p className="text-xs text-muted-foreground">
              고정된 메모는 목록 상단에 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            role="switch"
            aria-checked={pinned}
            aria-label="핀 고정 토글"
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
              pinned ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
                pinned ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={saving}
          >
            삭제
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default function EditNotePage() {
  return (
    <AuthGuard>
      <EditNoteContent />
    </AuthGuard>
  );
}
