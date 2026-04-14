"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Users } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import type { BusinessCardExchange } from "@/types";

interface ExchangeGroup {
  received: BusinessCardExchange[]; // 내가 받은 명함 (나=receiver)
  given: BusinessCardExchange[];    // 내 명함이 전달됨 (나=owner)
}

function parseDocs(snap: Awaited<ReturnType<typeof getDocs>>): BusinessCardExchange[] {
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown> & { createdAt?: { toDate?: () => Date } };
    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
    return { id: d.id, ...data, createdAt } as BusinessCardExchange;
  });
}

function ExchangesInner() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery<ExchangeGroup>({
    queryKey: ["card-exchanges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const col = collection(db, "business_card_exchanges");
      const [receivedSnap, givenSnap] = await Promise.all([
        getDocs(query(col, where("receiverId", "==", user!.id), orderBy("createdAt", "desc"))),
        getDocs(query(col, where("ownerId", "==", user!.id), orderBy("createdAt", "desc"))),
      ]);
      return { received: parseDocs(receivedSnap), given: parseDocs(givenSnap) };
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <Link href="/mypage/card" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />내 명함
        </Link>
        <h1 className="mt-2 text-2xl font-bold">명함 교환 기록</h1>
        <p className="mt-1 text-sm text-muted-foreground">QR 스캔이나 공유 링크로 주고받은 명함 내역이에요.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Section
            title="내가 받은 명함"
            items={data?.received ?? []}
            emptyMsg="아직 받은 명함이 없습니다."
            loading={isLoading}
            nameKey="ownerName"
            linkPrefix={(x) => `/directory/${x.ownerId}/card`}
          />
          <Section
            title="내 명함을 받은 사람"
            items={data?.given ?? []}
            emptyMsg="아직 명함을 나눈 기록이 없습니다."
            loading={isLoading}
            nameKey="receiverName"
            linkPrefix={(x) => `/directory/${x.receiverId}/card`}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
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
        <div className="rounded-xl border bg-white p-6 text-center text-xs text-muted-foreground">불러오는 중…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title={emptyMsg} />
      ) : (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="rounded-xl border bg-white px-4 py-3">
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

export default function ExchangesPage() {
  return (
    <AuthGuard>
      <ExchangesInner />
    </AuthGuard>
  );
}
