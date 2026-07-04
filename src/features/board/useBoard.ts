"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, commentsApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post, Comment, PostCategory } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { notifyComment, notifyMention } from "@/features/notifications/notify";
import { extractMentions } from "@/lib/mentions";
import { profilesApi } from "@/lib/bkend";

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
    // 권한(로그인·staff)에 따라 보이는 카테고리가 달라 캐시 키에 포함
    queryKey: ["posts", effectiveCategory ?? "all", !!user, canSeeStaff],
    queryFn: async () => {
      // 전체 탭: 카테고리 무필터 list 는 rules 정적 평가에서 거부(2026-06-12 실증)
      // → 권한별 readable 카테고리 in 쿼리로 조회
      const res = effectiveCategory
        ? await postsApi.list({ limit: 200, sort: "", category: effectiveCategory })
        : await postsApi.listReadable({
            limit: 200,
            includeResources: !!user,
            includeStaff: canSeeStaff,
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

/**
 * Phase 3 — 본문 @멘션 알림 fan-out (실패해도 메인 기능 비차단).
 * excludeIds: 작성자 본인 + 이미 별도 알림을 받는 대상(게시글 작성자 등).
 */
async function notifyMentionsIn(
  text: string,
  mentionerName: string,
  link: string,
  excludeIds: string[],
) {
  try {
    if (!text.includes("@")) return;
    const res = await profilesApi.list({ "filter[approved]": "true", limit: 500 });
    const members = (res.data as unknown as { id: string; name?: string }[])
      .map((m) => ({ id: m.id, name: m.name ?? "" }))
      .filter((m) => m.name);
    const targets = extractMentions(text, members, excludeIds);
    await Promise.all(targets.map((t) => notifyMention(t.id, mentionerName, text.slice(0, 60), link)));
  } catch {
    // 멘션 알림 실패는 무시
  }
}

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
      // RT-1(2026-07-04): 공지 fan-out 서버화 — 작성자 브라우저 Promise.all(탭 닫으면 유실)
      // 대신 서버 배치 + 웹푸시 병행 (/api/notify/fanout, staff 전용)
      if (data.category === "notice") {
        const created = res as unknown as Post;
        void (async () => {
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            await fetch("/api/notify/fanout", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ kind: "notice", title: data.title ?? "", refId: created.id }),
            });
          } catch {
            /* 알림 실패는 게시를 막지 않음 */
          }
        })();
      }
      // Phase 3: 본문 @멘션 알림 (공지 fan-out 대상과 중복돼도 유형이 달라 유지)
      {
        const created = res as unknown as Post;
        void notifyMentionsIn(data.content ?? "", user.name, `/board/${created.id}`, [user.id]);
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
      let postAuthorId: string | null = null;
      const notified = new Set<string>([user.id]);
      try {
        const post = await postsApi.get(data.postId) as unknown as Post;
        if (post && post.authorId !== user.id) {
          postAuthorId = post.authorId;
          notified.add(post.authorId);
          notifyComment(post.authorId, user.name, post.title, data.postId);
        }
        // RT-1(2026-07-04): 스레드 구독 — 같은 글의 기존 댓글 참여자에게도 알림
        // (멘션 받은 사람이 답글을 달아도 원 멘션자가 모르던 회신 루프 단절 해소)
        try {
          const existing = await commentsApi.list(data.postId);
          const participants = Array.from(
            new Set((existing.data as { authorId?: string }[]).map((c) => c.authorId).filter(Boolean)),
          ) as string[];
          for (const pid of participants) {
            if (notified.has(pid)) continue;
            notified.add(pid);
            notifyComment(pid, user.name, post?.title ?? "게시글", data.postId);
          }
        } catch { /* 참여자 알림 실패는 무시 */ }
      } catch { /* 알림 실패는 무시 */ }
      // Phase 3: 댓글 본문 @멘션 알림 (이미 댓글/작성자 알림을 받은 대상 제외)
      void notifyMentionsIn(
        data.content,
        user.name,
        `/board/${data.postId}`,
        Array.from(notified),
      );
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
