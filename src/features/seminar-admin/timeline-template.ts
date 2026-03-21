import type { TimelinePhase } from "@/types";

/** 오프라인 세미나 기본 타임라인 */
export const OFFLINE_TIMELINE: Omit<TimelinePhase, "done" | "doneAt">[] = [
  { id: "venue", label: "장소 예약 확정", dDay: -30, memo: "" },
  { id: "speaker", label: "발표자 섭외 확정", dDay: -21, memo: "" },
  { id: "poster", label: "포스터/홍보물 제작", dDay: -14, memo: "" },
  { id: "promo", label: "SNS/이메일 홍보 발송", dDay: -10, memo: "" },
  { id: "reminder", label: "참석자 리마인더 발송", dDay: -3, memo: "" },
  { id: "material", label: "발표 자료 수합", dDay: -2, memo: "" },
  { id: "rehearsal", label: "장비/리허설 점검", dDay: -1, memo: "" },
  { id: "wrapup", label: "참석 리포트 정리", dDay: 1, memo: "" },
];

/** 온라인(ZOOM) 세미나 기본 타임라인 */
export const ONLINE_TIMELINE: Omit<TimelinePhase, "done" | "doneAt">[] = [
  { id: "speaker", label: "발표자 섭외 확정", dDay: -21, memo: "" },
  { id: "zoom", label: "ZOOM 회의실 생성 및 링크 확보", dDay: -14, memo: "" },
  { id: "poster", label: "포스터/홍보물 제작", dDay: -14, memo: "" },
  { id: "promo", label: "SNS/이메일 홍보 발송 (ZOOM 링크 포함)", dDay: -10, memo: "" },
  { id: "reminder", label: "참석자 리마인더 + ZOOM 링크 재발송", dDay: -3, memo: "" },
  { id: "material", label: "발표 자료 수합", dDay: -2, memo: "" },
  { id: "tech-check", label: "ZOOM 테스트 (화면공유/마이크 점검)", dDay: -1, memo: "" },
  { id: "recording", label: "녹화 설정 확인", dDay: 0, memo: "" },
  { id: "wrapup", label: "참석 리포트 + 녹화 공유 정리", dDay: 1, memo: "" },
];

export function createTimeline(isOnline?: boolean): TimelinePhase[] {
  const template = isOnline ? ONLINE_TIMELINE : OFFLINE_TIMELINE;
  return template.map((item) => ({
    ...item,
    done: false,
  }));
}
