# [Plan] board-community-v2 — 커뮤니티 고도화

## 배경
현재 `/polls`는 게시판과 분리된 독립 페이지로 운영되고, `/board/write?category=` 구조상 글쓰기 시 카테고리를 고르게 되어있다. 홍보와 보도자료는 성격이 유사한데도 별도 게시판으로 나뉘어 있어 운영·이용 모두 번거롭다. 자료실 수요도 있다.

## 목표
1. 투표/설문을 게시물 작성 시 **선택적 첨부** 형태로 통합한다.
2. `promotion` + `press` 게시판을 **하나로 통합** (명칭: `promotion`, 라벨은 "홍보·보도자료" 등 결정).
3. 커뮤니티 하위에 **자료실(`resources`)** 신규 추가 (첨부파일 중심).
4. 각 게시판에서 "글쓰기" 진입 시 **카테고리 자동 고정** (선택 UI 제거).
5. 좋아요/댓글은 전 게시판 공통 사용 가능하도록 확인·정리.

## 범위

### In scope
- `PostCategory` 타입 정비: `promotion` | `press` → `promotion` 단일화, `resources` 신규 추가
- `/polls` 페이지 철거 또는 읽기 전용 아카이브 처리
- `Post` 모델에 `poll?: { question, options[], multi, deadline, votes }` optional 필드 추가
- `PostForm`에 "투표 추가" 토글 & 옵션 편집 UI
- `PostDetail` (board/[id]/page.tsx)에서 poll UI 렌더링·투표 처리
- 각 board 페이지의 "글쓰기" 버튼이 `/board/write?category={해당}` 로 진입하되 PostForm에서 카테고리 셀렉터 숨김/고정
- 자료실: 파일 첨부 필수, 다운로드 카운트 표시 (기존 upload 유틸 재사용)
- Header PUBLIC_NAV 수정: `press` 제거, `resources` 추가
- 기존 press 데이터 마이그레이션: `category: "press"` → `"promotion"` + `isPressRelease: true` 태그 (구분 유지 옵션)

### Out of scope
- 투표 결과 고급 분석(차트 등) — MVP는 막대 그래프 수준
- 설문(다문항) 기능 — 이번엔 단일 투표(1문항, 다지선다/다중선택)만
- 댓글 좋아요·대댓글 (현재 범위 밖)

## 핵심 파일/영향 범위
- `src/types/index.ts` — Post, PostCategory, Poll 타입
- `src/lib/bkend.ts` — postsApi, pollsApi 통합/제거
- `src/app/board/{free,seminar,staff,promotion,press,resources}/page.tsx` — press 삭제·resources 추가·glob 경로 정리
- `src/app/board/layout.tsx` — 탭/네비게이션
- `src/app/polls/page.tsx` — 제거 또는 리다이렉트
- `src/app/board/write/page.tsx` — 카테고리 고정 로직
- `src/app/board/[id]/page.tsx` — poll 렌더링
- `src/features/board/PostForm.tsx` — poll 첨부 UI, 카테고리 hidden 모드
- `src/features/board/CategoryBoardPage.tsx` — 카테고리 기반 리스트 (이미 범용?)
- `src/features/board/CategoryTabs.tsx` — press 제거·resources 추가
- `src/components/layout/Header.tsx` — PUBLIC_NAV

## 수락 기준 (Acceptance)
- [ ] 홍보·보도자료 게시판 진입 시 기존 press 글이 모두 노출된다 (마이그레이션 성공)
- [ ] 자료실에서 첨부 파일 있는 게시물만 등록·조회된다
- [ ] 임의 게시판에서 글쓰기 시 카테고리 선택 UI가 없고 해당 게시판으로 바로 발행된다
- [ ] 투표 첨부한 게시물에서 로그인 사용자가 1회 투표 가능, 결과가 실시간 반영된다
- [ ] `/polls` 직접 접근 시 `/board/…` 로 리다이렉트되거나 404
- [ ] Header 네비게이션에 "보도자료" 링크가 없고 "자료실" 링크가 있다
- [ ] 댓글/좋아요가 모든 게시판에서 정상 작동

## 마이그레이션 전략
1. 배포 전 스크립트로 Firestore posts 컬렉션에서 `category == "press"` 문서 조회 → `category: "promotion"`, `tags: [...(기존), "보도자료"]` 로 업데이트
2. 기존 polls 컬렉션은 읽기 보존, 신규 polls는 posts 내 poll 필드로 저장
3. 구 `/polls` URL은 Next.js `redirects`로 `/board/free` 또는 `/board` 로

## 보완 사항 (리뷰 반영)

### Critical

**C1. 마이그레이션 안전장치**
- `scripts/migrate-press-to-promotion.ts` 구현: dry-run 모드 기본, `--apply` 플래그 필요
- 각 문서에 `_legacyCategory: "press"` 백업 필드 저장 (롤백용)
- Firestore 배치 쓰기 ≤500 분할, 재시도 3회 exponential backoff
- 마이그레이션 중 쓰기 차단: `site_settings.writeFreeze: true` 플래그로 서버 API 차단
- 롤백 스크립트 `scripts/rollback-press-migration.ts` 동시 준비
- `next.config.js` redirects에 `/board/press` → `/board/promotion` 301 추가, 본문 내 press 링크도 리다이렉트

**C2. Poll 집계·인덱스 설계**
- Post 문서에 비정규화 `pollSummary: { question, totalVotes, deadline, topOption }` 필드 저장
- 투표 시 Firestore 트랜잭션: `posts/{id}.pollSummary.totalVotes` 증가 + `posts/{id}/votes/{uid}` 문서 생성 (중복 방지 unique key)
- 고빈도 투표(예: 100+ 동시)는 counter shard 패턴 적용 권고 (MVP는 단순 트랜잭션 + 사용자 쿼터로 대응)
- "내가 참여한 투표 목록" 쿼리는 `votes` collectionGroup 인덱스 사전 등록 → `firestore.indexes.json` 반영
- posts 목록에 투표 표시 필요 시 `pollSummary`만 조회, 옵션 상세는 상세 페이지에서

**C3. 서버측 카테고리 권한 재검증**
- 클라이언트 URL 고정과 별도로 API Route `/api/posts` POST 핸들러에서 `session.user.role` × `PostCategory.allowedRoles` 검사
- Firestore rules도 동일 검사: `request.auth.token.role` 기반 — NextAuth JWT에 role claim 포함되는지 확인, 없으면 Admin SDK Custom Claims 동기화 훅 추가
- 권한 테이블 단일 소스: `src/lib/post-permissions.ts`
  ```ts
  export const POST_CATEGORY_RULES = {
    free: { write: ["member", "staff", "admin", "president"] },
    promotion: { write: ["staff", "admin", "president"] },
    seminar: { write: ["staff", "admin", "president"] },
    staff: { write: ["staff", "admin", "president"], read: ["staff", "admin", "president"] },
    resources: { write: ["staff", "admin", "president"] },
  } as const;
  ```

### Warning (정책 확정)

**W1. 투표 정책** (기본값)
- 로그인 필수, UID 기반 중복 방지 (익명 저장이지만 서버는 UID 해시로 검증)
- 단일/복수 선택: 작성자가 토글 (기본 단일)
- 마감 후 재투표·수정 불가, 결과는 마감 전/후 모두 공개 (작성자가 "마감 전 결과 숨김" 토글 가능)
- 비로그인 투표 불가 (로그인 유도 CTA)

**W2. 자료실 파일 정책**
- 최대 크기 20MB, MIME 허용: pdf, hwp, hwpx, pptx, docx, xlsx, zip, jpg, png
- 업로드 위치: Firebase Storage `/resources/{postId}/{filename}` — 기존 upload 유틸 재사용하되 검증 강화
- 다운로드 권한: 회원 이상 (비로그인 차단), 다운로드 수 카운터(트랜잭션)
- 바이러스 스캔은 이번 범위 제외 (향후 GCS 확장 이벤트로 처리 예정)

**W3. 좋아요 정합성**
- 서브컬렉션 방식: `posts/{id}/likes/{uid}` 문서 존재 여부로 판정, 중복 방지 자연스럽게 해결
- posts에 `likeCount` 비정규화 (트랜잭션 증감)
- 기존 구조가 배열이면 마이그레이션 스크립트에 포함

**W4. 댓글 정책**
- MVP: 대댓글 1단계 (부모 댓글 ID 참조), 이모지 좋아요는 이번 범위 제외
- 삭제: soft delete (`deletedAt` 스탬프), 본인/관리자만 가능
- 본문은 plain text + 줄바꿈 보존, 마크다운/HTML 금지

### 기능 플래그
- `NEXT_PUBLIC_FEATURE_POLL_IN_POST` 환경변수로 점진 롤아웃, 문제 시 즉시 off

## 위험 (업데이트)
- 세션 JWT에 role claim 누락 가능성 → 로그인 플로우 점검 필요
- 자료실 Storage 쿼터 증가 관찰 필요 (월 1GB 상한 모니터링)

## 예상 일정
- Design: 0.5일 (데이터 모델 + UI 와이어)
- Do: 1.5~2일
- Check/Report: 0.5일
