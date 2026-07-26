# M5: 운영진 홈·업무 딥링크 정밀화 — 구현 보고서

## 변경 파일

### `src/features/staff/staff-store.ts`
- `zustand` import 추가
- `useStaffUiStore` zustand 스토어 신설 (`focusProjectId: string | null`, `setFocusProjectId`)
- 역할: StaffHomeTab → StaffProjectsTab 딥링크를 위한 경량 공유 UI 상태

### `src/features/staff/StaffHomeTab.tsx`
- `useStaffUiStore` import 추가
- `setFocusProjectId` 구조 분해
- 내 할당 업무 항목 클릭 시: `setFocusProjectId(t.projectId)` 호출 후 `onGoTab("projects")` 탭 전환
- 공지 클릭은 `projectId` 없으므로 기존 동작(notices 탭 이동) 유지

### `src/features/staff/StaffProjectsTab.tsx`
- `useStaffUiStore` import 추가
- `focusProjectId`, `setFocusProjectId` 구조 분해
- `effectiveProject` useMemo 파생: `focusProjectId` 있으면 해당 프로젝트 우선 표시, 없으면 기존 `selectedProject`
  - `useEffect + setState` 패턴(react-hooks/set-state-in-effect 경고) 회피
  - 로딩 중(isLoading=true)이면 focusProjectId 무시하여 빈 find 방지
- KanbanBoard onBack 핸들러: `setSelectedProject(null)` + `setFocusProjectId(null)` 동시 소비

## 동작 흐름

1. 홈 탭에서 내 할당 업무 클릭 → `focusProjectId = t.projectId` 저장 → `projects` 탭 전환
2. `StaffProjectsTab` 렌더: `effectiveProject` 파생 → 해당 프로젝트 KanbanBoard 자동 오픈
3. 뒤로가기 클릭: `focusProjectId = null` 소비 → 프로젝트 목록 복귀
4. `focusProjectId = null`이면 기존 흐름(selectedProject 기반) 그대로 동작

## 검증 결과

| 검사 | 결과 |
|------|------|
| `npx tsc --noEmit` | ✅ 0 오류 |
| `npx eslint` (3개 파일) | ✅ 0 오류, 0 경고 |
| `node scripts/check-rawcolor-ratchet.mjs` | ✅ PASS (1/1 — 변동 없음) |

## 제약 준수

- DB/rules 무변경
- 신규 raw color 없음
- ESLint warning 0 (exhaustive-deps·set-state-in-effect 모두 회피)
- 수정 파일: staff 3개만 (`staff-store.ts`, `StaffHomeTab.tsx`, `StaffProjectsTab.tsx`)
- 커밋/배포 미실시 (메인 게이트 대기)
