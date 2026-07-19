# v8 트랙 A 구현 보고서 — H1 cron 실패 능동 경보 · M6 cron_runs 보존 편입

> 작성일: 2026-07-20 · 구현자: executor

---

## H1 — cron 실패 능동 경보

### 구현 파일

| 파일 | 변경 | 내용 |
|---|---|---|
| `src/app/api/cron/cron-watchdog/route.ts` | **신규** | cron 실패 감지 + admin 알림 발송 |
| `vercel.json` | 추가 | `/api/cron/cron-watchdog` 스케줄 등록 |

### 동작 방식

1. `cron_runs` 컬렉션에서 최신 500건 조회 (`startedAt` desc)
2. kind별 그룹핑 → 최신순 순회해 **연속 실패 수 카운트**
3. `consecutiveFailures >= 2` 인 kind를 경보 대상으로 선정
4. `users` 컬렉션에서 `role == "admin"` + `role == "sysadmin"` 병렬 쿼리
5. `notifications` 컬렉션에 `type: "cron_watchdog"`, `refId: watchdog_{kind}_{ymd}` 배치 저장
6. `withCronLog("cron-watchdog", _handler)` 로 자체 실행도 `cron_runs` 에 기록

### dedup 보장

- `notifications.refId = watchdog_{kind}_{YYYY-MM-DD}` (KST 기준)
- kind별 하루 1회 이상 발송 없음 — 기존 notifications 컬렉션 패턴 그대로

### stale(침묵) 감지 생략 사유

계획서 §H1 "(b) 스케줄상 실행됐어야 하는데 최근 실행 기록이 없는 kind — 어려우면 (a)만, 보고서에 명시" 를 따름.

vercel.json 의 cron schedule(cron 표현식 문자열)을 파싱해 "예상 마지막 실행 시각"을 계산하고 `cron_runs` 의 실제 `lastRunAt` 과 비교하려면 cron-parser 외부 라이브러리가 필요하거나 직접 구현해야 함. 현재 프로젝트에 해당 라이브러리가 없어 불필요한 의존성 추가를 피하고 **(a) 연속 실패 감지만 구현**함.

### 스케줄

```json
{ "path": "/api/cron/cron-watchdog", "schedule": "0 4 * * *" }
```

04:00 UTC = 13:00 KST — 기존 `0 0`, `0 1`, `0 3`, `0 6`, `0 13`, `30 15` 와 비중복.

---

## M6 — cron_runs 보존 편입

### 구현 파일

| 파일 | 변경 | 내용 |
|---|---|---|
| `src/app/api/cron/analytics-retention/route.ts` | 수정 | `cron_runs` 90일 초과 삭제 대상 추가 |
| `src/app/console/cron-logs/page.tsx` | 수정 | `RETENTION_TARGETS` + `RetentionCounts` 에 `cron_runs` 행 추가 |

### 변경 내용

**analytics-retention/route.ts**
- `cutoff90Iso = new Date(now - 90 * 86_400_000).toISOString()` 기준일 추가
- `Promise.all` 에 `cron_runs.where("createdAt", "<", cutoff90Iso).limit(BATCH_LIMIT)` 추가
- `counts` 객체에 `cron_runs: cronRunsSnap.size` 추가
- 삭제 루프 배열에 `cronRunsSnap` 포함

**cron-logs/page.tsx**
- `RetentionCounts` 인터페이스에 `cron_runs: number` 추가
- `RETENTION_TARGETS` 배열에 `{ collection: "cron_runs", label: "cron 실행 기록", period: "90일 초과" }` 추가

### vercel.json 스케줄 등록 금지 준수

계획서 "vercel.json에 analytics-retention 스케줄 등록은 계속 금지(사용자 결정 대기 중 — 코드만)" 그대로 유지.

---

## 검증

- `npx tsc --noEmit` → 에러 0건
- `npx eslint src/app/api/cron/cron-watchdog/route.ts src/app/api/cron/analytics-retention/route.ts src/app/console/cron-logs/page.tsx --quiet` → 경고 0건
- build·commit 금지 규율 준수

---

## 수정 금지 영역 준수 확인

- `src/features/dashboard/**` — 미수정
- `src/features/hackathon/**` — 미수정
- `src/app/hackathon/**` — 미수정
- `src/app/academic-admin/**` — 미수정
- `src/features/onboarding/**` — 미수정
