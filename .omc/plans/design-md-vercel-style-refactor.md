# Plan: DESIGN.md Vercel-style 재편 (액션 A)

> 상태: **대기 (Deferred)** — 코드 변화 안정화 후 적용
> 작성일: 2026-05-13 (Sprint 70)
> 출처: nexu-io/open-design + Vercel DESIGN.md 분석
> 예상 작업량: **1.5h (선택적 +30m for OKLch 토큰 도입 시)**

---

## 0. 적용 시점 (Trigger 조건)

다음 중 **하나라도 충족** 시 본 plan 적용:
- 마이페이지 5-탭 + 논문 리뷰 Phase 2 + Spaced Repetition v2 안정화 후 (회귀 없음 확인)
- 1주 이상 디자인 시스템 관련 변경 없음
- 또는 사용자 명시적 지시 ("DESIGN.md 강화 적용해줘")

**적용 금지 시점**: UI 큰 변경 작업 중·후 1주 이내 (문서가 코드 변화 못 따라잡음).

---

## 1. 배경 / Why

OD(nexu-io/open-design) 심층 분석에서 Vercel DESIGN.md 모범 사례가 우리 디자인 시스템 문서화에 직접 적용 가능함을 발견.

**현 DESIGN.md 한계:**
- "이런 미감을 추구한다" 라는 *정서적 anchor* 부재 → AI 에이전트가 새 페이지 디자인 시 일관성 떨어짐
- 컬러가 3 그룹(Brand+Semantic / Status / Category)만 분류됨 → Interactive·Neutral·Surface·Shadow 역할 미명시
- 타이포 hierarchy 가 코드 블록 1줄씩 → 시각적 비교 어려움
- OKLch 토큰 매핑 부재 → Tailwind 외부(예: Markdown 렌더, OG 이미지)에서 동일 팔레트 재사용 불가

**기대 효과:**
- AI 에이전트가 DESIGN.md 한 번 읽고 새 페이지 디자인 정확도 ↑
- 신규 운영진/개발자 온보딩 단축
- 미래 디자인 결정 자동화 (Carbon Notification 추가, 새 차트 색상 등) 시 명확한 근거 제공

---

## 2. 변경 사항 (구체적)

### 2.1 신규 섹션 추가 — "1. Visual Theme & Atmosphere"

현 "1. 디자인 철학" 직전에 신규 1번 섹션 삽입 (기존은 2번으로 밀림). 다음 형식:

```markdown
## 1. Visual Theme & Atmosphere

연세교육공학회의 시각 정체성은 학술 저널과 SaaS 인프라 도구 사이에서 형성된다.
학회 공식 자료의 신뢰감 — 두꺼운 헤더가 아닌 충분한 여백·하어라인 보더·시스템 폰트로 — 과
운영 도구로서의 작동감 — 카드 호버 미세 양각·tabular 숫자·즉각 피드백 — 을 양립시킨다.
Modern Minimal 계열 (Linear · Vercel · Notion 2024 참조) 의 절제된 SaaS 미감을 채택하되,
학회 정체성의 깊이를 위해 emerald · amber · rose 등 카테고리 색을 적극 활용한다.

**Key Characteristics:**
- 헤어라인 1px 보더 우선; drop shadow 는 dropdowns/modals 한정
- 카드는 `rounded-2xl` 통일; 배지·버튼은 `rounded-full` / `rounded-lg`
- 본문은 Pretendard, 헤딩은 `tracking-tight` 자간 압축
- 숫자 강조 시 `font-variant-numeric: tabular-nums` + bold + 큰 size
- Status 4-tier(info/success/warning/error) 색상 시스템 일관 적용 — 단정적 표현 회피
- 운영진 1-click 액션은 `ActionableBanner` 컴포넌트로 통일
- 다크 모드 1급 시민 — 모든 토큰 light/dark 페어
```

### 2.2 컬러 섹션 재편 — "3.1 Color Palette by Role"

현 `### 2.1 컬러 (Tailwind 기반)` 를 다음 7 역할 그룹으로 재구성:

```markdown
### 3.1 Color Palette by Role

#### Primary (브랜드 정체성)
- **Foreground** — `slate-900` (light) / `slate-100` (dark): 본문 텍스트
- **Background** — `white` (light) / `slate-950` (dark): 페이지 배경
- **Brand Accent** — `primary` (Tailwind blue/sky): CTA · 활성 탭 · 강조 링크
- 현재 단일 accent. 향후 secondary accent 도입 시 본 섹션 보강.

#### Status (`InlineNotification` · `ActionableBanner` 매핑)
[기존 테이블 유지]

#### Category Presets (`ROADMAP_COLOR_PRESETS`)
[기존 유지: blue · emerald · amber · rose · purple · slate]

#### Interactive ⭐신규
- **Link** — `text-primary underline-offset-2`: 본문 링크
- **Focus Ring** — `ring-2 ring-ring`: 키보드 포커스
- **Hover** — `hover:bg-muted/50` 또는 `hover:opacity-80`: 상호작용 가능 표시

#### Neutral Scale ⭐신규
- `slate-900` ~ `slate-50` 의 의미 부여
- `slate-900`: 본문, 헤딩
- `slate-700`: 부 본문
- `slate-500`: 메타·캡션
- `slate-400`: placeholder, 비활성
- `slate-200`: 보더, 디바이더
- `slate-100`: subtle surface tint

#### Surface & Overlay ⭐신규
- **Modal Backdrop** — `bg-black/40`
- **Badge Background** — `bg-{color}-50` (light) / `bg-{color}-950/40` (dark)
- **Card Surface** — `bg-card` (= `bg-background`)
- **Muted Surface** — `bg-muted/30` ~ `bg-muted/50`

#### Shadows & Depth ⭐신규
- `shadow-sm` — 카드 기본 (1px 하단 양각 느낌)
- `shadow-md` — hover 시 미세 lift
- `shadow-lg` — 강조 (CTA·banner)
- **금지**: drop shadow 남용 → 본 시스템은 헤어라인 보더 우선
```

### 2.3 타이포그래피 hierarchy 풀 테이블

현 `### 2.2 타이포그래피` 의 Type Scale 코드블록을 다음 7-열 테이블로 교체:

```markdown
### 3.2 Typography Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Display | Pretendard | 48~72px (text-4xl ~ text-7xl) | 700 | 1.0~1.1 | -0.025em (tracking-tight) | 홈페이지 · 랜딩 hero |
| Page H1 | Pretendard | 24~36px (text-2xl ~ text-4xl) | 700 | 1.15 | -0.02em | 페이지 진입 헤딩 |
| Section H2 | Pretendard | 18~20px (text-lg ~ text-xl) | 700 | 1.4 | -0.01em | 섹션 제목 |
| Subsection H3 | Pretendard | 16~18px (text-base ~ text-lg) | 600 | 1.5 | normal | 카드 제목 · 부 섹션 |
| Body | Pretendard | 14~16px (text-sm ~ text-base) | 400 | 1.6 | normal | 본문 |
| Caption | Pretendard | 12px (text-xs) | 400 | 1.5 | normal | 메타데이터 · 라벨 |
| Micro | Pretendard | 11px (text-[11px]) | 500 | 1.4 | normal | 배지 · 마이크로 카피 |
| Stats Number | Pretendard | 24~48px | 700 | 1.0 | -0.02em | `font-variant-numeric: tabular-nums` |
```

**OpenType / 숫자 규칙 추가:**
- 모든 통계·수치 표시 영역에 `font-variant-numeric: tabular-nums` 강제
- 차트 축 라벨도 동일 적용 (이미 적용된 컴포넌트들이 있음 — 본 규칙으로 표준화)

### 2.4 (선택) OKLch 6-token 정규 매핑 추가

별도 섹션 `## 4. OKLch 토큰 매핑 (Tailwind 외부 사용 시)` 추가:

```markdown
## 4. OKLch 토큰 매핑

Tailwind class 외부 (Markdown 렌더링, OG 이미지, 외부 임베드 등) 에서 동일 팔레트를
참조해야 할 때 다음 6 토큰을 사용한다. Modern Minimal 방향 (Linear/Vercel) 의 표준
6-token 모델.

```css
:root {
  --bg:      oklch(99% 0.002 240);   /* page background */
  --surface: oklch(100% 0 0);         /* card surface */
  --fg:      oklch(18% 0.012 250);    /* primary text */
  --muted:   oklch(54% 0.012 250);    /* secondary text */
  --border:  oklch(92% 0.005 250);    /* hairline border */
  --accent:  oklch(58% 0.18 255);     /* primary CTA */
}
.dark {
  --bg:      oklch(8% 0.008 250);
  --surface: oklch(12% 0.012 250);
  --fg:      oklch(96% 0.005 250);
  --muted:   oklch(70% 0.012 250);
  --border:  oklch(22% 0.012 250);
  --accent:  oklch(68% 0.18 255);
}
```

위 값은 **Tailwind 기본 slate + sky 와 동일 색상**이며, 시각적 일치만을 위해 도입.
Tailwind 가 동작하는 모든 곳에서는 기존 class 그대로 사용.
```

---

## 3. 변경 안 되는 것

- 4대 원칙 (Clarity / Trust / Operational Autonomy / Inclusive) — 그대로
- 톤 & 보이스 — 그대로
- 간격 (4px grid) · 모서리 (rounded-2xl 표준) — 그대로
- 컴포넌트 인벤토리 (InlineNotification, ActionableBanner, PageHeader 등) — 그대로
- **실제 코드 0 line 변경** — 순수 문서 재편

---

## 4. 실행 순서

1. (5m) DESIGN.md 전체 다시 읽고 현재 구조 매핑
2. (15m) 신규 "Visual Theme & Atmosphere" 섹션 작성 (위 2.1 참고)
3. (30m) Color Palette 7 역할 분류 재편 (위 2.2 참고)
4. (20m) Typography Hierarchy 풀 테이블 작성 (위 2.3 참고)
5. (5m) 섹션 번호 재배치 (1번이 추가됨에 따라 기존 1→2, 2→3 …)
6. (10m) 갱신 일자 + Sprint 번호 업데이트
7. (5m) `git add DESIGN.md && git commit -m "docs(DESIGN): Vercel-style 재편 — Visual Theme + 7 역할 컬러 + 타이포 hierarchy 테이블"`
8. (선택 +30m) OKLch 토큰 매핑 추가 + Tailwind config 색상 변수 확인

**총: 1.5h (기본) / 2h (OKLch 포함)**

---

## 5. 위험 / 주의사항

- 본 작업은 순수 문서 작업이지만, **DESIGN.md 가 코드 generator·검수 가이드라인으로 활용**되고 있다면 변경 후 AI 에이전트의 행동이 약간 달라질 수 있음. 변경 후 첫 새 페이지·컴포넌트 생성 시 결과물 검수 권장.
- OKLch 도입은 **현재 Tailwind 기반 시스템과 병행 운영** 의미. Tailwind config 의 색상 토큰을 OKLch 로 마이그레이션하는 별도 작업 (4h+) 과 혼동 금지.
- 다국어 (i18n) 도입 시 일부 표현 다듬어야 함 — 현재는 한국어 단일.

---

## 6. 검증 기준 (적용 완료 후)

1. DESIGN.md 가 다음 7개 명시적 섹션 보유:
   - Visual Theme & Atmosphere (신규)
   - 디자인 철학 (기존)
   - Foundation 토큰 (Color by Role, Typography Hierarchy, 간격, 모서리, 그림자)
   - 컴포넌트 인벤토리 (기존)
   - (선택) OKLch 토큰 매핑
2. Color Palette 가 7 역할 그룹으로 명확히 분류됨
3. Typography Hierarchy 가 7-열 테이블 형식
4. "Modern Minimal · Linear/Vercel 참조" 가 시각 정체성으로 명시됨
5. 실제 빌드 영향 0건 (`npm run build` 통과)

---

## 7. 관련 메모

- [reference_openalex_edtech_concept.md] — 본 작업과 무관 (PoC 인프라)
- [project_gemini_spending_cap.md] — 본 작업과 무관

본 plan 은 `.omc/plans/done/` 으로 이관됨과 동시에 완료 처리 가능.
