"use client";

import Link from "next/link";
import { WifiOff, Home, RotateCcw, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main
      className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16"
      aria-labelledby="offline-heading"
    >
      {/* 진입 컨테이너 */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md">
        {/* 아이콘 영역 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50 text-amber-400 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <WifiOff size={36} strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        {/* 텍스트 위계 */}
        <div className="mb-6 text-center">
          <h1
            id="offline-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            인터넷 연결을 확인해 주세요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            현재 오프라인 상태입니다.
            <br className="hidden sm:block" />
            연결이 복구되면 자동으로 이어서 이용할 수 있습니다.
          </p>
        </div>

        {/* 캐시 안내 */}
        <InlineNotification
          kind="info"
          title="일부 페이지는 캐시에서 이용 가능합니다"
          description="이전에 방문한 페이지는 오프라인에서도 불러올 수 있습니다."
          className="mb-6"
        />

        {/* CTA 버튼 그룹 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={() => window.location.reload()}
            size="lg"
            className="w-full justify-center gap-1.5 sm:w-auto"
            aria-label="페이지 새로고침"
          >
            <RotateCcw size={16} aria-hidden />
            다시 시도
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full justify-center gap-1.5 sm:w-auto"
            )}
          >
            <Home size={16} aria-hidden />
            홈으로
          </Link>
        </div>

        {/* 문의 링크 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          연결 문제가 지속된다면{" "}
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
