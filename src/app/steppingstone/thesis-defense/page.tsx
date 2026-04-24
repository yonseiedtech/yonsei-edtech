"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquareQuote, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import DefensePracticeListView from "@/features/defense/DefensePracticeListView";

export default function PublicThesisDefensePage() {
  const { user, isLoading } = useAuthStore();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/steppingstone"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} /> 인지디딤판
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          <MessageSquareQuote size={26} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">논문 심사 연습</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            예상 질문과 모범 답변을 미리 정리한 뒤, 마이크로 답변을 녹음·전사하여 모범 답변과
            비교 채점합니다. 따라 읽기 모드로 발표문을 문장·문단 단위로 연습할 수도 있습니다.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>심사 답변 모드: 키워드 중심 유사도 채점 + 학자명 인식 보강</li>
            <li>따라 읽기 모드: 난이도(쉬움/보통/어려움) + 1문장/문단 단위 선택</li>
            <li>한국어/영어 음성 인식 지원, 모든 기록은 본인 계정에 저장됩니다</li>
          </ul>
        </div>
      </header>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : !user ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <LogIn size={28} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            로그인 후 본인의 연습 세트를 만들고 음성 채점을 시작할 수 있습니다.
          </p>
          <Link href="/login?redirect=/steppingstone/thesis-defense" className="mt-4 inline-block">
            <Button>
              <LogIn size={14} className="mr-1" /> 로그인하고 시작하기
            </Button>
          </Link>
        </div>
      ) : (
        <DefensePracticeListView
          variant="public"
          runnerHrefPrefix="/steppingstone/thesis-defense"
        />
      )}
    </div>
  );
}
