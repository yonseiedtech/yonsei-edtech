# H1 — 일정 투표 마감 리마인더 + 확정 슬롯 자동화 (구현 보고)

관련 기획: `docs/plans/service-enhancement-plan-v4-2026-07-08.md` H1
관련 교차검증: `docs/plans/codex-review-20260708-deploy.md` (High×2, Medium×1 — 본 작업 범위로 통합 수정)

## 변경 파일

1. `src/app/api/cron/networking-reminder/route.ts` — 기존 cron 확장 (신규 cron 미생성, `vercel.json` 변경 없음)
2. `src/features/networking/networking-utils.ts` — `resolveSlotStartAt` 신규 + `listDates` 버그 수정
3. `src/features/networking/NetworkingPoll.tsx` — `confirmM`을 `resolveSlotStartAt` 공용 유틸로 교체 (codex High #1 버그 수정 목적 한정 — 그 외 UI/로직 무수정)

## 1. 일정 투표 마감 D-1 리마인더

- **대상**: `schedulingMode === "poll"` 이고 `pollDeadline`이 설정된 이벤트 중, 마감까지 남은 시간이 `0 < diff <= 24h`인 경우.
- **수신자**: `users` 컬렉션의 `approved === true` 회원 전체에서, 해당 이벤트에 `networking_availability` 문서(투표 기록)가 있는 회원을 제외한 나머지.
- **발송 시점**: cron 이 매일 09:00 KST(UTC 00:00) 실행되며, 하루 간격(24h) ≤ 리마인더 윈도우(24h)이므로 마감 전 정확히 1회 이 조건을 통과하도록 설계.
- **멱등 규칙**: 이벤트 문서 필드 `pollReminderSentAt`(ISO 타임스탬프)을 발송 성공 시 1회만 기록하고, 이후 실행은 이 필드 존재 여부로 즉시 skip. 추가로 기존 `notifyOnce` 헬퍼(알림 컬렉션 재조회 기반 사용자 단위 중복 가드)도 이중 방어로 유지.
- 알림 `type`은 기존 `networking_reminder`(코멘트에 "poll" 명시 갱신)를 재사용 — `NotificationType` 유니온·`NotificationBell`/`useNotifications`의 exhaustive `Record` 수정 없이 최소 diff로 처리.

## 2. 마감 후 자동 확정 (auto 모드)

- **조건**: `pollDeadline`이 지났고(`deadlineMs <= nowMs`) `pollDecisionMode === "auto"`인 이벤트. `manual` 모드는 자동 확정하지 않음(운영진 수동 확정 UI만 사용, 기존 로직 무변경).
- **로직**: `networking_availability` 응답 전체 조회 → `buildCandidateSlots` + `tallyAvailability` + `bestSlots`(기존 유틸 재사용, `NetworkingPoll.tsx` 운영진 수동 확정과 완전히 동일한 산식) → 1위 슬롯으로 `startAt`(ISO) 설정 + `schedulingMode: "fixed"` 전환 + `updatedAt` 갱신. 응답이 하나도 없으면(`best.length === 0`) 확정하지 않고 다음 실행으로 미룸.
- **멱등 규칙**: 별도 마커 불필요 — 확정 후 `schedulingMode`가 `"poll"` → `"fixed"`로 바뀌므로, 이 블록의 최상위 가드(`ev.schedulingMode === "poll"`) 자체가 다음 실행부터 성립하지 않는다(이미 fixed면 자동 skip).
- **확정 알림 수신자**: RSVP `attending` 회원 ∪ `networking_availability` 투표 참여자(합집합, 중복 제거). 메시지: `"{제목}" 일정이 확정되었습니다.`

## 3. codex 독립 리뷰 반영 (2026-07-08, 3건)

| 심각도 | 내용 | 조치 |
|---|---|---|
| High | `NetworkingPoll.tsx` 운영진 확정(`confirmM`)과 신규 cron 자동 확정 공통 — `pollTimeSlots`가 `EventEditorForm`에서 "저녁", "오후" 같은 자유 텍스트를 허용하는데 `new Date(`${date}T${time}:00`)`가 이런 값에 `RangeError`를 던짐 | `networking-utils.ts`에 `resolveSlotStartAt(slot)` 신규 — `/^\d{1,2}:\d{2}$/` 형식일 때만 그 시각 사용, 아니면 18:00 폴백. 수동 확정(`NetworkingPoll.tsx:228~238`)·자동 확정(cron) 양쪽에서 공용 호출로 교체 |
| High | `listDates`(`networking-utils.ts`) — `new Date(...).toISOString().slice(0,10)`이 로컬(KST) 자정을 UTC로 변환해 날짜가 하루 앞당겨짐 | `ScheduleSelector.tsx`의 `listDates`와 동일하게 `getFullYear/getMonth/getDate` + `pad2`로 로컬 조립하도록 수정 |
| Medium | `networking-reminder/route.ts`가 `visibility`를 읽지 않아, 비공개 모임 알림도 공개 목록 링크(`/gatherings`)로 발송 — 수신자가 목록에서 이벤트를 찾을 수 없음 | 이벤트마다 `gatheringsLink` 계산: `visibility !== "private"` → `/gatherings`, `private`이고 `shareToken` 있음 → `/gatherings/p/{shareToken}`, `private`인데 `shareToken` 없음 → `null`(발송 스킵, 단 poll 자동 확정 자체는 계속 진행). 기존 3개 알림(D-1/당일·RSVP 마감·D+1 후기 요청)과 신규 2개 알림(투표 마감 리마인더·확정) 전부 이 규칙 적용. `#past-gatherings` 앵커는 공개 목록 페이지 전용이라 비공개 링크에는 붙이지 않음 |

## 검증

- `npx tsc --noEmit` — 통과(0 errors)
- `npx eslint src/app/api/cron/networking-reminder/route.ts` — 통과(0 findings)
- 커밋·배포는 지시에 따라 수행하지 않음 (git 미커밋 상태)

## 제약 준수

- `src/components/mypage/**`, `src/features/mypage/**` 무수정
- `NetworkingPoll.tsx`는 codex High #1 버그 수정(공용 유틸 교체) 목적으로만 최소 수정 — UI/그 외 로직 무변경
- `pollDecisionMode !== "auto"` 이벤트는 자동 확정하지 않음(리마인더만)
