/**
 * 알림 발송 시점 판정 — 벤치마크 H6 (Duolingo: 조용한 시간 + 개인 최적 발송 시각).
 *
 * 모두 순수 함수(부수효과·I/O 없음)로, 서버 cron(UTC 실행)·클라이언트(KST) 양쪽에서
 * 동일하게 동작한다. 시간대 계산은 dday.ts 와 동일한 UTC+9h 오프셋 방식을 사용한다.
 *
 * 정책 요약
 *  - 조용한 시간(quiet hours): 회원이 지정한 구간(기본 22:00~08:00 KST)에 발송 시각이
 *    들어가면 해당 회원에게는 그 회차 발송을 **스킵**한다(지연 재큐 인프라 부재 —
 *    cron 은 하루 1회 고정 시각 발송이라 "다음 허용 시각으로 지연"은 저비용이 아님).
 *    현재 모든 push/digest cron 은 09:00 KST 고정 발송이라, 기본 구간(22–08)과 겹치지
 *    않으므로 기본 상태에서는 아무도 스킵되지 않는다(무회귀). 회원이 조용한 시간을
 *    09시대까지 넓힌 경우에만 실제로 스킵된다.
 *  - 개인 최적 발송 시각(경량): 활동 로그의 KST 시(hour) 분포로 오전/점심/오후/저녁
 *    4구간 중 최빈 구간을 계산하는 순수 함수만 제공한다. digest 반영은 고정 시각 cron
 *    구조상 저비용이 아니므로 본 단계에서는 함수만 노출하고 배선하지 않는다(보고서 참조).
 */

/** 회원별 조용한 시간 설정. NotificationPrefs.quietHours 에 저장. */
export interface QuietHoursConfig {
  /** 명시 false 일 때만 비활성. undefined/true → 활성(기본값 적용) */
  enabled?: boolean;
  /** "HH:MM" KST. 미지정 시 DEFAULT_QUIET_HOURS.start */
  start?: string;
  /** "HH:MM" KST. 미지정 시 DEFAULT_QUIET_HOURS.end */
  end?: string;
}

/** 기본 조용한 시간 구간 (KST) */
export const DEFAULT_QUIET_HOURS = { start: "22:00", end: "08:00" } as const;

/** "HH:MM" → 자정 기준 분(0~1439). 형식 오류 시 null. */
export function parseHmToMinutes(hm: string | undefined): number | null {
  if (!hm || typeof hm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 분(0~1439) → "HH:MM" */
export function minutesToHm(minutes: number): string {
  const t = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 주어진 시각의 KST 자정 기준 분(0~1439). 서버(UTC)에서도 정확. */
export function kstMinutesOfDay(now: Date = new Date()): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

/** 주어진 시각의 KST 시(0~23). */
export function kstHour(now: Date = new Date()): number {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
}

/**
 * 설정을 유효값으로 정규화. enabled=false 로 명시된 경우에만 비활성.
 * start/end 파싱 실패 시 기본값으로 대체.
 */
export function resolveQuietHours(cfg?: QuietHoursConfig | null): {
  enabled: boolean;
  startMin: number;
  endMin: number;
} {
  const enabled = cfg?.enabled !== false;
  const startMin = parseHmToMinutes(cfg?.start) ?? parseHmToMinutes(DEFAULT_QUIET_HOURS.start)!;
  const endMin = parseHmToMinutes(cfg?.end) ?? parseHmToMinutes(DEFAULT_QUIET_HOURS.end)!;
  return { enabled, startMin, endMin };
}

/**
 * KST 기준으로 지정 시각이 조용한 시간 구간에 속하는지.
 * 구간이 자정을 넘어가는 경우(예: 22:00~08:00)도 정확히 처리한다.
 * start === end 이면 "구간 없음"으로 보고 항상 false(24시간 무음 방지).
 */
export function isWithinQuietHours(cfg: QuietHoursConfig | null | undefined, now: Date = new Date()): boolean {
  const { enabled, startMin, endMin } = resolveQuietHours(cfg);
  if (!enabled) return false;
  if (startMin === endMin) return false;
  const t = kstMinutesOfDay(now);
  if (startMin < endMin) {
    // 같은 날 안의 구간 (예: 01:00~06:00)
    return t >= startMin && t < endMin;
  }
  // 자정을 넘는 구간 (예: 22:00~08:00)
  return t >= startMin || t < endMin;
}

/**
 * 조용한 시간으로 인해 해당 시각의 push/이메일 발송을 억제해야 하는지.
 * (현 정책은 지연 재큐가 아닌 스킵이므로 isWithinQuietHours 와 동일 의미의 의도 명시 래퍼)
 */
export function shouldSuppressForQuietHours(
  cfg: QuietHoursConfig | null | undefined,
  now: Date = new Date(),
): boolean {
  return isWithinQuietHours(cfg, now);
}

// ─────────────────────────────────────────────────────────────
// 개인 최적 발송 시각 (경량) — 활동 로그 기반 최빈 활동 구간
// ─────────────────────────────────────────────────────────────

/** 하루를 4구간으로 단순화 */
export type ActivityWindow = "morning" | "lunch" | "afternoon" | "evening";

const ACTIVITY_WINDOW_LABELS: Record<ActivityWindow, string> = {
  morning: "오전",
  lunch: "점심",
  afternoon: "오후",
  evening: "저녁",
};

/** 각 구간의 대표 발송 시각(KST, "HH:MM") — 추후 개인화 발송 배선 시 사용 */
const ACTIVITY_WINDOW_SEND_HM: Record<ActivityWindow, string> = {
  morning: "09:00",
  lunch: "12:30",
  afternoon: "15:00",
  evening: "20:00",
};

/** KST 시(0~23) → 4구간. 저녁은 18~04시(야간 연구 리듬 포함)로 넓게 잡는다. */
export function hourToWindow(hour: number): ActivityWindow {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 14 && h < 18) return "afternoon";
  return "evening"; // 18~23, 0~4
}

/**
 * 활동 로그(ISO createdAt 문자열들)로 회원의 최빈 활동 구간을 계산.
 * 로그가 없으면 null. 동률이면 morning→lunch→afternoon→evening 우선순위로 결정(결정론).
 */
export function computePeakWindow(isoTimestamps: readonly string[]): ActivityWindow | null {
  if (!isoTimestamps || isoTimestamps.length === 0) return null;
  const counts: Record<ActivityWindow, number> = { morning: 0, lunch: 0, afternoon: 0, evening: 0 };
  let valid = 0;
  for (const iso of isoTimestamps) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    counts[hourToWindow(kstHour(d))] += 1;
    valid += 1;
  }
  if (valid === 0) return null;
  const order: ActivityWindow[] = ["morning", "lunch", "afternoon", "evening"];
  let best: ActivityWindow = "morning";
  let bestCount = -1;
  for (const w of order) {
    if (counts[w] > bestCount) {
      best = w;
      bestCount = counts[w];
    }
  }
  return best;
}
