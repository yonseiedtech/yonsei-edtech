"use client";

/**
 * 모임·행사 참석자 명단 (Phase 2-D — "누구를 만났나" 팔로업)
 *
 * 프라이버시 정책: 옵트인 기본값.
 *  - 명단은 해당 행사에 attending RSVP 한 회원끼리만 보임.
 *  - 명단에는 showInAttendeeList=true 로 공개에 동의한 회원만 노출.
 *  - 게스트(비회원)는 노출하지 않음.
 *
 * 팔로업: 이름 → /profile/[id], 쪽지 → /mypage/messages?compose=[id].
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, MessageSquare, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { networkingRsvpsApi } from "@/lib/bkend";
import type { NetworkingRsvp } from "@/types";

export default function AttendeeRoster({
  eventId,
  myRsvp,
  onChanged,
}: {
  eventId: string;
  /** 본인 RSVP — attending 이 아니면 명단 자체를 렌더하지 않음 (참석자끼리 원칙) */
  myRsvp?: NetworkingRsvp;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const amAttending = myRsvp?.status === "attending" && !!myRsvp.userId;

  const { data: rsvps = [] } = useQuery({
    queryKey: ["networking-roster", eventId],
    queryFn: async () => (await networkingRsvpsApi.listByEvent(eventId)).data as NetworkingRsvp[],
    enabled: amAttending,
    staleTime: 60_000,
  });

  if (!amAttending || !myRsvp) return null;

  const visible = rsvps.filter(
    (r) => r.status === "attending" && r.userId && r.showInAttendeeList && r.userId !== myRsvp.userId,
  );
  const optedIn = myRsvp.showInAttendeeList === true;

  async function toggleOptIn() {
    if (!myRsvp || busy) return;
    setBusy(true);
    try {
      await networkingRsvpsApi.update(myRsvp.id, {
        showInAttendeeList: !optedIn,
        updatedAt: new Date().toISOString(),
      });
      toast.success(!optedIn ? "참석자 명단에 프로필이 공개됩니다." : "명단 공개를 해제했습니다.");
      qc.invalidateQueries({ queryKey: ["networking-roster", eventId] });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "설정 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3.5 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Users size={13} />
          참석자 명단
          <span className="font-normal text-muted-foreground">(공개 동의 회원만, 참석자에게만 표시)</span>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={toggleOptIn}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
            optedIn
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-border bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          {optedIn ? <Eye size={11} /> : <EyeOff size={11} />}
          {optedIn ? "내 프로필 공개 중" : "명단에 내 프로필 공개"}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          아직 공개에 동의한 다른 참석자가 없습니다. 먼저 공개하면 서로를 찾기 쉬워져요.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {visible.map((r) => (
            <li
              key={r.id}
              className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2.5 pr-1 text-xs"
            >
              <Link
                href={`/profile/${r.userId}`}
                className="font-medium transition-colors hover:text-primary hover:underline"
              >
                {r.displayName}
              </Link>
              <Link
                href={`/mypage/messages?compose=${r.userId}`}
                aria-label={`${r.displayName}님에게 쪽지 보내기`}
                title="쪽지 보내기"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <MessageSquare size={11} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
