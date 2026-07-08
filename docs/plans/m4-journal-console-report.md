# M4 — 학회지(연구지) 운영 콘솔 구현 보고서

작성일: 2026-07-08 · 대상 플랜: `docs/plans/service-enhancement-plan-v4-2026-07-08.md` M4

## 1. 기존 journal(연구지) 구조 요약 (전수 탐색 결과)

학회지 기능은 **"연구지(Research Journal)"** 트랙으로, 학회보(`card_news_series`)와 완전히 분리된 학술 출판 시스템이다.

### 데이터 모델 (`src/types/research-journal.ts`)
- **`ResearchJournalIssue` (발행호)** — `journal_issues` 컬렉션. `volume`·`number`·`year`·`season`·`status`(`preparing`/`published`/`archived`)·`articleIds[]`(수록 논문)·`editorIds[]`·`publishedAt`·`introMarkdown`.
- **`ResearchJournalArticle` (투고/논문)** — `journal_articles` 컬렉션. `researchId`(출처 공동연구)·`publicationType`(`journal`/`working_paper`/`note`)·`titleKo`·`authors[]`(발간 시점 스냅샷)·`reviewStatus`(`draft`→`submitted`→`under_review`→`revision_requested`/`accepted`→`published`/`withdrawn`)·`reviewerIds[]`(운영진 검수자)·`visibility`(`private`/`society`/`public`)·`issueId`·`authorConsents`(저자 동의 게이트).

### API 계층 (`src/lib/bkend.ts`)
- `journalIssuesApi`: `listPublished`(공개)·**`listAll`(운영진 전수)**·`get`·`create`·`update`·`publish`·`remove`.
- `journalArticlesApi`: `listPublic`·`listSociety`·`listByResearch`·**`listForReview`(submitted+under_review)**·`listByIssue`·`get`·`create`·검수 전이(`submit`/`startReview`/`addReviewComment`/`requestRevision`/`accept`/`publish`/`withdraw`)·저자 동의(`requestConsent`/`recordConsent`).

### React Query 훅 (`src/features/journal/api/useJournal.ts`)
- 조회: `useAllIssues`·`useReviewQueue`·`usePublishedIssues`·`useArticlesByIssue` 등.
- 변이: `useCreateIssue`·`usePublishIssue`·`useStartReview`·`useAcceptArticle`·`usePublishArticle` 등.

### 컴포넌트·라우트
- 배지: `JournalArticleStatusBadge.tsx`(`ReviewStatusBadge`·`PublicationTypeBadge`·`VisibilityBadge`).
- 라벨/전이: `article-status.ts`(`ISSUE_STATUS_LABELS`·`REVIEW_STATUS_LABELS`·`formatIssueCode`·`canTransitionReviewStatus`).
- 공개 라우트: `/journal`·`/journal/issues/[issueId]`·`/journal/articles/[articleId]`.
- 기존 콘솔: **`/console/research/journal`** — 호수 생성·발간, 검수 큐, 승인 논문 안내(단, 네비에 미노출).
- 검수 작업 화면: `/collab/[researchId]/publish/[articleId]`.

## 2. 구현한 화면 구성 (`src/app/console/journal/page.tsx` 신규)

`AuthGuard` + `isAtLeast(user, "staff")` 게이트, `ConsolePageHeader` 사용. 기존 훅·배지·라벨만 재사용하고 **새 데이터 모델·API·rules를 만들지 않았다.** 편집 액션은 모두 기존 화면으로 링크.

1. **요약 통계 5종** — 전체 발행호 / 발간 완료 호수 / 준비 중 호수 / 검수 대기 투고 / **심사자 미배정**(강조).
2. **발행호별 현황 테이블** (`useAllIssues`) — 호수 코드·발간 시기·상태 배지·수록 논문 수(`articleIds.length`)·발간일·공개 페이지 링크. 우측 상단 "호수 편집·발간" 버튼 → `/console/research/journal`.
3. **투고·심사 큐** (`useReviewQueue`) — 상태 필터(전체/검수 제출/검수 중), 출판유형·검수상태 배지, 저자, **심사자 배정 현황**(N명 배정 vs 미배정 강조 카드). 각 행 → `/collab/[researchId]/publish/[articleId]` 검수 화면.

### 네비 추가 (`src/app/console/layout.tsx`)
- **콘텐츠** 그룹에 `{ href: "/console/journal", label: "학회지 운영", icon: BookOpen }` 추가(학회보 다음). `BookOpen`은 이미 import됨.

## 3. 조회 제약과 rules 제안 (스코프 내 한계)

Firestore rules상 **staff가 전수 조회 가능한 것은 `journal_issues` 전체(`listAll`)와 검수 큐(submitted·under_review)뿐**이다. 다음은 이번 스코프에서 조회 불가하여 생략했다.

- **`draft`/`accepted`/`revision_requested`/발간완료 논문의 전수 목록** — 이를 가로지르는 staff read 쿼리가 없다. 그래서:
  - 발행호별 "투고 수"는 **발간·배정된 `articleIds.length`**로 표기(제출 대기 중 투고는 issueId가 없어 호수에 아직 매핑되지 않음 — 정상).
  - 승인(accepted) 후 호수 배정 대기 목록은 콘솔에서 직접 못 보고, 기존 `/console/research/journal`의 안내와 개별 논문 출판 페이지에서 처리.
- **제안(rules 수정 필요 — 이번 스코프 제외)**: `journal_articles`에 대해 staff role 조건부 `list` 허용(또는 `reviewStatus in ['accepted','revision_requested']` 증명형 쿼리 추가) 시, 콘솔에서 "호수 배정 대기 큐"·"수정 요청 반려 추적"·발행호별 정밀 집계(투고/배정/완료 분해)를 직접 렌더 가능. 데이터 스키마 변경은 불필요, rules `list` 규칙만 확장하면 됨.

## 4. 회원 참여 알림 — 이번 스코프 제외 + 기존 흐름 조사·제안

플랜 지시대로 **알림 발송은 미구현**. 조사 결과와 통합 제안만 기록한다.

### 기존 알림 인프라 (`src/features/notifications/notify.ts`, `src/types/operations.ts`)
- `AppNotification` + `notificationsApi`(bkend) + `NotificationBell` UI가 이미 성숙. `notify*` 헬퍼가 타입별로 존재(예: `notifyCollabInvite`·`notifyNewSeminar`·`notifyWaitlistPromoted`).
- `NotificationType` 유니온에 **연구지/투고/심사 관련 타입은 아직 없음**(collab_invite까지만 존재).

### 제안 (후속 작업 — M4 알림 파트)
1. `NotificationType`에 `journal_submission_ready`(투고 가능)·`journal_review_request`(심사 요청 도착)·`journal_revision_requested`(저자에게 수정 요청)·`journal_accepted` 추가.
2. `notify.ts`에 `notifyReviewRequest(reviewerId, articleTitle, link)` 등 헬퍼 추가.
3. 발송 트리거: `journalArticlesApi.submit`(→ 운영진 심사 요청), `startReview`/`accept`/`requestRevision`(→ 저자), `usePublishArticle`(→ 저자 발간 축하, 기존 streak과 병행). 링크는 `/collab/[researchId]/publish/[articleId]`.
4. 규모 S~M, 데이터 스키마 무변경(알림 컬렉션 재사용). rules는 알림 생성 권한만 확인.

## 5. 검증

- `npx tsc --noEmit` → **exit 0, 에러 0건**.
- 변경 파일: `src/app/console/journal/page.tsx`(신규), `src/app/console/layout.tsx`(네비 1줄 추가).
- 커밋·배포 안 함.
