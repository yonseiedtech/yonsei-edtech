# 로그인 후 대시보드 영역 고도화 분석 — Claude Review (2026-05-23)

> 분석 모델: Claude Opus 4.7 (architect agent, read-only)

## TL;DR — 가장 큰 3가지 권장

1. **API 호출 통합 (queryKey 정리)** — `activitiesApi.list()` 가 4개 위젯에서 서로 다른 queryKey로 중복 호출됨 (`DailyClassTimelineWidget.tsx:606`, `MyAcademicActivitiesWidget.tsx:44`, `MyTodosWidget.tsx:359`, `TodayTodosPopup.tsx:118`). 단일 queryKey로 통합 시 네트워크 요청 3건 절감 + 캐시 일관성 확보. **최소 비용·즉각 효과·회귀 위험 낮음** — **P0 우선**.

2. **모바일 스크롤 깊이 감소** — 9개 섹션이 동등 비중으로 수직 나열되어 하단 위젯(PeerFeed, AI포럼 등)은 모바일에서 사실상 미도달. 섹션 5 이후를 접기(accordion) 처리하면 초기 스크롤 깊이 ~60% 감소.

3. **모놀리식 위젯 분할** — `MyTodosWidget.tsx`(1745줄), `DailyClassTimelineWidget.tsx`(1846줄)은 유지보수 임계점 초과. 내부 서브컴포넌트·다이얼로그 추출로 500줄 이하 분할.

## 1. 현황 진단

### 강점
- **NextActionBanner** (`NextActionBanner.tsx:115-394`) 위치(섹션 4) + 30초 자동 새로고침 + "내일까지 숨김" 기능 — 의사결정 친화
- **TermBriefHero** (`TermBriefHero.tsx:26-106`) — 누적 학기·입학연도 등 대학원생 맥락 정보 정확
- **NotificationOrchestrator** (`notification-orchestrator.ts:1-95`) — 우선순위 큐(undergrad-info=1, site-popup=2, today-todos=3, push-permission=100) + 모달 슬롯 배제 잘 설계됨
- **widget-visibility.ts:30-45** — 역할 기반 위젯 가시성 분리 깔끔

### 약점
- **StatCards 위치 (섹션 4)** — "내 글 수", "뉴스레터 호" 등 저-신호 지표가 prime real estate 점유
- **공지사항 (섹션 8)** — 사용자가 로그인 직후 보고 싶은 정보지만 todos·stats 아래에 매장
- **섹션 10~14 (학습 이론·피드)** — 모바일에서 사실상 미도달
- **AlumniThesis/Archive/Research 진입점 없음** — 주요 기능과 대시보드 연결 끊김

## 2. 정보 계층·위젯 구성 이슈

### 현재 레이아웃 순서 (`page.tsx:118-428`)
1. Header / 2. NewMemberWelcome / 3. TermBriefHero / 4. **NextActionBanner** / 5. DailyClassTimeline / 6. MyTodos / 7. **StatCards** / 8. **Notices + MiniCalendar** / 9. Academic Activities + Exam / 10. DailyReflection / 11. AIForum + SpacedRepetition / 12. PeerActivityFeed / 13. Seminars / 14. ActivityFeed / 15. Staff Alerts

### 권장 재배치
- **Notices를 섹션 3 (StatCards 위로) 승격** → 액션 정보 우선
- **StatCards 섹션 5로 강등** (또는 그룹화·하단 이동)
- 학습 이론 위젯(섹션 10~11)은 학생 한정·접기 기본값

## 3. UX·UI 개선

### 모놀리식 위젯
- `MyTodosWidget.tsx` **1745줄** — 내부 sub-components(LectureReviewItem, CourseTodoItem, ResearchItem 등) + 4개 form state + 10+ useQuery
- `DailyClassTimelineWidget.tsx` **1846줄** — DailyGrid + WeeklyGrid + 다이얼로그 폼
- 권장 분할 구조:
  ```
  features/dashboard/todos/
    MyTodosWidget.tsx (메인, ~400줄)
    AddTodoDialog.tsx
    items/{LectureReview,CourseTodo,Research,Activity,Staff}Item.tsx
  features/dashboard/timeline/
    DailyClassTimelineWidget.tsx (메인)
    DailyGrid.tsx
    WeeklyGrid.tsx
  ```

### 모바일 스크롤 비용
- 375px 모바일에서 PeerFeed(섹션 12)까지 ~2000~3000px 스크롤
- 섹션 collapse/accordion 부재
- WeeklyGrid `min-w-[640px]` 으로 가로 스크롤 강제

## 4. 데이터·성능 개선

### 중복 fetch (캐시 미공유)
- `activitiesApi.list()` — **4번 호출 / 3개 unique queryKey** → 캐시 공유 안 됨
  - `"my-activities-timeline"` (DailyClassTimelineWidget:606)
  - `"dashboard-my-activities"` (MyAcademicActivitiesWidget:44)
  - `"my-activities-todos"` (MyTodosWidget:359, TodayTodosPopup:118 — 이 두 곳은 공유)
- `courseEnrollmentsApi.listByUser`:
  - `["my-enrollments", userId]` (DailyClassTimelineWidget:377, NextActionBanner:178 — 공유)
  - `["my-enrollments-for-todo", userId]` (MyTodosWidget:468 — 중복)

### staleTime 불일치
- 같은 데이터에 60_000 / 120_000 / 300_000 혼재
- 표기 스타일 혼재: `1000 * 60 * 5` vs `5 * 60_000` vs `300_000`

### useQuery 미사용
- `AIForumLiveWidget.tsx:38-68` — 원시 `useEffect` + `useState`
- `SpacedRepetitionWidget.tsx:68-107` — 원시 `Promise.all`
- → 캐싱·dedup·background refresh 손실

### 로딩 상태 일관성 부재
- 일부 위젯은 `SkeletonWidget`, 일부는 raw `animate-pulse`

## 5. 퍼소나·동선 개선

### widget-visibility.ts 정책
- `STUDENT_ONLY_WIDGETS`: academicCalendar / dailyClassTimeline / myTodos / comprehensiveExam / myAcademicActivities
- `NON_STUDENT_ROLES`: alumni / advisor

### 갭
- **Alumni**: 학술 위젯 모두 숨김 → 알맹이 없는 대시보드("공지+피드"만)
- **Advisor**: 동일 (학생 지도·미팅 위젯 부재)
- **Alumni-specific 콘텐츠 부재**: 동문 행사·멘토링·논문 추천 위젯 없음 (관련 데이터 `/research`, `/alumni/thesis` 존재하지만 대시보드 진입점 없음)
- **`TermBriefHero.tsx:38-44`** — `(user as { occupation?: string })` 손쉬운 type cast 사용 (typed properties 미활용)

## 6. 추가하면 좋을 기능 (우선순위 표)

| P | 기능 | 비용 | 임팩트 |
|---|------|------|--------|
| **P0** | API 호출 통합 (queryKey 정리) | 저 | 고 |
| **P0** | Notices ↔ StatCards 위치 교환 | 저 | 고 |
| **P0** | 모놀리식 위젯 2개 분할 | 중 | 고 |
| P1 | 모바일 섹션 collapse/accordion | 중 | 고 |
| P1 | Alumni·Advisor 전용 콘텐츠 | 중 | 중 |
| P1 | AIForum·SpacedRepetition useQuery 마이그레이션 | 저 | 중 |
| P1 | 헤더 quick-action에 Archive/Research/Calendar 추가 | 저 | 중 |
| P2 | 사용자 위젯 재정렬·표시 토글 (개인화) | 고 | 중 |
| P2 | 통합 액션 큐 (NextActionBanner + MyTodos + StatCards + TodayTodosPopup 통합) | 고 | 중 |
| P3 | staleTime 표기 통일 (`5 * 60_000`) | 저 | 저 |

## 7. 기술 부채 정리

- **`popup-coordination.ts`** — `@deprecated` Sprint 2부터 표시됐으나 미제거 (back-compat 어댑터로 살아있음)
- **MyTodosWidget·DailyClassTimelineWidget** — 1700+줄, 분할 시급
- **TermBriefHero unsafe cast** — typed user properties로 교체
- **useQuery 미사용 위젯 2종** — AIForumLive, SpacedRepetition
- **staleTime 표기 통일**

## 8. 권장 로드맵

- **Phase A (1일)**: queryKey 통합 + Notices/StatCards 위치 교환 + staleTime 통일 (P0 묶음)
- **Phase B (3~5일)**: MyTodos·DailyClassTimeline 분할 + AIForum/SpacedRepetition useQuery 마이그레이션
- **Phase C (1주)**: 모바일 섹션 accordion + 헤더 quick-action 확장 + Alumni 전용 콘텐츠 초안
- **Phase D (2주)**: 통합 액션 큐 (NextActionBanner + MyTodos + Popup 통합) + Advisor 전용 위젯
- **Phase ∞ (장기)**: 사용자 위젯 개인화 (재정렬·표시 토글)

---

*분석: Claude Opus 4.7 · 작성일: 2026-05-23*
