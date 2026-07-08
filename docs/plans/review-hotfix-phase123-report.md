# 적대적 리뷰 핫픽스 Phase 1~3 — 수정 내역 보고서

- 근거: `docs/plans/fallback-review-phase123.md` (H1 · M1 · M2 · M3 · M4)
- 작업 일자: 2026-07-09
- 범위: firestore.rules 무수정. 커밋·배포 없음. tsc(`--noEmit`) + `npm run build` 통과 확인.

---

## 수정 파일

| 파일 | 대응 |
|------|------|
| `src/app/api/cron/networking-reminder/route.ts` | H1 |
| `src/app/api/networking/rsvp/route.ts` | M1(회원), M2, M4(회원) |
| `src/app/api/networking/rsvp-guest/route.ts` | M1(게스트), M3(POST·DELETE), M4(게스트) |

---

## H1 — 실참석 잔디 적립을 D+0 → D+1 로 이동

**문제**: 잔디 적립 블록이 `if (daysLeft === 0 ...)`(행사 당일 09:00 cron) 안에 있었다. 저녁 행사는
그 시점에 현장 체크인이 아직 없어 `anyCheckedIn=false` → 하위호환(attending 전원 적립) 분기로 귀결됐다.
deterministic doc id + `merge` 라 저녁에 노쇼가 확정돼도 회수가 불가능해 엄격 모드가 사실상 dead branch 였다.

**수정**: 적립 로직을 당일 블록에서 제거하고 **D+1(`eventDate === yesterday`)** 블록으로 이동.
그 시점엔 현장 체크인 데이터가 모두 기록돼 있으므로:
- `attendedAt` 1건 이상 → 실제 체크인한 회원에게만 적립(엄격 모드 실동작)
- 하나도 없음(체크인 기능 미사용 행사) → 하위호환으로 attending 전원 적립

**멱등성**: doc id 는 `${userId}__networking-attend__${eventId}` 로 **행사 기준**이라 적립 시점을 옮겨도
중복 적립되지 않는다. `ymd` 도 `eventDate`(행사일) 로 유지해 잔디 표기일이 바뀌지 않는다.
적립 블록은 `gatheringsLink` 유무와 무관(알림과 분리)하게 실행되므로 비공개+토큰 미설정 행사도 정상 적립.

**사용자 영향**: 참석 잔디 가산점(+5)이 **행사 당일이 아니라 다음날** 반영된다. 대신 노쇼는 더 이상
적립되지 않고, 저녁 행사도 실제 체크인 기준으로 정확히 적립된다.

---

## M1 — 참석 이탈 시 unpaid 회비(autoDues) 정리

**문제**: `autoDues` 는 attending 확정 시 due 를 생성만 했다. 철회(`withdraw`)·불참 전환·게스트 취소 시
due 를 손대지 않아, 참석하지 않는 회원에게 마이페이지 미납 배지 + D+3 독촉이 발송되고 통계(회수율·total)가
오염됐다.

**수정**:
- 회원(`rsvp/route.ts`): 트랜잭션 후 `effectiveStatus !== "attending"`(철회 `withdrawn`·not_attending·undecided·waitlisted 강등 포함)이면
  `eventId + userId(본인) + status=="unpaid"` due 를 batch 삭제.
- 게스트(`rsvp-guest/route.ts` DELETE): 취소 후 `eventId + displayName(guestName)` 조회 → `status=="unpaid" && isGuest` 만 삭제.

**보존 규칙**: `paid`·`exempt` 는 삭제하지 않는다. **autoDues 여부와 무관**하게 unpaid 만 정리하므로
콘솔에서 수동 생성한 미납분도 이탈 시 함께 정리된다. 게스트는 displayName 기준(게스트는 userId 없음).

---

## M2 — 동반인 축소 시 대기자 승격 트리거

**문제**: 승격이 `effectiveStatus !== "attending"` 일 때만 실행돼, attending 을 유지한 채 동반인만 줄인
경우(예: 본인+3=4석 → 본인만 1석)에 생긴 빈자리가 방치됐다.

**수정**: 승격 조건을 **"본인 변경 후 실제 free 좌석 > 0"** 기준으로 변경.
```
const mySeats = effectiveStatus === "attending" ? 1 + companions : 0;
const freeSeats = cap - attendingSeats - mySeats;   // attendingSeats 는 본인 제외 합계
const promoted = cap !== null && freeSeats > 0 ? promoteFrom(freeSeats) : [];
```
기존 `promoteFrom(...)` 함수를 그대로 재사용. attending 유지·동반인 감소로 좌석이 나면 대기자가
즉시 승격된다. waitlisted/not_attending/undecided 로 전환한 경우도 `mySeats=0` 으로 동일 경로에서 처리.

---

## M3 — 게스트 POST/DELETE 트랜잭션화 (G20 해소)

**문제**: 게스트 신청/취소가 비원자 연산이었다.
- POST: `attSnap` read → 정원 판정 → `add()` 가 별개 → 동시 게스트 2건이 같은 headcount 를 읽고 정원 초과.
- DELETE: `allSnap` read 후 for 루프의 plain `update` 승격 → 회원 RSVP 트랜잭션이 같은 waitlisted 문서를
  승격 중이면 충돌 감지 없이 last-write-wins → 이중 승격/정원 초과.

**수정**: 회원 `rsvp` 라우트와 동일한 `runTransaction` 패턴으로 감쌌다.
- **POST**: 트랜잭션 내에서 이벤트 read → 마감 검사 → 전체 RSVP read(중복·정원·순번 판정) → `tx.create`.
  모든 read 를 write 앞에 배치(Firestore 규칙). 중복 검사는 트랜잭션 read 로 확보한 `allSnap` 을 in-memory 필터.
- **DELETE**: 트랜잭션 내에서 토큰 매칭 read → 이벤트 read → 전체 RSVP read → 대기자 `tx.update` 승격 → `tx.delete`(본인).
  승격 계산 시 본인 문서(`d.id !== mineDoc.id`)를 제외해 이중 카운트 방지.
  승격 알림·게스트 due 정리는 트랜잭션 밖 best-effort(알림/정리 실패가 취소를 롤백하지 않도록).

이제 회원 트랜잭션과 게스트 트랜잭션이 동일 waitlisted 문서를 동시 승격하면 Firestore write-write 충돌
재시도로 이중 승격이 방지된다.

---

## M4 — autoDues 멱등 생성: deterministic 문서 id

**문제**: `ensureDue` 가 `where(...).get()` (read) → `add()` (write) 로 원자성이 없어, 동시 요청
(네트워크 재시도, 본인 확정 + 승격 경로 중첩)이 각각 `existing.empty=true` 를 읽고 둘 다 `add` → 같은
회원 due 2행. 통계 total 2배·미납액 과다.

**수정**:
- 회원: due 문서 id 를 **`${eventId}__${userId}`** 로 만들어 `doc(id).create(...)`. 동시 create 중 하나만
  성공하고 나머지는 `ALREADY_EXISTS` 로 실패(상위 `.catch(() => {})` 로 무시) → 중복 불가.
- 게스트: due 문서 id 를 **`${eventId}__${guestName}`**(`/`→`_` 치환) 로 만들어 `doc(id).create(...)`.
  `try/catch` 로 `ALREADY_EXISTS` 무시.

**콘솔 회비 로직과의 공존 확인**(`src/app/console/networking/page.tsx`):
- 콘솔 `dueByKey` 는 **필드 기준**(`userId ?? displayName`)으로 dedupe 하고 `generateDues` 도 이 맵으로
  중복을 건너뛴다. 문서 id 규칙과 무관하게 필드로 판단하므로, 라우트가 deterministic id 로 만든 due 도
  콘솔이 정상 인식·dedupe 한다(랜덤 id due 와 공존해도 이중 생성 없음).
- 회원 `ensureDue` 는 deterministic create 전에 **레거시(랜덤 id) due 존재 여부를 필드 쿼리로 먼저 확인**해
  스킵하므로, 과거 랜덤 id due 가 있어도 새 deterministic due 를 중복 생성하지 않는다.
- 게스트는 콘솔이 애초에 displayName 으로 dedupe 하므로, id 를 `${eventId}__${guestName}` 로 잡아도
  동일 이름 게스트를 한 건으로 취급하는 기존 동작이 그대로 유지된다(회귀 없음).

---

## 검증

- `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` → 통과(에러 0).
- `npm run build` → (실행 결과는 보고 하단 참조).
- firestore.rules 무수정. M1/M2 의 다중 equality 필터 쿼리(eventId+userId+status)는 Firestore zig-zag
  merge join 으로 단일필드 인덱스만으로 처리되어 신규 복합 인덱스 불필요.

## 미배포 추적

- 변경 4개 파일 모두 미커밋·미배포 상태(사용자 게이트 대기). git status 로 추적.
