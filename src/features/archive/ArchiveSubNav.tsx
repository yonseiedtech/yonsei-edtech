"use client";

/**
 * ArchiveSubNav — 랜딩 스티키 섹션 인덱스 (H1 과밀 완화)
 *
 * 15+ 블록을 4~5개 섹션 그룹으로 재편하고, 상단에 가로 스크롤 앵커 칩을 두어
 * 원하는 섹션으로 1클릭 점프할 수 있게 한다. 스크롤 위치에 따라 활성 칩을 강조한다.
 * 전역 헤더(h-16, sticky top-0) 아래에 붙도록 top-16 으로 고정.
 */

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArchiveNavSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface ArchiveSubNavProps {
  sections: ArchiveNavSection[];
}

export default function ArchiveSubNav({ sections }: ArchiveSubNavProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  // 스크롤 위치 기반 활성 섹션 추적 — IntersectionObserver 로 현재 보이는 섹션을 강조.
  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [sections]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  };

  return (
    <nav
      aria-label="아카이브 섹션 바로가기"
      className="sticky top-16 z-30 -mx-4 mt-4 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur-lg"
    >
      <ul className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => handleJump(s.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
