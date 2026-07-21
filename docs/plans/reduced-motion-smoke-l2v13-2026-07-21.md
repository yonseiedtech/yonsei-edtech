# reduced-motion 에뮬레이션 스모크 체크 결과 — L2-v13 (2026-07-21)

> 스크립트: `scripts/a11y-smoke.mjs` (L2-v13 추가분)  
> 실행 시점: 2026-07-21  
> 대상: LIVE https://yonsei-edtech.vercel.app

---

## 1. 변경 내용 (scripts/a11y-smoke.mjs)

### 추가된 기능

| 항목 | 내용 |
|---|---|
| `REDUCED_MOTION_PAGES` 상수 | 공개 4페이지 (`/`, `/archive`, `/research`, `/seminars`) — 인증 불필요 페이지만 |
| `checkReducedMotion(browser, url)` 함수 | `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])` 로 에뮬레이션 후 3가지 검사 수행 |
| 가드 작동 확인 (임시 요소 주입 방식) | `animation-duration:2s; animation-iteration-count:infinite` 로 설정한 probe 요소의 computed style 검사 — 가드가 작동하면 `0.01ms / 1` 로 오버라이드됨 |
| 억제 실패 요소 수집 | `animation-name ≠ none` 이면서 `animation-duration > 0.01ms` 인 실제 DOM 요소 목록 |
| infinite 잔존 요소 수집 | `animation-iteration-count: infinite` 가 남아있는 요소 목록 |
| 출력 관례 | 기존 axe 스모크와 동일한 섹션/구분선 스타일로 리포트 — **게이트 종료 코드에 미편입** |
| 상단 주석 갱신 | L2-v13 체크 설명·대상 페이지·판정 기준 명시 |

---

## 2. 실행 결과

### 2-1. axe 접근성 스모크

| 페이지 | critical | serious | 비고 |
|---|---|---|---|
| `/` | 0 | 0 | 통과 |
| `/archive` | 0 | 1 | color-contrast: `text-info` 클래스 (`p.text-xs`) |
| `/research` | 0 | 1 | color-contrast: secondary badge 5개 노드 |
| `/seminars` | 0 | 1 | color-contrast: inline badge `bg-slate-100 text-slate-500` 6노드 |
| `/mypage` | 0 | 0 | 통과 |
| **합계** | **0** | **3** | **critical=0 → 게이트 통과** |

> axe serious(color-contrast) 3건은 기존 라운드 누적 항목으로 이번 L2 범위 외.

### 2-2. prefers-reduced-motion: reduce 에뮬레이션 체크

| 페이지 | 가드 작동 | probe duration | probe iteration | infinite잔존 | 억제실패 |
|---|---|---|---|---|---|
| `/` | OK | `1e-05s` (=0.01ms) | `1` | 0 | 0 |
| `/archive` | OK | `1e-05s` | `1` | 0 | 0 |
| `/research` | OK | `1e-05s` | `1` | 0 | 0 |
| `/seminars` | OK | `1e-05s` | `1` | 0 | 0 |
| **합계** | **가드NG=0** | — | — | **0** | **0** |

> `1e-05s` = `0.00001s` = `0.01ms` — Chrome computed style 표기. globals.css 가드의 `0.01ms !important` 와 정확히 일치.

---

## 3. 발견 위반 목록

### reduced-motion 위반

**없음.** 4개 공개 페이지 전체에서:
- 전역 가드(`globals.css` lines 14-21 `@media (prefers-reduced-motion: reduce)`) 완전 작동 확인
- `animation-iteration-count: infinite` 잔존 요소 0건
- 억제 실패(`animation-duration > 0.01ms`) 요소 0건

### 판정 근거

`globals.css`의 가드 규칙:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
`!important` + `*` 전체 선택자 조합이 모든 요소에 정상 적용됨.

---

## 4. 결론

| 항목 | 결과 |
|---|---|
| axe 게이트 | **통과** (critical=0) |
| reduced-motion 가드 | **전 페이지 정상** |
| infinite 애니메이션 잔존 | **0건** |
| 억제 실패 | **0건** |
| reduced-motion 관련 추가 조치 필요 | **없음** |

globals.css의 전역 reduced-motion 가드가 프로덕션 LIVE에서 의도대로 작동하고 있음을 실증적으로 확인. 추후 `tw-animate-css` 등 외부 애니메이션 라이브러리 추가 시 이 스모크로 가드 유효성을 재검증 가능.
