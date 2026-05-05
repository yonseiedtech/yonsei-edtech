"use client";

import { useState, useEffect, useRef } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  size?: "sm" | "default";
}

const SOCIAL_LINKS = [
  {
    name: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
  },
  {
    name: "X (Twitter)",
    icon: (
      <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

export default function ShareButton({ title, text, url, size = "sm" }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const shareText = text ?? title;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowMenu(false);
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  async function handleShare() {
    // Web Share API 우선 시도 (모바일)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        return;
      } catch {
        // 사용자 취소 또는 미지원
      }
    }
    setShowMenu(!showMenu);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("링크가 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
      setShowMenu(false);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  function handleSocialShare(getUrl: (url: string, title: string) => string) {
    window.open(getUrl(shareUrl, shareText), "_blank", "width=600,height=400");
    setShowMenu(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button onClick={handleShare} size={size} variant="outline">
        <Share2 size={16} className={size === "sm" ? "mr-1" : "mr-2"} />
        공유
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border bg-card p-1.5 shadow-lg">
          <button
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <LinkIcon size={14} />}
            링크 복사
          </button>
          {SOCIAL_LINKS.map((social) => (
            <button
              key={social.name}
              onClick={() => handleSocialShare(social.getUrl)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              {social.icon}
              {social.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
