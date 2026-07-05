"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { popupsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { SitePopup, PopupDismissDuration } from "@/types";
import SitePopupModal from "./SitePopupModal";
import {
  canShowNotification,
  getActiveModal,
  publishActiveModal,
  releaseActiveModal,
  subscribeActiveModalChange,
} from "@/features/dashboard/notification-orchestrator";

const STORAGE_KEY_PREFIX = "site_popup_dismiss_";
const SESSION_KEY_PREFIX = "site_popup_session_";

/** 닫기 만료 시각이 미래면 노출 안함 */
function isDismissed(id: string): boolean {
  if (typeof window === "undefined") return false;
  // 세션 닫기
  if (sessionStorage.getItem(SESSION_KEY_PREFIX + id)) return true;
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
  if (!raw) return false;
  if (raw === "once") return true;
  const expiresAt = Number(raw);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now()) return true;
  // 만료된 키 정리
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    localStorage.removeItem(STORAGE_KEY_PREFIX + id);
  }
  return false;
}

function setDismiss(id: string, duration: PopupDismissDuration) {
  if (typeof window === "undefined") return;
  if (duration === "session") {
    sessionStorage.setItem(SESSION_KEY_PREFIX + id, "1");
    return;
  }
  if (duration === "once") {
    localStorage.setItem(STORAGE_KEY_PREFIX + id, "once");
    return;
  }
  const days = duration === "1d" ? 1 : 7;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY_PREFIX + id, String(expiresAt));
}

/** 팝업을 띄우지 않는 경로 — 로그인/가입/재동의 등 집중 흐름 (QA-v3 M) */
const SUPPRESSED_PATHS = ["/login", "/signup", "/consent", "/forgot-password"];

export default function SitePopupGate() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["site_popups", "active"],
    queryFn: () => popupsApi.listActive(),
    staleTime: 60_000,
    retry: false,
  });

  // Sprint 2: NotificationOrchestrator — undergrad-info 등 더 높은 우선순위 modal 이 활성이면 보류
  const [modalSuppressed, setModalSuppressed] = useState<boolean>(() => {
    const active = getActiveModal();
    return active !== null && active !== "site-popup";
  });

  useEffect(() => {
    return subscribeActiveModalChange(() => {
      setModalSuppressed(!canShowNotification("site-popup"));
    });
  }, []);

  const visiblePopup: SitePopup | null = useMemo(() => {
    const all = data?.data ?? [];
    if (all.length === 0) return null;
    const now = new Date().toISOString();
    const isMember = !!user;

    const candidates = all
      .filter((p) => p.startsAt <= now && now <= p.endsAt)
      .filter((p) => {
        if (p.audience === "all") return true;
        if (p.audience === "member") return isMember;
        if (p.audience === "guest") return !isMember;
        return false;
      })
      .filter((p) => !closedIds.has(p.id))
      .filter((p) => !isDismissed(p.id))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return candidates[0] ?? null;
  }, [data, user, closedIds]);

  // route 변경 시 다시 열리지 않도록 closedIds는 메모리 유지 (Refresh 시 isDismissed 검사로 제어)
  useEffect(() => {
    if (visiblePopup) {
      // 키보드 ESC 닫기
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setClosedIds((prev) => new Set(prev).add(visiblePopup.id));
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [visiblePopup]);

  // Sprint 2: 자기 modal slot 점유/해제 발행 — visiblePopup 가 mount 될 때만
  useEffect(() => {
    if (visiblePopup && !modalSuppressed) {
      publishActiveModal("site-popup");
      return () => {
        releaseActiveModal("site-popup");
      };
    }
    return undefined;
  }, [visiblePopup, modalSuppressed]);

  const pathSuppressed = SUPPRESSED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!visiblePopup || modalSuppressed || pathSuppressed) return null;

  return (
    <SitePopupModal
      popup={visiblePopup}
      onClose={() => {
        // QA-v3 M: React state 만으로는 새로고침마다 재노출 — 세션 저장으로 "탭 닫기 전까지" 유지
        try {
          sessionStorage.setItem(SESSION_KEY_PREFIX + visiblePopup.id, "1");
        } catch {
          /* 무시 */
        }
        setClosedIds((prev) => new Set(prev).add(visiblePopup.id));
      }}
      onDismissUntil={() => {
        setDismiss(visiblePopup.id, visiblePopup.dismissDuration);
        setClosedIds((prev) => new Set(prev).add(visiblePopup.id));
      }}
    />
  );
}
