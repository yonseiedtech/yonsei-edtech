"use client";

/**
 * Web Push 권한 요청 prompt — Sprint 53 / 67(quickwins)
 *
 * 표시 조건:
 *  - 로그인 상태 + 푸시 지원 브라우저 + VAPID key 설정됨 + 권한 default + 14일 내 dismiss 안 함
 *  - dashboard-quickwins: TodayTodosPopup 가 열려 있는 동안 노출 보류 (알림 동시 충돌 방지)
 *
 * 사용자 액션:
 *  - "켜기" → enablePushForCurrentUser → 토큰 등록
 *  - "나중에" → 14일 dismiss
 */

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  enablePushForCurrentUser,
  isPermissionDeclined,
  isPushSupported,
  markPermissionDeclined,
  getPermissionState,
} from "@/lib/push";
import {
  TODAY_POPUP_ACTIVE_KEY,
  TODAY_POPUP_ACTIVE_EVENT,
} from "@/features/dashboard/popup-coordination";
import { SEMANTIC } from "@/lib/design-tokens";

const DISMISS_KEY = "push.promptDismissedUntil";
const DISMISS_DAYS = 14;

function isDismissedActive(): boolean {
  if (typeof window === "undefined") return false;
  const v = window.localStorage.getItem(DISMISS_KEY);
  if (!v) return false;
  const until = Number(v);
  return Number.isFinite(until) && until > Date.now();
}

function setDismissedFor(days: number): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(DISMISS_KEY, String(until));
  markPermissionDeclined();
}

function isTodayPopupActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(TODAY_POPUP_ACTIVE_KEY) === "1";
}

export default function PushPermissionPrompt() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [todayPopupActive, setTodayPopupActive] = useState<boolean>(() =>
    isTodayPopupActive(),
  );

  useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const supported = await isPushSupported();
      if (cancelled) return;
      if (!supported) {
        setShow(false);
        return;
      }
      const perm = getPermissionState();
      if (perm !== "default") {
        setShow(false);
        return;
      }
      if (isDismissedActive() || isPermissionDeclined()) {
        setShow(false);
        return;
      }
      setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // dashboard-quickwins: TodayTodosPopup 활성 상태 추적 — 두 알림 동시 노출 방지
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ active: boolean }>).detail;
      setTodayPopupActive(!!detail?.active);
    };
    window.addEventListener(TODAY_POPUP_ACTIVE_EVENT, handler);
    return () => {
      window.removeEventListener(TODAY_POPUP_ACTIVE_EVENT, handler);
    };
  }, []);

  if (!show || !user || todayPopupActive) return null;

  async function enable() {
    setBusy(true);
    try {
      const result = await enablePushForCurrentUser();
      if (result.ok) {
        toast.success("푸시 알림이 켜졌습니다.");
        setShow(false);
      } else if (result.reason === "denied") {
        toast.error("브라우저에서 알림 권한을 허용해주세요.");
        setDismissedFor(DISMISS_DAYS);
        setShow(false);
      } else {
        toast.error(`푸시 활성화 실패: ${result.detail ?? result.reason}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setDismissedFor(DISMISS_DAYS);
    setShow(false);
  }

  const tone = SEMANTIC.info;

  return (
    <div className="mx-auto mt-3 max-w-6xl px-4">
      <div
        className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center ${tone.border} ${tone.bg}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.chipBg} ${tone.chipText}`}
          aria-hidden="true"
        >
          <Bell size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone.text}`}>
            수업 30분 전·새 댓글 푸시 알림 받기
          </p>
          <p className={`mt-0.5 text-xs ${tone.textMuted}`}>
            브라우저/홈 화면에 추가한 앱에서 핵심 알림만 골라 보내드려요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={enable}
            disabled={busy}
            className="h-9 px-3 text-xs sm:text-sm"
            aria-label="푸시 알림 켜기"
          >
            {busy ? "활성화…" : "켜기"}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className={`inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 ${tone.accent}`}
            aria-label="14일 동안 다시 보지 않기"
          >
            <X size={14} />
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
