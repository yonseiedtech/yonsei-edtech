"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "./auth-store";
import { authApi } from "@/lib/bkend";
import type { UserRole } from "@/types";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// 관리자(sysadmin, admin)는 운영 편의를 위해 2시간 idle 제한 면제 — 일반 회원과 동일한 장기 세션
const IDLE_LIMITS: Record<UserRole, number> = {
  sysadmin: 30 * DAY,
  admin: 30 * DAY,
  president: 2 * HOUR,
  staff: 2 * HOUR,
  advisor: 2 * HOUR,
  alumni: 30 * DAY,
  member: 30 * DAY,
  guest: 30 * DAY,
};

// 2시간 idle 제한이 적용되는 역할 (운영진 중 임기 순환 포지션)
const SHORT_SESSION_ROLES: UserRole[] = ["president", "staff", "advisor"];

const WARN_BEFORE = 5 * MIN;
const TICK_MS = 1000;
const STORAGE_KEY = "sessionLastActivity";
const LOGIN_GRACE_MS = 5000;

export function useSessionTimer() {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);

  const [lastActivity, setLastActivity] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return v > 0 ? v : Date.now();
  });
  const [now, setNow] = useState(Date.now());
  const warnedRef = useRef(false);
  const expiredRef = useRef(false);
  const loginTimeRef = useRef(Date.now());

  const limit = user ? IDLE_LIMITS[user.role] ?? IDLE_LIMITS.member : 0;
  const elapsed = now - lastActivity;
  const remaining = Math.max(0, limit - elapsed);
  const isSensitiveRole = !!user && (SHORT_SESSION_ROLES as string[]).includes(user.role);

  const extend = useCallback(() => {
    const t = Date.now();
    setLastActivity(t);
    warnedRef.current = false;
    expiredRef.current = false;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
  }, []);

  const silentRefresh = useCallback(() => {
    extend();
    authApi.me().catch(() => {});
    toast.success("세션이 자동 갱신되었습니다.", { duration: 2000 });
  }, [extend]);

  // 활동 감지 + 자동 갱신
  useEffect(() => {
    if (!user) return;
    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => {
      const t = Date.now();
      const currentElapsed = t - lastActivity;

      if (isSensitiveRole && currentElapsed >= limit && expiredRef.current) {
        silentRefresh();
        return;
      }

      if (t - lastActivity > 15 * 1000) {
        setLastActivity(t);
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
      }
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [user, lastActivity, isSensitiveRole, limit, silentRefresh]);

  // 탭 복귀 시 자동 갱신 (visibilitychange)
  useEffect(() => {
    if (!user || !isSensitiveRole) return;
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const t = Date.now();
      const currentElapsed = t - lastActivity;
      if (currentElapsed >= limit) {
        silentRefresh();
      } else if (currentElapsed > 15 * 1000) {
        setLastActivity(t);
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [user, isSensitiveRole, lastActivity, limit, silentRefresh]);

  // 주기적 tick
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [user]);

  // 경고 (만료 시 로그아웃하지 않음 — 활동 감지 시 자동 갱신)
  useEffect(() => {
    if (!user || !isSensitiveRole) return;
    // 로그인 직후 grace period — 즉시 만료 방지
    if (Date.now() - loginTimeRef.current < LOGIN_GRACE_MS) return;

    if (remaining > 0 && remaining <= WARN_BEFORE && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("세션이 곧 만료됩니다", {
        description: "활동이 감지되면 자동으로 갱신됩니다.",
        action: { label: "연장", onClick: () => extend() },
        duration: WARN_BEFORE,
      });
    }
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
    }
  }, [user, isSensitiveRole, remaining, extend]);

  // 로그인 시 초기화
  useEffect(() => {
    if (user) {
      expiredRef.current = false;
      warnedRef.current = false;
      loginTimeRef.current = Date.now();
      const t = Date.now();
      setLastActivity(t);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
    }
  }, [user?.id]);

  return { user, limit, remaining, extend, isSensitiveRole };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "만료";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  if (d > 0) return `${d}일+`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
