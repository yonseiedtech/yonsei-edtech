"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const STORAGE_KEY = "pwa_install_dismissed_at";
const COOLDOWN_DAYS = 14;

export default function InstallPromptBanner() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (dismissed) {
      const ts = Number(dismissed);
      if (!Number.isNaN(ts) && Date.now() - ts < COOLDOWN_DAYS * 86400_000) {
        return;
      }
    }

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent || "";
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const isNarrow = window.innerWidth <= 820;
    if (!(isMobileUA || isCoarsePointer) || !isNarrow) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
  }

  if (!visible || !event) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 rounded-xl border bg-card p-3 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">홈 화면에 추가</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            연세교육공학회를 앱처럼 빠르게 사용하세요.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={install}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
            >
              설치
            </button>
            <button
              onClick={dismiss}
              className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="닫기"
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
