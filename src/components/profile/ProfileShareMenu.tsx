"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Share2, Link as LinkIcon, QrCode, CreditCard, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  profileId: string;
  name: string;
  bio?: string;
}

export default function ProfileShareMenu({ profileId, name, bio }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function buildShareUrl(via: "link" | "qr"): string {
    const origin = typeof window !== "undefined"
      ? window.location.origin
      : "https://yonsei-edtech.vercel.app";
    return `${origin}/profile/${profileId}?via=${via}`;
  }

  async function shareLink() {
    const url = buildShareUrl("link");
    const text = `${name} · 연세교육공학회 회원 프로필${bio ? ` — ${bio.slice(0, 80)}` : ""}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        setOpen(false);
        return;
      } catch {
        // 사용자 취소 — 무시
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("프로필 링크를 복사했어요.");
    } catch {
      toast.error("공유를 지원하지 않는 환경입니다.");
    }
    setOpen(false);
  }

  async function copyOnly() {
    const url = buildShareUrl("link");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("프로필 링크를 복사했어요.");
    } catch {
      toast.error("클립보드 복사에 실패했어요.");
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
      >
        <Share2 size={14} />
        공유
        <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover py-1 shadow-lg">
          <button
            type="button"
            onClick={shareLink}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Share2 size={14} />
            공유하기
          </button>
          <button
            type="button"
            onClick={copyOnly}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LinkIcon size={14} />
            링크 복사
          </button>
          <Link
            href={`/directory/${profileId}/card`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CreditCard size={14} />
            명함 보기
          </Link>
          <Link
            href={`/directory/${profileId}/card`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <QrCode size={14} />
            QR 코드
          </Link>
        </div>
      )}
    </div>
  );
}
