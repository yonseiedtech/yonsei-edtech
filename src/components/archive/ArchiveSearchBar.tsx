"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ArchiveSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** 검색 후 노출되는 항목 수 (검색 활성 시에만 표시) */
  resultCount?: number;
  /** 전체 항목 수 (항상 표시) */
  totalCount?: number;
}

/**
 * 아카이브 타입별 랜딩 페이지 공용 검색바.
 * Search 아이콘 + Input + (검색어 있으면) ✕ 클리어 + "N/M 항목" 카운트.
 *
 * 데스크톱: 한 줄, max-w-md 좌측 정렬
 * 모바일: full-width, 카운트는 입력 우측에 inline (sm:ml-3)
 */
export default function ArchiveSearchBar({
  value,
  onChange,
  placeholder = "이름·요약·태그로 검색",
  resultCount,
  totalCount,
}: ArchiveSearchBarProps) {
  const trimmed = value.trim();
  const showCount = typeof totalCount === "number";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative max-w-md flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-9"
          aria-label={placeholder}
        />
        {trimmed && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showCount && (
        <p className="text-xs text-muted-foreground sm:ml-3">
          {trimmed && typeof resultCount === "number" ? (
            <>
              <span className="font-medium text-foreground">{resultCount}</span>
              <span> / {totalCount} 항목</span>
            </>
          ) : (
            <>
              전체 <span className="font-medium text-foreground">{totalCount}</span> 항목
            </>
          )}
        </p>
      )}
    </div>
  );
}
