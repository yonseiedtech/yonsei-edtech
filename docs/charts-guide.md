# 차트·데이터 시각화 가이드 (yonsei-edtech)

> Carbon Design System Data Visualization Guidelines + Tailwind 팔레트 매핑
> 작성: 2026-05-12 (Sprint 67-AR)
> 적용 대상: `/dashboard` 위젯·`/mypage/research` 통계·`/console/*` 운영 모니터·향후 신규 차트

---

## 🎨 색상 팔레트 표준

### 카테고리형 (Categorical) — 무순서 비교
서로 무관한 항목 비교에 사용. **최대 8색 권장** (Carbon: 14색 한도, 실용 권장 8).

```typescript
// 1순위 → 8순위 순서로 사용. 그 이상 항목은 그룹화/병합 권장.
export const CATEGORICAL_COLORS = [
  "blue",     // #3b82f6
  "emerald",  // #10b981
  "amber",    // #f59e0b
  "rose",     // #f43f5e
  "purple",   // #a855f7
  "cyan",     // #06b6d4
  "orange",   // #f97316
  "slate",    // #64748b
] as const;
```

**적용 예**: 학기별 활동 분류·세미나 종류별 참여수·게시판 카테고리별 글수

### 순서형 (Sequential) — 작음 → 큼 그라데이션
같은 측정값의 강도를 표현. 단색 계열에서 명도/채도 변화.

```typescript
// Tailwind blue scale 활용
export const SEQUENTIAL_BLUE = [
  "bg-blue-100",  // 최소값
  "bg-blue-300",
  "bg-blue-500",
  "bg-blue-700",
  "bg-blue-900",  // 최대값
] as const;
```

**적용 예**: 히트맵 (학기별 글 작성 빈도)·진행률 단계·세미나 출석률

**대안 (colorblind-safe)**: viridis (어두운 보라 → 노랑) 라이브러리 활용 시 `recharts` + `d3-scale-chromatic`.

### 차이형 (Divergent) — 평균/기준선 위/아래
양방향 비교. **0 또는 평균을 중심으로 양쪽 다른 색상**.

```typescript
// 부정 ← 중립 → 긍정
export const DIVERGENT_RED_BLUE = [
  "text-red-700 bg-red-100",     // 큰 음수
  "text-red-500 bg-red-50",       // 작은 음수
  "text-muted-foreground",        // 0 / 중립
  "text-blue-500 bg-blue-50",     // 작은 양수
  "text-blue-700 bg-blue-100",    // 큰 양수
] as const;
```

**적용 예**: 전월 대비 증감률·예산 사용량 vs 계획·평균 위/아래 학생 점수

---

## 📐 차트 구성 표준

### ✅ 필수
- **축 라벨**: x축·y축 모두 한국어 단위 명시 (`회`, `명`, `%`, `시간` 등)
- **legend**: 데이터 시리즈 2개 이상이면 필수 — 위 또는 오른쪽 (모바일은 위)
- **데이터 출처**: 차트 하단에 출처·집계 기간 명시 (예: "2026년 1월~3월 기준")
- **빈 상태**: 0건일 때 EmptyState 컴포넌트 사용
- **로딩 상태**: Skeleton 컴포넌트로 표시
- **반응형**: 모바일에서 그래프 크기 자동 축소 + 라벨 회전 (45도)

### ⛔ 금지
- **3D 차트**: 시각적 왜곡 발생. flat 만 사용.
- **rainbow palette**: 순서형 데이터에 무지개색 금지. 위계 인지 어려움.
- **너무 많은 시리즈**: 4개 초과 시 "기타" 그룹화 권장. legend 길이 제한.
- **이중 y축**: 비교 의미 약함. 두 차트 분리 권장.

---

## 🧩 차트 종류 별 사용 가이드

### Bar Chart (막대)
- **사용처**: 카테고리 간 비교 — 카테고리별 글 수, 학기별 출석
- **방향**: 카테고리 4개 초과 시 가로 막대 (라벨 가독성)
- **순서**: 큰 값 → 작은 값 순 또는 자연순서 (학기·요일)
- **데이터 라벨**: 막대 위/안에 정확한 수치 표시 (모바일 권장)

### Line Chart (선)
- **사용처**: 시간 추이 — 월별 가입자·세미나 참여수 추이
- **포인트 마커**: 데이터 포인트 5개 이하면 마커 표시, 그 이상은 hover 시
- **gap**: 결측치는 점선 또는 빈 구간으로 명시 (보간 금지)

### Pie / Donut (원)
- **사용처**: 부분-전체 비율 (3~5 카테고리만)
- **5 카테고리 초과 시**: bar chart 권장
- **데이터 라벨**: % + 절대값 모두 표시
- **legend**: pie 아래·옆 명시

### Area Chart (영역)
- **사용처**: 시간 추이 + 누적 표현
- **stacked vs overlapping**: 누적 표현은 stacked, 비교는 overlap (투명도 50%)

### Scatter (분산)
- **사용처**: 두 변수 상관 — 예: 세미나 참여 횟수 × 게시글 작성 수
- **추세선**: linear regression 라인 옵션 (없을 시 생략)

### Heatmap (히트맵)
- **사용처**: 2차원 빈도 — 요일×시간 활동 패턴
- **색상**: Sequential palette (단색 그라데이션)

### Progress Bar
- **사용처**: 단일 진행률 (학기 진행·종합시험 D-day 등)
- **TermBriefHero**에 이미 적용 중

---

## ♿ 접근성 (WCAG 2.1 AA)

- **색상 대비**: 텍스트/배경 4.5:1 이상
- **색맹 친화**: 단색만으로 정보 전달 금지. 모양·라벨·패턴 병용.
- **screen reader**: `aria-label`, `role="img"`, `<title>` 태그로 차트 요약 제공
- **키보드**: hover 정보는 focus 로도 동일 접근 가능해야 함

---

## 🛠️ 라이브러리 권장

| 용도 | 권장 라이브러리 | 비고 |
|---|---|---|
| 기본 차트 (bar/line/pie/area) | `recharts` (이미 설치) | React 친화, TypeScript 우수 |
| 히트맵·복합 | `visx` 또는 `d3` | 커스텀 시각화 |
| 진행률 바 | shadcn Progress | 이미 사용 중 |
| 색상 스케일 | `d3-scale-chromatic` | viridis·plasma 등 |

---

## 🎨 우리 서비스 차트 점검 (2026-05-12 기준)

### 이미 적용된 곳
- `TermBriefHero` — 학기 진행률 progress bar ✓
- `AcademicCalendarProgress` — 진행 마디 시각화 ✓
- 통계 페이지 (`/mypage/research/papers` 등) — recharts 기반

### 점검 필요 (향후)
- [ ] 모든 차트에 데이터 출처·집계 기간 명시
- [ ] 색상 팔레트 통일 (현재 차트마다 다른 색상 가능성)
- [ ] 빈 상태 EmptyState 컴포넌트 사용 통일
- [ ] 모바일 가로 막대 차트 자동 전환 검토

---

## 📝 신규 차트 개발 체크리스트

```
[ ] 데이터 종류 (카테고리/순서/차이형) 결정
[ ] 적절한 차트 종류 선택
[ ] 색상 팔레트 적용 (위 표준)
[ ] 축 라벨 한국어 단위
[ ] legend 추가 (2개 이상 시리즈)
[ ] 데이터 출처·기간 명시
[ ] 빈 상태 + 로딩 상태 처리
[ ] 모바일 반응형 검증
[ ] 접근성 (aria-label, 색맹 안전)
[ ] 다크 모드 대응
```

---

## 🔗 참고 자료
- [Carbon Data Visualization Guidelines](https://carbondesignsystem.com/data-visualization/getting-started)
- [WCAG 2.1 AA Color Contrast](https://www.w3.org/WAI/WCAG21/quickref/#contrast-minimum)
- [Color Brewer (palette 도구)](https://colorbrewer2.org/)
- [Visual Capitalist — Best Practices](https://www.visualcapitalist.com/)
