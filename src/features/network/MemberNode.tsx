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
  member: "bg-blue-100 text-blue-700 ring-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800",
  // 졸업생
  alumni: "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800",
  // 운영진
  staff: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
  president: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800",
  // 자문
  advisor: "bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800",
  // 관리자
  admin: "bg-slate-200 text-slate-700 ring-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600",
  sysadmin: "bg-slate-200 text-slate-700 ring-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600",
  guest: "bg-slate-100 text-slate-500 ring-slate-300",
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
        "group relative flex items-center justify-center rounded-full font-semibold transition-opacity",
        ROLE_COLOR[data.role],
        sizeClass,
        data.dimmed && !data.highlighted && "opacity-25",
        data.highlighted && "ring-2 ring-primary/80 shadow-lg",
      )}
      title={`${data.name} · ${data.generation}기`}
    >
      {/* 호버용 미니 라벨 */}
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {data.name} · {data.generation}기
      </span>
      <span aria-hidden="true">
        {data.name?.[0] ?? "?"}
      </span>

      {/* react-flow 엣지 연결 핸들 — 노드 사방 */}
      <Handle type="source" position={Position.Top} className="!opacity-0" />
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <Handle type="source" position={Position.Left} className="!opacity-0" />
      <Handle type="target" position={Position.Right} className="!opacity-0" />
    </div>
  );
}
