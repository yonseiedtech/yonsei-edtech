"use client";

/**
 * 커맨드 팔레트 1회 코치마크 (벤치마크 H1 — Linear/Arc "팔레트 = 주 내비게이션")
 *
 * 로그인 회원 최초 1회, 헤더 검색 버튼 아래에 "Ctrl/Cmd+K 로 어디든 이동하세요" 를 안내한다.
 * 표시 여부·닫힘 플래그는 부모(GlobalSearch)가 localStorage 로 관리하고, 여기서는
 * 순수 표현만 담당한다(팔레트가 열리거나 사용자가 닫으면 부모가 dismiss).
 *
 * 접근성: role="dialog" + aria-label, 닫기 버튼 포커스 가능, Esc/Enter 로 닫힘.
 */

import { useEffect, useRef } from "react";
import { Command, X } from "lucide-react";

export default function CommandPaletteCoach({
  show,
  onDismiss,
}: {
  show: boolean;
  onDismiss: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (show) {
      // 코치마크 등장 직후 닫기 버튼에 포커스 → 키보드 사용자가 즉시 Esc/Enter 로 닫을 수 있게
      const t = setTimeout(() => closeRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="커맨드 팔레트 안내"
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          onDismiss();
        }
      }}
      className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-64 rounded-xl border bg-popover p-3 text-left shadow-xl animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {/* 말풍선 꼬리 */}
      <span
        aria-hidden
        className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t bg-popover"
      />
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Command size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">어디든 한 번에 이동</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            {" + "}
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">K</kbd>
            {" 로 페이지·기능·진단·복습을 검색하고 실행하세요."}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onDismiss}
          aria-label="안내 닫기"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} />
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        알겠어요
      </button>
    </div>
  );
}
