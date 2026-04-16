"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileLikesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { ProfileLike } from "@/types";

/** 프로필의 좋아요 목록 조회 — 카운트 + 본인이 눌렀는지 + 누가 눌렀는지 */
export function useProfileLikes(profileId: string | undefined) {
  const viewer = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile-likes", profileId],
    queryFn: async () => {
      if (!profileId) return { data: [] as ProfileLike[] };
      return await profileLikesApi.listByProfile(profileId);
    },
    enabled: !!profileId,
  });

  const likes = useMemo(() => data?.data ?? [], [data]);
  const count = likes.length;
  const likedByMe = useMemo(
    () => (viewer?.id ? likes.some((l) => l.likerId === viewer.id) : false),
    [likes, viewer?.id],
  );

  const toggle = useMutation({
    mutationFn: async () => {
      if (!profileId || !viewer?.id) throw new Error("로그인 후 이용 가능합니다.");
      return await profileLikesApi.toggle(profileId, viewer.id, viewer.name);
    },
    // 낙관적 업데이트
    onMutate: async () => {
      if (!profileId || !viewer?.id) return;
      await qc.cancelQueries({ queryKey: ["profile-likes", profileId] });
      const prev = qc.getQueryData<{ data: ProfileLike[] }>(["profile-likes", profileId]);
      const wasLiked = prev?.data.some((l) => l.likerId === viewer.id) ?? false;
      const next = wasLiked
        ? (prev?.data ?? []).filter((l) => l.likerId !== viewer.id)
        : [
            ...(prev?.data ?? []),
            {
              id: `${profileId}_${viewer.id}`,
              profileId,
              likerId: viewer.id,
              likerName: viewer.name,
              createdAt: new Date().toISOString(),
            } as ProfileLike,
          ];
      qc.setQueryData(["profile-likes", profileId], { data: next });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["profile-likes", profileId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["profile-likes", profileId] });
    },
  });

  return { likes, count, likedByMe, isLoading, toggle };
}
