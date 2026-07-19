# M1(v8) 논문 도구 통합 허브 — 구현 산출물

- 계획 원문: `docs/plans/service-enhancement-plan-v8-2026-07-20.md` §M1 (라인 114–118)
- 성격: **표면 재조직**(발견성 정리). 신규 기능·신규 컬렉션 없음. 기존 도구는 이동하지 않고 링크만.
- 신규 라우트: `/mypage/research/tools` (마이페이지/연구 하위 진입점 1개)

## 1. 흩어진 연구·논문 도구 실측 전수표

grep 기준 실제 라우트·진입점을 전수 확인해 허브에 편입한 목록.

| 도구 | 경로(진입점) | 1줄 설명 | 허브 그룹 |
|---|---|---|---|
| 주제 탐색 인터뷰 | `/mypage/research?tab=explore` | 질문에 답하며 연구 주제·문제 구체화 | 1. 주제 탐색 |
| 연구 준비도 진단평가 | `/diagnosis` | 통계·연구방법·핵심개념 진단→약점 아카이브 연결 | 1. 주제 탐색 |
| 연구방법 찾기 마법사 | `/archive/research-finder` | 목적·상황 답변→적합 연구방법·분석 통계 추천 | 1. 주제 탐색 |
| 내 논문 읽기(문헌 매트릭스) | `/mypage/research?tab=reading` | 읽은 논문 기록·정리 + 문헌 매트릭스 비교 | 2. 선행연구 |
| 선행연구 정리·서론 가이드 | `/archive/literature-review-guide` | 선행연구→한계 연결→서론 논리 구성 | 2. 선행연구 |
| 연구방법 가이드 | `/archive/research-methods` | 양적·질적·혼합 방법 + 졸업생 논문 연계 | 2. 선행연구 |
| 졸업생 학위논문 | `/alumni/thesis` | 졸업생 학위논문 아카이브로 선행연구 탐색 | 2. 선행연구 |
| 교육공학 논문 리뷰 | `/board/paper-review` | 회원 논문 리뷰·요약 공유·메타데이터 가져오기 | 2. 선행연구 |
| 연구 설계 | `/mypage/research?tab=design` | 연구문제·변인·설계 정리→논문·계획서 연계 | 3. 연구 설계 |
| 연구 모형 그리기 | `/research-model` | 변인·관계 다이어그램 + 가설 라벨 | 3. 연구 설계 |
| 공동 연구 | `/collab` | 공동 연구 관리·연구지 발간 | 3. 연구 설계 |
| 연구계획서 | `/mypage/research?tab=proposal` | 연구 설계를 계획서 형식으로 정리 | 4. 집필 |
| 연구보고서 | `/mypage/research?tab=reportdoc` | 수업·과제용 연구보고서 작성 | 4. 집필 |
| 논문 작성 | `/mypage/research?tab=writing` | 장별 학위논문 집필·버전 관리 | 4. 집필 |
| 논문 쓰기 가이드 | `/archive/paper-guide` | 학위논문 장별 구성·작성 요령 | 4. 집필 |
| 학술 글쓰기 가이드 | `/archive/writing-tips` | 번역투·시제·관례 잘못된예↔권장예 | 4. 집필 |
| 연구 타이머 | `/mypage/research?tab=report&focus=timer` | 읽기·집필 시간 기록→잔디 시각화(`paper_reading_logs`) | 4. 집필 |
| 논문 인용 가이드 | `/archive/citation-guide` | 직접·간접 인용, 표절 회피, 재인용 윤리 | 5. 인용·심사 |
| APA 7판 참고문헌 가이드 | `/archive/apa-style` | APA 7th 인용·참고문헌 형식 | 5. 인용·심사 |
| 지도 노트 | `/mypage/research?tab=feedback` | 교수 피드백 기록·반영 추적 | 5. 인용·심사 |
| 암기카드 복습 | `/flashcards` | 진단 오답 개념 간격 반복 복습(SM-2) | 5. 인용·심사 |

> ThesisJourney(논문 여정)·설계→논문 import·연구문제 생성은 이미 `/mypage/research`
> 내부 상단·탭에 상시 노출되는 통합 컴포넌트이므로 별도 카드 대신 해당 탭 링크로 수렴.
> 계획서가 지정한 핵심(citation·literature·paper 가이드·읽기 타이머·내 논문)은 모두 포함.

## 2. 그룹핑 — 연구 여정 5단계

계획서 트랙 C의 여정 순서(주제탐색→선행연구→설계→집필→심사)를 그대로 채택.

1. **주제 탐색** — 무엇을 연구할지 좁히기 (3개)
2. **선행연구·문헌고찰** — 읽고 정리해 서론 논리 세우기 (5개)
3. **연구 설계** — 변인·모형·방법 구조화 (3개)
4. **집필** — 계획서·보고서·논문 쓰기 (6개)
5. **인용·심사** — 인용 다듬기·심사·지도 준비 (4개)

## 3. 내 진행 상태 뱃지 (가능한 것만 — 과설계 금지)

기존 훅만 재사용, 신규 fetch 인프라 없음.

| 카드 | 뱃지 | 소스 훅 |
|---|---|---|
| 내 논문 읽기 | `N편 분석` | `useResearchPapers(userId)` |
| 논문 작성 | `집필 중` | `useWritingPaper(userId)` |
| 연구 준비도 진단평가 | `N회 응시` | `useUserDiagnostics(userId, len)` |

값이 0/없음이면 뱃지 미노출.

## 4. 진입점 (기존 내비 관행 준수 — 1~2곳)

- **Header 글로벌 내비** `연구 활동 > 📖 나의 연구` 섹션에 `논문 도구 모아보기`(`/mypage/research/tools`) 링크 추가 (`내 연구활동` 바로 아래).
- **내 연구활동 페이지 헤더 액션**에 `논문 도구 모아보기` 링크(Wrench 아이콘) 추가.
- 대시보드 QuickLinks는 다른 트랙 작업 영역(`features/dashboard`)이라 미접촉.

## 5. 수정 파일

- `src/app/mypage/research/tools/page.tsx` (신규) — 허브 페이지. AuthGuard + 단계별 카드 그리드(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), 시맨틱 토큰(`bg-card`·`text-foreground`·`text-muted-foreground`·`text-primary`)만 사용.
- `src/components/layout/Header.tsx` — 나의 연구 섹션 링크 1개 추가.
- `src/components/mypage/MyResearchView.tsx` — 헤더 액션 링크 + `Wrench` import 1개 추가.

## 6. 검증

- `npx tsc --noEmit` — src 에러 0.
- `npx eslint <수정3파일> --quiet` — EXIT 0.
- 원색 미사용(시맨틱 토큰만) → 색상 baseline 무영향.
- build·commit 미실행(지시 준수).
