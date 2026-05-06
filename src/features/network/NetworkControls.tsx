"use client";

import { Search, Users, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NETWORK_RELATION_LABELS,
  type NetworkFilterState,
  type NetworkRelationKind,
} from "@/types";
import { cn } from "@/lib/utils";

interface NetworkControlsProps {
  filter: NetworkFilterState;
  onChange: (next: NetworkFilterState) => void;
  /** 표시할 관계 종류 (확장 시 추가됨) */
  availableKinds?: NetworkRelationKind[];
  /** 그래프 통계 */
  stats: {
    nodeCount: number;
    visibleNodeCount: number;
    edgeCount: number;
    visibleEdgeCount: number;
  };
}

const KIND_LEGEND: Record<NetworkRelationKind, string> = {
  cohort: "굵은 선",
  identity: "보통 선",
};

const DEFAULT_KINDS: NetworkRelationKind[] = ["cohort", "identity"];

export default function NetworkControls({
  filter,
  onChange,
  availableKinds = DEFAULT_KINDS,
  stats,
}: NetworkControlsProps) {
  function toggleKind(kind: NetworkRelationKind) {
    const next = new Set(filter.enabledKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onChange({ ...filter, enabledKinds: next });
  }

  function toggleFirstDegree(value: boolean) {
    onChange({ ...filter, firstDegreeOnly: value });
  }

  function setSearch(value: string) {
    onChange({ ...filter, searchText: value });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 */}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={filter.searchText}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름·기수 검색"
          className="pl-8"
          aria-label="회원 검색"
        />
        {filter.searchText && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="검색 지우기"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* 관계 유형 필터 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">관계 유형</p>
        <div className="flex flex-col gap-2">
          {availableKinds.map((kind) => (
            <label
              key={kind}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                "hover:bg-muted/50",
              )}
            >
              <Checkbox
                checked={filter.enabledKinds.has(kind)}
                onCheckedChange={() => toggleKind(kind)}
                aria-label={NETWORK_RELATION_LABELS[kind]}
              />
              <span className="flex flex-1 items-center justify-between">
                <span>{NETWORK_RELATION_LABELS[kind]}</span>
                <span className="text-[11px] text-muted-foreground">
                  {KIND_LEGEND[kind]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 1촌만 */}
      <div>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            "hover:bg-muted/50",
          )}
        >
          <Checkbox
            checked={filter.firstDegreeOnly}
            onCheckedChange={(v) => toggleFirstDegree(!!v)}
            aria-label="본인 1촌만 보기"
          />
          <Users size={14} className="text-muted-foreground" />
          <span>본인 1촌만 보기</span>
        </label>
      </div>

      {/* 통계 */}
      <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>노드</span>
          <span className="font-semibold text-foreground">
            {stats.visibleNodeCount}/{stats.nodeCount}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>엣지</span>
          <span className="font-semibold text-foreground">
            {stats.visibleEdgeCount}/{stats.edgeCount}
          </span>
        </div>
      </div>
    </div>
  );
}
