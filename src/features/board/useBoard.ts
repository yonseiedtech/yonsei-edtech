"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, commentsApi } from "@/lib/bkend";
import { MOCK_POSTS, MOCK_COMMENTS } from "./board-data";
import type { Post, Comment, PostCategory } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";

// ── Posts ──

export function usePosts(category?: PostCategory | "all") {
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
  const posts = data ?? (
    !category || category === "all"
      ? MOCK_POSTS
      : MOCK_POSTS.filter((p) => p.category === category)
  );

  return { posts, isLoading };
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
      return postsApi.create({
        title: data.title,
        content: data.content,
        category: data.category,
        authorId: user?.id,
        authorName: user?.name,
        viewCount: 0,
      });
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

// ── Create Comment ──

export function useCreateComment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async (data: { postId: string; content: string }) => {
      return commentsApi.create({
        postId: data.postId,
        content: data.content,
        authorId: user?.id,
        authorName: user?.name,
      });
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
