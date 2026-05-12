"use client";

import Link from "next/link";
import { BookOpenCheck, ArrowRight, BookMarked } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function PaperReviewBoardPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── 논문 읽기 연동 안내 배너 ── */}
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <Link
          href="/mypage/research"
          aria-label="마이페이지 논문 읽기로 이동"
          className="group flex items-center justify-between rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-purple-800 dark:from-purple-950/30 dark:to-slate-950/40"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
              aria-hidden="true"
            >
              <BookMarked size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                리뷰는 &quot;내 논문 읽기&quot;와 연동됩니다
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                읽은 논문을 마이페이지에서 가져오거나, 다른 회원의 리뷰 논문을 내 분석 노트에 1-클릭으로 저장할 수 있습니다.
              </p>
            </div>
          </div>
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="shrink-0 text-purple-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-purple-500"
          />
        </Link>
      </div>

      {/* ── 메인 게시판 ── */}
      <CategoryBoardPage
        category="paper_review"
        title="교육공학 논문 리뷰"
        description="회원이 읽은 교육공학 논문의 리뷰·요약을 공유합니다. 본인의 '내 논문 읽기'에서 가져와 작성하거나, 다른 회원의 글에서 메타데이터를 내 논문 읽기에 저장할 수 있습니다."
        icon={
          <BookOpenCheck
            size={24}
            aria-hidden="true"
            className="text-purple-600 dark:text-purple-400"
          />
        }
      />
    </div>
  );
}
