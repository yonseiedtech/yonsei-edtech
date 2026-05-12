# DESIGN.md — yonsei-edtech 디자인 시스템 정의

> 단일 진입점. AI 에이전트·디자이너·신규 개발자 모두 이 파일 하나로 디자인 원칙을 파악할 수 있어야 한다.
> 사용법·코드 스니펫은 [docs/GETDESIGN.md](./docs/GETDESIGN.md) 참조.
> 최종 갱신: 2026-05-13 (Sprint 67-AR)

---

## 1. 디자인 철학 — 4대 원칙

1. **Clarity (명료성)** — 텍스트가 디자인의 중심. 정보 위계가 명확해야 한다.
2. **Trust (신뢰)** — 학회 공식 콘텐츠로서 정보 정확성·출처 검증이 시각적으로 드러난다.
3. **Operational Autonomy (운영 자율성)** — 운영진이 코드 배포 없이 콘텐츠·서비스를 운영할 수 있어야 한다.
4. **Inclusive (포용성)** — 학기 차이·접근성·다국어 환경 모두 1급 시민.

### 톤 & 보이스
- 학술 어조 + 친근한 안내체
- 단정적이지 않게 ("권장합니다" / "함께 만들어갑니다")
- 한국어 우선, 기술 용어는 영어 그대로

---

## 2. Foundation 토큰

### 2.1 컬러 (Tailwind 기반)

#### Brand & Semantic
- `primary` — Tailwind blue/sky 계열
- `foreground` — slate-900 (light) / slate-100 (dark)
- `background` — white (light) / slate-950 (dark)
- `muted` — slate-100 / slate-900
- `border` — slate-200 / slate-800

#### Status 컬러 (`InlineNotification` · `ActionableBanner` 매핑)
| Status | Light bg / fg | Dark bg / fg |
|---|---|---|
| info | blue-50 / blue-900 | blue-950/40 / blue-100 |
| success | emerald-50 / emerald-900 | emerald-950/40 / emerald-100 |
| warning | amber-50 / amber-900 | amber-950/40 / amber-100 |
| error | rose-50 / rose-900 | rose-950/40 / rose-100 |

#### 카테고리 6색 프리셋 (`ROADMAP_COLOR_PRESETS`)
`blue · emerald · amber · rose · purple · slate` — 학기별 로드맵 카드 + 카테고리형 차트 공용.

### 2.2 타이포그래피

- **본문**: Pretendard 우선, fallback 시스템 폰트
- **헤딩**: `tracking-tight` 자간 압축
- **숫자 강조**: bold + 큰 size (Toss "한 화면 한 메시지" 영향)

#### Type Scale
```
h1 hero       text-4xl sm:text-5xl md:text-6xl lg:text-7xl
h1 page       text-2xl sm:text-3xl lg:text-4xl
h2 section    text-lg ~ text-xl
h3 subsection text-base ~ text-lg
body          text-sm sm:text-base
caption       text-xs
micro         text-[11px]
```

### 2.3 간격 (Tailwind 4px 그리드)
- 카드 padding: `p-4` / `p-5` / `p-6`
- 카드 간 gap: `gap-3` / `gap-4` / `space-y-3~6`
- 섹션 mt: `mt-6` / `mt-8` / `mt-10`

### 2.4 모서리
- 배지·버튼: `rounded-full` / `rounded-lg`
- 카드: `rounded-2xl` (브랜드 일관성)
- 입력 필드: `rounded-md`
- 큰 hero / 콘솔 카드: `rounded-3xl`

### 2.5 그림자
- `shadow-sm` — 카드 기본
- `shadow-md` — hover 상태
- `shadow-lg` — 강조 (CTA·banner)

---

## 3. 컴포넌트 인벤토리

### 3.1 shadcn/ui (기반)
- `Button` — variants: `default` · `outline` · `secondary` · `destructive` · `ghost` · `link`
- `Input`, `Textarea`
- `Badge`
- `Skeleton` (로딩)
- `AlertDialog` (모달 확인)
- `Dialog`, `Sheet`
- `Separator`
- `Progress`

### 3.2 학회 자체 (Carbon Design System 영감)
- `EmptyState` (`src/components/ui/empty-state.tsx`)
- `InlineNotification` (`src/components/ui/inline-notification.tsx`)
- `ActionableBanner` (`src/components/ui/actionable-banner.tsx`)

### 3.3 도메인 컴포넌트 (`src/features/*`)
- `SemesterRoadmap` — 학기별 로드맵 (본인 학기 자동 강조)
- `AIForumLiveWidget` — AI 포럼 라이브 위젯
- `NewMemberWelcomeBanner` — 가입 후 7일 환영
- `BusinessCard` — QR 명함
- `TermBriefHero` — 학기 진행 hero

---

## 4. 핵심 UX 패턴

### 4.1 Notification 4-Tier (Carbon 영감)
| 종류 | 컴포넌트 | 사용처 |
|---|---|---|
| Toast (transient) | `sonner` | 짧은 성공/실패 |
| Inline (in-flow) | `InlineNotification` | 폼 검증·섹션 내 지속 안내 |
| Banner (page-level) | `ActionableBanner` | 행동 유도 (미답변 문의·승인 대기) |
| Modal (blocking) | `AlertDialog` | 되돌릴 수 없는 작업 확인 |

### 4.2 Empty State 3요소
1. 아이콘 일러스트 (Lucide)
2. 1~2줄 설명 (제목 + description)
3. 1차 액션 (버튼/링크)

### 4.3 본인 학기 자동 강조 (디딤판)
사용자 학기 매칭 → 카드 `border-primary` + `shadow-lg` + "내 학기" 배지

### 4.4 검증 배지 (학술 신뢰)
- ✅ 초록 체크 — 운영진/CrossRef 검증 완료
- ⚠️ 노랑 경고 — AI 자동 생성, 1차 자료 확인 필요

### 4.5 운영진 CMS 패턴
Firestore 컬렉션 + 운영진 콘솔 폼 + 정적 fallback. 한 번 등록되면 Firestore 우선.

### 4.6 Cron + 수동 Advance 듀얼 트리거
daily cron 자동 진행 + 운영진 콘솔에서 즉시 advance 버튼.

---

## 5. 접근성 (WCAG 2.1 AA)

### 필수
- **컬러 대비**: 텍스트/배경 4.5:1 이상
- **터치 타겟**: 최소 44×44px (모바일 nav 52px 적용)
- **포커스 표시**: `focus-visible:ring-2` 일관 적용
- **screen reader**: `aria-label`, `role`, `aria-live`
- **prefers-reduced-motion**: 모션 감소 모드 fallback 항상 제공
- **다크 모드**: 모든 상태색 dark variant 정의

### 색맹 친화
- 단색 의존 금지 — 아이콘/패턴 병용
- divergent 데이터는 양방향 색상

---

## 6. 모션

### 원칙 (Apple HIG)
- **Purposeful Motion**: 장식 아닌 의미 전달
- **Reduced Motion**: 항상 fallback
- **빠른 진입, 빠른 이탈**: 200~400ms

### 표준 진입 애니메이션
```css
animate-in fade-in slide-in-from-bottom-2 duration-300
animate-in fade-in slide-in-from-top-2 duration-500
```

### 호버
```css
transition-shadow hover:shadow-md
transition-colors hover:bg-card/80
```

---

## 7. 데이터 시각화

상세: **[docs/charts-guide.md](./docs/charts-guide.md)**

### 핵심 규칙
- 카테고리형: **최대 8색** (`ROADMAP_COLOR_PRESETS`)
- 순서형: sequential palette (단색 그라데이션)
- 차이형: divergent palette (양방향)
- **3D 차트 / rainbow palette 금지**
- 축 라벨 한국어 단위 필수
- 데이터 출처·집계 기간 명시 필수

---

## 8. UX Writing 가이드

### 헤딩
- 무엇을 할 수 있는지 한 줄 + 결과·이익 명시
- ✓ "본인 학기에 맞는 가이드가 준비되어 있어요"
- ✗ "추천 콘텐츠"

### 빈 상태
- "아직 X가 없습니다" + 다음 단계 안내
- 책임 회피체 ("...없는 것 같습니다") 금지

### 에러
- 사용자 잘못 아닌 톤 ("일시적으로 불러올 수 없어요")
- 다음 행동 안내 ("새로고침" 또는 "잠시 후 다시 시도")

### 액션 버튼
- 동사 + 목적 ("회원 관리로 이동", "디딤판 가기")
- 단일 단어 금지

---

## 9. 페이지 패턴

### 콘솔 페이지 (`/console/*`)
1. `ConsolePageHeader` (제목 + 설명)
2. `ActionableBanner` (조건부 — 미답변·승인 대기)
3. StatCards 그리드 (4열 데스크톱·2열 모바일)
4. 본문 (DataTable·CRUD·EmptyState)
5. `InlineNotification` (운영 안내)

### 회원용 페이지 (`/dashboard`, `/steppingstone`, etc.)
1. `PageHeader` (제목·부제·actions)
2. 본문 위젯 (반응형 그리드)
3. `NewMemberWelcomeBanner` (7일 한정)
4. `EmptyState` (빈 영역)

### 게시판 상세 (`/board/[id]`, `/seminars/[id]`, etc.)
1. 동적 `generateMetadata` OG (`layout.tsx`)
2. 헤더 (제목·메타·카테고리)
3. 본문
4. 리액션·댓글·연관 콘텐츠

---

## 10. AI 에이전트 우선순위 가이드

> Claude·GPT·Cursor 등이 본 프로젝트를 읽을 때 본 섹션을 우선 참고.

### 새 컴포넌트 추가 시
1. shadcn/ui 에 동등 컴포넌트가 있는가? → 그것을 사용
2. 학회 자체 컴포넌트 (EmptyState 등) 와 의미 겹치는가? → 그것을 사용
3. Foundation 토큰을 따르는가? → 색상·타이포·간격 모두 위 표준 적용

### 새 페이지 추가 시
- 콘솔·회원·게시판 상세 중 하나의 페이지 패턴(§9) 채택
- `generateMetadata` 동적 OG 필수 (상세 페이지)
- 빈 상태·로딩 상태·에러 상태 3가지 모두 구현

### 새 알림 추가 시
- §4.1 Notification 4-Tier 결정 트리에 따라 선택
- 추가 컴포넌트 생성 금지

### 새 색상 추가 시
- Foundation 6색 프리셋(§2.1) 안에서 선택
- free-form 색상 (예: `#3a5fcd`) 금지

---

## 11. 참고 자료

### 외부
- [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- [Toss UI Patterns](https://toss.im/) — 서비스 UX
- [Carbon Design System](https://carbondesignsystem.com/) — 어드민·데이터
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines) — 원칙
- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Pretendard](https://github.com/orioncactus/pretendard) — 한국어 폰트

### 내부
- [docs/GETDESIGN.md](./docs/GETDESIGN.md) — 사용법·코드 스니펫·FAQ
- [docs/charts-guide.md](./docs/charts-guide.md) — 차트 상세
- `docs/02-design/features/*.design.md` — 기능별 design
- `docs/ROLE_PERMISSIONS.md` — 권한 체계
- `docs/PRD-연세교육공학회-고도화-v1.md` — 제품 요구사항

---

## 12. 변경 이력

| 날짜 | 변경 | 작성자 |
|---|---|---|
| 2026-05-13 | 단일 진입점 (DESIGN.md) 로 분리 — GETDESIGN.md 와 짝 | Autonomous PM |
| 2026-05-12 | 초기 통합본 작성 (docs/design-system.md) | Autonomous PM |
