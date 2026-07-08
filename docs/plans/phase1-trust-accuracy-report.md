# 모임 고도화 Phase 1 — 신뢰·정확성 3건 구현 보고 (2026-07-08)

근거: `gatherings-gap-analysis-2026-07-08.md`(G6·G1·G10·G11·G12), `gatherings-enhancement-project-2026-07-08.md` Phase 1.
제약: firestore.rules 무수정 / 게스트 투표 코드(availability-guest·NetworkingPoll 게스트 흐름)와 충돌 없이 최소 diff / 커밋·배포 없음.

---

## 1. G6 — 동반인(companions) 입력 UI

기존에 `companions`는 정원 합산·정산·CSV·콘솔 표시에 이미 쓰이는데 **입력구가 없어 항상 0**이었다. 입력 UI와 서버 수신·검증을 추가했다.

### 변경 파일
- `src/app/api/networking/rsvp/route.ts`
  - body에 `companions?: number` 수신. 검증: 제공 시 0~9 정수 아니면 400. `status === "attending"`이 아니면 서버가 0으로 강제.
  - 정원 검사에 본인 인원(1 + companions) 반영 — 기존 `headcount >= capacity`를 `headcount + 1 + companions > capacity`로 교정(동반인 포함 초과 판정).
  - create/update 문서에 `companions` 저장.
- `src/app/api/networking/rsvp-guest/route.ts`
  - body에 `companions?: number` 수신. 검증: 0~9 정수(초과 시 400). 정원 검사도 `headcount + 1 + companions > capacity`로 교정. add 문서에 `companions` 저장.
- `src/features/networking/GatheringEventCard.tsx`
  - 회원 RSVP: `companions` 상태 추가(`myRsvp?.companions ?? 0` 초기화). `setMemberRsvp(status, comp?)`가 참석일 때만 companions 전송(그 외 0). 참석 활성 상태(`myRsvp?.status === "attending"`)이고 미마감일 때 0~9 select 스텝퍼 노출 — 변경 즉시 서버 반영.
  - 게스트 폼: `guestCompanions` 상태 + 0~9 select 추가. `submitGuest` body에 companions 포함, 접수 후 0으로 리셋.

### 정책
- 회원은 "참석"일 때만 동반인 UI 노출. 불참·미정으로 바꾸면 서버가 companions=0으로 저장.
- 범위 0~9(정수). 클라이언트 select로 범위 강제 + 서버 재검증(방어).

---

## 2. G1 — 취소·연기 알림

이벤트 수정 저장 시 (a) 취소 전환 (b) 일시 변경(연기)을 감지해 참석/미정 신청자에게 인앱 알림을 발송한다.

### 변경 파일
- `src/features/notifications/notify.ts`
  - `notifyGatheringCancelled(userId, eventTitle, link)` — "「{제목}」 모임이 취소되었습니다".
  - `notifyGatheringPostponed(userId, eventTitle, newDateLabel, link)` — "「{제목}」 일시가 변경되었습니다: {새 일시}".
  - 둘 다 기존 `networking_reminder` 타입 재사용(H2와 동일 접근, `NotificationType` 유니온·exhaustive Record 무수정).
- `src/features/networking/EventEditorForm.tsx`
  - import: `networkingRsvpsApi`, `formatEventDate`, 신규 notify 2종.
  - 변경 감지(수정 경로 `initial != null`만):
    - `cancelledNow = initial.status !== "cancelled" && form.status === "cancelled"`
    - `postponedNow = !isPoll && !cancelledNow && initial.startAt && form.startAt && isoToLocal(initial.startAt) !== form.startAt`
    - datetime-local 문자열 비교로 초/ms 라운드트립 오탐 방지. 취소가 연기보다 우선(취소면 연기 알림 미발송).
  - 저장 성공 후 발송: `networkingRsvpsApi.listByEvent`로 RSVP 조회 → `userId` 있고 status가 attending/undecided인 대상만(userId 중복 제거) → 알림.
  - 링크: 비공개면 이미 확보한 `token`으로 `/gatherings/p/{token}`(토큰 없으면 발송 스킵), 공개면 `/gatherings`.
  - 알림 블록은 try/catch로 감싸 저장 성공 토스트를 막지 않음.

### 정책
- 저장 액션 단위라 자연 멱등(같은 저장에서 1회만 발송).
- 발송 대상은 attending·undecided 회원(게스트는 userId 없어 제외 — 인앱 알림 대상 아님).

---

## 3. G10·G11·G12 — 투표 확정 정합

### G11 (EventEditorForm — 저장 검증/경고)
- `src/features/networking/EventEditorForm.tsx`
  - save(): `schedulingMode=poll && pollDecisionMode=auto && !pollDeadline`이면 저장 차단 + "자동 확정은 투표 마감일이 필요합니다." toast.
  - 확정 방식 select 아래 인라인 안내: auto+마감없음은 rose 경고(필수), manual+마감없음은 amber 경고("투표 마감이 없어 자동으로 종료되지 않습니다. 운영진이 직접 확정해야 합니다.").

### G10 (NetworkingPoll — 마감 후 확정 대기 안내)
- `src/features/networking/NetworkingPoll.tsx`
  - `pollClosed && !event.startAt`(마감됐지만 미확정)일 때 배너:
    - auto: "투표가 마감되었습니다 — 곧 자동 확정됩니다(매일 오전 확정 처리)."(indigo)
    - manual & canEdit: "확정 대기 중 — 아래에서 확정해 주세요."(amber 강조)
    - manual & 일반 회원: "운영진 확정 대기 중입니다."(muted)

### G12 (NetworkingPoll — 자유 텍스트 시간대 확정 확인 + 시각 수정)
- `src/features/networking/NetworkingPoll.tsx`
  - `slotHasValidTime(slot)` 헬퍼(HH:MM 여부) 추가.
  - `confirmM` mutationFn 시그니처를 `{ slot, timeOverride }`로 변경 — timeOverride(HH:MM)면 그 시각, 아니면 기존 `resolveSlotStartAt` 폴백(18:00).
  - `confirmTime` 상태(기본 "18:00") + 공용 `renderConfirmPrompt(slot)`:
    - 시간대가 HH:MM이 아니면 경고("「{시간대}」는 시각이 아니어서 아래 시각으로 확정됩니다. 계속할까요?") + `type="time"` 입력 제공.
    - 확정 버튼이 timeOverride(유효 시간대면 undefined) 전달.
  - auto 모드도 즉시확정 → 확인 단계(setConfirming)로 통일해 renderConfirmPrompt 재사용. manual 모드는 기존 두 단계 유지하되 확인 프롬프트 공유.

---

## 검증
- `npx tsc --noEmit` (NODE_OPTIONS=--max-old-space-size=4096) → 0 errors (exit 0).
- `npm run build` → (본 보고 작성 시점 백그라운드 실행 중, 로그 확인).
- firestore.rules 무수정. 게스트 투표 라우트(availability-guest·potential-members)·NetworkingPoll 게스트 흐름 무수정.
- 커밋·배포 없음(git 미커밋 상태 유지).

## 변경 파일 요약
1. `src/app/api/networking/rsvp/route.ts` — companions 수신·검증·저장·정원 반영
2. `src/app/api/networking/rsvp-guest/route.ts` — companions 수신·검증·저장·정원 반영
3. `src/features/networking/GatheringEventCard.tsx` — 회원/게스트 동반인 입력 UI
4. `src/features/notifications/notify.ts` — 취소/연기 알림 함수 2종
5. `src/features/networking/EventEditorForm.tsx` — 취소/연기 감지·발송 + G11 검증/경고
6. `src/features/networking/NetworkingPoll.tsx` — G10 배너 + G12 확정 확인/시각 수정
