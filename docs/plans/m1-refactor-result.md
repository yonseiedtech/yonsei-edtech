# console-research feature 분리 결과

## 원본
- `src/app/console/research/page.tsx` — 1208줄 단일 파일

## 분리 후 구조

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `src/features/console-research/index.ts` | 2 | re-export |
| `src/features/console-research/types.ts` | 24 | `UserResearchSummary` 인터페이스 |
| `src/features/console-research/utils.ts` | 14 | `formatDate`, `formatHours` 공유 유틸 |
| `src/features/console-research/ConsoleResearchPage.tsx` | 269 | 페이지 오케스트레이터 + `StatCard` + calc 헬퍼 3종 |
| `src/features/console-research/ResearchRow.tsx` | 168 | 아코디언 행 컴포넌트 |
| `src/features/console-research/tabs/WritingTab.tsx` | 106 | 논문 작성 탭 |
| `src/features/console-research/tabs/ReadingTab.tsx` | 112 | 논문 읽기 탭 |
| `src/features/console-research/tabs/ProposalTab.tsx` | 64 | 연구 계획서 탭 |
| `src/features/console-research/tabs/DesignTab.tsx` | 86 | 연구 설계 탭 |
| `src/features/console-research/tabs/ReportTab.tsx` | 182 | 연구 보고서 탭 |
| `src/features/console-research/components/ProgressBar.tsx` | 10 | 진행 막대 |
| `src/features/console-research/components/KV.tsx` | 8 | 키-값 행 |
| `src/features/console-research/components/DetailBlock.tsx` | 9 | 섹션 카드 |
| `src/features/console-research/components/FullField.tsx` | 15 | 전체 텍스트 필드 |
| `src/features/console-research/components/ToggleFullButton.tsx` | 23 | 전체/간단히 보기 토글 |
| `src/features/console-research/components/MiniProgress.tsx` | 30 | 미니 진행 카드 |
| **합계** | **1122** | |

## 라우트 파일
```tsx
// src/app/console/research/page.tsx (1줄)
export { default } from "@/features/console-research/ConsoleResearchPage";
```

## 검증
- `npx tsc --noEmit` → **에러 0건** (출력 없음)

## 설계 결정
- `formatDate` / `formatHours` — 탭 6개에서 공용 사용 → `utils.ts` 추출
- `UserResearchSummary` 인터페이스 — `ConsoleResearchPage` + `ResearchRow` 양쪽 사용 → `types.ts` 추출
- `calcProposalProgress` / `calcReportProgress` / `calcWritingCharCount` — `ConsoleResearchPage` 내부에서만 사용 → 파일 내 유지
- `WRITING_CHAPTER_LABELS/KEYS` — `WritingTab` 전용 → `WritingTab.tsx` 내 유지
- `DESIGN_SECTION_LABELS` — `DesignTab` 전용 → `DesignTab.tsx` 내 유지
- `StatCard` — `ConsoleResearchPage` 전용 → 같은 파일 유지
- `MiniProgress.icon` prop 타입: `typeof FileText` → `LucideIcon` (lucide-react 공식 타입, 구조적으로 동일)
- `"use client"` 지시어: hooks(useState/useQuery) 사용 파일에만 부여, 순수 렌더 컴포넌트는 생략
