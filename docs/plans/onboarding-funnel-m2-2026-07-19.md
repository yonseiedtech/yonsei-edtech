# M2 온보딩·진단 퍼널 전환 측정 — 구현 내역 (2026-07-19)

> 계획 원문: service-enhancement-plan-v6-2026-07-18.md §M2

---

## 1. 이벤트 규약

### 이벤트 경로 (user_activity_logs.path)

| 경로 | 의미 | 발화 조건 |
|---|---|---|
| `ui:onboarding/enter` | 온보딩 페이지 진입 | 로그인 상태 + 데이터 로드 완료, 세션 1회 |
| `ui:onboarding/progress` | 첫 체크리스트 항목 완료 | 항목을 처음 체크할 때, 세션 1회 |
| `ui:onboarding/complete` | 전체 체크리스트 완료 | 마지막 항목 체크 시 doneCount === totalCount, 세션 1회 |
| `ui:diagnostic/start` | 진단 랜딩 진입 | 로그인 + 문항 로드 완료, 세션 1회 |
| `ui:diagnostic/q1` | 문항 풀이 시작 | handleStart/handleStartCustom 호출 직후, 세션 1회 |
| `ui:diagnostic/complete` | 전체 문항 제출 | handleComplete 호출 시 채점 완료 직후, 세션 1회 |
| `ui:diagnostic/report` | 리포트 열람 | setPhase("report") 직후, 세션 1회 |

### 공통 필드 (user_activity_logs 문서)

```
userId      string    — 로그인 회원 ID (미로그인 시 기록 안 함)
path        string    — ui:onboarding/{event} | ui:diagnostic/{event}
pathGroup   string    — "ui" (editor-telemetry 패턴 동일)
pathLabel   string    — 한글 레이블 (예: "온보딩 · 온보딩 진입")
funnelType  string    — "onboarding" | "diagnostic"  ← 집계 쿼리용 신규 필드
createdAt   string    — ISO 8601 (new Date().toISOString())
```

### 중복 방지

- 모듈 수준 `Set<string>` (`funnelType:event` 키)로 세션 내 이벤트별 1회만 기록
- 취소(항목 체크 해제)는 기록하지 않음 (`wasCompleted` 플래그로 구분)

---

## 2. 집계 방식

### 쿼리

FunnelSection.tsx 에서 Firestore 직접 쿼리:

```typescript
// funnelType 단일 필드 인덱스(자동 생성) 사용
where("funnelType", "==", "onboarding"), limit(500)
where("funnelType", "==", "diagnostic"), limit(500)
```

- 복합 인덱스 없이 단일 필드 인덱스만 사용 (Firestore 자동 생성)
- 최근 30일 필터는 클라이언트에서 `createdAt >= thirtyDaysAgoISO` 문자열 비교

### 집계 로직

1. path 별로 고유 userId Set 구성 → `.size` = 단계별 고유 회원 수
2. 전환율 = 현재 단계 / 이전 단계 × 100%
3. 최대 이탈 지점 = 단계 간 감소폭(이전−현재)이 가장 큰 단계

---

## 3. Firestore rules 필요 여부

**변경 불필요.** 기존 user_activity_logs 규칙으로 충분:

- **write**: `request.auth.uid == resource.data.userId` — 로그인 회원이 자신의 데이터 기록 ✓
- **read**: admin/staff 전용 — FunnelSection은 admin 콘솔에서만 노출 ✓
- `funnelType` 신규 필드는 규칙이 필드 내용을 검증하지 않으므로 write 가능 ✓

---

## 4. 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/funnel-telemetry.ts` | 신규 — 세션 중복 방지 + fire-and-forget 적재 함수 |
| `src/features/insights/FunnelSection.tsx` | 신규 — 퍼널 집계·시각화 컴포넌트 |
| `src/app/steppingstone/onboarding/page.tsx` | import + enter useEffect + toggle 내 progress/complete 로그 |
| `src/app/diagnosis/page.tsx` | import + start useEffect + handleStart q1 + handleComplete complete/report |
| `src/app/admin/insights/page.tsx` | FunnelSection 동적 임포트 + opkpi 탭에 섹션 추가 |

---

## 5. 검증

- `npx tsc --noEmit` → 에러 0
- `npx eslint src/lib/funnel-telemetry.ts src/features/insights/FunnelSection.tsx src/app/steppingstone/onboarding/page.tsx src/app/diagnosis/page.tsx src/app/admin/insights/page.tsx --quiet` → 에러 0
