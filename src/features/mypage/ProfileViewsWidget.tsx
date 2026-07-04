"use client";

/**
 * 최근 7일 프로필 조회 위젯 (RT-3, 2026-07-04)
 *
 * profile_views 는 채널별로 성실히 수집되고 있었지만 listByProfile 소비처가 0곳 —
 * 수집된 사회적 신호가 본인에게조차 노출되지 않던 문제(리텐션 재감사).
 * 최근 7일 조회 수 + 채널 분포를 보여준다. 조회 0회면 렌더하지 않는다.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { profileViewsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { ProfileView } from "@/types";

const CHANNEL_LABELS: Record<string, string> = {
  qr: "QR 명함",
  link: "링크 공유",
  members: "멤버 목록",
  direct: "직접 방문",
};

export default function ProfileViewsWidget() {
  const { user } = useAuthStore();
  const { data: viewsRes } = useQuery({
    queryKey: ["profile-views-mine", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => (await profileViewsApi.listByProfile(user!.id)).data as ProfileView[],
  });

  const recent = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (viewsRes ?? []).filter(
      (v) => v.viewerId !== user?.id && v.createdAt && new Date(v.createdAt).getTime() >= cutoff,
    );
  }, [viewsRes, user?.id]);

  const byChannel = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of recent) m.set(v.channel, (m.get(v.channel) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [recent]);

  if (!user || recent.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-foreground/90">
        <Eye size={14} className="text-primary" />
        최근 7일 내 프로필 조회 <span className="font-bold text-primary">{recent.length}회</span>
      </span>
      <span className="flex flex-wrap gap-1">
        {byChannel.map(([ch, n]) => (
          <span key={ch} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {CHANNEL_LABELS[ch] ?? ch} {n}
          </span>
        ))}
      </span>
    </div>
  );
}
