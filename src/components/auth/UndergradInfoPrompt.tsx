"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { GraduationCap, X } from "lucide-react";
import type { User } from "@/types";

const SKIP_PATHS = ["/login", "/signup", "/reset-password", "/change-password"];
const DISMISS_KEY = "undergrad-info-prompt-dismissed-session";

function needsUndergradInfo(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "sysadmin" || user.role === "admin") return false;
  if (user.undergraduateUniversity && user.undergraduateUniversity.trim()) return false;
  return true;
}

export default function UndergradInfoPrompt() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!initialized || !user) {
      setOpen(false);
      return;
    }
    if (pathname && SKIP_PATHS.some((p) => pathname.startsWith(p))) {
      setOpen(false);
      return;
    }
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1") {
      setOpen(false);
      return;
    }
    setOpen(needsUndergradInfo(user));
  }, [user, initialized, pathname]);

  function dismiss() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
      // 다른 팝업(예: 오늘의 할 일)이 보류 중일 수 있어 재평가 신호를 보낸다.
      window.dispatchEvent(new Event("undergrad-info-prompt-dismissed"));
    }
    setOpen(false);
  }

  function goEdit() {
    dismiss();
    router.push("/mypage?tab=profile#undergraduate");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">학부 정보 입력 안내</h2>
              <p className="text-xs text-muted-foreground">데이터 기반 학술행사 기획·운영을 위한 안내</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          데이터 기반 학술행사 기획·운영을 위해 <strong>학부 정보</strong>도 입력 부탁드립니다.
          잠깐이면 됩니다.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          마이페이지 → 프로필 탭에서 대학교 / 단과대 / 전공을 입력해주세요.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={dismiss}>
            나중에
          </Button>
          <Button type="button" size="sm" onClick={goEdit}>
            지금 입력하기
          </Button>
        </div>
      </div>
    </div>
  );
}
