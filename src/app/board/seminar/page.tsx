"use client";

import Link from "next/link";
import { BookOpen, ArrowRight, Presentation } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function SeminarBoardPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── 세미나 공간 연동 안내 배너 ── */}
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <Link
          href="/seminars"
          aria-label="세미나 공간으로 이동"
          className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-emerald-800 dark:from-emerald-950/30 dark:to-slate-950/40"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              aria-hidden="true"
            >
              <Presentation size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                발표 자료는 &quot;세미나 공간&quot;에서 관리됩니다
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                각 세미나별 자료실에서 발표 슬라이드를 업로드하고 다운로드할 수 있습니다.
              </p>
            </div>
          </div>
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="shrink-0 text-emerald-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-emerald-500"
          />
        </Link>
      </div>

      {/* ── 메인 게시판 ── */}
      <CategoryBoardPage
        category="seminar"
        title="세미나 자료"
        description="세미나 발표 자료와 후기를 공유합니다. 세미나 공간의 자료실과 함께 활용하세요."
        icon={
          <BookOpen
            size={24}
            aria-hidden="true"
            className="text-emerald-600 dark:text-emerald-400"
          />
        }
      />
    </div>
  );
}
