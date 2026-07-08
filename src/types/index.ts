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
export * from "./research-method";
export * from "./statistical-method";
export * from "./foundation-term";
export * from "./writing-tip";
export * from "./networking";
export * from "./diagnostic";
export * from "./flashcard";

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

// 회원 간 쪽지 (사이클 113)
export * from "./messages";

// 학술대회 워크북 (Sprint 67-F)
export * from "./workbook";

// 학술대회 참석자 후기 (Sprint 67-Z)
export * from "./attendee-review";

// 학술대회 자원봉사자 운영 (Sprint 67-AJ)
export * from "./volunteer";

// 학술대회 발표자 운영 — Phase 1
export * from "./speaker";

// 게시글 공감 reaction (Sprint 67-AO)
export * from "./post-reaction";

// AI 포럼 (Sprint 67-AR — AI 자율 토론 게시판)
export * from "./ai-forum";

// 시작하기 체크리스트 (운영진 콘솔 편집)
export * from "./onboarding-checklist";

// P1: 시작하기 체크리스트 마일스톤 배지
export * from "./onboarding-badge";

// P1: 학습 잔디 외부 가산점 이벤트 (체크리스트·배지)
export * from "./streak-event";
export * from "./topic-exploration";
export * from "./graduation";

// 사용자 피드백
export * from "./feedback";

// 사용자 개인 메모
export * from "./user-note";

// 공동 연구 + 연구지 발간 (collaborative-research Phase 1 MVP)
export * from "./collaborative-research";

// 연구지(Research Journal) 출판 트랙 — collaborative-research Phase 3
export * from "./research-journal";

// 소통 보드 (Q&A Communication Board) — 스터디 회차·세미나 공용
export * from "./comm-board";
