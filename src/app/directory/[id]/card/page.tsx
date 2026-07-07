"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Download, UserPlus } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { useAuthStore } from "@/features/auth/auth-store";
import BusinessCard from "@/features/card/BusinessCard";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { downloadVCard, userToContact } from "@/features/card/vcard";
import type { User } from "@/types";
import { toast } from "sonner";

function ReceivedCardInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const viewer = useAuthStore((s) => s.user);
  const ownerId = params.id;
  const exchangeLoggedRef = useRef(false);

  const via = search.get("via") === "link" ? "link" : "qr"; // 명함 페이지 자체가 교환 컨텍스트
  const { data: owner, isLoading } = useQuery({
    // P1-1: users 직접 get → 서버 투영 API (비로그인 QR 스캔도 shared 필드로 동작)
    queryKey: ["user-card", ownerId, viewer?.id ?? "anon"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => undefined);
      const res = await fetch(`/api/profile/${ownerId}/public?via=${via}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("명함 조회 실패");
      return ((await res.json()) as { user: User }).user;
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
        // codex-L3: 결정적 ID(ownerId_receiverId)로 중복 교환 로그 방지 (두 탭 동시 열기 race)
        const exId = `${owner.id}_${viewer.id}`;
        const exRef = doc(collection(db, "business_card_exchanges"), exId);
        if ((await getDoc(exRef)).exists()) return;
        await setDoc(exRef, {
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
          <BackButton href={`/directory/${owner.id}`} label="프로필로" />
        </div>

        {/* C-4(2026-07-04): 명함(조회 319건)의 후속 루프 — 쪽지 전환 CTA (쪽지 알림 신설됨) */}
        {viewer && !isSelf && (
          <Link
            href={`/mypage/messages?compose=${owner.id}`}
            className="mb-4 flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            ✉️ {owner.name}님에게 쪽지 보내기
          </Link>
        )}

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
  return <ReceivedCardInner />;
}
