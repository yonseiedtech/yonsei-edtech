"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 구간(segment) 에러 폴백 (Phase 1) — 중첩 error.tsx 에서 재사용.
 * 전역 error.tsx 와 달리, 문제가 생긴 구간만 안내하고 나머지 사이트는 살아 있음을 전제.
 */
export default function SectionError({
  error,
  reset,
  sectionLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  sectionLabel: string;
}) {
  useEffect(() => {
    console.error(`[error:${sectionLabel}]`, error);
  }, [error, sectionLabel]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50 text-rose-400 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertTriangle size={26} strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="text-lg font-bold">{sectionLabel} 화면을 불러오지 못했어요</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        이 구간에서만 발생한 일시적 문제입니다. 다시 시도하거나 홈으로 이동해 주세요.
        작성 중이던 내용은 자동 저장 이력에서 복원할 수 있습니다.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset} size="sm">
          <RotateCcw size={14} className="mr-1.5" />
          다시 시도
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Home size={14} className="mr-1.5" />
          홈으로
        </Link>
      </div>
    </div>
  );
}
