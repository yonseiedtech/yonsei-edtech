# v9-M1 구현 보고서 — cron-watchdog stale(침묵) 감지 완결

> 작성일: 2026-07-20 · 구현자: executor

---

## 구현 파일

| 파일 | 변경 | 내용 |
|---|---|---|
| `src/lib/cron-stale.ts` | **신규** | vercel.json → kind별 maxIntervalMs 공유 유틸 |
| `src/app/api/cron/cron-watchdog/route.ts` | 수정 | stale 감지 + 알림 추가 (v8-H1 + v9-M1 통합) |
| `src/app/api/console/cron-runs/route.ts` | 수정 | KindStatus에 `isStale: boolean` 추가 |
| `src/app/console/cron-logs/page.tsx` | 수정 | stale 배너 + 배지 (CronStatusSection 소수정) |

---

## 동작 방식

### 1. `src/lib/cron-stale.ts` — 공유 유틸 (단일 소스)

- `vercel.json`을 직접 import (빌드타임, 단일 소스).
- cron 표현식의 **5번째 필드(day-of-week)** 만으로 주기 구분:
  - `dow = "*"` → daily → **25h** 최대 기대 간격
  - `dow ≠ "*"` → weekly → **8일** 최대 기대 간격
- `CRON_KIND_INTERVALS: ReadonlyMap<string, number>` — kind → maxIntervalMs
- `isStaleKind(kind, lastRunAtIso)` — elapsed > maxMs × 2 시 true

### 2. `cron-watchdog/route.ts` — stale 감지 추가

기존 연속 실패 감지에 stale 감지를 추가했다. 동작 순서:

1. `cron_runs` 최근 500건 조회 → `byKind` 맵 구성 (기존 동일).
2. **[v8-H1]** 연속 2회+ 실패 kind 감지 (기존 동일).
3. **[v9-M1]** `CRON_KIND_INTERVALS` 순회:
   - `cron-watchdog` 자기 자신 → 스킵 (자기보고 불가)
   - `byKind`에 기록 없는 kind → **스킵** (오탐 방지 — 관측 도입 전 케이스)
   - `isStaleKind()` true → `staleKinds` 추가
4. 두 집합 모두 빈 경우 → 조기 반환 `"no issues detected"`.
5. admin/sysadmin 조회 → dedup 확인 → 알림 배치 발송:
   - 연속 실패: `refId = watchdog_{kind}_{ymd}`
   - stale 침묵: `refId = stale_{kind}_{ymd}` (**별도 dedup**)
6. 알림 메시지 구분:
   - 연속 실패: `"N회 연속 실패했습니다"`
   - stale: `"Nh째 실행 기록이 없습니다(침묵)"`

### 3. `/api/console/cron-runs/route.ts` — `isStale` 반환

- `KindStatus` 인터페이스에 `isStale: boolean` 추가.
- `isStaleKind(kind, latest.startedAt)` 호출로 서버 사이드 계산 후 응답에 포함.
- 클라이언트는 API 응답에서 `isStale` 읽음 — 중복 계산 없음.

### 4. `cron-logs/page.tsx` — UI 표시 (CronStatusSection 소수정)

- **stale 배너**: 연속 실패 배너 아래 amber 계열 배너 추가. 이미 연속 실패로 표시된 kind(`consecutiveFailures >= 2`)는 stale 배너에서 제외 (중복 방지).
- **테이블 배지**: "마지막 실행" 열에 `isStale` 시 `stale` amber 배지 인라인 표시.
- `Clock` 아이콘 import 추가.

---

## 오탐 방지 상세

| 케이스 | 처리 |
|---|---|
| `cron_runs`에 kind 기록 아예 없음 | 스킵 (관측 도입 전 케이스 — 오탐 방지) |
| 자기 자신(`cron-watchdog`) | 스킵 (실행 중이라 자기보고 불가) |
| 연속 실패로 이미 경보된 kind의 stale | UI 배너에서 제외 (cron 알림은 별도 refId로 발송됨) |
| weekly cron의 주 중간 체크 | 8일 여유 → 일반 운영 범위 내로 stale 미판정 |

---

## 검증

- `npx tsc --noEmit` → 에러 0건
- `npx eslint src/lib/cron-stale.ts src/app/api/cron/cron-watchdog/route.ts src/app/api/console/cron-runs/route.ts src/app/console/cron-logs/page.tsx --quiet` → 경고 0건
- build·commit 금지 규율 준수

---

## 수정 금지 영역 준수 확인

- `src/features/dashboard/**` — 미수정
- `src/features/hackathon/**` — 미수정
- `src/app/hackathon/**` — 미수정
- `src/app/academic-admin/**` — 미수정
- `src/features/onboarding/**` — 미수정
