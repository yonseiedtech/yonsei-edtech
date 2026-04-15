"use client";

import { Suspense } from "react";
import Image from "next/image";
import LoginForm from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/yonsei-emblem.svg"
            alt="연세대학교 엠블럼"
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            연세교육공학회 계정으로 로그인하세요
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
