// 모임·네트워킹 공통 헬퍼 (사이클 73)
import { CAT_CHIP_BARE } from "@/lib/design-tokens";
import type {
  NetworkingEvent,
  NetworkingRsvp,
  NetworkingDue,
  NetworkingSettlement,
  NetworkingEventType,
} from "@/types";

/** 행사 유형별 배지 색상 (Tailwind) */
export const EVENT_TYPE_COLORS: Record<NetworkingEventType, string> = {
  opening: CAT_CHIP_BARE.blue,
  closing: CAT_CHIP_BARE.violet,
  regular: CAT_CHIP_BARE.emerald,
  casual:  CAT_CHIP_BARE.amber,
  mt:      CAT_CHIP_BARE.rose,
  other:   CAT_CHIP_BARE.slate,
};

/** 행사가 지났는지 (종료일 또는 시작일 기준) */
export function isPastEvent(ev: NetworkingEvent, nowIso: string): boolean {
  const ref = ev.endAt || ev.startAt;
  return ref < nowIso;
}

/** 신청 마감 지났는지 */
export function isRsvpClosed(ev: NetworkingEvent, nowIso: string): boolean {
  if (ev.status === "closed" || ev.status === "cancelled" || ev.status === "done") return true;
  if (ev.rsvpDeadline) return ev.rsvpDeadline < nowIso;
  return ev.startAt < nowIso;
}

/** 정산 요약 — 참석자·회비 집계 (운영진 화면) */
export function computeSettlement(
  ev: NetworkingEvent,
  rsvps: NetworkingRsvp[],
  dues: NetworkingDue[],
): NetworkingSettlement {
  const attending = rsvps.filter((r) => r.status === "attending");
  const guestCount = attending.filter((r) => r.isGuest).length;
  const totalCompanions = attending.reduce((sum, r) => sum + (r.companions ?? 0), 0);
  const headcount = attending.length + totalCompanions;
  const paidAmount = dues
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const unpaidAmount = dues
    .filter((d) => d.status === "unpaid")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const exemptCount = dues.filter((d) => d.status === "exempt").length;
  return {
    attendingCount: attending.length,
    guestCount,
    totalCompanions,
    expectedRevenue: headcount * (ev.feeAmount ?? 0),
    paidAmount,
    unpaidAmount,
    exemptCount,
  };
}

/** ISO → "M월 D일(요일) HH:mm" (KST 가정, 클라이언트 로컬) */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}월 ${dd}일(${days[d.getDay()]}) ${hh}:${min}`;
}

export function formatWon(amount: number): string {
  return amount === 0 ? "무료" : `${amount.toLocaleString()}원`;
}

/**
 * 마감까지 남은 일수 라벨 (D-day). 참여 마찰 축소용 — 절대 날짜만으로는 긴박감·가시성이 낮다.
 * 자정(날짜) 기준으로 계산하고, 이미 지난 마감은 null(별도 '마감' 배지가 처리).
 * @returns "오늘 마감" | "내일 마감" | "D-3" | null
 */
export function ddayLabel(deadlineIso: string | undefined, nowIso: string): string | null {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso);
  const now = new Date(nowIso);
  if (isNaN(deadline.getTime()) || isNaN(now.getTime())) return null;
  if (deadline.getTime() < now.getTime()) return null; // 이미 마감
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(deadline) - startOfDay(now)) / 86_400_000);
  if (days <= 0) return "오늘 마감";
  if (days === 1) return "내일 마감";
  return `D-${days}`;
}
