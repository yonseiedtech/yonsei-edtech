"use client";

/**
 * ArchiveMobileToc — 아카이브 상세 페이지 모바일(<lg) 목차 (스프린트1 M6).
 *
 * 데스크톱(lg+)에서는 `ArchiveStickyToc` 가 우측 sidebar 로 섹션 점프를 제공하지만,
 * 모바일에서는 sticky sidebar 가 숨겨져 섹션 점프 수단이 없다. 이 컴포넌트는 동일한
 * `tocSections` 를 재사용해 가로 스크롤 앵커칩으로 섹션 점프를 제공한다 (lg 미만에서만 노출).
 *
 * 부모는 본문에 동일한 id + `scroll-mt-24` 섹션을 둬야 한다. 존재하지 않는 id 는 클릭 시 무시.
 */

import { cn } from "@/lib/utils";
import type { ArchiveTocSection } from "./ArchiveStickyToc";

export interface ArchiveMobileTocProps {
  sections: ArchiveTocSection[];
  className?: string;
}

export default function ArchiveMobileToc({ sections, className }: ArchiveMobileTocProps) {
  // 섹션이 하나뿐(개요만)이면 점프 가치가 없어 렌더하지 않는다.
  if (sections.length <= 1) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="페이지 목차"
      className={cn(
        "lg:hidden mb-4 rounded-lg border bg-card/60 px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          목차
        </span>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => handleClick(e, s.id)}
            className="shrink-0 whitespace-nowrap rounded-full border border-transparent bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
