# yonsei-edtech 테스트 커버리지 보강 계획

> 작성일: 2026-05-12 | 상태: 확정 대기

## 배경

- 서비스 감사에서 "테스트 파일 4개만 존재"가 Top 3 약점으로 진단
- 기존 테스트: `permissions.test.ts`, `api-validators.test.ts`, `legal.test.ts`, `build-network.test.ts`
- vitest 설정 완비 (vitest.config.ts, `@` alias, node 환경)
- 코드베이스: 100+ 라우트, 40+ Firestore 컬렉션, 23개 도메인 타입

---

## Phase 1: Vitest 단위 테스트 5건 (우선순위순)

### 1-1. `src/lib/__tests__/semester.test.ts`

**대상 파일:** `src/lib/semester.ts`
**대상 함수:** `inferCurrentSemester`, `semesterRange`, `monthRangeDays`, `enrollmentYearRanges`

**우선순위 근거:** 학기 계산은 회원 기수, 통계 필터, 활동 기간 등 10+ 모듈에서 참조. 경계값 오류가 전체 데이터 집계를 왜곡.

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|---|---|---|
| 1 | 3월 = 전기 | `new Date(2026, 2, 15)` | `{ year: 2026, semester: "first" }` |
| 2 | 1월 = 작년 후기 | `new Date(2026, 0, 10)` | `{ year: 2025, semester: "second" }` |
| 3 | 후기 범위 연도 넘김 | `semesterRange(2025, "second")` | `{ from: "2025-09", to: "2026-02" }` |
| 4 | monthRangeDays 역순 = 0 | `monthRangeDays("2026-06", "2026-01")` | `0` |
| 5 | enrollmentYearRanges 전기 입학 2년차 | `enrollmentYearRanges(2024, 1, new Date(2026, 5, 1))` | 배열 길이 2, 1년차 `from: "2024-03"`, 2년차 `from: "2025-03"` |

---

### 1-2. `src/lib/auth/__tests__/approval-rules.test.ts`

**대상 파일:** `src/lib/auth/approval-rules.ts`
**대상 함수:** `evaluateSignup`, `partitionPending`

**우선순위 근거:** 자동 승인 판정 오류 시 미인가 사용자가 시스템 접근하거나, 정상 사용자가 가입 차단됨. 보안 + 운영 영향도 최상.

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|---|---|---|
| 1 | 정상 yonsei.ac.kr 가입 | name="홍길동", email="hong@yonsei.ac.kr", studentId="2024123" | `qualifying: true, risk: "low"` |
| 2 | 외부 도메인만 불일치 | email="hong@gmail.com" (나머지 정상) | `qualifying: false, risk: "medium"` |
| 3 | 이름 1자 + 학번 없음 | name="홍", studentId=undefined | `reasons` 2개 이상, `risk: "high"` |
| 4 | 학번 중복 (approved 기존 회원) | studentId="2024123", allUsers에 동일 학번 approved 회원 | `reasons`에 "학번 중복" 포함 |
| 5 | partitionPending 분류 | pending 3명 (정상1, 외부도메인1, 이름부족1) | `qualifying` 배열 1명, `risky` 배열 2명 |

---

### 1-3. `src/features/insights/__tests__/computeMemberMetrics.test.ts`

**대상 파일:** `src/features/insights/computeMemberMetrics.ts`
**대상 함수:** `computeMemberMetrics`

**우선순위 근거:** 회원 로얄티 점수(0-100)가 챔피언/활성/주의/휴면/신규 분류와 운영진 저활동 경보를 결정. 산식 오류가 운영 대시보드 전체를 오도.

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|---|---|---|
| 1 | 만점(100) 케이스 | attendance=5, activity=3, post=4, comment=8, interview=4, studyMin=3000, writing=5000, proposal=true, gradLife=1, semReview=3, courseReview=2, role=staff | `loyaltyScore: 100`, `segment: "champion"` |
| 2 | 완전 무활동 멤버 | 모든 카운트 0, role=member, createdAt 60일 전 | `loyaltyScore: 0`, `segment: "dormant"` |
| 3 | 신규 가입 30일 이내 | createdAt 15일 전, 약간의 활동 | `segment: "new"` (점수 무관) |
| 4 | staff 저활동 경보 | role=staff, loyaltyScore < 30 | `staffLowActivity: true` |
| 5 | 카테고리별 cap 검증 | attendance=100 (cap 15), post=100 (cap 12) | `scoreBreakdown.engagement <= 30`, `scoreBreakdown.content <= 25` |

---

### 1-4. `src/lib/__tests__/courseSchedule.test.ts`

**대상 파일:** `src/lib/courseSchedule.ts`
**대상 함수:** `parseSchedule`, `normalizePeriodSchedule`, `fmtTimeRange`

**우선순위 근거:** 자유 텍스트 파싱은 엣지 케이스가 다양하고, 강의 시간표 전체 렌더링 및 주차 계산에 직접 영향. 교시→시각 변환 오류 시 수업 알림 시간이 잘못됨.

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|---|---|---|
| 1 | 표준 형식 | `"월 18:30-21:00"` | `weekdays: [1], startMin: 1110, endMin: 1260` |
| 2 | 복수 요일 | `"월수 19:00~21:30"` | `weekdays: [1, 3]` |
| 3 | 교시 표기 폴백 | `"목 1,2교시"` | `startMin: 1100, endMin: 1200` (18:20~20:00) |
| 4 | 빈 입력 | `undefined` | `{ weekdays: [], startMin: null, endMin: null }` |
| 5 | normalizePeriodSchedule | `"월 3·4교시"` | `"월 20:10~21:50"` (HH:MM 변환) |

---

### 1-5. `src/lib/__tests__/research-stats.test.ts`

**대상 파일:** `src/lib/research-stats.ts`
**대상 함수:** `computeLongestStreak`, `computeWritingDays`, `computeParticipationRate`, `computeReadingStats`

**우선순위 근거:** 연구 통계는 회원 마이페이지와 관리자 대시보드에 동시 노출. 연속 작성일(streak) 계산은 날짜 정렬·86400000ms 비교 등 버그 가능성 높음. 참여율 계산의 0 나누기 방어도 중요.

| # | 테스트 케이스 | 입력 | 기대 출력 |
|---|---|---|---|
| 1 | streak 연속 3일 | savedAt: "2026-05-01", "2026-05-02", "2026-05-03" | `computeLongestStreak: 3` |
| 2 | streak 중간 1일 빠짐 | savedAt: "2026-05-01", "2026-05-03" | `computeLongestStreak: 1` |
| 3 | writingDays 동일 날짜 중복 | 같은 날짜 3회 저장 | `computeWritingDays: 1` |
| 4 | participationRate 빈 히스토리 | `[]` | `0` (0 나누기 방어) |
| 5 | readingStats 기간 필터 | papers 5개 중 periodStart~End 안에 3개 | `total: 3` |

---

## Phase 2: E2E 테스트 (Playwright) MVP 시나리오 5건

### 사전 작업
- `playwright.config.ts` 추가, `@playwright/test` 설치
- 테스트용 Firebase 에뮬레이터 또는 스테이징 환경 세팅
- 테스트 전용 시드 데이터 스크립트 작성

### 시나리오 목록

| # | 시나리오 | 핵심 검증 포인트 |
|---|---|---|
| E1 | **회원가입 → 약관동의 → 프로필 작성** | 필수약관 3종 동의 → 프로필 폼 제출 → 가입 대기 상태 확인 |
| E2 | **로그인 → 세미나 목록 → 참가 신청** | 로그인 후 upcoming 세미나 표시 → 참가 버튼 클릭 → 참석자 목록에 본인 표시 |
| E3 | **세미나 체크인 (QR)** | 세미나 상세 → QR 체크인 → checkedIn 상태 반영 확인 |
| E4 | **세미나 후기 작성** | 완료된 세미나 → 후기 폼 진입 → 텍스트 입력 → 제출 → 후기 목록에 노출 |
| E5 | **수료증 조회 및 다운로드** | 마이페이지 → 수료증 탭 → 발급된 수료증 확인 → PDF 다운로드 트리거 확인 |

---

## Phase 3: 도입 순서 및 예상 소요 시간

| 단계 | 작업 | 예상 소요 | 누적 |
|---|---|---|---|
| **Step 1** | semester.test.ts + approval-rules.test.ts | 2시간 | 2시간 |
| **Step 2** | computeMemberMetrics.test.ts | 1.5시간 | 3.5시간 |
| **Step 3** | courseSchedule.test.ts + research-stats.test.ts | 2시간 | 5.5시간 |
| **Step 4** | Playwright 설정 + E1~E2 시나리오 | 4시간 | 9.5시간 |
| **Step 5** | E3~E5 시나리오 | 3시간 | 12.5시간 |
| **Step 6** | CI 파이프라인 연동 (vitest + playwright) | 1.5시간 | 14시간 |

**총 예상: 약 14시간 (2~3일 스프린트)**

---

## 수용 기준

- [ ] vitest 단위 테스트 9개 파일 (기존 4 + 신규 5), 전체 `npm test` 통과
- [ ] 각 신규 테스트 파일당 최소 5개 테스트 케이스
- [ ] E2E 시나리오 5건 `npx playwright test` 통과
- [ ] 기존 `npm run build` 깨지지 않음

---

## Guardrails

**Must NOT:**
- 기존 4개 테스트 파일 수정/삭제하지 않음
- 프로덕션 코드 변경 없이 테스트만 추가 (코드 변경이 필요하면 별도 PR)
- E2E에서 프로덕션 DB 접근 금지 (에뮬레이터/스테이징만)
- 외부 네트워크 의존 테스트 작성 금지 (AI API, Resend 등 mock 처리)
