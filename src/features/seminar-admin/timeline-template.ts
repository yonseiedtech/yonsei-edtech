import type { TimelinePhase } from "@/types";

export const DEFAULT_TIMELINE: Omit<TimelinePhase, "done" | "doneAt">[] = [
  { id: "venue", label: "장소 예약 확정", dDay: -30, memo: "" },
  { id: "speaker", label: "발표자 섭외 확정", dDay: -21, memo: "" },
  { id: "poster", label: "포스터/홍보물 제작", dDay: -14, memo: "" },
  { id: "promo", label: "SNS/이메일 홍보 발송", dDay: -10, memo: "" },
  { id: "reminder", label: "참석자 리마인더 발송", dDay: -3, memo: "" },
  { id: "material", label: "발표 자료 수합", dDay: -2, memo: "" },
  { id: "rehearsal", label: "장비/리허설 점검", dDay: -1, memo: "" },
  { id: "wrapup", label: "참석 리포트 정리", dDay: 1, memo: "" },
];

export function createTimeline(custom?: Omit<TimelinePhase, "done" | "doneAt">[]): TimelinePhase[] {
  return (custom ?? DEFAULT_TIMELINE).map((item) => ({
    ...item,
    done: false,
  }));
}
