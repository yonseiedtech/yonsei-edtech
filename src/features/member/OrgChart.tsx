"use client";

import { useOrgChart, buildOrgTree, type OrgTreeNode } from "@/features/admin/settings/useOrgChart";

function OrgNode({ node, isRoot, isIndependent }: { node: OrgTreeNode; isRoot?: boolean; isIndependent?: boolean }) {
  const regulars = node.children.filter((c) => !c.isIndependent);
  const independents = node.children.filter((c) => c.isIndependent);

  return (
    <div className="flex flex-col items-center">
      {/* 부모 카드 + 독립기관 (독립은 absolute로 부모의 수평 중심축을 흔들지 않음) */}
      <div className="relative">
        <div className={`flex flex-col items-center rounded-xl border bg-white px-4 py-3 shadow-sm ${isRoot ? "border-primary/30 bg-primary/5" : ""} ${isIndependent ? "border-dashed border-amber-400/60 bg-amber-50/40" : ""}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            node.userName
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {node.userName ? node.userName[0] : "?"}
          </div>
          <p className="mt-1.5 text-xs font-semibold">{node.title}</p>
          <p className="text-[11px] text-muted-foreground">{node.userName ?? "공석"}</p>
          {node.department && (
            <p className="text-[10px] text-muted-foreground/70">{node.department}</p>
          )}
        </div>

        {/* 독립기관: 부모 카드 오른쪽, 부모-자식 중간 높이에 배치 */}
        {independents.length > 0 && (
          <div
            className={
              regulars.length > 0
                ? "absolute left-full top-full ml-8 flex -translate-y-1/2 flex-col gap-2 pt-[0.625rem]"
                : "absolute left-full top-1/2 ml-8 flex -translate-y-1/2 flex-col gap-2"
            }
          >
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
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50"
            style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              node.userName ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {node.userName ? node.userName[0] : "?"}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium">{node.title}</span>
              {node.isIndependent && (
                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">독립</span>
              )}
              <span className="ml-1.5 text-xs text-muted-foreground">{node.userName ?? "공석"}</span>
              {node.department && (
                <span className="ml-1 text-xs text-muted-foreground/70">· {node.department}</span>
              )}
            </div>
          </div>
          {node.children.length > 0 && (
            <MobileOrgList nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
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
    </div>
  );
}
