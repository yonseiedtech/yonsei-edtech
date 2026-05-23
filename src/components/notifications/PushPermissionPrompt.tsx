"use client";

/**
 * PushPermissionPrompt — Phase 4 (C)
 *
 * 동작:
 *  1. 브라우저 Push 지원 여부 + Notification.permission 확인
 *  2. 권한이 "default"(미결정) + 사용자가 아직 dismiss 안 한 경우에만 배너를 노출
 *  3. "허용" → enablePushForCurrentUser() 호출
 *  4. "나중에" → localStorage 마커 저장, 영구 dismiss
 *  5. NotificationOrchestrator "push-permission" 슬롯을 따라 모달 충돌 방지
 */

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isPushSupported,
  isPermissionDeclined,
  markPermissionDeclined,
  enablePushForCurrentUser,
  getPermissionState,
} from "@/lib/push";
import {
  canShowNotification,
  subscribeActiveModalChange,
} from "@/features/dashboard/notification-orchestrator";

const PROMPTED_KEY = "push.promptedV1";

export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      // SSR guard
      if (typeof window === "undefined") return;

      // 이미 결정된 경우 (granted / denied) → 노출 불필요
      const state = getPermissionState();
      if (state === "granted" || state === "denied" || state === "unsupported") return;

      // 사용자가 이전에 dismiss 했거나 이미 prompt 된 경우
      if (isPermissionDeclined()) return;
      if (window.localStorage.getItem(PROMPTED_KEY) === "true") return;

      // 브라우저 지원 여부 비동기 확인
      const supported = await isPushSupported();
      if (!supported) return;

      // NotificationOrchestrator: 다른 모달이 열려 있으면 대기
      if (!canShowNotification("push-permission")) return;

      if (!cancelled) setVisible(true);
    }

    void evaluate();

    // 모달 슬롯 변경 시 재평가
    const unsub = subscribeActiveModalChange(() => {
      if (cancelled) return;
      if (!canShowNotification("push-permission")) {
        setVisible(false);
      } else {
        void evaluate();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function handleAllow() {
    setLoading(true);
    try {
      const result = await enablePushForCurrentUser();
      if (result.ok) {
        const { toast } = await import("sonner");
        toast.success("Push 알림을 허용했습니다.");
      } else if (result.reason === "denied") {
        const { toast } = await import("sonner");
        toast.error("브라우저에서 알림이 차단되었습니다. 브라우저 설정에서 변경해주세요.");
      } else if (result.reason === "unsupported") {
        const { toast } = await import("sonner");
        toast("이 브라우저는 Push 알림을 지원하지 않습니다.");
      }
    } finally {
      setLoading(false);
      // 허용 결과와 무관하게 배너는 닫음 (재노출 방지)
      window.localStorage.setItem(PROMPTED_KEY, "true");
      setVisible(false);
    }
  }

  function handleDismiss() {
    markPermissionDeclined();
    window.localStorage.setItem(PROMPTED_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Push 알림 권한 안내"
      className={cn(
        "relative flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5",
        "animate-in fade-in slide-in-from-top-2 duration-200",
      )}
    >
      {/* 아이콘 */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Bell size={16} />
      </div>

      {/* 본문 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Push 알림 받기</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          세미나 · 수업 · 스터디 일정을 브라우저 알림으로 받아보세요.
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => void handleAllow()}
            disabled={loading}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "처리 중…" : "허용"}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            나중에
          </button>
        </div>
      </div>

      {/* 닫기 */}
      <button
        onClick={handleDismiss}
        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
}
