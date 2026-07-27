# v17 L3 — 접근성 스윕 (신규 v16/v17 위젯) 보고서

**작업일**: 2026-07-27
**범위**: v16/v17 신규 위젯 8종 a11y 점검·보강 (기능·레이아웃 유지, a11y 속성 추가·미세 보정 위주)
**제약 준수**: 시맨틱 토큰만(raw hex 0), img→Image 전환 안 함(L1 담당·alt만 대상), 지정 8파일 외 무접근.

---

## 1. 파일별 보강 항목

| 파일 | 보강 내용 | 비고 |
|---|---|---|
| `src/features/dashboard/JourneyStepperWidget.tsx` | 여정 진행률 바에 `role="progressbar"` + `aria-valuenow/valuemin/valuemax` 추가(기존 `aria-label` 유지). | 진행률을 보조기술이 값으로 인식. 완료 스텝은 이미 아이콘+취소선 텍스트+`aria-label="…완료"`로 색 비의존. |
| `src/features/insights/WeaveKpiSection.tsx` | 장식 아이콘 6종(`ShieldAlert`·`Link2`·`BookOpenCheck`·`TrendingUp`·`Stethoscope`·`AlertTriangle`)에 `aria-hidden`; 로딩 스피너(`Loader2`×3)에 `role="img" aria-label="집계 불러오는 중"`. | `ToneBadge`는 이미 "양호/주의/데이터 부족" 텍스트+색 병기(색 비의존) — 변경 불필요. |
| `src/features/learning-guides/GuideCompletionCard.tsx` | 장식 아이콘 8종(`PartyPopper`·`CheckCircle2`·`ClipboardList`·`CalendarDays`×2·`BookOpen`×2·`ArrowRight`×2)에 `aria-hidden`. | 완독 성공 상태는 색+"완독을 축하합니다!" 텍스트 병기 — 색 비의존. |
| `src/features/demand/DemandRetroSection.tsx` | ① 아이콘으로만 의미 전달하던 관심/참여 카운트에 `aria-label`(`관심있어요 N명`/`참여할래요 N명`) + `Heart`/`Users` 아이콘 `aria-hidden`. ② 로딩 스피너(`Loader2`×2) `role="img" aria-label="불러오는 중"`. ③ 빈상태/헤더 아이콘(`History`·`Inbox`·`TrendingUp`·`Flame`) `aria-hidden`. | Heart(관심)·Users(참여) 구분이 **아이콘 색/모양에만** 의존하던 부분을 텍스트 라벨로 명시. |
| `src/features/learning-guides/GuideRelated.tsx` | Chip 내부 `BookOpen`/`Users` 아이콘에 `aria-hidden`. | 개념/스터디 구분은 색 외에도 아이콘+섹션 제목("아카이브 개념"/"개설된 스터디")으로 이미 병기. |
| `src/features/mypage/DemandInterestCard.tsx` | **변경 없음** — 이미 준수. | 단계 뱃지(`STAGE_BADGE`)가 색상만이 아니라 `STAGE_LABELS` 텍스트("수집중/검토중/…")를 항상 렌더 → 색 비의존. 아이콘 `aria-hidden` 완비, 링크 `focus-visible` 링 존재, 행 링크 `px-3 py-2.5`로 터치타깃 충분. |
| `src/features/mypage/ContinueReadingCard.tsx` | **변경 없음** — 이미 준수. | 아이콘 `aria-hidden`, 링크 focus 링, 이모지 `aria-hidden`, 색 전용 상태 뱃지 없음. |
| `src/components/diagnosis/DiagnosisGuideBridge.tsx` | **변경 없음** — 이미 준수. | 아이콘 `aria-hidden`, 링크 focus 링, 색 전용 상태 뱃지 없음, 로딩 텍스트("추천 가이드 불러오는 중…") 병기. |

---

## 2. 색만 의존 → 텍스트/라벨 병기 목록

| 위젯 | 색 전용 위험 요소 | 조치 |
|---|---|---|
| WeaveKpiSection `ToneBadge` | success(초록)/warning(노랑) 톤 | **이미 텍스트 병기**("양호"/"주의"/"데이터 부족") — 원저자 주석에 명시. 변경 불필요. |
| DemandRetroSection 관심/참여 카운트 | `Heart`(관심)·`Users`(참여) **아이콘 색·모양으로만 구분** | `aria-label="관심있어요 N명"`·`"참여할래요 N명"` 추가로 텍스트 의미 병기. |
| DemandInterestCard 단계 뱃지 | 단계별 배경색 | **이미 텍스트 병기**(단계 라벨 상시 렌더). 변경 불필요. |
| GuideRelated 개념/스터디 칩 | primary/secondary 색 구분 | **이미 아이콘+섹션 제목 병기**. 변경 불필요. |
| JourneyStepperWidget 완료 스텝 | success 색 체크아이콘 | **이미 취소선 텍스트+`aria-label` 병기**. 변경 불필요. |

> 신규로 텍스트 병기가 필요했던 곳은 **DemandRetroSection의 관심/참여 카운트** 1건. 나머지는 원저자가 이미 색 비의존 설계.

---

## 3. 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **PASS** (0 에러) |
| 린트(수정 5파일) | `npx eslint <5 files>` | **PASS** (0 경고/0 에러 — 신규 경고 없음) |
| Raw color ratchet | `node scripts/check-rawcolor-ratchet.mjs` | **PASS** (1개 / 상한 1개 — 변동 없음) |

- build는 메인 게이트에서 수행(본 작업 범위 제외).
- 실제 수정 파일: JourneyStepperWidget · WeaveKpiSection · GuideCompletionCard · DemandRetroSection · GuideRelated (5파일). 나머지 3파일은 점검 결과 이미 준수하여 무변경.

---

## 4. 미조치·판단 근거 (시각적 회귀 최소화)

- **인라인 필터 칩/태그 칩 터치타깃(< 44px)**: DemandRetroSection 학기 선택 버튼(`py-1.5`)·DiagnosisGuideBridge 가이드 칩·GuideRelated Chip 등 인라인 pill류는 44px 강제 시 레이아웃이 뚱뚱해져 시각적 회귀가 크고, 코드베이스 전반의 칩 패턴(`py-1`~`py-1.5`)과 불일치가 발생. 주 상호작용 대상인 **행 링크는 이미 `py-2.5`(~44px)** 충족하므로, 인라인 칩은 회귀 회피를 위해 현행 유지.
- **`<Link><Button>` 중첩(GuideCompletionCard)**: 코드베이스 공통 패턴이며 대규모 리팩터 금지 제약에 따라 유지(아이콘 `aria-hidden`만 보강).
