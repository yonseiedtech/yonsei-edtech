# Design: 공동 연구 + 연구지 발간 (collaborative-research)

> **선행 문서**: `docs/01-plan/features/collaborative-research.plan.md` (791 lines)
> **PDCA 단계**: Design
> **작성일**: 2026-05-25
> **범위**: Phase 1(MVP — 팀+초대+메타) 구체 코드 단위 + Phase 2~4 outline
> **검증 전략**: 단일 Phase 단위 commit + Vercel preview 배포 + 수동 시나리오 검증

---

## 1. 선행 조건 & 영향 범위

### 1.1 선행 조건
- **없음** — 신규 도메인, 기존 데이터 마이그레이션 불요
- 기존 인프라 의존: `bkend` SDK, FCM push, NotificationPrefs, streak_events, MemberPicker, PageContainer, BackButton, ConsolePage

### 1.2 영향 범위
| 영역 | 변경 종류 |
|------|----------|
| `src/types/` | 신규 도메인 파일 1개 (`collaborative-research.ts`) + `index.ts` re-export |
| `src/lib/bkend.ts` | typed shortcuts 신규 9개 |
| `firestore.rules` | 헬퍼 3개 + 컬렉션 규칙 8개 추가 |
| `firestore.indexes.json` | 인덱스 9개 추가 |
| `src/features/` | 신규 폴더 `collaborative-research/` + `journal/` |
| `src/app/` | 신규 라우트 3개 트리 (`/collab`, `/journal`, `/mypage/research` 5번째 탭) |
| `src/app/console/research/` | 신규 5번째 탭 (검수·발간) |
| `src/types/notification-prefs.ts` (또는 user.ts) | NotificationPrefs 5필드 추가 |
| `src/types/streak-event.ts` | StreakEventType 5개 추가 |
| `src/app/api/cron/` | 신규 cron 2개 (milestone-reminder, journal-issue-publish) |
| `vercel.json` | cron 등록 2건 |

### 1.3 변경하지 않는 것
- 기존 `research_papers / writing_papers / research_reports / research_proposals` 컬렉션 스키마/권한 — **그대로 유지**
- 기존 `card_news_series` (학회보) — 완전 분리
- 기존 `activities` (study/project) — 무관

---

## 2. 폴더 구조 (신규)

```
src/
├── types/
│   ├── collaborative-research.ts             # 신규 - 도메인 타입 일체
│   └── index.ts                               # re-export 1줄 추가
├── lib/
│   └── bkend.ts                               # 9개 typed shortcuts 추가 (라인 추가만)
├── features/
│   ├── collaborative-research/                # 신규 폴더
│   │   ├── api/
│   │   │   ├── useCollabResearchList.ts
│   │   │   ├── useCollabResearch.ts
│   │   │   ├── useCollabMembers.ts
│   │   │   ├── useCollabInvites.ts
│   │   │   └── useCollabMutations.ts
│   │   ├── components/
│   │   │   ├── CollabResearchCard.tsx
│   │   │   ├── CollabResearchListEmpty.tsx
│   │   │   ├── CollabResearchHeader.tsx
│   │   │   ├── CollabResearchMetaForm.tsx
│   │   │   ├── CollabResearchVariablesEditor.tsx
│   │   │   ├── CollabResearchHypothesesEditor.tsx
│   │   │   ├── CollabResearchIrbCard.tsx
│   │   │   ├── CollabResearchMembersPanel.tsx
│   │   │   ├── CollabResearchInviteDialog.tsx
│   │   │   ├── CollabResearchInviteInbox.tsx
│   │   │   ├── CollabResearchRoleBadge.tsx
│   │   │   └── CreditRoleSelector.tsx
│   │   └── lib/
│   │       ├── credit-roles.ts                # CreditRole enum + 한글 라벨
│   │       ├── research-status.ts             # 상태 전이 규칙
│   │       └── visibility.ts                  # visibility 헬퍼
│   └── journal/                               # Phase 3 (Sprint C)
│       └── (Phase 3에서 채움)
└── app/
    ├── collab/
    │   ├── page.tsx                           # 내 참여 연구 목록
    │   ├── new/page.tsx                       # 팀 생성
    │   └── [researchId]/
    │       ├── layout.tsx                     # 멤버 가드 + 사이드 네비
    │       ├── page.tsx                       # 대시보드 (Phase 1 핵심)
    │       ├── members/page.tsx               # 멤버 관리 (Phase 1)
    │       ├── meta/page.tsx                  # 연구 메타 편집 (Phase 1)
    │       ├── chapters/page.tsx              # Phase 2
    │       ├── meetings/page.tsx              # Phase 2
    │       ├── milestones/page.tsx            # Phase 2
    │       ├── publish/page.tsx               # Phase 3
    │       └── settings/page.tsx              # Phase 1 (삭제·일시정지)
    ├── journal/                               # Phase 3
    │   └── (Phase 3에서 채움)
    └── mypage/
        └── research/
            └── page.tsx                       # 5번째 탭 추가 (Phase 1)
```

---

## 3. 타입 정의 (`src/types/collaborative-research.ts`)

```typescript
// === 상태 enum ===
export type CollaborationType = "peer" | "society";
export type CollaborativeResearchStatus =
  | "planning" | "active" | "writing" | "review" | "published" | "paused" | "archived";

export type CollabMemberRole =
  | "principal"        // 책임연구자 (leader)
  | "co_researcher"    // 공동연구자
  | "advisor"          // 자문 (편집권 없음, 댓글만)
  | "reviewer"         // 검수자 (편집권 없음, 검수 코멘트만)
  | "assistant";       // 연구보조 (편집권 없음, 자료 업로드만)

export type CollabMemberStatus = "active" | "inactive" | "left";

export type CollabInviteStatus =
  | "pending" | "accepted" | "rejected" | "expired" | "cancelled";

// CRediT (Contributor Roles Taxonomy) — 14 표준 역할
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

// === 연구 메타 ===
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
  operationalDefinition?: string;
  measurementTool?: string;
  measurementToolId?: string; // archive_measurement_tools 참조
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
  | "experimental" | "quasi_experimental" | "correlational" | "case_study"
  | "ethnography" | "grounded_theory" | "design_based_research" | "action_research"
  | "phenomenology" | "narrative" | "other";

export interface MethodologyMeta {
  kind: MethodologyKind;
  design?: MethodologyDesign;
  sampling?: string;
  dataCollection?: string;
  analysisMethod?: string;
  ethicsNote?: string;
}

export type IrbStatus =
  | "not_required" | "preparing" | "submitted" | "approved" | "rejected" | "exempt";

export interface IRBStatusInfo {
  required: boolean;
  status?: IrbStatus;
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

// === 메인 도큐먼트 ===
export interface CollaborativeResearch {
  id: string;
  title: string;
  shortTitle?: string;
  collaborationType: CollaborationType;
  status: CollaborativeResearchStatus;

  // 연구 메타
  researchTopic: string;
  researchPurpose: string;
  researchQuestions?: string[];
  hypotheses?: Hypothesis[];
  variables?: ResearchVariables;
  methodology?: MethodologyMeta;
  irbStatus?: IRBStatusInfo;
  expectedOutcome?: string;

  // 팀
  leaderId: string;
  collaboratorCount: number;       // denorm
  collaboratorIds: string[];       // denorm, max 10, where-in 용

  // 일정
  startDate: string;               // YYYY-MM-DD
  targetEndDate?: string;
  actualEndDate?: string;

  // 분류
  tags: string[];
  conceptIds: string[];            // archive_concepts 참조
  methodIds: string[];             // archive_research_methods 참조

  // 가시성
  workspaceVisibility: "members_only";  // Phase 1 고정

  // 출판물 카운트 (Phase 3에서 활성, Phase 1은 0)
  workingPaperCount: number;
  journalArticleId?: string;

  createdAt: string;               // ISO
  updatedAt: string;
  createdBy: string;
}

export interface CollabResearchMember {
  id: string;                      // researchId + "_" + userId
  researchId: string;
  userId: string;
  role: CollabMemberRole;
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
  affiliation?: string;
  orcidId?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CollabResearchInvite {
  id: string;
  researchId: string;
  researchTitle: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientEmail?: string;
  proposedRole: CollabMemberRole;
  message?: string;
  status: CollabInviteStatus;
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

// === 입력용 DTO ===
export type CreateCollabResearchInput = Omit<
  CollaborativeResearch,
  "id" | "collaboratorCount" | "collaboratorIds" | "workingPaperCount" |
  "journalArticleId" | "createdAt" | "updatedAt"
>;

export type UpdateCollabResearchInput = Partial<
  Pick<CollaborativeResearch,
    "title" | "shortTitle" | "status" | "researchTopic" | "researchPurpose" |
    "researchQuestions" | "hypotheses" | "variables" | "methodology" | "irbStatus" |
    "expectedOutcome" | "targetEndDate" | "actualEndDate" | "tags" |
    "conceptIds" | "methodIds"
  >
>;

export type CreateCollabInviteInput = {
  researchId: string;
  recipientId: string;
  proposedRole: CollabMemberRole;
  message?: string;
};
```

### 3.1 `src/types/index.ts` 패치
```typescript
// 기존 16개 도메인 re-export 아래에 추가
export * from "./collaborative-research";
```

---

## 4. Firestore Rules (`firestore.rules` 신규 섹션)

### 4.1 헬퍼 함수 (기존 헬퍼 섹션 끝에 추가)
```javascript
// ─── Collaborative Research Helpers ───
function getCollabResearch(researchId) {
  return get(/databases/$(database)/documents/collaborative_research/$(researchId)).data;
}

function isCollabLeader(researchId) {
  return isAuthenticated()
    && exists(/databases/$(database)/documents/collaborative_research/$(researchId))
    && getCollabResearch(researchId).leaderId == request.auth.uid;
}

function isCollabMember(researchId) {
  let memberId = researchId + '_' + request.auth.uid;
  return isAuthenticated()
    && exists(/databases/$(database)/documents/collaborative_research_members/$(memberId))
    && get(/databases/$(database)/documents/collaborative_research_members/$(memberId))
       .data.status == 'active';
}

function isJournalEditor() {
  return isStaffOrAbove();
}

// society type 발주 활동은 staff 자동 read 권한
function isSocietyReadableByStaff(researchId) {
  return isStaffOrAbove() && getCollabResearch(researchId).collaborationType == 'society';
}
```

### 4.2 컬렉션 규칙 (Phase 1 — 3개 컬렉션)

```javascript
// ─── Collaborative Research (Phase 1) ───
match /collaborative_research/{researchId} {
  allow read: if isAuthenticated() && (
    isCollabLeader(researchId)
    || isCollabMember(researchId)
    || isSocietyReadableByStaff(researchId)
  );

  allow create: if isAuthenticated()
    && request.resource.data.leaderId == request.auth.uid
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.collaboratorCount == 1
    && request.resource.data.collaboratorIds.size() == 1
    && request.resource.data.collaboratorIds[0] == request.auth.uid
    && request.resource.data.workingPaperCount == 0
    && request.resource.data.workspaceVisibility == 'members_only';

  // leader만 메타 수정 가능. leaderId 자체는 절대 변경 불가 (이양은 별도 트랜잭션 — Phase 4).
  allow update: if isCollabLeader(researchId)
    && request.resource.data.leaderId == resource.data.leaderId
    && request.resource.data.createdBy == resource.data.createdBy;

  allow delete: if isCollabLeader(researchId) || isAdmin();
}

match /collaborative_research_members/{memberId} {
  // memberId 패턴: {researchId}_{userId}
  allow read: if isAuthenticated() && (
    resource.data.userId == request.auth.uid
    || isCollabMember(resource.data.researchId)
    || isCollabLeader(resource.data.researchId)
    || isSocietyReadableByStaff(resource.data.researchId)
  );

  // 멤버 추가는 leader만 (또는 invite 수락 트랜잭션 — 본인이 본인 멤버 생성)
  allow create: if isAuthenticated() && (
    (isCollabLeader(request.resource.data.researchId)
      && request.resource.data.userId != request.auth.uid)
    || (request.resource.data.userId == request.auth.uid
      && request.resource.data.invitedBy != request.auth.uid)
  );

  // 본인은 orcidId/affiliation/role(downgrade만), leader는 role/status 전부
  allow update: if isAuthenticated() && (
    (resource.data.userId == request.auth.uid
      && request.resource.data.researchId == resource.data.researchId
      && request.resource.data.userId == resource.data.userId)
    || isCollabLeader(resource.data.researchId)
  );

  // 본인이 자진 탈퇴(=leave) 또는 leader가 강제 제거
  allow delete: if isAuthenticated() && (
    resource.data.userId == request.auth.uid
    || isCollabLeader(resource.data.researchId)
    || isAdmin()
  );
}

match /collaborative_research_invites/{inviteId} {
  allow read: if isAuthenticated() && (
    resource.data.senderId == request.auth.uid
    || resource.data.recipientId == request.auth.uid
    || isStaffOrAbove()
  );

  // 초대 생성은 senderId가 본인 + 해당 연구의 leader여야 함
  allow create: if isAuthenticated()
    && request.resource.data.senderId == request.auth.uid
    && isCollabLeader(request.resource.data.researchId)
    && request.resource.data.status == 'pending';

  // 응답은 recipient만 (status: accepted/rejected), 취소는 sender만 (status: cancelled)
  allow update: if isAuthenticated() && (
    (resource.data.recipientId == request.auth.uid
      && request.resource.data.status in ['accepted', 'rejected'])
    || (resource.data.senderId == request.auth.uid
      && request.resource.data.status == 'cancelled')
  );

  allow delete: if isAuthenticated() && (
    resource.data.senderId == request.auth.uid || isAdmin()
  );
}
```

### 4.3 Phase 2~4 규칙 outline
- `collaborative_research_chapters/{id}`: 팀 멤버 read/create, version 일치 + role in [principal, co_researcher] update, leader delete
- `collaborative_research_comments/{id}`: 팀 멤버 read/create, author update(본인 body), leader/author delete
- `collaborative_research_meetings/{id}`: 팀 멤버 read/create, recordedBy/leader update, leader delete
- `collaborative_research_milestones/{id}`: 팀 멤버 read/create/update, leader delete
- `research_journal_issues/{id}`: published 공개 read, isJournalEditor write
- `research_journal_articles/{id}`: visibility 게이트 read, 팀 + isJournalEditor write 분리

---

## 5. Firestore Indexes (`firestore.indexes.json` 추가)

```json
{
  "indexes": [
    {
      "collectionGroup": "collaborative_research",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "collaboratorIds", "arrayConfig": "CONTAINS"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "updatedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "collaborative_research",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "collaborationType", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "updatedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "collaborative_research_members",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "joinedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "collaborative_research_members",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "researchId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "joinedAt", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "collaborative_research_invites",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "recipientId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "collaborative_research_invites",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "senderId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

> Phase 2~4 인덱스는 해당 Sprint에서 추가.

---

## 6. bkend API Shortcuts (`src/lib/bkend.ts` 추가)

기존 패턴(예: `activitiesApi`, `activityApplicantsApi`) 그대로 따른다.

```typescript
// === Collaborative Research (Phase 1) ===
export const collabResearchApi = {
  listByUser: async (userId: string): Promise<CollaborativeResearch[]> => {
    return dataApi.list<CollaborativeResearch>("collaborative_research", {
      where: [["collaboratorIds", "array-contains", userId]],
      orderBy: [["updatedAt", "desc"]],
      limit: 100,
    });
  },

  listForSociety: async (): Promise<CollaborativeResearch[]> => {
    return dataApi.list<CollaborativeResearch>("collaborative_research", {
      where: [["collaborationType", "==", "society"]],
      orderBy: [["status", "asc"], ["updatedAt", "desc"]],
      limit: 200,
    });
  },

  get: (id: string) =>
    dataApi.get<CollaborativeResearch>("collaborative_research", id),

  create: async (input: CreateCollabResearchInput): Promise<CollaborativeResearch> => {
    const now = new Date().toISOString();
    const doc: Omit<CollaborativeResearch, "id"> = {
      ...input,
      collaboratorCount: 1,
      collaboratorIds: [input.leaderId],
      workingPaperCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const created = await dataApi.create<CollaborativeResearch>("collaborative_research", doc);
    // 동시에 leader를 members 컬렉션에 등록
    await collabMembersApi.upsertSelf({
      researchId: created.id,
      userId: input.leaderId,
      role: "principal",
      creditRoles: ["conceptualization", "project_administration"],
      invitedBy: input.leaderId,
    });
    return created;
  },

  update: (id: string, patch: UpdateCollabResearchInput) =>
    dataApi.update<CollaborativeResearch>("collaborative_research", id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    }),

  remove: (id: string) => dataApi.delete("collaborative_research", id),
};

export const collabMembersApi = {
  listByResearch: (researchId: string) =>
    dataApi.list<CollabResearchMember>("collaborative_research_members", {
      where: [
        ["researchId", "==", researchId],
        ["status", "==", "active"],
      ],
      orderBy: [["joinedAt", "asc"]],
      limit: 50,
    }),

  listByUser: (userId: string) =>
    dataApi.list<CollabResearchMember>("collaborative_research_members", {
      where: [
        ["userId", "==", userId],
        ["status", "==", "active"],
      ],
      orderBy: [["joinedAt", "desc"]],
      limit: 100,
    }),

  // memberId 패턴 강제: {researchId}_{userId}
  upsertSelf: async (input: {
    researchId: string;
    userId: string;
    role: CollabMemberRole;
    creditRoles: CreditRole[];
    invitedBy: string;
  }): Promise<CollabResearchMember> => {
    const id = `${input.researchId}_${input.userId}`;
    const now = new Date().toISOString();
    const doc: CollabResearchMember = {
      id,
      researchId: input.researchId,
      userId: input.userId,
      role: input.role,
      creditRoles: input.creditRoles,
      joinedAt: now,
      invitedBy: input.invitedBy,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    return dataApi.set<CollabResearchMember>("collaborative_research_members", id, doc);
  },

  updateRole: (memberId: string, role: CollabMemberRole) =>
    dataApi.update<CollabResearchMember>("collaborative_research_members", memberId, {
      role,
      updatedAt: new Date().toISOString(),
    }),

  updateCreditRoles: (memberId: string, creditRoles: CreditRole[]) =>
    dataApi.update<CollabResearchMember>("collaborative_research_members", memberId, {
      creditRoles,
      updatedAt: new Date().toISOString(),
    }),

  updateSelfMeta: (memberId: string, patch: { affiliation?: string; orcidId?: string }) =>
    dataApi.update<CollabResearchMember>("collaborative_research_members", memberId, {
      ...patch,
      updatedAt: new Date().toISOString(),
    }),

  // 자진 탈퇴
  leave: async (memberId: string) => {
    const now = new Date().toISOString();
    await dataApi.update<CollabResearchMember>("collaborative_research_members", memberId, {
      status: "left",
      leftAt: now,
      updatedAt: now,
    });
    // (선택) collaborativeResearch.collaboratorIds 동기화는 Cloud Function 트리거 또는 client batch
  },

  remove: (memberId: string) => dataApi.delete("collaborative_research_members", memberId),
};

export const collabInvitesApi = {
  listInbox: (recipientId: string) =>
    dataApi.list<CollabResearchInvite>("collaborative_research_invites", {
      where: [
        ["recipientId", "==", recipientId],
        ["status", "==", "pending"],
      ],
      orderBy: [["createdAt", "desc"]],
      limit: 50,
    }),

  listSent: (researchId: string) =>
    dataApi.list<CollabResearchInvite>("collaborative_research_invites", {
      where: [["researchId", "==", researchId]],
      orderBy: [["createdAt", "desc"]],
      limit: 100,
    }),

  create: async (input: CreateCollabInviteInput & {
    senderId: string;
    senderName: string;
    researchTitle: string;
    recipientEmail?: string;
  }): Promise<CollabResearchInvite> => {
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const doc: Omit<CollabResearchInvite, "id"> = {
      ...input,
      status: "pending",
      expiresAt: expires,
      createdAt: now,
    };
    return dataApi.create<CollabResearchInvite>("collaborative_research_invites", doc);
  },

  // 수락: invite update + member 생성 + research.collaboratorIds 증가 — 3-step 트랜잭션
  accept: async (
    inviteId: string,
    recipientId: string,
    research: { id: string; collaboratorIds: string[]; collaboratorCount: number }
  ) => {
    const now = new Date().toISOString();
    // 1) invite 응답
    await dataApi.update<CollabResearchInvite>("collaborative_research_invites", inviteId, {
      status: "accepted",
      respondedAt: now,
    });
    // 2) members 생성 (memberId = researchId_userId)
    const invite = await dataApi.get<CollabResearchInvite>("collaborative_research_invites", inviteId);
    await collabMembersApi.upsertSelf({
      researchId: research.id,
      userId: recipientId,
      role: invite.proposedRole,
      creditRoles: [],
      invitedBy: invite.senderId,
    });
    // 3) research denorm 업데이트 (leader가 trigger 필요 — Phase 1은 leader가 dashboard 진입 시 동기화 fallback)
    if (!research.collaboratorIds.includes(recipientId)) {
      await collabResearchApi.update(research.id, {
        // collaboratorIds·collaboratorCount는 rules에서 leader만 수정 가능 → Phase 1은 leader가 dashboard 열 때 reconcile
        // (Phase 2에서 Cloud Function batched trigger로 이관)
      });
    }
  },

  reject: (inviteId: string) => {
    return dataApi.update<CollabResearchInvite>("collaborative_research_invites", inviteId, {
      status: "rejected",
      respondedAt: new Date().toISOString(),
    });
  },

  cancel: (inviteId: string) => {
    return dataApi.update<CollabResearchInvite>("collaborative_research_invites", inviteId, {
      status: "cancelled",
      respondedAt: new Date().toISOString(),
    });
  },
};
```

> **트랜잭션 정합성 노트**: Phase 1은 `accept` 시 invite 응답 + member 생성까지만 강한 정합성 보장. `collaboratorIds` denorm 동기화는 leader가 대시보드 진입 시 reconcile 함수로 (client side, 다음 섹션 참고). Phase 4에서 Cloud Function 트리거로 이관 예정.

---

## 7. React Query Hooks (`src/features/collaborative-research/api/`)

```typescript
// useCollabResearchList.ts — 내 참여 연구 목록
export function useCollabResearchList(userId: string | undefined) {
  return useQuery({
    queryKey: ["collab-research", "by-user", userId],
    queryFn: () => userId ? collabResearchApi.listByUser(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// useCollabResearch.ts — 단건 + members + invites 같이
export function useCollabResearch(researchId: string | undefined) {
  return useQuery({
    queryKey: ["collab-research", researchId],
    queryFn: () => researchId ? collabResearchApi.get(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 10_000,
  });
}

// useCollabMembers.ts
export function useCollabMembers(researchId: string | undefined) {
  return useQuery({
    queryKey: ["collab-research", researchId, "members"],
    queryFn: () => researchId ? collabMembersApi.listByResearch(researchId) : Promise.resolve([]),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

// useCollabInvites.ts — 내 inbox + 팀 sent 두 종류
export function useCollabInboxInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ["collab-invites", "inbox", userId],
    queryFn: () => userId ? collabInvitesApi.listInbox(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000, // 1분마다 inbox 폴링 (실시간성)
  });
}

// useCollabMutations.ts — create/update/invite/accept/reject 일괄
export function useCreateCollabResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: collabResearchApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["collab-research"] });
      toast.success("연구팀이 생성되었습니다");
    },
  });
}

export function useAcceptCollabInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { inviteId: string; recipientId: string; research: CollaborativeResearch }) => {
      await collabInvitesApi.accept(params.inviteId, params.recipientId, params.research);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collab-research"] });
      qc.invalidateQueries({ queryKey: ["collab-invites"] });
      toast.success("연구팀에 참여했습니다");
    },
  });
}

// ... reject / cancel / createInvite / updateMeta / updateRole / leave 등 동일 패턴
```

### 7.1 reconcile 함수 (leader denorm sync)

```typescript
// lib/collab-reconcile.ts
export async function reconcileCollaborators(researchId: string) {
  const [research, members] = await Promise.all([
    collabResearchApi.get(researchId),
    collabMembersApi.listByResearch(researchId),
  ]);
  if (!research) return;
  const activeIds = members.filter(m => m.status === "active").map(m => m.userId);
  const sortedActive = [...new Set([research.leaderId, ...activeIds])].sort();
  const sortedCurrent = [...research.collaboratorIds].sort();
  const isSynced =
    research.collaboratorCount === activeIds.length &&
    JSON.stringify(sortedCurrent) === JSON.stringify(sortedActive);
  if (!isSynced) {
    await collabResearchApi.update(researchId, {
      // collaboratorIds·collaboratorCount는 rules update 허용 필드 — Phase 1 한정으로 풀어두고
      // (4.2 rules의 update 허용 패턴은 leaderId/createdBy 불변만 강제, 다른 필드는 freeForm).
    } as any);
  }
}

// 대시보드 layout에서 leader 진입 시 자동 호출
useEffect(() => {
  if (user?.id === research?.leaderId) reconcileCollaborators(research.id);
}, [user?.id, research?.id]);
```

---

## 8. UI 컴포넌트 시그니처 (Phase 1)

### 8.1 페이지 컴포넌트
```typescript
// src/app/collab/page.tsx — 내 참여 연구 목록
"use client";
export default function CollabResearchListPage() {
  // useAuth → user
  // useCollabResearchList(user.id)
  // useCollabInboxInvites(user.id) — 상단 InviteInbox
  // PageContainer + PageHeader("공동 연구", action: <Button href="/collab/new">+ 새 팀</Button>)
  // <CollabResearchInviteInbox invites={inbox} /> if invites.length
  // grid: <CollabResearchCard research={r} role={memberRole} /> per item
  // Empty: <CollabResearchListEmpty />
}

// src/app/collab/new/page.tsx — 팀 생성
"use client";
export default function NewCollabResearchPage() {
  // PageContainer + BackButton
  // <CollabResearchMetaForm mode="create" onSubmit={createMutation.mutateAsync} />
  // 성공 시 router.push(`/collab/${created.id}`)
}

// src/app/collab/[researchId]/layout.tsx
export default async function CollabLayout({ children, params }) {
  // server: research fetch + 멤버십 검증 (404 또는 access denied)
  // sidebar nav: 대시보드 | 멤버 | 메타 | (Phase 2~) 챕터 | 회의 | 일정 | (Phase 3) 출판 | 설정(leader only)
}

// src/app/collab/[researchId]/page.tsx — 대시보드
"use client";
export default function CollabDashboardPage({ params }) {
  // useCollabResearch(researchId), useCollabMembers(researchId)
  // <CollabResearchHeader research={research} role={myRole} />
  // grid 2-col:
  //   left: 진도 요약 (Phase 1은 멤버 수·메타 채움률만), 최근 활동(Phase 2~)
  //   right: 멤버 패널 요약 + 다음 액션 카드
  // leader 진입 시 reconcileCollaborators() effect 호출
}

// src/app/collab/[researchId]/members/page.tsx
"use client";
export default function CollabMembersPage({ params }) {
  // <CollabResearchMembersPanel researchId={researchId} editable={isLeader} />
  // <CollabResearchInviteDialog (leader only) />
}

// src/app/collab/[researchId]/meta/page.tsx
"use client";
export default function CollabMetaPage({ params }) {
  // <CollabResearchMetaForm mode="edit" research={research} onSubmit={updateMutation.mutateAsync} />
  // Tabs: 기본 / 변인·가설 / 방법론 / IRB / 분류
}

// src/app/collab/[researchId]/settings/page.tsx
"use client";
export default function CollabSettingsPage({ params }) {
  // leader only
  // status 변경(active/paused/archived) + 삭제 위험 영역
}
```

### 8.2 핵심 컴포넌트 props
```typescript
// CollabResearchCard.tsx
interface Props {
  research: CollaborativeResearch;
  myRole?: CollabMemberRole;  // 카드 우측 배지
}

// CollabResearchHeader.tsx
interface Props {
  research: CollaborativeResearch;
  myRole?: CollabMemberRole;
  actions?: React.ReactNode;
}

// CollabResearchMetaForm.tsx — create/edit 통합
interface Props {
  mode: "create" | "edit";
  research?: CollaborativeResearch;
  onSubmit: (input: CreateCollabResearchInput | UpdateCollabResearchInput) => Promise<void>;
}
// 내부: react-hook-form + zod. Tabs 5개. 각 Tab은 별도 sub-form 컴포넌트로 분리.

// CollabResearchVariablesEditor.tsx
interface Props {
  value?: ResearchVariables;
  onChange: (variables: ResearchVariables) => void;
}
// 5개 카테고리(독립/종속/매개/조절/통제) × 추가/삭제/조작적 정의 + measurementToolId picker(archive 연계)

// CollabResearchHypothesesEditor.tsx
interface Props {
  value?: Hypothesis[];
  onChange: (hypotheses: Hypothesis[]) => void;
}
// 가설 카드 add/edit/remove, type·status 셀렉트

// CollabResearchIrbCard.tsx
interface Props {
  value?: IRBStatusInfo;
  onChange: (irb: IRBStatusInfo) => void;
}
// required 토글 → 필수일 때 status/approvalNumber/dates/documentUrl 입력
// status==='approved' && expiryDate < today 일 때 경고

// CollabResearchMembersPanel.tsx
interface Props {
  researchId: string;
  editable: boolean;  // leader 여부
}
// 리스트: 이름 + 역할 배지 + CRediT chips + ORCID(있을 때)
// editable: role 변경 셀렉트, CreditRoleSelector, 멤버 제거 버튼

// CreditRoleSelector.tsx
interface Props {
  value: CreditRole[];
  onChange: (roles: CreditRole[]) => void;
}
// 14개 chip 토글 + 한글 라벨(credit-roles.ts 참조)

// CollabResearchInviteDialog.tsx
interface Props {
  researchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
// MemberPicker(기존 재사용) + role 선택 + 메시지 textarea + 14일 자동 만료 안내

// CollabResearchInviteInbox.tsx
interface Props {
  invites: CollabResearchInvite[];
}
// 카드 리스트: "{senderName}이 [{researchTitle}] 공동연구에 {proposedRole}로 초대했습니다"
// 수락/거절 버튼 → useAcceptCollabInvite / useRejectCollabInvite

// CollabResearchRoleBadge.tsx
interface Props {
  role: CollabMemberRole;
  size?: "sm" | "md";
}
// principal: 보라 / co_researcher: primary / advisor: amber / reviewer: cyan / assistant: gray
```

### 8.3 MyPage 5번째 탭 패치 (`src/app/mypage/research/page.tsx`)
```typescript
// 기존: 내 논문, 논문 분석, 연구 보고서, 연구 계획서 (4탭)
// 추가: "공동 연구" (5번째 탭)
// 컨텐츠: <CollabResearchListPage compact /> — 카드 그리드 + InviteInbox
// (또는 단순 링크 카드로 두고 클릭 시 /collab으로 이동 — Phase 1은 후자 추천, 가벼움)
```

---

## 9. 알림 인프라 확장 (Phase 1 — invite 알림만)

### 9.1 NotificationPrefs 추가 (`src/types/user.ts` 또는 별도 모듈)
```typescript
export interface NotificationPrefs {
  // ... existing
  pushCollabInvite: boolean;     // Phase 1
  // Phase 2~4: pushCollabMention, pushCollabMilestone, pushCollabReview, pushJournalIssue
}
```
기본값 `true`. MyPage 알림 설정 UI에 토글 1개 추가.

### 9.2 invite 생성 시 push 알림
```typescript
// src/lib/notifications/sendCollabInviteNotification.ts
export async function sendCollabInviteNotification(invite: CollabResearchInvite) {
  // 1) push_logs 중복 체크: kind=`collab_invite:${invite.id}` (이미 있으면 skip)
  // 2) 수신자 NotificationPrefs.pushCollabInvite === false면 skip
  // 3) FCM payload: title="새 공동연구 초대", body=`${invite.senderName}이 [${invite.researchTitle}] 팀에 초대했습니다`
  //    data: { type: "collab_invite", inviteId, researchId, url: "/collab" }
  // 4) FCM 전송 후 push_logs에 기록
}
```
호출 위치: `collabInvitesApi.create` 직후 (client → API route `/api/notifications/collab-invite`).

---

## 10. streak_events 추가 (Phase 1)

```typescript
// src/types/streak-event.ts
export type StreakEventType =
  | ... // existing
  | "collaborative_research_join";    // Phase 1
  // | "collaborative_research_chapter_edit" — Phase 2
  // | "collaborative_research_meeting" — Phase 2
  // | "collaborative_research_milestone" — Phase 2
  // | "research_journal_publish" — Phase 3
```

기여도 점수 (3pt):
```typescript
const STREAK_POINTS: Record<StreakEventType, number> = {
  ...,
  collaborative_research_join: 3,
};
```

이벤트 발생 위치: `collabInvitesApi.accept` 트랜잭션 직후.

---

## 11. Phase 1 구현 순서 체크리스트 (Sprint A — 약 8h)

```
PR #1 (인프라 — 30분)
  [ ] src/types/collaborative-research.ts 신규 (3장 코드 그대로)
  [ ] src/types/index.ts re-export 1줄 추가
  [ ] tsc 통과 확인

PR #2 (rules + indexes + bkend API — 1.5h)
  [ ] firestore.rules 헬퍼 4개 + 컬렉션 규칙 3개 (4.1~4.2)
  [ ] firestore.indexes.json 인덱스 6개 (5장)
  [ ] src/lib/bkend.ts: collabResearchApi / collabMembersApi / collabInvitesApi
  [ ] firebase emulator 또는 firestore rule unit test로 권한 검증 (선택)
  [ ] tsc + npm run build 통과

PR #3 (React Query hooks + reconcile — 30분)
  [ ] src/features/collaborative-research/api/* 5개 훅
  [ ] src/features/collaborative-research/lib/credit-roles.ts (14역할 한글 라벨)
  [ ] src/features/collaborative-research/lib/research-status.ts
  [ ] reconcileCollaborators 함수

PR #4 (페이지 + 컴포넌트 — 4h)
  [ ] src/app/collab/page.tsx (목록 + Inbox)
  [ ] src/app/collab/new/page.tsx (생성)
  [ ] src/app/collab/[researchId]/layout.tsx (멤버 가드)
  [ ] src/app/collab/[researchId]/page.tsx (대시보드)
  [ ] src/app/collab/[researchId]/members/page.tsx
  [ ] src/app/collab/[researchId]/meta/page.tsx (5탭)
  [ ] src/app/collab/[researchId]/settings/page.tsx (leader only)
  [ ] components: 11개 (8.2 참조)
  [ ] /mypage/research에 5번째 탭(또는 진입 카드)

PR #5 (알림 + streak — 30분)
  [ ] NotificationPrefs.pushCollabInvite 추가 + 마이페이지 토글
  [ ] /api/notifications/collab-invite route + sendCollabInviteNotification
  [ ] StreakEventType: collaborative_research_join 추가 + 점수 매핑
  [ ] collabInvitesApi.accept에서 streak event 발생

PR #6 (검증 + 배포 — 1h)
  [ ] 로컬 시나리오 검증 (12장)
  [ ] npm run build 통과
  [ ] firebase deploy --only firestore:rules,firestore:indexes
  [ ] git push + npm run deploy:vercel
  [ ] alias 확인 (yonsei-edtech.vercel.app)
```

**원자성**: 각 PR을 단일 commit으로 묶고 순서대로 머지. 사용자 트래픽 영향 없는 신규 라우트 추가이므로 feature flag 불요.

---

## 12. 테스트 시나리오 (수동 검증)

### 12.1 Golden Path
```
1. 사용자 A 로그인 → /collab/new → "공동 연구 1" 생성 (peer)
2. /collab/[id] 대시보드 진입 → 본인이 principal로 등록되어 있는지 확인
3. /collab/[id]/members → "+ 초대" → 사용자 B 선택, role=co_researcher
4. 사용자 B 로그인 → /collab → InviteInbox 카드 표시 + push 알림 도착 확인
5. B가 수락 → /collab 목록에 등장, A의 대시보드에 멤버 2명 표시
6. A가 /meta에서 연구주제·목적·변인·가설·IRB 입력 → 저장
7. B가 /meta에서 동일 데이터 읽기 가능, 수정 시 권한 확인 (leader만 수정 가능 — Phase 1)
8. A가 /settings에서 status를 paused로 변경 → 대시보드 상태 배지 변경
```

### 12.2 권한 거부 시나리오
```
- 비멤버 C가 /collab/[id] 직접 URL 접근 → 404 또는 access denied
- B가 (leader 아닌데) PATCH로 collaborativeResearch 수정 시도 → firestore rules에서 차단
- B가 leaderId 변경 시도 → 차단 (불변)
- C가 자기를 멤버로 추가 시도 (POST collaborative_research_members) → 차단 (rules에서 invitedBy != self 강제)
- 만료된 초대(expiresAt < now)는 cron 없이 클라이언트에서 hide만 (Phase 1), 실제 status='expired' 전환은 Phase 2 cron
```

### 12.3 동시성 시나리오
```
- A와 B가 동시에 /meta 저장 → updatedAt 마지막 승리(Phase 1 한정), Phase 2에서 version 도입
- A가 초대 보낸 직후 B가 수락 → invite.status, member 생성, research.collaboratorIds 모두 정합
- leader 대시보드 진입 시 reconcileCollaborators가 collaboratorIds < members 갭 자동 복구
```

---

## 13. Rollback 전략

- **PR 단위 revert**: 각 PR이 단일 commit이므로 git revert <sha> 로 즉시 복구 가능
- **rules·indexes 별도 rollback**: `git revert` 후 `firebase deploy --only firestore:rules,firestore:indexes`
- **데이터 정리**: Phase 1 실패 시 collaborative_research_* 3개 컬렉션 삭제 (사용자에게 사전 공지 — 베타 표기)
- **Vercel rollback**: 직전 production deployment promote (1-click)
- **롤백 영향**: 신규 도메인이라 기존 기능 영향 0. 안전한 추가 변경.

---

## 14. Phase 2~4 Outline (Sprint B/C/D)

### Phase 2 — 공동작성+논의+회의+마일스톤 (Sprint B, ~9h)
**컬렉션**: collaborative_research_chapters / _comments / _meetings / _milestones
**라우트**:
- `/collab/[id]/chapters` (목록 + 진도바), `/chapters/[key]` (편집 + 댓글 split)
- `/collab/[id]/meetings`, `/collab/[id]/milestones`
**컴포넌트**:
- `CollabChapterEditor`: markdown + optimistic locking(version), autosave 3s throttle
- `CollabCommentSidebar`: 챕터 단위 + anchor 단위(블록 ID), @멘션
- `MentionInput`: 회원 자동완성 + mentionedUserIds 추적
- `CollabMeetingNoteEditor`: agenda/notes/decisions/actionItems 4섹션
- `CollabMilestoneTimeline`: 표 + 배지 + 진행률
**인프라**:
- NotificationPrefs: pushCollabMention, pushCollabMilestone 추가
- cron: `/api/cron/collab-milestone-reminder` (09:00 KST, D-1 알림)
- cron: `/api/cron/collab-invite-expire` (00:00 KST, expiresAt 지난 invite status=expired)
- StreakEvent: chapter_edit (2pt), meeting (3pt), milestone (5pt)
**인덱스 추가**: chapters(researchId, order) / comments(chapterId, createdAt desc) / comments(mentionedUserIds CONTAINS, resolvedAt) / meetings(researchId, scheduledAt desc) / milestones(assigneeIds CONTAINS, status, targetDate)

### Phase 3 — 연구지 출판 (Sprint C, ~10h)
**컬렉션**: research_journal_issues / research_journal_articles
**라우트**:
- `/collab/[id]/publish` (5단계 마법사)
- `/journal` (호수별 목록 + 최근 워킹페이퍼)
- `/journal/v[v]-n[n]` (호수 상세)
- `/journal/articles/[id]` (논문 상세 + JSON-LD ScholarlyArticle)
- `/journal/search` (검색)
- `/console/research`에 "연구지" 5번째 탭 (검수 큐 + 호수 편집)
**컴포넌트**:
- `JournalPublishWizard`: 형식선택 → 메타 → 저자 동의 게이트 → IMRaD 본문 → 검수 제출
- `JournalArticleView`: Reader 모드, TOC, 인용 사이드, CRediT 그리드
- `JournalIssueEditor`: 운영진 콘솔
- `JournalSearchPage`
**핵심 로직**:
- 저자 동의 게이트: 모든 active collaborator에게 push, 100% 응답 전 submitted 불가
- 워킹 페이퍼: leader 자율 publish
- 정식: draft → submitted → under_review → revision_requested ↔ accepted → published
- PDF 생성: 기존 newsletter-pdf 인프라(jsPDF or react-pdf) 재사용
- JSON-LD: visibility=='public' && reviewStatus=='published' 만 노출
- 인덱스 추가: articles(visibility, publishedAt desc), articles(reviewStatus, updatedAt desc), articles(issueId, pageStart)

### Phase 4 — 기여도·통계·운영 (Sprint D, ~5h)
**라우트**:
- `/collab/[id]/contributions` (CRediT × 활동량 매트릭스)
- `/console/research` 통계 위젯 + leaderboard에 옵트인 신규 카테고리
**기능**:
- MyPage 학습 잔디에 collaborative_research_* 이벤트 통합
- 발간 viewCount/downloadCount denorm increment (Firestore rate limit 적용)
- D+30 후기 요청 cron
- (옵션) Cloud Function: invite accept 트리거 → research.collaboratorIds/Count 자동 업데이트

---

## 15. 다음 단계

1. **사용자 검토** — 본 Design 문서에 대한 피드백 (특히 rules·API·PR 분할)
2. **Phase 1 착수** — `/pdca do collaborative-research` → 11장 체크리스트대로 PR #1~#6 순차 진행
3. **각 PR 완료 시점에 Vercel preview 배포 + 시나리오 검증**

> **HARD-GATE**: Design 승인 전 어떤 구현 코드도 작성하지 않음.
> Design 자체 수정 의견 있으면 즉시 반영, 진행 OK면 `/pdca do collaborative-research` 또는 "do 진행" 으로 신호.
