# 모임 고도화 Phase 1~3 적대적 코드 리뷰 (독립 검증)

- 대상 커밋: `3ed3d748..a2114472` (Phase 1 `531805cd` · Phase 2 `305cae8f` · Phase 3 `a2114472`)
- 방식: 구현 보고서 주장을 신뢰하지 않고 코드로 반증 시도. 코드 수정 없음 — 진단만.
- 리뷰 일자: 2026-07-09

## 심각도 요약

| 심각도 | 건수 |
|--------|------|
| 높음 | 1 |
| 중간 | 4 |
| 낮음 | 8 |
| 점검·이상 없음 | 6 |

---

## 높음 (High)

### H1. 체크인 기반 "실참석 잔디 적립"이 저녁·당일 행사에서 사실상 무력화 — no-show도 적립, 사후 정정 불가
- 파일: `src/app/api/cron/networking-reminder/route.ts:113-147`
- 근거:
  - 잔디 적립 블록은 `if (daysLeft === 0 && ...)` 안에만 존재 → **행사 당일(그날 09:00 cron 실행) 딱 1회**만 적립. D+1 이후 재방문·정정 경로 없음.
  - 같은 시점 로직: `anyCheckedIn = attendingRsvps.some(r => r.attendedAt)` → 09:00 시점엔 저녁 행사 현장 체크인이 아직 없음 → `anyCheckedIn=false` → **하위호환 분기(=attending 전원 적립)** 로 귀결.
  - `batch.set(..., { merge: true })` deterministic id 라 이후 실참석자만 남기는 **삭제/회수 불가**. 저녁에 체크인이 기록돼도 이미 아침에 전원 적립 끝 → 엄격 모드(strict)는 실질적으로 **dead branch**.
- 실패 시나리오: 20명 attending 중 5명만 실제 참석(저녁 체크인)해도, 그날 아침 cron이 20명 전원에게 +5점 적립. 노쇼 15명 점수 영구 잔존. Phase 2 보고서의 "실참석 기준 전환" 목표가 일반적(저녁) 행사에서 달성되지 않음.
- 참고: 코드 주석이 이 한계를 인지하고 있음("체크인 없음 → 전원 적립"). 즉 은닉 버그가 아니라 **설계상 목표 미달**. 보고서가 "노쇼 미적립"을 완료로 서술했다면 사실과 불일치.
- 권고: (a) 적립을 D+1 cron으로 이동해 전날 저녁 체크인을 반영하거나, (b) 아침엔 적립하지 않고 체크인 토글 시점(콘솔)에서 서버가 직접 적립하거나, (c) D+1에 strict 재평가로 미체크인자 streak_events 문서를 삭제(회수)하는 보정 패스 추가.

---

## 중간 (Medium)

### M1. autoDues 회비가 철회/불참 전환 시 정리되지 않음 — 철회한 회원이 계속 미납으로 남고 D+3 독촉까지 수신
- 파일: `src/app/api/networking/rsvp/route.ts:85-99, 181-208` · `src/app/api/networking/rsvp-guest/route.ts:DELETE` · `src/app/api/cron/networking-reminder/route.ts:161-181`
- 근거: `autoDues`는 attending 확정 시 `networking_dues`를 생성만 함. `status:"withdraw"`는 RSVP 문서만 `tx.delete` 하고 **due는 손대지 않음**. attending→not_attending/undecided 전환도 due 미삭제. 게스트 DELETE 도 due 미삭제.
- 실패 시나리오: 유료+autoDues 행사에 참석 확정(due unpaid 생성) → 마음 바꿔 "신청 철회". RSVP는 사라졌지만 `networking_dues` unpaid 잔존 → 마이페이지 "미납 회비" 배지 + cron D+3 "회비 미납 안내" 알림이 **참석하지도 않는 회원에게** 발송. 통계 회수율·total도 오염.
- 권고: withdraw/not_attending 전환 및 게스트 DELETE 시 해당 eventId+userId(게스트는 displayName) unpaid due를 함께 삭제(멱등). 이미 paid면 보존.

### M2. 참석 유지 상태에서 동반인 수를 줄여도 대기자 승격이 트리거되지 않음 — 빈자리 방치
- 파일: `src/app/api/networking/rsvp/route.ts:129`
- 근거: 승격은 `effectiveStatus !== "attending"` 일 때만 실행(`const promoted = ... effectiveStatus !== "attending" ? promoteFrom(...) : []`). attending 유지로 companions만 3→0 감소하면 좌석 3개가 비지만 `effectiveStatus==="attending"` 이라 승격 패스가 스킵됨.
- 실패 시나리오: 정원 10 만석. 참석자 A(본인+3동반=4석)가 동반 0으로 축소 → 3석 공석 발생하지만 대기자 승격 안 됨. 다른 트리거(누군가 철회)가 올 때까지 대기자는 계속 대기.
- 권고: 승격 조건을 "본인 변경 후 실제 free 좌석 > 0" 기준으로 바꾸거나, attending 유지라도 companions 감소분을 반영해 `promoteFrom(cap - attendingSeats - (1+companions))` 재계산.

### M3. 게스트 신청/취소 경로가 비트랜잭션 — 동시성에서 정원 초과·이중 승격 (코드가 G20 스코프로 인정)
- 파일: `src/app/api/networking/rsvp-guest/route.ts:71-96 (POST)`, `DELETE 승격 루프`
- 근거:
  - POST: `attSnap` 읽기 → 정원 판정 → `rsvpCol.add()` 가 별개 비원자 연산. 동시 게스트 2건이 같은 headcount를 읽고 둘 다 attending 저장 → 정원 초과.
  - DELETE: `allSnap` 읽고 `for` 루프에서 `await w.ref.update` 승격. 트랜잭션 없음 → (a) 동시 취소 2건이 각자 free를 계산해 과승격, (b) **회원 RSVP 트랜잭션이 같은 waitlisted 문서를 승격 중일 때 게스트 DELETE의 plain update는 충돌 감지·재시도 없이 last-write-wins** → 이중 승격/정원 초과 + 동일 회원 승격 알림 중복.
- 실패 시나리오: 만석 행사에서 회원이 "철회"(트랜잭션)하는 순간 게스트가 취소(DELETE) → 두 경로가 각각 최선순 대기자 W1을 attending으로 승격. 좌석 1개만 났는데 2명 승격.
- 권고: 게스트 POST/DELETE도 회원 rsvp 라우트처럼 `runTransaction`으로 정원 판정·승격을 원자화. 최소한 승격 로직을 단일 서버 함수로 통합.

### M4. autoDues 멱등 생성이 트랜잭션 밖 read-then-write — 동시 요청 시 중복 due 생성
- 파일: `src/app/api/networking/rsvp/route.ts:185-207 (ensureDue)`
- 근거: `ensureDue`가 `existing = await duesCol.where(...).get()` 후 `duesCol.add()` — 원자성 없음. (a) 같은 회원 attending 요청 2건 동시, 또는 (b) 본인 attending 확정과 승격 경로가 동일 회원을 동시 대상으로 삼으면 둘 다 `existing.empty=true`를 읽고 각각 add → 같은 eventId+userId due 2행.
- 실패 시나리오: 네트워크 재시도로 attending POST가 근접 2회 → due 2건 unpaid. 통계 total 2배, 회원 미납액 과다.
- 권고: due 문서 id를 `${eventId}__${userId}` deterministic로 만들어 `set(..., {merge:true})` 또는 create+실패무시. 최소 transaction 내 처리.

---

## 낮음 (Low)

### L1. 투표 개시 fan-out이 클라이언트 fire-and-forget·500명 상한
- 파일: `src/features/networking/EventEditorForm.tsx:240-244` → `src/features/notifications/notify.ts:notifyGatheringPollStarted`/`fanOut`/`getAllMemberIds(limit:500)`
- 근거: 공개 poll 생성 시 브라우저가 최대 500명에게 개별 `create()`를 `Promise.all`로 발송(`.catch(()=>{})`). 저장 직후 탭을 닫거나 이탈하면 부분 전송. 승인 회원 500명 초과 시 초과분 누락. 재시도 없음. (권한은 staff만 생성이라 rules는 통과 — 스푸핑 문제 없음.)
- 권고: 공지/세미나처럼 서버 라우트(Admin SDK)로 fan-out 이관하거나 최소 chunked·await 보장.

### L2. RSVP 없이 withdraw 요청해도 승격 패스·알림이 돌 수 있음
- 파일: `src/app/api/networking/rsvp/route.ts:85-99`
- 근거: `if (mine) tx.delete` — mine 없으면 삭제는 no-op이지만 뒤이어 `promoteFrom(cap - attendingSeats)`가 실행. 실제 free 좌석이 있으면 대기자 승격+알림이 발생. 반복 호출로 승격 재계산을 강제 트리거 가능(단, real free 좌석에 한정되므로 영향은 제한적).
- 권고: `if (!mine) return {ok:true, noop}` 조기 반환.

### L3. 회비 미납 D+3 알림이 정확 날짜 매칭 — cron이 그날 실패하면 영구 미발송
- 파일: `src/app/api/cron/networking-reminder/route.ts:161`
- 근거: `eventDate === threeDaysAgo` 정확 일치. cron이 해당일 장애로 스킵되면 다음날엔 조건 불성립 → `duesReminderSentAt` 마커도 안 찍히고 영영 발송 안 됨.
- 권고: `eventDate <= threeDaysAgo && !ev.duesReminderSentAt` 범위 조건으로 완화.

### L4. 통계 listAll 쿼리에 오류 UI 없음 — 실패 시 "데이터 없음"으로 오인
- 파일: `src/features/networking/NetworkingStats.tsx:60-72, 149-158`
- 근거: `useQuery`에 `enabled`/에러 처리 없음. permission-denied(비-staff, 콘솔 게이트라 정상 흐름엔 없음) 또는 네트워크 실패 시 `rsvps=[]` 기본값 → `hasData=false` "집계할 데이터 없음" 표시. 실패와 무데이터 구분 불가.
- 권고: `isError` 분기 추가.

### L5. 동반인 select 초깃값이 useState 이니셜라이저로 1회 고정 — myRsvp 지연 로드 시 stale
- 파일: `src/features/networking/GatheringEventCard.tsx:72`
- 근거: `useState(myRsvp?.companions ?? 0)`. myRsvp가 마운트 후 도착/변경돼도 select는 갱신 안 됨. 실제 동반 2명인데 드롭다운 0 표시 가능.
- 권고: `useEffect`로 myRsvp.companions 동기화 또는 controlled 파생값 사용.

### L6. waitlistPosition 이 쓰기 전 스냅샷 기반 — 동시 신청 시 동일 순번 표시
- 파일: `src/app/api/networking/rsvp/route.ts:118-127` · `rsvp-guest/route.ts:86-92 (wlSnap.size+1)`
- 근거: 순번을 자기 쓰기 반영 전 스냅샷/사이즈로 계산. 동시 대기 등록 2건이 같은 번호 안내 가능. 표시용 cosmetic.
- 권고: 안내 문구를 근사치로 표기하거나 승격 시 재계산.

### L7. 취소/연기 알림이 토큰 없는 비공개 행사에서 조용히 스킵
- 파일: `src/features/networking/EventEditorForm.tsx:262-266`
- 근거: `changeLink = isPrivate ? (token ? ... : null) : "/gatherings"`. 토큰 매핑이 아직 없는 비공개 행사는 `changeLink=null` → 신청자에게 취소·연기 알림 미발송(무음).
- 권고: 토큰 없으면 링크 없이라도 알림 발송하거나 최소 로깅.

### L8. 통계 listAll limit 2000 초과 시 무음 과소 집계
- 파일: `src/lib/bkend.ts:570, 590` · `NetworkingStats.tsx`
- 근거: `listAll(limit=2000)`. RSVP·dues가 2000행을 넘으면 초과분 누락돼 참석 추이·회수율·노쇼율이 조용히 낮게 나옴. 경고 없음.
- 권고: 총건수 대비 상한 도달 시 배너 표기 또는 페이지네이션.

---

## 점검·이상 없음 (Verified OK)

1. **waitlisted 소비처 전수 — 크래시/오집계 없음**: `RSVP_STATUS_LABELS`는 exhaustive `Record<RsvpStatus,...>`에 `waitlisted` 추가됨(`types/networking.ts`). `RSVP_OPTIONS`(GatheringEventCard:40)는 waitlisted 미포함이라 사용자가 직접 선택 불가. `computeSettlement`(networking-helpers:39)·roster(route:46)·NetworkingStats `attendingSeats`는 모두 `status === "attending"` 필터라 waitlisted가 정산·명단·좌석수에서 정확히 배제. switch 문 미사용 → 인덱싱 크래시 없음.
2. **회원 rsvp 승격 트랜잭션 안전**: `runTransaction` 내 all-RSVP read로 정원·승격 원자 처리. 동일 waitlisted 문서 이중 승격은 Firestore write-write 충돌 재시도로 방지. `seatsOf=1+companions`로 동반인 좌석 합산 일관.
3. **게스트 manageToken 검증**: GET은 Admin SDK로 rules 우회, 응답에 `guestContact` 미포함(PII 미노출), 반환은 guestName/status/companions만. 토큰=crypto.randomUUID(추측 불가). 타인 신청 삭제 경로 없음(토큰이 곧 자격).
4. **알림 스푸핑 차단 유지**: `notifications` create rules는 `userId==auth.uid || isStaffOrAbove`. 행사 생성은 rules·UI 모두 staff 전용(`isStaffOrAbove`)이라 클라이언트 fan-out의 타인 알림 생성이 정당하게 허용됨.
5. **체크인 토글 deleteField 캐스팅**: `deleteField() as unknown as undefined`는 클라이언트 SDK update 경로이며 rules가 staff update 허용. 런타임 안전(파이어스토어 클라이언트가 sentinel 처리).
6. **autoDues 게이팅**: `result.autoDues && result.feeAmount > 0` + 게스트는 displayName 기준 dedupe. 무료 행사는 `autoDues:undefined` 저장 안 함(EventEditorForm:220). 조건 정합.
