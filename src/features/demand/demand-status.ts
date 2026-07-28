/**
 * 수요 상태 전환 이력 유틸 (H3 퍼널 지표 — Phase 3)
 * demandPref.statusHistory 에 단계 전환을 append 한다.
 *  - 중복 방지: 마지막 기록과 같은 status 면 그대로 반환(연속 기록 안 함).
 *  - at: ISO(생성 시점 — mutation 내부에서 호출하므로 렌더 순수성 무관).
 *  - by: 전환 수행자 user.id (선택).
 * 부재(레거시 수요)는 [] 로 시작 → 마이그레이션 불필요.
 */
import type { CommQuestion } from "@/types";

export type DemandStatusHistoryEntry = { status: string; at: string; by?: string };

export function appendStatusHistory(
  pref: CommQuestion["demandPref"] | undefined,
  status: string,
  by?: string,
): DemandStatusHistoryEntry[] {
  const hist: DemandStatusHistoryEntry[] = pref?.statusHistory ?? [];
  const last = hist[hist.length - 1];
  if (last && last.status === status) return hist;
  return [...hist, { status, at: new Date().toISOString(), ...(by ? { by } : {}) }];
}
