/**
 * 학술대회 발표자 운영 콘솔 — Phase 1.
 *
 * 발표 유형(논문/포스터/미디어전)별로 다른 준비 흐름을 한 페이지에서 관리.
 * 자원봉사자 운영 콘솔(VolunteerAssignment) 패턴 미러.
 *  - 신청자(activity_applicants) ↔ 배정(speaker_assignments) 통합 매칭
 *  - 표준 체크리스트(prepTasks) 자동/일괄 배분
 *  - 유형별 차별화 정보(트랙/부스/장비)
 */

import type { SpeakerSubmissionType } from "./academic";

/** 발표자 준비 체크리스트 항목 — VolunteerDuty 미러 */
export interface SpeakerPrepTask {
  id: string;
  text: string;
  /** 운영진 또는 본인이 진행하면서 체크 */
  checked?: boolean;
  /** 체크 시각 */
  checkedAt?: string;
}

/** 논문 발표 세부 정보 */
export interface PaperDetails {
  /** 트랙 이름 (예: "A 트랙", "교육공학 연구방법") */
  trackName?: string;
  /** 세션 시간 (예: "5/30 14:00~15:30") */
  sessionTime?: string;
  /** 좌장 이름 */
  chairName?: string;
  /** 토론자 이름 */
  discussantName?: string;
  /** 발표 시간 (분) */
  durationMinutes?: number;
  /** 질의응답 시간 (분) */
  qaMinutes?: number;
}

/** 포스터 세부 정보 */
export interface PosterDetails {
  /** 부스 번호 (예: "P-12") */
  boothNumber?: string;
  /** 부스 위치 (예: "본관 1층 로비") */
  location?: string;
  /** 포스터 세션 시간대 (예: "5/30 13:00~14:00") */
  sessionWindow?: string;
}

/** 미디어전 세부 정보 */
export interface MediaDetails {
  /** 전시 공간 (예: "전시홀 A-3") */
  exhibitSpace?: string;
  /** 필요 장비 목록 (예: ["빔프로젝터", "VR 헤드셋", "노트북"]) */
  equipment?: string[];
  /** 설치 시간 (예: "5/29 16:00") */
  setupTime?: string;
  /** 철거 시간 (예: "5/30 18:00") */
  teardownTime?: string;
  /** 작품 설명 */
  description?: string;
}

/**
 * 발표자 배정 (speaker_assignments 컬렉션).
 *  - id: 회원은 {userId}_{activityId}, 비회원은 spk_{Date.now()}_{rand}
 *  - VolunteerAssignment 와 동일한 비정규화·매칭 키 규칙
 */
export interface SpeakerAssignment {
  /** {userId}_{activityId} (회원) 또는 spk_{ts}_{rand} (비회원) */
  id: string;
  activityId: string;

  // ── 신청자 식별 (매칭 우선순위) ──
  /** 회원 식별 1순위 */
  userId?: string;
  /** 비회원 식별 2순위 */
  guestKey?: string;
  /** 학번 식별 3순위 */
  userStudentId?: string;

  // ── 비정규화 (목록 표시·인쇄·연락용) ──
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userAffiliation?: string;

  // ── 발표 핵심 ──
  submissionType: SpeakerSubmissionType;
  /** 논문 제목·작품 제목 등 */
  paperTitle?: string;

  // ── 공통 준비 체크리스트 ──
  prepTasks: SpeakerPrepTask[];

  // ── 유형별 세부 (해당 type 에만 채워짐) ──
  paperDetails?: PaperDetails;
  posterDetails?: PosterDetails;
  mediaDetails?: MediaDetails;

  // ── 운영 ──
  /** 운영진 메모 */
  notes?: string;
  /** 본부석 등 비상 연락처 */
  emergencyContact?: string;

  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 발표 유형별 표준 준비 체크리스트 시드.
 * AssignmentDialog 에서 submissionType 확정 시 자동 채움.
 * 운영진이 카드에서 자유롭게 추가/삭제/수정 가능.
 */
export const SPEAKER_STANDARD_TASKS: Record<SpeakerSubmissionType, string[]> = {
  paper: [
    "원고 PDF 제출",
    "발표 슬라이드 제출",
    "트랙·세션 배정",
    "좌장 매칭",
    "리허설 참석",
  ],
  poster: [
    "포스터 PDF 제출",
    "부스 번호 안내",
    "인쇄 완료",
    "부착 시간 안내",
  ],
  media: [
    "작품 파일 제출",
    "장비 요구사항 확인",
    "설치 일정",
    "철거 일정",
  ],
};
