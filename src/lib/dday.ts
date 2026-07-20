/**
 * D-day 계산 헬퍼
 *
 * - 미래: `D-N`
 * - 오늘: `D-day · H시간 M분 남음` (dueTime 미지정 시 23:59 기준 잔여)
 * - 지남: `D+N · 지남`
 */

export type DdayKind = "future" | "today" | "past";

export interface DdayInfo {
  kind: DdayKind;
  /** 양수: 미래, 0: 오늘, 음수: 과거 */
  diffDays: number;
  /** 표시용 라벨 (예: "D-3", "D-day · 5시간 30분 남음", "D+2 · 지남") */
  label: string;
  /** 오늘 한정 — 마감까지 남은 분 (23:59 또는 dueTime 기준) */
  remainingMinutes?: number;
}

function ymdToParts(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function diffInDays(target: Date, base: Date): number {
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}

/**
 * 마감일(dueDate) 기준 D-day 정보 계산.
 * @param dueDate YYYY-MM-DD
 * @param dueTime HH:MM (선택) — 오늘 마감일일 때만 사용
 * @param now 기준 시각 (테스트용)
 */
export function formatDday(
  dueDate: string,
  dueTime?: string,
  now: Date = new Date(),
): DdayInfo | null {
  const parts = ymdToParts(dueDate);
  if (!parts) return null;
  const target = new Date(parts.y, parts.m - 1, parts.d);
  const diff = diffInDays(target, now);

  if (diff > 0) {
    return { kind: "future", diffDays: diff, label: `D-${diff}` };
  }

  if (diff === 0) {
    let endHour = 23;
    let endMin = 59;
    if (dueTime) {
      const tm = /^(\d{1,2}):(\d{2})$/.exec(dueTime);
      if (tm) {
        endHour = Math.min(23, Math.max(0, Number(tm[1])));
        endMin = Math.min(59, Math.max(0, Number(tm[2])));
      }
    }
    const end = new Date(parts.y, parts.m - 1, parts.d, endHour, endMin, 0);
    const remainMs = end.getTime() - now.getTime();
    if (remainMs <= 0) {
      return {
        kind: "today",
        diffDays: 0,
        label: "D-day · 마감 임박",
        remainingMinutes: 0,
      };
    }
    const remainMin = Math.floor(remainMs / 60_000);
    const h = Math.floor(remainMin / 60);
    const m = remainMin % 60;
    const partsLabel =
      h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
    return {
      kind: "today",
      diffDays: 0,
      label: `D-day · ${partsLabel}`,
      remainingMinutes: remainMin,
    };
  }

  const overdue = -diff;
  return { kind: "past", diffDays: diff, label: `D+${overdue} · 지남` };
}

export function isDueToday(dueDate?: string | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  const parts = ymdToParts(dueDate);
  if (!parts) return false;
  const target = new Date(parts.y, parts.m - 1, parts.d);
  return diffInDays(target, now) === 0;
}

export function todayYmdLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Asia/Seoul 시간대 기준 YYYY-MM-DD.
 * 서버사이드(Vercel = UTC)에서 KST 날짜를 정확히 얻기 위해 사용.
 * 클라이언트(브라우저=KST)에서도 안전하게 동작.
 */
export function todayYmdKst(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** KST 기준 어제 날짜(YYYY-MM-DD). 서버사이드(UTC)에서도 정확. */
/** ISO(UTC) 문자열 → KST 날짜 YYYY-MM-DD. slice(0,10) 대체 — UTC/KST 하루 오차 방지.
 *  Defensive: Firestore Admin SDK가 런타임에 Timestamp 객체({seconds, toDate, _seconds})를
 *  반환할 수 있음(member-stage.ts parseCreatedAtMs·weekly-digest anyToYmdKst 동일 패턴).
 */
export function isoToKstYmd(iso: string): string {
  if (typeof iso !== "string") {
    const ts = iso as unknown as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof ts?.toDate === "function") return todayYmdKst(ts.toDate());
    const secs = typeof ts?._seconds === "number" ? ts._seconds : ts?.seconds;
    if (typeof secs === "number")
      return new Date(secs * 1_000 + 9 * 3_600_000).toISOString().slice(0, 10);
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** ISO(UTC) 문자열 → KST 시각 HH:MM. slice(11,16) 대체. */
export function isoToKstHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export function yesterdayYmdKst(now: Date = new Date()): string {
  const [y, m, d] = todayYmdKst(now).split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d));
  prev.setUTCDate(prev.getUTCDate() - 1);
  return `${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}-${pad2(prev.getUTCDate())}`;
}

/** KST 기준 내일 날짜(YYYY-MM-DD). 서버사이드(UTC)에서도 정확. */
export function tomorrowYmdKst(now: Date = new Date()): string {
  const [y, m, d] = todayYmdKst(now).split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}
