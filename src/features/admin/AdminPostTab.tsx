"use client";

import { MOCK_POSTS } from "@/features/board/board-data";
import { CATEGORY_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPostTab() {
  function handleDelete(postId: string) {
    toast.success(`게시글 ${postId} 삭제 완료 (데모)`);
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left font-medium">카테고리</th>
            <th className="px-4 py-3 text-left font-medium">제목</th>
            <th className="px-4 py-3 text-left font-medium">작성자</th>
            <th className="px-4 py-3 text-left font-medium">날짜</th>
            <th className="px-4 py-3 text-left font-medium">조회</th>
            <th className="px-4 py-3 text-left font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {MOCK_POSTS.map((post) => (
            <tr key={post.id}>
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
                      : post.category === "newsletter"
                      ? "bg-violet-50 text-violet-700"
                      : ""
                  )}
                >
                  {CATEGORY_LABELS[post.category]}
                </Badge>
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                {post.title}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{post.authorName}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(post.createdAt)}</td>
              <td className="px-4 py-3 text-muted-foreground">{post.viewCount}</td>
              <td className="px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(post.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
