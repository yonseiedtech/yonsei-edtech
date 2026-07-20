# H2-v11 — kudos 관계 확장: 코호트 섬을 넘어 멘토·스터디원·해커톤 팀원에게 응원 (2026-07-21)

> 계획 원문: `docs/plans/service-enhancement-plan-v11-2026-07-21.md` §2 High **H2**
> 트랙 B(관계 확장). 파일 영역 비중복 편성. build·commit 없음(코드/검증만).

## 1. 목표
인정(kudos)이 "같은 가입 학기 동기(cohort)" 한 관계에만 갇혀 있던 것을, **멘토·스터디원·해커톤 팀원**으로 확장한다. 기존 `kudos` 컬렉션·전송 규율(결정적 docId `{from}_{to}_{weekKey}` · 주 1회 자연 제한 · append-only · 자기응원 차단 · 양성 전용·순위 없음)을 **그대로 재사용**하고, **대상 산정만 컨텍스트별로** 달리한다. 신규 컬렉션 없음.

## 2. 데이터 모델 (하위호환)
- `Kudos`에 선택 필드 `context?: KudosContext` 추가. `KudosContext = "cohort" | "mentoring" | "study" | "hackathon"`.
  - **필드 없는 기존 문서 = "cohort"로 간주** → 하위호환. 기존 온보딩·대시보드 코호트 응원 동작 무변경.
- `kudosApi.send(...)`에 6번째 선택 인자 `context?` 추가. **값이 있을 때만 문서에 기록**(스프레드 조건부)해 undefined 기록을 피함.

## 3. firestore.rules
- **변경 없음.** 기존 `match /kudos/{docId}` create 규칙에 `hasOnly` 필드 화이트리스트가 **없어**(fromUserId 일치·from≠to·docId 규약만 검증) `context` 필드 추가로 규칙이 깨지지 않는다.
- 결정적 docId(`{from}_{to}_{weekKey}`) 규약을 유지했으므로 **기존 블록이 그대로 커버**. 같은 (from,to,weekKey) 쌍은 컨텍스트와 무관하게 주 1회만(두 번째 시도는 update 판정 → `allow update: if false` 로 거부) — 의도된 "주 1회 자연 제한".

## 4. 공통 로직 일반화 (useCohortKudos → useKudosSend 추출)
- **신규 `src/features/kudos/useKudosSend.ts`**: 전송·주1회 dedup·낙관적 반영·알림의 공통부를 추출. `KudosTarget = { id; name; profileImage? }` 최소 타입 도입(User 상위호환). queryKey `["kudos-sent", myId, weekKey]` 공통화로 여러 인스턴스 간 react-query dedup.
- **`useCohortKudos.ts` 리팩토링**: 코호트 대상 산정(이번 주 streak_events 활동 + `showInLeaderboard≠false` + 나 제외)만 남기고, 전송/dedup/알림은 `useKudosSend(me, "cohort")`에 위임. 외부 시그니처(`CohortKudos`) 유지(단 `sendKudos` 파라미터를 `KudosTarget`으로 넓힘 — User 대입 가능).
- **`CohortKudosButtons.tsx`**: props 타입을 `User[]` → `KudosTarget[]`로 일반화(id/name/profileImage만 사용). 기존 `CohortKudosSend` 호출부 무변경(User는 KudosTarget에 대입 가능).
- **`notify.ts` `notifyKudos`**: 3번째 선택 인자 `context`로 알림 문구·링크만 관계 맥락에 맞게 분기(기본 = cohort, 기존 동작 동일).

## 5. 삽입점 3곳 (대상 산정만 컨텍스트별)
1. **멘토링 — 답변 채택 시 질문자→멘토 감사 응원** (`comm-board/AnswerThread.tsx`)
   - 신규 `KudosInlineButton`(단일 대상 인라인 버튼) 사용. 노출 조건: `board.contextType==="mentoring"` + 답변 채택됨 + 뷰어가 질문자(`question.authorId===user.id`) + 답변 작성자가 회원(`a.authorId`)이고 자기 자신 아님. context="mentoring".
2. **스터디 — 같은 회차 참여자 응원(회차 완료 맥락)** (`activities/ActivityWeekDetailPage.tsx`)
   - 신규 `KudosSendBlock`(목록형) 사용. 노출 조건: `type==="study"` + `week.status==="completed"` + 뷰어가 참여자 + 공동 참여자 ≥1. 대상 = `participantUsers`(나 제외). context="study".
3. **해커톤 — 팀원 응원** (`hackathon/HackathonTeamView.tsx`)
   - `KudosSendBlock` 사용. 대상 = **join(userId 보유) 관계**로 산정: 내가 올린 아이디어의 합류자 + 내가 합류한 아이디어의 작성자·공동 합류자(중복 dedup·나 제외). context="hackathon".
   - ⚠️ 확정 팀 `submissions.members`는 **이름 문자열만**이라 userId가 없어(응원은 수신자 userId 필수) 대상에서 제외. `hackathon_team_joins`(userId 보유) 관계만 대상.

## 6. 신규/수정 파일
**신규**
- `src/features/kudos/useKudosSend.ts` — 공통 전송 훅 + `KudosTarget` 타입
- `src/features/kudos/KudosSendBlock.tsx` — 목록형 응원 블록(스터디·해커톤)
- `src/features/kudos/KudosInlineButton.tsx` — 단일 대상 인라인 버튼(멘토링)

**수정**
- `src/types/kudos.ts` — `KudosContext` 타입 + `Kudos.context?` 필드
- `src/lib/bkend.ts` — `kudosApi.send` context 인자, `KudosContext` import
- `src/features/notifications/notify.ts` — `notifyKudos` context 분기(문구·링크)
- `src/features/kudos/useCohortKudos.ts` — 공통 훅 위임 리팩토링
- `src/features/kudos/CohortKudosButtons.tsx` — props `KudosTarget[]` 일반화
- `src/features/comm-board/AnswerThread.tsx` — 멘토링 채택 응원 CTA
- `src/features/activities/ActivityWeekDetailPage.tsx` — 스터디 회차 완료 동료 응원
- `src/features/hackathon/HackathonTeamView.tsx` — 팀원 응원 + 대상 산정

## 7. 규율 준수 확인
- 수정 금지 파일(ActivityDetail.tsx·StudyCurriculumWizard·study-curriculum-designer·newcomer cron/lib·console/page.tsx) **미변경**(다른 트랙 소유).
- 신규 컬렉션 0 · cron 0 · rules 변경 0. 표현/훅 계층 + 데이터 모델 선택 필드 1개만.

## 8. 검증
- `npx tsc --noEmit` → **에러 0** (exit 0).
- `npx eslint <변경 파일 전체>` → **에러 0** (bkend.ts의 기존 무관 warning 3건은 --quiet 억제 대상, 내 변경과 무관).
- `npx eslint src --quiet`의 잔여 3 에러는 `src/app/console/archive/page.tsx`(H4 트랙 rawcolor 부채, **본 작업 미변경 파일**) — 본 트랙 범위 밖.

## 9. 후속(데이터 축적 대기 — 계획서 §3)
- kudos 리더보드·주차 추이: **H2 배포 후 8월 유입기 관찰 → 9월 초 재평가**(관계 확장이 볼륨 선행조건).
