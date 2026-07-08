# 일정 투표 UX 개선 + 종합 공유 페이지 — 구현 보고서

작업일: 2026-07-08 · 프로젝트: yonsei-edtech (Next.js 15 App Router)

## A. 날짜 클릭 → 시간대 선택 팝업 (Dialog 승격)

기존: `NetworkingPoll.tsx`에서 날짜 셀 클릭 시 캘린더 하단에 **인라인 패널**로 시간대 버튼을 노출.
변경: `@/components/ui/dialog`의 **Dialog 팝업**으로 승격.

- 날짜 셀 클릭 → `selectedDate` set → 컨트롤드 `Dialog open={!!selectedDate}` 로 팝업 오픈. 닫으면 `setSelectedDate(null)`.
- 팝업 내 각 시간대 버튼: 시간 · **가능 인원 수(사람 아이콘 + N명)** · **이름 목록**(축약 truncate 한 줄 + `title` 툴팁 전체) 표시. 집계는 기존 `tallyBySlot`(tallyAvailability 결과) 재사용.
- 내가 선택한 시간대는 `ring-2 ring-teal-500` + Check 아이콘으로 뚜렷한 선택 상태(`aria-pressed`).
- `pollTimeSlots` 없는 이벤트는 기존 날짜 토글 동작 유지(팝업 없음) — `onDateClick`의 `hasTimeCols` 분기 그대로.
- 모바일 대응: 팝업은 모바일에서 전체폭(`inset-x-0`), sm+에서 `max-w-md` 중앙. 버튼 `min-h-[52px]`·`py-2.5`로 터치 타깃 확보, `grid-cols-1 sm:grid-cols-2`.
- 미사용된 `X` 아이콘 import 제거(Dialog 자체 닫기 버튼 사용).

## B. 관리자용 "가능 일정 종합" 공유 페이지

### 신규 라우트: `/gatherings/poll/[id]` (서버 컴포넌트)
파일: `src/app/gatherings/poll/[id]/page.tsx`

- `runtime="nodejs"`, `dynamic="force-dynamic"`. **Firebase Admin SDK**(`getAdminDb`)로 `networking_events` 문서 + `networking_availability`(eventId 쿼리)를 읽어 **비로그인 열람 가능**하게 렌더(클라이언트 rules 인증 요구 우회).
- `getPollData`는 `react`의 `cache`로 요청 내 dedupe → `generateMetadata`와 페이지 본문이 조회 1회 공유.
- 상단: 제목 · 후보 기간 · 투표 마감(마감 여부) · 응답자 수. 확정된 이벤트면 "일정 확정됨" 안내.
- 최다 가능 일정 **TOP 3**(순위·날짜·요일·시간대·인원).
- 본문: **날짜(행)×시간대(열) 히트맵 표**(인원 수 표기, `overflow-x-auto`) + 응답자 수. 시간대 없는 이벤트는 날짜별 단일 인원 컬럼.
- **요일별 종합**(일~토 7칸, 해당 요일 전체 슬롯 인원 합산 히트맵).
- `generateMetadata`: OG 태그 — title `「{모임명}」 일정 투표 현황`, description에 최다 가능 일정·응답 수 → 카카오톡 링크 미리보기 대응. `twitter: summary`.

### 공유 진입점: `GatheringEventCard.tsx`
- `isPollPending` 블록에 staff(`canManage`) 전용 **"종합 공유"** 버튼 추가(공개 모임만 — `!isPrivate`).
- `sharePollSummary()`: `navigator.share`(모바일 OS 공유시트 → 카카오톡 포함) 우선, 사용자가 시트 취소(AbortError) 시 조용히 종료, 미지원/실패 시 **클립보드 복사 + toast 폴백**. Kakao SDK 미연동(키 없음, Web Share로 충분).

## 프라이버시 결정 (중요)

1. **이름 미노출**: 종합 공유 페이지는 응답자 이름을 전혀 표시하지 않고 **인원 수만** 집계(개인정보 최소화). (반면 로그인 투표 팝업 A는 참여자 본인 확인용으로 이름 툴팁 노출 — 인증된 회원 컨텍스트.)
2. **public 이벤트만 id 라우트 허용**: `getPollData`에서 `published === false` 또는 `visibility === "private"` 이면 `null` → `notFound()`(404). 비공개 이벤트가 id 추측으로 열리지 않도록 차단.
3. **후보 기간 없으면 404**: `candidateSlots.length === 0` 이면 종합할 데이터가 없어 404.
4. **비공개(private) 종합은 스코프 외 — 제안**: 비공개 모임의 종합 공유가 필요하면 id가 아닌 **shareToken 라우트**(`/gatherings/poll/p/[token]` 또는 기존 `networking_event_tokens` 매핑 재사용)를 신설해 토큰 소지자만 열람하도록 해야 함. 현재는 미구현.

## 공유 URL 규칙

- 종합 공유 페이지: `{origin}/gatherings/poll/{eventId}` (공개 이벤트만 유효, 비공개는 404)
- 기존 비공개 RSVP 링크: `{origin}/gatherings/p/{shareToken}` (변경 없음)

## 변경 파일

| 파일 | 변경 |
|---|---|
| `src/features/networking/NetworkingPoll.tsx` | 인라인 시간대 패널 → Dialog 팝업 승격, 인원/이름 집계·선택 상태 강화, `X` import 제거, Dialog import 추가 |
| `src/features/networking/GatheringEventCard.tsx` | `sharePollSummary()` + staff "종합 공유" 버튼(공개 poll 전용), `Share2` import |
| `src/app/gatherings/poll/[id]/page.tsx` | **신규** — 서버 컴포넌트 종합 공유 페이지(admin SDK, generateMetadata OG) |

## 검증

- `npx tsc --noEmit` → EXIT 0 (에러 0)
- `npm run build` → EXIT 0, 전체 라우트 빌드 성공. 신규 `/gatherings/poll/[id]`는 동적(ƒ) 라우트로 등록.
- 제약 준수: `firestore.rules`·`bkend.ts` 미수정, 커밋·배포 미실행.
