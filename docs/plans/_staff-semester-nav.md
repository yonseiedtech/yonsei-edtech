# 운영진 페이지(/staff) 학기별 이동 기능

작성: 2026-07-28 · 상태: 구현 완료(미배포 — 메인 게이트 대기)

승인된 결정: **폴백 A · "전체" 옵션 포함 · 3탭 범위(홈·프로젝트 운영·운영진 공지)**

## 변경 요약

| 파일 | 변경 |
|---|---|
| `src/features/staff/staff-store.ts` | 데이터 모델·생성 스탬프·매핑·공유 상태·필터 헬퍼 |
| `src/app/staff/page.tsx` | 헤더 학기 셀렉터 UI |
| `src/features/staff/StaffHomeTab.tsx` | 프로젝트 선필터→파생, 태스크는 필터된 프로젝트 소속만 |
| `src/features/staff/StaffProjectsTab.tsx` | 프로젝트 목록 필터 + "전체" 시 학기 배지 |
| `src/features/staff/StaffNoticesTab.tsx` | 공지 목록 필터 + "전체" 시 학기 배지 |

## 데이터 모델 (staff-store.ts)

- `StaffProject`·`StaffNotice` 에 `semester?: string`("YYYY-1"|"YYYY-2") optional 필드 추가 — 하위호환(레거시 문서엔 없음).
- `docToProject`·`docToNotice`: `semester: doc.semester ? String(doc.semester) : undefined` 매핑 추가.
- `useCreateProject`·`useCreateNotice`: 저장 payload 에 `semester: currentSemesterKey()` 자동 스탬프.
- `StaffTask` 는 프로젝트에 귀속되므로 필드 미추가(요구대로).

## 공유 상태 (useStaffUiStore)

- `selectedSemester: string` 추가, 기본값 = `currentSemesterKey()`(스토어 생성 시 1회 산정).
- `setSelectedSemester(key)` 추가.
- **"전체" = 빈 문자열 `""`** (sentinel `ALL_SEMESTERS = ""` export).

## 학기 셀렉터 UI (page.tsx 헤더)

- 페이지 제목 우측에 `<select>` 드롭다운(기존 border/ring 토큰 패턴 재사용, raw color 미도입).
- 옵션: 맨 위 "전체 학기"(value=`""`) + `listSemesterKeys(4, 1)` → `semesterLabelFromKey()` 라벨(최신이 앞).
- `useMemo(() => listSemesterKeys(4,1), [])` 로 마운트 시 1회 계산(Date 순수성 유지).
- 기본 선택 = 현재 학기(스토어 기본값).

## 필터 로직 (폴백 A)

공유 헬퍼 `matchesSemester(itemSemester, selected, currentKey)`:

```ts
if (!selected) return true;                       // "전체" 통과
return (itemSemester ?? currentKey) === selected; // 레거시=현재 학기 간주
```

- `currentKey` 는 각 탭에서 `useMemo(() => currentSemesterKey(), [])` 로 주입 → 렌더 중 Date 직접 호출 회피(순수성·hydration 안전).
- **폴백 A**: `semester` 필드 없는 레거시 문서는 `?? currentKey` 로 현재 학기 취급.

### 탭별 적용

- **StaffProjectsTab**: `visibleProjects = projects.filter(matchesSemester)`. 목록 렌더만 필터. 홈 딥링크 `focusProjectId` 는 전체 `projects` 에서 조회 → 학기 무관 동작 유지.
- **StaffHomeTab**: `projects`(필터) → `allTasks`(필터된 프로젝트 id 집합에 속한 태스크만) 파생. `preparingProjects`·`snapshot`·`myTasks`·`projectName` 모두 필터본에서 파생. `reviewPending`(콘솔 검수 큐)·`openingDemands`(개설 수요)·`pinned`(고정 공지)는 운영 상시 큐라 학기 무관 유지.
- **StaffNoticesTab**: `filteredNotices = notices.filter(matchesSemester)`.

### "전체" 선택 시 학기 배지

- 프로젝트 카드·공지 카드에 `semesterLabelFromKey(item.semester ?? currentKey)` 배지 표시(`bg-muted text-muted-foreground` 시맨틱 토큰).
- 빈 목록 안내문도 "등록된 X 없음" vs "선택한 학기의 X 없음" 으로 분기.

## 회귀 방지

- 기본이 현재 학기 → 기존 데이터(현재 학기 스탬프 or 폴백 A)는 그대로 노출.
- 방어 가드 `(x ?? [])` 유지. Date 는 `semester.ts` 순수 유틸(`currentSemesterKey`)만 사용.
- raw color 미도입(기존 시맨틱 토큰만).

## 검증

- `npx tsc --noEmit` → **0 errors**
- `npx eslint <변경 5개 파일>` → **0 errors/warnings**
- (PowerShell 실행, next build 미실행 — .next/lock 회피)

## 잔여

- 커밋/배포 금지 — 메인 게이트에서 처리.
- 런타임 스모크(브라우저 접속) 는 배포 후 QA 패스 권장.
