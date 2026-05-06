// ── 전공 네트워킹 Map (major-network-map MVP / Phase 1) ──
// 분석 근거: docs/01-plan/features/major-network-map.plan.md §3-1

import type { OccupationType, UserRole } from "./user";

/** 관계(엣지) 종류 — Phase 1 은 cohort + identity 2종, Phase 2~3 에서 schoolLevel·office·interest 추가 */
export type NetworkRelationKind = "cohort" | "identity";

export const NETWORK_RELATION_LABELS: Record<NetworkRelationKind, string> = {
  cohort: "동기 (입학 시점)",
  identity: "같은 신분 유형",
};

/** 그래프 노드 — 한 회원 */
export interface NetworkNode {
  id: string;
  name: string;
  /** 기수 */
  generation: number;
  /** 동기 식별 키 — `${enrollmentYear}-${enrollmentHalf}` (둘 중 하나라도 미입력 시 null) */
  cohortKey: string | null;
  /** 신분 식별 키 — `${occupation ?? "_"}_${role}` */
  identityKey: string;
  role: UserRole;
  occupation?: OccupationType;
  profileImage?: string;
  /** 관심 연구 키워드 (Phase 3 interest 관계 산정용 — Phase 1 에선 표시만) */
  researchInterests?: string[];
  /** 본인 노드인가 */
  isMe: boolean;
  /** 본인과 직접 연결된 노드인가 (1촌) */
  isFirstDegree: boolean;
}

/** 그래프 엣지 — 두 회원 간 관계 */
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  /** 엣지가 가진 관계 종류 (둘 다 일 수 있음) */
  kinds: NetworkRelationKind[];
  /**
   * 시각용 굵기 가중치.
   *  - identity 만: 1.5
   *  - cohort 만:   2.5
   *  - 둘 다:        3.5
   */
  weight: number;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/** 컨트롤 패널 필터 상태 */
export interface NetworkFilterState {
  /** 활성화된 관계 유형 (체크박스) */
  enabledKinds: Set<NetworkRelationKind>;
  /** 본인 1촌만 보기 토글 */
  firstDegreeOnly: boolean;
  /** 검색 텍스트 (이름·기수 매치) */
  searchText: string;
}
