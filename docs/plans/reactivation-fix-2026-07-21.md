# 재활성화 동선 보정 — A-1 + B-1~B-4 (2026-07-21)

> 기준 감사: `docs/plans/reactivation-audit-h5v12-2026-07-21.md`

## 변경 파일

| 항목 | 파일 | 변경 요약 |
|---|---|---|
| A-1 | `src/features/academic-status/AcademicStatusView.tsx` | `persist()` 에 `syncFields` 파라미터 추가. 현재 학기 저장 시 `enrollmentStatus` 자동 동기화 |
| B-1 | `src/app/api/cron/semester-start-reminder/route.ts` | `targets` 필터에 `role !== "alumni" && enrollmentStatus !== "graduated"` 추가 |
| B-2 | `src/app/courses/page.tsx` | `defaultSemesterForToday()` 헬퍼 도입. D-1~D-14 개강 윈도에서 신학기 기본값 승격 |
| B-3 | `src/components/academic-status/AcademicStatusCampaignGate.tsx` | 졸업생·alumni 팝업 제외 + D-14~D+14 개강 윈도 자동 라이브 폴백 |
| B-4 | `src/app/api/cron/weekly-digest/route.ts` | 공통 0건이면 승인 회원 유무 확인 후 개인 블록 발송 계속 |

## A-1 상세

`AcademicStatusView.tsx`:
- `EnrollmentStatus` 타입 import 추가
- `STATUS_TO_ENROLLMENT` 매핑 상수: `enrolled→enrolled`, `on_leave→on_leave`, `expected_graduation→enrolled`, `completed→graduated`, `graduated→graduated`
- `persist(nextHistory, syncFields, successMsg)` — 세 번째 인자로 재서명
- `onSubmit()`: `semester === cur` 이면 `{ enrollmentStatus: STATUS_TO_ENROLLMENT[status] }` 동기화
- `onDelete()`: `syncFields = {}` (이력 삭제 시 enrollmentStatus 변경 없음)

하위호환: 이력만 있고 저장 학기가 현재 학기가 아닌 경우 `enrollmentStatus` 불변 — 기존 데이터에 영향 없음.

## B-1 상세

`semester-start-reminder/route.ts` 라인 74~82:
- `usersSnap.docs.filter()` 에 `role !== "alumni" && enrollmentStatus !== "graduated"` 추가
- KickoffBanner(`:43`) 와 동일 기준. 신입 온보딩 분기는 별도 필터(`cohortKeyOf`)를 사용하므로 영향 없음.

## B-2 상세

`courses/page.tsx`:
- `defaultSemesterForToday()` 헬퍼 추가: 다음 학기 개강일(전기→9/1, 후기→3/1)까지 1~14일이면 신학기 `{ year, term }` 반환
- `nowYear()`, `defaultTermForToday()` 모두 헬퍼에서 파생 → `year`/`term` 초기값 동기화 보장
- D-15 이상이면 기존 `inferCurrentSemester()` 결과와 동일

## B-3 상세

`AcademicStatusCampaignGate.tsx`:
- `compareSemesterKeyDesc` import 추가
- `autoLive`: 관례 개강일(3/1·9/1) 기준 D-14~D+14이면 true — 수동 설정 `isCampaignLive` 와 OR
- `isGraduatedOrAlumni`: `role === "alumni"` 또는 최신 이력 `status === "graduated"` → 팝업 영구 미노출
- useEffect 조건: `|| isGraduatedOrAlumni` 추가, 의존 배열에도 포함

## B-4 상세

`weekly-digest/route.ts` 라인 957~960:
- 공통 4종 0건 → `db.collection("users").where("approved","==",true).limit(1)` 조회
- 회원 0명: 기존과 동일하게 스킵
- 회원 있음: 개인 블록(재유입 제안·미읽음 카운트)으로 발송 계속

## 검증

- `npx tsc --noEmit` → 에러 0
- `npx eslint ... --quiet` → 실행 중
- build·commit 금지
