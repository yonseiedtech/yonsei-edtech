# 소통 보드 (Q&A Communication Board) — 작업 로그

- **일자**: 2026-06-05
- **브랜치**: `feature/comm-board` → `master` (fast-forward 병합, 브랜치 삭제)
- **HEAD**: `c0d1b06e`
- **방법론**: superpowers brainstorming → writing-plans → subagent-driven-development

## 무엇을 만들었나

스터디 회차·세미나에서 **질문↔답변으로 소통하는 보드**. 보드를 누구나 생성(로그인)·수정·삭제(소유자/운영진)하고,
질문/답변은 비로그인 게스트 포함 누구나 작성(보드별 토글), 익명 옵션, 좋아요(로그인)·질문 채택(해결됨)·정렬(최신/인기).
Zoom 화면공유용 **전체화면 발표 보기**(QR + 5초 폴링) 포함.

## 산출물

### 데이터 (4개 신규 Firestore 컬렉션)
- `comm_boards` / `comm_questions` / `comm_answers` / `comm_likes`
- `src/types/comm-board.ts` — 타입 + `COMM_SORT_LABELS`
- `src/lib/bkend.ts` — `commBoardsApi` / `commQuestionsApi` / `commAnswersApi` / `commLikesApi`
  - 좋아요/답변수는 `increment()` denorm, 좋아요 deterministic id `${userId}__${target}__${id}`
  - 질문 삭제 시 자식 답변 cascade 삭제
- `firestore.rules` — 4개 컬렉션 블록 (board read 공개, 질문/답변 create 는 `commBoardWritable`(allowGuest+status==open) 게이트,
  카운터 갱신은 `affectedKeys().hasOnly([...])` 로 인증 사용자 허용, likes id 포맷 강제)

### UI (`src/features/comm-board/`)
- `comm-helpers.ts` (+ 단위테스트 11개): `sortQuestions` / `makeLikeId` / `canManageBoard` / `canDeletePost`
- `CommBoardDialog` (생성/수정), `CommBoardSection` (회차·세미나 임베드 목록+생성)
- `QuestionComposer`, `AnswerThread`, `QuestionItem`, `CommBoardDetail`
- `CommBoardPresent` (전체화면 발표 보기 — `qrcode.react` QRCodeSVG + `refetchInterval` 5초)

### 라우트
- `src/app/boards/[boardId]/page.tsx` (공개 보드 상세)
- `src/app/boards/[boardId]/present/page.tsx` (발표 보기)

### 임베드
- `src/features/activities/ActivityWeekDetailPage.tsx` (회차, `contextType = activity.type`)
- `src/app/seminars/[id]/page.tsx` (세미나, `contextType="seminar"`)

## 검증
- 단위테스트: comm-board 11개 통과 / 전체 스위트 **568개 전부 통과** (회귀 없음)
- 프로덕션 빌드 `npm run build` exit 0 (수정 전·후 2회)
- 최종 코드리뷰(서브에이전트) 후 7건 반영:
  1. `canAccept` 하드코딩 역할 → `isStaffOrAbove` 헬퍼
  2. AnswerThread N+1(보드 전체 답변 fetch) → `listByQuestion(filter[questionId])`
  3. `defaultSort` 미반영 → useEffect 초기 정렬
  4. `comm_likes` id 포맷 rules 강제
  5. 질문 삭제 답변 cascade (UI 안내문과 일치)
  6. 카운터 조작 트레이드오프 rules 주석 명시
  7. 로딩 Skeleton 통일

## 남은 작업 (배포 — 사용자 승인 필요)
1. **firestore.rules 배포** (⚠️ 필수 — 안 하면 신규 컬렉션 접근 거부):
   `npx firebase deploy --only firestore:rules --project yonsei-edtech`
2. **앱 배포** (CLAUDE.md 절차):
   `git push origin master && npm run deploy:vercel`
   배포 후 Alias 연결 확인 + https://yonsei-edtech.vercel.app 동작 확인

> Claude 세션에서 프로덕션 배포가 auto-mode classifier 에 의해 차단됨 → 사용자가 직접 실행하거나 권한 부여 필요.

## 설계·계획 문서
- `docs/superpowers/specs/2026-06-04-comm-board-design.md`
- `docs/superpowers/plans/2026-06-04-comm-board.md`
