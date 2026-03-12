"use client";

import LoginForm from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            YE
          </div>
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            연세교육공학회 계정으로 로그인하세요
          </p>
        </div>

        <LoginForm />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          데모: admin@yonsei.ac.kr / admin123 또는 아무 이메일 / test123
        </p>
      </div>
    </div>
  );
}
