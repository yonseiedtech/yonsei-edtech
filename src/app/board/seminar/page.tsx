"use client";

import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function SeminarBoardPage() {
  return (
    <div>
      {/* 세미나 공간 안내 배너 */}
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <Link
          href="/seminars"
          className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">
                세미나 자료는 &quot;세미나 공간&quot;에서 관리됩니다
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                각 세미나별 자료실에서 발표 자료를 업로드하고 다운로드할 수 있습니다.
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-primary" />
        </Link>
      </div>

      <CategoryBoardPage
        category="seminar"
        title="세미나 자료"
        description="세미나 발표 자료와 관련 자료를 공유합니다."
        icon={<BookOpen size={24} className="text-primary" />}
      />
    </div>
  );
}
