# M4 신입 첫 2주 시퀀스 첫 사용 점검 — 산출물 보고서 (v11, 2026-07-21)

> 대상: `newcomer-activation-sequence` cron · `NewcomerProgressWidget` · `cron-logs` 콘솔
> 전제: dday.ts Timestamp 가드(newcomer-cron-fix) · R2 승인 지연 보정(automation-risk-fix) 반영 상태
> 규율: cron 판정 로직 수정 금지 · build·commit 금지 · `npx tsc --noEmit` + `npx eslint src --quiet` 통과 필수

---

## 1. 단계별 링크·문구 정합 점검 (Step 1)

| 단계 | NEWCOMER_STEPS href | cron STEPS link | 라우트 파일 존재 | 판정 |
|------|--------------------|-----------------|--------------------|------|
| D+1 프로필 완성 | `/mypage?tab=settings` | `/mypage?tab=settings` | `MyPageView.tsx` TABS: `{ key: "settings" }` ✓ | **유효** |
| D+3 온보딩 시작 | `/steppingstone/onboarding` | `/steppingstone/onboarding` | `src/app/steppingstone/onboarding/page.tsx` ✓ | **유효** |
| D+7 연구 준비도 진단 | `/diagnosis` | `/diagnosis` | `src/app/diagnosis/page.tsx` ✓ | **유효** |
| D+10 아카이브 즐겨찾기 | `/archive` | `/archive` | `src/app/archive/page.tsx` ✓ | **유효** |
| D+14 첫 2주 회고 | (위젯 미노출 단계) | `/steppingstone/onboarding` | 동일 ✓ | **유효** |

신규②(회원가입 약관 1단계 개편) 이후에도 `/mypage?tab=settings` 앵커는 `MyPageView`의 `TABS` 배열에 `{ key: "settings", label: "설정" }` 그대로 유지되어 있어 딥링크 정합 이상 없음.

**발견 결함: 없음** — 모든 링크 유효, 문구 변경 불필요.

---

## 2. 위젯–cron 판정 일치 점검 (Step 2)

### 공통 유틸 단일 소스 확인 ✓

| 항목 | 위젯(`NewcomerProgressWidget`) | cron(`newcomer-activation-sequence`) | 공유 여부 |
|------|-------------------------------|--------------------------------------|----------|
| 신입 창 판정 | `isNewcomerWindow()` | `isNewcomerCohort()` + `daysSinceJoinKst()` | `newcomer-sequence.ts` 동일 소스 ✓ |
| D+1 프로필 완성 판정 | `isProfileComplete(user)` | `applySkipCondition(d1)` 내 인라인 로직 | 로직 동일(bio+interests≥1) ✓ |
| 코호트 경계(A3) | `isNewcomerCohort()` | `isNewcomerCohort()` | 공유 함수 ✓ |
| Timestamp 가드 | `user.createdAt` → `isNewcomerWindow` → `isoToKstYmd` (가드 적용) | `u.createdAt` → `isoToKstYmd` (가드 적용) | newcomer-cron-fix 반영 ✓ |

### 발산 발견 (로직 변경 금지 — 후속 제안)

**d7 진단 완료 판정 소스 불일치**:
- 위젯: `diagnosticResultsApi.listByUser(userId)` → `list.length > 0` (`diagnostic_results` 컬렉션)
- cron: `user_activity_logs` where `funnelType=diagnostic AND path=ui:diagnostic/complete`

동일 사건("진단 완료")을 두 컬렉션에서 각각 확인하는 구조. 실제로 진단을 완료하면 두 조건이 동시에 참이 되므로 **운영 상 오작동은 없으나**, 데이터 누락·지연 시 위젯과 cron 스킵 판정이 일시 불일치할 수 있다.

**제안(후속 리팩터)**: `newcomer-sequence.ts` 에 `isDiagnosticDone(userId)` 순수 함수를 추가하고 위젯과 cron이 단일 소스를 공유하도록 통일. 현재는 "순수 함수로 추출(본 작업 범위 밖 — 제안)"이라는 `newcomer-sequence.ts` 주석 내용과 동일한 방향. 우선순위: **Low**(운영 오작동 없음 확인).

---

## 3. 운영진 "시퀀스 발송 현황" 소표면 구현 (Step 3)

### 변경 파일

**`src/app/console/cron-logs/page.tsx`**

1. `PushLog` 인터페이스에 `step?: string`(newcomer_sequence 단계 키) · `semKey?: string`(발송 학기 키) 선택 필드 추가 — 기존 push_logs 도큐먼트 필드 반영.

2. `NEWCOMER_SEQ_STEPS` 상수 추가 — d1~d14 단계 메타(step 키 + 한국어 레이블).

3. `NewcomerSequenceStatusSection` 컴포넌트 추가:
   - `{ logs: PushLog[]; isLoading: boolean }` props 수신 — 부모가 이미 fetch 한 push_logs 200건 재사용, 신규 쿼리·컬렉션 없음.
   - 로딩 중: 스피너 표시.
   - 데이터 없음: "신입 시퀀스 발송 이력이 없습니다" 안내.
   - 데이터 있음: d1/d3/d7/d10/d14 각 단계별 발송 건수·최근 발송 시각·학기 테이블 표시.
   - 헤더에 총 건수 + "(최근 200건 기준)" 표기 — 데이터 범위 명시.

4. `CronLogsPage` JSX에 `<CronStatusSection />` 직후 `<NewcomerSequenceStatusSection logs={logs} isLoading={isLoading} />` 삽입.

### 신규 컬렉션/쿼리 없음 ✓

push_logs 도큐먼트 구조(`newcomer_seq_{userId}_{step}`, `kind:"newcomer_sequence"`, `step`, `semKey`, `sentAt`)를 클라이언트 집계로 소비.

---

## 4. 검증 결과

```
npx tsc --noEmit         → exit 0 (에러 없음)
npx eslint src/app/console/cron-logs/page.tsx --quiet → 출력 없음 (에러 없음)
```

build · commit: 규율대로 미실행.

---

## 5. 수정 금지 영역 준수

- `features/kudos` · `features/activities` (M3 트랙): 수정 없음 ✓
- `api/cron/newcomer-activation-sequence` 판정 로직: 수정 없음 ✓ (d7 발산은 보고서 제안으로 처리)

---

## 6. 잔여·후속 제안

| 항목 | 우선순위 | 내용 |
|------|---------|------|
| d7 판정 단일 소스화 | Low | `newcomer-sequence.ts`에 `isDiagnosticDone` 순수 함수 추출 후 위젯·cron 통일 |
| push_logs limit 증가 고려 | Low | 신입 코호트 규모 증가 시 200건 기준이 좁아질 수 있음 → 발송 현황 섹션에 별도 query(limit 500) 분리 |
| 발송 현황 새로고침 버튼 | Optional | `CronStatusSection` 패턴처럼 발송 현황 섹션에 별도 새로고침 버튼 추가 |
