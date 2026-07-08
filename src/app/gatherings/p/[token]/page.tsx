"use client";

/**
 * 비공개 모임 공유 링크 페이지 — /gatherings/p/[token]
 * shareToken 으로 이벤트를 조회해 상세 + RSVP 를 제공한다. (공개 목록엔 노출되지 않음)
 * 카드 렌더는 /gatherings 목록과 동일한 GatheringEventCard 를 재사용한다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Link2Off, ArrowLeft } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi, albumsApi } from "@/lib/bkend";
import type { NetworkingEvent, NetworkingRsvp, NetworkingDue, PhotoAlbum } from "@/types";
import GatheringEventCard from "@/features/networking/GatheringEventCard";

export default function PrivateGatheringPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nowIso = new Date().toISOString();
  const canManage = isStaffOrAbove(user);

  const { data: event, isLoading } = useQuery({
    queryKey: ["networking-event-by-token", token],
    queryFn: async () => {
      const res = await networkingEventsApi.getByToken(token);
      return (res.data as NetworkingEvent[])[0] ?? null;
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ["networking-rsvps", user?.id],
    queryFn: async () => (await networkingRsvpsApi.listByUser(user!.id)).data as NetworkingRsvp[],
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const { data: myDues = [] } = useQuery({
    queryKey: ["networking-dues", user?.id],
    queryFn: async () => (await networkingDuesApi.listByUser(user!.id)).data as NetworkingDue[],
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const { data: albums = [] } = useQuery({
    queryKey: ["albums-for-gatherings"],
    queryFn: async () => (await albumsApi.list()).data as unknown as PhotoAlbum[],
    staleTime: 5 * 60_000,
  });

  const myRsvp = useMemo(
    () => (event ? myRsvps.find((r) => r.eventId === event.id) : undefined),
    [myRsvps, event],
  );
  const myDue = useMemo(
    () => (event ? myDues.find((d) => d.eventId === event.id) : undefined),
    [myDues, event],
  );
  const album = useMemo(
    () => (event ? albums.find((a) => a.networkingEventId === event.id) : undefined),
    [albums, event],
  );

  function refresh() {
    qc.invalidateQueries({ queryKey: ["networking-rsvps", user?.id] });
  }

  return (
    <PageContainer width="default">
      <Link
        href="/gatherings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> 모임·행사로 돌아가기
      </Link>

      <PageHeader
        icon={Users}
        title="비공개 모임"
        description="공유 링크로 접근한 비공개 모임입니다. 참석 신청과 세부 정보를 확인하세요."
      />

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-2xl" />
        ) : !event ? (
          <EmptyState
            icon={Link2Off}
            title="존재하지 않거나 만료된 링크입니다"
            description="링크가 올바른지 확인하거나, 모임 주최자에게 새 링크를 요청해주세요."
            actions={[{ label: "모임·행사 둘러보기", href: "/gatherings", variant: "outline" }]}
          />
        ) : (
          <GatheringEventCard
            ev={event}
            nowIso={nowIso}
            isMember={!!user}
            myRsvp={myRsvp}
            myDue={myDue}
            album={album}
            onChanged={refresh}
            canManage={canManage}
          />
        )}
      </div>
    </PageContainer>
  );
}
