"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
// SSG prerender 시 client-only hooks(useReducedMotion 등) 평가 회피
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import InlineNotification from "@/components/ui/inline-notification";
import { ArrowRight, CheckCircle, Compass, Loader2, Sparkles } from "lucide-react";

// SignupMultiStep은 framer-motion useReducedMotion을 사용하므로 SSR 비활성 (Vercel build 호환)
const SignupMultiStep = dynamic(
  () => import("@/features/auth/SignupMultiStep"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border bg-card p-8 text-muted-foreground">
        <Loader2 size={20} className="mr-2 animate-spin" />
        회원가입 폼 불러오는 중…
      </div>
    ),
  },
);

function SignupContent() {
  const searchParams = useSearchParams();
  const defaultName = searchParams.get("name") || undefined;
  const defaultStudentId = searchParams.get("studentId") || undefined;
  const nextParam = searchParams.get("next") || "";
  const safeNext =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const [done, setDone] = useState<null | { autoApproved: boolean }>(null);

  if (done) {
    const loginHref = safeNext
      ? `/login?next=${encodeURIComponent(safeNext)}`
      : "/login";

    // Sprint 67-AR (온보딩 MVP): 자동승인 시 환영 + 디딤판 진입 안내
    if (done.autoApproved) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-3xl border bg-card p-8 text-center shadow-lg sm:p-10">
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-sky-400/15 text-primary">
                <Sparkles size={36} className="animate-pulse" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                  <CheckCircle size={14} />
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                환영합니다!
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                연세교육공학회 회원으로 가입이 완료되었습니다.
                <br />
                로그인 후 본인 학기에 맞는 가이드를 만나보세요.
              </p>

              <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-left">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Compass size={12} />
                  다음 단계
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                  로그인하면 <strong>인지디딤판</strong>에서 학기별 로드맵·재학생 가이드·학술대회 대비 자료를 자동으로 안내해 드립니다.
                </p>
              </div>

              <Link href={loginHref} className="block">
                <Button className="mt-6 w-full gap-1.5" size="lg">
                  지금 로그인하기
                  <ArrowRight size={16} />
                </Button>
              </Link>

              {safeNext && (
                <p className="mt-3 text-xs text-muted-foreground">
                  로그인 후 원래 보던 페이지로 이동됩니다.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 수동 승인 대기 흐름 (기존 유지)
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-3xl border bg-card p-8 text-center shadow-lg sm:p-10">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300">
              <CheckCircle size={36} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              가입 신청 완료
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              관리자 승인 후 로그인할 수 있습니다.
              <br />
              승인까지 1~2일 소요될 수 있습니다.
            </p>

            <div className="mt-6 rounded-2xl border-2 border-dashed border-amber-300/50 bg-amber-50/60 p-4 text-left dark:border-amber-800/40 dark:bg-amber-950/20">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Compass size={12} />
                승인 안내
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                운영진이 가입 정보를 확인 후 승인합니다. 승인 완료 시 로그인이 가능해집니다.
              </p>
            </div>

            {safeNext && (
              <p className="mt-4 text-xs text-muted-foreground">
                승인 완료 후 로그인하면 원래 보던 페이지로 이동됩니다.
              </p>
            )}
            <Link href={loginHref} className="block">
              <Button className="mt-6 w-full gap-1.5" size="lg" variant="outline">
                로그인 페이지로
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Compact hero — login 페이지와 동일 톤 */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-sm">
            <Image
              src="/yonsei-emblem.svg"
              alt="연세대학교 엠블럼"
              width={40}
              height={40}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            회원가입
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            연세교육공학회 회원으로 함께 만들어갑니다
          </p>
        </div>

        {/* yonsei.ac.kr 자동승인 안내 — 순수 시각 힌트, 로직 무관 */}
        <div className="mb-6">
          <InlineNotification
            kind="info"
            title="yonsei.ac.kr 이메일은 즉시 승인됩니다"
            description="연세대학교 이메일 도메인은 가입 즉시 자동 승인되어 바로 로그인할 수 있습니다."
          />
        </div>

        <SignupMultiStep
          onSuccess={(autoApproved) => setDone({ autoApproved })}
          defaultName={defaultName}
          defaultStudentId={defaultStudentId}
        />

        {/* 로그인 진입 보조 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인하기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}
