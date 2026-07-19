"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import "./globals.css";

/**
 * global-error.tsx — 루트 레이아웃 자체가 죽는 경우 방어.
 * Next.js 요구: <html>/<body> 직접 렌더. globals.css 재임포트로 토큰 복원.
 * 에러 상세는 console.error만 노출 (화면 표출 금지).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error] uncaught error:", error);
    if (error?.stack) console.error("[global-error] stack:", error.stack);
  }, [error]);

  return (
    <html lang="ko">
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        <main
          className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
          aria-labelledby="global-error-heading"
        >
          <div className="w-full max-w-md text-center">
            {/* 아이콘 */}
            <div className="mb-8 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTriangle size={36} strokeWidth={1.5} aria-hidden />
              </div>
            </div>

            {/* 텍스트 */}
            <h1
              id="global-error-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              서비스에 접근할 수 없어요
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              예상치 못한 오류로 페이지가 중단되었습니다.
              <br className="hidden sm:block" />
              잠시 후 다시 시도하거나 홈으로 이동해 주세요.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw size={16} aria-hidden />
                다시 시도
              </button>
              {/* 하드 네비게이션 — 앱 상태가 완전히 죽은 경우 client 라우팅 불가 */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home size={16} aria-hidden />
                홈으로
              </a>
            </div>

            {/* 문의 */}
            <p className="mt-6 text-xs text-muted-foreground">
              문제가 계속된다면{" "}
              <a
                href="/contact"
                className="underline underline-offset-2 hover:text-foreground"
              >
                운영진에게 문의
              </a>
              해 주세요.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
