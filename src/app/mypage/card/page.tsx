"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import BusinessCard from "@/features/card/BusinessCard";
import { Button } from "@/components/ui/button";
import { downloadVCard, userToContact } from "@/features/card/vcard";
import { toast } from "sonner";

function CardInner() {
  const { user } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "https://yonsei-edtech.vercel.app";
  const qrUrl = `${siteOrigin}/directory/${user.id}/card?via=qr`;

  async function handleShare() {
    if (!user) return;
    const shareData = {
      title: `${user.name}님의 명함`,
      text: `연세교육공학회 ${user.name}`,
      url: qrUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(qrUrl);
        toast.success("명함 링크를 복사했습니다.");
      } catch {
        toast.error("공유를 지원하지 않는 환경입니다.");
      }
    }
  }

  async function handleSavePng() {
    if (!cardRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${user!.name.replace(/\s+/g, "_")}_명함.png`;
      a.click();
      toast.success("이미지로 저장했습니다.");
    } catch {
      toast.error("이미지 생성에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/mypage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
            마이페이지
          </Link>
        </div>

        <h1 className="text-2xl font-bold">내 모바일 명함</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          QR 코드를 스캔하면 상대방이 내 명함을 받을 수 있어요.
        </p>

        <div className="mt-6">
          <BusinessCard ref={cardRef} user={user} qrValue={qrUrl} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={handleShare}>
            <Share2 size={16} className="mr-1" />
            공유하기
          </Button>
          <Button variant="outline" onClick={handleSavePng}>
            <Download size={16} className="mr-1" />
            이미지 저장
          </Button>
          <Button onClick={() => downloadVCard(userToContact(user))}>
            <Download size={16} className="mr-1" />
            vCard(.vcf)
          </Button>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">사용 안내</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>공유하기: 카카오톡·메시지로 명함 링크 전송</li>
            <li>이미지 저장: 명함을 PNG로 저장해 프로필에 활용</li>
            <li>vCard: 연락처 앱에서 바로 열 수 있는 파일</li>
            <li>상대가 내 QR을 스캔하면 명함 교환 기록이 남아요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function MyCardPage() {
  return (
    <AuthGuard>
      <CardInner />
    </AuthGuard>
  );
}
