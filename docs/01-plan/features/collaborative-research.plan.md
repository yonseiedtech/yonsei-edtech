# Plan: 공동 연구 + 연구지(Research Journal) 발간 (collaborative-research)

> **작성일**: 2026-05-25
> **PDCA 단계**: Plan (Plan Plus 적용)
> **추정 작업량**: 4 Sprint × 평균 8h = 32h
> **선행 작업**: 없음 (신규 도메인)
> **연관 작업**: `console-research-ux.plan.md` (운영 콘솔 진입점), `alumni-thesis-db.plan.md` (연구지→졸업논문 역방향 연계 후보)

---

## 1. 배경 (Problem & Opportunity)

### 1.1 현 상황
| 연구활동 종류 | 컬렉션 | 소유 모델 | 협업 가능성 |
|--------------|--------|-----------|------------|
| 논문 분석 노트 | `research_papers` | `userId` 단독 | ❌ 공유 불가 |
| 내 논문 작성 | `writing_papers` | `userId` 1인 1건 | ❌ 공유 불가 |
| 연구 보고서 (ID 절차) | `research_reports` | `userId` 1인 1건 | ❌ 공유 불가 |
| 연구 계획서 | `research_proposals` | `userId` 1인 1건 | ❌ 공유 불가 |
| 학회 학술활동(스터디·프로젝트) | `activities` (type=study/project) | `leaderId + participants[]` | ✅ 운영 협업만 (연구 산출물 없음) |

**문제**: 교육공학 대학원 환경에서 공동 연구는 졸업·연구 활동의 핵심 형태(advisor-mentee, 동료 peer team)임에도, 현 사이트는 **모든 연구 도구가 1인 소유**로 묶여 있어 공동 작업이 불가능. 학생들은 결국 Notion·Google Docs로 빠져나가게 되어 학회의 학술 정체성을 약화시킴.

**기회**: yonsei-edtech는 이미 (a) 학술활동 협업 구조(leader+participants+회고+과제+노트 5종 서브컬렉션), (b) push 알림 인프라(NotificationPrefs 5종 + cron), (c) learning streak·leaderboard 동기부여 시스템, (d) 졸업생 학위논문 DB(alumni_theses 500건), (e) 교육공학 아카이브(archive_concepts, archive_research_methods, archive_statistical_methods)를 모두 보유. 이 위에 공동 연구 도메인을 얹으면 **"학회에서 연구하고 학회지에 발간한다"** 라는 학술 공동체의 본질을 디지털로 구현 가능.

### 1.2 학회보(card_news_series)와 연구지(Research Journal)의 차별점

| 항목 | 학회보 (card_news_series) | 연구지 (research_journal_*) |
|------|---------------------------|----------------------------|
| **목적** | 학회 소식·트렌드·이슈 전달 | 연구 결과물 학술 출판 |
| **형식** | 인스타 슬라이더 카드 (시각 우선) | IMRaD 구조 학술논문 / 워킹 페이퍼 |
| **저자** | 운영진 큐레이션 1인 | 공동 저자 (1~N명, CRediT) |
| **검수** | 운영진 자율 게시 | 정식 트랙은 운영진 피어리뷰 워크플로우 |
| **인용성** | 비공식 | Volume·Issue·DOI 가능 → APA7 인용 |
| **보존** | 게시판형(휘발성 있음) | 호수 단위 영구 아카이브 |
| **공개 범위** | 즉시 공개 | 단계적(private→society→public) |
| **외부 노출** | 인스타그램 연계 | JSON-LD ScholarlyArticle + SEO |

→ **두 트랙은 완전히 분리**하되, `/journal` 공개 라우트는 추후 `/card-news` 와 사이드바에서 형제 항목으로 배치.

---

## 2. 사용자 의도 (Phase 1 — Intent Discovery 결과)

`AskUserQuestion` 4문 결과:

| 결정 항목 | 사용자 선택 | 구현 함의 |
|----------|------------|----------|
| **협업 형태** | 혼합형 (peer + society) | `collaborationType` 필드로 분기, 권한·UI 동일 골격에 부가 규칙 |
| **연구지 형식** | 두 트랙 모두 (정식 + 워킹) | `publicationType: "journal" \| "working_paper" \| "note"` |
| **공개·검수** | 3단계 visibility + 정식 검수 | `visibility: "private" \| "society" \| "public"` + `reviewStatus` 분리 |
| **도메인 위치** | 별도 도메인 (독립) | `collaborative_research_*` 컬렉션, Activity와 데이터·UI 모두 분리 |

### 2.1 핵심 사용 시나리오
- **시나리오 A (peer)**: 동기 3명이 "마이크로러닝 효과 메타분석" 팀을 만들고 advisor 교수를 reviewer 역할로 초대 → 6개월 진행 → 워킹 페이퍼 출판 → society 공개
- **시나리오 B (society)**: 학회장이 "2026 연감 연구"를 발주, 운영진 4명 모집 → 정식 연구지로 검수·발간 → public 공개, JSON-LD로 검색 노출
- **시나리오 C (advisor-led)**: 지도교수가 본인 학생 2명과 팀 구성, 졸업논문 준비 과정의 일부 산출물을 노트 형태로 공유

---

## 3. 대안 검토 (Phase 2 — Alternatives Explored)

### 접근 A — Activity 확장 (`type: "collaborative_research"`)
- **장점**: 기존 출석·과제·회고·노트 인프라 즉시 재사용, 코드 추가 최소
- **단점**: Activity 스키마에 연구 특화 필드(가설·IRB·변인·CRediT) 추가 시 도메인 오염, ResearchReport 모델과 강결합 어려움, 권한 모델이 학술활동과 섞임
- **결론**: ❌ 거부 (사용자 결정과 일치)

### 접근 B — 별도 도메인 (collaborative_research_*) ✅ 선택
- **장점**: 연구 특화 필드 자유 설계, 권한·UI·라우트 모두 독립, 정식 학술 출판 워크플로우를 깊게 지원, 학술 정체성 강화
- **단점**: 신규 컬렉션 6~8개, 권한 룰 + push 알림 + cron 신규, 초기 구현 비용 ↑
- **결론**: ✅ 채택 (장기 가치가 비용을 능가, 사용자 선택)

### 접근 C — Hybrid (Activity + 1:1 collaborative_research_meta)
- **장점**: 인프라 재사용 + 도메인 청결성 양립
- **단점**: 두 테이블 sync 부담, 권한·삭제 정합성 복잡, 디버깅 난이도 ↑
- **결론**: ❌ 거부 (운영 부담 대비 이득 작음)

---

## 4. YAGNI 범위 (Phase 3 — In/Out)

### ✅ In Scope (Phase 1~4 전체)
- 연구팀 CRUD + 멤버 관리 + 초대 시스템 + push 알림
- 연구 메타필드(연구주제·목적·변인·가설·IRB·일정)
- 챕터별 공동 작성 + 댓글·@멘션 스레드 + 팀 노트
- 워킹 페이퍼 출판(자율, 6챕터+PDF)
- 정식 연구지 발간(Volume·Issue·DOI·IMRaD·APA7·운영진 검수)
- 3단계 visibility + `/journal` 공개 페이지(JSON-LD)
- 일정 타임라인 + D-1 push 알림 cron
- CRediT 14역할 + streak_events 적립 + 기여도 대시보드

### ⏭ Out of Scope (Future)
- **실시간 동시편집(OT/CRDT)** — Phase 1~4에서는 React Query polling으로 충분. Yjs/Liveblocks 도입은 v2.
- **Slack/Discord 연동** — push 알림으로 일단 충족
- **외부 검색엔진(Elasticsearch)** — 회원 수 ≤ 500 규모에서는 Firestore 인덱스로 충분
- **DOI 자동 발급(DataCite/CrossRef API 연동)** — Phase 3에서는 운영자 수동 입력. 외부 등록은 학회 차원 결정 후 v2.
- **표절 검사(Turnitin/Copy Killer API)** — 사용자에게 외부 도구 사용 안내 텍스트만 제공
- **ORCID 통합** — 저자 프로필에 텍스트 필드로만 보관, OAuth 연결은 v2
- **버전 비교(diff)** — 워킹/정식 출판본 스냅샷만 보존, line-by-line diff UI는 v2
- **데이터 저장소(Zenodo·OSF 연동)** — 외부 링크 필드만 제공
- **자동 reference manager(Zotero 동기화)** — 수동 입력 + RIS/BibTeX 임포트만 유지

### ❌ Removed (의도적 배제)
- 운영진이 임의로 모든 팀 데이터 read — **민감 연구의 사전 동의 없는 열람은 학술윤리상 부적절**. 운영진은 published 출판물만 read, 진행중 팀 데이터는 `support_request` 모드일 때만 한시적 열람.
- 비회원(guest) 공동저자 — 학회 회원 한정. 외부 협력자는 본문 footnote로만 명시.

---

## 5. 데이터 모델

### 5.1 신규 컬렉션 (8개)

#### A. `collaborative_research/{researchId}` — 연구팀 본체
```typescript
interface CollaborativeResearch {
  id: string;
  title: string;
  shortTitle?: string;                    // 30자 이내 축약 (목록 카드용)
  collaborationType: "peer" | "society";  // 동료 자율 vs 학회 발주
  status: "planning" | "active" | "writing" | "review" | "published" | "paused" | "archived";

  // 연구 메타 (전문가 관점 핵심)
  researchTopic: string;                  // 연구 주제 (한 줄)
  researchPurpose: string;                // 연구 목적
  researchQuestions?: string[];           // 연구 문제 (다수)
  hypotheses?: Hypothesis[];              // 가설 목록
  variables?: ResearchVariables;          // 독립/종속/매개/조절/통제
  methodology?: MethodologyMeta;          // 정량/정성/혼합 + 설계
  irbStatus?: IRBStatus;                  // 연구윤리 추적
  expectedOutcome?: string;               // 기대 산출물

  // 팀 메타
  leaderId: string;                       // 책임연구자 (corresponding)
  collaboratorCount: number;              // denorm, 목록 페이지 정렬용
  collaboratorIds: string[];              // denorm, where-in 쿼리용 (max 10)

  // 일정
  startDate: string;                      // ISO date
  targetEndDate?: string;
  actualEndDate?: string;

  // 분류
  tags: string[];                         // 자유 태그
  conceptIds: string[];                   // archive_concepts 참조 (다대다)
  methodIds: string[];                    // archive_research_methods 참조

  // 가시성 (출판물과 별개의 팀 작업 공간 가시성)
  workspaceVisibility: "members_only";    // Phase 1은 멤버 전용 고정. society 발주는 운영진 자동 read 권한 부여.

  // 출판물 카운트 (denorm)
  workingPaperCount: number;
  journalArticleId?: string;              // 정식 연구지 발간 1건 참조 (1:0..1)

  createdAt: string;                      // ISO
  updatedAt: string;
  createdBy: string;                      // = leaderId
}

interface Hypothesis {
  id: string;
  text: string;                           // 예: "마이크로러닝 그룹의 학습몰입은 통제집단보다 유의하게 높을 것이다"
  type: "directional" | "non_directional" | "null";
  status: "proposed" | "supported" | "rejected" | "partial" | "deferred";
  evidence?: string;                      // 검증 결과 요약
}

interface ResearchVariables {
  independent: VariableEntry[];
  dependent: VariableEntry[];
  mediator?: VariableEntry[];
  moderator?: VariableEntry[];
  control?: VariableEntry[];
}

interface VariableEntry {
  id: string;
  name: string;
  operationalDefinition?: string;         // 조작적 정의 (학술 핵심)
  measurementTool?: string;               // archive_measurement_tools 참조 또는 free text
  measurementToolId?: string;
}

interface MethodologyMeta {
  kind: "quantitative" | "qualitative" | "mixed";
  design?: "experimental" | "quasi_experimental" | "correlational" | "case_study"
    | "ethnography" | "grounded_theory" | "design_based_research" | "action_research"
    | "phenomenology" | "narrative" | "other";
  sampling?: string;                      // 표집 전략
  dataCollection?: string;                // 자료 수집 계획
  analysisMethod?: string;                // 분석 방법
  ethicsNote?: string;                    // 윤리적 고려사항
}

interface IRBStatus {
  required: boolean;
  status?: "not_required" | "preparing" | "submitted" | "approved" | "rejected" | "exempt";
  approvalNumber?: string;                // 예: "연세대 IRB-2026-1234"
  approvalDate?: string;
  expiryDate?: string;
  documentUrl?: string;                   // 승인서 PDF (storage)
}
```

#### B. `collaborative_research_members/{researchId}_{userId}` — 멤버십 (split for query)
> denormalize 이유: collaboratorIds 배열은 max 10 + where-in 한계. 100명 규모 팀이나 "내가 참여중인 모든 연구" 역방향 쿼리에는 별도 컬렉션이 필요.

```typescript
interface CollaborativeResearchMember {
  id: string;                             // = researchId + "_" + userId
  researchId: string;
  userId: string;
  role: "principal" | "co_researcher" | "advisor" | "reviewer" | "assistant";
  creditRoles: CreditRole[];              // CRediT 14역할 다중 선택
  joinedAt: string;
  invitedBy: string;                      // userId
  status: "active" | "inactive" | "left";
  leftAt?: string;
  // 출판 시 저자 정보 (출판물에서 스냅샷)
  authorOrder?: number;                   // 1=first, 2=second... 0=corresponding 별도 표기
  isCorresponding?: boolean;
  isFirstAuthor?: boolean;
  isCoFirstAuthor?: boolean;
  affiliation?: string;                   // 소속 표기 (스냅샷, 졸업 후에도 발간 당시 소속 유지)
  orcidId?: string;                       // 텍스트 필드 (OAuth 미연결)
  createdAt: string;
  updatedAt: string;
}

// CRediT (Contributor Roles Taxonomy) — 학술 출판 표준
type CreditRole =
  | "conceptualization"        // 개념화
  | "data_curation"            // 자료 관리
  | "formal_analysis"          // 형식 분석
  | "funding_acquisition"      // 연구비 확보
  | "investigation"            // 조사
  | "methodology"              // 방법론
  | "project_administration"   // 프로젝트 관리
  | "resources"                // 자원
  | "software"                 // 소프트웨어
  | "supervision"              // 감독
  | "validation"               // 검증
  | "visualization"            // 시각화
  | "writing_original_draft"   // 원고 작성
  | "writing_review_editing";  // 검토·편집
```

#### C. `collaborative_research_invites/{inviteId}` — 초대장
```typescript
interface CollaborativeResearchInvite {
  id: string;
  researchId: string;
  researchTitle: string;                  // denorm
  senderId: string;
  senderName: string;                     // denorm
  recipientId: string;
  recipientEmail?: string;                // denorm for fallback
  proposedRole: CollaborativeResearchMember["role"];
  message?: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  expiresAt: string;                      // 기본 14일
  respondedAt?: string;
  createdAt: string;
}
```

#### D. `collaborative_research_chapters/{chapterId}` — 챕터별 작성 공간
```typescript
interface CollaborativeResearchChapter {
  id: string;
  researchId: string;
  chapterKey: "intro" | "literature" | "method" | "results" | "discussion"
    | "references" | "appendix" | string;  // custom chapter key 허용
  order: number;
  title: string;
  content: string;                        // markdown
  assignedUserIds: string[];              // 작성 담당자 (다중)
  lastEditedBy: string;
  lastEditedAt: string;
  charCount: number;                      // denorm, 진도 시각화용
  status: "empty" | "draft" | "review" | "approved";
  version: number;                        // optimistic locking
  createdAt: string;
  updatedAt: string;
}
```

#### E. `collaborative_research_comments/{commentId}` — 챕터·블록 단위 토론
```typescript
interface CollaborativeResearchComment {
  id: string;
  researchId: string;
  chapterId?: string;                     // 챕터 단위
  anchor?: string;                        // 블록 ID (markdown 라인 anchor)
  authorId: string;
  body: string;                           // markdown
  mentionedUserIds: string[];             // @멘션
  parentCommentId?: string;               // 스레드
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### F. `collaborative_research_meetings/{meetingId}` — 팀 미팅 노트
```typescript
interface CollaborativeResearchMeeting {
  id: string;
  researchId: string;
  scheduledAt: string;                    // ISO datetime
  durationMinutes?: number;
  title: string;                          // 예: "1차 변인 정의 회의"
  agenda?: string;                        // markdown
  notes?: string;                         // 회의록 markdown
  decisions?: Decision[];                 // 결정사항 (별도 구조)
  actionItems?: ActionItem[];             // 후속 액션
  attendeeIds: string[];
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Decision { id: string; text: string; rationale?: string; }
interface ActionItem {
  id: string;
  text: string;
  assigneeId: string;
  dueDate?: string;
  status: "open" | "done";
}
```

#### G. `collaborative_research_milestones/{milestoneId}` — 일정/제출물
```typescript
interface CollaborativeResearchMilestone {
  id: string;
  researchId: string;
  title: string;                          // 예: "IRB 제출", "1차 데이터 수집 완료"
  type: "irb" | "data_collection" | "analysis" | "draft" | "review" | "submission" | "other";
  targetDate: string;
  completedAt?: string;
  assigneeIds: string[];
  attachmentUrls?: string[];              // storage 링크
  status: "planned" | "in_progress" | "done" | "overdue" | "cancelled";
  createdAt: string;
  updatedAt: string;
}
```

#### H. `research_journal_issues/{issueId}` — 정식 연구지 호수
```typescript
interface ResearchJournalIssue {
  id: string;
  volume: number;                         // 예: 3
  number: number;                         // 예: 1
  year: number;
  season?: "spring" | "summer" | "fall" | "winter";
  title?: string;                         // 예: "교육공학 연구 Vol.3 No.1"
  publishedAt?: string;
  editorIds: string[];                    // 편집위원
  coverImageUrl?: string;
  introMarkdown?: string;                 // 편집장의 글
  articleIds: string[];                   // research_journal_articles 참조
  status: "preparing" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}
```

#### I. `research_journal_articles/{articleId}` — 발간 논문 (워킹+정식 통합)
```typescript
interface ResearchJournalArticle {
  id: string;
  researchId: string;                     // 출처 collaborative_research
  publicationType: "journal" | "working_paper" | "note";

  // 정식 연구지 메타 (publicationType==="journal"일 때 필수)
  issueId?: string;                       // research_journal_issues 참조
  pageStart?: number;
  pageEnd?: number;
  doi?: string;                           // 수동 입력 (10.xxxxx/yyyy)

  // 공통 메타
  titleKo: string;
  titleEn?: string;
  abstractKo: string;
  abstractEn?: string;
  keywordsKo: string[];
  keywordsEn?: string[];

  // 저자 (스냅샷 — 발간 시점 정보 동결)
  authors: ArticleAuthorSnapshot[];

  // 본문
  content: string;                        // markdown (IMRaD 또는 자유 구조)
  contentStructure: "imrad" | "free";     // imrad: intro/method/results/discussion 강제

  // 인용
  citations: ArticleCitation[];           // APA7 자동 렌더 가능한 구조

  // 첨부
  pdfUrl?: string;                        // 자동 생성 PDF
  dataLinks?: string[];                   // 외부 OSF/Zenodo/GitHub URL
  appendixUrls?: string[];

  // 출판 상태
  reviewStatus: "draft" | "submitted" | "under_review" | "revision_requested"
    | "accepted" | "published" | "withdrawn";
  reviewComments?: ReviewComment[];       // 검수자 코멘트
  reviewerIds?: string[];                 // 운영진 검수자
  visibility: "private" | "society" | "public";
  publishedAt?: string;

  // 인용·열람 카운트 (denorm)
  viewCount: number;
  downloadCount: number;

  createdAt: string;
  updatedAt: string;
}

interface ArticleAuthorSnapshot {
  userId: string;                         // 시스템 참조 (졸업 후에도 유지)
  displayName: string;                    // 발간 당시 이름 (개명 시에도 동결)
  affiliation: string;                    // 발간 당시 소속
  email?: string;
  orcidId?: string;
  authorOrder: number;
  isCorresponding: boolean;
  isFirstAuthor: boolean;
  creditRoles: CreditRole[];
}

interface ArticleCitation {
  id: string;
  type: "journal" | "book" | "chapter" | "thesis" | "web" | "other";
  authors: string;                        // APA7 raw
  year: number;
  title: string;
  source?: string;                        // venue/publisher
  doi?: string;
  url?: string;
  // 사이트 내 자료 연계
  alumniThesisId?: string;                // alumni_theses 참조
  researchPaperId?: string;               // 작성자의 research_papers 참조
}

interface ReviewComment {
  id: string;
  reviewerId: string;
  body: string;                           // markdown
  severity: "blocking" | "major" | "minor" | "praise";
  anchor?: string;                        // 본문 anchor
  resolvedAt?: string;
  createdAt: string;
}
```

### 5.2 기존 컬렉션 확장 (최소)

#### `users` — 변경 없음 (orcidId는 멤버 레벨에서 보관)

#### `streak_events` — 신규 event type 5개 추가
```typescript
type StreakEventType =
  | ...existing
  | "collaborative_research_join"
  | "collaborative_research_chapter_edit"
  | "collaborative_research_meeting"
  | "collaborative_research_milestone"
  | "research_journal_publish";
```

#### `push_logs` + NotificationPrefs — 신규 알림 kind 5종 추가
```typescript
interface NotificationPrefs {
  ...existing
  pushCollabInvite: boolean;              // 초대장 도착
  pushCollabMention: boolean;             // @멘션
  pushCollabMilestone: boolean;           // D-1 마일스톤
  pushCollabReview: boolean;              // 검수 요청/응답
  pushJournalIssue: boolean;              // 신규 호수 발간 (전 회원)
}
```

### 5.3 Firestore 인덱스 (사전 정의)
- `collaborative_research`: `(status, updatedAt desc)`, `(collaboratorIds array-contains, status)`, `(collaborationType, status, updatedAt desc)`
- `collaborative_research_members`: `(userId, status)`, `(researchId, status, joinedAt)`
- `collaborative_research_invites`: `(recipientId, status)`, `(senderId, status, createdAt desc)`
- `collaborative_research_chapters`: `(researchId, order)`
- `collaborative_research_comments`: `(chapterId, createdAt desc)`, `(mentionedUserIds array-contains, resolvedAt)`
- `collaborative_research_meetings`: `(researchId, scheduledAt desc)`
- `collaborative_research_milestones`: `(researchId, targetDate)`, `(assigneeIds array-contains, status, targetDate)`
- `research_journal_articles`: `(visibility, publishedAt desc)`, `(reviewStatus, updatedAt desc)`, `(publicationType, visibility, publishedAt desc)`, `(issueId, pageStart)`

---

## 6. 권한 모델 (firestore.rules)

### 6.1 헬퍼 함수 (신규)
```javascript
function isResearchLeader(researchId) {
  return get(/databases/$(database)/documents/collaborative_research/$(researchId))
    .data.leaderId == request.auth.uid;
}

function isResearchMember(researchId) {
  return exists(/databases/$(database)/documents/collaborative_research_members/$(researchId + '_' + request.auth.uid))
    && get(/databases/$(database)/documents/collaborative_research_members/$(researchId + '_' + request.auth.uid))
       .data.status == 'active';
}

function isJournalEditor() {
  return isStaffOrAbove();  // president·staff·admin·sysadmin
}
```

### 6.2 규칙 요약

| 컬렉션 | read | create | update | delete |
|--------|------|--------|--------|--------|
| `collaborative_research/{id}` | leader/member, 또는 society type이면 isStaffOrAbove, 또는 archived+visibility 변경 시 정책 따름 | 인증 회원 (본인=leader) | leader 또는 isAdmin | leader 또는 isAdmin |
| `collaborative_research_members/{id}` | 본인 또는 같은 팀 멤버 또는 staff | leader 또는 invite accept 트랜잭션 | 본인(role/orcid/affiliation만) 또는 leader(role/status) | leader 또는 본인(=leave) |
| `collaborative_research_invites/{id}` | sender 또는 recipient 또는 staff | 인증 (sender=본인) + 팀 leader 여부 검증 | recipient(status: accepted/rejected) 또는 sender(status: cancelled) | sender 또는 isAdmin |
| `collaborative_research_chapters/{id}` | 팀 멤버 또는 staff | 팀 멤버 | 팀 멤버(assignedUserIds 우대) + version 일치 | leader 또는 isAdmin |
| `collaborative_research_comments/{id}` | 팀 멤버 또는 staff | 팀 멤버 | author 또는 leader(resolve만) | author 또는 leader 또는 isAdmin |
| `collaborative_research_meetings/{id}` | 팀 멤버 또는 staff | 팀 멤버 | recordedBy 또는 leader | leader 또는 isAdmin |
| `collaborative_research_milestones/{id}` | 팀 멤버 또는 staff | 팀 멤버 | 팀 멤버 | leader 또는 isAdmin |
| `research_journal_issues/{id}` | published or isJournalEditor | isJournalEditor | isJournalEditor | isAdmin |
| `research_journal_articles/{id}` | visibility 기반 게이트(아래) | 팀 멤버 | 팀 멤버(reviewStatus 일부 전이) + isJournalEditor(검수·발간 전이) | leader 또는 isAdmin |

### 6.3 visibility 게이트 (research_journal_articles)
```javascript
allow read: if
  // public: 모두
  (resource.data.visibility == 'public' && resource.data.reviewStatus == 'published') ||
  // society: 인증 회원
  (resource.data.visibility == 'society' && request.auth != null && resource.data.reviewStatus == 'published') ||
  // private 또는 draft: 팀 멤버 또는 검수자(reviewerIds) 또는 staff
  (request.auth != null && (
    isResearchMember(resource.data.researchId) ||
    request.auth.uid in resource.data.reviewerIds ||
    isJournalEditor()
  ));
```

### 6.4 보안 핵심 원칙
- **운영진의 임의 열람 차단**: 진행 중 팀 데이터는 default isStaffOrAbove read 권한 없음. society 발주 시점에 명시적으로 collaborator로 추가하거나, `supportRequest` 모드(추후 v2)로 일시 권한 부여.
- **PII 분리**: 외부 협력자 이메일·연락처는 별도 컬렉션 `collaborative_research_external_contacts/{researchId}` (staff·leader read만 — Phase 2)
- **삭제 시 cascade**: leader가 연구팀 삭제 시 Cloud Function 또는 client batch로 members/invites/chapters/comments/meetings/milestones 동시 삭제. 발간된 논문은 보존(withdrawn 상태로 전환).

---

## 7. UX 아키텍처

### 7.1 라우트 트리

```
/mypage
  └── /research                       # 내 연구활동 사이드바
        ├── 내 논문, 논문 분석, 연구 보고서, 연구 계획서 (기존 4탭)
        └── 공동 연구 (신규 5번째 탭)
              ├── 내 참여 연구 목록
              └── 받은 초대장 (badge)

/collab                              # 신규 라우트 (공동 연구 작업 공간)
  ├── /new                            # 연구팀 생성
  ├── /[researchId]                   # 팀 대시보드 (개요+멤버+진도)
  ├── /[researchId]/chapters          # 챕터 편집기
  ├── /[researchId]/chapters/[key]    # 단일 챕터 상세 (작성+댓글 split)
  ├── /[researchId]/meetings          # 회의 노트
  ├── /[researchId]/milestones        # 일정·제출물
  ├── /[researchId]/members           # 멤버 관리 (leader)
  ├── /[researchId]/publish           # 출판 마법사 (워킹/정식 분기)
  └── /[researchId]/settings          # 메타·삭제 (leader)

/journal                             # 신규 공개 라우트 (연구지)
  ├── /                               # 호수별 목록 + 최근 워킹 페이퍼
  ├── /v[volume]-n[number]            # 호수 상세
  ├── /articles/[articleId]           # 논문 상세 (JSON-LD ScholarlyArticle)
  └── /search                         # 키워드·저자·연도 검색

/console
  └── /research
        └── (기존 4탭) + "공동 연구" 5번째 탭  # 운영진 검수·발간
              ├── 검수 대기 큐
              ├── 호수 편집 (Volume/Issue CRUD)
              ├── 발간 통계
              └── society 발주 (운영진이 팀 생성→leader 위임)
```

### 7.2 핵심 컴포넌트 (Phase 1 기준)

**작업 공간**
- `CollaborativeResearchListPage` — 카드 그리드 + 필터(상태·내 역할·키워드)
- `CollaborativeResearchDashboard` — 헤더(제목·상태·CTA) + 진도바 + 챕터 카드 + 다음 마일스톤 + 최근 활동 피드
- `CollaborativeResearchChapterEditor` — 좌측 markdown + 우측 댓글 사이드바, version-aware autosave (throttled 3s)
- `CollaborativeResearchMemberPanel` — 역할 배지 + CRediT 다중 선택 + ORCID + 초대 버튼
- `CollaborativeResearchInviteDialog` — MemberPicker(기존 재사용) + role 선택 + 메시지
- `CollaborativeResearchMeetingNoteEditor` — agenda/notes/decisions/actionItems 4섹션
- `CollaborativeResearchMilestoneTimeline` — gantt-style 또는 table+badge

**출판 (Phase 3)**
- `JournalPublishWizard` — 4단계 (메타→저자 순서·CRediT→IMRaD 본문→인용)
- `JournalArticleView` — Reader 모드 (히어로+본문+사이드 TOC+CRediT 그리드)
- `JournalIssueEditor` — 운영진 (편집장의 글·articleIds 순서·DOI)
- `JournalSearchPage` — 키워드 매트릭스 + 저자 facet

**공통 (사이트 인프라 재사용)**
- `PageContainer` (CLAUDE.md 표준), `BackButton`, `ConsolePage`
- `MemberPicker` (회원 검색·선택 표준)
- `MentionInput` (간소 @멘션 — 회원 자동완성)
- 알림은 기존 `NotificationCenter` 통합

### 7.3 핵심 UX 원칙
1. **챕터별 잠금 없음 — 충돌만 경고**: optimistic locking(version 필드)으로 동시 저장 시 후저장자에게 diff 안내. 멀티유저 OT는 Out of Scope.
2. **작성 진도 시각화**: 챕터별 charCount × target → 진도바. 팀 대시보드에서 즉시 확인.
3. **role-aware UI**: reviewer/advisor 역할은 댓글·검수만 가능, 본문 편집 권한은 principal/co_researcher만.
4. **출판 마법사는 5단계로 정렬**: (1) 출판 형식 선택 → (2) 메타 확정 → (3) 저자 순서·CRediT 동의 게이트 → (4) IMRaD 본문 마이그레이션 → (5) visibility·검수 제출. 각 단계 저장 시 draft article 생성.
5. **저자 동의 게이트(필수)**: 정식 연구지 제출 전 모든 collaborator에게 "저자 순서 확인 + CRediT 역할 확인 + ORCID 입력" 동의 push 발송. 100% 응답 전까지 reviewStatus → submitted 불가. **저자권 분쟁 사전 차단**.
6. **운영진 검수는 코멘트 기반 + severity**: blocking/major/minor/praise 4단계. blocking 미해결 시 accepted 불가.
7. **발간 후 본문 수정 잠금**: published 이후 author는 errata만 추가 가능, 본문 수정은 isAdmin + audit log.

---

## 8. Phase 분할 (Horizontal Phased — 4 Sprint)

### Phase 1 — 팀+초대+메타 (Sprint A, 약 8h)
**목표**: 사용자가 연구팀을 만들고 동료를 초대하여 연구 메타 정보를 함께 보유할 수 있음

**범위**
- collaborative_research / _members / _invites 3개 컬렉션
- 라우트: `/mypage/research` 5번째 탭, `/collab/new`, `/collab/[id]` (대시보드+멤버+초대)
- bkend.ts API 신규: `collaborativeResearchApi`, `collaborativeResearchMembersApi`, `collaborativeResearchInvitesApi`
- firestore.rules 신규 헬퍼 2종 + 3개 컬렉션 규칙
- push 알림 신규 kind: `pushCollabInvite` + NotificationPrefs 확장 + MyPage 토글
- 인덱스 4개 추가
- StreakEvent: `collaborative_research_join`

**완료 기준**
- 사용자 A가 팀 생성 → 사용자 B 초대 → B가 수락 → A·B 모두 대시보드에서 팀 확인 + 메타 편집 가능
- 운영진은 society type 팀만 대시보드 보임

### Phase 2 — 공동작성+논의+회의+마일스톤 (Sprint B, 약 9h)
**목표**: 팀이 실제로 보고서/원고를 함께 쓰고 의사결정·일정을 관리할 수 있음

**범위**
- collaborative_research_chapters / _comments / _meetings / _milestones 4개 컬렉션
- 라우트: `/collab/[id]/chapters`, `/chapters/[key]`, `/meetings`, `/milestones`
- 컴포넌트: ChapterEditor(autosave+version), CommentSidebar, MeetingNoteEditor, MilestoneTimeline
- MentionInput 신규 + `pushCollabMention` 알림
- cron: 마일스톤 D-1 알림 (`/api/cron/collab-milestone-reminder`, 09:00 KST)
- StreakEvent: `chapter_edit`, `meeting`, `milestone`

**완료 기준**
- 챕터 단위 동시 저장 시 version 충돌 안내
- @멘션 → 대상자에게 push + 알림센터 토스트
- D-1 마일스톤 자동 push

### Phase 3 — 연구지 출판 (워킹+정식) (Sprint C, 약 10h)
**목표**: 팀 산출물을 학회 연구지에 출판하고, 학회 회원·외부가 열람할 수 있음

**범위**
- research_journal_issues / research_journal_articles 2개 컬렉션
- 라우트: `/collab/[id]/publish` (마법사), `/journal`, `/journal/v[v]-n[n]`, `/journal/articles/[id]`
- 공개 라우트: layout metadata + JSON-LD ScholarlyArticle
- 컴포넌트: JournalPublishWizard(5단계+저자 동의 게이트), JournalArticleView, JournalIssueEditor(콘솔)
- 검수 워크플로우: draft → submitted → under_review → revision_requested ↔ accepted → published
- 운영진 콘솔: `/console/research` 신규 "연구지" 탭 (검수 큐 + 호수 편집)
- PDF 생성: 기존 newsletter-pdf 인프라 재사용 (jsPDF/react-pdf)
- StreakEvent: `research_journal_publish`
- 알림 kind: `pushCollabReview`, `pushJournalIssue`

**완료 기준**
- 워킹 페이퍼: leader가 출판 마법사 완주 → 즉시 published, society 가시성
- 정식 연구지: 저자 100% 동의 → submitted → 운영진 검수 → accepted → 호수 배정 → published, public 가시성
- `/journal` 비로그인 접근 시 published+public 만 노출
- JSON-LD로 Google Scholar 인덱싱 가능 (Sitemap 자동 등록)

### Phase 4 — 기여도·통계·운영 (Sprint D, 약 5h)
**목표**: 학회와 학생 양쪽에 데이터 기반 가치 입증

**범위**
- 기여도 대시보드 `/collab/[id]/contributions` — CRediT 매트릭스 + 차트(편집 횟수·미팅·마일스톤·코멘트)
- MyPage 학습 잔디에 collaborative_research_* 이벤트 통합
- Leaderboard에 "공동 연구 적극성" 신규 카테고리 (옵트인)
- `/console/research` 통계 위젯: 활성 팀 수, 평균 멤버, 호수당 평균 논문, 전체 열람 카운트
- 발간 카운트 denorm: research_journal_articles 의 viewCount/downloadCount 증가 트리거 (client-side increment + Firestore rate limit)
- 회고·후기: published 후 D+30 cron으로 leader에게 "공동 연구 후기" 요청

**완료 기준**
- 팀 내 누가 무엇을 했는지 한눈에 (CRediT × 활동량 매트릭스)
- 운영진은 학회 차원 공동 연구 활성도 KPI 확인 가능

---

## 9. 기존 시스템과의 연동

| 기존 시스템 | 연동 방식 |
|------------|---------|
| **NotificationPrefs / push_logs / FCM cron** | 알림 kind 5종 추가, 기존 cron 패턴 따라 신규 cron 2개 (milestone, journal-publish 알림) |
| **streak_events / leaderboard** | event type 5개 추가, leaderboard에 옵트인 카테고리 |
| **archive_concepts / archive_research_methods / archive_measurement_tools** | CollaborativeResearch.conceptIds/methodIds 다대다 참조, 변인 입력 시 measurementToolId picker |
| **alumni_theses** | ArticleCitation.alumniThesisId 역방향 연계, 졸업논문 상세에 "이 논문을 인용한 연구지 논문" 섹션 |
| **research_papers (개인 분석 노트)** | ArticleCitation.researchPaperId 참조 — 저자가 본인 분석 노트를 인용 변환 시 자동 |
| **research_reports (개인 보고서)** | 출판 마법사에서 "내 개인 보고서를 초안으로 가져오기" 옵션 (1회성 import, 이후 분리) |
| **users / Member 모델** | leaderId·collaboratorIds 모두 User.id 참조. 저자 스냅샷은 발간 시점 displayName/affiliation 동결 |
| **PageContainer / BackButton / ConsolePage** | 신규 페이지 전수 표준 적용 |
| **MemberPicker** | 초대 다이얼로그·collaborator 추가 시 재사용 |
| **firestore.rules isStaffOrAbove() / isAdmin()** | 운영진 검수·발간 권한에 재사용 |
| **dataApi (bkend SDK)** | 모든 신규 API는 typed shortcuts 패턴(bkend.ts) 따름 |
| **NotificationCenter / 실시간 toast** | @멘션·검수 응답을 즉시 toast 노출 |

---

## 10. 위험 분석 & 완화

| 위험 | 심각도 | 완화 |
|------|--------|------|
| 저자권 분쟁 (누가 first/corresponding) | 🔴 높음 | 출판 전 저자 100% 동의 게이트 + audit log (변경 이력 보존) |
| IRB 미승인 상태 공개 출판 | 🔴 높음 | irbStatus.required && status!=='approved' && publicationType==='journal' 일 때 submitted 차단, 경고 모달 |
| 운영진의 진행중 데이터 임의 열람 (학술윤리) | 🟠 중 | firestore.rules에서 default deny, society 발주 시 명시적 collaborator 추가만 허용 |
| 동시 저장 충돌 (덮어쓰기) | 🟠 중 | optimistic locking(version field), 충돌 시 후저장자에게 diff 안내 + 재시도 |
| 챕터 너무 커서 Firestore 1MB 한계 초과 | 🟡 낮음 | charCount > 800KB 경고, 1MB 도달 시 저장 거부 + 분할 안내. 정식 출판은 PDF에 의존 |
| 발간 후 본문 수정 통한 조작 | 🟠 중 | published 이후 본문 잠금, errata만 별도 필드. 수정은 isAdmin + audit log |
| 외부 공개(JSON-LD) 노출로 인한 개인정보 누출 | 🟠 중 | 저자 이메일은 visibility=='public' 일 때 마스킹(default true), corresponding만 옵트인 노출 |
| DOI 미발급 상태 발간 | 🟡 낮음 | doi 필드 optional, 미발급 시 site URL을 canonical로 사용 |
| 알림 폭주 (대형 팀 + 빈번 활동) | 🟡 낮음 | NotificationPrefs로 사용자별 토글, mention은 throttle (5분 단위 batch — Phase 2 폴리시) |
| 정식 연구지 검수 지연 | 🟡 낮음 | 검수 큐 SLA(7일) + D-3 자동 reminder cron |
| 졸업생 멤버의 affiliation 변경 | 🟢 정보 | authors 스냅샷에 발간 당시 affiliation 동결 → 졸업/이직 후에도 발간 시점 정보 유지 |
| Firestore 인덱스 비용 폭증 | 🟢 정보 | 사전 정의된 9개 인덱스만, where-in 사용 최소화, collaboratorIds는 배열 max 10 강제 |

---

## 11. 성공 지표 (Phase 4 끝까지 12주 후)

| 지표 | 목표값 | 측정 방법 |
|------|--------|---------|
| 활성 공동 연구팀 수 | ≥ 5팀 | collaborative_research where status in [active, writing, review] |
| 평균 팀 멤버 | 2.5명 | collaboratorCount 평균 |
| 발간된 워킹 페이퍼 | ≥ 3건 | research_journal_articles where publicationType=working_paper, reviewStatus=published |
| 정식 연구지 Vol.1 No.1 발간 | 1건 | research_journal_issues where status=published |
| /journal 월간 외부 방문 | ≥ 200건 | viewCount + GA |
| @멘션 응답률 (24h 내 확인) | ≥ 70% | mentioned_at vs first_read_at |
| 챕터 평균 편집자 수 | ≥ 1.5명 | chapter.lastEditedBy distinct count |
| 운영진 검수 평균 SLA | ≤ 5일 | submitted → accepted 평균 |

---

## 12. Brainstorming Log (Phase 1~3 결정 추적)

### 의사결정 1: 협업 형태
- **선택**: 혼합형 (peer + society)
- **이유**: 교육공학 학회 특성상 두 형태 모두 빈번. 단일 형태만 지원 시 한쪽 사용 사례가 죽음.
- **영향**: collaborationType 필드, society type 발주 시 운영진 자동 access

### 의사결정 2: 연구지 출판 형식
- **선택**: 두 트랙 (정식 journal + working_paper + note)
- **이유**: 정식만 지원 시 진입장벽 ↑→발간율 ↓. 워킹만 지원 시 학회 정통성 ↓.
- **영향**: publicationType 필드, 출판 마법사 분기, 검수 워크플로우 분리

### 의사결정 3: 공개·검수 워크플로우
- **선택**: 3단계 visibility(private/society/public) + 정식은 운영진 검수
- **이유**: 단순 공개/비공개는 한국 학회 문화상 적합하지 않음. 졸업 전 미공개 단계가 필요.
- **영향**: visibility + reviewStatus 분리, JSON-LD는 visibility==='public' && reviewStatus==='published' 만

### 의사결정 4: 도메인 위치
- **선택**: 별도 도메인 (collaborative_research_*)
- **이유**: 연구 특화 필드(IRB·CRediT·가설·변인) 자유 설계, Activity와 권한·UI 분리, 학술 정체성 강화
- **영향**: 신규 컬렉션 8개, 인프라(알림·streak)는 기존 시스템 확장으로 흡수

### 의사결정 5: 구현 전략
- **선택**: Horizontal Phased (4 Sprint)
- **이유**: yonsei-edtech의 Sprint 패턴(현재 75+) 정합, 각 Phase 독립 배포·검증 가능, 사용자 피드백 반영 여지
- **영향**: 본 문서 8장의 Phase 분할 그대로 진행

### 의사결정 6: MVP 범위
- **선택**: 4개 그룹 전체 포함 (A+B+C+D)
- **이유**: 사용자가 "공동 연구"의 본질(작성+출판+기여도)을 한 번에 갖춘 시스템을 원함. Phase 1만 떼어 출시하면 "초대만 되고 못 쓰는 시스템"이 되어 죽은 도메인이 될 위험.
- **영향**: 8장 4 Phase가 모두 사실상 MVP. 출시 후 v2(실시간 동시편집·DOI 자동·ORCID OAuth) 별도 트랙.

---

## 13. 다음 단계

1. **사용자 검토**: 이 Plan 문서에 대한 피드백 반영 (특히 데이터 모델·권한·Phase 분할)
2. **Design 단계**: `/pdca design collaborative-research` → 컴포넌트 시그니처, Firestore 규칙 전체 코드, API 스펙, 컨트랙트 테스트 시나리오 상세화
3. **Phase 1 Sprint A 착수**: `/pdca do collaborative-research` → 약 8시간 작업, 단일 commit + Vercel 배포 + 검증

> **HARD-GATE**: 사용자 승인 전 어떤 코드/스키마/라우트도 작성하지 않음.
> 의견·수정 요청이 있다면 부분 갱신 후 재제출.
