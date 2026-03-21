import type { TimelinePhase } from "@/types";

/** 오프라인 세미나 기본 타임라인 */
export const OFFLINE_TIMELINE: Omit<TimelinePhase, "done" | "doneAt">[] = [
  { id: "venue", label: "장소 예약 확정", dDay: -30, memo: "", description: "세미나 장소를 예약하고 확정합니다. 장소 규모, 프로젝터/음향 장비 유무, 접근성 등을 고려합니다." },
  { id: "speaker", label: "발표자 섭외 확정", dDay: -21, memo: "", description: "발표자를 섭외하고 발표 주제, 시간, 준비사항 등을 협의합니다." },
  { id: "poster", label: "포스터/홍보물 제작", dDay: -14, memo: "", description: "세미나 포스터, SNS 홍보 이미지 등을 제작합니다. AI 포스터 생성 기능을 활용할 수 있습니다." },
  { id: "promo", label: "SNS/이메일 홍보 발송", dDay: -10, memo: "", description: "인스타그램, 카카오톡, 이메일 등으로 세미나 안내를 발송합니다. AI 콘텐츠 생성 기능 활용 가능." },
  { id: "reminder", label: "참석자 리마인더 발송", dDay: -3, memo: "", description: "참석 신청자에게 일정 리마인더를 발송합니다. 장소, 시간, 준비물 등을 안내합니다." },
  { id: "material", label: "발표 자료 수합", dDay: -2, memo: "", description: "발표자에게 발표 자료(PPT 등)를 받아 확인합니다. 필요 시 수정 요청을 전달합니다." },
  { id: "rehearsal", label: "장비/리허설 점검", dDay: -1, memo: "", description: "프로젝터, 마이크, 노트북 연결 등 장비를 점검하고 간단한 리허설을 진행합니다." },
  { id: "wrapup", label: "참석 리포트 정리", dDay: 1, memo: "", description: "출석 데이터를 정리하고, 세미나 결과 리포트를 작성합니다. 수료증/감사장 발급도 이 시점에 진행합니다." },
];

/** 온라인(ZOOM) 세미나 기본 타임라인 */
export const ONLINE_TIMELINE: Omit<TimelinePhase, "done" | "doneAt">[] = [
  { id: "speaker", label: "발표자 섭외 확정", dDay: -21, memo: "", description: "발표자를 섭외하고 발표 주제, 시간, 온라인 진행 방식 등을 협의합니다." },
  { id: "zoom", label: "ZOOM 회의실 생성 및 링크 확보", dDay: -14, memo: "", description: "ZOOM 회의실을 생성하고 참가 링크를 확보합니다. 회의 비밀번호 설정 여부도 결정합니다." },
  { id: "poster", label: "포스터/홍보물 제작", dDay: -14, memo: "", description: "세미나 포스터, SNS 홍보 이미지 등을 제작합니다. ZOOM 링크를 포함할 수 있습니다." },
  { id: "promo", label: "SNS/이메일 홍보 발송 (ZOOM 링크 포함)", dDay: -10, memo: "", description: "ZOOM 접속 링크를 포함하여 세미나 안내를 발송합니다." },
  { id: "reminder", label: "참석자 리마인더 + ZOOM 링크 재발송", dDay: -3, memo: "", description: "참석자에게 리마인더와 ZOOM 접속 정보를 다시 한번 안내합니다." },
  { id: "material", label: "발표 자료 수합", dDay: -2, memo: "", description: "발표자에게 발표 자료를 받아 확인합니다." },
  { id: "tech-check", label: "ZOOM 테스트 (화면공유/마이크 점검)", dDay: -1, memo: "", description: "발표자와 함께 ZOOM 테스트를 진행합니다. 화면공유, 마이크, 카메라 등을 점검합니다." },
  { id: "recording", label: "녹화 설정 확인", dDay: 0, memo: "", description: "ZOOM 녹화 기능 활성화 여부를 확인합니다. 클라우드 녹화 또는 로컬 녹화를 선택합니다." },
  { id: "wrapup", label: "참석 리포트 + 녹화 공유 정리", dDay: 1, memo: "", description: "출석 데이터 정리, 녹화 영상을 편집/공유하고, 결과 리포트를 작성합니다." },
];

export function createTimeline(isOnline?: boolean): TimelinePhase[] {
  const template = isOnline ? ONLINE_TIMELINE : OFFLINE_TIMELINE;
  return template.map((item) => ({
    ...item,
    done: false,
  }));
}
