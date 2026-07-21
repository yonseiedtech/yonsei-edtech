# UI 갭 분석 보고서 — yonsei-edtech (2026-07-22)

> 역할: UI 디자이너 (비주얼·컴포넌트·색/타이포·여백·반응형·다크모드·마이크로인터랙션)
> 분석 방법: 실측 (globals.css·design-tokens.ts·ui/* 컴포넌트·주요 표면 직접 읽기, axe 보고서 반영)
> 권한: 읽기·분석 전용. 코드 수정·배포 없음.
> 선행 보고서 반영: ui-analysis-2026-06-15.md, color-debt-round3/4, a11y-m4v9-2026-07-21.md

---

## 진행 현황 요약 (라운드 1~4 성과)

- CSS custom property 토큰 체계: 28개 코어 + 6개 카테고리 + 5개 radius 단계 정의 완료
- `@theme inline` → Tailwind 색 유틸 매핑: 완료
- `.dark` 변수 전체: 완료
- Tailwind 팔레트 직접 사용 파일 수: 411→390개 (round 4 완료)
- `prefers-reduced-motion` CSS + framer-motion MotionProvider: M4-v9 완료
- InlineNotification·ActionableBanner → SEMANTIC 단일 소스 참조: 완료
- hex 하드코딩: 이전 보고 "0건" → **실측 결과 chart·canvas·print 표면에 34건 잔존** (ratchet 스코프 밖)

---

## 분석 영역별 갭

---

### 1. 토큰 체계 완성도

#### 1-1. 확인된 강점

| 토큰 그룹 | 정의 | 다크 대응 |
|---|---|---|
| 코어 UI (background/foreground/card/popover/border/input/ring) | ✓ | ✓ |
| 브랜드 (primary 네이비, secondary 골드, navy-footer) | ✓ | ✓ |
| 상태 (success/warning/info/destructive) | ✓ | ✓ |
| 카테고리 (cat-1~cat-6) | ✓ | ✓ |
| Radius 5단계 (sm/md/lg/xl/2xl) | ✓ | n/a |
| 폰트 (sans/display/serif) | ✓ | n/a |
| SEMANTIC 팔레트 (info/warning/danger/success/default × 11속성) | ✓ | ✓ |

#### 1-2. 누락 토큰

| 누락 항목 | 현재 상태 | 위험 |
|---|---|---|
| 타이포그래피 스케일 (h1-h6) | globals.css 주석 "별도 sprint" 로 유예 중 | 페이지별 임의 heading 크기 산개 |
| 스페이싱 리듬 (`--space-*`) | Tailwind 기본값 직접 사용 | 대시보드(p-5/p-6)·카드(py-4/px-4) 간 밀도 불일치 |
| 엘리베이션/그림자 토큰 | shadow-sm·shadow-md Tailwind 직접 사용 | 컴포넌트별 임의 그림자 |

#### 1-3. 시맨틱 토큰 명도 결함 (WCAG 실패)

| 토큰 | 값 (라이트) | 배경 조합 | 대비비 | 기준 |
|---|---|---|---|---|
| `--info` | hsl(199 89% 40%) | card(0 0% 100%) 위 소문자 | ~3.5:1 | WCAG AA 4.5:1 미달 |
| `--secondary` (골드) | hsl(46 65% 52%) | `text-white` 와 조합 | ~2.3:1 | WCAG AA 미달 |

axe 스모크(2026-07-21) 실측 확인: `/archive` text-info 1건(serious), `/research` secondary 배지 5건(serious).
파일: `src/app/globals.css:55,68`

#### 1-4. hex 하드코딩 잔존 (ratchet 스코프 밖)

ratchet은 Tailwind 팔레트 클래스명만 감지. inline style·SVG prop·canvas API 의 hex는 스코프 밖.

| 파일 | hex 건수 | 위험 유형 |
|---|---|---|
| `src/app/admin/analytics/page.tsx` | 15건 | Recharts `COLORS` 배열 + CartesianGrid stroke `#f0f0f0` + Bar/Line fill — 다크모드 미적응 |
| `src/components/diagnosis/DiagnosisHistorySection.tsx` | 4건 | 레이더 차트 stroke/fill (`#6366f1`, `#0ea5e9`, `#8b5cf6`, 반복) |
| `src/components/diagnosis/DiagnosisLearningLoop.tsx` | 2건 | SVG stroke (`#10b981`, `#f59e0b`) |
| `src/features/seminar-admin/NametagGenerator.tsx` | 8건 | 인쇄·캔버스 brand hex (print context — 허용 가능) |
| `src/app/admin/certificates/page.tsx` | 1건 | `BORDER_COLOR = "#003378"` (print — 허용 가능) |
| `src/features/studio/StudioEditor.tsx` | 5건 | 캔버스 드로잉 (canvas API — 허용 가능) |

**우선 조치 대상**: analytics + diagnosis 두 파일 (chart hex → `var(--color-*)` 또는 Tailwind `resolveConfig` 패턴으로 교체).

---

### 2. 컴포넌트 일관성

#### 2-1. Button — primary 호버 피드백 부재 (HIGH)

```
// src/components/ui/button.tsx:13
variant: {
  default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

`[a]:hover:` 는 Base UI가 `<a>`로 렌더할 때만 CSS가 활성화되는 관계형 선택자.
`<Button onClick={...}>` 형태(순수 `<button>`)는 hover 배경 변화가 **전혀 없음**.
앱 전체 primary CTA의 대다수가 onClick 기반 → 인터랙션 피드백 전무.

| 비교 | 현재 | 기대 |
|---|---|---|
| `<a href>` 로 감싼 Button | ✓ hover 적용 | — |
| `<Button onClick={}>` (대다수 CTA) | hover 없음 | `hover:bg-primary/80` 적용 필요 |

수정 범위: `button.tsx` 1줄 — `[a]:hover:bg-primary/80` → `hover:bg-primary/80`.

#### 2-2. Badge `secondary` variant — WCAG 대비 실패

```
// src/components/ui/badge.tsx:14
secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
```

`--secondary: 46 65% 52%` (골드) + `--secondary-foreground: 0 0% 100%` (흰색) 조합.
골드 배경 위 흰 텍스트 = ~2.3:1 → WCAG AA(4.5:1) 실패.
또한 Button과 동일하게 `[a]:hover:` 선택자 이슈 공유.

추가: Badge에 info/success/warning/danger semantic variant가 없어 소비처에서 SEMANTIC 수동 병합 필요 → 스타일 드리프트 발생.

#### 2-3. Card 컴포넌트 — export 누락

```typescript
// src/components/ui/card.tsx:100-101
export {
  Card, CardHeader, CardTitle, CardContent,
  // CardDescription, CardAction, CardFooter 정의되었으나 export 없음
}
```

정의된 `CardDescription`, `CardAction`, `CardFooter`가 export 되지 않아 소비처에서 raw `<div>` 또는 임시 재구현 사용. 카드 조합 패턴이 파일마다 다르게 구현될 가능성.

특이: `CardTitle`이 `text-base`(본문 동일 크기) — 시각적 heading 위계 미형성.

#### 2-4. AdminEmptyState 독립 운용 — 어드민 빈 상태 시각 분기

| 속성 | `ui/empty-state.tsx` | `admin/AdminEmptyState.tsx` |
|---|---|---|
| 배경 | `bg-muted/20 border-dashed` | 배경 없음, `border-dashed` |
| 아이콘 감싸기 | 원형 bg-muted 배지 | 없음 (`text-muted-foreground/40`, 매우 흐림) |
| 패딩 | `py-12 px-6` / compact `py-6` | `p-10` 고정 |
| 다중 액션 | ✓ `actions[]` | ✗ 단일 action prop |

적용 파일: `AdminMemberTab`, `AdminTodoTab`, `AdminInquiryTab`, `AdminPostTab` (4개 어드민 탭).
어드민 패널의 빈 상태가 공개 표면 대비 시각적으로 더 약함.

#### 2-5. Tabs — 활성 탭 weight 변화로 인한 레이아웃 시프트

```
// src/components/ui/tabs.tsx:67
"data-active:bg-background data-active:text-foreground data-active:shadow-sm data-active:font-semibold",
```

`font-semibold` (700) vs inactive (400) 전환 시 텍스트 너비 차이로 인접 탭이 밀려남.
탭 레이블이 한국어일 때 글리프 폭 차이가 두드러짐.
수정: 모든 탭 trigger에 `font-semibold`를 기본 적용하고 active는 색상·그림자만 변경.

---

### 3. 타이포그래피 · 여백 리듬

#### 3-1. 전역 heading 스타일 미정의

`globals.css:196-199` 주석: "h1/h2/h3 base styles는 컴포넌트별 또는 글로벌 typography 토큰으로 처리 (별도 sprint)".
현재 실측된 heading 크기 산포:

| 위치 | h1/제목 클래스 | 비고 |
|---|---|---|
| PageHeader | `text-2xl sm:text-3xl lg:text-4xl` | 반응형 잘 정의됨 |
| CardTitle | `text-base` | 본문과 동일 크기 |
| WidgetCard h2 | `font-bold`, priority.primary = `text-lg sm:text-xl` | 위젯 전용 |
| archive pages | 각자 `text-xl`/`text-2xl` 임의 | 일관성 없음 |
| analytics ChartCard h3 | `text-sm font-semibold` | 매우 작음 |

#### 3-2. 카드 패딩 밀도 불일치

| 컴포넌트 | 패딩 | px 환산 |
|---|---|---|
| `Card` (`ui/card.tsx`) | `py-4 px-4` | 16px |
| `WidgetCard` | `p-5 sm:p-6` (WIDGET_PADDING) | 20~24px |
| `ChartCard` (analytics 로컬) | `p-5` | 20px |

대시보드와 일반 페이지 카드가 서로 다른 내부 여백을 사용. 시각적 밀도 기준 혼재.

---

### 4. 다크모드 품질 — 위험 표면 실측 5개

| 파일 | 위험 패턴 | 심각도 |
|---|---|---|
| `src/app/seminars/[id]/present/page.tsx:46` | `bg-muted text-white` — 라이트모드에서 muted=hsl(210 18% 95%), white 텍스트 = ~1:1 대비 | CRITICAL |
| `src/app/admin/analytics/page.tsx:482-609` | Recharts hex fill (#3b82f6 등) + grid stroke #f0f0f0 — 다크모드 색 미적응 | HIGH |
| `src/components/diagnosis/DiagnosisHistorySection.tsx:70-72` | 레이더 차트 hex 3종 — 다크 배경 위 밝기 고정 | MEDIUM |
| `src/features/comm-board/WallBoard.tsx` | `slate-[0-9]` 원시 팔레트 일부 — dark: 변형 누락 가능성 | MEDIUM |
| `src/app/seminars/[id]\page.tsx` (SeminarReviews 계열) | `bg-slate-100 text-slate-500` 잔존 — axe 6노드 color-contrast 확인 | MEDIUM |

**present 페이지 상세**:
프로젝터 전용 화면 의도이나 클래스가 `bg-muted`(라이트 토큰). 라이트모드에서 열면 흰 배경 위 흰 텍스트. `bg-gray-950` 또는 `dark` 클래스 강제 적용으로 수정 필요.

---

### 5. 마이크로인터랙션 현황

| 항목 | 현황 | 갭 |
|---|---|---|
| prefers-reduced-motion CSS | ✓ M4-v9 완료 | — |
| framer-motion MotionProvider | ✓ M4-v9 완료 | — |
| Card hover elevation | ✓ `hover:shadow-md transition-shadow` | — |
| Button active press | ✓ `active:translate-y-px` | — |
| Dialog open animation | ✓ `data-open:animate-in fade/zoom` | — |
| Tabs transition | ✓ `transition-all` | font-weight 시프트(§2-5) |
| Button primary hover | ✗ `[a]:` 선택자 버그로 대부분 표면에서 작동 안 함 | HIGH |
| Loading skeleton | 부분적 — present 페이지, 일부 기능이 `"불러오는 중…"` 텍스트 사용 | MEDIUM |
| 페이지 전환 애니메이션 | 없음 (Next.js App Router 기본) | LOW |

---

### 6. Top 10 — 브랜드 정합·시각 결함 위험 순

| 순위 | 영역 | 문제 | 파일 (클래스·패턴 예시) | 위험 | 개선안 |
|---|---|---|---|---|---|
| 1 | 인터랙션 | **Button primary 호버 피드백 0** — `[a]:hover:bg-primary/80` 선택자가 `<button>` 에서 미작동. 앱 전체 CTA hover 무응답 | `button.tsx:13` `[a]:hover:bg-primary/80` | CRITICAL 브랜드 | `hover:bg-primary/80` 로 변경 (1줄) |
| 2 | 다크모드 | **present 페이지 라이트모드 대비 붕괴** — `bg-muted text-white` 조합 = ~1:1 대비 | `present/page.tsx:46` | CRITICAL 접근성 | `bg-gray-950 text-white` 또는 `className="dark"` 강제 |
| 3 | 토큰 명도 | **`--info` 토큰 대비 실패** — hsl(199 89% 40%) 라이트 카드 위 소문자 3.5:1 | `globals.css:68`, axe /archive 확인 | SERIOUS WCAG | `--info` 명도 30→35% 조정 또는 용도별 분리 |
| 4 | 토큰 명도 | **Badge secondary 대비 실패** — 골드 bg + white text ~2.3:1 | `globals.css:49`, `badge.tsx:14`, axe /research 5노드 | SERIOUS WCAG | `--secondary-foreground` 를 어두운 색(`--foreground`)으로 변경 |
| 5 | 다크모드 | **Analytics chart hex 미적응** — `COLORS = ["#3b82f6"...]` + grid `#f0f0f0` → 다크모드 색상계 이탈 | `admin/analytics/page.tsx:44-46, 482-609` | HIGH 시각 결함 | Recharts `fill`을 `var(--color-cat-*)` CSS변수로 교체; CartesianGrid stroke → `var(--color-border)` |
| 6 | 원시 팔레트 | **seminars `bg-slate-100 text-slate-500`** — 라운드 4 제외 파일 잔존, axe 6노드 대비 실패 | seminars feature 계열 | SERIOUS WCAG | `bg-muted text-muted-foreground` 치환 |
| 7 | 컴포넌트 | **Card export 누락** — `CardDescription/Action/Footer` 정의·비공개, 소비처 ad-hoc 재현 | `card.tsx:100-101` | MEDIUM 일관성 | export 목록에 3개 추가 (0 로직 변경) |
| 8 | 컴포넌트 | **AdminEmptyState 분기** — 어드민 4탭이 배경 없는 빈 상태 사용, 공개 표면과 시각 위계 불일치 | `admin/AdminEmptyState.tsx`, 4 소비 파일 | MEDIUM 브랜드 | AdminEmptyState → `EmptyState compact` 대체 |
| 9 | 타이포 | **Tabs 활성 font-semibold 레이아웃 시프트** — weight 전환 시 인접 탭 이동 | `tabs.tsx:67` `data-active:font-semibold` | MEDIUM UX | 모든 trigger에 `font-semibold` 기본 적용, active는 색만 변경 |
| 10 | 타이포 | **h1-h6 전역 스타일 미정의** — CardTitle=text-base, 아카이브 제목=각자 임의, heading 위계 산포 | `globals.css:196-199` (주석 유예), `card.tsx:39-44` | MEDIUM 브랜드 | `@layer base { h1{} h2{} ... }` 토큰 기반 baseline 추가 |

---

## 실측 기준 수치 (2026-07-22)

| 측정 항목 | 값 |
|---|---|
| globals.css 코어 시맨틱 토큰 수 | 28개 (+ 6 cat) |
| hex 하드코딩 잔존 (chart·canvas·print) | 34건 / 6파일 |
| axe WCAG critical 위반 | 0건 (게이트 통과) |
| axe WCAG serious 위반 | 3건 (color-contrast — 모두 잔여 등록) |
| AdminEmptyState 소비 파일 수 | 4개 어드민 탭 |
| Card export 누락 컴포넌트 수 | 3개 (CardDescription/Action/Footer) |
| Button primary hover 미작동 CTA 예상 범위 | 앱 전체 `<Button onClick>` primary — 수십 개 |
| Tailwind 팔레트 직접 사용 파일 수 (round 4 완료 후) | 390개 |
| ratchet 제외 표면 (teal/cyan/yellow/green/pink/fuchsia/gray/zinc/neutral/stone/orange) | round 4 이후 untracked |

---

## 수정 규모 가이드

| 우선순위 | 작업 | 규모 | 특이사항 |
|---|---|---|---|
| P0 | Button hover 1줄 수정 | S (1파일 1줄) | 전체 CTA 즉시 개선 |
| P0 | present 페이지 bg 수정 | S (1파일 1줄) | WCAG critical 해소 |
| P1 | `--info` 토큰 명도 조정 | S (globals.css 1값) | 다크 재확인 필요 |
| P1 | `--secondary-foreground` 조정 | S (globals.css 1값) | Badge/Button secondary 전체 영향 |
| P1 | Analytics chart hex → CSS var | M (1파일, chart 전수 교체) | `var(--color-cat-*)` 패턴 |
| P2 | seminars raw palette 치환 | S | axe 6노드 해소 |
| P2 | Card missing exports | S (1파일 export 목록) | 소비처 변경 불필요 |
| P2 | AdminEmptyState → EmptyState compact | S~M (4파일 소비처) | 시각 검수 필요 |
| P3 | Tabs font-semibold 기본화 | S (tabs.tsx 1줄) | 시각 변화 작음 |
| P3 | h1-h6 전역 baseline | M (globals.css + 컴포넌트 확인) | 전체 heading 스캔 필요 |
