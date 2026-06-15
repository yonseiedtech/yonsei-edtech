# UI(비주얼) 분석·개선 보고서 — yonsei-edtech

- 작성일: 2026-06-15
- 역할: UI 디자이너 (비주얼·컴포넌트 구현 품질·일관성)
- 스택: Next.js 16, Tailwind v4(`@theme inline`), Base UI(`@base-ui/react`) + class-variance-authority(CVA)
- 범위: 읽기·분석 전용 (코드 수정·배포 없음). 브랜드 아이덴티티/UX 흐름은 별도 디자이너 담당 → 본 보고서는 **컴포넌트·구현 레벨 비주얼 품질·일관성**에 집중.
- 분석 대상 핵심 파일: `src/app/globals.css`, `src/lib/design-tokens.ts`, `src/components/ui/*`(button·card·badge·tabs·dialog·page-header·page-container·empty-state·skeleton·skeleton-widget·inline-notification·actionable-banner·widget-card), `src/components/layout/Header.tsx`.

---

## 1. UI 강점/약점 요약

### 강점
- **토큰 기반 색 시스템이 탄탄함.** `globals.css`가 HSL CSS 변수(`--primary` 212 100% 23% = 연세 네이비, `--secondary` 골드)를 `:root`/`.dark` 양쪽에 정의하고 `@theme inline`으로 Tailwind 색에 매핑. **하드코딩 hex(`#rrggbb`)는 컴포넌트 전체에서 0건** — 매우 양호.
- **접근성 기본기 반영.** `--muted-foreground`에 WCAG AA 대비(라이트 5.0:1 / 다크 7.5:1) 주석으로 명시 조정, 전역 `*:focus-visible` 링, iOS 폼 16px 줌 방지, 모바일 `clamp()` 반응형 폰트.
- **공통 컴포넌트 체계가 shadcn 스타일로 정돈.** Button/Badge/Tabs는 CVA `variant`로 통일, Card는 `data-slot`/`data-size` 기반 컴포지션, Dialog는 모바일 풀시트 → `sm:` 센터 모달로 반응형 분기. PageContainer가 본문 폭(narrow/default/wide)·여백을 단일 규격으로 고정.
- **상태 UI 컴포넌트 라인업이 풍부.** EmptyState(compact 모드), Skeleton/SkeletonWidget, InlineNotification·ActionableBanner(Carbon 영감, info/success/warning/error 4종 + role/aria-live).
- **시맨틱 토큰 추상화 시도.** `design-tokens.ts`의 `SEMANTIC`이 info/warning/danger/success/default × bg/border/text/accent/chip을 라이트·다크 한 쌍으로 정의 → 다크 모드 누락을 구조적으로 방지.

### 약점 (요지)
- `design-tokens.ts`(SEMANTIC)는 **대시보드 위젯 영역에만 적용**되고, 동일 의미의 상태 색이 컴포넌트마다 **로컬 `KIND_CONFIG` 리터럴로 중복 정의**됨(inline-notification·actionable-banner). 단일 진입점이 깨져 있음.
- 컴포넌트별 색 클래스를 **Tailwind 팔레트(blue/emerald/amber/rose 등) 직접 사용**이 40개 파일·258곳. hex는 없지만 의미색이 토큰화되지 않아 일관성·다크대응이 파일마다 제각각.
- **radius 토큰 불일치**: 디자인 토큰은 `--radius: 0.75rem`이고 Card는 `rounded-2xl`, Dialog는 `rounded-xl`, Button은 `rounded-lg`로 컴포넌트마다 다른 곡률. 의도적 위계일 수 있으나 명문화된 규칙은 없음.
- **로딩 상태 미통일**: SkeletonWidget가 표준임에도 텍스트형 "불러오는 중"/`animate-spin`이 29개 파일에 잔존.
- **EmptyState 중복**: 공통 `ui/empty-state.tsx`와 별도 `admin/AdminEmptyState.tsx`가 공존.

---

## 2. 컴포넌트 일관성

### 2-1. 상태 색(시맨틱) 정의가 3중으로 중복
같은 info/success/warning/error 색이 세 곳에서 **독립적으로** 정의됨:
- `lib/design-tokens.ts` → `SEMANTIC` (bg `blue-50/60 dark:blue-950/30` 등) — 대시보드 WidgetCard/SkeletonWidget 전용.
- `ui/inline-notification.tsx` → 로컬 `KIND_CONFIG` (`border-blue-300 bg-blue-50 dark:...`).
- `ui/actionable-banner.tsx` → 로컬 `KIND_CONFIG` (`bg-gradient-to-br from-blue-50 to-sky-50 dark:...`).

→ 같은 "info"라도 배경 채도/명도·테두리 농도·다크 대응이 미묘하게 달라 **화면마다 같은 의미의 알림이 다르게 보임**. SEMANTIC을 단일 소스로 승격하고 두 배너 컴포넌트가 이를 참조하도록 수렴 필요(그라데이션·테두리 두께만 컴포넌트 고유 옵션으로).

### 2-2. 의미색의 비(非)토큰 직접 사용 — 258곳/40파일
`bg-blue-50`·`text-emerald-600`·`border-amber-300` 등 Tailwind 팔레트 직접 사용이 광범위(특히 `MyPageView`(40), `EduTechOverview`(20), `Footer`(20), `DiagnosisReport`(18), `ProfileAcademicActivities`(16), `MyActivitiesView`(11), `AttendanceChecklist`(10)). hex가 아니라 디버깅·테마 변경 위험은 낮지만, **색 의미가 코드에 흩어져** 동일 상태(예: "승인됨"=초록)가 컴포넌트마다 다른 톤(emerald-600 vs green-500 vs teal)으로 갈릴 여지. 상태 배지는 `admin/StatusBadge.tsx`(21곳)로 이미 일부 수렴 — 이를 전역 표준으로 확장 권장.

### 2-3. radius·곡률 위계 미명문화
Button `rounded-lg`, Card/EmptyState/WidgetCard/InlineNotification/ActionableBanner `rounded-2xl`, Dialog `rounded-xl`, Badge `rounded-4xl`(pill). 컴포넌트 단위로는 일관되나 "카드=2xl / 컨트롤=lg / 모달=xl"라는 규칙이 문서화돼 있지 않아 신규 컴포넌트에서 임의 선택될 위험. design-tokens에 radius 위계 상수 추가 권장.

### 2-4. EmptyState 2종 공존
`ui/empty-state.tsx`(공개·일반, compact·다중 actions 지원)와 `admin/AdminEmptyState.tsx`가 병존. 콘솔/공개 빈 상태 비주얼이 갈릴 수 있음 — AdminEmptyState를 공통 EmptyState의 variant로 흡수 검토.

### 2-5. Button variant 미세 이슈
`default` variant의 hover가 `[a]:hover:bg-primary/80`로 **`<a>` 태그로 렌더될 때만** 적용 — 순수 `<button>`(onClick)에는 hover 배경 변화가 없어 인터랙션 피드백이 약함. 또한 `destructive`가 채움(solid)이 아니라 `bg-destructive/10` 연한 톤이라, 위험 액션의 시각 강도가 일반적 기대보다 낮음(의도라면 OK, 확인 필요).

---

## 3. 반응형·다크모드 이슈

### 반응형 — 대체로 양호
- Header: `sticky top-0 z-50 backdrop-blur-lg bg-background/80` + 모바일 메뉴 버튼 `h-11 w-11`(44px 터치 타깃 충족). 양호.
- Dialog: 모바일 풀시트(`inset-0 m-4`) → `sm:` 센터(`max-w-lg`, `max-h-[85vh]`, `overflow-y-auto`) 반응형 분기 깔끔.
- PageHeader: `flex-col → sm:flex-row`, 헤드라인 `text-2xl → sm:3xl → lg:4xl` 단계적.
- globals.css가 과거 `!important` 모바일 override를 제거하고 컴포넌트별 `sm:` 명시 패턴으로 전환(주석에 마이그레이션 가이드 명시) — 올바른 방향.

#### 반응형 관찰 포인트
- **터치 타깃 44px 미만 컨트롤 가능성**: Button `default`가 `h-8`(32px), `sm`이 `h-7`(28px), `xs` `h-6`(24px). 데스크톱 밀도엔 적합하나 모바일 주요 CTA가 `h-8` 이하면 터치 권장(44px) 미달. 모바일 1차 액션은 `lg`(`h-9`=36px)도 부족 — 모바일 전용 높이 보강 또는 `size="lg"` + 패딩 확대 가이드 필요.
- InlineNotification/ActionableBanner의 닫기 버튼 `h-7 w-7`(28px)도 터치 타깃 미달.

### 다크모드 — 인프라는 좋으나 적용 누락 위험
- ThemeToggle 존재, `.dark` 변수 완비, SEMANTIC·두 배너·InlineNotification는 `dark:` 변형 모두 보유 → 핵심 컴포넌트는 안전.
- **위험**: 2-2의 258곳 팔레트 직접 사용 중 상당수가 `dark:` 변형을 동반하는지 미확인. `bg-blue-50` 같은 라이트 전용 클래스가 `dark:` 없이 쓰이면 다크 모드에서 흰 박스가 떠 보임. 특히 색 사용량 많은 `Footer`(20)·`EduTechOverview`(20)·`DiagnosisReport`(18)·프로필/마이페이지 계열을 다크 모드 실측 점검 권장.

---

## 4. 상태 UI·마이크로인터랙션 개선

### 상태 UI
- **로딩**: SkeletonWidget(`aria-busy`·`aria-label` 포함)가 표준이나, "불러오는 중"/`animate-spin` 텍스트·스피너가 29개 파일에 잔존. 위젯/리스트는 Skeleton, 버튼 인라인 동작은 spinner로 역할을 명문화하고 텍스트형 로딩을 Skeleton으로 일괄 치환 권장.
- **빈 상태**: EmptyState 컴포넌트 완성도 높음(아이콘 원형 배지·다중 CTA·compact). 다만 AdminEmptyState와 이원화(§2-4).
- **에러**: InlineNotification이 `role=alert`/`aria-live=assertive`(error)로 잘 처리. 페이지 레벨 에러는 `app/error.tsx` 존재 — 비주얼 일관성(EmptyState/배너와 같은 카드 톤) 점검 권장.

### 마이크로인터랙션
- Card `transition-shadow hover:shadow-md`, Button `transition-all active:translate-y-px`, Badge `transition-all`, Tabs `transition-all` + `data-active:shadow-sm` — 전반적으로 절제된 호버/액티브 피드백이 일관되게 적용됨(토스 패턴 주석). 양호.
- `tw-animate-css` + Dialog `data-open:animate-in fade/zoom` 적용 — 모달 진입 애니메이션 양호.
- **개선**: ① 일반 `<button>` Button의 hover 피드백 부재(§2-5). ② `prefers-reduced-motion` 대응이 globals.css에 없음 — 접근성상 모션 축소 미디어쿼리 추가 권장. ③ Skeleton은 `animate-pulse`만 — shimmer는 선택사항이나 통일성 위해 한 가지로 고정.

---

## 5. 우선순위 개선 백로그

| 우선순위 | 항목 | 내용 | 기대효과 | 규모 |
|---|---|---|---|---|
| **High** | 시맨틱 색 단일화 | `design-tokens.ts` SEMANTIC을 단일 소스로 승격 → InlineNotification·ActionableBanner의 로컬 KIND_CONFIG가 이를 참조(그라데이션/테두리만 옵션) | 알림 색 의미 통일·다크 누락 제거 | M |
| **High** | 다크모드 실측 점검 | 팔레트 직접 사용 多 파일(Footer·EduTechOverview·DiagnosisReport·MyPageView·프로필) `dark:` 누락 스윕 | 다크 모드 흰 박스/저대비 제거 | M |
| **High** | 모바일 터치 타깃 | 모바일 1차 CTA·닫기 버튼(현 h-7/h-8, 28~32px)을 44px 가이드로 보강 | 모바일 탭 정확도·접근성 | S~M |
| **Medium** | 로딩 상태 통일 | "불러오는 중"/spinner 29파일 → SkeletonWidget/Skeleton 또는 명문화된 spinner 규칙으로 치환 | 로딩 화면 일관성·체감 속도 | M |
| **Medium** | 의미색 토큰화 확장 | 상태 색을 StatusBadge/SEMANTIC chip 토큰으로 수렴(승인=success 등) | 상태 색 의미 일관성 | M~L |
| **Medium** | EmptyState 통합 | AdminEmptyState를 공통 EmptyState variant로 흡수 | 빈 상태 비주얼 통일 | S |
| **Low** | radius 위계 명문화 | "카드=2xl/컨트롤=lg/모달=xl/배지=pill" 규칙을 design-tokens 상수+주석으로 문서화 | 신규 컴포넌트 곡률 일관성 | S |
| **Low** | Button hover/모션 | `<button>` default hover 피드백 추가 + `prefers-reduced-motion` 대응 | 인터랙션 피드백·모션 접근성 | S |

### 규모 범례
- S: 1파일~소수 컴포넌트 (반나절)
- M: 다수 컴포넌트/스윕 (1~2일)
- L: 전역 리팩토링 (수일)

---

### 부록 — 근거 수치
- 하드코딩 hex(`#xxxxxx`): **0건** (양호).
- Tailwind 의미색 팔레트 직접 사용: **258곳 / 40파일** (상위: MyPageView 40, EduTechOverview·Footer 각 20, DiagnosisReport 18, ProfileAcademicActivities 16).
- 로딩 텍스트/스피너 잔존: **29파일**.
- radius 사용 분포: Button=lg, Card/상태컴포넌트=2xl, Dialog=xl, Badge=4xl(pill).
- 시맨틱 색 정의 위치: design-tokens.SEMANTIC(대시보드) + inline-notification 로컬 + actionable-banner 로컬 = **3중**.
