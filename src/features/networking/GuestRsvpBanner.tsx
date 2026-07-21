"use client";

/**
 * 게스트 신청 확인·취소 배너 (G7, 2026-07-09).
 * `/gatherings?guest_rsvp={관리토큰}` 로 접근한 게스트가 로그인 없이 본인 신청을
 * 조회하고 취소한다. 토큰은 window.location 에서 직접 읽어 useSearchParams Suspense 요구를 회피.
 */

import { useEffect, useState } from "react";
import { CalendarDays, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RSVP_STATUS_LABELS, type RsvpStatus } from "@/types";
import { formatEventDate } from "@/features/networking/networking-helpers";

interface GuestData {
  eventTitle: string;
  eventStartAt: string;
  status: RsvpStatus;
  guestName: string;
  companions: number;
}

export default function GuestRsvpBanner() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("guest_rsvp");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/networking/rsvp-guest?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const j = (await res.json()) as {
          rsvp: { status: RsvpStatus; guestName: string; companions: number };
          eventTitle: string;
          eventStartAt: string;
        };
        setData({
          eventTitle: j.eventTitle,
          eventStartAt: j.eventStartAt,
          status: j.rsvp.status,
          guestName: j.rsvp.guestName,
          companions: j.rsvp.companions,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function cancel() {
    if (!token) return;
    if (!window.confirm("게스트 참석 신청을 취소하시겠어요?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/networking/rsvp-guest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "취소에 실패했습니다.");
      }
      setCancelled(true);
      toast.success("게스트 신청을 취소했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "취소에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  return (
    <div className="mb-6 rounded-2xl border border-cat-1/30 bg-cat-1/10 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-cat-1">
        <Info size={15} /> 게스트 신청 확인
      </p>
      {loading && !data ? (
        <p className="mt-2 text-xs text-muted-foreground">신청 정보를 불러오는 중…</p>
      ) : notFound ? (
        <p className="mt-2 text-xs text-muted-foreground">신청을 찾을 수 없습니다. 링크가 만료되었거나 이미 취소되었습니다.</p>
      ) : cancelled ? (
        <p className="mt-2 text-xs text-muted-foreground">신청이 취소되었습니다.</p>
      ) : data ? (
        <div className="mt-2 space-y-2">
          <div className="text-sm">
            <p className="font-medium">{data.eventTitle || "모임"}</p>
            {data.eventStartAt && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays size={12} /> {formatEventDate(data.eventStartAt)}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.guestName} 님 · 상태 <span className="font-medium text-foreground">{RSVP_STATUS_LABELS[data.status]}</span>
            {data.companions > 0 ? ` · 동반 ${data.companions}명` : ""}
          </p>
          <Button size="sm" variant="outline" disabled={loading} onClick={cancel}>
            신청 취소
          </Button>
        </div>
      ) : null}
    </div>
  );
}
