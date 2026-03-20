"use client";

import { useOrgChart, buildOrgTree, type OrgTreeNode } from "@/features/admin/settings/useOrgChart";

function OrgNode({ node, isRoot }: { node: OrgTreeNode; isRoot?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {/* 노드 카드 */}
      <div className={`flex flex-col items-center rounded-xl border bg-white px-4 py-3 shadow-sm ${isRoot ? "border-primary/30 bg-primary/5" : ""}`}>
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

      {/* 자식 노드 */}
      {node.children.length > 0 && (
        <>
          {/* 세로 연결선 */}
          <div className="h-5 w-px bg-border" />
          {/* 가로 연결선 + 자식들 */}
          <div className="relative flex gap-6">
            {node.children.length > 1 && (
              <div className="absolute left-[calc(50%-50%+2rem)] right-[calc(50%-50%+2rem)] top-0 h-px bg-border" style={{
                left: `calc(${100 / (node.children.length * 2)}% + 0.5rem)`,
                right: `calc(${100 / (node.children.length * 2)}% + 0.5rem)`,
              }} />
            )}
            {node.children.map((child) => (
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
