"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

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
  const [done, setDone] = useState(false);

  if (done) {
    const loginHref = safeNext
      ? `/login?next=${encodeURIComponent(safeNext)}`
      : "/login";
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold">가입 신청 완료</h1>
          <p className="mt-3 text-muted-foreground">
            관리자 승인 후 로그인할 수 있습니다.
            <br />
            승인까지 1~2일 소요될 수 있습니다.
          </p>
          {safeNext && (
            <p className="mt-3 text-xs text-muted-foreground">
              승인 완료 후 로그인하면 원래 보던 페이지로 이동됩니다.
            </p>
          )}
          <Link href={loginHref}>
            <Button className="mt-6">로그인 페이지로</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            연세교육공학회 회원으로 가입하세요
          </p>
        </div>

        <SignupMultiStep
          onSuccess={() => setDone(true)}
          defaultName={defaultName}
          defaultStudentId={defaultStudentId}
        />
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
