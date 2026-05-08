# 학술대회 프로그램 페이지 UI/UX 분석 및 개선 기획

> 분석 대상: `https://yonsei-edtech.vercel.app/activities/external/[id]/program`  
> 분석 범위: ConferenceProgramView · ConferenceProgramEditor · ConferenceProgramStats · MyConferenceSessions · ConferenceCheckinScanner · ConferenceCheckinQrBoard · ConferenceRoundupView · PersonalSchedulePdfDocument  
> 분석 기준: Next.js 16 / TailwindCSS v4 / shadcn/ui / framer-motion / design-tokens.ts  
> 작성: Claude (Designer 에이전트), 2026-05-06

---

## 1. 현황 진단 — 디자이너 시각

### 1-1. 시각 위계

가장 눈에 띄는 구조적 문제는 **모든 세션 카드가 동일한 시각 무게를 가진다**는 점이다. 기조강연(keynote)과 휴식(break)이 같은 `Card` 컴포넌트에 같은 `p-4` 패딩으로 렌더된다. 카테고리 배지 색상은 분리되어 있으나, 카드 자체의 크기·그림자·배경 차이가 없어 계층 구조가 시각적으로 표현되지 않는다.

헤더 영역은 `ConferenceProgram.title`과 활동명 배지를 나란히 두지만 제목과 부제의 타이포그래피 차이가 미미하다(`text-base font-semibold` 수준). 학회명·일수·세션 수·링크가 한 줄에 병렬로 나열되어 정보의 중요도가 평탄화된다.

### 1-2. 정보 밀도

세션 카드 내부에 카테고리 배지 + 트랙 배지 + 시간 + 위치 + 상태 배지 + 동행 배지 + 충돌 경고 배지가 단일 `flex-wrap` 행에 무순서로 늘어선다. 모바일(375px)에서 배지들이 2–3행으로 줄바꿈되면서 시선 경로가 파편화된다. 시간·장소는 사용자가 가장 먼저 찾는 정보임에도 배지들 사이에 묻혀 있다.

발표자 정보(`s.speakers + s.affiliation`)와 초록(`s.abstract`)은 조건부 렌더이나 항상 같은 `text-sm text-foreground/80` 처리라 짧은 제목 세션과 긴 초록 세션의 카드 높이 편차가 크고, 전체 목록 스캔 시 리듬이 깨진다.

### 1-3. 토큰 일관성

`design-tokens.ts`의 SEMANTIC 팔레트(info/warning/danger/success)는 대시보드 위젯용으로 잘 정의되어 있다. 그러나 회의 프로그램 컴포넌트들은 이 토큰을 **전혀 사용하지 않고** 하드코딩된 Tailwind 색상(`bg-blue-50 text-blue-700`, `bg-emerald-50 text-emerald-700`)을 직접 쓴다. 상태 색상 정의가 `STATUS_COLORS` 상수로 별도 분리되어 있으나 SEMANTIC과 연결되지 않아 다크 모드 대응이 누락되었다.

`CONFERENCE_SESSION_CATEGORY_COLORS`의 dark 변형 클래스도 없다. 예를 들어 keynote는 `bg-purple-100 text-purple-800 border-purple-200`으로만 정의되어 다크 모드에서 배경과 텍스트의 명암비가 역전될 가능성이 있다.

### 1-4. 컴포넌트 패턴 재사용

`WidgetCard`와 `EmptyState`는 각각 적절히 추상화되어 있으나, 세션 카드 자체는 추상화 없이 `ConferenceProgramView` 내부 `.map()` 인라인으로 처리된다. 같은 세션 렌더링 패턴이 View·Stats·Roundup에서 조금씩 다르게 복제된다. `SessionCard` 컴포넌트가 없어 변경이 세 군데에 동시 적용되어야 한다.

`Stat` 헬퍼 함수가 View와 Roundup에 각각 별도로 정의되어 있다(완전히 동일한 구조). 이는 컴포넌트 추출이 필요한 신호다.

### 1-5. 모바일·다크 모드 일관성

QR 보드(`ConferenceCheckinQrBoard`)의 QR 코드는 하드코딩된 `fgColor="#0a2e6c"`를 사용한다. 다크 모드에서 어두운 배경에 어두운 QR이 렌더되면 스캔 불가 상황이 발생한다. 또한 `print:` 유틸리티가 QR 보드에만 존재하고 인쇄 시 헤더 숨기기/레이아웃 등이 명시적으로 처리되어 있으나, QR 카드 자체는 인쇄 최적화(여백, 폰트 크기)가 부족하다.

`ConferenceProgramView`의 상단 뷰모드 탭(일자별/발표자)과 일자 탭이 두 단계로 중첩되어 있어 모바일에서 화면 상단 40–50px를 고정 요소 없이 소비한다. 스크롤 시 탭이 사라져 현재 일자 컨텍스트를 잃게 된다.

---

## 2. 디자이너 관점 UI 개선점 7건+

### UI-01. 카테고리별 세션 카드 시각 차별화

현재 모든 카드가 동일한 `border bg-card` 외형을 가진다. 카테고리 위계를 카드 레벨로 격상해야 한다.

- **keynote / ceremony**: 전체 너비, 좌측 4px 컬러 바 + 약한 배경 틴트, `text-lg` 제목
- **paper / poster / media / workshop**: 표준 카드
- **break / networking**: 축소 카드(compact variant), `py-2` 패딩, 텍스트만

이 변경만으로도 시간표가 실제 학회 프로그램북처럼 읽힌다.

### UI-02. 세션 카드 정보 레이아웃 재편

배지 무더기를 해소하기 위해 카드 내부 구조를 2행으로 분리한다.

```
[시간 블록]  [제목 (font-semibold)]
             [발표자 · 소속 · 장소]
             [배지 행: 카테고리 | 트랙 | 상태]
```

시간은 좌측 고정 컬럼(60–80px)으로 분리해 세로 목록에서 시간 흐름이 시각적 리듬이 되도록 한다. 실제 컨퍼런스 앱(Sched, Whova)이 채택하는 패턴이다.

### UI-03. 시간 충돌 경고의 인라인 표시 강화

현재 충돌은 배지 하나(`AlertTriangle 시간 충돌 N`)로만 표시된다. 충돌이 있는 세션 카드는 카드 우측에 붉은 세로 줄무늬 또는 `ring-2 ring-rose-400/50` 테두리로 즉각 시각화하고, 카드 내 충돌 경고 블록은 "충돌: [세션명] [시간]" 형식의 클릭 가능 링크로 만들어야 한다.

### UI-04. Sticky 시간축 + Now-line

일자별 목록에서 현재 시각을 기준으로 "지금 진행 중" 세션에 초록 점멸 인디케이터를 추가하고, 지난 세션은 `opacity-60`으로 처리한다. 세션 수가 많을 때 스크롤 중 시간 맥락을 잃지 않도록 상단에 sticky day/time 헤더를 붙인다.

모바일에서는 `position: sticky; top: 0`으로 현재 일자 탭을 고정해 스크롤해도 "1일차 · 2026-05-09" 컨텍스트가 유지되어야 한다.

### UI-05. 빈 상태·로딩·에러 디자인 일관성

현재 `ConferenceProgramView`의 빈 상태는 직접 작성한 `div + Calendar 아이콘 + p` 구조다. `EmptyState` 컴포넌트가 이미 존재하나 이 화면에서 사용되지 않는다. 모든 빈 상태를 `EmptyState`로 교체하되, 운영진 권한 사용자에게는 "프로그램 등록하기" CTA를 추가 action으로 보여줘야 한다.

로딩 상태는 `Loader2 animate-spin + 텍스트` 패턴인데, 카드 Skeleton(`skeleton-widget`)을 사용해 레이아웃 시프트를 줄여야 한다.

### UI-06. 애니메이션 및 마이크로인터랙션

framer-motion이 의존성에 있으나 이 영역에서는 전혀 사용되지 않는다. 다음 고임팩트 포인트에 집중 적용한다.

- **세션 카드 진입**: `staggerChildren` 0.04s 간격으로 아래서 위로 `y: 8 → 0`, `opacity: 0 → 1`
- **내 일정 추가 버튼 클릭**: 카드 좌측 테두리가 `border-transparent → border-blue-400`로 전환, 체크 아이콘이 scale 튀는 효과
- **QR 체크인 성공**: CheckCircle2 아이콘 주변에 초록 ripple 효과(0.4s)
- **일자 탭 전환**: 컨텐츠 영역 `AnimatePresence` + `x: 20 → 0` 슬라이드

### UI-07. PDF 디자인 개선

`PersonalSchedulePdfDocument`는 Pretendard 폰트를 적용한 점이 좋다. 그러나 카테고리 색상 바(`borderLeftColor`)가 고정 `#0a2e6c`(primary blue)로 통일되어 있어 키노트/논문/포스터를 시각적으로 구분하지 못한다. `CATEGORY_COLOR` 매핑이 이미 선언되어 있으므로 각 세션 카드의 `borderLeftColor`를 카테고리별 색상으로 교체해야 한다.

또한 세션 카드 간 `marginBottom: 6`이 너무 타이트하다. 하루에 세션이 많을 경우 내용 블록(reasonBlock, notesBlock, reflectionBlock)이 모두 포함된 카드와 그렇지 않은 카드 사이 밀도 편차가 크다. `wrap={false}` 덕분에 페이지 잘림은 없으나, 일자 구분 헤더 배경색(`#f3f4f6`)이 print 환경에서 CSS 기본 정책으로 제거될 수 있어 `backgroundColor` 확인이 필요하다.

---

## 3. UX 흐름 개선점 5건+

### UX-01. 신규 진입자 온보딩: 추천 세션 강조

대회 처음 참가하는 대학원생은 수십 개 세션 중 무엇을 선택해야 할지 모른다. 현재는 전체 목록이 평탄하게 나열된다. 개선 방향:

- 전체 참석자 중 선택 수가 많은 세션(allPlans 기반) 상위 3개에 "인기" 배지(Sparkles 아이콘) 자동 부여
- 미로그인 사용자 진입 시 페이지 상단에 "세션을 내 일정에 추가하고 PDF로 저장하세요" 배너를 한 번만(session storage) 표시
- `break / networking` 카테고리는 기본적으로 접힌 상태로 표시하여 핵심 세션에 집중할 수 있게 함

### UX-02. 세션 선택 → 참석 → 후기 흐름의 마찰 최소화

현재 흐름: "내 일정에 추가" 클릭 → Dialog(선택 이유 입력) → 저장  
문제: 선택 이유 입력이 **필수처럼 보이는 Dialog**를 거쳐야 한다. 빠른 스캔 중에 Dialog가 뜨면 맥락이 끊긴다.

개선: 선택 이유는 부가적 행동이므로 기본 선택은 Dialog 없이 즉시 처리하고, 세션 카드 내부에 "선택 이유 추가" 인라인 링크를 나중에 제공한다. 참석 후기는 QR 체크인 직후 시트(BottomSheet on mobile, Popover on desktop)로 즉시 프롬프트한다.

### UX-03. QR 체크인 후 후기 자동 프롬프트

`ConferenceCheckinScanner`에서 체크인 성공(`feedback.kind === "success"`) 시 2초 후 자동으로 후기 작성 시트를 열어준다. 현재는 체크인 성공 피드백만 보여주고 후기 작성 진입점이 없다. 사용자는 다시 프로그램 페이지로 돌아가 해당 세션 카드를 찾아 "후기 남기기" 버튼을 눌러야 한다. 이 3단계 탐색이 후기 작성률을 낮추는 핵심 friction이다.

개선: 체크인 피드백 카드 하단에 "지금 후기 남기기" CTA를 인라인 배치하고, 클릭 시 평점 + 한 줄 후기를 해당 스캐너 페이지 내에서 바로 저장할 수 있게 한다.

### UX-04. 운영진과 일반 회원 진입점 분리

현재 운영진용 기능(프로그램 편집, QR 보드)은 별도 URL(`/checkin/qr`, 운영진 탭)로 분리되어 있으나, 일반 참석자 프로그램 뷰에도 운영진 탭이 노출된다(활동 상세 페이지에서 권한에 따라 탭 분기). 프로그램 뷰 페이지 자체(`ConferenceProgramView`)에는 권한 분기가 없어, 운영진이 통계/편집으로 가려면 상위 페이지 탭으로 되돌아가야 한다.

개선: 운영진 권한 사용자에게 프로그램 뷰 상단에 "운영 도구" 드롭다운(편집 / QR 보드 / 통계) 플로팅 버튼을 표시해 컨텍스트 전환 없이 접근할 수 있게 한다. 일반 회원에게는 보이지 않는다.

### UX-05. 모바일 vs 데스크톱 사용 패턴 차이 대응

학회 **당일** 사용은 거의 모바일이다. 그러나 현재 레이아웃은 모바일과 데스크톱이 동일한 단일 컬럼 카드 목록이다. 데스크톱에서 `max-w-5xl` 컨테이너는 좌우 여백이 크게 낭비된다.

개선:
- **데스크톱**: 좌측 day 네비게이션(sticky sidebar) + 우측 세션 목록 2컬럼 그리드
- **모바일**: 하단 sticky 탭바(오늘/전체/내 일정), 세션 목록은 단일 컬럼 유지
- 모바일에서 세션 카드를 스와이프해 빠르게 "내 일정 추가/제거" 처리(swipe-to-action)

---

## 4. 컴포넌트 시스템 제안

### 4-1. SessionCard 컴포넌트 추상화

```tsx
// src/features/conference/SessionCard.tsx
interface SessionCardProps {
  session: ConferenceSession;
  plan?: UserSessionPlan;
  companions?: UserSessionPlan[];
  conflicts?: UserSessionPlan[];
  variant?: "default" | "compact" | "keynote";
  onSelect?: () => void;
  onRemove?: () => void;
  onMarkAttended?: () => void;
  onOpenNotes?: () => void;
  showNowIndicator?: boolean;
  isNow?: boolean;
  isPast?: boolean;
}
```

`variant="keynote"`는 full-width + 좌측 컬러 바 + 배경 틴트, `variant="compact"`는 break/networking용 축소 렌더. 이 컴포넌트를 View·MyConferenceSessions에서 공유한다.

### 4-2. 세션 상태 배지 시스템

현재 `STATUS_COLORS`, `STATUS_LABELS`와 `CONFERENCE_SESSION_CATEGORY_COLORS`가 각각 독립 상수로 존재한다. SEMANTIC 토큰과 연계한 단일 `SessionStatusBadge` 컴포넌트로 통합한다.

```tsx
// planned → SEMANTIC.info 기반
// attended → SEMANTIC.success 기반
// skipped → SEMANTIC.default(muted) 기반
// recommended → SEMANTIC.warning 기반 (신규, 인기 세션 표시용)
```

다크 모드 대응이 자동으로 해결된다.

### 4-3. 시간축 컴포넌트 (TimelineAxis)

```tsx
// src/features/conference/TimelineAxis.tsx
// 세션 목록을 시간 순 렌더할 때 왼쪽 고정 시간 컬럼 제공
// 30분 단위 격자선, 현재 시각 now-line, 지난 세션 dim 처리
```

### 4-4. PDF 템플릿 디자인 일관성

`PersonalSchedulePdfDocument`의 `sessionCard.borderLeftColor`를 `CATEGORY_COLOR[session.category]`로 교체한다(이미 상수 정의 존재). 라운드업 PDF 추가 시 동일 Document 스타일시트를 재사용할 수 있도록 `pdfStyles` 모듈로 분리한다.

---

## 5. 우선순위 매트릭스

| # | 개선 항목 | 사용자 영향도 | 구현 난이도 | 우선순위 |
|---|-----------|:---:|:---:|:---:|
| UI-01 | 카테고리별 카드 시각 차별화 | 높음 | 낮음 | **P0** |
| UI-02 | 세션 카드 정보 레이아웃 재편 | 높음 | 중간 | **P0** |
| UX-03 | QR 체크인 후 후기 자동 프롬프트 | 높음 | 낮음 | **P0** |
| UX-02 | 세션 선택 마찰 최소화 (Dialog 제거) | 높음 | 낮음 | **P0** |
| UI-04 | Sticky 시간축 + Now-line | 높음 | 중간 | **P1** |
| UI-03 | 충돌 경고 인라인 강화 | 중간 | 낮음 | **P1** |
| UX-01 | 신규 진입자 추천 세션 강조 | 중간 | 중간 | **P1** |
| UI-05 | EmptyState·Skeleton 일관성 | 중간 | 낮음 | **P1** |
| UX-04 | 운영진 진입점 분리 | 중간 | 낮음 | **P1** |
| 4-1 | SessionCard 컴포넌트 추상화 | 낮음(DX) | 중간 | **P2** |
| 4-2 | SessionStatusBadge SEMANTIC 연계 | 중간 | 낮음 | **P1** |
| UI-07 | PDF 카테고리 색상 바 개선 | 낮음 | 낮음 | **P2** |
| UI-06 | framer-motion 마이크로인터랙션 | 중간 | 중간 | **P2** |
| UX-05 | 데스크톱 2컬럼 / 모바일 sticky 탭 | 높음 | 높음 | **P2** |

---

## 6. 즉시 적용 Quick Wins 5선

이 5건은 코드 변경량이 적고(< 30줄/건), 배포 리스크가 낮으며, 사용자가 즉시 체감할 수 있다.

### QW-01. break/networking 카드 compact 처리 (15분)

`ConferenceProgramView`의 세션 카드 렌더에서 `s.category === "break" || s.category === "networking"`일 때 `p-2 opacity-80`에 작은 텍스트로 렌더. 목록 밀도가 낮아져 핵심 세션이 더 잘 보인다.

### QW-02. QR 체크인 성공 후 후기 CTA 인라인 추가 (20분)

`ConferenceCheckinScanner`의 `feedback.kind === "success"` 블록 하단에 `<Link href={...program}/>`으로 해당 세션의 후기 작성 Dialog를 여는 버튼 추가. 별도 라우팅 없이 state를 URL 파라미터나 sessionStorage로 전달해 프로그램 페이지에서 자동 Dialog 오픈.

### QW-03. SessionStatusBadge의 dark 모드 수정 (10분)

`STATUS_COLORS` 상수를 SEMANTIC 토큰 기반으로 교체:
```ts
planned: SEMANTIC.info.chipBg + " " + SEMANTIC.info.chipText,
attended: SEMANTIC.success.chipBg + " " + SEMANTIC.success.chipText,
skipped: SEMANTIC.default.chipBg + " " + SEMANTIC.default.chipText,
```

### QW-04. PDF 세션 카드 카테고리별 색상 바 적용 (10분)

`PersonalSchedulePdfDocument`의 `styles.sessionCard.borderLeftColor: "#0a2e6c"`를 제거하고, 세션 렌더 시 `[styles.sessionCard, { borderLeftColor: CATEGORY_COLOR[session.category] }]`로 교체. 이미 `CATEGORY_COLOR` 매핑이 선언되어 있으므로 실제 코드 변경은 1줄.

### QW-05. Stat 헬퍼 컴포넌트 공통 추출 (15분)

`ConferenceProgramStats`와 `ConferenceRoundupView`에 동일하게 존재하는 `Stat` 내부 함수를 `src/features/conference/ConferenceStatChip.tsx`로 추출. 중복 코드 제거 + 이후 모든 통계 뷰에서 일관된 스타일 보장.

---

## 7. 개선 프로젝트 단계 제안

### Phase 1 — 즉시 개선 (Quick Wins + P0) · 예상 ~4–5h

**목표**: 현재 사용자가 가장 자주 경험하는 마찰 제거

| 작업 | 파일 | 예상 시간 |
|------|------|----------|
| QW-01~05 적용 | 위 5개 파일 | 1h |
| UI-01: keynote/break 카드 variant 분기 | ConferenceProgramView | 0.5h |
| UI-02: 세션 카드 2행 레이아웃 (시간 좌측 컬럼 분리) | ConferenceProgramView | 1h |
| UX-02: 세션 선택 Dialog → 즉시 추가 + 인라인 이유 입력 | ConferenceProgramView | 1h |
| UI-05: EmptyState 교체 + Skeleton 로딩 | ConferenceProgramView | 0.5h |

### Phase 2 — 경험 심화 (P1) · 예상 ~8–10h

**목표**: 대회 당일 모바일 체험 완성도 제고

| 작업 | 파일 | 예상 시간 |
|------|------|----------|
| UI-04: Sticky day 탭 + Now-line 표시 | ConferenceProgramView | 1.5h |
| UI-03: 충돌 경고 링크 + 카드 ring 시각화 | ConferenceProgramView | 0.5h |
| UX-03: 체크인 후 후기 인라인 프롬프트 (스캐너 내 후기 저장) | ConferenceCheckinScanner | 1.5h |
| UX-01: 인기 세션 배지 + 비로그인 온보딩 배너 | ConferenceProgramView | 1h |
| UX-04: 운영진 플로팅 도구 드롭다운 | ConferenceProgramView | 1h |
| 4-1+4-2: SessionCard 추상화 + SEMANTIC 배지 시스템 | 신규 파일 | 2h |
| UI-06: framer-motion stagger 카드 진입·탭 전환 애니메이션 | ConferenceProgramView | 1h |

### Phase 3 — 레이아웃 리아키텍처 (P2) · 예상 ~12–16h

**목표**: 데스크톱 생산성 + 모바일 퍼스트 레이아웃 전환

| 작업 | 파일 | 예상 시간 |
|------|------|----------|
| UX-05: 데스크톱 사이드바 day 네비 + 2컬럼 세션 그리드 | ConferenceProgramView + layout | 4h |
| UX-05: 모바일 하단 sticky 탭바 (오늘/전체/내 일정) | ConferenceProgramView | 2h |
| 4-3: TimelineAxis 컴포넌트 (30분 격자, now-line, past dim) | 신규 컴포넌트 | 3h |
| PDF: pdfStyles 공통 모듈 분리 + 라운드업 PDF 추가 | PersonalSchedulePdfDocument + 신규 | 2h |
| QR 보드: 다크 모드 QR 색상 대응 (fgColor 동적 처리) | ConferenceCheckinQrBoard | 1h |
| 전체 회귀 테스트 + 접근성 감사 (키보드 탐색, ARIA) | — | 2h |

---

## 참고: 분석 근거 파일

- `src/features/conference/ConferenceProgramView.tsx` (893줄)
- `src/features/conference/ConferenceProgramEditor.tsx` (855줄)
- `src/features/conference/ConferenceProgramStats.tsx` (186줄)
- `src/features/conference/ConferenceRoundupView.tsx` (274줄)
- `src/features/conference/ConferenceCheckinScanner.tsx` (277줄)
- `src/features/conference/ConferenceCheckinQrBoard.tsx` (134줄)
- `src/features/conference/PersonalSchedulePdfDocument.tsx` (305줄)
- `src/features/conference/MyConferenceSessions.tsx` (139줄)
- `src/types/academic.ts` (ConferenceSession, UserSessionPlan 타입)
- `src/lib/design-tokens.ts` (SEMANTIC 팔레트)
- `src/app/globals.css` (CSS 변수, Pretendard 폰트)
