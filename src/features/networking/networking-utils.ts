// ── 일정 조율(poll) 집계 유틸 (사이클 124) ──
// 후보 기간/시간대 → 슬롯 목록, 응답 → 슬롯별 집계, 최다 가능일 추천.

import type { NetworkingAvailability, SlotTally } from "@/types";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 기간 내 날짜 목록 (YYYY-MM-DD, 양끝 포함) */
export function listDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  if (!startDate || !endDate) return out;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return out;
  // codex 리뷰(2026-07-08): toISOString() 은 UTC 변환 — KST 등 UTC+ 지역에서 날짜가 하루
  // 앞당겨지는 버그. ScheduleSelector.tsx listDates 와 동일하게 로컬 필드 조립으로 수정.
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
  }
  return out;
}

/** 후보 슬롯 목록 — 시간대 없으면 날짜만, 있으면 날짜×시간 */
/**
 * 시간대 미설정 이벤트 기본값 (2026-07-08) — timeSlots 비어 있으면 "날짜만 토글" 모드가 되어
 * 시간대 선택 팝업·시간대 집계가 아예 비활성되는 설계 공백이 있었음(사용자 리포트).
 * 후보 생성 단계에서 일괄 폴백해 투표 UI·공유 페이지·cron 자동확정이 항상 동일한 슬롯을 본다.
 */
export const DEFAULT_POLL_TIME_SLOTS = ["12:00", "15:00", "18:00", "19:00", "20:00"];

export function effectivePollTimeSlots(timeSlots?: string[]): string[] {
  return timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_POLL_TIME_SLOTS;
}

/**
 * 이벤트에서 평일·주말 슬롯을 폴백 규칙과 함께 뽑는다 (작업 2026-07-14).
 *  - 평일: pollTimeSlotsWeekday → (없으면) pollTimeSlots
 *  - 주말: pollTimeSlotsWeekend → (없으면) 평일 값
 * 반환값이 빈 배열이면 buildCandidateSlots 에서 DEFAULT_POLL_TIME_SLOTS 로 폴백된다.
 */
export function eventPollSlots(ev: {
  pollTimeSlots?: string[];
  pollTimeSlotsWeekday?: string[];
  pollTimeSlotsWeekend?: string[];
}): { weekday: string[]; weekend: string[] } {
  const weekday =
    ev.pollTimeSlotsWeekday && ev.pollTimeSlotsWeekday.length > 0
      ? ev.pollTimeSlotsWeekday
      : ev.pollTimeSlots ?? [];
  const weekend =
    ev.pollTimeSlotsWeekend && ev.pollTimeSlotsWeekend.length > 0
      ? ev.pollTimeSlotsWeekend
      : weekday;
  return { weekday, weekend };
}

/**
 * 후보 슬롯 목록 — 날짜×시간 전개.
 * weekdaySlots(3번째, 평일/공통) · weekendSlots(4번째, 주말 옵셔널).
 * 각 날짜의 getDay() 로 토(6)·일(0) 이면 weekendSlots(있으면) 아니면 weekdaySlots 를 쓴다.
 * 4번째 미전달 시 모든 날짜가 weekdaySlots 를 쓰므로 기존 caller(3-인자 호출)와 동작이 동일하다.
 * 요일 판정은 listDates·formatSlotLabel 과 동일하게 로컬 필드 파싱(`${d}T00:00:00`) 기준.
 */
export function buildCandidateSlots(
  periodStart: string,
  periodEnd: string,
  weekdaySlots?: string[],
  weekendSlots?: string[],
): string[] {
  const dates = listDates(periodStart, periodEnd);
  const weekday = effectivePollTimeSlots(weekdaySlots);
  const weekend = weekendSlots && weekendSlots.length > 0 ? weekendSlots : null;
  return dates.flatMap((d) => {
    const dow = new Date(`${d}T00:00:00`).getDay();
    const times = weekend && (dow === 0 || dow === 6) ? weekend : weekday;
    return times.map((t) => `${d}|${t}`);
  });
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

/**
 * 슬롯 → 확정 시각(ISO). 운영진 수동 확정(NetworkingPoll.tsx confirmM)과 cron 자동 확정
 * (cron/networking-reminder) 양쪽에서 공용으로 사용.
 * codex 리뷰(2026-07-08): pollTimeSlots 는 EventEditorForm 에서 "저녁, 오후" 같은 자유 텍스트도
 * 허용하므로 `new Date(\`\${date}T\${time}:00\`)` 가 RangeError 로 터질 수 있다.
 * "HH:MM" 형식일 때만 사용하고, 아니면 18:00 기본값으로 안전 폴백한다.
 */
export function resolveSlotStartAt(slot: string): string {
  const [date, time] = slot.split("|");
  const safeTime = time && /^\d{1,2}:\d{2}$/.test(time) ? time : "18:00";
  return new Date(`${date}T${safeTime}:00`).toISOString();
}
