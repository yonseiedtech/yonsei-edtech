"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, commentsApi } from "@/lib/bkend";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post, Comment, PostCategory } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { notifyComment, notifyNewNotice } from "@/features/notifications/notify";

// ── Posts ──

const POSTS_PER_PAGE = 10;

export function usePosts(
  category?: PostCategory | "all",
  options?: { page?: number; search?: string }
) {
  const page = options?.page ?? 1;
  const search = options?.search ?? "";
  const user = useAuthStore((s) => s.user);
  const canSeeStaff = isStaffOrAbove(user);

  const effectiveCategory = category && category !== "all" ? category : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", effectiveCategory ?? "all"],
    queryFn: async () => {
      const res = await postsApi.list({
        limit: 200,
        sort: "",
        category: effectiveCategory,
      });
      const arr = res.data as unknown as Post[];
      arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      return arr;
    },
    retry: false,
  });

  let posts = data ?? [];

  // 운영진 게시판 글은 staff 이상만 볼 수 있음
  if (!effectiveCategory && !canSeeStaff) {
    posts = posts.filter((p) => p.category !== "staff");
  }

  // 클라이언트 검색 필터링
  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
    );
  }

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const paginatedPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  return { posts: paginatedPosts, totalPages, isLoading, error };
}

export function usePost(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const res = await postsApi.get(id);
      return res as unknown as Post;
    },
    retry: false,
  });

  return { post: data ?? null, isLoading };
}

// ── Comments ──

export function useComments(postId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await commentsApi.list(postId);
      return res.data as unknown as Comment[];
    },
    enabled: !!postId,
    retry: false,
  });

  return { comments: data ?? [], isLoading };
}

// ── Create Post ──

export function useCreatePost() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async (data: Partial<Post>) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const payload: Record<string, unknown> = {
        title: data.title,
        content: data.content,
        category: data.category,
        authorId: user.id,
        authorName: user.name,
        viewCount: 0,
      };
      if (data.imageUrls?.length) payload.imageUrls = data.imageUrls;
      if (data.poll) {
        // 옵션 id 생성 확정 + 초기 집계값 0
        payload.poll = {
          ...data.poll,
          options: data.poll.options
            .filter((o) => o.label.trim().length > 0)
            .map((o) => ({ ...o, voteCount: 0 })),
          totalVotes: 0,
        };
      }
      if (data.attachments?.length) payload.attachments = data.attachments;
      if (data.type) payload.type = data.type;
      if (data.interview) payload.interview = data.interview;
      // Sprint 76e: paper_review 게시판의 첨부 논문 — 누락되어 있던 필드 보존
      if (data.linkedPaper) payload.linkedPaper = data.linkedPaper;
      payload.likeCount = 0;
      const res = await postsApi.create(payload);
      // 공지사항이면 전체 회원에게 알림
      if (data.category === "notice") {
        const created = res as unknown as Post;
        notifyNewNotice(data.title ?? "", created.id, user.id);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return {
    createPost: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

// ── Update Post ──

export function useUpdatePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Post> }) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        content: data.content,
        category: data.category,
      };
      if (data.imageUrls) payload.imageUrls = data.imageUrls;
      if (data.poll) {
        // 수정 시 기존 집계값은 보존하므로, question/options label/설정만 병합.
        // 실제 서버에서는 options의 voteCount를 절대 덮어쓰지 않도록 처리 필요.
        payload.poll = data.poll;
      }
      if (data.attachments) payload.attachments = data.attachments;
      if ("type" in data) payload.type = data.type ?? null;
      if ("interview" in data) payload.interview = data.interview ?? null;
      // Sprint 76e: paper_review 첨부 논문 — 추가/제거 모두 반영 (undefined 도 명시 저장)
      if ("linkedPaper" in data) payload.linkedPaper = data.linkedPaper ?? null;
      return await postsApi.update(id, payload);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
    },
  });

  return { updatePost: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete Post ──

export function useDeletePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await postsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { deletePost: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete Comment ──

export function useDeleteComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      await commentsApi.delete(commentId);
      await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { deleteComment: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Update Comment ──

export function useUpdateComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ commentId, data }: { commentId: string; postId: string; data: { content: string } }) => {
      return await commentsApi.update(commentId, data);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  return { updateComment: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Create Comment ──

export function useCreateComment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async (data: { postId: string; content: string }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const res = await commentsApi.create({
        postId: data.postId,
        content: data.content,
        authorId: user.id,
        authorName: user.name,
      });
      // commentCount +1
      await updateDoc(doc(db, "posts", data.postId), { commentCount: increment(1) });
      // 게시글 작성자에게 댓글 알림 (본인 댓글 제외)
      try {
        const post = await postsApi.get(data.postId) as unknown as Post;
        if (post && post.authorId !== user.id) {
          notifyComment(post.authorId, user.name, post.title, data.postId);
        }
      } catch { /* 알림 실패는 무시 */ }
      return res;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
    },
  });

  return {
    createComment: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

// ── Increment View Count ──

export function useIncrementViewCount() {
  return useMutation({
    mutationFn: (id: string) => postsApi.incrementView(id),
  });
}
