# /gatherings staff+ 모임 즉시생성 — 구현 리포트

## 목표
운영진(staff 이상)이 콘솔(`/console/networking`)로 이동하지 않고 `/gatherings` 페이지에서 바로 모임(네트워킹 이벤트)을 생성할 수 있게 함.

## 변경 파일

### 1. `src/features/networking/EventEditorForm.tsx` (신규)
- `src/app/console/networking/page.tsx`에 인라인으로 있던 `EventFormCard` 컴포넌트와 그 보조 타입/헬퍼(`EventForm` 인터페이스, `EMPTY_FORM`, `parseTimeSlots`, `isoToLocal`, `localToIso`, `EVENT_TYPES`, `EVENT_STATUSES`)를 그대로 추출.
- 공개 인터페이스: `EventEditorFormProps { initial: NetworkingEvent | null; onClose: () => void; onSaved: () => void; createdByUid: string }`.
- 로직·검증(고정/투표 스케줄 필수값, 회비·정원 등)과 `networkingEventsApi.create/update` 호출은 기존과 100% 동일 — 동작 변경 없음, 위치만 이동.
- 컴포넌트는 자체적으로 `rounded-2xl border bg-card p-5 shadow-sm` 카드 래퍼 + 헤더(제목 + X 닫기 버튼)를 갖고 있어, console 페이지에 직접 배치하거나 Dialog 안에 넣어도 독립적으로 동작.

### 2. `src/app/console/networking/page.tsx` (리팩토링)
- 인라인 `EventFormCard` 함수 정의(및 전용 타입·헬퍼) 삭제, `EventEditorForm`을 import해서 동일한 props로 교체.
- 더 이상 쓰이지 않게 된 import 정리: `Input`(폼 전용이라 이제 미사용), `X`(폼 전용 닫기 아이콘), `NETWORKING_DECISION_LABELS`, `NetworkingEventType`, `NetworkingEventStatus` 타입.
- `EventManager`(참석자 명단·회비·정산·CSV)는 손대지 않음 — 기존 그대로.
- 동작 보존 확인: 목록에서 "새 행사" 버튼 → `editing="new"` → `EventEditorForm initial={null}`, 행 선택 후 "수정" → `editing=selected` → `EventEditorForm initial={selected}`. 저장 성공 시 `["console-networking-events"]` invalidate + 폼 닫힘, 기존과 동일.

### 3. `src/app/gatherings/page.tsx` (신규 기능 추가)
- `isStaffOrAbove(user)`(`@/lib/permissions`, 기존 `isAtLeast(user, "staff")`의 래퍼 — 코드베이스 관례상 이 헬퍼를 이미 다른 곳에서 사용 중이라 이걸 채택)로 staff 이상 여부 판정 → `canCreate`.
- `PageHeader`의 기존 `actions` slot(이미 컴포넌트에 있던 prop)에 staff+ 전용 "모임 만들기" 버튼(Plus 아이콘) 추가. 일반 회원에게는 버튼 자체가 렌더되지 않음.
- 클릭 시 `@/components/ui/dialog`(base-ui 래퍼, 이미 프로젝트에 존재 — `admin/fees` 등에서 사용 중인 패턴)로 `EventEditorForm`을 표시.
  - `DialogContent showCloseButton={false}`로 Dialog 자체의 X 버튼을 끄고, `EventEditorForm`이 이미 갖고 있는 자체 헤더(제목 + X)를 그대로 사용해 닫기 버튼 중복을 피함.
  - `DialogHeader`/`DialogTitle`은 접근성용으로 `sr-only` 처리(시각적으로는 폼 내부 "새 행사 등록" 타이틀만 보임).
  - `className="sm:max-w-2xl"`로 다이얼로그 폭을 확장(폼이 2열 그리드라 기본 `sm:max-w-lg`보다 넓게 — `cn`이 `twMerge` 기반이라 정상적으로 오버라이드됨 확인).
- 저장 성공(`onSaved`) 시 `queryClient.invalidateQueries({ queryKey: ["networking-events"] })` + `setCreateOpen(false)`로 다이얼로그 닫음. 저장 성공 토스트는 `EventEditorForm` 내부에서 이미 "저장되었습니다." 토스트를 띄우므로 중복 방지를 위해 페이지 쪽에서 별도 토스트를 추가하지 않음.
- `initial={null}`, `createdByUid={user?.id ?? ""}`로 항상 "새 행사 등록" 모드로만 사용(수정 기능은 기존대로 콘솔에서만).

## 제약 준수
- `firestore.rules` 미수정.
- `src/types/graduation.ts`, `src/lib/graduation-progress.ts`, `src/lib/bkend.ts`의 graduation 섹션, `src/components/mypage/**` 미수정 (grep으로 diff 대상에 해당 파일 없음을 확인).
- `src/lib/bkend.ts` 자체도 미수정 (기존 `networkingEventsApi`로 충분).
- 커밋/배포 없음 — 코드만 디스크에 남김.

## 검증
- `npx tsc --noEmit` → 종료 코드 0, 출력 없음 (프로젝트 전체 기준 신규 에러 0건, 기존 에러도 없음).
