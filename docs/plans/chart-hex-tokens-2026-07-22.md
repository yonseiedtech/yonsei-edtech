# 차트 hex → CSS 토큰 교체 (2026-07-22)

UI 갭 Top10 #5 구현 — 차트 하드코딩 hex 색상을 CSS 변수로 교체해 다크모드에 적응하도록 개선.

---

## 1. 색 매핑표

### 공통 토큰 정의 (globals.css 기준)

| CSS 변수 | 라이트 HSL | 다크 HSL | 근사 hex |
|---|---|---|---|
| `var(--color-cat-1)` | 214 84% 45% | 214 84% 62% | #3b82f6 blue |
| `var(--color-cat-2)` | 152 55% 38% | 152 50% 52% | #10b981 emerald |
| `var(--color-cat-3)` | 35 92% 45% | 38 90% 58% | #f59e0b amber |
| `var(--color-cat-4)` | 347 77% 55% | 347 75% 65% | #ef4444 rose/red |
| `var(--color-cat-5)` | 262 60% 55% | 262 65% 68% | #8b5cf6 violet |
| `var(--color-cat-6)` | 215 16% 47% | 215 16% 62% | slate |
| `var(--color-success)` | 152 55% 34% | 152 50% 55% | #10b981 emerald |
| `var(--color-warning)` | 35 92% 40% | 38 90% 60% | #f59e0b amber |
| `var(--color-info)` | 199 89% 40% | 199 85% 60% | #06b6d4 cyan/sky |
| `var(--color-border)` | 210 18% 90% | 222 18% 22% | #f0f0f0 grid line |

---

## 2. 파일별 변경 매핑

### `src/app/admin/analytics/page.tsx` (hex 23건)

#### COLORS 배열 (Pie/Cell 순환 팔레트 — 8→6항목)

| 기존 hex | 교체 토큰 | 색상 계열 |
|---|---|---|
| `#3b82f6` | `var(--color-cat-1)` | blue |
| `#10b981` | `var(--color-cat-2)` | emerald |
| `#f59e0b` | `var(--color-cat-3)` | amber |
| `#ef4444` | `var(--color-cat-4)` | rose/red |
| `#8b5cf6` | `var(--color-cat-5)` | violet |
| `#06b6d4` | `var(--color-cat-6)` | slate (대체) |
| `#ec4899` | — (제거) | 6개 토큰으로 충분 |
| `#84cc16` | — (제거) | 6개 토큰으로 충분 |

> Pie chart는 `COLORS[i % COLORS.length]`로 순환하므로 6개로 충분.

#### CartesianGrid stroke (6건 replace_all)

| 기존 | 교체 | 용도 |
|---|---|---|
| `stroke="#f0f0f0"` | `stroke="var(--color-border)"` | 격자선 (6개 차트 공통) |

#### 개별 Bar/Line fill·stroke (9건)

| 기존 hex | 교체 토큰 | 위치 |
|---|---|---|
| `fill="#06b6d4"` | `fill="var(--color-info)"` | 시간대별 방문 Bar |
| `fill="#ec4899"` | `fill="var(--color-cat-4)"` | 페이지 그룹 Bar |
| `fill="#3b82f6"` | `fill="var(--color-cat-1)"` | 월별 신규 회원 Bar |
| `stroke="#8b5cf6"` | `stroke="var(--color-cat-5)"` | 세미나 수 Line |
| `stroke="#3b82f6"` | `stroke="var(--color-cat-1)"` | 참가자 Line |
| `stroke="#10b981"` | `stroke="var(--color-success)"` | 출석 Line |
| `fill="#f59e0b"` | `fill="var(--color-warning)"` | 만족도 분포 Bar |
| `fill="#8b5cf6"` | `fill="var(--color-cat-5)"` | Top5 세미나 참가자 Bar |
| `fill="#10b981"` | `fill="var(--color-success)"` | Top5 세미나 출석 Bar |

---

### `src/components/diagnosis/DiagnosisHistorySection.tsx` (hex 4건)

#### AREA_CHART_COLOR 객체

| 기존 hex | 교체 토큰 | 색상 계열 | 영역 |
|---|---|---|---|
| `#6366f1` (indigo) | `var(--color-cat-5)` | violet | statistics |
| `#0ea5e9` (sky) | `var(--color-info)` | sky/cyan | method |
| `#8b5cf6` (violet) | `var(--color-cat-1)` | blue | concept |

> statistics(indigo, 239°)와 cat-5(violet, 262°)는 hue 차이 23°로 가장 근접.
> concept를 cat-1(blue)로 구분해 3색이 violet / cyan / blue로 시각적으로 명확히 분리됨.

#### Radar stroke·fill

| 기존 hex | 교체 토큰 | 용도 |
|---|---|---|
| `stroke="#6366f1"` | `stroke="var(--color-cat-5)"` | 레이더 외곽선 |
| `fill="#6366f1"` | `fill="var(--color-cat-5)"` | 레이더 채움 (fillOpacity 0.35 유지) |

---

### `src/components/diagnosis/DiagnosisLearningLoop.tsx` (hex 2건)

#### ConceptTrendRow statusMeta

| 기존 hex | 교체 토큰 | 상태 | 용도 |
|---|---|---|---|
| `stroke: "#10b981"` | `stroke: "var(--color-success)"` | resolved(개선됨) | 미니 라인 stroke |
| `stroke: "#f59e0b"` | `stroke: "var(--color-warning)"` | persistent(지속 약점) | 미니 라인 stroke |

> statusMeta.cls는 이미 `text-success` / `text-warning` Tailwind 클래스 사용 중 — stroke 토큰도 통일.

---

## 3. 투명도 처리

- `fillOpacity={0.35}` 속성 그대로 유지 (Recharts props 방식) — `color-mix` 불필요.
- Pie Cell 및 Bar의 반투명 배경은 Tailwind `bg-cat-*/5` 패턴(기존 유지)과 무관하게 이번 변경과 충돌 없음.

---

## 4. 검증 결과

| 항목 | 결과 |
|---|---|
| 잔여 hex (`#XXXXXX`) 검색 | 0건 (3파일 전체) |
| `npx tsc --noEmit` | 0 errors |
| `npx eslint --quiet` (3파일) | 0 warnings/errors |

---

## 5. 적용 범위 외 (제외 대상)

- print/canvas 관련 파일 — 과업 지시에 따라 제외
- globals.css, tailwind.config.ts — 토큰 정의 파일이므로 수정 불필요
