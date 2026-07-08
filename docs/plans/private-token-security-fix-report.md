# 비공개 모임 shareToken 분리 — 보안 핫픽스 리포트 (High-1)

작업일: 2026-07-08
근거: `docs/plans/codex-review-20260708-deploy.md` High-1 (+ Medium-1 동반 수정)
검증: `npx tsc --noEmit` 통과 (exit 0). 커밋·배포 미실행.

## 문제 요약
`networking_events` 는 `allow read: if true`(공개 read)인데 비공개(private) 모임의 `shareToken` 이
이벤트 문서에 저장돼 있어, 직접 SDK 쿼리로 모든 비공개 모임의 토큰을 수집(harvest)할 수 있었다.
"링크를 가진 사람만 접근" 이 무력화됨.

## 설계 (구현대로)
토큰↔eventId 매핑을 신규 컬렉션 `networking_event_tokens/{token}` 으로 분리.
문서 id 가 곧 토큰(추측 불가 uuid)이라, 토큰을 아는 사람만 `get`(문서 id 지정)으로 접근 가능하고
`list`(열거)는 staff 로 제한해 harvest 를 차단한다. 이벤트 문서에는 토큰을 더 이상 저장하지 않는다.

## 변경 파일

1. **`firestore.rules`** — `networking_event_tokens/{token}` 컬렉션 규칙 추가 (networking_events 블록 직후).
   - `allow get: if true;` — 토큰을 아는 사람만 문서 id 로 단건 접근 (list 불가 → 열거 차단)
   - `allow list: if isAuthenticated() && isStaffOrAbove();` — staff 가 eventId 로 역조회
   - `allow create, delete: if isAuthenticated() && isStaffOrAbove();` — update 는 불허(토큰 변조 방지)
   - **networking_events 의 read 규칙(`if true`)은 미변경** (아래 잔여 리스크 참조).

2. **`src/types/networking.ts`**
   - `NetworkingEvent.shareToken` 에 `@deprecated` 주석 (레거시 호환용, 신규 저장 금지).
   - `NetworkingEventToken` 타입 신규 추가 (`{ id(=token), eventId, createdBy, createdAt, updatedAt }`).

3. **`src/lib/bkend.ts`**
   - `eventTokensApi` 신규: `get(token)`(dataApi.get, 실패 시 null), `listByEvent(eventId)`(filter[eventId]),
     `create(token, data)`(dataApi.upsert — 문서 id = 토큰, idempotent).
   - `networkingEventsApi.getByToken` 은 유지하되 `@deprecated` 주석(레거시 폴백 전용).
   - 타입 import 에 `NetworkingEventToken` 추가.

4. **`src/features/networking/EventEditorForm.tsx`**
   - 이벤트 문서에 `shareToken` 저장 **중단**. 토큰은 `networking_event_tokens` 에만 기록.
   - 토큰 값 결정: 레거시 `initial.shareToken`(이관 대상) → 기존 매핑(`eventTokensApi.listByEvent`) → 신규 uuid.
   - 레거시 `shareToken` 필드가 있으면 `deleteField()` 로 이벤트 문서에서 제거(마이그레이션).
     (deleteField 사용례: `src/app/console/courses/page.tsx` 참고)
   - 저장 후 공유 링크 안내는 매핑 토큰 기준으로 동작 유지.
   - **Medium-1 동반 수정**: poll 저장 payload 에서 `startAt` 을 `""` 로 강제
     (고정→poll 전환 시 잔존 startAt 이 투표 UI 를 숨기던 버그 차단).

5. **`src/features/networking/GatheringEventCard.tsx`**
   - staff "링크 복사" 가 `ev.shareToken` 대신 `eventTokensApi.listByEvent(ev.id)`(react-query,
     `enabled: canManage && isPrivate`) 로 토큰 조회. 레거시 `ev.shareToken` 폴백 유지.

6. **`src/app/gatherings/p/[token]/page.tsx`**
   - 조회 순서: (a) `eventTokensApi.get(token)` → eventId → `networkingEventsApi.get(eventId)`,
     (b) 실패 시 레거시 `getByToken(token)` 폴백. 나머지 UI 불변.

7. **`src/app/api/cron/networking-reminder/route.ts`** (트랙 정합 — 2026-07-08 추가 지시)
   - 해당 파일의 수정 금지가 H1 에이전트 작업 완료로 해제되어 반영.
   - 비공개 이벤트 알림 링크(`gatheringsLink`) 계산을 (a) 레거시 `ev.shareToken` 있으면 그대로 사용 →
     (b) 없으면 admin SDK 로 `networking_event_tokens` 를 `eventId == doc.id` 로 조회해 매칭 문서 id(=토큰)로
     `/gatherings/p/{token}` 조립 → (c) 둘 다 없으면 기존대로 발송 스킵, 3단 폴백으로 교체.
   - cron 은 서버(admin SDK) 라 firestore.rules 제약을 받지 않으므로 `list`(staff 전용) 규칙과 무관하게
     `where("eventId", "==", ...)` 조회 가능. 신규 private 모임(문서에 shareToken 없음)도 cron 알림이
     스킵되지 않고 매핑 컬렉션에서 링크를 찾아 정상 발송됨.

## 마이그레이션 동작
- 신규 private 이벤트: 생성 시 uuid 토큰 발급 → 매핑 문서에만 기록. 이벤트 문서엔 shareToken 없음.
- 레거시 private 이벤트(문서에 shareToken 잔존): 다음 수정 저장 시 같은 토큰 값으로 매핑 문서 생성 +
  이벤트 문서에서 `deleteField()` 로 제거 → 링크 불변 이관. 수정 전까지는 레거시 폴백 경로가 동작.
- 별도 배치 마이그레이션 스크립트는 없음(수정 시점 lazy 이관). 미수정 레거시 문서의 shareToken 은
  이관 전까지 이벤트 문서에 남아 열거 가능하므로, 운영진이 기존 private 이벤트를 한 번씩 저장하면 이관 완료.

## 잔여 리스크 (보고만)
1. **networking_events 메타데이터 공개 read 잔존**: read 규칙(`if true`)은 미변경(설계 제약 —
   공개 목록이 rules 쿼리 증명과 결합). 따라서 비공개 이벤트의 제목·장소 등 **메타데이터**는 여전히
   직접 SDK 쿼리로 열람 가능. 다만 이번 수정으로 **토큰 자체는 더 이상 노출되지 않아** 접근 게이트는 유지됨.
2. **레거시 shareToken 미이관 문서**: 위 마이그레이션대로 수정 저장 전까지 shareToken 이 이벤트 문서에
   남아 열거 가능. 완전 차단은 (a) 운영진의 기존 private 이벤트 재저장 또는 (b) 별도 백필 스크립트 필요.
3. ~~cron 알림 링크~~ — **해결됨(트랙 정합 반영)**. `src/app/api/cron/networking-reminder/route.ts` 의
   수정 금지가 H1 에이전트 작업 완료로 해제되어, admin SDK 로 `networking_event_tokens` 를 역조회하는
   폴백을 추가했다(변경 파일 7번 참조). 신규 private 모임도 cron 알림이 스킵되지 않는다.
