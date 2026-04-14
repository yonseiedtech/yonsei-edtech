"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { ArrowLeft, Download, UserPlus } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import BusinessCard from "@/features/card/BusinessCard";
import { Button } from "@/components/ui/button";
import { profilesApi } from "@/lib/bkend";
import { db } from "@/lib/firebase";
import { downloadVCard, userToContact } from "@/features/card/vcard";
import type { User } from "@/types";
import { toast } from "sonner";

function ReceivedCardInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const viewer = useAuthStore((s) => s.user);
  const ownerId = params.id;
  const exchangeLoggedRef = useRef(false);

  const { data: owner, isLoading } = useQuery({
    queryKey: ["user-card", ownerId],
    queryFn: async () => {
      const res = await profilesApi.get(ownerId);
      return res.data as unknown as User;
    },
    enabled: !!ownerId,
  });

  // QR 스캔으로 들어온 경우 교환 기록 자동 생성 (본인 카드 제외, 중복 방지)
  useEffect(() => {
    if (exchangeLoggedRef.current) return;
    if (!viewer || !owner) return;
    if (viewer.id === owner.id) return;
    const via = search.get("via");
    if (via !== "qr" && via !== "link") return;

    exchangeLoggedRef.current = true;
    (async () => {
      try {
        const existing = await getDocs(
          query(
            collection(db, "business_card_exchanges"),
            where("ownerId", "==", owner.id),
            where("receiverId", "==", viewer.id),
          ),
        );
        if (!existing.empty) return;
        await addDoc(collection(db, "business_card_exchanges"), {
          ownerId: owner.id,
          ownerName: owner.name,
          receiverId: viewer.id,
          receiverName: viewer.name,
          channel: via,
          createdAt: serverTimestamp(),
        });
        toast.success(`${owner.name}님의 명함을 받았어요.`);
      } catch {
        /* ignore — 규칙 거부 또는 네트워크 오류 */
      }
    })();
  }, [viewer, owner, search]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">명함을 불러오는 중…</div>;
  }
  if (!owner) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">명함을 찾을 수 없습니다.</p>
        <Link href="/directory" className="mt-4 inline-block text-sm text-primary underline">회원 목록으로</Link>
      </div>
    );
  }

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = `${siteOrigin}/directory/${owner.id}/card`;
  const isSelf = viewer?.id === owner.id;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/directory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
            회원 목록
          </Link>
        </div>

        <h1 className="text-2xl font-bold">{owner.name}님의 명함</h1>
        {!isSelf && <p className="mt-1 text-sm text-muted-foreground">QR 스캔으로 받은 명함이에요.</p>}

        <div className="mt-6">
          <BusinessCard user={owner} qrValue={qrUrl} hideExchangeHint />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={() => downloadVCard(userToContact(owner))}>
            <UserPlus size={16} className="mr-1" />
            연락처에 추가
          </Button>
          <Button variant="outline" onClick={() => downloadVCard(userToContact(owner), `${owner.name}.vcf`)}>
            <Download size={16} className="mr-1" />
            vCard 다운로드
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReceivedCardPage() {
  return (
    <AuthGuard>
      <ReceivedCardInner />
    </AuthGuard>
  );
}
