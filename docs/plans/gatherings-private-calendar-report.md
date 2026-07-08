# 비공개 모임 + 일정 조율 캘린더 개편 — 구현 리포트

작업일: 2026-07-08 · 대상: `/mnt/c/work/yonsei-edtech`

## 기능 A — 비공개 모임 (링크를 가진 사람만 접근, unlisted 모델)

노출 제어는 클라이언트 목록 필터링 + 토큰 URL 방식. `firestore.rules`의 `networking_events` read 는 공개(`if true`) 유지 — 규칙 미변경.

## 기능 B — 일정 조율 투표 캘린더 개편

when2meet 그리드 → 월 단위 캘린더 히트맵으로 UI만 개편. 데이터 모델(`NetworkingAvailability.availableSlots`)과 유틸(`buildCandidateSlots`/`tallyAvailability`/`bestSlots`/`formatSlotLabel`)은 그대로 재사용.

## 변경 파일 목록

### 신규
- `src/features/networking/GatheringEventCard.tsx` — /gatherings 목록의 인라인 `EventCard`를 공용 컴포넌트로 추출. 목록·토큰 페이지 양쪽에서 재사용. 비공개 배지 + 링크 복사(canManage) 추가.
- `src/app/gatherings/p/[token]/page.tsx` — 비공개 모임 공유 링크 페이지. `getByToken`으로 단건 조회, `GatheringEventCard` 렌더, 토큰 불일치 시 EmptyState("존재하지 않거나 만료된 링크").

### 수정
- `src/types/networking.ts` — `NetworkingEvent`에 `visibility?: "public" | "private"`, `shareToken?: string` 추가 (미지정=public, 기존 데이터 호환).
- `src/lib/bkend.ts` — `networkingEventsApi.getByToken(token)` 추가 (`filter[shareToken]`, limit 1). graduation 섹션 미변경.
- `src/features/networking/EventEditorForm.tsx` — "공개 범위"(공개/비공개·링크 공유) 토글 추가. private 생성 시 `crypto.randomUUID()` 토큰 자동 생성, 수정 시 기존 토큰 보존. 저장 후 private이면 폼 내 공유 링크 복사 패널(복사 버튼 + "완료") 노출.
- `src/app/gatherings/page.tsx` — 인라인 `EventCard` 제거·`GatheringEventCard` 사용. 비공개 모임은 목록에서 제외하되 staff 이상(`canCreate`)에게는 노출(`canManage` prop). 미사용 import 정리.
- `src/app/calendar/page.tsx` — networking 이벤트 매핑에서 `visibility === "private"` 제외.
- `src/app/gallery/page.tsx` — 앨범 연결 후보 목록에서 private 제외.
- `src/features/networking/NetworkingPoll.tsx` — when2meet 그리드 → 캘린더 뷰 전면 개편(아래 상세).

## 핵심 결정

1. **unlisted 토큰 모델**: rules 변경 없이 `shareToken` 필드 + 클라이언트 필터. private→public 전환 시 기존 토큰은 Firestore에 잔존하나 visibility=public이면 목록에도 정상 노출되어 무해(토큰 폐기 요구 없음).
2. **카드 공용화**: RSVP(회원 서버 API·게스트 API), 투표, 프로그램, 회비, 참석자 명단, 후기 로직을 `GatheringEventCard`로 그대로 이관. 게스트 RSVP도 동일 API를 타므로 토큰 페이지에서 동일 동작.
3. **staff 가시성**: `/gatherings` 목록에서 staff 이상은 비공개 모임을 "비공개" 배지 + "링크 복사" 버튼과 함께 확인. 일반 회원/게스트는 목록에서 제외.
4. **캘린더 집계**: 날짜 셀 히트맵은 그 날짜 슬롯들의 최댓값 count 기준. "현재 최다 가능 일정"은 날짜 단위 집계 상위 3개("N월 D일 (요일) · X명 가능 — HH:MM 최다").
5. **시간대 상호작용**: `pollTimeSlots` 있으면 날짜 클릭 → 하단 시간대 패널(토글·히트맵·인원수), 없으면 날짜 클릭 자체가 토글. ScheduleSelector의 컴포넌트를 억지로 재사용하지 않고 상호작용 패턴만 차용.
6. **기존 플로우 보존**: `toggleSlot` upsert, 7초 refetch, `pollDeadline` 마감, 운영진 확정(`confirmM` → startAt+fixed), `canEdit` 확정 패널 그대로 유지.

## NetworkingPoll 개편 상세

- 월 단위 캘린더 그리드(일~토 7열, 요일 헤더 rose/blue). 기간 밖 날짜는 dim.
- 여러 달 걸치면 `‹ ›` 월 전환(범위 밖 비활성), 단일 달이면 화살표 미표시.
- 날짜 셀: 가능 인원 히트맵 농도 + "N명" 숫자, 내 선택 날짜는 teal 링 + 체크.
- 시간대 패널: 각 시간대 버튼에 인원수 + 히트맵, 내 선택은 링. 비로그인은 조회만(토글 비활성).
- 상단 "현재 최다 가능 일정": 상위 3개 날짜. 응답 0이면 안내 문구.

## 수동 QA 시나리오

### 1) 비공개 링크 접근
- staff로 "모임 만들기" → 공개 범위 "비공개·링크 공유" 선택 → 저장 → 폼 내 공유 링크 복사 패널 확인, "링크 복사" 동작.
- 복사한 `/gatherings/p/{token}` 접속 → 모임 상세 + RSVP 노출.
- 일반 회원/게스트로 `/gatherings` 목록·`/calendar`·`/gallery`(앨범 연결 후보)에서 해당 모임이 **안 보이는지** 확인. staff는 목록에서 "비공개" 배지 + "링크 복사" 확인.
- 잘못된 토큰(`/gatherings/p/xxxx`) → "존재하지 않거나 만료된 링크" EmptyState.
- 게스트(비로그인)로 토큰 페이지에서 게스트 참석 신청 동작 확인.

### 2) 캘린더 투표 토글
- poll 모드(시간대 있음) 모임: 날짜 클릭 → 시간대 패널 열림 → 시간대 토글 → 셀 인원수/농도·teal 링 갱신, 7초 후 타 응답 반영.
- poll 모드(시간대 없음): 날짜 클릭 자체가 토글, 셀 링/카운트 갱신.
- 여러 달 기간: `‹ ›`로 월 전환, 기간 밖 날짜 dim·비클릭 확인.

### 3) 최다 일정 표시
- 여러 회원 응답 후 상단 "현재 최다 가능 일정"에 상위 날짜 + "HH:MM 최다" 표기.
- 운영진(canEdit) 확정 패널: auto=최다 슬롯 "이 날로 확정", manual=슬롯 선택→확정 → startAt 지정·fixed 전환·투표 종료.

## 검증

- `npx tsc --noEmit` → **0 errors** (통과).
- `npm run build` → **성공** ("✓ Compiled successfully in 3.0min", TypeScript 체크 통과). 신규 라우트 `/gatherings/p/[token]`(ƒ 동적) 포함 확인, `/gatherings`(○ 정적).
- 참고: 병렬 세션이 `GlobalSearch.tsx`를 편집 중이던 순간 첫 빌드가 `Flashcard.conceptName` 오류로 실패했으나(내 변경과 무관·해당 코드 이후 변경됨), 현재 트리 재빌드는 통과.
