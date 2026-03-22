"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, commentsApi } from "@/lib/bkend";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", category],
    queryFn: async () => {
      const cat = category === "all" ? undefined : category;
      const res = await postsApi.list({ category: cat, limit: 100 });
      return res.data as unknown as Post[];
    },
    retry: false,
  });

  let posts = data ?? [];

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
      const payload: Record<string, unknown> = {
        title: data.title,
        content: data.content,
        category: data.category,
        authorId: user?.id,
        authorName: user?.name,
        viewCount: 0,
      };
      if (data.imageUrls?.length) payload.imageUrls = data.imageUrls;
      return await postsApi.create(payload);
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
      return await postsApi.update(id, {
        title: data.title,
        content: data.content,
        category: data.category,
      });
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
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      return await commentsApi.delete(commentId);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
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
      return await commentsApi.create({
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
