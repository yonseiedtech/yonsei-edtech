/**
 * 학술활동 모집 상태 자동 계산 헬퍼.
 *
 * 운영자가 recruitmentStatusOverride === true 로 수동 고정한 경우에는
 * 저장된 recruitmentStatus 를 그대로 반환한다. 그렇지 않으면
 * recruitmentStartAt / recruitmentEndAt 와 현재 시각을 비교해서 자동 계산한다.
 *
 * 자동 계산 우선순위:
 * 1) 정원이 차면 "closed"
 * 2) 활동 status 가 "completed" 면 "completed"
 * 3) recruitmentEndAt 이 지나면 "closed"
 * 4) recruitmentStartAt 이 미도래면 "closed" (모집 미개시) — 라벨은 별도 helper 로 구분
 * 5) 활동 시작일(date) 이 지났으면 "in_progress" (study 는 "closed" 로 매핑)
 * 6) 그 외는 "recruiting"
 *
 * recruitmentStartAt/End 가 모두 미설정이면 기존 동작과 호환되도록
 * 저장된 recruitmentStatus 를 그대로 반환한다.
 */
import type { Activity, RecruitmentStatus } from "@/types/academic";

export interface RecruitmentComputed {
  /** 표시·게이팅에 사용할 최종 상태 */
  status: RecruitmentStatus;
  /** 자동 계산 여부 (true = 자동, false = 수동 override) */
  auto: boolean;
  /** 모집 미개시 (recruitmentStartAt 이 아직 미도래) */
  notStarted: boolean;
  /** 모집 마감 직전임을 알리는 잔여 ms (recruitmentEndAt 이 있고 아직 미도래일 때) */
  msUntilEnd: number | null;
}

function parseLocalDateTime(value: string | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * 현재 시각(now)을 기준으로 활동의 모집 상태를 계산한다.
 * now 는 테스트 편의를 위해 주입 가능. 기본값은 Date.now().
 */
export function computeRecruitmentStatus(
  activity: Pick<
    Activity,
    | "recruitmentStatus"
    | "recruitmentStartAt"
    | "recruitmentEndAt"
    | "recruitmentStatusOverride"
    | "status"
    | "date"
    | "maxParticipants"
    | "participants"
    | "type"
  >,
  now: number = Date.now(),
): RecruitmentComputed {
  const stored = (activity.recruitmentStatus ?? "recruiting") as RecruitmentStatus;
  const override = activity.recruitmentStatusOverride === true;
  const start = parseLocalDateTime(activity.recruitmentStartAt);
  const end = parseLocalDateTime(activity.recruitmentEndAt);

  // 수동 override — 자동 계산 스킵
  if (override) {
    return { status: stored, auto: false, notStarted: false, msUntilEnd: null };
  }

  // 자동 계산 기준이 전혀 없으면 기존 값 보존 (하위호환)
  if (start === null && end === null) {
    return { status: stored, auto: false, notStarted: false, msUntilEnd: null };
  }

  // 활동 자체가 completed 면 모집도 completed
  if (activity.status === "completed") {
    return { status: "completed", auto: true, notStarted: false, msUntilEnd: null };
  }

  // 정원 도달
  const participants = (activity.participants as string[] | undefined) ?? [];
  if (activity.maxParticipants && participants.length >= activity.maxParticipants) {
    return { status: "closed", auto: true, notStarted: false, msUntilEnd: null };
  }

  // 종료 시각 경과
  if (end !== null && now > end) {
    return { status: "closed", auto: true, notStarted: false, msUntilEnd: null };
  }

  // 시작 시각 미도래 — UI 에서는 "모집 예정" 으로 안내, 게이팅 측면에선 closed 와 동일
  if (start !== null && now < start) {
    return {
      status: "closed",
      auto: true,
      notStarted: true,
      msUntilEnd: null,
    };
  }

  // 활동 시작일(date) 이 지났으면 in_progress (study 는 closed 로 매핑 — 기존 라벨 일관성)
  const activityStartDate = activity.date ? new Date(`${activity.date}T00:00:00`).getTime() : null;
  if (activityStartDate !== null && now >= activityStartDate) {
    if (activity.type === "study") {
      return { status: "closed", auto: true, notStarted: false, msUntilEnd: null };
    }
    return { status: "in_progress", auto: true, notStarted: false, msUntilEnd: null };
  }

  // 정상 모집 중
  return {
    status: "recruiting",
    auto: true,
    notStarted: false,
    msUntilEnd: end !== null ? end - now : null,
  };
}

/** 모집 기간 (UI 표시용 문자열). 둘 다 없으면 null. */
export function formatRecruitmentPeriod(
  startAt: string | undefined,
  endAt: string | undefined,
): string | null {
  if (!startAt && !endAt) return null;
  const fmt = (iso: string | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${day} ${hh}:${mm}`;
  };
  const s = fmt(startAt);
  const e = fmt(endAt);
  if (s && e) return `${s} ~ ${e}`;
  if (s) return `${s} ~`;
  return `~ ${e}`;
}
