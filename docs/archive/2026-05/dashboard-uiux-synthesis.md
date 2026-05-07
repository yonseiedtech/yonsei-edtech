# 대시보드 UI/UX 통합 분석 리포트 (Codex × Claude)

> **작성일**: 2026-05-06
> **분석 모델**: Codex (codex-rescue) + Claude Sonnet 4.6 (designer agent) — 병렬 실행
> **대상**: `/dashboard` (회원), `/staff-admin/activity-dashboard`, `/admin/activity-dashboard`
> **참조 리포트**: [Claude designer 단독 리포트](./dashboard-uiux-claude.md) (전문)
> **대상 사용자**: member / staff / president / advisor / alumni / admin (멀티 페르소나)

---

## 0. 분석 메타 정보

| 항목 | Codex | Claude Designer |
|------|-------|-----------------|
| 토큰 사용량 | 17,652 | 89,402 |
| 분석 시간 | 4분 | 4분 23초 |
| 도구 호출 | 1 (단일 패스) | 21 (다중 파일 깊이 탐색) |
| 분석 시각 | **엔지니어링 리뷰**: 코드 기반 즉시 발견 가능한 결함 중심 | **디자이너 리뷰**: 시각 언어·위계·시스템 추상화 중심 |
| 정량 코드 인용 | 적음 | 많음 (구체 클래스명·라인 식별) |
| 컴포넌트 추상화 제안 | 없음 | 있음 (WidgetCard·EmptyState·SkeletonWidget·design-tokens) |

→ 두 모델은 **상호 보완**: Codex는 "지금 당장 깨지는 문제"를, Claude는 "시스템 설계 부채"를 더 잘 본다.

---

## 1. 양 모델 합의 — 신뢰도 높은 발견 (즉시 작업 권장)

### 🔴 Critical (둘 다 강한 어조)

| # | 항목 | Codex 언급 | Claude 언급 |
|---|------|------------|-------------|
| C1 | **시맨틱 색상 토큰 부재 / 다크모드 미정의** | 위젯별 `bg-*-50` 하드코딩, WCAG AA 재검증 필요 | `design-tokens.ts` 신규 + `SEMANTIC` 상수 일괄 적용 |
| C2 | **빈 상태(empty state) 표준 부재** | `PeerActivityFeed` 빈 상태 `null` 반환 | 위젯별 빈 상태 처리가 3가지(아이콘+CTA / 텍스트만 / dashed border) |
| C3 | **로딩/에러 상태 표준 부재** | `admin/activity-dashboard`에 isLoading/isError UI 없음 | `AcademicCalendarProgress` skeleton vs `MyAcademicActivitiesWidget` 텍스트 → 표준 없음 |
| C4 | **알림/팝업 동시 노출** | NextActionBanner + TodayTodosPopup + PushPermissionPrompt 3중 충돌 | NotificationOrchestrator 레이어 도입 권장 |
| C5 | **모바일 터치 타겟·반응형 결함** | `MiniCalendar` 버튼 `h-8 w-8`(32px) → 44px 미달 | `MyTodosWidget` 탭 5개 → 모바일에서 11px 텍스트 압축 |
| C6 | **페르소나 분리 부족** | staff 조건부 카드와 admin 별도 페이지 맥락 중복 | 운영진 Primary Zone과 일반 회원 Primary Zone 분리 필요 |

### 🟡 Major

| # | 항목 | 두 모델 공통 결론 |
|---|------|-------------------|
| M1 | **CTA 발견성 낮음** | "빠른 액션" 위치가 페이지 중간 → PageHeader actions 또는 NextActionBanner 인접 배치 |
| M2 | **MyTodosWidget 인지 부하** | 단일 위젯에 5종 데이터·복수 폼·인라인 편집 집적 (1,667줄) → 단계화 필요 |
| M3 | **신규 회원 첫 진입 부담** | 빈 상태 위젯 다수 + 동시 팝업 → 온보딩 카드 + 위젯 우선순위 큐 |

---

## 2. 모델별 고유 발견 — 교차 시너지

### Codex 단독 인사이트 (엔지니어링 디테일)

| 항목 | 인사이트 |
|------|---------|
| **DailyClassTimelineWidget 가로 스크롤** | `min-w-[640px]` 사용하나 모바일 조작 힌트(드래그 가능 표시) 부재 |
| **방학·시험기간 시즌 어댑터 필요** | AcademicCalendarProgress가 학기 진행도만 보여줌 → 비학기 컨텍스트에서 가치 저하 |
| **컬러 상수 파일별 산재** | `MODE_BORDER`, `PHASE_COLORS`, `STATUS_COLORS`, `KIND_META` 등 — 토큰 부재가 구조적 |

### Claude Designer 단독 인사이트 (시스템 설계)

| 항목 | 인사이트 |
|------|---------|
| **"The Big 3" 위계 원칙** | 11개 위젯 평등 → Primary(NextActionBanner+AcademicCalendar+MyTodos) / Secondary / Tertiary 3 zone 분리 |
| **8px 그리드 강제** | 현재 `mt-6/8`, `p-4/5/6` 혼재 → 16/24px 두 단계만 허용 |
| **Framer Motion 미활용** | 의존성 설치돼 있으나 대시보드에 모션 없음. `useReducedMotion` 적용 + StatCard hover lift |
| **focus-visible 갭** | MiniCalendar 월 이동·평점 버튼 등 커스텀 button에 focus ring 누락 |
| **document.hidden 체크 누락** | NextActionBanner의 30초 interval이 백그라운드 탭에서도 실행 |
| **아이콘 사이즈 4종 혼재** | size 14/16/18/20 → 14/18/20 3단계로 가이드라인화 |
| **WidgetCard / EmptyState / SkeletonWidget 추상화** | 구체 인터페이스 + 코드 예시 제시 |
| **페르소나별 위젯 배열 설정** | `WIDGET_ORDER: Record<UserRole, string[]>` 패턴 |

---

## 3. 통합 우선순위 매트릭스

> 두 모델의 권장 항목을 영향도 × 구현 난이도로 통합. 두 모델이 모두 지적한 항목은 ★ 표기.

| ID | 항목 | 영향도 | 난이도 | 우선순위 | 원작 |
|----|------|--------|--------|----------|------|
| ★A | 시맨틱 색상 토큰 + 다크모드 일괄 처리 | High | Low | **P0** | C1 |
| ★B | EmptyState / SkeletonWidget 표준 컴포넌트 | High | Low | **P0** | C2/C3 |
| ★C | MiniCalendar 터치 타겟 44px+ | High | Low | **P0** | C5 |
| ★D | MyTodosWidget 모바일 탭 → overflow-x-auto | High | Low | **P0** | C5 |
| ★E | admin/activity-dashboard isLoading/isError UI | High | Low | **P0** | C3 |
| ★F | TodayTodosPopup ↔ PushPermissionPrompt 순차화 | High | Low | **P0** | C4 |
| ★G | WidgetCard 래퍼 추상화 | High | Low | **P0** | Claude only |
| ★H | 인라인 편집 버튼 모바일 상시 노출 (`sm:opacity-0`) | Medium | Low | **P0** | C5 |
| ★I | "빠른 액션" → PageHeader actions 통합 / NextActionBanner 인접 | Medium | Low | **P1** | M1 |
| ★J | NotificationOrchestrator 레이어 (전역 알림 조율) | High | Medium | **P1** | C4 |
| ★K | 페르소나별 위젯 배열 (`WIDGET_ORDER`) | High | Medium | **P1** | C6 |
| ★L | "The Big 3" Primary Zone 시각 강조 | High | Medium | **P1** | Claude only |
| ★M | MyTodosWidget 추가 다이얼로그 단계화 | High | Medium | **P1** | M2 |
| N | DailyClassTimelineWidget 모바일 스크롤 힌트 | Medium | Low | **P2** | Codex only |
| O | 8px 그리드 강제 (패딩·간격 두 단계) | Medium | Low | **P2** | Claude only |
| P | StatCard hover 마이크로모션 (Framer Motion + useReducedMotion) | Low | Low | **P2** | Claude only |
| Q | NextActionBanner setInterval에 document.hidden 체크 | Low | Low | **P2** | Claude only |
| R | focus-visible 링 누락 button 보완 (MiniCalendar 등) | Medium | Low | **P2** | Claude only |
| S | AcademicCalendarProgress 시즌 어댑터 (방학·시험기간) | Medium | Medium | **P2** | Codex only |
| T | 신규 회원 Zero State 온보딩 카드 (localStorage 첫방문) | High | High | **P3** | M3 |
| U | 위젯 지연 렌더 (Intersection Observer) | Medium | High | **P3** | Claude only |

---

## 4. 권장 Quick Wins (1일 이내, 8건 묶음 제안)

두 모델의 Quick Wins 5선을 통합 — 의존성과 작업량을 고려한 순서:

### Bundle A — 토큰·컴포넌트 인프라 (~3~4h)
1. **A**: `src/lib/design-tokens.ts` 생성 → `SEMANTIC` (info/warning/danger/success) 정의
2. **G**: `src/components/ui/widget-card.tsx` 신규 → 기존 6개 위젯 일괄 적용
3. **B**: `src/components/ui/empty-state.tsx` + `skeleton-widget.tsx` 신규
4. 위 3개를 `MyAcademicActivitiesWidget`, `ActivityFeed`, `PeerActivityFeed`, `ComprehensiveExamCountdown`, `PushPermissionPrompt` 5개 위젯에 우선 적용

### Bundle B — 모바일·접근성 (~2h)
5. **C**: `MiniCalendar` `h-8 w-8` → `h-11 w-11`, 월 이동 버튼 `p-1` → `p-3`
6. **D**: `MyTodosWidget` `TabsList` `grid grid-cols-5` → `flex overflow-x-auto gap-1` + `shrink-0`
7. **H**: `CourseTodoItem` 인라인 편집 `opacity-0 group-hover:opacity-100` → `sm:opacity-0 sm:group-hover:opacity-100`

### Bundle C — 알림 순차화·운영 페이지 보강 (~2h)
8. **F**: `PushPermissionPrompt`에 `dialog-active` 체크 추가 (TodayTodosPopup 열림 시 숨김)
9. **E**: `admin/activity-dashboard/page.tsx`에 React Query `isLoading`/`isError` 분기 + Skeleton/Alert 추가

→ 8건 약 7~8h, 1일 1 PDCA 사이클로 처리 가능. **P0 8건 모두 포함**.

---

## 5. P1+ 후속 사이클 권장 분리

### Sprint 2 — 페르소나·위계 재설계 (1~2일)
- **K**: `WIDGET_ORDER: Record<UserRole, string[]>` 도입 + dashboard/page.tsx 리팩터
- **L**: Primary Zone 시각 강조 (배경 톤 차이, h2 크기 업스케일, shadow-md)
- **I**: PageHeader actions 통합 + "빠른 액션" 섹션 제거
- **J**: NotificationOrchestrator 전역 레이어 (priority queue: 운영 알림 > 마감 To-Do > 푸시 권한)

### Sprint 3 — 입력·인지 부하 (1~2일)
- **M**: MyTodosWidget 추가 다이얼로그 단계화 (수업·연구·학술·운영 분기)
- **T**: 신규 회원 Zero State 온보딩 (localStorage 첫방문 감지 + 입문 카드)
- **S**: AcademicCalendarProgress 시즌 어댑터 (방학·시험기간 카운트다운)

### Sprint 4 — 미세 다듬기 (0.5일)
- **N/O/P/Q/R**: 모바일 스크롤 힌트, 8px 그리드, 마이크로모션, document.hidden 체크, focus-visible 링 — chore PR 1건

---

## 6. 두 모델 시각 차이에 대한 메타 관찰

1. **Codex는 코드에 박힌 결함을 빠르게 본다** — `null` 반환 빈 상태, `isLoading` 누락, 픽셀 단위 터치 타겟 측정. "지금 당장 운영에 영향 주는 것"을 잘 잡는다.
2. **Claude는 시스템 부채를 본다** — 동일 패턴 반복 횟수, 토큰 일관성, 추상화 부재. "지금은 동작하지만 6개월 뒤 부채가 될 것"을 잘 잡는다.
3. **공통 발견 = 신뢰 신호**: 두 모델이 동시에 지적한 6건(C1~C6 + M1~M3)은 모두 P0/P1 후보. 이런 항목부터 처리하는 것이 ROI 최선.
4. **개별 발견의 가치 차이**: Claude 단독 인사이트가 양적으로 더 많지만, Codex의 "DailyClassTimelineWidget 모바일 힌트", "시즌 어댑터"는 도메인 특수성을 잘 캐치 — 도메인 익숙도가 있는 모델일수록 도메인-특이 발견에 강하다.
5. **권장 운영 패턴**: 큰 화면 분석은 두 모델 병렬 실행 + 합집합 / 교집합 분석을 정례화. 합집합 = 점검 체크리스트, 교집합 = 우선순위 신호.

---

## 7. 다음 단계 제안

| 옵션 | 내용 | 예상 시간 |
|------|------|-----------|
| **A** | Bundle A+B+C (Quick Wins 8건) PDCA 진입 — `/pdca plan dashboard-quickwins` | ~1일 |
| **B** | 페르소나·위계 재설계 — `/pdca plan dashboard-persona-redesign` | ~2일 |
| **C** | 위 2개 묶음 진행 (오늘 Quick Wins → 내일 페르소나) | ~3일 |
| **D** | 본 리포트만 보존, 별도 sprint 일정 후 진입 | — |

---

> 본 통합 리포트는 두 모델의 병렬 분석 결과를 정량 비교 + 통합 우선순위 매트릭스로 재구성한 메타 분석입니다. 단독 리포트는 [`dashboard-uiux-claude.md`](./dashboard-uiux-claude.md) 참조.
