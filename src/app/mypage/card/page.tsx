"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Download, Share2, Users, CreditCard, History, Camera, BookUser } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import BusinessCard from "@/features/card/BusinessCard";
import ReceivedCardsSection from "@/features/card/ReceivedCardsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import { downloadVCard, userToContact } from "@/features/card/vcard";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { BusinessCardExchange } from "@/types";
import { toast } from "sonner";
import { uploadImageSmart } from "@/lib/storage";
import { useUpdateProfile } from "@/features/member/useMembers";

type TabKey = "card" | "exchanges" | "received";

interface ExchangeGroup {
  received: BusinessCardExchange[];
  given: BusinessCardExchange[];
}

function parseDocs(snap: Awaited<ReturnType<typeof getDocs>>): BusinessCardExchange[] {
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown> & { createdAt?: { toDate?: () => Date } };
    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
    return { id: d.id, ...data, createdAt } as BusinessCardExchange;
  });
}

function CardTab({ user, qrUrl, cardRef, handleShare, handleSavePng, handlePhotoUpload, isUploading }: {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  qrUrl: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
  handleShare: () => void;
  handleSavePng: () => void;
  handlePhotoUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}) {
  if (!user) return null;
  return (
    <div>
      <div className="mt-2">
        <BusinessCard ref={cardRef} user={user} qrValue={qrUrl} />
      </div>

      {/* 프로필 사진 업로드 */}
      <div className="mt-4 flex justify-center">
        <label className={cn("cursor-pointer", isUploading && "pointer-events-none opacity-60")}>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
              e.target.value = "";
            }}
          />
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground",
            isUploading && "opacity-60",
          )}>
            <Camera size={14} />
            {isUploading ? "업로드 중…" : "프로필 사진 변경"}
          </span>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="outline" onClick={handleShare}>
          <Share2 size={16} className="mr-1" />공유하기
        </Button>
        <Button variant="outline" onClick={handleSavePng}>
          <Download size={16} className="mr-1" />이미지 저장
        </Button>
        <Button onClick={() => downloadVCard(userToContact(user))}>
          <Download size={16} className="mr-1" />vCard(.vcf)
        </Button>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">사용 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>프로필 사진: 명함에 표시할 사진을 업로드하세요</li>
          <li>공유하기: 카카오톡·메시지로 명함 링크 전송</li>
          <li>이미지 저장: 명함을 PNG로 저장해 프로필에 활용</li>
          <li>vCard: 연락처 앱에서 바로 열 수 있는 파일</li>
          <li>상대가 내 QR을 스캔하면 교환 기록 탭에 남아요</li>
        </ul>
      </div>
    </div>
  );
}

function ExchangeSection({
  title, items, emptyMsg, loading, nameKey, linkPrefix,
}: {
  title: string;
  items: BusinessCardExchange[];
  emptyMsg: string;
  loading: boolean;
  nameKey: "ownerName" | "receiverName";
  linkPrefix: (x: BusinessCardExchange) => string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title} ({items.length})</h2>
      {loading ? (
        <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">불러오는 중…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title={emptyMsg} />
      ) : (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="rounded-xl border bg-card px-4 py-3">
              <Link href={linkPrefix(x)} className="flex items-center justify-between hover:text-primary">
                <div>
                  <p className="font-medium">{x[nameKey]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(x.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {x.channel === "qr" ? "QR" : "링크"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExchangesTab({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<ExchangeGroup>({
    queryKey: ["card-exchanges", userId],
    queryFn: async () => {
      const col = collection(db, "business_card_exchanges");
      const [receivedSnap, givenSnap] = await Promise.all([
        getDocs(query(col, where("receiverId", "==", userId), orderBy("createdAt", "desc"))),
        getDocs(query(col, where("ownerId", "==", userId), orderBy("createdAt", "desc"))),
      ]);
      return { received: parseDocs(receivedSnap), given: parseDocs(givenSnap) };
    },
  });

  return (
    <div className="mt-2 grid gap-6 md:grid-cols-2">
      <ExchangeSection
        title="내가 받은 명함"
        items={data?.received ?? []}
        emptyMsg="아직 받은 명함이 없습니다."
        loading={isLoading}
        nameKey="ownerName"
        linkPrefix={(x) => `/directory/${x.ownerId}`}
      />
      <ExchangeSection
        title="내 명함을 받은 사람"
        items={data?.given ?? []}
        emptyMsg="아직 명함을 나눈 기록이 없습니다."
        loading={isLoading}
        nameKey="receiverName"
        linkPrefix={(x) => `/directory/${x.receiverId}`}
      />
    </div>
  );
}

function CardInner() {
  const { user, setUser } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabKey>("card");
  const [isUploading, setIsUploading] = useState(false);
  const { updateProfile } = useUpdateProfile();

  if (!user) return null;

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "https://yonsei-edtech.vercel.app";
  const qrUrl = `${siteOrigin}/profile/${user.id}?via=qr`;

  async function handleShare() {
    if (!user) return;
    const shareData = {
      title: `${user.name}님의 명함`,
      text: `연세교육공학회 ${user.name}`,
      url: qrUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(qrUrl);
        toast.success("명함 링크를 복사했습니다.");
      } catch {
        toast.error("공유를 지원하지 않는 환경입니다.");
      }
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!user) return;
    setIsUploading(true);
    try {
      const url = await uploadImageSmart(file, `profile-photos/${user.id}`);
      await updateProfile({ id: user.id, data: { profileImage: url } });
      setUser({ ...user, profileImage: url });
      toast.success("프로필 사진을 업데이트했습니다.");
    } catch {
      toast.error("사진 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
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

  const isWide = tab === "exchanges" || tab === "received";

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className={cn("mx-auto px-4", isWide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-4 flex items-center gap-2">
          <Link href="/mypage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />마이페이지
          </Link>
        </div>

        <h1 className="text-2xl font-bold">모바일 명함</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          QR·링크로 명함을 주고받고, 기록을 한곳에서 관리할 수 있어요.
        </p>

        {/* 탭 네비게이션 */}
        <nav className="mt-6 flex gap-1 border-b">
          {[
            { key: "card" as const, label: "내 명함", icon: CreditCard },
            { key: "exchanges" as const, label: "교환 기록", icon: History },
            { key: "received" as const, label: "받은 명함", icon: BookUser },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon size={15} />{t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === "card" ? (
            <CardTab user={user} qrUrl={qrUrl} cardRef={cardRef} handleShare={handleShare} handleSavePng={handleSavePng} handlePhotoUpload={handlePhotoUpload} isUploading={isUploading} />
          ) : tab === "exchanges" ? (
            <ExchangesTab userId={user.id} />
          ) : (
            <ReceivedCardsSection ownerId={user.id} />
          )}
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
