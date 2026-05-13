"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw, Mail } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Sprint 70 디버깅: 운영 중 발생하는 클라이언트 에러를 콘솔에 노출
  useEffect(() => {
    console.error("[app/error.tsx] uncaught error:", error);
    if (error?.stack) console.error("[app/error.tsx] stack:", error.stack);
  }, [error]);

  return (
    <main
      className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16"
      aria-labelledby="error-heading"
    >
      {/* 진입 컨테이너 */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md">
        {/* 아이콘 영역 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50 text-rose-400 shadow-sm dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle size={36} strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        {/* 텍스트 위계 */}
        <div className="mb-6 text-center">
          <h1
            id="error-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            일시적으로 불러올 수 없어요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            예상치 못한 문제가 발생했습니다.
            <br className="hidden sm:block" />
            잠시 후 다시 시도하거나 페이지를 새로고침해 주세요.
          </p>
        </div>

        {/* 오류 상세 — Sprint 70 진단 정보 보존 */}
        <details className="mb-6 rounded-xl border bg-muted/30 px-4 py-3 text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none font-semibold text-foreground/80 hover:text-foreground">
            오류 상세 (운영진에게 전달용)
          </summary>
          <div className="mt-2 space-y-1.5">
            {error?.message && (
              <p>
                <span className="font-semibold text-foreground">message: </span>
                <span className="break-all">{error.message}</span>
              </p>
            )}
            {error?.digest && (
              <p>
                <span className="font-semibold text-foreground">digest: </span>
                <code className="rounded bg-background px-1 py-0.5 font-mono">
                  {error.digest}
                </code>
              </p>
            )}
            {error?.stack && process.env.NODE_ENV !== "production" && (
              <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-[10px] leading-relaxed">
                {error.stack}
              </pre>
            )}
          </div>
        </details>

        {/* 상태 안내 */}
        <InlineNotification
          kind="warning"
          title="사용자의 잘못이 아닙니다"
          description="서버 또는 네트워크에 일시적인 문제가 발생했을 수 있습니다."
          className="mb-6"
        />

        {/* CTA 버튼 그룹 — reset 기능 보존 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            size="lg"
            className="w-full justify-center gap-1.5 sm:w-auto"
            aria-label="이전 동작 다시 시도"
          >
            <RotateCcw size={16} aria-hidden />
            다시 시도
          </Button>
          <a
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full justify-center gap-1.5 sm:w-auto"
            )}
          >
            <Home size={16} aria-hidden />
            홈으로
          </a>
        </div>

        {/* 문의 링크 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          문제가 계속된다면{" "}
          <Link
            href="/about/contact"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail size={11} aria-hidden />
            운영진에게 문의
          </Link>
          해 주세요.
        </p>
      </div>
    </main>
  );
}
