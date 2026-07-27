# 운영진 프로젝트 관리(/staff) 강화 — 구현 내역

작업일: 2026-07-28
대상: `src/features/staff/StaffProjectsTab.tsx`, `src/features/staff/StaffHomeTab.tsx`
상태: 코드 완료 · TSC 0 · ESLint 0(에러/워닝 0). 커밋/배포 없음 — 메인 게이트 대기.

## 운영진 회원 조회 방법 (조사 결과)

- 신규 훅/API 불필요. 기존 `useAllMembers()`(`src/features/member/useMembers.ts`)가 전체 `User[]`(id·name·role·approved·studentId·generation)를 반환한다. MemberAutocomplete도 동일 훅을 사용 중이라 패턴 일치.
- 역할 상수: `UserRole = "sysadmin" | "admin" | "president" | "staff" | ...`(`src/types/user.ts`), 계층은 `src/lib/permissions.ts`.
- 운영진 파생: 클라이언트에서 `STAFF_ROLES = new Set(["staff","president","admin","sysadmin"])` 로 `members.filter(m => STAFF_ROLES.has(m.role))` → 이름 오름차순 정렬. (`useMembers({role})`는 단일 role 필터만 지원하므로 4개 역할을 한 번에 얻으려 전체 목록 클라이언트 필터가 적합.)
- store 타입 변경 없음: `StaffTask.description`/`dueDate`/`assigneeId`/`assigneeName` 모두 기존 optional 필드로 요구 충족.

## 요구사항별 구현

### 1. 홈에 "진행 중" 프로젝트도 표시 — StaffHomeTab.tsx
- `preparingProjects`를 `planning + active` 둘 다 포함. active 먼저, planning 이후 정렬(`[...active, ...planning]`).
- 위젯 제목 "준비 중인 프로젝트" → "준비·진행 중인 프로젝트", 주석/빈 상태 문구 동기화("지금 준비·진행 중인 프로젝트가 없습니다.").
- 각 카드 상태 배지: 하드코딩 "기획 중" → `PROJECT_STATUS_CHIP[p.status]` + `PROJECT_STATUS_LABELS[p.status]`(기획 중/진행 중 구분). 두 상수를 import 추가.
- `(allTasks ?? [])` 방어 가드 적용.

### 2. 태스크 담당자를 운영진 목록에서 선택 — StaffProjectsTab.tsx(TaskModal)
- `MemberAutocomplete`(전체 회원 검색) → 운영진 `<select>` 드롭다운으로 대체. import 교체(MemberAutocomplete/SelectedMember 제거, useAllMembers 추가).
- `staffMembers`(role 필터 파생) + `assigneeOptions`(편집 시 운영진 목록에 없는 기존 담당자도 옵션 유지) memo.
- `handleAssigneeSelect(id)`가 assigneeId/assigneeName 세팅(기존 세팅 시맨틱 유지). 빈 값 = "담당자 없음"(미배정) 선택 가능.
- 라벨 "담당자 (운영진)".

### 3. 태스크 메모 작성 + 표시 — StaffProjectsTab.tsx
- TaskModal: `description` 라벨 "설명" → "메모", placeholder "업무 메모·참고 사항 (선택)". 편집 시 기존 값 유지(state 초기값 `task?.description`).
- TaskCard: `task.description` 있으면 `StickyNote` 아이콘 + `line-clamp-2`로 1~2줄 표시.

### 4. 마감일 미설정 배지 — StaffProjectsTab.tsx
- TaskCard: `task.dueDate ? (기존 마감일 표시) : (CalendarOff + "마감일 미설정", text-muted-foreground)` 삼항으로 변경.
- 타임라인 뷰에서도 미설정 그룹("마감일 미설정") + 행에 "미설정" 배지.

### 5. 날짜 기준 뷰 (칸반 ↔ 타임라인) — StaffProjectsTab.tsx
- KanbanBoard에 `view` 로컬 state(`"kanban" | "timeline"`, persist 없음) + 컨트롤 영역 좌측에 세그먼트 토글(LayoutGrid 칸반 / CalendarRange 타임라인, aria-pressed).
- `TimelineView`: 마감일 기준 5그룹 — 기한 지남 / 이번 주(7일 내) / 이번 달 / 이후 / 마감일 미설정. `timelineBucket()`은 기존 `diffDays()` 재사용(purity). 각 그룹 마감일 오름차순, 빈 그룹 숨김.
- `TimelineRow`: 상태 배지·제목·담당자(미배정 표시)·메모·마감일+D-day(`ddayLabel`). 클릭 시 편집 모달(`setEditTask`).
- 필터(내 담당만/담당자)·태스크 추가 버튼은 두 뷰 공통(`filteredTasks` 공유). 상태 변경은 편집 모달 경유(과설계 회피 — 풀 간트 X).

## 규율 준수
- 배열 접근 `(x ?? [])` 방어 가드, Date 계산은 `getDueDateStatus`/`diffDays` 재사용.
- raw color 신규 도입 없음 — `TASK_STATUS_CHIP`/`PROJECT_STATUS_CHIP`, `text-warning`/`text-destructive`/`text-muted-foreground`, `bg-primary` 등 기존 시맨틱 토큰만.
- 기존 칸반/모달 동작 보존(기본 뷰=칸반), WidgetBoundary 관습 유지.
- staff-store.ts 변경 없음(하위호환).

## 검증
- `npx tsc --noEmit` → TSC_EXIT=0 (에러 0)
- `npx eslint src/features/staff/StaffProjectsTab.tsx src/features/staff/StaffHomeTab.tsx` → ESLINT_EXIT=0 (에러/워닝 0)
- next build 미실행(메인 게이트).
