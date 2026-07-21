"use client";

/**
 * 전공 네트워킹 — 회원 노드 (react-flow Custom Node)
 *
 * 시각:
 *  - 본인: 큰 원(56px) + ring-2 ring-primary
 *  - 1촌: 중간 원(44px)
 *  - 그 외: 기본 원(36px)
 *  - 신분별 색상 (재학생=primary, 졸업생=emerald, 운영진=amber, 자문=violet, 졸업생 default=slate)
 */

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import type { NetworkNode, UserRole } from "@/types";

const ROLE_COLOR: Record<UserRole, string> = {
  // 재학생/일반 회원
  member: "bg-cat-1/10 text-cat-1 ring-cat-1/30",
  // 졸업생
  alumni: "bg-success/10 text-success ring-success/30",
  // 운영진
  staff: "bg-warning/10 text-warning ring-warning/30",
  president: "bg-warning/10 text-warning ring-warning/30",
  // 자문
  advisor: "bg-cat-5/10 text-cat-5 ring-cat-5/30",
  // 관리자
  admin: "bg-muted text-muted-foreground ring-muted-foreground/40",
  sysadmin: "bg-muted text-muted-foreground ring-muted-foreground/40",
  guest: "bg-muted/60 text-muted-foreground ring-muted-foreground/30",
};

export interface MemberNodeData extends NetworkNode {
  /** 검색·필터로 dim 처리 */
  dimmed?: boolean;
  /** 검색 결과 강조 */
  highlighted?: boolean;
}

export default function MemberNode({ data }: NodeProps<MemberNodeData>) {
  const sizeClass = data.isMe
    ? "h-14 w-14 text-base ring-2 ring-primary shadow-md"
    : data.isFirstDegree
      ? "h-11 w-11 text-sm ring-2"
      : "h-9 w-9 text-xs ring-1";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center transition-opacity",
        data.dimmed && !data.highlighted && "opacity-25",
      )}
    >
      {/* 노드 원 */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          ROLE_COLOR[data.role],
          sizeClass,
          data.highlighted && "ring-2 ring-primary/80 shadow-lg",
        )}
        title={`${data.name} · ${data.generation}기`}
        aria-label={`${data.name} ${data.generation}기`}
      >
        <span aria-hidden="true">{data.name?.[0] ?? "?"}</span>

        {/* react-flow 엣지 연결 핸들 — 노드 사방 (시각적으로 숨김) */}
        <Handle type="source" position={Position.Top} className="!opacity-0" />
        <Handle type="target" position={Position.Bottom} className="!opacity-0" />
        <Handle type="source" position={Position.Left} className="!opacity-0" />
        <Handle type="target" position={Position.Right} className="!opacity-0" />
      </div>

      {/* 노드 라벨 — 전체 이름 + 기수 (항상 표시) */}
      <span
        className={cn(
          "mt-1 whitespace-nowrap rounded px-1 text-[11px] font-medium leading-tight",
          data.isMe
            ? "bg-primary/10 text-primary"
            : "text-foreground/90",
        )}
      >
        {data.name}
        <span className="ml-0.5 text-[10px] text-muted-foreground">
          · {data.generation}기
        </span>
      </span>
    </div>
  );
}
