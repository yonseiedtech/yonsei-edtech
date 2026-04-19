"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <WifiOff size={28} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">오프라인 상태입니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          인터넷 연결을 확인해주세요. 일부 페이지는 캐시에서 불러올 수 있습니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            홈으로
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
