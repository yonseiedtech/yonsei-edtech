"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SitePopup } from "@/types";

interface Props {
  popup: Pick<
    SitePopup,
    "title" | "content" | "imageUrl" | "ctaLabel" | "ctaUrl" | "position" | "dismissDuration"
  >;
  onClose: () => void;
  onDismissUntil?: () => void;
  /** 미리보기 모드 시 화면 채우기 대신 컨테이너 안에 표시 */
  preview?: "desktop" | "mobile";
}

const DISMISS_LABEL: Record<SitePopup["dismissDuration"], string> = {
  session: "닫기",
  "1d": "오늘 하루 보지 않기",
  "7d": "7일간 보지 않기",
  once: "다시 보지 않기",
};

export default function SitePopupModal({ popup, onClose, onDismissUntil, preview }: Props) {
  const isCenter = popup.position === "center";
  const dismissLabel = DISMISS_LABEL[popup.dismissDuration];

  // 미리보기 컨테이너
  if (preview) {
    const isMobile = preview === "mobile";
    return (
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-xl border bg-muted/40",
          isMobile ? "h-[560px] w-[320px]" : "h-[480px] w-full max-w-2xl",
        )}
      >
        {/* 가상 페이지 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute inset-x-3 top-3 rounded-md bg-card/80 px-3 py-2 text-[10px] text-muted-foreground">
          ━━━━━ 사이트 미리보기 ━━━━━
        </div>

        {isCenter ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
            <PopupCard popup={popup} onClose={onClose} dismissLabel={dismissLabel} onDismissUntil={onDismissUntil} />
          </div>
        ) : (
          <div className="absolute bottom-3 right-3 max-w-[280px]">
            <PopupCard popup={popup} onClose={onClose} dismissLabel={dismissLabel} onDismissUntil={onDismissUntil} compact />
          </div>
        )}
      </div>
    );
  }

  // 실제 사이트 게이트
  if (isCenter) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <PopupCard popup={popup} onClose={onClose} dismissLabel={dismissLabel} onDismissUntil={onDismissUntil} />
        </div>
      </div>
    );
  }

  // bottom-right 배너
  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-[320px]" role="dialog">
      <PopupCard popup={popup} onClose={onClose} dismissLabel={dismissLabel} onDismissUntil={onDismissUntil} compact />
    </div>
  );
}

function PopupCard({
  popup,
  onClose,
  dismissLabel,
  onDismissUntil,
  compact,
}: {
  popup: Props["popup"];
  onClose: () => void;
  dismissLabel: string;
  onDismissUntil?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-2xl",
        compact ? "w-[300px]" : "w-[460px] max-w-[92vw]",
      )}
    >
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-2 top-2 z-10 rounded-full bg-black/10 p-1 text-white hover:bg-black/30"
      >
        <X size={14} />
      </button>

      {popup.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={popup.imageUrl}
          alt=""
          className={cn("w-full object-cover", compact ? "h-32" : "h-44")}
        />
      )}

      <div className={cn("p-4", compact && "p-3")}>
        <h3 className={cn("font-bold text-foreground", compact ? "text-sm" : "text-base")}>
          {popup.title}
        </h3>
        <div
          className={cn(
            "mt-2 whitespace-pre-wrap text-muted-foreground",
            compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed",
          )}
        >
          {popup.content}
        </div>

        {popup.ctaLabel && popup.ctaUrl && (
          <a
            href={popup.ctaUrl}
            target={popup.ctaUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className={cn(
              "mt-3 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 font-semibold text-white hover:bg-primary/90",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {popup.ctaLabel}
          </a>
        )}
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
        {onDismissUntil && popup.dismissDuration !== "session" ? (
          <button
            onClick={onDismissUntil}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {dismissLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onClose}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
