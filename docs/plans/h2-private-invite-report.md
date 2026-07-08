# H2 — 비공개 모임 초대 알림 (구현 보고)

관련 기획: `docs/plans/service-enhancement-plan-v4-2026-07-08.md` H2

## 변경 파일

1. `src/types/networking.ts` — `NetworkingEvent.invitedUserIds?: string[]` 필드 신규(초대 발송 대상 기록, 중복 방지용).
2. `src/components/ui/MemberAutocomplete.tsx` — `SelectedMember` interface `export` 추가(재사용을 위한 최소 변경, 로직 무수정).
3. `src/features/notifications/notify.ts` — `notifyGatheringInvite(userId, eventTitle, token)` 신규 함수 추가.
4. `src/features/networking/EventEditorForm.tsx` — 공개 범위가 "비공개"일 때 "초대할 회원" 선택 UI(기존 초대자 표시 + 신규 선택 칩 + `MemberAutocomplete`) 추가, 저장 성공 후 신규 선택 회원에게 알림 발송 + `invitedUserIds` 갱신.

## 1. 초대 UI (`EventEditorForm.tsx`)

- 공개 범위 토글에서 "비공개"를 선택하면 기존 안내 문구 아래에 "초대할 회원" 섹션이 나타남.
- 기존 초대자(`initial.invitedUserIds`)는 `useAllMembers()`로 이름을 조회해 회색 칩("이름 · 초대됨")으로 읽기 전용 표시.
- 신규 선택은 `MemberAutocomplete`(복수 선택 — 선택 시 즉시 칩으로 쌓이고 입력창은 다시 비워짐, `excludeIds`로 기존 초대자·현재 선택자 모두 제외)로 처리, 각 칩에 X 버튼으로 선택 해제 가능.
- 신규 컴포넌트를 만들지 않고 기존 `MemberAutocomplete`(단건 선택용으로 설계됨)를 "선택 즉시 append + 재오픈" 패턴으로 감싸 복수 선택을 구현(최소 diff, prop 변경 없음).

## 2. 발송 규칙

- 발송 시점: **저장 성공 후**, 이벤트 문서 저장(create/update) + 공유 토큰 매핑(`eventTokensApi.create`) 완료 이후.
- 발송 대상: 이번 편집 세션에서 **새로** 선택한 회원만(`inviteSelections`). 기존 초대자는 UI 선택지에서 이미 제외되어 있어 재선택 자체가 불가.
- 알림 생성: 기존 `notify.ts`의 클라이언트 사이드 `notificationsApi.create` 패턴(`create()` 헬퍼) 그대로 재사용 — 신규 API 불필요.
  - 제목: `모임 초대`
  - 메시지: `"{제목}" 모임에 초대되었습니다`
  - 링크: `/gatherings/p/{token}` — `token`은 `EventEditorForm`이 private 저장 시 이미 확보한 `eventTokensApi` 토큰(신규 발급/기존 매핑 재사용 로직 그대로, 별도 조회 없음)을 그대로 전달.
- `NotificationType`: 새 유니온 값을 추가하지 않고 기존 `"networking_reminder"`(레이블 "모임·행사 알림", 아이콘 🎉)를 재사용 — H1 보고서와 동일한 최소 diff 원칙. `NotificationBell.tsx`/`useNotifications.ts`/`mypage/notifications/page.tsx`의 exhaustive `Record<NotificationType, ...>` 3곳 무수정.

## 3. 중복 발송 방지

- 이벤트 문서에 `invitedUserIds: string[]`(merge)로 "이미 초대 알림을 보낸 회원"을 누적 기록.
- 저장 시: `Array.from(new Set([...기존 invitedUserIds, ...신규 선택 id]))`로 갱신 — `dataApi.update`는 Firestore `updateDoc`(필드 단위 갱신)이라 다른 필드에 영향 없음.
- UI 단: `MemberAutocomplete`의 `excludeIds`에 `existingInvitedIds`(기존 초대자) + 현재 세션에서 선택한 id를 모두 넣어, 이미 초대된 회원은 애초에 검색 결과에 나타나지 않음 → 재선택·재발송 경로 자체가 차단됨.
- 수정 화면 재진입 시 `initial.invitedUserIds` 기준으로 "이미 초대됨" 칩이 그대로 노출되어 운영진이 누구에게 이미 보냈는지 확인 가능.

## 4. firestore.rules — 수정 없음, 이유

- `notifications` 컬렉션 `create` 규칙: `request.resource.data.userId == request.auth.uid || isStaffOrAbove()` — `EventEditorForm`은 console(운영진 전용) 컨텍스트에서만 쓰이므로 staff 세션이 타 회원에게 알림을 생성하는 것이 규칙상 이미 허용됨. 규칙 변경 불필요.
- `networking_events` `update` 규칙: `isStaffOrAbove()`만 허용 — `invitedUserIds` 갱신도 기존 저장 흐름과 동일한 staff 컨텍스트라 그대로 통과.
- 참고(범위 밖, 정보 제공용): `networking_events`는 `allow read: if true`라 `invitedUserIds`(회원 id 목록)도 이벤트 title/description과 마찬가지로 전체 공개 read 대상이다. 이는 H1(비공개 모임 링크 토큰 분리) 이전부터 있던 기존 설계(비공개는 UI 필터 + 토큰으로만 보호, 문서 자체는 비보호)와 동일한 트레이드오프이며 본 작업 범위에서 새로 만든 노출은 아니다. 더 엄격히 하려면 `invitedUserIds`도 별도 컬렉션 분리가 필요하지만 회원 id 목록의 민감도가 title/description보다 낮다고 판단해 이번 스코프(S~M)에서는 보류.

## 검증

- `npx tsc --noEmit` — 통과(0 errors, exit code 0)
- 커밋·배포는 지시에 따라 수행하지 않음(git 미커밋 상태)

## 제약 준수

- `src/features/mypage/**`, `src/features/steppingstone/**`, `src/features/dashboard/NextActionBanner.tsx`, `src/lib/graduation-progress.ts` 무수정
- `firestore.rules` 무수정
- `NotificationType` 유니온 무수정(기존 `networking_reminder` 재사용)
