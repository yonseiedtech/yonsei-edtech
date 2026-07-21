"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArchiveFavoriteStarProps {
  isFav: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * 리스트 카드 인라인 즐겨찾기 별 토글 (스프린트1 H4).
 *
 * 전체가 링크인 카드 내부에 놓여도 상세 이동을 가로채지 않도록 클릭 시
 * preventDefault + stopPropagation 한다. 즐겨찾기 상태·API 호출은 부모가 소유.
 */
export default function ArchiveFavoriteStar({
  isFav,
  onToggle,
  className,
}: ArchiveFavoriteStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isFav ? "관심 해제" : "관심 저장"}
      aria-pressed={isFav}
      className={cn(
        "rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        isFav
          ? "text-warning hover:bg-warning/5"
          : "text-muted-foreground hover:bg-muted hover:text-warning",
        className,
      )}
    >
      <Star className={cn("h-4 w-4", isFav && "fill-current")} />
    </button>
  );
}
