// ────────────────────────────────────────────────────────────
// types/collaborative-research.ts
//
// 공동 연구 (Collaborative Research) 도메인 타입.
// 신규 도메인 — collaborative_research_* 3개 컬렉션(Phase 1 MVP).
// 추가 컬렉션은 Phase 2~4 에서 별도 추가.
//
// 설계 문서: docs/02-design/features/collaborative-research.design.md
// ────────────────────────────────────────────────────────────

// ── 상태 enum ─────────────────────────────────────────────

/** 협업 형태: 동료 자율 vs 학회 배정 */
export type CollaborationType = "peer" | "society";

export type CollaborativeResearchStatus =
  | "planning"
  | "active"
  | "writing"
  | "review"
  | "published"
  | "paused"
  | "archived";

export type CollabMemberRole =
  | "principal"        // 책임연구자 (leader)
  | "co_researcher"    // 공동연구자
  | "advisor"          // 자문 (편집권 없음, 댓글만)
  | "reviewer"         // 검수자 (편집권 없음, 검수 코멘트만)
  | "assistant";       // 연구보조 (편집권 없음, 자료 업로드만)

export type CollabMemberStatus = "active" | "inactive" | "left";

export type CollabInviteStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

/** CRediT (Contributor Roles Taxonomy) — 14 표준 역할 */
export type CreditRole =
  | "conceptualization"
  | "data_curation"
  | "formal_analysis"
  | "funding_acquisition"
  | "investigation"
  | "methodology"
  | "project_administration"
  | "resources"
  | "software"
  | "supervision"
  | "validation"
  | "visualization"
  | "writing_original_draft"
  | "writing_review_editing";

// ── 연구 메타 서브타입 ────────────────────────────────────

export type HypothesisType = "directional" | "non_directional" | "null";
export type HypothesisStatus = "proposed" | "supported" | "rejected" | "partial" | "deferred";

export interface Hypothesis {
  id: string;
  text: string;
  type: HypothesisType;
  status: HypothesisStatus;
  evidence?: string;
}

export interface VariableEntry {
  id: string;
  name: string;
  /** 조작적 정의 (operational definition) — 학술 핵심 */
  operationalDefinition?: string;
  /** 측정 도구 free text */
  measurementTool?: string;
  /** archive_measurement_tools 컬렉션 참조 ID */
  measurementToolId?: string;
}

export interface ResearchVariables {
  independent: VariableEntry[];
  dependent: VariableEntry[];
  mediator?: VariableEntry[];
  moderator?: VariableEntry[];
  control?: VariableEntry[];
}

export type MethodologyKind = "quantitative" | "qualitative" | "mixed";

export type MethodologyDesign =
  | "experimental"
  | "quasi_experimental"
  | "correlational"
  | "case_study"
  | "ethnography"
  | "grounded_theory"
  | "design_based_research"
  | "action_research"
  | "phenomenology"
  | "narrative"
  | "other";

export interface MethodologyMeta {
  kind: MethodologyKind;
  design?: MethodologyDesign;
  sampling?: string;
  dataCollection?: string;
  analysisMethod?: string;
  ethicsNote?: string;
}

export type IrbStatus =
  | "not_required"
  | "preparing"
  | "submitted"
  | "approved"
  | "rejected"
  | "exempt";

export interface IRBStatusInfo {
  required: boolean;
  status?: IrbStatus;
  /** 예: "연세대 IRB-2026-1234" */
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
  /** Storage 업로드 PDF URL */
  documentUrl?: string;
}

// ── 메인 도큐먼트 ─────────────────────────────────────────

/** 일정 마일스톤 — 킥오프·중간점검·최종발표 등 */
export interface ScheduleMilestone {
  /** 클라이언트 생성 UUID */
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** 예: "킥오프 미팅", "1차 점검", "분석 완료", "초고 완성" */
  label: string;
  /** 선택: 상세 메모 */
  note?: string;
}

export interface CollaborativeResearch {
  id: string;
  title: string;
  /** 30자 이내 축약 (목록 카드용) */
  shortTitle?: string;
  collaborationType: CollaborationType;
  status: CollaborativeResearchStatus;

  // 연구 메타
  researchTopic: string;
  researchPurpose: string;
  researchQuestions?: string[];
  /** 연구 대상 (예: "대학원생", "초등 5학년", "고등학교 교사 30명") — 다중 항목 */
  audience?: string[];
  hypotheses?: Hypothesis[];
  variables?: ResearchVariables;
  methodology?: MethodologyMeta;
  /** 실험집단 구성 계획 (실험연구·준실험연구 전용) */
  experimentalGroupPlan?: string;
  /** 통제집단 구성 계획 (실험연구·준실험연구 전용) */
  controlGroupPlan?: string;
  irbStatus?: IRBStatusInfo;
  expectedOutcome?: string;

  // 팀
  leaderId: string;
  /** denorm, 목록 정렬용 */
  collaboratorCount: number;
  /** denorm, where array-contains 쿼리용 (max 10) */
  collaboratorIds: string[];

  // 일정 (YYYY-MM-DD)
  startDate: string;
  targetEndDate?: string;
  actualEndDate?: string;
  /** 킥오프 미팅 일정 */
  kickoffDate?: string;
  /** 중간 점검일 마일스톤 다수 */
  checkpoints?: ScheduleMilestone[];

  // 분류
  tags: string[];
  /** archive_concepts 다대다 참조 */
  conceptIds: string[];
  /** archive_research_methods 다대다 참조 */
  methodIds: string[];

  /** Phase 1 은 'members_only' 고정 (출판물의 visibility 와 별개) */
  workspaceVisibility: "members_only";

  // 출판물 카운트 (Phase 3 에서 활성화, Phase 1 은 0/undefined)
  workingPaperCount: number;
  /** 정식 연구지 발간 1건 참조 (1:0..1) */
  journalArticleId?: string;

  /** ISO datetime */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CollabResearchMember {
  /** id = `${researchId}_${userId}` 강제 */
  id: string;
  researchId: string;
  userId: string;
  role: CollabMemberRole;
  /** CRediT 다중 선택 (0~14개) */
  creditRoles: CreditRole[];
  joinedAt: string;
  invitedBy: string;
  status: CollabMemberStatus;
  leftAt?: string;

  // 출판 시 채워짐 (Phase 3)
  authorOrder?: number;
  isCorresponding?: boolean;
  isFirstAuthor?: boolean;
  isCoFirstAuthor?: boolean;
  /** 발간 당시 소속 (졸업/이직 후에도 스냅샷 유지) */
  affiliation?: string;
  /** ORCID iD (Phase 1 은 텍스트 필드만, Phase 4 에서 OAuth) */
  orcidId?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CollabResearchInvite {
  id: string;
  researchId: string;
  /** denorm — 수신자 목록에서 추가 fetch 회피 */
  researchTitle: string;
  senderId: string;
  /** denorm */
  senderName: string;
  recipientId: string;
  /** denorm fallback */
  recipientEmail?: string;
  proposedRole: CollabMemberRole;
  message?: string;
  status: CollabInviteStatus;
  /** ISO datetime — 기본 14 일 */
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

// ── 입력용 DTO ────────────────────────────────────────────

export type CreateCollabResearchInput = Omit<
  CollaborativeResearch,
  | "id"
  | "collaboratorCount"
  | "collaboratorIds"
  | "workingPaperCount"
  | "journalArticleId"
  | "createdAt"
  | "updatedAt"
>;

export type UpdateCollabResearchInput = Partial<
  Pick<
    CollaborativeResearch,
    | "title"
    | "shortTitle"
    | "status"
    | "researchTopic"
    | "researchPurpose"
    | "researchQuestions"
    | "audience"
    | "hypotheses"
    | "variables"
    | "methodology"
    | "experimentalGroupPlan"
    | "controlGroupPlan"
    | "irbStatus"
    | "expectedOutcome"
    | "targetEndDate"
    | "actualEndDate"
    | "kickoffDate"
    | "checkpoints"
    | "tags"
    | "conceptIds"
    | "methodIds"
  >
>;

export interface CreateCollabInviteInput {
  researchId: string;
  recipientId: string;
  proposedRole: CollabMemberRole;
  message?: string;
}

// ────────────────────────────────────────────────────────────
// Phase 2 — 공동 작성 + 논의 + 회의 + 마일스톤
// ────────────────────────────────────────────────────────────

/** 챕터 작성 상태 */
export type ChapterStatus = "empty" | "draft" | "review" | "approved";

/** 챕터 표준 키 (선택) — IMRaD + 자유 키. chapterKey 는 string 허용. */
export const STANDARD_CHAPTER_KEYS = [
  "intro",
  "literature",
  "method",
  "results",
  "discussion",
  "conclusion",
  "references",
  "appendix",
] as const;

export const STANDARD_CHAPTER_LABELS: Record<string, string> = {
  intro: "서론",
  literature: "이론적 배경",
  method: "방법",
  results: "결과",
  discussion: "논의",
  conclusion: "결론",
  references: "참고문헌",
  appendix: "부록",
};

export interface CollabResearchChapter {
  id: string;
  researchId: string;
  /** 'intro'|'method'|'results'|... 또는 자유 키 */
  chapterKey: string;
  /** 표시 순서 */
  order: number;
  title: string;
  /** markdown */
  content: string;
  /** 작성 담당자 user.id 배열 (다중 가능) */
  assignedUserIds: string[];
  lastEditedBy: string;
  lastEditedAt: string;
  /** denorm 진도 시각화 */
  charCount: number;
  status: ChapterStatus;
  /** optimistic locking — 동시 저장 시 충돌 안내 */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollabResearchComment {
  id: string;
  researchId: string;
  /** 챕터 단위 댓글 (null 가능 — 연구 전체 댓글) */
  chapterId?: string;
  /** 블록·라인 anchor (markdown 라인 ID 등). 선택. */
  anchor?: string;
  authorId: string;
  /** markdown */
  body: string;
  /** @멘션 — 알림 발송 + 인박스 노출 */
  mentionedUserIds: string[];
  /** 스레드 답글 */
  parentCommentId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDecision {
  id: string;
  text: string;
  rationale?: string;
}

export interface MeetingActionItem {
  id: string;
  text: string;
  assigneeId: string;
  dueDate?: string;
  status: "open" | "done";
}

export interface CollabResearchMeeting {
  id: string;
  researchId: string;
  /** ISO datetime */
  scheduledAt: string;
  durationMinutes?: number;
  title: string;
  /** markdown */
  agenda?: string;
  notes?: string;
  decisions?: MeetingDecision[];
  actionItems?: MeetingActionItem[];
  attendeeIds: string[];
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 마일스톤 타입 — checkpoints(스케줄 라벨)와 달리 assignee·상태·첨부 보유 */
export type MilestoneType =
  | "irb"
  | "data_collection"
  | "analysis"
  | "draft"
  | "review"
  | "submission"
  | "other";

export type MilestoneStatus = "planned" | "in_progress" | "done" | "overdue" | "cancelled";

export interface CollabResearchMilestone {
  id: string;
  researchId: string;
  title: string;
  type: MilestoneType;
  /** YYYY-MM-DD */
  targetDate: string;
  completedAt?: string;
  assigneeIds: string[];
  attachmentUrls?: string[];
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

// ── 입력 DTO ──

export type CreateChapterInput = Omit<
  CollabResearchChapter,
  "id" | "createdAt" | "updatedAt" | "version" | "lastEditedBy" | "lastEditedAt"
>;

export type UpdateChapterInput = Partial<
  Pick<CollabResearchChapter, "title" | "content" | "assignedUserIds" | "status" | "order">
> & {
  /** optimistic lock — 호출자가 현재 version 전달 */
  expectedVersion: number;
  lastEditedBy: string;
};

export type CreateCommentInput = Omit<
  CollabResearchComment,
  "id" | "createdAt" | "updatedAt" | "resolvedAt" | "resolvedBy"
>;

export type CreateMeetingInput = Omit<
  CollabResearchMeeting,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateMeetingInput = Partial<
  Pick<
    CollabResearchMeeting,
    "scheduledAt" | "durationMinutes" | "title" | "agenda" | "notes" | "decisions" | "actionItems" | "attendeeIds"
  >
>;

export type CreateMilestoneInput = Omit<
  CollabResearchMilestone,
  "id" | "createdAt" | "updatedAt" | "completedAt"
>;

export type UpdateMilestoneInput = Partial<
  Pick<CollabResearchMilestone, "title" | "type" | "targetDate" | "assigneeIds" | "attachmentUrls" | "status">
> & {
  completedAt?: string;
};
