# H5(v13) 개강 정합 C급 마감 구현 보고서 (2026-07-21)

> 과업: C-1 개강일 기준 일원화 · C-3 휴학자 분기 · C-6 digest 개강 임박 블록 · C-5 코호트 보정
> 검증: `npx tsc --noEmit` → 0 에러 · ESLint --quiet → 0 에러 · vitest semester.test.ts → 27/27 통과
> 금지 준수: 신규 Firestore 컬렉션 0 · raw 색상 0 · npm run build·git commit 금지

---

## 변경 파일 목록

| 파일 | 변경 요약 |
|---|---|
| `src/lib/semester.ts` | `effectiveSemesterStart` 신규 + `cohortKeyOf` C-5 폴백 보정 |
| `src/features/dashboard/SemesterKickoffBanner.tsx` | C-1 실개강일 + C-3 휴학자 분기 |
| `src/features/dashboard/VacationModeCard.tsx` | C-1 실개강일 D-day |
| `src/app/api/cron/weekly-digest/route.ts` | C-6 개강 임박 블록 |
| `src/lib/__tests__/semester.test.ts` | C-5 cohortKeyOf 케이스 6종 + effectiveSemesterStart 케이스 4종 추가 |

---

## 1. C-1 개강일 기준 일원화

### 공용 함수 추가 (`src/lib/semester.ts`)

```typescript
export function effectiveSemesterStart(
  year: number,
  semester: "first" | "second",
  entries: { year: number; semester: "first" | "second"; semesterStart: string }[] = [],
): string
```

- `entries`(academic_calendar 항목 배열)에서 해당 학기 `semesterStart` 우선 참조
- 없으면 관례일(1학기 3/1, 2학기 9/1) 반환
- 함수 자체는 fetch 없음 — 클라이언트/서버 어디서나 사용 가능

### SemesterKickoffBanner.tsx

- `activeKickoffSemester()` 함수에 `entries` 파라미터 추가
- 내부에서 `effectiveSemesterStart(c.year, c.semester, entries)` 호출로 하드코딩 제거
- `useAcademicCalendar()` 훅 추가 — `calendarData.entries`를 함수에 주입
- 로딩 중(entries=[]) → 관례일 폴백으로 seamless 동작

### VacationModeCard.tsx

- `useAcademicCalendar()` 훅 추가
- `nextStart` 산정을 하드코딩에서 `effectiveSemesterStart(...)` 호출로 교체
  - term="spring" → `effectiveSemesterStart(year, "second", calendarData.entries)`
  - term="fall" → `effectiveSemesterStart(year + 1, "first", calendarData.entries)`
- `daysLeft` useMemo는 `nextStart` 의존이므로 실개강일 반영 자동

---

## 2. C-3 휴학자 분기 (`SemesterKickoffBanner.tsx`)

- `const isOnLeave = user.enrollmentStatus === "on_leave";` 판정 추가
- `isOnLeave` 시 별도 JSX 렌더:
  - 컨테이너 색상: `border-warning/30 bg-warning/5` (시맨틱 토큰)
  - 문구: "복학을 준비 중이라면 학사정보를 최신화해 주세요"
  - CTA: `/mypage/academic-status` 착지, `UserCheck` 아이콘
  - dismiss 키는 동일(`yedu_kickoff_dismissed_${sem.key}.${user.id}`) — 학기별 1회 닫기 공유

### 전/후 동작

| 상태 | 기존 | 변경 후 |
|---|---|---|
| 재학(enrolled) | "수강과목 등록" 유도 | 동일 |
| 휴학(on_leave) | "수강과목 등록" 유도 (오도) | "복학 준비 시 학사정보 최신화" + `/mypage/academic-status` |
| 졸업/alumni | 배너 미노출 | 동일 |

---

## 3. C-6 digest 개강 임박 블록 (`weekly-digest/route.ts`)

- `effectiveSemesterStart` import 추가
- `buildHtml` 파라미터에 `semesterDdayBlock?: string` 추가
  - HTML 상단(subtitle `<p>` 직후)에 `${semesterDdayBlock ?? ""}` 삽입
- `sendDigest` 내 산정 로직(graceful failure 블록):
  1. `db.collection("academic_calendar")` 조회 (semester-start-reminder 동일 패턴)
  2. `effectiveSemesterStart` 로 실개강일 산정
  3. D-1 ~ D-14 이내인 학기 발견 시 한 줄 HTML 블록 생성
  4. 실패 시 블록 생략, 발송 계속
- 3곳 `buildHtml` 호출 모두 `semesterDdayBlock` 전달
- 발송 정책·수신자 변경 없음 — 블록 1개 추가만

---

## 4. C-5 코호트 보정 (`cohortKeyOf` in `semester.ts`)

### 보정 규칙

- `enrollmentYear/Half` 명시 입력자: **절대 영향 없음** (기존 경로 유지)
- `createdAt` 폴백 시: KST 기준 월로 다음 관례 개강일까지 일수 계산
  - 전기(KST 3~8월) → 다음 개강: 같은 해 9/1
  - 후기/연초(KST 9~2월) → 다음 개강: 다음 3/1
  - `daysToNext >= 0 && daysToNext <= 30` → 다음 학기 코호트로 보정

### 케이스

| createdAt (UTC) | 기존 | 변경 후 |
|---|---|---|
| 2026-08-02 (KST 8/2, D-30) | 2026-1 | **2026-2** ✓ |
| 2026-08-15 (KST 8/15, D-17) | 2026-1 | **2026-2** ✓ |
| 2026-08-31 (KST 8/31, D-1) | 2026-1 | **2026-2** ✓ |
| 2026-08-01 (KST 8/1, D-31) | 2026-1 | **2026-1** (보정 없음) ✓ |
| 2026-04-01 | 2026-1 | 2026-1 (불변) ✓ |
| 2026-09-15 | 2026-2 | 2026-2 (불변) ✓ |

---

## 검증 결과

```
npx tsc --noEmit           → 출력 없음 (0 에러)
npx eslint --quiet (5파일) → 출력 없음 (0 에러)
npx vitest run semester.test.ts → Test Files 1 passed · Tests 27 passed
```

신규 테스트 추가분(10케이스):
- `cohortKeyOf — C-5 8월 가입 코호트 보정` (6케이스)
- `effectiveSemesterStart — C-1 실개강일 우선·관례일 폴백` (4케이스)
