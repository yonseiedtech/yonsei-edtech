"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "./auth-store";
import { authApi } from "@/lib/bkend";
import type { UserRole } from "@/types";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * 역할별 무활동(idle) 허용 시간.
 * - 운영진(staff/president/admin): 2시간 — 민감 데이터 취급
 * - 일반 회원: 30일 — rolling refresh, 활동 있을 때 자동 연장
 */
const IDLE_LIMITS: Record<UserRole, number> = {
  sysadmin: 2 * HOUR,
  admin: 2 * HOUR,
  president: 2 * HOUR,
  staff: 2 * HOUR,
  advisor: 2 * HOUR,
  alumni: 30 * DAY,
  member: 30 * DAY,
  guest: 30 * DAY,
};

const WARN_BEFORE = 5 * MIN;
const TICK_MS = 1000;
const STORAGE_KEY = "sessionLastActivity";

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

  const limit = user ? IDLE_LIMITS[user.role] ?? IDLE_LIMITS.member : 0;
  const elapsed = now - lastActivity;
  const remaining = Math.max(0, limit - elapsed);
  const isSensitiveRole = !!user && ["sysadmin", "admin", "president", "staff", "advisor"].includes(user.role);

  const extend = useCallback(() => {
    const t = Date.now();
    setLastActivity(t);
    warnedRef.current = false;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
  }, []);

  // 활동 감지
  useEffect(() => {
    if (!user) return;
    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => {
      const t = Date.now();
      if (t - lastActivity > 15 * 1000) {
        setLastActivity(t);
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(t));
      }
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [user, lastActivity]);

  // 주기적 tick
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [user]);

  // 경고 & 만료
  useEffect(() => {
    if (!user || !isSensitiveRole) return;
    if (remaining > 0 && remaining <= WARN_BEFORE && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("세션이 곧 만료됩니다", {
        description: "5분 내 활동이 없으면 자동 로그아웃됩니다.",
        action: { label: "연장", onClick: () => extend() },
        duration: WARN_BEFORE,
      });
    }
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      authApi.logout().catch(() => {});
      logoutStore();
      toast.error("세션이 만료되어 로그아웃되었습니다.");
    }
  }, [user, isSensitiveRole, remaining, extend, logoutStore]);

  // 로그인 시 초기화 (lastActivity를 현재 시각으로 리셋하여 stale 타임스탬프로 인한 즉시 만료 방지)
  useEffect(() => {
    if (user) {
      expiredRef.current = false;
      warnedRef.current = false;
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
