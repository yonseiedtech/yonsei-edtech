"use client";

/**
 * CardSection — 명함 기능 통합 컴포넌트
 *
 * /mypage/card/page.tsx 의 CardInner 로직을 추출.
 * MyPageView "내 명함" 탭에 dynamic import로 삽입.
 * AuthGuard 없음 — 부모(MyPageView)가 이미 인증 상태를 보장.
 *
 * 명함 디자인을 인쇄용 가로 명함(PrintBusinessCard, 90×50mm)으로 통합(2026-08-02).
 * 세로 모바일 명함은 제거되고 PrintCardSection 이 미리보기·공유·이미지 저장·PDF 를 담당한다.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Users, CreditCard, History, Camera, BookUser } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import PrintCardSection from "@/features/card/PrintCardSection";
import ReceivedCardsSection from "@/features/card/ReceivedCardsSection";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { BusinessCardExchange } from "@/types";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/storage";
import { useUpdateProfile } from "@/features/member/useMembers";

async function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.92),
  );
}

type CardTabKey = "card" | "exchanges" | "received";

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

function CardTab({
  user,
  qrUrl,
  profileUrl,
  handlePhotoUpload,
  isUploading,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
  qrUrl: string;
  profileUrl: string;
  handlePhotoUpload: (file: File) => void;
  isUploading: boolean;
}) {
  return (
    <div>
      {/* 통합 명함 (인쇄용 규격) — 미리보기·공유·이미지 저장·PDF */}
      <PrintCardSection user={user} profileUrl={profileUrl} qrUrl={qrUrl} />

      {/* 프로필 사진 — 사이트 프로필·회원 명부용 (인쇄 명함에는 미표시) */}
      <div className="mt-6 flex flex-col items-center gap-1.5">
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
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground",
              isUploading && "opacity-60",
            )}
          >
            <Camera size={14} />
            {isUploading ? "업로드 중…" : "프로필 사진 변경"}
          </span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          프로필 사진은 회원 명부·프로필에 표시됩니다. (인쇄 명함에는 미표시)
        </p>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">사용 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>디자인: 라이트·네이비 중 선택하면 상대가 보는 명함에도 동일하게 적용돼요</li>
          <li>공유하기: 카카오톡·메시지로 명함 링크 전송</li>
          <li>이미지 저장: 명함 앞면을 JPG로 저장해 프로필에 활용</li>
          <li>인쇄용 PDF: 실제 규격(90×50mm)으로 인쇄소에 제출할 수 있어요</li>
          <li>vCard: 연락처 앱에서 바로 열 수 있는 파일</li>
          <li>상대가 내 QR을 스캔하면 교환 기록 탭에 남아요</li>
        </ul>
      </div>
    </div>
  );
}

function ExchangeSection({
  title,
  items,
  emptyMsg,
  loading,
  nameKey,
  linkPrefix,
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
      <h2 className="mb-2 text-sm font-semibold">
        {title} ({items.length})
      </h2>
      {loading ? (
        <div className="rounded-2xl border bg-card p-6 text-center text-xs text-muted-foreground">
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title={emptyMsg} />
      ) : (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="rounded-2xl border bg-card px-4 py-3">
              <Link
                href={linkPrefix(x)}
                className="flex items-center justify-between hover:text-primary"
              >
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

export default function CardSection() {
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<CardTabKey>("card");
  const [isUploading, setIsUploading] = useState(false);
  const { updateProfile } = useUpdateProfile();

  const [cropDialog, setCropDialog] = useState<{ src: string; file: File } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  if (!user) return null;

  const siteOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://yonsei-edtech.vercel.app";
  const qrUrl = `${siteOrigin}/profile/${user.id}?via=qr`;
  // 인쇄 명함 QR·뒷면 URL 은 영구 링크라 via 트래킹 파라미터 없이 깔끔한 공개 프로필 주소 사용.
  const profileUrl = `${siteOrigin}/profile/${user.id}`;

  function handlePhotoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropDialog({ src: reader.result as string, file });
    };
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!user || !cropDialog || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const blob = await getCroppedBlob(cropDialog.src, croppedAreaPixels);
      const croppedFile = new File(
        [blob],
        `profile-${user.id}-${Date.now()}.jpg`,
        { type: "image/jpeg" },
      );
      const { url } = await uploadToStorage(croppedFile, "images");
      await updateProfile({ id: user.id, data: { profileImage: url } });
      setUser({ ...user, profileImage: url });
      toast.success("프로필 사진을 업데이트했습니다.");
      setCropDialog(null);
    } catch (e) {
      toast.error(
        `사진 업로드에 실패했습니다: ${e instanceof Error ? e.message : "권한 또는 네트워크 오류"}`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  const CARD_TABS = [
    { key: "card" as const, label: "내 명함", icon: CreditCard },
    { key: "exchanges" as const, label: "교환 기록", icon: History },
    { key: "received" as const, label: "받은 명함", icon: BookUser },
  ];

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        QR·링크로 명함을 주고받고, 기록을 한곳에서 관리할 수 있어요.
      </p>

      {/* 서브탭 */}
      <nav className="mt-4 flex gap-1 border-b" aria-label="명함 서브탭">
        {CARD_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4">
        {tab === "card" ? (
          <CardTab
            user={user}
            qrUrl={qrUrl}
            profileUrl={profileUrl}
            handlePhotoUpload={handlePhotoUpload}
            isUploading={isUploading}
          />
        ) : tab === "exchanges" ? (
          <ExchangesTab userId={user.id} />
        ) : (
          <ReceivedCardsSection ownerId={user.id} />
        )}
      </div>

      {/* 크롭 다이얼로그 */}
      <Dialog
        open={!!cropDialog}
        onOpenChange={(open) => {
          if (!open && !isUploading) setCropDialog(null);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>프로필 사진 크롭</DialogTitle>
          </DialogHeader>

          {cropDialog && (
            <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
              <Cropper
                image={cropDialog.src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}

          <div className="px-1">
            <label className="mb-1 block text-xs text-muted-foreground">확대</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setCropDialog(null)}
            >
              취소
            </Button>
            <Button
              disabled={isUploading || !croppedAreaPixels}
              onClick={confirmCrop}
            >
              {isUploading ? "저장 중…" : "크롭하여 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
