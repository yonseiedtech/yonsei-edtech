/**
 * CourseOffering.schedule 문자열 파서.
 *
 * 사용자가 콘솔에 입력하는 형식이 자유 텍스트(예: "월 18:30-21:00", "수목 19:00~21:30")라
 * 데이터 모델 변경 없이 파싱해 요일/시작·종료 시각을 추출한다.
 *
 * 파싱 실패 시 빈 weekdays 배열 또는 null 시간을 돌려준다 — UI 측에서 fallback 처리.
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

function timeToMin(hh: string, mm: string): number {
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
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
