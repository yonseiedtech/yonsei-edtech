"use client";

import { useOrgChart, buildOrgTree, type OrgTreeNode, type OrgRole } from "@/features/admin/settings/useOrgChart";

const ROLE_LABELS: Record<OrgRole, string> = {
  advisor: "주임교수",
  professor: "전공 교수",
  president: "학회장",
  vice_president: "부학회장",
  direct_aide: "직속 보조",
  team_member: "팀원",
};

interface RoleStyle {
  card: string;
  avatar: string;
  badge: string;
}

const ROLE_STYLES: Record<OrgRole, RoleStyle> = {
  advisor: {
    card: "border-violet-300/60 bg-violet-50/60",
    avatar: "bg-violet-100 text-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
  professor: {
    card: "border-amber-300/60 bg-amber-50/40",
    avatar: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  president: {
    card: "border-primary/40 bg-primary/5",
    avatar: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary",
  },
  vice_president: {
    card: "border-amber-400/60 bg-amber-50/50",
    avatar: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  direct_aide: {
    card: "border-teal-300/60 bg-teal-50/50",
    avatar: "bg-teal-100 text-teal-700",
    badge: "bg-teal-100 text-teal-700",
  },
  team_member: {
    card: "",
    avatar: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function getRoleStyle(role?: OrgRole, hasUser?: boolean): RoleStyle {
  if (role && ROLE_STYLES[role]) {
    const style = ROLE_STYLES[role];
    // 담당자 미배정 시 아바타 회색으로
    return hasUser ? style : { ...style, avatar: "bg-muted text-muted-foreground" };
  }
  return {
    card: "",
    avatar: hasUser ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  };
}

function OrgNode({ node, isRoot, isIndependent }: { node: OrgTreeNode; isRoot?: boolean; isIndependent?: boolean }) {
  const regulars = node.children.filter((c) => !c.isIndependent);
  const independents = node.children.filter((c) => c.isIndependent);
  const style = getRoleStyle(node.role, !!node.userName);
  // 독립기관 시각이 우선 (점선 테두리). 그다음 role 색상. role 없고 root일 때만 primary.
  const cardClass = isIndependent
    ? "border-dashed border-amber-400/60 bg-amber-50/40"
    : style.card || (isRoot ? "border-primary/30 bg-primary/5" : "");

  return (
    <div className="flex flex-col items-center">
      {/* 부모 카드 + 독립기관 (독립은 absolute로 부모의 수평 중심축을 흔들지 않음) */}
      <div className="relative">
        <div className={`flex flex-col items-center rounded-xl border bg-white px-4 py-3 shadow-sm ${cardClass}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${style.avatar}`}>
            {node.userName ? node.userName[0] : "?"}
          </div>
          <p className="mt-1.5 text-xs font-semibold">{node.title}</p>
          <p className="text-[11px] text-muted-foreground">{node.userName ?? "공석"}</p>
          {node.department && (
            <p className="text-[10px] text-muted-foreground/70">{node.department}</p>
          )}
          {node.role && (
            <span className={`mt-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${style.badge}`}>
              {ROLE_LABELS[node.role]}
            </span>
          )}
        </div>

        {/* 독립기관: 부모 카드 오른쪽, 카드 수직 중심에 배치 (겹침 방지) */}
        {independents.length > 0 && (
          <div className="absolute left-full top-1/2 ml-8 flex -translate-y-1/2 flex-col gap-3">
            {independents.map((ind) => (
              <div key={ind.id} className="flex items-center gap-2">
                <div className="h-px w-6 border-t border-dashed border-amber-400/70" />
                <OrgNode node={ind} isIndependent />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 자식 노드 (직속) */}
      {regulars.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="relative flex gap-6">
            {regulars.length > 1 && (
              <div className="absolute top-0 h-px bg-border" style={{
                left: `calc(${100 / (regulars.length * 2)}% + 0.5rem)`,
                right: `calc(${100 / (regulars.length * 2)}% + 0.5rem)`,
              }} />
            )}
            {regulars.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-5 w-px bg-border" />
                <OrgNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MobileOrgList({ nodes, depth = 0 }: { nodes: OrgTreeNode[]; depth?: number }) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const style = getRoleStyle(node.role, !!node.userName);
        return (
          <div key={node.id}>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50"
              style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.avatar}`}>
                {node.userName ? node.userName[0] : "?"}
              </div>
              <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{node.title}</span>
                {node.role && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}>
                    {ROLE_LABELS[node.role]}
                  </span>
                )}
                {node.isIndependent && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">독립</span>
                )}
                <span className="text-xs text-muted-foreground">{node.userName ?? "공석"}</span>
                {node.department && (
                  <span className="text-xs text-muted-foreground/70">· {node.department}</span>
                )}
              </div>
            </div>
            {node.children.length > 0 && (
              <MobileOrgList nodes={node.children} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrgChart() {
  const { positions, isLoading } = useOrgChart();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (positions.length === 0) return null;

  const tree = buildOrgTree(positions);
  if (tree.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h3 className="mb-4 text-center text-lg font-bold">조직도</h3>

      {/* 데스크톱: 트리 시각화 */}
      <div className="hidden justify-center overflow-x-auto md:flex">
        <div className="flex gap-8">
          {tree.map((root) => (
            <OrgNode key={root.id} node={root} isRoot />
          ))}
        </div>
      </div>

      {/* 모바일: 리스트 */}
      <div className="md:hidden">
        <MobileOrgList nodes={tree} />
      </div>

      {/* 역할 범례 (데스크톱 전용) */}
      <div className="mt-6 hidden flex-wrap items-center justify-center gap-2 text-[10px] md:flex">
        {(Object.entries(ROLE_LABELS) as [OrgRole, string][]).map(([role, label]) => (
          <span key={role} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${ROLE_STYLES[role].badge}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
