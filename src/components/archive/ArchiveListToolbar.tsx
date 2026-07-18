"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ArchiveListSortOption {
  value: string;
  label: string;
}

interface ArchiveListToolbarProps {
  /** 검색어 */
  query: string;
  onQueryChange: (v: string) => void;
  placeholder?: string;
  /** 검색 후 노출되는 항목 수 (검색·필터 활성 시 표시) */
  resultCount?: number;
  /** 전체 항목 수 (항상 표시) */
  totalCount?: number;
  /** 정렬 (옵션 제공 시에만 노출) */
  sortMode?: string;
  onSortChange?: (v: string) => void;
  sortOptions?: ArchiveListSortOption[];
  /** 즐겨찾기만 토글 (로그인 사용자에게만 노출) */
  showFavoritesToggle?: boolean;
  favoritesOnly?: boolean;
  onFavoritesToggle?: () => void;
  /** 우측 추가 액션 슬롯 (예: 운영진 "새로 추가") */
  actions?: ReactNode;
  /** 툴바 아래에 붙는 추가 필터 행 (태그 칩·구인영역·카테고리 칩 등) */
  children?: ReactNode;
}

/**
 * 아카이브 리스트 공용 툴바 (스프린트1 H4 — 리스트 UX 정합화).
 *
 * 동적 라이브러리(/archive/[type])와 가이드 리스트(연구방법·통계방법·기초용어)가
 * 동일한 조작 모델(검색·정렬·즐겨찾기만·추가 필터)을 공유하도록 추출한 프리젠테이션 컴포넌트.
 * 필터·정렬 상태는 각 페이지가 소유하고, 이 컴포넌트는 UI만 담당한다.
 */
export default function ArchiveListToolbar({
  query,
  onQueryChange,
  placeholder = "이름·요약·태그로 검색",
  resultCount,
  totalCount,
  sortMode,
  onSortChange,
  sortOptions,
  showFavoritesToggle = false,
  favoritesOnly = false,
  onFavoritesToggle,
  actions,
  children,
}: ArchiveListToolbarProps) {
  const trimmed = query.trim();
  const showCount = typeof totalCount === "number";
  const hasSort = !!sortOptions && sortOptions.length > 0 && !!onSortChange;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-9 pr-9"
            aria-label={placeholder}
          />
          {trimmed && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSort && (
            <select
              value={sortMode}
              onChange={(e) => onSortChange!(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-xs"
              aria-label="정렬 방식"
            >
              {sortOptions!.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {showFavoritesToggle && (
            <Button
              type="button"
              size="sm"
              variant={favoritesOnly ? "default" : "outline"}
              onClick={onFavoritesToggle}
              aria-pressed={favoritesOnly}
              className="h-9 gap-1 text-xs"
            >
              ★ 즐겨찾기만
            </Button>
          )}
          {actions}
        </div>
      </div>

      {showCount && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {trimmed || favoritesOnly ? (
            <>
              <span className="font-medium text-foreground">{resultCount ?? 0}</span>
              <span> / {totalCount} 항목</span>
            </>
          ) : (
            <>
              전체 <span className="font-medium text-foreground">{totalCount}</span> 항목
            </>
          )}
        </p>
      )}

      {children}
    </div>
  );
}
