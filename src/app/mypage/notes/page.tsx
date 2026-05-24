"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userNotesApi } from "@/lib/bkend";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  USER_NOTE_CATEGORY_LABELS,
  USER_NOTE_CATEGORY_COLORS,
  type UserNote,
  type UserNoteCategory,
} from "@/types";
import {
  NotebookPen,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Search,
  Tag,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const CATEGORIES: Array<{ key: "all" | UserNoteCategory; label: string }> = [
  { key: "all", label: "전체" },
  { key: "general", label: USER_NOTE_CATEGORY_LABELS.general },
  { key: "study", label: USER_NOTE_CATEGORY_LABELS.study },
  { key: "research", label: USER_NOTE_CATEGORY_LABELS.research },
  { key: "reflection", label: USER_NOTE_CATEGORY_LABELS.reflection },
  { key: "todo", label: USER_NOTE_CATEGORY_LABELS.todo },
  { key: "idea", label: USER_NOTE_CATEGORY_LABELS.idea },
];

function NoteCard({
  note,
  onPinToggle,
  onDelete,
}: {
  note: UserNote;
  onPinToggle: (note: UserNote) => void;
  onDelete: (id: string) => void;
}) {
  const catColors = USER_NOTE_CATEGORY_COLORS[note.category];
  const catLabel = USER_NOTE_CATEGORY_LABELS[note.category];

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/mypage/notes/${note.id}`}
            className="line-clamp-1 text-sm font-semibold hover:text-primary"
          >
            {note.title || "(제목 없음)"}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={note.pinned ? "핀 해제" : "핀 고정"}
            onClick={() => onPinToggle(note)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <Link
            href={`/mypage/notes/${note.id}`}
            aria-label="편집"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            aria-label="삭제"
            onClick={() => onDelete(note.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 본문 미리보기 */}
      {note.body && (
        <p className="line-clamp-3 text-xs text-muted-foreground">{note.body}</p>
      )}

      {/* 푸터: 카테고리 + 태그 + 날짜 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {note.pinned && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Pin size={9} /> 고정
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            catColors.bg,
            catColors.text,
          )}
        >
          {catLabel}
        </span>
        {note.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            <Tag size={8} />
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatDate(note.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function NotesPageContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<
    "all" | UserNoteCategory
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["user-notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await userNotesApi.listByUser(user.id);
      return res.data as UserNote[];
    },
    enabled: !!user,
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      userNotesApi.update(id, { pinned }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-notes", user?.id] });
    },
    onError: async () => {
      const { toast } = await import("sonner");
      toast.error("핀 변경에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userNotesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-notes", user?.id] });
    },
    onError: async () => {
      const { toast } = await import("sonner");
      toast.error("삭제에 실패했습니다.");
    },
  });

  async function handleDelete(id: string) {
    const { toast } = await import("sonner");
    toast("정말 삭제하시겠습니까?", {
      action: {
        label: "삭제",
        onClick: () => deleteMutation.mutate(id),
      },
    });
  }

  function handlePinToggle(note: UserNote) {
    pinMutation.mutate({ id: note.id, pinned: !note.pinned });
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => activeCategory === "all" || n.category === activeCategory)
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        // pinned desc → updatedAt desc
        if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0))
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [notes, activeCategory, searchQuery]);

  return (
    <PageContainer width="default">
      <PageHeader
        icon={NotebookPen}
        title="내 메모"
        actions={
          <Link href="/mypage/notes/new">
            <Button size="sm">
              <Plus size={15} className="mr-1" />
              새 메모
            </Button>
          </Link>
        }
      />

      {/* 검색 */}
      <div className="relative mt-6">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목·본문·태그 검색"
          className="pl-9"
        />
      </div>

      {/* 카테고리 탭 */}
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b" aria-label="메모 카테고리">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-none items-center gap-1 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {cat.label}
              {cat.key !== "all" && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 min-w-4 rounded-full px-1 py-0 text-[10px]"
                >
                  {notes.filter((n) => n.category === cat.key).length}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* 메모 그리드 */}
      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-muted"
                aria-busy="true"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={
              searchQuery
                ? "검색 결과가 없습니다"
                : activeCategory === "all"
                  ? "아직 메모가 없습니다"
                  : `${USER_NOTE_CATEGORY_LABELS[activeCategory as UserNoteCategory]} 메모가 없습니다`
            }
            description={
              searchQuery
                ? "다른 키워드로 검색해보세요."
                : "새 메모 버튼을 눌러 첫 메모를 작성해보세요."
            }
            actionLabel="새 메모 작성"
            actionHref="/mypage/notes/new"
            className="py-16"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPinToggle={handlePinToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function NotesPage() {
  return (
    <AuthGuard>
      <NotesPageContent />
    </AuthGuard>
  );
}
