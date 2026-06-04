# 소통 보드 (Q&A Communication Board) 설계

- **작성일**: 2026-06-04
- **대상 프로젝트**: yonsei-edtech (연세교육공학회)
- **상태**: 설계 승인 → 구현 계획 대기

## 1. 배경 & 목표

스터디 회차·세미나 등 **특정 세션** 단위로, 참여자가 **질문과 답변으로 소통**할 수 있는 보드를
만들고 싶다. 보드 자체를 **생성·수정·삭제**할 수 있는 관리 대상 엔티티로 다룬다.

기존 `study_session_notes`(토론노트)는 혼자 메모(질문/인사이트/하이라이트/인용)를 붙이는 구조라
**답글 스레드**·**보드 엔티티**·**세미나 지원**이 없다. 따라서 토론노트를 확장하지 않고
**범용 소통 보드 모듈을 신설**한다(브레인스토밍에서 방향 A 채택).

### 핵심 요구사항
- 질문↔답변 중심의 스레드형 소통
- 보드 CRUD: **누구나 생성**, 본인 보드만 수정·삭제(운영진은 전체) → 소유권 식별 위해 **생성은 로그인 기반**
- 질문/답변: **비로그인(게스트) 포함 누구나 작성**, **익명 옵션**, 답변은 누구나(스레드형)
- 상호작용: **좋아요(공감)·질문 채택(해결됨)·정렬(최신/인기)**
- 적용: **스터디 회차 + 세미나**(프로젝트/대외 활동도 확장 가능)
- **전체화면 발표 보기**(Zoom 화면공유용, Slido 스타일)

### 기술 전제
- Next.js 16 + Firestore. 쓰기는 **클라이언트에서 Firestore SDK 직접 호출**(`@/lib/bkend`의 `dataApi`),
  보안은 **firestore.rules로 강제**. 비로그인 쓰기 선례: `user_feedback`.
- react-query, `qrcode.react`, `framer-motion`, sonner(toast) 이미 설치됨.

## 2. 데이터 모델

신규 컬렉션 4개.

### `comm_boards`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 보드 ID |
| `contextType` | `'study' \| 'project' \| 'external' \| 'seminar'` | 컨텍스트 종류 |
| `contextId` | string | 활동 ID 또는 세미나 ID |
| `activityProgressId?` | string | 회차 기반 활동의 특정 회차 ID (세미나는 없음) |
| `week?` | number | 회차 번호 (denorm, 표시용) |
| `title` | string | 보드 제목 |
| `description?` | string | 보드 설명 |
| `ownerId` | string | 생성자 userId |
| `ownerName` | string | 생성자 이름 (denorm) |
| `allowGuest` | boolean | 비로그인 질문/답변 허용 (기본 false) |
| `allowAnonymous` | boolean | 익명 옵션 노출 (기본 true) |
| `status` | `'open' \| 'closed'` | closed = 읽기 전용 |
| `defaultSort` | `'recent' \| 'popular'` | 기본 정렬 (기본 recent) |
| `createdAt` / `updatedAt` | string(ISO) | |

### `comm_questions`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | |
| `boardId` | string | 소속 보드 |
| `contextId` | string | denorm (보드의 contextId) |
| `authorId?` | string | 로그인 작성자 (게스트는 없음) |
| `authorName?` | string | 로그인 작성자 이름 |
| `guestName?` | string | 게스트가 입력한 이름 (선택) |
| `anonymous` | boolean | 익명 표시 |
| `body` | string | 질문 본문 |
| `resolved` | boolean | 해결됨 여부 |
| `resolvedAnswerId?` | string | 채택된 답변 ID |
| `likeCount` | number | 좋아요 수 (denorm, `increment()`) |
| `answerCount` | number | 답변 수 (denorm, `increment()`) |
| `createdAt` / `updatedAt` | string(ISO) | |

### `comm_answers`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | |
| `questionId` | string | 소속 질문 |
| `boardId` | string | denorm |
| `authorId?` / `authorName?` / `guestName?` | string | 작성자 (게스트 가능) |
| `anonymous` | boolean | |
| `body` | string | 답변 본문 |
| `isAccepted` | boolean | 채택된 답변 여부 |
| `likeCount` | number | denorm |
| `createdAt` | string(ISO) | |

### `comm_likes`
- deterministic id = `${userId}__${targetType}__${targetId}` (`streak_events` 멱등 패턴 재사용)
- 필드: `userId`, `targetType: 'question' \| 'answer'`, `targetId`, `createdAt`
- 대상 doc의 `likeCount`는 `increment(±1)`로 갱신
- **좋아요는 로그인 필수**(게스트는 식별 불가→중복 방지 불가). 게스트는 질문/답변은 작성 가능하나 좋아요는 불가.

### 정렬
- 클라이언트 정렬로 Firestore 복합 인덱스 회피(코드베이스 관행).
  - 최신: `createdAt` desc
  - 인기: `likeCount` desc → `answerCount` desc → `createdAt` desc

## 3. 권한 (firestore.rules)

- `comm_boards`
  - read: 전체 공개(비로그인 포함)
  - create: 로그인 & `ownerId == request.auth.uid`
  - update / delete: 소유자(`ownerId == uid`) 또는 운영진(staff+)
- `comm_questions`, `comm_answers`
  - read: 전체 공개
  - create: 대상 board doc을 `get()`하여 `board.status == 'open'` 그리고
    (`board.allowGuest == true` 면 비로그인 포함 전체, 아니면 로그인) 일 때 허용
  - update / delete: 작성자(로그인 본인 `authorId == uid`) 또는 보드 소유자 또는 운영진
- `comm_likes`
  - read: 전체 공개(또는 본인). create/delete: 로그인 & 본인 `userId == uid`, id 규칙 일치

### 트레이드오프 (승인됨)
- **게스트 글은 본인이 수정·삭제 불가**(uid 없음) → 보드 소유자·운영진만 삭제(모더레이션).
- **서버 레이트리밋 불가**(클라이언트 직접 쓰기) → 방어 = firestore.rules + 운영진 모더레이션
  + 클라이언트 베스트에포트 스로틀(연속 작성 제한, 본문 길이 제한).

## 4. UX & 화면 배치

### 4.1 임베드 (보드 목록 + 생성)
- **활동 회차 페이지** `/activities/studies|projects/[id]/weeks/[week]`: 기존 카드(토론노트·회고·과제·자료)
  옆에 **"소통 보드" 섹션** — 해당 회차 보드 목록 + `보드 만들기`.
- **세미나 상세 페이지**: 동일 섹션 (`contextType='seminar'`, `contextId=seminarId`).
- 동일 컴포넌트 `CommBoardSection`을 컨텍스트 props만 바꿔 재사용.

### 4.2 보드 상세 — 공개 라우트 `/boards/[boardId]`
- 게스트도 열 수 있는 공유 가능한 단독 URL(Zoom 채팅 링크 공유 용이).
- 상단: 제목·설명·상태·정렬 토글(최신/인기)·소유자. 운영진/소유자용 `수정`/`삭제`/`닫기`.
- **질문 작성기**: 본문 + 익명 토글(allowAnonymous) + 게스트 이름(비로그인 & allowGuest).
- **질문 목록**: 본문·작성자(또는 익명/게스트명)·👍좋아요·💬답변수·`해결됨` 배지. 클릭 → 답변 스레드 펼침.
- **답변 스레드**: 답변 작성기 + 답변 카드(좋아요·`채택`). 채택 = 질문 author(로그인) 또는
  보드 소유자/운영진 → 질문 `resolved=true` + `resolvedAnswerId` + 답변 `isAccepted=true`.
- 삭제: 글 작성자(로그인 본인) 또는 보드 소유자/운영진.

### 4.3 보드 CRUD UI
- `보드 만들기` 다이얼로그: 제목·설명·게스트 허용·익명 허용.
- 소유자/운영진: 수정(동일 다이얼로그)·삭제(confirm)·닫기(읽기전용 전환).

### 4.4 전체화면 발표 보기 `/boards/[boardId]/present`
- 큰 글씨·그리드, 질문 **인기순**, 해결 질문 흐리게/숨김 토글.
- **자동 갱신**: `refetchInterval` 5초(세미나 호스트 폴링 패턴 재사용).
- 화면 한쪽 **보드 URL QR코드**(`qrcode.react`) → 원격 참석자 폰 스캔 참여.

## 5. 기술 구성

### API 계층 (`src/lib/bkend.ts`, 기존 `dataApi` 패턴)
- `commBoardsApi`: `listByContext(contextType, contextId, activityProgressId?)` / `get` / `create` / `update` / `delete`
- `commQuestionsApi`: `listByBoard(boardId)` / `create` / `update` / `delete` / `setResolved`
- `commAnswersApi`: `listByBoard(boardId)` / `create` / `delete` / `accept`
- `commLikesApi`: `toggle(userId, targetType, targetId)` — deterministic id + `increment()` denorm
- 카운터(`likeCount`, `answerCount`)는 Firestore `increment()`로 경쟁 방지. 삭제 시 감소.

### 타입 (`src/types/comm-board.ts`, index 재노출)
- `CommBoard`, `CommQuestion`, `CommAnswer`, `CommLike`, 라벨·색상 맵, 정렬 enum.

### 컴포넌트 (`src/features/comm-board/`)
- `CommBoardSection.tsx` — 회차·세미나 임베드(목록 + 생성)
- `CommBoardDialog.tsx` — 보드 생성/수정
- `CommBoardDetail.tsx` — 질문+답변 본체(공개 라우트에서 사용)
- `QuestionItem.tsx` / `AnswerThread.tsx` — 하위 컴포넌트
- `CommBoardPresent.tsx` — 전체화면 발표 보기

### 라우트 (`src/app/`)
- `boards/[boardId]/page.tsx` — 공개 보드 상세
- `boards/[boardId]/present/page.tsx` — 전체화면 발표 보기

### 데이터 흐름
- react-query `useQuery`/`useQueryClient`. 정렬 클라이언트 처리. 발표 보기 `refetchInterval` 5초.
- 좋아요 낙관적 업데이트(기존 패턴).
- 게스트: 로그아웃 시 `authorId` 없이 작성, `guestName?`·`anonymous`. 게스트 글은 수정/삭제 불가(스푸핑 방지 위해 토큰 미저장).

### 보안 산출물
- `firestore.rules`에 4개 컬렉션 블록 추가(§3). `comm_questions/answers` create는 board doc `get()`으로
  `allowGuest`·`status==open` 검사.
- 단일 필드 필터(boardId/contextId)만 사용 → 복합 인덱스 불필요(필요 시 `firestore.indexes.json` 추가).
- **배포 시 firestore.rules 별도 deploy** 필요.

## 6. 에러처리

- 모든 쓰기 try/catch → `toast.error`(sonner). 로딩=Skeleton, 빈 상태=점선 메시지, 에러=`role="alert"`.
- 좋아요 비로그인 → 로그인 안내 토스트.
- 닫힘/게스트 비허용 보드 → 작성 UI 비활성 + rules 거부 폴백.
- 삭제된 보드 공개 라우트 → "보드를 찾을 수 없습니다" 친절 처리.

## 7. 테스트

- 순수 헬퍼 추출·vitest 단위 테스트:
  - `sortQuestions(list, mode)` (최신/인기)
  - `makeLikeId(userId, targetType, targetId)`
  - `canManageBoard(user, board)` / `canDeletePost(user, post, board)` (권한)
- 수동 QA 체크리스트:
  - 게스트 작성 / 익명 / 채택→해결됨 / 발표 폴링·QR / 운영진 모더레이션 삭제 / 닫힘 보드 읽기전용

## 8. 범위 밖 (v1 제외, 명시)

- 학습 잔디(streak) 가산점 연동 — 추후 검토
- 서버 레이트리밋 — 클라이언트 직접 쓰기라 불가 → 모더레이션으로 대체
- 질문/답변 첨부 이미지·파일 — v1은 텍스트 우선
- 실시간 소켓(웹소켓) — v1은 폴링으로 충분
