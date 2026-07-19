# Color Debt Round 4 — 2026-07-20

## 요약

| 항목 | 값 |
|------|-----|
| Baseline (시작) | 411개 파일 |
| Baseline (완료 후) | 390개 파일 |
| 감소량 | −21개 파일 |
| ESLint | 통과 (0 errors) |
| TypeScript | 통과 (0 errors) |

## 범위

`eslint-rawcolor-baseline.mjs` 기준 다음 4개 프리픽스:

- `src/app/mypage/`
- `src/components/mypage/`
- `src/app/archive/`
- `src/features/archive/`

## 매핑 규칙 (Round 3 동일)

| 원색 | 시맨틱 토큰 |
|------|------------|
| emerald | success |
| blue, sky, indigo | info |
| amber | warning |
| rose, red | destructive |
| violet, purple | cat-5 |
| slate | muted / muted-foreground / cat-6 |

- `dark:` 제거 조건: 라이트모드 클래스도 팔레트색일 때
- `dark:` 유지 조건: 라이트모드가 비팔레트색(bg-white/70 등)일 때 → `dark:bg-muted/XX` 로 교체

## 수정 파일 목록 (21개)

### src/app/mypage/
- `messages/page.tsx`
- `calendar-sync/page.tsx`
- `notifications/page.tsx`

### src/components/mypage/
- `MyActivitiesView.tsx`
- `MyResearchView.tsx`
- `DiagnosticWeakConceptPath.tsx`
- `MyActivityHub.tsx`
- `MyPageView.tsx`

### src/features/archive/
- `ArchiveConceptRecommend.tsx`
- `ArchiveRecentStrip.tsx`
- `ArchiveDictionaryCompare.tsx`
- `ArchiveGlobalSearch.tsx`
- `ArchiveStartHere.tsx`
- `StatModelDiagram.tsx`

### src/app/archive/
- `citation-guide/page.tsx`
- `foundation-terms/page.tsx`
- `statistical-methods/page.tsx`
- `writing-tips/page.tsx`
- `research-methods/page.tsx`
- `[type]/ArchiveTypeListClient.tsx`
- `my/page.tsx`
- `paper-guide/page.tsx`
- `graph/page.tsx`
- `writing-tips/[id]/page.tsx`
- `literature-review-guide/page.tsx`
- `research-finder/page.tsx`
- `method-finder/page.tsx`
- `terminology/page.tsx`
- `page.tsx`
- `foundation-terms/[id]/page.tsx`
- `statistical-methods/[id]/page.tsx`
- `research-methods/[id]/page.tsx`
- `[type]/[id]/page.tsx`

## 주요 패턴

- 경고 박스: `border-warning/20 bg-warning/5 p-4 text-xs text-warning`
- 초안 뱃지: `bg-destructive/5 text-destructive border-destructive/20 text-[10px]`
- 왼쪽 테두리 강조: `border-l-{token}`
- 솔리드 CTA 버튼: `bg-{token} hover:bg-{token}/80 border-{token}`
- 뱃지 배경: `bg-{token}/10 text-{token}` (아이콘), `bg-{token}/5 text-{token} border-{token}/20` (텍스트)

## 건너뛴 색상

teal, cyan, yellow, green, pink, fuchsia, gray, zinc, neutral, stone, orange — 매핑 외 색상으로 유지
