"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./useAuth";
import { useAuthStore } from "./auth-store";
import { authApi, clearTokens } from "@/lib/bkend";
import { LogIn, Clock, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  /** 모달용: 로그인 성공 시 페이지 이동 대신 호출됨. 회원가입 링크 노출도 제어 가능 */
  onSuccess?: () => void;
  hideSignupLink?: boolean;
  signupHref?: string;
}

const SAVED_USERNAME_KEY = "savedLoginUsername";
const REMEMBER_KEY = "rememberLoginUsername";

export default function LoginForm({ onSuccess, hideSignupLink, signupHref }: LoginFormProps = {}) {
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [rememberUsername, setRememberUsername] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REMEMBER_KEY) === "true";
  });
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedUsername = typeof window !== "undefined" ? localStorage.getItem(SAVED_USERNAME_KEY) || "" : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setPendingApproval(false);
    setRejected(false);

    const formData = new FormData(e.currentTarget);
    const username = (formData.get("username") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    try {
      if (rememberUsername) {
        localStorage.setItem(SAVED_USERNAME_KEY, username);
        localStorage.setItem(REMEMBER_KEY, "true");
      } else {
        localStorage.removeItem(SAVED_USERNAME_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }
      const user = await login(username, password);
      // A5: 반려(rejected) 회원은 승인 대기와 구분된 안내 표시
      if (user && user.rejected) {
        try { await authApi.logout(); } catch { /* ignore */ }
        clearTokens();
        useAuthStore.getState().logout();
        setRejected(true);
        return;
      }
      if (user && !user.approved) {
        // 비승인 사용자는 즉시 로그아웃 + 승인 대기 UI 표시
        try { await authApi.logout(); } catch { /* ignore */ }
        clearTokens();
        useAuthStore.getState().logout();
        setPendingApproval(true);
        setPendingEmail(user.email || "");
        return;
      }
      // 모달 모드: 콜백만 실행 (페이지 이동 없음)
      if (onSuccess) {
        onSuccess();
        return;
      }
      const nextParam = searchParams.get("next") || "";
      const stored = sessionStorage.getItem("returnUrl") || "";
      sessionStorage.removeItem("returnUrl");
      const candidate = nextParam || stored;
      const safe = candidate.startsWith("/") && !candidate.startsWith("//");
      // 명함/로그인/홈 경로는 로그인 후 대시보드로 이동
      const blocked = ["/login", "/", "/mypage/card"].includes(candidate);
      const returnUrl = safe && !blocked ? candidate : "/dashboard";
      router.push(returnUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // A5: 가입 반려(rejected) 상태 UI — 승인 대기와 구분된 안내 + 문의 경로
  if (rejected) {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <XCircle size={28} className="text-destructive" />
          </div>
          <h2 className="text-lg font-bold">가입 신청이 반려되었습니다</h2>
          <p className="text-center text-sm text-muted-foreground">
            제출하신 가입 신청이 승인되지 않았습니다. 자세한 사유 확인이나 재신청은 아래 경로로 문의해 주세요.
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-foreground">
            문의:{" "}
            <a
              href="mailto:yonsei.edtech@gmail.com"
              className="font-medium text-primary hover:underline"
            >
              yonsei.edtech@gmail.com
            </a>
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={() => setRejected(false)}>
          다른 계정으로 로그인
        </Button>
      </div>
    );
  }

  // 승인 대기 상태 UI
  if (pendingApproval) {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
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
                  "이 계정"
                )}
                으로 다시 로그인해 이용하실 수 있습니다. 승인 여부는 로그인 시 확인됩니다.
              </p>
            </div>
            <p className="text-xs text-amber-600">
              일반적으로 1~2 영업일 이내에 승인이 완료됩니다.
            </p>
            {/* RT-3(2026-07-04): 승인 대기 중에도 가치를 맛보게 — 공개 콘텐츠 링크 */}
            <div className="mt-2 border-t border-amber-200 pt-2">
              <p className="mb-1.5 text-xs font-medium text-amber-800">기다리는 동안 둘러보세요</p>
              <div className="flex flex-wrap gap-1.5">
                <Link href="/about" className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100">학회 소개</Link>
                <Link href="/card-news" className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100">카드뉴스</Link>
                <Link href="/journal" className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100">연구지</Link>
              </div>
            </div>
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
      className="space-y-4 rounded-2xl border bg-card p-8 shadow-sm"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium">아이디(학번)</label>
        <Input
          type="text"
          name="username"
          placeholder="아이디(학번)을 입력하세요"
          autoComplete="username"
          defaultValue={savedUsername}
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

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rememberUsername}
          onChange={(e) => setRememberUsername(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        아이디 저장
      </label>

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

      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
        {!hideSignupLink && (
          <>
            <Link href={signupHref ?? "/signup"} className="font-medium text-primary hover:underline">
              회원가입
            </Link>
            <span className="text-muted-foreground/40">·</span>
          </>
        )}
        <Link href="/forgot-password" className="hover:text-primary hover:underline">
          비밀번호 찾기
        </Link>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p>연세 이메일(@yonsei.ac.kr)로 가입하면 대부분 즉시 이용할 수 있으며, 일부 신청만 운영진 확인 후 승인됩니다.</p>
        <p className="mt-0.5">이메일 형식으로 입력하거나, 아이디만 입력하면 @yonsei.ac.kr이 자동으로 추가됩니다.</p>
      </div>
    </form>
  );
}
