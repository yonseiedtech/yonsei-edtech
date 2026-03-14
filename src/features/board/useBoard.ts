"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, commentsApi } from "@/lib/bkend";
import { MOCK_POSTS, MOCK_COMMENTS } from "./board-data";
import type { Post, Comment, PostCategory } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";

// ── Posts ──

const POSTS_PER_PAGE = 10;

export function usePosts(
  category?: PostCategory | "all",
  options?: { page?: number; search?: string }
) {
  const page = options?.page ?? 1;
  const search = options?.search ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["posts", category],
    queryFn: async () => {
      const cat = category === "all" ? undefined : category;
      const res = await postsApi.list({ category: cat, limit: 100 });
      return res.data as unknown as Post[];
    },
    placeholderData: () => {
      if (!category || category === "all") return MOCK_POSTS;
      return MOCK_POSTS.filter((p) => p.category === category);
    },
    retry: false,
  });

  // API 실패 시 mock fallback (data가 없으면 placeholderData 사용됨)
  let posts = data ?? (
    !category || category === "all"
      ? MOCK_POSTS
      : MOCK_POSTS.filter((p) => p.category === category)
  );

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

  return { posts: paginatedPosts, totalPages, isLoading };
}

export function usePost(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const res = await postsApi.get(id);
      return res as unknown as Post;
    },
    placeholderData: () => MOCK_POSTS.find((p) => p.id === id) ?? undefined,
    retry: false,
  });

  const post = data ?? MOCK_POSTS.find((p) => p.id === id) ?? null;
  return { post, isLoading };
}

// ── Comments ──

export function useComments(postId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await commentsApi.list(postId);
      return res.data as unknown as Comment[];
    },
    placeholderData: () => MOCK_COMMENTS.filter((c) => c.postId === postId),
    enabled: !!postId,
    retry: false,
  });

  const comments = data ?? MOCK_COMMENTS.filter((c) => c.postId === postId);
  return { comments, isLoading };
}

// ── Create Post ──

export function useCreatePost() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async (data: Partial<Post>) => {
      try {
        return await postsApi.create({
          title: data.title,
          content: data.content,
          category: data.category,
          authorId: user?.id,
          authorName: user?.name,
          viewCount: 0,
        });
      } catch {
        // API 실패 시 mock fallback: 로컬 캐시에 직접 추가
        const newPost: Post = {
          id: `p${Date.now()}`,
          title: data.title ?? "",
          content: data.content ?? "",
          category: data.category ?? "free",
          authorId: user?.id ?? "0",
          authorName: user?.name ?? "익명",
          viewCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Post[]>(["posts", "all"], (old) => [
          newPost,
          ...(old ?? MOCK_POSTS),
        ]);
        return newPost;
      }
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
      try {
        return await postsApi.update(id, {
          title: data.title,
          content: data.content,
          category: data.category,
        });
      } catch {
        // Mock fallback: 로컬 캐시 직접 수정
        queryClient.setQueryData<Post[]>(["posts", "all"], (old) =>
          (old ?? MOCK_POSTS).map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          )
        );
        // 단건 캐시도 갱신
        queryClient.setQueryData<Post>(["posts", id], (old) =>
          old ? { ...old, ...data, updatedAt: new Date().toISOString() } : old
        );
        return { id, ...data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return { updatePost: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete Post ──

export function useDeletePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await postsApi.delete(id);
      } catch {
        // Mock fallback: 로컬 캐시에서 제거
        queryClient.setQueryData<Post[]>(["posts", "all"], (old) =>
          (old ?? MOCK_POSTS).filter((p) => p.id !== id)
        );
      }
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
      try {
        return await commentsApi.delete(commentId);
      } catch {
        // Mock fallback: 로컬 캐시에서 제거
        queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
          (old ?? []).filter((c) => c.id !== commentId)
        );
      }
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  return { deleteComment: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Create Comment ──

export function useCreateComment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async (data: { postId: string; content: string }) => {
      try {
        return await commentsApi.create({
          postId: data.postId,
          content: data.content,
          authorId: user?.id,
          authorName: user?.name,
        });
      } catch {
        // API 실패 시 mock fallback: 로컬 캐시에 직접 추가
        const newComment: Comment = {
          id: `c${Date.now()}`,
          postId: data.postId,
          content: data.content,
          authorId: user?.id ?? "0",
          authorName: user?.name ?? "익명",
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Comment[]>(
          ["comments", data.postId],
          (old) => [...(old ?? []), newComment]
        );
        return newComment;
      }
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
