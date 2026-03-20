"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

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
}

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
