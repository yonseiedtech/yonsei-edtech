"use client";

/**
 * ArchiveStickyToc — 아카이브 상세 페이지 sticky 목차.
 *
 * 데스크톱(lg+): 우측 sticky sidebar (top-24, max-w-[200px]).
 * 모바일: 숨김 (lg 미만에서는 노출하지 않음).
 *
 * 동작:
 * - 섹션 클릭 → 해당 id 로 scrollIntoView({ behavior: "smooth", block: "start" }).
 * - IntersectionObserver 로 현재 보이는 섹션을 active 표시 — text-foreground + 좌측 활성 바.
 *
 * 부모는 본문에 동일한 id 의 섹션을 둬야 한다. 존재하지 않는 id 는 무시한다.
 *
 * IntersectionObserver 콜백에서 setState 를 호출하는 것은 React 의 `set-state-in-effect`
 * 안티패턴이 아니다 — effect 동기 호출이 아닌 비동기 브라우저 콜백이기 때문이다.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ArchiveTocSection {
  id: string;
  label: string;
}

export interface ArchiveStickyTocProps {
  sections: ArchiveTocSection[];
  /** 추가 클래스. 기본은 hidden lg:block sticky sidebar */
  className?: string;
}

export default function ArchiveStickyToc({ sections, className }: ArchiveStickyTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;
    if (typeof window === "undefined") return;

    // 화면 상단 25% 지점을 기준으로 active 판정 — 상세 페이지의 sticky 헤더 영역 고려
    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 위쪽에서 보이는 entry 를 active 로 — entries 는 호출시점 변경된 항목만 옴
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const firstId = visible[0].target.id;
          setActiveId(firstId);
        }
      },
      {
        rootMargin: "-25% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    observerRef.current = observer;

    const observed: Element[] = [];
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      for (const el of observed) {
        observer.unobserve(el);
      }
      observer.disconnect();
      observerRef.current = null;
    };
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // 클릭 직후 active 를 즉시 반영 — observer 가 따라잡기 전 잠깐의 stale 방지
      setActiveId(id);
    }
  };

  if (sections.length === 0) return null;

  return (
    <aside
      className={cn(
        "hidden lg:block",
        // sticky 자체는 부모 grid 셀 안에서 동작
        className,
      )}
      aria-label="페이지 목차"
    >
      <nav className="sticky top-24 max-w-[200px]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          목차
        </p>
        <ul className="space-y-0.5 border-l border-border">
          {sections.map((s) => {
            const isActive = activeId === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => handleClick(e, s.id)}
                  className={cn(
                    "block border-l-2 px-3 py-1.5 text-xs leading-relaxed transition-colors",
                    isActive
                      ? "-ml-px border-primary text-foreground font-medium"
                      : "-ml-px border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
