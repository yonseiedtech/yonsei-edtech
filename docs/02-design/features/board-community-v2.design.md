# [Design] board-community-v2

Plan 참조: `docs/01-plan/features/board-community-v2.plan.md`

## 1. 데이터 모델

### PostCategory (단일 소스)
`src/types/index.ts`
```ts
export const POST_CATEGORIES = ["free", "seminar", "staff", "promotion", "resources"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];
// "press"는 제거. 마이그레이션으로 promotion + _legacyCategory: "press" 로 전환
```

### Post 확장
```ts
interface Post {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  authorId: string;
  authorName?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  viewCount: number;
  likeCount: number;           // 비정규화
  commentCount: number;        // 비정규화
  tags?: string[];
  attachments?: Attachment[];  // 자료실/일반
  poll?: PollSummary;          // 비정규화 요약 (목록 표시용)
  // 마이그레이션 백업
  _legacyCategory?: "press";
  // soft delete
  deletedAt?: Timestamp;
}

interface PollSummary {
  question: string;
  options: { id: string; label: string; voteCount: number }[];
  multi: boolean;              // 복수선택 허용
  anonymous: boolean;          // 익명 모드 (UID 대신 salted hash 저장)
  deadline?: Timestamp;
  totalVotes: number;
  hideResultsBeforeDeadline: boolean; // 마감 전 결과 숨김
  hideResultsAfterDeadline: boolean;  // 마감 후에도 결과 숨김 (비공개 투표)
  editableUntil?: Timestamp;   // 이 시점까지 투표 수정 가능, null이면 1회 확정
}

interface Attachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  downloadCount?: number;
}
```

### Firestore 서브컬렉션
- `posts/{postId}/votes/{uid}` — `{ optionIds: string[], votedAt }` (중복 방지 unique by uid)
- `posts/{postId}/likes/{uid}` — `{ likedAt }`
- `posts/{postId}/comments/{commentId}` — `{ authorId, content, parentId?, createdAt, deletedAt? }`

### 복합 인덱스 (`firestore.indexes.json`)
- `posts`: (`category` asc, `createdAt` desc)
- `posts`: (`category` asc, `deletedAt` asc, `createdAt` desc)
- `votes` (collectionGroup): (`__name__` asc, `votedAt` desc) — "내가 참여한 투표"
- `comments`: (`parentId` asc, `createdAt` asc)

## 2. 권한 규칙

`src/lib/post-permissions.ts`
```ts
export const POST_CATEGORY_RULES: Record<PostCategory, { read: Role[] | "public"; write: Role[] }> = {
  free:       { read: "public",                  write: ["member", "staff", "admin", "president"] },
  seminar:    { read: "public",                  write: ["staff", "admin", "president"] },
  promotion:  { read: "public",                  write: ["staff", "admin", "president"] },
  staff:      { read: ["staff", "admin", "president"], write: ["staff", "admin", "president"] },
  resources:  { read: ["member", "staff", "admin", "president"], write: ["staff", "admin", "president"] },
};
export function canWrite(category: PostCategory, role: Role): boolean { ... }
export function canRead(category: PostCategory, role: Role | null): boolean { ... }
```

API Route `POST /api/posts` · `PATCH /api/posts/:id` 에서 `canWrite` 재검증.

Firestore rules 핵심:
```
match /posts/{id} {
  allow read: if categoryIsPublicOrUserHasRole(resource.data.category);
  allow create: if request.auth != null && hasWriteRole(request.resource.data.category);
  allow update, delete: if request.auth.uid == resource.data.authorId
                         || request.auth.token.role in ['admin', 'president'];
}
```
JWT role claim 없으면 `src/lib/auth.ts`에서 session 발급 시 `token.role = user.role` 추가하고 Firebase Custom Token에 동기화.

## 3. 라우트 구조

| 경로 | 기능 | 비고 |
|------|------|------|
| `/board` | 전체 리스트 (카테고리 탭) | 기존 유지 |
| `/board/free` | 자유게시판 | 글쓰기 CTA → `/board/free/write` |
| `/board/seminar` | 세미나 게시판 | staff+ |
| `/board/staff` | 운영진 전용 | staff+ read |
| `/board/promotion` | 홍보·보도자료 통합 | — |
| `/board/resources` | 자료실 (신규) | 첨부 필수, member+ read |
| `/board/{cat}/write` | 카테고리 고정 글쓰기 | category hidden |
| `/board/[id]` | 상세 (댓글·좋아요·투표) | 공통 |
| `/board/[id]/edit` | 수정 | 본인/관리자 |
| `/polls` | 제거 → 301 리다이렉트 `/board` | `next.config.js` |
| `/board/press` | 제거 → 301 리다이렉트 `/board/promotion` | — |

`PostForm`은 `category` prop을 받으면 필드 숨김 + URL/prop 기반 고정.

## 4. 컴포넌트 변경

- `PostForm` — `category` prop 필수화, category selector 제거, `PollEditor` 토글 섹션 추가, `AttachmentUploader` 강화(resources 시 필수 검증)
- `PollEditor` 신규 — 질문/옵션 2~10개/복수선택 토글/마감일/결과 공개 정책
- `PollViewer` 신규 — 상세 페이지에서 투표/결과 바 그래프
- `CategoryTabs` — `press` 제거, `resources` 추가
- `CategoryBoardPage` — 글쓰기 버튼 `href={`/board/${category}/write`}`
- `PostList` — `pollSummary` 있으면 "투표 📊 N표" 배지 표시
- Header `PUBLIC_NAV` — "커뮤니티" 섹션 아래 `resources` 링크 추가, `press` 제거, `polls` 링크 제거

## 5. 투표 처리 플로우

```
[투표 클릭]
  → POST /api/posts/:id/vote { optionIds }
  → Firestore 트랜잭션:
      1. posts/{id}/votes/{uid} 존재 확인 → 있으면 reject
      2. posts/{id}/votes/{uid} 생성
      3. posts/{id}.poll.options[*].voteCount 갱신
      4. posts/{id}.poll.totalVotes 증가
  → 성공 시 client invalidate
```

마감된 투표는 API에서 `deadline < now` 체크하여 400.

## 6. 마이그레이션 상세

`scripts/migrate-press-to-promotion.ts`
```
1. 전체 posts where category == "press" 조회 (pagination)
2. dry-run: 건수·샘플 10건만 출력
3. --apply 시: 배치 500개 단위로 
     { category: "promotion", _legacyCategory: "press", tags: [...existing, "보도자료"] }
4. 실패 문서 로그 → retry/rollback 대상
```
`scripts/rollback-press-migration.ts` — `_legacyCategory == "press"` 문서를 다시 `category: "press"` 로 복원.

배포 순서:
1. (코드 배포 전) 마이그레이션 스크립트 dry-run
2. 스크립트 `--apply` 실행 후 샘플 검증
3. 코드 배포 (redirects 포함)
4. 1주일 모니터링 후 `_legacyCategory` 필드 제거 스크립트 실행

## 7. 수락 기준 체크리스트 (Design 기준)

- [ ] `POST_CATEGORIES` 에 `press` 없음, `resources` 추가됨
- [ ] Firestore rules 배포 후 member 계정이 staff 카테고리 작성 시 403
- [ ] 마이그레이션 dry-run 로그에 대상 건수 정확
- [ ] `/polls`, `/board/press` → 301 리다이렉트 확인 (curl -I)
- [ ] 투표 트랜잭션 동시성 테스트 (2개 탭 동시 투표 → 1회만 성공)
- [ ] 자료실 첨부 없이 등록 시도 → 유효성 에러
- [ ] 투표 마감 후 POST `/vote` → 400
- [ ] 댓글 soft delete → 목록에서 "삭제된 댓글입니다" 표기
- [ ] `NEXT_PUBLIC_FEATURE_POLL_IN_POST=false` 시 PollEditor 숨김

## 8. 구현 순서 (Do phase)

1. 타입·권한 상수 추가 (`types/index.ts`, `lib/post-permissions.ts`)
2. 마이그레이션·롤백 스크립트 + dry-run 검증
3. Firestore rules + 인덱스 배포
4. API Route `posts`/`posts/:id/vote`/`like`/`comment` 권한 재검증 패치
5. `PollEditor`/`PollViewer` 컴포넌트
6. `PostForm` category 고정, poll 첨부
7. `/board/resources` 게시판 + `AttachmentUploader` 강화
8. `CategoryTabs`, `Header PUBLIC_NAV`, `next.config.js` redirects
9. `/polls` 페이지 제거, press 관련 UI 제거
10. 빌드 검증 → 마이그레이션 apply → 배포 → 모니터링

## 9. 회귀 체크리스트

- 기존 free/seminar/staff 게시판 조회·작성·수정·삭제
- 기존 좋아요·댓글 (마이그레이션 필요 시 스크립트로)
- 관리자 대시보드에서 게시물 통계
