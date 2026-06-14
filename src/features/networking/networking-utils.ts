// ── 일정 조율(poll) 집계 유틸 (사이클 124) ──
// 후보 기간/시간대 → 슬롯 목록, 응답 → 슬롯별 집계, 최다 가능일 추천.

import type { NetworkingAvailability, SlotTally } from "@/types";

/** 기간 내 날짜 목록 (YYYY-MM-DD, 양끝 포함) */
export function listDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  if (!startDate || !endDate) return out;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return out;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** 후보 슬롯 목록 — 시간대 없으면 날짜만, 있으면 날짜×시간 */
export function buildCandidateSlots(
  periodStart: string,
  periodEnd: string,
  timeSlots?: string[],
): string[] {
  const dates = listDates(periodStart, periodEnd);
  if (!timeSlots || timeSlots.length === 0) return dates;
  return dates.flatMap((d) => timeSlots.map((t) => `${d}|${t}`));
}

/** 응답 → 슬롯별 집계 (실시간 히트맵용) */
export function tallyAvailability(
  responses: NetworkingAvailability[],
  candidateSlots: string[],
): SlotTally[] {
  const map = new Map<string, string[]>();
  for (const slot of candidateSlots) map.set(slot, []);
  for (const r of responses) {
    for (const slot of r.availableSlots) {
      const names = map.get(slot);
      if (names) names.push(r.userName);
    }
  }
  return candidateSlots.map((slot) => {
    const [date, time] = slot.split("|");
    const names = map.get(slot) ?? [];
    return { slot, date, time, count: names.length, names };
  });
}

/** 최다 가능 슬롯 (동률 시 빠른 날짜 우선). 응답 0이면 빈 배열 */
export function bestSlots(tallies: SlotTally[]): SlotTally[] {
  const max = Math.max(0, ...tallies.map((t) => t.count));
  if (max === 0) return [];
  return tallies
    .filter((t) => t.count === max)
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

/** 슬롯 라벨 (YYYY-MM-DD|HH:MM → "6/15(일) 18:00") */
export function formatSlotLabel(slot: string): string {
  const [date, time] = slot.split("|");
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return slot;
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const base = `${d.getMonth() + 1}/${d.getDate()}(${dow})`;
  return time ? `${base} ${time}` : base;
}
