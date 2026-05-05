"use client";

import { useState } from "react";
import { usePosts, useUpdatePost, useDeletePost } from "@/features/board/useBoard";
import { CATEGORY_LABELS, type PostCategory } from "@/types";
import CategoryTabs from "@/features/board/CategoryTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Pencil, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { toast } from "sonner";

export default function AdminPostTab() {
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "views">("latest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editPost, setEditPost] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  const { posts, isLoading } = usePosts(category, { search });
  const { updatePost } = useUpdatePost();
  const { deletePost } = useDeletePost();

  const sorted = [...posts].sort((a, b) => {
    if (sort === "views") return b.viewCount - a.viewCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const allSelected = sorted.length > 0 && sorted.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    try {
      await Promise.all([...selected].map((id) => deletePost(id)));
      toast.success(`${selected.size}개 게시글 삭제 완료`);
      setSelected(new Set());
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleDelete(postId: string) {
    try {
      await deletePost(postId);
      toast.success("게시글 삭제 완료");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleEditSave() {
    if (editPost) {
      try {
        await updatePost({ id: editPost.id, data: { title: editPost.title, content: editPost.content } });
        toast.success(`게시글 "${editPost.title}" 수정 완료`);
        setEditPost(null);
      } catch {
        toast.error("수정 중 오류가 발생했습니다.");
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          icon={FileText}
          title="게시판 관리"
          description="공지/자유/홍보/자료실 게시글을 검수하고 일괄 관리합니다."
        />
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          icon={FileText}
          title="게시판 관리"
          description="공지/자유/홍보/자료실 게시글을 검수하고 일괄 관리합니다."
        />
        <div className="space-y-4">
          <CategoryTabs active={category} onChange={setCategory} />
          <AdminEmptyState
            icon={FileText}
            title={search ? "검색 결과가 없습니다." : "게시글이 없습니다."}
            description={search ? "다른 검색어로 시도해보세요." : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={FileText}
        title="게시판 관리"
        description="공지/자유/홍보/자료실 게시글을 검수하고 일괄 관리합니다."
      />
      <div className="space-y-4">
        {/* 카테고리 서브필터 */}
        <CategoryTabs active={category} onChange={setCategory} />

      {/* 검색 + 정렬 + 일괄삭제 */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="제목 또는 작성자 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "latest" | "views")}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="latest">최신순</option>
          <option value="views">조회순</option>
        </select>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 size={14} className="mr-1" />
            선택 삭제 ({selected.size})
          </Button>
        )}
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="space-y-2 sm:hidden">
        {sorted.map((post) => (
          <div key={post.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      post.category === "notice"
                        ? "bg-primary/10 text-primary"
                        : post.category === "seminar"
                        ? "bg-secondary/15 text-amber-700"
                        : post.category === "promotion"
                        ? "bg-emerald-50 text-emerald-700"
                        : ""
                    )}
                  >
                    {CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS] ?? post.category}
                  </Badge>
                  <Checkbox
                    checked={selected.has(post.id)}
                    onCheckedChange={() => toggleOne(post.id)}
                  />
                </div>
                <h4 className="mt-1.5 line-clamp-2 text-sm font-medium">{post.title}</h4>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{post.authorName}</span>
                  <span>{formatDate(post.createdAt)}</span>
                  <span>조회 {post.viewCount}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditPost({ id: post.id, title: post.title, content: post.content })}>
                  <Pencil size={14} />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(post.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">카테고리</th>
              <th className="px-4 py-3 text-left font-medium">제목</th>
              <th className="px-4 py-3 text-left font-medium">작성자</th>
              <th className="px-4 py-3 text-left font-medium">날짜</th>
              <th className="px-4 py-3 text-left font-medium">조회</th>
              <th className="px-4 py-3 text-left font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((post) => (
              <tr key={post.id}>
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.has(post.id)}
                    onCheckedChange={() => toggleOne(post.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      post.category === "notice"
                        ? "bg-primary/10 text-primary"
                        : post.category === "seminar"
                        ? "bg-secondary/15 text-amber-700"
                        : post.category === "promotion"
                        ? "bg-emerald-50 text-emerald-700"
                        : ""
                    )}
                  >
                    {CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS] ?? post.category}
                  </Badge>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                  {post.title}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{post.authorName}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(post.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">{post.viewCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditPost({
                          id: post.id,
                          title: post.title,
                          content: post.content,
                        })
                      }
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 수정 Dialog */}
      <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>게시글 수정</DialogTitle>
          </DialogHeader>
          {editPost && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">제목</label>
                <Input
                  value={editPost.title}
                  onChange={(e) =>
                    setEditPost({ ...editPost, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">내용</label>
                <textarea
                  value={editPost.content}
                  onChange={(e) =>
                    setEditPost({ ...editPost, content: e.target.value })
                  }
                  rows={6}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPost(null)}>
              취소
            </Button>
            <Button onClick={handleEditSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
