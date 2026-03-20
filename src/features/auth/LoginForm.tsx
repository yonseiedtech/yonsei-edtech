"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./useAuth";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = (formData.get("username") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    try {
      const user = await login(username, password);
      if (user && !user.approved) {
        toast.error("관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
        return;
      }
      const returnUrl = sessionStorage.getItem("returnUrl") || "/dashboard";
      sessionStorage.removeItem("returnUrl");
      router.push(returnUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-white p-8 shadow-sm"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium">아이디</label>
        <Input
          type="text"
          name="username"
          placeholder="아이디를 입력하세요"
          autoComplete="username"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">비밀번호</label>
        <Input
          type="password"
          name="password"
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <LogIn size={16} className="mr-2" />
            로그인
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </p>

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p>회원가입 후 관리자 승인을 받아 로그인할 수 있습니다.</p>
        <p className="mt-0.5">이메일 형식으로 입력하거나, 아이디만 입력하면 @yonsei.ac.kr이 자동으로 추가됩니다.</p>
      </div>
    </form>
  );
}
