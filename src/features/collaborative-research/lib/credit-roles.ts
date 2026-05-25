// ────────────────────────────────────────────────────────────
// features/collaborative-research/lib/credit-roles.ts
//
// CRediT (Contributor Roles Taxonomy) 14 표준 역할의 한글 라벨 + 정렬.
// 참고: https://credit.niso.org/
// ────────────────────────────────────────────────────────────

import type { CreditRole } from "@/types";

export const CREDIT_ROLE_LABELS: Record<CreditRole, string> = {
  conceptualization: "개념화",
  data_curation: "자료 관리",
  formal_analysis: "형식 분석",
  funding_acquisition: "연구비 확보",
  investigation: "조사",
  methodology: "방법론",
  project_administration: "프로젝트 관리",
  resources: "자원",
  software: "소프트웨어",
  supervision: "감독",
  validation: "검증",
  visualization: "시각화",
  writing_original_draft: "원고 작성",
  writing_review_editing: "검토·편집",
};

export const CREDIT_ROLE_DESCRIPTIONS: Record<CreditRole, string> = {
  conceptualization: "연구 목표·아이디어 형성, 핵심 가설 수립",
  data_curation: "자료 수집·정제·보존·메타데이터 관리",
  formal_analysis: "통계·수학·전산 기법으로 데이터 분석",
  funding_acquisition: "연구 자금 확보, 사업 책임",
  investigation: "실험·자료 수집 등 현장 작업 수행",
  methodology: "연구 방법론 설계, 모형 개발",
  project_administration: "팀 운영, 일정 조율, 행정 처리",
  resources: "장비·시약·환자·재료·계산자원 제공",
  software: "코드 작성, 알고리즘 설계, 컴퓨터 프로그램 구현",
  supervision: "외부 멘토링, 팀 활동에 대한 지도·책임",
  validation: "결과 재현성·반복성 검증, 실험 결과 확인",
  visualization: "결과를 도표·그래픽으로 시각화",
  writing_original_draft: "원고 초안 작성 (서론·방법·결과·논의)",
  writing_review_editing: "원고 비판적 검토·편집·수정·재작성",
};

/** UI 표시용 정렬된 14역할 배열 (개념화 → 검토·편집 순) */
export const CREDIT_ROLES_ORDERED: CreditRole[] = [
  "conceptualization",
  "methodology",
  "software",
  "validation",
  "formal_analysis",
  "investigation",
  "resources",
  "data_curation",
  "writing_original_draft",
  "writing_review_editing",
  "visualization",
  "supervision",
  "project_administration",
  "funding_acquisition",
];

export function getCreditRoleLabel(role: CreditRole): string {
  return CREDIT_ROLE_LABELS[role] ?? role;
}
