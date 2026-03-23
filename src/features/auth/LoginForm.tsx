"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./useAuth";
import { useAuthStore } from "./auth-store";
import { authApi, clearTokens } from "@/lib/bkend";
import { LogIn, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setPendingApproval(false);

    const formData = new FormData(e.currentTarget);
    const username = (formData.get("username") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    try {
      const user = await login(username, password);
      if (user && !user.approved) {
        // 비승인 사용자는 즉시 로그아웃 + 승인 대기 UI 표시
        try { await authApi.logout(); } catch { /* ignore */ }
        clearTokens();
        useAuthStore.getState().logout();
        setPendingApproval(true);
        setPendingEmail(user.email || "");
        return;
      }
      const raw = sessionStorage.getItem("returnUrl") || "/dashboard";
      sessionStorage.removeItem("returnUrl");
      const returnUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
      router.push(returnUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 승인 대기 상태 UI
  if (pendingApproval) {
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Clock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold">승인 대기 중</h2>
          <p className="text-center text-sm text-muted-foreground">
            회원 가입이 완료되었으며, 현재 관리자 승인을 기다리고 있습니다.
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 p-4">
          <div className="space-y-2 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <p>
                승인이 완료되면{" "}
                {pendingEmail ? (
                  <span className="font-medium">{pendingEmail}</span>
                ) : (
                  "등록하신 이메일"
                )}
                로 안내 드리겠습니다.
              </p>
            </div>
            <p className="text-xs text-amber-600">
              일반적으로 1~2일 이내에 승인이 완료됩니다.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setPendingApproval(false)}
        >
          다시 로그인 시도
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          문의: yonsei.edtech@gmail.com
        </p>
      </div>
    );
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
