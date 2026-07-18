"use client";

import { useQuery } from "@tanstack/react-query";
import { flashcardsApi } from "@/lib/bkend";
import type { Flashcard } from "@/types/flashcard";

/**
 * useUserFlashcards — 사용자 암기카드 목록 읽기 캐시 (M4).
 *
 * FlashcardStudy(러너)·FlashcardDashboard(통계)가 동일 queryKey 로 캐시를 공유해
 * /flashcards 진입 시 이중 읽기를 1회로 합친다. 정렬(sortForStudy)·집계(computeStats)는
 * 각 소비자가 담당하므로 이 훅은 원본 목록만 반환한다. 학습 세션 중 목록이 재정렬되지
 * 않도록 채점 후 invalidate 하지 않는 기존 동작을 유지한다(사용자 데이터라 staleTime 2분).
 */
export function useUserFlashcards(userId: string | undefined) {
  return useQuery({
    queryKey: ["flashcards", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return [] as Flashcard[];
      const res = await flashcardsApi.listByUser(userId);
      return (res.data ?? []) as Flashcard[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
