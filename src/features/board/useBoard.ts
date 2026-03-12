"use client";

import { useState, useMemo } from "react";
import { MOCK_POSTS, MOCK_COMMENTS } from "./board-data";
import type { Post, Comment, PostCategory } from "@/types";

export function usePosts(category?: PostCategory | "all") {
  // TODO: Replace with TanStack Query + bkend.ai postsApi
  const posts = useMemo(() => {
    if (!category || category === "all") return MOCK_POSTS;
    return MOCK_POSTS.filter((p) => p.category === category);
  }, [category]);

  return { posts, isLoading: false };
}

export function usePost(id: string) {
  // TODO: Replace with TanStack Query + bkend.ai postsApi.get()
  const post = MOCK_POSTS.find((p) => p.id === id) ?? null;
  return { post, isLoading: false };
}

export function useComments(postId: string) {
  // TODO: Replace with TanStack Query + bkend.ai commentsApi
  const [comments] = useState<Comment[]>(
    MOCK_COMMENTS.filter((c) => c.postId === postId)
  );
  return { comments, isLoading: false };
}

export function useCreatePost() {
  // TODO: Replace with bkend.ai postsApi.create()
  const createPost = async (_data: Partial<Post>) => {
    alert("게시글이 등록되었습니다. (데모)");
  };
  return { createPost, isLoading: false };
}

export function useCreateComment() {
  // TODO: Replace with bkend.ai commentsApi.create()
  const createComment = async (_data: { postId: string; content: string }) => {
    alert("댓글이 등록되었습니다. (데모)");
  };
  return { createComment, isLoading: false };
}
