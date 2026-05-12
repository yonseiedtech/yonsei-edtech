/**
 * Mastery Learning 진행률 헬퍼 (Bloom, 1968)
 *
 * Bloom (1968)의 완전 학습(Mastery Learning) 이론에 근거:
 * 학습자는 각 단위를 완전히 숙달(mastery)한 후 다음 단위로 이동한다.
 * 여기서 각 학기 카드의 5개 항목을 "학습 단위"로 보고,
 * 학습자가 스스로 완료 여부를 체크하여 숙달 여부를 판단한다.
 *
 * 저장소: localStorage (MVP — 비로그인도 체크 가능하나 저장 안 됨)
 * 키 패턴: `yedu_roadmap_progress_{stageOrder}_{itemIndex}`
 */

const KEY_PREFIX = "yedu_roadmap_progress";

/** localStorage 키 생성 */
export function progressKey(stageOrder: number, itemIndex: number): string {
  return `${KEY_PREFIX}_${stageOrder}_${itemIndex}`;
}

/** 항목 완료 여부 읽기 (SSR-safe) */
export function getItemChecked(stageOrder: number, itemIndex: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(progressKey(stageOrder, itemIndex)) === "1";
  } catch {
    return false;
  }
}

/** 항목 완료 여부 저장 (SSR-safe) */
export function setItemChecked(
  stageOrder: number,
  itemIndex: number,
  checked: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    if (checked) {
      localStorage.setItem(progressKey(stageOrder, itemIndex), "1");
    } else {
      localStorage.removeItem(progressKey(stageOrder, itemIndex));
    }
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 쿼터 초과 등) — 무시
  }
}

/** 한 stage의 완료된 항목 수 읽기 */
export function getStageCheckedCount(
  stageOrder: number,
  totalItems: number
): number {
  let count = 0;
  for (let i = 0; i < totalItems; i++) {
    if (getItemChecked(stageOrder, i)) count++;
  }
  return count;
}

/** 전체 stage의 완료된 항목 수 / 전체 항목 수 */
export function getOverallProgress(
  stages: Array<{ order: number; itemCount: number }>
): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const s of stages) {
    total += s.itemCount;
    completed += getStageCheckedCount(s.order, s.itemCount);
  }
  return { completed, total };
}
