"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { ArrowLeft, CreditCard, Mail, Phone, Briefcase, GraduationCap, UserPlus } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { profilesApi } from "@/lib/bkend";
import { db } from "@/lib/firebase";
import { downloadVCard, userToContact } from "@/features/card/vcard";
import { formatGeneration } from "@/lib/utils";
import type { User } from "@/types";
import { toast } from "sonner";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const viewer = useAuthStore((s) => s.user);
  const ownerId = params.id;
  const exchangeLoggedRef = useRef(false);

  const { data: owner, isLoading, error } = useQuery({
    queryKey: ["user-profile", ownerId],
    queryFn: async () => (await profilesApi.get(ownerId)) as unknown as User,
    enabled: !!ownerId,
    retry: false,
  });

  // QR/링크 스캔으로 들어온 경우 교환 기록 자동 생성 (로그인 필수)
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
        /* ignore — 규칙 거부/네트워크 오류 */
      }
    })();
  }, [viewer, owner, search]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">프로필을 불러오는 중…</div>;
  }
  if (error || !owner) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">프로필을 찾을 수 없습니다.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">홈으로</Link>
      </div>
    );
  }

  const gen = formatGeneration(owner.generation, owner.enrollmentYear, owner.enrollmentHalf);
  const affiliationLine = [owner.affiliation, owner.department].filter(Boolean).join(" · ");
  const isSelf = viewer?.id === owner.id;
  const canShowContact = isSelf || owner.contactVisibility !== "private";

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 flex items-center gap-2">
          <Link href={viewer ? "/directory" : "/"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />{viewer ? "회원 목록" : "홈"}
          </Link>
        </div>

        {/* 헤더: 프로필 사진 + 이름 + 기수 */}
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-primary/10 ring-4 ring-white">
            {owner.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={owner.profileImage} alt={owner.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                {owner.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold">{owner.name}</h1>
          {gen && <p className="mt-1 text-sm font-semibold text-primary">{gen}</p>}
          {owner.position && <p className="mt-1 text-sm text-slate-600">{owner.position}</p>}
          {affiliationLine && <p className="mt-0.5 text-xs text-slate-500">{affiliationLine}</p>}
          {owner.field && <p className="mt-2 text-xs italic text-slate-500">#{owner.field}</p>}
        </div>

        {/* 소개 */}
        {owner.bio && (
          <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold text-muted-foreground">소개</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{owner.bio}</p>
          </section>
        )}

        {/* 상세 정보 */}
        <section className="mt-4 space-y-2 rounded-2xl border bg-white p-5 shadow-sm">
          {owner.affiliation && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Briefcase size={14} className="text-muted-foreground" />
              <span>{[owner.affiliation, owner.department, owner.position].filter(Boolean).join(" · ")}</span>
            </div>
          )}
          {gen && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <GraduationCap size={14} className="text-muted-foreground" />
              <span>{gen}</span>
            </div>
          )}
          {canShowContact && (owner.contactEmail || owner.email) && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Mail size={14} className="text-muted-foreground" />
              <a href={`mailto:${owner.contactEmail ?? owner.email}`} className="hover:text-primary">
                {owner.contactEmail ?? owner.email}
              </a>
            </div>
          )}
          {canShowContact && owner.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Phone size={14} className="text-muted-foreground" />
              <a href={`tel:${owner.phone}`} className="hover:text-primary">{owner.phone}</a>
            </div>
          )}
        </section>

        {/* 액션 */}
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href={`/directory/${owner.id}/card`}>
              <CreditCard size={16} className="mr-1" />명함 보기
            </Link>
          </Button>
          <Button onClick={() => downloadVCard(userToContact(owner))}>
            <UserPlus size={16} className="mr-1" />연락처 저장(vCard)
          </Button>
        </div>

        {!viewer && (
          <p className="mt-6 rounded-xl border border-dashed bg-white p-3 text-center text-xs text-muted-foreground">
            연세교육공학회 회원이신가요? <Link href="/login" className="text-primary underline">로그인</Link>하면 명함을 주고받은 기록이 저장됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
