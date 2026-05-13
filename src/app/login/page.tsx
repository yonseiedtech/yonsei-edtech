"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/features/auth/LoginForm";

function LoginContent() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Compact hero */}
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">로그인</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            연세교육공학회 계정으로 로그인하세요
          </p>
        </div>

        {/* LoginForm — auth 로직 완전 보존 */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        {/* 회원가입 진입 보조 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            회원가입 하기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
