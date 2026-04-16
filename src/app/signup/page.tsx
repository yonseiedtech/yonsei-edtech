"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import SignupForm from "@/features/auth/SignupForm";
import ConsentSteps from "@/components/auth/ConsentSteps";
import type { UserConsents } from "@/lib/legal";

type Step = "consent" | "form" | "done";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultName = searchParams.get("name") || undefined;
  const defaultStudentId = searchParams.get("studentId") || undefined;
  const nextParam = searchParams.get("next") || "";
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const [step, setStep] = useState<Step>("consent");
  const [consents, setConsents] = useState<UserConsents | undefined>(undefined);

  if (step === "done") {
    const loginHref = safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login";
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
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "consent"
              ? "먼저 약관을 확인하고 동의해주세요"
              : "연세교육공학회 회원으로 가입하세요"}
          </p>
        </div>

        {step === "consent" && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <ConsentSteps
              mode="signup"
              onComplete={(c) => {
                setConsents(c);
                setStep("form");
              }}
              onCancel={() => router.push("/")}
              cancelLabel="취소"
            />
          </div>
        )}

        {step === "form" && (
          <SignupForm
            initialConsents={consents}
            onSuccess={() => setStep("done")}
            defaultName={defaultName}
            defaultStudentId={defaultStudentId}
          />
        )}
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
