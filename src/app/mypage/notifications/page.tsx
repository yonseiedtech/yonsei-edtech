import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ArrowLeft, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "알림센터",
};

/**
 * Phase 1 stub — 알림 목록 페이지 경로 예약.
 * Phase 2에서 실제 목록 UI로 교체 예정.
 * (docs/proposals/notification-center-phase.md 참고)
 */
export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label="마이페이지로 돌아가기"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">알림센터</h1>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bell size={32} />
        </div>
        <div>
          <p className="text-lg font-semibold">알림센터 준비 중</p>
          <p className="mt-1 text-sm text-muted-foreground">
            모든 알림을 한 곳에서 확인하는 통합 알림 목록 페이지입니다.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <Clock size={12} />
          Phase 2 구현 예정
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          현재는 헤더의 Bell 아이콘 드롭다운에서 최근 알림 20건을 확인하고
          읽음 처리할 수 있습니다.
        </p>
        <Link
          href="/mypage"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          마이페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
