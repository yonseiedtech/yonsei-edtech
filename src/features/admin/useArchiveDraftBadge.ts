"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * 콘솔 사이드바 "아카이브 미검수" 배지 카운트 무효화 훅.
 *
 * 배지 카운트는 console/layout.tsx 의 상주(persistent) 쿼리
 * (["admin","archive-{rm|sm|ft|wt}-draft"]) 합계로 계산된다. 레이아웃이
 * 콘솔 내 페이지 이동에도 언마운트되지 않으므로, 아카이브 페이지에서
 * 검수(publish)·삭제·시드를 해도 이 쿼리들이 자동 refetch 되지 않아
 * 배지 숫자가 옛 값으로 고정되는 문제가 있었다(예: "여전히 10건").
 *
 * 각 아카이브 콘솔 페이지의 load() 끝에서 이 무효화를 호출해,
 * 데이터가 바뀔 때마다 배지 카운트가 재계산되게 한다.
 */
export function useInvalidateArchiveDraftBadge() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin", "archive-rm-draft"] });
    qc.invalidateQueries({ queryKey: ["admin", "archive-sm-draft"] });
    qc.invalidateQueries({ queryKey: ["admin", "archive-ft-draft"] });
    qc.invalidateQueries({ queryKey: ["admin", "archive-wt-draft"] });
  }, [qc]);
}
