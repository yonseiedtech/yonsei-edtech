"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePost } from "@/features/board/useBoard";
import { CATEGORY_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { post } = usePost(id);

  if (!post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold">공지를 찾을 수 없습니다</h2>
          <Link href="/notices">
            <Button variant="outline" className="mt-4">
              목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <button
          onClick={() => router.push("/notices")}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        <article className="rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABELS[post.category]}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold">{post.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{post.authorName}</span>
            <span>{formatDate(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {post.content}
          </div>
        </article>
      </div>
    </div>
  );
}
