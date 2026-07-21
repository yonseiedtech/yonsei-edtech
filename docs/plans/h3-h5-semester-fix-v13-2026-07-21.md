# H3-C5 + H5 C-1/C-3/C-6 학기 보정 구현 완료 보고서
> 2026-07-21 | v13

## 작업 범위

4건 모두 코드베이스에 완전 구현 확인 + TSC/ESLint 0 오류 검증.

---

## C-5 (H3): cohortKeyOf 8월 가입 신입 코호트 보정

**파일**: `src/lib/semester.ts` — `cohortKeyOf` 함수 (lines 62–93)

### 구현 내용
- `enrollmentYear` + `enrollmentHalf` 명시 시 그대로 반환 (변경 없음)
- `createdAt` 폴백 경로에서 KST 기준 월/년 추출 후:
  - 전기(3–8월): 다음 관례 개강 = 같은 해 9/1
  - 후기(9–12월)/연초(1–2월): 다음 관례 개강 = 다음 해 3/1
  - `daysToNext` (가입일 → 다음 개강일 일수) 가 0–30이면 다음 학기 코호트로 배정
  - 31일 이상이면 가입일 기준 학기 그대로 반환
- 8/2 가입(daysToNext=30) → "2026-2" ✓ | 7/31 가입(daysToNext=32) → "2026-1" ✓

### 보조 함수
- `effectiveSemesterStart(year, semester, entries)` 추가 (lines 95–109): C-1/C-6 공용 헬퍼
  - `academic_calendar` entries에서 실개강일 우선 탐색
  - 미등록 시 관례일 폴백 (1학기 `YYYY-03-01`, 2학기 `YYYY-09-01`)

---

## C-1 (H5): 개강 배너·방학카드 관례일 하드코딩 → 학사일정 참조

### SemesterKickoffBanner.tsx (`src/features/dashboard/`)
- `useAcademicCalendar` 훅으로 `calendarData.entries` 주입 (로딩 중 빈 배열 폴백)
- `activeKickoffSemester(entries)` 내부에서 `effectiveSemesterStart` 재사용
- 실개강일이 등록된 경우 실개강일 기준으로 D-7~D+14 윈도 판정
- 미등록 시 관례일(3/1, 9/1) 폴백 — 무회귀

### VacationModeCard.tsx (`src/features/dashboard/`)
- `useAcademicCalendar` + `effectiveSemesterStart`로 `nextStart` 계산
- 개강일 미등록 시 관례일 폴백 (기존 동작 유지)
- KST YMD 비교로 시간대 무관 D-day 계산

---

## C-3 (H5): 휴학자에게 수강과목 등록 유도 제거

**파일**: `src/features/dashboard/SemesterKickoffBanner.tsx` (lines 80–107)

### 구현 내용
- `user.enrollmentStatus === "on_leave"` 판정
- 휴학자 분기:
  - 타이틀: "🎓 {sem.label} 개강이 다가오고 있어요"
  - 본문: "복학을 준비 중이라면 학사정보를 최신화해 주세요 — 학기 알림·대시보드가 복학 모드로 전환됩니다."
  - CTA: `<UserCheck />` 학사정보 최신화 → `/mypage/academic-status`
  - 테두리 색상: `border-warning/30 bg-warning/5` (재학 배너와 시각적 구분)
- 재학생 경로: 기존 수강과목 등록·새 기능·세미나 CTA 유지

---

## C-6 (H5): weekly-digest 개강 D-14 이내 블록 추가

**파일**: `src/app/api/cron/weekly-digest/route.ts` (lines 1087–1121, 893, 916)

### 구현 내용
- `sendDigest` 내에서 `academic_calendar` 컬렉션 조회 (limit 20)
- 올해 + 내년 1학기 3개 후보 순서로 `effectiveSemesterStart` 적용
- `daysLeft` 가 1–14 이내이면 `semesterDdayBlock` HTML 생성 후 break
- 조회 실패 시 조용히 블록 생략 (graceful)
- `buildHtml` 에 `semesterDdayBlock` 파라미터 연결 → 이메일 본문 상단 삽입
- 예시 출력: `📅 2026년 2학기 개강 D-10 — 시간표를 미리 확인하세요 →`
- 발송 수신자·빈도 정책 변경 없음

---

## 검증 결과

| 검사 | 결과 |
|------|------|
| `npx tsc --noEmit` | ✅ 에러 0 |
| `eslint --quiet` (4개 파일) | ✅ 에러 0 |

### 검사 대상 파일
- `src/lib/semester.ts`
- `src/features/dashboard/SemesterKickoffBanner.tsx`
- `src/features/dashboard/VacationModeCard.tsx`
- `src/app/api/cron/weekly-digest/route.ts`

---

## 제약 준수
- 신규 Firestore 컬렉션 없음 (academic_calendar는 기존 컬렉션)
- 레이아웃 재설계 없음 — 기존 카드/배너 구조 유지
- `src/features/handover/**` 미접촉
- `npm run build` · `git commit` 미실행 (메인 게이트 위임)
