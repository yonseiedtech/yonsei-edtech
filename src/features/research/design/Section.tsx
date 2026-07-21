"use client";

/**
 * 연구 설계 아코디언 섹션 래퍼 + 필드 라벨 + 모바일 감지 훅 (2026-07-13, M1)
 *
 * Section 은 상위(ResearchDesignEditor)가 open/onToggle 을 제어하는 controlled 아코디언.
 * 데스크톱은 전 섹션 전개, 모바일(sm 미만)은 현재(미완) 섹션만 펼침. (동작 불변, 구조만 개선)
 */

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 모바일(sm 미만, max-width:639px) 여부 — 아코디언 기본 접힘 판정용 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function Section({
  n,
  title,
  done,
  optional,
  defaultOpen = true,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  optional?: boolean;
  /** 최초 펼침 여부 — 데스크톱은 전개(true), 모바일은 현재 섹션만 true. 사용자 토글 후에는 로컬 상태 유지 */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  // defaultOpen 은 상위가 하이드레이션 완료 후 섹션을 마운트할 때 확정된 값.
  // 이후 펼침/접힘은 사용자 토글로만 변경(로컬 상태).
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {n}
          </span>
          <span className="text-sm font-semibold">{title}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              done
                ? "bg-success/10 text-success"
                : optional
                  ? "bg-muted text-muted-foreground"
                  : "bg-warning/10 text-warning",
            )}
          >
            {done ? "완성" : optional ? "선택" : "작성 전"}
          </span>
        </span>
        <ChevronRight
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && <div className="border-t px-5 py-4">{children}</div>}
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
