# 이전 페이지 돌아가기 버튼 UI 가시성 감사

> 조사일: 2026-05-23
> 대상: `src/app/**/*.tsx` 의 "뒤로 / 돌아가기" 버튼 패턴
> 목적: 작고 회색인 텍스트 링크로 가시성이 낮은 버튼을 표준화된 `<BackButton>` 컴포넌트로 교체

## 1. 발견된 패턴

### Pattern A — 작은 회색 텍스트 + ArrowLeft 링크 (가장 흔함, 가시성 ↓)

대표 형태:
```tsx
<Link href="..." className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
  <ArrowLeft size={14} />
  ~로 돌아가기
</Link>
```
또는 `text-xs`, `size={12}` 같은 더 작은 변형.

### Pattern B — `router.back()` 네이티브 버튼

```tsx
<button onClick={() => router.back()} className="...text-sm text-muted-foreground...">
  <ArrowLeft size={16} />
  목록으로
</button>
```

### Pattern C — `<Button variant="outline|ghost">` 래핑

```tsx
<Link href="...">
  <Button variant="outline">세미나 페이지로 돌아가기</Button>
</Link>
```
이미 가시성이 양호한 변형이라 1차 교체 대상 아님.

### Pattern D — `ChevronLeft` 사용 (소수)

`calendar/page.tsx`, `gallery/page.tsx`, `notices/page.tsx`, `board/interview/page.tsx`,
`seminars/[id]/speaker-review/page.tsx`, `newsletter/[id]/magazine/page.tsx` 에서 발견되나
대부분 좌/우 페이지네이션 캐러셀 용도이므로 1차 범위 외.

## 2. 위치 카운트 (전수)

`src/app/**/*.tsx` 의 `ArrowLeft` 매치 51 파일 + `ChevronLeft` 6 파일.
중복 import 라인 제거 후 실제 "뒤로/돌아가기 버튼" 으로 사용된 사례:

### 적용 후보 (1차 — 충돌 회피 범위)

| # | 파일 | 라인 | 현재 클래스 | 적용 variant | 라벨 |
|---|------|------|-------------|--------------|------|
| 1 | `ai-forum/[id]/page.tsx` | 91-99 | text-sm + text-muted-foreground | default | "AI 포럼 목록" |
| 2 | `academic-admin/external/[id]/workbook/page.tsx` | 525-527 | text-sm + muted | default | "학술대회 상세로" |
| 3 | `academic-admin/external/[id]/program/page.tsx` | 70-73 | text-sm + muted | default | "활동 상세로 돌아가기" |
| 4 | `labs/[id]/page.tsx` | 97-99 | text-xs + muted | default | "목록으로" |
| 5 | `alumni/thesis/[id]/page.tsx` | 433-438 | text-xs + muted | default | "학위논문 목록" |
| 6 | `gallery/page.tsx` | 400-409 | (button onClick=back) | default | "갤러리로 돌아가기" |
| 7 | `forgot-password/page.tsx` | 205-210 | text-xs + muted | subtle (유지) | "로그인 페이지로" — 폼 보조라 subtle 유지 |
| 8 | `notices/[id]/page.tsx` | 40-46 | text-sm + muted | default | "목록으로" |
| 9 | `directory/[id]/card/page.tsx` | 88-91 | text-sm + muted | default | "프로필로" |
| 10 | `board/[id]/page.tsx` | 180-201 | text-sm + muted | default | "목록으로" |
| 11 | `steppingstone/thesis-defense/page.tsx` | 15-19 | text-sm + muted | default | "인지디딤판" |
| 12 | `steppingstone/onboarding/page.tsx` | 287-293 | text-xs + muted | default | "인지디딤판" |
| 13 | `steppingstone/current-student/page.tsx` | 80-85 | text-sm + muted | default | "인지디딤판으로" |
| 14 | `steppingstone/conference/page.tsx` | 78-83 | text-sm + muted | default | "인지디딤판으로" |
| 15 | `newsletter/[id]/page.tsx` | 75-80, 90-95 | text-sm + muted | default | "목록으로 돌아가기" |
| 16 | `newsletter/[id]/magazine/page.tsx` | 88-91, 105-109 | text-sm + primary | default | "목록으로" / "상세 보기" |
| 17 | `console/academic/external/[id]/volunteers/page.tsx` | 333-337 | text-xs + muted | default | "활동 상세로" |
| 18 | `console/academic/external/[id]/speakers/page.tsx` | 338-342 | text-xs + muted | default | "활동 상세로" |
| 19 | `console/academic/external/[id]/session-analytics/page.tsx` | 198-202 | text-xs + muted | default | "활동 상세로" |
| 20 | `console/academic/external/[id]/program/page.tsx` | 75-78 | text-sm + muted | default | "활동 상세로 돌아가기" |
| 21 | `console/academic/external/[id]/reviews/page.tsx` | 79-83 | text-xs + muted | default | "활동 상세로" |
| 22 | `console/labs/[id]/page.tsx` | 97-99 | text-xs + muted | default | "목록으로" |
| 23 | `console/card-news/[seriesId]/page.tsx` | 39-44 | text-sm + muted | default | "카드뉴스 목록" |
| 24 | `console/handover/report/page.tsx` | 105-110 | Button variant="outline" size="sm" | default | "업무노트로" — 헤더 우측에서 더 두드러지게 |
| 25 | `console/research/[userId]/page.tsx` | 273-277 | text-xs + muted | default | "연구활동 목록으로" |
| 26 | `console/members/[id]/page.tsx` | 226-231 | text-sm + muted | default | "회원 목록으로" |
| 27 | `progress-meetings/[id]/page.tsx` | 263-265 | text-sm + muted | default | "활동으로 돌아가기" |

총 **27개 위치** (라인 다중 포함 시 30+).

### 동시 작업 충돌 회피로 1차 제외 (후속 처리 대상)

다음 디렉토리는 별도 페이지 레이아웃 통일 / Phase 3.5·5 작업 중이라 1차에서 건드리지 않음:

- `src/app/archive/**` — `[type]/[id]/page.tsx` (240-243, 280-284), `[type]/page.tsx` (255-258), `writing-tips/[id]/page.tsx`, `foundation-terms/[id]/page.tsx`, `statistical-methods/[id]/page.tsx`, `research-methods/[id]/page.tsx`
- `src/app/console/archive/**`
- `src/app/mypage/**` — `portfolio/page.tsx` (242-244)
- `src/app/dashboard/**`
- `src/app/courses/**` — `[id]/schedule/page.tsx` (719-722)
- `src/app/seminars/**` — `[id]/host/page.tsx` (258-262), `[id]/speaker-review/page.tsx` (434-437), `[id]/review/page.tsx` (206-209), `[id]/checkin/page.tsx` (99-102), `[id]/page.tsx` (462-467)
- `src/app/activities/**` — `external/[id]/program/page.tsx`, `external/[id]/workbook/page.tsx`, `external/[id]/review/page.tsx`, `external/[id]/my-volunteer/page.tsx`, `external/[id]/program/notes/[planId]/page.tsx`
- `src/app/profile/**`

## 3. BackButton 컴포넌트 사양

`src/components/ui/back-button.tsx` (신규):

```tsx
interface BackButtonProps {
  href?: string;          // 명시적 경로
  label?: string;         // 기본: "뒤로"
  variant?: "subtle" | "default" | "prominent";
  fallbackHref?: string;  // history 없을 때 fallback
  className?: string;
  ariaLabel?: string;     // 기본: "이전 페이지로 돌아가기"
}
```

### Variant 매핑

| variant | 형태 | 클래스 |
|---------|------|--------|
| `subtle` | 기존 작은 텍스트 링크 (호환용) | `inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors` |
| `default` (권장 기본) | 둥근 배지 + 카드 배경 + 그림자 | `inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors` |
| `prominent` | primary tint 강조 | `inline-flex items-center gap-1.5 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors` |

### 동작
- `href` 주어지면 `<Link href>` 렌더.
- 없으면 `<button type="button" onClick>` 렌더, `router.back()` 호출.
- `fallbackHref` + `window.history.length <= 1` 시 router.push(fallbackHref).
- 키보드 접근성: `aria-label="이전 페이지로 돌아가기"` (커스터마이즈 가능).

## 4. 적용 원칙

- 기존 이동 경로 보존 — UI 만 교체.
- 같은 페이지에 여러 개의 뒤로가기가 있는 경우 (예: `newsletter/[id]/page.tsx` 의 헤더 + 푸터) 둘 다 교체.
- 헤더(상단 sticky) 영역에 있는 회색 링크가 가장 가시성이 낮으므로 우선순위 1순위.
- 폼 흐름 보조용 (예: `forgot-password` 의 "로그인 페이지로") 은 `subtle` 유지로 시각 노이즈 최소화.

## 5. 후속 권장 (남은 페이지 그룹)

| 그룹 | 사유 | 권장 시점 |
|------|------|-----------|
| `archive/**` | Phase 3.5/5 작업 중 | 해당 phase 완료 후 |
| `console/archive/**` | Phase 3.5 작업 중 | 동일 |
| `mypage`, `dashboard`, `courses`, `seminars`, `activities`, `profile` | 페이지 레이아웃 통일 진행 중 | 통일 작업 완료 후 일괄 sweep |

후속 작업 시:
1. 동일 audit 진행.
2. `<BackButton variant="default" href="...">` 으로 교체.
3. ChevronLeft 페이지네이션은 별개 컴포넌트로 분리 검토.
