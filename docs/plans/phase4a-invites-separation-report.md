# Phase 4-A — 비공개 모임 초대 명단 분리 리포트

작업일: 2026-07-09
근거: 어제 shareToken 분리(`docs/plans/private-token-security-fix-report.md`)와 동일 패턴 재적용.
검증: `npx tsc --noEmit` + `npm run build` 통과(아래). 커밋·배포 미실행.

## 문제 요약
`networking_events` 는 `allow read: if true`(공개 read)인데 비공개(private) 모임의 `invitedUserIds`
(초대 알림을 보낸 회원 id 목록)가 이벤트 문서에 저장돼 있어, 직접 SDK 쿼리로 **누구에게나** 초대 명단
(어떤 회원이 어떤 비공개 모임에 초대됐는지)이 노출됐다. 프라이버시 누출.

## 설계 (구현대로)
초대 명단을 신규 컬렉션 `networking_event_invites/{eventId}` 로 분리한다. read/write 모두 **staff 전용**
(초대 발송·중복 방지는 staff 폼에서만 쓰므로 충분). 이벤트 문서에는 `invitedUserIds` 를 더 이상 저장하지
않으며, 레거시 값은 수정 저장 시 invites 문서로 병합 후 `deleteField()` 로 제거(shareToken 과 동일 lazy 이관).

## 변경 파일

1. **`firestore.rules`** — `networking_event_invites/{eventId}` 컬렉션 규칙 **추가만**(networking_event_tokens
   블록 직후). `allow read, write: if isAuthenticated() && isStaffOrAbove();`
   기존 규칙(networking_events read `if true` 포함)은 **미변경**.

2. **`src/types/networking.ts`**
   - `NetworkingEvent.invitedUserIds` 에 `@deprecated` 주석(레거시 호환용, 신규 저장 금지).
   - `NetworkingEventInvites` 타입 신규 추가(`{ id(=eventId), invitedUserIds, updatedBy, createdAt, updatedAt }`).

3. **`src/lib/bkend.ts`**
   - `eventInvitesApi` 신규: `get(eventId)`(dataApi.get, 실패 시 null), `upsert(eventId, data)`(dataApi.upsert
     — 문서 id = eventId, idempotent).
   - 타입 import 에 `NetworkingEventInvites` 추가.

4. **`src/features/networking/EventEditorForm.tsx`**
   - 초대 명단을 `useEffect` 로 `eventInvitesApi.get(eventId)` 에서 로드(레거시 `initial.invitedUserIds` 폴백
     병합). 기존 초대자 칩 표시·autocomplete `excludeIds` 는 이 로드값 기준으로 동작.
   - 저장 시 초대 누적 기록을 이벤트 문서 대신 `eventInvitesApi.upsert(eventId, { invitedUserIds, updatedBy })`
     로 기록(신규 선택 또는 레거시 이관 필요 시).
   - 이벤트 문서 payload 에 `invitedUserIds: initial?.invitedUserIds ? deleteField() : undefined` 추가
     — 레거시 필드가 남아 있으면 수정 저장 시 이벤트 문서에서 제거(마이그레이션).
   - 인앱 초대 알림 발송(`notifyGatheringInvite`)은 신규 선택 대상만 유지 — 재발송 방지 로직 불변.

## 마이그레이션 동작 (lazy 이관)
- **신규 private 이벤트**: 초대 시 `networking_event_invites` 에만 기록. 이벤트 문서엔 `invitedUserIds` 없음.
- **레거시 private 이벤트**(문서에 `invitedUserIds` 잔존): 다음 수정 저장 시 (a) 로드 단계에서 레거시 값을
  invites 로드값과 병합해 표시 → (b) 저장 시 병합 명단을 invites 문서에 upsert → (c) 이벤트 문서에서
  `deleteField()` 로 `invitedUserIds` 제거. 재발송 방지(누적 명단)는 이관 전후로 보존된다.
- 별도 배치 스크립트 없음(수정 시점 lazy 이관). 미수정 레거시 문서의 `invitedUserIds` 는 이관 전까지
  이벤트 문서에 남아 조회 가능하므로, 운영진이 기존 비공개 모임을 한 번씩 저장하면 이관 완료.

## rules 배포 필요 (중요)
- **`firestore.rules` 변경분은 아직 배포되지 않았다.** 신규 컬렉션 규칙이 배포되기 전에는
  `networking_event_invites` 에 대한 read/write 가 기본 거부되어, staff 폼의 초대 명단 로드·저장이
  권한 오류로 실패한다. 코드 배포와 함께 **Firestore 규칙을 반드시 함께 배포**해야 한다.
  (예: `firebase deploy --only firestore:rules` — 프로젝트 배포 절차에 맞춰 실행)

## 잔여 리스크 (보고만)
1. **networking_events 메타데이터 공개 read 잔존**: read 규칙(`if true`)은 미변경(설계 제약). 비공개 모임의
   제목·장소 등 메타데이터는 여전히 SDK 쿼리로 열람 가능. 이번 수정은 **초대 명단(누가 초대됐는지)** 노출만 차단.
2. **레거시 invitedUserIds 미이관 문서**: 위 lazy 이관대로 수정 저장 전까지 이벤트 문서에 남아 조회 가능.
   완전 차단은 (a) 운영진의 기존 비공개 모임 재저장 또는 (b) 별도 백필 스크립트 필요.
