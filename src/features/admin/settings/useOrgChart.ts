"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export type OrgRole = "advisor" | "professor" | "president" | "vice_president" | "direct_aide" | "team_member";

export interface OrgPosition {
  id: string;
  title: string;
  department?: string;
  level: number;
  parentId?: string;
  order: number;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  /** 시각적 구분·정렬용 역할 분류 */
  role?: OrgRole;
  /** 팀명 (부학회장 휘하 팀원 그룹핑) */
  team?: string;
  /** 학회장 직속 보조역 플래그 (role === "direct_aide"와 동등, UI 편의용) */
  isDirectAide?: boolean;
  /** 인수인계 메모 (Markdown) - 차기 임원에게 전달할 업무 노하우 */
  handover?: string;
  /** 독립 사이드 브랜치 (부모 카드 우측에 점선으로 표시, 예: 외부 자문위원) */
  isIndependent?: boolean;
}

/**
 * org-structure-v4 기본 구조
 * - L0: 주임교수 (최상위)
 * - L1: 전공 교수 (학회장 위 진짜 중간 레이어)
 * - L2: 학회장·부학회장 (전공교수 직속) + 직속보조(전공대표·조교·졸업생대표) — advisor 직속, 사이드카로 분리 표시
 */
export const DEFAULT_ORG_SEED: OrgPosition[] = [
  { id: "advisor",     title: "주임교수",         level: 0, order: 0,                              role: "advisor" },
  { id: "professor-1", title: "전공 교수 (공석)", level: 1, order: 0, parentId: "advisor",         role: "professor" },
  { id: "president",   title: "학회장",           level: 2, order: 0, parentId: "professor-1",     role: "president" },
  { id: "vp",          title: "부학회장",         level: 2, order: 1, parentId: "professor-1",     role: "vice_president" },
  { id: "major-rep",   title: "재학생 전공대표",  level: 2, order: 2, parentId: "advisor",         role: "direct_aide", isDirectAide: true },
  { id: "ta",          title: "조교",             level: 2, order: 3, parentId: "advisor",         role: "direct_aide", isDirectAide: true },
  { id: "alumni-rep",  title: "졸업생 대표",      level: 2, order: 4, parentId: "advisor",         role: "direct_aide", isDirectAide: true },
];

export interface OrgTreeNode extends OrgPosition {
  children: OrgTreeNode[];
}

const QUERY_KEY = ["site_settings", "org_chart"];

const DEFAULT_ORG: OrgPosition[] = [];

export function useOrgChart() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey("org_chart");
      if (res.data.length === 0) return { id: null, positions: DEFAULT_ORG };
      const row = res.data[0];
      return { id: row.id as string, positions: JSON.parse(row.value as string) as OrgPosition[] };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    positions: data?.positions ?? DEFAULT_ORG,
    recordId: data?.id ?? null,
    isLoading,
  };
}

export function useUpdateOrgChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, positions }: { recordId: string | null; positions: OrgPosition[] }) => {
      const payload = { key: "org_chart", value: JSON.stringify(positions) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function buildOrgTree(positions: OrgPosition[]): OrgTreeNode[] {
  const sorted = [...positions].sort((a, b) => a.order - b.order);
  const map = new Map<string, OrgTreeNode>();

  for (const p of sorted) {
    map.set(p.id, { ...p, children: [] });
  }

  const roots: OrgTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
