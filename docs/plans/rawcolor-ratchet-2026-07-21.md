# raw 색상 부채 래칫(Ratchet) 게이트 — 구현 기록

> 구현일: 2026-07-20  
> 관련 계획: service-enhancement-plan-v10-2026-07-21.md H4 항목

---

## 목적

색상 부채 마이그레이션(v4-G⑥, 색상 부채 라운드 1~2)으로 줄여놓은 raw Tailwind 팔레트 파일 수가
다시 증가하는 것을 구조적으로 차단한다.

---

## 이중 방어 구조

| 계층 | 파일 | 동작 |
|------|------|------|
| 1차 | `eslint.config.mjs` no-restricted-syntax | baseline 에 없는 **새 파일**에서 raw 팔레트 사용 → eslint error |
| 2차 (래칫) | `scripts/check-rawcolor-ratchet.mjs` | baseline 파일 **목록 수 자체**가 CEILING 초과 → exit 1 |

- 1차: 새 파일에 raw 색상이 들어오는 경로 차단  
- 2차: `gen-rawcolor-baseline.mjs` 재실행으로 baseline 이 몰래 늘어나는 경로 차단

---

## 구현 내용

### 1. `scripts/check-rawcolor-ratchet.mjs` (신규)

- `eslint-rawcolor-baseline.mjs` 를 파싱해 현재 파일 수 측정
- `CEILING = 347` (2026-07-20 기준) 과 비교
- **current > CEILING** → `exit 1` + 조치 안내 출력
- **current < CEILING** → 통과 + "CEILING 을 N 으로 낮추세요" 제안 출력
- **current == CEILING** → 통과 (변동 없음)
- 순수 Node.js (fs/path/url 표준 모듈만), 외부 의존 없음, 수 ms 소요

### 2. `package.json` prebuild 체인 추가

```
"prebuild": "node scripts/check-rawcolor-ratchet.mjs && eslint"
```

기존 `prebuild: eslint` 앞에 래칫 체크를 추가.  
래칫이 실패하면 eslint 실행 전에 배포가 차단된다.

---

## 검증 결과

| 시나리오 | CEILING | 현재 count | 결과 |
|----------|---------|------------|------|
| 정상 (변동 없음) | 347 | 347 | PASS |
| 회귀 시뮬레이션 | 345 | 347 | FAIL → exit 1 확인 |

```
[ratchet] PASS (347개 / 상한 347개 — 변동 없음)
```

---

## CEILING 낮추는 절차 (색상 부채 추가 상환 시)

1. 대상 파일에서 raw 팔레트 → 시맨틱 토큰 교체
2. `node scripts/gen-rawcolor-baseline.mjs` 실행 (baseline 재생성)
3. `node scripts/check-rawcolor-ratchet.mjs` 실행 → "CEILING 을 N 으로 낮추세요" 출력 확인
4. `scripts/check-rawcolor-ratchet.mjs` 의 `const CEILING = 347;` 을 N 으로 수정
5. `git commit` — 이후 N+1 개 이상 늘어나면 자동 차단

---

## 수정 금지 원칙

- `src/**` 코드 무접촉 (스크립트·설정만 변경)
- `eslint-rawcolor-baseline.mjs` 는 `gen-rawcolor-baseline.mjs` 로만 갱신 (수동 편집 금지)
- CEILING 은 **낮추는 방향**으로만 수정 (높이는 것 = 회귀 허용)
