"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export type OrgRole = "advisor" | "president" | "vice_president" | "direct_aide" | "team_member";

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
}

/** org-structure-v2 기본 구조: 주임교수 / 학회장 / 직속보조 3명 / 부학회장 */
export const DEFAULT_ORG_SEED: OrgPosition[] = [
  { id: "advisor",    title: "주임교수",        level: 0, order: 0, role: "advisor" },
  { id: "president",  title: "학회장",          level: 1, order: 0, parentId: "advisor",  role: "president" },
  { id: "major-rep",  title: "재학생 전공대표", level: 2, order: 0, parentId: "president", role: "direct_aide", isDirectAide: true },
  { id: "ta",         title: "조교",            level: 2, order: 1, parentId: "president", role: "direct_aide", isDirectAide: true },
  { id: "alumni-rep", title: "졸업생 대표",     level: 2, order: 2, parentId: "president", role: "direct_aide", isDirectAide: true },
  { id: "vp",         title: "부학회장",        level: 2, order: 3, parentId: "president", role: "vice_president" },
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
