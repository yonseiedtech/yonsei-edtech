/**
 * 에디터 기능 사용 텔레메트리 (2026-06-13, 사이클 38 — 피드백 루프 1단계)
 *
 * 어떤 보조 기능(가이드·문형·도우미·분석기…)이 실제로 쓰이는지를
 * 기존 user_activity_logs 에 가상 경로(ui:editor/*)로 적재한다.
 *  - rules 무변경: create 는 본인 userId 허용, read 는 admin 전용 (운영 인사이트 용)
 *  - 세션당 이벤트별 1회만 기록 (노이즈·쓰기 비용 방지)
 *  - fire-and-forget: 실패해도 에디터 동작에 영향 없음
 *
 * 이 데이터가 쌓이면 "패널 점진 노출(레이어링)"의 근거가 된다 —
 * 무엇을 기본으로 보여주고 무엇을 접을지 추측이 아닌 사용률로 결정.
 */

import { userActivityLogsApi } from "@/lib/bkend";

const loggedThisSession = new Set<string>();

export type EditorEvent =
  | "guide_open"
  | "section_guide_open"
  | "phrases_open"
  | "reading_drawer_open"
  | "method_helper_open"
  | "analyzer_open"
  | "lint_run"
  | "export_txt"
  | "version_compare"
  | "assumption_insert"
  | "analysis_insert"
  | "table_insert";

const EVENT_LABELS: Record<EditorEvent, string> = {
  guide_open: "심사위원의 눈 열람",
  section_guide_open: "섹션 가이드 열람",
  phrases_open: "학술 문형 열람",
  reading_drawer_open: "읽기 서랍 열람",
  method_helper_open: "방법 도우미 열람",
  analyzer_open: "데이터 분석기 열람",
  lint_run: "자가 점검 실행",
  export_txt: "텍스트 내보내기",
  version_compare: "버전 비교",
  assumption_insert: "가정 골격 삽입",
  analysis_insert: "분석 문장 삽입",
  table_insert: "결과 표 삽입",
};

export function logEditorEvent(userId: string | undefined, event: EditorEvent) {
  if (!userId || loggedThisSession.has(event)) return;
  loggedThisSession.add(event);
  void userActivityLogsApi
    .create({
      userId,
      path: `ui:editor/${event}`,
      pathGroup: "ui",
      pathLabel: `에디터 · ${EVENT_LABELS[event]}`,
      createdAt: new Date().toISOString(),
    })
    .catch(() => {
      /* 텔레메트리 실패는 무시 */
    });
}
