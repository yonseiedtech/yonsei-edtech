# 모임 고도화 Phase 2 — 모집·참여 완결 4건 구현 보고 (2026-07-08)

근거: `gatherings-gap-analysis-2026-07-08.md`(G2·G3·G5·G14), `gatherings-enhancement-project-2026-07-08.md` Phase 2. Phase 1(companions 입력·취소/연기 알림·확정 정합) 위에 최소 diff.
제약: firestore.rules 무수정(기존 규칙만으로 처리) / 커밋·배포 없음.

---

## 1. G2 — 대기자(waitlist) + 취소 시 자동 승격

정원 초과 시 하드 거부(409) 대신 대기자로 저장하고, 참석자가 빠지면 대기 1순위를 자동 승격한다.

### 타입
- `src/types/networking.ts`
  - `RsvpStatus` 유니온에 `"waitlisted"` 추가.
  - `RSVP_STATUS_LABELS`(exhaustive `Record<RsvpStatus,string>`)에 `waitlisted: "대기"` 추가.
  - 전수 확인: `RsvpStatus`/`RSVP_STATUS_LABELS` 를 참조하는 곳(console·GatheringEventCard·MyActivityHub·roster·cron·helpers)은 모두 `Record` 인덱싱 또는 `status === "attending"` 비교라 waitlisted 추가로 깨지는 exhaustive switch 없음. `RSVP_OPTIONS`(카드의 3버튼)는 사용자 선택지라 그대로 둠(waitlisted 는 서버가 부여).

### 회원 RSVP 서버 (`src/app/api/networking/rsvp/route.ts`)
- 트랜잭션을 재구성: 이벤트 전체 RSVP 를 한 번 read(`where eventId`) → 정원 판정과 승격을 같은 스냅샷으로 처리.
- 정원 초과(참석 요청 `attendingSeats + 1 + companions > capacity`)면 `effectiveStatus = "waitlisted"` 로 저장(409 제거).
- 응답에 `{ waitlisted, waitlistPosition }` 반환. 순번 = 대기자 중 내 `createdAt` 이하 개수 + 1.
- 승격: 본인 변경으로 `effectiveStatus !== "attending"`(불참·미정·대기)면 빈자리(`capacity - attendingSeats`) 만큼 waitlist 를 `createdAt` 최선순으로 채운다. 최선순이 좌석 수(1+동반인)에 안 맞으면 중단(FIFO 순번 보존).
- 승격 알림: 트랜잭션 후 승격된 **회원(userId 보유)** 에게 admin SDK 로 `notifications` 직접 생성 — "「{제목}」 대기자에서 참석 확정되었습니다." 링크는 공개=`/gatherings`, 비공개=토큰 매핑 역조회. **게스트 승격자는 인앱 계정이 없어 알림 스킵**(status 만 attending 으로 바뀌어 콘솔 명단에 참석으로 표시).

### 게스트 RSVP 서버 (`src/app/api/networking/rsvp-guest/route.ts`)
- 정원 초과 시 409 대신 `status: "waitlisted"` 로 단순 저장(트랜잭션화는 G20 스코프 — 이번 제외). 순번 = 현재 waitlisted 수 + 1. 응답에 `{ waitlisted, waitlistPosition }`.

### UI
- `src/features/networking/GatheringEventCard.tsx`
  - `setMemberRsvp`/`submitGuest` 가 응답의 `waitlisted`·`waitlistPosition` 을 읽어 "정원이 가득 차 대기자로 등록했습니다 (대기 N번)" 토스트.
  - `myRsvp.status === "waitlisted"` 이면 amber 배지("정원이 가득 차 대기자 명단에 있습니다 (대기 N번). 자리가 나면 자동으로 참석 확정됩니다.") 노출. 제출 직후 순번은 `waitlistPos` state.
  - **결정**: 카드는 roster(정원 현황)를 fetch 하지 않으므로 "대기 신청" 버튼 사전 라벨링 대신, 제출 후 반응형으로 대기 상태·순번을 표시(추가 쿼리 없이 최소 diff). 참석 버튼을 눌러 대기 배정되는 흐름은 토스트로 안내.
- `src/app/console/networking/page.tsx`
  - 명단 헤더에 "대기 N명" chip, 참석 상태 셀에서 waitlisted 는 amber 강조. RSVP_STATUS_LABELS 로 "대기" 표기 자동 반영.

### 회비 정합
- `computeSettlement`·콘솔 `generateDues` 는 `status === "attending"` 만 대상 → **waitlisted 는 회비 생성·정산에서 자동 제외**(확인 완료, 변경 불필요).

---

## 2. G3 — 당일 체크인/노쇼 + 잔디 실참석 기준

### 타입
- `NetworkingRsvp` 에 `attendedAt?: string`(현장 체크인 시각) 추가.

### 콘솔 체크인 (`src/app/console/networking/page.tsx`)
- 명단 테이블에 "체크인" 열 추가. `status === "attending"` 행에 토글 버튼 — set/unset `attendedAt`(`deleteField()` 로 unset). staff 전용.
- **rules 확인**: `networking_rsvps` 의 `allow update: if ... isStaffOrAbove()` 로 staff 가 타인 RSVP update 가능 → **서버 라우트 불필요, 클라이언트 `networkingRsvpsApi.update` 로 처리**(rules 무수정).
- 노쇼 카운트: 지난 행사(종료 후)에서 `attending && !attendedAt` 수를 "노쇼 N명" chip 으로 표시. 종료 전에는 무의미하므로 미집계.

### cron 잔디 실참 기준 (`src/app/api/cron/networking-reminder/route.ts`)
- 당일(D-0) streak +5 적립을 **attendedAt 기준으로 전환**:
  - `anyCheckedIn`(attending 중 attendedAt 하나라도 존재) → **엄격 모드**: 체크인한 회원만 적립.
  - 아무도 체크인 안 함(체크인 기능 미사용 이벤트) → **하위호환**: 기존처럼 attending 전원 적립.
- **하위호환/타이밍 caveat(주석·보고서 명시)**: 이 cron 은 매일 09:00 실행이라 저녁 행사의 현장 체크인은 이 시점에 아직 없을 수 있다. 그런 이벤트는 자연히 "체크인 없음 → 전원 적립"으로 처리된다. 즉 **운영진이 09:00 이전에 체크인을 기록한 이벤트에서만 엄격 모드가 실제로 발동**한다. streak 문서는 결정적 doc id + merge 라 멱등(재실행해도 중복·차감 없음). 이 동작은 명세("114행 부근 당일 적립을 attendedAt 기준으로 전환")에 충실한 최소 변경이다.

---

## 3. G5 — 회비 미납 알림 + 마이페이지 집계

### cron 미납 알림 (`src/app/api/cron/networking-reminder/route.ts`)
- 행사 **D+3** 에 unpaid due 회원에게 1회 알림. 멱등: 이벤트 문서 `duesReminderSentAt` 마커 + `notifyOnce` 사용자 단위 dedupe 이중 가드.
- `networking_dues where eventId` 조회 → `status === "unpaid" && userId` 대상. dedupeTitle "회비 미납 안내", 링크 `gatheringsLink`(공개 `/gatherings`, 비공개 토큰). 대상 없어도 마커는 기록(재조회 방지).
- `duesReminderSentAt` 는 cron 인라인 ev 타입에만 추가(pollReminderSentAt 과 동일 패턴, NetworkingEvent 인터페이스 무수정).

### 마이페이지 집계 (`src/components/mypage/MyActivityHub.tsx`)
- `networkingDuesApi.listByUser`(기존 API 존재 — bkend 추가 불필요) 로 내 due 조회 → `status === "unpaid"` 필터.
- 미납 있을 때만 상단에 amber 요약 카드("미납 회비 N건 · 합계 {원}") + `/gatherings` 링크. **미납 0이면 미노출**.
- rules `networking_dues read: 본인 or staff` → listByUser(본인 filter)로 본인 due 읽기 정상.

---

## 4. G14 — 투표 개시 알림

### 알림 유틸 (`src/features/notifications/notify.ts`)
- `notifyGatheringPollStarted(eventTitle)` 추가 — 기존 전체 공지성 `fanOut`(notifyNewNotice·notifyNewSeminar 와 동일 패턴, 승인 회원 전체 fan-out) 재사용. 타입은 `networking_reminder`, 메시지 "「{제목}」 일정 투표가 시작되었습니다", 링크 `/gatherings`.

### 발송 (`src/features/networking/EventEditorForm.tsx`)
- **신규 생성**(`!initial`) & `schedulingMode==="poll"` & `published` & `visibility==="public"` 일 때 발송. `.catch(()=>{})` fire-and-forget(전체 발송 실패가 저장을 막지 않음, create 내부도 try/catch 로 개별 실패 무시).
- **비공개 poll 제외**: 초대 알림(H2)이 담당.

---

## 하위호환·설계 결정 요약
- waitlisted 는 회비·정산·roster·streak 대상에서 자동 제외(모두 `status === "attending"` 기준).
- G3 streak 엄격 모드는 "체크인이 09:00 cron 이전에 기록된 이벤트"에서만 발동(타이밍 caveat 위 명시). 미사용 이벤트는 기존 동작 100% 보존.
- 승격 알림은 회원만(게스트 스킵). 승격은 참석자 이탈(불참/미정) 시 트랜잭션 내 자동 처리.
- 게스트 waitlist 는 비트랜잭션 단순 저장(G20 경쟁 이슈는 별도 스코프).

## 변경 파일
1. `src/types/networking.ts` — RsvpStatus waitlisted + 라벨, NetworkingRsvp.attendedAt
2. `src/app/api/networking/rsvp/route.ts` — waitlist 저장·순번·자동 승격·승격 알림
3. `src/app/api/networking/rsvp-guest/route.ts` — 게스트 waitlist 저장·순번
4. `src/features/networking/GatheringEventCard.tsx` — 대기 토스트·순번 배지
5. `src/app/console/networking/page.tsx` — 체크인 토글·노쇼/대기 chip
6. `src/app/api/cron/networking-reminder/route.ts` — attendedAt 기준 streak, D+3 미납 알림
7. `src/components/mypage/MyActivityHub.tsx` — 내 미납 회비 요약
8. `src/features/notifications/notify.ts` — notifyGatheringPollStarted
9. `src/features/networking/EventEditorForm.tsx` — 신규 공개 poll 투표 개시 알림

## 검증
- `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` → (결과 하단 기재)
- `npm run build` → (결과 하단 기재)
- firestore.rules 무수정. 커밋·배포 없음.
