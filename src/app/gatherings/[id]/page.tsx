"use client";

/**
 * 모임·행사 상세 페이지 — /gatherings/[id] (목록/상세 분리 개편 2026-07-19).
 * 목록(/gatherings)의 카드를 클릭하면 이 페이지로 진입한다. 모임 정보·주최자·참여 대상/참석자·
 * 일정 조율 투표·RSVP 를 단일 컬럼 상세로 보여준다. 렌더는 GatheringDetail 을 재사용한다.
 * (비공개 공유 링크 /gatherings/p/[token] 과 동일 컴포넌트 — 로직 복제 없음.)
 */

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, ArrowLeft } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi, albumsApi } from "@/lib/bkend";
import type { NetworkingEvent, NetworkingRsvp, NetworkingDue, PhotoAlbum } from "@/types";
import { isPastEvent } from "@/features/networking/networking-helpers";
import GatheringDetail from "@/features/networking/GatheringDetail";

export default function GatheringDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nowIso = new Date().toISOString();
  const canManage = isStaffOrAbove(user);

  const { data: event, isLoading } = useQuery({
    queryKey: ["networking-event", id],
    queryFn: async () => {
      try {
        return await networkingEventsApi.get(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
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
  const past = useMemo(
    () => (event ? isPastEvent(event as NetworkingEvent, nowIso) : false),
    [event, nowIso],
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

      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-2xl" />
      ) : !event ? (
        <EmptyState
          icon={CalendarX2}
          title="존재하지 않거나 삭제된 모임입니다"
          description="링크가 올바른지 확인하거나, 모임·행사 목록에서 다시 찾아보세요."
          actions={[{ label: "모임·행사 목록", href: "/gatherings", variant: "outline" }]}
        />
      ) : (
        <GatheringDetail
          ev={event as NetworkingEvent}
          nowIso={nowIso}
          isMember={!!user}
          myRsvp={myRsvp}
          myDue={myDue}
          album={album}
          onChanged={refresh}
          canManage={canManage}
          past={past}
        />
      )}
    </PageContainer>
  );
}
