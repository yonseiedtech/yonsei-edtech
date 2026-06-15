# H1 작업 계획 — 진단→학습 루프 완성

> 상위 기획: `docs/plans/service-enhancement-plan-2026-06-15.md` 의 백로그 H1 (High, 규모 M)
> 작성일 2026-06-15 · 코드 통합 지점 실측 기반 (읽기 전용 탐색 완료, 본 문서는 계획이며 구현 미포함)

## 목적

진단평가(diagnosis)의 결과가 일회성 리포트로 사장되는 문제를 해결한다. 준비도 점수(paperReadiness/analysisReadiness)를 상시 노출하고, 약점 개념 → 아카이브 학습 → 타이머 세션 → 재진단으로 이어지는 반복 동기 루프를 만든다. 기존 LIVE 기능(진단·아카이브·타이머·잔디)을 새로 만들지 않고 연결만 한다.

## 컨텍스트 (실측 통합 지점)

이미 존재하는 자산 — 신규 인프라 거의 불필요:

| 자산 | 위치 | 비고 |
|---|---|---|
| 진단 결과 타입 | `src/types/diagnostic.ts` | `DiagnosticResult { areaScores, weakConceptIds, weakConceptNames?, paperReadiness, analysisReadiness }` 정의 완료 (L251~) |
| 준비도 계산 함수 | `src/types/diagnostic.ts` (L276~) | `analysisReadiness=(통계+연구방법)/2`, `paperReadiness=(개념+연구방법)/2` |
| 결과 조회 API | `src/lib/bkend.ts` `diagnosticResultsApi.listByUser(userId)` (L2387~) | 최신순 50건. 최근 1건 = `[0]` |
| 약점→아카이브 링크 | DiagnosisReport 컴포넌트, `/archive/concept/{conceptId}` 패턴 | weakConceptIds 이미 보유 |
| 타이머 시작 | `src/features/research/study-timer/study-timer-store.ts` `useStudyTimerStore().start(session: ActiveSession)` | `ActiveSession { type: StudySessionType, startTime, targetTitle ... }` |
| 잔디 가산(멱등) | `src/lib/bkend.ts` `streakEventsApi.add({ userId, type, refId, points })` (L2690~) | id = `userId__type__refId`, 재호출 1회만 가산 |
| 마이페이지 위젯 컨테이너 | `src/components/mypage/MyPageView.tsx` overview 탭 (LearningStreak 인접) | 위젯 끼워넣기 지점 |
| 대시보드 위젯 레지스트리 | `src/types/dashboard-layout.ts` `DashboardWidgetKey` union (L15) + `src/app/dashboard/page.tsx` widgetMap | 신규 key 추가 → 렌더 매핑 → 기본 노출 set 등록 |

## 가드레일

**Must Have**
- 준비도 점수는 본인만 조회(diagnostic_results 본인 read/write 룰 유지). 동료 비교는 H1 범위 외(M4).
- 진단 이력 0건일 때 빈 상태 → "진단 시작" CTA로 폴백.
- 재진단·타이머 가산은 `streakEventsApi.add` 멱등 키로 중복 방지. 임의 신규 점수 가산 규칙 추가 금지(기존 잔디 가중치 불변).

**Must NOT Have**
- 진단 채점 로직·문항·areaScores 계산 변경 금지(표시·연결만).
- 새 Firestore 컬렉션 신설 금지(기존 diagnostic_results·streak_events 재사용).
- 타이머 store 의 stop/save 책임(ChatWidget 통합) 변경 금지 — start 트리거만 호출.

## 작업 흐름 (Task Flow)

```
1. 준비도 위젯(마이페이지) ──┐
2. 추천 학습 경로 카드 ───────┼─→ 3. 대시보드 위젯 노출 ─→ 4. 재진단 유도·검증
   (약점→아카이브→타이머)     ┘
```

## 상세 TODO

### Step 1 — 준비도 점수 위젯 (마이페이지)
- `diagnosticResultsApi.listByUser(uid)` 로 최근 1건 로드, `paperReadiness`/`analysisReadiness` 를 0~100 게이지로 표시하는 컴포넌트 신규 작성.
- `MyPageView.tsx` overview 탭의 LearningStreak 인접에 배치.
- 이력 0건이면 "진단 시작하기"(`/diagnosis`) CTA, 1건 이상이면 마지막 진단일 + 두 점수 + "재진단" 버튼.
- **수용 기준**: 진단 이력 있는 계정에서 마이페이지에 두 준비도 점수가 표시된다. 0건 계정에서 CTA가 보인다. 콘솔 에러 없음.

### Step 2 — 추천 학습 경로 카드
- 최근 결과의 `weakConceptIds`(+`weakConceptNames`)를 순회해 약점 개념별 카드 렌더: ① 개념 학습 `/archive/concept/{id}` 링크 ② "이 주제로 30분 읽기" 버튼 → `useStudyTimerStore().start({ type:"reading", targetTitle: 개념명, ... })`.
- 약점 0개면 "강점 영역 유지" 격려 메시지.
- **수용 기준**: 약점 개념마다 아카이브 링크가 정확한 conceptId로 연결되고, 읽기 버튼이 해당 제목으로 타이머를 시작한다. 타이머 종료 시 기존 경로로 잔디에 자동 반영(추가 코드 불필요).

### Step 3 — 대시보드 위젯 노출
- `DashboardWidgetKey` union 에 `"diagnosisReadiness"` 추가 → `src/app/dashboard/page.tsx` widgetMap 에 렌더 매핑 → `DASHBOARD_WIDGET_META`/기본 visible set 에 등록.
- Step 1 위젯을 대시보드용으로 재사용(컴팩트 변형).
- **수용 기준**: 대시보드 위젯 설정에서 신규 위젯을 켜고 끌 수 있고, 켜면 준비도 요약이 표시된다. 기존 위젯 순서·드래그 동작 회귀 없음.

### Step 4 — 재진단 유도 + 루프 검증
- 마지막 진단 후 경과일(예: 14일+) 또는 약점 개념 학습 활동(paper_reading_logs/타이머)이 누적되면 "재진단 권장" 넛지 표시.
- 선택: 재진단 완료 이벤트에 `streakEventsApi.add({ type:"diagnosis_retake", refId: resultId, points: 0 })` 형태로 루프 완주 마커만 기록(점수 가중치는 기존 진단 +5 유지, 신규 가산 없음).
- **수용 기준**: 조건 충족 시 넛지가 1회 노출되고, 재진단하면 준비도 점수가 갱신되어 위젯에 반영된다.

## 성공 기준 (Success Criteria)
- 진단 결과 점수가 마이페이지·대시보드에서 상시 확인된다(일회성 리포트 탈피).
- 약점 개념에서 아카이브 학습→타이머까지 1~2 클릭으로 이동 가능(루프 폐쇄).
- 신규 컬렉션·신규 잔디 가중치 없이 기존 자산만 연결(회귀 위험 최소).
- 빈 상태(진단 0건/약점 0개) 모두 graceful 처리.

## 규모·순서
- Step 1+2 = Quick Win 우선(점수 노출 + 학습 경로). Step 3+4 = 후속.
- 전체 규모 M(1~2주). Step 1 단독은 S로 선제 배포 가능.

## 미해결/결정 필요 사항 (구현 착수 전)
- 재진단 권장 트리거 기준(경과일 N, 학습 활동 임계치) — 운영 정책 결정 필요.
- 대시보드 신규 위젯 기본 노출(visible) 여부 — 기본 ON/OFF 결정 필요.
- 본 문서는 계획이며, 코드 구현·배포는 별도 승인 후 진행.
