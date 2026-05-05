# Plan: 운영 콘솔 연구 UX 정합 (console-research-ux)

> **작성일**: 2026-05-05
> **PDCA 단계**: Plan
> **추정 작업량**: 3-5h

## 1. 배경

`/console/research` 페이지의 회원별 연구 현황 탭이 **내 연구활동 페이지와 순서가 다르고**, 연구보고서 "전체보기"가 **일부 필드만 노출**해 운영진과 회원의 시야가 어긋남.

### 현재 vs 기대

| 영역 | 현재 | 기대 |
|------|------|------|
| 탭 순서 | 논문 작성 → 연구 계획서 → 연구 보고서 → 논문 읽기 | **연구 보고서 → 연구 계획서 → 논문 작성 → 논문 읽기** (내 연구활동과 동일) |
| MiniProgress 순서 | 논문 작성 → 연구 계획서 → 연구 보고서 → 논문 읽기 | 동일 순서로 정렬 |
| 연구 보고서 "전체보기" | 대상 학습자 / 교과·주제 / 현상 / 영향 / 중요성 / 이론카드 / 선행연구 분석 | + **교육 형태 / 선행연구 그룹별 상세 / 인용된 논문 목록** 까지 |

## 2. 변경 대상

### 2.1 탭 / MiniProgress 순서 (`src/app/console/research/page.tsx`)
- line 496-500: MiniProgress 순서 재정렬
- line 503-547: `<TabsList>` + `<TabsContent>` 순서 재정렬, `defaultValue` 도 `"report"` 로 변경

### 2.2 ReportTab 전체보기 확장 (`src/app/console/research/page.tsx` line 809~895)
추가 표시 필드:
- `fieldFormat` (교육 형태)
- `priorResearchGroups` (선행연구 그룹별 — name, keywords, summary, paperIds)
- `priorResearchPaperIds` (인용된 논문 ID — 제목 매핑은 별도 fetch 필요 시 옵셔널)

## 3. 영향
- 운영 콘솔 → 단일 페이지 변경, 회원 페이지 영향 없음
- 데이터 모델 변경 없음
- 기능 위험 매우 낮음

## 4. 작업 분해

- [ ] 탭 / MiniProgress 순서 변경 (단순 JSX 재배치)
- [ ] ReportTab 전체보기에 fieldFormat / priorResearchGroups / priorResearchPaperIds 추가
- [ ] vercel build 검증
- [ ] commit + push + vercel deploy

## 5. Rollback
- 한 commit으로 묶음 → 단일 revert로 즉시 복구

---

> 작은 작업 → Design 단계 생략하고 Do 즉시 진행.
