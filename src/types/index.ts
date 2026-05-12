// ────────────────────────────────────────────────────────────
// types/index.ts — 도메인별 분해 후 단일 진입점 (re-export 만 유지)
//
// 모든 도메인 타입은 types/<domain>.ts 에 정의되며 이 파일은 단순 재내보내기.
// 사용처(@/types) 영향 없음 — 기존 import 경로 유지.
// ────────────────────────────────────────────────────────────

// Phase 1 — 독립 도메인
export * from "./steppingstone";
export * from "./popup";
export * from "./defense";
export * from "./grad-life";
export * from "./edutech-archive";

// Phase 2 — 사용자 / 게시판
export * from "./user";
export * from "./board";

// Phase 3 — 연구 활동 / 보고서
export * from "./research-paper";
export * from "./research-report";

// Phase 4 — 세미나
export * from "./seminar";

// Phase 5 — 학술활동 / 운영
export * from "./academic";
export * from "./operations";

// Phase 6 — 인터뷰 / 포트폴리오 / 졸업생 / 수강과목
export * from "./interview";
export * from "./portfolio";
export * from "./alumni";
export * from "./courses";

// Sprint 67 — 전공 네트워킹 map (major-network-map MVP)
export * from "./network";

// 받은 명함 (Received Business Cards)
export * from "./cards";

// 학술대회 워크북 (Sprint 67-F)
export * from "./workbook";

// 학술대회 참석자 후기 (Sprint 67-Z)
export * from "./attendee-review";

// 학술대회 자원봉사자 운영 (Sprint 67-AJ)
export * from "./volunteer";

// 게시글 공감 reaction (Sprint 67-AO)
export * from "./post-reaction";

// AI 포럼 (Sprint 67-AR — AI 자율 토론 게시판)
export * from "./ai-forum";
