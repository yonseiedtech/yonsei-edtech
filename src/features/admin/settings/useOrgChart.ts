"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import { currentSemesterKey } from "@/lib/semester";

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
  /** 담당 업무 설명 (이 직책이 맡는 일 — 조직 설정·직책 상세에 노출, 공개 조직도엔 비노출) */
  duty?: string;
  /** 인수인계 메모 (Markdown) - 차기 임원에게 전달할 업무 노하우 */
  handover?: string;
  /** 독립 사이드 브랜치 (부모 카드 우측에 점선으로 표시, 예: 외부 자문위원) */
  isIndependent?: boolean;
}

/**
 * org-structure-v5 기본 구조
 * - L0: 주임교수 (최상위)
 * - L1: 전공 교수 (학회장 위 진짜 중간 레이어)
 * - L2: 전공대표·조교·학회장·졸업생대표 (전공교수 자식, 학회장과 같은 시각 레벨)
 *       · 전공대표·조교·졸업생대표는 의미상 advisor 직속(isDirectAide) — 점선 카드 + 배지로 표시
 * - L3: 부학회장 (학회장 직속)
 * - 자문위원: 주임교수와 같은 최상위 레벨(별도 루트). 복수는 직책 추가로 확장.
 */
export const DEFAULT_ORG_SEED: OrgPosition[] = [
  { id: "advisor",     title: "주임교수",         level: 0, order: 0,                              role: "advisor" },
  { id: "advisory-committee", title: "자문위원",  level: 0, order: 1,                              role: "advisor" },
  { id: "professor-1", title: "전공 교수 (공석)", level: 1, order: 0, parentId: "advisor",         role: "professor" },
  { id: "major-rep",   title: "재학생 전공대표",  level: 2, order: 0, parentId: "professor-1",     role: "direct_aide", isDirectAide: true },
  { id: "ta",          title: "조교",             level: 2, order: 1, parentId: "professor-1",     role: "direct_aide", isDirectAide: true },
  { id: "president",   title: "학회장",           level: 2, order: 2, parentId: "professor-1",     role: "president" },
  { id: "alumni-rep",  title: "졸업생 대표",      level: 2, order: 3, parentId: "professor-1",     role: "direct_aide", isDirectAide: true },
  { id: "vp",          title: "부학회장",         level: 3, order: 0, parentId: "president",       role: "vice_president" },
];

export interface OrgTreeNode extends OrgPosition {
  children: OrgTreeNode[];
}

const QUERY_KEY_BASE = ["site_settings", "org_chart"];

const DEFAULT_ORG: OrgPosition[] = [];

/** 학기 스코프 site_settings 키. 예: "org_chart:2026-2" */
export function orgChartKey(semesterKey: string): string {
  return `org_chart:${semesterKey}`;
}

/**
 * 한 학기 조직도를 로드. 학기 키 문서가 없고 allowLegacy 이면 레거시 `org_chart` 키로 폴백(하위호환).
 * 레거시 폴백 시에는 이 학기의 문서가 아니므로 recordId 를 노출하지 않음 →
 * 다음 저장부터 학기 키로 신규 생성(강제 마이그레이션 없음).
 */
async function loadOrgForSemester(semesterKey: string, allowLegacy: boolean) {
  let res = await siteSettingsApi.getByKey(orgChartKey(semesterKey));
  let fromLegacy = false;
  if (res.data.length === 0 && allowLegacy) {
    res = await siteSettingsApi.getByKey("org_chart");
    fromLegacy = true;
  }
  if (res.data.length === 0) {
    return { recordId: null, positions: DEFAULT_ORG, signature: undefined, fromLegacy: false };
  }
  const row = res.data[0];
  // 손상·레거시 값이 들어와도 편집기·공개 조직도가 함께 붕괴하지 않도록 방어 파싱
  let positions: OrgPosition[] = DEFAULT_ORG;
  try {
    const parsed = JSON.parse(row.value as string);
    if (Array.isArray(parsed)) positions = parsed as OrgPosition[];
  } catch (e) {
    console.warn("[useOrgChart] org_chart value 파싱 실패 — 빈 조직도로 폴백", e);
  }
  // 동시편집 충돌 감지용 시그니처 (updatedAt 우선, 없으면 원본 value 문자열)
  const signature = (row.updatedAt as string | undefined) ?? (row.value as string | undefined);
  return {
    recordId: fromLegacy ? null : (row.id as string),
    positions,
    signature: fromLegacy ? undefined : signature,
    fromLegacy,
  };
}

/**
 * 학기별 조직도 훅.
 * @param semesterKey 대상 학기 키(예: "2026-2"). 생략 시 현재 학기 — 이 경우에만 레거시 폴백 허용.
 * 인자 없는 기본 호출은 현재 학기(+레거시 폴백)를 반환하므로 기존 호출부는 변경 불필요.
 */
export function useOrgChart(semesterKey?: string) {
  const resolvedKey = semesterKey ?? currentSemesterKey();
  const allowLegacy = resolvedKey === currentSemesterKey();
  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, resolvedKey],
    queryFn: () => loadOrgForSemester(resolvedKey, allowLegacy),
    staleTime: 1000 * 60 * 5,
  });

  return {
    positions: data?.positions ?? DEFAULT_ORG,
    recordId: data?.recordId ?? null,
    signature: data?.signature,
    isLegacyFallback: data?.fromLegacy ?? false,
    semesterKey: resolvedKey,
    isLoading,
  };
}

export function useUpdateOrgChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      positions,
      semesterKey,
    }: {
      recordId: string | null;
      positions: OrgPosition[];
      semesterKey: string;
    }) => {
      const payload = { key: orgChartKey(semesterKey), value: JSON.stringify(positions) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    // 프리픽스 매칭으로 모든 학기 쿼리 무효화
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY_BASE }),
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
    if (node.parentId) {
      // parentId 가 실재하는 경우에만 자식으로 편입.
      // 죽은 parentId 를 가리키는 고아 노드는 루트로 승격하지 않고 드롭(계단식 삭제 방어).
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
