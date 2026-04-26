/**
 * CourseOffering.schedule 문자열 파서.
 *
 * 사용자가 콘솔에 입력하는 형식이 자유 텍스트(예: "월 18:30-21:00", "수목 19:00~21:30")라
 * 데이터 모델 변경 없이 파싱해 요일/시작·종료 시각을 추출한다.
 *
 * 파싱 실패 시 빈 weekdays 배열 또는 null 시간을 돌려준다 — UI 측에서 fallback 처리.
 *
 * 교시 표기 지원 (HH:MM 범위가 없을 때만 폴백):
 *   - 1교시 = 18:20~19:10
 *   - 2교시 = 19:10~20:00
 *   - 3교시 = 20:10~21:00
 *   - 4교시 = 21:00~21:50
 *   - 1,2교시 / 1·2교시 / 1-2교시 → 18:20~20:00
 *   - 3,4교시 / 3·4교시 / 3-4교시 → 20:10~21:50
 */

const DAY_TOKENS: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

export interface ParsedSchedule {
  /** 요일 인덱스 (0=일 ~ 6=토). 한 강의가 여러 요일에 열리는 경우 다수. */
  weekdays: number[];
  /** 시작 시각 — 자정 기준 분 단위 (예: 18:30 → 1110). null이면 시간 정보 없음. */
  startMin: number | null;
  /** 종료 시각 — 자정 기준 분 단위. null이면 시간 정보 없음. */
  endMin: number | null;
}

const EMPTY: ParsedSchedule = { weekdays: [], startMin: null, endMin: null };

/** 연세교육공학과 표준 교시별 시각 (자정 기준 분). */
export const PERIOD_TIMES: Record<number, { start: number; end: number }> = {
  1: { start: 18 * 60 + 20, end: 19 * 60 + 10 },
  2: { start: 19 * 60 + 10, end: 20 * 60 },
  3: { start: 20 * 60 + 10, end: 21 * 60 },
  4: { start: 21 * 60, end: 21 * 60 + 50 },
};

function timeToMin(hh: string, mm: string): number {
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/** 텍스트에서 교시 표기를 모두 찾아 정렬된 교시 번호 배열로 반환. */
function extractPeriods(text: string): number[] {
  const found = new Set<number>();
  // "1,2교시", "1·2교시", "1-2교시", "1교시", "1, 2교시" 등 모두 처리
  const pattern = /([1-4](?:\s*[,·\-~–—]\s*[1-4])*)\s*교\s*시/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const nums = m[1].split(/[,·\-~–—\s]+/).map((s) => Number(s));
    for (const n of nums) {
      if (n >= 1 && n <= 4) found.add(n);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}

/**
 * 자유 텍스트 schedule 문자열을 요일·시간으로 파싱.
 *
 * 지원 형식:
 *   "월 18:30-21:00"
 *   "월수 19:00~21:30"
 *   "화 18:30 - 21:00"
 *   "토 9:00~12:00"
 *   "월/수 18:30-21:00"
 *   "목 1,2교시" / "월 3·4교시" (HH:MM 없을 때 교시 → 시각 추론)
 *
 * 요일만 있고 시간이 없으면 weekdays만, 시간만 있으면 startMin/endMin만 채운다.
 */
export function parseSchedule(raw: string | undefined): ParsedSchedule {
  if (!raw) return EMPTY;
  const text = raw.trim();
  if (!text) return EMPTY;

  // 1) 요일 — 텍스트에 등장한 한글 요일을 모두 수집
  const weekdays: number[] = [];
  for (const ch of text) {
    const idx = DAY_TOKENS[ch];
    if (idx !== undefined && !weekdays.includes(idx)) {
      weekdays.push(idx);
    }
  }

  // 2) 시간 범위 — "HH:MM" 두 개를 - 또는 ~ 로 잇는 패턴
  const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*[-~–—]\s*(\d{1,2}):(\d{2})/);
  let startMin: number | null = null;
  let endMin: number | null = null;
  if (timeMatch) {
    const s = timeToMin(timeMatch[1], timeMatch[2]);
    const e = timeToMin(timeMatch[3], timeMatch[4]);
    if (s >= 0) startMin = s;
    if (e >= 0) endMin = e;
  } else {
    // 3) HH:MM 범위가 없으면 교시 표기 폴백
    const periods = extractPeriods(text);
    if (periods.length > 0) {
      const minP = periods[0];
      const maxP = periods[periods.length - 1];
      const s = PERIOD_TIMES[minP];
      const e = PERIOD_TIMES[maxP];
      if (s && e) {
        startMin = s.start;
        endMin = e.end;
      }
    }
  }

  return { weekdays, startMin, endMin };
}

/** ParsedSchedule이 특정 요일을 포함하는지. */
export function scheduleIncludesDay(parsed: ParsedSchedule, dayIndex: number): boolean {
  return parsed.weekdays.includes(dayIndex);
}

/** "HH:MM" 포맷 (분 단위 → 문자열) */
export function fmtMin(min: number | null): string {
  if (min === null) return "";
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** ParsedSchedule을 "HH:MM~HH:MM" 라벨로. 시간 없으면 빈 문자열. */
export function fmtTimeRange(parsed: ParsedSchedule): string {
  if (parsed.startMin === null || parsed.endMin === null) return "";
  return `${fmtMin(parsed.startMin)}~${fmtMin(parsed.endMin)}`;
}

/**
 * schedule 자유 텍스트에 교시 표기가 있고 HH:MM 범위가 없으면, 표준 시각으로 정규화.
 *
 * 사용처: /console/courses 의 "교시 → 시간 일괄 변환" 일괄 작업.
 *
 * 동작:
 *   - 이미 HH:MM 범위가 있으면 null 반환 (변경 불필요)
 *   - 교시 표기가 없으면 null
 *   - 교시 표기가 있으면 "{요일들} HH:MM~HH:MM" 형식으로 새 문자열 반환
 *     (요일 추출 실패 시 시간만 채워서 반환)
 */
export function normalizePeriodSchedule(raw: string | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  // 이미 HH:MM 범위가 있으면 변환 불필요
  if (/(\d{1,2}):(\d{2})\s*[-~–—]\s*(\d{1,2}):(\d{2})/.test(text)) return null;
  const periods = extractPeriods(text);
  if (periods.length === 0) return null;
  const minP = periods[0];
  const maxP = periods[periods.length - 1];
  const s = PERIOD_TIMES[minP];
  const e = PERIOD_TIMES[maxP];
  if (!s || !e) return null;

  const weekdays: number[] = [];
  for (const ch of text) {
    const idx = DAY_TOKENS[ch];
    if (idx !== undefined && !weekdays.includes(idx)) weekdays.push(idx);
  }
  const dayPart = weekdays
    .sort((a, b) => a - b)
    .map((d) => Object.keys(DAY_TOKENS).find((k) => DAY_TOKENS[k] === d) ?? "")
    .join("");
  const timePart = `${fmtMin(s.start)}~${fmtMin(e.end)}`;
  return [dayPart, timePart].filter(Boolean).join(" ");
}
