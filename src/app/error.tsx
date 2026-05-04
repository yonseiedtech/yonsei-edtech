"use client";

import { useEffect } from "react";

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">오류</h1>
      <p className="mt-4 text-xl font-medium text-foreground">
        문제가 발생했습니다
      </p>
      <p className="mt-2 text-muted-foreground">
        잠시 후 다시 시도해주세요.
      </p>

      {/* Sprint 70: 진단 정보 (접혀있음, 클릭 시 펼침)
          보안: stack은 개발 환경에서만 노출 (운영에서는 message + digest만 사용자/운영진에게 전달) */}
      <details className="mt-6 max-w-2xl rounded-lg border bg-muted/30 px-4 py-2 text-left text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium">
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
              <code className="rounded bg-background px-1 py-0.5">{error.digest}</code>
            </p>
          )}
          {error?.stack && process.env.NODE_ENV !== "production" && (
            <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-[10px] leading-relaxed">
              {error.stack}
            </pre>
          )}
        </div>
      </details>

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="inline-flex items-center rounded-lg border border-input px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
