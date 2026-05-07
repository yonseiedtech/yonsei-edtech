# 연세교육공학회 대시보드 UI/UX 분석 리포트

> 작성일: 2026-05-06 | 분석 모델: Claude Sonnet 4.6 (Designer)
> 대상: `/dashboard`, `/staff-admin/activity-dashboard`, `/admin/activity-dashboard`
> 스택: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui · Lucide · Framer Motion · Pretendard

---

## 1. 현황 진단

### 1-1. 시각적 위계

페이지 진입 시 `PageHeader` → `AcademicCalendarProgress` → `DailyClassTimelineWidget` → `MyTodosWidget` → StatCard 4개 → 빠른 액션 → 2열 그리드(공지·캘린더) → 학술·종합시험 → 피드 순으로 11개 위젯이 단일 컬럼(max-w-6xl)에 순차 적층된다. 각 위젯이 `rounded-2xl border bg-card p-6` 패턴을 반복하여 **모든 요소가 동일 시각 무게**를 갖는다. 스크롤 깊이가 깊어질수록 무엇이 핵심 정보인지 판단하기 어렵다.

`h2` 요소가 "나의 할 일", "최근 공지", "세미나 일정" 등 동일한 `font-bold` 수준으로 쓰여, 페이지 스캔 시 논리적 우선순위가 느껴지지 않는다. StatCard 안의 `text-2xl font-bold` 숫자가 가장 강조되어 있으나, 이는 카드 내부의 로컬 위계일 뿐이다.

### 1-2. 정보 밀도

`MyTodosWidget`은 단일 컴포넌트에 탭 5개(전체·수업·연구활동·학술활동·운영진) × 상태 필터 3단, 인라인 강의 후기 폼, 빠른 추가 Dialog까지 탑재한다. **1,667줄의 단일 파일** 안에 5종 데이터 소스와 복수 폼 상태가 집적되어 있다. 사용자 입장에서는 위젯 하나가 미니 애플리케이션처럼 느껴진다.

반면 `MiniCalendar`와 `ActivityFeed`는 기능이 단순하지만 같은 `rounded-2xl border bg-card p-6` 컨테이너로 감싸여 있어 밀도 차이가 외관으로 드러나지 않는다. 정보량과 위젯 크기가 불균형하다.

### 1-3. 토큰 일관성

컬러 사용에 일관성 균열이 존재한다. 위젯별로 하드코딩된 색상 클래스(`bg-amber-50/40 border-amber-200`, `bg-blue-50/60 border-blue-200`, `bg-rose-50/40 border-rose-200`)가 각 파일에 산재한다. 동일한 "경고/주의" 시맨틱을 표현하는 데 `amber`, `rose`, `orange`가 혼용된다. `COURSE_TODO_TYPE_COLORS`, `PHASE_COLORS`, `STATUS_COLORS`, `KIND_META.iconClass` 등 컬러 상수가 파일마다 별도 정의되어 중앙 디자인 토큰이 없다.

다크 모드 대응은 `AcademicCalendarProgress`에서 `dark:bg-emerald-950/50 dark:text-emerald-300` 패턴이 일부 적용되어 있으나, `ComprehensiveExamCountdown`의 `bg-amber-50/40`, `PushPermissionPrompt`의 `bg-blue-50/60` 등 대부분의 위젯은 다크 모드 색상이 미정의 상태다.

### 1-4. 컴포넌트 패턴 재사용도

- **위젯 래퍼**: `rounded-2xl border bg-card p-6`이 6개 위젯에서 문자열 그대로 반복된다. 추상화된 `<WidgetCard>` 컴포넌트가 없다.
- **섹션 헤더**: `<div className="flex items-center gap-2"><Icon /><h2>…</h2></div>` 패턴이 10회 이상 반복된다.
- **빈 상태**: `MyAcademicActivitiesWidget`은 아이콘+텍스트+링크 구조의 충실한 빈 상태를 구현하고 있으나, `ActivityFeed`는 단순 텍스트, `ComprehensiveExamCountdown`은 dashed border 카드로 각각 다른 방식으로 처리한다.
- **로딩 스켈레톤**: `AcademicCalendarProgress`는 `h-32 animate-pulse rounded-xl bg-muted`를 쓰고, `MyAcademicActivitiesWidget`은 `text-sm text-muted-foreground "불러오는 중…"` 텍스트를 쓴다. 표준이 없다.

---

## 2. 디자이너 관점 UI 개선점

### 2-1. 정보 위계 재설계 — "The Big 3" 원칙

현재 11개 위젯이 평등하게 나열된다. 사용자의 주의는 유한하다. `NextActionBanner` → `AcademicCalendarProgress` → `MyTodosWidget`을 **최상위 레이어(Primary Zone)**로 분리하고, 나머지를 Secondary/Tertiary로 계층화해야 한다. 구체적으로는 Primary Zone 위젯에 배경 색조 차이, 약간의 shadow-md, 폰트 크기 업스케일(h2를 `text-lg font-semibold` → `text-xl font-bold`)을 적용하여 시각 무게를 의도적으로 분배한다.

### 2-2. 색상 시스템 — 중앙 시맨틱 토큰 도입

파일마다 흩어진 컬러 상수를 `src/lib/design-tokens.ts`로 수렴한다.

```ts
// 제안 구조
export const SEMANTIC = {
  info:    { bg: "bg-blue-50/60 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800",    text: "text-blue-900 dark:text-blue-100" },
  warning: { bg: "bg-amber-50/60 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800",  text: "text-amber-900 dark:text-amber-100" },
  danger:  { bg: "bg-rose-50/60 dark:bg-rose-950/30",    border: "border-rose-200 dark:border-rose-800",    text: "text-rose-900 dark:text-rose-100" },
  success: { bg: "bg-emerald-50/60 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-100" },
} as const;
```

이를 통해 `ComprehensiveExamCountdown`(amber), `PushPermissionPrompt`(blue), `관리 알림`(amber) 등이 동일 토큰을 참조하게 된다. 다크 모드 누락 문제도 일괄 해결된다.

### 2-3. 여백·간격 리듬 — 8px 그리드 강제

현재 `mt-6`, `mt-8`, `p-4`, `p-5`, `p-6`이 컴포넌트별로 혼용된다. `MyTodosWidget`은 `p-4 sm:p-5`, 나머지는 `p-6`으로 기준이 다르다. 8px 배수 그리드(`space-y-4` → 16px, `space-y-6` → 24px)를 위젯 간 공통 리듬으로 정하고, 내부 패딩은 16px/24px 두 단계만 허용한다. `mt-6`(24px)은 섹션 간 간격, `mt-4`(16px)은 위젯 내부 요소 간격으로 역할을 명확히 구분한다.

### 2-4. 모듈러 카드 시스템 — `WidgetCard` 추상화

```tsx
// 제안: src/components/ui/widget-card.tsx
interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  semantic?: "default" | "info" | "warning" | "danger";
  children: React.ReactNode;
}
```

이 단일 컴포넌트가 헤더 구조(아이콘 + h2 + 우측 액션), 시맨틱 배경/테두리, 내부 패딩을 통합 관리한다. 현재 10개 위젯에 흩어진 `flex items-center gap-2 + Icon + h2` 패턴이 한 곳으로 수렴된다.

### 2-5. 마이크로 인터랙션 — hover·focus·active 정의

현재 hover 효과는 `hover:bg-muted/50`, `hover:bg-muted/40`, `hover:bg-muted/30`이 혼용된다. Framer Motion이 의존성에 포함되어 있으나 대시보드에서는 전혀 사용되지 않는다. 최소한 다음 두 인터랙션을 추가하는 것이 체감 품질을 높인다.

- **StatCard**: `whileHover={{ y: -2 }}` + `transition={{ duration: 0.15 }}` — 카드가 살짝 떠오르는 느낌
- **NextActionBanner ChevronRight**: 현재 `group-hover:translate-x-0.5`(0.5 = 2px)가 정의되어 있으나 나머지 위젯 링크들은 hover 피드백이 없다. `→` 아이콘에 일관된 `group-hover:translate-x-1` 규칙을 전파한다.

`focus-visible` 링 스타일이 shadcn 기본값에 의존하는데, 일부 커스텀 `<button>`들(`MiniCalendar`의 월 이동 버튼, 평점 버튼 등)은 `focus-visible:ring`이 명시되어 있지 않아 키보드 접근성 갭이 있다.

### 2-6. 빈 상태 디자인 — 통일된 EmptyState 컴포넌트

세 가지 상이한 빈 상태 표현을 하나로 수렴한다.

```tsx
// 제안: src/components/ui/empty-state.tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actions?: { label: string; href: string }[];
}
```

특히 `ActivityFeed`의 `<p className="py-6 text-center text-sm text-muted-foreground">아직 활동 내역이 없습니다.</p>`는 아이콘도 없고 CTA도 없는 단순 텍스트다. 새 회원이 처음 접속했을 때 대시보드의 절반이 이런 빈 상태로 채워질 수 있는데, 이때 "왜 비어있는지", "어떻게 채울 수 있는지"를 안내하는 컨텍스트가 없으면 서비스가 미완성처럼 느껴진다.

### 2-7. 모바일 우선 레이아웃

StatCard 그리드가 `grid-cols-2 gap-4 md:grid-cols-4`로 모바일에서 2열 처리되는 것은 적절하다. 그러나 `MyTodosWidget`의 탭 5개(`grid-cols-5`)는 모바일 375px 기준으로 각 탭이 약 63px 너비가 되어 "전체", "수업", "연구활동", "학술활동", "운영진" 텍스트가 `text-[11px]`로 줄어든다. 이를 모바일에서는 가로 스크롤 탭(`overflow-x-auto whitespace-nowrap`)으로 전환하거나, "전체" 탭을 드롭다운 셀렉터로 변경한다.

`DailyClassTimelineWidget`은 17~23시 시간축에 카드가 부유하는 구조로 가로 공간을 많이 요구하는데, 모바일에서 카드 오버플로가 발생할 가능성이 있다(파일이 28k 토큰 초과로 전체 읽기 불가했으나 구조상 예측 가능).

### 2-8. 애니메이션·모션 절제 — reduced-motion 준수

Framer Motion이 설치되어 있으나 `prefers-reduced-motion` 처리 코드가 대시보드 어디에도 없다. `AcademicCalendarProgress`의 진행바가 CSS `width` 인라인 스타일로 즉시 렌더되어 애니메이션이 없는 것은 오히려 접근성 측면에서 안전하다. Framer Motion 사용 시 반드시 `useReducedMotion()` 훅을 적용하고, 30초마다 `now`를 갱신하는 `NextActionBanner`의 interval이 숨겨진 탭에서도 실행되므로 `document.hidden` 체크를 추가하는 것이 자원 효율과 UX 모두에 유리하다.

### 2-9. 아이콘 사용 일관성

모든 위젯이 Lucide React를 사용하는 것은 일관적이다. 그러나 사이즈가 `size={14}`, `size={16}`, `size={18}`, `size={20}`으로 4종이 혼재한다. 섹션 헤더 아이콘은 `size={18}`, 인라인 텍스트 내 아이콘은 `size={14}`, StatCard 아이콘은 `size={20}`으로 3단계만 사용하는 가이드라인이 필요하다.

---

## 3. UX 흐름 개선점

### 3-1. 첫 진입 인지 부하 — "Zero State" 경험 설계

신규 가입 회원이 처음 대시보드에 접속하면 `TodayTodosPopup`(다이얼로그)이 먼저 뜨고, 그 뒤에 페이지가 로드된다. 11개 위젯 중 절반 이상이 빈 상태("불러오는 중…", "없습니다")로 표시된다. Firebase 데이터 로딩 지연과 맞물리면 여러 위젯이 스켈레톤과 빈 상태 사이를 오가는 레이아웃 시프트가 발생한다.

개선 방향: 첫 접속 여부를 `localStorage`로 감지하여 입문 온보딩 카드("이렇게 시작하세요 — 수강과목 등록 → 세미나 신청 → 학술활동 참여")를 맨 위에 단 하나 노출하고, 빈 위젯들은 로딩 완료 후 fadeIn으로 순차 등장시킨다. 동시에 모든 위젯을 즉시 렌더하는 것보다 **위젯 우선순위 큐** 방식(Primary Zone 먼저, 나머지는 Intersection Observer로 지연 렌더)을 적용하면 인지 부하가 줄어든다.

### 3-2. 핵심 액션 동선 — CTA 위치와 스캔 패스

현재 "빠른 액션" 버튼(게시글 작성·세미나·마이페이지·운영 콘솔)이 StatCard 아래, 즉 페이지 중간에 위치한다. F-패턴 스캔 기준으로 사용자의 시선은 상단 좌측에서 출발하므로, 핵심 CTA는 `PageHeader`의 `actions` 영역에 배치하는 것이 더 자연스러운 동선이다.

구체적으로는 `NextActionBanner`를 최상단 sticky 위치(현재 `py-16` 패딩 아래)로 올리고, 가장 긴급한 액션 1건을 버튼 형태로 강조한다. "빠른 액션" 섹션은 삭제하거나 헤더 영역 `actions` prop으로 통합한다.

### 3-3. 페르소나별 노출 우선순위

현재 `isStaff` 조건 분기는 StatCard 4개와 "관리 알림" 섹션에만 적용된다. 그러나 운영진(staff/president)이 가장 먼저 봐야 할 것은 "승인 대기 회원 N명", "미답변 문의 N건" 같은 운영 지표다. 이것들이 페이지 중간의 StatCard 안에 숨어 있어, 급한 처리가 필요한 상황에도 스크롤 없이 인지되지 않는다.

제안: 운영진 접속 시 `NextActionBanner` 바로 아래에 "운영 알림 배너"를 별도 레이어로 삽입하고, 일반 회원의 `AcademicCalendarProgress` 위치를 차지한다. 즉, **페르소나별 Primary Zone 위젯 배치가 달라져야** 한다.

졸업생(alumni)은 종합시험·수강 관련 위젯이 덜 유효하고, 학술활동·동문 네트워크·뉴스레터가 더 의미 있다. 현재는 졸업생도 재학생과 동일한 위젯 배치를 경험한다.

### 3-4. 시즌·학기 컨텍스트 적응

`AcademicCalendarProgress`는 학기 진행도를 잘 보여주지만, **학기 경계(방학 중)** 상태일 때는 `before`/`after` 페이즈 표시만 하고 "다음 학기까지 N일"처럼 미래를 안내하는 정보가 없다. 방학 중 접속한 회원에게는 진행도바 대신 "다음 학기 개강까지 D-42" 같은 카운트다운이 더 의미 있는 정보다.

학기 시즌별로 위젯 자체의 텍스트·색조가 바뀌는 **시즌 어댑터 패턴**을 `AcademicCalendarProgress` 내부에 적용한다.

### 3-5. 모바일 상호작용 깊이

`MiniCalendar`에서 세미나가 있는 날짜를 탭하면 하단에 세미나 목록이 인라인 확장된다. 이는 모바일 친화적인 패턴이다. 그러나 `MyTodosWidget`의 인라인 편집(연필 아이콘 → Input 필드 전환)은 모바일에서 hover 트리거(`group-hover:opacity-100`)로만 노출되어 **터치 환경에서 편집 버튼이 보이지 않는** 문제가 있다. `focus-within:opacity-100`이 명시되어 있어 탭 후 보이기는 하지만, 처음 사용자는 편집 기능 자체를 발견하지 못할 수 있다. 모바일에서는 항상 편집/삭제 버튼을 표시하거나, 스와이프 제스처로 액션을 트리거하는 패턴을 적용한다.

### 3-6. 알림 노이즈 대 정보 가치

로그인 시 `TodayTodosPopup`이 자동으로 뜨고, 동시에 `PushPermissionPrompt` 배너가 표시되며, `NextActionBanner`도 상단에 있다. 이 세 가지가 동시에 화면에 등장하면 알림 피로(notification fatigue)가 발생한다.

`TodayTodosPopup`이 `isUndergradPopupActive` 체크로 학부 정보 팝업과의 충돌을 막는 로직은 이미 존재한다. 이 패턴을 확장하여 **전역 알림 조율 레이어(NotificationOrchestrator)**를 도입한다. 우선순위: 운영 알림 > 오늘 마감 할 일 > 푸시 권한 요청 순으로 하루에 최대 1개의 modal/sheet만 자동 노출되도록 제한한다.

---

## 4. 컴포넌트 시스템 제안

### 4-1. WidgetCard (래퍼 추상화)

```tsx
// src/components/ui/widget-card.tsx
<WidgetCard
  title="나의 할 일"
  icon={<ListChecks size={18} />}
  semantic="default"
  actions={<Button size="sm">추가</Button>}
>
  {children}
</WidgetCard>
```

내부에서 `cn(SEMANTIC[semantic].bg, SEMANTIC[semantic].border)` 를 조합. 다크 모드·시맨틱 색상 일괄 관리.

### 4-2. EmptyState (빈 상태 표준화)

```tsx
// src/components/ui/empty-state.tsx
<EmptyState
  icon={<Users size={24} />}
  message="참여 중인 학술활동이 없습니다"
  actions={[
    { label: "스터디 둘러보기", href: "/activities/studies" },
    { label: "프로젝트 둘러보기", href: "/activities/projects" },
  ]}
/>
```

### 4-3. SkeletonWidget (로딩 표준화)

```tsx
// src/components/ui/skeleton-widget.tsx
<SkeletonWidget rows={3} />  // → rows × h-10 animate-pulse
```

### 4-4. 디자인 토큰 파일

```ts
// src/lib/design-tokens.ts
export const WIDGET_PADDING = "p-5 sm:p-6";  // 일관된 내부 패딩
export const WIDGET_GAP = "mt-5";            // 위젯 간 간격
export const SECTION_ICON_SIZE = 18;         // 섹션 헤더 아이콘
export const INLINE_ICON_SIZE = 14;          // 인라인 텍스트 아이콘
```

### 4-5. 페르소나별 위젯 배열 설정

```ts
// src/features/dashboard/widget-order.ts
export const WIDGET_ORDER: Record<UserRole, string[]> = {
  member:   ["NextActionBanner", "AcademicCalendar", "MyTodos", "Stats", "QuickActions", "Notices", "Calendar", "AcademicActivities", "ComprehensiveExam", "PeerFeed", "ActivityFeed"],
  staff:    ["StaffAlertBanner", "NextActionBanner", "MyTodos", "Stats", "AcademicCalendar", "Notices", "Calendar", "PeerFeed"],
  alumni:   ["NextActionBanner", "Newsletter", "PeerFeed", "AcademicActivities", "Notices"],
  advisor:  ["StaffAlertBanner", "Seminars", "PeerFeed", "Notices"],
};
```

---

## 5. 우선순위 매트릭스

| # | 개선 항목 | 영향도 | 구현 난이도 | 우선순위 |
|---|-----------|--------|-------------|----------|
| A | WidgetCard 추상화 + 래퍼 통일 | 높음 | 낮음 | P0 |
| B | 시맨틱 색상 토큰 + 다크 모드 | 높음 | 낮음 | P0 |
| C | 빈 상태 EmptyState 통일 | 높음 | 낮음 | P0 |
| D | 모바일 탭(5개) → 스크롤 탭 전환 | 높음 | 낮음 | P0 |
| E | 알림 조율 레이어 (Popup 중복 방지) | 높음 | 중간 | P1 |
| F | 페르소나별 위젯 배열 분리 | 높음 | 중간 | P1 |
| G | 로딩 스켈레톤 표준화 | 중간 | 낮음 | P1 |
| H | CTA → PageHeader actions 통합 | 중간 | 낮음 | P1 |
| I | 인라인 편집 모바일 상시 노출 | 중간 | 낮음 | P1 |
| J | 방학 중 카운트다운 어댑터 | 중간 | 중간 | P2 |
| K | StatCard hover 마이크로모션 | 낮음 | 낮음 | P2 |
| L | 페르소나별 Zero State 온보딩 | 높음 | 높음 | P2 |
| M | 위젯 지연 렌더(Intersection Observer) | 중간 | 높음 | P3 |
| N | 전역 알림 조율 시스템 전체 구현 | 높음 | 높음 | P3 |

---

## 6. 즉시 적용 Quick Wins (1일 이내)

### QW-1. WidgetCard 컴포넌트 생성 + 6개 위젯 적용
`rounded-2xl border bg-card p-6` + `flex items-center gap-2 <Icon> <h2>` 패턴을 `<WidgetCard>` 한 컴포넌트로 교체. 코드 중복 제거 효과 즉시 가시적.

### QW-2. 시맨틱 토큰 파일 생성 + ComprehensiveExamCountdown·PushPermissionPrompt·관리 알림 적용
`src/lib/design-tokens.ts`에 `SEMANTIC` 상수 정의 후 하드코딩된 `bg-amber-50/40 border-amber-200` 등을 참조로 교체. 다크 모드 일괄 적용.

### QW-3. MyTodosWidget 모바일 탭 — `overflow-x-auto` 전환
`TabsList`의 `grid grid-cols-5`를 `flex overflow-x-auto gap-1 pb-0.5`로 교체하고 각 `TabsTrigger`에 `shrink-0` 추가. 모바일 375px에서 텍스트 잘림 즉시 해소.

### QW-4. 인라인 편집 버튼 모바일 상시 표시
`CourseTodoItem`의 `opacity-0 group-hover:opacity-100`을 `sm:opacity-0 sm:group-hover:opacity-100`으로 수정하여, 모바일(sm 미만)에서는 편집·삭제 버튼이 항상 표시되도록 변경.

### QW-5. 알림 동시 노출 제한 — TodayTodosPopup과 PushPermissionPrompt 순차화
`PushPermissionPrompt`에 `dialog-active` 전역 상태 체크를 추가하여 `TodayTodosPopup`이 열려 있는 동안에는 배너를 숨긴다. 기존 `isUndergradPopupActive` 패턴과 동일한 방식으로 2시간 내 구현 가능.

---

*이 리포트는 디자이너 관점에서 시각 언어·위계·컴포넌트 시스템에 집중하여 작성되었습니다. 병렬로 수행 중인 Codex 분석과 교차 검토를 권장합니다.*
