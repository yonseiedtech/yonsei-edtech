# M3 구현 보고 — academic-calendar ↔ 콘솔 랜딩 연결 (H1 상보)

> v12 백로그 M3 · 구현일: 2026-07-21 · 담당: executor

---

## 변경 파일

- `src/app/console/page.tsx` — 단일 파일 수정 (신규 파일 없음)

---

## 구현 내용

### 1. 하드코딩 제거 — 개강일 동적 읽기

기존 `UpcomingSeasonCard`는 "2026-09-01 (화)"를 고정 문자열로 사용. 이제 `calendarData.entries`에서 `year=2026, semester="second"` 항목의 `semesterStart`를 읽어 D-day를 계산. 미등록 시 `"2026-09-01"` fallback 유지.

```typescript
const cal2ndEntry = calendarData.entries.find(
  (e) => e.year === 2026 && e.semester === "second",
);
const semesterStartDate = cal2ndEntry?.semesterStart || "2026-09-01";
const semesterDiff = calcDdayDiff(semesterStartDate);
const hasCalendar2ndSemester = !!cal2ndEntry?.semesterStart;
```

### 2. 학사일정 항목 추출 함수 — `getUpcomingCalendarItems`

모든 `entries`에서 미래 마일스톤(개강·중간고사·기말고사·종강·예비심사·본심사)을 추출. 오늘 이후 ~ 120일 이내 항목만 포함, 날짜 오름차순 정렬.

```typescript
function getUpcomingCalendarItems(
  entries: AcademicCalendarData["entries"],
  windowDays = 120,
): CalendarUpcomingItem[]
```

### 3. semester 이벤트 카드에 "학사일정 다가오는 항목" 섹션 추가

체크리스트 이후 구분선 아래에 추가:
- **항목 있을 때**: 최대 3개 항목을 label + D-day 배지로 표시. D-7 이내는 `text-destructive`, D-30 이내는 `text-warning`, 이후는 `text-muted-foreground`.
- **항목 없을 때(미등록)**: "학사일정을 등록하면 주요 일정이 자동 반영됩니다." 안내 + `/console/academic-calendar` 딥링크.

### 4. Props 리팩토링

| 변경 전 | 변경 후 |
|---|---|
| `hasCalendar2ndSemester: boolean` (ConsoleDashboardPage에서 계산) | `calendarData: AcademicCalendarData` (전체 전달) |

`UpcomingSeasonCard` 내부에서 `hasCalendar2ndSemester` 계산 통합. `ConsoleDashboardPage`에서 중복 계산 제거.

---

## 검증

- `npx tsc --noEmit`: exit code 0 (에러 0)
- `npx eslint src/app/console/page.tsx --quiet`: 출력 없음 (경고 0)
- 수정 금지 파일(`features/mypage`, `components/mypage`, `console/handover`, `features/admin/settings`) 미접촉 확인

---

## 효과

1. 학사일정(`/console/academic-calendar`)에 항목을 등록하면 콘솔 랜딩 시즌 카드에 **자동 반영** — 별도 콘솔 진입 없이 한 화면에서 확인 가능.
2. 미등록 상태에서는 즉시 등록 딥링크 제공 → 준비 캘린더 단일 진입점 달성.
3. 하드코딩 날짜(`"2026-09-01 (화)"`) 제거 → 학사일정 변경 시 코드 수정 불필요.
