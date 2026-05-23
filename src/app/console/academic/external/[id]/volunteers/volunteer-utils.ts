/**
 * 자원봉사자 운영 콘솔 — 공용 유틸 (Sprint: 봉사자 운영 도구 고도화).
 *
 * - 신청자(activity_applicants) ↔ 배정(volunteer_assignments) 매칭
 * - schedule 답변(가능 시간대) 슬롯 집계
 * - duty id 생성
 */

import type {
  Activity,
  ApplicantEntry,
  FormField,
  ScheduleSlot,
  VolunteerAssignment,
  VolunteerRoleKey,
} from "@/types";

export const ALL_AVAILABLE_MARKER = "__ALL__";
export const RESTRICTED_MARKER = "__RESTRICTED__";

/** 이름 비교용 정규화 (공백 제거 + 소문자) */
export function normalizeName(name: string | undefined | null): string {
  return (name ?? "").replace(/\s+/g, "").toLowerCase();
}

/** 고유 id 생성 (guest assignment 등) */
export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * duty 고유 id 생성.
 * Date.now()+random 은 같은 ms 내 동시 생성 시 충돌 가능 →
 * 충돌 확률이 사실상 0 인 crypto.randomUUID() 를 사용한다.
 */
export function dutyId(): string {
  return `d_${crypto.randomUUID()}`;
}

/**
 * 신청자 식별 키 (목록 React key 용).
 * userId/guestKey/email 같은 안정 식별자가 모두 없을 때는 name_appliedAt
 * 폴백이 동명+동일 appliedAt 시 충돌할 수 있으므로, 호출 측에서 배열 인덱스를
 * 보조 인자로 넘기면 폴백 키에 결합해 React key 중복을 방지한다.
 */
export function applicantKey(a: ApplicantEntry, index?: number): string {
  const stable = a.userId ?? a.guestKey ?? a.email;
  if (stable) return stable;
  const idxSuffix = index != null ? `_${index}` : "";
  return `${a.name}_${a.appliedAt}${idxSuffix}`;
}

/**
 * 신청자에 대응하는 배정을 찾는다.
 * 동명이인 비회원 오매칭을 막기 위해 안정 식별자만 비교한다.
 *  1순위: userId 정확 일치 (회원)
 *  2순위: guestKey 정확 일치 (비회원)
 *  3순위: studentId 정확 일치
 * 위 세 키가 모두 비어 있거나 일치하지 않으면 미배정으로 처리한다.
 * (이름 단독 매칭은 동명이인 오매칭 위험으로 제거됨.)
 */
export function findAssignmentForApplicant(
  applicant: ApplicantEntry,
  assignments: VolunteerAssignment[],
): VolunteerAssignment | undefined {
  if (applicant.userId) {
    const byId = assignments.find(
      (v) => !!v.userId && v.userId === applicant.userId,
    );
    if (byId) return byId;
  }
  if (applicant.guestKey) {
    const byGuest = assignments.find(
      (v) => !!v.guestKey && v.guestKey === applicant.guestKey,
    );
    if (byGuest) return byGuest;
  }
  if (applicant.studentId) {
    const byStudentId = assignments.find(
      (v) => !!v.userStudentId && v.userStudentId === applicant.studentId,
    );
    if (byStudentId) return byStudentId;
  }
  return undefined;
}

/** 배정의 비정규화 id 규칙: userId 있으면 {userId}_{activityId}, 없으면 신규 고유 id */
export function buildAssignmentId(
  applicant: ApplicantEntry,
  activityId: string,
): string {
  if (applicant.userId) return `${applicant.userId}_${activityId}`;
  return genId("vol");
}

// ── schedule 필드 / 답변 집계 ──

/** 활동에서 자원봉사 신청자에게 보이는 schedule 타입 FormField 들을 수집 */
export function collectScheduleFields(activity: Activity | undefined): FormField[] {
  if (!activity) return [];
  const common = (activity.applicationForm ?? []) as FormField[];
  const byType = (activity.applicationFormByType?.volunteer ?? []) as FormField[];
  return [...common, ...byType].filter(
    (f) => f.type === "schedule" || f.type === "datetime_slots",
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeToMinutes(t: string): number {
  const [h, m] = (t || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function listDates(startDate: string, endDate: string): string[] {
  if (!startDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${(endDate || startDate)}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [startDate];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** 시간 슬롯 1개 */
export interface TimeGridSlot {
  date: string;
  /** 분 단위 시작 */
  startM: number;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
}

/** 한 날짜의 슬롯 묶음 */
export interface TimeGridDay {
  date: string;
  slots: TimeGridSlot[];
}

/**
 * schedule 필드 설정 + 활동 일자로 시간 그리드 골격을 만든다.
 * schedule 필드의 scheduleStart/End* 가 우선, 없으면 활동 date/endDate + 09:00~18:00 폴백.
 */
export function buildTimeGrid(
  activity: Activity | undefined,
  scheduleField: FormField | undefined,
): TimeGridDay[] {
  if (!activity) return [];
  const startDate =
    scheduleField?.scheduleStartDate || activity.date || "";
  const endDate =
    scheduleField?.scheduleEndDate || activity.endDate || startDate;
  const startTime = scheduleField?.scheduleStartTime || "09:00";
  const endTime = scheduleField?.scheduleEndTime || "18:00";
  const slotMinutes = scheduleField?.scheduleSlotMinutes ?? 30;
  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);
  const dates = listDates(startDate, endDate);
  if (dates.length === 0 || endM <= startM) return [];
  return dates.map((date) => {
    const slots: TimeGridSlot[] = [];
    for (let m = startM; m + slotMinutes <= endM; m += slotMinutes) {
      slots.push({
        date,
        startM: m,
        start: minutesToTime(m),
        end: minutesToTime(m + slotMinutes),
      });
    }
    return { date, slots };
  });
}

/** 신청자의 schedule 답변 파싱 결과 */
export type ParsedScheduleAnswer =
  | { kind: "all" }
  | { kind: "restricted" }
  | { kind: "slots"; slots: ScheduleSlot[] }
  | { kind: "none" };

/** answers 맵의 값 타입 */
export type AnswerValue =
  | string
  | string[]
  | { url: string; name: string; size: number; type: string }[];

/** answers[fieldId] 한 칸을 파싱 */
export function parseScheduleAnswer(
  raw: AnswerValue | undefined,
): ParsedScheduleAnswer {
  if (raw === ALL_AVAILABLE_MARKER) return { kind: "all" };
  if (raw === RESTRICTED_MARKER) return { kind: "restricted" };
  if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const slots = parsed.filter(
          (s): s is ScheduleSlot =>
            !!s && typeof s === "object" &&
            typeof (s as ScheduleSlot).date === "string" &&
            typeof (s as ScheduleSlot).start === "string" &&
            typeof (s as ScheduleSlot).end === "string",
        );
        if (slots.length > 0) return { kind: "slots", slots };
      }
    } catch {
      /* ignore */
    }
  }
  return { kind: "none" };
}

/** 슬롯별 가능 인원 집계 결과 */
export interface SlotAvailability {
  slot: TimeGridSlot;
  /** 이 슬롯에 가능한 신청자 이름 */
  names: string[];
}

/**
 * 시간 그리드 × 신청자 schedule 답변 → 슬롯별 가능 인원.
 * - all: 모든 슬롯에 포함
 * - restricted: 어떤 슬롯에도 미포함
 * - slots: 슬롯이 답변 범위와 겹치면 포함
 * - none(미답변): 미포함
 */
export function aggregateAvailability(
  grid: TimeGridDay[],
  applicants: { name: string; answer: ParsedScheduleAnswer }[],
): { days: { date: string; slots: SlotAvailability[] }[]; answeredCount: number } {
  let answeredCount = 0;
  for (const a of applicants) {
    if (a.answer.kind !== "none") answeredCount += 1;
  }
  const days = grid.map((day) => ({
    date: day.date,
    slots: day.slots.map((slot) => {
      const names: string[] = [];
      for (const a of applicants) {
        if (a.answer.kind === "all") {
          names.push(a.name);
        } else if (a.answer.kind === "slots") {
          const covered = a.answer.slots.some((s) => {
            if (s.date !== slot.date) return false;
            const sm = timeToMinutes(s.start);
            const em = timeToMinutes(s.end);
            return slot.startM >= sm && slot.startM < em;
          });
          if (covered) names.push(a.name);
        }
        // restricted / none → 미포함
      }
      return { slot, names };
    }),
  }));
  return { days, answeredCount };
}

/** YYYY-MM-DD → "M/D (요일)" */
export function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${dow})`;
}

export const ROLE_ORDER: VolunteerRoleKey[] = [
  "track_runner",
  "registration",
  "guide",
  "media",
  "poster_manager",
  "other",
];

export const ROLE_COLORS: Record<VolunteerRoleKey, string> = {
  track_runner:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800",
  registration:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800",
  guide:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-200 dark:border-purple-800",
  media:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800",
  poster_manager:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800",
  other:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};
