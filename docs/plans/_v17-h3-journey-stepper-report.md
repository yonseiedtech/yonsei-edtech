# v17 H3 — 회원 여정 완주 넛지 통합 스텝퍼 구현 보고서

플랜: `docs/plans/service-enhancement-plan-v17.md` §H3 (96~105행) 그대로 구현.
목표: 온보딩·진단·학습·활동으로 흩어진 위젯을 4단계 통합 스텝퍼 1개로 오케스트레이션.

## (1) 변경/신규 파일과 역할

| 파일 | 종류 | 역할 |
|------|------|------|
| `src/features/dashboard/JourneyStepperWidget.tsx` | 신규 | 회원 여정 4단계 통합 스텝퍼. 롤별 단계 분기 + 미완 단계 단일 다음행동 CTA + 완주자 심화 CTA. |
| `src/app/dashboard/page.tsx` | 수정(2곳, 최소) | ① import 1줄 추가 ② `NewcomerProgressWidget` 직후 `empty:hidden` 래퍼로 위젯 배치(5줄). |

- 기존 위젯(`NewcomerProgressWidget`·`DiagnosisReadinessWidget`·`ContinueReadingCard`·`InactivityCoachingCard`)은 **대체하지 않고 그대로 유지**(회귀 위험 최소화). 스텝퍼는 신규 추가.
- `widget-visibility.ts`는 **읽기만**(수정 없음) — `getUserPersona` 헬퍼 재사용.

## (2) 재사용한 판정 소스 (DB/rules 무변경 · 전부 기존 읽기)

| 단계 | 판정 소스 | 재사용 경로 |
|------|-----------|-------------|
| ① 가입·프로필 완성 | `isProfileComplete(user)` (자기소개 + 관심 키워드 ≥1) | `@/lib/newcomer-sequence` — 동기 판정, 추가 read 0 |
| ② 연구 준비도 진단 | 진단 결과 1건+ | `useUserDiagnostics` 공통 훅(`DiagnosisReadinessWidget`과 캐시 공유, read 0) |
| ③ 가이드 학습 시작 | `guide_progress.completedItems` 1건+ | `guideProgressApi.listByUser` (`NewcomerProgressWidget` 동일 판정) |
| ④ 활동 참여 | `comm_likes`(좋아요·demand-join) `size>0` **또는** 세미나 `attendeeIds` 참석 **또는** `grad_life_positions` 이력 | `commLikesApi.listMineSet` · `seminarsApi.list`(키 `["dashboard-upcoming-seminars"]`) · `gradLifePositionsApi.listByUser`(키 `["dashboard-gradlife",uid]`) — 뒤 2개는 `DashboardCommandCenter`와 **동일 키로 캐시 공유(추가 read 0)** |

신규 컬렉션·rules·types 변경 없음. `comm_likes` 조회 1건만 신규(그 외는 캐시 공유).

## (3) 단계 판정 로직·롤별 분기 요약

- **오케스트레이션(중복 회피)**: 신입 창(`isNewcomerWindow` — 코호트 + 가입 14일 이내)에는 `NewcomerProgressWidget`(첫 2주 여정)이 담당하므로 스텝퍼는 `null` 렌더. 신입 창을 지난 회원에게만 노출 → 스텝퍼 중복 없음, 기존 위젯 무수정.
- **재학생/운영진(grad·staff)**: 4단계 `[프로필 → 진단 → 가이드 학습 → 활동]`.
- **졸업생(alumni)**: 진단·가이드는 졸업생 여정과 무관 → 제외. 축약 2단계 `[프로필 최신화 → 커뮤니티 활동 참여(멘토링·세미나)]`. 진단·가이드 쿼리는 `researchActive=false`로 비실행(read 절약).
- **미완 단계 단일 다음행동 CTA**(첫 미완 단계 기준):
  - 프로필 미완 → "프로필 완성하기" → `/mypage?tab=settings`
  - 진단 미완 → "3분 진단하기" → `/diagnosis`
  - 가이드 미완 → 진단 완료면 "약점 가이드 보기" / 아니면 "가이드 서재 열기" → `/learning-guides`
  - 활동 미완 → "스터디·수요 둘러보기" → `/activities/studies?tab=demand`
- **완주자(전 단계 done)**: 심화 CTA 2종 —
  - 재학: 멘토 되기(`/mentoring`) · 스터디 수요 남기기(`/activities/studies?tab=demand`)
  - 졸업생: 후배 멘토 되기(`/mentoring`) · 세미나 발표 제안(`/seminars`)
- 딥링크는 코드베이스 실존 라우트로 검증(`command-routes.ts`·`Header.tsx`·`newcomer-sequence.ts` 참조).

## (4) 검증 결과

| 검사 | 명령 | 결과 |
|------|------|------|
| 타입 | `npx tsc --noEmit` | **0 에러** |
| 린트 | `npx eslint src/features/dashboard/JourneyStepperWidget.tsx src/app/dashboard/page.tsx` | **0 경고/에러** (신규 경고 0) |
| raw color | `node scripts/check-rawcolor-ratchet.mjs` | **PASS (1 / 상한 1 — 변동 없음)** |

- 시맨틱 토큰만 사용: `text-primary`·`bg-primary`·`primary-foreground`·`text-muted-foreground`·`text-success`·`bg-success/10`·`border-success/30`·`bg-muted/40` 등. raw hex 0.
- 의존성 배열 정확(`useMemo`/`useQuery`), `no-explicit-any` 없음, `next/image` 대상 없음(img 미사용), 리스트 key는 안정 문자열(`s.key`·`c.key`) — array index key 미사용.
- build는 지시대로 미실행(메인 게이트에서 별도 수행).
