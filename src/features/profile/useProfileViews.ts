"use client";

import { useEffect, useRef } from "react";
import { profileViewsApi } from "@/lib/bkend";
import type { ProfileViewChannel } from "@/types";

interface Args {
  profileId: string | undefined;
  viewerId: string | undefined;
  channel: ProfileViewChannel;
  /** 본인이 자기 페이지를 보면 logging 하지 않음 */
  isSelf: boolean;
}

/**
 * 페이지 마운트 시 view 1회 로깅 (세션 내 중복 방지).
 * 본인이 자기 페이지를 보는 경우는 로깅하지 않는다.
 */
export function useProfileViews({ profileId, viewerId, channel, isSelf }: Args) {
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    if (isSelf) return;
    const sig = `${profileId}::${viewerId ?? "anon"}::${channel}`;
    if (loggedRef.current === sig) return;
    loggedRef.current = sig;

    profileViewsApi.log({
      profileId,
      viewerId,
      channel,
    }).catch(() => {
      /* 통계용 — 실패해도 무시 */
    });
  }, [profileId, viewerId, channel, isSelf]);
}
