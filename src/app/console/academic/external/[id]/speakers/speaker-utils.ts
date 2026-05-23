/**
 * 발표자 운영 콘솔 — 공용 유틸 (Phase 1).
 *
 * VolunteerAssignment 운영 콘솔의 매칭/식별 패턴을 그대로 미러:
 *  - 신청자(activity_applicants, participantType==="speaker") ↔ 배정(speaker_assignments)
 *  - userId → guestKey → studentId 우선순위 매칭 (동명이인 폴백 금지)
 *  - prepTask id 는 crypto.randomUUID() (Date.now()+random 충돌 방지)
 */

import type {
  ApplicantEntry,
  SpeakerAssignment,
  SpeakerSubmissionType,
} from "@/types";

/** 고유 id 생성 — crypto.randomUUID() 기반 (Date.now()+random 충돌 회피) */
export function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * prepTask 고유 id 생성.
 * Date.now()+random 은 같은 ms 내 동시 생성 시 충돌 가능 →
 * 충돌 확률이 사실상 0 인 crypto.randomUUID() 를 사용한다.
 */
export function taskId(): string {
  return `t_${crypto.randomUUID()}`;
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
 * 신청자에 대응하는 발표자 배정을 찾는다.
 * 동명이인 비회원 오매칭을 막기 위해 안정 식별자만 비교한다.
 *  1순위: userId 정확 일치 (회원)
 *  2순위: guestKey 정확 일치 (비회원)
 *  3순위: studentId 정확 일치
 * 위 세 키가 모두 비어 있거나 일치하지 않으면 미배정으로 처리한다.
 *
 * 신청자에 `speakerSubmissionType` 이 있으면 같은 유형의 배정을 우선 매칭한다
 * (한 회원이 두 유형으로 신청·배정된 경우 유형별로 구분).
 */
export function findAssignmentForApplicant(
  applicant: ApplicantEntry,
  assignments: SpeakerAssignment[],
): SpeakerAssignment | undefined {
  const wantType = applicant.speakerSubmissionType;
  const typeMatch = (s: SpeakerAssignment) =>
    !wantType || s.submissionType === wantType;

  if (applicant.userId) {
    const sameId = assignments.filter(
      (s) => !!s.userId && s.userId === applicant.userId,
    );
    const byIdTyped = sameId.find(typeMatch);
    if (byIdTyped) return byIdTyped;
    if (!wantType && sameId.length > 0) return sameId[0];
  }
  if (applicant.guestKey) {
    const sameGuest = assignments.filter(
      (s) => !!s.guestKey && s.guestKey === applicant.guestKey,
    );
    const byGuestTyped = sameGuest.find(typeMatch);
    if (byGuestTyped) return byGuestTyped;
    if (!wantType && sameGuest.length > 0) return sameGuest[0];
  }
  if (applicant.studentId) {
    const sameStudent = assignments.filter(
      (s) => !!s.userStudentId && s.userStudentId === applicant.studentId,
    );
    const byStudentTyped = sameStudent.find(typeMatch);
    if (byStudentTyped) return byStudentTyped;
    if (!wantType && sameStudent.length > 0) return sameStudent[0];
  }
  return undefined;
}

/**
 * 배정 id 규칙: 회원은 `{userId}_{activityId}_{submissionType}`, 비회원은 `spk_{uuid}`.
 * 한 회원이 같은 활동에 두 유형(예: 논문+포스터)으로 동시 배정될 수 있도록 유형을 키에 포함.
 */
export function buildAssignmentId(
  applicant: ApplicantEntry,
  activityId: string,
  submissionType: SpeakerSubmissionType,
): string {
  if (applicant.userId) {
    return `${applicant.userId}_${activityId}_${submissionType}`;
  }
  return genId("spk");
}

/** 유형 정렬 순서 (논문 → 포스터 → 미디어전) */
export const SUBMISSION_TYPE_ORDER: SpeakerSubmissionType[] = [
  "paper",
  "poster",
  "media",
];
