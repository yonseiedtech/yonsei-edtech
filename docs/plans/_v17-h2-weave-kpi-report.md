# v17-H2 연결 지표(Weave KPI) 구현 보고서

> 항목: docs/plans/service-enhancement-plan-v17.md H2 "v16 연결고리 전환·리텐션 측정 대시보드"
> 구현일: 2026-07-27 · 담당: executor
> 요약: 운영진 인사이트에 "연결 지표(Weave KPI)" 탭 신설 — v16 연결고리(가이드 완독·수요→개설 전환·진단 후속행동)를 한 장에서 읽기 집계. DB/rules 무변경, 신규 cron 없음.

---

## 1. 변경/신규 파일 목록과 역할

| 파일 | 신규/변경 | 역할 |
|---|---|---|
| `src/features/insights/weave-metrics.ts` | **신규** | 러닝 가이드 진행/완독 서버 집계 로직(`computeWeaveGuides`). `guide_pages`로 가이드별 총 페이지 수를 만들고 `learning_guide_progress` 문서의 읽은 페이지 수와 비교해 시작·완독·완독률 산출. Admin SDK 전용. `adoption-metrics.ts` 컨벤션 준용(인터페이스+compute 함수). |
| `src/app/api/console/weave/route.ts` | **신규** | `GET /api/console/weave` — `requireAuth(req,"staff")` 게이트 후 `computeWeaveGuides` 호출, 60초 private 캐시. adoption 라우트 패턴 동일. |
| `src/features/insights/WeaveKpiSection.tsx` | **신규** | "연결 지표" 패널 클라이언트 컴포넌트. (a) 가이드 진행/완독은 위 서버 API, (b) 수요→개설 전환·(c) 진단 후속행동은 staff 클라이언트 읽기로 집계·렌더. `isAtLeast(user,"staff")` 가드 포함. |
| `src/app/admin/insights/page.tsx` | **변경(최소)** | 탭 1개 추가 — dynamic import + `SubTab`에 `"weave"` + `TabsTrigger`("연결 지표") + `TabsContent`(`<WeaveKpiSection/>`). 이 파일은 `/console/insights`·`/admin/insights` 양쪽에 서빙되므로 콘솔 네비 추가가 이 1파일로 완결. |

> 콘솔 진입 경로: `/console/insights?view=weave` (기존 인사이트 탭 구조에 편입 — 별도 나열/가드 중복 없이 `console/layout` AuthGuard + 패널 자체 staff 가드로 이중 보호).

---

## 2. 재사용한 기존 자산

- **인사이트 탭 셸**: `src/app/admin/insights/page.tsx`의 `dynamic()` + shadcn `Tabs` 패턴을 그대로 따라 신규 탭 편입(별도 페이지·나비 신설 회피).
- **집계 라우트 패턴**: `src/app/api/console/adoption/route.ts` + `src/features/insights/adoption-metrics.ts`의 (인터페이스+compute 함수+`requireAuth` staff + 60초 캐시) 구조 복제.
- **인증 헬퍼**: `requireAuth`(`src/lib/api-auth.ts`), 클라이언트 토큰 fetch는 `AdoptionSection.tsx` 방식(`auth.currentUser.getIdToken()`).
- **수요 집계**: `commBoardsApi.listByContext("demand", DEMAND_CONTEXT_ID)` + `commQuestionsApi.listByBoard`(demand 콘솔 페이지와 동일 쿼리)와 퍼널 단계 정의(`collecting/reviewing/leader/designing/opened`)·`stageOf` 판정 로직 복제.
- **진단 집계**: `diagnosticResultsApi.listAll(2000)`(staff 읽기 허용) + `DiagnosticInsightsView.tsx`의 "회원당 최신 1건 → 약점 개념 빈도" 집계 방식 복제.
- **완독 판정 소스**: `learning_guide_progress`(`readPageIds`) + `guide_pages` — `LearningGuideProgress` 타입엔 progress 필드가 없어 `readPageIds.length >= guide 총 페이지 수`로 "진행률 100%"를 판정.
- **UI 토큰/컴포넌트**: `cn`, 시맨틱 색(`text-primary`/`text-success`/`text-warning`/`text-muted-foreground`/`bg-card`/`border-*`), 퍼널 카드 마크업(demand 콘솔과 시각 일관).

---

## 3. 각 KPI 집계 로직 요약

### (a) 러닝 가이드 진행/완독 — 서버(`computeWeaveGuides`)
1. `guide_pages` 전량(≤5000) 읽어 `guideId → 페이지 수` 맵 생성.
2. `learning_guide_progress` 전량(≤5000) 순회:
   - `readPageIds.length > 0` → **시작(started)** +1.
   - 해당 가이드 총 페이지 수 `total>0` 이고 `readPageIds.length >= total` → **완독(completed)** +1.
3. **완독률** = `round(completed/started*100)`, `started===0`이면 `null`(→ "데이터 부족").
4. `guidesWithPages` = 페이지 보유 가이드 수(분모 신뢰도 참고).

### (b) 수요 → 개설 전환 — 클라이언트
- demand 보드의 스터디 수요(`presenter === "스터디 희망"`)만 모집단으로, 단계별(`collecting/reviewing/leader/designing/opened`) 건수 분포 산출(퍼널 카드).
- **전환율** = `round(opened/total*100)`, `total===0`이면 `null`(→ "데이터 부족").

### (c) 진단 후속행동 — 클라이언트
- `diagnosticResultsApi.listAll` 전량에서 **누적 응시 건수(attempts)** = 전체 문서 수.
- **응시 회원(members)** = 회원당 최신 1건 dedupe 후 고유 회원 수.
- **약점 태그 분포** = 회원 최신 진단의 `weakConceptNames`를 회원당 중복 제거 후 빈도 집계 → Top 10("N명").
- (클릭 이벤트 실측 로깅은 계획서 X2 외부 의존이라 범위 밖 — 초기엔 완료 수·약점 분포만.)

### 안전 표시
- 세 블록 모두 표본 0/`null`이면 크래시 없이 "데이터 부족" 레이블. `?? []`·`?? null`·optional chaining으로 undefined 방어.
- 양호/주의 뱃지(`ToneBadge`)는 색만이 아니라 **텍스트 병기**(a11y). 완독률 goodAt=40%, 전환율 goodAt=25% — 계획서 §6대로 실데이터 도래 시 재보정 대상(초기 기준선).

---

## 4. 엄격 제약 준수

- **DB/rules 무변경**: 읽기 집계만. firestore.rules 미수정. 신규 컬렉션·필드 없음, 신규 cron 없음.
- **운영진 전용**: 서버 라우트 `requireAuth(...,"staff")` + 패널 `isAtLeast(user,"staff")` 가드(미달 시 접근 차단 메시지).
- **시맨틱 토큰만**: raw hex 0 (rawcolor ratchet PASS). 기존 코드의 시맨틱 팔레트만 사용.
- **충돌 회피**: H1 점유 파일(`types/networking.ts`·`app/staff/page.tsx`·`app/gatherings/page.tsx`·`StaffMeetingPollTab.tsx`) 미접촉.
- **no-explicit-any 0 · array index key 0 · exhaustive-deps 정확**: `useMemo` 의존성 정확 명시, 구체 타입만 사용, key는 안정 식별자(`s`/`t.name`) 사용.

---

## 5. 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **PASS** (exit 0, 에러 0) |
| 린트 | `npx eslint src/features/insights/weave-metrics.ts src/features/insights/WeaveKpiSection.tsx src/app/api/console/weave/route.ts src/app/admin/insights/page.tsx` | **PASS** (경고/에러 0 — 무출력) |
| rawcolor 래칫 | `node scripts/check-rawcolor-ratchet.mjs` | **PASS** (1개 / 상한 1개 — 변동 없음) |

> build는 요청대로 미실행(메인 게이트에서 별도 수행 — 동시 build 충돌 방지).

---

## 6. 후속(범위 밖 · 참고)

- 진단→가이드 **실클릭 전환율**은 계획서 X2(경량 이벤트 로깅) 도입 후 (c)에 추가.
- 완독률/전환율 양호 기준선(40%/25%)은 §6 데이터 대기 항목 — 개설 3건+·신학기 코호트 누적 후 재보정.
- M4(완독 직후 다음행동 CTA)와 완독 판정 기준(`readPageIds.length >= 총 페이지`)을 공유하므로, M4 착수 시 본 판정 로직 참조.
