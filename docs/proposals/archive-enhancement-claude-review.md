# 교육공학 아카이브 고도화 분석 — Claude Review (2026-05-23)

> 참고: Codex 병렬 second-opinion 분석은 출력 단계에서 미완성. 향후 별도 재시도 시 본 문서와 cross-reference 권장.

## TL;DR — 가장 큰 3가지 권장

1. **컬렉션 8개에 통합 검색 부재** — 모든 archive_* 가 카테고리 탭으로만 탐색 가능. "ANCOVA" 검색 시 통계방법·기초용어 양쪽에 동시 검색되는 글로벌 검색이 절실. → **P0**
2. **양방향 매핑의 비대칭 위험** — `statisticalMethod.relatedResearchMethodIds` ↔ `researchMethod.statisticalMethodIds` 등 모두 수동 큐레이션. 한쪽만 채우면 비대칭. → **자동 sync 또는 "linked from X" 역방향 자동 표시**
3. **`archive_concepts` vs `archive_foundation_terms` 경계 모호** — ZPD 같은 항목 양쪽 등록 가능. → 랜딩 시각 분리(이미 큐) + 상호 chip 연결 + 진입 동선 명확화

## 1. 현황 진단 — 강점·약점

### 강점
- 검수 게이트 3중 적용 (firestore.rules + listPublished + 클라이언트 published 필터) — 비공개 검수 항목 외부 노출 안전
- accessibleSummary 콜아웃 패턴 — 통계·수학 진입장벽 페르소나 정조준
- 학술 단언 회피(hedge 표현) + 자동 보강분 curatedBy 태그 운영
- 양방향 매핑 데이터 모델은 있음 (실제 운영은 별개)

### 약점
- 컬렉션 8종 (concepts/variables/measurement-tools/research-methods/statistical-methods/foundation-terms/writing-tips/APA) — 카드 8장 → 인지 부하
- 동일 영어 단어 처리 (covariate→공변량/공변인) — confusedWith 좋으나 외부 컬렉션 간 동일 개념 등록 방지 가드 없음
- 시나리오별 동선 부재 (신입생/논문 작성자/운영진 모두 같은 진입점)

## 2. 구조·IA 이슈

- archive_concepts ↔ archive_foundation_terms 의미 경계: 입문 한 줄 정의(foundation) vs 이론적 구성개념(concept) — 운영자에게 명확한 가이드 + 시각 분리 필요
- 컬렉션 간 동일 영문 용어 중복 등록 가드: 운영 콘솔에 "다른 컬렉션에 이미 등록됨" 경고
- /archive 랜딩 — 카드 그룹화 + 시나리오 추천 (예: "처음 오셨다면 → 용어집", "논문 작성 중 → 연구방법·통계")

## 3. UX·UI 개선

| P | 항목 | 비용·임팩트 |
|---|------|------------|
| P0 | 글로벌 검색 (8 컬렉션 통합) | 중·고 |
| P0 | 모바일 detail sticky 목차 | 저·중 |
| P0 | 랜딩 2그룹 분리 (용어집 vs 이론·연구) | 저·중 — 이미 큐 |
| P1 | 운영 콘솔 bulk-publish UI | 저·중 |
| P1 | 자동 보강분(`curatedBy=auto-*`) 필터링 콘솔 뷰 | 저·중 |

## 4. 데이터·연계 개선

- 양방향 매핑 자동 sync: A→B 입력 시 B→A 자동 추가 (옵션) 또는 "linked from X" 역방향 자동 노출
- 외부 영역 인라인 hover 정의: 연구보고서 인터뷰 모드·세미나에서 archive 항목 hover 시 정의 popover
- AlumniThesis 양방향 태깅의 운영 부담 → LLM 기반 자동 태그 추천 + 운영자 승인 워크플로우

## 5. 콘텐츠 운영 개선

- `curatedBy` 자동 보강분 필터링 콘솔 뷰 (검수 우선순위 큐)
- 변경 이력 추적 (audit log) — 현재 덮어쓰기만 가능
- 다중 운영자 편집 락 — 학회 규모상 우선순위 낮음
- 콘텐츠 노후화 트리거 (오래된 항목 자동 검토 알림) — Phase ∞

## 6. 추가하면 좋을 기능

| P | 기능 | 비용·임팩트 |
|---|------|------------|
| **P0** | 글로벌 검색 | 중·고 |
| **P0** | 랜딩 2그룹 분리 | 저·중 |
| **P0** | 모바일 sticky 목차 | 저·중 |
| P1 | 양방향 매핑 자동 sync 또는 역방향 표시 | 중·고 |
| P1 | 자동 보강분 필터링 콘솔 | 저·중 |
| P1 | 외부 영역 인라인 hover 정의 | 중·고 |
| P1 | 즐겨찾기 통합 (모든 archive 타입) | 저·중 |
| P2 | 변경 이력 (audit log) | 중·중 |
| P2 | LLM 기반 연관 항목 자동 추천 워크플로우 | 고·고 |
| P2 | 개념 지도/관계 그래프 시각화 | 고·중 |
| P3 | 학습 진척 추적 | 중·중 |

## 7. 기술 부채 정리 — 추상화 제안

8개 컬렉션 패턴 ~70% 중복:
- `researchMethodsApi`/`statisticalMethodsApi`/`foundationTermsApi`/`writingTipsApi` 거의 동일 → **`createArchiveCollectionApi(name)` 팩토리** 추출
- 8개 콘솔 페이지 (`/console/archive/{collection}/page.tsx`) → **`ArchiveCRUDPage<T>` 템플릿 컴포넌트**
- 8개 detail 페이지 공통 섹션(헤더·콜아웃·하단 고지) → **`ArchiveDetailLayout`**
- firestore.rules의 archive_* 패턴 → **재사용 가능한 매처 함수**

리팩터링 후: 새 archive 타입 추가 = 1~2 파일.

## 8. 권장 로드맵

- **Phase A (1주)**: 글로벌 검색 + 랜딩 2그룹 분리 + 모바일 sticky 목차
- **Phase B (1주)**: 양방향 매핑 자동 sync + 자동 보강분 필터링 + 즐겨찾기 통합
- **Phase C (2주)**: 외부 인라인 hover 정의 + LLM 보강 추천 워크플로우
- **Phase D (장기)**: 시각화 + 변경 이력 + 학습 추적
- **Phase ∞ (지속)**: 8개 컬렉션 패턴 추상화 (기술 부채)

## 다음 단계 권장

- 사용자가 P0 3종 중 어느 것부터 착수할지 선택 (또는 일괄 Phase A)
- Codex second-opinion 재시도 시 본 문서와 대조

---

*분석: Claude Opus 4.7 · 작성일: 2026-05-23*
