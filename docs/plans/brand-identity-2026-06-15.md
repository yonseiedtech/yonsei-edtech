# 연세교육공학회 브랜드 아이덴티티 · 디자인 시스템 점검 보고서

- 작성일: 2026-06-15
- 대상: `C:\work\yonsei-edtech` (Next.js 16 + Tailwind v4)
- 범위: 읽기·분석 전용 (코드 수정·배포 없음)
- 역할: 브랜드 디자이너 관점 진단 + 개선 제안

---

## 0. 요약 (Executive Summary)

전반적으로 **연세 네이비 + 골드** 라는 명확한 방향성과, `globals.css`의 HSL 토큰 + Tailwind v4 `@theme inline` 매핑, `design-tokens.ts`의 시맨틱 팔레트(info/warning/danger/success), `PageHeader`·`PageContainer`·`Card`·`Badge` 등 공통 컴포넌트까지 **디자인 시스템의 뼈대는 잘 갖춰져 있다.**

다만 브랜드의 핵심 자산인 **"네이비 주조색"이 표면(surface)마다 다른 HEX 값으로 흩어져 있다는 점**이 가장 큰 약점이다. 토큰·OG·카드뉴스가 서로 다른 네이비를 쓰고, 골드도 정의가 제각각이며, 연세 공식 엠블럼(`yonsei-emblem.svg`, `#003378`)과 토큰 primary가 우연히 일치하나 명문화돼 있지 않다.

---

## 1. 브랜드 현황

### 1-1. 컬러 토큰 (`src/app/globals.css`)

라이트 모드 `:root` (HSL → 환산 HEX 근사):

| 토큰 | HSL 값 | 근사 HEX | 용도 |
|------|--------|----------|------|
| `--primary` | `212 100% 23%` | **#003378** | 주조색 (연세 네이비, 엠블럼과 동일) |
| `--primary-foreground` | `0 0% 100%` | #ffffff | primary 위 텍스트 |
| `--secondary` | `42 63% 55%` | ~#d4a23a | 골드/머스타드 (보조) |
| `--accent` | `220 100% 55%` | ~#1a66ff | 밝은 블루 강조 |
| `--background` | `210 20% 98%` | ~#f8fafc | 페이지 배경 (cool white) |
| `--foreground` | `212 40% 13%` | ~#142233 | 본문 텍스트 |
| `--muted-foreground` | `212 16% 35%` | ~#4a5666 | 보조 텍스트 (WCAG AA 47%→35% 보정 주석 有) |
| `--destructive` | `0 84% 60%` | ~#ef4444 | 위험/삭제 |
| `--border` / `--input` | `210 18% 90%` | ~#dde3ea | 테두리 |
| `--ring` | `212 100% 23%` | #003378 | 포커스 링 (primary와 동일) |
| `--radius` | `0.75rem` | — | 기본 모서리 |

다크 모드 `.dark`:

| 토큰 | HSL 값 | 비고 |
|------|--------|------|
| `--background` | `222 30% 10%` | 딥 네이비 배경 |
| `--primary` | `212 80% 55%` | 라이트보다 밝게(가독성) |
| `--secondary` | `42 50% 45%` | 골드 채도↓ |
| `--muted-foreground` | `210 14% 70%` | AA 보정(60%→70%) 주석 有 |

**평가**: HSL 기반 토큰 + `@theme inline` 매핑은 Tailwind v4 모범 패턴. 다크모드 대비 보정 주석이 남아 있어 접근성 의식이 보인다. 단 토큰 이름이 shadcn 기본 네이밍(primary/secondary/accent)이라 "연세 네이비/골드" 라는 **브랜드 의미가 코드에 드러나지 않는다.**

### 1-2. 시맨틱 팔레트 (`src/lib/design-tokens.ts`)

- `SEMANTIC` 객체로 info(blue) / warning(amber) / danger(rose) / success(emerald) / default 5종 — 각 tone마다 bg·border·text·textMuted·accent·chipBg·chipText 7속성 + **다크모드 변형 일괄 포함**.
- `WIDGET_PADDING`, `WIDGET_GAP`, 아이콘 사이즈 상수(SECTION/INLINE/STAT) 표준화.
- **평가**: 대시보드 위젯 색 하드코딩을 시맨틱으로 수렴한 좋은 사례. 다만 적용 범위가 "대시보드 위젯" 중심이라(주석 명시), 그 외 화면은 여전히 Tailwind 팔레트 직접 사용.

### 1-3. 타이포그래피

- 기본 sans: `--font-pretendard` (Pretendard, layout에서 next/font 추정) → system-ui fallback.
- `globals.css` 상단 import: **Noto Serif KR / Hahmlet / Gowun Batang** (명조계열 — 학술/세리프 무드용으로 추정. 사용처 별도 확인 필요).
- 반응형 루트 폰트: `clamp(14px, 0.875rem + 0.2vw, 16px)`, iOS 줌 방지(폼 16px 강제).
- `PageHeader` h1: public `text-2xl→3xl→4xl`, console `text-xl→2xl` (Sprint 67-AP "토스 패턴" 큰 헤드라인).
- **평가**: sans(Pretendard) + serif(Noto Serif KR 등) 조합 의도는 좋으나, **세리프 폰트의 역할/사용 규칙이 토큰화되지 않음** → 어디에 명조를 쓰는지 가이드 부재.

### 1-4. 엠블럼 / 로고 자산 (`public/`)

| 파일 | 내용 |
|------|------|
| `yonsei-emblem.svg` | 연세 공식 방패(shield) 엠블럼. 핵심색 **`#003378`** (= primary 토큰과 일치), 흰 배경 원형. |
| `logo.png`, `logo-text.png` | 학회 로고(텍스트형) |
| `cert-emblem.png`, `cert-seal.jpeg` | 수료증용 엠블럼·직인 |
| `card-news/brand/logo-society.png`, `tagline.png` | 카드뉴스 브랜드 헤더용 PNG |
| `app/icon.svg` | 파비콘 (emblem 참조) |

엠블럼 사용처(grep `yonsei-emblem`): Header, dashboard, BusinessCard, HeroSection, ProfileDetailView, 로그인/회원가입, 명찰·수료증·QR 등 13개 파일 — **핵심 진입 화면엔 잘 들어가 있다.**

### 1-5. OG 이미지 (`src/app/opengraph-image.tsx`)

- 1200×630, 네이비 그라데이션 `#0a1f44 → #102a5c → #061635` + 골드 `#d4af37` 악센트, 거대한 골드 "Y" 모노그램 + 동심원.
- 슬로건: "교육의 미래를 함께 설계합니다", "연세대학교 교육대학원 · 교육공학전공".
- **평가**: 디자인 완성도는 높으나 **네이비/골드 HEX가 토큰과 불일치**(아래 §2).
- 라우트별 OG도 존재: `seminars/[id]`, `archive/[type]/[id]`, `alumni/thesis/[id]`.

### 1-6. 카드뉴스 비주얼 (`src/features/card-news/art.tsx`)

- 1080×1080, 흰 배경 + `BrandHeader`(logo-society.png + tagline.png) + `ShieldWatermark` + 4종 레이아웃(cover/intro/feature/cta).
- 색 상수: `NAVY_DEEP #002060`, `NAVY_MID #002369`, `BLUE_BRIGHT #0038A8`, 네이비 그라데이션 90deg.
- 학회 PPTX 템플릿(흰 배경 + 그라데이션 헤딩 + 쉴드 워터마크) 반영 — **메모와 일치.**
- **평가**: 학회 PPTX와 톤을 맞춘 점은 좋으나, 여기 네이비(`#002060`/`#0038A8`)가 OG·토큰과 **또 다른 값.**

---

## 2. 일관성 점검 (약한 지점)

### 🔴 P0 — 네이비 주조색이 표면마다 다르다 (브랜드 일관성 핵심 결함)

같은 "연세 네이비"가 4가지 이상 다른 HEX로 존재:

| 위치 | 네이비 값 |
|------|-----------|
| 토큰 `--primary` / 엠블럼 SVG | **#003378** (연세 공식) |
| OG 이미지 | `#0a1f44`, `#102a5c`, `#061635` |
| 카드뉴스 art | `#002060`, `#002369`, `#0038A8` |
| 명함 navy 테마 | `#4338ca`(indigo), `#3b82f6`(blue) — **연세 네이비 아님** |

→ 동일 브랜드인데 SNS 공유(OG), 카드뉴스, 웹 UI가 미묘하게 다른 남색으로 보인다. 브랜드 자산의 신뢰도를 갉아먹는 가장 큰 문제.

### 🟠 P1 — 골드(secondary) 정의 불일치

- 토큰 `--secondary` = `42 63% 55%` (~#d4a23a)
- OG 골드 = `#d4af37` (+ 그라데이션 `#f4d77a`/`#8a6b1c`)
- → 보조색 골드도 표면마다 미세하게 다름. "연세 골드"의 단일 기준값 부재.

### 🟠 P1 — 색 하드코딩 광범위

- `text-blue-* / bg-indigo-* / slate-*` 등 Tailwind 팔레트 직접 사용이 **30개 파일·80+ occurrence**(grep 기준, head 제한). `design-tokens.ts` 시맨틱이 대시보드 밖으로 거의 확산되지 않음.
- 명함 테마(`card-themes.ts`)는 indigo/blue/emerald/rose/slate/amber를 임의 HEX로 — 브랜드 팔레트와 무관한 자유 색.
- 영향: 다크모드 누락 위험, 색 변경 시 일괄 수정 불가.

### 🟡 P2 — 엠블럼 미사용 표면 / 가이드 부재

- 엠블럼은 13개 화면에 들어가나, **사용 규격(최소 크기·여백·단색/원형 변형·금지 사용)이 문서화되지 않음.**
- OG는 엠블럼 SVG 대신 "Y 모노그램"을 자체 제작 → 엠블럼과 별개 브랜드 마크가 공존(혼선 소지).

### 🟡 P2 — 타이포 역할 미정의

- 세리프 폰트 3종 import 되어 있으나 "언제 명조를 쓰는가"의 규칙 없음. 헤딩/인용/본문 위계가 토큰화되지 않음.

### 🟢 양호한 점

- HSL 토큰 + `@theme inline` 구조, 다크모드 대비 보정 주석, `SEMANTIC` 팔레트, `PageHeader`/`PageContainer` 표준화(width narrow/default/wide, 표준 패딩), `Card`/`Badge`의 cva variant 체계 — 시스템 기반은 탄탄.

---

## 3. 브랜드 가이드 제안

### 3-1. 브랜드 정체성 (3축)

연세 교육공학의 정체성을 세 가치의 균형으로 정의:

1. **학술적 신뢰 (Academic Trust)** — 연세 네이비 + 방패 엠블럼 + 명조 세리프(인용·표제). 깊이·권위·전통.
2. **에듀테크 미래 (EdTech Future)** — 골드/밝은 블루 악센트 + 그라데이션 + 산세리프(Pretendard). 혁신·역동.
3. **따뜻한 커뮤니티 (Warm Community)** — 라운드(rounded-2xl) + 부드러운 그림자 + 휴먼 색조(success emerald 등) + 친근한 한국어 보이스.

슬로건(기존 자산 활용): **"교육의 미래를 함께 설계합니다"** / "교육공학의 혁신의 시작, 연세교육공학".

### 3-2. 컬러 방향

- **연세 네이비 = `#003378` 단일 기준값**으로 통일(엠블럼·토큰 일치값). OG·카드뉴스 그라데이션도 이 값을 anchor로 명/암 변형만 파생.
  - 권장 네이비 스케일(예): `navy-900 #00224f` / `navy-700 #003378`(주조) / `navy-500 #0a4ea3` / `navy-100 #e6edf6`.
- **연세 골드 = 단일 기준값 확정**(예 `#c9a227` 또는 OG의 `#d4af37` 중 택1) → secondary 토큰과 OG를 일치.
- 시맨틱(info/warning/danger/success)은 현 `design-tokens.ts` 유지하되 **전 화면 적용 확대.**
- 명함 테마의 navy를 indigo/blue가 아닌 **실제 연세 네이비**로 교체.

### 3-3. 타이포 보이스

- **Display/표제**: Pretendard Bold (큰 헤드라인, 토스 패턴 유지).
- **인용·학술 강조**: Noto Serif KR (세리프를 "학술 신뢰" 시그널로 한정 사용 — 논문 제목, 인용구).
- **본문/UI**: Pretendard Regular/Medium.
- 보이스 톤: 정중하되 친근한 한국어("~합니다" 기본, 격려·동료적 표현). 영문 병기는 학술 메타(부제)에서.

### 3-4. 접근성 대비

- 본문 대비 AA(4.5:1) 이미 부분 보정됨(muted-foreground 주석). 전 토큰 조합을 AA로 검수.
- 네이비(#003378) 위 흰 텍스트 대비 ≈ 11:1 (AAA) — 우수.
- 골드 위 텍스트는 흰색보다 **네이비 텍스트** 권장(골드는 명도가 높아 흰 텍스트 대비 부족 가능).
- 색만으로 정보 전달 금지(배지에 아이콘/라벨 병행 — 현재 Badge에 icon slot 有, 활용 권장).

---

## 4. 우선 적용 개선안

### Quick Win (저비용·고효과)

| # | 작업 | 위치 | 효과 |
|---|------|------|------|
| Q1 | **네이비/골드 단일 HEX로 통일** — OG·카드뉴스 그라데이션 anchor를 `#003378`/확정 골드로 교정 | `opengraph-image.tsx`, `card-news/art.tsx` | 브랜드 일관성 즉시 회복 |
| Q2 | **브랜드 색 토큰에 시맨틱 alias 추가** — `globals.css`에 `--brand-navy`, `--brand-gold` 명시 + 주석으로 "연세 공식색" 명문화 | `globals.css` | 의미 명확화, 단일 진입점 |
| Q3 | **명함 navy 테마를 연세 네이비로 교체** (indigo/blue → #003378 계열) | `card-themes.ts` | 명함 브랜드 정합 |
| Q4 | **OG "Y 모노그램" ↔ 엠블럼 정책 결정** — 엠블럼 사용 또는 모노그램 공식화 | `opengraph-image.tsx` | 마크 혼선 제거 |
| Q5 | 골드 위 텍스트 색 점검(흰→네이비) | secondary 사용처 | 접근성 대비 |

### 큰 작업 (구조적·다회 스프린트)

| # | 작업 | 범위 | 효과 |
|---|------|------|------|
| B1 | **디자인 토큰 2차 확산** — `text-blue-*`/`indigo-*` 하드코딩 30+파일을 `SEMANTIC`/브랜드 토큰으로 마이그레이션 | 전 화면 | 다크모드 정합·유지보수성 |
| B2 | **네이비/골드 컬러 스케일 정식 토큰화** — `@theme`에 navy-50~900, gold-50~900 추가 | `globals.css` | 파생색 일관 |
| B3 | **타이포 스케일 토큰화** — display/title/body/caption + serif 역할 규칙 정의 | `globals.css` + 컴포넌트 | 위계 통일 |
| B4 | **브랜드 가이드 문서 정식화** — 엠블럼 사용 규격(최소크기/여백/금지), 컬러·타이포·보이스 1-pager | `docs/` | 운영진 공유·신규 화면 기준 |
| B5 | **OG/카드뉴스 브랜드 키트 공통화** — 네이비·골드·엠블럼·타이포를 단일 모듈(`brand-kit.ts`)로 공유 | `features/` | 표면 간 시각 통일 |

### 권장 순서

1. Q1·Q2·Q3 (네이비/골드 통일 — 가장 눈에 띄는 결함) →
2. Q4·Q5 → 3. B4(가이드 문서) → 4. B2·B3(토큰 확장) → 5. B1·B5(확산).

---

## 부록: 확인 파일

- `src/app/globals.css` (토큰·다크모드·인쇄)
- `src/lib/design-tokens.ts` (시맨틱 팔레트)
- `src/components/ui/{page-header,page-container,card,badge}.tsx`
- `public/yonsei-emblem.svg` (#003378)
- `src/app/opengraph-image.tsx` (OG)
- `src/features/card-news/art.tsx` (카드뉴스)
- `src/features/card/card-themes.ts` (명함 테마)
- grep: 색 하드코딩 30+파일, 엠블럼 13파일
