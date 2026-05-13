// ── 전공 네트워킹 그래프 빌더 ──
// MVP: cohort + identity 2종 페어 매칭
// Phase 2: school_level 매칭 + networkOptIn 옵트아웃 회원 제외 (excludedOptOutCount 카운트)

import type { User } from "@/types";
import type {
  NetworkEdge,
  NetworkGraph,
  NetworkNode,
  NetworkRelationKind,
} from "@/types";

function isOptedOut(user: User): boolean {
  return user.notificationPrefs?.networkOptIn === false;
}

/** User → NetworkNode (관계 매칭 키 포함) */
function toNode(user: User, currentUserId: string): NetworkNode {
  const cohortKey =
    user.enrollmentYear && user.enrollmentHalf
      ? `${user.enrollmentYear}-${user.enrollmentHalf}`
      : null;

  const identityKey = `${user.occupation ?? "_"}_${user.role}`;

  return {
    id: user.id,
    name: user.name,
    generation: user.generation,
    cohortKey,
    identityKey,
    schoolLevel: user.schoolLevel ?? null,
    role: user.role,
    occupation: user.occupation,
    profileImage: user.profileImage,
    researchInterests: user.researchInterests,
    isMe: user.id === currentUserId,
    isFirstDegree: false, // 엣지 계산 후 채움
  };
}

/** 엣지 무게 — kinds 조합에 따라 굵기 */
function calcWeight(kinds: NetworkRelationKind[]): number {
  let w = 0;
  if (kinds.includes("identity")) w += 1.5;
  if (kinds.includes("school_level")) w += 1.5;
  if (kinds.includes("cohort")) w += 2.5;
  // 시각상 너무 굵지 않게 3.5 cap (cohort+identity 4.0 → 3.5)
  return Math.min(w, 3.5);
}

/**
 * 회원 배열에서 모든 페어를 비교해 매칭되는 관계 종류를 산정.
 * Phase 2: cohort + identity + school_level 3종.
 *
 * 옵트아웃 (`notificationPrefs.networkOptIn === false`) 회원은 노드에서 제외 (본인 예외).
 *
 * 시간 복잡도: O(N^2). N≤300 까지는 단일 스레드로 충분.
 */
export function buildNetwork(
  users: User[],
  currentUserId: string,
): NetworkGraph {
  // 승인 + rejected=false (Plan §2-1)
  const approved = users.filter((u) => u.approved && !u.rejected);

  // Phase 2: 옵트아웃 회원은 본인 제외하고 노드에서 빼되, 카운트는 보고
  const optedOut = approved.filter((u) => isOptedOut(u) && u.id !== currentUserId);
  const visibleSource = approved.filter(
    (u) => !isOptedOut(u) || u.id === currentUserId,
  );

  const nodes = visibleSource.map((u) => toNode(u, currentUserId));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: NetworkEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      const kinds: NetworkRelationKind[] = [];

      // cohort: 둘 다 cohortKey 가 있고 동일
      if (a.cohortKey !== null && a.cohortKey === b.cohortKey) {
        kinds.push("cohort");
      }

      // identity: 동일 occupation+role
      if (a.identityKey === b.identityKey) {
        kinds.push("identity");
      }

      // school_level (Phase 2): 둘 다 schoolLevel 있고 동일
      if (a.schoolLevel !== null && a.schoolLevel === b.schoolLevel) {
        kinds.push("school_level");
      }

      if (kinds.length === 0) continue;

      edges.push({
        id: `${a.id}__${b.id}`,
        source: a.id,
        target: b.id,
        kinds,
        weight: calcWeight(kinds),
      });
    }
  }

  // 본인과 연결된 노드를 1촌(isFirstDegree)으로 표기
  for (const e of edges) {
    if (e.source === currentUserId) {
      const peer = nodeById.get(e.target);
      if (peer) peer.isFirstDegree = true;
    } else if (e.target === currentUserId) {
      const peer = nodeById.get(e.source);
      if (peer) peer.isFirstDegree = true;
    }
  }

  return {
    nodes,
    edges,
    excludedOptOutCount: optedOut.length,
  };
}
