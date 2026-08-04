"use client";

/**
 * 저장한 추천 주제 방향 훅 (2026-07-30 사용자 요청)
 *
 * 주제 탐색 인터뷰의 추천 프레임을 프로필 필드(users.savedTopicDirections)에
 * 저장·삭제하고, 핵심 주제 1개를 지정한다. 소량 데이터이므로 신규 컬렉션 없이
 * 프로필 필드로 보존 — streakFreezes 와 동일한 낙관적 update + 롤백 패턴.
 *
 * 핵심 주제는 논문 읽기·연구보고서 등 다른 화면에서 useCoreTopic() 으로 재사용한다.
 */

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { SavedTopicDirection, TopicSeed } from "@/types";

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* 무시 — 폴백 사용 */
  }
  return `td_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseSavedTopics {
  saved: SavedTopicDirection[];
  coreTopic: SavedTopicDirection | null;
  /** 문장이 이미 저장돼 있는지 (중복 저장 방지용) */
  isSaved: (label: string) => boolean;
  /** 추천 프레임 저장 — 중복이면 건너뜀 */
  save: (input: { label: string; approach?: string; note?: string; seed?: TopicSeed }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** 핵심 주제 토글 — 새로 지정 시 기존 핵심 자동 해제 (단일 보장) */
  toggleCore: (id: string) => Promise<void>;
}

export function useSavedTopics(): UseSavedTopics {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const saved = useMemo<SavedTopicDirection[]>(
    () => (Array.isArray(user?.savedTopicDirections) ? user!.savedTopicDirections : []),
    [user],
  );
  const coreTopic = useMemo(() => saved.find((t) => t.isCore) ?? null, [saved]);

  const persist = useCallback(
    async (next: SavedTopicDirection[], successMsg?: string) => {
      if (!user) return;
      const prev = user;
      setUser({ ...user, savedTopicDirections: next });
      try {
        await profilesApi.update(user.id, { savedTopicDirections: next });
        if (successMsg) toast.success(successMsg);
      } catch (e) {
        setUser(prev); // 롤백
        toast.error(`저장에 실패했습니다: ${(e as Error).message}`);
      }
    },
    [user, setUser],
  );

  const isSaved = useCallback(
    (label: string) => saved.some((t) => t.label === label),
    [saved],
  );

  const save = useCallback(
    async (input: { label: string; approach?: string; note?: string; seed?: TopicSeed }) => {
      const label = input.label.trim();
      if (!label) return;
      if (saved.some((t) => t.label === label)) {
        toast.info("이미 저장한 주제 방향입니다.");
        return;
      }
      const entry: SavedTopicDirection = {
        id: newId(),
        label,
        approach: input.approach,
        note: input.note,
        createdAt: new Date().toISOString(),
        ...(input.seed ? { seed: input.seed } : {}),
      };
      await persist([entry, ...saved], "추천 주제를 저장했어요. 아래 목록에서 핵심 주제를 지정할 수 있어요.");
    },
    [saved, persist],
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(saved.filter((t) => t.id !== id));
    },
    [saved, persist],
  );

  const toggleCore = useCallback(
    async (id: string) => {
      const target = saved.find((t) => t.id === id);
      if (!target) return;
      const makeCore = !target.isCore;
      // 단일 핵심 보장: 지정 시 나머지는 모두 해제, 해제 시 해당 항목만 false
      const next = saved.map((t) => ({ ...t, isCore: makeCore ? t.id === id : t.id === id ? false : t.isCore }));
      await persist(next, makeCore ? "핵심 주제로 지정했어요. 논문 읽기·연구보고서 화면 상단에 표시됩니다." : undefined);
    },
    [saved, persist],
  );

  return { saved, coreTopic, isSaved, save, remove, toggleCore };
}

/** 읽기 전용 — 다른 화면(논문 읽기·연구보고서 등)에서 핵심 주제만 조회 */
export function useCoreTopic(): SavedTopicDirection | null {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => {
    const list = Array.isArray(user?.savedTopicDirections) ? user!.savedTopicDirections : [];
    return list.find((t) => t.isCore) ?? null;
  }, [user]);
}
