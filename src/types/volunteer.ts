/**
 * 학술대회 자원봉사자 운영 (Sprint 67-AJ)
 *
 * Phase 1: 역할 배정 + 본인 봉사 페이지
 * Phase 2 (예정): 세션 실시간 운영 상태 입력 + 본부석 대시보드 + 특이사항 보고
 */

export type VolunteerRoleKey =
  | "track_runner" // 트랙 진행
  | "registration" // 등록 데스크
  | "guide" // 안내·메니저
  | "media" // 방송·사진·기록
  | "poster_manager" // 포스터 세션 관리
  | "other"; // 기타

export const VOLUNTEER_ROLE_LABELS: Record<VolunteerRoleKey, string> = {
  track_runner: "트랙 진행",
  registration: "등록 데스크",
  guide: "안내·메니저",
  media: "방송·사진·기록",
  poster_manager: "포스터 세션 관리",
  other: "기타",
};

export interface VolunteerShift {
  /** HH:MM 24h */
  startTime: string;
  /** HH:MM 24h */
  endTime: string;
  /** 강의실/장소 (예: '409호') */
  location?: string;
  /** 담당 트랙 (가변 — 예: 'A 트랙', '포스터 세션 A', '본관 로비') */
  trackName?: string;
  /** 슬롯별 추가 메모 */
  note?: string;
}

export interface VolunteerAssignment {
  /** {userId}_{activityId} 권장 */
  id: string;
  userId: string;
  userName?: string;
  /** 비정규화: 명함·연락 표시용 */
  userAffiliation?: string;
  userPhone?: string;

  activityId: string;
  /** 비정규화: 활동 제목·일자 */
  activityTitle?: string;
  activityDate?: string;

  /** 부여된 역할 */
  role: VolunteerRoleKey;
  /** 사용자 정의 역할명 (role='other' 일 때) */
  customRoleName?: string;

  /** 복수 시간대 슬롯 */
  shifts: VolunteerShift[];

  /** 체크리스트 / 세부 임무 — 각 항목 = 짧은 문장 */
  duties: VolunteerDuty[];

  /** 본인이 학회장에서 표시할 이름·소속 */
  contactDisplay?: string;
  /** 운영진 비상 연락처 (학회장 본부석 전화 등) */
  emergencyContact?: string;
  /** 운영진 메모 */
  notes?: string;

  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VolunteerDuty {
  id: string;
  text: string;
  /** 본인이 진행하면서 체크 — Phase 1 에서는 단순 표시, Phase 2 에서 본인 체크 기능 */
  checked?: boolean;
  /** 본인 체크 시각 (Phase 2) */
  checkedAt?: string;
}
