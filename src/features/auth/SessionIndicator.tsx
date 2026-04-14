"use client";

import { useState } from "react";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionTimer, formatRemaining } from "./useSessionTimer";

const MIN = 60 * 1000;

export default function SessionIndicator({ className }: { className?: string }) {
  const { user, remaining, extend, isSensitiveRole } = useSessionTimer();
  const [hover, setHover] = useState(false);

  if (!user) return null;

  // 일반 회원은 30일 idle — 상시 표기는 불필요. hover 시에만 툴팁.
  if (!isSensitiveRole) {
    return (
      <div
        className={cn("relative hidden md:flex items-center", className)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          <ShieldCheck size={12} className="text-emerald-500" />
          세션 유지
        </div>
        {hover && (
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-2 text-xs text-muted-foreground shadow-lg">
            활동 시 자동 연장되는 장기 세션입니다.
          </div>
        )}
      </div>
    );
  }

  const warn = remaining <= 10 * MIN;
  const danger = remaining <= 5 * MIN;

  return (
    <div className={cn("hidden md:flex items-center gap-1", className)}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
          danger
            ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
            : warn
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-border bg-muted/40 text-muted-foreground",
        )}
        title="운영진 세션 (무활동 2시간 제한)"
      >
        {danger ? <AlertTriangle size={12} /> : <Clock size={12} />}
        {formatRemaining(remaining)}
      </div>
      {warn && (
        <button
          onClick={extend}
          className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
        >
          연장
        </button>
      )}
    </div>
  );
}
