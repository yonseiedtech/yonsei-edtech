# v17 H1 — 운영진 모임 일정조율 투표 구현 보고서

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/networking.ts` | `NetworkingEvent`에 `internal?: boolean` 옵셔널 필드 추가 (JSDoc 주석 포함, 하위호환) |
| `src/features/staff/StaffMeetingPollTab.tsx` | **신규** — 운영진 내부 일정조율 탭 컴포넌트 |
| `src/app/staff/page.tsx` | `CalendarClock` 아이콘 + `StaffMeetingPollTab` import, "모임 일정" 탭(TabsTrigger+TabsContent) 추가 |
| `src/app/gatherings/page.tsx` | `visibleEvents` useMemo에 `&& !e.internal` 조건 추가 — staff 포함 전체 사용자 대상 internal 이벤트 공개 목록 제외 |

## 재사용한 기존 자산

- **`NetworkingPoll`** (`src/features/networking/NetworkingPoll.tsx`): 캘린더 히트맵·응답 집계·게스트 투표·운영진 확정 UI 그대로 임베드. 코드 변경 없음.
- **`networkingEventsApi`** (`src/lib/bkend.ts`): `.list()` / `.create()` API 그대로 사용.
- **`isAtLeast`** (`src/lib/permissions.ts`): `isAtLeast(user, "staff")` 권한 판정.
- **`currentSemesterKey`** (`src/lib/semester.ts`): `semester` 필드 자동 산정.
- **`EmptyState`** (`src/components/ui/empty-state`): 빈 상태 UI.
- **`DEFAULT_SLOT_SELECTION`** 값 참고 (EventEditorForm.tsx 108행) → 로컬 상수 `DEFAULT_SLOTS`로 동일값 정의.

## StaffMeetingPollTab 동작 요약

1. `networkingEventsApi.list()` → `internal===true && schedulingMode==="poll"` 필터, 최신순 정렬.
2. "새 일정조율 만들기" 폼: 제목, 후보 기간(date input), 시간대 칩(11:00~22:00 1시간 단위), 마감일(datetime-local), 확정방식(auto/manual).
3. 제출 시 `networkingEventsApi.create({ ..., internal:true, visibility:"private", schedulingMode:"poll", ... })`.
4. 목록 카드 클릭 → `<NetworkingPoll event={ev} canEdit={canEdit} />` 임베드 + 공유 링크(`/gatherings/poll/{id}`) 안내.
5. 빈 상태·로딩 스켈레톤 처리. useQuery(react-query) 사용. `invalidateQueries(["staff-meeting-polls"])` 로 생성 직후 갱신.

## 공개 목록 노출 차단

- `src/app/gatherings/page.tsx`: `visibleEvents`에 `.filter((e) => !e.internal)` 추가.
- `MyGatheringsStrip`: 부모(gatherings page)의 `upcoming` prop이 이미 `visibleEvents → shownEvents` 체인에서 필터됨 → 별도 수정 불요.
- `firestore.rules` 변경 없음 (하위호환, 노출 차단은 읽기 측 필터).

## 검증 결과

| 항목 | 명령 | 결과 |
|------|------|------|
| TypeScript | `npx tsc --noEmit` | **0 에러** |
| ESLint | `npx eslint <변경 파일 4개>` | **0 경고/에러** |
| raw color ratchet | `node scripts/check-rawcolor-ratchet.mjs` | **PASS (1개 / 상한 1개 — 변동 없음)** |
| 전체 빌드 | `npm run build` | **성공 (exit code 0)** |
