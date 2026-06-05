# Step 2: MyPageView 탭 확장 (3탭 → 5탭)

> 상위 계획: 마이페이지 통합 (mypage-consolidation)
> 선행 완료: Step 1 — Header dropdown 중복 4개 항목 제거
> 작성일: 2026-05-12

---

## 1. 현재 구조 분석

### MyPageView.tsx (`src/components/mypage/MyPageView.tsx`)
- **탭 정의**: `TABS` const 배열 (line 50-54), 3개 탭
  ```ts
  const TABS = [
    { key: "home", label: "홈", icon: Home },
    { key: "profile", label: "프로필", icon: UserCog },
    { key: "password", label: "비밀번호", icon: KeyRound },
  ] as const;
  ```
- **타입**: `TabKey = (typeof TABS)[number]["key"]` — union 자동 파생
- **Props**: `{ userId: string; readOnly?: boolean }`
- **탭 전환**: `useState<TabKey>("home")` + URL `?tab=` 쿼리 파라미터 동기화
- **레거시 리다이렉트**: `LEGACY_TABS` 배열로 구 URL → `/mypage/activities` 자동 이관

### 명함 페이지 (`src/app/mypage/card/page.tsx`)
- **CardInner** 컴포넌트 (line 206-405): 재사용 가능한 핵심 로직
  - 내부 자체 탭 3개: `card` / `exchanges` / `received`
  - `react-easy-crop`: Cropper 컴포넌트 + getCroppedBlob 헬퍼
  - `html-to-image`: `handleSavePng()`에서 `await import("html-to-image")` 로 이미 dynamic import
  - 의존성: `useAuthStore`, `useUpdateProfile`, `uploadToStorage`, Firebase Firestore 직접 쿼리
- **분리 가능 영역**:
  - `CardTab` (line 65-129): 명함 미리보기 + 공유/저장/vCard 버튼
  - `ExchangesTab` (line 171-204): 교환 기록
  - `ReceivedCardsSection` (별도 파일 `src/features/card/ReceivedCardsSection.tsx`): 받은 명함 CRUD

---

## 2. 목표 탭 구조

| # | key | label | icon | 콘텐츠 출처 |
|---|-----|-------|------|-------------|
| 1 | `overview` | 개요 | `Home` | 기존 `home` 탭 콘텐츠 그대로 |
| 2 | `card` | 내 명함 | `QrCode` | `CardInner` 통합 (card/page.tsx에서 이관) |
| 3 | `activities` | 내 활동 | `ClipboardList` | 기존 홈 탭의 "내 학회활동" Link를 인라인 임베드로 변경 |
| 4 | `research` | 내 연구 | `BookOpen` | 기존 홈 탭의 "내 연구활동" Link를 인라인 임베드로 변경 |
| 5 | `settings` | 설정 | `Settings` | 기존 `profile` + `password` 탭 병합 |

---

## 3. react-easy-crop / html-to-image Dynamic Import 패턴

현재 `card/page.tsx`에서 `react-easy-crop`은 **top-level import**(line 8-9), `html-to-image`는 이미 `await import()`로 lazy.

MyPageView에 통합 시 **둘 다** `next/dynamic` 또는 `React.lazy`로 전환:

```tsx
// MyPageView.tsx 상단에 추가
import dynamic from "next/dynamic";

// CardInner 전체를 dynamic으로 감싸면 내부의 react-easy-crop도 자동 분리됨
const CardSection = dynamic(
  () => import("@/features/card/CardSection"),
  { ssr: false, loading: () => <div className="animate-pulse h-96 rounded-2xl bg-muted" /> }
);
```

이렇게 하면:
- `react-easy-crop` (39KB gzipped) — 명함 탭 클릭 시에만 chunk 로드
- `html-to-image` — 이미 `await import()` 패턴이므로 추가 작업 불필요
- `qrcode.react` — CardSection chunk에 자동 포함

---

## 4. /mypage/card → /mypage?tab=card 리다이렉트

**next.config.ts `redirects()`에 추가** (가장 안전한 방법):

```ts
// next.config.ts redirects() 배열에 추가
{ source: "/mypage/card", destination: "/mypage?tab=card", permanent: false },
{ source: "/mypage/card/exchanges", destination: "/mypage?tab=card", permanent: false },
```

- `permanent: false` (307) — 추후 구조 변경 가능성 대비
- App Router의 `redirect()` 서버 컴포넌트 방식도 가능하나, 이미 next.config.ts에 redirect 패턴이 확립되어 있으므로 일관성을 위해 config 방식 채택

---

## 5. 구현 순서 (파일 수정 순서)

### Task 1: CardSection 컴포넌트 추출 (~1h)
**파일**: `src/features/card/CardSection.tsx` (신규)

- `card/page.tsx`의 `CardInner` 내부 로직을 추출
- `AuthGuard` 래핑 제거 (MyPageView가 이미 인증 상태)
- Props: `{ userId: string }` — 부모에서 user 전달 대신 내부 useAuthStore 유지
- `getCroppedBlob`, `CardTab`, `ExchangesTab` 함수들을 함께 이동
- `ReceivedCardsSection`은 이미 별도 파일이므로 import만 유지

**수용 기준**: `CardSection`이 단독으로 렌더링 가능하고, 기존 `/mypage/card` 경로에서도 이 컴포넌트를 import해서 동일하게 동작

### Task 2: TABS 배열 확장 + TabKey 타입 갱신 (~30m)
**파일**: `src/components/mypage/MyPageView.tsx`

- `TABS` 배열을 5개로 확장 (overview, card, activities, research, settings)
- `LEGACY_TABS`에 `"home"`, `"profile"`, `"password"` 추가 (구 URL 호환)
- 레거시 매핑: `?tab=home` → overview, `?tab=profile` → settings, `?tab=password` → settings
- 기본 activeTab: `"overview"`

**수용 기준**: 탭 5개가 렌더링되고 URL ?tab= 파라미터로 각 탭 전환 가능

### Task 3: 탭 콘텐츠 영역 재배치 (~1.5h)
**파일**: `src/components/mypage/MyPageView.tsx`

- `activeTab === "overview"`: 기존 home 콘텐츠 (LearningStreak ~ 하단 카드 그리드) — 단, "내 명함" Link를 탭 전환 버튼으로 변경
- `activeTab === "card"`: `<CardSection />` dynamic import
- `activeTab === "activities"`: 기존 홈의 "내 학회활동" 카드를 Link 대신 `/mypage/activities` 페이지 콘텐츠 인라인 임베드 (또는 Link 유지하되 설명 강화)
- `activeTab === "research"`: 동일 패턴으로 `/mypage/research` 콘텐츠 임베드 또는 Link 유지
- `activeTab === "settings"`: ProfileEditor + PasswordChangeForm + NotificationSettingsCard + SelfDeleteSection 통합

**수용 기준**: 각 탭 클릭 시 해당 콘텐츠 표시, settings 탭에서 프로필/비밀번호/알림/탈퇴 모두 접근 가능

### Task 4: 리다이렉트 + 정리 (~30m)
**파일**: `next.config.ts`, `src/app/mypage/card/page.tsx`

- next.config.ts에 `/mypage/card` → `/mypage?tab=card` redirect 추가
- `card/page.tsx`를 `CardSection` import + AuthGuard 래핑으로 축소 (하위 호환)
- 홈 탭의 "내 모바일 명함" 카드 Link href를 `/mypage?tab=card`로 변경 또는 `setActiveTab("card")` onClick으로 변경

**수용 기준**: `/mypage/card` 직접 접근 시 `/mypage?tab=card`로 리다이렉트, 기존 북마크 유지

---

## 6. 예상 작업량

| Task | 시간 |
|------|------|
| Task 1: CardSection 추출 | 1.0h |
| Task 2: TABS 확장 + 타입 | 0.5h |
| Task 3: 탭 콘텐츠 재배치 | 1.5h |
| Task 4: 리다이렉트 + 정리 | 0.5h |
| **합계** | **3.5h** |

---

## 7. 위험 요소 / 판단 필요 사항

- **activities/research 탭 콘텐츠**: 현재 각각 별도 페이지(`/mypage/activities`, `/mypage/research`)가 있음. 이 콘텐츠를 MyPageView 안에 인라인으로 넣을지, 아니면 Link 카드를 유지하고 탭으로는 요약만 보여줄지 결정 필요. 인라인 임베드 시 작업량 +2h 추가.
- **모바일 탭 5개 가로 스크롤**: 현재 `overflow-x-auto`가 적용되어 있어 문제없으나, 아이콘+라벨 조합이 5개면 좁은 화면에서 스크롤 필요. 모바일에서 아이콘만 표시하는 반응형 처리 고려.

---

## 성공 기준

1. `/mypage` 접속 시 5개 탭(개요/내 명함/내 활동/내 연구/설정)이 표시됨
2. "내 명함" 탭에서 명함 미리보기/공유/저장/교환기록/받은명함 모두 작동
3. react-easy-crop chunk가 명함 탭 클릭 전에는 로드되지 않음 (Network 탭으로 확인)
4. `/mypage/card` 접속 시 `/mypage?tab=card`로 리다이렉트됨
5. "설정" 탭에서 프로필 수정/비밀번호 변경/알림 설정/회원 탈퇴 모두 접근 가능
6. readOnly 모드에서도 5탭 구조가 정상 렌더링됨
