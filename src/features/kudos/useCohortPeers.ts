"use client";

/**
 * useCohortPeers — 같은 가입 학기(코호트) 동기 목록 (v8-H2).
 *
 * cohortKeyOf(me) 순수 함수로 같은 코호트 승인 회원(나 제외)을 추린다.
 * useMembers 는 승인 회원만 반환하며 react-query 로 캐시 공유(중복 fetch 없음).
 */

import { useMemo } from "react";
import { useMembers } from "@/features/member/useMembers";
import { cohortKeyOf } from "@/lib/semester";
import type { User } from "@/types";

export function useCohortPeers(me: User | null | undefined): {
  peers: User[];
  myCohort: string | null;
  isLoading: boolean;
} {
  const { members, isLoading } = useMembers();
  const myCohort = useMemo(() => (me ? cohortKeyOf(me) : null), [me]);
  const peers = useMemo(
    () =>
      me && myCohort
        ? members.filter((m) => m.id !== me.id && cohortKeyOf(m) === myCohort)
        : [],
    [members, myCohort, me],
  );
  return { peers, myCohort, isLoading };
}
