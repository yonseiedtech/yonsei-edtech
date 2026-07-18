"use client";

/**
 * ArchiveSectionHeader — 랜딩 섹션 그룹 헤더 (L12 시각 위계 통일)
 *
 * 기존 랜딩은 그룹1=배경틴트, 그룹2=border-bottom 로 헤더 스타일이 갈려 스캔성이 낮았다.
 * 모든 섹션 그룹이 "아이콘 칩 + 라벨 + 설명 + 하단 구분선" 단일 토큰을 공유하도록 통일한다.
 */

import type { LucideIcon } from "lucide-react";

interface ArchiveSectionHeaderProps {
  /** scroll-mt 앵커용 id (스티키 서브내비 점프 대상) */
  id: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

export default function ArchiveSectionHeader({
  id,
  icon: Icon,
  label,
  description,
}: ArchiveSectionHeaderProps) {
  return (
    <div
      id={id}
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-3 scroll-mt-28"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h2 className="text-base font-semibold tracking-tight">{label}</h2>
      {description && (
        <p className="w-full text-xs text-muted-foreground sm:w-auto">
          {description}
        </p>
      )}
    </div>
  );
}
