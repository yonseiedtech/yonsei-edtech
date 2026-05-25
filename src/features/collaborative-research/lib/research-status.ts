// ────────────────────────────────────────────────────────────
// features/collaborative-research/lib/research-status.ts
//
// 연구 상태 / 역할 한글 라벨 + 색상 헬퍼.
// ────────────────────────────────────────────────────────────

import type {
  CollaborationType,
  CollabMemberRole,
  CollaborativeResearchStatus,
  CollabInviteStatus,
  IrbStatus,
  MethodologyKind,
  MethodologyDesign,
  HypothesisType,
  HypothesisStatus,
} from "@/types";

export const COLLABORATION_TYPE_LABELS: Record<CollaborationType, string> = {
  peer: "동료 자율",
  society: "학회 배정",
};

export const COLLAB_STATUS_LABELS: Record<CollaborativeResearchStatus, string> = {
  planning: "기획 중",
  active: "진행 중",
  writing: "원고 작성",
  review: "검수 중",
  published: "발간 완료",
  paused: "일시 정지",
  archived: "보관",
};

/** Tailwind 색상 토큰 (이미 사이트에서 사용 중인 chip 컬러) */
export const COLLAB_STATUS_COLORS: Record<CollaborativeResearchStatus, string> = {
  planning: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  writing: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  published: "bg-violet-100 text-violet-700",
  paused: "bg-zinc-100 text-zinc-600",
  archived: "bg-zinc-100 text-zinc-500",
};

export const COLLAB_MEMBER_ROLE_LABELS: Record<CollabMemberRole, string> = {
  principal: "책임연구자",
  co_researcher: "공동연구자",
  advisor: "자문",
  reviewer: "검수자",
  assistant: "연구보조",
};

export const COLLAB_MEMBER_ROLE_COLORS: Record<CollabMemberRole, string> = {
  principal: "bg-violet-100 text-violet-700",
  co_researcher: "bg-primary/10 text-primary",
  advisor: "bg-amber-100 text-amber-700",
  reviewer: "bg-cyan-100 text-cyan-700",
  assistant: "bg-zinc-100 text-zinc-600",
};

/** 멤버 역할이 본문 편집권을 가지는지 (Phase 2 채택, Phase 1 에서도 정의해두면 UI 분기에 사용) */
export function canEditChapter(role: CollabMemberRole | undefined): boolean {
  return role === "principal" || role === "co_researcher";
}

export const COLLAB_INVITE_STATUS_LABELS: Record<CollabInviteStatus, string> = {
  pending: "대기 중",
  accepted: "수락됨",
  rejected: "거절됨",
  expired: "만료됨",
  cancelled: "취소됨",
};

export const IRB_STATUS_LABELS: Record<IrbStatus, string> = {
  not_required: "심의 면제",
  preparing: "준비 중",
  submitted: "심의 신청",
  approved: "승인 완료",
  rejected: "반려",
  exempt: "면제 승인",
};

export const METHODOLOGY_KIND_LABELS: Record<MethodologyKind, string> = {
  quantitative: "양적 연구",
  qualitative: "질적 연구",
  mixed: "혼합 연구",
};

export const METHODOLOGY_DESIGN_LABELS: Record<MethodologyDesign, string> = {
  experimental: "실험연구",
  quasi_experimental: "준실험연구",
  correlational: "상관연구",
  case_study: "사례연구",
  ethnography: "문화기술지",
  grounded_theory: "근거이론",
  design_based_research: "설계기반연구(DBR)",
  action_research: "실행연구",
  phenomenology: "현상학",
  narrative: "내러티브 연구",
  other: "기타",
};

export const HYPOTHESIS_TYPE_LABELS: Record<HypothesisType, string> = {
  directional: "방향성 가설",
  non_directional: "비방향성 가설",
  null: "영가설",
};

export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  proposed: "제안",
  supported: "지지",
  rejected: "기각",
  partial: "부분 지지",
  deferred: "보류",
};

/** 상태 전이 허용 검사 (leader 만 호출). 부정확한 전이는 차단. */
const ALLOWED_TRANSITIONS: Record<CollaborativeResearchStatus, CollaborativeResearchStatus[]> = {
  planning: ["active", "paused", "archived"],
  active: ["writing", "paused", "archived"],
  writing: ["active", "review", "paused", "archived"],
  review: ["writing", "published", "paused", "archived"],
  published: ["archived"],
  paused: ["planning", "active", "writing", "review", "archived"],
  archived: [], // 보관 상태에서는 전이 불가 (admin 만 복원)
};

export function canTransitionStatus(
  from: CollaborativeResearchStatus,
  to: CollaborativeResearchStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
