import Link from "next/link";
import { MapPin, Home, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main
      className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16"
      aria-labelledby="not-found-heading"
    >
      {/* 진입 컨테이너 — tw-animate-css animate-in */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md">
        {/* 아이콘 영역 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground shadow-sm">
            <MapPin size={36} strokeWidth={1.5} aria-hidden />
          </div>
          {/* 상태 숫자 — 학회 디자인 시스템 h1 hero scale */}
          <p
            className="mt-5 text-[5rem] font-bold leading-none tracking-tight text-primary/20 select-none"
            aria-hidden
          >
            404
          </p>
        </div>

        {/* 텍스트 위계 */}
        <div className="mb-6 text-center">
          <h1
            id="not-found-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            페이지를 찾을 수 없어요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            요청하신 주소가 존재하지 않거나 이동·삭제되었습니다.
            <br className="hidden sm:block" />
            URL을 다시 확인하거나 아래 버튼으로 이동해 주세요.
          </p>
        </div>

        {/* 안내 알림 */}
        <InlineNotification
          kind="info"
          title="잘못된 주소일 수 있어요"
          description="링크를 직접 입력하셨다면 오타가 없는지 확인해 주세요."
          className="mb-6"
        />

        {/* CTA 버튼 그룹 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center gap-1.5 sm:w-auto"
            )}
          >
            <Home size={16} aria-hidden />
            홈으로 돌아가기
          </Link>
          <Link
            href="/board"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full justify-center sm:w-auto"
            )}
          >
            게시판 보기
          </Link>
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
