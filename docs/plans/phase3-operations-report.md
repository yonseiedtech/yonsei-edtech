# 모임 고도화 Phase 3 — 운영 효율·인사이트 (2026-07-09)

근거: `gatherings-gap-analysis-2026-07-08.md` G18·G19·G4·G7·G8, `gatherings-enhancement-project-2026-07-08.md` Phase 3.
Phase 1·2(companions·waitlisted·attendedAt·알림) 위에 최소 diff로 4건 구현. firestore.rules 미수정.

---

## 1. G18 — 운영 통계 대시보드 (M)

### 변경 파일
- `src/lib/bkend.ts` — `networkingRsvpsApi.listAll(limit=2000)`, `networkingDuesApi.listAll(limit=2000)` 추가.
- `src/features/networking/NetworkingStats.tsx` — 신규 통계 컴포넌트.
- `src/app/console/networking/page.tsx` — "운영 / 통계" 탭 토글 + 통계 탭에서 `NetworkingStats` 렌더.

### rules 확인 결과 (admin 라우트 불필요)
`firestore.rules`의 `networking_rsvps`·`networking_dues` read 는 `resource.data.userId == uid || isStaffOrAbove()`.
staff 는 `isStaffOrAbove()` 가 문서와 무관하게 true 라 필터 없는 list(listAll)도 통과한다.
콘솔 통계 탭은 staff 전용이므로 클라이언트 SDK 직접 조회로 충분 — 별도 admin 집계 라우트를 두지 않았다.

### 통계 정의 (전체 이벤트 대상)
- **유형별 개최 수 · 평균 참석**: 유형별 이벤트 수, 그리고 유형별 평균 참석 좌석(`attending` 인원 + 동반인)/이벤트.
- **최근 참석 인원 추이**: `startAt` 확정(취소 제외) 이벤트를 시간순 정렬해 최근 8개의 참석 좌석을 세로 미니 바로.
- **반복 참석자 TOP**: 회원(`userId` 보유) `attending` 횟수 2회 이상, 상위 8명(가로 바).
- **회비 회수율**: `paid` 금액 합계 / (`paid`+`unpaid`) 금액 합계(면제 제외).
- **노쇼율**: 종료(`eventEnded`: poll 미확정 아님 + startAt 有 + 과거) + 체크인 도입(해당 이벤트 rsvp 중 `attendedAt` 하나 이상) 이벤트만 대상. `attending` 중 `attendedAt` 미보유 = 노쇼. Phase 2의 eventEnded·attendedAt 규칙 재사용.
- 데이터 없으면("집계할 참석 데이터가 아직 없습니다") 안내, 섹션별 데이터 부족 시 "집계 준비 중".
- 차트는 순수 CSS 바(div width/height)만 사용 — 신규 라이브러리 없음.

---

## 2. G19 — 회비 자동화 (M)

### 변경 파일
- `src/types/networking.ts` — `NetworkingEvent.autoDues?: boolean`.
- `src/features/networking/EventEditorForm.tsx` — 유료 행사(`feeAmount>0`)일 때 "참석 확정 시 회비 자동 생성" 체크박스 + payload 반영.
- `src/app/api/networking/rsvp/route.ts` — 트랜잭션 후 autoDues 처리(본인 attending 확정 + 승격 회원).
- `src/app/api/networking/rsvp-guest/route.ts` — 게스트 attending 접수 시 autoDues 처리.
- `src/app/console/networking/page.tsx` — "전원 납부 처리" 일괄 버튼.

### 자동화 규칙
- 조건: `event.autoDues === true && event.feeAmount > 0`.
- 멱등: 회원은 `(eventId, userId)` due 존재 시 스킵, 게스트는 `(eventId, displayName)` 존재 시 스킵. 기존 콘솔 `generateDues` 의 dueByKey(`userId ?? displayName`) 규칙과 정합.
- 트리거: (a) 회원이 `attending` 으로 확정될 때, (b) 대기자→참석 **승격**(회원)될 때. 게스트 신청이 즉시 `attending` 일 때. 승격된 게스트는 자동 생성 대상에서 제외(displayName denorm 미확보) — 콘솔 일괄 생성으로 처리(스코프 유지, 후속 제안).
- due 생성은 트랜잭션 밖(post-commit)에서 실행해 RSVP 트랜잭션을 가볍게 유지(기존 승격 알림 블록과 동일 패턴). 실패는 신청 성공을 막지 않는다.
- **전원 납부 처리**: 콘솔 회비 표에 `unpaid` 가 하나라도 있으면 버튼 노출 → `window.confirm` 후 unpaid 전체를 `paid`(paidAt·confirmedBy 기록)로 일괄 업데이트.

---

## 3. G4 — 모임 복제 (S~M)

### 변경 파일
- `src/features/networking/EventEditorForm.tsx` — `duplicateFrom?: NetworkingEvent` prop + `eventToForm` 헬퍼 추출.
- `src/app/console/networking/page.tsx` — EventManager 헤더 "복제" 버튼 + `duplicating` 상태.

### 복제 규칙
- `duplicateFrom` 지정 + `initial=null` → 폼 값 프리필하되 **신규(create)** 로 저장.
- 제목에 `" (복사)"` 접미, `startAt`·`pollPeriodStart/End`·`pollDeadline`·`rsvpDeadline` 비움, 상태는 `upcoming` 으로 초기화.
- RSVP·회비·프로그램(자식 컬렉션)은 이벤트 문서 복제와 무관하게 복사되지 않음. feeAmount·capacity·유형·설명 등 설정값은 복사.
- 반복 규칙(recurring)은 스코프 외 — **후속 제안**(아래 참조).

---

## 4. G7·G8 — 신청 정정·철회 (M)

### G8 회원 철회
- `src/app/api/networking/rsvp/route.ts` — `status:"withdraw"` 액션: 트랜잭션에서 본인 문서 삭제 후 정원 여유분을 대기자에게 승격(Phase 2 승격 로직을 `promoteFrom` 헬퍼로 추출해 재사용). 승격 회원 인앱 알림은 기존 경로.
- `src/features/networking/GatheringEventCard.tsx` — 3버튼 아래 "신청 철회" 링크(`window.confirm` 후).

### G7 게스트 정정·철회
- `src/types/networking.ts` — `NetworkingRsvp.manageToken?: string`(추측 불가 uuid).
- `src/app/api/networking/rsvp-guest/route.ts`:
  - POST: rsvp 문서에 `manageToken` 저장, 응답에 `manageToken` 포함.
  - **GET** `?token=`: 토큰으로 본인 신청 조회 → 행사 제목·시작일·상태·동반인 반환.
  - **DELETE** `{token}`: 토큰으로 신청 삭제 + 대기자 승격(비트랜잭션 — G20 스코프 유지) + 승격 회원 알림. rate-limit 10/h.
- `src/features/networking/GatheringEventCard.tsx` — 게스트 신청 완료 후 "확인/취소 링크"(`/gatherings?guest_rsvp={토큰}`) 복사 패널.
- `src/features/networking/GuestRsvpBanner.tsx` — 신규. `/gatherings?guest_rsvp=` 접근 시 자동 노출, 신청 조회·취소 UI.
- `src/app/gatherings/page.tsx` — PageHeader 아래 `GuestRsvpBanner` 렌더.

### 토큰 정책
- 관리 토큰은 `crypto.randomUUID()` 로 신규 게스트 신청에만 부여. 토큰이 곧 자격증명이라 GET/DELETE 는 로그인 불요.
- 기존 게스트 신청(토큰 없음)은 GET/DELETE 대상에서 조회 불가 → 기존대로 총무 문의(**하위호환**).
- 토큰 노출면: 신청 완료 화면 + 복사 링크. 회원 RSVP·availability 문서엔 부여하지 않음.

---

## 검증
- 타입: `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` — (본문 하단 결과 기록)
- 빌드: `npm run build` — (본문 하단 결과 기록)
- firestore.rules: 미수정. admin SDK(getAdminDb) 라우트는 rules 우회, 콘솔 staff 조회는 기존 staff read 허용 범위 내.

## 후속 제안 (스코프 외)
- G4 반복 규칙(recurring): 주/월 반복 규칙으로 N개 이벤트 자동 생성(복제 버튼의 확장).
- G19 게스트 승격 시 자동 due: 승격 경로에서 게스트 displayName 을 확보해 자동 생성(현재는 콘솔 일괄).
- G20 게스트 신청·취소의 완전 트랜잭션화(현재 정원 판정·승격은 비트랜잭션 — rate-limit 로 완화).
- G18 이벤트 다수 시 listAll 2000 한도 초과 대비 admin 집계 라우트(현재는 클라이언트 집계).
