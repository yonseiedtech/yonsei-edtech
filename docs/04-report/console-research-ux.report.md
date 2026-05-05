# Report: console-research-ux

> **완료일**: 2026-05-05
> **PDCA 단계**: Report
> **Match Rate**: 100%

## 요약
운영 콘솔 `/console/research` 의 회원별 연구 현황 탭/카드 순서를 회원의 내 연구활동 페이지와 일치시키고, 연구보고서 "전체 보기" 를 회원 입력 질문/답변 전체로 확장. 운영진과 회원 시야 정합.

## 산출물

| 단계 | 산출물 |
|------|--------|
| Plan | `docs/01-plan/features/console-research-ux.plan.md` |
| Design | (생략 — 작은 단위 변경) |
| Do | `src/app/console/research/page.tsx` 단일 파일 수정 |
| Check | `docs/03-analysis/console-research-ux.analysis.md` (100%) |

## 핵심 변경
- 탭 순서: 논문 작성 → 연구 계획서 → 연구 보고서 → 논문 읽기 → **연구 보고서 → 연구 계획서 → 논문 작성 → 논문 읽기**
- defaultValue: "writing" → "report"
- MiniProgress 4개 카드 동일 순서 정렬
- 연구보고서 전체보기 14개+ 필드 추가:
  - 1단계: 교육 형태(신규)
  - 1.2: problemEvidences/Causes 리스트(신규)
  - 1.4: scope 3개(신규)
  - 1.5: problemMeasurements 요소+지표(신규), 진단 3개(신규)
  - 3: priorResearchGroups 상세(신규), 인용 논문 수(신규)

## 운영 효과
- 회원이 본 화면과 운영진이 본 화면이 일치 → 커뮤니케이션 비용 ↓
- 운영진이 회원 연구 보고서 전체 검토 가능 (기존 일부만 노출되던 한계 해소)

## Commit 이력
- (이번 세션 단일 commit)

## Production
https://yonsei-edtech.vercel.app/console/research
