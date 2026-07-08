# 비로그인 일정 투표 + 잠재회원 연계 — 구현 보고

## 변경 파일

| 파일 | 변경 내용 |
| --- | --- |
| `src/types/networking.ts` | `NetworkingAvailability`에 `studentId?: string`, `isGuest?: boolean` 추가. `userId` 주석을 "게스트면 빈 문자열"로 보강. |
| `src/app/api/networking/availability-guest/route.ts` | **신규** — 게스트(비회원) 일정 투표 서버 라우트(POST). |
| `src/features/networking/NetworkingPoll.tsx` | 비로그인 투표 진입(로그인/비로그인 선택 + 이름·학번 인라인 폼), 게스트 로컬 선택·debounce 저장, 게스트 배너·공유 페이지 링크. |
| `src/app/api/console/potential-members/route.ts` | `networking_availability`의 `isGuest===true` 게스트 응답을 잠재회원 소스 (c)로 병합. |

## API 검증 규칙 — `POST /api/networking/availability-guest`

`rsvp-guest` 컨벤션(rate-limit · admin SDK · 이벤트 재검증 · 화이트리스트 · 멱등 upsert)을 그대로 따름.

- **Rate limit**: IP 기준 시간당 20회(`checkRateLimit` / `getClientId`). 토글 debounce 저장이 반복되므로 rsvp(5회)보다 여유.
- **Body**: `{ eventId, guestName, studentId, availableSlots: string[] }`.
- **필수값**: eventId·guestName·studentId·availableSlots(배열) 누락 시 400.
- **guestName**: ≤30자, 초과 시 400.
- **studentId**: `/^[0-9-]{1,20}$/` (숫자·하이픈, ≤20자). 위반 시 400.
- **availableSlots**: 길이 ≤200. 초과 시 400.
- **이벤트 존재**: 없으면 404.
- **poll 모드**: `schedulingMode !== "poll"`이면 400.
- **마감**: `pollDeadline` 경과 시 403.
- **화이트리스트**: `buildCandidateSlots(pollPeriodStart, pollPeriodEnd, pollTimeSlots)`(내부 `effectivePollTimeSlots` 폴백 포함)로 후보 슬롯을 서버에서 재계산 → 선택 슬롯이 하나라도 후보에 없으면 400. 후보가 0개(기간 미설정)면 400.
- **멱등 upsert**: `eventId + isGuest==true + studentId`로 기존 문서 조회 → 있으면 `availableSlots`·`userName`·`updatedAt` 갱신, 없으면 신규 add.
- **저장 필드**: `eventId, userId: "", userName: "{guestName}(비회원)", guestName, studentId, isGuest: true, availableSlots, createdAt, updatedAt`.
  - `userName`에 `(비회원)` 접미를 붙여 회원 화면 집계 툴팁 등에서 게스트를 구분.
- rules·bkend.ts 미수정(admin SDK 경유라 불필요).

## 잠재회원 병합 방식 — `GET /api/console/potential-members`

- 기존 소스 (a) 활동 신청자, (b) 세미나 게스트에 **(c) 모임 일정 투표 게스트**를 추가.
- `networking_availability`에서 `where("isGuest","==",true)` 조회. 응답이 있을 때만 `networking_events` 제목 맵을 로드(불필요한 전체 read 회피).
- 각 응답 → `bucketFor(studentId, guestName)`로 기존 학번 그룹핑 로직에 편입. 이미 회원인 학번(`memberStudentIds`)은 제외.
- `PotentialRecord.kind`에 `"networking"` 추가. 레코드: `{ kind: "networking", id: eventId, title: "모임 일정 투표: {이벤트 제목}", date: updatedAt || createdAt }`.
- `interestScore`·전환 추적(`guestStudentIds`)·정렬은 기존 파이프라인이 그대로 처리(코드 변경 최소).

## UI 동작 — NetworkingPoll

- **비로그인 & 미등록**: "로그인하고 투표"(`/login` 링크) / "비로그인으로 투표"(클릭 시 이름·학번 인라인 폼). 폼 제출 시 클라이언트 검증(이름 ≤30, 학번 `/^[0-9-]{1,20}$/`) → `localStorage["gatherings.guestVoter"]`에 `{name, studentId}` 저장 → 캘린더·팝업 활성화.
- **게스트 투표**: 슬롯 토글은 로컬 `guestSlots`에 누적 → 800ms debounce 후 `/api/networking/availability-guest` POST. 성공 시 toast.
- **집계 표시**: 히트맵 쿼리는 `enabled: !!user` 유지(게스트는 rules상 응답 목록 read 불가). 게스트에겐 본인 선택만 로컬 기준으로 링(ring) 표시 + 배너에 "전체 집계 보기"(`/gatherings/poll/{event.id}` — 비로그인 열람 가능) 링크.
- **회원 로그인 동작 무변경**: 회원 upsert 경로·확정 패널 그대로.

## 수동 QA 시나리오 (비로그인 투표 → 콘솔 잠재회원 확인)

1. 로그아웃 상태로 poll 모드 모임 상세(`/gatherings/...`) 진입 → 일정 조율 투표 카드에 "로그인하고 투표 / 비로그인으로 투표" 노출 확인.
2. "비로그인으로 투표" → 이름·학번 입력 → "투표 시작". (잘못된 학번 "abc" 입력 시 toast 에러 확인.)
3. 날짜 클릭 → 시간대 팝업에서 슬롯 몇 개 토글 → 800ms 뒤 "가능 일정이 저장되었습니다" toast.
4. 배너에 "비로그인 투표 중 · {이름} 님 · 선택 N개" + "전체 집계 보기" 링크 확인. 링크 클릭 → `/gatherings/poll/{id}` 공유 페이지에서 집계 인원 반영 확인.
5. 새로고침 → localStorage 로 게스트 상태 복원(캘린더 바로 활성). (선택은 로컬 미복원 — 재선택 시 멱등 upsert 로 서버 갱신.)
6. staff 로그인 → 콘솔 잠재회원 화면(`/console/...` potential-members) → 방금 투표한 이름·학번이 "모임 일정 투표: {제목}" 출처로 목록에 등장 확인.
7. 마감(pollDeadline 경과) 이벤트에서 게스트 투표 시도 → 저장 403(팝업 disabled) 확인.

## 검증

- `npx tsc --noEmit`: (실행 로그 참조)
- `npm run build`: (실행 로그 참조)
- firestore.rules / bkend.ts 다른 섹션 미수정. 커밋·배포 안 함.
