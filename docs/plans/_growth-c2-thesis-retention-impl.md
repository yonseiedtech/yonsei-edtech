# 성장 백로그 C2 — 논문 완주 임박자 이탈 방지 (구현 기록)

> 근거: `docs/plans/service-enhancement-plan-v19-acquisition.md` §C2 (리텐션·완주)
> 구현일: 2026-07-29 | 검증: tsc 0 errors · eslint 0 errors/0 warnings (next build 미실행 — 메인 게이트)

## 1. 목표
논문 단계(4학기+·디펜스 임박) 회원이 불안·정체로 이탈하면 커뮤니티의 "완주 스토리"(추천 자산)를 잃는다.
논문 단계 회원 **전용**으로:
- **정체(연구/논문 3주+ 무진전)**: 지지적으로 완주까지 다음 한 걸음(디펜스 연습)을 리마인드.
- **완주(졸업요건 충족)**: 축하 + "학기 회고(Wrapped) 공유"로 **D1 추천 루프**에 연결.
- **정상 진행 중이면 미노출** — 진행도 "표시"는 기존 ThesisProgressWidget 이 담당(중복 회피).

## 2. 변경 파일
| 파일 | 종류 | 내용 |
|---|---|---|
| `src/lib/thesis-retention.ts` | 신규(순수 유틸) | 페르소나 게이트 헬퍼(`isThesisStageSemester`) + 정체/완주 판정(`assessThesisRetention`) + 연구 라벨 상수. Date 는 기본 인자로만 사용(렌더 순수성 보호). |
| `src/features/dashboard/ThesisCompletionNudgeCard.tsx` | 신규(위젯) | 페르소나 게이트 + in-app 넛지(정체 격려 / 완주 축하). 닫기 per-user localStorage(useSyncExternalStore). |
| `src/app/dashboard/page.tsx` | 수정(2곳) | import 추가 + WeeklyReturnNudge/Kudos 사이(리텐션 넛지 클러스터)에 `WidgetBoundary + empty:hidden` 마운트. |

## 3. 기존 위젯과의 역할 구분 (중복 아님)
| 위젯 | 각도 | 대상 | 창/신호 |
|---|---|---|---|
| **ThesisProgressWidget** (v2 M1) | 논문 X% 상시 **표시** | 전 회원 | 정상 진행 중 상주(표시) |
| **InactivityCoachingCard** (M4) | 일반 습관 코칭 | 비신입 전 회원 | 최근 14일 완전 비활성 |
| **WeeklyReturnNudgeCard** (C1) | 이번 주 재방문 리듬 예방 | 비신입·비졸업 | 직전 주까지 연속(≥2주) 후 이번 주 0 |
| **WeeklyGoalCard** (M1) | 능동 주간 목표 루프 | 전 회원 | 회원이 스스로 설정 |
| **★ ThesisCompletionNudgeCard (C2)** | **논문 완주 경로 특화** 지원 | **논문 단계(4학기+)·비졸업** | **연구 3주+ 무진전(정체) 또는 졸업요건 충족(완주)** |

**왜 중복이 아닌가**
- ThesisProgressWidget 은 진행도를 "표시"하지만, C2 는 표시가 아니라 정체/완주라는 **이유가 있을 때만** 노출한다(정상 진행 중엔 null). 진행도 표시는 기존 위젯에 온전히 위임 → 표면 중복 없음.
- C1(이번 주 단위)·M4(14일 일반)와 **창·대상·목적이 모두 다르다**. 특히 C1 은 "직전 주까지 연속 활동"을 전제로 하므로 C2 의 "연구 3주+ 무진전"과 **동시 성립 불가**(자연 상호 배타). 연구 라벨(논문 작성/읽기/아카이브 열람)만 골라 신호를 분리했다.
- **기존 ThesisProgressWidget 확장 대신 신규 사이드카드 선택 이유**: ThesisProgressWidget 은 전체가 `<Link>`(→/research)로 감싼 상시 표시 위젯이며 전 회원에 노출된다. 여기에 페르소나 게이트·닫기·별도 CTA(디펜스/Wrapped)를 이식하면 기존 LIVE 동작이 바뀌어 회귀 위험이 크다. WeeklyReturnNudgeCard(=LearningStreak 미변경 사이드카드) 선례대로 **격리된 신규 넛지**가 최소 위험·최소 diff.

## 4. 페르소나 게이트 (엄격)
노출 = `로그인 + 논문 단계(getEffectiveSemesterCount ≥ 4) + 비졸업생(!isAlumni)`.
- **신입 가드 불필요**: 4학기+ 조건이 신입(가입 초기·학기차 미달)을 원천 배제. `getMemberStage`(no-diagnosis=신입) 는 4학기+ 정식 논문단계 회원을 오탐 배제할 수 있어 **의도적으로 미사용**(학기차 게이트가 더 정확).
- 로드맵 matchSemester 4/5(논문·디펜스)와 정렬(`THESIS_STAGE_MIN_SEMESTER = 4`).
- 비대상 세그먼트에선 `useGraduationSummary(undefined)`·`useGradActivityData(undefined)` 로 개인 쿼리 자체를 실행하지 않음(불필요 read 0).

## 5. 정체/완주 판정 방식 (읽기 전용 — 신규 컬렉션/저장 없음)
- **완주(completion)**: `useGraduationSummary` 의 `summary != null && remainingCount === 0`(졸업요건 전부 충족). 우선순위 최상.
- **정체(stall)**: `useGradActivityData.activityByDay` 에서 연구 라벨(`논문 작성`·`논문 읽기 기록`·`논문·아카이브 열람`)이 있는 날만 추출 → 마지막 연구 활동이 **3주(THESIS_STALL_WEEKS)+** 경과. 활동 이력 자체가 없으면 시작 유도(ThesisProgressWidget 의 "논문 작성 시작" CTA)에 양보 → hidden.
- **hidden**: 정상 진행 중 또는 활동 이력 없음.
- 판정은 순수 함수(`assessThesisRetention`), Date 는 기본 인자로만 — 렌더 경로 `new Date()`/`Date.now()` 직접 호출 없음(warning 래칫 147 보호). 학기·주차·판정 모두 `useMemo` 로 감쌈(WeeklyReturnNudgeCard 동일 패턴).

## 6. 콘텐츠(지지적·비압박) & 연결
- 정체: "논문은 마라톤이에요. 잠시 쉬어도 괜찮아요" + 단일 CTA `디펜스 예상 질문 연습하기`(`/steppingstone/thesis-defense`). 죄책감·긴급성 배제.
- 완주: "졸업요건을 모두 채웠어요!" 축하 + 단일 CTA `학기 회고 공유하기`(`/mypage/wrapped` → 기존 SemesterWrappedView 의 공유 버튼/`wrapped-share.ts` 재사용, D1 루프). 공유 로직을 재구현하지 않고 경로 재사용으로 중복 회피.
- 시맨틱 토큰만 사용(primary/muted/foreground), a11y(aria-label·focus-visible), 닫기 버튼.

## 7. 마운트
`src/app/dashboard/page.tsx` — 리텐션 넛지 클러스터(WeeklyReturnNudge 다음, Kudos 앞)에 배치:
```
<div className="mb-6 empty:hidden">
  <WidgetBoundary label="thesis-completion-nudge">
    <ThesisCompletionNudgeCard />
  </WidgetBoundary>
</div>
```
- `empty:hidden` 으로 null 렌더 시 유령 여백 제거, `WidgetBoundary` 로 위젯 격리(v18).
- 닫기 스코프: 정체=이번 주차(다음 주 재노출), 완주=1회성(done).

## 8. 검증 결과
- `npx tsc --noEmit` → **0 errors**.
- `npx eslint src/lib/thesis-retention.ts src/features/dashboard/ThesisCompletionNudgeCard.tsx src/app/dashboard/page.tsx` → **0 errors / 0 warnings**.
- `next build` 미실행(지시대로 — 메인이 최종 게이트).

## 9. 후속(문서화)
- "완주" 판정은 졸업요건 충족(remainingCount===0)을 프록시로 사용. 논문 디펜스 통과 등 더 정밀한 완주 이벤트가 데이터로 생기면 신호를 승격 가능(현재는 기존 데이터로 명확한 신호만 채택).
- 정밀 노출/전환 측정(⚠️X2 이벤트 로깅)은 v19 원칙대로 상태 도달 집계로 대체 — 별도 트랙.
