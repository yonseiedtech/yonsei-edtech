# 데드코드 ratchet 게이트 — v13 M5 구현 보고서 (2026-07-21)

## 개요

v10-H6 일회 실행 후 3라운드 이월된 `depcheck/ts-prune 상시화`를 구현 완료.
rawcolor ratchet 패턴을 본떠 **증가분에만 FAIL** 하는 래칫 게이트를 신설했다.

---

## 도구 선택 근거

| 후보 | 근거 |
|---|---|
| **knip v6.27.0** ✅ | Next.js 플러그인 내장 — page/layout/route handler 예약 export 자동 제외, `ignoreExportsUsedInFile` 지원, 오탐 최소 |
| ts-prune | Next.js 규약 미인지 → 수동 허용 목록 필요, 마지막 배포 오래됨 |
| 커스텀 grep | 빠르지만 import graph 미분석 → 오탐률 높음 |

---

## 허용 목록 (자동 적용)

knip 의 Next.js 플러그인이 아래를 자동 제외한다:

- **page/layout/route/loading/error/not-found 기본 export** (`export default`)
- **예약 함수**: `generateMetadata`, `generateStaticParams`, `metadata`
- **Route Handler**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`
- **`ignoreExportsUsedInFile: true`** (knip.json) — 같은 파일 내 재사용은 미사용으로 집계 안 함

추가 오탐 시 `knip.json` 의 `ignore` 배열에 파일 패턴 또는 `@public` JSDoc 주석으로 제외한다.

---

## 생성 파일 목록

| 파일 | 역할 |
|---|---|
| `knip.json` | knip 설정 (Next.js 자동 감지, 불필요 규칙 off) |
| `scripts/gen-deadcode-baseline.mjs` | knip 실행 → `deadcode-baseline.json` 생성 |
| `scripts/check-deadcode-ratchet.mjs` | knip 실행 → ceiling 비교 → exit 0/1 |
| `scripts/deadcode-baseline.json` | 현재 ceiling=93, 상세 항목 목록 |
| `package.json` | `lint:deadcode`, `gen:deadcode-baseline` 스크립트 추가 |

---

## baseline 수치 (2026-07-21 기준)

```
ceiling: 93
  미사용 export:  82개
  미사용 파일:     2개  (onboarding-next-cta.ts, NewMemberChecklistWidget.tsx)
  미사용 type:    9개
```

주요 항목:
- `src/components/ui/` — UI 라이브러리 잉여 export (CardFooter, AvatarGroup 등)
- `src/lib/` — 내부 유틸 잉여 export (notify-timing, push, theory-family 등)
- `src/types/` — 레거시 타입 export (research-report, research-journal 등)

---

## 실행 시간 측정

| 실행 | 소요 시간 |
|---|---|
| 1차 (PASS) | 25,325ms |
| 2차 (FAIL 테스트) | ~26,000ms |
| 3차 (PASS 복원) | 28,935ms |

**평균 ~26초 — prebuild 편입 기준(5초) 미충족.**

**권고**: `npm run lint:deadcode` 를 수동으로 주기 실행(PR 전·배포 전)하거나, CI workflow 에서 별도 job 으로 실행할 것. prebuild 체인(rawcolor ratchet) 에는 포함하지 않음.

---

## PASS/FAIL 사이클 검증 증거

### Step 1 — 초기 PASS

```
[deadcode-ratchet] knip 실행 중 (ceiling: 93개)...
[deadcode-ratchet] PASS (93개 / 상한 93개 — 변동 없음)
  분석 완료: export 82 + file 2 + type 9 = 93개 (25325ms)
```

### Step 2 — 임시 export 주입 후 FAIL

주입: `src/lib/design-tokens.ts` 맨 끝에 `export const __DEADCODE_RATCHET_TEST_UNUSED__ = ...` 추가

```
[deadcode-ratchet] FAIL: 데드코드 회귀 감지 (94개 > 상한 93개, +1개)

  신규 유입으로 추정되는 항목 (최대 20개):
    [export] src/lib/design-tokens.ts — __DEADCODE_RATCHET_TEST_UNUSED__

  현재: export 83 + file 2 + type 9 = 94개
  상한: 93개 (scripts/deadcode-baseline.json ceiling)
exit code 1
```

### Step 3 — 원복 후 PASS 재확인

```
[deadcode-ratchet] PASS (93개 / 상한 93개 — 변동 없음)
  분석 완료: export 82 + file 2 + type 9 = 93개 (28935ms)
```

---

## 운용 가이드

### ceiling 낮추기 (데드코드 정리 후)

```bash
# 1. 미사용 export 제거 또는 실제 사용처 추가
# 2. baseline 재생성 (ceiling 자동 갱신)
node scripts/gen-deadcode-baseline.mjs
# 3. check 실행해 감소 확인
npm run lint:deadcode
```

### 불가피한 미사용 export 허용

```json
// knip.json - 파일 단위 제외
{ "ignore": ["src/lib/some-sdk-wrapper.ts"] }

// 또는 JSDoc 주석으로 심볼 단위 제외
/** @public */
export const myExport = ...;
```

### CI 편입 예시

```yaml
# .github/workflows/quality.yml
- name: Deadcode ratchet
  run: npm run lint:deadcode
  timeout-minutes: 3
```

---

## prebuild 편입 권고

현재 실행 시간 ~26초로 prebuild 편입 부적합.
색상 ratchet(`check-rawcolor-ratchet.mjs`)과 달리 **독립 `lint:deadcode` 스크립트로만 운용**.

향후 knip 의 캐시(`--cache` 플래그) 가 안정화되면 재측정 후 편입 검토 가능:
```bash
node node_modules/knip/bin/knip.js --reporter json --cache
```
